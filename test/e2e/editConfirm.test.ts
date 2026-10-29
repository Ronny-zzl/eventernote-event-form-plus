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
});
