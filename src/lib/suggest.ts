import { sleep } from './page';

export type SuggestItem<T> = {
  value: T;
  title: string;
  sub?: string;
  dim?: boolean; // 闭馆的会场等，变灰
  done?: boolean; // 已添加，不能再选
};

type SuggestOptions<T> = {
  input: HTMLInputElement;
  list: HTMLElement;
  // keyword 非空时调用；signal 在有更新的输入时中止
  search: (keyword: string, signal: AbortSignal) => Promise<SuggestItem<T>[]>;
  // 输入框为空时显示的内容（最近使った…）
  idle: () => { heading: string; items: SuggestItem<T>[] } | null;
  choose: (value: T) => void;
  keepOpen?: boolean; // 选中后不关闭列表，标为「追加済み」（出演者可以连续添加）
  emptyText: string;
};

// 输入即搜索的下拉候选列表：300ms 防抖、↑↓ + Enter、Esc 关闭；会场和出演者共用
export const createSuggest = <T>({ input, list, search, idle, choose, keepOpen, emptyText }: SuggestOptions<T>) => {
  let items: { li: HTMLLIElement; item: SuggestItem<T> }[] = [];
  let active = -1;
  let controller: AbortController | undefined;

  const heading = (text: string) => Object.assign(document.createElement('li'), { className: 'ene-heading', textContent: text });

  const close = () => {
    list.style.display = 'none';
    items = [];
    active = -1;
  };

  const pick = (entry: (typeof items)[number]) => {
    if (entry.item.done) return;
    choose(entry.item.value);
    if (!keepOpen) {
      input.value = '';
      close();
      return;
    }
    entry.item.done = true;
    entry.li.classList.add('ene-done');
  };

  const show = (entries: SuggestItem<T>[], head?: string, empty = emptyText) => {
    items = entries.map((item) => {
      const li = document.createElement('li');
      li.classList.toggle('ene-dim', !!item.dim);
      li.classList.toggle('ene-done', !!item.done);
      li.append(item.title, Object.assign(document.createElement('span'), { className: 'ene-suggest-sub', textContent: item.sub ?? '' }));
      return { li, item };
    });
    // mousedown 先于输入框的 blur，避免列表先被关掉
    items.forEach((entry) => entry.li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      pick(entry);
    }));
    active = -1;
    list.replaceChildren(...(head ? [heading(head)] : []), ...(items.length ? items.map((it) => it.li) : [heading(empty)]));
    list.style.display = '';
  };

  const setActive = (index: number) => {
    if (!items.length) return;
    active = (index + items.length) % items.length;
    items.forEach((it, i) => it.li.classList.toggle('ene-active', i === active));
    items[active].li.scrollIntoView({ block: 'nearest' });
  };

  const run = async () => {
    controller?.abort();
    const keyword = input.value.trim();
    if (!keyword) {
      const content = idle();
      if (content?.items.length) show(content.items, content.heading);
      else close();
      return;
    }
    const mine = (controller = new AbortController());
    await sleep(300); // 防抖：300ms 内又有输入时，这次在下面被判定为过期
    if (mine.signal.aborted) return;
    if (list.style.display === 'none' || !items.length) show([], undefined, '検索中…');
    try {
      const found = await search(keyword, mine.signal);
      if (!mine.signal.aborted && document.activeElement === input) show(found);
    } catch {
      if (!mine.signal.aborted) show([], undefined, '検索に失敗しました');
    }
  };

  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('blur', () => {
    controller?.abort();
    setTimeout(close, 100);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // 文本框里按 Enter 会直接提交表单
      const entry = items[active] ?? (items.length === 1 ? items[0] : undefined);
      if (entry) pick(entry);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  close();
  return { run };
};
