// "Stay under?" (v1.2.0, DW 2026-11-02). When a trance's thirty minutes run out, the subject is
// asked whether to stay under for another thirty. Each check says what failure looks like.
//
//   1. The question comes when the time is up, not before, and the trance holds while it is asked.
//   2. "Stay" (the box or /echs stay) gives a fresh thirty minutes, and the hypnotist is told.
//   3. No answer wakes her, exactly as the timeout always did. Silence is never a yes.
//   4. "Wake up" on the box ends it at once.
//   5. The safeword or a wake while the box is up takes the box down with the trance.
const HYP = 246108;
const THIRTY = 30 * 60_000;
const ASK = 60_000;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	GetPronouns: () => "SheHer",
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = () => {};
let wire = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) wire.push(message);
};

// Held timers and a controllable clock, as in expiry.mjs: the timeout has to be FIRED off the timer
// the trance armed, or a clock nothing ever reaches would pass.
let now = Date.parse("2026-11-02T20:00:00Z");
Date.now = () => now;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = (fn, ms = 0) => { pending.push({ fn, ms, live: true, every: true }); return pending.length; };
globalThis.clearInterval = globalThis.clearTimeout;
const live = (ms) => pending.filter((t) => t.live && !t.every && t.ms === ms);
const fire = (ms) => {
	const t = live(ms);
	if (t.length !== 1) throw new Error(`expected one live ${ms}ms timer, found ${t.length}`);
	now += ms;
	t[0].live = false;
	t[0].fn();
};

const { session, storage } = await import("./harness-bundle.mjs");
session.installSession();
storage.setFeature("hypnoEnabled", true);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const toHyp = () => wire.filter((m) => m.type === "trigger-status").map((m) => m.text);
const under = () => {
	session.safeword();
	check("setup: under", session.forceTrance(HYP, 60, 60), null);
	local = []; wire = [];
};

// --- 1 and 2: asked, then stays ----------------------------------------------------------------
under();
check("no question before the time is up", session.getPendingExtend(), null);
fire(THIRTY);
// Failure: the trance ended outright, as before v1.2.0.
check("at thirty minutes she is still under", phase(), "Hypnotized");
check("  and the box is up", session.getPendingExtend() != null, true);
check("  the box counts down a minute", session.getPendingExtend()?.remainingMs, ASK);
check("  she is told, with /echs stay", local.some((l) => /Stay under for another 30/.test(l) && /\/echs stay/.test(l)), true);
check("  the hypnotist is told she is being asked", toHyp().some((t) => /being asked whether to stay under/.test(t)), true);
local = []; wire = [];
session.answerExtend(true);
check("'stay': still under", phase(), "Hypnotized");
check("  the box is down", session.getPendingExtend(), null);
check("  she is told another 30 minutes", local.some((l) => /Another 30 minutes/.test(l)), true);
check("  the hypnotist is told", toHyp().some((t) => /chose to stay under for another 30/.test(t)), true);
check("  the minute's countdown is gone", live(ASK).length, 0);
// Failure: the extension did not re-arm the clock, so the trance never ends (or ends at once).
check("  a fresh thirty-minute clock runs", live(THIRTY).length, 1);
fire(THIRTY);
check("when that is up she is asked again", session.getPendingExtend() != null, true);

// --- 3: no answer wakes her --------------------------------------------------------------------
local = [];
fire(ASK);
// Failure: silence kept her under, which would make staying the default.
check("no answer: the trance ends", phase(), "Idle");
check("  as the timeout, with the time limit named", local.some((l) => /30 minutes/.test(l)), true);
check("  the box is down", session.getPendingExtend(), null);
local = [];
session.answerExtend(true);
check("'/echs stay' afterwards does nothing", phase(), "Idle");
check("  and says nothing is being asked", local.some((l) => /Nothing is asking/.test(l)), true);

// --- 4: 'Wake up' on the box -------------------------------------------------------------------
under();
fire(THIRTY);
session.answerExtend(false);
check("'wake up': the trance ends at once", phase(), "Idle");
check("  and the minute's countdown is gone", live(ASK).length, 0);

// --- 5: the safeword while the box is up --------------------------------------------------------
under();
fire(THIRTY);
session.safeword();
check("the safeword takes the box down", session.getPendingExtend(), null);
check("  and its countdown", live(ASK).length, 0);

session.safeword();
console.log(`extend: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
