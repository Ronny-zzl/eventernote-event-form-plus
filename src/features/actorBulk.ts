import { showNotice } from '../lib/notice';
import { byId, page, sleep } from '../lib/page';
import { addActorIfMissing } from './actors';
import { fallbackQueries, matchActor, splitNames, type MatchStatus } from './actorMatch';
import { rankActors, type ApiActor } from './actorRank';
import { searchActors } from './actorSearch';

// 「まとめて追加」：粘贴出演者名单，逐个搜索并自动匹配，确认后一次性加入。
// 名字完全一致且只有一人的默认勾选；同名多人 / 只有候选的由用户在下拉框里选
const CONCURRENCY = 4; // 搜索 API 每次要几秒，并行但不给网站太大压力

type Status = MatchStatus | 'pending' | 'error' | 'added';
type Row = {
  name: string;
  keyword: string; // 最近一次手动搜索用的词（初始为名单原文）
  status: Status;
  candidates: ApiActor[];
  chosen: ApiActor | null;
  li: HTMLLIElement;
  check: HTMLInputElement;
};

const BADGES: Record<Status, string> = {
  pending: '検索中', exact: '一致', multiple: '同名あり', candidates: '候補のみ', none: '見つかりません', error: '失敗', added: '追加済み',
};
const NEEDS_REVIEW: Status[] = ['multiple', 'candidates', 'none', 'error'];

const actorSub = (a: ApiActor) => [a.kana, a.favorite_count ? `♡${a.favorite_count}` : ''].filter(Boolean).join(' · ');
const isAdded = (a: ApiActor) => !!byId(`actor_${a.id}`);
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: object = {}): HTMLElementTagNameMap[K] =>
  Object.assign(document.createElement(tag), props);

// 网站常有 502，失败时稍等再试一次（searchActors 失败时不缓存）
const searchWithRetry = async (keyword: string, fresh = false) => {
  try {
    return await searchActors(keyword, fresh);
  } catch {
    await sleep(1500);
    return searchActors(keyword);
  }
};

// 原文搜不到时换几种写法再搜（括号、引号、符号常让搜索落空）
const searchWithFallback = async (name: string) => {
  for (const keyword of [name, ...fallbackQueries(name)]) {
    const results = await searchWithRetry(keyword);
    if (results.length) return results;
  }
  return [];
};

