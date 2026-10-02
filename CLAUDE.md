# CLAUDE.md

Eventernote（https://www.eventernote.com/ ）活动登录页 / 编辑页的 Tampermonkey 用户脚本。

- 仓库：https://github.com/Ronny-zzl/eventernote-event-form-plus （公开，MIT）
- 唯一源码文件：`eventernote-event-form-plus.user.js`（无构建步骤，检查语法用 `node --check`）
- 当前版本：`0.1.0`（已打 `v0.1.0` 标签并推送）

## 约定

- **页面上显示的文字一律用日语**（网站是日本网站），用词跟随网站原有风格（「追加する」「選んでください」等）
- 代码注释用中文；README 日语为主，末尾附中文说明
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

## 已实现功能（全部在 0.1.0 中）

1. **出演者排序**：拖动 ☰ 或 ▲▼；调整 DOM 后同步 `unsafeWindow.selected_actors` 和 `#actor_ids`
2. **出演者セット**：把已选出演者存为组合（`GM_setValue('actorPresets')`），一键添加
3. **确认页「戻って修正する」**：登录页提交时存快照（`formSnapshot`），跳回 `/events/add?ene_restore=1` 后恢复全部字段
4. **登录页缩略图**：拖入 / Ctrl+V / 选文件（`createImageDrop` 组件）→ `draftImage` → 确认页提交时转为 `pendingUpload`（30 分钟有效）→ 完成后在完成页链接或活动页 URL 找到新活动 ID，**核对活动名和会场**后用编辑页原样提交 + `thumbnail_image`
5. **编辑页图片框**：同一组件，选中的图片用 `DataTransfer` 塞进原生 `thumbnail_image`

`@match` 是 `https://www.eventernote.com/events/*`，入口在文件末尾按 pathname 分发。

### 测试状态
- 用户实际试用过：登录页图片自动上传（「看起来成功了」）
- 编辑页的重建表单逻辑用保存的编辑页 HTML + jsdom 离线验证过（字段与原值一致）
- 其他功能只做过语法检查，未见用户反馈问题；编辑页图片框尚未确认

## 进行中：开场 / 开演 / 终演时间输入改进（尚未开始写代码）

已向用户提出的方案（等用户确认后实现）：
- 用 3 个「智能文本框」代替 6 个下拉框：识别 `1830`、`18:30`、`18時30分`、`18時半` 等；原 select 隐藏并同步
- 「从公告粘贴」：粘贴 `開場 17:30 / 開演 18:30`、`OPEN 17:00 / START 18:00` 等文字自动填入
- 快捷按钮：開場 = 開演 −30/−60 分，終演 = 開演 +2h/+3h
- 默认四舍五入到 5 分钟并提示；输入 `25:30` 自动转成 `01:30` 并标「翌日」（沿用已有数据的惯例）

**未决事项**：最终保存一步（`complete` / `edit/complete`）是否接受非 5 分钟的分钟值未知。验证需要真的修改一个活动，已建议用户在自己登录的活动上用编辑页试改再改回——**未经用户同意不要做**。

## 其他想法（未做）

- 把出演者排序 / セット也用到编辑页（结构相同）
- 搜索框防抖、IME 处理、Enter 误提交；草稿自动保存；启用重复检查

## 调试网站的方法

- `/events/add`、编辑页等需要登录。用户提供过 Cookie：放在仓库根目录 `cookie.local.txt`（已被 `.gitignore` 忽略），内容是**不带 `Cookie:` 前缀**的原始 Cookie 字符串，用法：
  `curl -H "Cookie: $(tr -d '\r\n' < cookie.local.txt)" ...`
- 不要打印 Cookie 内容
- 只允许 GET，以及 POST 到 `/events/add/confirm`（不会登录活动，测试数据用活动名「テスト（登録しません）」）。**不要**在未经同意的情况下 POST 到 `/events/add/complete` 或 `edit/complete`
- 新机器上没有这个文件，需要时请用户重新提供
