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
let hidden = [];
globalThis.ServerSend = (type, data) => {
	if (type !== "ChatRoomChat") return;
	if (data?.Type === "Hidden") hidden.push({ to: data.Target, ...data?.Dictionary?.[0]?.message });
	else chatSent.push(data);
};
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m?.textContent ?? m));
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
// Timers that can be stopped, so a one-off poll (recovery's startup check) does not run every beat.
const intervals = new Map();
let nextTimer = 1;
globalThis.setInterval = (fn) => { intervals.set(nextTimer, fn); return nextTimer++; };
const beat = () => { for (const fn of [...intervals.values()]) fn(); };
globalThis.clearInterval = (id) => intervals.delete(id);
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
const { badge, messaging, session, depth } = await import("./harness-bundle.mjs");
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
		: it.id === "x-sip" ? voice.matchActivityCommand(line)?.kind === "sip"
		: it.id === "x-kiss-me" ? voice.matchTargetedActivityCommand(line, ["Bea"])?.target === "me"
		: it.id === "x-hug-me" ? voice.matchTargetedActivityCommand(line, ["Bea"])?.target === "me"
		: ["x-wiggle", "x-nod", "x-struggle", "x-cover-mouth", "x-gag-moan"].includes(it.id) ? !!voice.matchActivityCommand(line)
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
// 7b. Greying (stage 4), from Bea's own report.
popup.setPopupTab("suggest");
const tagOf = (label) => sayBtn(label)?.parent.parent.className ?? "";
check("no report: nothing greyed, and says why", !tagOf("kneel").includes("off") && findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.includes("older version")).length === 1, "no greying and the older-version line while Bea has sent no report");
update(B, { phase: "Hypnotized", attempts: 1, gates: { ok: ["postureControl"], deeper: ["arousalControl"] } });
popup.popupTick();
check("report redraws the list", !findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.includes("older version")).length, "the older-version line gone once Bea reports");
check("allowed: normal", tagOf("kneel") === "echs-pop-sug", `kneel shown normally, got "${tagOf("kneel")}"`);
const groupHead = (title) => findAll(win(), (n) => n.className.startsWith("echs-pop-group") && n.textContent.includes(title))[0];
check("group with nothing allowed is marked", groupHead("Speech, sight").textContent.endsWith("(not allowed)") && groupHead("Speech, sight").className.includes("echs-pop-off") && !groupHead("Body & pose").textContent.includes("not allowed") && !groupHead("Trance").textContent.includes("not allowed"), `Speech, sight & hearing marked (not allowed), Body and Trance not, got "${groupHead("Speech, sight").textContent}"`);
groupHead("Speech, sight").click();
groupHead("Arousal").click();
check("not allowed: greyed", tagOf("you cannot speak").includes("echs-pop-off"), `you cannot speak greyed, got "${tagOf("you cannot speak")}"`);
check("release never greyed", !tagOf("you can speak again").includes("off"), `↺ you can speak again not greyed (a release skips the permission), got "${tagOf("you can speak again")}"`);
check("too shallow: tagged deeper", tagOf("you are very aroused").includes("echs-pop-deeper") && sayBtn("you are very aroused").parent.textContent.includes("deeper"), `you are very aroused tagged deeper, got "${tagOf("you are very aroused")}"`);
check("wake never greyed", !tagOf("wake up").includes("off"), "wake up never greyed");
sayBtn("you cannot speak").click();
check("greyed still types, and says it won't land", chatBox.value === "Bea, you cannot speak" && status().includes("hasn't allowed this"), `typed with a won't-land status, got "${chatBox.value}" / "${status()}"`);
sayBtn("you are very aroused").click();
check("deeper says so", status().includes("isn't deep enough"), `a not-deep-enough status, got "${status()}"`);
update(B, { phase: "Hypnotized", attempts: 1, gates: { ok: "everything", deeper: [] } });
popup.popupTick();
check("malformed report: treated as none", !tagOf("you cannot speak").includes("off") && session.getSessionView(B).gates === null, "a malformed report ignored (nothing greyed)");
const missingKeys = [...new Set(cats.flatMap((c) => c.items.map((i) => i.permission)).flatMap((p) => p.split(" / ")).filter(Boolean))].filter((k) => !depth.SUGGESTION_GATE_KEYS.includes(k));
check("every suggestion permission is reported", missingKeys.length === 0, `each permission in SUGGESTION_GATE_KEYS, missing ${missingKeys.join(", ")}`);
update(B, { phase: "Idle" });
popup.setPopupTab("suggest");
popup.popupTick();
check("nobody under: tab gone", popup.getPopupTab() === "people" && byText("Suggestions").length === 0, `Suggestions tab gone and People shown, got "${popup.getPopupTab()}"`);

