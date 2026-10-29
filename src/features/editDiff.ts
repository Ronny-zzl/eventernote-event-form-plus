// 编辑页：列出和原来相比改了什么（纯函数，供单元测试）
import type { Actor } from '../lib/storage';

export type EditValues = {
  eventName: string;
  date: string; // "2026/12/19"
  times: Record<'open' | 'start' | 'end', string>; // "18:00"，没填为 ""
  actors: Actor[];
  place: { id: string; name: string } | null;
  link: string;
  description: string;
  hashtag: string;
};

const TIME_NAMES = { open: '開場', start: '開演', end: '終演' } as const;
const SHOWN_NAMES = 5;

const orNone = (s: string) => s || 'なし';
const names = (actors: Actor[]) =>
  actors.slice(0, SHOWN_NAMES).map((a) => a.name).join('、') + (actors.length > SHOWN_NAMES ? ` ほか ${actors.length - SHOWN_NAMES} 名` : '');
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export const describeChanges = (before: EditValues, after: EditValues): string[] => {
  const changes: string[] = [];
  const same = (a: string, b: string) => a.trim() === b.trim();

  if (!same(before.eventName, after.eventName)) changes.push(`イベント名：${before.eventName} → ${after.eventName}`);
  if (before.date !== after.date) changes.push(`開催日：${before.date} → ${after.date}`);
  for (const key of ['open', 'start', 'end'] as const) {
    if (before.times[key] !== after.times[key]) {
      changes.push(`${TIME_NAMES[key]}：${orNone(before.times[key])} → ${orNone(after.times[key])}`);
    }
  }

  const beforeIds = before.actors.map((a) => a.id);
  const afterIds = after.actors.map((a) => a.id);
  const added = after.actors.filter((a) => !beforeIds.includes(a.id));
  const removed = before.actors.filter((a) => !afterIds.includes(a.id));
  const actorParts = [added.length && `追加 ${names(added)}`, removed.length && `削除 ${names(removed)}`].filter(Boolean);
  if (actorParts.length) changes.push(`出演者：${actorParts.join(' / ')}`);
  else if (beforeIds.join() !== afterIds.join()) changes.push('出演者：並び順を変更');

  if ((before.place?.id ?? '') !== (after.place?.id ?? '')) {
    changes.push(`開催場所：${orNone(before.place?.name ?? '')} → ${orNone(after.place?.name ?? '')}`);
  }

  const [beforeLinks, afterLinks] = [lines(before.link), lines(after.link)];
  const addedLinks = afterLinks.filter((l) => !beforeLinks.includes(l));
  const removedLinks = beforeLinks.filter((l) => !afterLinks.includes(l));
  if (addedLinks.length || removedLinks.length) {
    changes.push(['関連リンク：', ...addedLinks.map((l) => `  ＋ ${l}`), ...removedLinks.map((l) => `  － ${l}`)].join('\n'));
  } else if (beforeLinks.join() !== afterLinks.join()) {
    changes.push('関連リンク：並び順を変更');
  }

  if (!same(before.description, after.description)) changes.push('詳細：変更あり');
  if (!same(before.hashtag, after.hashtag)) changes.push(`ハッシュタグ：${orNone(before.hashtag)} → ${orNone(after.hashtag)}`);
  return changes;
};
