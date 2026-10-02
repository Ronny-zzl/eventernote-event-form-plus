# CLAUDE.md

Eventernote（https://www.eventernote.com/ ）活动登录页 / 编辑页的 Tampermonkey 用户脚本。

- 仓库：https://github.com/Ronny-zzl/eventernote-event-form-plus （公开，MIT）
- 唯一源码文件：`eventernote-event-form-plus.user.js`（无构建步骤，检查语法用 `node --check`）
- 当前版本：`0.2.0`（已打 `v0.2.0` 标签并推送，GitHub Release 附更新说明）

## 约定

- **页面上显示的文字一律用日语**（网站是日本网站），用词跟随网站原有风格（「追加する」「選んでください」等）
- 代码注释用中文；README 日语为主，末尾附中文说明；更新说明写在 `CHANGELOG.md`（同样日语为主、附中文），发布时也作为 GitHub Release 的说明
- 提交信息用英文
- 每次发布要提高 `@version`（Tampermonkey 和 Greasy Fork 靠它判断更新），README 功能列表同步更新
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

### 已有数据的时间惯例
- 抽查 2026-07〜10 的 11143 条时间，全部是 5 分钟一档，没有 24 点以后的值
- 跨午夜活动写成「终演早于开演」，如 `開演 22:00 終演 05:00`

## 已实现功能（1–5 在 0.1.0，6 在 0.2.0）

1. **出演者排序**：拖动 ☰ 或 ▲▼；调整 DOM 后同步 `unsafeWindow.selected_actors` 和 `#actor_ids`
2. **出演者セット**：把已选出演者存为组合（`GM_setValue('actorPresets')`），一键添加
3. **确认页「戻って修正する」**：登录页提交时存快照（`formSnapshot`），跳回 `/events/add?ene_restore=1` 后恢复全部字段
4. **登录页缩略图**：拖入 / Ctrl+V / 选文件（`createImageDrop` 组件）→ `draftImage` → 确认页提交时转为 `pendingUpload`（30 分钟有效）→ 完成后在完成页链接或活动页 URL 找到新活动 ID，**核对活动名和会场**后用编辑页原样提交 + `thumbnail_image`
5. **编辑页图片框**：同一组件，选中的图片用 `DataTransfer` 塞进原生 `thumbnail_image`
6. **时间输入**：见下方「时间输入改进」一节

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
- 「告知文から読み取る」框，以及往时间框里粘贴带标签的文字：`parseAnnouncement` 同时支持标签在前（`開場/開演 17:30/18:30`）和时间在前（`17:30開場`），取配对数多的一种；排除「販売開始」「受付終了」等
- 快捷按钮：開場 = 開演 −30/−60 分，終演 = 開演 +2h/+3h；无法识别的输入会在 capture 阶段阻止提交
- 页面自带的提交检查只比较小时，用 `return;` 而不是 `return false`：跨午夜时会弹出「開演時間を終演時間より後に…」但仍会提交（网站本身的问题，不修）
- 已用 jsdom 对保存的登录页 / 编辑页 HTML 测试过；用户已在真实页面试用（反馈过 `OPEN/START…18:20/18:50` 读不出：「…」经 NFKC 变成 `...`，已在 `GAP_RE` 里加入 `.` 和常见装饰符号）
- 小时 24 以后的值在最终保存一步是否被接受仍未验证（现在一律换算成 0–23）

## 其他想法（未做）

- 把出演者排序 / セット也用到编辑页（结构相同）
- 搜索框防抖、IME 处理、Enter 误提交；草稿自动保存；启用重复检查

## 调试网站的方法

- `/events/add`、编辑页等需要登录。用户提供过 Cookie：放在仓库根目录 `cookie.local.txt`（已被 `.gitignore` 忽略），内容是**不带 `Cookie:` 前缀**的原始 Cookie 字符串，用法：
  `curl -H "Cookie: $(tr -d '\r\n' < cookie.local.txt)" ...`
- 不要打印 Cookie 内容
- 只允许 GET，以及 POST 到 `/events/add/confirm`（不会登录活动，测试数据用活动名「テスト（登録しません）」）。**不要**在未经同意的情况下 POST 到 `/events/add/complete` 或 `edit/complete`
- 新机器上没有这个文件，需要时请用户重新提供
