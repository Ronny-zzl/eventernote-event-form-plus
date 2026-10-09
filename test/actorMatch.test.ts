import { describe, expect, test } from 'vitest';
import { fallbackQueries, matchActor, splitNames } from '../src/features/actorMatch';
import type { ApiActor } from '../src/features/actorRank';

describe('splitNames', () => {
  test('スペース付きの / で区切り、スペースなしの / ・ は名前の一部', () => {
    expect(splitNames('＜出演者＞\nai*ai / ICECREAM SCREAM / LilyS/ash / マジカル・パンチライン / alma /THE ENCORE / 【eN】'))
      .toEqual(['ai*ai', 'ICECREAM SCREAM', 'LilyS/ash', 'マジカル・パンチライン', 'alma', 'THE ENCORE', '【eN】']);
  });

  test('/ で区切られた名簿では読点で区切らない（名前に読点が入ることがある）', () => {
    expect(splitNames('ParaLulu / 遥か、彼方。 / ハレとハレ！')).toEqual(['ParaLulu', '遥か、彼方。', 'ハレとハレ！']);
    expect(splitNames('遥か、彼方。／蛍')).toEqual(['遥か、彼方。', '蛍']);
  });

  test('/ がない名簿は改行・読点で区切る、箇条書きの記号、and more、重複', () => {
    expect(splitNames('・Aqours\n・蛍、BOCCHI。，ポラライト\nポラライト\nand more!!'))
      .toEqual(['Aqours', '蛍', 'BOCCHI。', 'ポラライト']);
  });
});

const actor = (name: string, favorite_count = 0): ApiActor => ({ id: name, name, favorite_count });
const status = (input: string, names: (string | ApiActor)[]) => {
  const m = matchActor(input, names.map((n) => (typeof n === 'string' ? actor(n) : n)));
  return [m.status, m.candidates.map((a) => a.name)];
};

describe('matchActor', () => {
  test('完全一致（全角半角・大文字小文字・記号の違いは無視）', () => {
    expect(status('I’mew（あいみゅう）', ["I'mew(あいみゅう)", 'Imew'])).toEqual(['exact', ["I'mew(あいみゅう)"]]);
    expect(status('Gran☆Ciel', ['Gran★Ciel', 'Gran'])).toEqual(['exact', ['Gran★Ciel']]);
    expect(status('きゅ〜くる', ['きゅ~くる'])).toEqual(['exact', ['きゅ~くる']]);
    expect(status('STAiNY', ['stainy'])).toEqual(['exact', ['stainy']]);
  });

  test('括号を除いた名前でも一致を判定', () => {
    expect(status('愛乙女★DOLL', ['愛乙女★DOLL(愛乙女☆DOLL(チームL))', 'ほかの人'])).toEqual(['exact', ['愛乙女★DOLL(愛乙女☆DOLL(チームL))']]);
    expect(status('I’mew（あいみゅう）', ["I'mew"])).toEqual(['exact', ["I'mew"]]);
  });

  test('括弧ごと一致するものを優先（地域名などで区別される同名）', () => {
    expect(status('sasanqua(船橋)', ['sasanqua', 'sasanqua(船橋)'])).toEqual(['exact', ['sasanqua(船橋)']]);
  });

  test('同名が複数ならお気に入り数順で「同名あり」', () => {
    expect(status('蛍', [actor('蛍', 3), actor('蛍', 50), actor('蛍火')])).toEqual(['multiple', ['蛍', '蛍']]);
    expect(matchActor('蛍', [actor('蛍', 3), actor('蛍', 50)]).candidates[0].favorite_count).toBe(50);
  });

  test('見えない異体字セレクタ、♯ と #、【読み】の違いも無視', () => {
    expect(status('STARRY×NIGHT↗', ['STARRY×NIGHT↗︎'])).toEqual(['exact', ['STARRY×NIGHT↗︎']]);
    expect(status('RiNCENT#', ['RiNCENT♯'])).toEqual(['exact', ['RiNCENT♯']]);
    expect(status('Re:♡', ['Re:♡【りらいく】'])).toEqual(['exact', ['Re:♡【りらいく】']]);
    expect(status('【eN】', ['【eN】', 'eN'])).toEqual(['exact', ['【eN】']]);
  });

  test('名前が一致しなければ候補のみ、結果がなければ見つからない', () => {
    expect(status('水樹奈々', ['渡辺豊', '水樹奈々 LIVE'])).toEqual(['candidates', ['水樹奈々 LIVE', '渡辺豊']]);
    expect(status('存在しない人', [])).toEqual(['none', []]);
  });
});

describe('fallbackQueries（原文で見つからなかったときの検索語）', () => {
  test.each([
    ['I’mew（あいみゅう）', 'I’mew'],
    ['kimikara（きみから)', 'kimikara'],
    ["MyDearDarlin'", 'MyDearDarlin’'],
    ['ROSARIO+CROSS', 'ROSARIO'],
  ])('%s → %s を含む', (name, query) => expect(fallbackQueries(name)).toContain(query));

  test('原文と同じ語や 1 文字の語は含めない', () => {
    expect(fallbackQueries('蛍')).toEqual([]);
  });
});