// 8. Me (stage 3): we are the subject.
const HYP = A;
check("Me hidden when nothing is on us", !popup.availableTabs().includes("me"), "no Me tab with no session on us");
storage.setFeature("hypnoEnabled", true);
storage.setFeature("postureControl", true);
storage.setFeature("arousalControl", true);
storage.setDepthOverride("postureControl", 10);
storage.setDepthOverride("arousalControl", 90);
storage.setDepthOverride("sightControl", 10);
hidden = [];
const forced = session.forceTrance(HYP, 40, 40);
check("test trance started", forced === null, `forceTrance to start the fixture, refused: ${forced}`);
popup.popupTick();
check("under: Me, chosen by itself", popup.getPopupTab() === "me" && popup.subjectSide() === "under", `Me tab chosen once we are under, got "${popup.getPopupTab()}" / ${popup.subjectSide()}`);
check("names who", findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent === "You are under Ali.").length === 1, "the line \"You are under Ali.\"");
check("depth shown", findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.startsWith("Depth: ")).length === 1, "a Depth: line on the Me tab");
// 9. The report (stage 4), our side: to our hypnotist only, permission names only.
const reports = () => hidden.filter((m) => m.type === "session-update" && m.phase === "Hypnotized");
const first = reports().at(-1);
check("report sent to our hypnotist", first && first.to === HYP && first.gates, `a session-update with gates to Ali (${HYP}), got ${JSON.stringify(first)}`);
check("allowed and deep enough", first?.gates.ok.includes("postureControl") && !first.gates.ok.includes("arousalControl"), `postureControl ok, got ${JSON.stringify(first?.gates)}`);
check("allowed, too shallow", first?.gates.deeper.includes("arousalControl"), `arousalControl deeper (needs 90, at 40), got ${JSON.stringify(first?.gates)}`);
check("not allowed: not mentioned", !JSON.stringify(first?.gates).includes("sightControl") && !JSON.stringify(first?.gates).includes("tranceCannotMove"), "sight (off) and trance defaults absent");
check("no depth number in it", !("depth" in (first ?? {})) && !JSON.stringify(first?.gates ?? {}).match(/\d/), "no depth figure in the report");
beat(); // let start-up polls finish what they would long since have done in a real session
const before = reports().length;
beat();
check("unchanged: not re-sent", reports().length === before, `no new report on a beat with nothing changed, got ${reports().length - before}`);
storage.setFeature("sightControl", true);
beat();
const latest = reports().at(-1);
check("permission ticked mid-trance: re-sent", reports().length === before + 1 && latest.gates.ok.includes("sightControl"), `one new report with sightControl ok, got ${reports().length - before} / ${JSON.stringify(latest?.gates)}`);
const meBtn = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && n.textContent === label)[0];
check("its buttons", ["Wake", "Fight", "Agree", "Ignore", "What is on me"].every((l) => meBtn(l)), "Wake, Fight, Agree, Ignore and What is on me");
meBtn("Wake").click();
check("Wake types, not sends", chatBox.value === "/echs wake" && popup.subjectSide() === "under", `"/echs wake" typed and still under, got "${chatBox.value}"`);
byText("Safeword")[0].click();
popup.popupTick();
check("safeword ends it: Me gone", popup.subjectSide() === null && popup.getPopupTab() === "people", `no subject side and back on People, got ${popup.subjectSide()} / "${popup.getPopupTab()}"`);

