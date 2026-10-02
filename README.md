# eventernote-enhancer

改善 [eventernote 活动创建页面](https://www.eventernote.com/events/add) 的 Tampermonkey 用户脚本。

## 安装

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 新建脚本，粘贴 `eventernote-add-enhancer.user.js` 的内容并保存
3. 打开 https://www.eventernote.com/events/add ，控制台出现 `[EN Enhancer] loaded` 即表示生效

## 功能

- **出演者排序**：已选择的出演者可以拖动（☰）或用 ▲▼ 调整顺序，提交时按此顺序发送
- **出演者组合**：把已选的出演者（如团体 + 全体成员）保存为组合，之后一键全部添加；组合保存在 Tampermonkey 本地存储中
- **从确认页返回修改**：确认页增加「戻って修正する」按钮，返回表单页时恢复全部已填内容（包括出演者和会场）
- **缩略图**：登录页可以拖入、Ctrl+V 粘贴或选择文件添加图片；登录完成后自动通过活动编辑功能上传（会核对活动名和会场，30 分钟内有效）
- **编辑页图片**：活动编辑页的图片字段同样支持拖入、Ctrl+V 粘贴和选择文件，并显示新旧图片预览
