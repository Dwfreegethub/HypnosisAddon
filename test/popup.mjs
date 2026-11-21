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
//   6. People (stage 2): the window opens on it; it lists everyone else here running ECHS except
//      those who unticked "Show others that I run ECHS", never ourselves or non-ECHS players; a
//      click types /echs induce with a name that means only them (number when it would not); it
//      shows what is known of a session with them, and redraws when the room changes.
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
check("opens on People", popup.getPopupTab() === "people" && byText("People").length === 1 && byText("Commands").length === 1, "the window opening on the People tab, with a Commands tab beside it");
byText("Commands")[0].click();
check("tab switches", popup.getPopupTab() === "commands" && byText("−  Hypnosis").length === 1, "the Commands tab shown after clicking it");
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

// 6. People.
const { badge, messaging, session } = await import("./harness-bundle.mjs");
session.installSession();
const A = 100, B = 200, C = 300, D = 400, E = 500, F = 600;
ChatRoomCharacter = [
	Player,
	{ MemberNumber: A, Name: "Alice", Nickname: "Ali" },
	{ MemberNumber: B, Name: "Bea" },
	{ MemberNumber: C, Name: "Cleo" },             // runs ECHS but hides
	{ MemberNumber: D, Name: "Dora" },             // no ECHS
	{ MemberNumber: E, Name: "Bea" },              // a second Bea
	{ MemberNumber: F, Name: "12345" },            // a name that reads as a number
];
for (const [m, show] of [[A, true], [B, true], [C, false], [E, true], [F, true]]) badge.notePeer(m, { type: "state-response", version: "1.13.0", showIcon: show });
badge.notePeer(1, { type: "state-response", version: "1.13.0" });
popup.setPopupTab("people");
popup.popupTick();
const ppl = popup.popupPeople();
const ids = ppl.map((p) => p.id);
check("lists ECHS players only", ids.join(",") === [A, B, E, F].join(","), `Ali, Bea, Bea, 12345 listed (not Cleo, who hides; not Dora; not us), got ${ids.join(",")}`);
check("shown by nickname, typed by it", ppl[0].name === "Ali" && ppl[0].text === "/echs induce Ali", `"Ali" / "/echs induce Ali", got ${JSON.stringify(ppl[0])}`);
check("shared name: by number", ppl[1].text === `/echs induce ${B}` && ppl[2].text === `/echs induce ${E}`, `both Beas typed by member number, got ${ppl[1].text} / ${ppl[2].text}`);
check("number-like name: by number", ppl[3].text === `/echs induce ${F}`, `"12345" typed as member ${F}, got ${ppl[3].text}`);
const personBtn = (name) => findAll(win(), (n) => n.className === "echs-pop-item" && n.children[0]?.textContent.startsWith(name))[0];
check("rows drawn", !!personBtn("Ali") && !personBtn("Cleo") && !personBtn("Dora"), "a row for Ali and none for Cleo or Dora");
personBtn("Ali").click();
check("click types induce", chatBox.value === "/echs induce Ali" && chatSent.length === 0 && status().includes("Press Enter"), `"/echs induce Ali" typed and nothing sent, got "${chatBox.value}"`);
const update = (from, msg) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message: { type: "session-update", ...msg } }] });
update(A, { phase: "CooldownRequired", attempts: 2, cooldownRemaining: 150_000 });
update(B, { phase: "Hypnotized", attempts: 1 });
check("status: resting", popup.personStatus(A) === "resting: 3 min", `"resting: 3 min" for a 2.5 min cooldown, got "${popup.personStatus(A)}"`);
check("status: under you", popup.personStatus(B) === "under you", `"under you", got "${popup.personStatus(B)}"`);
check("status: nothing known", popup.personStatus(F) === "", `no status for someone we never tried, got "${popup.personStatus(F)}"`);
popup.popupTick();
// 7. Suggestions (stage 3). Bea going under switches the window to them by itself.
check("someone under you: Suggestions, chosen by itself", popup.getPopupTab() === "suggest" && byText("Suggestions").length === 1, `the Suggestions tab chosen once Bea is under, got "${popup.getPopupTab()}"`);
check("for the one under you", popup.currentSubject()?.id === B && status() !== undefined && findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.startsWith("Speaking to Bea")).length === 1, "the hint naming Bea");
check("no switcher for one subject", findAll(win(), (n) => n.className.startsWith("echs-pop-chip")).length === 0, "no name switcher with one subject");
const sayBtn = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-item") && n.textContent.replace(/^↺ /, "") === label)[0];
sayBtn("wake up").click();
check("types name, phrase", chatBox.value === "Bea, wake up" && chatSent.length === 0, `"Bea, wake up" typed and nothing sent, got "${chatBox.value}"`);
check("only Trance open at first", !sayBtn("kneel") && byText("+  Body & pose").length === 1, "Body & pose collapsed at first");
byText("+  Body & pose")[0].click();
sayBtn("kneel").click();
check("+ opens a group", chatBox.value === "Bea, kneel", `"Bea, kneel" from Body & pose, got "${chatBox.value}"`);
check("release marked", sayBtn("stand")?.className.includes("echs-pop-release") && sayBtn("stand").textContent.startsWith("↺"), "stand marked ↺ as a release");
// The other wordings, one level down.
const moreBtn = (label) => sayBtn(label).parent.children.find((n) => n.className === "echs-pop-more");
check("+ shows how many", moreBtn("kneel")?.textContent === "+1" && !sayBtn("on your knees"), `a "+1" beside kneel and its other wording hidden, got "${moreBtn("kneel")?.textContent}"`);
moreBtn("kneel").click();
check("+ opens the wordings", !!sayBtn("on your knees") && moreBtn("kneel").textContent === "−", "on your knees shown under kneel, its button now −");
sayBtn("on your knees").click();
check("a wording types itself", chatBox.value === "Bea, on your knees", `"Bea, on your knees", got "${chatBox.value}"`);
sayBtn("kneel").click();
check("the line still types the first", chatBox.value === "Bea, kneel", `"Bea, kneel" from the line itself, got "${chatBox.value}"`);
moreBtn("kneel").click();
check("− closes them", !sayBtn("on your knees"), "on your knees hidden again");
check("no + for a single wording", !moreBtn("elbows behind your back"), "no + beside a suggestion with one wording");
// Every phrase it can type, with a name in front, is what the add-on listens for.
const { voice } = await import("./harness-bundle.mjs");
const sug = await import("./harness-bundle.mjs").then((m) => m.popupSuggest);
const cats = sug.suggestCategories();
check("every permission has a group", !cats.some((c) => c.key === "other"), `no "Other" group, got ${JSON.stringify(cats.find((c) => c.key === "other")?.items.map((i) => i.permission))}`);
const itemIds = cats.flatMap((c) => c.items.map((i) => i.id));
check("each suggestion once", new Set(itemIds).size === itemIds.length && voice.suggestionHelp().every((s) => itemIds.includes(s.id)), "every voice.ts suggestion listed exactly once");
const wrong = [];
for (const c of cats) for (const it of c.items) for (const phrase of [it.phrase, ...it.alternates]) {
	const line = sug.suggestionText("Bea", phrase);
	const ok = it.id === "x-wake" ? voice.isWakeLine(line)
		: it.id === "x-deeper" ? voice.isDeepeningLine(line)
		: it.id === "x-walk" ? voice.walkingLineKind(line) === "enter"
		: it.id === "x-still" ? voice.walkingLineKind(line) === "leave"
		: it.id.startsWith("x-touch-block") || it.id.startsWith("x-touch-release") ? !!voice.matchBodyPartCommand(line)
		: it.id === "x-touch-self" ? !!voice.matchActivityCommand(line)
		: it.id === "x-kiss-me" ? voice.matchTargetedActivityCommand(line, ["Bea"])?.target === "me"
		: voice.matchSuggestion(line) === it.id;
	if (!ok) wrong.push(`${it.id}: "${line}" -> ${voice.matchSuggestion(line)}`);
}
check("every typed phrase matches", wrong.length === 0, `each phrase and alternate to match its own suggestion, wrong: ${wrong.join("; ")}`);
check("alternates are counted", cats.flatMap((c) => c.items).reduce((n, i) => n + i.alternates.length, 0) > 50, "the alternates included in that check (over 50 of them)");
// Releases under what they give back (DW 2026-11-21), kneel first.
const order = (key) => cats.find((c) => c.key === key).items.map((i) => i.id);
const after = (key, a, b) => order(key).indexOf(a) > order(key).indexOf(b);
check("sight: release last", after("senses", "sight-release", "sight-dim") && after("senses", "sight-release", "sight-blind"), `↺ you can see again after the three sight lines, got ${order("senses").join(",")}`);
check("speech: release under it", order("senses").indexOf("speech-release") === order("senses").indexOf("speech-block") + 1, "↺ you can speak again straight under you cannot speak");
check("mouth release before the eyes", after("face", "mouth-close", "moan") && after("face", "eyes-closed", "mouth-close"), `↺ close your mouth after the mouth lines and before the eyes, got ${order("face").join(",")}`);
check("kneel first, stand after the poses", order("body")[0] === "kneel" && after("body", "stand", "lie-down"), `kneel first and ↺ stand after lie down, got ${order("body").join(",")}`);
check("orgasm-allow under deny", order("arousal").indexOf("orgasm-allow") === order("arousal").indexOf("orgasm-deny") + 1, `↺ you may come under you cannot come, got ${order("arousal").join(",")}`);
check("wake last in Trance", order("trance").at(-1) === "x-wake", `↺ wake up last, got ${order("trance").join(",")}`);
// Two under you: a switcher, and the name follows the choice.
update(A, { phase: "Hypnotized", attempts: 1 });
popup.popupTick();
const chips = () => findAll(win(), (n) => n.className.startsWith("echs-pop-chip"));
check("switcher for two", chips().map((c) => c.textContent).join(",") === "Ali,Bea", `chips Ali, Bea, got ${chips().map((c) => c.textContent).join(",")}`);
chips()[0].click();
sayBtn("wake up").click();
check("switched subject", popup.currentSubject()?.id === A && chatBox.value === "Ali, wake up", `"Ali, wake up" after choosing Ali, got "${chatBox.value}"`);
update(A, { phase: "Idle" });
popup.popupTick();
check("chosen one wakes: back to the other", popup.currentSubject()?.id === B && chips().length === 0, "Bea chosen again, no switcher, once Ali is no longer under");
popup.setPopupTab("people");
check("people redrawn with status", personBtn("Bea").textContent.includes("under you"), `Bea's row tagged "under you", got "${personBtn("Bea")?.textContent}"`);
update(B, { phase: "Idle" });
popup.setPopupTab("suggest");
popup.popupTick();
check("nobody under: tab gone", popup.getPopupTab() === "people" && byText("Suggestions").length === 0, `Suggestions tab gone and People shown, got "${popup.getPopupTab()}"`);

