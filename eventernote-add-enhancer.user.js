// ==UserScript==
// @name         Eventernote イベント登録エンハンサー
// @name:ja      Eventernote イベント登録エンハンサー
// @name:zh-CN   Eventernote 活动登录增强
// @name:en      Eventernote Add Event Enhancer
// @namespace    https://github.com/Ronny-zzl/eventernote-enhancer
// @version      0.1.0
// @description  イベンターノートのイベント登録・編集画面を使いやすくします：出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:ja イベンターノートのイベント登録・編集画面を使いやすくします：出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:zh-CN 改善 Eventernote 活动登录和编辑页面：出演者排序、出演者组合、从确认页返回修改、添加缩略图
// @description:en Improves the Eventernote event add/edit forms: reorder performers, performer sets, back button on the confirm page, thumbnail images
// @author       Ronny-zzl
// @license      MIT
// @homepageURL  https://github.com/Ronny-zzl/eventernote-enhancer
// @supportURL   https://github.com/Ronny-zzl/eventernote-enhancer/issues
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

    function actorId(li) {
      return li.id.replace(/^actor_/, '');
    }

    function syncOrder() {
      const ids = Array.from(list.children).map(actorId);
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
      preset.actors.forEach(addActorIfMissing);
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
    if (snapshot.prefecture) {
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

  function imageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url + '?t=' + Date.now();
    });
  }

  async function processPendingUpload() {
    const pending = GM_getValue(PENDING_UPLOAD_KEY, null);
    if (!pending) return;
    if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
      GM_setValue(PENDING_UPLOAD_KEY, null);
      return;
    }
    if (pending.uploadingAt && Date.now() - pending.uploadingAt < 60 * 1000) return; // 其他标签页正在处理

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

      if (await imageExists(S3_EVENT_IMAGE + id + '_s.jpg')) {
        showNotice('サムネイル画像をアップロードしました。');
        if (location.pathname.match(/^\/events\/\d+\/?$/)) setTimeout(() => location.reload(), 1500);
      } else {
        showNotice('画像を送信しましたが、反映を確認できませんでした。しばらくしてからイベントページを確認してください。', 'error');
      }
      return;
    }
    // 没找到对应活动时保留任务：用户打开新活动页面时会再次尝试（30 分钟内）
  }

  const path = location.pathname.replace(/\/$/, '');
  if (path === '/events/add/confirm') {
    initConfirmBackButton();
    initConfirmImage();
  } else if (path === '/events/add') {
    initActorSorting();
    initActorPresets();
    initFormSnapshot();
    initImagePicker();
  } else if (/^\/events\/\d+\/edit$/.test(path)) {
    initEditImagePicker();
  } else {
    processPendingUpload();
  }
  console.log('[EN Enhancer] loaded');
})();
