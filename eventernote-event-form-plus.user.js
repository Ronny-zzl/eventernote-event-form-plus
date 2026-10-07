// ==UserScript==
// @name         Eventernote イベント登録エンハンサー
// @name:ja      Eventernote イベント登録エンハンサー
// @name:zh-CN   Eventernote 活动登录增强
// @name:en      Eventernote Add Event Enhancer
// @namespace    https://github.com/Ronny-zzl/eventernote-event-form-plus
// @version      0.2.3
// @description  イベンターノートのイベント登録・編集画面を使いやすくします：時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:ja イベンターノートのイベント登録・編集画面を使いやすくします：時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:zh-CN 改善 Eventernote 活动登录和编辑页面：时间输入改进、出演者排序、出演者组合、从确认页返回修改、添加缩略图
// @description:en Improves the Eventernote event add/edit forms: smarter time input, reorder performers, performer sets, back button on the confirm page, thumbnail images
// @author       Ronny-zzl
// @license      MIT
// @homepageURL  https://github.com/Ronny-zzl/eventernote-event-form-plus
// @supportURL   https://github.com/Ronny-zzl/eventernote-event-form-plus/issues
// @match        https://www.eventernote.com/events/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ---- 已选出演者排序 ----
  // 页面用全局数组 selected_actors 保存顺序，并在增删时据此重写 #actor_ids，
  // 所以调整 DOM 顺序后必须同步这个数组，否则删除某人时顺序会被还原。
  function initActorSorting() {
    const list = document.getElementById('selected_actors');
    const hidden = document.getElementById('actor_ids');
    if (!list || !hidden) return;

    GM_addStyle(`
      #selected_actors { margin-left: 0; list-style: none; }
      #selected_actors li.ene-actor {
        display: flex; align-items: center; gap: 6px;
        padding: 3px 6px; margin-bottom: 2px;
        background: #fff; border: 1px solid #ddd; border-radius: 3px;
      }
      #selected_actors li.ene-dragging { opacity: 0.4; }
      #selected_actors .ene-handle { cursor: grab; color: #999; user-select: none; }
      #selected_actors .ene-name { flex: 1; }
      #selected_actors .ene-move { cursor: pointer; color: #08c; padding: 0 2px; user-select: none; }
    `);

    const syncOrder = syncActorOrder;

    function move(li, delta) {
      if (delta < 0 && li.previousElementSibling) {
        list.insertBefore(li, li.previousElementSibling);
      } else if (delta > 0 && li.nextElementSibling) {
        list.insertBefore(li.nextElementSibling, li);
      }
      syncOrder();
    }

    function decorate(li) {
      if (li.classList.contains('ene-actor')) return;
      li.classList.add('ene-actor');
      li.draggable = true;

      // 页面生成的结构是：文本节点（名字）+ <a> [削除]
      const name = document.createElement('span');
      name.className = 'ene-name';
      Array.from(li.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .forEach((n) => name.appendChild(n));

      const handle = document.createElement('span');
      handle.className = 'ene-handle';
      handle.textContent = '☰';
      handle.title = 'ドラッグで並び替え';

      const up = document.createElement('span');
      up.className = 'ene-move';
      up.textContent = '▲';
      up.title = '上へ';
      up.addEventListener('click', () => move(li, -1));

      const down = document.createElement('span');
      down.className = 'ene-move';
      down.textContent = '▼';
      down.title = '下へ';
      down.addEventListener('click', () => move(li, 1));

      li.insertBefore(name, li.firstChild);
      li.insertBefore(handle, name);
      li.insertBefore(down, name.nextSibling);
      li.insertBefore(up, down);
    }

    let dragging = null;

    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest && e.target.closest('li.ene-actor');
      if (!li) return;
      dragging = li;
      li.classList.add('ene-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.id); // Firefox 需要设置数据才能拖动
    });

    list.addEventListener('dragover', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const over = e.target.closest && e.target.closest('li.ene-actor');
      if (!over || over === dragging) return;
      const rect = over.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, after ? over.nextSibling : over);
    });

    list.addEventListener('drop', (e) => {
      if (dragging) e.preventDefault();
    });

    list.addEventListener('dragend', () => {
      if (!dragging) return;
      dragging.classList.remove('ene-dragging');
      dragging = null;
      syncOrder();
    });

    // 出演者由页面脚本动态添加，新加入的 li 在这里补上排序控件
    new MutationObserver(() => {
      Array.from(list.children).forEach(decorate);
    }).observe(list, { childList: true });
    Array.from(list.children).forEach(decorate);
  }

  // ---- 出演者公共操作 ----

  // 按 DOM 顺序重写页面的 selected_actors 数组和 #actor_ids
  function syncActorOrder() {
    const list = document.getElementById('selected_actors');
    const hidden = document.getElementById('actor_ids');
    if (!list || !hidden) return;
    const ids = Array.from(list.children).map((li) => li.id.replace(/^actor_/, ''));
    const arr = unsafeWindow.selected_actors;
    if (arr) {
      // 保留数组里原有的值（页面里混有字符串和数字两种 id）
      const ordered = ids.map((id) => {
        for (let i = 0; i < arr.length; i++) {
          if (String(arr[i]) === id) return arr[i];
        }
        return id;
      });
      arr.length = 0;
      ordered.forEach((v) => arr.push(v));
    }
    hidden.value = ids.join(',');
  }

  // 按显示顺序读取已选出演者
  function readSelectedActors() {
    const list = document.getElementById('selected_actors');
    if (!list) return [];
    return Array.from(list.children).map((li) => {
      const nameEl = li.querySelector('.ene-name');
      const name = nameEl
        ? nameEl.textContent
        : Array.from(li.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent)
            .join('');
      return { id: li.id.replace(/^actor_/, ''), name: name.trim() };
    });
  }

  function addActorIfMissing(actor) {
    // 页面的 addActor 去重时区分字符串和数字，这里按 DOM 判断是否已添加
    if (!document.getElementById('actor_' + actor.id)) {
      unsafeWindow.addActor(String(actor.id), actor.name);
    }
  }

  // ---- 出演者组合 ----
  // 把当前已选的出演者存成组合（如团体 + 全体成员），之后一键全部添加。
  // 存储格式：[{ name, actors: [{ id, name }] }]
  const PRESETS_KEY = 'actorPresets';

  function initActorPresets() {
    const list = document.getElementById('selected_actors');
    if (!list || typeof unsafeWindow.addActor !== 'function') return;

    GM_addStyle(`
      .ene-presets { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .ene-presets select { margin-bottom: 0; }
    `);

    const loadPresets = () => GM_getValue(PRESETS_KEY, []);
    const savePresets = (presets) => GM_setValue(PRESETS_KEY, presets);

    const box = document.createElement('p');
    box.className = 'ene-presets';
    box.innerHTML = `
      <select class="ene-preset-select"></select>
      <input type="button" class="btn ene-preset-add" value="セットを追加する">
      <input type="button" class="btn ene-preset-save" value="選択中の出演者をセットに保存">
      <input type="button" class="btn ene-preset-delete" value="セットを削除">
    `;
    list.parentNode.insertBefore(box, list.nextSibling);

    const select = box.querySelector('.ene-preset-select');

    function render(selectedName) {
      const presets = loadPresets();
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = presets.length ? '出演者セットを選んでください' : '（保存済みのセットはありません）';
      select.appendChild(placeholder);
      presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${p.name}（${p.actors.length}名）`;
        if (p.name === selectedName) opt.selected = true;
        select.appendChild(opt);
      });
    }

    box.querySelector('.ene-preset-add').addEventListener('click', () => {
      const preset = loadPresets()[select.value];
      if (!preset) return;
      const anchor = preset.actors.length && document.getElementById('actor_' + preset.actors[0].id);
      if (!anchor) {
        preset.actors.forEach(addActorIfMissing);
        return;
      }
      // 列表里已有セット的第一项（通常是团体名）时，新加入的成员插在它后面，而不是排到末尾。
      // 紧跟在团体名后面的已有成员保持不动，新成员接在它们之后
      const memberIds = new Set(preset.actors.map((a) => 'actor_' + a.id));
      let cursor = anchor;
      while (cursor.nextElementSibling && memberIds.has(cursor.nextElementSibling.id)) {
        cursor = cursor.nextElementSibling;
      }
      preset.actors.slice(1).forEach((actor) => {
        if (document.getElementById('actor_' + actor.id)) return;
        addActorIfMissing(actor);
        const li = document.getElementById('actor_' + actor.id);
        if (!li) return;
        cursor.after(li);
        cursor = li;
      });
      syncActorOrder();
    });

    box.querySelector('.ene-preset-save').addEventListener('click', () => {
      const actors = readSelectedActors();
      if (!actors.length) {
        alert('出演者を追加してから保存してください');
        return;
      }
      const name = (prompt('セット名', actors[0].name) || '').trim();
      if (!name) return;
      const presets = loadPresets();
      const existing = presets.findIndex((p) => p.name === name);
      if (existing !== -1) {
        if (!confirm(`セット「${name}」は既に存在します。上書きしますか？`)) return;
        presets[existing].actors = actors;
      } else {
        presets.push({ name, actors });
      }
      savePresets(presets);
      render(name);
    });

    box.querySelector('.ene-preset-delete').addEventListener('click', () => {
      const presets = loadPresets();
      const preset = presets[select.value];
      if (!preset) return;
      if (!confirm(`セット「${preset.name}」を削除しますか？`)) return;
      presets.splice(Number(select.value), 1);
      savePresets(presets);
      render();
    });

    render();
  }

  // ---- 时间：允许 1 分钟单位 ----
  // 原分钟下拉框只有 5 分钟一档，这里补全 00–59。保留原有选中值，提交格式不变。
  const MINUTE_SELECT_IDS = ['open_time_minute', 'start_time_minute', 'end_time_minute'];

  function initMinuteOptions() {
    MINUTE_SELECT_IDS.forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;
      const current = select.value;
      const existing = new Set(Array.from(select.options).map((o) => o.value));
      for (let m = 0; m < 60; m++) {
        const value = String(m).padStart(2, '0');
        if (existing.has(value)) continue;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        // 按数值顺序插入到第一个更大的选项前
        const next = Array.from(select.options).find((o) => o.value !== '' && Number(o.value) > m);
        select.insertBefore(opt, next || null);
      }
      select.value = current;
    });
  }

  // 活动页（/events/{id}）的信息表，编辑页需要从这里补充读取一些值；多处使用，只请求一次
  const eventDocCache = {};

  function fetchEventDoc(eventId) {
    if (!eventDocCache[eventId]) {
      eventDocCache[eventId] = fetch(`/events/${eventId}`, { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.text() : null))
        .then((html) => (html ? new DOMParser().parseFromString(html, 'text/html') : null))
        .catch(() => null);
    }
    return eventDocCache[eventId];
  }

  // 信息表中标题为 label 的那一行的内容单元格
  async function eventInfoCell(eventId, label) {
    const doc = await fetchEventDoc(eventId);
    if (!doc) return null;
    const head = Array.from(doc.querySelectorAll('.gb_events_info_table td'))
      .find((td) => td.textContent.trim() === label);
    return head ? head.nextElementSibling : null;
  }

  // 编辑页：已保存的非 5 分钟值在原下拉框里没有对应选项，服务器输出的 HTML 里分钟是空的，
  // 直接提交会丢掉分钟。这时从活动页「時間」一栏（如「開場 18:29 開演 18:30 終演 21:30」）读回实际值。
  const TIME_LABELS = { open: '開場', start: '開演', end: '終演' };

  async function restoreEditMinutes(eventId) {
    const missing = Object.keys(TIME_LABELS).filter((key) => {
      const hour = document.getElementById(key + '_time_hour');
      const minute = document.getElementById(key + '_time_minute');
      return hour && minute && hour.value !== '' && minute.value === '';
    });
    if (!missing.length) return;

    const cell = await eventInfoCell(eventId, '時間');
    const text = cell ? cell.textContent : '';

    const failed = [];
    missing.forEach((key) => {
      const hour = document.getElementById(key + '_time_hour');
      const minute = document.getElementById(key + '_time_minute');
      const m = text.match(new RegExp(TIME_LABELS[key] + '\\s*(\\d{1,2}):(\\d{2})'));
      if (m && Number(m[1]) === Number(hour.value)) {
        minute.value = m[2];
      } else {
        failed.push(TIME_LABELS[key]);
      }
    });
    if (failed.length) {
      showNotice(`${failed.join('・')}の「分」を読み込めませんでした。編集完了の前に入力し直してください。`, 'error');
    }
  }

  // ---- 时间：智能输入框 ----
  // 用 3 个文本框代替 6 个下拉框（下拉框隐藏但保留，值同步回去，提交格式不变）。
  // 识别 1830 / 18:30 / 18時30分 / 18時半 / 午後6時半 / 6:30pm 等；24 点以后的值换算成次日时间。
  const TIME_KEYS = Object.keys(TIME_LABELS);

  function makeTime(hour, minute, meridiem) {
    let h = Number(hour);
    const m = minute === '半' ? 30 : Number(minute || 0);
    if (meridiem) {
      const pm = /^(午後|pm|p\.m\.)$/i.test(meridiem);
      if (h > 12) return null;
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    if (h > 29 || m > 59) return null;
    return { hour: h % 24, minute: m };
  }

  function formatTime(t) {
    return String(t.hour).padStart(2, '0') + ':' + String(t.minute).padStart(2, '0');
  }

  // 解析单个输入框的内容；空 → 'empty'，无法识别 → null
  function parseTimeInput(str) {
    const s = str.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
    if (!s) return 'empty';
    let m = s.match(/^(\d{1,2})(\d{2})$/);
    if (m) return makeTime(m[1], m[2]);
    m = s.match(/^(\d{1,2})$/);
    if (m) return makeTime(m[1], 0);
    m = s.match(/^(午前|午後|am|pm|a\.m\.|p\.m\.)?(\d{1,2})(?:[:.](\d{2})|時(\d{1,2}|半)?分?)?(am|pm|a\.m\.|p\.m\.)?$/);
    if (m && !(m[1] && m[5])) return makeTime(m[2], m[3] || m[4], m[1] || m[5]);
    return null;
  }

  // 从告知文中读取时间：支持「開場 17:30 / 開演 18:30」「開場/開演 17:30/18:30」
  // 「OPEN 17:00 START 18:00」「17:30開場／18:30開演」等写法。返回 { open, start, end } 中找到的部分
  const LABEL_PATTERNS = {
    open: /^(開場|入場|open)/i,
    start: /^(開演|開始|start|スタート)/i,
    end: /^(終演|終了|end|close)/i,
  };
  // 「販売開始」「受付終了」等不是活动时间；英文要求单词边界（避免 weekend 等）
  const LABEL_ANY_RE = /開場|入場開始|入場|開演|(?<!販売|発売|受付|抽選|予約|応募|配信)(?:開始|終了)|終演|スタート|(?<![a-z])(?:open|start|end|close)(?![a-z])/i;
  const TOKEN_RE = new RegExp([
    '(' + LABEL_ANY_RE.source + ')',
    // 时间必须带「:」或「時」，避免把日期等数字当成时间；「3時間」之类排除
    '(?<!\\d)(?:(午前|午後|am|pm)\\s*)?(\\d{1,2})\\s*(?::\\s*(\\d{2})|時(?!間)\\s*(?:(\\d{1,2})分?|(半))?)(?:\\s*(am|pm)(?![a-z]))?',
  ].join('|'), 'gi');
  // 标签和时间之间允许的分隔：符号、「…」（NFKC 后是 ...）、箭头和装饰符号等
  const GAP_RE = /^(?:[\s/・|,、.:;()[\]【】〈〉<>《》「」『』〜~=_*-]|[→⇒▶▷►★☆◆◇■□●○]|時間|時刻|予定|は)*$/;

  function parseAnnouncement(text) {
    const s = text.normalize('NFKC');
    const tokens = [];
    for (const m of s.matchAll(TOKEN_RE)) {
      const token = { start: m.index, end: m.index + m[0].length };
      if (m[1]) {
        token.label = TIME_KEYS.find((k) => LABEL_PATTERNS[k].test(m[1]));
      } else {
        const meridiem = m[2] || m[7];
        token.time = makeTime(m[3], m[4] || m[5] || m[6], meridiem);
        if (!token.time) continue;
      }
      tokens.push(token);
    }
    const adjacent = (a, b) => GAP_RE.test(s.slice(a.end, b.start));

    // 写法一：标签在前。连续的标签 + 紧随的连续时间按顺序配对
    function labelFirst() {
      const result = {};
      let count = 0;
      for (let i = 0; i < tokens.length;) {
        if (!tokens[i].label) { i++; continue; }
        const labels = [tokens[i]];
        let j = i + 1;
        while (j < tokens.length && tokens[j].label && adjacent(tokens[j - 1], tokens[j])) labels.push(tokens[j++]);
        const times = [];
        while (j < tokens.length && tokens[j].time && adjacent(tokens[j - 1], tokens[j])) times.push(tokens[j++]);
        labels.forEach((l, k) => {
          if (times[k] && !result[l.label]) { result[l.label] = times[k].time; count++; }
        });
        i = j > i + labels.length ? j : i + labels.length;
      }
      return { result, count };
    }

    // 写法二：时间在前（「17:30開場」）
    function timeFirst() {
      const result = {};
      let count = 0;
      for (let i = 0; i + 1 < tokens.length; i++) {
        const t = tokens[i];
        const l = tokens[i + 1];
        if (t.time && l.label && adjacent(t, l) && !result[l.label]) {
          result[l.label] = t.time;
          count++;
          i++;
        }
      }
      return { result, count };
    }

    const a = labelFirst();
    const b = timeFirst();
    return (b.count > a.count ? b : a).result;
  }

  function initSmartTime() {
    const rows = {};
    TIME_KEYS.forEach((key) => {
      const hour = document.getElementById(key + '_time_hour');
      const minute = document.getElementById(key + '_time_minute');
      if (hour && minute) rows[key] = { hour, minute };
    });
    if (TIME_KEYS.some((k) => !rows[k])) return () => {};

    GM_addStyle(`
      .ene-time-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
      .ene-time-row input.ene-time { width: 70px; margin-bottom: 0; }
      .ene-time-row input.ene-time.ene-invalid { border-color: #b94a48; background: #fdf0f0; }
      .ene-time-row .btn { margin-bottom: 0; }
      .ene-time-badge { font-size: 11px; color: #fff; background: #f89406; border-radius: 3px; padding: 1px 5px; }
      .ene-time-error { font-size: 11px; color: #b94a48; }
      .ene-announce { margin-bottom: 10px; }
      .ene-announce input { width: 95%; margin-bottom: 0; }
    `);

    const QUICK = {
      open: [['開演の30分前', 'start', -30], ['60分前', 'start', -60]],
      end: [['開演の2時間後', 'start', 120], ['3時間後', 'start', 180]],
    };

    TIME_KEYS.forEach((key) => {
      const row = rows[key];
      // 原下拉框和「時」「分」文字收进隐藏的 span
      const hidden = document.createElement('span');
      hidden.style.display = 'none';
      row.hour.before(hidden);
      let node = hidden.nextSibling;
      while (node) {
        const next = node.nextSibling;
        hidden.appendChild(node);
        node = next;
      }

      const box = document.createElement('span');
      box.className = 'ene-time-row';
      box.innerHTML = `
        <input type="text" class="ene-time" placeholder="例: 18:30" autocomplete="off">
        <span class="ene-time-badge" style="display:none">翌日</span>
        <span class="ene-time-error" style="display:none">時間を認識できません</span>
      `;
      (QUICK[key] || []).forEach(([label, base, delta]) => {
        const btn = document.createElement('input');
        btn.type = 'button';
        btn.className = 'btn btn-small';
        btn.value = label;
        btn.addEventListener('click', () => {
          const t = readSelect(base);
          if (!t) {
            showNotice('先に開演時間を入力してください', 'error');
            return;
          }
          const total = (t.hour * 60 + t.minute + delta + 1440) % 1440;
          setTime(key, { hour: Math.floor(total / 60), minute: total % 60 });
        });
        box.appendChild(btn);
      });
      hidden.before(box);
      row.input = box.querySelector('input.ene-time');
      row.badge = box.querySelector('.ene-time-badge');
      row.error = box.querySelector('.ene-time-error');

      row.input.addEventListener('input', () => apply(key, false));
      row.input.addEventListener('change', () => apply(key, true));
      row.input.addEventListener('keydown', (e) => {
        // 文本框里按 Enter 会直接提交表单
        if (e.key === 'Enter') {
          e.preventDefault();
          apply(key, true);
        }
      });
      row.input.addEventListener('paste', (e) => {
        const text = e.clipboardData && e.clipboardData.getData('text');
        // 只有带「開場」「開演」等标签的文字才当作告知文处理，单纯的时间照常粘贴
        if (!text || !LABEL_ANY_RE.test(text.normalize('NFKC'))) return;
        e.preventDefault();
        fillFromAnnouncement(text);
      });
    });

    // 告知文粘贴框，放在时间栏最上方
    const announce = document.createElement('p');
    announce.className = 'ene-announce';
    announce.innerHTML = `
      <span class="s">告知文から読み取る（開場・開演・終演の時間を自動入力）</span><br>
      <input type="text" placeholder="例: 開場 17:30 / 開演 18:30 / 終演 20:30 　ここに貼り付け" autocomplete="off">
    `;
    const announceInput = announce.querySelector('input');
    announceInput.addEventListener('paste', (e) => {
      const text = e.clipboardData && e.clipboardData.getData('text');
      if (!text) return;
      e.preventDefault();
      announceInput.value = text.replace(/\s+/g, ' ').trim();
      fillFromAnnouncement(text);
    });
    announceInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      fillFromAnnouncement(announceInput.value);
    });
    rows.open.input.closest('p').before(announce);

    function readSelect(key) {
      const { hour, minute } = rows[key];
      if (hour.value === '' || minute.value === '') return null;
      return { hour: Number(hour.value), minute: Number(minute.value) };
    }

    function toMinutes(t) {
      return t ? t.hour * 60 + t.minute : null;
    }

    // 「翌日」标记：沿用已有数据的惯例，跨午夜写成「终演早于开演」
    function updateBadges() {
      const open = toMinutes(readSelect('open'));
      const start = toMinutes(readSelect('start'));
      const end = toMinutes(readSelect('end'));
      const nextDay = {
        open: false,
        start: open !== null && start !== null && start < open,
        end: end !== null && ((start !== null && end < start) || (start === null && open !== null && end < open)),
      };
      TIME_KEYS.forEach((k) => {
        rows[k].badge.style.display = nextDay[k] ? '' : 'none';
        rows[k].badge.title = '日付をまたぐ時間として登録されます';
      });
    }

    function showRow(key) {
      const row = rows[key];
      const t = readSelect(key);
      if (t) {
        row.input.value = formatTime(t);
      } else if (row.hour.value !== '') {
        // 只有小时（如编辑页读不到分钟）：留给用户补全
        row.input.value = row.hour.value + ':';
      } else {
        row.input.value = '';
      }
      const invalid = !t && row.hour.value !== '';
      row.input.classList.toggle('ene-invalid', invalid);
      row.error.style.display = invalid ? '' : 'none';
    }

    function setTime(key, t) {
      const row = rows[key];
      row.hour.value = t ? String(t.hour).padStart(2, '0') : '';
      row.minute.value = t ? String(t.minute).padStart(2, '0') : '';
      showRow(key);
      updateBadges();
    }

    // reformat=false 时（输入过程中）只同步值，不改写用户正在输入的文字
    function apply(key, reformat) {
      const row = rows[key];
      const t = parseTimeInput(row.input.value);
      if (t === null) {
        row.input.classList.toggle('ene-invalid', reformat);
        row.error.style.display = reformat ? '' : 'none';
        return;
      }
      if (reformat) {
        setTime(key, t === 'empty' ? null : t);
      } else {
        row.hour.value = t === 'empty' ? '' : String(t.hour).padStart(2, '0');
        row.minute.value = t === 'empty' ? '' : String(t.minute).padStart(2, '0');
        row.input.classList.remove('ene-invalid');
        row.error.style.display = 'none';
        updateBadges();
      }
    }

    function fillFromAnnouncement(text) {
      const found = parseAnnouncement(text);
      const keys = TIME_KEYS.filter((k) => found[k]);
      if (!keys.length) {
        showNotice('告知文から時間を読み取れませんでした', 'error');
        return;
      }
      keys.forEach((k) => setTime(k, found[k]));
      showNotice('読み取りました：' + keys.map((k) => `${TIME_LABELS[k]} ${formatTime(found[k])}`).join(' / '));
    }

    // 有无法识别的输入时阻止提交（capture 阶段，先于页面自己的提交检查）
    const form = document.getElementById('event_form');
    form.addEventListener('submit', (e) => {
      TIME_KEYS.forEach((k) => apply(k, true));
      const bad = TIME_KEYS.filter((k) => rows[k].input.classList.contains('ene-invalid'));
      if (!bad.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      alert(bad.map((k) => TIME_LABELS[k]).join('・') + 'の時間を正しく入力してください');
      rows[bad[0]].input.focus();
    }, true);

    function refresh() {
      TIME_KEYS.forEach(showRow);
      updateBadges();
    }
    refresh();
    return refresh;
  }

  // ---- 会场：搜索框 ----
  // 原 UI 是「都道府県 → 该县全部会场的下拉框」，东京都有 6000 多个会场（约 370KB，加载数秒），
  // 且按 ID 排序，下拉框几乎无法使用。这里改成一个搜索框（/api/places/search?keyword=…），
  // 原控件隐藏但保留：#places_list 里只放选中的那一项，#prefecture_id 同步为该会场的都道府県，提交格式不变。
  const RECENT_PLACES_KEY = 'recentPlaces';
  const RECENT_PLACES_MAX = 10;
  const CLOSED_PLACE_RE = /閉館|閉店|閉校|閉鎖|閉場|移転/;

  function initPlacePicker() {
    const select = document.getElementById('places_list');
    const prefSelect = document.getElementById('prefecture_id');
    const suggest = document.getElementById('places_suggest');
    if (!select || !prefSelect) return null;
    const cell = select.closest('td');

    GM_addStyle(`
      .ene-place { position: relative; margin-bottom: 8px; }
      .ene-place-current {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        padding: 6px 8px; margin-bottom: 6px; border: 1px solid #ddd; border-radius: 3px; background: #fff;
      }
      .ene-place-current .ene-place-name { font-weight: bold; }
      .ene-place-current .ene-place-sub { color: #888; font-size: 11px; flex: 1; }
      .ene-place-current .btn { margin-bottom: 0; }
      .ene-place-search { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
      .ene-place-search select { width: auto; margin-bottom: 0; }
      .ene-place-search input { flex: 1; min-width: 200px; margin-bottom: 0; }
      .ene-place-results {
        position: absolute; left: 0; right: 0; z-index: 1000; margin: 2px 0 0; padding: 0; list-style: none;
        max-height: 360px; overflow-y: auto; background: #fff; border: 1px solid #ccc; border-radius: 3px;
        box-shadow: 0 4px 12px rgba(0,0,0,.15);
      }
      .ene-place-results li { padding: 5px 8px; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
      .ene-place-results li.ene-active { background: #eef6fb; }
      .ene-place-results li.ene-closed { opacity: .5; }
      .ene-place-results li.ene-heading { cursor: default; background: #f7f7f7; color: #888; font-size: 11px; }
      .ene-place-results .ene-place-sub { display: block; color: #888; font-size: 11px; }
    `);

    // 都道府県名：取原下拉框的文字，去掉「 (538)」之类的件数
    const prefNames = {};
    Array.from(prefSelect.options).forEach((o) => {
      if (o.value) prefNames[o.value] = o.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
    });

    // 原控件收起来（「→上記のリストに無い会場を登録」链接保留）
    [prefSelect, select, suggest].forEach((el) => {
      const p = el && el.closest('p');
      if (p) p.style.display = 'none';
    });
    const suggestBox = cell.querySelector('.gb_suggest');
    if (suggestBox) suggestBox.style.display = 'none';

    const box = document.createElement('div');
    box.className = 'ene-place';
    box.innerHTML = `
      <div class="ene-place-current" style="display:none">
        <span class="ene-place-name"></span><span class="ene-place-sub"></span>
        <input type="button" class="btn btn-small ene-place-clear" value="取り消す">
      </div>
      <div class="ene-place-search">
        <select class="ene-place-pref"><option value="">全国</option></select>
        <input type="text" class="ene-place-input" placeholder="会場名・住所で検索（例: Zepp、武道館、渋谷）" autocomplete="off">
      </div>
      <ul class="ene-place-results" style="display:none"></ul>
    `;
    cell.prepend(box);

    const current = box.querySelector('.ene-place-current');
    const input = box.querySelector('.ene-place-input');
    const prefFilter = box.querySelector('.ene-place-pref');
    const results = box.querySelector('.ene-place-results');
    Object.keys(prefNames).forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = prefNames[value];
      prefFilter.appendChild(opt);
    });

    let chosen = null;

    function placeSub(place) {
      // 容量一栏常常很长（分楼层、站席/座席），只显示都道府県和地址
      return [prefNames[place.prefecture], place.address].filter(Boolean).join(' / ');
    }

    // 把选择写回隐藏的原控件
    function applyToForm() {
      if (!chosen) {
        if (select.value !== '' || select.options.length !== 1) {
          select.innerHTML = '<option value="">選択してください</option>';
        }
        return;
      }
      const id = String(chosen.id);
      if (select.options.length === 1 && select.value === id && select.options[0].textContent === chosen.name) return;
      select.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = chosen.name;
      opt.selected = true;
      select.appendChild(opt);
      if (chosen.prefecture && prefNames[chosen.prefecture]) prefSelect.value = String(chosen.prefecture);
    }

    // 编辑页的 searchPlaces 加载完 6000 多项后会清空下拉框重建，这里发现选择被改掉就改回来
    // （用户取消选择后也一样，否则原会场会被重新选上）。顺便丢掉那 6000 多个 option，减轻页面负担
    new MutationObserver(() => {
      if (select.options.length !== 1 || select.value !== (chosen ? String(chosen.id) : '')) applyToForm();
    }).observe(select, { childList: true });

    function render() {
      current.style.display = chosen ? '' : 'none';
      if (chosen) {
        current.querySelector('.ene-place-name').textContent = chosen.name;
        current.querySelector('.ene-place-sub').textContent = placeSub(chosen);
      }
    }

    function set(place, remember) {
      chosen = place ? {
        id: String(place.id),
        name: place.place_name || place.name || '',
        prefecture: place.prefecture ? String(place.prefecture) : '',
        address: place.address || '',
      } : null;
      applyToForm();
      render();
      if (chosen && remember) rememberPlace(chosen);
    }

    function rememberPlace(place) {
      const list = GM_getValue(RECENT_PLACES_KEY, []).filter((p) => p.id !== place.id);
      list.unshift(place);
      GM_setValue(RECENT_PLACES_KEY, list.slice(0, RECENT_PLACES_MAX));
    }

    current.querySelector('.ene-place-clear').addEventListener('click', () => {
      set(null);
      input.focus();
    });

    // ---- 搜索结果列表 ----
    let items = [];
    let active = -1;

    function closeResults() {
      results.style.display = 'none';
      items = [];
      active = -1;
    }

    function showResults(places, heading, emptyText) {
      results.innerHTML = '';
      items = [];
      active = -1;
      if (heading) {
        const li = document.createElement('li');
        li.className = 'ene-heading';
        li.textContent = heading;
        results.appendChild(li);
      }
      if (!places.length) {
        const li = document.createElement('li');
        li.className = 'ene-heading';
        li.textContent = emptyText;
        results.appendChild(li);
      }
      places.forEach((place) => {
        const li = document.createElement('li');
        const name = place.place_name || place.name || '';
        if (CLOSED_PLACE_RE.test(name)) li.classList.add('ene-closed');
        li.textContent = name;
        const sub = document.createElement('span');
        sub.className = 'ene-place-sub';
        sub.textContent = placeSub(place);
        li.appendChild(sub);
        // mousedown 先于输入框的 blur，避免列表先被关掉
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          choose(place);
        });
        results.appendChild(li);
        items.push({ li, place });
      });
      results.style.display = '';
    }

    function setActive(index) {
      if (!items.length) return;
      active = (index + items.length) % items.length;
      items.forEach((it, i) => it.li.classList.toggle('ene-active', i === active));
      items[active].li.scrollIntoView({ block: 'nearest' });
    }

    function choose(place) {
      set(place, true);
      input.value = '';
      closeResults();
    }

    function showRecent() {
      const recent = GM_getValue(RECENT_PLACES_KEY, []);
      if (recent.length) showResults(recent, '最近使った会場');
      else closeResults();
    }

    // 名字完全一致 > 名字开头一致 > 名字包含 > 只有地址等匹配；闭馆的排最后
    function rank(places, keyword) {
      const kw = keyword.normalize('NFKC').toLowerCase();
      const score = (p) => {
        const name = (p.place_name || '').normalize('NFKC').toLowerCase();
        let s = name === kw ? 0 : name.startsWith(kw) ? 1 : name.includes(kw) ? 2 : 3;
        if (CLOSED_PLACE_RE.test(p.place_name || '')) s += 10;
        return s;
      };
      return places
        .map((p, i) => ({ p, s: score(p), i }))
        .sort((a, b) => a.s - b.s || a.i - b.i)
        .map((x) => x.p);
    }

    let timer = null;
    let seq = 0;

    async function search() {
      const keyword = input.value.trim();
      if (!keyword) {
        showRecent();
        return;
      }
      const mySeq = ++seq;
      const params = new URLSearchParams({ keyword, simple: '3', limit: '50' });
      if (prefFilter.value) params.set('prefecture', prefFilter.value);
      let places = [];
      try {
        const res = await fetch('/api/places/search?' + params, { credentials: 'same-origin' });
        const data = await res.json();
        places = data.results || [];
      } catch (err) {
        if (mySeq === seq) showResults([], null, '検索に失敗しました');
        return;
      }
      if (mySeq !== seq || document.activeElement !== input) return; // 已有更新的搜索，或焦点已离开
      showResults(rank(places, keyword).slice(0, 30), null, '見つかりませんでした');
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(search, 300);
    });
    input.addEventListener('focus', () => search());
    input.addEventListener('blur', () => setTimeout(closeResults, 100));
    prefFilter.addEventListener('change', () => {
      if (input.value.trim()) {
        input.focus();
        search();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(active + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(active - 1);
      } else if (e.key === 'Enter') {
        // 文本框里按 Enter 会直接提交表单
        e.preventDefault();
        if (items[active]) choose(items[active].place);
        else if (items.length === 1) choose(items[0].place);
      } else if (e.key === 'Escape') {
        closeResults();
      }
    });

    // 页面加载时已指定的会场（编辑页、「この情報をもとに登録」等）：页面脚本里有 searchPlaces(都道府県, 会场ID)
    let initial = null;
    for (const s of document.querySelectorAll('script:not([src])')) {
      const m = s.textContent.match(/searchPlaces\(\s*(\d*)\s*,\s*(\d+)\s*\)/);
      if (m) { initial = { prefecture: m[1], id: m[2] }; break; }
    }

    return {
      set,
      // 编辑页：不等 6000 多项的列表，先从活动页读出会场名，再用搜索 API 补全地址
      async loadInitial(eventId) {
        if (!initial || chosen) return;
        set({ id: initial.id, name: '読み込み中…', prefecture: initial.prefecture });
        const placeCell = eventId ? await eventInfoCell(eventId, '開催場所') : null;
        const link = placeCell && placeCell.querySelector(`a[href$="/places/${initial.id}"]`);
        if (!chosen || chosen.id !== initial.id) return; // 加载期间用户已选了别的会场
        if (!link) {
          set({ id: initial.id, name: `会場ID ${initial.id}`, prefecture: initial.prefecture });
          return;
        }
        const name = link.textContent.trim();
        set({ id: initial.id, name, prefecture: initial.prefecture });
        try {
          const params = new URLSearchParams({ keyword: name, simple: '3', limit: '50' });
          if (initial.prefecture) params.set('prefecture', initial.prefecture);
          const res = await fetch('/api/places/search?' + params, { credentials: 'same-origin' });
          const found = ((await res.json()).results || []).find((p) => String(p.id) === initial.id);
          if (found && chosen && chosen.id === initial.id) set(found);
        } catch (err) {
          // 地址只是补充信息，取不到就算了
        }
      },
    };
  }

  // ---- 从确认页返回修改 ----
  // 确认页没有返回按钮，浏览器后退也无法恢复由 JS 生成的出演者列表和会场列表。
  // 因此提交时把表单存成快照，确认页的「戻って修正する」跳回 ?ene_restore=1 后按快照恢复。
  const SNAPSHOT_KEY = 'formSnapshot';
  const RESTORE_PARAM = 'ene_restore';
  const FIELD_NAMES = ['event_name', 'link', 'description', 'hashtag'];
  const SELECT_IDS = [
    'date_year', 'date_month', 'date_day',
    'open_time_hour', 'open_time_minute',
    'start_time_hour', 'start_time_minute',
    'end_time_hour', 'end_time_minute',
  ];

  function initFormSnapshot() {
    const form = document.getElementById('event_form');
    if (!form) return;

    form.addEventListener('submit', () => {
      const place = document.getElementById('places_list');
      const placeOption = place && place.selectedOptions[0];
      const snapshot = {
        fields: {},
        selects: {},
        actors: readSelectedActors(),
        prefecture: document.getElementById('prefecture_id').value,
        place: placeOption && placeOption.value
          ? { id: placeOption.value, name: placeOption.textContent }
          : null,
      };
      FIELD_NAMES.forEach((n) => { snapshot.fields[n] = form.elements[n].value; });
      SELECT_IDS.forEach((id) => { snapshot.selects[id] = document.getElementById(id).value; });
      GM_setValue(SNAPSHOT_KEY, snapshot);
    });

    const params = new URLSearchParams(location.search);
    if (!params.has(RESTORE_PARAM)) return;
    const snapshot = GM_getValue(SNAPSHOT_KEY, null);
    if (snapshot) restoreSnapshot(form, snapshot);
    // 去掉参数，避免刷新时再次覆盖用户的修改
    params.delete(RESTORE_PARAM);
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
  }

  function restoreSnapshot(form, snapshot) {
    FIELD_NAMES.forEach((n) => { form.elements[n].value = snapshot.fields[n] || ''; });
    // 直接赋值而不触发 change，避免页面的时间联动逻辑覆盖恢复的值
    SELECT_IDS.forEach((id) => { document.getElementById(id).value = snapshot.selects[id] || ''; });

    snapshot.actors.forEach(addActorIfMissing);

    const prefecture = document.getElementById('prefecture_id');
    const places = document.getElementById('places_list');
    prefecture.value = snapshot.prefecture || '';
    if (placePicker) {
      // 有会场搜索框时直接设置，不用再加载整个都道府県的会场列表
      placePicker.set(snapshot.place
        ? { id: snapshot.place.id, name: snapshot.place.name, prefecture: snapshot.prefecture }
        : null);
    } else if (snapshot.prefecture) {
      places.innerHTML = '';
      unsafeWindow.searchPlaces(snapshot.prefecture, snapshot.place ? snapshot.place.id : undefined);
    } else if (snapshot.place) {
      // 通过会场搜索选择时页面不会设置都道府県，这时只恢复选中的那个会场
      const opt = document.createElement('option');
      opt.value = snapshot.place.id;
      opt.textContent = snapshot.place.name;
      opt.selected = true;
      places.appendChild(opt);
    }
  }

  function initConfirmBackButton() {
    const submit = document.querySelector('form[action="/events/add/complete"] input[type="submit"]');
    if (!submit) return;
    const back = document.createElement('input');
    back.type = 'button';
    back.className = 'btn';
    back.value = '戻って修正する';
    back.style.marginRight = '8px';
    back.addEventListener('click', () => {
      if (GM_getValue(SNAPSHOT_KEY, null)) {
        location.href = '/events/add?' + RESTORE_PARAM + '=1';
      } else {
        history.back();
      }
    });
    submit.parentNode.insertBefore(back, submit);
  }

  // ---- 缩略图 ----
  // 登录页没有图片字段（确认页靠隐藏字段转交数据，文件无法带过去），
  // 只有编辑页能上传 thumbnail_image。所以流程是：
  //   登录页选图（存入 DRAFT_IMAGE_KEY）→ 确认页点「登録する」时转为待上传任务（PENDING_UPLOAD_KEY）
  //   → 登录完成后找到新活动，核对活动名和会场后，用编辑页原样提交并附上图片。
  const DRAFT_IMAGE_KEY = 'draftImage';
  const PENDING_UPLOAD_KEY = 'pendingUpload';
  const PENDING_TTL_MS = 30 * 60 * 1000;
  const SERVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  const S3_EVENT_IMAGE = 'https://eventernote.s3.amazonaws.com/images/events/';

  function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // 服务器端支持的格式原样保存，其他格式（如 WebP）先转成 JPEG
  async function normalizeImage(file) {
    const dataUrl = await readAsDataUrl(file);
    if (SERVER_IMAGE_TYPES.includes(file.type)) {
      return { dataUrl, name: file.name || 'thumbnail', type: file.type };
    }
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('画像を読み込めませんでした'));
      el.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
      name: (file.name || 'thumbnail').replace(/\.[^.]*$/, '') + '.jpg',
      type: 'image/jpeg',
    };
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',');
    const type = header.match(/data:([^;]+)/)[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  function firstImageFile(fileList) {
    return Array.from(fileList || []).find((f) => f.type.startsWith('image/')) || null;
  }

  function showNotice(message, kind) {
    GM_addStyle(`
      .ene-notice {
        position: fixed; top: 60px; right: 20px; z-index: 10000; max-width: 360px;
        padding: 10px 14px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.2);
        background: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; font-size: 13px;
      }
      .ene-notice.ene-error { background: #f2dede; color: #a94442; border-color: #ebccd1; }
      .ene-notice .ene-close { float: right; margin-left: 10px; cursor: pointer; }
    `);
    const box = document.createElement('div');
    box.className = 'ene-notice' + (kind === 'error' ? ' ene-error' : '');
    const close = document.createElement('span');
    close.className = 'ene-close';
    close.textContent = '×';
    close.addEventListener('click', () => box.remove());
    box.appendChild(close);
    box.appendChild(document.createTextNode(message));
    document.body.appendChild(box);
    return box;
  }

  // 图片选择框（拖入 / Ctrl+V / 文件选择），登录页和编辑页共用。
  // onImage 收到已规范化的 { dataUrl, name, type }；返回的 show/clear 用来切换预览。
  function createImageDrop(onImage, onRemove) {
    GM_addStyle(`
      .ene-drop {
        border: 2px dashed #bbb; border-radius: 4px; padding: 14px; text-align: center;
        color: #888; cursor: pointer; background: #fafafa;
      }
      .ene-drop.ene-over { border-color: #08c; background: #eef6fb; color: #08c; }
      .ene-drop img { display: block; max-width: 300px; max-height: 200px; margin: 0 auto 6px; }
      .ene-image-note { margin-top: 4px; font-size: 11px; color: #888; }
    `);

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ene-drop" tabindex="0"></div>
      <input type="file" accept="image/*" style="display:none">
    `;
    const drop = wrap.querySelector('.ene-drop');
    const picker = wrap.querySelector('input[type="file"]');

    function clear() {
      drop.textContent = 'ここに画像をドラッグ＆ドロップ / Ctrl+V で貼り付け / クリックしてファイルを選択';
    }

    function show(dataUrl) {
      drop.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl;
      const remove = document.createElement('input');
      remove.type = 'button';
      remove.className = 'btn btn-small';
      remove.value = '画像を取り消す';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove();
        clear();
      });
      drop.append(img, remove);
    }

    async function accept(file) {
      if (!file) return;
      try {
        const image = await normalizeImage(file);
        onImage(image);
        show(image.dataUrl);
      } catch (err) {
        alert(err.message);
      }
    }

    drop.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => {
      accept(firstImageFile(picker.files));
      picker.value = '';
    });

    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    drop.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      drop.classList.add('ene-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('ene-over'));
    drop.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      drop.classList.remove('ene-over');
      accept(firstImageFile(e.dataTransfer.files));
    });
    // 图片没拖到框里时，浏览器默认会打开图片并离开本页，导致已填内容丢失
    document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    document.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });

    // 剪贴板里有图片时才接管，粘贴文字不受影响
    document.addEventListener('paste', (e) => {
      const file = firstImageFile(e.clipboardData && e.clipboardData.files);
      if (!file) return;
      e.preventDefault();
      accept(file);
    });

    clear();
    return { element: wrap, show, clear };
  }

  // 登录页：选中的图片存入 DRAFT_IMAGE_KEY，登录完成后自动上传
  function initImagePicker() {
    const form = document.getElementById('event_form');
    const submit = form && form.querySelector('input[type="submit"]');
    if (!submit) return;

    // 新打开的登录页从空白开始；只有从确认页返回时才沿用之前选的图片
    if (!new URLSearchParams(location.search).has(RESTORE_PARAM)) {
      GM_setValue(DRAFT_IMAGE_KEY, null);
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>サムネイル画像</td>
      <td><p class="ene-image-note">登録完了後、イベント編集機能を使って自動でアップロードします。</p></td>
    `;
    submit.closest('tr').before(row);

    const picker = createImageDrop(
      (image) => GM_setValue(DRAFT_IMAGE_KEY, image),
      () => GM_setValue(DRAFT_IMAGE_KEY, null),
    );
    row.cells[1].prepend(picker.element);

    const draft = GM_getValue(DRAFT_IMAGE_KEY, null);
    if (draft) picker.show(draft.dataUrl);
  }

  // 编辑页：选中的图片直接放进原生的 thumbnail_image 字段，随「編集完了」一起提交
  function initEditImagePicker() {
    const input = document.querySelector('#event_form input[type="file"][name="thumbnail_image"]');
    if (!input) return;

    input.style.display = 'none';
    const current = input.parentNode.querySelector('img');
    if (current) {
      const label = document.createElement('p');
      label.className = 'ene-image-note';
      label.textContent = '現在の画像';
      current.before(label);
      current.style.display = 'block';
      current.style.marginBottom = '10px';
    }

    const picker = createImageDrop(
      (image) => {
        const blob = dataUrlToBlob(image.dataUrl);
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], image.name, { type: image.type }));
        input.files = transfer.files;
      },
      () => { input.value = ''; },
    );
    const note = document.createElement('p');
    note.className = 'ene-image-note';
    note.textContent = '新しい画像は「編集完了」を押すと保存されます。';
    picker.element.append(note);
    input.after(picker.element);
  }

  // 确认页：显示待上传的图片，点「登録する」时登记上传任务
  function initConfirmImage() {
    const form = document.querySelector('form[action="/events/add/complete"]');
    const image = GM_getValue(DRAFT_IMAGE_KEY, null);
    if (!form || !image) return;

    const submitRow = form.querySelector('input[type="submit"]').closest('tr');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>サムネイル画像</td>
      <td><img style="max-width:300px;max-height:200px"><br>
        <span class="s">登録完了後に自動でアップロードします</span></td>
    `;
    row.querySelector('img').src = image.dataUrl;
    submitRow.before(row);

    form.addEventListener('submit', () => {
      GM_setValue(PENDING_UPLOAD_KEY, {
        image,
        eventName: form.elements.event_name.value,
        placeId: form.elements.place_id.value,
        createdAt: Date.now(),
      });
    });
  }

  // 登录完成后：找到新活动并通过编辑页上传图片
  function candidateEventIds() {
    const ids = [];
    const m = location.pathname.match(/^\/events\/(\d+)\/?$/);
    if (m) ids.push(m[1]);
    if (location.pathname.startsWith('/events/add/complete')) {
      document.querySelectorAll('.page a[href]').forEach((a) => {
        const lm = a.getAttribute('href').match(/^(?:https?:\/\/www\.eventernote\.com)?\/events\/(\d+)\/?$/);
        if (lm && !ids.includes(lm[1])) ids.push(lm[1]);
      });
    }
    return ids;
  }

  async function fetchEditForm(eventId) {
    const res = await fetch(`/events/${eventId}/edit`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const form = doc.getElementById('event_form');
    if (!form) return null;
    // 会场下拉框由页面脚本 searchPlaces(都道府県, 会场ID) 填充，HTML 里是空的
    let placeId = '';
    for (const s of doc.querySelectorAll('script:not([src])')) {
      const pm = s.textContent.match(/searchPlaces\(\s*\d*\s*,\s*(\d+)\s*\)/);
      if (pm) { placeId = pm[1]; break; }
    }
    return { form, placeId };
  }

  function buildEditFormData(form, placeId, image) {
    const data = new FormData();
    Array.from(form.elements).forEach((el) => {
      if (!el.name || el.disabled) return;
      if (['file', 'submit', 'button', 'reset', 'image'].includes(el.type)) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      if (el.name === 'place_id') return;
      data.append(el.name, el.value);
    });
    data.append('place_id', placeId);
    data.append('thumbnail_image', dataUrlToBlob(image.dataUrl), image.name);
    return data;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // S3 图片的 Last-Modified（毫秒）；不存在时 S3 返回 403 → null。S3 允许跨域 GET
  async function imageLastModified(url) {
    try {
      const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      return Date.parse(res.headers.get('Last-Modified')) || 0;
    } catch (err) {
      return null;
    }
  }

  // 新活动登录后，网站会在后台根据「関連リンク」生成图片（OGP 图或网页截图），约 5 秒后写入 S3，
  // 会覆盖在此之前上传的图片。所以有链接时先等这张自动图片出现再上传。
  const SITE_IMAGE_WAIT_MS = 60 * 1000;
  const UPLOAD_LOCK_MS = 2 * 60 * 1000;

  async function waitForSiteImage(url) {
    const deadline = Date.now() + SITE_IMAGE_WAIT_MS;
    while (Date.now() < deadline) {
      const lm = await imageLastModified(url);
      if (lm !== null) {
        await sleep(2000); // 原图和缩略图可能不是同时写完
        return lm;
      }
      await sleep(2000);
    }
    return null;
  }

  async function processPendingUpload() {
    const pending = GM_getValue(PENDING_UPLOAD_KEY, null);
    if (!pending) return;
    if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
      GM_setValue(PENDING_UPLOAD_KEY, null);
      return;
    }
    if (pending.uploadingAt && Date.now() - pending.uploadingAt < UPLOAD_LOCK_MS) return; // 其他标签页正在处理

    for (const id of candidateEventIds()) {
      const edit = await fetchEditForm(id);
      if (!edit) continue;
      if (edit.form.elements.event_name.value.trim() !== pending.eventName.trim()) continue;
      if (pending.placeId && edit.placeId !== pending.placeId) {
        // 会场解析不一致时上传会清空或改错会场，宁可放弃
        GM_setValue(PENDING_UPLOAD_KEY, null);
        showNotice('会場情報を正しく読み取れなかったため、画像の自動アップロードを中止しました。イベント編集画面から手動で追加してください。', 'error');
        return;
      }

      GM_setValue(PENDING_UPLOAD_KEY, Object.assign({}, pending, { uploadingAt: Date.now() }));

      const imageUrl = S3_EVENT_IMAGE + id + '_s.jpg';
      const hasLink = Boolean(edit.form.elements.link && edit.form.elements.link.value.trim());
      let siteImageAt = await imageLastModified(imageUrl);
      if (siteImageAt === null && hasLink) {
        const waiting = showNotice('サイトによる画像の自動生成を待っています。このページを開いたままお待ちください…');
        siteImageAt = await waitForSiteImage(imageUrl);
        waiting.remove();
      }

      try {
        const res = await fetch(edit.form.getAttribute('action'), {
          method: 'POST',
          body: buildEditFormData(edit.form, edit.placeId, pending.image),
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } catch (err) {
        GM_setValue(PENDING_UPLOAD_KEY, null);
        showNotice('画像のアップロードに失敗しました（' + err.message + '）。イベント編集画面から手動で追加してください。', 'error');
        return;
      }
      GM_setValue(PENDING_UPLOAD_KEY, null);

      // 确认 S3 上的图片已换成刚上传的（比自动生成的图片更新）
      let uploadedAt = null;
      for (let i = 0; i < 5 && uploadedAt === null; i++) {
        const lm = await imageLastModified(imageUrl);
        if (lm !== null && (siteImageAt === null || lm > siteImageAt)) uploadedAt = lm;
        else await sleep(2000);
      }
      if (uploadedAt === null) {
        showNotice('画像を送信しましたが、反映を確認できませんでした。しばらくしてからイベントページを確認してください。', 'error');
      } else if (siteImageAt === null && hasLink) {
        showNotice('サムネイル画像をアップロードしましたが、サイトの自動生成画像に置き換えられる可能性があります。しばらくしてからイベントページを確認してください。', 'error');
      } else {
        showNotice('サムネイル画像をアップロードしました。');
        if (location.pathname.match(/^\/events\/\d+\/?$/)) setTimeout(() => location.reload(), 1500);
      }
      return;
    }
    // 没找到对应活动时保留任务：用户打开新活动页面时会再次尝试（30 分钟内）
  }

  let placePicker = null;

  const path = location.pathname.replace(/\/$/, '');
  if (path === '/events/add/confirm') {
    initConfirmBackButton();
    initConfirmImage();
  } else if (path === '/events/add') {
    initMinuteOptions(); // 要在恢复快照之前，否则非 5 分钟的值无法恢复
    initActorSorting();
    initActorPresets();
    placePicker = initPlacePicker(); // 同样要在恢复快照之前
    initFormSnapshot();
    // ?from_event_id=… 复制登录时页面会预先指定会场
    if (placePicker) placePicker.loadInitial(new URLSearchParams(location.search).get('from_event_id'));
    initSmartTime(); // 在恢复快照之后，从下拉框读取恢复后的值
    initImagePicker();
  } else if (/^\/events\/\d+\/edit$/.test(path)) {
    initMinuteOptions();
    initActorSorting();
    initActorPresets();
    placePicker = initPlacePicker();
    if (placePicker) placePicker.loadInitial(path.split('/')[2]);
    const refreshTime = initSmartTime();
    restoreEditMinutes(path.split('/')[2]).then(refreshTime);
    initEditImagePicker();
  } else {
    processPendingUpload();
  }
  console.log('[EN Enhancer] loaded');
})();
