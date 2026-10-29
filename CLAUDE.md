# CLAUDE.md

Eventernote（https://www.eventernote.com/ ）活动登录页 / 编辑页的 Tampermonkey 用户脚本。

- 仓库：https://github.com/Ronny-zzl/eventernote-event-form-plus （公开，MIT）
- 当前已发布版本：`0.5.0`（已打 `v0.5.0` 标签并推送，GitHub Release 附更新说明；Greasy Fork 通过 webhook 自动同步）

## 工程结构

- 源码在 `src/`（TypeScript 7），用 Vite + `vite-plugin-monkey` 打包。`==UserScript==` 头部在 `vite.config.ts` 里配置，版本号取自 `package.json`，`@grant` 自动生成
- **根目录的 `eventernote-event-form-plus.user.js` 是构建产物，不要手改**。它必须留在这个路径并提交：已安装的用户和 Greasy Fork 都从它的 raw URL 更新。构建先输出到 `dist/`（忽略），再由 `vite.config.ts` 里的小插件复制到根目录
- **产物不压缩**：Greasy Fork 禁止压缩 / 混淆的代码
- 包管理器 pnpm。命令：`pnpm build` / `pnpm dev`（开发服务器，Tampermonkey 自动更新）/ `pnpm typecheck`（src 和 scripts、e2e 分两个 tsconfig）/ `pnpm lint`（oxlint）/ `pnpm test` / `pnpm test:e2e` / `pnpm site …`（见下）
- 工具链由 `mise.toml` 固定（Node 26、pnpm 12），本地和 CI（`jdx/mise-action`）共用；pnpm 版本只写在这里（不用 `packageManager`），Node 同时写在 `package.json` 的 `engines`
- CI（`.github/workflows/ci.yml`）：typecheck、lint、test、build，并检查提交的 `.user.js` 和构建结果一致。push 只在 main 上跑，其他分支只在 PR 上跑
- Renovate（`renovate.json5`，参考 ../ricotta 的设置）：非大版本合成一个 PR，CI 通过后自动合并；vite / vite-plugin-monkey 单独一组——产物变化时 CI 的一致检查会失败、不会自动合并，留到发布时一起合并重新构建；jsdom / playwright-core 的大版本要本地跑 `pnpm test:e2e`
- 目录：`src/main.ts`（按页面分发）、`src/style.css`（全部样式，打包时用 GM_addStyle 注入）、`src/lib/`（page = 页面全局变量与小工具、storage = 带类型的 GM 存储、notice、eventPage = 活动页读取缓存、suggest = 会场和出演者共用的输入即搜索候选列表）、`src/features/`（actors、actorSearch、actorBulk、announce、date、duplicateCheck、time、place、snapshot、thumbnail；纯函数放在 `timeParse.ts`、`dateParse.ts`、`placeRank.ts`、`actorRank.ts`、`actorMatch.ts`、`duplicate.ts`，供单元测试）
- GM API 从 `'$'` 导入（vite-plugin-monkey 的别名）。依赖 `'$'` 的模块在 vitest 里无法加载，所以要测试的逻辑写成不依赖它的纯函数模块
- 同一行里的输入框、下拉框、按钮用 `ene-ctl` 类统一高度（电脑版 30px，手机版 36px；选择器要写成 `input.ene-ctl[type]`，否则会输给 Bootstrap 的 `input[type="text"] { height: 20px }`）；`.ene-search-row` 里只有文字输入框伸展（`input[type="text"]`），否则按钮也会被拉伸
- 代码风格：类型用 `type`，函数用箭头函数（oxlint 的 `consistent-type-definitions`、`func-style` 规则强制）；尽量简洁
- 换行统一 LF（`.gitattributes`：`* text=auto eol=lf`）
- 测试分两组：`pnpm test`（vitest 的 unit 项目，纯函数，CI 跑）和 `pnpm test:e2e`（e2e 项目，真实页面 + API，需要登录，见「调试网站的方法」）。页面 HTML 含登录用户的信息，只在运行时获取，不提交

## 约定

