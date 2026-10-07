/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const fileName = 'eventernote-event-form-plus.user.js';
const repo = 'https://github.com/Ronny-zzl/eventernote-event-form-plus';

export default defineConfig({
  test: {
    projects: [
      // 不依赖网络的单元测试（CI 跑这一组）
      { test: { name: 'unit', include: ['test/*.test.ts'] } },
      // 用真实页面和 API 的测试：需要 pnpm site login，先 vite build
      { test: { name: 'e2e', include: ['test/e2e/*.test.ts'], testTimeout: 90_000, hookTimeout: 90_000, fileParallelism: false } },
    ],
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: {
          '': 'Eventernote イベント登録エンハンサー',
          ja: 'Eventernote イベント登録エンハンサー',
          'zh-CN': 'Eventernote 活动登录增强',
          en: 'Eventernote Add Event Enhancer',
        },
        description: {
          '': 'イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加',
          ja: 'イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加',
          'zh-CN': '改善 Eventernote 活动登录和编辑页面：会场搜索、时间输入改进、出演者排序、出演者组合、从确认页返回修改、添加缩略图',
          en: 'Improves the Eventernote event add/edit forms: venue search, smarter time input, reorder performers, performer sets, back button on the confirm page, thumbnail images',
        },
        namespace: repo,
        author: 'Ronny-zzl',
        license: 'MIT',
        homepageURL: repo,
        supportURL: `${repo}/issues`,
        match: ['https://www.eventernote.com/events/*'],
        'run-at': 'document-idle',
      },
      build: { fileName },
    }),
    // 产物必须放在仓库根目录的同名文件：已安装的用户和 Greasy Fork 都从这个 URL 更新
    { name: 'copy-to-root', apply: 'build', closeBundle: () => copyFileSync(`dist/${fileName}`, fileName) },
  ],
});
