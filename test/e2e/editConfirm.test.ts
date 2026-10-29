import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, loggedIn, openPage, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

// confirm は「キャンセル」を返すので実際には送信しない
describe.skipIf(!loggedIn)('編集画面の変更内容の確認', () => {
  test('変更がなければそう表示し、変更すると内容を列挙する', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`, { confirm: false }));
    // 会場名（活動ページから読む）が出るまで待つ
    await p.until(() => p.$('.ene-place-name').textContent !== '読み込み中…');
    const form = p.byId('event_form');

    p.fire(form, 'submit');
    expect(p.dialogs.at(-1)).toContain('変更はありません。');
    expect(p.dialogs.at(-1)).toContain('この内容で保存しますか？');

    // 開演は 2 番目の時間欄（入力欄の値が送信時にプルダウンへ書き戻される）
    const start = p.$$<HTMLInputElement>('input.ene-time')[1];
    const before = start.value;
    start.value = '19:15';
    p.fire(start, 'change');
    (p.window as unknown as { addActor: (id: number, name: string) => void }).addActor(2890, '水瀬いのり');
    const submit = p.fire(form, 'submit');
    expect(submit.defaultPrevented).toBe(true);
    const message = p.dialogs.at(-1)!;
    expect(message).toContain(`開演：${before} → 19:15`);
    expect(message).toContain('出演者：追加 水瀬いのり');
    expect(message).not.toContain('開催場所');
  });

  // 送信はイベントを発火させるだけ（jsdom なので実際には送られない）
  test('下書き：変更すると保存、次に開いたとき復元、元に戻すと消え、送信で消える', async () => {
    const store: Record<string, unknown> = {};
    const drafts = () => store.editDrafts as Record<string, { fields: Record<string, string>; base: string }> | undefined;
    const open = async () => {
      const p = await openPage(`/events/${EDIT_EVENT_ID}/edit`, { store });
      await p.until(() => p.$('.ene-place-name').textContent !== '読み込み中…');
      await sleep(500); // 分の補完が終わってから下書きの監視が始まる
      return p;
    };
    const name = (p: Page) => p.$<HTMLInputElement>('input[name="event_name"]');
    const addActor = (p: Page) => (p.window as unknown as { addActor: (id: number, name: string) => void }).addActor(2890, '水瀬いのり');

    const p1 = (page = await open());
    expect(p1.$('.ene-draft')).toBeNull();
    const original = name(p1).value;
    const originalActors = p1.byId<HTMLInputElement>('actor_ids').value;
    name(p1).value = original + '（下書きテスト）';
    addActor(p1);
    await sleep(2500);
    expect(drafts()?.[EDIT_EVENT_ID].fields.event_name).toBe(original + '（下書きテスト）');
    p1.close();

    const p2 = (page = await open());
    expect(p2.$('.ene-draft').textContent).toContain('前回編集中の内容が残っています');
    expect(p2.$('.ene-draft').textContent).not.toContain('更新されています');
    p2.click(p2.$$<HTMLInputElement>('.ene-draft input').find((b) => b.value === '復元する')!);
    expect(name(p2).value).toBe(original + '（下書きテスト）');
    expect(p2.byId<HTMLInputElement>('actor_ids').value).toBe(`${originalActors},2890`);

    // 元に戻すと下書きは消える
    name(p2).value = original;
    (p2.window as unknown as { removeActor: (id: string) => void }).removeActor('2890');
    await sleep(2500);
    expect(drafts()?.[EDIT_EVENT_ID]).toBeUndefined();

    // 保存後にイベントが更新されていたら、そのことを知らせる
    name(p2).value = original + '（下書きテスト）';
    await sleep(2500);
    drafts()![EDIT_EVENT_ID].base = '{}';
    p2.close();
    const p3 = (page = await open());
    expect(p3.$('.ene-draft').textContent).toContain('その後このイベントは更新されています');

    // 「編集完了」（確認で OK）で消える
    name(p3).value = original + '（下書きテスト）';
    p3.fire(p3.byId('event_form'), 'submit');
    expect(drafts()?.[EDIT_EVENT_ID]).toBeUndefined();
  });
});
