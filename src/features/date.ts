import { byId, hideFrom, pad2 } from '../lib/page';
import type { DateParts } from './dateParse';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export type DatePicker = {
  refresh: () => void; // 外部直接改了下拉框（恢复快照）后用来刷新
  set: (date: DateParts) => boolean; // 超出原下拉框的年份范围时返回 false
};

// 用原生日期选择器代替年 / 月 / 日三个下拉框。原下拉框隐藏但保留，值同步回去，提交格式不变。
export const initDatePicker = (): DatePicker | null => {
  const [year, month, day] = ['date_year', 'date_month', 'date_day'].map((id) => byId<HTMLSelectElement>(id));
  if (!year || !month || !day) return null;

  const hidden = hideFrom(year);

  const box = document.createElement('span');
  box.className = 'ene-date';
  box.innerHTML = '<input type="date" required><span class="ene-weekday"></span>';
  hidden.before(box);
  const input = box.querySelector('input')!;
  const weekday = box.querySelector<HTMLElement>('.ene-weekday')!;

  // 可选范围跟随原下拉框的年份
  const years = [...year.options].map((o) => Number(o.value)).filter(Boolean);
  input.min = `${Math.min(...years)}-01-01`;
  input.max = `${Math.max(...years)}-12-31`;

  const refresh = () => {
    input.value = `${year.value}-${pad2(Number(month.value))}-${pad2(Number(day.value))}`;
    const w = new Date(Number(year.value), Number(month.value) - 1, Number(day.value)).getDay();
    weekday.textContent = `（${WEEKDAYS[w]}）`;
    weekday.dataset.day = String(w);
  };

  const set = ({ year: y, month: m, day: d }: DateParts) => {
    if (![...year.options].some((o) => o.value === String(y))) return false;
    year.value = String(y);
    month.value = String(m);
    day.value = String(d);
    refresh();
    return true;
  };

  // 清空或超出范围时恢复原值（原下拉框没有「未选择」）
  input.addEventListener('change', () => {
    const [y, m, d] = input.value.split('-').map(Number);
    if (!(y && set({ year: y, month: m, day: d }))) refresh();
  });

  refresh();
  return { refresh, set };
};
