// e2e 测试：用登录状态获取真实页面，在 jsdom 里连同页面自带的脚本运行构建好的用户脚本。
// 用户脚本发出的请求也经过 siteFetch，所以同样只能 GET 和 POST 确认页
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { BASE, loadSession, siteFetch } from '../../scripts/lib/site.ts';

export { sleep };
export const loggedIn = !!loadSession()?.user;

// 编辑页测试用的活动：用户自己登录的活动（494909，有关联链接，会场在东京都）
export const EDIT_EVENT_ID = '494909';

const SCRIPT = join(import.meta.dirname, '..', '..', 'dist', 'eventernote-event-form-plus.user.js');
const THIRD_PARTY = /<script[^>]*(googlesyndication|twitter|mixi|rakuten|googletagmanager)[^>]*><\/script>/g;

const pages = new Map<string, Promise<string>>();
export const fetchHtml = (path: string) => {
  if (!pages.has(path)) pages.set(path, siteFetch(path).then((res) => res.text()));
  return pages.get(path)!;
};

type Options = {
  html?: string; // 不从网站取，直接用这段 HTML
  store?: Record<string, unknown>; // GM 存储，多个页面共用同一个对象即可模拟跨页
  routes?: Record<string, string>; // 用户脚本请求这些 path 时返回指定的 HTML
  confirm?: boolean; // window.confirm 的返回值
};

export type Page = Awaited<ReturnType<typeof openPage>>;

export const openPage = async (path: string, { html, store = {}, routes = {}, confirm = true }: Options = {}) => {
  const source = (html ?? (await fetchHtml(path))).replace(THIRD_PARTY, '');
  const dom = new JSDOM(source, {
    url: BASE + path,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole: new VirtualConsole(), // 不显示页面脚本 / 外部资源的报错
  });
  const w = dom.window;
  await new Promise((resolve) => w.addEventListener('load', resolve));

  const dialogs: string[] = [];
  Object.assign(w, {
    unsafeWindow: w,
    GM_addStyle: () => {},
    GM_getValue: (key: string, fallback: unknown) => (key in store ? structuredClone(store[key]) : fallback),
    GM_setValue: (key: string, value: unknown) => { store[key] = structuredClone(value); },
    alert: (message: string) => { dialogs.push(message); },
    confirm: (message: string) => { dialogs.push(message); return confirm; },
    fetch: (input: string | URL, { signal, ...init }: RequestInit = {}) => {
      const url = new URL(input, BASE);
      const route = url.origin === BASE ? routes[url.pathname] : undefined;
      if (route !== undefined) return Promise.resolve(new Response(route));
      // jsdom 的 AbortSignal 不能直接交给 Node 的 fetch，转成 Node 的
      const controller = new AbortController();
      signal?.addEventListener('abort', () => controller.abort());
      return siteFetch(url, { ...init, signal: controller.signal });
    },
  });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.eval(readFileSync(SCRIPT, 'utf8'));
  await sleep(50); // MutationObserver 等异步处理

  const d = w.document;
  return {
    window: w,
    document: d,
    store,
    dialogs,
    $: <T extends Element = HTMLElement>(selector: string) => d.querySelector<T>(selector)!,
    $$: <T extends Element = HTMLElement>(selector: string) => [...d.querySelectorAll<T>(selector)],
    byId: <T extends HTMLElement = HTMLElement>(id: string) => d.getElementById(id) as T,
    fire: (el: Element, type: string, init: Record<string, unknown> = {}) => {
      const e = Object.assign(new w.Event(type, { bubbles: true, cancelable: true }), init);
      el.dispatchEvent(e);
      return e;
    },
    click: (el: Element, init: MouseEventInit = {}) =>
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, ...init })),
    // 等到条件成立（真实 API 要几秒）
    until: async (check: () => unknown, timeout = 20_000) => {
      for (const end = Date.now() + timeout; Date.now() < end; await sleep(200)) if (check()) return;
      throw new Error('timeout');
    },
    close: () => w.close(),
  };
};

// 在搜索框（会场 / 出演者）里输入并等结果出来
export const searchIn = async (page: Page, input: HTMLInputElement, keyword: string) => {
  input.focus();
  input.value = keyword;
  page.fire(input, 'input');
  const list = input.closest('.ene-search')!.querySelector('.ene-suggest')!;
  await page.until(() => list.querySelector('li:not(.ene-heading)'));
  return [...list.querySelectorAll<HTMLLIElement>('li:not(.ene-heading)')];
};

export const mousedown = (page: Page, el: Element) =>
  el.dispatchEvent(new page.window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
