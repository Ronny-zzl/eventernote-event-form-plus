import { afterEach, describe, expect, test } from 'vitest';
import { loggedIn, openPage, sleep, type Page } from './harness.ts';

const opened: Page[] = [];
afterEach(() => opened.splice(0).forEach((p) => p.close()));
const open = async (...args: Parameters<typeof openPage>) => {
  const p = await openPage(...args);
  opened.push(p);
  return p;
};

const CONFIRM_PAGE = '<form action="/events/add/complete" method="post"><table><tr><td><input type="submit" value="登録する"></td></tr></table></form>';
const nameInput = (p: Page) => p.$<HTMLInputElement>('[name=event_name]');
const addActor = (p: Page, id: string, name: string) =>
  (p.window as unknown as { addActor: (id: string, name: string) => void }).addActor(id, name);

describe.skipIf(!loggedIn)('送信前チェック・下書き・確認画面から戻る', () => {
  test('送信前チェック：未入力の項目と検索欄に残った文字', async () => {
    const p = await open('/events/add', { confirm: false });
    expect(p.fire(p.byId('event_form'), 'submit').defaultPrevented).toBe(true);
    expect(p.dialogs.at(-1)).toMatch(/イベント名[\s\S]*出演者[\s\S]*開催場所/);
    expect(p.document.activeElement).toBe(nameInput(p));

    nameInput(p).value = 'テスト（登録しません）';
    p.byId('selected_actors').closest('td')!.querySelector<HTMLInputElement>('.ene-search input')!.value = '春日';
    p.fire(p.byId('event_form'), 'submit');
    expect(p.dialogs.at(-1)).toContain('「春日」が残っています');
  });

  test('下書き：自動保存 → 次に開いたとき復元 / 破棄、確認画面で登録すると消える', async () => {
    const store: Record<string, unknown> = {};
    const p1 = await open('/events/add', { store });
    expect(p1.$('.ene-draft')).toBeNull();
    nameInput(p1).value = 'テスト（登録しません）';
    addActor(p1, '80126', '前橋ウィッチーズ');
    await sleep(2500);
    expect((store.formDraft as { fields: Record<string, string> }).fields.event_name).toBe('テスト（登録しません）');

    const p2 = await open('/events/add', { store });
    expect(p2.$('.ene-draft').textContent).toContain('テスト（登録しません）');
    p2.click(p2.$$<HTMLInputElement>('.ene-draft input').find((b) => b.value === '復元する')!);
    expect([nameInput(p2).value, p2.byId<HTMLInputElement>('actor_ids').value]).toEqual(['テスト（登録しません）', '80126']);
    expect(p2.$('.ene-draft')).toBeNull();

    const p3 = await open('/events/add', { store });
    p3.click(p3.$$<HTMLInputElement>('.ene-draft input').find((b) => b.value === '破棄する')!);
    expect(store.formDraft).toBeNull();

    store.formDraft = { fields: { event_name: 'x' }, selects: {}, actors: [], prefecture: '', place: null, savedAt: Date.now() };
    const confirmPage = await open('/events/add/confirm', { store, html: CONFIRM_PAGE });
    confirmPage.fire(confirmPage.$('form'), 'submit');
    expect(store.formDraft).toBeNull();
  });

  test('確認画面から戻る：入力内容と画像を復元し、下書きの案内は出さない', async () => {
    const store: Record<string, unknown> = {
      draftImage: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', name: 'a.png', type: 'image/png' },
      formDraft: { fields: { event_name: '古い下書き' }, selects: {}, actors: [], prefecture: '', place: null, savedAt: Date.now() },
    };
    const p1 = await open('/events/add', { store });
    expect(store.draftImage).toBeNull(); // 新しく開いた登録画面は画像なしから
    store.draftImage = { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', name: 'a.png', type: 'image/png' };
    nameInput(p1).value = 'テスト（登録しません）';
    addActor(p1, '80126', '前橋ウィッチーズ');
    p1.fire(p1.byId('event_form'), 'submit'); // 確認画面へ（jsdom なので実際には遷移しない）

    const p2 = await open('/events/add?ene_restore=1', { store });
    expect([nameInput(p2).value, p2.byId<HTMLInputElement>('actor_ids').value]).toEqual(['テスト（登録しません）', '80126']);
    expect(p2.$('.ene-drop img')).not.toBeNull();
    expect(p2.$('.ene-draft')).toBeNull();
    expect(p2.window.location.search).toBe('');
  });
});
