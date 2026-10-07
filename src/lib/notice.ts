// 右上角的提示框，返回元素以便调用方提前移除
export const showNotice = (message: string, kind?: 'error') => {
  const box = document.createElement('div');
  box.className = kind === 'error' ? 'ene-notice ene-error' : 'ene-notice';
  const close = document.createElement('span');
  close.className = 'ene-close';
  close.textContent = '×';
  close.addEventListener('click', () => box.remove());
  box.append(close, message);
  document.body.append(box);
  return box;
};
