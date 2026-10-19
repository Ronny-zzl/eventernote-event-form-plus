// /api/actors/search 返回的出演者（只用到这几项）
export type ApiActor = { id: number | string; name: string; kana?: string; favorite_count?: number };

// 全角→半角、大写→小写、片假名→平假名
const normalize = (s: string) =>
  s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 去掉括号里的补充（「Ill(ex.twinpale)」「Re:♡【りらいく】」）
const withoutParens = (t: string) => t.replace(/\([^()]*\)|【[^【】]*】/g, '').trim();

// API 会同时匹配名字、读音和关联关键词（团体成员名等），结果没有按相关度排序。
// 名字或读音：完全一致（含去掉括号后一致）> 开头一致 > 包含 > 只有关键词匹配；同一档按收藏人数从多到少
export const rankActors = (actors: ApiActor[], keyword: string) => {
  const kw = normalize(keyword);
  const match = (text = '') => {
    const t = normalize(text);
    return t === kw || withoutParens(t) === kw ? 0 : t.startsWith(kw) ? 1 : t.includes(kw) ? 2 : 3;
  };
  return actors
    .map((a, i) => ({ a, s: Math.min(match(a.name), match(a.kana)), i }))
    .sort((x, y) => x.s - y.s || (y.a.favorite_count ?? 0) - (x.a.favorite_count ?? 0) || x.i - y.i)
    .map((x) => x.a);
};

// 名字里包含 keyword（写法规则同上）。用来从「全部名字」里挑出值得补进候选的人
export const nameContains = (name: string, keyword: string) => normalize(name).includes(normalize(keyword));

// 第一次只取了前 limit 条，但总数更多时（短的词），把名字包含 keyword 而第一次没取到的人补到后面
export const mergeMissingNames = (first: ApiActor[], all: ApiActor[], keyword: string) => {
  const have = new Set(first.map((a) => String(a.id)));
  return [...first, ...all.filter((a) => !have.has(String(a.id)) && nameContains(a.name, keyword))];
};
