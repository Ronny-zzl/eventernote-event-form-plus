import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, loggedIn, mousedown, openPage, searchIn, sleep, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

// EDIT_EVENT_ID（494909）：2026-12-19 18:00、会場 13534、出演者 54459
const fillLikeEditEvent = async (p: Page) => {
  const set = (id: string, value: string) => { p.byId<HTMLSelectElement>(id).value = value; };
  set('date_year', '2026');
  set('date_month', '12');
  set('date_day', '19');
  set('start_time_hour', '18');
  set('start_time_minute', '00');
  // 会場は検索欄から選ぶ（プルダウンを直接書き換えても会場検索が選択中の会場に戻す）
  const placeInput = p.byId('places_list').closest('td')!.querySelector<HTMLInputElement>('.ene-search-row input')!;
  const results = await searchIn(p, placeInput, '下北沢ADRIFT');
  mousedown(p, results.find((li) => li.firstChild!.textContent === '下北沢ADRIFT')!);
  expect(p.byId<HTMLSelectElement>('places_list').value).toBe('13534');
  (p.window as unknown as { addActor: (id: number, name: string) => void }).addActor(54459, 'りりあ。');
};

describe.skipIf(!loggedIn)('重複登録の確認', () => {
  test('同じ日・会場・開演時間・出演者のイベントがあれば表示し、送信前にも確認する', async () => {
    const p = (page = await openPage('/events/add', { confirm: false }));
    const box = p.$('.ene-duplicate');
    expect(box.hidden).toBe(true);

    await fillLikeEditEvent(p);
    await p.until(() => !box.hidden);
    expect(box.querySelector('a')!.getAttribute('href')).toBe(`/events/${EDIT_EVENT_ID}`);
    expect(box.textContent).toContain('共通の出演者：りりあ。');

    p.fire(p.byId('event_form'), 'submit');
    expect(p.dialogs.at(-1)).toContain('重複の可能性：『');

    // 開演時間が違えば（昼夜公演など）表示しない
    p.byId<HTMLSelectElement>('start_time_hour').value = '13';
    await p.until(() => box.hidden);
  });

  test('編集画面では編集中のイベント自身を除く', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`));
    await sleep(3000);
    expect(p.byId<HTMLSelectElement>('places_list').value).not.toBe('');
    expect(p.$('.ene-duplicate').hidden).toBe(true);
  });
});
