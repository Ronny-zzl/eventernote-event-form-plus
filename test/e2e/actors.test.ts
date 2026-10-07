import { afterEach, describe, expect, test } from 'vitest';
import { loggedIn, mousedown, openPage, searchIn, type Page } from './harness.ts';

let page: Page | undefined;
afterEach(() => page?.close());

// 前橋ウィッチーズとメンバー（初期セットと同じ）
const ACTORS: [string, string][] = [
  ['80126', '前橋ウィッチーズ'], ['63283', '春日さくら'], ['80112', '咲川ひなの'],
  ['80113', '本村玲奈'], ['65986', '三波春香'], ['69358', '百瀬帆南'],
];

const ids = (p: Page) => p.byId<HTMLInputElement>('actor_ids').value;
const rows = (p: Page) => p.$$('#selected_actors li');
const inSync = (p: Page) => (p.window as unknown as { selected_actors: unknown[] }).selected_actors.map(String).join(',') === ids(p);

const withActors = async (store: Record<string, unknown> = {}) => {
  const p = (page = await openPage('/events/add', { store }));
  const addActor = (p.window as unknown as { addActor: (id: string, name: string) => void }).addActor;
  return { p, addActor };
};

describe.skipIf(!loggedIn)('出演者', () => {
  test('複数選択：Shift で範囲、まとめて ▲、☰ でまとめてドラッグ、まとめて削除', async () => {
    const { p, addActor } = await withActors();
    ACTORS.forEach(([id, name]) => addActor(id, name));
    await p.until(() => p.$$('#selected_actors .ene-check').length === 6);
    expect(rows(p)[0].draggable).toBe(false); // ☰ だけがドラッグ可能
    expect(p.$('#selected_actors .ene-handle').draggable).toBe(true);

    const check = (i: number) => rows(p)[i].querySelector('.ene-check')!;
    p.click(check(1));
    p.click(check(3), { shiftKey: true });
    expect(p.$('.ene-actor-tools label span').textContent).toBe('3名選択中');

    const [, up, , del] = p.$$<HTMLInputElement>('.ene-actor-tools input');
    p.click(up);
    expect(ids(p)).toBe('63283,80112,80113,80126,65986,69358');

    const drag = { dataTransfer: { setData() {}, setDragImage() {}, effectAllowed: '', types: [] }, clientY: 1 };
    p.fire(rows(p)[1].querySelector('.ene-handle')!, 'dragstart', drag);
    p.fire(rows(p)[5], 'dragover', drag);
    p.fire(rows(p)[1], 'dragend', drag);
    expect(ids(p)).toBe('80126,65986,69358,63283,80112,80113');
    expect(inSync(p)).toBe(true);

    p.click(del);
    expect(p.dialogs.at(-1)).toContain('3名を削除しますか');
    expect(ids(p)).toBe('80126,65986,69358');
    expect(inSync(p)).toBe(true);
  });

  test('出演者セット：初期セット、グループ名の直後に追加', async () => {
    const { p, addActor } = await withActors();
    const options = p.$$<HTMLOptionElement>('.ene-presets option').map((o) => o.text);
    expect(options).toContain('前橋ウィッチーズ（6名）');

    addActor('80126', '前橋ウィッチーズ');
    addActor('11111', '後ろの出演者');
    p.$<HTMLSelectElement>('.ene-presets select').value = '0';
    p.click(p.$('.ene-presets input'));
    expect(ids(p)).toBe('80126,63283,80112,80113,65986,69358,11111');
    expect(inSync(p)).toBe(true);
  });

  test('検索：一致度順、続けて追加、追加済み、最近追加した出演者', async () => {
    const store: Record<string, unknown> = {};
    const { p } = await withActors(store);
    const input = p.$<HTMLInputElement>('#selected_actors ~ .ene-search input');
    const results = await searchIn(p, input, '前橋');
    expect(results[0].firstChild!.textContent).toBe('前橋ウィッチーズ');

    mousedown(p, results[0]);
    mousedown(p, results[1]);
    mousedown(p, results[0]); // 追加済みは無視
    expect(ids(p).split(',')).toHaveLength(2);
    expect(results[0].classList.contains('ene-done')).toBe(true);
    expect(input.closest('.ene-search')!.querySelector<HTMLElement>('.ene-suggest')!.style.display).toBe('');

    input.value = '';
    p.fire(input, 'input');
    await p.until(() => p.$('#selected_actors ~ .ene-search .ene-heading')?.textContent === '最近追加した出演者');
    expect((store.recentActors as unknown[]).length).toBe(2);
  });
});
