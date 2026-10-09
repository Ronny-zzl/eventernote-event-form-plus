import { rankActors, type ApiActor } from './actorRank';

// ---- 出演者名单：拆分 ----
// 按换行、全角「／」、至少一边有空格的半角「/」拆分；名单里没有这些「/」时，才再按「、」「，」拆
// （名字本身可能带「、」：遥か、彼方。）。两边都没有空格的「/」是名字的一部分（LilyS/ash），「・」也不拆
const SLASH = /／|\s+\/\s*|\s*\/\s+/;
const SEPARATOR = new RegExp(String.raw`\r?\n|${SLASH.source}`);
const SEPARATOR_WITH_COMMA = new RegExp(String.raw`${SEPARATOR.source}|[、，,]`);
const HEADING = /^[<＜〈《].*[>＞〉》]$/; // ＜出演者＞ 之类的标题（【eN】这种用括号写的名字保留）
const BULLET = /^[・●■◆◇○*\-－]\s*/;
const AND_MORE = /^(and\s*more|ほか|他|etc\.?)[!！.。…]*$/i;

export const splitNames = (text: string) => {
  const names = text.split(SLASH.test(text) ? SEPARATOR : SEPARATOR_WITH_COMMA)
    .map((s) => s.trim().replace(BULLET, '').trim())
    .filter((s) => s && !HEADING.test(s) && !AND_MORE.test(s));
  return [...new Set(names)];
};

// ---- 判断是否一致 ----
// 全角/半角、大小写、空格、引号、☆★、〜~、♡♥、♯# 的差别都忽略；
// 去掉看不见的变体选择符（「↗︎」= ↗ + U+FE0E）
const normalize = (s: string) =>
  s.normalize('NFKC').toLowerCase()
    .replace(/[︀-️​-‍]/g, '')
    .replace(/\s+/g, '')
    .replace(/[‘’`´′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[★☆]/g, '☆')
    .replace(/[〜~～]/g, '~')
    .replace(/[♡♥❤]/g, '♡')
    .replace(/♯/g, '#');

// 去掉括号里的补充（「I’mew（あいみゅう）」「愛乙女★DOLL(愛乙女☆DOLL(チームL))」「Re:♡【りらいく】」）。
// 整个名字都在括号里时（【eN】）结果为空，调用方要处理
const withoutParens = (s: string) => {
  let t = s.normalize('NFKC');
  for (let prev = ''; prev !== t;) [prev, t] = [t, t.replace(/\([^()]*\)|【[^【】]*】/g, '')];
  return t.trim();
};

// 用原文搜不到时依次换的写法：去掉括号、换引号、只用最长的一个词（「ROSARIO+CROSS」→「ROSARIO」）
export const fallbackQueries = (name: string) => {
  const base = name.normalize('NFKC').trim();
  const longestWord = base.split(/[^\p{L}\p{N}]+/u).sort((a, b) => b.length - a.length)[0] ?? '';
  const queries = [withoutParens(base), base.replace(/'/g, '’'), base.replace(/[‘’]/g, "'"), longestWord];
  return [...new Set(queries.map((q) => q.trim()))].filter((q) => q.length >= 2 && q !== name.trim());
};

export type MatchStatus = 'exact' | 'multiple' | 'candidates' | 'none';
export type Match = { status: MatchStatus; candidates: ApiActor[] };

const byFavorite = (a: ApiActor, b: ApiActor) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0);

// 名字（含括号）完全一致的优先；没有时再比去掉括号后的写法。只看名字：读音或关联关键词匹配到的只当候选
export const matchActor = (input: string, results: ApiActor[]): Match => {
  const full = normalize(input);
  const short = normalize(withoutParens(input));
  let exact = results.filter((a) => normalize(a.name) === full);
  if (!exact.length) {
    exact = results.filter((a) => [normalize(a.name), normalize(withoutParens(a.name))]
      .some((v) => v && (v === full || v === short)));
  }
  if (exact.length === 1) return { status: 'exact', candidates: exact };
  if (exact.length > 1) return { status: 'multiple', candidates: exact.sort(byFavorite) };
  if (results.length) return { status: 'candidates', candidates: rankActors(results, input).slice(0, 5) };
  return { status: 'none', candidates: [] };
};
