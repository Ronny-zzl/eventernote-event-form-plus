import './style.css';
import { initActorPresets, initActorSorting } from './features/actors';
import { initAnnounce } from './features/announce';
import { initDatePicker } from './features/date';
import { initPlacePicker } from './features/place';
import { initConfirmBackButton, initFormSnapshot } from './features/snapshot';
import { initConfirmImage, initEditImagePicker, initImagePicker, processPendingUpload } from './features/thumbnail';
import { initMinuteOptions, initSmartTime, restoreEditMinutes } from './features/time';

const path = location.pathname.replace(/\/$/, '');
const editId = path.match(/^\/events\/(\d+)\/edit$/)?.[1];

if (path === '/events/add/confirm') {
  initConfirmBackButton();
  initConfirmImage();
} else if (path === '/events/add') {
  // 分钟选项和会场搜索框要在恢复快照之前准备好，日期和时间的输入框在恢复之后读取下拉框的值
  initMinuteOptions();
  initActorSorting();
  initActorPresets();
  const placePicker = initPlacePicker();
  initFormSnapshot(placePicker);
  // ?from_event_id=… 复制登录时页面会预先指定会场
  placePicker?.loadInitial(new URLSearchParams(location.search).get('from_event_id'));
  initAnnounce(initDatePicker(), initSmartTime());
  initImagePicker();
} else if (editId) {
  initMinuteOptions();
  initActorSorting();
  initActorPresets();
  initPlacePicker()?.loadInitial(editId);
  const time = initSmartTime();
  initAnnounce(initDatePicker(), time);
  restoreEditMinutes(editId).then(() => time?.refresh());
  initEditImagePicker();
} else {
  processPendingUpload();
}
