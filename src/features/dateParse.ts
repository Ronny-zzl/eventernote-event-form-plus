export type DateParts = { year: number; month: number; day: number };

const WEEKDAYS = '日月火水木金土';
const DAY_MS = 24 * 60 * 60 * 1000;

// 2026年12月19日 / 2026/12/19 / 2026.12.19 / 12月19日 / 12/19，后面可带星期「(土)」「(土・祝)」「土曜日」
const DATE_RE = new RegExp(
  String.raw`(?<!\d)(?:(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?|(\d{1,2})\s*(?:月\s*(\d{1,2})\s*日|/\s*(\d{1,2})))(?![\d:])`
  + String.raw`(?:\s*\(\s*([${WEEKDAYS}])[^)]{0,4}\)|\s*([${WEEKDAYS}])曜)?`,
  'g',
);

const toDate = ({ year, month, day }: DateParts) => new Date(year, month - 1, day);

const isValid = (d: DateParts) => {
  const date = toDate(d);
  return date.getMonth() === d.month - 1 && date.getDate() === d.day;
};

// 没写年份时：有星期就找星期对得上的年份（今年 / 明年 / 去年），
// 没有星期就取最近的将来（30 天内的过去也算今年，便于补登刚结束的活动）
const guessYear = (month: number, day: number, weekday: number | null, today: Date) => {
  const thisYear = today.getFullYear();
  const recentEnough = toDate({ year: thisYear, month, day }).getTime() >= today.getTime() - 30 * DAY_MS;
  const candidates = recentEnough ? [thisYear, thisYear + 1, thisYear - 1] : [thisYear + 1, thisYear, thisYear - 1];
  const parts = candidates.map((year) => ({ year, month, day })).filter(isValid);
  return (weekday === null ? parts[0] : parts.find((d) => toDate(d).getDay() === weekday)) ?? null;
};

// 从告知文中读取开催日。有多个日期时：带年份 > 带星期 > 其他，同等时取最先出现的
export const parseDate = (text: string, today = new Date()): DateParts | null => {
  let best: { date: DateParts; rank: number } | null = null;
  for (const m of text.normalize('NFKC').matchAll(DATE_RE)) {
    const w = m[7] ?? m[8];
    const weekday = w ? WEEKDAYS.indexOf(w) : null;
    const date = m[1]
      ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
      : guessYear(Number(m[4]), Number(m[5] ?? m[6]), weekday, today);
    if (!date || !isValid(date)) continue;
    const rank = m[1] ? 0 : weekday !== null ? 1 : 2;
    if (!best || rank < best.rank) best = { date, rank };
  }
  return best?.date ?? null;
};
