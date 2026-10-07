import { unsafeWindow } from '$';

// 页面自带的全局变量和函数
type PageWindow = Window & {
  selected_actors?: (string | number)[];
  addActor: (id: string, name: string) => void;
  searchPlaces: (prefecture: string, placeId?: string) => void;
};

export const page = unsafeWindow as unknown as PageWindow;

export const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const pad2 = (n: number) => String(n).padStart(2, '0');

// 页面内联脚本里的 searchPlaces(都道府県, 会场ID)：编辑页等预先指定的会场
export const findInitialPlace = (doc: Document = document) => {
  for (const s of doc.querySelectorAll('script:not([src])')) {
    const m = s.textContent?.match(/searchPlaces\(\s*(\d*)\s*,\s*(\d+)\s*\)/);
    if (m) return { prefecture: m[1], id: m[2] };
  }
  return null;
};

export const parseHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html');

// 把 el 及其后面的兄弟节点（原下拉框和「年」「時」等文字）收进一个隐藏的 span，返回这个 span
export const hideFrom = (el: Element) => {
  const hidden = document.createElement('span');
  hidden.style.display = 'none';
  el.before(hidden);
  while (hidden.nextSibling) hidden.append(hidden.nextSibling);
  return hidden;
};

// 文本框里按 Enter 会直接提交表单，改成执行 fn
export const onEnter = (input: HTMLInputElement, fn: () => void) =>
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    fn();
  });
