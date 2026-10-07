import { showNotice } from '../lib/notice';
import { findInitialPlace, parseHtml, sleep } from '../lib/page';
import { load, save, type ImageData } from '../lib/storage';
import { isReturning } from './snapshot';

// 登录页没有图片字段（确认页靠隐藏字段转交数据，文件无法带过去），只有编辑页能上传 thumbnail_image。流程：
//   登录页选图（draftImage）→ 确认页点「登録する」时转为待上传任务（pendingUpload）
//   → 登录完成后找到新活动，核对活动名和会场后，用编辑页原样提交并附上图片
const PENDING_TTL_MS = 30 * 60 * 1000;
const SERVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const S3_EVENT_IMAGE = 'https://eventernote.s3.amazonaws.com/images/events/';

const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('画像を読み込めませんでした'));
  img.src = src;
});

// 服务器端支持的格式原样保存，其他格式（如 WebP）先转成 JPEG
const normalizeImage = async (file: File): Promise<ImageData> => {
  const dataUrl = await readAsDataUrl(file);
  const name = file.name || 'thumbnail';
  if (SERVER_IMAGE_TYPES.includes(file.type)) return { dataUrl, name, type: file.type };
  const img = await loadImage(dataUrl);
  const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), name: name.replace(/\.[^.]*$/, '') + '.jpg', type: 'image/jpeg' };
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, base64] = dataUrl.split(',');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: header.match(/data:([^;]+)/)![1] });
};

const firstImageFile = (files?: FileList | null) => [...(files ?? [])].find((f) => f.type.startsWith('image/'));

// 图片选择框（拖入 / Ctrl+V / 文件选择），登录页和编辑页共用
const createImageDrop = (onImage: (image: ImageData) => void, onRemove: () => void) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="ene-drop" tabindex="0"></div>
    <input type="file" accept="image/*" style="display:none">
  `;
  const drop = wrap.querySelector<HTMLElement>('.ene-drop')!;
  const picker = wrap.querySelector('input')!;

  const clear = () => {
    drop.textContent = 'ここに画像をドラッグ＆ドロップ / Ctrl+V で貼り付け / クリックしてファイルを選択';
  };
  const show = (dataUrl: string) => {
    const remove = Object.assign(document.createElement('input'), { type: 'button', className: 'btn btn-small', value: '画像を取り消す' });
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove();
      clear();
    });
    drop.replaceChildren(Object.assign(document.createElement('img'), { src: dataUrl }), remove);
  };
  const accept = async (file?: File) => {
    if (!file) return;
    try {
      const image = await normalizeImage(file);
      onImage(image);
      show(image.dataUrl);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  drop.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    accept(firstImageFile(picker.files));
    picker.value = '';
  });

  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
  drop.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    drop.classList.add('ene-over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('ene-over'));
  drop.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    drop.classList.remove('ene-over');
    accept(firstImageFile(e.dataTransfer!.files));
  });
  // 图片没拖到框里时，浏览器默认会打开图片并离开本页，导致已填内容丢失
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });
  // 剪贴板里有图片时才接管，粘贴文字不受影响
  document.addEventListener('paste', (e) => {
    const file = firstImageFile(e.clipboardData?.files);
    if (!file) return;
    e.preventDefault();
    accept(file);
  });

  clear();
  return { element: wrap, show };
};

// 登录页：选中的图片存入 draftImage，登录完成后自动上传
export const initImagePicker = () => {
  const submit = document.querySelector('#event_form input[type="submit"]');
  if (!submit) return;
  // 新打开的登录页从空白开始；只有从确认页返回时才沿用之前选的图片
  if (!isReturning) save('draftImage', null);

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>サムネイル画像</td>
    <td><p class="ene-image-note">登録完了後、イベント編集機能を使って自動でアップロードします。</p></td>
  `;
  submit.closest('tr')!.before(row);
  const picker = createImageDrop((image) => save('draftImage', image), () => save('draftImage', null));
  row.cells[1].prepend(picker.element);
  const draft = load('draftImage', null);
  if (draft) picker.show(draft.dataUrl);
};

// 编辑页：选中的图片直接放进原生的 thumbnail_image 字段，随「編集完了」一起提交
export const initEditImagePicker = () => {
  const input = document.querySelector<HTMLInputElement>('#event_form input[type="file"][name="thumbnail_image"]');
  if (!input) return;
  input.style.display = 'none';
  const current = input.parentElement?.querySelector('img');
  if (current) {
    current.before(Object.assign(document.createElement('p'), { className: 'ene-image-note', textContent: '現在の画像' }));
    current.style.display = 'block';
    current.style.marginBottom = '10px';
  }
  const picker = createImageDrop(
    (image) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([dataUrlToBlob(image.dataUrl)], image.name, { type: image.type }));
      input.files = transfer.files;
    },
    () => { input.value = ''; },
  );
  picker.element.append(Object.assign(document.createElement('p'), {
    className: 'ene-image-note',
    textContent: '新しい画像は「編集完了」を押すと保存されます。',
  }));
  input.after(picker.element);
};

