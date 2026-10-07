import { eventInfoCell } from '../lib/eventPage';
import { byId, findInitialPlace } from '../lib/page';
import { load, save, type Place } from '../lib/storage';
import { CLOSED_RE, rankPlaces, type ApiPlace } from './placeRank';

// 原 UI 是「都道府県 → 该县全部会场的下拉框」，东京都有 6000 多个会场（约 370KB，加载数秒），
// 且按 ID 排序，几乎无法使用。这里改成一个搜索框（/api/places/search?keyword=…）。
// 原控件隐藏但保留：#places_list 里只放选中的那一项，#prefecture_id 同步为该会场的都道府県，提交格式不变。

const RECENT_MAX = 10;

const toPlace = (p: ApiPlace): Place => ({
  id: String(p.id),
  name: p.place_name,
  prefecture: String(p.prefecture ?? ''),
  address: p.address ?? '',
});

const searchPlaces = async (keyword: string, prefecture = ''): Promise<ApiPlace[]> => {
  const params = new URLSearchParams({ keyword, simple: '3', limit: '50' });
  if (prefecture) params.set('prefecture', prefecture);
  const res = await fetch('/api/places/search?' + params, { credentials: 'same-origin' });
  return (await res.json()).results ?? [];
};

export type PlacePicker = {
  set: (place: Place | null) => void;
  loadInitial: (eventId: string | null) => Promise<void>;
};

