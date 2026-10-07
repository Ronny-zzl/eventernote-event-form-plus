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

// 标题为 labels 之一的那一项的内容。电脑版是信息表 <td>标题</td><td>内容</td>，
// 手机版是 <h2 class="gb_subtitle">标题</h2> 后面跟内容（标题文字也可能不同，如「時間」/「開場/開演/終演時間」）
export const eventInfoCell = async (eventId: string, ...labels: string[]) => {
  const doc = await fetchEventDoc(eventId);
  const head = doc && [...doc.querySelectorAll('.gb_events_info_table td, h2.gb_subtitle')]
    .find((el) => labels.includes(el.textContent?.trim() ?? ''));
  return head ? head.nextElementSibling : null;
};
