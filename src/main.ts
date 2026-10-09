import './style.css';
import { initActorPresets, initActorList } from './features/actors';
import { initActorBulk } from './features/actorBulk';
import { initActorSearch } from './features/actorSearch';
import { initAnnounce } from './features/announce';
import { initDatePicker } from './features/date';
import { initDraft, initDraftClear } from './features/draft';
import { initPlacePicker } from './features/place';
import { initConfirmBackButton, initFormSnapshot } from './features/snapshot';
import { initSubmitCheck } from './features/submitCheck';
import { initConfirmImage, initEditImagePicker, initImagePicker, processPendingUpload } from './features/thumbnail';
import { initMinuteOptions, initSmartTime, restoreEditMinutes } from './features/time';
import { isSmartphone } from './lib/page';

// 手机版页面没有 Bootstrap，按钮等用 .ene-sp 下的样式
document.documentElement.classList.toggle('ene-sp', isSmartphone());

const path = location.pathname.replace(/\/$/, '');
const editId = path.match(/^\/events\/(\d+)\/edit$/)?.[1];

if (path === '/events/add/confirm') {
  initConfirmBackButton();
  initConfirmImage();
  initDraftClear();
} else if (path === '/events/add') {
  // 分钟选项和会场搜索框要在恢复快照之前准备好，日期和时间的输入框在恢复之后读取下拉框的值
  initMinuteOptions();
  initActorList();
  initActorPresets();
  initActorSearch();
  initActorBulk();
  const placePicker = initPlacePicker();
  initFormSnapshot(placePicker);
  // ?from_event_id=… 复制登录时页面会预先指定会场
  placePicker?.loadInitial(new URLSearchParams(location.search).get('from_event_id'));
  const date = initDatePicker();
  const time = initSmartTime();
  initAnnounce(date, time);
  initSubmitCheck(); // 在时间检查之后注册
  initDraft(placePicker, () => {
    date?.refresh();
    time?.refresh();
  });
  initImagePicker();
} else if (editId) {
  initMinuteOptions();
  initActorList();
  initActorPresets();
  initActorSearch();
  initActorBulk();
  initPlacePicker()?.loadInitial(editId);
  const time = initSmartTime();
  initAnnounce(initDatePicker(), time);
  initSubmitCheck();
  restoreEditMinutes(editId).then(() => time?.refresh());
  initEditImagePicker(editId);
} else {
  processPendingUpload();
}
