import type { ActorPreset } from '../lib/storage';

// 出演者セットの書き出し・読み込み用の文字列形式（GM 存储按设备分开，用复制粘贴在电脑和手机之间同步）。
// 人也能读、能改：
//   # セット名
//   80126 前橋ウィッチーズ
//   63283 春日さくら
// 出演者行是「ID 名前」，名字可能以 # 开头，所以先判断是不是出演者行

const HEADER_RE = /^[#＃]\s*(.+)$/;
const ACTOR_RE = /^([0-9０-９]+)\s+(.+)$/;

export const formatPresets = (presets: ActorPreset[]) =>
  presets.map((p) => [`# ${p.name}`, ...p.actors.map((a) => `${a.id} ${a.name}`)].join('\n')).join('\n\n') + '\n';

// errors：读不懂的行号（从 1 开始）。同名セット后面的为准，同一セット里重复的出演者只留第一个
export const parsePresets = (text: string) => {
  const presets: ActorPreset[] = [];
  const errors: number[] = [];
  let current: ActorPreset | null = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const actor = ACTOR_RE.exec(line);
    if (actor && current) {
      const id = actor[1].normalize('NFKC');
      if (!current.actors.some((a) => a.id === id)) current.actors.push({ id, name: actor[2].trim() });
      return;
    }
    const header = actor ? null : HEADER_RE.exec(line);
    if (!header) {
      errors.push(i + 1);
      return;
    }
    const name = header[1].trim();
    const index = presets.findIndex((p) => p.name === name);
    if (index >= 0) presets.splice(index, 1);
    current = { name, actors: [] };
    presets.push(current);
  });
  return { presets: presets.filter((p) => p.actors.length), errors };
};

const sameActors = (a: ActorPreset, b: ActorPreset) =>
  a.actors.length === b.actors.length && a.actors.every((x, i) => x.id === b.actors[i].id && x.name === b.actors[i].name);

// 同名的セット原位置覆盖，新的加在末尾；内容完全相同的算作 unchanged
export const mergePresets = (existing: ActorPreset[], incoming: ActorPreset[]) => {
  const presets = existing.map((p) => ({ ...p }));
  const added: string[] = [];
  const replaced: string[] = [];
  const unchanged: string[] = [];
  for (const preset of incoming) {
    const index = presets.findIndex((p) => p.name === preset.name);
    if (index < 0) {
      presets.push(preset);
      added.push(preset.name);
    } else if (sameActors(presets[index], preset)) {
      unchanged.push(preset.name);
    } else {
      presets[index] = preset;
      replaced.push(preset.name);
    }
  }
  return { presets, added, replaced, unchanged };
};
