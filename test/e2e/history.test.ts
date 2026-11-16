import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, loggedIn, openPage, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

// 494909 の履歴 1013656 は関連リンクを空にして保存した版（履歴は後から変わらない）
const LINK_EMPTY = '1013656';

const restore = async (p: Page) => {
  await p.until(() => p.$('.ene-place-name').textContent !== '読み込み中…');
  p.click(p.$('.ene-history-entry input'));
  await p.until(() => p.$(`.ene-history-list li[data-id="${LINK_EMPTY}"]`));
  const items = p.$$('.ene-history-list li');
  expect(items[0].textContent).toContain('（最新）');
  expect(items.at(-1)!.textContent).toContain('（登録）');

  p.click(p.$(`.ene-history-list li[data-id="${LINK_EMPTY}"]`));
  await p.until(() => !p.$<HTMLInputElement>('.ene-modal.ene-open .ene-modal-foot input.btn-primary').disabled);
  expect(p.$('.ene-history-diff').textContent).toContain('関連リンク');
  p.click(p.$('.ene-modal.ene-open .ene-modal-foot input.btn-primary'));

  const field = (name: string) => (p.byId<HTMLFormElement>('event_form').elements.namedItem(name) as HTMLInputElement).value;
  expect(field('link')).toBe('');
  expect(field('event_name')).toBe('りりあ。 OneMan Live「りりあ。の側に。」');
  expect(p.byId<HTMLInputElement>('actor_ids').value).toBe('54459');
  expect(p.byId<HTMLSelectElement>('places_list').value).toBe('13534');
  expect(p.$$('input.ene-time').map((i) => (i as HTMLInputElement).value)).toEqual(['17:30', '18:00', '20:00']);
  expect(p.$$('.ene-modal.ene-open')).toHaveLength(0);
};

// フォームに入れるだけで、送信はしない
describe.skipIf(!loggedIn)('編集履歴から復元', () => {
  test('パソコン版：履歴を選ぶと違いを表示し、フォームに入れる', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`));
    await restore(p);
  });

  test('スマートフォン版：履歴 ID のないページなので、パソコン版のイベントページから読む', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`, { mobile: true }));
    await restore(p);
  });
});
