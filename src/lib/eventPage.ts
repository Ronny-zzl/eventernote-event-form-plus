import { GM_xmlhttpRequest } from '$';
import { parseHtml } from './page';

// 活动页（/events/{id}）的信息表。编辑页需要从这里补读一些值；多处使用，只请求一次
const cache = new Map<string, Promise<Document | null>>();

const fetchEventDoc = (eventId: string) => {
  let doc = cache.get(eventId);
  if (!doc) {
    doc = fetch(`/events/${eventId}`, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.text() : null))
      .then((html) => (html ? parseHtml(html) : null))
      .catch(() => null);
    cache.set(eventId, doc);
  }
  return doc;
};

// 电脑版活动页。手机版的「イベント登録/最終更新履歴」没有历史 ID 和准确时间，
// 而页面的 fetch 不能改 User-Agent，所以用 GM_xmlhttpRequest 带电脑版的 UA 取
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const fetchDesktopDoc = (eventId: string) => new Promise<Document | null>((resolve) => {
  GM_xmlhttpRequest({
    method: 'GET',
    url: `${location.origin}/events/${eventId}`,
    headers: { 'User-Agent': DESKTOP_UA },
    onload: (res) => resolve(res.status === 200 ? parseHtml(res.responseText) : null),
    onerror: () => resolve(null),
    ontimeout: () => resolve(null),
  });
});

export type HistoryEntry = { id: string; user: string; time: string }; // time：「2026-10-27 14:06:17 +0900」

const HISTORY_RE = /showHistory\('(\d+)'\)/;
const parseHistoryList = (doc: Document): HistoryEntry[] =>
  [...doc.querySelectorAll('#authors li')].flatMap((li) => {
    const id = HISTORY_RE.exec(li.querySelector('a[href*="showHistory"]')?.getAttribute('href') ?? '')?.[1];
    const span = li.querySelector('span[title]');
    if (!id || !span) return [];
    const user = li.querySelector('a.noline')?.textContent?.replace(span.textContent ?? '', '').trim() ?? '';
    return [{ id, user, time: span.getAttribute('title') ?? '' }];
  });

// 编辑历史（新的在前）。取不到时返回 null
export const fetchHistoryList = async (eventId: string): Promise<HistoryEntry[] | null> => {
  const doc = await fetchEventDoc(eventId);
  const list = doc ? parseHistoryList(doc) : [];
  if (list.length) return list;
  const desktop = await fetchDesktopDoc(eventId);
  const fallback = desktop ? parseHistoryList(desktop) : [];
  return fallback.length ? fallback : null;
};

// 标题为 labels 之一的那一项的内容。电脑版是信息表 <td>标题</td><td>内容</td>，
// 手机版是 <h2 class="gb_subtitle">标题</h2> 后面跟内容（标题文字也可能不同，如「時間」/「開場/開演/終演時間」）
export const eventInfoCell = async (eventId: string, ...labels: string[]) => {
  const doc = await fetchEventDoc(eventId);
  const head = doc && [...doc.querySelectorAll('.gb_events_info_table td, h2.gb_subtitle')]
    .find((el) => labels.includes(el.textContent?.trim() ?? ''));
  return head ? head.nextElementSibling : null;
};
