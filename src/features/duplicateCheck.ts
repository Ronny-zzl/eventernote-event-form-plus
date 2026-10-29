import { byId, pad2 } from '../lib/page';
import { findDuplicates, type ApiEvent, type Duplicate, type DuplicateQuery } from './duplicate';

// 重复登录提醒：同一天、同一会场、開演时间相同、有共同出演者的活动已经登录时，在出演者栏下方提示，
// 提交前检查也会列出（判定理由见 duplicate.ts）。
// 日期、会场、出演者、时间会被很多地方改（快照恢复、告知文、セット、页面自己的 addActor），脚本改值不触发事件，
// 所以每秒读一次表单。按「日期 + 会场」请求（当天该会场的活动只有几件），出演者和时间在本地比较
const INTERVAL_MS = 1000;
const SHOWN_ACTORS = 3;

const cache = new Map<string, Promise<ApiEvent[]>>();

// 日期必须补零：不补零时服务器忽略日期条件；place_id 为空时同样被忽略（返回当天全部活动）
const fetchEvents = (date: string, placeId: string) => {
  const key = `${date}|${placeId}`;
  let result = cache.get(key);
  if (!result) {
    const params = new URLSearchParams({ event_date: date, place_id: placeId, limit: '1000' });
    // 失败时当作没有（不重试，不妨碍填表）
    result = fetch('/api/events/search?' + params, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json: { results?: ApiEvent[] }) => json.results ?? [])
      .catch(() => []);
    cache.set(key, result);
  }
  return result;
};

const readForm = (selfId?: string) => {
  const val = (id: string) => byId<HTMLInputElement | HTMLSelectElement>(id)?.value ?? '';
  const [y, m, d, hour, minute] = ['date_year', 'date_month', 'date_day', 'start_time_hour', 'start_time_minute'].map(val);
  const query: DuplicateQuery = {
    selfId,
    actorIds: val('actor_ids').split(',').filter(Boolean),
    placeId: val('places_list'),
    start: hour && minute ? `${pad2(Number(hour))}:${pad2(Number(minute))}` : '',
  };
  const date = y && m && d ? `${y}-${pad2(Number(m))}-${pad2(Number(d))}` : '';
  return { date, query };
};

const describe = (dup: Duplicate) => {
  const names = dup.sharedActors.slice(0, SHOWN_ACTORS).join('、');
  const rest = dup.sharedActors.length - SHOWN_ACTORS;
  const flags = [dup.canceled && '中止', dup.postponed && '延期'].filter(Boolean).map((f) => `【${f}】`).join('');
  return { title: `『${dup.name}』`, detail: `${flags} ${dup.start}（共通の出演者：${names}${rest > 0 ? ` ほか ${rest} 名` : ''}）` };
};

// 提交前检查用：最近一次判定的结果
let latest: Duplicate[] = [];
export const duplicateProblems = () =>
  latest.map((dup) => {
    const { title, detail } = describe(dup);
    return `重複の可能性：${title}${detail}`;
  });

export const initDuplicateCheck = (selfId?: string) => {
  const list = byId('selected_actors');
  if (!list || !byId('places_list') || !byId('date_year')) return;

  const box = document.createElement('div');
  box.className = 'ene-duplicate';
  box.hidden = true;
  list.closest('td')!.append(box);

  const render = (dups: Duplicate[]) => {
    latest = dups;
    box.hidden = !dups.length;
    box.replaceChildren('重複の可能性があるイベントがあります。登録済みでないか確認してください。');
    const ul = document.createElement('ul');
    for (const dup of dups) {
      const { title, detail } = describe(dup);
      const a = Object.assign(document.createElement('a'), { href: `/events/${dup.id}`, target: '_blank', rel: 'noopener', textContent: title });
      const li = document.createElement('li');
      li.append(a, detail);
      ul.append(li);
    }
    box.append(ul);
  };

  let lastKey = '';
  let seq = 0;
  const check = async () => {
    const { date, query } = readForm(selfId);
    const key = JSON.stringify([date, query]);
    if (key === lastKey) return;
    lastKey = key;
    const run = ++seq;
    if (!date || !query.start || !query.placeId || !query.actorIds.length) return render([]);
    const events = await fetchEvents(date, query.placeId);
    if (run === seq) render(findDuplicates(events, query));
  };
  check();
  setInterval(check, INTERVAL_MS);
};
