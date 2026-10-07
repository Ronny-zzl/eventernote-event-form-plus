import { showNotice } from '../lib/notice';
import { byId, onEnter } from '../lib/page';
import type { DatePicker } from './date';
import { parseDate } from './dateParse';
import type { SmartTime } from './time';
import { LABEL_ANY_RE, TIME_KEYS, TIME_LABELS, formatTime, parseAnnouncement } from './timeParse';

// 「告知文から入力」：粘贴告知文，自动填入開催日和開場・開演・終演。放在「開催日」那一行的上方
export const initAnnounce = (date: DatePicker | null, time: SmartTime | null) => {
  const dateRow = byId('date_year')?.closest('tr');
  if (!dateRow || (!date && !time)) return;

  const fill = (text: string) => {
    const read: string[] = [];
    const d = date && parseDate(text);
    if (d && date!.set(d)) read.push(`${d.year}年${d.month}月${d.day}日`);
    const times = time ? parseAnnouncement(text) : {};
    for (const k of TIME_KEYS) {
      const t = times[k];
      if (!t) continue;
      time!.setTime(k, t);
      read.push(`${TIME_LABELS[k]} ${formatTime(t)}`);
    }
    if (read.length) showNotice('読み取りました：' + read.join(' / '));
    else showNotice('告知文から日付・時間を読み取れませんでした', 'error');
  };

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>告知文から入力</td>
    <td>
      <input type="text" class="ene-announce" autocomplete="off"
        placeholder="例: 2026年12月19日(土) 開場 17:30 / 開演 18:30　告知文をここに貼り付け">
      <p class="s">開催日と開場・開演・終演の時間を自動で入力します</p>
    </td>
  `;
  dateRow.before(row);
  const input = row.querySelector('input')!;
  input.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    e.preventDefault();
    input.value = text.replace(/\s+/g, ' ').trim();
    fill(text);
  });
  onEnter(input, () => fill(input.value));

  // 往时间框里粘贴带「開場」「開演」等标签的文字时也一样处理；单纯的时间照常粘贴
  for (const el of document.querySelectorAll<HTMLInputElement>('input.ene-time')) {
    el.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text');
      if (!text || !LABEL_ANY_RE.test(text.normalize('NFKC'))) return;
      e.preventDefault();
      fill(text);
    });
  }
};
