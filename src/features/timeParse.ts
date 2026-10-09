export const TIME_LABELS = { open: '開場', start: '開演', end: '終演' } as const;
export type TimeKey = keyof typeof TIME_LABELS;
export const TIME_KEYS = Object.keys(TIME_LABELS) as TimeKey[];

export type Time = { hour: number; minute: number };

// 24 点以后（最多 29 点）换算成次日时间；超出范围返回 null
export const makeTime = (hour: string | number, minute?: string, meridiem?: string): Time | null => {
  let h = Number(hour);
  const m = minute === '半' ? 30 : Number(minute || 0);
  if (meridiem) {
    const pm = /^(午後|pm|p\.m\.)$/i.test(meridiem);
    if (h > 12) return null;
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  if (h > 29 || m > 59) return null;
  return { hour: h % 24, minute: m };
};

export const formatTime = (t: Time) =>
  `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

// 单个输入框：1830 / 930 / 18:30 / 18時30分 / 18時半 / 午後6時半 / 6:30pm / 全角数字等
// 空 → 'empty'，无法识别 → null
export const parseTimeInput = (str: string): Time | 'empty' | null => {
  const s = str.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  if (!s) return 'empty';
  let m = s.match(/^(\d{1,2})(\d{2})$/);
  if (m) return makeTime(m[1], m[2]);
  m = s.match(/^(\d{1,2})$/);
  if (m) return makeTime(m[1]);
  m = s.match(/^(午前|午後|am|pm|a\.m\.|p\.m\.)?(\d{1,2})(?:[:.](\d{2})|時(\d{1,2}|半)?分?)?(am|pm|a\.m\.|p\.m\.)?$/);
  if (m && !(m[1] && m[5])) return makeTime(m[2], m[3] || m[4], m[1] || m[5]);
  return null;
};

// ---- 从告知文读取 ----
// 支持「開場 17:30 / 開演 18:30」「開場/開演 17:30/18:30」「OPEN/START…18:20/18:50」「17:30開場」等

const LABEL_PATTERNS: Record<TimeKey, RegExp> = {
  open: /^(開場|入場|open)/i,
  start: /^(開演|開始|start|スタート)/i,
  end: /^(終演|終了|end|close)/i,
};
// 「販売開始」「受付終了」等不是活动时间；英文要求单词边界（避免 weekend 等）
export const LABEL_ANY_RE = /開場|入場開始|入場|開演|(?<!販売|発売|受付|抽選|予約|応募|配信)(?:開始|終了)|終演|スタート|(?<![a-z])(?:open|start|end|close)(?![a-z])/i;
const TOKEN_RE = new RegExp([
  `(${LABEL_ANY_RE.source})`,
  // 时间必须带「:」或「時」，避免把日期等数字当成时间；「3時間」之类排除
  String.raw`(?<!\d)(?:(午前|午後|am|pm)\s*)?(\d{1,2})\s*(?::\s*(\d{2})|時(?!間)\s*(?:(\d{1,2})分?|(半))?)(?:\s*(am|pm)(?![a-z]))?`,
].join('|'), 'gi');
// 标签和时间之间允许的分隔：符号、「…」（NFKC 后是 ...）、箭头和装饰符号，以及「頃」（「20:30頃終演予定」）等
const GAP_RE = /^(?:[\s/・|,、.:;()[\]【】〈〉<>《》「」『』〜~=_*-]|[→⇒▶▷►★☆◆◇■□●○]|時間|時刻|予定|頃|ごろ|は)*$/;

type Token = { start: number; end: number; label?: TimeKey; time?: Time };
type Found = Partial<Record<TimeKey, Time>>;
type Pairs = Partial<Record<TimeKey, Token>>; // 配到的时间 token（合并时据此判断是否已用过）

export const parseAnnouncement = (text: string): Found => {
  const s = text.normalize('NFKC');
  const tokens: Token[] = [];
  for (const m of s.matchAll(TOKEN_RE)) {
    const token: Token = { start: m.index, end: m.index + m[0].length };
    if (m[1]) {
      token.label = TIME_KEYS.find((k) => LABEL_PATTERNS[k].test(m[1]));
    } else {
      const time = makeTime(m[3], m[4] || m[5] || m[6], m[2] || m[7]);
      if (!time) continue;
      token.time = time;
    }
    tokens.push(token);
  }
  const adjacent = (a: Token, b: Token) => GAP_RE.test(s.slice(a.end, b.start));

  // 写法一：标签在前。连续的标签 + 紧随的连续时间按顺序配对
  const labelFirst = () => {
    const found: Pairs = {};
    for (let i = 0; i < tokens.length;) {
      if (!tokens[i].label) { i++; continue; }
      const labels = [tokens[i]];
      let j = i + 1;
      while (j < tokens.length && tokens[j].label && adjacent(tokens[j - 1], tokens[j])) labels.push(tokens[j++]);
      const times: Token[] = [];
      while (j < tokens.length && tokens[j].time && adjacent(tokens[j - 1], tokens[j])) times.push(tokens[j++]);
      labels.forEach((l, k) => {
        if (times[k] && !found[l.label!]) found[l.label!] = times[k];
      });
      i = Math.max(j, i + labels.length);
    }
    return found;
  };

  // 写法二：时间在前（「17:30開場」）
  const timeFirst = () => {
    const found: Pairs = {};
    for (let i = 0; i + 1 < tokens.length; i++) {
      const [t, l] = [tokens[i], tokens[i + 1]];
      if (t.time && l.label && adjacent(t, l) && !found[l.label]) {
        found[l.label] = t;
        i++;
      }
    }
    return found;
  };

  // 以配对数多的写法为准，另一种写法只补上缺的项目、且不能用主写法已用过的时间
  // （两种写法混用：「開場 / 開演：10:45 / 11:30（20:30頃終演予定）」；
  //  不能把「開演 18:30 終演時間未定」的 18:30 再配给終演）
  const a = labelFirst();
  const b = timeFirst();
  const [main, extra] = Object.keys(b).length > Object.keys(a).length ? [b, a] : [a, b];
  const used = new Set(Object.values(main));
  const found: Found = {};
  for (const k of TIME_KEYS) {
    const token = main[k] ?? (extra[k] && !used.has(extra[k]) ? extra[k] : undefined);
    if (token) found[k] = token.time;
  }
  return found;
};