// 10. Triggers (stage 5).
const T = (await import("./harness-bundle.mjs")).popupTriggers;
// Every planting line, name in front (finished with its sample where it needs finishing), is read
// by the parsers as what it says it is.
const expectKind = { start: "start", commit: "commit", cancel: "cancel", drop: "drop", say: "say", react: "condition" };
const plantWrong = [];
for (const g of T.PLANT_GROUPS) for (const l of g.lines) {
	const line = `Bea, ${l.sample ?? l.phrase}`;
	const ctl = voice.parseTriggerControl(line);
	const ok =
		(g.key === "shape" || l.id === "every" || l.id === "worn") && !expectKind[l.id] ? ctl?.kind === "option"
		: g.key === "compel" ? ctl?.kind === "condition" && voice.parseCondition(line)?.rest === "you will kneel"
		: g.key === "keep" ? voice.isReinforceLine(line)
		: ctl?.kind === expectKind[l.id];
	if (!ok) plantWrong.push(`${l.id}: "${line}" -> ${JSON.stringify(ctl)}`);
	if (!!l.finish !== !!l.sample) plantWrong.push(`${l.id}: a line to finish needs a sample, and only then`);
	// Each choice in a list, finished, is the condition it names (v1.16.9).
	for (const ch of l.choices ?? []) {
		const p = voice.parseCondition(`Bea, ${ch.phrase}you will kneel`);
		if (p?.fireOn !== "act" || p.rest !== "you will kneel" || !ch.phrase.includes(ch.label)) plantWrong.push(`${l.id} choice "${ch.label}": ${JSON.stringify(p)}`);
	}
}
check("the 'when anyone' list has every act", (T.PLANT_GROUPS.find((g) => g.key === "compel")?.lines.find((l) => l.id === "act")?.choices ?? []).length, 14);
check("every planting line parses", plantWrong.length === 0, `each line read as intended, wrong: ${plantWrong.join("; ")}`);
const plantedWrong = [];
const [fire, rel, rem] = T.plantedLines("sleepy time").map((l) => `Bea, ${l.phrase}`);
if (!fire.includes("sleepy time")) plantedWrong.push("say it");
if (!voice.isTriggerReleaseLine(rel)) plantedWrong.push(`release "${rel}"`);
if (voice.parseTriggerRemoval(rem)?.phrase !== "sleepy time") plantedWrong.push(`remove "${rem}"`);
if (voice.parseTriggerRemoval(`Bea, ${T.FORGET_ALL.phrase}`)?.kind !== "all") plantedWrong.push("remove everything");
const [cRel, cRem] = T.COMPULSION_LINES.map((l) => `Bea, ${l.phrase}`);
if (!voice.isCompulsionReleaseLine(cRel) || !voice.isTriggerReleaseLine(cRel)) plantedWrong.push(`compulsion release "${cRel}"`);
if (voice.parseTriggerRemoval(cRem)?.kind !== "compulsions") plantedWrong.push(`compulsion remove "${cRem}"`);
if (voice.isTriggerRemovalLine(rel) || voice.isTriggerReleaseLine(rem)) plantedWrong.push("release and remove overlap");
check("release / remove / remove all parse", plantedWrong.length === 0, `each read as intended, wrong: ${plantedWrong.join("; ")}`);

const COMPULSION_ACT_ITEMS_IN_ACT_LINE = () => (T.PLANT_GROUPS.find((g) => g.key === "compel")?.lines.find((l) => l.id === "act")?.choices ?? []).filter((c) => /gags you|ties your arms|chastity/.test(c.label)).length;
// The tab: always there; planting lines only while someone is under you.
ChatRoomCharacter = [Player, { MemberNumber: A, Name: "Alice", Nickname: "Ali" }, { MemberNumber: B, Name: "Bea" }];
check("Triggers tab always offered", popup.availableTabs().includes("triggers"), "a Triggers tab with nobody under you");
popup.setPopupTab("triggers");
const hint = (start) => findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.startsWith(start)).length === 1;
check("nobody under: says how to start", hint("To plant a trigger, put someone under first"), "the put-someone-under-first line");
// v1.16.9: the planting groups show, greyed, with nobody under (DW: the compulsions seemed missing).
const grpBtn = (t) => findAll(win(), (n) => n.className?.startsWith?.("echs-pop-group") && n.textContent.endsWith(t))[0];
check("nobody under: Compulsions group still listed", !!grpBtn("Compulsions (waiting for something, not a word)"), "the Compulsions group");
grpBtn("Compulsions (waiting for something, not a word)")?.click();
const greyed = findAll(win(), (n) => n.className === "echs-pop-item echs-pop-off" && n.textContent === "+ when anyone … you, … (pick what they do)")[0];
check("  greyed, with the new 'when anyone' line", !!greyed, "a greyed 'when anyone' line");
// v1.16.22 (DW: the item triggers weren't to be seen): a greyed list still opens, to read.
const itemLine = findAll(win(), (n) => n.className === "echs-pop-item echs-pop-off" && n.textContent.startsWith("+ whenever anyone puts an item on you"))[0];
check("  the items have their own greyed line", !!itemLine, "a greyed 'puts an item on you' line");
itemLine?.click();
const gagChip = findAll(win(), (n) => n.className === "echs-pop-chip echs-pop-off" && n.textContent === "gags you")[0];
check("  it opens with nobody under, listing the items", !!gagChip && findAll(win(), (n) => n.className === "echs-pop-chip echs-pop-off" && n.textContent === "locks you in chastity").length === 1, "greyed item chips");
check("  and the activity list has no items in it", COMPULSION_ACT_ITEMS_IN_ACT_LINE() === 0, "no item acts in the activity list");
chatBox.value = "";
gagChip?.click();
check("  a click types nothing and says why", chatBox.value === "" && status().includes("Nobody is under you"), `nothing typed, got "${chatBox.value}" / "${status()}"`);
itemLine?.click();
check("  the hint lists what 'anyone' can do", hint("Then the suggestion") && findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.includes("kisses you, touches you, hugs you")).length === 1, "the act list in the hint");
grpBtn("Compulsions (waiting for something, not a word)")?.click();
update(B, { phase: "Hypnotized", attempts: 1 });
popup.setPopupTab("triggers");
popup.popupTick();
check("someone under: planting for them", popup.getPopupTab() === "triggers" || popup.getPopupTab() === "suggest", "still offering Triggers");
popup.setPopupTab("triggers");
check("planting names them", hint("Planting in Bea."), "the Planting in Bea line");
const trigBtn = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-item") && n.textContent.replace(/^↺ /, "") === label)[0];
// v1.16.9: "when anyone …" opens its list; a choice types the start of the line.
grpBtn("Compulsions (waiting for something, not a word)")?.click();
trigBtn("+ when anyone … you, … (pick what they do)")?.click();
const spankChip = findAll(win(), (n) => n.className === "echs-pop-chip" && n.textContent === "spanks you")[0];
check("'when anyone' opens the list", !!spankChip && !!trigBtn("− when anyone … you, … (pick what they do)"), "a spanks-you chip under an open line");
spankChip?.click();
check("  a choice types the start, to finish", chatBox.value === "Bea, when anyone spanks you, " && status().includes("Change \"anyone\""), `"Bea, when anyone spanks you, ", got "${chatBox.value}" / "${status()}"`);
trigBtn("− when anyone … you, … (pick what they do)")?.click();
grpBtn("Compulsions (waiting for something, not a word)")?.click();
trigBtn("your trigger word is …").click();
check("start: typed to finish", chatBox.value === "Bea, your trigger word is " && status().includes("Finish it (the word or phrase)"), `"Bea, your trigger word is " and a finish-it status, got "${chatBox.value}" / "${status()}"`);
trigBtn("remember trigger").click();
check("commit typed", chatBox.value === "Bea, remember trigger", `"Bea, remember trigger", got "${chatBox.value}"`);
check("shaping closed at first", !trigBtn("anyone can use it") && byText("+  Shape it").length === 1, "Shape it collapsed at first");

