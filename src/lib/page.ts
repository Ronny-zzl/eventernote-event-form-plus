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
