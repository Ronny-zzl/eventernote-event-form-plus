import { eventInfoCell } from '../lib/eventPage';
import { showNotice } from '../lib/notice';
import { byId, pad2 } from '../lib/page';
import {
  LABEL_ANY_RE, TIME_KEYS, TIME_LABELS, formatTime, parseAnnouncement, parseTimeInput,
  type Time, type TimeKey,
} from './timeParse';

const selects = (key: TimeKey) => ({
  hour: byId<HTMLSelectElement>(`${key}_time_hour`),
  minute: byId<HTMLSelectElement>(`${key}_time_minute`),
});

// 原分钟下拉框只有 5 分钟一档，补全 00–59（实测服务器接受并保存任意分钟）
export const initMinuteOptions = () => {
  for (const key of TIME_KEYS) {
    const { minute } = selects(key);
    if (!minute) continue;
    const current = minute.value;
    minute.replaceChildren(new Option('-', ''), ...Array.from({ length: 60 }, (_, m) => new Option(pad2(m), pad2(m))));
    minute.value = current;
  }
};

// 编辑页：已保存的非 5 分钟值在服务器渲染的原下拉框里没有对应选项，分钟显示为空，直接提交会丢掉分钟。
// 从活动页「時間」一栏（如「開場 18:29 開演 18:30 終演 21:30」）读回实际值
export const restoreEditMinutes = async (eventId: string) => {
  const missing = TIME_KEYS.filter((key) => {
    const { hour, minute } = selects(key);
    return hour?.value && minute && !minute.value;
  });
  if (!missing.length) return;

  const text = (await eventInfoCell(eventId, '時間'))?.textContent ?? '';
  const failed = missing.filter((key) => {
    const { hour, minute } = selects(key);
    const m = text.match(new RegExp(TIME_LABELS[key] + String.raw`\s*(\d{1,2}):(\d{2})`));
    if (!m || Number(m[1]) !== Number(hour!.value)) return true;
    minute!.value = m[2];
    return false;
  });
  if (failed.length) {
    showNotice(`${failed.map((k) => TIME_LABELS[k]).join('・')}の「分」を読み込めませんでした。編集完了の前に入力し直してください。`, 'error');
  }
};

type Row = {
  hour: HTMLSelectElement;
  minute: HTMLSelectElement;
  input: HTMLInputElement;
  badge: HTMLElement;
  error: HTMLElement;
};

const QUICK: Partial<Record<TimeKey, [label: string, delta: number][]>> = {
  open: [['開演の30分前', -30], ['60分前', -60]],
  end: [['開演の2時間後', 120], ['3時間後', 180]],
};