- **页面上显示的文字一律用日语**（网站是日本网站），用词跟随网站原有风格（「追加する」「選んでください」等）
- 代码注释用中文；README 日语为主，末尾附中文说明；更新说明写在 `CHANGELOG.md`（同样日语为主、附中文），发布时也作为 GitHub Release 的说明；**Release 的标题只写版本号**（如 `v0.3.2`），内容看说明
- 提交信息用英文
- 每次发布要提高 `package.json` 的 `version` 并重新构建（`@version` 由它生成；Tampermonkey 和 Greasy Fork 靠它判断更新），README 功能列表同步更新
- 用户**不想修网站本身的零碎 bug**，只关注「填表体验」本身。新功能尽量不改变提交给服务器的数据格式（原控件隐藏但保留，值同步回去）

## 网站结构（调查结果）

### 登录页 `/events/add`
- 表单 `#event_form`，POST 到 `/events/add/confirm`，jQuery 1.7.1，无 `enctype`、无图片字段
- 全局变量 / 函数（userscript 通过 `unsafeWindow` 访问）：
  - `selected_actors`：已选出演者 ID 数组，`addActor` / `removeActor` 会据此重写隐藏字段 `#actor_ids`
  - `addActor(id, name)`：去重用 `$.inArray`（严格比较，字符串和数字 ID 会被当成不同值）
  - `searchPlaces(prefecture, selectedPlaceId)`：只追加 option，不清空 `#places_list`
- 出演者列表 `#selected_actors`，每个 `li#actor_{id}` = 名字文本节点 + `<a> [削除]`
- 编辑页内联脚本把出演者名按 HTML 转义后写进 JS 字符串（`addActor(68091,"IBERIs&amp;")`），页面又用 `.text()` 原样显示，出现「IBERIs&amp;」（网站本身的问题，活动 489938）。脚本在加控件时用 `decodeEntities` 解码，读到 / 存下的名字也就正确了
- 出演者选择原 UI：`#actors_initial`（页面加载时请求 `/api/actors/all`，只是各头文字的人数，实测 4.6 秒）→ `#actors_list`（`/api/actors/search?initial=あ&limit=-1`：6634 人、约 2MB、13 秒）+「追加する」；另有 `#actors_suggest` 关键词搜索（keyup 无防抖，20 件）  - `/api/actors/search?keyword=…&simple=3&limit=50`：匹配名字、平假名读音（kana）和 keyword 字段（团体成员名等），**每次 2〜5 秒**，结果不按相关度排序（搜「水樹奈々」第一个是乐队成员 渡辺豊）；返回 id/name/kana/favorite_count/keyword 等。片假名读音（「カスガ」）不会匹配平假名 kana
- 2026-10-19 实测：返回里有 `info.total`（总件数）；`limit` 可到 1000；`simple=1` 只有 id / name / favorite_count（1000 件约 50KB，`simple=3` 约 270KB）；速度变快了（0.4〜0.7 秒）。短的词（如「Ill」有 305 件）时顺序不按相关度，「Ill(ex.twinpale)」排在第 277 件。所以 `searchActors` 先取 `simple=3` 前 50 件，`total` 更多时再取 `simple=1` 1000 件，把**名字包含搜索词**的补上（`mergeMissingNames`）；`rankActors` 把去掉括号后完全一致的也算作完全一致
- 时间是 6 个 select：`#open_time_hour/minute`、`#start_time_*`、`#end_time_*`，分钟 5 分钟一档，小时 00–23
- 会场：`#prefecture_id` → `#places_list`（`name=place_id`）；搜索框选会场时**不会**同步都道府県
  - `/api/places/search?prefecture=13&simple=1&limit=-1`：东京都 6124 个会场、约 368KB、实测 6.5 秒，按 ID 排序（不是名字），有空名字的条目
  - `/api/places/search?keyword=…&simple=3&limit=50[&prefecture=13]`：约 0.8 秒；名字和地址都会匹配，不支持读音（「ぜっぷ」「ぶどうかん」0 件）；返回 id/place_name/prefecture/address/capacity 等；已关闭的会场名带「(閉館)」
  - 编辑页加载时内联脚本立即调用 `searchPlaces(都道府県, 会场ID)`；编辑页的 `searchPlaces` 回调会**先清空** `#places_list` 再重建（登录页的只追加）。大列表到达前 `place_id` 是空的
- `?from_event_id=活动ID` 是官方的「复制活动登录」入口（活动页的「このイベントをコピーして新しくイベントを登録」）。复制图片以外的全部字段，包括日期和时间
- 参加登录是 `GET /api/notes/add?event_id=…`（用 GET 改数据，`siteFetch` 不会拦）。**不要调用**
- `validateEvent()`（同日同出演者重复检查）在页面里被注释掉了

