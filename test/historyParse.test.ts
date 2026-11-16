import { expect, test } from 'vitest';
import { describeChanges } from '../src/features/editDiff';
import { historySnapshot, historyTimeText, snapshotValues, type ApiHistory } from '../src/features/historyParse';

// 494909 の編集履歴（1013657）を簡略化したもの
const history: ApiHistory = {
  event_name: 'りりあ。 OneMan Live「りりあ。の側に。」',
  event_date: '2026-12-09',
  open_time: '17:30',
  start_time: '8:05',
  end_time: null,
  actor_id: '80126,54459',
  link: 'https://example.com/a\r\nhttps://example.com/b',
  description: '1行目\r\n2行目',
  hashtag: '',
  actors: [{ id: 54459, name: 'りりあ。' }, { id: 80126, name: '前橋ウィッチーズ' }],
  place: { id: 13534, place_name: '下北沢ADRIFT', prefecture: 13 },
};

test('フォームの値に変換（年月日は 0 埋めなし、時分は 0 埋め、出演者は actor_id の順）', () => {
  expect(historySnapshot(history)).toEqual({
    fields: {
      event_name: 'りりあ。 OneMan Live「りりあ。の側に。」',
      link: 'https://example.com/a\nhttps://example.com/b',
      description: '1行目\n2行目',
      hashtag: '',
    },
    selects: {
      date_year: '2026', date_month: '12', date_day: '9',
      open_time_hour: '17', open_time_minute: '30',
      start_time_hour: '08', start_time_minute: '05',
      end_time_hour: '', end_time_minute: '',
    },
    actors: [{ id: '80126', name: '前橋ウィッチーズ' }, { id: '54459', name: 'りりあ。' }],
    prefecture: '13',
    place: { id: '13534', name: '下北沢ADRIFT' },
  });
});

test('会場・出演者名が無くても変換できる', () => {
  const s = historySnapshot({ ...history, actor_id: '1, 2', actors: undefined, place: null, link: null });
  expect(s.actors).toEqual([{ id: '1', name: 'ID 1' }, { id: '2', name: 'ID 2' }]);
  expect(s.place).toBeNull();
  expect(s.prefecture).toBe('');
  expect(s.fields.link).toBe('');
});

test('現在の入力との違いを列挙できる', () => {
  const before = historySnapshot(history);
  const after = historySnapshot({ ...history, start_time: '18:00', link: 'https://example.com/a' });
  expect(describeChanges(snapshotValues(before), snapshotValues(after))).toEqual([
    '開演：08:05 → 18:00',
    '関連リンク：\n  － https://example.com/b',
  ]);
});

test('履歴の日時表示', () => {
  expect(historyTimeText('2026-10-07 09:06:17 +0900')).toBe('2026/10/7 09:06');
});