// 确认页：显示待上传的图片，点「登録する」时登记上传任务
export const initConfirmImage = () => {
  const form = document.querySelector<HTMLFormElement>('form[action="/events/add/complete"]');
  const image = load('draftImage', null);
  if (!form || !image) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>サムネイル画像</td>
    <td><img style="max-width:300px;max-height:200px"><br>
      <span class="s">登録完了後に自動でアップロードします</span></td>
  `;
  row.querySelector('img')!.src = image.dataUrl;
  form.querySelector('input[type="submit"]')!.closest('tr')!.before(row);

  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
  form.addEventListener('submit', () => {
    save('pendingUpload', { image, eventName: value('event_name'), placeId: value('place_id'), createdAt: Date.now() });
  });
};

// ---- 登录完成后：找到新活动并通过编辑页上传图片 ----

const candidateEventIds = () => {
  const ids = new Set<string>();
  const m = location.pathname.match(/^\/events\/(\d+)\/?$/);
  if (m) ids.add(m[1]);
  if (location.pathname.startsWith('/events/add/complete')) {
    for (const a of document.querySelectorAll('.page a[href]')) {
      const lm = a.getAttribute('href')!.match(/^(?:https?:\/\/www\.eventernote\.com)?\/events\/(\d+)\/?$/);
      if (lm) ids.add(lm[1]);
    }
  }
  return [...ids];
};

const fetchEditForm = async (eventId: string) => {
  const res = await fetch(`/events/${eventId}/edit`, { credentials: 'same-origin' });
  if (!res.ok) return null;
  const doc = parseHtml(await res.text());
  const form = doc.querySelector<HTMLFormElement>('#event_form');
  // 会场下拉框由页面脚本 searchPlaces(都道府県, 会场ID) 填充，HTML 里是空的
  return form && { form, placeId: findInitialPlace(doc)?.id ?? '' };
};

const buildEditFormData = (form: HTMLFormElement, placeId: string, image: ImageData) => {
  const data = new FormData();
  for (const el of form.elements as unknown as HTMLInputElement[]) {
    if (!el.name || el.disabled || el.name === 'place_id') continue;
    if (['file', 'submit', 'button', 'reset', 'image'].includes(el.type)) continue;
    if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue;
    data.append(el.name, el.value);
  }
  data.append('place_id', placeId);
  data.append('thumbnail_image', dataUrlToBlob(image.dataUrl), image.name);
  return data;
};

// S3 图片的 Last-Modified（毫秒）；不存在时 S3 返回 403 → null。S3 允许跨域 GET
const imageLastModified = async (url: string) => {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? Date.parse(res.headers.get('Last-Modified') ?? '') || 0 : null;
  } catch {
    return null;
  }
};

// 新活动登录后，网站会在后台根据「関連リンク」生成图片（OGP 图或网页截图），约 5 秒后写入 S3，
// 覆盖在此之前上传的图片。所以有链接时先等这张自动图片出现再上传
const SITE_IMAGE_WAIT_MS = 60 * 1000;
const UPLOAD_LOCK_MS = 2 * 60 * 1000;

const waitForSiteImage = async (url: string) => {
  const deadline = Date.now() + SITE_IMAGE_WAIT_MS;
  while (Date.now() < deadline) {
    const lm = await imageLastModified(url);
    await sleep(2000); // 出现后也再等一下：原图和缩略图可能不是同时写完
    if (lm !== null) return lm;
  }
  return null;
};

export const processPendingUpload = async () => {
  const pending = load('pendingUpload', null);
  if (!pending) return;
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    save('pendingUpload', null);
    return;
  }
  if (pending.uploadingAt && Date.now() - pending.uploadingAt < UPLOAD_LOCK_MS) return; // 其他标签页正在处理

  for (const id of candidateEventIds()) {
    const edit = await fetchEditForm(id);
    if (!edit) continue;
    const { form, placeId } = edit;
    if ((form.elements.namedItem('event_name') as HTMLInputElement).value.trim() !== pending.eventName.trim()) continue;
    if (pending.placeId && placeId !== pending.placeId) {
      // 会场解析不一致时上传会清空或改错会场，宁可放弃
      save('pendingUpload', null);
      showNotice('会場情報を正しく読み取れなかったため、画像の自動アップロードを中止しました。イベント編集画面から手動で追加してください。', 'error');
      return;
    }
    save('pendingUpload', { ...pending, uploadingAt: Date.now() });

    const imageUrl = `${S3_EVENT_IMAGE}${id}_s.jpg`;
    const hasLink = !!(form.elements.namedItem('link') as HTMLTextAreaElement | null)?.value.trim();
    let siteImageAt = await imageLastModified(imageUrl);
    if (siteImageAt === null && hasLink) {
      const waiting = showNotice('サイトによる画像の自動生成を待っています。このページを開いたままお待ちください…');
      siteImageAt = await waitForSiteImage(imageUrl);
      waiting.remove();
    }

    try {
      const res = await fetch(form.getAttribute('action')!, {
        method: 'POST',
        body: buildEditFormData(form, placeId, pending.image),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (err) {
      save('pendingUpload', null);
      showNotice(`画像のアップロードに失敗しました（${(err as Error).message}）。イベント編集画面から手動で追加してください。`, 'error');
      return;
    }
    save('pendingUpload', null);

    // 确认 S3 上的图片已换成刚上传的（比自动生成的图片更新）
    let uploaded = false;
    for (let i = 0; i < 5 && !uploaded; i++) {
      const lm = await imageLastModified(imageUrl);
      uploaded = lm !== null && (siteImageAt === null || lm > siteImageAt);
      if (!uploaded) await sleep(2000);
    }
    if (!uploaded) {
      showNotice('画像を送信しましたが、反映を確認できませんでした。しばらくしてからイベントページを確認してください。', 'error');
    } else if (siteImageAt === null && hasLink) {
      showNotice('サムネイル画像をアップロードしましたが、サイトの自動生成画像に置き換えられる可能性があります。しばらくしてからイベントページを確認してください。', 'error');
    } else {
      showNotice('サムネイル画像をアップロードしました。');
      if (/^\/events\/\d+\/?$/.test(location.pathname)) setTimeout(() => location.reload(), 1500);
    }
    return;
  }
  // 没找到对应活动时保留任务：用户打开新活动页面时会再次尝试（30 分钟内）
};
