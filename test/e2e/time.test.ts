import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, fetchHtml, loggedIn, openPage, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

const selects = (p: Page, key: string) => `${p.byId<HTMLSelectElement>(`${key}_time_hour`).value}:${p.byId<HTMLSelectElement>(`${key}_time_minute`).value}`;

describe.skipIf(!loggedIn)('時間・開催日・告知文', () => {
  test('テキスト欄 → 隠れたプルダウン、クイックボタン、翌日、不正な入力', async () => {
    const p = (page = await openPage('/events/add'));
    const [open, start, end] = p.$$<HTMLInputElement>('input.ene-time');
    expect(p.byId<HTMLSelectElement>('open_time_minute').options).toHaveLength(61);

    start.value = '1857';
    p.fire(start, 'input');
    expect(selects(p, 'start')).toBe('18:57');
    p.fire(start, 'change');
    expect(start.value).toBe('18:57');

    const [openMinus30, , , endPlus3h] = p.$$<HTMLInputElement>('.ene-time-row input.btn');
    p.click(openMinus30);
    p.click(endPlus3h);
    expect([selects(p, 'open'), selects(p, 'end')]).toEqual(['18:27', '21:57']);

    end.value = '2:00';
    p.fire(end, 'change');
    expect(p.$$('.ene-time-badge').map((b) => b.style.display)).toEqual(['none', 'none', '']);

    open.value = 'xx';
    p.fire(open, 'input');
    expect(p.fire(p.byId('event_form'), 'submit').defaultPrevented).toBe(true);
    expect(p.dialogs.at(-1)).toContain('開場の時間を正しく入力してください');
  });

  test('開催日：日付入力と曜日、範囲外は元に戻す', async () => {
    const p = (page = await openPage('/events/add'));
    const input = p.$<HTMLInputElement>('.ene-date input');
    const date = () => ['date_year', 'date_month', 'date_day'].map((id) => p.byId<HTMLSelectElement>(id).value).join('/');
    input.value = '2026-12-19';
    p.fire(input, 'change');
    expect([date(), p.$('.ene-weekday').textContent]).toEqual(['2026/12/19', '（土）']);
    input.value = '1900-01-01';
    p.fire(input, 'change');
    expect([input.value, date()]).toEqual(['2026-12-19', '2026/12/19']);
  });

  test('告知文から入力：日付と時間をまとめて入力', async () => {
    const p = (page = await openPage('/events/add'));
    const text = 'OneMan Live\n2026年12月19日 (土)\n東京・下北沢ADRIFT\nOPEN/START…18:20/18:50';
    p.fire(p.$('input.ene-announce'), 'paste', { clipboardData: { getData: () => text } });
    expect(p.$<HTMLInputElement>('.ene-date input').value).toBe('2026-12-19');
    expect([selects(p, 'open'), selects(p, 'start')]).toEqual(['18:20', '18:50']);
    expect(p.$('.ene-notice:last-child').textContent).toContain('読み取りました');

    // 時間欄にラベル付きの文を貼っても同じ。ただの時間は普通に貼り付け
    const [open, , end] = p.$$<HTMLInputElement>('input.ene-time');
    p.fire(open, 'paste', { clipboardData: { getData: () => '12/19(土) 開場 13:00 / 開演 13:30' } });
    expect(selects(p, 'open')).toBe('13:00');
    expect(p.fire(end, 'paste', { clipboardData: { getData: () => '21:00' } }).defaultPrevented).toBe(false);
  });

  test('編集画面：5 分刻みでない分をイベントページから読み戻す', async () => {
    const path = `/events/${EDIT_EVENT_ID}/edit`;
    // 開場の分を「選択なし」にし（サーバーが 29 分を出力できない状況）、イベントページは「開場 HH:29」にする
    const edit = (await fetchHtml(path)).replace(/(id="open_time_minute"[\s\S]*?<\/select>)/, (s) => s.replace(/ selected="selected"/g, ''));
    const event = (await fetchHtml(`/events/${EDIT_EVENT_ID}`)).replace(/開場 (\d{1,2}):\d{2}/, '開場 $1:29');
    const p = (page = await openPage(path, { html: edit, routes: { [`/events/${EDIT_EVENT_ID}`]: event } }));
    const hour = p.byId<HTMLSelectElement>('open_time_hour').value;
    expect(hour, 'テスト用イベントに開場時間が必要').not.toBe('');
    await p.until(() => p.byId<HTMLSelectElement>('open_time_minute').value === '29');
    await p.until(() => p.$$<HTMLInputElement>('input.ene-time')[0].value === `${hour}:29`);
  });
});