// What you planted: from Bea's own answer, asked once.
const asks = () => hidden.filter((m) => m.type === "state-query" && m.planted && m.to === B).length;
const asksBefore = asks();
// The answer as remote.ts's state-response handler passes it on (remote.ts is not installed here).
(await import("./harness-bundle.mjs")).planted.receivePlanted(B, "Bea", [
	{ word: "sleepy time", when: "", does: ["kneel"], strength: "full strength", once: false, holding: false },
	{ word: "", when: "when Rei comes in", does: ["kneel"], strength: "full strength", once: true, holding: false },
]);
popup.popupTick();
check("planted group for Bea", byText("+  What you planted in Bea").length === 1, "a What you planted in Bea group");
byText("+  What you planted in Bea")[0].click();
check("asked once, not per redraw", asks() - asksBefore <= 1, `at most one ask of Bea, got ${asks() - asksBefore}`);
popup.setPopupTab("people"); popup.setPopupTab("triggers"); popup.popupTick();
check("not asked again within 30s", asks() - asksBefore <= 1, `still at most one ask after reopening, got ${asks() - asksBefore}`);
const chipIn = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && n.textContent === label);
check("a row per planted trigger", findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === '"sleepy time"').length === 1 && findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === "when Rei comes in").length === 1, "rows for sleepy time and the compulsion");
// v1.16.10: the compulsion row has release / remove too (no "say it": it has no word).
check("chips on both rows, say it only on the word", chipIn("release").length === 2 && chipIn("remove").length === 2 && chipIn("say it").length === 1, `release / remove twice, say it once, got ${chipIn("release").length} / ${chipIn("say it").length}`);
chipIn("release")[1].click();
check("compulsion release typed", chatBox.value === "Bea, you are released from the compulsion", `got "${chatBox.value}"`);
chipIn("remove")[1].click();
check("compulsion remove typed", chatBox.value === "Bea, forget your compulsions", `got "${chatBox.value}"`);
chipIn("release")[0].click();
check("release typed", chatBox.value === "Bea, you are released from sleepy time", `got "${chatBox.value}"`);
chipIn("remove")[0].click();
check("remove typed", chatBox.value === "Bea, forget the trigger sleepy time", `got "${chatBox.value}"`);
trigBtn("remove everything I planted").click();
check("remove all typed", chatBox.value === "Bea, forget every trigger I gave you", `got "${chatBox.value}"`);
check("compulsion says how to remove it", findAll(win(), (n) => n.className === "echs-pop-desc" && n.textContent.startsWith("No word")).length === 1, "the no-word note on the compulsion");

