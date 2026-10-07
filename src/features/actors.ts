import { byId, page } from '../lib/page';
import { load, save, type Actor, type ActorPreset } from '../lib/storage';

const actorId = (li: Element) => li.id.replace(/^actor_/, '');

// 页面用全局数组 selected_actors 保存顺序，并在增删时据此重写 #actor_ids，
// 所以调整 DOM 顺序后必须同步这个数组，否则删除某人时顺序会被还原
const syncActorOrder = () => {
  const list = byId('selected_actors');
  const hidden = byId<HTMLInputElement>('actor_ids');
  if (!list || !hidden) return;
  const ids = [...list.children].map(actorId);
  const arr = page.selected_actors;
  if (arr) {
    // 保留数组里原有的值（页面里混有字符串和数字两种 id）
    const ordered = ids.map((id) => arr.find((v) => String(v) === id) ?? id);
    arr.splice(0, arr.length, ...ordered);
  }
  hidden.value = ids.join(',');
};

// 按显示顺序读取已选出演者（li = 名字文本节点 + <a>[削除]，排序控件加上后名字在 .ene-name 里）
export const readSelectedActors = (): Actor[] =>
  [...(byId('selected_actors')?.children ?? [])].map((li) => {
    const name = li.querySelector('.ene-name')?.textContent
      ?? [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('');
    return { id: actorId(li), name: name.trim() };
  });

// 页面的 addActor 去重时区分字符串和数字，这里按 DOM 判断是否已添加
export const addActorIfMissing = (actor: Actor) => {
  if (!byId('actor_' + actor.id)) page.addActor(String(actor.id), actor.name);
};

const control = (text: string, title: string, className: string) => {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  el.title = title;
  return el;
};

// 已选出演者列表：拖动 ☰ / ▲▼ 排序，复选框（Shift+点击选范围）选中多人后一起移动、拖动或删除
export const initActorList = () => {
  const list = byId('selected_actors');
  if (!list || !byId('actor_ids')) return;

  const rows = () => [...list.children] as HTMLElement[];
  const isSelected = (li: Element) => li.classList.contains('ene-selected');
  const selected = () => rows().filter(isSelected);

  const tools = document.createElement('div');
  tools.className = 'ene-actor-tools';
  tools.innerHTML = `
    <label><input type="checkbox"> <span></span></label>
    <span>
      <input type="button" class="btn btn-small" value="▲" title="選択した出演者を上へ">
      <input type="button" class="btn btn-small" value="▼" title="選択した出演者を下へ">
      <input type="button" class="btn btn-small" value="削除">
    </span>
  `;
  list.before(tools);
  const [all, upBtn, downBtn, deleteBtn] = tools.querySelectorAll('input');
  const label = tools.querySelector('label span')!;
  const actions = tools.querySelector<HTMLElement>(':scope > span')!;

  const update = () => {
    const n = selected().length;
    const total = rows().length;
    tools.style.display = total ? '' : 'none';
    all.checked = n > 0 && n === total;
    all.indeterminate = n > 0 && n < total;
    label.textContent = n ? `${n}名選択中` : 'すべて選択';
    actions.style.visibility = n ? '' : 'hidden'; // 只隐藏不移除，保持工具栏高度不变
  };

  const select = (li: Element, on: boolean) => {
    li.classList.toggle('ene-selected', on);
    li.querySelector<HTMLInputElement>('.ene-check')!.checked = on;
  };

  // 单个移动；选中的多人则作为一组移动（被前面也选中的人挡住时不动，保持相对顺序）
  const move = (targets: Element[], delta: -1 | 1) => {
    if (delta < 0) {
      for (const li of targets) {
        const prev = li.previousElementSibling;
        if (prev && !targets.includes(prev)) prev.before(li);
      }
    } else {
      for (const li of [...targets].reverse()) {
        const next = li.nextElementSibling;
        if (next && !targets.includes(next)) next.after(li);
      }
    }
    syncActorOrder();
  };

  const decorate = (li: HTMLElement) => {
    if (li.classList.contains('ene-actor')) return;
    li.classList.add('ene-actor');
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'ene-check' });
    const name = document.createElement('span');
    name.className = 'ene-name';
    name.append(...[...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE));
    const up = control('▲', '上へ', 'ene-move');
    const down = control('▼', '下へ', 'ene-move');
    up.addEventListener('click', () => move([li], -1));
    down.addEventListener('click', () => move([li], 1));
    // 只有 ☰ 能拖动，名字可以正常选中复制
    const handle = control('☰', 'ドラッグで並び替え', 'ene-handle');
    handle.draggable = true;
    li.prepend(check, handle, name, up, down);
  };

  // 点复选框切换选中；Shift+点击把上次点的行到这一行都选中
  let anchor: Element | null = null;
  list.addEventListener('click', (e) => {
    const check = e.target as HTMLInputElement;
    const li = check.classList.contains('ene-check') ? check.closest<HTMLElement>('li.ene-actor') : null;
    if (!li) return;
    const on = check.checked; // 复选框的 checked 在 click 事件前就已切换
    if (e.shiftKey && anchor?.parentElement === list) {
      const r = rows();
      const [from, to] = [r.indexOf(anchor as HTMLElement), r.indexOf(li)].sort((a, b) => a - b);
      r.slice(from, to + 1).forEach((x) => select(x, true));
    } else {
      select(li, on);
    }
    anchor = li;
    update();
  });

  all.addEventListener('change', () => {
    rows().forEach((li) => select(li, all.checked));
    update();
  });
  upBtn.addEventListener('click', () => move(selected(), -1));
  downBtn.addEventListener('click', () => move(selected(), 1));
  deleteBtn.addEventListener('click', () => {
    const targets = selected();
    if (targets.length > 1 && !confirm(`選択した${targets.length}名を削除しますか？`)) return;
    targets.forEach((li) => page.removeActor(actorId(li)));
  });

  // 拖动：拖的是选中的行时，所有选中的行作为一组一起移动
  let group: HTMLElement[] = [];
  const actorAt = (e: Event) => (e.target as Element).closest?.<HTMLElement>('li.ene-actor') ?? null;

  list.addEventListener('dragstart', (e) => {
    const li = actorAt(e);
    if (!li) return;
    group = isSelected(li) ? selected() : [li];
    group.forEach((x) => x.classList.add('ene-dragging'));
    e.dataTransfer!.setDragImage(li, 0, 0); // 拖的是 ☰，预览显示整行
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', li.id); // Firefox 需要设置数据才能拖动
  });
  list.addEventListener('dragover', (e) => {
    if (!group.length) return;
    e.preventDefault();
    const over = actorAt(e);
    if (!over || group.includes(over)) return;
    const rect = over.getBoundingClientRect();
    if (e.clientY > rect.top + rect.height / 2) over.after(...group);
    else over.before(...group);
  });
  list.addEventListener('drop', (e) => {
    if (group.length) e.preventDefault();
  });
  list.addEventListener('dragend', () => {
    if (!group.length) return;
    group.forEach((x) => x.classList.remove('ene-dragging'));
    group = [];
    syncActorOrder();
  });

  // 出演者由页面脚本动态添加 / 删除，新加入的 li 在这里补上控件
  const refresh = () => {
    rows().forEach(decorate);
    update();
  };
  new MutationObserver(refresh).observe(list, { childList: true });
  refresh();
};