// 用 3 个文本框代替 6 个下拉框。原下拉框隐藏但保留，值同步回去，提交格式不变。
// 返回 refresh()：外部直接改了下拉框（恢复快照、补读分钟）后用来刷新文本框
export const initSmartTime = () => {
  const rows = {} as Record<TimeKey, Row>;
  if (TIME_KEYS.some((k) => !selects(k).hour || !selects(k).minute)) return () => {};

  const readSelect = (key: TimeKey): Time | null => {
    const { hour, minute } = rows[key];
    return hour.value && minute.value ? { hour: Number(hour.value), minute: Number(minute.value) } : null;
  };
  const toMinutes = (t: Time | null) => (t ? t.hour * 60 + t.minute : null);

  // 「翌日」标记：沿用已有数据的惯例，跨午夜写成「终演早于开演」
  const updateBadges = () => {
    const [open, start, end] = TIME_KEYS.map((k) => toMinutes(readSelect(k)));
    const nextDay: Record<TimeKey, boolean> = {
      open: false,
      start: open !== null && start !== null && start < open,
      end: end !== null && ((start !== null && end < start) || (start === null && open !== null && end < open)),
    };
    for (const k of TIME_KEYS) rows[k].badge.style.display = nextDay[k] ? '' : 'none';
  };

  const setInvalid = (row: Row, invalid: boolean) => {
    row.input.classList.toggle('ene-invalid', invalid);
    row.error.style.display = invalid ? '' : 'none';
  };

  const showRow = (key: TimeKey) => {
    const row = rows[key];
    const t = readSelect(key);
    // 只有小时（如编辑页读不到分钟）时显示「18:」，留给用户补全
    row.input.value = t ? formatTime(t) : row.hour.value ? row.hour.value + ':' : '';
    setInvalid(row, !t && !!row.hour.value);
  };

  const writeSelect = (key: TimeKey, t: Time | null) => {
    rows[key].hour.value = t ? pad2(t.hour) : '';
    rows[key].minute.value = t ? pad2(t.minute) : '';
  };

  const setTime = (key: TimeKey, t: Time | null) => {
    writeSelect(key, t);
    showRow(key);
    updateBadges();
  };

  // reformat=false 时（输入过程中）只同步值，不改写用户正在输入的文字
  const apply = (key: TimeKey, reformat: boolean) => {
    const t = parseTimeInput(rows[key].input.value);
    if (t === null) {
      setInvalid(rows[key], reformat);
      return;
    }
    const value = t === 'empty' ? null : t;
    if (reformat) {
      setTime(key, value);
    } else {
      writeSelect(key, value);
      setInvalid(rows[key], false);
      updateBadges();
    }
  };

  const fillFromAnnouncement = (text: string) => {
    const found = parseAnnouncement(text);
    const keys = TIME_KEYS.filter((k) => found[k]);
    if (!keys.length) {
      showNotice('告知文から時間を読み取れませんでした', 'error');
      return;
    }
    keys.forEach((k) => setTime(k, found[k]!));
    showNotice('読み取りました：' + keys.map((k) => `${TIME_LABELS[k]} ${formatTime(found[k]!)}`).join(' / '));
  };

  // 文本框里按 Enter 会直接提交表单
  const onEnter = (input: HTMLInputElement, fn: () => void) =>
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      fn();
    });

  for (const key of TIME_KEYS) {
    const { hour, minute } = selects(key) as { hour: HTMLSelectElement; minute: HTMLSelectElement };
    // 原下拉框和「時」「分」文字收进隐藏的 span
    const hidden = document.createElement('span');
    hidden.style.display = 'none';
    hour.before(hidden);
    while (hidden.nextSibling) hidden.append(hidden.nextSibling);

    const box = document.createElement('span');
    box.className = 'ene-time-row';
    box.innerHTML = `
      <input type="text" class="ene-time" placeholder="例: 18:30" autocomplete="off">
      <span class="ene-time-badge" style="display:none" title="日付をまたぐ時間として登録されます">翌日</span>
      <span class="ene-time-error" style="display:none">時間を認識できません</span>
    `;
    for (const [label, delta] of QUICK[key] ?? []) {
      const btn = Object.assign(document.createElement('input'), { type: 'button', className: 'btn btn-small', value: label });
      btn.addEventListener('click', () => {
        const t = readSelect('start');
        if (!t) {
          showNotice('先に開演時間を入力してください', 'error');
          return;
        }
        const total = (t.hour * 60 + t.minute + delta + 1440) % 1440;
        setTime(key, { hour: Math.floor(total / 60), minute: total % 60 });
      });
      box.append(btn);
    }
    hidden.before(box);

    const input = box.querySelector<HTMLInputElement>('input.ene-time')!;
    rows[key] = { hour, minute, input, badge: box.querySelector('.ene-time-badge')!, error: box.querySelector('.ene-time-error')! };
    input.addEventListener('input', () => apply(key, false));
    input.addEventListener('change', () => apply(key, true));
    onEnter(input, () => apply(key, true));
    // 只有带「開場」「開演」等标签的文字才当作告知文处理，单纯的时间照常粘贴
    input.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text');
      if (!text || !LABEL_ANY_RE.test(text.normalize('NFKC'))) return;
      e.preventDefault();
      fillFromAnnouncement(text);
    });
  }

  // 告知文粘贴框，放在时间栏最上方
  const announce = document.createElement('p');
  announce.className = 'ene-announce';
  announce.innerHTML = `
    <span class="s">告知文から読み取る（開場・開演・終演の時間を自動入力）</span><br>
    <input type="text" placeholder="例: 開場 17:30 / 開演 18:30 / 終演 20:30 　ここに貼り付け" autocomplete="off">
  `;
  const announceInput = announce.querySelector('input')!;
  announceInput.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    e.preventDefault();
    announceInput.value = text.replace(/\s+/g, ' ').trim();
    fillFromAnnouncement(text);
  });
  onEnter(announceInput, () => fillFromAnnouncement(announceInput.value));
  rows.open.input.closest('p')!.before(announce);

  // 有无法识别的输入时阻止提交（capture 阶段，先于页面自己的提交检查）
  byId('event_form')!.addEventListener('submit', (e) => {
    TIME_KEYS.forEach((k) => apply(k, true));
    const bad = TIME_KEYS.filter((k) => rows[k].input.classList.contains('ene-invalid'));
    if (!bad.length) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    alert(bad.map((k) => TIME_LABELS[k]).join('・') + 'の時間を正しく入力してください');
    rows[bad[0]].input.focus();
  }, true);

  const refresh = () => {
    TIME_KEYS.forEach(showRow);
    updateBadges();
  };
  refresh();
  return refresh;
};