// Triggers in you: numbered as /echs triggers numbers them; refused things say so.
const plantIn = (phrase) => storage.saveTrigger({ phrase, actions: ["movement-block"], installedBy: A, installedByName: "Alice", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
plantIn("bluebell");
plantIn("snowdrop");
popup.popupTick();
check("own triggers listed", byText("−  Triggers in you (2)").length === 1, `a Triggers in you (2) group, got ${findAll(win(), (n) => n.className.startsWith("echs-pop-group")).map((n) => n.textContent).join(" | ")}`);
check("words hidden by default", findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === "1. word hidden").length === 1, "row 1 reads word hidden");
chipIn("forget")[1].click();
check("forget types its number", chatBox.value === "/echs forgettrigger 2" && status() === "Typed. Press Enter to remove it.", `"/echs forgettrigger 2", got "${chatBox.value}" / "${status()}"`);
chipIn("details")[0].click();
check("details types its number", chatBox.value === "/echs triggers 1", `got "${chatBox.value}"`);
chipIn("Fast")[0].click();
check("fade speed typed", chatBox.value === "/echs triggerdecay fast", `got "${chatBox.value}"`);
check("current fade speed marked", chipIn("Never")[0].className.includes("echs-pop-chip-on"), "Never marked as the current speed");
storage.startExtremeLock("trial", Date.now());
popup.popupTick();
check("Extreme lock: forget faded", chipIn("forget")[0].className.includes("echs-pop-off") && chipIn("Fast")[0].className.includes("echs-pop-off"), "forget and the fade speeds faded under the lock");
chipIn("forget")[0].click();
check("Extreme lock: still types, says refused", chatBox.value === "/echs forgettrigger 1" && status().includes("will be refused") && status().includes("Extreme lock"), `typed with a refused status, got "${status()}"`);
check("never mentions the way out", !JSON.stringify(findAll(win(), () => true).map((n) => n.title + n._text)).includes("exit_extreme"), "no exit_extreme anywhere in the window");
storage.clearExtremeLock();
storage.forgetAllTriggers();
update(B, { phase: "Idle" });
popup.popupTick();

// 11. Resizing (v1.13.2, DW).
let observed = null;
globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe(el) { observed = el; } disconnect() { observed = null; } };
popup.setPopupOpen(false);
popup.setPopupOpen(true);
let w = win();
check("resize watched", observed === w, "a ResizeObserver on the window");
check("no saved size: default, nothing saved", !w.style.width && !w.style.height && storage.getPopupSize() === null, `no inline size and none saved, got ${JSON.stringify(w.style)}`);
popup.noteWindowSize(w);
check("an untouched window saves nothing", storage.getPopupSize() === null, "no size saved before the player resizes");
// The browser's grip writes an inline size; once it stays put it is saved, once.
w.style.width = "480px"; w.style.height = "600px"; w.offsetWidth = 480; w.offsetHeight = 600;
popup.noteWindowSize(w);
check("resized: saved", JSON.stringify(storage.getPopupSize()) === JSON.stringify({ w: 480, h: 600 }), `480×600 saved, got ${JSON.stringify(storage.getPopupSize())}`);
popup.setPopupOpen(false);
popup.setPopupOpen(true);
w = win();
check("reopened at that size", w.style.width === "480px" && w.style.height === "600px", `480×600 on reopening, got ${w.style.width}×${w.style.height}`);
storage.setPopupSize({ w: 5000, h: 5000 });
popup.setPopupOpen(false);
popup.setPopupOpen(true);
w = win();
check("too big for the screen: shrunk to fit", w.style.width === `${1600 - 8}px` && w.style.height === `${900 - 8}px`, `clamped to ${1600 - 8}×${900 - 8}, got ${w.style.width}×${w.style.height}`);
const tiny = popup.clampSize(10, 10, 1600, 900);
check("never smaller than the minimum", tiny.w === popup.MIN_WIDTH && tiny.h === popup.MIN_HEIGHT, `${popup.MIN_WIDTH}×${popup.MIN_HEIGHT}, got ${JSON.stringify(tiny)}`);
const titleBar = findAll(w, (n) => n.className === "echs-pop-head")[0];
titleBar.dispatchEvent({ type: "dblclick", target: titleBar });
check("double-click the title: normal size", !w.style.width && !w.style.height && storage.getPopupSize() === null && status() === "Back to the normal size.", `inline size cleared and forgotten, got ${w.style.width}×${w.style.height} / ${JSON.stringify(storage.getPopupSize())}`);
storage.setPopupSize({ w: 400, h: 400 });
const xBtn = byText("×")[0];
titleBar.dispatchEvent({ type: "dblclick", target: xBtn });
check("double-click on × is not a reset", JSON.stringify(storage.getPopupSize()) === JSON.stringify({ w: 400, h: 400 }), "the saved size kept when the double-click was on a button");
storage.setPopupSize(null);
popup.setPopupOpen(false);
check("closing stops watching", observed === null, "the ResizeObserver disconnected when the window closes");
popup.setPopupOpen(true);