### 手机版页面（按 User-Agent 切换）
- 手机浏览器访问时，登录页 / 编辑页 / 确认页 / 活动页都返回另一套模板（`smartphone.css`，`viewport=width=device-width`，没有 Bootstrap）。表单的元素 ID 和页面函数（`addActor`、`searchPlaces` 等）与电脑版相同
- 表单项目是两行：`<tr><th>标题</th></tr><tr><td>内容</td></tr>`（电脑版是一行 `<td>标题</td><td>内容</td>`）。插入项目用 `insertField`，定位项目开头用 `fieldStart`（`src/lib/page.ts`）
- 活动页没有 `.gb_events_info_table`，是 `<h2 class="gb_subtitle">開場/開演/終演時間</h2>` + 内容、`<h2 class="gb_subtitle">開催場所</h2>` + `<p class="t"><a href="/places/{id}">`；`eventInfoCell` 两种都支持
- 按钮是网站自己的 `gb_btn_add_s` / `gb_btn_add`（蓝底 #007aff）。脚本给 `<html>` 加 `ene-sp` 类，在其下给 `.btn` 定义描边样式
- 手机版编辑页**没有图片上传栏**（`thumbnail_image`），表单也不是 multipart，但提交地址和电脑版相同。脚本补上「サムネイル画像」项目（当前图片取 S3 的 `{id}_s.jpg`）并把表单改成 multipart（`addMissingImageField`）。**服务器接受**（2026-10-13 经用户同意在 API 层面实测：iPhone UA 打开手机版编辑页，在 jsdom 里跑用户脚本后以 multipart 提交到活动 494322 的 `edit/complete` → 302 回活动页，S3 的 `{id}.jpg` / `{id}_s.jpg` 换成新图，PNG 720×720 被转存为 JPEG 700×700，其他字段不变）
- 用户用 iPhone 的 Tampermonkey for Safari 实测 0.3.1 测试版没有问题（2026-10-07）

### 确认页 `/events/add/confirm`
- 全部值放在隐藏字段，POST 到 `/events/add/complete`，只有一个「登録する」按钮，没有返回按钮
- **服务器在这一步不做校验**：分钟 `57`、小时 `24`/`25` 都原样接受并显示

### 编辑页 `/events/{id}/edit`
- `enctype="multipart/form-data"`，直接 POST 到 `/events/{id}/edit/complete`（无确认页）
- 图片字段 `<input type="file" name="thumbnail_image">`
- `place_id` 下拉框在 HTML 里是空的，由内联脚本 `searchPlaces(都道府県, 会场ID)` 填充——用 fetch+DOMParser 重建表单时**必须从脚本里解析会场 ID**，否则会清空会场

