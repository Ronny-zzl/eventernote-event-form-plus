# CLAUDE.md

Eventernote（https://www.eventernote.com/ ）活动登录页 / 编辑页的 Tampermonkey 用户脚本。

- 仓库：https://github.com/Ronny-zzl/eventernote-event-form-plus （公开，MIT）
- 当前已发布版本：`0.2.3`（已打 `v0.2.3` 标签并推送，GitHub Release 附更新说明；Greasy Fork 通过 webhook 自动同步）
- 开发中：`0.3.0`（会场搜索框 + 日期选择器 + TypeScript 工程化），已全部提交，**尚未推送 / 发布**

## 工程结构

- 源码在 `src/`（TypeScript 7），用 Vite + `vite-plugin-monkey` 打包。`==UserScript==` 头部在 `vite.config.ts` 里配置，版本号取自 `package.json`，`@grant` 自动生成
- **根目录的 `eventernote-event-form-plus.user.js` 是构建产物，不要手改**。它必须留在这个路径并提交：已安装的用户和 Greasy Fork 都从它的 raw URL 更新。构建先输出到 `dist/`（忽略），再由 `vite.config.ts` 里的小插件复制到根目录
- **产物不压缩**：Greasy Fork 禁止压缩 / 混淆的代码
- 包管理器 pnpm。命令：`pnpm build` / `pnpm dev`（开发服务器，Tampermonkey 自动更新）/ `pnpm typecheck` / `pnpm lint`（oxlint）/ `pnpm test`（vitest）
- CI（`.github/workflows/ci.yml`）：typecheck、lint、test、build，并检查提交的 `.user.js` 和构建结果一致
- 目录：`src/main.ts`（按页面分发）、`src/style.css`（全部样式，打包时用 GM_addStyle 注入）、`src/lib/`（page = 页面全局变量与小工具、storage = 带类型的 GM 存储、notice、eventPage = 活动页读取缓存）、`src/features/`（actors、announce、date、time、place、snapshot、thumbnail；纯函数放在 `timeParse.ts`、`dateParse.ts`、`placeRank.ts`，供单元测试）
- GM API 从 `'$'` 导入（vite-plugin-monkey 的别名）。依赖 `'$'` 的模块在 vitest 里无法加载，所以要测试的逻辑写成不依赖它的纯函数模块
- 代码风格：类型用 `type`，函数用箭头函数（oxlint 的 `consistent-type-definitions`、`func-style` 规则强制）；尽量简洁
- 换行统一 LF（`.gitattributes`：`* text=auto eol=lf`）
- 页面级的 jsdom 测试（用保存的页面 HTML + 真实 API）目前只在本地临时脚本里跑过，没有放进仓库：页面 HTML 含登录用户的信息，不适合提交

## 约定

- **页面上显示的文字一律用日语**（网站是日本网站），用词跟随网站原有风格（「追加する」「選んでください」等）
- 代码注释用中文；README 日语为主，末尾附中文说明；更新说明写在 `CHANGELOG.md`（同样日语为主、附中文），发布时也作为 GitHub Release 的说明
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
- 时间是 6 个 select：`#open_time_hour/minute`、`#start_time_*`、`#end_time_*`，分钟 5 分钟一档，小时 00–23
- 会场：`#prefecture_id` → `#places_list`（`name=place_id`）；搜索框选会场时**不会**同步都道府県
  - `/api/places/search?prefecture=13&simple=1&limit=-1`：东京都 6124 个会场、约 368KB、实测 6.5 秒，按 ID 排序（不是名字），有空名字的条目
  - `/api/places/search?keyword=…&simple=3&limit=50[&prefecture=13]`：约 0.8 秒；名字和地址都会匹配，不支持读音（「ぜっぷ」「ぶどうかん」0 件）；返回 id/place_name/prefecture/address/capacity 等；已关闭的会场名带「(閉館)」
  - 编辑页加载时内联脚本立即调用 `searchPlaces(都道府県, 会场ID)`；编辑页的 `searchPlaces` 回调会**先清空** `#places_list` 再重建（登录页的只追加）。大列表到达前 `place_id` 是空的
- `?from_event_id=活动ID` 是官方的「复制活动登录」入口
- `validateEvent()`（同日同出演者重复检查）在页面里被注释掉了

### 确认页 `/events/add/confirm`
- 全部值放在隐藏字段，POST 到 `/events/add/complete`，只有一个「登録する」按钮，没有返回按钮
- **服务器在这一步不做校验**：分钟 `57`、小时 `24`/`25` 都原样接受并显示

### 编辑页 `/events/{id}/edit`
- `enctype="multipart/form-data"`，直接 POST 到 `/events/{id}/edit/complete`（无确认页）
- 图片字段 `<input type="file" name="thumbnail_image">`
- `place_id` 下拉框在 HTML 里是空的，由内联脚本 `searchPlaces(都道府県, 会场ID)` 填充——用 fetch+DOMParser 重建表单时**必须从脚本里解析会场 ID**，否则会清空会场

### 图片
- S3：`https://eventernote.s3.amazonaws.com/images/events/{id}.jpg`（原图，例 1200×620）和 `{id}_s.jpg`（高 300，用于列表 / OGP）；无图时用 `no_image.png`
- S3 允许跨域 GET（`Access-Control-Allow-Origin: *`），可读 `Last-Modified`；不存在的图片返回 **403**（不是 404）
- **新活动登录后，网站会在后台根据「関連リンク」自动生成图片**（OGP 图或网页截图，x.com 链接会得到坏掉的截图），约 5 秒后写入 S3，覆盖在此之前上传的图片（活动 494909：12:32:51 登录，12:32:52 脚本上传，12:32:56 被覆盖）。编辑页手动上传不会触发重新生成（494891 已确认）。**没有链接时不会生成**（494912：登录后约 100 秒 S3 仍是 403），但活动页照样引用 `{id}.jpg`，显示为坏图（网站本身的行为）
- 编辑历史 API：`GET /api/events/history?event_history_id=…`（活动页里 `showHistory(id)` 的 id）

