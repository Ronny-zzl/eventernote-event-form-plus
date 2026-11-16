import { expect, test } from 'vitest';
import { formatPresets, mergePresets, parsePresets } from '../src/features/presetText';

const witches = {
  name: '前橋ウィッチーズ',
  actors: [{ id: '80126', name: '前橋ウィッチーズ' }, { id: '63283', name: '春日さくら' }],
};
const other = { name: '#ハッシュ', actors: [{ id: '1', name: '#から始まる名前' }] };

test('書き出した文字列を読み込むと元に戻る', () => {
  const text = formatPresets([witches, other]);
  expect(text).toBe('# 前橋ウィッチーズ\n80126 前橋ウィッチーズ\n63283 春日さくら\n\n# #ハッシュ\n1 #から始まる名前\n');
  expect(parsePresets(text)).toEqual({ presets: [witches, other], errors: [] });
});

test('全角の記号・数字、余分な空白、CRLF を許す', () => {
  const { presets, errors } = parsePresets('  ＃ 前橋ウィッチーズ\r\n８０１２６\t前橋ウィッチーズ \r\n\r\n63283   春日さくら');
  expect(errors).toEqual([]);
  expect(presets).toEqual([witches]);
});

test('読めない行の行番号を返す', () => {
  expect(parsePresets('80126 セットより前\n# セット\nメモ\n63283 春日さくら').errors).toEqual([1, 3]);
});

test('出演者のいないセットは捨て、同名セットは後のもの、重複した出演者は最初のものを使う', () => {
  const { presets } = parsePresets('# 空\n# A\n1 古い\n# A\n2 新しい\n2 重複\n');
  expect(presets).toEqual([{ name: 'A', actors: [{ id: '2', name: '新しい' }] }]);
});

test('同名は上書き、新しいものは末尾に追加、同じ内容は変更なし', () => {
  const changed = { name: '前橋ウィッチーズ', actors: [witches.actors[0]] };
  const fresh = { name: '新セット', actors: [{ id: '5', name: 'X' }] };
  const result = mergePresets([witches, other], [changed, fresh, other]);
  expect(result.presets).toEqual([changed, other, fresh]);
  expect(result.added).toEqual(['新セット']);
  expect(result.replaced).toEqual(['前橋ウィッチーズ']);
  expect(result.unchanged).toEqual(['#ハッシュ']);
});
