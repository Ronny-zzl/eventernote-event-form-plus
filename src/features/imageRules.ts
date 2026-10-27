// 服务器处理活动图片的规则（2026-10-27 用活动 494909 实测）：
// - 上传的图缩到 700×700 以内（_s 是 300×300 以内）；长边不超过 700 的图服务器返回 500（701 可以，700 不行）
// - 保存时没有上传图片、且有「関連リンク」时，约 5 秒后网站按第一个链接重新生成图片并覆盖现有的图
//   （有 og:image 就原尺寸保存，没有就是 1000×1000 的网页截图）；没有链接时现有的图不变
export const SERVER_IMAGE_SIDE = 700;

// 需要放大时返回长边为 701 的尺寸，不需要时返回 null
export const uploadSize = (width: number, height: number) => {
  const long = Math.max(width, height);
  if (long > SERVER_IMAGE_SIDE) return null;
  const scale = (SERVER_IMAGE_SIDE + 1) / long;
  return width >= height
    ? { width: SERVER_IMAGE_SIDE + 1, height: Math.max(1, Math.round(height * scale)) }
    : { width: Math.max(1, Math.round(width * scale)), height: SERVER_IMAGE_SIDE + 1 };
};

