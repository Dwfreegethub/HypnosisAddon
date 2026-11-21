// The ECHS popup, stage 1 (job4.md; DW 2026-11-21). Each check says what failure looks like.
//
//   1. The launcher shows only in a chat room, not over a character's item menu, and only while the
//      setting is on (on by default). Off, or leaving the room, removes it and the window.
//   2. Clicking the launcher opens the window; the × closes it. A press that moves is a drag, saved
//      once on release and kept on screen; it does not open the window.
//   3. Every command is listed exactly once, in a group; Testing only in the testing room.
//   4. Clicking a command TYPES it into BC's chat box and fires BC's input handler; it never sends.
//      With no chat box, it says so.
//   5. The safeword button runs the safeword at once (rule 2), not just types it.
globalThis.Player = { MemberNumber: 1, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player];
globalThis.ChatRoomData = { Name: "Some Room" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
let syncs = 0;
globalThis.ServerPlayerExtensionSettingsSync = () => syncs++;
globalThis.ServerPlayerIsInChatRoom = () => true;
let chatSent = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat" && data?.Type !== "Hidden") chatSent.push(data); };
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m?.textContent ?? m));
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.CurrentScreen = "MainHall";
globalThis.CurrentCharacter = null;

// --- A small stand-in DOM: a tree, lookup by id, listeners, events. -------------------------
const makeEl = (tag) => {
	const el = {
		tagName: tag.toUpperCase(), id: "", className: "", style: {}, children: [], parent: null, listeners: {}, attrs: {},
		_text: "", offsetWidth: 0, offsetHeight: 0, focused: false,
		get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); },
		set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); },
		appendChild(k) { k.parent = this; this.children.push(k); return k; },
		remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } },
		addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
		dispatchEvent(ev) { ev.target ??= this; for (const fn of this.listeners[ev.type] ?? []) fn(ev); return true; },
		setAttribute(k, v) { this.attrs[k] = v; },
		focus() { this.focused = true; },
		setSelectionRange(a) { this.caret = a; },
		closest(sel) { let n = this; while (n) { if (sel === "button" && n.tagName === "BUTTON") return n; n = n.parent; } return null; },
		click() { this.dispatchEvent({ type: "click" }); },
	};
	return el;
};
const body = makeEl("body"), head = makeEl("head");
const walk = (n, id) => { if (n.id === id) return n; for (const c of n.children) { const f = walk(c, id); if (f) return f; } return null; };
globalThis.document = { body, head, createElement: makeEl, getElementById: (id) => walk(body, id) ?? walk(head, id) };
globalThis.Event = class { constructor(type) { this.type = type; } };
const winListeners = {};
globalThis.window = {
	innerWidth: 1600, innerHeight: 900,
	addEventListener(t, fn) { (winListeners[t] ??= []).push(fn); },
	removeEventListener(t, fn) { winListeners[t] = (winListeners[t] ?? []).filter((f) => f !== fn); },
};
const winFire = (type, ev) => { for (const fn of [...(winListeners[type] ?? [])]) fn(ev); };
let inputEvents = 0;
const chatBox = makeEl("textarea");
chatBox.id = "InputChat";
chatBox.value = "";
chatBox.addEventListener("input", () => inputEvents++);
body.appendChild(chatBox);

const { popup, storage, commands } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const launcher = () => document.getElementById(popup.LAUNCHER_ID);
const win = () => document.getElementById(popup.POPUP_ID);
const press = (node, dx = 0, dy = 0) => {
	node.dispatchEvent({ type: "pointerdown", button: 0, clientX: 100, clientY: 100, target: node, preventDefault() {}, stopPropagation() {} });
	if (dx || dy) winFire("pointermove", { clientX: 100 + dx, clientY: 100 + dy });
	winFire("pointerup", {});
};
const findAll = (n, pred, out = []) => { if (pred(n)) out.push(n); for (const c of n.children) findAll(c, pred, out); return out; };
const byText = (start) => findAll(win(), (n) => n.tagName === "BUTTON" && n.textContent.startsWith(start));

