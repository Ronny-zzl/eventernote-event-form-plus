import { byId, page } from '../lib/page';
import { load, save, type FormSnapshot } from '../lib/storage';
import { readSelectedActors } from './actors';
import { IMAGE_CHANGE, editBaseline, editChanges } from './editConfirm';
import type { PlacePicker } from './place';
import { isBlank, isReturning, restoreSnapshot, takeSnapshot } from './snapshot';

// 草稿自动保存：误关标签页、误点后退时，下次打开页面可以恢复。
// 每 2 秒检查一次表单，有变化就保存；提交后清除。缩略图太大，不保存
const INTERVAL_MS = 2000;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

const savedAtText = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 表单开头的「前回の入力内容が残っています［復元する］［破棄する］」。点了按钮或 remove() 后消失
const showBanner = (form: HTMLFormElement, text: string, restore: () => void, discard: () => void) => {
  let banner: HTMLElement | null = document.createElement('div');
  banner.className = 'alert alert-info ene-draft';
  banner.append(text);
  const remove = () => {
    banner?.remove();
    banner = null;
  };
  for (const [value, onClick] of [['復元する', restore], ['破棄する', discard]] as const) {
    const btn = Object.assign(document.createElement('input'), { type: 'button', className: 'btn btn-small', value });
    btn.addEventListener('click', () => {
      onClick();
      remove();
    });
    banner.append(btn);
  }
  form.prepend(banner);
  return { remove, shown: () => !!banner };
};

const watch = (form: HTMLFormElement, onChange: (snapshot: FormSnapshot) => void) => {
  let last = JSON.stringify(takeSnapshot(form)); // 打开时的状态不保存
  setInterval(() => {
    const snapshot = takeSnapshot(form);
    const json = JSON.stringify(snapshot);
    if (json === last) return;
    last = json;
    onChange(snapshot);
  }, INTERVAL_MS);
};

// 登录页。refresh：恢复后刷新日期、时间等由下拉框派生的输入框
export const initDraft = (placePicker: PlacePicker | null, refresh: () => void) => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;

  // 从确认页返回、复制登录（from_event_id）时表单已有内容，不提示
  const draft = load('formDraft', null);
  const banner = draft && !isReturning && !new URLSearchParams(location.search).has('from_event_id') && Date.now() - draft.savedAt < TTL_MS
    ? showBanner(form, `前回の入力内容が残っています（${savedAtText(draft.savedAt)}・「${draft.fields.event_name?.trim() || 'イベント名未入力'}」）`,
      () => {
        restoreSnapshot(form, draft, placePicker);
        refresh();
      },
      () => save('formDraft', null))
    : null;

  watch(form, (snapshot) => {
    if (isBlank(snapshot)) return;
    // 开始填新内容后，旧草稿被覆盖，提示也收起
    banner?.remove();
    save('formDraft', { ...snapshot, savedAt: Date.now() });
  });
};

// 确认页：点「登録する」后草稿就不需要了
export const initDraftClear = () => {
  document.querySelector('form[action="/events/add/complete"]')
    ?.addEventListener('submit', () => save('formDraft', null));
};

// 编辑页：按活动 ID 保存，和原来的值有差别（editChanges）时才存，改回原样就删掉。
// 要在原来的值记完（分钟补读完成）之后调用。草稿保存后活动被别人更新过时，提示里说明恢复会覆盖那次更新
export const initEditDraft = (eventId: string, placePicker: PlacePicker | null, refresh: () => void) => {
  const form = byId<HTMLFormElement>('event_form');
  const base = editBaseline();
  if (!form || base === undefined) return;

  const drafts = () => Object.fromEntries(Object.entries(load('editDrafts', {})).filter(([, d]) => Date.now() - d.savedAt < TTL_MS));
  const put = (draft: FormSnapshot | null) => {
    const all = drafts();
    if (draft) all[eventId] = { ...draft, savedAt: Date.now(), base };
    else delete all[eventId];
    save('editDrafts', all);
  };

  const draft = drafts()[eventId];
  const banner = draft
    ? showBanner(form,
      `前回編集中の内容が残っています（${savedAtText(draft.savedAt)}）` +
        (draft.base === base ? '' : '。その後このイベントは更新されています（復元すると、その更新を上書きします）'),
      () => {
        // 出演者按草稿的人员和顺序重排：先全部去掉
        for (const actor of readSelectedActors()) page.removeActor(actor.id);
        restoreSnapshot(form, draft, placePicker);
        refresh();
      },
      () => put(null))
    : null;

  watch(form, (snapshot) => {
    const changed = (editChanges() ?? []).some((c) => c !== IMAGE_CHANGE);
    if (changed) {
      banner?.remove();
      put(snapshot);
    } else if (!banner?.shown()) {
      put(null);
    }
  });

  // 时间检查、提交前检查都通过（capture 阶段，注册在它们之后）才清除
  form.addEventListener('submit', (e) => {
    if (!e.defaultPrevented) put(null);
  }, true);
};
