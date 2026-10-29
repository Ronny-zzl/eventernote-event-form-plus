import { afterEach, describe, expect, test } from 'vitest';
import { loggedIn, openPage, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

const ANNOUNCEMENT = `りりあ。 OneMan Live「りりあ。の側に。」
日時：2026年12月19日(土) 開場 17:30 / 開演 18:00
会場：東京・下北沢ADRIFT
出演：りりあ。
#りりあ #LOVECHANT`;

describe.skipIf(!loggedIn)('告知文から入力', () => {
  test('日時・ハッシュタグを入力し、会場の候補と出演者を出す', async () => {
    const p = (page = await openPage('/events/add'));
    p.fire(p.$('input.ene-announce'), 'paste', { clipboardData: { getData: () => ANNOUNCEMENT } });

    expect([p.byId<HTMLSelectElement>('date_month').value, p.byId<HTMLSelectElement>('date_day').value]).toEqual(['12', '19']);
    expect(p.byId<HTMLSelectElement>('start_time_hour').value).toBe('18');
    expect(p.$<HTMLInputElement>('input[name="hashtag"]').value).toBe('りりあ #LOVECHANT');

    // 会場：地域名を外した語で検索し、候補を出す
    const placeInput = p.byId('places_list').closest('td')!.querySelector<HTMLInputElement>('.ene-search-row input')!;
    const suggest = placeInput.closest('.ene-search')!.querySelector('.ene-suggest')!;
    await p.until(() => suggest.querySelector('li:not(.ene-heading)'));
    expect(placeInput.value).toBe('下北沢ADRIFT');
    expect(suggest.textContent).toContain('下北沢ADRIFT');

    // 出演者：「確認して追加」で「まとめて追加」に名簿を入れて検索
    const result = p.$('.ene-announce-result');
    expect(result.textContent).toContain('出演者 1 名を読み取りました');
    p.click(result.querySelector('input[type="button"]')!);
    const modal = p.$('.ene-modal');
    expect(modal.classList.contains('ene-open')).toBe(true);
    expect(modal.querySelector('textarea')!.value).toBe('りりあ。');
    await p.until(() => modal.querySelector('.ene-bulk-badge')?.textContent === '一致');
  });
});
