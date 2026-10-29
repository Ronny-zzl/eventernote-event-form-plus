import { showNotice } from '../lib/notice';
import { byId, fieldStart, insertField, onEnter } from '../lib/page';
import type { ActorBulk } from './actorBulk';
import { splitNames } from './actorMatch';
import { findActorBlock, findHashtags, findVenue, venueQueries } from './announceParse';
import type { DatePicker } from './date';
import { parseDate } from './dateParse';
import type { PlacePicker } from './place';
import type { SmartTime } from './time';
import { LABEL_ANY_RE, TIME_KEYS, TIME_LABELS, formatTime, parseAnnouncement } from './timeParse';

type Targets = {
  date: DatePicker | null;
  time: SmartTime | null;
  place: PlacePicker | null;
  actorBulk: ActorBulk | undefined;
};

// 「告知文から入力」：粘贴告知文，自动填入開催日、開場・開演・終演、ハッシュタグ（栏是空的时候），
// 会场还没选时在会场搜索框里列出候选，出演者名单交给「まとめて追加」确认。放在「開催日」那一行的上方。
// 会场和出演者只做到「列出来让用户选」：用 2026-09 的告知文验证，会场约 8 成能在候选里找到，出演者的写法千差万别
export const initAnnounce = ({ date, time, place, actorBulk }: Targets) => {
  const dateRow = byId('date_year')?.closest('tr');
  if (!dateRow || (!date && !time)) return;

  const cell = insertField(fieldStart(dateRow), '告知文から入力');
  cell.innerHTML = `
    <input type="text" class="ene-announce" autocomplete="off"
      placeholder="例: 2026年12月19日(土) 開場 17:30 / 開演 18:30　告知文をここに貼り付け">
    <p class="s">開催日・時間・ハッシュタグを入力し、会場と出演者の候補を表示します</p>
    <p class="ene-announce-result" hidden></p>
  `;
  const input = cell.querySelector('input')!;
  const result = cell.querySelector<HTMLElement>('.ene-announce-result')!;
  const hashtag = document.querySelector<HTMLInputElement>('#event_form input[name="hashtag"]');

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
    const tags = findHashtags(text);
    if (tags.length && hashtag && !hashtag.value.trim()) {
      hashtag.value = tags.join(' #'); // 栏前面已有「#」
      read.push(`#${tags.join(' #')}`);
    }

    // 出演者、会场：显示在输入框下方
    result.replaceChildren();
    const block = findActorBlock(text);
    const names = block ? splitNames(block) : [];
    if (block && names.length && actorBulk) {
      const button = Object.assign(document.createElement('input'), { type: 'button', className: 'btn btn-small', value: '確認して追加' });
      button.addEventListener('click', () => actorBulk.openWith(block));
      const span = document.createElement('span');
      span.append(`出演者 ${names.length} 名を読み取りました `, button);
      result.append(span);
    }
    const venue = findVenue(text);
    if (venue && place) {
      place.suggestFrom(venueQueries(venue)).then((q) => {
        if (!q) return;
        result.append(Object.assign(document.createElement('span'), { textContent: `会場「${q}」の候補を表示しました` }));
        result.hidden = false;
      });
    }
    result.hidden = !result.childElementCount;

    if (read.length) showNotice('読み取りました：' + read.join(' / '));
    else if (result.hidden && !venue) showNotice('告知文から読み取れる項目がありませんでした', 'error');
  };

  let pasted = '';
  input.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    e.preventDefault();
    pasted = text;
    input.value = text.replace(/\s+/g, ' ').trim();
    fill(text);
  });
  // 输入框是一行的，粘贴时保留原文（出演者名单要看换行）；没改过就用原文
  onEnter(input, () => fill(input.value === pasted.replace(/\s+/g, ' ').trim() ? pasted : input.value));

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
