import { byId } from '../lib/page';
import { duplicateProblems } from './duplicateCheck';
import { editChanges } from './editConfirm';

// 提交前检查：活动名、出演者、会场是否填了，搜索框里是否留着没选中的文字，是否可能重复登录。
// 服务器要求哪些必填项没有确认过，所以只提示，用户确认后仍可提交。
// 编辑页（没有确认页）每次都确认，并列出和原来相比改了什么
export const initSubmitCheck = () => {
  const form = byId<HTMLFormElement>('event_form');
  if (!form) return;

  const searchInput = (anchorId: string) =>
    byId(anchorId)?.closest('td')?.querySelector<HTMLInputElement>('.ene-search input[type="text"]') ?? null;

  // capture 阶段注册在时间检查之后：时间格式错误时那边先拦下
  form.addEventListener('submit', (e) => {
    const problems: [message: string, focus: HTMLElement | null][] = [];
    const name = form.elements.namedItem('event_name') as HTMLInputElement;
    if (!name.value.trim()) problems.push(['イベント名が入力されていません', name]);

    const actorSearch = searchInput('selected_actors');
    // 出演者搜索选中后会保留搜索词以便连续添加，用这个词选过的就不算残留
    if (actorSearch?.value.trim() && !actorSearch.dataset.picked) {
      problems.push([`出演者の検索欄に「${actorSearch.value.trim()}」が残っています（まだ追加されていません）`, actorSearch]);
    } else if (!byId<HTMLInputElement>('actor_ids')?.value) {
      problems.push(['出演者が選択されていません', actorSearch]);
    }

    const placeSearch = searchInput('places_list');
    if (placeSearch?.value.trim()) {
      problems.push([`会場の検索欄に「${placeSearch.value.trim()}」が残っています（まだ選択されていません）`, placeSearch]);
    } else if (!byId<HTMLSelectElement>('places_list')?.value) {
      problems.push(['開催場所が選択されていません', placeSearch]);
    }

    const duplicateBox = form.querySelector<HTMLElement>('.ene-duplicate');
    for (const message of duplicateProblems()) problems.push([message, duplicateBox]);

    const changes = editChanges();
    if (!problems.length && !changes) return;
    const sections = problems.length ? [problems.map(([m]) => '・' + m).join('\n')] : [];
    if (changes) sections.push(changes.length ? `変更内容：\n${changes.map((c) => '・' + c).join('\n')}` : '変更はありません。');
    sections.push(problems.length ? 'このまま送信しますか？' : 'この内容で保存しますか？');
    if (confirm(sections.join('\n\n'))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = problems[0]?.[1];
    target?.scrollIntoView({ block: 'center' });
    target?.focus();
  }, true);
};
