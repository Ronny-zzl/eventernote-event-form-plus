import { afterEach, describe, expect, test } from 'vitest';
import { EDIT_EVENT_ID, fetchHtml, loggedIn, openPage, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

// 手机版页面：项目是「<tr><th>标题</th></tr><tr><td>内容</td></tr>」，插入的项目也要按这个结构
const headings = (p: Page) => p.$$('#event_form th').map((th) => th.textContent!.trim());

describe.skipIf(!loggedIn)('スマートフォン版のページ', () => {
  test('登録画面：追加した項目が見出し行 + 内容行で、正しい位置に入る', async () => {
    const p = (page = await openPage('/events/add', { mobile: true }));
    expect(p.document.documentElement.classList.contains('ene-sp')).toBe(true);
    const h = headings(p);
    expect(h.slice(h.indexOf('イベント名'), h.indexOf('イベント名') + 3)).toEqual(['イベント名', '告知文から入力', '開催日']);
    expect(h).toContain('サムネイル画像');
    // 告知文の行は「開催日」の見出しより前（見出しと日付の間に割り込まない）
    const announceRow = p.$('input.ene-announce').closest('tr')!;
    expect(announceRow.previousElementSibling!.textContent!.trim()).toBe('告知文から入力');
    expect(announceRow.nextElementSibling!.textContent!.trim()).toBe('開催日');
  });

  test('編集画面：画像欄がないので追加し、フォームを multipart にする', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`, { mobile: true }));
    const form = p.byId<HTMLFormElement>('event_form');
    expect(form.enctype).toBe('multipart/form-data');
    expect(p.$$('input[name="thumbnail_image"]')).toHaveLength(1);
    expect(headings(p).slice(-1)).toEqual(['サムネイル画像']); // 「編集完了」の直前
    expect(p.$('#event_form .ene-drop')).not.toBeNull();
  });

  test('パソコン版の編集画面には画像欄を追加しない（元からある）', async () => {
    const p = (page = await openPage(`/events/${EDIT_EVENT_ID}/edit`));
    expect(p.$$('input[name="thumbnail_image"]')).toHaveLength(1);
    expect(p.$$('#event_form .ene-drop')).toHaveLength(1);
  });

  test('編集画面：スマートフォン版のイベントページから会場名と分を読み取る', async () => {
    const path = `/events/${EDIT_EVENT_ID}/edit`;
    const edit = (await fetchHtml(path, true)).replace(/(id="open_time_minute"[\s\S]*?<\/select>)/, (s) => s.replace(/ selected="selected"/g, ''));
    const event = (await fetchHtml(`/events/${EDIT_EVENT_ID}`, true)).replace(/開場 (\d{1,2}):\d{2}/, '開場 $1:29');
    expect(event).toContain('gb_subtitle'); // スマートフォン版のイベントページであること
    const p = (page = await openPage(path, { mobile: true, html: edit, routes: { [`/events/${EDIT_EVENT_ID}`]: event } }));
    await p.until(() => p.byId<HTMLSelectElement>('open_time_minute').value === '29');
    await p.until(() => !/読み込み中|会場ID/.test(p.$('.ene-place-name').textContent!));
    expect(p.dialogs).toEqual([]);
  });
});