export const initPlacePicker = (): PlacePicker | null => {
  const select = byId<HTMLSelectElement>('places_list');
  const prefSelect = byId<HTMLSelectElement>('prefecture_id');
  if (!select || !prefSelect) return null;
  const cell = select.closest('td')!;

  // 都道府県名：取原下拉框的文字，去掉「 (538)」之类的件数
  const prefNames = new Map(
    [...prefSelect.options].filter((o) => o.value).map((o) => [o.value, o.text.replace(/\s*\(\d+\)\s*$/, '').trim()]),
  );
  const placeSub = (p: Place) => [prefNames.get(p.prefecture), p.address].filter(Boolean).join(' / ');

  // 原控件收起来（「→上記のリストに無い会場を登録」链接保留）
  for (const el of [prefSelect, select, byId('places_suggest'), cell.querySelector('.gb_suggest')]) {
    const target = el?.closest('p') ?? el;
    if (target instanceof HTMLElement) target.style.display = 'none';
  }

  const box = document.createElement('div');
  box.className = 'ene-place';
  box.innerHTML = `
    <div class="ene-place-current" style="display:none">
      <span class="ene-place-name"></span><span class="ene-place-sub"></span>
      <input type="button" class="btn btn-small" value="取り消す">
    </div>
    <div class="ene-place-search">
      <select></select>
      <input type="text" placeholder="会場名・住所で検索（例: Zepp、武道館、渋谷）" autocomplete="off">
    </div>
    <ul class="ene-place-results" style="display:none"></ul>
  `;
  cell.prepend(box);
  const current = box.querySelector<HTMLElement>('.ene-place-current')!;
  const input = box.querySelector<HTMLInputElement>('.ene-place-search input')!;
  const prefFilter = box.querySelector<HTMLSelectElement>('.ene-place-search select')!;
  const results = box.querySelector<HTMLElement>('.ene-place-results')!;
  prefFilter.append(new Option('全国', ''), ...[...prefNames].map(([value, name]) => new Option(name, value)));

  let chosen: Place | null = null;

  // 把选择写回隐藏的原控件
  const applyToForm = () => {
    if (!chosen) {
      if (select.value || select.options.length !== 1) select.replaceChildren(new Option('選択してください', ''));
      return;
    }
    if (select.options.length === 1 && select.value === chosen.id && select.options[0].text === chosen.name) return;
    select.replaceChildren(new Option(chosen.name, chosen.id, true, true));
    if (prefNames.has(chosen.prefecture)) prefSelect.value = chosen.prefecture;
  };

  // 编辑页的 searchPlaces 加载完 6000 多项后会清空下拉框重建，发现选择被改掉（包括用户取消选择后）就改回来，
  // 顺便丢掉那 6000 多个 option
  new MutationObserver(() => {
    if (select.options.length !== 1 || select.value !== (chosen?.id ?? '')) applyToForm();
  }).observe(select, { childList: true });

  const set = (place: Place | null, remember = false) => {
    chosen = place;
    applyToForm();
    current.style.display = place ? '' : 'none';
    if (!place) return;
    current.querySelector('.ene-place-name')!.textContent = place.name;
    current.querySelector('.ene-place-sub')!.textContent = placeSub(place);
    if (remember) {
      save('recentPlaces', [place, ...load('recentPlaces', []).filter((p) => p.id !== place.id)].slice(0, RECENT_MAX));
    }
  };

  current.querySelector('input')!.addEventListener('click', () => {
    set(null);
    input.focus();
  });

  // ---- 搜索结果列表 ----
  let items: { li: HTMLLIElement; place: Place }[] = [];
  let active = -1;

  const closeResults = () => {
    results.style.display = 'none';
    items = [];
    active = -1;
  };

  const heading = (text: string) => Object.assign(document.createElement('li'), { className: 'ene-heading', textContent: text });

  const showResults = (places: Place[], head: string | null, emptyText = '') => {
    items = places.map((place) => {
      const li = document.createElement('li');
      if (CLOSED_RE.test(place.name)) li.className = 'ene-closed';
      li.append(place.name, Object.assign(document.createElement('span'), { className: 'ene-place-sub', textContent: placeSub(place) }));
      // mousedown 先于输入框的 blur，避免列表先被关掉
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        choose(place);
      });
      return { li, place };
    });
    active = -1;
    results.replaceChildren(
      ...(head ? [heading(head)] : []),
      ...(places.length ? items.map((it) => it.li) : [heading(emptyText)]),
    );
    results.style.display = '';
  };

  const setActive = (index: number) => {
    if (!items.length) return;
    active = (index + items.length) % items.length;
    items.forEach((it, i) => it.li.classList.toggle('ene-active', i === active));
    items[active].li.scrollIntoView({ block: 'nearest' });
  };

  const choose = (place: Place) => {
    set(place, true);
    input.value = '';
    closeResults();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;

  const search = async () => {
    const keyword = input.value.trim();
    if (!keyword) {
      const recent = load('recentPlaces', []);
      if (recent.length) showResults(recent, '最近使った会場');
      else closeResults();
      return;
    }
    const mySeq = ++seq;
    try {
      const places = rankPlaces(await searchPlaces(keyword, prefFilter.value), keyword).slice(0, 30);
      // 已有更新的搜索，或焦点已离开
      if (mySeq === seq && document.activeElement === input) showResults(places.map(toPlace), null, '見つかりませんでした');
    } catch {
      if (mySeq === seq) showResults([], null, '検索に失敗しました');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(search, 300);
  });
  input.addEventListener('focus', search);
  input.addEventListener('blur', () => setTimeout(closeResults, 100));
  prefFilter.addEventListener('change', () => {
    if (!input.value.trim()) return;
    input.focus();
    search();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // 文本框里按 Enter 会直接提交表单
      const item = items[active] ?? (items.length === 1 ? items[0] : null);
      if (item) choose(item.place);
    } else if (e.key === 'Escape') {
      closeResults();
    }
  });

  // 页面加载时已指定的会场（编辑页、from_event_id）：不等 6000 多项的列表，
  // 先从活动页「開催場所」读出会场名，再用搜索 API 补全地址
  const initial = findInitialPlace();
  const loadInitial = async (eventId: string | null) => {
    if (!initial || chosen) return;
    const base = { id: initial.id, prefecture: initial.prefecture, address: '' };
    const stillInitial = () => chosen?.id === initial.id; // 加载期间用户可能已选了别的会场
    set({ ...base, name: '読み込み中…' });
    const cell = eventId ? await eventInfoCell(eventId, '開催場所') : null;
    const name = cell?.querySelector(`a[href$="/places/${initial.id}"]`)?.textContent?.trim();
    if (!stillInitial()) return;
    set({ ...base, name: name || `会場ID ${initial.id}` });
    if (!name) return;
    try {
      const found = (await searchPlaces(name, initial.prefecture)).find((p) => String(p.id) === initial.id);
      if (found && stillInitial()) set(toPlace(found));
    } catch {
      // 地址只是补充信息，取不到就算了
    }
  };

  return { set, loadInitial };
};
