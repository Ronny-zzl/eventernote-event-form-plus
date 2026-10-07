import { expect, test } from 'vitest';
import { rankActors, type ApiActor } from '../src/features/actorRank';

const actor = (name: string, kana: string, favorite_count = 0): ApiActor => ({ id: name, name, kana, favorite_count });
const names = (actors: ApiActor[], keyword: string) => rankActors(actors, keyword).map((a) => a.name);

test('名前の一致度順、関連キーワードだけの一致は最後', () => {
  const actors = [actor('渡辺豊', 'わたなべゆたか', 5), actor('水樹奈々', 'みずきなな', 9000), actor('水樹奈々 LIVE', 'みずきななライブ', 10)];
  expect(names(actors, '水樹奈々')).toEqual(['水樹奈々', '水樹奈々 LIVE', '渡辺豊']);
});

test('よみがな（ひらがな・カタカナ）でも一致度を判定', () => {
  const actors = [actor('前橋ウィッチーズ', 'まえばしうぃっちーず'), actor('春日さくら', 'かすがさくら')];
  expect(names(actors, 'かすが')).toEqual(['春日さくら', '前橋ウィッチーズ']);
  expect(names(actors, 'マエバシ')).toEqual(['前橋ウィッチーズ', '春日さくら']);
});

test('同じ一致度ならお気に入り数の多い順', () => {
  const actors = [actor('春日はな', 'かすがはな', 3), actor('春日萌花', 'かすがもえか', 120), actor('春日レイ', 'かすがれい', 40)];
  expect(names(actors, '春日')).toEqual(['春日萌花', '春日レイ', '春日はな']);
});
