// /api/places/search 返回的会场（只用到这几项）
export type ApiPlace = { id: number | string; place_name: string; prefecture: number | string; address?: string };

export const CLOSED_RE = /閉館|閉店|閉校|閉鎖|閉場|移転/;

// 名字完全一致 > 名字开头一致 > 名字包含 > 只有地址等匹配；闭馆的排最后
export const rankPlaces = (places: ApiPlace[], keyword: string) => {
  const kw = keyword.normalize('NFKC').toLowerCase();
  const score = (p: ApiPlace) => {
    const name = p.place_name.normalize('NFKC').toLowerCase();
    const s = name === kw ? 0 : name.startsWith(kw) ? 1 : name.includes(kw) ? 2 : 3;
    return CLOSED_RE.test(p.place_name) ? s + 10 : s;
  };
  return places
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.p);
};
