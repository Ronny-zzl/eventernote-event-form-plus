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

// 信息表中标题为 label 的那一行的内容单元格
export const eventInfoCell = async (eventId: string, label: string) => {
  const doc = await fetchEventDoc(eventId);
  const head = doc && [...doc.querySelectorAll('.gb_events_info_table td')]
    .find((td) => td.textContent?.trim() === label);
  return head ? head.nextElementSibling : null;
};
