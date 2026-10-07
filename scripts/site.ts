// 开发用命令行工具：pnpm site <command>
//   login           打开 Chrome，在里面登录 eventernote 后自动保存 _session_id
//   login --paste   手动粘贴 _session_id（DevTools → Application → Cookies）
//   check           显示登录状态和到期时间（不显示 Cookie 的值）
//   fetch <path>    带登录状态获取页面，保存到 .local/pages/
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { text } from 'node:stream/consumers';
import { setTimeout as sleep } from 'node:timers/promises';
import { BASE, LOCAL_DIR, loadSession, saveSession, siteFetch, whoami } from './lib/site.ts';

const save = async (sessionId: string) => {
  saveSession({ sessionId, updatedAt: new Date().toISOString() });
  const user = await whoami();
  if (user) saveSession({ ...loadSession()!, user });
  return user;
};

const status = () => {
  const s = loadSession();
  const expires = s?.expires ? new Date(s.expires).toLocaleString('ja-JP') : '不明';
  return s?.user ? `登录中：${s.user}（到期 ${expires}）` : '未登录';
};

// 在独立的 Chrome 配置（.local/chrome-profile）里登录。配置会保留，下次多半已是登录状态
const loginWithChrome = async () => {
  const { chromium } = await import('playwright-core');
  const context = await chromium.launchPersistentContext(join(LOCAL_DIR, 'chrome-profile'), {
    channel: 'chrome',
    headless: false,
    viewport: null,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${BASE}/login`);
  console.log('请在打开的 Chrome 里登录 Eventernote，登录后会自动保存（关闭窗口则取消）…');
  try {
    while (context.pages().length) {
      // 离开登录页后确认一下（未登录时也有 _session_id，是匿名会话）
      const cookie = (await context.cookies(BASE)).find((c) => c.name === '_session_id');
      if (cookie && !page.url().includes('/login') && (await save(cookie.value))) return true;
      await sleep(2000);
    }
    return false;
  } finally {
    await context.close().catch(() => {});
  }
};

// 也可以用管道传入：pnpm site login --paste < 文件
const loginWithPaste = async () => {
  let answer: string;
  if (process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    answer = await rl.question('粘贴 _session_id 的值（或包含它的整串 Cookie）：');
    rl.close();
  } else {
    answer = await text(process.stdin);
  }
  const sessionId = answer.match(/_session_id=([^;\s]+)/)?.[1] ?? answer.trim();
  return !!sessionId && !!(await save(sessionId));
};

const [command, ...args] = process.argv.slice(2);

if (command === 'login') {
  const ok = args.includes('--paste') ? await loginWithPaste() : await loginWithChrome();
  console.log(ok ? `已保存。${status()}` : '没有完成登录。');
  process.exitCode = ok ? 0 : 1;
} else if (command === 'check') {
  const session = loadSession();
  const user = session ? await whoami() : null;
  if (session) saveSession({ ...loadSession()!, user: user ?? undefined });
  console.log(user ? status() : '未登录或会话已失效。请运行 pnpm site login');
  process.exitCode = user ? 0 : 1;
} else if (command === 'fetch' && args[0]) {
  const res = await siteFetch(args[0]);
  const file = join(LOCAL_DIR, 'pages', args[0].replace(/^\//, '').replace(/[^\w.-]+/g, '_') + '.html');
  mkdirSync(join(LOCAL_DIR, 'pages'), { recursive: true });
  writeFileSync(file, await res.text());
  console.log(`${res.status} → ${file}`);
} else {
  console.log('用法：pnpm site login [--paste] | check | fetch <path>');
  process.exitCode = 1;
}