export const initActorBulk = () => {
  const row = document.querySelector('#selected_actors ~ .ene-search .ene-search-row');
  if (!row || typeof page.addActor !== 'function') return;

  const modal = el('div', { className: 'ene-modal' });
  modal.innerHTML = `
    <div class="ene-modal-box" role="dialog" aria-modal="true" aria-label="出演者をまとめて追加">
      <div class="ene-modal-head">出演者をまとめて追加<span class="ene-modal-close" title="閉じる">×</span></div>
      <div class="ene-modal-body">
        <textarea rows="5" placeholder="出演者の名簿を貼り付けてください（「 / 」や改行で区切られたもの）"></textarea>
        <div class="ene-bulk-bar">
          <input type="button" class="btn btn-small" value="検索する">
          <span class="ene-bulk-summary"></span>
          <label><input type="checkbox"> 要確認のみ表示</label>
        </div>
        <ul class="ene-bulk-list"></ul>
      </div>
      <div class="ene-modal-foot">
        <input type="button" class="btn btn-small" value="閉じる">
        <input type="button" class="btn btn-small btn-primary" disabled>
      </div>
    </div>
  `;
  document.body.append(modal);
  const textarea = modal.querySelector('textarea')!;
  const [searchBtn, filter, closeBtn, addBtn] = modal.querySelectorAll<HTMLInputElement>('.ene-bulk-bar input, .ene-modal-foot input');
  const list = modal.querySelector<HTMLElement>('.ene-bulk-list')!;
  const summary = modal.querySelector<HTMLElement>('.ene-bulk-summary')!;

  let rows: Row[] = [];
  let run = 0; // 重新搜索时，旧的结果作废

  const open = () => {
    modal.classList.add('ene-open');
    if (!rows.length) textarea.focus();
  };
  const close = () => modal.classList.remove('ene-open');

  const updateSummary = () => {
    const count = (statuses: Status[]) => rows.filter((r) => statuses.includes(r.status)).length;
    const pending = count(['pending']);
    summary.textContent = rows.length
      ? `${rows.length}名${pending ? `（検索中 ${rows.length - pending} / ${rows.length}）` : ''}：一致 ${count(['exact'])}・要確認 ${count(['multiple', 'candidates', 'error'])}・見つからない ${count(['none'])}・追加済み ${count(['added'])}`
      : '';
    const checked = rows.filter((r) => r.check.checked && r.chosen).length;
    addBtn.value = `チェックした ${checked} 名を追加`;
    addBtn.disabled = !checked;
  };

  const render = (r: Row) => {
    r.li.dataset.status = r.status;
    r.li.hidden = filter.checked && !NEEDS_REVIEW.includes(r.status);
    const badge = r.li.querySelector('.ene-bulk-badge')!;
    badge.textContent = BADGES[r.status];
    const result = r.li.querySelector('.ene-bulk-result')!;
    result.replaceChildren();
    r.check.disabled = !r.chosen || r.status === 'added';

    if (r.status === 'pending') {
      result.append('検索中…');
    } else if (r.status === 'error') {
      result.append('検索に失敗しました');
    } else if (r.status === 'none') {
      result.append('見つかりませんでした ', el('a', { href: '/actors/add', target: '_blank', textContent: '→登録する' }));
    } else if (r.status === 'exact' || r.status === 'added') {
      result.append(r.chosen!.name, el('span', { className: 'ene-suggest-sub', textContent: actorSub(r.chosen!) }));
    } else {
      // 同名あり / 候補のみ：自分で選ぶ
      const select = el('select');
      select.append(new Option('選んでください', ''), ...r.candidates.map((a, i) =>
        new Option(`${a.name}${actorSub(a) ? `（${actorSub(a)}）` : ''}${isAdded(a) ? '［追加済み］' : ''}`, String(i), false, a === r.chosen)));
      select.addEventListener('change', () => {
        r.chosen = r.candidates[Number(select.value)] ?? null;
        r.check.checked = !!r.chosen && !isAdded(r.chosen);
        r.check.disabled = !r.chosen;
        updateSummary();
      });
      result.append(select);
    }

    // 要确认的行可以换个词单独搜索（不用缓存：登记了新出演者回来后也能搜到）
    if (NEEDS_REVIEW.includes(r.status)) {
      const box = el('div', { className: 'ene-bulk-research' });
      const input = el('input', { type: 'text', value: r.keyword });
      const button = el('input', { type: 'button', className: 'btn btn-small', value: '再検索' });
      const go = () => input.value.trim() && lookup(r, run, input.value.trim());
      button.addEventListener('click', go);
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        go();
      });
      box.append(input, button);
      result.append(box);
    }
    updateSummary();
  };

  // keyword：手动换词重搜时指定（不用缓存）；省略时用名单原文，搜不到再自动换写法
  const lookup = async (r: Row, myRun: number, keyword?: string) => {
    r.status = 'pending';
    if (keyword) r.keyword = keyword;
    render(r);
    try {
      const results = keyword ? await searchWithRetry(keyword, true) : await searchWithFallback(r.name);
      if (myRun !== run) return;
      const match = matchActor(r.name, results);
      // 手动换的词：候选按这个词的相关度排
      r.candidates = keyword && match.status === 'candidates' ? rankActors(results, keyword).slice(0, 5) : match.candidates;
      // 一致的直接选中；只有一个候选时也先选上（仍标为要确认）
      const only = match.status === 'candidates' && r.candidates.length === 1;
      r.chosen = match.status === 'exact' || only ? r.candidates[0] : null;
      r.status = match.status === 'exact' && isAdded(r.chosen!) ? 'added' : match.status;
      r.check.checked = !!r.chosen && r.status !== 'added' && !isAdded(r.chosen);
    } catch {
      if (myRun !== run) return;
      r.status = 'error';
    }
    render(r);
  };

  const search = async () => {
    const names = splitNames(textarea.value);
    if (!names.length) return;
    const myRun = ++run;
    rows = names.map((name) => {
      const li = el('li', { className: 'ene-bulk-row' });
      const check = el('input', { type: 'checkbox' });
      check.addEventListener('change', updateSummary);
      li.append(check, el('div', { className: 'ene-bulk-main' }), el('span', { className: 'ene-bulk-badge' }));
      li.querySelector('.ene-bulk-main')!.append(
        el('div', { className: 'ene-bulk-name', textContent: name }),
        el('div', { className: 'ene-bulk-result' }),
      );
      return { name, keyword: name, status: 'pending', candidates: [], chosen: null, li, check };
    });
    list.replaceChildren(...rows.map((r) => r.li));
    rows.forEach(render);

    let next = 0;
    const worker = async () => {
      while (next < rows.length && myRun === run) await lookup(rows[next++], myRun);
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  const addChecked = () => {
    const targets = rows.filter((r) => r.check.checked && r.chosen && r.status !== 'added');
    for (const r of targets) {
      addActorIfMissing({ id: String(r.chosen!.id), name: r.chosen!.name });
      r.status = 'added';
      r.check.checked = false;
      render(r);
    }
    close();
    showNotice(`${targets.length}名を追加しました`);
  };

  searchBtn.addEventListener('click', search);
  filter.addEventListener('change', () => rows.forEach(render));
  addBtn.addEventListener('click', addChecked);
  closeBtn.addEventListener('click', close);
  modal.querySelector('.ene-modal-close')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); }); // 点背景关闭
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('ene-open')) close(); });

  const openBtn = el('input', { type: 'button', className: 'btn ene-ctl', value: 'まとめて追加', title: '名簿を貼り付けて、まとめて検索・追加します' });
  openBtn.addEventListener('click', open);
  row.append(openBtn);
  updateSummary();
};
