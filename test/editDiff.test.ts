import { expect, test } from 'vitest';
import { describeChanges, type EditValues } from '../src/features/editDiff';

const base: EditValues = {
  eventName: 'ライブ',
  date: '2026/12/19',
  times: { open: '17:30', start: '18:00', end: '' },
  actors: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }],
  place: { id: '10', name: '会場X' },
  link: 'https://a.example/\nhttps://b.example/',
  description: '詳細',
  hashtag: 'tag',
};

test('変更なし（前後の空白は無視）', () => {
  expect(describeChanges(base, { ...base, eventName: 'ライブ ', description: '詳細\n' })).toEqual([]);
});

test('各項目の変更', () => {
  expect(describeChanges(base, {
    ...base,
    eventName: 'ライブ（昼）',
    date: '2026/12/20',
    times: { open: '', start: '18:30', end: '21:00' },
    place: { id: '11', name: '会場Y' },
    description: '別の詳細',
    hashtag: '',
  })).toEqual([
    'イベント名：ライブ → ライブ（昼）',
    '開催日：2026/12/19 → 2026/12/20',
    '開場：17:30 → なし',
    '開演：18:00 → 18:30',
    '終演：なし → 21:00',
    '開催場所：会場X → 会場Y',
    '詳細：変更あり',
    'ハッシュタグ：tag → なし',
  ]);
});

test('出演者：追加・削除、並び順だけの変更', () => {
  expect(describeChanges(base, { ...base, actors: [{ id: '2', name: 'B' }, { id: '3', name: 'C' }] }))
    .toEqual(['出演者：追加 C / 削除 A']);
  expect(describeChanges(base, { ...base, actors: [{ id: '2', name: 'B' }, { id: '1', name: 'A' }] }))
    .toEqual(['出演者：並び順を変更']);
  const many = Array.from({ length: 7 }, (_, i) => ({ id: `n${i}`, name: `N${i}` }));
  expect(describeChanges(base, { ...base, actors: [...base.actors, ...many] }))
    .toEqual(['出演者：追加 N0、N1、N2、N3、N4 ほか 2 名']);
});

test('関連リンク：追加・削除、並び順（1 つ目のリンクはサムネイルの自動生成に使われる）', () => {
  expect(describeChanges(base, { ...base, link: 'https://b.example/\nhttps://c.example/' }))
    .toEqual(['関連リンク：\n  ＋ https://c.example/\n  － https://a.example/']);
  expect(describeChanges(base, { ...base, link: 'https://b.example/\r\nhttps://a.example/' }))
    .toEqual(['関連リンク：並び順を変更']);
});
