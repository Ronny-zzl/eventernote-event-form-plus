import { expect, test } from 'vitest';
import { findActorBlock, findHashtags, findVenue, venueQueries } from '../src/features/announceParse';

test('会場：同じ行・次の行・括弧の見出し、本文中の「会場」は無視', () => {
  expect(findVenue('日時：9/5\n会場：Zepp Haneda(TOKYO)\n料金：…')).toBe('Zepp Haneda(TOKYO)');
  expect(findVenue('【会場】\n下北沢ADRIFT\n')).toBe('下北沢ADRIFT');
  expect(findVenue('■場所\n\n渋谷WWW')).toBe('渋谷WWW');
  expect(findVenue('※会場内にロッカーはありません\n配布場所：受付')).toBeNull();
});

test('会場の検索語：地域・＠・URL・括弧・階数を外した候補', () => {
  expect(venueQueries('東京都　タワーレコード渋谷店 B1F CUTUP STUDIO')).toEqual(['タワーレコード渋谷店 B1F CUTUP STUDIO', 'タワーレコード渋谷店']);
  expect(venueQueries('[石川]　金沢AZ')[0]).toBe('金沢AZ');
  expect(venueQueries('東京 | ユナイテッド・シネマ アクアシティお台場（https://www.unitedcinemas.jp/）')[0])
    .toBe('ユナイテッド・シネマ アクアシティお台場');
  expect(venueQueries('＠ANTHEM AKIBA')[0]).toBe('ANTHEM AKIBA');
  expect(venueQueries('AKIHABARAゲーマーズ本店6Fイベントスペース')).toContain('AKIHABARAゲーマーズ本店6Fイベントスペース');
});

test('出演者：見出しの後ろから次の項目・空行まで', () => {
  const text = '日程：2026年9月3日\n出演者：シオリベル、YumeLia\n入場順:整理番号順\n注意事項\n・柵に登る行為は禁止です';
  expect(findActorBlock(text)).toBe('シオリベル、YumeLia');
  expect(findActorBlock('【出演】\n\nA\nB / C\n\n【チケット】\n…')).toBe('A\nB / C');
  // 「Cast」の次の行がまた「出演」
  expect(findActorBlock('Cast\n出演\nオクイシュージ\n松本亮')).toBe('オクイシュージ\n松本亮');
  // 末尾のハッシュタグの行で終わる（見出しと同じ行のハッシュタグは名前）
  expect(findActorBlock('出演：りりあ。\n#りりあ #LOVECHANT')).toBe('りりあ。');
  expect(findActorBlock('出演アーティスト：#ChouCho、#佐咲紗花')).toBe('ChouCho、佐咲紗花');
  // 本文中の「出演者には…」は見出しではない
  expect(findActorBlock('出演者には、旧知のオクイシュージ…')).toBeNull();
});

test('出演者：役名・MC・さん・@・#・部の表記を外し、区切りを揃える', () => {
  expect(findActorBlock('出演\n赤城ユイナ役：春日さくら\nGuest MC：進藤あまね\n亜咲花さん（アニソンシンガー）\n小明 @akarusan\n#ChouCho\n伊藤彩沙 （第1部）'))
    .toBe('春日さくら\n進藤あまね\n亜咲花（アニソンシンガー）\n小明\nChouCho\n伊藤彩沙');
  // 全角スペース、スペースなしの「/」が 2 つ以上、3 つ以上の「・」は区切り
  expect(findActorBlock('出演：\nきみはれ。　Cronne*\nHIBANA/フルコース/FULIT BOX\n青木陽菜・夢限大みゅーたいぷ・RealRomantic'))
    .toBe('きみはれ。\nCronne*\nHIBANA\nフルコース\nFULIT BOX\n青木陽菜\n夢限大みゅーたいぷ\nRealRomantic');
  // 1 つの名前かもしれないものは分けない
  expect(findActorBlock('出演：マジカル・パンチライン\nM・A・O\nLilyS/ash')).toBe('マジカル・パンチライン\nM・A・O\nLilyS/ash');
  // 公演日・会場の行、50音順の注記は除く
  expect(findActorBlock('出演:\n9月5日(土) Zepp Osaka Bayside公演\n青木陽菜\n(50音順)もっと見る')).toBe('青木陽菜');
});

test('ハッシュタグ：URL 中の # や数字だけのものは除く', () => {
  expect(findHashtags('#りりあ。の側に。 ＃LOVECHANT\nhttps://example.com/#top\n#2026')).toEqual(['りりあ', 'LOVECHANT']);
});