// 1. Where it shows.
popup.installPopup();
check("not outside a room", !launcher(), "no launcher on the Main Hall screen, got one");
CurrentScreen = "ChatRoom";
popup.popupTick();
check("in a room, on by default", !!launcher() && storage.getPopupEnabled(), "a launcher in a chat room with fresh settings");
check("style added once", findAll(head, (n) => n.id === "echs-popup-style").length === 1, "one <style> for the popup");
CurrentCharacter = { Name: "Someone" };
popup.popupTick();
check("not over an item menu", !launcher(), "the launcher gone while a character's item menu is open");
CurrentCharacter = null;
popup.popupTick();
storage.setPopupEnabled(false);
popup.popupTick();
check("setting off removes it", !launcher() && !storage.getPopupEnabled(), "no launcher once the setting is off");
storage.setPopupEnabled(true);
popup.popupTick();
check("setting on brings it back", !!launcher(), "the launcher back once the setting is on");

// 2. Open, close, drag.
press(launcher());
check("click opens", popup.isPopupOpen() && !!win(), "the window open after clicking the launcher");
byText("×")[0].click();
check("× closes", !popup.isPopupOpen() && !win(), "the window closed by its × button");
press(launcher(), 200, -50);
check("a drag does not open", !popup.isPopupOpen(), "dragging the launcher to leave the window shut");
const lp = storage.getPopupPos("launcher");
check("drag saved", lp && lp.x === 210 && lp.y === 355, `launcher saved at 210,355 (10,405 moved 200,-50), got ${JSON.stringify(lp)}`);
press(launcher(), 5000, 5000);
const lp2 = storage.getPopupPos("launcher");
check("kept on screen", lp2.x <= 1600 - popup.LAUNCHER_SIZE && lp2.y <= 900 - popup.LAUNCHER_SIZE, `launcher clamped inside 1600×900, got ${JSON.stringify(lp2)}`);
const c = popup.clampPos(-1000, -50, 340, 400, 1600, 900);
check("window can hang off the left but not vanish", c.x === 60 - 340 && c.y === 0, `x ${60 - 340}, y 0, got ${JSON.stringify(c)}`);
CurrentScreen = "MainHall";
popup.setPopupOpen(true);
check("open but out of the room: nothing drawn", !win() && !launcher(), "no window or launcher outside a room even while open");
CurrentScreen = "ChatRoom";
popup.popupTick();
check("back in the room: window returns", !!win(), "the window back on re-entering a room");

// 3. The list.
const all = commands.commandHelp();
const listed = popup.popupGroups(true).flatMap((g) => g.commands.map((x) => x.tag));
const missing = all.filter((x) => !listed.includes(x.tag)).map((x) => `${x.group}/${x.tag}`);
check("every command listed", missing.length === 0, `every command in a group, missing ${missing.join(", ")}`);
check("each once", new Set(listed).size === listed.length, "no command listed twice");
check("Testing hidden outside the testing room", !popup.popupGroups(false).some((g) => g.group === "Testing"), "no Testing group outside the testing room");
check("Session open, others shut", byText("−  Hypnosis").length === 1 && byText("+  Your data").length === 1, "Hypnosis expanded and Your data collapsed at first");
byText("+  Your data")[0].click();
check("+ expands", byText("−  Your data").length === 1 && byText("/echs export").length === 1, "Your data expanded, showing /echs export");

// 4. Typing, not sending.
byText("/echs trust")[0].click();
check("fills with a space for the name", chatBox.value === "/echs trust " && chatBox.focused && chatBox.caret === 12, `chat box "/echs trust " focused at the end, got "${chatBox.value}"`);
check("BC's input handler ran", inputEvents === 1, `one input event, got ${inputEvents}`);
check("never sends", chatSent.length === 0, `nothing sent to the room, got ${chatSent.length}`);
const status = () => findAll(win(), (n) => n.className === "echs-pop-status")[0].textContent;
check("says to finish it", status().includes("Finish it"), `a status asking to finish the line, got "${status()}"`);
byText("/echs agree")[0].click();
check("complete command, no trailing space", chatBox.value === "/echs agree", `"/echs agree", got "${chatBox.value}"`);
chatBox.remove();
byText("/echs agree")[0].click();
check("no chat box: says so", status().startsWith("No chat box"), `a refusal when there is no chat box, got "${status()}"`);
body.appendChild(chatBox);

// 5. The safeword runs.
local = [];
byText("Safeword")[0].click();
check("safeword runs at once", local.some((m) => m.includes("Safeword")) && status().startsWith("Safeword used"), `the safeword's own chat line and a status, got ${JSON.stringify(local)} / "${status()}"`);
check("safeword sends nothing to the room", chatSent.length === 0, "no public chat from the safeword button");

console.log(`popup: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