// 8. Me (stage 3): we are the subject.
const HYP = A;
check("Me hidden when nothing is on us", !popup.availableTabs().includes("me"), "no Me tab with no session on us");
storage.setFeature("hypnoEnabled", true);
const forced = session.forceTrance(HYP, 40, 40);
check("test trance started", forced === null, `forceTrance to start the fixture, refused: ${forced}`);
popup.popupTick();
check("under: Me, chosen by itself", popup.getPopupTab() === "me" && popup.subjectSide() === "under", `Me tab chosen once we are under, got "${popup.getPopupTab()}" / ${popup.subjectSide()}`);
check("names who", findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent === "You are under Ali.").length === 1, "the line \"You are under Ali.\"");
const meBtn = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && n.textContent === label)[0];
check("its buttons", ["Wake", "Fight", "Agree", "Ignore", "What is on me"].every((l) => meBtn(l)), "Wake, Fight, Agree, Ignore and What is on me");
meBtn("Wake").click();
check("Wake types, not sends", chatBox.value === "/echs wake" && popup.subjectSide() === "under", `"/echs wake" typed and still under, got "${chatBox.value}"`);
byText("Safeword")[0].click();
popup.popupTick();
check("safeword ends it: Me gone", popup.subjectSide() === null && popup.getPopupTab() === "people", `no subject side and back on People, got ${popup.subjectSide()} / "${popup.getPopupTab()}"`);

ChatRoomCharacter = [Player];
popup.popupTick();
check("empty room says so", findAll(win(), (n) => n.className === "echs-pop-empty").length === 1, "the empty-list line once nobody with ECHS is here");

console.log(`popup: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
