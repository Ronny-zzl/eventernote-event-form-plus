// 从告知文里读出演者、会场、话题标签（纯函数，供单元测试）。日期、时间见 dateParse.ts / timeParse.ts。
// 告知文的项目一般是「会場：X」「出演：A / B」，或【会場】■出演者 这样的标题加下面几行。
// 标题必须在行首（前面只能有括号、记号）：避免把「※会場内に…」「配布場所」之类的正文当成项目

const OPEN = '【\\[［〈《<＜(（■□◆◇●○◎▼▽▶▷★☆・*＊-';
const CLOSE = '】\\]］〉》>＞)）';
const labelRe = (labels: string) =>
  new RegExp(String.raw`^[\s${OPEN}]*(?:${labels})(?:[${CLOSE}]+\s*[:：]?|\s*[:：｜|]|\s+|$)\s*(.*)$`, 'i');

const VENUE = labelRe('会場|会場名|開催会場|開催場所|場所|venue|place|location');
const ACTORS = labelRe('出演者?|出演アーティスト|出演キャスト|出演予定|キャスト|cast|ゲスト|guest|line\\s*up|ラインナップ|mc|performers?|artists?');
// 出演者名单在这些行之前结束：空行、其他项目的标题、注意事项、长句
const OTHER = labelRe('日時|日程|日付|開催日|開場|開演|時間|会場|場所|料金|チケット|ticket|前売|当日|一般|先行|販売|主催|企画|協力|問い?合わ?せ|お問合せ|配信|特典|注意|注意事項|備考|詳細|入場|入場順|整理番号|タイムテーブル|物販|グッズ|url|https?');
const HEADING = new RegExp(String.raw`^\s*[【■□◆◇●◎▼▽《<＜\[［]`);
// 「入場順:…」这种短标题加冒号的行也是别的项目，除非标题像出演者的身份（MC：、Guest Act：、〜役：）
const SHORT_LABEL = /^[^:：]{1,12}[:：]/;
const ROLE_LABEL = /mc|ゲスト|guest|o\.?a|オープニング|act|役|出演|cast|vo|gt|ba|dr|key|聞き手|司会/i;
const MAX_ACTOR_LINES = 60;
const MAX_NAME_LINE = 60; // 更长的是句子

const lines = (text: string) => text.split(/\r?\n/).map((l) => l.trim());

// 会场名：标题后面的文字，没有就取下一行
export const findVenue = (text: string) => {
  const ls = lines(text);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(VENUE);
    if (!m) continue;
    const value = m[1].trim() || ls.slice(i + 1).find(Boolean) || '';
    if (value) return value;
  }
  return null;
};

// 会场名前面的地区：「東京都＋全角空格」「大阪市 」「[石川]」「東京 | 」「東京・」
const AREA = String.raw`(?:[^\s\d]{1,4}(?:都|道|府|県|市)|東京|大阪|名古屋|福岡|札幌|横浜|神戸|仙台|広島|京都|千葉|埼玉|愛知|神奈川|北海道)`;
const AREA_PREFIX = new RegExp(String.raw`^(?:[\[【(（][^\]】)）]{1,4}[\]】)）]\s*|${AREA}\s*(?:[|｜・･]\s*|\s+))`);

// 用会场名搜索时依次尝试的写法：整理后的原文、去掉括号、去掉楼层等后缀、第一个词。
// 网站的会场搜索要整个词都包含在会场名或地址里，所以多余的部分越少越容易搜到
export const venueQueries = (venue: string) => {
  const base = venue.normalize('NFKC')
    .replace(/https?:\/\/[^\s()]*/g, '')
    .replace(/\(\s*\)|\(\s*$/g, '')
    .replace(/^(?:会場|場所)\s*[:：]\s*/, '')
    .replace(/^[@＠]\s*/, '')
    .replace(AREA_PREFIX, '')
    .trim();
  const noParens = base.replace(/[(（「『][^()（）「」『』]*[)）」』]/g, '').trim();
  const noSuffix = noParens.replace(/\s*(?:B?\d+F|\d+階|特設|イベントスペース|メインステージ|大ホール|小ホール|メインアリーナ).*$/i, '').trim();
  const firstWord = noSuffix.split(/[\s/|｜、,]+/)[0] ?? '';
  return [...new Set([base, noParens, noSuffix, firstWord])].filter((q) => q.length >= 2);
};

// 名单整理成一行一人（再交给 splitNames 拆分，用户在「まとめて追加」里还能改）：
// 去掉日期・公演名、「(50音順)」「もっと見る」、（※…）的行，「〜役：」「MC：」等身份、「さん」「様」、@账号、#、（第1部）；
// 全角空格 / 连续空格、两个以上不带空格的「/」（HIBANA/フルコース/…）、
// 三段以上且每段至少 2 个字的「・」（青木陽菜・夢限大みゅーたいぷ・…）当作分隔。
// 两段的「・」可能是一个名字（マジカル・パンチライン），每段一个字的也是（M・A・O），不拆
const splitMany = (line: string, sep: RegExp) => {
  const parts = line.split(sep);
  return parts.length >= 3 && parts.every((p) => p.trim().length >= 2) ? parts : [line];
};
const cleanActorBlock = (block: string) =>
  block.split('\n')
    .filter((l) => !/\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}\s*[(（]|公演$|50音順|五十音順|もっと見る|^[(（]\s*※/.test(l))
    .flatMap((l) => splitMany(l, /(?<!\s)\/(?!\s)/))
    .flatMap((l) => l.split(/　+|\s{2,}/))
    .flatMap((l) => splitMany(l, /[・･]/))
    .map((name) => name
      .replace(/^.*[:：│|｜]\s*/, '')
      .replace(/\s*[@＠][\w.]+/g, '')
      .replace(/(^|[、，,／/・\s])[#＃]/g, '$1')
      .replace(/\s*[(（]第\d+部[)）]/g, '')
      .replace(/(さん|様)(?=\s*[(（]|$)/, '')
      .trim())
    .filter(Boolean)
    .join('\n');

// 出演者名单：标题后面的文字和下面的行，到空行或下一个项目为止（拆分交给 splitNames）
export const findActorBlock = (text: string) => {
  const ls = lines(text);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(ACTORS);
    if (!m) continue;
    const block = m[1].trim() ? [m[1].trim()] : [];
    for (const l of ls.slice(i + 1, i + 1 + MAX_ACTOR_LINES)) {
      if (!l) {
        if (block.length) break;
        continue; // 标题和名单之间的空行
      }
      if (!block.length && ACTORS.test(l) && !l.match(ACTORS)![1]) continue; // 「Cast」下一行又是「出演」
      if (OTHER.test(l) || HEADING.test(l) || /^[※＊*]/.test(l) || l.length > MAX_NAME_LINE) break;
      if (/^(?:[#＃]\S+\s*){2,}$/.test(l)) break; // 告知文末尾的话题标签行（标题同一行的「#ChouCho、#佐咲紗花」是名字）
      const short = l.match(SHORT_LABEL);
      if (short && !ROLE_LABEL.test(short[0])) break;
      block.push(l);
    }
    if (block.length) return cleanActorBlock(block.join('\n'));
  }
  return null;
};

// 话题标签：前面是行首或空白（不是 URL 里的 #），去掉只有数字的
export const findHashtags = (text: string) =>
  [...new Set([...text.matchAll(/(?:^|[\s　(（「『])[#＃]([^\s#＃.,、。!！?？()（）「」『』【】]+)/g)].map((m) => m[1]))]
    .filter((tag) => !/^\d+$/.test(tag));