### 图片
- S3：`https://eventernote.s3.amazonaws.com/images/events/{id}.jpg`（原图，例 1200×620）和 `{id}_s.jpg`（300×300 以内，用于列表 / OGP）；无图时用 `no_image.png`
- S3 的活动图片**没有 Cache-Control / Expires**，浏览器按启发式缓存（iOS Safari 尤其久），而图片地址上传后不变 → 上传后仍显示旧图。`features/imageCache.ts`：通过脚本上传（编辑页带图提交、登录后自动上传）时把 `imageVersions[活动ID] = 时间` 存起来（30 天），所有页面开头 `refreshEventImages()` 给这些活动的 `img` 地址加 `?v=时间`。只对本机、本脚本上传的有效
- S3 允许跨域 GET（`Access-Control-Allow-Origin: *`），可读 `Last-Modified`；不存在的图片返回 **403**（不是 404）；Content-Type 是 `binary/octet-stream`（`normalizeImage` 因此一律转成 JPEG）
- **新活动登录后，网站会在后台根据「関連リンク」自动生成图片**（OGP 图或网页截图，x.com 链接会得到坏掉的截图），约 5 秒后写入 S3，覆盖在此之前上传的图片（活动 494909：12:32:51 登录，12:32:52 脚本上传，12:32:56 被覆盖）。编辑页手动上传不会触发重新生成（494891 已确认）。**没有链接时不会生成**（494912：登录后约 100 秒 S3 仍是 403），但活动页照样引用 `{id}.jpg`，显示为坏图（网站本身的行为）
- **图片生成机制（2026-10-27 调查；用 494909 实测，经用户同意）**——每次保存（登录 / 编辑）时：
  - **带图片上传**：缩到 700×700 以内（`_s` 300×300 以内），不会再重新生成。**长边不超过 700 的图服务器返回 500**（701×701、800×300、300×800 可以；700×700、699×699、300×300 的 PNG 不行），失败时数据不变
  - **不带图片、有「関連リンク」**：约 5 秒后按**第一个**链接重新生成并覆盖现有的图，不管链接改没改（S3 的 Last-Modified 总是等于最后一次编辑的时间；494891 手动上传的图被别人后来的编辑改成了坏截图）。链接有 og:image 时把它按原尺寸转成 JPEG 保存（tiget 的传单等）；没有或取不到时是 1000×1000 的网页截图（x.com、taiyotsukiyo.com、ticketdive 等）。2026-10-29 抽样（9/5〜6）：第一个链接是 x.com 的 40 件里 29 件是正常的 og:image（推文附带的图）、8 件是截图；其他链接也是 40 件里 8 件截图。截图是排版坏掉的网页（推文没有图时）。一周 746 件里 27.7% 的第一个链接是 x.com。旧 LivePocket（`t.livepocket.jp`）2026-10-21 关闭，链接会生成关闭通知的截图
  - **不带图片、没有链接**：现有的图不变
  - 所以长边正好 700 的图几乎都是用户上传的
  - 脚本对策（`features/imageRules.ts`）：选图时长边不超过 700 就用 canvas 放大到 701；编辑页不选新图、有链接时，把 S3 上现在的图（放大后）作为 thumbnail_image 一起提交，防止被重新生成（用户决定：没选图就是不想改图，自动生成的大图因此缩到 700 也可以接受；曾做过「現在の画像を残す」勾选框，被否决）
  - 用 Node 的 FormData 发送空 Blob 作为 file 栏时 500（浏览器的空 file 栏没问题，原因未查）
- 编辑历史 API：`GET /api/events/history?event_history_id=…`（活动页里 `showHistory(id)` 的 id）

### 出演者条目（2026-10-27 调查）
- `/actors/{id}/edit` → POST `/actors/{id}/edit/complete`：只有 名前 / よみがな / 検索キーワード（逗号分隔，搜索 API 的 keyword 字段）/ 性別。没有合并、删除功能；问い合わせ（Google 表单）可以申请删除，但运营方实际上几乎不删（ID 没有空缺，`31246【重複】…` 留了多年）
- 改名惯例：同一条目改成「新名(旧名)」，旧名、旧名读音、「改名」放进検索キーワード
- 重复条目惯例：活动全部移到要保留的条目后，把空条目改成「【重複】」、よみがな「ををを」或「ん」（排到最后）、キーワード「{ID}と重複しています」。收藏不能转移
- 74073（高橋玲乃(月宮れの)）的 69 场活动已全部换成 94956（夜凪織乃），用一次性脚本 `.local/tmp/move-actor.ts`（2026-10-27，经用户同意提交 edit/complete）

### 重复检测用的 API（2026-10-29 调查）
- `/api/events/validate?event_date=YYYY-MM-DD&actor_ids=1,2`：页面自带 `validateEvent()` 用它，但调用被注释掉了。它读的 `.event_date_year` 等类名只有登录页有，编辑页的日期下拉框没有（ID 两边都是 `#date_year` / `#date_month` / `#date_day`）
  - **只返回 1 条**（似乎是 ID 最小的），`limit` 无效，`info.total` 恒为 1；没有匹配时没有 `results` 键。多个出演者是「任一匹配」。`actor_ids` 为空或没有日期时返回 `{"message":"InvalidParameter","code":500}`（HTTP 200）
  - 日期不补零（`2026-12-9`）或用斜杠时**不报错、日期条件被忽略**，返回该出演者别的日子的活动