// ---- 出演者セット：把已选的出演者（如团体 + 全体成员）存成组合，之后一键全部添加 ----

// 从没保存过セット时显示的示例，让用户知道怎么用。删光セット后存的是空数组，不会再出现
const defaultPresets = (): ActorPreset[] => [{
  name: '前橋ウィッチーズ',
  actors: [
    { id: '80126', name: '前橋ウィッチーズ' },
    { id: '63283', name: '春日さくら' },
    { id: '80112', name: '咲川ひなの' },
    { id: '80113', name: '本村玲奈' },
    { id: '65986', name: '三波春香' },
    { id: '69358', name: '百瀬帆南' },
  ],
}];

const loadPresets = () => load('actorPresets', defaultPresets());

// 列表里已有セット的第一项（通常是团体名）时，新成员插在它后面（以及紧随其后的已有成员之后），
// 而不是排到末尾；否则按顺序追加
const addPreset = (actors: Actor[]) => {
  const anchor = actors.length ? byId('actor_' + actors[0].id) : null;
  if (!anchor) {
    actors.forEach(addActorIfMissing);
    return;
  }
  const memberIds = new Set(actors.map((a) => 'actor_' + a.id));
  let cursor: Element = anchor;
  while (cursor.nextElementSibling && memberIds.has(cursor.nextElementSibling.id)) {
    cursor = cursor.nextElementSibling;
  }
  for (const actor of actors.slice(1)) {
    if (byId('actor_' + actor.id)) continue;
    addActorIfMissing(actor);
    const li = byId('actor_' + actor.id);
    if (!li) continue;
    cursor.after(li);
    cursor = li;
  }
  syncActorOrder();
};

export const initActorPresets = () => {
  const list = byId('selected_actors');
  if (!list || typeof page.addActor !== 'function') return;

  const box = document.createElement('p');
  box.className = 'ene-presets';
  box.innerHTML = `
    <select></select>
    <input type="button" class="btn" value="セットを追加する">
    <input type="button" class="btn" value="選択中の出演者をセットに保存">
    <input type="button" class="btn" value="セットを削除">
  `;
  list.after(box);
  const select = box.querySelector('select')!;
  const [addBtn, saveBtn, deleteBtn] = box.querySelectorAll('input');

  const render = (selectedName?: string) => {
    const presets = loadPresets();
    select.replaceChildren(
      new Option(presets.length ? '出演者セットを選んでください' : '（保存済みのセットはありません）', ''),
      ...presets.map((p, i) => new Option(`${p.name}（${p.actors.length}名）`, String(i), false, p.name === selectedName)),
    );
  };

  addBtn.addEventListener('click', () => {
    const preset = loadPresets()[Number(select.value)];
    if (select.value && preset) addPreset(preset.actors);
  });

  saveBtn.addEventListener('click', () => {
    const actors = readSelectedActors();
    if (!actors.length) {
      alert('出演者を追加してから保存してください');
      return;
    }
    const name = (prompt('セット名', actors[0].name) ?? '').trim();
    if (!name) return;
    const presets = loadPresets();
    const existing = presets.find((p) => p.name === name);
    if (existing) {
      if (!confirm(`セット「${name}」は既に存在します。上書きしますか？`)) return;
      existing.actors = actors;
    } else {
      presets.push({ name, actors });
    }
    save('actorPresets', presets);
    render(name);
  });

  deleteBtn.addEventListener('click', () => {
    const presets = loadPresets();
    const preset = presets[Number(select.value)];
    if (!select.value || !preset) return;
    if (!confirm(`セット「${preset.name}」を削除しますか？`)) return;
    presets.splice(Number(select.value), 1);
    save('actorPresets', presets);
    render();
  });

  render();
};
