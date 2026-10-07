// 开发用：带登录状态访问 eventernote.com（命令行工具和 e2e 测试共用）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

export const BASE = 'https://www.eventernote.com';
export const LOCAL_DIR = join(import.meta.dirname, '..', '..', '.local');
const SESSION_FILE = join(LOCAL_DIR, 'session.json');

// 只保存登录用的 _session_id（HttpOnly；服务器每次请求都会续期，约 14 天）
export type Session = { sessionId: string; user?: string; expires?: string; updatedAt: string };

export const loadSession = (): Session | null =>
  existsSync(SESSION_FILE) ? JSON.parse(readFileSync(SESSION_FILE, 'utf8')) : null;

export const saveSession = (session: Session) => {
  mkdirSync(LOCAL_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2) + '\n');
};

// 安全规则：只允许 GET，以及 POST 到 /events/add/confirm（确认页，不会真的登录活动）。
// /events/add/complete、/events/{id}/edit/complete 等会改动网站数据的请求一律拒绝
const POST_ALLOWED = new Set(['/events/add/confirm']);

export const assertAllowed = (method: string, url: URL) => {
  if (method === 'GET' || method === 'HEAD') return;
  if (method === 'POST' && url.origin === BASE && POST_ALLOWED.has(url.pathname)) return;
  throw new Error(`禁止的请求：${method} ${url.href}（只允许 GET 和 POST /events/add/confirm）`);
};

export const siteFetch = async (input: string | URL, init: RequestInit = {}) => {
  const url = new URL(input, BASE);
  assertAllowed((init.method ?? 'GET').toUpperCase(), url);
  const session = loadSession();
  const headers = new Headers(init.headers);
  // 只发这一个 Cookie 头（混用多个来源曾导致发出两个 Cookie 头）
  if (url.origin === BASE && session) headers.set('Cookie', `_session_id=${session.sessionId}`);
  const res = await fetch(url, { ...init, headers, redirect: 'manual' });

  // 记录续期后的到期时间
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('_session_id='));
  const expires = cookie?.match(/expires=([^;]+)/i)?.[1];
  if (session && expires && cookie!.startsWith(`_session_id=${session.sessionId};`)) {
    saveSession({ ...session, expires: new Date(expires).toISOString(), updatedAt: new Date().toISOString() });
  }
  return res;
};

// 当前登录的用户名；未登录（被重定向到登录页）时返回 null
export const whoami = async () => {
  const res = await siteFetch('/events/add');
  if (res.status !== 200) return null;
  return (await res.text()).match(/alt="([^"]+)" class="user-icon/)?.[1] ?? null;
};

// 按浏览器的方式提交登录表单到确认页（自动带上 CSRF token）。fill 用来填表单
export const postConfirm = async (fill: (form: HTMLFormElement) => void) => {
  const { window } = new JSDOM(await (await siteFetch('/events/add')).text());
  const form = window.document.getElementById('event_form') as HTMLFormElement;
  fill(form);
  const body = new URLSearchParams([...new window.FormData(form)].map(([k, v]) => [k, String(v)]));
  return siteFetch('/events/add/confirm', { method: 'POST', body });
};