- `/api/events/search?event_date=YYYY-MM-DD&actor_id=1,2,…&limit=100`：返回当天全部相关活动，更适合做检测。`actor_id` 逗号分隔取并集（2890 的 656 + 2650 的 603 → 1196）；也支持 `year=&month=&day=`
  - `limit` 默认 10，`-1` 也只给 10（有出演者条件、件数少时全给）；`simple` 无效，每条约 4KB（含 description、actors、place、user）
  - 同样的坑：日期不补零时条件被忽略，返回该出演者的全部活动；`actor_id` 为空时条件被忽略，返回当天全部活动（2017-11-11 有 288 场）
  - 结果的 `actor_id` 是逗号分隔的字符串，`actors` 是对象数组；有 `delete_flag` / `draft_flag` / `cancel_flag` / `postpone_flag`。已删除的活动是否会出现未确认
  - 速度：现在 20〜200ms（40 个出演者 134ms）
  - `place_id=` 也能筛选（不存在的 ID → 0 件），`event_date` + `place_id` 通常只有几件。为空时同样被忽略
  - **分页不稳定**：同一天的活动排序不固定，`limit=100&page=N` 翻页会重复和漏掉（263 件取了 300 件、去重后 200 件）。要全取就一次 `limit=1000`
- 编辑页检测时结果里会有活动自己，要按 ID 排除
- **判定规则的验证**（2026-08〜09 的 7655 场，脚本在 `.local/tmp/`）：同日且有共同出演者的有 2530 对。再加「開演时间相同」：会场不同的 32 对**全是误报**（联合演出的開演是整场开始时间、多家店同时来店、多家影院同时的舞台挨拶）；会场相同的 23 对约 16 对是真重复。时间没填时用「会场相同或名字相同」判定的 49 对几乎全是误报（乃木坂按成员分别登记等）。名字完全相同但时间不同的都是昼夜公演。所以采用「同日 + 同会场 + 開演相同 + 共同出演者」

### 已有数据的时间惯例
- 抽查 2026-07〜10 的 11143 条时间，全部是 5 分钟一档，没有 24 点以后的值
- 跨午夜活动写成「终演早于开演」，如 `開演 22:00 終演 05:00`

## 已实现功能（1–5 在 0.1.0，6 在 0.2.0）

1. **已选出演者列表**（`initActorList`）：拖动 ☰ 或 ▲▼ 排序；只有 ☰ 可拖动（名字可选中复制）；复选框（Shift+点击选范围）选中多人，列表上方工具栏可成组 ▲▼、删除（多人时确认，调用页面的 `removeActor`），用全选框全选 / 清除；按钮用 visibility 隐藏以免工具栏高度变化；拖动选中的行时整组移动。调整 DOM 后同步 `unsafeWindow.selected_actors` 和 `#actor_ids`
2. **出演者セット**：把已选出演者存为组合（`GM_setValue('actorPresets')`），从没保存过时默认显示示例セット「前橋ウィッチーズ」（`defaultPresets`，删光后存的是 `[]`，不会再出现），一键添加；列表里已有セット第一项（团体名）时，新成员插在它（及紧随其后的已有成员）后面，否则追加到末尾
   - 1、2 在登录页和编辑页都启用（编辑页从 0.2.2 起；已有出演者由内联脚本 `addActor(数字ID, 名字)` 加入，结构与登录页相同）
