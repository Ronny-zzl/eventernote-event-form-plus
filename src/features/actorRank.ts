// /api/actors/search 返回的出演者（只用到这几项）
export type ApiActor = { id: number | string; name: string; kana?: string; favorite_count?: number };

// 全角→半角、大写→小写、片假名→平假名
const normalize = (s: string) =>
  s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// API 会同时匹配名字、读音和关联关键词（团体成员名等），结果没有按相关度排序。
// 名字或读音：完全一致 > 开头一致 > 包含 > 只有关键词匹配；同一档按收藏人数从多到少
export const rankActors = (actors: ApiActor[], keyword: string) => {
  const kw = normalize(keyword);
  const match = (text = '') => {
    const t = normalize(text);
    return t === kw ? 0 : t.startsWith(kw) ? 1 : t.includes(kw) ? 2 : 3;
  };
  return actors
    .map((a, i) => ({ a, s: Math.min(match(a.name), match(a.kana)), i }))
    .sort((x, y) => x.s - y.s || (y.a.favorite_count ?? 0) - (x.a.favorite_count ?? 0) || x.i - y.i)
    .map((x) => x.a);
};
