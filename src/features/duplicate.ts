// 重复登录的判定（纯函数，供单元测试）。
// 同一出演者同一天出演多场很正常，只看日期和出演者会几乎每次都报。
// 用 2026 年 8〜9 月的 7655 场活动验证过：同日 + 共同出演者 + 同一会场 + 開演时间相同时约 7 成是真重复；
// 会场不同时全是误报（联合演出的開演是整场的开始时间、多家店的来店、多家影院同时的舞台挨拶），
// 只看会场或名字（时间没填时）也几乎全是误报（同一活动按成员分别登记等）。所以 4 个条件缺一不可

// /api/events/search 返回的活动（只列用到的字段）
export type ApiEvent = {
  id: number;
  event_name: string;
  start_time: string | null; // "18:00"，没填时为 null
  place_id: number;
  actors?: { id: number; name: string }[];
  cancel_flag?: number;
  postpone_flag?: number;
};

export type DuplicateQuery = {
  selfId?: string; // 编辑页：正在编辑的活动自己
  actorIds: string[];
  placeId: string;
  start: string; // "18:00"
};

export type Duplicate = {
  id: number;
  name: string;
  start: string;
  sharedActors: string[];
  canceled: boolean;
  postponed: boolean;
};

// events 应是同一天、同一会场的活动
export const findDuplicates = (events: ApiEvent[], q: DuplicateQuery): Duplicate[] => {
  if (!q.start || !q.placeId || !q.actorIds.length) return [];
  return events.flatMap((e) => {
    if (String(e.id) === q.selfId || String(e.place_id) !== q.placeId || e.start_time !== q.start) return [];
    const shared = (e.actors ?? []).filter((a) => q.actorIds.includes(String(a.id)));
    if (!shared.length) return [];
    return [{
      id: e.id,
      name: e.event_name,
      start: e.start_time,
      sharedActors: shared.map((a) => a.name),
      canceled: !!e.cancel_flag,
      postponed: !!e.postpone_flag,
    }];
  });
};