// 12. The gear (v1.13.4, DW): straight into the ECHS settings, no guide on top.
const helpMod = (await import("./harness-bundle.mjs")).help;
const gearBtn = () => findAll(win(), (n) => n.tagName === "BUTTON" && n.textContent === "⚙")[0];
check("a gear in the title bar", !!gearBtn() && gearBtn().title === "ECHS settings", "a ⚙ button titled ECHS settings");
let opened = [], loaded = 0, hidden2 = 0;
globalThis.PreferenceOpenSubscreen = async (name) => { opened.push(name); };
globalThis.PreferenceExtensionsSettings = { HypnosisAddon: { load() { loaded++; } } };
globalThis.PreferenceExtensionsCurrent = null;
globalThis.PreferenceIDs = { subscreen: "preference-subscreen" };
globalThis.ElementWrap = () => ({ toggleAttribute: (a, on) => { if (a === "hidden" && on) hidden2++; } });
gearBtn().click();
await new Promise((r) => setImmediate(r));
check("gear: opens Preferences > Extensions > ECHS", opened.join(",") === "Extensions" && PreferenceExtensionsCurrent === PreferenceExtensionsSettings.HypnosisAddon && loaded === 1 && hidden2 === 1, `Extensions opened, ours current and loaded, BC's list hidden; got ${opened} / ${loaded} / ${hidden2}`);
check("gear: no guide on top", !helpMod.isHelpOpen(), "the settings, not the help guide");
const menuMod = (await import("./harness-bundle.mjs")).menu;
await menuMod.openHelpScreen();
check("/echs help still opens the guide", helpMod.isHelpOpen(), "the guide open after openHelpScreen");
helpMod.closeHelp();
delete globalThis.PreferenceOpenSubscreen;
gearBtn().click();
await new Promise((r) => setImmediate(r));
check("gear can't open: says where they are", status().startsWith("Couldn't open them from here.") && status().includes("Preferences > Extensions > ECHS Hypnosis"), `the manual path in the status, got "${status()}"`);
delete globalThis.PreferenceExtensionsSettings; delete globalThis.PreferenceIDs; delete globalThis.ElementWrap;
const tb = findAll(win(), (n) => n.className === "echs-pop-head")[0];
storage.setPopupSize({ w: 400, h: 400 });
tb.dispatchEvent({ type: "dblclick", target: gearBtn() });
check("double-click on the gear is not a reset", JSON.stringify(storage.getPopupSize()) === JSON.stringify({ w: 400, h: 400 }), "the saved size kept");
storage.setPopupSize(null);

