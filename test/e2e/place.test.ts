import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, loggedIn, mousedown, openPage, searchIn, sleep, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

const placeInput = (p: Page) => p.byId('places_list').closest('td')!.querySelector<HTMLInputElement>('.ene-search-row input')!;
const placeName = (p: Page) => p.$('.ene-place-name').textContent;

describe.skipIf(!loggedIn)('開催場所', () => {
  test('都道府県で絞り込んで検索、閉館は最後、選ぶと隠れたプルダウンに反映', async () => {
    const store: Record<string, unknown> = {};
    const p = (page = await openPage('/events/add', { store }));
    expect(p.byId('prefecture_id').closest('p')!.style.display).toBe('none');

    p.byId('places_list').closest('td')!.querySelector<HTMLSelectElement>('.ene-search-row select')!.value = '27';
    const results = await searchIn(p, placeInput(p), 'zepp');
    const dim = results.map((li) => li.classList.contains('ene-dim'));
    expect(dim.indexOf(true) === -1 || dim.slice(dim.indexOf(true)).every(Boolean)).toBe(true);
    expect(results.every((li) => li.textContent!.includes('大阪府'))).toBe(true);

    const name = results[0].firstChild!.textContent;
    mousedown(p, results[0]);
    const select = p.byId<HTMLSelectElement>('places_list');
    expect([select.options.length, select.selectedOptions[0].text, p.byId<HTMLSelectElement>('prefecture_id').value]).toEqual([1, name, '27']);
    expect(placeName(p)).toBe(name);
    expect((store.recentPlaces as { name: string }[])[0].name).toBe(name);
  });

  test('編集画面：現在の会場をすぐ表示し、あとから届く一覧に上書きされない', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`));
    const select = p.byId<HTMLSelectElement>('places_list');
    const initialId = select.value;
    expect(initialId).not.toBe('');
    await p.until(() => placeName(p) !== '読み込み中…');

    const results = await searchIn(p, placeInput(p), 'zepp');
    const chosenName = results[0].firstChild!.textContent;
    mousedown(p, results[0]);
    expect(select.value).not.toBe(initialId);
    // ページ自身の searchPlaces（東京都の全会場）が届いてプルダウンを作り直しても、選んだ会場のまま
    await sleep(15_000);
    expect([select.options.length, select.selectedOptions[0].text]).toEqual([1, chosenName]);
  });
});
