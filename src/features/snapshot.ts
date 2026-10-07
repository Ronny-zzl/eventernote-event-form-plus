import { byId, page } from '../lib/page';
import { load, save, type FormSnapshot } from '../lib/storage';
import { addActorIfMissing, readSelectedActors } from './actors';
import type { PlacePicker } from './place';

// 确认页没有返回按钮，浏览器后退也无法恢复由 JS 生成的出演者列表和会场列表。
// 因此提交时把表单存成快照，确认页的「戻って修正する」跳回 ?ene_restore=1 后按快照恢复。
export const RESTORE_PARAM = 'ene_restore';
const FIELD_NAMES = ['event_name', 'link', 'description', 'hashtag'];
const SELECT_IDS = [
  'date_year', 'date_month', 'date_day',
  'open_time_hour', 'open_time_minute',
  'start_time_hour', 'start_time_minute',
  'end_time_hour', 'end_time_minute',
];

const field = (form: HTMLFormElement, name: string) => form.elements.namedItem(name) as HTMLInputElement;
const selectById = (id: string) => byId<HTMLSelectElement>(id)!;

const takeSnapshot = (form: HTMLFormElement): FormSnapshot => {
  const option = selectById('places_list').selectedOptions[0];
  return {
    fields: Object.fromEntries(FIELD_NAMES.map((n) => [n, field(form, n).value])),
    selects: Object.fromEntries(SELECT_IDS.map((id) => [id, selectById(id).value])),
    actors: readSelectedActors(),
    prefecture: selectById('prefecture_id').value,
    place: option?.value ? { id: option.value, name: option.text } : null,
  };
};

const restoreSnapshot = (form: HTMLFormElement, snapshot: FormSnapshot, placePicker: PlacePicker | null) => {
  FIELD_NAMES.forEach((n) => { field(form, n).value = snapshot.fields[n] ?? ''; });
  // 直接赋值而不触发 change，避免页面的时间联动逻辑覆盖恢复的值
  SELECT_IDS.forEach((id) => { selectById(id).value = snapshot.selects[id] ?? ''; });
  snapshot.actors.forEach(addActorIfMissing);

  selectById('prefecture_id').value = snapshot.prefecture;
  const { place } = snapshot;
  if (placePicker) {
    placePicker.set(place && { ...place, prefecture: snapshot.prefecture, address: '' });
  } else if (snapshot.prefecture) {
    selectById('places_list').replaceChildren();
    page.searchPlaces(snapshot.prefecture, place?.id);
  } else if (place) {
    selectById('places_list').append(new Option(place.name, place.id, true, true));
  }
};

export const initFormSnapshot = (placePicker: PlacePicker | null) => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;
  form.addEventListener('submit', () => save('formSnapshot', takeSnapshot(form)));

  const params = new URLSearchParams(location.search);
  if (!params.has(RESTORE_PARAM)) return;
  const snapshot = load('formSnapshot', null);
  if (snapshot) restoreSnapshot(form, snapshot, placePicker);
  // 去掉参数，避免刷新时再次覆盖用户的修改
  params.delete(RESTORE_PARAM);
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
};

export const initConfirmBackButton = () => {
  const submit = document.querySelector('form[action="/events/add/complete"] input[type="submit"]');
  if (!submit) return;
  const back = Object.assign(document.createElement('input'), { type: 'button', className: 'btn', value: '戻って修正する' });
  back.style.marginRight = '8px';
  back.addEventListener('click', () => {
    if (load('formSnapshot', null)) location.href = `/events/add?${RESTORE_PARAM}=1`;
    else history.back();
  });
  submit.before(back);
};