// 13. Keys tab (v1.14.0).
const KH = (await import("./harness-bundle.mjs")).keyholder;
KH.resetKeyholderViews();
ChatRoomCharacter = [Player, { MemberNumber: A, Name: "Alice", Nickname: "Ali" }, { MemberNumber: B, Name: "Bea" }];
check("Keys tab always offered", popup.availableTabs().includes("keys"), "a Keys tab");
popup.setPopupTab("keys");
check("your keyholders shown", byText("−  Your keyholders").length === 1, "the Your keyholders group, open");
const keyChip = (label) => findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && n.textContent === label)[0];
// v1.16.0 (job6.md §2): one "Give keys" button per person, cycling; the owner's comes first.
check("no take/grant buttons any more", !keyChip("grant") && !keyChip("add (take)") && !keyChip("make take"), "the old labels gone");
keyChip("Give keys (minimal)").click();
check("owner's Give keys types minimal first", chatBox.value === "/echs keyholder owner minimal" && chatSent.length === 0, `"/echs keyholder owner minimal" typed, got "${chatBox.value}"`);
keyChip("Give keys (minimal)").click(); // the owner's again: its label is what was typed
check("  a second click on it moves on", chatBox.value === "/echs keyholder owner moderate", `owner moderate, got "${chatBox.value}"`);
keyChip("Give keys (minimal)").click(); // now the first minimal button is Alice's
check("another person's button types its own label first", /^.echs keyholder add .+ minimal$/.test(chatBox.value), `an add at minimal, got "${chatBox.value}"`);
check("  and the button now says so", !!keyChip("Give keys (moderate)"), "a moderate label");
check("no held-keys group while we hold none", byText("−  Settings you hold keys to").length === 0, "no held-keys group");
// Bea says we hold her keys, take only, and sends her settings.
// As remote.ts's state-response handler passes it on (remote.ts is not installed here).
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.14.0", keyholder: "take", settings: { boxes: [{ key: "sightControl", on: true }, { key: "postureControl", on: false }], extreme: true, mode: "take" } });
hidden = [];
popup.popupTick();
check("held-keys group for Bea", byText("−  Settings you hold keys to").length === 1 && findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.startsWith("Bea's settings. You hold minimal keys")).length === 1, "Bea's settings, minimal wording (an older subject's take)");
check("  asked her once for fresh settings", hidden.filter((m) => m.to === B && m.type === "remote-request" && m.action === "read").length === 1, "one read request to Bea");
const box = (start) => findAll(win(), (n) => n.className.startsWith("echs-pop-item") && n.textContent.startsWith(start))[0];
check("on box ticked, off box faded for take", box("☑ Sight")?.className.includes("echs-pop-off") === false && box("☐ Posture Control")?.className.includes("echs-pop-off"), "Sight ticked and live, Posture unticked and faded");
const typedBefore = chatBox.value;
hidden = [];
box("☑ Sight").click();
const sentReq = hidden.find((m) => m.to === B && m.type === "remote-request");
check("a box click sends, does not type", sentReq?.action === "set" && sentReq.key === "sightControl" && sentReq.value === false && chatBox.value === typedBefore, `a set request to Bea and the chat box untouched, got ${JSON.stringify(sentReq)}`);
check("  status says it asked", status().startsWith("Asked Bea's ECHS to switch off"), `the asked status, got "${status()}"`);
hidden = [];
keyChip("end their Extreme lock").click();
check("end Extreme: first click only arms", !hidden.some((m) => m.action === "end-extreme") && status().startsWith("Click again"), "no request yet, and a click-again status");
keyChip("click again to end it").click();
check("  second click sends it", hidden.some((m) => m.to === B && m.action === "end-extreme"), "an end-extreme request to Bea");
// v1.16.2 (job6.md stage 3): full keys, the Depth tab folded shut, numbers as step buttons.
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [{ key: "triggerScope", value: "friends" }, { key: "triggerDuration", value: "0" }, { key: "depth:sightControl", value: "40" }, { key: "depthDefaults", value: "changed" }], extreme: false, mode: "grant", level: "full" } });
popup.popupTick();
check("Depth starts folded", byText("+ Depth").length === 1 && !keyChip("+20"), "a + Depth heading and no depth step buttons");
check("  Triggers is open, its choice named", byText("− Triggers").length === 1 && findAll(win(), (n) => n.className === "echs-pop-desc" && n.textContent === "Who else can fire triggers planted in you: Hypnotist, Owner, Lovers and friends").length === 1, "the scope line");
check("  duration reads plainly, can't go below 0", findAll(win(), (n) => n.className === "echs-pop-desc" && n.textContent.endsWith(": until released")).length === 1 && keyChip("-5")?.className.includes("echs-pop-off"), "until released, -5 faded");
byText("+ Depth")[0].click();
check("unfolded: the depth and its tier", findAll(win(), (n) => n.className === "echs-pop-desc" && /^Sight: 40 \(.+\)$/.test(n.textContent)).length === 1, "Sight: 40 (tier)");
check("  reset reads as some changed", findAll(win(), (n) => n.className === "echs-pop-desc" && n.textContent === "Depth requirements: some changed").length === 1, "some changed");
hidden = [];
findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && n.textContent === "+20")[0].click();
const stepReq = hidden.find((m) => m.to === B && m.action === "choose");
check("a step sends the new number", stepReq?.key === "depth:sightControl" && stepReq.value === "60", `depth:sightControl 60, got ${JSON.stringify(stepReq)}`);
byText("− Depth")[0].click();
check("  and folds again", byText("+ Depth").length === 1, "folded");
// v1.16.2 (job6.md §4): what is planted in her, folded; remove takes two clicks; a refusal says why.
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", planted: [
	{ id: "0000000a", word: "", when: "", does: ["kneels"], strength: "full strength", once: false, holding: false, by: "Hyp", removable: true, why: "" },
	{ id: "0000000b", word: "glow", when: "", does: ["sleeps"], strength: "full strength", once: true, holding: false, by: "themselves", removable: false, why: "They planted this in themselves: only they can remove it." },
] } });
popup.popupTick();
check("planted list starts folded, with a count", byText("+ Planted in them (2)").length === 1 && !keyChip("remove"), "folded, no remove buttons");
byText("+ Planted in them (2)")[0].click();
check("  unfolded: hidden word and planter", findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === "A trigger word you can't see · planted by Hyp").length === 1 && findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === '"glow" · planted by themselves').length === 1, "both headlines");
const removes = () => findAll(win(), (n) => n.className.startsWith("echs-pop-chip") && (n.textContent === "remove" || n.textContent === "click again to remove it"));
hidden = [];
removes()[1].click();
check("not removable: says why, sends nothing", status() === "They planted this in themselves: only they can remove it." && !hidden.some((m) => m.action === "remove-trigger") && removes()[1].className.includes("echs-pop-off"), `the reason, got "${status()}"`);
removes()[0].click();
check("removable: first click only arms", !hidden.some((m) => m.action === "remove-trigger") && removes()[0].textContent === "click again to remove it", "armed, nothing sent");
removes()[0].click();
check("  second click sends it", hidden.some((m) => m.to === B && m.action === "remove-trigger" && m.id === "0000000a"), `a remove-trigger for 0000000a, got ${JSON.stringify(hidden)}`);
// v1.16.2 (job6.md §5): lock asks her (one click; she must accept), unlock takes two clicks.
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyLock: "Olive" } });
popup.popupTick();
check("locked: says by whom, offers unlock", findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent.startsWith("Their settings are locked by Olive")).length === 1 && !!keyChip("unlock their settings") && !keyChip("lock their settings"), "the locked line and an unlock button");
hidden = [];
keyChip("unlock their settings").click();
check("  unlock: first click only arms", !hidden.some((m) => m.action === "unlock") && !!keyChip("click again to unlock"), "armed");
keyChip("click again to unlock").click();
check("  second click sends it", hidden.some((m) => m.to === B && m.action === "unlock"), JSON.stringify(hidden));
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyLock: "" } });
popup.popupTick();
hidden = [];
keyChip("lock their settings").click();
check("unlocked: lock asks at once", hidden.some((m) => m.to === B && m.action === "lock") && status().includes("30 seconds"), `a lock request, got ${JSON.stringify(hidden)}`);
// v1.16.3: Extreme (job6.md §6) and the keys lock.
hidden = [];
keyChip("start Extreme for them").click();
check("start Extreme asks", hidden.some((m) => m.to === B && m.action === "extreme") && !keyChip("extend their Extreme lock"), JSON.stringify(hidden));
hidden = [];
keyChip("lock who holds their keys").click();
check("lock keys asks (not her owner)", hidden.some((m) => m.to === B && m.action === "lock-keys") && status().includes("30 seconds"), `${JSON.stringify(hidden)} "${status()}"`);
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.3", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: true, mode: "grant", level: "full", keyLock: "", keysLock: "Olive" } });
popup.popupTick();
check("keys locked: says by whom, offers unlock and extend", findAll(win(), (n) => n.className === "echs-pop-hint" && n.textContent === "Who holds their keys is locked by Olive.").length === 1 && !!keyChip("unlock who holds their keys") && !!keyChip("extend their Extreme lock"), "the line and both buttons");
hidden = [];
keyChip("unlock who holds their keys").click();
check("  unlock keys: first click arms", !hidden.some((m) => m.action === "unlock-keys") && !!keyChip("click again to unlock their keys"), "armed");
keyChip("click again to unlock their keys").click();
check("  second click sends it", hidden.some((m) => m.to === B && m.action === "unlock-keys"), JSON.stringify(hidden));
// v1.16.3: as their owner, their other keyholders, each with take their keys back (two clicks).
KH.receiveKeyholderFields(B, { type: "state-response", version: "1.16.3", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyholders: [{ id: 900, name: "Kay", mode: "moderate" }] } });
popup.popupTick();
check("full keys: their other keyholders listed", findAll(win(), (n) => n.className === "echs-pop-desc" && n.textContent === "Kay · moderate").length === 1 && !!keyChip("take their keys back") && findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === "Their other keyholders").length === 1, "Kay with a button");
hidden = [];
keyChip("take their keys back").click();
check("  not their owner: one click asks them", hidden.some((m) => m.to === B && m.action === "remove-keyholder" && m.id === 900) && status().includes("30 seconds"), `${JSON.stringify(hidden)} "${status()}"`);
// As their owner: two clicks, at once.
const beaChar = ChatRoomCharacter.find((c) => c.MemberNumber === B);
beaChar.IsOwnedByPlayer = () => true;
popup.popupTick();
check("  as their owner: says so", findAll(win(), (n) => n.className === "echs-pop-person" && n.textContent === "Their other keyholders (you're their owner)").length === 1, "owner heading");
hidden = [];
keyChip("take their keys back").click();
check("  first click arms", !hidden.some((m) => m.action === "remove-keyholder") && !!keyChip("click again"), "armed");
keyChip("click again").click();
check("  second click sends it", hidden.some((m) => m.to === B && m.action === "remove-keyholder" && m.id === 900), JSON.stringify(hidden));
delete beaChar.IsOwnedByPlayer;
KH.resetKeyholderViews();
popup.setPopupTab("people");
popup.popupTick();

ChatRoomCharacter = [Player];
popup.popupTick();
check("empty room says so", findAll(win(), (n) => n.className === "echs-pop-empty").length === 1, "the empty-list line once nobody with ECHS is here");

console.log(`popup: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
