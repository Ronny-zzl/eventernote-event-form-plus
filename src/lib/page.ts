import { unsafeWindow } from '$';

// 页面自带的全局变量和函数
type PageWindow = Window & {
  selected_actors?: (string | number)[];
  addActor: (id: string, name: string) => void;
  removeActor: (id: string) => void;
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

// 手机浏览器访问时网站返回另一套页面（smartphone.css），表单的 ID 相同但表格结构不同
export const isSmartphone = () => !!document.querySelector('link[href*="smartphone.css"]');

// 表单的一个项目：电脑版是 <tr><td>标题</td><td>内容</td></tr>，手机版是 <tr><th>标题</th></tr><tr><td>内容</td></tr>
const usesHeadRows = (row: Element) => !!row.closest('table')?.querySelector('th');

// row 所在项目的第一行（手机版是它前面的标题行）
export const fieldStart = (row: HTMLTableRowElement) => {
  const prev = row.previousElementSibling;
  return usesHeadRows(row) && prev?.querySelector('th') ? (prev as HTMLTableRowElement) : row;
};

// 在 before 这一行之前插入一个项目（按页面的表格结构），返回内容单元格
export const insertField = (before: HTMLTableRowElement, label: string) => {
  const cell = document.createElement('td');
  if (usesHeadRows(before)) {
    const head = document.createElement('tr');
    const body = document.createElement('tr');
    head.append(Object.assign(document.createElement('th'), { textContent: label }));
    body.append(cell);
    before.before(head, body);
  } else {
    const row = document.createElement('tr');
    row.append(Object.assign(document.createElement('td'), { textContent: label }), cell);
    before.before(row);
  }
  return cell;
};

// 解码 HTML 实体（&amp; → &）。编辑页的内联脚本把出演者名按 HTML 转义后写进了 JS 字符串，
// 页面的 addActor 再原样显示，于是出现「IBERIs&amp;」
export const decodeEntities = (text: string) =>
  text.includes('&') ? (parseHtml(text).body.textContent ?? text) : text;
