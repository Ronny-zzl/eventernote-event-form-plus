// 编辑历史（/api/events/history 的一条）→ 表单快照（纯函数，供单元测试）
import type { FormSnapshot } from '../lib/storage';
import type { EditValues } from './editDiff';

export type ApiHistory = {
  event_name: string;
  event_date: string; // "2026-12-19"
  open_time: string | null; // "17:30"
  start_time: string | null;
  end_time: string | null;
  actor_id: string; // "54459,80126"，按出演者列表的顺序
  link: string | null;
  description: string | null;
  hashtag: string | null;
  actors?: { id: number; name: string }[];
  place?: { id: number; place_name: string; prefecture: number } | null;
};

const time = (key: string, value: string | null): Record<string, string> => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  return {
    [`${key}_time_hour`]: m ? m[1].padStart(2, '0') : '',
    [`${key}_time_minute`]: m ? m[2] : '',
  };
};

// 下拉框的值：年月日不补零，时分补零（和页面的 option 一致）
export const historySnapshot = (h: ApiHistory): FormSnapshot => {
  const [year, month, day] = h.event_date.split('-').map(Number);
  const names = new Map((h.actors ?? []).map((a) => [String(a.id), a.name]));
  return {
    fields: {
      event_name: h.event_name ?? '',
      link: (h.link ?? '').replace(/\r\n?/g, '\n'),
      description: (h.description ?? '').replace(/\r\n?/g, '\n'),
      hashtag: h.hashtag ?? '',
    },
    selects: {
      date_year: String(year), date_month: String(month), date_day: String(day),
      ...time('open', h.open_time), ...time('start', h.start_time), ...time('end', h.end_time),
    },
    actors: h.actor_id.split(',').map((id) => id.trim()).filter(Boolean).map((id) => ({ id, name: names.get(id) ?? `ID ${id}` })),
    prefecture: h.place ? String(h.place.prefecture) : '',
    place: h.place ? { id: String(h.place.id), name: h.place.place_name } : null,
  };
};

// 快照 → 比较用的值（editDiff 的 describeChanges）
export const snapshotValues = (s: FormSnapshot): EditValues => {
  const t = (key: string) => {
    const [hour, minute] = [s.selects[`${key}_time_hour`], s.selects[`${key}_time_minute`]];
    return hour && minute ? `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` : '';
  };
  return {
    eventName: s.fields.event_name ?? '',
    date: `${s.selects.date_year}/${s.selects.date_month}/${s.selects.date_day}`,
    times: { open: t('open'), start: t('start'), end: t('end') },
    actors: s.actors,
    place: s.place,
    link: s.fields.link ?? '',
    description: s.fields.description ?? '',
    hashtag: s.fields.hashtag ?? '',
  };
};

// 活动页「イベント登録/最終更新履歴」的时间（title="2026-10-27 14:06:17 +0900"）→「2026/10/27 14:06」
export const historyTimeText = (title: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(title);
  return m ? `${m[1]}/${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}` : title;
};
