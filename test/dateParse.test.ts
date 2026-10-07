import { describe, expect, test } from 'vitest';
import { parseDate } from '../src/features/dateParse';

const today = new Date(2026, 9, 7); // 2026-10-07（水）
const parse = (s: string) => {
  const d = parseDate(s, today);
  return d && `${d.year}-${d.month}-${d.day}`;
};

describe('parseDate', () => {
  test.each([
    ['2026年12月19日(土)', '2026-12-19'],
    ['２０２６年１２月１９日（土）', '2026-12-19'],
    ['2027/1/5', '2027-1-5'],
    ['2027.01.05', '2027-1-5'],
    ['12月19日', '2026-12-19'],
    ['12/19(土)', '2026-12-19'],
    ['12/19（土・祝）', '2026-12-19'],
    ['12月19日土曜日', '2026-12-19'],
  ])('%s → %s', (s, expected) => expect(parse(s)).toBe(expected));

  test('年がなければ曜日が合う年を選ぶ', () => {
    expect(parse('1/9(土)')).toBe('2027-1-9'); // 2027-01-09 は土曜
    expect(parse('10/5(日)')).toBe('2025-10-5'); // 2026-10-05 は月曜、2025-10-05 が日曜
  });

  test('年も曜日もなければ近い未来（30 日以内の過去は今年）', () => {
    expect(parse('1月20日')).toBe('2027-1-20');
    expect(parse('9月20日')).toBe('2026-9-20');
  });

  test('年付き > 曜日付き > その他、同じなら先に出たもの', () => {
    expect(parse('受付 10/1〜 公演日 12/19(土)')).toBe('2026-12-19');
    expect(parse('チケット発売 10/1(木) 公演 2027年1月9日')).toBe('2027-1-9');
  });

  test('時間や存在しない日付は日付として読まない', () => {
    expect(parse('OPEN/START 18:20/18:50')).toBeNull();
    expect(parse('1:10/2:00')).toBeNull();
    expect(parse('2/30')).toBeNull();
    expect(parse('開場 17:30')).toBeNull();
  });
});
