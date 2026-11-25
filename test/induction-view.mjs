// The induction as the subject's popup and the hypnotist's remote show it (v1.16.29, UI lab review
// F3 + F4). Each check says what failure looks like.
//
//   1. While ECHS's own box is up (the induction choice), the popup folds to its header and moves to
//      the top, so it never covers the box; once answered it is back where it was.
//   2. After Agree, the Me tab says what she chose and offers the other two, never a Wake button
//      (/echs wake refuses outside a trance). After a miss it says so, with the count.
//   3. Her choice can be changed between attempts too; a retry reuses it without asking again.
//   4. A "Typed. Press Enter…" status goes once the line is sent (the chat box empties).
//   5. The remote: someone who runs ECHS but sends no session report is shown "No answer" with a
//      Check again button after the probe's wait, never "Checking…" for good.
//   6. session-query is always answered, and one failing hidden-message handler cannot take the
//      message down with it.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "Eri" }];
globalThis.ChatRoomData = { Name: "Some Room" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let hidden = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat" && data?.Type === "Hidden") hidden.push({ to: data.Target, ...data?.Dictionary?.[0]?.message }); };
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m?.textContent ?? m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.CharacterSetActivePose = () => {};
let clock = 1_000_000;
Date.now = () => clock;
const pending = [];
globalThis.setTimeout = (fn, ms) => pending.push({ fn, ms });
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) if (pending[i].fn && pending[i].ms === 60_000) { const fn = pending[i].fn; pending[i].fn = null; fn(); return; }
	throw new Error("no induction window open");
};
globalThis.CurrentScreen = "ChatRoom";
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

const { popup, session, messaging, storage, remote } = await import("./harness-bundle.mjs");
session.installSession();
let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const win = () => document.getElementById(popup.POPUP_ID);
const findAll = (n, pred, out = []) => { if (pred(n)) out.push(n); for (const c of n.children) findAll(c, pred, out); return out; };
const buttonLabels = () => findAll(win(), (n) => n.tagName === "BUTTON").map((n) => n.textContent);
const status = () => findAll(win(), (n) => n.className === "echs-pop-status")[0].textContent;
const incoming = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const attempt = () => incoming(HYP, { type: "session-attempt", hypnotistName: "Eri" });
const aside = () => /echs-pop-aside/.test(win().className);
storage.setFeature("hypnoEnabled", true);
popup.installPopup();
popup.setPopupOpen(true);
popup.popupTick();
const homeTop = win().style.top;

// 1. The box is up: the window steps aside, and comes back.
attempt();
popup.popupTick();
check("box up: folded", aside(), "the window folded while the choice box is up");
check("  at the top", win().style.top === "8px", `top 8px, got ${win().style.top}`);
session.answerPrompt("agree");
popup.popupTick();
check("answered: unfolded", !aside(), "the window back to normal once answered");
check("  where it was", win().style.top === homeTop, `top ${homeTop}, got ${win().style.top}`);

// 2. After Agree: what she chose, the other two, no Wake.
popup.setPopupTab("me");
popup.popupTick();
const me = popup.meView();
check("says the choice", me.lines.some((l) => /You chose Agree/.test(l)), `"You chose Agree", got ${JSON.stringify(me.lines)}`);
check("offers the other two", JSON.stringify(me.buttons.map((b) => b.label)) === JSON.stringify(["Ignore", "Fight"]), `Ignore and Fight, got ${JSON.stringify(me.buttons.map((b) => b.label))}`);
check("no Wake", !buttonLabels().includes("Wake"), `no Wake button, got ${JSON.stringify(buttonLabels())}`);
check("they type the change", me.buttons[1].text === "/echs fight", `"/echs fight", got ${me.buttons[1].text}`);

// 4. A typed status goes once the line is sent.
const fight = findAll(win(), (n) => n.tagName === "BUTTON" && n.textContent === "Fight")[0];
fight.click();
check("typed", /^Typed/.test(status()) && chatBox.value === "/echs fight", `"Typed…" and the line in the box, got "${status()}" / "${chatBox.value}"`);
popup.popupTick();
check("  kept while it is in the box", /^Typed/.test(status()), `still "Typed…", got "${status()}"`);
chatBox.value = "";
popup.popupTick();
check("  gone once sent", !/^Typed/.test(status()), `the start status back, got "${status()}"`);

// 3. A miss: said with the count; the choice can still change, and the retry keeps it.
session.answerPrompt("fight");
Math.random = () => 0.999;
runRoll();
popup.popupTick();
const missed = popup.meView();
check("a miss says so", missed.lines.some((l) => /attempt missed \(1 of 2\)/.test(l)), `"missed (1 of 2)", got ${JSON.stringify(missed.lines)}`);
check("  still no Wake", !missed.buttons.some((b) => b.label === "Wake"), `no Wake, got ${JSON.stringify(missed.buttons)}`);
check("  shows the changed choice", missed.lines.some((l) => /You chose Fight/.test(l)), `"You chose Fight", got ${JSON.stringify(missed.lines)}`);
said = [];
session.answerPrompt("ignore");
check("changing it between attempts works", session.inductionStanding()?.choice === "ignore", `choice ignore, got ${JSON.stringify(session.inductionStanding())}`);
check("  and says so", said.some((s) => /try again/.test(s)) && !said.some((s) => /Nobody is attempting/.test(s)), `a line about the next try, got ${JSON.stringify(said)}`);
incoming(HYP, { type: "session-continue" });
check("the retry asks nothing", session.getPendingPrompt() === null && session.inductionStanding()?.choice === "ignore", `no prompt and ignore kept, got ${JSON.stringify(session.inductionStanding())}`);
session.safeword();

// 6. session-query is always answered; a failing handler is contained.
hidden = [];
incoming(HYP, { type: "session-query" });
check("query answered", hidden.some((m) => m.type === "session-update" && m.to === HYP), `a session-update to ${HYP}, got ${JSON.stringify(hidden)}`);
messaging.registerHiddenHandler("test-boom", () => { throw new Error("boom"); });
let threw = false;
try { incoming(HYP, { type: "test-boom" }); } catch { threw = true; }
check("a failing handler is contained", !threw, "no throw out of handleIncomingHidden");

// 5. The remote: present, but no session report.
const target = { MemberNumber: 777, Name: "Quiet" };
remote.probeRemote(target);
check("at first: checking", !remote.sessionLate(777), "not late straight after asking");
clock += 3500;
check("after the wait: no answer", remote.sessionLate(777), "late 3.5 s after asking with no report");
incoming(777, { type: "session-update", phase: "Idle", attempts: 0, maxAttempts: 2, cooldownRemaining: 0, windowRemaining: 0, refusedReason: "" });
check("a late report clears it", !remote.sessionLate(777), "not late once a report arrives");

console.log(`induction-view: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