### 已有数据的时间惯例
- 抽查 2026-07〜10 的 11143 条时间，全部是 5 分钟一档，没有 24 点以后的值
- 跨午夜活动写成「终演早于开演」，如 `開演 22:00 終演 05:00`

## 已实现功能（1–5 在 0.1.0，6 在 0.2.0）

1. **出演者排序**：拖动 ☰ 或 ▲▼；调整 DOM 后同步 `unsafeWindow.selected_actors` 和 `#actor_ids`
2. **出演者セット**：把已选出演者存为组合（`GM_setValue('actorPresets')`），从没保存过时默认显示示例セット「前橋ウィッチーズ」（`defaultPresets`，删光后存的是 `[]`，不会再出现），一键添加；列表里已有セット第一项（团体名）时，新成员插在它（及紧随其后的已有成员）后面，否则追加到末尾
   - 1、2 在登录页和编辑页都启用（编辑页从 0.2.2 起；已有出演者由内联脚本 `addActor(数字ID, 名字)` 加入，结构与登录页相同）
3. **确认页「戻って修正する」**：登录页提交时存快照（`formSnapshot`），跳回 `/events/add?ene_restore=1` 后恢复全部字段
4. **登录页缩略图**：拖入 / Ctrl+V / 选文件（`createImageDrop` 组件）→ `draftImage` → 确认页提交时转为 `pendingUpload`（30 分钟有效）→ 完成后在完成页链接或活动页 URL 找到新活动 ID，**核对活动名和会场**；有链接时先轮询 S3 等网站自动生成的图片出现（最多 60 秒），再用编辑页原样提交 + `thumbnail_image`，最后用 `Last-Modified` 确认已被替换。0.2.1 起；494918 实测：登录 13:03:54 → 等待后 13:04:00 上传 → 没有再被覆盖
5. **编辑页图片框**：同一组件，选中的图片用 `DataTransfer` 塞进原生 `thumbnail_image`
6. **时间输入**：见下方「时间输入改进」一节
7. **会场搜索框**（`initPlacePicker`）：都道府県 / 会场下拉框 / 原搜索框隐藏，换成一个搜索框（300ms 防抖、都道府県筛选、名字匹配优先、闭馆的排最后变灰、↑↓Enter）；`#places_list` 只保留选中的一项，用 MutationObserver 防止编辑页大列表到达后覆盖选择；编辑页 / `from_event_id` 从活动页「開催場所」读会场名立即显示；最近使った会場存在 `GM_setValue('recentPlaces')`（10 个）。活动页通过 `fetchEventDoc()` 只请求一次（时间分钟恢复也用它）
8. **開催日**（`features/date.ts`）：年 / 月 / 日三个下拉框隐藏，换成原生 `<input type="date">` + 星期显示；可选范围取自原年份下拉框（1980–2027），清空或超范围时恢复原值（原下拉框没有空选项）。下拉框的值不补零（`1`～`12`）
9. **告知文から入力**（`features/announce.ts`）：独立的一行，放在「開催日」行上方；粘贴告知文后同时填入開催日（`parseDate`）和開場・開演・終演（`parseAnnouncement`）。往时间框里粘贴带标签的文字也走这里。日期：带年份 > 带星期 > 其他；没写年份时按星期在今年 / 明年 / 去年里找，没有星期则取最近的将来（30 天内的过去算今年）

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
- 告知文读取（界面已移到「告知文から入力」一行，见功能 9）：`parseAnnouncement` 同时支持标签在前（`開場/開演 17:30/18:30`）和时间在前（`17:30開場`），取配对数多的一种；排除「販売開始」「受付終了」等
- 快捷按钮：開場 = 開演 −30/−60 分，終演 = 開演 +2h/+3h；无法识别的输入会在 capture 阶段阻止提交
- 页面自带的提交检查只比较小时，用 `return;` 而不是 `return false`：跨午夜时会弹出「開演時間を終演時間より後に…」但仍会提交（网站本身的问题，不修）
- 已用 jsdom 对保存的登录页 / 编辑页 HTML 测试过；用户已在真实页面试用（反馈过 `OPEN/START…18:20/18:50` 读不出：「…」经 NFKC 变成 `...`，已在 `GAP_RE` 里加入 `.` 和常见装饰符号）
- 小时 24 以后的值在最终保存一步是否被接受仍未验证（现在一律换算成 0–23）

## 其他想法（未做）

- 搜索框防抖、IME 处理、Enter 误提交；草稿自动保存；启用重复检查

## 调试网站的方法

- `/events/add`、编辑页等需要登录。用户提供过 Cookie：放在仓库根目录 `cookie.local.txt`（已被 `.gitignore` 忽略），内容是**不带 `Cookie:` 前缀**的原始 Cookie 字符串，用法：
  `curl -H "Cookie: $(tr -d '\r\n' < cookie.local.txt)" ...`
- 不要打印 Cookie 内容
- 只允许 GET，以及 POST 到 `/events/add/confirm`（不会登录活动，测试数据用活动名「テスト（登録しません）」）。**不要**在未经同意的情况下 POST 到 `/events/add/complete` 或 `edit/complete`
- 新机器上没有这个文件，需要时请用户重新提供
