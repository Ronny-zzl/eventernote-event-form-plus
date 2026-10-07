import { expect, test } from 'vitest';
import { rankPlaces, type ApiPlace } from '../src/features/placeRank';

const place = (place_name: string): ApiPlace => ({ id: place_name, place_name, prefecture: 13 });

test('名前の一致度順、閉館は最後', () => {
  const places = ['Zepp Osaka(閉館)', '渋谷のZepp近くの店', 'Zepp Shinjuku (TOKYO)', 'zepp', 'Zepp DiverCity (TOKYO)'].map(place);
  expect(rankPlaces(places, 'Zepp').map((p) => p.place_name)).toEqual([
    'zepp', // 完全一致（大文字小文字を区別しない）
    'Zepp Shinjuku (TOKYO)', // 前方一致（元の順序を維持）
    'Zepp DiverCity (TOKYO)',
    '渋谷のZepp近くの店', // 部分一致
    'Zepp Osaka(閉館)',
  ]);
});

test('名前に含まれない（住所だけ一致）ものは後ろ', () => {
  const places = [place('青山学院講堂'), place('LINE CUBE SHIBUYA (渋谷公会堂)')];
  expect(rankPlaces(places, '渋谷').map((p) => p.place_name)).toEqual(['LINE CUBE SHIBUYA (渋谷公会堂)', '青山学院講堂']);
});
