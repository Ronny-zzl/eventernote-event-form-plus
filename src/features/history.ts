import { fetchHistoryList, type HistoryEntry } from '../lib/eventPage';
import { showNotice } from '../lib/notice';
import { byId } from '../lib/page';
import type { FormSnapshot } from '../lib/storage';
import { describeChanges } from './editDiff';
import { historySnapshot, historyTimeText, snapshotValues, type ApiHistory } from './historyParse';
import type { PlacePicker } from './place';
import { replaceSnapshot, takeSnapshot } from './snapshot';

// 编辑页「編集履歴から復元」：和别人同时编辑时，后保存的一方会把先保存的内容整个覆盖掉。
// 从活动页的编辑历史选一个版本（每条是保存后的完整内容），看过和当前输入的差别后填入表单。
// 只改表单，「編集完了」之前不会保存

const cache = new Map<string, Promise<FormSnapshot | null>>();
const fetchHistory = (id: string) => {
  let snapshot = cache.get(id);
  if (!snapshot) {
    snapshot = fetch(`/api/events/history?event_history_id=${id}`, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { results?: ApiHistory[] } | null) => (data?.results?.[0] ? historySnapshot(data.results[0]) : null))
      .catch(() => null);
    snapshot.then((s) => { if (!s) cache.delete(id); }); // 失败时下次重试
    cache.set(id, snapshot);
  }
  return snapshot;
};

export const initEditHistory = (eventId: string, placePicker: PlacePicker | null, refresh: () => void) => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;

  const entry = document.createElement('p');
  entry.className = 'ene-history-entry';
  const openBtn = Object.assign(document.createElement('input'), {
    type: 'button', className: 'btn btn-small', value: '編集履歴から復元',
    title: '以前に保存された内容をフォームに入れます（同時に編集して入力が消えてしまったときなど）',
  });
  entry.append(openBtn);
  form.prepend(entry);

  const modal = document.createElement('div');
  modal.className = 'ene-modal';
  modal.innerHTML = `
    <div class="ene-modal-box" role="dialog" aria-modal="true" aria-label="編集履歴から復元">
      <div class="ene-modal-head">編集履歴から復元<span class="ene-modal-close" title="閉じる">×</span></div>
      <div class="ene-modal-body">
        <p class="ene-transfer-help">選んだ版の内容（保存されたときの全項目）をフォームに入れます。「編集完了」を押すまで保存はされません。サムネイル画像は履歴に残っていないため変わりません。</p>
        <ul class="ene-history-list"></ul>
        <div class="ene-history-diff"></div>
      </div>
      <div class="ene-modal-foot">
        <input type="button" class="btn btn-small" value="閉じる">
        <input type="button" class="btn btn-small btn-primary" value="フォームに入れる" disabled>
      </div>
    </div>
  `;
  document.body.append(modal);
  const list = modal.querySelector<HTMLElement>('.ene-history-list')!;
  const diff = modal.querySelector<HTMLElement>('.ene-history-diff')!;
  const [closeBtn, applyBtn] = modal.querySelectorAll<HTMLInputElement>('.ene-modal-foot input');

  let entries: HistoryEntry[] | null = null;
  let chosen: { entry: HistoryEntry; snapshot: FormSnapshot } | null = null;
  let run = 0; // 连续点选时，只用最后一次的结果

  const label = (e: HistoryEntry, i: number) => `${historyTimeText(e.time)}　${e.user}${i === 0 ? '（最新）' : ''}${i === entries!.length - 1 ? '（登録）' : ''}`;

  const select = async (li: HTMLElement, e: HistoryEntry) => {
    const current = ++run;
    list.querySelectorAll('.ene-active').forEach((x) => x.classList.remove('ene-active'));
    li.classList.add('ene-active');
    chosen = null;
    applyBtn.disabled = true;
    diff.textContent = '読み込み中…';
    const snapshot = await fetchHistory(e.id);
    if (current !== run) return;
    if (!snapshot) {
      diff.textContent = '読み込めませんでした。もう一度選んでください';
      return;
    }
    const changes = describeChanges(snapshotValues(takeSnapshot(form)), snapshotValues(snapshot));
    diff.replaceChildren(
      Object.assign(document.createElement('p'), {
        className: 'ene-history-diff-head',
        textContent: changes.length ? '現在の入力内容から次のように変わります：' : '現在の入力内容と同じです',
      }),
      ...changes.map((c) => Object.assign(document.createElement('p'), { textContent: c })),
    );
    if (changes.length) {
      chosen = { entry: e, snapshot };
      applyBtn.disabled = false;
    }
  };

  const render = () => {
    if (!entries) return;
    list.replaceChildren(...entries.map((e, i) => {
      const li = Object.assign(document.createElement('li'), { textContent: label(e, i), tabIndex: 0 });
      li.dataset.id = e.id;
      li.addEventListener('click', () => select(li, e));
      li.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') select(li, e); });
      return li;
    }));
  };

  const close = () => modal.classList.remove('ene-open');
  openBtn.addEventListener('click', async () => {
    modal.classList.add('ene-open');
    chosen = null;
    applyBtn.disabled = true;
    diff.replaceChildren();
    if (entries) {
      render(); // 选中状态清掉；差别要按现在的输入重新算
      return;
    }
    list.textContent = '読み込み中…';
    // 取不到时下次打开再试
    entries = await fetchHistoryList(eventId);
    if (entries) render();
    else list.textContent = '編集履歴を読み込めませんでした';
  });

  applyBtn.addEventListener('click', () => {
    if (!chosen) return;
    replaceSnapshot(form, chosen.snapshot, placePicker);
    refresh();
    close();
    showNotice(`${historyTimeText(chosen.entry.time)}（${chosen.entry.user}）の内容をフォームに入れました。確認してから「編集完了」で保存してください`);
  });

  closeBtn.addEventListener('click', close);
  modal.querySelector('.ene-modal-close')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); }); // 点背景关闭
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('ene-open')) close(); });
};
