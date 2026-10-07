import { byId, page } from '../lib/page';
import { load, save, type Actor } from '../lib/storage';
import { createSuggest } from '../lib/suggest';
import { addActorIfMissing } from './actors';
import { rankActors, type ApiActor } from './actorRank';

// 原 UI 的「頭文字 → 该头文字全部出演者的下拉框」：「あ」就有 6000 多人（约 2MB，十几秒），几乎无法使用。
// 改成一个搜索框（/api/actors/search?keyword=…），选中的人用页面自己的 addActor 加入，提交格式不变。
// 这个 API 每次要几秒，所以显示「検索中…」并缓存结果；选中后列表不关闭，可以连续添加（如团体 + 成员）

const RECENT_MAX = 20;
const cache = new Map<string, Promise<ApiActor[]>>();

// 不传 signal：即使输入已经变了也让请求完成，结果留在缓存里（删字改回来时立即显示）
const searchActors = (keyword: string) => {
  let result = cache.get(keyword);
  if (!result) {
    const params = new URLSearchParams({ keyword, simple: '3', limit: '50' });
    result = fetch('/api/actors/search?' + params, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => (data.results ?? []) as ApiActor[]);
    result.catch(() => cache.delete(keyword));
    cache.set(keyword, result);
  }
  return result;
};

export const initActorSearch = () => {
  const list = byId('selected_actors');
  const initial = byId('actors_initial');
  if (!list || !initial || typeof page.addActor !== 'function') return;
  const cell = list.closest('td')!;

  // 原控件收起来（「→上記のリストに無い声優/アーティストを登録する」链接保留）
  for (const el of [initial, byId('actors_list'), byId('actors_suggest'), cell.querySelector('.gb_suggest')]) {
    const target = el?.closest('p') ?? el;
    if (target instanceof HTMLElement) target.style.display = 'none';
  }

  const box = document.createElement('div');
  box.className = 'ene-search';
  box.innerHTML = `
    <div class="ene-search-row">
      <input type="text" placeholder="名前・よみがなで検索して追加（例: 水樹奈々、みずきなな）" autocomplete="off">
    </div>
    <ul class="ene-suggest"></ul>
  `;
  list.after(box); // 已选列表下方、出演者セット上方

  const added = (id: string | number) => !!byId(`actor_${id}`);
  const toItem = (actor: Actor, sub = '') => ({ value: actor, title: actor.name, sub, done: added(actor.id) });

  createSuggest({
    input: box.querySelector('input')!,
    list: box.querySelector('.ene-suggest')!,
    search: async (keyword) =>
      rankActors(await searchActors(keyword), keyword).slice(0, 30).map((a) =>
        toItem({ id: String(a.id), name: a.name }, [a.kana, a.favorite_count ? `♡${a.favorite_count}` : ''].filter(Boolean).join(' · '))),
    idle: () => ({ heading: '最近追加した出演者', items: load('recentActors', []).map((a) => toItem(a)) }),
    choose: (actor) => {
      addActorIfMissing(actor);
      save('recentActors', [actor, ...load('recentActors', []).filter((a) => a.id !== actor.id)].slice(0, RECENT_MAX));
    },
    keepOpen: true,
    emptyText: '見つかりませんでした',
  });
};
