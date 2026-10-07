/// <reference types="vitest/config" />
import { copyFileSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const repo = 'https://github.com/Ronny-zzl/eventernote-event-form-plus';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const names: Record<string, string> = {
  '': 'Eventernote イベント登録エンハンサー',
  ja: 'Eventernote イベント登録エンハンサー',
  'zh-CN': 'Eventernote 活动登录增强',
  en: 'Eventernote Add Event Enhancer',
};

// pnpm build:preview（--mode preview）：发布前在手机等设备上试用的测试版。
// 名字和命名空间不同，在 Tampermonkey 里和正式版是两个脚本；版本号带构建时间，重新构建后会被识别为更新
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';
  const fileName = preview ? 'eventernote-event-form-plus.preview.user.js' : 'eventernote-event-form-plus.user.js';
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

  return {
    test: {
      projects: [
        // 不依赖网络的单元测试（CI 跑这一组）
        { test: { name: 'unit', include: ['test/*.test.ts'] } },
        // 用真实页面和 API 的测试：需要 pnpm site login，先 vite build
        { test: { name: 'e2e', include: ['test/e2e/*.test.ts'], testTimeout: 90_000, hookTimeout: 90_000, fileParallelism: false } },
      ],
    },
    // 局域网内的手机访问测试版（pnpm preview:serve）
    preview: { host: true, port: 4173, strictPort: true },
    plugins: [
      monkey({
        entry: 'src/main.ts',
        userscript: {
          name: preview ? Object.fromEntries(Object.entries(names).map(([k, v]) => [k, `${v}（テスト版）`])) : names,
          description: {
            '': 'イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加',
            ja: 'イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加',
            'zh-CN': '改善 Eventernote 活动登录和编辑页面：会场搜索、时间输入改进、出演者排序、出演者组合、从确认页返回修改、添加缩略图',
            en: 'Improves the Eventernote event add/edit forms: venue search, smarter time input, reorder performers, performer sets, back button on the confirm page, thumbnail images',
          },
          namespace: preview ? `${repo}#preview` : repo,
          version: preview ? `${version}.${stamp}` : version,
          author: 'Ronny-zzl',
          license: 'MIT',
          homepageURL: repo,
          supportURL: `${repo}/issues`,
          match: ['https://www.eventernote.com/events/*'],
          'run-at': 'document-idle',
        },
        build: { fileName },
      }),
      // 正式版的产物必须放在仓库根目录的同名文件：已安装的用户和 Greasy Fork 都从这个 URL 更新
      ...(preview ? [] : [{ name: 'copy-to-root', apply: 'build' as const, closeBundle: () => copyFileSync(`dist/${fileName}`, fileName) }]),
    ],
  };
});