3. **确认页「戻って修正する」**：登录页提交时存快照（`formSnapshot`），跳回 `/events/add?ene_restore=1` 后恢复全部字段
4. **登录页缩略图**：拖入 / Ctrl+V / 选文件（`createImageDrop` 组件）→ `draftImage` → 确认页提交时转为 `pendingUpload`（30 分钟有效）→ 完成后在完成页链接或活动页 URL 找到新活动 ID（完成页不依赖结构：先取文字含活动名的活动链接，再按页面顺序取其他的，最多 5 个；手机版完成页没有 `.page`，之前因此什么都不做），**核对活动名和会场**；有链接时先轮询 S3 等网站自动生成的图片出现（最多 60 秒），再用编辑页原样提交 + `thumbnail_image`，最后用 `Last-Modified` 确认已被替换。0.2.1 起；494918 实测：登录 13:03:54 → 等待后 13:04:00 上传 → 没有再被覆盖
5. **编辑页图片框**：同一组件，选中的图片用 `DataTransfer` 塞进原生 `thumbnail_image`；不选新图时自动把现在的图一起重新上传，防止网站按链接重新生成（见「图片」一节）
6. **时间输入**：见下方「时间输入改进」一节
7. **会场搜索框**（`initPlacePicker`）：都道府県 / 会场下拉框 / 原搜索框隐藏，换成一个搜索框（300ms 防抖、都道府県筛选、名字匹配优先、闭馆的排最后变灰、↑↓Enter）；`#places_list` 只保留选中的一项，用 MutationObserver 防止编辑页大列表到达后覆盖选择；编辑页 / `from_event_id` 从活动页「開催場所」读会场名立即显示；最近使った会場存在 `GM_setValue('recentPlaces')`（10 个）。活动页通过 `fetchEventDoc()` 只请求一次（时间分钟恢复也用它）
8. **開催日**（`features/date.ts`）：年 / 月 / 日三个下拉框隐藏，换成原生 `<input type="date">` + 星期显示；可选范围取自原年份下拉框（1980–2027），清空或超范围时恢复原值（原下拉框没有空选项）。下拉框的值不补零（`1`～`12`）
9. **告知文から入力**（`features/announce.ts`）：独立的一行，放在「開催日」行上方；粘贴告知文后同时填入開催日（`parseDate`）和開場・開演・終演（`parseAnnouncement`）。往时间框里粘贴带标签的文字也走这里。日期：带年份 > 带星期 > 其他；没写年份时按星期在今年 / 明年 / 去年里找，没有星期则取最近的将来（30 天内的过去算今年）
   - 同时读（`announceParse.ts`）：ハッシュタグ（栏是空的时候填）、会場（还没选时用 `venueQueries` 的写法依次搜，第一个有结果的放进会场搜索框列出候选，`PlacePicker.suggestFrom`）、出演者名单（输入框下方显示「出演者 N 名を読み取りました［確認して追加］」，按钮把整理后的名单送进「まとめて追加」并搜索，`ActorBulk.openWith`）。项目标题必须在行首（前面只能有括号、记号），避免把「※会場内に…」当成项目。输入框是一行的，粘贴时记下原文（名单要看换行）
   - 验证（2026-09-01〜14 的 1329 篇「詳細」，脚本在 `.local/tmp/eval/`）：会场 250 件里 200 件的正确会场在候选里（第一位 167）；出演者抽 60 件 198 人，自动勾选 154 人，其中 138 人是实际登录的出演者，其余 16 人也是同名同人（登录者没加进那场），没有认错人。实际的「関連リンク」几乎都不在告知文里（626 件中 17 件，大家填的是推文本身的地址），所以不读链接
10. **出演者搜索**（`features/actorSearch.ts`）：头文字 / 出演者下拉框 / 原搜索框隐藏，换成搜索框（在已选列表下方、セット上方），用页面的 `addActor` 加入；结果按 `rankActors`（名字或读音的一致度，同档按收藏人数）排序；显示「検索中…」，结果按关键词缓存（不中止请求，让结果进缓存）；选中后列表不关闭、标「追加済み」，可连续添加；最近追加的 20 人存在 `recentActors`
11. **提交前检查**（`features/submitCheck.ts`，登录页和编辑页）：活动名空、没有出演者 / 会场、出演者或会场搜索框里留着没选中的文字时，用 confirm 列出问题，取消则聚焦第一个问题；确定仍提交（服务器的必填要求未确认）。capture 阶段注册在时间检查之后。出演者搜索选中后会保留搜索词，所以 suggest 选中时给输入框设 `data-picked`，输入变化时清除；有这个标记就不当作残留
12. **草稿自动保存**（`features/draft.ts`，仅登录页）：每 2 秒取快照（复用 `takeSnapshot`），有变化且非空表单才存到 `formDraft`；下次打开登录页显示「前回の入力内容が残っています」+ 復元する / 破棄する（14 天内；从确认页返回、`from_event_id` 时不显示）；开始填新内容后提示消失、旧草稿被覆盖；确认页点「登録する」时清除。缩略图不保存
   - **坑**：`initFormSnapshot` 恢复后会把 `ene_restore` 从 URL 去掉，之后再检查参数就判断不出「从确认页返回」。现在统一用脚本加载时算好的 `isReturning`（这个问题曾导致从确认页返回时缩略图被清空，0.1.0 起就存在，已修）
