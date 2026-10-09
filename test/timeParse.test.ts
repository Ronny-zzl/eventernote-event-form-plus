import { describe, expect, test } from 'vitest';
import { formatTime, parseAnnouncement, parseTimeInput } from '../src/features/timeParse';

const input = (s: string) => {
  const t = parseTimeInput(s);
  return t && t !== 'empty' ? formatTime(t) : t;
};

const announce = (s: string) =>
  Object.fromEntries(Object.entries(parseAnnouncement(s)).map(([k, t]) => [k, formatTime(t)]));

describe('parseTimeInput', () => {
  test.each([
    ['1830', '18:30'], ['930', '09:30'], ['18:30', '18:30'], ['１８：３０', '18:30'],
    ['18時30分', '18:30'], ['18時半', '18:30'], ['18時', '18:00'], ['18', '18:00'],
    ['午後6時半', '18:30'], ['6:30pm', '18:30'], ['午前12時', '00:00'],
    ['25:30', '01:30'], ['24', '00:00'],
  ])('%s → %s', (s, expected) => expect(input(s)).toBe(expected));

  test.each(['18:', '18:3', '30:00', '18:60', 'abc', '午後13時'])('%s は認識しない', (s) => {
    expect(input(s)).toBeNull();
  });

  test('空欄', () => expect(input('  ')).toBe('empty'));
});

describe('parseAnnouncement', () => {
  test.each([
    ['開場 17:30 / 開演 18:30', { open: '17:30', start: '18:30' }],
    ['開場/開演 17:30/18:30', { open: '17:30', start: '18:30' }],
    ['OPEN 17:00 START 18:00 END 20:00', { open: '17:00', start: '18:00', end: '20:00' }],
    ['OPEN/START…18:20/18:50', { open: '18:20', start: '18:50' }],
    ['OPEN／START‥18:20／18:50', { open: '18:20', start: '18:50' }],
    ['17:30開場／18:30開演', { open: '17:30', start: '18:30' }],
    ['開場・開演：１７：３０・１８：３０', { open: '17:30', start: '18:30' }],
    ['【日時】2026年10月17日(土) 開場18時半 開演19時', { open: '18:30', start: '19:00' }],
    ['OPEN/START 18:00/19:00 (終演予定 21:00)', { open: '18:00', start: '19:00', end: '21:00' }],
    ['入場開始 13:30 / イベント開始 14:00', { open: '13:30', start: '14:00' }],
    ['★開場 17:30 ★開演 18:00', { open: '17:30', start: '18:00' }],
    ['開場→17:30 開演→18:00', { open: '17:30', start: '18:00' }],
  ])('%s', (s, expected) => expect(announce(s)).toEqual(expected));

  test('販売開始・受付終了は読まない', () => {
    expect(announce('一般販売開始 10:00\nイベント開始 14:00')).toEqual({ start: '14:00' });
    expect(announce('受付終了 17:00')).toEqual({});
  });

  test('英単語の一部や所要時間は読まない', () => {
    expect(announce('weekend 18:00')).toEqual({});
    expect(announce('開演 18:00（約3時間）')).toEqual({ start: '18:00' });
  });
});

describe('parseAnnouncement：書き方の混在', () => {
  test('ラベルが前と時間が前の書き方が混ざっていても全部読む', () => {
    expect(announce('2026年11月3日(火祝)開催 開場 / 開演：10:45 / 11:30 （20:30頃終演予定）'))
      .toEqual({ open: '10:45', start: '11:30', end: '20:30' });
    expect(announce('開場18:00 開演18:30 終演ごろ 21:00')).toEqual({ open: '18:00', start: '18:30', end: '21:00' });
  });

  test('すでに使った時間を別のラベルに割り当てない', () => {
    expect(announce('開演 18:30 終演時間未定')).toEqual({ start: '18:30' });
    expect(announce('18:00開場／19:00開演')).toEqual({ open: '18:00', start: '19:00' });
  });
});
