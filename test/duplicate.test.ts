import { expect, test } from 'vitest';
import { findDuplicates, type ApiEvent } from '../src/features/duplicate';

const event = (id: number, start: string | null, actors: number[], extra: Partial<ApiEvent> = {}): ApiEvent => ({
  id,
  event_name: `イベント${id}`,
  start_time: start,
  place_id: 114,
  actors: actors.map((a) => ({ id: a, name: `出演者${a}` })),
  ...extra,
});
const query = { actorIds: ['1', '2'], placeId: '114', start: '18:00' };

test('同じ会場・同じ開演時間・共通の出演者がいるものだけ', () => {
  const events = [
    event(10, '18:00', [2, 3]), // 該当
    event(11, '13:00', [1]), // 昼の部
    event(12, '18:00', [3]), // 共通の出演者なし
    event(13, null, [1]), // 開演時間なし
    event(14, '18:00', [1], { place_id: 999 }), // 別の会場
  ];
  expect(findDuplicates(events, query)).toEqual([
    { id: 10, name: 'イベント10', start: '18:00', sharedActors: ['出演者2'], canceled: false, postponed: false },
  ]);
});

test('編集中のイベント自身は除く', () => {
  expect(findDuplicates([event(10, '18:00', [1])], { ...query, selfId: '10' })).toEqual([]);
});

test('開演時間・会場・出演者のどれかが未入力なら判定しない', () => {
  const events = [event(10, '18:00', [1])];
  expect(findDuplicates(events, { ...query, start: '' })).toEqual([]);
  expect(findDuplicates(events, { ...query, placeId: '' })).toEqual([]);
  expect(findDuplicates(events, { ...query, actorIds: [] })).toEqual([]);
});

test('中止・延期の印', () => {
  const [dup] = findDuplicates([event(10, '18:00', [1], { cancel_flag: 1, postpone_flag: 0 })], query);
  expect([dup.canceled, dup.postponed]).toEqual([true, false]);
});
