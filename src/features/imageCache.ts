import { load, save } from '../lib/storage';

// S3 的活动图片没有 Cache-Control，浏览器会按自己估算的时间缓存（iOS Safari 尤其久），
// 而图片地址（/images/events/{id}.jpg）上传新图后也不变，于是一直显示旧图。
// 通过脚本上传后记下时间，之后打开页面时给这个活动的图片地址加上 ?v=时间，让浏览器重新取
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const EVENT_IMAGE = /\/images\/events\/(\d+)(?:_s)?\.jpg/;

export const markImageUpdated = (eventId: string) => {
  const now = Date.now();
  const versions = Object.fromEntries(Object.entries(load('imageVersions', {})).filter(([, t]) => now - t < KEEP_MS));
  save('imageVersions', { ...versions, [eventId]: now });
};

export const refreshEventImages = () => {
  const versions = load('imageVersions', {});
  if (!Object.keys(versions).length) return;
  for (const img of document.querySelectorAll<HTMLImageElement>('img[src*="/images/events/"]')) {
    const url = new URL(img.src, location.href);
    const version = versions[url.pathname.match(EVENT_IMAGE)?.[1] ?? ''];
    if (!version || url.searchParams.get('v') === String(version)) continue;
    url.searchParams.set('v', String(version));
    img.src = url.href;
  }
};
