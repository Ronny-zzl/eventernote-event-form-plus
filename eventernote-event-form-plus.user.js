// ==UserScript==
// @name               Eventernote イベント登録エンハンサー
// @name:ja            Eventernote イベント登録エンハンサー
// @name:zh-CN         Eventernote 活动登录增强
// @name:en            Eventernote Add Event Enhancer
// @namespace          https://github.com/Ronny-zzl/eventernote-event-form-plus
// @version            0.3.0
// @author             Ronny-zzl
// @description        イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:ja     イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:zh-CN  改善 Eventernote 活动登录和编辑页面：会场搜索、时间输入改进、出演者排序、出演者组合、从确认页返回修改、添加缩略图
// @description:en     Improves the Eventernote event add/edit forms: venue search, smarter time input, reorder performers, performer sets, back button on the confirm page, thumbnail images
// @license            MIT
// @homepageURL        https://github.com/Ronny-zzl/eventernote-event-form-plus
// @supportURL         https://github.com/Ronny-zzl/eventernote-event-form-plus/issues
// @match              https://www.eventernote.com/events/*
// @grant              GM_addStyle
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              unsafeWindow
// @run-at             document-idle
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	_css("#selected_actors{margin-left:0;list-style:none}#selected_actors li.ene-actor{background:#fff;border:1px solid #ddd;border-radius:3px;align-items:center;gap:6px;margin-bottom:2px;padding:3px 6px;display:flex}#selected_actors li.ene-dragging{opacity:.4}#selected_actors .ene-handle{cursor:grab;color:#999;-webkit-user-select:none;user-select:none}#selected_actors .ene-name{flex:1}#selected_actors .ene-move{cursor:pointer;color:#08c;-webkit-user-select:none;user-select:none;padding:0 2px}.ene-presets{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ene-presets select{margin-bottom:0}.ene-time-row{flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px;display:flex}.ene-time-row input.ene-time{width:70px;margin-bottom:0}.ene-time-row input.ene-time.ene-invalid{background:#fdf0f0;border-color:#b94a48}.ene-time-row .btn{margin-bottom:0}.ene-time-badge{color:#fff;background:#f89406;border-radius:3px;padding:1px 5px;font-size:11px}.ene-time-error{color:#b94a48;font-size:11px}.ene-place{margin-bottom:8px;position:relative}.ene-place-current{background:#fff;border:1px solid #ddd;border-radius:3px;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;padding:6px 8px;display:flex}.ene-place-current .ene-place-name{font-weight:700}.ene-place-current .ene-place-sub{color:#888;flex:1;font-size:11px}.ene-place-current .btn{margin-bottom:0}.ene-place-search{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ene-place-search select{width:auto;margin-bottom:0}.ene-place-search input{flex:1;min-width:200px;margin-bottom:0}.ene-place-results{z-index:1000;background:#fff;border:1px solid #ccc;border-radius:3px;max-height:360px;margin:2px 0 0;padding:0;list-style:none;position:absolute;left:0;right:0;overflow-y:auto;box-shadow:0 4px 12px #00000026}.ene-place-results li{cursor:pointer;border-bottom:1px solid #f0f0f0;padding:5px 8px}.ene-place-results li.ene-active{background:#eef6fb}.ene-place-results li.ene-closed{opacity:.5}.ene-place-results li.ene-heading{cursor:default;color:#888;background:#f7f7f7;font-size:11px}.ene-place-results .ene-place-sub{color:#888;font-size:11px;display:block}.ene-drop{text-align:center;color:#888;cursor:pointer;background:#fafafa;border:2px dashed #bbb;border-radius:4px;padding:14px}.ene-drop.ene-over{color:#08c;background:#eef6fb;border-color:#08c}.ene-drop img{max-width:300px;max-height:200px;margin:0 auto 6px;display:block}.ene-image-note{color:#888;margin-top:4px;font-size:11px}.ene-notice{z-index:10000;color:#3c763d;background:#dff0d8;border:1px solid #d6e9c6;border-radius:4px;max-width:360px;padding:10px 14px;font-size:13px;position:fixed;top:60px;right:20px;box-shadow:0 2px 8px #0003}.ene-notice.ene-error{color:#a94442;background:#f2dede;border-color:#ebccd1}.ene-notice .ene-close{float:right;cursor:pointer;margin-left:10px}.ene-announce{width:95%;margin-bottom:0}.ene-date{align-items:center;gap:6px;display:inline-flex}.ene-date input{width:auto;margin-bottom:0}.ene-weekday[data-day=\"0\"]{color:#c00}.ene-weekday[data-day=\"6\"]{color:#06c}");
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var page = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
	var byId = (id) => document.getElementById(id);
	var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	var pad2 = (n) => String(n).padStart(2, "0");
	var findInitialPlace = (doc = document) => {
		for (const s of doc.querySelectorAll("script:not([src])")) {
			const m = s.textContent?.match(/searchPlaces\(\s*(\d*)\s*,\s*(\d+)\s*\)/);
			if (m) return {
				prefecture: m[1],
				id: m[2]
			};
		}
		return null;
	};
	var parseHtml = (html) => new DOMParser().parseFromString(html, "text/html");
	var hideFrom = (el) => {
		const hidden = document.createElement("span");
		hidden.style.display = "none";
		el.before(hidden);
		while (hidden.nextSibling) hidden.append(hidden.nextSibling);
		return hidden;
	};
	var onEnter = (input, fn) => input.addEventListener("keydown", (e) => {
		if (e.key !== "Enter") return;
		e.preventDefault();
		fn();
	});
	var load = (key, fallback) => _GM_getValue(key, fallback);
	var save = (key, value) => _GM_setValue(key, value);
	var actorId = (li) => li.id.replace(/^actor_/, "");
	var syncActorOrder = () => {
		const list = byId("selected_actors");
		const hidden = byId("actor_ids");
		if (!list || !hidden) return;
		const ids = [...list.children].map(actorId);
		const arr = page.selected_actors;
		if (arr) {
			const ordered = ids.map((id) => arr.find((v) => String(v) === id) ?? id);
			arr.splice(0, arr.length, ...ordered);
		}
		hidden.value = ids.join(",");
	};
	var readSelectedActors = () => [...byId("selected_actors")?.children ?? []].map((li) => {
		const name = li.querySelector(".ene-name")?.textContent ?? [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("");
		return {
			id: actorId(li),
			name: name.trim()
		};
	});
	var addActorIfMissing = (actor) => {
		if (!byId("actor_" + actor.id)) page.addActor(String(actor.id), actor.name);
	};
	var control = (text, title, className) => {
		const el = document.createElement("span");
		el.className = className;
		el.textContent = text;
		el.title = title;
		return el;
	};
	var initActorSorting = () => {
		const list = byId("selected_actors");
		if (!list || !byId("actor_ids")) return;
		const move = (li, delta) => {
			if (delta < 0 && li.previousElementSibling) li.previousElementSibling.before(li);
			else if (delta > 0 && li.nextElementSibling) li.nextElementSibling.after(li);
			syncActorOrder();
		};
		const decorate = (li) => {
			if (li.classList.contains("ene-actor")) return;
			li.classList.add("ene-actor");
			li.draggable = true;
			const name = document.createElement("span");
			name.className = "ene-name";
			name.append(...[...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE));
			const up = control("▲", "上へ", "ene-move");
			const down = control("▼", "下へ", "ene-move");
			up.addEventListener("click", () => move(li, -1));
			down.addEventListener("click", () => move(li, 1));
			li.prepend(control("☰", "ドラッグで並び替え", "ene-handle"), name, up, down);
		};
		let dragging = null;
		const actorAt = (e) => e.target.closest?.("li.ene-actor") ?? null;
		list.addEventListener("dragstart", (e) => {
			dragging = actorAt(e);
			if (!dragging) return;
			dragging.classList.add("ene-dragging");
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", dragging.id);
		});
		list.addEventListener("dragover", (e) => {
			if (!dragging) return;
			e.preventDefault();
			const over = actorAt(e);
			if (!over || over === dragging) return;
			const rect = over.getBoundingClientRect();
			if (e.clientY > rect.top + rect.height / 2) over.after(dragging);
			else over.before(dragging);
		});
		list.addEventListener("drop", (e) => {
			if (dragging) e.preventDefault();
		});
		list.addEventListener("dragend", () => {
			if (!dragging) return;
			dragging.classList.remove("ene-dragging");
			dragging = null;
			syncActorOrder();
		});
		const decorateAll = () => [...list.children].forEach(decorate);
		new MutationObserver(decorateAll).observe(list, { childList: true });
		decorateAll();
	};
	var defaultPresets = () => [{
		name: "前橋ウィッチーズ",
		actors: [
			{
				id: "80126",
				name: "前橋ウィッチーズ"
			},
			{
				id: "63283",
				name: "春日さくら"
			},
			{
				id: "80112",
				name: "咲川ひなの"
			},
			{
				id: "80113",
				name: "本村玲奈"
			},
			{
				id: "65986",
				name: "三波春香"
			},
			{
				id: "69358",
				name: "百瀬帆南"
			}
		]
	}];
	var loadPresets = () => load("actorPresets", defaultPresets());
	var addPreset = (actors) => {
		const anchor = actors.length ? byId("actor_" + actors[0].id) : null;
		if (!anchor) {
			actors.forEach(addActorIfMissing);
			return;
		}
		const memberIds = new Set(actors.map((a) => "actor_" + a.id));
		let cursor = anchor;
		while (cursor.nextElementSibling && memberIds.has(cursor.nextElementSibling.id)) cursor = cursor.nextElementSibling;
		for (const actor of actors.slice(1)) {
			if (byId("actor_" + actor.id)) continue;
			addActorIfMissing(actor);
			const li = byId("actor_" + actor.id);
			if (!li) continue;
			cursor.after(li);
			cursor = li;
		}
		syncActorOrder();
	};
	var initActorPresets = () => {
		const list = byId("selected_actors");
		if (!list || typeof page.addActor !== "function") return;
		const box = document.createElement("p");
		box.className = "ene-presets";
		box.innerHTML = `
    <select></select>
    <input type="button" class="btn" value="セットを追加する">
    <input type="button" class="btn" value="選択中の出演者をセットに保存">
    <input type="button" class="btn" value="セットを削除">
  `;
		list.after(box);
		const select = box.querySelector("select");
		const [addBtn, saveBtn, deleteBtn] = box.querySelectorAll("input");
		const render = (selectedName) => {
			const presets = loadPresets();
			select.replaceChildren(new Option(presets.length ? "出演者セットを選んでください" : "（保存済みのセットはありません）", ""), ...presets.map((p, i) => new Option(`${p.name}（${p.actors.length}名）`, String(i), false, p.name === selectedName)));
		};
		addBtn.addEventListener("click", () => {
			const preset = loadPresets()[Number(select.value)];
			if (select.value && preset) addPreset(preset.actors);
		});
		saveBtn.addEventListener("click", () => {
			const actors = readSelectedActors();
			if (!actors.length) {
				alert("出演者を追加してから保存してください");
				return;
			}
			const name = (prompt("セット名", actors[0].name) ?? "").trim();
			if (!name) return;
			const presets = loadPresets();
			const existing = presets.find((p) => p.name === name);
			if (existing) {
				if (!confirm(`セット「${name}」は既に存在します。上書きしますか？`)) return;
				existing.actors = actors;
			} else presets.push({
				name,
				actors
			});
			save("actorPresets", presets);
			render(name);
		});
		deleteBtn.addEventListener("click", () => {
			const presets = loadPresets();
			const preset = presets[Number(select.value)];
			if (!select.value || !preset) return;
			if (!confirm(`セット「${preset.name}」を削除しますか？`)) return;
			presets.splice(Number(select.value), 1);
			save("actorPresets", presets);
			render();
		});
		render();
	};
	var showNotice = (message, kind) => {
		const box = document.createElement("div");
		box.className = kind === "error" ? "ene-notice ene-error" : "ene-notice";
		const close = document.createElement("span");
		close.className = "ene-close";
		close.textContent = "×";
		close.addEventListener("click", () => box.remove());
		box.append(close, message);
		document.body.append(box);
		return box;
	};
	var WEEKDAYS$1 = "日月火水木金土";
	var DAY_MS = 864e5;
	var DATE_RE = new RegExp(String.raw`(?<!\d)(?:(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?|(\d{1,2})\s*(?:月\s*(\d{1,2})\s*日|/\s*(\d{1,2})))(?![\d:])` + String.raw`(?:\s*\(\s*([${WEEKDAYS$1}])[^)]{0,4}\)|\s*([${WEEKDAYS$1}])曜)?`, "g");
	var toDate = ({ year, month, day }) => new Date(year, month - 1, day);
	var isValid = (d) => {
		const date = toDate(d);
		return date.getMonth() === d.month - 1 && date.getDate() === d.day;
	};
	var guessYear = (month, day, weekday, today) => {
		const thisYear = today.getFullYear();
		const parts = (toDate({
			year: thisYear,
			month,
			day
		}).getTime() >= today.getTime() - 30 * DAY_MS ? [
			thisYear,
			thisYear + 1,
			thisYear - 1
		] : [
			thisYear + 1,
			thisYear,
			thisYear - 1
		]).map((year) => ({
			year,
			month,
			day
		})).filter(isValid);
		return (weekday === null ? parts[0] : parts.find((d) => toDate(d).getDay() === weekday)) ?? null;
	};
	var parseDate = (text, today = new Date()) => {
		let best = null;
		for (const m of text.normalize("NFKC").matchAll(DATE_RE)) {
			const w = m[7] ?? m[8];
			const weekday = w ? WEEKDAYS$1.indexOf(w) : null;
			const date = m[1] ? {
				year: Number(m[1]),
				month: Number(m[2]),
				day: Number(m[3])
			} : guessYear(Number(m[4]), Number(m[5] ?? m[6]), weekday, today);
			if (!date || !isValid(date)) continue;
			const rank = m[1] ? 0 : weekday !== null ? 1 : 2;
			if (!best || rank < best.rank) best = {
				date,
				rank
			};
		}
		return best?.date ?? null;
	};
	var TIME_LABELS = {
		open: "開場",
		start: "開演",
		end: "終演"
	};
	var TIME_KEYS = Object.keys(TIME_LABELS);
	var makeTime = (hour, minute, meridiem) => {
		let h = Number(hour);
		const m = minute === "半" ? 30 : Number(minute || 0);
		if (meridiem) {
			const pm = /^(午後|pm|p\.m\.)$/i.test(meridiem);
			if (h > 12) return null;
			if (pm && h < 12) h += 12;
			if (!pm && h === 12) h = 0;
		}
		if (h > 29 || m > 59) return null;
		return {
			hour: h % 24,
			minute: m
		};
	};
	var formatTime = (t) => `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
	var parseTimeInput = (str) => {
		const s = str.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
		if (!s) return "empty";
		let m = s.match(/^(\d{1,2})(\d{2})$/);
		if (m) return makeTime(m[1], m[2]);
		m = s.match(/^(\d{1,2})$/);
		if (m) return makeTime(m[1]);
		m = s.match(/^(午前|午後|am|pm|a\.m\.|p\.m\.)?(\d{1,2})(?:[:.](\d{2})|時(\d{1,2}|半)?分?)?(am|pm|a\.m\.|p\.m\.)?$/);
		if (m && !(m[1] && m[5])) return makeTime(m[2], m[3] || m[4], m[1] || m[5]);
		return null;
	};
	var LABEL_PATTERNS = {
		open: /^(開場|入場|open)/i,
		start: /^(開演|開始|start|スタート)/i,
		end: /^(終演|終了|end|close)/i
	};
	var LABEL_ANY_RE = /開場|入場開始|入場|開演|(?<!販売|発売|受付|抽選|予約|応募|配信)(?:開始|終了)|終演|スタート|(?<![a-z])(?:open|start|end|close)(?![a-z])/i;
	var TOKEN_RE = new RegExp([`(${LABEL_ANY_RE.source})`, String.raw`(?<!\d)(?:(午前|午後|am|pm)\s*)?(\d{1,2})\s*(?::\s*(\d{2})|時(?!間)\s*(?:(\d{1,2})分?|(半))?)(?:\s*(am|pm)(?![a-z]))?`].join("|"), "gi");
	var GAP_RE = /^(?:[\s/・|,、.:;()[\]【】〈〉<>《》「」『』〜~=_*-]|[→⇒▶▷►★☆◆◇■□●○]|時間|時刻|予定|は)*$/;
	var parseAnnouncement = (text) => {
		const s = text.normalize("NFKC");
		const tokens = [];
		for (const m of s.matchAll(TOKEN_RE)) {
			const token = {
				start: m.index,
				end: m.index + m[0].length
			};
			if (m[1]) token.label = TIME_KEYS.find((k) => LABEL_PATTERNS[k].test(m[1]));
			else {
				const time = makeTime(m[3], m[4] || m[5] || m[6], m[2] || m[7]);
				if (!time) continue;
				token.time = time;
			}
			tokens.push(token);
		}
		const adjacent = (a, b) => GAP_RE.test(s.slice(a.end, b.start));
		const labelFirst = () => {
			const found = {};
			for (let i = 0; i < tokens.length;) {
				if (!tokens[i].label) {
					i++;
					continue;
				}
				const labels = [tokens[i]];
				let j = i + 1;
				while (j < tokens.length && tokens[j].label && adjacent(tokens[j - 1], tokens[j])) labels.push(tokens[j++]);
				const times = [];
				while (j < tokens.length && tokens[j].time && adjacent(tokens[j - 1], tokens[j])) times.push(tokens[j++]);
				labels.forEach((l, k) => {
					if (times[k] && !found[l.label]) found[l.label] = times[k].time;
				});
				i = Math.max(j, i + labels.length);
			}
			return found;
		};
		const timeFirst = () => {
			const found = {};
			for (let i = 0; i + 1 < tokens.length; i++) {
				const [t, l] = [tokens[i], tokens[i + 1]];
				if (t.time && l.label && adjacent(t, l) && !found[l.label]) {
					found[l.label] = t.time;
					i++;
				}
			}
			return found;
		};
		const a = labelFirst();
		const b = timeFirst();
		return Object.keys(b).length > Object.keys(a).length ? b : a;
	};
	var initAnnounce = (date, time) => {
		const dateRow = byId("date_year")?.closest("tr");
		if (!dateRow || !date && !time) return;
		const fill = (text) => {
			const read = [];
			const d = date && parseDate(text);
			if (d && date.set(d)) read.push(`${d.year}年${d.month}月${d.day}日`);
			const times = time ? parseAnnouncement(text) : {};
			for (const k of TIME_KEYS) {
				const t = times[k];
				if (!t) continue;
				time.setTime(k, t);
				read.push(`${TIME_LABELS[k]} ${formatTime(t)}`);
			}
			if (read.length) showNotice("読み取りました：" + read.join(" / "));
			else showNotice("告知文から日付・時間を読み取れませんでした", "error");
		};
		const row = document.createElement("tr");
		row.innerHTML = `
    <td>告知文から入力</td>
    <td>
      <input type="text" class="ene-announce" autocomplete="off"
        placeholder="例: 2026年12月19日(土) 開場 17:30 / 開演 18:30　告知文をここに貼り付け">
      <p class="s">開催日と開場・開演・終演の時間を自動で入力します</p>
    </td>
  `;
		dateRow.before(row);
		const input = row.querySelector("input");
		input.addEventListener("paste", (e) => {
			const text = e.clipboardData?.getData("text");
			if (!text) return;
			e.preventDefault();
			input.value = text.replace(/\s+/g, " ").trim();
			fill(text);
		});
		onEnter(input, () => fill(input.value));
		for (const el of document.querySelectorAll("input.ene-time")) el.addEventListener("paste", (e) => {
			const text = e.clipboardData?.getData("text");
			if (!text || !LABEL_ANY_RE.test(text.normalize("NFKC"))) return;
			e.preventDefault();
			fill(text);
		});
	};
	var WEEKDAYS = [
		"日",
		"月",
		"火",
		"水",
		"木",
		"金",
		"土"
	];
	var initDatePicker = () => {
		const [year, month, day] = [
			"date_year",
			"date_month",
			"date_day"
		].map((id) => byId(id));
		if (!year || !month || !day) return null;
		const hidden = hideFrom(year);
		const box = document.createElement("span");
		box.className = "ene-date";
		box.innerHTML = "<input type=\"date\" required><span class=\"ene-weekday\"></span>";
		hidden.before(box);
		const input = box.querySelector("input");
		const weekday = box.querySelector(".ene-weekday");
		const years = [...year.options].map((o) => Number(o.value)).filter(Boolean);
		input.min = `${Math.min(...years)}-01-01`;
		input.max = `${Math.max(...years)}-12-31`;
		const refresh = () => {
			input.value = `${year.value}-${pad2(Number(month.value))}-${pad2(Number(day.value))}`;
			const w = new Date(Number(year.value), Number(month.value) - 1, Number(day.value)).getDay();
			weekday.textContent = `（${WEEKDAYS[w]}）`;
			weekday.dataset.day = String(w);
		};
		const set = ({ year: y, month: m, day: d }) => {
			if (![...year.options].some((o) => o.value === String(y))) return false;
			year.value = String(y);
			month.value = String(m);
			day.value = String(d);
			refresh();
			return true;
		};
		input.addEventListener("change", () => {
			const [y, m, d] = input.value.split("-").map(Number);
			if (!(y && set({
				year: y,
				month: m,
				day: d
			}))) refresh();
		});
		refresh();
		return {
			refresh,
			set
		};
	};
	var cache = new Map();
	var fetchEventDoc = (eventId) => {
		let doc = cache.get(eventId);
		if (!doc) {
			doc = fetch(`/events/${eventId}`, { credentials: "same-origin" }).then((res) => res.ok ? res.text() : null).then((html) => html ? parseHtml(html) : null).catch(() => null);
			cache.set(eventId, doc);
		}
		return doc;
	};
	var eventInfoCell = async (eventId, label) => {
		const doc = await fetchEventDoc(eventId);
		const head = doc && [...doc.querySelectorAll(".gb_events_info_table td")].find((td) => td.textContent?.trim() === label);
		return head ? head.nextElementSibling : null;
	};
	var CLOSED_RE = /閉館|閉店|閉校|閉鎖|閉場|移転/;
	var rankPlaces = (places, keyword) => {
		const kw = keyword.normalize("NFKC").toLowerCase();
		const score = (p) => {
			const name = p.place_name.normalize("NFKC").toLowerCase();
			const s = name === kw ? 0 : name.startsWith(kw) ? 1 : name.includes(kw) ? 2 : 3;
			return CLOSED_RE.test(p.place_name) ? s + 10 : s;
		};
		return places.map((p, i) => ({
			p,
			s: score(p),
			i
		})).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.p);
	};
	var RECENT_MAX = 10;
	var toPlace = (p) => ({
		id: String(p.id),
		name: p.place_name,
		prefecture: String(p.prefecture ?? ""),
		address: p.address ?? ""
	});
	var searchPlaces = async (keyword, prefecture = "") => {
		const params = new URLSearchParams({
			keyword,
			simple: "3",
			limit: "50"
		});
		if (prefecture) params.set("prefecture", prefecture);
		return (await (await fetch("/api/places/search?" + params, { credentials: "same-origin" })).json()).results ?? [];
	};
	var initPlacePicker = () => {
		const select = byId("places_list");
		const prefSelect = byId("prefecture_id");
		if (!select || !prefSelect) return null;
		const cell = select.closest("td");
		const prefNames = new Map([...prefSelect.options].filter((o) => o.value).map((o) => [o.value, o.text.replace(/\s*\(\d+\)\s*$/, "").trim()]));
		const placeSub = (p) => [prefNames.get(p.prefecture), p.address].filter(Boolean).join(" / ");
		for (const el of [
			prefSelect,
			select,
			byId("places_suggest"),
			cell.querySelector(".gb_suggest")
		]) {
			const target = el?.closest("p") ?? el;
			if (target instanceof HTMLElement) target.style.display = "none";
		}
		const box = document.createElement("div");
		box.className = "ene-place";
		box.innerHTML = `
    <div class="ene-place-current" style="display:none">
      <span class="ene-place-name"></span><span class="ene-place-sub"></span>
      <input type="button" class="btn btn-small" value="取り消す">
    </div>
    <div class="ene-place-search">
      <select></select>
      <input type="text" placeholder="会場名・住所で検索（例: Zepp、武道館、渋谷）" autocomplete="off">
    </div>
    <ul class="ene-place-results" style="display:none"></ul>
  `;
		cell.prepend(box);
		const current = box.querySelector(".ene-place-current");
		const input = box.querySelector(".ene-place-search input");
		const prefFilter = box.querySelector(".ene-place-search select");
		const results = box.querySelector(".ene-place-results");
		prefFilter.append(new Option("全国", ""), ...[...prefNames].map(([value, name]) => new Option(name, value)));
		let chosen = null;
		const applyToForm = () => {
			if (!chosen) {
				if (select.value || select.options.length !== 1) select.replaceChildren(new Option("選択してください", ""));
				return;
			}
			if (select.options.length === 1 && select.value === chosen.id && select.options[0].text === chosen.name) return;
			select.replaceChildren(new Option(chosen.name, chosen.id, true, true));
			if (prefNames.has(chosen.prefecture)) prefSelect.value = chosen.prefecture;
		};
		new MutationObserver(() => {
			if (select.options.length !== 1 || select.value !== (chosen?.id ?? "")) applyToForm();
		}).observe(select, { childList: true });
		const set = (place, remember = false) => {
			chosen = place;
			applyToForm();
			current.style.display = place ? "" : "none";
			if (!place) return;
			current.querySelector(".ene-place-name").textContent = place.name;
			current.querySelector(".ene-place-sub").textContent = placeSub(place);
			if (remember) save("recentPlaces", [place, ...load("recentPlaces", []).filter((p) => p.id !== place.id)].slice(0, RECENT_MAX));
		};
		current.querySelector("input").addEventListener("click", () => {
			set(null);
			input.focus();
		});
		let items = [];
		let active = -1;
		const closeResults = () => {
			results.style.display = "none";
			items = [];
			active = -1;
		};
		const heading = (text) => Object.assign(document.createElement("li"), {
			className: "ene-heading",
			textContent: text
		});
		const showResults = (places, head, emptyText = "") => {
			items = places.map((place) => {
				const li = document.createElement("li");
				if (CLOSED_RE.test(place.name)) li.className = "ene-closed";
				li.append(place.name, Object.assign(document.createElement("span"), {
					className: "ene-place-sub",
					textContent: placeSub(place)
				}));
				li.addEventListener("mousedown", (e) => {
					e.preventDefault();
					choose(place);
				});
				return {
					li,
					place
				};
			});
			active = -1;
			results.replaceChildren(...head ? [heading(head)] : [], ...places.length ? items.map((it) => it.li) : [heading(emptyText)]);
			results.style.display = "";
		};
		const setActive = (index) => {
			if (!items.length) return;
			active = (index + items.length) % items.length;
			items.forEach((it, i) => it.li.classList.toggle("ene-active", i === active));
			items[active].li.scrollIntoView({ block: "nearest" });
		};
		const choose = (place) => {
			set(place, true);
			input.value = "";
			closeResults();
		};
		let timer;
		let seq = 0;
		const search = async () => {
			const keyword = input.value.trim();
			if (!keyword) {
				const recent = load("recentPlaces", []);
				if (recent.length) showResults(recent, "最近使った会場");
				else closeResults();
				return;
			}
			const mySeq = ++seq;
			try {
				const places = rankPlaces(await searchPlaces(keyword, prefFilter.value), keyword).slice(0, 30);
				if (mySeq === seq && document.activeElement === input) showResults(places.map(toPlace), null, "見つかりませんでした");
			} catch {
				if (mySeq === seq) showResults([], null, "検索に失敗しました");
			}
		};
		input.addEventListener("input", () => {
			clearTimeout(timer);
			timer = setTimeout(search, 300);
		});
		input.addEventListener("focus", search);
		input.addEventListener("blur", () => setTimeout(closeResults, 100));
		prefFilter.addEventListener("change", () => {
			if (!input.value.trim()) return;
			input.focus();
			search();
		});
		input.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				setActive(active + (e.key === "ArrowDown" ? 1 : -1));
			} else if (e.key === "Enter") {
				e.preventDefault();
				const item = items[active] ?? (items.length === 1 ? items[0] : null);
				if (item) choose(item.place);
			} else if (e.key === "Escape") closeResults();
		});
		const initial = findInitialPlace();
		const loadInitial = async (eventId) => {
			if (!initial || chosen) return;
			const base = {
				id: initial.id,
				prefecture: initial.prefecture,
				address: ""
			};
			const stillInitial = () => chosen?.id === initial.id;
			set({
				...base,
				name: "読み込み中…"
			});
			const name = (eventId ? await eventInfoCell(eventId, "開催場所") : null)?.querySelector(`a[href$="/places/${initial.id}"]`)?.textContent?.trim();
			if (!stillInitial()) return;
			set({
				...base,
				name: name || `会場ID ${initial.id}`
			});
			if (!name) return;
			try {
				const found = (await searchPlaces(name, initial.prefecture)).find((p) => String(p.id) === initial.id);
				if (found && stillInitial()) set(toPlace(found));
			} catch {}
		};
		return {
			set,
			loadInitial
		};
	};
	var RESTORE_PARAM = "ene_restore";
	var FIELD_NAMES = [
		"event_name",
		"link",
		"description",
		"hashtag"
	];
	var SELECT_IDS = [
		"date_year",
		"date_month",
		"date_day",
		"open_time_hour",
		"open_time_minute",
		"start_time_hour",
		"start_time_minute",
		"end_time_hour",
		"end_time_minute"
	];
	var field = (form, name) => form.elements.namedItem(name);
	var selectById = (id) => byId(id);
	var takeSnapshot = (form) => {
		const option = selectById("places_list").selectedOptions[0];
		return {
			fields: Object.fromEntries(FIELD_NAMES.map((n) => [n, field(form, n).value])),
			selects: Object.fromEntries(SELECT_IDS.map((id) => [id, selectById(id).value])),
			actors: readSelectedActors(),
			prefecture: selectById("prefecture_id").value,
			place: option?.value ? {
				id: option.value,
				name: option.text
			} : null
		};
	};
	var restoreSnapshot = (form, snapshot, placePicker) => {
		FIELD_NAMES.forEach((n) => {
			field(form, n).value = snapshot.fields[n] ?? "";
		});
		SELECT_IDS.forEach((id) => {
			selectById(id).value = snapshot.selects[id] ?? "";
		});
		snapshot.actors.forEach(addActorIfMissing);
		selectById("prefecture_id").value = snapshot.prefecture;
		const { place } = snapshot;
		if (placePicker) placePicker.set(place && {
			...place,
			prefecture: snapshot.prefecture,
			address: ""
		});
		else if (snapshot.prefecture) {
			selectById("places_list").replaceChildren();
			page.searchPlaces(snapshot.prefecture, place?.id);
		} else if (place) selectById("places_list").append(new Option(place.name, place.id, true, true));
	};
	var initFormSnapshot = (placePicker) => {
		const form = byId("event_form");
		if (!form) return;
		form.addEventListener("submit", () => save("formSnapshot", takeSnapshot(form)));
		const params = new URLSearchParams(location.search);
		if (!params.has("ene_restore")) return;
		const snapshot = load("formSnapshot", null);
		if (snapshot) restoreSnapshot(form, snapshot, placePicker);
		params.delete(RESTORE_PARAM);
		history.replaceState(null, "", location.pathname + (params.size ? "?" + params : ""));
	};
	var initConfirmBackButton = () => {
		const submit = document.querySelector("form[action=\"/events/add/complete\"] input[type=\"submit\"]");
		if (!submit) return;
		const back = Object.assign(document.createElement("input"), {
			type: "button",
			className: "btn",
			value: "戻って修正する"
		});
		back.style.marginRight = "8px";
		back.addEventListener("click", () => {
			if (load("formSnapshot", null)) location.href = `/events/add?${RESTORE_PARAM}=1`;
			else history.back();
		});
		submit.before(back);
	};
	var PENDING_TTL_MS = 18e5;
	var SERVER_IMAGE_TYPES = [
		"image/jpeg",
		"image/png",
		"image/gif"
	];
	var S3_EVENT_IMAGE = "https://eventernote.s3.amazonaws.com/images/events/";
	var readAsDataUrl = (blob) => new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
	var loadImage = (src) => new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("画像を読み込めませんでした"));
		img.src = src;
	});
	var normalizeImage = async (file) => {
		const dataUrl = await readAsDataUrl(file);
		const name = file.name || "thumbnail";
		if (SERVER_IMAGE_TYPES.includes(file.type)) return {
			dataUrl,
			name,
			type: file.type
		};
		const img = await loadImage(dataUrl);
		const canvas = Object.assign(document.createElement("canvas"), {
			width: img.naturalWidth,
			height: img.naturalHeight
		});
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0);
		return {
			dataUrl: canvas.toDataURL("image/jpeg", .92),
			name: name.replace(/\.[^.]*$/, "") + ".jpg",
			type: "image/jpeg"
		};
	};
	var dataUrlToBlob = (dataUrl) => {
		const [header, base64] = dataUrl.split(",");
		const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
		return new Blob([bytes], { type: header.match(/data:([^;]+)/)[1] });
	};
	var firstImageFile = (files) => [...files ?? []].find((f) => f.type.startsWith("image/"));
	var createImageDrop = (onImage, onRemove) => {
		const wrap = document.createElement("div");
		wrap.innerHTML = `
    <div class="ene-drop" tabindex="0"></div>
    <input type="file" accept="image/*" style="display:none">
  `;
		const drop = wrap.querySelector(".ene-drop");
		const picker = wrap.querySelector("input");
		const clear = () => {
			drop.textContent = "ここに画像をドラッグ＆ドロップ / Ctrl+V で貼り付け / クリックしてファイルを選択";
		};
		const show = (dataUrl) => {
			const remove = Object.assign(document.createElement("input"), {
				type: "button",
				className: "btn btn-small",
				value: "画像を取り消す"
			});
			remove.addEventListener("click", (e) => {
				e.stopPropagation();
				onRemove();
				clear();
			});
			drop.replaceChildren(Object.assign(document.createElement("img"), { src: dataUrl }), remove);
		};
		const accept = async (file) => {
			if (!file) return;
			try {
				const image = await normalizeImage(file);
				onImage(image);
				show(image.dataUrl);
			} catch (err) {
				alert(err.message);
			}
		};
		drop.addEventListener("click", () => picker.click());
		picker.addEventListener("change", () => {
			accept(firstImageFile(picker.files));
			picker.value = "";
		});
		const hasFiles = (e) => !!e.dataTransfer?.types.includes("Files");
		drop.addEventListener("dragover", (e) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			drop.classList.add("ene-over");
		});
		drop.addEventListener("dragleave", () => drop.classList.remove("ene-over"));
		drop.addEventListener("drop", (e) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			drop.classList.remove("ene-over");
			accept(firstImageFile(e.dataTransfer.files));
		});
		document.addEventListener("dragover", (e) => {
			if (hasFiles(e)) e.preventDefault();
		});
		document.addEventListener("drop", (e) => {
			if (hasFiles(e)) e.preventDefault();
		});
		document.addEventListener("paste", (e) => {
			const file = firstImageFile(e.clipboardData?.files);
			if (!file) return;
			e.preventDefault();
			accept(file);
		});
		clear();
		return {
			element: wrap,
			show
		};
	};
	var initImagePicker = () => {
		const submit = document.querySelector("#event_form input[type=\"submit\"]");
		if (!submit) return;
		if (!new URLSearchParams(location.search).has("ene_restore")) save("draftImage", null);
		const row = document.createElement("tr");
		row.innerHTML = `
    <td>サムネイル画像</td>
    <td><p class="ene-image-note">登録完了後、イベント編集機能を使って自動でアップロードします。</p></td>
  `;
		submit.closest("tr").before(row);
		const picker = createImageDrop((image) => save("draftImage", image), () => save("draftImage", null));
		row.cells[1].prepend(picker.element);
		const draft = load("draftImage", null);
		if (draft) picker.show(draft.dataUrl);
	};
	var initEditImagePicker = () => {
		const input = document.querySelector("#event_form input[type=\"file\"][name=\"thumbnail_image\"]");
		if (!input) return;
		input.style.display = "none";
		const current = input.parentElement?.querySelector("img");
		if (current) {
			current.before(Object.assign(document.createElement("p"), {
				className: "ene-image-note",
				textContent: "現在の画像"
			}));
			current.style.display = "block";
			current.style.marginBottom = "10px";
		}
		const picker = createImageDrop((image) => {
			const transfer = new DataTransfer();
			transfer.items.add(new File([dataUrlToBlob(image.dataUrl)], image.name, { type: image.type }));
			input.files = transfer.files;
		}, () => {
			input.value = "";
		});
		picker.element.append(Object.assign(document.createElement("p"), {
			className: "ene-image-note",
			textContent: "新しい画像は「編集完了」を押すと保存されます。"
		}));
		input.after(picker.element);
	};
	var initConfirmImage = () => {
		const form = document.querySelector("form[action=\"/events/add/complete\"]");
		const image = load("draftImage", null);
		if (!form || !image) return;
		const row = document.createElement("tr");
		row.innerHTML = `
    <td>サムネイル画像</td>
    <td><img style="max-width:300px;max-height:200px"><br>
      <span class="s">登録完了後に自動でアップロードします</span></td>
  `;
		row.querySelector("img").src = image.dataUrl;
		form.querySelector("input[type=\"submit\"]").closest("tr").before(row);
		const value = (name) => form.elements.namedItem(name).value;
		form.addEventListener("submit", () => {
			save("pendingUpload", {
				image,
				eventName: value("event_name"),
				placeId: value("place_id"),
				createdAt: Date.now()
			});
		});
	};
	var candidateEventIds = () => {
		const ids = new Set();
		const m = location.pathname.match(/^\/events\/(\d+)\/?$/);
		if (m) ids.add(m[1]);
		if (location.pathname.startsWith("/events/add/complete")) for (const a of document.querySelectorAll(".page a[href]")) {
			const lm = a.getAttribute("href").match(/^(?:https?:\/\/www\.eventernote\.com)?\/events\/(\d+)\/?$/);
			if (lm) ids.add(lm[1]);
		}
		return [...ids];
	};
	var fetchEditForm = async (eventId) => {
		const res = await fetch(`/events/${eventId}/edit`, { credentials: "same-origin" });
		if (!res.ok) return null;
		const doc = parseHtml(await res.text());
		const form = doc.querySelector("#event_form");
		return form && {
			form,
			placeId: findInitialPlace(doc)?.id ?? ""
		};
	};
	var buildEditFormData = (form, placeId, image) => {
		const data = new FormData();
		for (const el of form.elements) {
			if (!el.name || el.disabled || el.name === "place_id") continue;
			if ([
				"file",
				"submit",
				"button",
				"reset",
				"image"
			].includes(el.type)) continue;
			if ((el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
			data.append(el.name, el.value);
		}
		data.append("place_id", placeId);
		data.append("thumbnail_image", dataUrlToBlob(image.dataUrl), image.name);
		return data;
	};
	var imageLastModified = async (url) => {
		try {
			const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
			return res.ok ? Date.parse(res.headers.get("Last-Modified") ?? "") || 0 : null;
		} catch {
			return null;
		}
	};
	var SITE_IMAGE_WAIT_MS = 6e4;
	var UPLOAD_LOCK_MS = 12e4;
	var waitForSiteImage = async (url) => {
		const deadline = Date.now() + SITE_IMAGE_WAIT_MS;
		while (Date.now() < deadline) {
			const lm = await imageLastModified(url);
			await sleep(2e3);
			if (lm !== null) return lm;
		}
		return null;
	};
	var processPendingUpload = async () => {
		const pending = load("pendingUpload", null);
		if (!pending) return;
		if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
			save("pendingUpload", null);
			return;
		}
		if (pending.uploadingAt && Date.now() - pending.uploadingAt < UPLOAD_LOCK_MS) return;
		for (const id of candidateEventIds()) {
			const edit = await fetchEditForm(id);
			if (!edit) continue;
			const { form, placeId } = edit;
			if (form.elements.namedItem("event_name").value.trim() !== pending.eventName.trim()) continue;
			if (pending.placeId && placeId !== pending.placeId) {
				save("pendingUpload", null);
				showNotice("会場情報を正しく読み取れなかったため、画像の自動アップロードを中止しました。イベント編集画面から手動で追加してください。", "error");
				return;
			}
			save("pendingUpload", {
				...pending,
				uploadingAt: Date.now()
			});
			const imageUrl = `${S3_EVENT_IMAGE}${id}_s.jpg`;
			const hasLink = !!form.elements.namedItem("link")?.value.trim();
			let siteImageAt = await imageLastModified(imageUrl);
			if (siteImageAt === null && hasLink) {
				const waiting = showNotice("サイトによる画像の自動生成を待っています。このページを開いたままお待ちください…");
				siteImageAt = await waitForSiteImage(imageUrl);
				waiting.remove();
			}
			try {
				const res = await fetch(form.getAttribute("action"), {
					method: "POST",
					body: buildEditFormData(form, placeId, pending.image),
					credentials: "same-origin"
				});
				if (!res.ok) throw new Error("HTTP " + res.status);
			} catch (err) {
				save("pendingUpload", null);
				showNotice(`画像のアップロードに失敗しました（${err.message}）。イベント編集画面から手動で追加してください。`, "error");
				return;
			}
			save("pendingUpload", null);
			let uploaded = false;
			for (let i = 0; i < 5 && !uploaded; i++) {
				const lm = await imageLastModified(imageUrl);
				uploaded = lm !== null && (siteImageAt === null || lm > siteImageAt);
				if (!uploaded) await sleep(2e3);
			}
			if (!uploaded) showNotice("画像を送信しましたが、反映を確認できませんでした。しばらくしてからイベントページを確認してください。", "error");
			else if (siteImageAt === null && hasLink) showNotice("サムネイル画像をアップロードしましたが、サイトの自動生成画像に置き換えられる可能性があります。しばらくしてからイベントページを確認してください。", "error");
			else {
				showNotice("サムネイル画像をアップロードしました。");
				if (/^\/events\/\d+\/?$/.test(location.pathname)) setTimeout(() => location.reload(), 1500);
			}
			return;
		}
	};
	var selects = (key) => ({
		hour: byId(`${key}_time_hour`),
		minute: byId(`${key}_time_minute`)
	});
	var initMinuteOptions = () => {
		for (const key of TIME_KEYS) {
			const { minute } = selects(key);
			if (!minute) continue;
			const current = minute.value;
			minute.replaceChildren(new Option("-", ""), ...Array.from({ length: 60 }, (_, m) => new Option(pad2(m), pad2(m))));
			minute.value = current;
		}
	};
	var restoreEditMinutes = async (eventId) => {
		const missing = TIME_KEYS.filter((key) => {
			const { hour, minute } = selects(key);
			return hour?.value && minute && !minute.value;
		});
		if (!missing.length) return;
		const text = (await eventInfoCell(eventId, "時間"))?.textContent ?? "";
		const failed = missing.filter((key) => {
			const { hour, minute } = selects(key);
			const m = text.match(new RegExp(TIME_LABELS[key] + String.raw`\s*(\d{1,2}):(\d{2})`));
			if (!m || Number(m[1]) !== Number(hour.value)) return true;
			minute.value = m[2];
			return false;
		});
		if (failed.length) showNotice(`${failed.map((k) => TIME_LABELS[k]).join("・")}の「分」を読み込めませんでした。編集完了の前に入力し直してください。`, "error");
	};
	var QUICK = {
		open: [["開演の30分前", -30], ["60分前", -60]],
		end: [["開演の2時間後", 120], ["3時間後", 180]]
	};
	var initSmartTime = () => {
		const rows = {};
		if (TIME_KEYS.some((k) => !selects(k).hour || !selects(k).minute)) return null;
		const readSelect = (key) => {
			const { hour, minute } = rows[key];
			return hour.value && minute.value ? {
				hour: Number(hour.value),
				minute: Number(minute.value)
			} : null;
		};
		const toMinutes = (t) => t ? t.hour * 60 + t.minute : null;
		const updateBadges = () => {
			const [open, start, end] = TIME_KEYS.map((k) => toMinutes(readSelect(k)));
			const nextDay = {
				open: false,
				start: open !== null && start !== null && start < open,
				end: end !== null && (start !== null && end < start || start === null && open !== null && end < open)
			};
			for (const k of TIME_KEYS) rows[k].badge.style.display = nextDay[k] ? "" : "none";
		};
		const setInvalid = (row, invalid) => {
			row.input.classList.toggle("ene-invalid", invalid);
			row.error.style.display = invalid ? "" : "none";
		};
		const showRow = (key) => {
			const row = rows[key];
			const t = readSelect(key);
			row.input.value = t ? formatTime(t) : row.hour.value ? row.hour.value + ":" : "";
			setInvalid(row, !t && !!row.hour.value);
		};
		const writeSelect = (key, t) => {
			rows[key].hour.value = t ? pad2(t.hour) : "";
			rows[key].minute.value = t ? pad2(t.minute) : "";
		};
		const setTime = (key, t) => {
			writeSelect(key, t);
			showRow(key);
			updateBadges();
		};
		const apply = (key, reformat) => {
			const t = parseTimeInput(rows[key].input.value);
			if (t === null) {
				setInvalid(rows[key], reformat);
				return;
			}
			const value = t === "empty" ? null : t;
			if (reformat) setTime(key, value);
			else {
				writeSelect(key, value);
				setInvalid(rows[key], false);
				updateBadges();
			}
		};
		for (const key of TIME_KEYS) {
			const { hour, minute } = selects(key);
			const hidden = hideFrom(hour);
			const box = document.createElement("span");
			box.className = "ene-time-row";
			box.innerHTML = `
      <input type="text" class="ene-time" placeholder="例: 18:30" autocomplete="off">
      <span class="ene-time-badge" style="display:none" title="日付をまたぐ時間として登録されます">翌日</span>
      <span class="ene-time-error" style="display:none">時間を認識できません</span>
    `;
			for (const [label, delta] of QUICK[key] ?? []) {
				const btn = Object.assign(document.createElement("input"), {
					type: "button",
					className: "btn btn-small",
					value: label
				});
				btn.addEventListener("click", () => {
					const t = readSelect("start");
					if (!t) {
						showNotice("先に開演時間を入力してください", "error");
						return;
					}
					const total = (t.hour * 60 + t.minute + delta + 1440) % 1440;
					setTime(key, {
						hour: Math.floor(total / 60),
						minute: total % 60
					});
				});
				box.append(btn);
			}
			hidden.before(box);
			const input = box.querySelector("input.ene-time");
			rows[key] = {
				hour,
				minute,
				input,
				badge: box.querySelector(".ene-time-badge"),
				error: box.querySelector(".ene-time-error")
			};
			input.addEventListener("input", () => apply(key, false));
			input.addEventListener("change", () => apply(key, true));
			onEnter(input, () => apply(key, true));
		}
		byId("event_form").addEventListener("submit", (e) => {
			TIME_KEYS.forEach((k) => apply(k, true));
			const bad = TIME_KEYS.filter((k) => rows[k].input.classList.contains("ene-invalid"));
			if (!bad.length) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			alert(bad.map((k) => TIME_LABELS[k]).join("・") + "の時間を正しく入力してください");
			rows[bad[0]].input.focus();
		}, true);
		const refresh = () => {
			TIME_KEYS.forEach(showRow);
			updateBadges();
		};
		refresh();
		return {
			refresh,
			setTime
		};
	};
	var path = location.pathname.replace(/\/$/, "");
	var editId = path.match(/^\/events\/(\d+)\/edit$/)?.[1];
	if (path === "/events/add/confirm") {
		initConfirmBackButton();
		initConfirmImage();
	} else if (path === "/events/add") {
		initMinuteOptions();
		initActorSorting();
		initActorPresets();
		const placePicker = initPlacePicker();
		initFormSnapshot(placePicker);
		placePicker?.loadInitial(new URLSearchParams(location.search).get("from_event_id"));
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
	} else processPendingUpload();
})();
