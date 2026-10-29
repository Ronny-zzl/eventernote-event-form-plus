// ==UserScript==
// @name               Eventernote イベント登録エンハンサー
// @name:ja            Eventernote イベント登録エンハンサー
// @name:zh-CN         Eventernote 活动登录增强
// @name:en            Eventernote Add Event Enhancer
// @namespace          https://github.com/Ronny-zzl/eventernote-event-form-plus
// @version            0.5.2
// @author             Ronny-zzl
// @description        イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、出演者のまとめて追加、重複登録の確認、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:ja     イベンターノートのイベント登録・編集画面を使いやすくします：会場検索、出演者のまとめて追加、重複登録の確認、時間入力の改善、出演者の並び替え、出演者セット、確認画面からの戻る、サムネイル画像の追加
// @description:zh-CN  改善 Eventernote 活动登录和编辑页面：会场搜索、批量添加出演者、重复登录提醒、时间输入改进、出演者排序、出演者组合、从确认页返回修改、添加缩略图
// @description:en     Improves the Eventernote event add/edit forms: venue search, bulk-add performers, duplicate warnings, smarter time input, reorder performers, performer sets, back button on the confirm page, thumbnail images
// @license            MIT
// @icon               https://www.google.com/s2/favicons?sz=64&domain=eventernote.com
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
	_css("#selected_actors{margin-left:0;list-style:none}#selected_actors li.ene-actor{background:#fff;border:1px solid #ddd;border-radius:3px;align-items:center;gap:6px;margin-bottom:2px;padding:3px 6px;display:flex}#selected_actors li.ene-dragging{opacity:.4}#selected_actors .ene-handle{cursor:grab;color:#999;-webkit-user-select:none;user-select:none}#selected_actors .ene-name{flex:1}#selected_actors .ene-move{cursor:pointer;color:#08c;-webkit-user-select:none;user-select:none;padding:0 2px}#selected_actors li.ene-selected{background:#eef6fb;border-color:#9cc6e0}#selected_actors .ene-check{margin:0}.ene-actor-tools{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;display:flex}.ene-actor-tools label{align-items:center;gap:4px;margin:0;display:inline-flex}.ene-actor-tools label input{margin:0}.ene-actor-tools .btn{margin-bottom:0}.ene-presets{flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px;padding:0;display:flex}.ene-presets select{flex:200px;width:auto;min-width:0}.ene-time-row{flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px;display:flex}.ene-time-row input.ene-time{width:70px;margin-bottom:0}.ene-time-row input.ene-time.ene-invalid{background:#fdf0f0;border-color:#b94a48}.ene-time-row .btn{margin-bottom:0}.ene-time-badge{color:#fff;background:#f89406;border-radius:3px;padding:1px 5px;font-size:11px}.ene-time-error{color:#b94a48;font-size:11px}.ene-search{margin-bottom:8px;position:relative}.ene-search-row{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ene-search-row select{width:auto;margin-bottom:0}.ene-search-row input[type=text]{flex:1;min-width:160px;margin-bottom:0}.ene-suggest{z-index:1000;background:#fff;border:1px solid #ccc;border-radius:3px;max-height:360px;margin:2px 0 0;padding:0;list-style:none;position:absolute;left:0;right:0;overflow-y:auto;box-shadow:0 4px 12px #00000026}.ene-suggest li{cursor:pointer;border-bottom:1px solid #f0f0f0;padding:5px 8px;position:relative}.ene-suggest li.ene-active{background:#eef6fb}.ene-suggest li.ene-dim{opacity:.5}.ene-suggest li.ene-done{color:#999;cursor:default;padding-right:72px}.ene-suggest li.ene-done:after{content:\"追加済み\";border:1px solid #ccc;border-radius:3px;padding:1px 6px;font-size:11px;position:absolute;top:50%;right:8px;transform:translateY(-50%)}.ene-suggest li.ene-heading{cursor:default;color:#888;background:#f7f7f7;font-size:11px}.ene-suggest .ene-suggest-sub{color:#888;font-size:11px;display:block}.ene-place-current{background:#fff;border:1px solid #ddd;border-radius:3px;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;padding:6px 8px;display:flex}.ene-place-current .ene-place-name{font-weight:700}.ene-place-current .ene-place-sub{color:#888;flex:1;font-size:11px}.ene-place-current .btn{margin-bottom:0}.ene-drop{text-align:center;color:#888;cursor:pointer;background:#fafafa;border:2px dashed #bbb;border-radius:4px;padding:14px}.ene-drop.ene-over{color:#08c;background:#eef6fb;border-color:#08c}.ene-drop img{max-width:300px;max-height:200px;margin:0 auto 6px;display:block}.ene-image-note{color:#888;margin-top:4px;font-size:11px}.ene-notice{z-index:10000;color:#3c763d;background:#dff0d8;border:1px solid #d6e9c6;border-radius:4px;max-width:360px;padding:10px 14px;font-size:13px;position:fixed;top:60px;right:20px;box-shadow:0 2px 8px #0003}.ene-notice.ene-error{color:#a94442;background:#f2dede;border-color:#ebccd1}.ene-notice .ene-close{float:right;cursor:pointer;margin-left:10px}.ene-announce{width:95%;margin-bottom:0}.ene-announce-result{flex-wrap:wrap;align-items:center;gap:4px 16px;margin:6px 0 0;display:flex}.ene-announce-result[hidden]{display:none}.ene-announce-result .btn{margin-bottom:0}.ene-date{align-items:center;gap:6px;display:inline-flex}.ene-date input{width:auto;margin-bottom:0}.ene-weekday[data-day=\"0\"]{color:#c00}.ene-weekday[data-day=\"6\"]{color:#06c}.ene-draft{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ene-draft .btn{margin-bottom:0}.ene-duplicate{color:#8a6d3b;background:#fcf8e3;border:1px solid #fbeed5;border-radius:4px;margin:8px 0;padding:8px 12px}.ene-duplicate[hidden]{display:none}.ene-duplicate ul{margin:4px 0 0 20px;padding:0}.ene-sp input.btn{color:#007aff;-webkit-appearance:none;background:#fff;border:1px solid #007aff;border-radius:0;height:30px;margin:2px 0;padding:0 10px;font-size:14px}.ene-sp .ene-time-row input.ene-time{width:80px}.ene-sp .ene-drop img{max-width:100%}.ene-sp .ene-notice{max-width:none;left:10px;right:10px}.ene-modal{z-index:10001;background:#00000073;justify-content:center;align-items:center;padding:16px;display:none;position:fixed;inset:0}.ene-modal.ene-open{display:flex}.ene-modal-box{background:#fff;border-radius:6px;flex-direction:column;width:100%;max-width:720px;max-height:100%;font-size:13px;display:flex;box-shadow:0 6px 24px #0000004d}.ene-modal-head{border-bottom:1px solid #ddd;padding:10px 14px;font-size:15px;font-weight:700}.ene-modal-close{float:right;cursor:pointer;color:#888;font-size:20px;line-height:1}.ene-modal-body{flex:1;padding:10px 14px;overflow-y:auto}.ene-modal-body textarea{box-sizing:border-box;width:100%;margin-bottom:6px}.ene-modal-foot{border-top:1px solid #ddd;justify-content:flex-end;gap:8px;padding:10px 14px;display:flex}.ene-modal-foot .btn{margin-bottom:0}.ene-bulk-bar{flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px;display:flex}.ene-bulk-bar .btn{margin-bottom:0}.ene-bulk-bar label{align-items:center;gap:4px;margin:0;display:inline-flex}.ene-bulk-bar label input{margin:0}.ene-bulk-summary{color:#666;flex:1;font-size:12px}.ene-bulk-list{margin:0;padding:0;list-style:none}.ene-bulk-row[hidden]{display:none}.ene-bulk-row{border-bottom:1px solid #f0f0f0;align-items:flex-start;gap:8px;padding:6px 4px;display:flex}.ene-bulk-row>input{margin:3px 0 0}.ene-bulk-main{flex:1;min-width:0}.ene-bulk-name{font-weight:700}.ene-bulk-result{color:#555}.ene-bulk-result .ene-suggest-sub{color:#888;margin-left:8px;font-size:11px}.ene-bulk-result select{max-width:100%;margin:2px 0 0}.ene-bulk-result .btn{margin:0 0 0 4px}.ene-bulk-badge{color:#666;background:#eee;border-radius:3px;flex:none;padding:1px 6px;font-size:11px}.ene-bulk-row[data-status=exact] .ene-bulk-badge{color:#3c763d;background:#dff0d8}.ene-bulk-row[data-status=multiple] .ene-bulk-badge,.ene-bulk-row[data-status=candidates] .ene-bulk-badge{color:#8a6d3b;background:#fcf8e3}.ene-bulk-row[data-status=none] .ene-bulk-badge,.ene-bulk-row[data-status=error] .ene-bulk-badge{color:#a94442;background:#f2dede}.ene-bulk-row[data-status=added]{opacity:.6}.ene-sp .ene-modal{padding:0}.ene-sp .ene-modal-box{border-radius:0;height:100%}.ene-bulk-research{gap:4px;margin-top:4px;display:flex}.ene-bulk-research input[type=text]{flex:1;min-width:0;margin:0}.ene-bulk-research .btn{margin:0}input.ene-ctl[type],select.ene-ctl{box-sizing:border-box;vertical-align:middle;height:30px;margin:0}.ene-sp input.ene-ctl[type],.ene-sp select.ene-ctl{height:36px;margin:0;font-size:14px}.ene-sp input.ene-ctl[type=text],.ene-sp select.ene-ctl{background:#fff;border:1px solid #aaa;padding:0 6px}#selected_actors+.ene-search{margin-top:6px}");
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
	var isSmartphone = () => !!document.querySelector("link[href*=\"smartphone.css\"]");
	var usesHeadRows = (row) => !!row.closest("table")?.querySelector("th");
	var fieldStart = (row) => {
		const prev = row.previousElementSibling;
		return usesHeadRows(row) && prev?.querySelector("th") ? prev : row;
	};
	var insertField = (before, label) => {
		const cell = document.createElement("td");
		if (usesHeadRows(before)) {
			const head = document.createElement("tr");
			const body = document.createElement("tr");
			head.append(Object.assign(document.createElement("th"), { textContent: label }));
			body.append(cell);
			before.before(head, body);
		} else {
			const row = document.createElement("tr");
			row.append(Object.assign(document.createElement("td"), { textContent: label }), cell);
			before.before(row);
		}
		return cell;
	};
	var decodeEntities = (text) => text.includes("&") ? parseHtml(text).body.textContent ?? text : text;
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
		const name = li.querySelector(".ene-name")?.textContent ?? decodeEntities([...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(""));
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
	var initActorList = () => {
		const list = byId("selected_actors");
		if (!list || !byId("actor_ids")) return;
		const rows = () => [...list.children];
		const isSelected = (li) => li.classList.contains("ene-selected");
		const selected = () => rows().filter(isSelected);
		const tools = document.createElement("div");
		tools.className = "ene-actor-tools";
		tools.innerHTML = `
    <label><input type="checkbox"> <span></span></label>
    <span>
      <input type="button" class="btn ene-ctl" value="▲" title="選択した出演者を上へ">
      <input type="button" class="btn ene-ctl" value="▼" title="選択した出演者を下へ">
      <input type="button" class="btn ene-ctl" value="削除" title="選択した出演者を削除">
    </span>
  `;
		list.before(tools);
		const [all, upBtn, downBtn, deleteBtn] = tools.querySelectorAll("input");
		const label = tools.querySelector("label span");
		const actions = tools.querySelector(":scope > span");
		const update = () => {
			const n = selected().length;
			const total = rows().length;
			tools.style.display = total ? "" : "none";
			all.checked = n > 0 && n === total;
			all.indeterminate = n > 0 && n < total;
			label.textContent = n ? `${n}名選択中` : "すべて選択";
			actions.style.visibility = n ? "" : "hidden";
		};
		const select = (li, on) => {
			li.classList.toggle("ene-selected", on);
			li.querySelector(".ene-check").checked = on;
		};
		const move = (targets, delta) => {
			if (delta < 0) for (const li of targets) {
				const prev = li.previousElementSibling;
				if (prev && !targets.includes(prev)) prev.before(li);
			}
			else for (const li of [...targets].reverse()) {
				const next = li.nextElementSibling;
				if (next && !targets.includes(next)) next.after(li);
			}
			syncActorOrder();
		};
		const decorate = (li) => {
			if (li.classList.contains("ene-actor")) return;
			li.classList.add("ene-actor");
			const check = Object.assign(document.createElement("input"), {
				type: "checkbox",
				className: "ene-check"
			});
			const name = document.createElement("span");
			name.className = "ene-name";
			const texts = [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE);
			name.textContent = decodeEntities(texts.map((n) => n.textContent).join(""));
			texts.forEach((n) => n.remove());
			const up = control("▲", "上へ", "ene-move");
			const down = control("▼", "下へ", "ene-move");
			up.addEventListener("click", () => move([li], -1));
			down.addEventListener("click", () => move([li], 1));
			const handle = control("☰", "ドラッグで並び替え", "ene-handle");
			handle.draggable = true;
			li.prepend(check, handle, name, up, down);
		};
		let anchor = null;
		list.addEventListener("click", (e) => {
			const check = e.target;
			const li = check.classList.contains("ene-check") ? check.closest("li.ene-actor") : null;
			if (!li) return;
			const on = check.checked;
			if (e.shiftKey && anchor?.parentElement === list) {
				const r = rows();
				const [from, to] = [r.indexOf(anchor), r.indexOf(li)].sort((a, b) => a - b);
				r.slice(from, to + 1).forEach((x) => select(x, true));
			} else select(li, on);
			anchor = li;
			update();
		});
		all.addEventListener("change", () => {
			rows().forEach((li) => select(li, all.checked));
			update();
		});
		upBtn.addEventListener("click", () => move(selected(), -1));
		downBtn.addEventListener("click", () => move(selected(), 1));
		deleteBtn.addEventListener("click", () => {
			const targets = selected();
			if (targets.length > 1 && !confirm(`選択した${targets.length}名を削除しますか？`)) return;
			targets.forEach((li) => page.removeActor(actorId(li)));
		});
		let group = [];
		const actorAt = (e) => e.target.closest?.("li.ene-actor") ?? null;
		list.addEventListener("dragstart", (e) => {
			const li = actorAt(e);
			if (!li) return;
			group = isSelected(li) ? selected() : [li];
			group.forEach((x) => x.classList.add("ene-dragging"));
			e.dataTransfer.setDragImage(li, 0, 0);
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", li.id);
		});
		list.addEventListener("dragover", (e) => {
			if (!group.length) return;
			e.preventDefault();
			const over = actorAt(e);
			if (!over || group.includes(over)) return;
			const rect = over.getBoundingClientRect();
			if (e.clientY > rect.top + rect.height / 2) over.after(...group);
			else over.before(...group);
		});
		list.addEventListener("drop", (e) => {
			if (group.length) e.preventDefault();
		});
		list.addEventListener("dragend", () => {
			if (!group.length) return;
			group.forEach((x) => x.classList.remove("ene-dragging"));
			group = [];
			syncActorOrder();
		});
		const refresh = () => {
			rows().forEach(decorate);
			update();
		};
		new MutationObserver(refresh).observe(list, { childList: true });
		refresh();
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
    <select class="ene-ctl"></select>
    <input type="button" class="btn ene-ctl" value="追加" title="選んだセットの出演者を追加します">
    <input type="button" class="btn ene-ctl" value="現在の出演者を保存" title="今リストにいる出演者をセットとして保存します">
    <input type="button" class="btn ene-ctl" value="削除" title="選んだセットを削除します">
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
	var normalize$1 = (s) => s.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
	var withoutParens$1 = (t) => t.replace(/\([^()]*\)|【[^【】]*】/g, "").trim();
	var rankActors = (actors, keyword) => {
		const kw = normalize$1(keyword);
		const match = (text = "") => {
			const t = normalize$1(text);
			return t === kw || withoutParens$1(t) === kw ? 0 : t.startsWith(kw) ? 1 : t.includes(kw) ? 2 : 3;
		};
		return actors.map((a, i) => ({
			a,
			s: Math.min(match(a.name), match(a.kana)),
			i
		})).sort((x, y) => x.s - y.s || (y.a.favorite_count ?? 0) - (x.a.favorite_count ?? 0) || x.i - y.i).map((x) => x.a);
	};
	var nameContains = (name, keyword) => normalize$1(name).includes(normalize$1(keyword));
	var mergeMissingNames = (first, all, keyword) => {
		const have = new Set(first.map((a) => String(a.id)));
		return [...first, ...all.filter((a) => !have.has(String(a.id)) && nameContains(a.name, keyword))];
	};
	var SLASH = /／|\s+\/\s*|\s*\/\s+/;
	var SEPARATOR = new RegExp(String.raw`\r?\n|${SLASH.source}`);
	var SEPARATOR_WITH_COMMA = new RegExp(String.raw`${SEPARATOR.source}|[、，,]`);
	var HEADING$1 = /^[<＜〈《].*[>＞〉》]$/;
	var BULLET = /^[・●■◆◇○*\-－]\s*/;
	var AND_MORE = /^(and\s*more|ほか|他|etc\.?)[!！.。…]*$/i;
	var splitNames = (text) => {
		const names = text.split(SLASH.test(text) ? SEPARATOR : SEPARATOR_WITH_COMMA).map((s) => s.trim().replace(BULLET, "").trim()).filter((s) => s && !HEADING$1.test(s) && !AND_MORE.test(s));
		return [...new Set(names)];
	};
	var STARS = /[★☆⭐🌟✩✪✫✬✭✮✯✰]/gu;
	var HEARTS = /[♡♥❤💕💖💗]/gu;
	var VARIATION = /[︀-️]/g;
	var normalize = (s) => s.normalize("NFKC").toLowerCase().replace(/[︀-️​-‍]/g, "").replace(/\s+/g, "").replace(/[‘’`´′]/g, "'").replace(/[“”″]/g, "\"").replace(STARS, "☆").replace(/[〜~～]/g, "~").replace(HEARTS, "♡").replace(/♯/g, "#");
	var withoutParens = (s) => {
		let t = s.normalize("NFKC");
		for (let prev = ""; prev !== t;) [prev, t] = [t, t.replace(/\([^()]*\)|【[^【】]*】/g, "")];
		return t.trim();
	};
	var fallbackQueries = (name) => {
		const base = name.normalize("NFKC").replace(VARIATION, "").trim();
		const longestWord = base.split(/[^\p{L}\p{N}]+/u).sort((a, b) => b.length - a.length)[0] ?? "";
		const queries = [
			base,
			base.replace(STARS, "☆").replace(HEARTS, "♡"),
			base.replace(STARS, "★").replace(HEARTS, "♥"),
			base.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96)),
			withoutParens(base),
			base.replace(/'/g, "’"),
			base.replace(/[‘’]/g, "'"),
			longestWord
		];
		return [...new Set(queries.map((q) => q.trim()))].filter((q) => q.length >= 2 && q !== name.trim());
	};
	var byFavorite = (a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0);
	var matchActor = (input, results) => {
		const full = normalize(input);
		const short = normalize(withoutParens(input));
		let exact = results.filter((a) => normalize(a.name) === full);
		if (!exact.length) exact = results.filter((a) => [normalize(a.name), normalize(withoutParens(a.name))].some((v) => v && (v === full || v === short)));
		if (exact.length === 1) return {
			status: "exact",
			candidates: exact
		};
		if (exact.length > 1) return {
			status: "multiple",
			candidates: exact.sort(byFavorite)
		};
		if (results.length) return {
			status: "candidates",
			candidates: rankActors(results, input).slice(0, 5)
		};
		return {
			status: "none",
			candidates: []
		};
	};
	var createSuggest = ({ input, list, search, idle, choose, keepOpen, emptyText }) => {
		let items = [];
		let active = -1;
		let controller;
		const heading = (text) => Object.assign(document.createElement("li"), {
			className: "ene-heading",
			textContent: text
		});
		const close = () => {
			list.style.display = "none";
			items = [];
			active = -1;
		};
		const pick = (entry) => {
			if (entry.item.done) return;
			choose(entry.item.value);
			input.dataset.picked = "1";
			if (!keepOpen) {
				input.value = "";
				close();
				return;
			}
			entry.item.done = true;
			entry.li.classList.add("ene-done");
		};
		const show = (entries, head, empty = emptyText) => {
			items = entries.map((item) => {
				const li = document.createElement("li");
				li.classList.toggle("ene-dim", !!item.dim);
				li.classList.toggle("ene-done", !!item.done);
				li.append(item.title, Object.assign(document.createElement("span"), {
					className: "ene-suggest-sub",
					textContent: item.sub ?? ""
				}));
				return {
					li,
					item
				};
			});
			items.forEach((entry) => entry.li.addEventListener("mousedown", (e) => {
				e.preventDefault();
				pick(entry);
			}));
			active = -1;
			list.replaceChildren(...head ? [heading(head)] : [], ...items.length ? items.map((it) => it.li) : [heading(empty)]);
			list.style.display = "";
		};
		const setActive = (index) => {
			if (!items.length) return;
			active = (index + items.length) % items.length;
			items.forEach((it, i) => it.li.classList.toggle("ene-active", i === active));
			items[active].li.scrollIntoView({ block: "nearest" });
		};
		const run = async () => {
			controller?.abort();
			const keyword = input.value.trim();
			if (!keyword) {
				const content = idle();
				if (content?.items.length) show(content.items, content.heading);
				else close();
				return;
			}
			const mine = controller = new AbortController();
			await sleep(300);
			if (mine.signal.aborted) return;
			if (list.style.display === "none" || !items.length) show([], void 0, "検索中…");
			try {
				const found = await search(keyword, mine.signal);
				if (!mine.signal.aborted && document.activeElement === input) show(found);
			} catch {
				if (!mine.signal.aborted) show([], void 0, "検索に失敗しました");
			}
		};
		input.addEventListener("input", () => {
			delete input.dataset.picked;
			run();
		});
		input.addEventListener("focus", run);
		input.addEventListener("blur", () => {
			controller?.abort();
			setTimeout(close, 100);
		});
		input.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				setActive(active + (e.key === "ArrowDown" ? 1 : -1));
			} else if (e.key === "Enter") {
				e.preventDefault();
				const entry = items[active] ?? (items.length === 1 ? items[0] : void 0);
				if (entry) pick(entry);
			} else if (e.key === "Escape") close();
		});
		close();
		return { run };
	};
	var RECENT_MAX$1 = 20;
	var cache$2 = new Map();
	var FIRST_LIMIT = 50;
	var fetchActors = (keyword, simple, limit) => fetch("/api/actors/search?" + new URLSearchParams({
		keyword,
		simple,
		limit: String(limit)
	}), { credentials: "same-origin" }).then((res) => res.json());
	var fetchWithMissingNames = async (keyword) => {
		const first = await fetchActors(keyword, "3", FIRST_LIMIT);
		const results = first.results ?? [];
		if ((first.info?.total ?? 0) <= results.length) return results;
		return mergeMissingNames(results, (await fetchActors(keyword, "1", 1e3)).results ?? [], keyword);
	};
	var searchActors = (keyword, fresh = false) => {
		if (fresh) cache$2.delete(keyword);
		let result = cache$2.get(keyword);
		if (!result) {
			result = fetchWithMissingNames(keyword);
			result.catch(() => cache$2.delete(keyword));
			cache$2.set(keyword, result);
		}
		return result;
	};
	var searchWithFallback = async (name, search = searchActors) => {
		for (const keyword of [name, ...fallbackQueries(name)]) {
			const results = await search(keyword);
			if (results.length) return {
				keyword,
				results
			};
		}
		return {
			keyword: name,
			results: []
		};
	};
	var initActorSearch = () => {
		const list = byId("selected_actors");
		const initial = byId("actors_initial");
		if (!list || !initial || typeof page.addActor !== "function") return;
		const cell = list.closest("td");
		for (const el of [
			initial,
			byId("actors_list"),
			byId("actors_suggest"),
			cell.querySelector(".gb_suggest")
		]) {
			const target = el?.closest("p") ?? el;
			if (target instanceof HTMLElement) target.style.display = "none";
		}
		const box = document.createElement("div");
		box.className = "ene-search";
		box.innerHTML = `
    <div class="ene-search-row">
      <input type="text" class="ene-ctl" placeholder="名前・よみがなで検索して追加（例: 水樹奈々、みずきなな）" autocomplete="off">
    </div>
    <ul class="ene-suggest"></ul>
  `;
		list.after(box);
		const added = (id) => !!byId(`actor_${id}`);
		const toItem = (actor, sub = "") => ({
			value: actor,
			title: actor.name,
			sub,
			done: added(actor.id)
		});
		createSuggest({
			input: box.querySelector("input"),
			list: box.querySelector(".ene-suggest"),
			search: async (input) => {
				const { keyword, results } = await searchWithFallback(input);
				return rankActors(results, keyword).slice(0, 30).map((a) => toItem({
					id: String(a.id),
					name: a.name
				}, [a.kana, a.favorite_count ? `♡${a.favorite_count}` : ""].filter(Boolean).join(" · ")));
			},
			idle: () => ({
				heading: "最近追加した出演者",
				items: load("recentActors", []).map((a) => toItem(a))
			}),
			choose: (actor) => {
				addActorIfMissing(actor);
				save("recentActors", [actor, ...load("recentActors", []).filter((a) => a.id !== actor.id)].slice(0, RECENT_MAX$1));
			},
			keepOpen: true,
			emptyText: "見つかりませんでした"
		});
	};
	var CONCURRENCY = 4;
	var BADGES = {
		pending: "検索中",
		exact: "一致",
		multiple: "同名あり",
		candidates: "候補のみ",
		none: "見つかりません",
		error: "失敗",
		added: "追加済み"
	};
	var NEEDS_REVIEW = [
		"multiple",
		"candidates",
		"none",
		"error"
	];
	var actorSub = (a) => [a.kana, a.favorite_count ? `♡${a.favorite_count}` : ""].filter(Boolean).join(" · ");
	var isAdded = (a) => !!byId(`actor_${a.id}`);
	var el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
	var searchWithRetry = async (keyword, fresh = false) => {
		try {
			return await searchActors(keyword, fresh);
		} catch {
			await sleep(1500);
			return searchActors(keyword);
		}
	};
	var initActorBulk = () => {
		const row = document.querySelector("#selected_actors ~ .ene-search .ene-search-row");
		if (!row || typeof page.addActor !== "function") return;
		const modal = el("div", { className: "ene-modal" });
		modal.innerHTML = `
    <div class="ene-modal-box" role="dialog" aria-modal="true" aria-label="出演者をまとめて追加">
      <div class="ene-modal-head">出演者をまとめて追加<span class="ene-modal-close" title="閉じる">×</span></div>
      <div class="ene-modal-body">
        <textarea rows="5" placeholder="出演者の名簿を貼り付けてください（「 / 」や改行で区切られたもの）"></textarea>
        <div class="ene-bulk-bar">
          <input type="button" class="btn btn-small" value="検索する">
          <span class="ene-bulk-summary"></span>
          <label><input type="checkbox"> 要確認のみ表示</label>
        </div>
        <ul class="ene-bulk-list"></ul>
      </div>
      <div class="ene-modal-foot">
        <input type="button" class="btn btn-small" value="閉じる">
        <input type="button" class="btn btn-small btn-primary" disabled>
      </div>
    </div>
  `;
		document.body.append(modal);
		const textarea = modal.querySelector("textarea");
		const [searchBtn, filter, closeBtn, addBtn] = modal.querySelectorAll(".ene-bulk-bar input, .ene-modal-foot input");
		const list = modal.querySelector(".ene-bulk-list");
		const summary = modal.querySelector(".ene-bulk-summary");
		let rows = [];
		let run = 0;
		const open = () => {
			modal.classList.add("ene-open");
			if (!rows.length) textarea.focus();
		};
		const close = () => modal.classList.remove("ene-open");
		const updateSummary = () => {
			const count = (statuses) => rows.filter((r) => statuses.includes(r.status)).length;
			const pending = count(["pending"]);
			summary.textContent = rows.length ? `${rows.length}名${pending ? `（検索中 ${rows.length - pending} / ${rows.length}）` : ""}：一致 ${count(["exact"])}・要確認 ${count([
				"multiple",
				"candidates",
				"error"
			])}・見つからない ${count(["none"])}・追加済み ${count(["added"])}` : "";
			const checked = rows.filter((r) => r.check.checked && r.chosen).length;
			addBtn.value = `チェックした ${checked} 名を追加`;
			addBtn.disabled = !checked;
		};
		const render = (r) => {
			r.li.dataset.status = r.status;
			r.li.hidden = filter.checked && !NEEDS_REVIEW.includes(r.status);
			const badge = r.li.querySelector(".ene-bulk-badge");
			badge.textContent = BADGES[r.status];
			const result = r.li.querySelector(".ene-bulk-result");
			result.replaceChildren();
			r.check.disabled = !r.chosen || r.status === "added";
			if (r.status === "pending") result.append("検索中…");
			else if (r.status === "error") result.append("検索に失敗しました");
			else if (r.status === "none") result.append("見つかりませんでした ", el("a", {
				href: "/actors/add",
				target: "_blank",
				textContent: "→登録する"
			}));
			else if (r.status === "exact" || r.status === "added") result.append(r.chosen.name, el("span", {
				className: "ene-suggest-sub",
				textContent: actorSub(r.chosen)
			}));
			else {
				const select = el("select");
				select.append(new Option("選んでください", ""), ...r.candidates.map((a, i) => new Option(`${a.name}${actorSub(a) ? `（${actorSub(a)}）` : ""}${isAdded(a) ? "［追加済み］" : ""}`, String(i), false, a === r.chosen)));
				select.addEventListener("change", () => {
					r.chosen = r.candidates[Number(select.value)] ?? null;
					r.check.checked = !!r.chosen && !isAdded(r.chosen);
					r.check.disabled = !r.chosen;
					updateSummary();
				});
				result.append(select);
			}
			if (NEEDS_REVIEW.includes(r.status)) {
				const box = el("div", { className: "ene-bulk-research" });
				const input = el("input", {
					type: "text",
					value: r.keyword
				});
				const button = el("input", {
					type: "button",
					className: "btn btn-small",
					value: "再検索"
				});
				const go = () => input.value.trim() && lookup(r, run, input.value.trim());
				button.addEventListener("click", go);
				input.addEventListener("keydown", (e) => {
					if (e.key !== "Enter") return;
					e.preventDefault();
					go();
				});
				box.append(input, button);
				result.append(box);
			}
			updateSummary();
		};
		const lookup = async (r, myRun, keyword) => {
			r.status = "pending";
			if (keyword) r.keyword = keyword;
			render(r);
			try {
				const results = keyword ? await searchWithRetry(keyword, true) : (await searchWithFallback(r.name, searchWithRetry)).results;
				if (myRun !== run) return;
				const match = matchActor(r.name, results);
				r.candidates = keyword && match.status === "candidates" ? rankActors(results, keyword).slice(0, 5) : match.candidates;
				const only = match.status === "candidates" && r.candidates.length === 1;
				r.chosen = match.status === "exact" || only ? r.candidates[0] : null;
				r.status = match.status === "exact" && isAdded(r.chosen) ? "added" : match.status;
				r.check.checked = !!r.chosen && r.status !== "added" && !isAdded(r.chosen);
			} catch {
				if (myRun !== run) return;
				r.status = "error";
			}
			render(r);
		};
		const search = async () => {
			const names = splitNames(textarea.value);
			if (!names.length) return;
			const myRun = ++run;
			rows = names.map((name) => {
				const li = el("li", { className: "ene-bulk-row" });
				const check = el("input", { type: "checkbox" });
				check.addEventListener("change", updateSummary);
				li.append(check, el("div", { className: "ene-bulk-main" }), el("span", { className: "ene-bulk-badge" }));
				li.querySelector(".ene-bulk-main").append(el("div", {
					className: "ene-bulk-name",
					textContent: name
				}), el("div", { className: "ene-bulk-result" }));
				return {
					name,
					keyword: name,
					status: "pending",
					candidates: [],
					chosen: null,
					li,
					check
				};
			});
			list.replaceChildren(...rows.map((r) => r.li));
			rows.forEach(render);
			let next = 0;
			const worker = async () => {
				while (next < rows.length && myRun === run) await lookup(rows[next++], myRun);
			};
			await Promise.all(Array.from({ length: CONCURRENCY }, worker));
		};
		const addChecked = () => {
			const targets = rows.filter((r) => r.check.checked && r.chosen && r.status !== "added");
			for (const r of targets) {
				addActorIfMissing({
					id: String(r.chosen.id),
					name: r.chosen.name
				});
				r.status = "added";
				r.check.checked = false;
				render(r);
			}
			close();
			showNotice(`${targets.length}名を追加しました`);
		};
		searchBtn.addEventListener("click", search);
		filter.addEventListener("change", () => rows.forEach(render));
		addBtn.addEventListener("click", addChecked);
		closeBtn.addEventListener("click", close);
		modal.querySelector(".ene-modal-close").addEventListener("click", close);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) close();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && modal.classList.contains("ene-open")) close();
		});
		const openBtn = el("input", {
			type: "button",
			className: "btn ene-ctl",
			value: "まとめて追加",
			title: "名簿を貼り付けて、まとめて検索・追加します"
		});
		openBtn.addEventListener("click", open);
		row.append(openBtn);
		updateSummary();
		return { openWith: (text) => {
			textarea.value = text;
			open();
			search();
		} };
	};
	var OPEN = "【\\[［〈《<＜(（■□◆◇●○◎▼▽▶▷★☆・*＊-";
	var CLOSE = "】\\]］〉》>＞)）";
	var labelRe = (labels) => new RegExp(String.raw`^[\s${OPEN}]*(?:${labels})(?:[${CLOSE}]+\s*[:：]?|\s*[:：｜|]|\s+|$)\s*(.*)$`, "i");
	var VENUE = labelRe("会場|会場名|開催会場|開催場所|場所|venue|place|location");
	var ACTORS = labelRe("出演者?|出演アーティスト|出演キャスト|出演予定|キャスト|cast|ゲスト|guest|line\\s*up|ラインナップ|mc|performers?|artists?");
	var OTHER = labelRe("日時|日程|日付|開催日|開場|開演|時間|会場|場所|料金|チケット|ticket|前売|当日|一般|先行|販売|主催|企画|協力|問い?合わ?せ|お問合せ|配信|特典|注意|注意事項|備考|詳細|入場|入場順|整理番号|タイムテーブル|物販|グッズ|url|https?");
	var HEADING = new RegExp(String.raw`^\s*[【■□◆◇●◎▼▽《<＜\[［]`);
	var SHORT_LABEL = /^[^:：]{1,12}[:：]/;
	var ROLE_LABEL = /mc|ゲスト|guest|o\.?a|オープニング|act|役|出演|cast|vo|gt|ba|dr|key|聞き手|司会/i;
	var MAX_ACTOR_LINES = 60;
	var MAX_NAME_LINE = 60;
	var lines$1 = (text) => text.split(/\r?\n/).map((l) => l.trim());
	var findVenue = (text) => {
		const ls = lines$1(text);
		for (let i = 0; i < ls.length; i++) {
			const m = ls[i].match(VENUE);
			if (!m) continue;
			const value = m[1].trim() || ls.slice(i + 1).find(Boolean) || "";
			if (value) return value;
		}
		return null;
	};
	var AREA = String.raw`(?:[^\s\d]{1,4}(?:都|道|府|県|市)|東京|大阪|名古屋|福岡|札幌|横浜|神戸|仙台|広島|京都|千葉|埼玉|愛知|神奈川|北海道)`;
	var AREA_PREFIX = new RegExp(String.raw`^(?:[\[【(（][^\]】)）]{1,4}[\]】)）]\s*|${AREA}\s*(?:[|｜・･]\s*|\s+))`);
	var venueQueries = (venue) => {
		const base = venue.normalize("NFKC").replace(/https?:\/\/[^\s()]*/g, "").replace(/\(\s*\)|\(\s*$/g, "").replace(/^(?:会場|場所)\s*[:：]\s*/, "").replace(/^[@＠]\s*/, "").replace(AREA_PREFIX, "").trim();
		const noParens = base.replace(/[(（「『][^()（）「」『』]*[)）」』]/g, "").trim();
		const noSuffix = noParens.replace(/\s*(?:B?\d+F|\d+階|特設|イベントスペース|メインステージ|大ホール|小ホール|メインアリーナ).*$/i, "").trim();
		const firstWord = noSuffix.split(/[\s/|｜、,]+/)[0] ?? "";
		return [...new Set([
			base,
			noParens,
			noSuffix,
			firstWord
		])].filter((q) => q.length >= 2);
	};
	var splitMany = (line, sep) => {
		const parts = line.split(sep);
		return parts.length >= 3 && parts.every((p) => p.trim().length >= 2) ? parts : [line];
	};
	var cleanActorBlock = (block) => block.split("\n").filter((l) => !/\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}\s*[(（]|公演$|50音順|五十音順|もっと見る|^[(（]\s*※/.test(l)).flatMap((l) => splitMany(l, /(?<!\s)\/(?!\s)/)).flatMap((l) => l.split(/　+|\s{2,}/)).flatMap((l) => splitMany(l, /[・･]/)).map((name) => name.replace(/^.*[:：│|｜]\s*/, "").replace(/\s*[@＠][\w.]+/g, "").replace(/(^|[、，,／/・\s])[#＃]/g, "$1").replace(/\s*[(（]第\d+部[)）]/g, "").replace(/(さん|様)(?=\s*[(（]|$)/, "").trim()).filter(Boolean).join("\n");
	var findActorBlock = (text) => {
		const ls = lines$1(text);
		for (let i = 0; i < ls.length; i++) {
			const m = ls[i].match(ACTORS);
			if (!m) continue;
			const block = m[1].trim() ? [m[1].trim()] : [];
			for (const l of ls.slice(i + 1, i + 1 + MAX_ACTOR_LINES)) {
				if (!l) {
					if (block.length) break;
					continue;
				}
				if (!block.length && ACTORS.test(l) && !l.match(ACTORS)[1]) continue;
				if (OTHER.test(l) || HEADING.test(l) || /^[※＊*]/.test(l) || l.length > MAX_NAME_LINE) break;
				if (/^(?:[#＃]\S+\s*){2,}$/.test(l)) break;
				const short = l.match(SHORT_LABEL);
				if (short && !ROLE_LABEL.test(short[0])) break;
				block.push(l);
			}
			if (block.length) return cleanActorBlock(block.join("\n"));
		}
		return null;
	};
	var findHashtags = (text) => [...new Set([...text.matchAll(/(?:^|[\s　(（「『])[#＃]([^\s#＃.,、。!！?？()（）「」『』【】]+)/g)].map((m) => m[1]))].filter((tag) => !/^\d+$/.test(tag));
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
	var GAP_RE = /^(?:[\s/・|,、.:;()[\]【】〈〉<>《》「」『』〜~=_*-]|[→⇒▶▷►★☆◆◇■□●○]|時間|時刻|予定|頃|ごろ|は)*$/;
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
					if (times[k] && !found[l.label]) found[l.label] = times[k];
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
					found[l.label] = t;
					i++;
				}
			}
			return found;
		};
		const a = labelFirst();
		const b = timeFirst();
		const [main, extra] = Object.keys(b).length > Object.keys(a).length ? [b, a] : [a, b];
		const used = new Set(Object.values(main));
		const found = {};
		for (const k of TIME_KEYS) {
			const token = main[k] ?? (extra[k] && !used.has(extra[k]) ? extra[k] : void 0);
			if (token) found[k] = token.time;
		}
		return found;
	};
	var initAnnounce = ({ date, time, place, actorBulk }) => {
		const dateRow = byId("date_year")?.closest("tr");
		if (!dateRow || !date && !time) return;
		const cell = insertField(fieldStart(dateRow), "告知文から入力");
		cell.innerHTML = `
    <input type="text" class="ene-announce" autocomplete="off"
      placeholder="例: 2026年12月19日(土) 開場 17:30 / 開演 18:30　告知文をここに貼り付け">
    <p class="s">開催日・時間・ハッシュタグを入力し、会場と出演者の候補を表示します</p>
    <p class="ene-announce-result" hidden></p>
  `;
		const input = cell.querySelector("input");
		const result = cell.querySelector(".ene-announce-result");
		const hashtag = document.querySelector("#event_form input[name=\"hashtag\"]");
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
			const tags = findHashtags(text);
			if (tags.length && hashtag && !hashtag.value.trim()) {
				hashtag.value = tags.join(" #");
				read.push(`#${tags.join(" #")}`);
			}
			result.replaceChildren();
			const block = findActorBlock(text);
			const names = block ? splitNames(block) : [];
			if (block && names.length && actorBulk) {
				const button = Object.assign(document.createElement("input"), {
					type: "button",
					className: "btn btn-small",
					value: "確認して追加"
				});
				button.addEventListener("click", () => actorBulk.openWith(block));
				const span = document.createElement("span");
				span.append(`出演者 ${names.length} 名を読み取りました `, button);
				result.append(span);
			}
			const venue = findVenue(text);
			if (venue && place) place.suggestFrom(venueQueries(venue)).then((q) => {
				if (!q) return;
				result.append(Object.assign(document.createElement("span"), { textContent: `会場「${q}」の候補を表示しました` }));
				result.hidden = false;
			});
			result.hidden = !result.childElementCount;
			if (read.length) showNotice("読み取りました：" + read.join(" / "));
			else if (result.hidden && !venue) showNotice("告知文から読み取れる項目がありませんでした", "error");
		};
		let pasted = "";
		input.addEventListener("paste", (e) => {
			const text = e.clipboardData?.getData("text");
			if (!text) return;
			e.preventDefault();
			pasted = text;
			input.value = text.replace(/\s+/g, " ").trim();
			fill(text);
		});
		onEnter(input, () => fill(input.value === pasted.replace(/\s+/g, " ").trim() ? pasted : input.value));
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
	var cache$1 = new Map();
	var fetchEventDoc = (eventId) => {
		let doc = cache$1.get(eventId);
		if (!doc) {
			doc = fetch(`/events/${eventId}`, { credentials: "same-origin" }).then((res) => res.ok ? res.text() : null).then((html) => html ? parseHtml(html) : null).catch(() => null);
			cache$1.set(eventId, doc);
		}
		return doc;
	};
	var eventInfoCell = async (eventId, ...labels) => {
		const doc = await fetchEventDoc(eventId);
		const head = doc && [...doc.querySelectorAll(".gb_events_info_table td, h2.gb_subtitle")].find((el) => labels.includes(el.textContent?.trim() ?? ""));
		return head ? head.nextElementSibling : null;
	};
	var TIME_NAMES = {
		open: "開場",
		start: "開演",
		end: "終演"
	};
	var SHOWN_NAMES = 5;
	var orNone = (s) => s || "なし";
	var names = (actors) => actors.slice(0, SHOWN_NAMES).map((a) => a.name).join("、") + (actors.length > SHOWN_NAMES ? ` ほか ${actors.length - SHOWN_NAMES} 名` : "");
	var lines = (s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	var describeChanges = (before, after) => {
		const changes = [];
		const same = (a, b) => a.trim() === b.trim();
		if (!same(before.eventName, after.eventName)) changes.push(`イベント名：${before.eventName} → ${after.eventName}`);
		if (before.date !== after.date) changes.push(`開催日：${before.date} → ${after.date}`);
		for (const key of [
			"open",
			"start",
			"end"
		]) if (before.times[key] !== after.times[key]) changes.push(`${TIME_NAMES[key]}：${orNone(before.times[key])} → ${orNone(after.times[key])}`);
		const beforeIds = before.actors.map((a) => a.id);
		const afterIds = after.actors.map((a) => a.id);
		const added = after.actors.filter((a) => !beforeIds.includes(a.id));
		const removed = before.actors.filter((a) => !afterIds.includes(a.id));
		const actorParts = [added.length && `追加 ${names(added)}`, removed.length && `削除 ${names(removed)}`].filter(Boolean);
		if (actorParts.length) changes.push(`出演者：${actorParts.join(" / ")}`);
		else if (beforeIds.join() !== afterIds.join()) changes.push("出演者：並び順を変更");
		if ((before.place?.id ?? "") !== (after.place?.id ?? "")) changes.push(`開催場所：${orNone(before.place?.name ?? "")} → ${orNone(after.place?.name ?? "")}`);
		const [beforeLinks, afterLinks] = [lines(before.link), lines(after.link)];
		const addedLinks = afterLinks.filter((l) => !beforeLinks.includes(l));
		const removedLinks = beforeLinks.filter((l) => !afterLinks.includes(l));
		if (addedLinks.length || removedLinks.length) changes.push([
			"関連リンク：",
			...addedLinks.map((l) => `  ＋ ${l}`),
			...removedLinks.map((l) => `  － ${l}`)
		].join("\n"));
		else if (beforeLinks.join() !== afterLinks.join()) changes.push("関連リンク：並び順を変更");
		if (!same(before.description, after.description)) changes.push("詳細：変更あり");
		if (!same(before.hashtag, after.hashtag)) changes.push(`ハッシュタグ：${orNone(before.hashtag)} → ${orNone(after.hashtag)}`);
		return changes;
	};
	var val = (id) => byId(id)?.value ?? "";
	var time = (key) => {
		const [hour, minute] = [val(`${key}_time_hour`), val(`${key}_time_minute`)];
		return hour && minute ? `${pad2(Number(hour))}:${pad2(Number(minute))}` : "";
	};
	var readValues = (form) => {
		const field = (name) => form.elements.namedItem(name)?.value ?? "";
		const place = byId("places_list")?.selectedOptions[0];
		return {
			eventName: field("event_name"),
			date: `${val("date_year")}/${val("date_month")}/${val("date_day")}`,
			times: {
				open: time("open"),
				start: time("start"),
				end: time("end")
			},
			actors: readSelectedActors(),
			place: place?.value ? {
				id: place.value,
				name: place.text
			} : null,
			link: field("link"),
			description: field("description"),
			hashtag: field("hashtag")
		};
	};
	var changes = null;
	var editChanges = () => changes?.();
	var IMAGE_CHANGE = "サムネイル画像：新しい画像に変更";
	var baseline = null;
	var editBaseline = () => baseline?.();
	var initEditConfirm = (eventId) => {
		const form = byId("event_form");
		if (!form) return;
		const before = readValues(form);
		const initialPlace = findInitialPlace();
		before.place = initialPlace && {
			id: initialPlace.id,
			name: `会場ID ${initialPlace.id}`
		};
		if (initialPlace) eventInfoCell(eventId, "開催場所").then((cell) => {
			const name = cell?.querySelector(`a[href$="/places/${initialPlace.id}"]`)?.textContent?.trim();
			if (name && before.place) before.place.name = name;
		});
		changes = () => {
			const list = describeChanges(before, readValues(form));
			if (form.querySelector("input[type=\"file\"][name=\"thumbnail_image\"]")?.files?.length) list.push(IMAGE_CHANGE);
			return list;
		};
		baseline = () => JSON.stringify({
			...before,
			place: before.place?.id ?? null
		});
		return { minutesRestored: () => {
			for (const key of [
				"open",
				"start",
				"end"
			]) if (!before.times[key] && val(`${key}_time_hour`)) before.times[key] = time(key);
		} };
	};
	var RESTORE_PARAM = "ene_restore";
	var isReturning = new URLSearchParams(location.search).has(RESTORE_PARAM);
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
	var isBlank = (s) => !s.actors.length && !s.place && ![
		"event_name",
		"link",
		"description",
		"hashtag"
	].some((n) => s.fields[n]?.trim());
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
		if (!isReturning) return;
		const snapshot = load("formSnapshot", null);
		if (snapshot) restoreSnapshot(form, snapshot, placePicker);
		const params = new URLSearchParams(location.search);
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
	var INTERVAL_MS$1 = 2e3;
	var TTL_MS = 12096e5;
	var savedAtText = (t) => {
		const d = new Date(t);
		return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
	};
	var showBanner = (form, text, restore, discard) => {
		let banner = document.createElement("div");
		banner.className = "alert alert-info ene-draft";
		banner.append(text);
		const remove = () => {
			banner?.remove();
			banner = null;
		};
		for (const [value, onClick] of [["復元する", restore], ["破棄する", discard]]) {
			const btn = Object.assign(document.createElement("input"), {
				type: "button",
				className: "btn btn-small",
				value
			});
			btn.addEventListener("click", () => {
				onClick();
				remove();
			});
			banner.append(btn);
		}
		form.prepend(banner);
		return {
			remove,
			shown: () => !!banner
		};
	};
	var watch = (form, onChange) => {
		let last = JSON.stringify(takeSnapshot(form));
		setInterval(() => {
			const snapshot = takeSnapshot(form);
			const json = JSON.stringify(snapshot);
			if (json === last) return;
			last = json;
			onChange(snapshot);
		}, INTERVAL_MS$1);
	};
	var initDraft = (placePicker, refresh) => {
		const form = byId("event_form");
		if (!form) return;
		const draft = load("formDraft", null);
		const banner = draft && !isReturning && !new URLSearchParams(location.search).has("from_event_id") && Date.now() - draft.savedAt < TTL_MS ? showBanner(form, `前回の入力内容が残っています（${savedAtText(draft.savedAt)}・「${draft.fields.event_name?.trim() || "イベント名未入力"}」）`, () => {
			restoreSnapshot(form, draft, placePicker);
			refresh();
		}, () => save("formDraft", null)) : null;
		watch(form, (snapshot) => {
			if (isBlank(snapshot)) return;
			banner?.remove();
			save("formDraft", {
				...snapshot,
				savedAt: Date.now()
			});
		});
	};
	var initDraftClear = () => {
		document.querySelector("form[action=\"/events/add/complete\"]")?.addEventListener("submit", () => save("formDraft", null));
	};
	var initEditDraft = (eventId, placePicker, refresh) => {
		const form = byId("event_form");
		const base = editBaseline();
		if (!form || base === void 0) return;
		const drafts = () => Object.fromEntries(Object.entries(load("editDrafts", {})).filter(([, d]) => Date.now() - d.savedAt < TTL_MS));
		const put = (draft) => {
			const all = drafts();
			if (draft) all[eventId] = {
				...draft,
				savedAt: Date.now(),
				base
			};
			else delete all[eventId];
			save("editDrafts", all);
		};
		const draft = drafts()[eventId];
		const banner = draft ? showBanner(form, `前回編集中の内容が残っています（${savedAtText(draft.savedAt)}）` + (draft.base === base ? "" : "。その後このイベントは更新されています（復元すると、その更新を上書きします）"), () => {
			for (const actor of readSelectedActors()) page.removeActor(actor.id);
			restoreSnapshot(form, draft, placePicker);
			refresh();
		}, () => put(null)) : null;
		watch(form, (snapshot) => {
			if ((editChanges() ?? []).some((c) => c !== "サムネイル画像：新しい画像に変更")) {
				banner?.remove();
				put(snapshot);
			} else if (!banner?.shown()) put(null);
		});
		form.addEventListener("submit", (e) => {
			if (!e.defaultPrevented) put(null);
		}, true);
	};
	var findDuplicates = (events, q) => {
		if (!q.start || !q.placeId || !q.actorIds.length) return [];
		return events.flatMap((e) => {
			if (String(e.id) === q.selfId || String(e.place_id) !== q.placeId || e.start_time !== q.start) return [];
			const shared = (e.actors ?? []).filter((a) => q.actorIds.includes(String(a.id)));
			if (!shared.length) return [];
			return [{
				id: e.id,
				name: e.event_name,
				start: e.start_time,
				sharedActors: shared.map((a) => a.name),
				canceled: !!e.cancel_flag,
				postponed: !!e.postpone_flag
			}];
		});
	};
	var INTERVAL_MS = 1e3;
	var SHOWN_ACTORS = 3;
	var cache = new Map();
	var fetchEvents = (date, placeId) => {
		const key = `${date}|${placeId}`;
		let result = cache.get(key);
		if (!result) {
			const params = new URLSearchParams({
				event_date: date,
				place_id: placeId,
				limit: "1000"
			});
			result = fetch("/api/events/search?" + params, { credentials: "same-origin" }).then((res) => res.json()).then((json) => json.results ?? []).catch(() => []);
			cache.set(key, result);
		}
		return result;
	};
	var readForm = (selfId) => {
		const val = (id) => byId(id)?.value ?? "";
		const [y, m, d, hour, minute] = [
			"date_year",
			"date_month",
			"date_day",
			"start_time_hour",
			"start_time_minute"
		].map(val);
		const query = {
			selfId,
			actorIds: val("actor_ids").split(",").filter(Boolean),
			placeId: val("places_list"),
			start: hour && minute ? `${pad2(Number(hour))}:${pad2(Number(minute))}` : ""
		};
		return {
			date: y && m && d ? `${y}-${pad2(Number(m))}-${pad2(Number(d))}` : "",
			query
		};
	};
	var describe = (dup) => {
		const names = dup.sharedActors.slice(0, SHOWN_ACTORS).join("、");
		const rest = dup.sharedActors.length - SHOWN_ACTORS;
		const flags = [dup.canceled && "中止", dup.postponed && "延期"].filter(Boolean).map((f) => `【${f}】`).join("");
		return {
			title: `『${dup.name}』`,
			detail: `${flags} ${dup.start}（共通の出演者：${names}${rest > 0 ? ` ほか ${rest} 名` : ""}）`
		};
	};
	var latest = [];
	var duplicateProblems = () => latest.map((dup) => {
		const { title, detail } = describe(dup);
		return `重複の可能性：${title}${detail}`;
	});
	var initDuplicateCheck = (selfId) => {
		const list = byId("selected_actors");
		if (!list || !byId("places_list") || !byId("date_year")) return;
		const box = document.createElement("div");
		box.className = "ene-duplicate";
		box.hidden = true;
		list.closest("td").append(box);
		const render = (dups) => {
			latest = dups;
			box.hidden = !dups.length;
			box.replaceChildren("重複の可能性があるイベントがあります。登録済みでないか確認してください。");
			const ul = document.createElement("ul");
			for (const dup of dups) {
				const { title, detail } = describe(dup);
				const a = Object.assign(document.createElement("a"), {
					href: `/events/${dup.id}`,
					target: "_blank",
					rel: "noopener",
					textContent: title
				});
				const li = document.createElement("li");
				li.append(a, detail);
				ul.append(li);
			}
			box.append(ul);
		};
		let lastKey = "";
		let seq = 0;
		const check = async () => {
			const { date, query } = readForm(selfId);
			const key = JSON.stringify([date, query]);
			if (key === lastKey) return;
			lastKey = key;
			const run = ++seq;
			if (!date || !query.start || !query.placeId || !query.actorIds.length) return render([]);
			const events = await fetchEvents(date, query.placeId);
			if (run === seq) render(findDuplicates(events, query));
		};
		check();
		setInterval(check, INTERVAL_MS);
	};
	var KEEP_MS = 2592e6;
	var EVENT_IMAGE = /\/images\/events\/(\d+)(?:_s)?\.jpg/;
	var markImageUpdated = (eventId) => {
		const now = Date.now();
		save("imageVersions", {
			...Object.fromEntries(Object.entries(load("imageVersions", {})).filter(([, t]) => now - t < KEEP_MS)),
			[eventId]: now
		});
	};
	var refreshEventImages = () => {
		const versions = load("imageVersions", {});
		if (!Object.keys(versions).length) return;
		for (const img of document.querySelectorAll("img[src*=\"/images/events/\"]")) {
			const url = new URL(img.src, location.href);
			const version = versions[url.pathname.match(EVENT_IMAGE)?.[1] ?? ""];
			if (!version || url.searchParams.get("v") === String(version)) continue;
			url.searchParams.set("v", String(version));
			img.src = url.href;
		}
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
	var searchPlaces = async (keyword, prefecture = "", signal) => {
		const params = new URLSearchParams({
			keyword,
			simple: "3",
			limit: "50"
		});
		if (prefecture) params.set("prefecture", prefecture);
		return (await (await fetch("/api/places/search?" + params, {
			credentials: "same-origin",
			signal
		})).json()).results ?? [];
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
		box.className = "ene-search";
		box.innerHTML = `
    <div class="ene-place-current" style="display:none">
      <span class="ene-place-name"></span><span class="ene-place-sub"></span>
      <input type="button" class="btn btn-small" value="取り消す">
    </div>
    <div class="ene-search-row">
      <select></select>
      <input type="text" placeholder="会場名・住所で検索（例: Zepp、武道館、渋谷）" autocomplete="off">
    </div>
    <ul class="ene-suggest"></ul>
  `;
		cell.prepend(box);
		const current = box.querySelector(".ene-place-current");
		const input = box.querySelector(".ene-search-row input");
		const prefFilter = box.querySelector(".ene-search-row select");
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
		const toItem = (place) => ({
			value: place,
			title: place.name,
			sub: placeSub(place),
			dim: CLOSED_RE.test(place.name)
		});
		const suggest = createSuggest({
			input,
			list: box.querySelector(".ene-suggest"),
			search: async (keyword, signal) => rankPlaces(await searchPlaces(keyword, prefFilter.value, signal), keyword).slice(0, 30).map((p) => toItem(toPlace(p))),
			idle: () => ({
				heading: "最近使った会場",
				items: load("recentPlaces", []).map(toItem)
			}),
			choose: (place) => set(place, true),
			emptyText: "見つかりませんでした"
		});
		prefFilter.addEventListener("change", () => {
			if (!input.value.trim()) return;
			input.focus();
			suggest.run();
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
		const suggestFrom = async (queries) => {
			for (const q of queries) {
				if (chosen) return null;
				if (!(await searchPlaces(q, prefFilter.value).catch(() => [])).length) continue;
				if (chosen) return null;
				input.value = q;
				input.focus();
				suggest.run();
				return q;
			}
			return null;
		};
		return {
			set,
			loadInitial,
			suggestFrom
		};
	};
	var initSubmitCheck = () => {
		const form = byId("event_form");
		if (!form) return;
		const searchInput = (anchorId) => byId(anchorId)?.closest("td")?.querySelector(".ene-search input[type=\"text\"]") ?? null;
		form.addEventListener("submit", (e) => {
			const problems = [];
			const name = form.elements.namedItem("event_name");
			if (!name.value.trim()) problems.push(["イベント名が入力されていません", name]);
			const actorSearch = searchInput("selected_actors");
			if (actorSearch?.value.trim() && !actorSearch.dataset.picked) problems.push([`出演者の検索欄に「${actorSearch.value.trim()}」が残っています（まだ追加されていません）`, actorSearch]);
			else if (!byId("actor_ids")?.value) problems.push(["出演者が選択されていません", actorSearch]);
			const placeSearch = searchInput("places_list");
			if (placeSearch?.value.trim()) problems.push([`会場の検索欄に「${placeSearch.value.trim()}」が残っています（まだ選択されていません）`, placeSearch]);
			else if (!byId("places_list")?.value) problems.push(["開催場所が選択されていません", placeSearch]);
			const duplicateBox = form.querySelector(".ene-duplicate");
			for (const message of duplicateProblems()) problems.push([message, duplicateBox]);
			const changes = editChanges();
			if (!problems.length && !changes) return;
			const sections = problems.length ? [problems.map(([m]) => "・" + m).join("\n")] : [];
			if (changes) sections.push(changes.length ? `変更内容：\n${changes.map((c) => "・" + c).join("\n")}` : "変更はありません。");
			sections.push(problems.length ? "このまま送信しますか？" : "この内容で保存しますか？");
			if (confirm(sections.join("\n\n"))) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			const target = problems[0]?.[1];
			target?.scrollIntoView({ block: "center" });
			target?.focus();
		}, true);
	};
	var uploadSize = (width, height) => {
		const long = Math.max(width, height);
		if (long > 700) return null;
		const scale = 701 / long;
		return width >= height ? {
			width: 701,
			height: Math.max(1, Math.round(height * scale))
		} : {
			width: Math.max(1, Math.round(width * scale)),
			height: 701
		};
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
	var normalizeImage = async (file, fileName = "") => {
		const dataUrl = await readAsDataUrl(file);
		const name = fileName || "thumbnail";
		const img = await loadImage(dataUrl);
		const size = uploadSize(img.naturalWidth, img.naturalHeight);
		if (!size && SERVER_IMAGE_TYPES.includes(file.type)) return {
			dataUrl,
			name,
			type: file.type
		};
		const canvas = Object.assign(document.createElement("canvas"), size ?? {
			width: img.naturalWidth,
			height: img.naturalHeight
		});
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
			drop.textContent = isSmartphone() ? "タップして画像を選択" : "ここに画像をドラッグ＆ドロップ / Ctrl+V で貼り付け / クリックしてファイルを選択";
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
				const image = await normalizeImage(file, file.name);
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
	var SCREENSHOT_SIDE = 1e3;
	var fetchSourceImage = async (eventId) => {
		const res = await fetch(`${S3_EVENT_IMAGE}${eventId}.jpg?t=${Date.now()}`, { cache: "no-store" });
		if (!res.ok) return null;
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		try {
			const img = await loadImage(url);
			if (img.naturalWidth === SCREENSHOT_SIDE && img.naturalHeight === SCREENSHOT_SIDE) return null;
		} finally {
			URL.revokeObjectURL(url);
		}
		return normalizeImage(blob, `${eventId}.jpg`);
	};
	var initImagePicker = () => {
		const submitRow = document.querySelector("#event_form input[type=\"submit\"]")?.closest("tr");
		if (!submitRow) return;
		if (!isReturning) save("draftImage", null);
		const cell = insertField(submitRow, "サムネイル画像");
		const copied = Object.assign(document.createElement("p"), {
			className: "ene-image-note",
			hidden: true
		});
		const picker = createImageDrop((image) => {
			save("draftImage", image);
			copied.hidden = true;
		}, () => {
			save("draftImage", null);
			copied.hidden = true;
		});
		cell.append(picker.element, copied, Object.assign(document.createElement("p"), {
			className: "ene-image-note",
			textContent: "登録完了後、イベント編集機能を使って自動でアップロードします。"
		}));
		const draft = load("draftImage", null);
		if (draft) return picker.show(draft.dataUrl);
		const sourceId = new URLSearchParams(location.search).get("from_event_id");
		if (!sourceId || isReturning) return;
		fetchSourceImage(sourceId).then((image) => {
			if (!image || load("draftImage", null)) return;
			save("draftImage", image);
			picker.show(image.dataUrl);
			copied.textContent = "コピー元のイベントの画像を引き継ぎました。不要なら「画像を取り消す」を押してください。";
			copied.hidden = false;
		}).catch(() => {});
	};
	var addMissingImageField = (eventId) => {
		const form = document.querySelector("#event_form");
		const submitRow = form?.querySelector("input[type=\"submit\"]")?.closest("tr");
		if (!form || !submitRow) return null;
		form.enctype = "multipart/form-data";
		const input = Object.assign(document.createElement("input"), {
			type: "file",
			name: "thumbnail_image",
			accept: "image/*"
		});
		const current = Object.assign(document.createElement("img"), { src: `${S3_EVENT_IMAGE}${eventId}_s.jpg?t=${Date.now()}` });
		current.addEventListener("error", () => current.remove());
		insertField(submitRow, "サムネイル画像").append(current, input);
		return input;
	};
	var setInputFile = (input, image) => {
		const transfer = new DataTransfer();
		transfer.items.add(new File([dataUrlToBlob(image.dataUrl)], image.name, { type: image.type }));
		input.files = transfer.files;
	};
	var keepCurrentImage = (eventId, input) => {
		const form = input.form;
		const link = form?.elements.namedItem("link");
		if (!form || !link || typeof DataTransfer !== "function") return;
		const current = (async () => {
			const res = await fetch(`${S3_EVENT_IMAGE}${eventId}.jpg?t=${Date.now()}`, { cache: "no-store" });
			return res.ok ? normalizeImage(await res.blob(), `${eventId}.jpg`) : null;
		})().catch(() => null);
		let loaded;
		current.then((image) => {
			loaded = image;
		});
		const fill = (image) => {
			try {
				if (image) setInputFile(input, image);
			} catch {}
		};
		form.addEventListener("submit", (e) => {
			if (e.defaultPrevented || input.files?.length || !link.value.trim()) return;
			if (loaded !== void 0) return fill(loaded);
			e.preventDefault();
			current.then((image) => {
				fill(image);
				HTMLFormElement.prototype.submit.call(form);
			});
		});
	};
	var initEditImagePicker = (eventId) => {
		const input = document.querySelector("#event_form input[type=\"file\"][name=\"thumbnail_image\"]") ?? addMissingImageField(eventId);
		if (!input) return;
		input.style.display = "none";
		const current = input.parentElement?.querySelector("img");
		if (current) {
			const label = Object.assign(document.createElement("p"), {
				className: "ene-image-note",
				textContent: "現在の画像"
			});
			current.before(label);
			current.addEventListener("error", () => label.remove());
			Object.assign(current.style, {
				display: "block",
				marginBottom: "10px",
				maxWidth: "100%"
			});
		}
		keepCurrentImage(eventId, input);
		const picker = createImageDrop((image) => {
			try {
				setInputFile(input, image);
			} catch {
				input.style.display = "";
				showNotice("この端末では画像を自動で設定できません。下のファイル選択欄から画像を選んでください。", "error");
			}
		}, () => {
			input.value = "";
		});
		picker.element.append(Object.assign(document.createElement("p"), {
			className: "ene-image-note",
			textContent: "新しい画像は「編集完了」を押すと保存されます。選ばなければ現在の画像のままです。"
		}));
		input.after(picker.element);
		input.form?.addEventListener("submit", () => {
			if (input.files?.length) markImageUpdated(eventId);
		});
	};
	var initConfirmImage = () => {
		const form = document.querySelector("form[action=\"/events/add/complete\"]");
		const image = load("draftImage", null);
		if (!form || !image) return;
		const cell = insertField(form.querySelector("input[type=\"submit\"]").closest("tr"), "サムネイル画像");
		cell.innerHTML = `<img style="max-width:100%;max-height:200px"><br><span class="s">登録完了後に自動でアップロードします</span>`;
		cell.querySelector("img").src = image.dataUrl;
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
	var EVENT_LINK = /^(?:https?:\/\/www\.eventernote\.com)?\/events\/(\d+)\/?$/;
	var candidateEventIds = (eventName) => {
		const ids = new Set();
		const m = location.pathname.match(/^\/events\/(\d+)\/?$/);
		if (m) ids.add(m[1]);
		if (location.pathname.startsWith("/events/add/complete")) {
			const links = [...document.querySelectorAll("a[href]")].map((a) => ({
				text: a.textContent ?? "",
				id: a.getAttribute("href").match(EVENT_LINK)?.[1]
			})).filter((link) => !!link.id);
			links.filter((link) => link.text.includes(eventName.trim())).forEach((link) => ids.add(link.id));
			links.forEach((link) => ids.add(link.id));
		}
		return [...ids].slice(0, 5);
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
		for (const id of candidateEventIds(pending.eventName)) {
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
			markImageUpdated(id);
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
		const text = (await eventInfoCell(eventId, "時間", "開場/開演/終演時間"))?.textContent ?? "";
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
	document.documentElement.classList.toggle("ene-sp", isSmartphone());
	refreshEventImages();
	var path = location.pathname.replace(/\/$/, "");
	var editId = path.match(/^\/events\/(\d+)\/edit$/)?.[1];
	if (path === "/events/add/confirm") {
		initConfirmBackButton();
		initConfirmImage();
		initDraftClear();
	} else if (path === "/events/add") {
		initMinuteOptions();
		initActorList();
		initActorPresets();
		initActorSearch();
		const actorBulk = initActorBulk();
		const placePicker = initPlacePicker();
		initFormSnapshot(placePicker);
		placePicker?.loadInitial(new URLSearchParams(location.search).get("from_event_id"));
		const date = initDatePicker();
		const time = initSmartTime();
		initAnnounce({
			date,
			time,
			place: placePicker,
			actorBulk
		});
		initDuplicateCheck();
		initSubmitCheck();
		initDraft(placePicker, () => {
			date?.refresh();
			time?.refresh();
		});
		initImagePicker();
	} else if (editId) {
		const editConfirm = initEditConfirm(editId);
		initMinuteOptions();
		initActorList();
		initActorPresets();
		initActorSearch();
		const actorBulk = initActorBulk();
		const placePicker = initPlacePicker();
		placePicker?.loadInitial(editId);
		const date = initDatePicker();
		const time = initSmartTime();
		initAnnounce({
			date,
			time,
			place: placePicker,
			actorBulk
		});
		initDuplicateCheck(editId);
		initSubmitCheck();
		restoreEditMinutes(editId).finally(() => {
			editConfirm?.minutesRestored();
			time?.refresh();
			initEditDraft(editId, placePicker, () => {
				date?.refresh();
				time?.refresh();
			});
		});
		initEditImagePicker(editId);
	} else processPendingUpload();
})();