13. **出演者まとめて追加**（`features/actorBulk.ts` + 纯函数 `actorMatch.ts`）：出演者搜索框旁的按钮打开 modal，粘贴名单 → `splitNames` 拆分（换行、全角「／」、至少一边有空格的「/」；名单里没有这些「/」时才按「、」「，」拆，因为名字可能带「、」如「遥か、彼方。」；「LilyS/ash」「マジカル・パンチライン」不拆；去掉＜出演者＞标题、and more）→ 4 并发搜索（失败等 1.5 秒重试一次）→ `matchActor` 判断：名字（忽略全半角、大小写、空格、引号、☆★、〜~、♡♥）完全一致且一人 = 一致（默认勾选）；多人同名 = 同名あり、只有候选 = 候補のみ（都由用户在下拉框里选，不默认选）；括号连同一致的优先，再比去掉括号的写法。原文搜不到时按 `fallbackQueries` 换写法再搜（去括号、换引号、最长的词；「I’mew（あいみゅう）」「ROSARIO+CROSS」等）；统一写法时还忽略变体选择符 U+FE0E（「STARRY×NIGHT↗︎」）、♯ 与 #、【读音】（「Re:♡【りらいく】」）。只有一个候选时自动选中但仍标为要确认（「Lって何のLですか？」vs「LってなんのLですか？」这种汉字和假名的差别无法统一）。要确认的行有单项搜索框，重搜不使用缓存（`searchActors(keyword, true)`），登记新出演者回来后可以搜到。`.ene-bulk-row` 是 `display:flex`，要加 `[hidden] { display: none }` 才能隐藏。确认后按名单顺序 `addActorIfMissing`。用户决定：不做「保存为セット」，用 modal 以便手机也能操作
14. **重复登录提醒**（`features/duplicateCheck.ts` + 纯函数 `duplicate.ts`，登录页和编辑页）：同日、同会场、開演时间相同、有共同出演者的活动已存在时，在出演者栏末尾显示黄色提示（活动链接、共同出演者、中止 / 延期），提交前检查也列出。每秒读一次表单（值会被很多地方改），按「日期 + 会场」请求并缓存，出演者和时间在本地比较；開演没填时不判定。用户决定：同一天的其他活动（「同日の出演」）不显示
15. **复制登录带上缩略图**（`thumbnail.ts` 的 `fetchSourceImage`，登录页 `?from_event_id=`）：把原活动的 S3 图片放进图片框（显示「コピー元のイベントの画像を引き継ぎました」）。1000×1000 是网站生成的网页截图（上传的图最大 700），不复制。取图期间用户自己选了图时不覆盖。jsdom 没有 canvas 测不了，用真实 Chrome 验证过（playwright，只放行 GET；`.local/tmp/chrome-copy.ts`）
16. **编辑页的改动确认**（`features/editConfirm.ts` + 纯函数 `editDiff.ts`）：编辑页没有确认页，提交前检查（`submitCheck.ts`）在编辑页每次都 confirm，列出改了什么（活动名、日期、时间、出演者的增删 / 顺序、会场、关联链接的增删 / 顺序、詳細、ハッシュタグ、新图片）。原来的值在其他功能改动表单之前记下；会场 ID 从内联脚本读、名字从活动页读；非 5 分钟的分钟等 `restoreEditMinutes` 完成后再记

`@match` 是 `https://www.eventernote.com/events/*`，入口在文件末尾按 pathname 分发。

### 测试状态
- 用户实际试用过：登录页图片自动上传（「看起来成功了」）
- 编辑页的重建表单逻辑用保存的编辑页 HTML + jsdom 离线验证过（字段与原值一致）
- 其他功能只做过语法检查，未见用户反馈问题；编辑页图片框尚未确认

## 时间输入改进（0.2.0 已发布）

**已验证（2026-10-02）**：`edit/complete` 接受非 5 分钟的分钟值。用户用编辑页把活动 494891 的開場改成 18:29，活动页显示「開場 18:29」。因此按 1 分钟精度处理，不四舍五入。

