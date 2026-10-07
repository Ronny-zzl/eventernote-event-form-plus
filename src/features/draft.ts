import { byId } from '../lib/page';
import { load, save, type FormSnapshot } from '../lib/storage';
import type { PlacePicker } from './place';
import { isBlank, isReturning, restoreSnapshot, takeSnapshot } from './snapshot';

// 登录页的草稿自动保存：误关标签页、误点后退时，下次打开登录页可以恢复。
// 每 2 秒检查一次表单，有变化且不是空表单就保存；在确认页点「登録する」后清除。缩略图太大，不保存
const INTERVAL_MS = 2000;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

const savedAtText = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// refresh：恢复后刷新日期、时间等由下拉框派生的输入框
export const initDraft = (placePicker: PlacePicker | null, refresh: () => void) => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;

  // 从确认页返回、复制登录（from_event_id）时表单已有内容，不提示
  const draft = load('formDraft', null);
  let banner: HTMLElement | null = null;
  if (draft && !isReturning && !new URLSearchParams(location.search).has('from_event_id') && Date.now() - draft.savedAt < TTL_MS) {
    banner = document.createElement('div');
    banner.className = 'alert alert-info ene-draft';
    banner.append(`前回の入力内容が残っています（${savedAtText(draft.savedAt)}・「${draft.fields.event_name?.trim() || 'イベント名未入力'}」）`);
    const button = (value: string, onClick: () => void) => {
      const btn = Object.assign(document.createElement('input'), { type: 'button', className: 'btn btn-small', value });
      btn.addEventListener('click', () => {
        onClick();
        banner?.remove();
        banner = null;
      });
      banner!.append(btn);
    };
    button('復元する', () => {
      restoreSnapshot(form, draft, placePicker);
      refresh();
    });
    button('破棄する', () => save('formDraft', null));
    form.prepend(banner);
  }

  let last = JSON.stringify(takeSnapshot(form)); // 打开时的默认状态不保存
  setInterval(() => {
    const snapshot: FormSnapshot = takeSnapshot(form);
    const json = JSON.stringify(snapshot);
    if (json === last) return;
    last = json;
    if (isBlank(snapshot)) return;
    // 开始填新内容后，旧草稿被覆盖，提示也收起
    banner?.remove();
    banner = null;
    save('formDraft', { ...snapshot, savedAt: Date.now() });
  }, INTERVAL_MS);
};

// 确认页：点「登録する」后草稿就不需要了
export const initDraftClear = () => {
  document.querySelector('form[action="/events/add/complete"]')
    ?.addEventListener('submit', () => save('formDraft', null));
};
