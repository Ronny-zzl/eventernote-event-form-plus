import { eventInfoCell } from '../lib/eventPage';
import { byId, findInitialPlace, pad2 } from '../lib/page';
import { readSelectedActors } from './actors';
import { describeChanges, type EditValues } from './editDiff';

// 编辑页没有确认页，「編集完了」就直接保存（改的可能是别人登录的数据）。
// 打开页面时记下原来的值，提交前由提交前检查列出改了什么（submitCheck.ts）

const val = (id: string) => byId<HTMLInputElement | HTMLSelectElement>(id)?.value ?? '';
const time = (key: string) => {
  const [hour, minute] = [val(`${key}_time_hour`), val(`${key}_time_minute`)];
  return hour && minute ? `${pad2(Number(hour))}:${pad2(Number(minute))}` : '';
};

const readValues = (form: HTMLFormElement): EditValues => {
  const field = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';
  const place = byId<HTMLSelectElement>('places_list')?.selectedOptions[0];
  return {
    eventName: field('event_name'),
    date: `${val('date_year')}/${val('date_month')}/${val('date_day')}`,
    times: { open: time('open'), start: time('start'), end: time('end') },
    actors: readSelectedActors(),
    place: place?.value ? { id: place.value, name: place.text } : null,
    link: field('link'),
    description: field('description'),
    hashtag: field('hashtag'),
  };
};

let changes: (() => string[]) | null = null;
// 编辑页以外返回 undefined
export const editChanges = () => changes?.();
export const IMAGE_CHANGE = 'サムネイル画像：新しい画像に変更';

let baseline: (() => string) | null = null;
// 原来的值（会场只看 ID，名字是异步读的）。编辑页草稿用它判断保存草稿后活动有没有被更新
export const editBaseline = () => baseline?.();

// 要在其他功能改动表单之前调用
export const initEditConfirm = (eventId: string) => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;
  const before = readValues(form);

  // 会场下拉框这时还是空的（页面脚本稍后才填），ID 从内联脚本读，名字从活动页读
  const initialPlace = findInitialPlace();
  before.place = initialPlace && { id: initialPlace.id, name: `会場ID ${initialPlace.id}` };
  if (initialPlace) {
    eventInfoCell(eventId, '開催場所').then((cell) => {
      const name = cell?.querySelector(`a[href$="/places/${initialPlace.id}"]`)?.textContent?.trim();
      if (name && before.place) before.place.name = name;
    });
  }

  changes = () => {
    const list = describeChanges(before, readValues(form));
    // 手机版的图片栏由脚本稍后补上，所以提交时再找
    const file = form.querySelector<HTMLInputElement>('input[type="file"][name="thumbnail_image"]');
    if (file?.files?.length) list.push(IMAGE_CHANGE);
    return list;
  };
  baseline = () => JSON.stringify({ ...before, place: before.place?.id ?? null });

  return {
    // 非 5 分钟的值在原下拉框里没有选项，分钟一开始是空的：补读（restoreEditMinutes）完成后再记
    minutesRestored: () => {
      for (const key of ['open', 'start', 'end'] as const) {
        if (!before.times[key] && val(`${key}_time_hour`)) before.times[key] = time(key);
      }
    },
  };
};