- `initMinuteOptions()`：分钟下拉框补全为 00–59（登录页、编辑页）
- **坑**：编辑页 HTML 由服务器渲染 select，没有 `29` 这个选项，所以分钟没有被选中（为空）。`restoreEditMinutes()` 会从活动页 `.gb_events_info_table` 的「時間」一栏读回实际值
- `initSmartTime()`：3 个文本框代替 6 个下拉框（select 收进隐藏 span，值同步）。`parseTimeInput` 识别 `1830`、`18:30`、全角、`18時半`、`午後6時半`、`6:30pm`；`25:30` → `01:30`。「翌日」标记按「早于前一个时间」推断（不单独保存）
- 告知文读取（界面已移到「告知文から入力」一行，见功能 9）：`parseAnnouncement` 同时支持标签在前（`開場/開演 17:30/18:30`）和时间在前（`17:30開場`），以配对数多的一种为准，另一种只补缺的项目且不能用主写法已用过的时间（混用：「開場 / 開演：10:45 / 11:30（20:30頃終演予定）」）；分隔允许「頃」「ごろ」；排除「販売開始」「受付終了」等
- 快捷按钮：開場 = 開演 −30/−60 分，終演 = 開演 +2h/+3h；无法识别的输入会在 capture 阶段阻止提交
- 页面自带的提交检查只比较小时，用 `return;` 而不是 `return false`：跨午夜时会弹出「開演時間を終演時間より後に…」但仍会提交（网站本身的问题，不修）
- 已用 jsdom 对保存的登录页 / 编辑页 HTML 测试过；用户已在真实页面试用（反馈过 `OPEN/START…18:20/18:50` 读不出：「…」经 NFKC 变成 `...`，已在 `GAP_RE` 里加入 `.` 和常见装饰符号）
- 小时 24 以后的值在最终保存一步是否被接受仍未验证（现在一律换算成 0–23）

## 其他想法（未做）

- 登录后检查自动生成的缩略图是否是网页截图（1000×1000），是的话提示去编辑页设置图片：用户决定先放着
- 用户不要的：登录后自动参加登录（`notes/add`）、关联链接清理（去掉跟踪参数）、终演时间自动补全的提示、第一个链接是 X 时的提醒（实测 x.com 多半能取到推文的图，见「图片」）

## 调试网站的方法（开发环境）

- 登录状态只保存 `_session_id` 一个值，在 `.local/session.json`（`.local/` 整个被 gitignore）。服务器每次请求都会续期（约 14 天滚动）
  - `pnpm site login`：用 playwright-core 启动本机 Chrome（独立配置 `.local/chrome-profile`，会保留），用户在里面登录后自动保存
  - `pnpm site login --paste`：粘贴 `_session_id`（或整串 Cookie），也可以用管道传入
  - `pnpm site check`：显示登录状态和到期时间；`pnpm site fetch <path>`：页面存到 `.local/pages/`
- **所有请求都走 `scripts/lib/site.ts` 的 `siteFetch`**：只发一个 Cookie 头，并且只允许 GET 和 POST `/events/add/confirm`，其他请求直接抛错（`test/e2e/guard.test.ts` 有测试）。不要再手写 curl 带 Cookie
  - 提交到确认页用 `postConfirm(fill)`：按浏览器的方式序列化 `#event_form`，自动带上 CSRF token。测试数据用活动名「テスト（登録しません）」
- 不要打印 Cookie / session 的值
- **不要**在未经同意的情况下 POST 到 `/events/add/complete` 或 `edit/complete`（`siteFetch` 也会拒绝）
- 2026-10-07 的调查：之前以为是「登录过期」，其实是没带 CSRF token。Rails 校验失败时作废会话 → 被重定向到 `/login`。另外只提交 token + 活动名（缺日期等字段）时服务器直接 500，服务器几乎不做输入检查
- e2e 测试（`pnpm test:e2e`，先 `vite build`）：`test/e2e/harness.ts` 用 `siteFetch` 实时获取页面，在 jsdom 里连同页面自带的脚本运行构建好的用户脚本；用户脚本发出的 fetch 也经过 `siteFetch`（jsdom 的 AbortSignal 要转成 Node 的）。页面自带脚本的 XHR 不带登录状态，也不经过 `siteFetch`（目前只有 GET）。编辑页测试用活动 494909（用户自己登录的）。未登录时整组跳过；CI 只跑 `pnpm test`（单元测试）
- 旧的 `cookie.local.txt` 已不再使用
- e2e 的 `openPage(path, { mobile: true })` 用手机版页面（页面和用户脚本的请求都带 iPhone 的 User-Agent），见 `test/e2e/mobile.test.ts`
- **发布前在手机上试用**：`pnpm preview:serve` 构建测试版（`--mode preview`：名字带「（テスト版）」、命名空间 `…#preview`、版本号 `{version}.{构建时间}`，和正式版是两个脚本；输出 `dist/eventernote-event-form-plus.preview.user.js`，不复制到根目录）并在局域网提供（端口 4173）。手机连同一 Wi-Fi，在 Safari 打开 `http://{电脑的局域网 IP}:4173/eventernote-event-form-plus.preview.user.js` 安装。`pnpm dev` 不能用于手机：https 页面加载 http 开发服务器的代码会被当作混合内容拦截
