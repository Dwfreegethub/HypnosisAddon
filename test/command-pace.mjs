// Three things that happen when a command lands or a trance ends (v1.4.0, DW 2026-11-05):
//
//   A. The beat: every spoken command waits 2 to 5 seconds, edges rarer. Never out of order, never
//      after a wake or safeword, and every gate answers for the moment it lands. Wake and release
//      never wait, and what acts on the last command ("that will stay with you") finds it landed.
//   B. The pulse: on a landed command or a fired trigger, never a refused one. Hers to switch off
//      and colour, and nothing shows while she is blind.
//   C. A trigger's hold from BEFORE a trance outlives the wake and finishes its time (Valerie).
//      One fired during the trance ends with it. The safeword clears both.
//
// Each check says what failure looks like.
const HYP = 246108, OTHER = 424242;
const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
let now = Date.parse("2026-11-05T20:00:00Z");
Date.now = () => now;
globalThis.CurrentTime = 1_000_000;
globalThis.CharacterSetActivePose = (C, pose) => { C.ActivePose = pose === null ? [] : [pose]; };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [], ActivePose: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: OTHER, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect]);
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let toHyp = [];
globalThis.ServerSend = (_t, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (m?.type === "trigger-status") toHyp.push(m.text);
};
let room = [], local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = (m) => room.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
let dark = 1;
globalThis.CharacterGetDarkFactor = () => dark;
let fills = [];
let rects = [];
globalThis.MainCanvas = { save() {}, restore() {}, fillStyle: "", fillRect(left, top, width, height) { fills.push(this.fillStyle); rects.push({ left, top, width, height, alpha: Number(/, ([\d.e-]+)\)$/.exec(this.fillStyle)?.[1] ?? 0) }); } };
globalThis.MainCanvasHeight = 1000;

// Held timers on a controllable clock: run what comes due as time moves on.
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, due: now + ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const advance = (ms) => {
	const end = now + ms;
	for (;;) {
		const next = pending.filter((t) => t.live && t.due <= end).sort((a, b) => a.due - b.due)[0];
		if (!next) break;
		now = Math.max(now, next.due);
		next.live = false;
		next.fn();
	}
	now = end;
};
const SOON = 10_000; // longer than any beat

const { depth, voice, storage, triggers, session, timers, effects, carry } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line) => voice.handleSpokenLine(HYP, line);
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const under = () => {
	session.safeword();
	timers.clearAllTimers();
	Player.ActivePose = [];
	room = []; local = []; toHyp = [];
	session.forceTrance(HYP, 80, 80);
	now += 1;
};

for (const k of ["hypnoEnabled", "triggerControl", "postureControl", "movementRestriction", "carryForward"]) storage.setFeature(k, true);
for (const k of ["tranceCannotMove", "tranceCannotSpeak", "tranceScreenFade"]) storage.setFeature(k, false);
storage.setTriggerScope("anyone");
storage.setTriggerDuration(5);

// --- A. the beat --------------------------------------------------------------------------------
voice.setCommandPacing(true);

// The length. Failure: outside 2-5, or flat, which is what "edges less common" rules out.
{
	const samples = Array.from({ length: 20000 }, () => voice.commandDelayMs());
	check("always at least 2 seconds", Math.min(...samples) >= 2000, true);
	check("never more than 5", Math.max(...samples) <= 5000, true);
	const edges = samples.filter((s) => s < 2500 || s > 4500).length;
	const middle = samples.filter((s) => s >= 3250 && s <= 3750).length;
	check("the middle is far more common than the edges", middle > edges * 2, true);
	check("the fixed ends", [voice.commandDelayMs(() => 0), voice.commandDelayMs(() => 1)], [2000, 5000]);
}

under();
say("Missy, kneel");
// Failure: it landed at once, as before.
check("not yet", Player.ActivePose, []);
advance(1999);
check("not before 2 seconds", Player.ActivePose, []);
advance(3001);
check("by 5 seconds it has landed", Player.ActivePose, ["Kneel"]);

// In order. Failure: two rolls swap them, and she ends kneeling after being told to stand.
// Run many times, because each round rolls its own two delays, and most rolls would pass anyway.
let wrongOrder = 0;
for (let i = 0; i < 200; i++) {
	under();
	say("Missy, spread your legs");
	say("Missy, kneel");
	advance(SOON);
	if (Player.ActivePose[0] !== "Kneel") wrongOrder++;
}
check("two commands never swap, however the rolls fall", wrongOrder, 0);

// A wake and the safeword. Failure: a command lands after she was told to stop (rule 2).
under();
say("Missy, kneel");
session.safeword();
advance(SOON);
check("the safeword: what was waiting never lands", Player.ActivePose, []);
under();
say("Missy, kneel");
say("Missy, wake up");
check("a wake does not wait", phase(), "Idle");
advance(SOON);
check("  and what was waiting never lands", Player.ActivePose, []);

// Every gate answers when it lands. Failure: a permission revoked in the beat is ignored.
under();
say("Missy, kneel");
storage.setFeature("postureControl", false);
toHyp = [];
advance(SOON);
check("revoked in the beat: it does not land", Player.ActivePose, []);
check("  and the hypnotist is told", toHyp.some((t) => /Refused/.test(t)), true);
storage.setFeature("postureControl", true);

// A release never waits, and lands after what was said before it. Failure: frozen forever.
under();
say("Missy, you cannot move");
check("setup: not yet frozen", effects.hasOwnEffect("Freeze"), false);
say("Missy, you can move");
check("a release lands at once, after what came first", effects.hasOwnEffect("Freeze"), false);
advance(SOON);
check("  and nothing lands behind it", effects.hasOwnEffect("Freeze"), false);

// What acts on the last command. Failure: "there is nothing to keep", because it had not landed.
storage.setTrustValue(HYP, "GameBot", 90);
under();
say("Missy, kneel");
say("Missy, that will stay with you");
check("'that will stay with you' finds the command landed", Player.ActivePose, ["Kneel"]);
check("  and carries it", carry.isCarried("kneel"), true);
under();
say("Missy, kneel");
say("Missy, your trigger word is ember glow");
say("Missy, you cannot move");
say("Missy, remember trigger");
// Failure: the waiting kneel was recorded into the trigger; or the recorded line waited, and missed it.
check("recording: only what was said while recording is in the trigger",
	storage.listTriggers().find((t) => t.phrase === "ember glow")?.actions, ["movement-block"]);
check("  the command before it landed first", Player.ActivePose, ["Kneel"]);
session.safeword();
storage.forgetAllTriggers();

// Ordinary talk with no session waits for nothing. Failure: a stranger's line sits in the queue.
session.safeword();
say("Missy, kneel");
advance(SOON);
check("no session: nothing happens", Player.ActivePose, []);

voice.setCommandPacing(false);

// --- B. the pulse -------------------------------------------------------------------------------
const pulsing = () => { fills = []; effects.drawCommandPulse(now + 500); return fills.length > 0; };
const pulseDone = () => { effects.drawCommandPulse(now + 5000); };

under();
pulseDone();
check("nothing yet", pulsing(), false);
say("Missy, kneel");
// Failure: a landed command gives her nothing to follow.
check("a landed command pulses", pulsing(), true);
check("  in pink by default", /255, 105, 180/.test(fills[0] ?? ""), true);
{
	const faint = []; const peak = [];
	fills = []; effects.drawCommandPulse(now + 50); faint.push(...fills);
	fills = []; effects.drawCommandPulse(now + 500); peak.push(...fills);
	const alpha = (s) => Number(/, ([\d.]+)\)$/.exec(s)?.[1] ?? 0);
	// Failure: a hard flash. It has to swell.
	check("  it swells, so it never flashes", alpha(faint[0]) < alpha(peak[0]) / 2, true);
}
// Whether it can be SEEN. v1.4.0 ran and nobody could see it: every check above passed, because none
// asked how big or how strong it was. Failure: these numbers drift back to something invisible.
{
	rects = [];
	effects.drawCommandPulse(now + 700); // the peak
	const view = rects.find((r) => r.left === 0 && r.top === 0 && r.width >= 1000 && r.height >= 1000);
	const ring = rects.filter((r) => r !== view);
	const left = ring.filter((r) => r.left < 500 && r.height > r.width);
	const glowWidth = Math.max(...left.map((r) => r.left + r.width));
	check("  a wash of colour covers the whole view", !!view, true);
	check("    light enough to see through", view && view.alpha >= 0.1 && view.alpha <= 0.3, true);
	check("  the glow is at least 100 pixels wide", glowWidth >= 100, true);
	check("  and strong at the edge", Math.max(...ring.map((r) => r.alpha)) >= 0.7, true);
	check("  it stays over the room, off the chat", rects.every((r) => r.left + r.width <= 1003), true);
	// Failure: a hard edge inside the glow, which reads as a box rather than a glow.
	const alphas = left.sort((a, b) => a.left - b.left).map((r) => r.alpha);
	check("  it falls away inward", alphas.every((a, i) => i === 0 || a < alphas[i - 1]), true);
	// Long enough to catch from across the screen. Failure: it is back to a blink.
	rects = [];
	effects.drawCommandPulse(now + 1200);
	check("  still showing after a second", rects.length > 0, true);
}
// A second command mid-pulse. Failure: it drops to nothing in one frame, which is a flash.
storage.setPulseColor("blue");
say("Missy, stand");
fills = [];
effects.drawCommandPulse(now + 700);
check("  a command mid-pulse leaves it to finish", /255, 105, 180/.test(fills[0] ?? ""), true);
storage.setPulseColor("pink");
pulseDone();
check("  and it ends", pulsing(), false);
storage.setFeature("postureControl", false);
say("Missy, kneel");
// Failure: a refused command shows as if it took.
check("a refused command does not pulse", pulsing(), false);
storage.setFeature("postureControl", true);
storage.setFeature("commandPulse", false);
say("Missy, kneel");
check("unticked: no pulse", pulsing(), false);
storage.setFeature("commandPulse", true);
storage.setPulseColor("blue");
say("Missy, stand");
check("her colour is used", pulsing() && /80, 160, 255/.test(fills[0] ?? ""), true);
storage.setPulseColor("not-a-colour");
check("a bad colour is not kept", storage.getPulseColor(), "blue");
dark = 0.5;
check("nothing shows while she is blind", pulsing(), false);
dark = 1;
pulseDone();
storage.setPulseColor("pink");

const plantHold = (phrase, action = "movement-block") => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", phrase);
	triggers.recordAction(action);
	triggers.commitRecording();
};
session.safeword();
plantHold("frozen");
session.safeword();
pulseDone();
say("frozen");
advance(0);
check("a fired trigger pulses", pulsing(), true);
pulseDone();

// --- C. a hold across a wake ----------------------------------------------------------------------
const find = (p) => storage.listTriggers().find((t) => t.phrase === p);
const holds = (p) => !!find(p) && voice.isTriggerInEffect(find(p));
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); Player.ActivePose = []; local = []; };
const MIN = 60_000;

reset();
plantHold("frozen");
session.safeword();
say("frozen");
advance(0);
check("setup: it holds", holds("frozen"), true);
now += 1;
advance(MIN); // one minute into its five
session.forceTrance(HYP, 80, 80);
check("a trance carries it", holds("frozen"), true);
now += 1;
session.wakeByHypnotist(HYP);
// Failure: Valerie's report, it ended with a trance that had nothing to do with it.
check("it outlives the wake", holds("frozen"), true);
check("  still frozen", effects.hasOwnEffect("Freeze"), true);
check("  and she is told", local.some((l) => /what held you before the trance still holds/.test(l)), true);
advance(MIN * 3);
check("  on the time it had left, not a fresh clock", holds("frozen"), true);
advance(MIN + 1000);
check("  then it lets go", holds("frozen"), false);
check("  and the freeze with it", effects.hasOwnEffect("Freeze"), false);

// Fired during the trance. Failure: the wake no longer ends what the trance started.
// Under someone else: a trigger does not fire from its planter while they have her under themselves.
reset();
plantHold("frozen");
session.safeword();
session.forceTrance(OTHER, 80, 80);
now += 1;
say("frozen");
advance(0);
check("setup: fired during the trance", holds("frozen"), true);
session.wakeByHypnotist(OTHER);
check("one fired during the trance ends with it", holds("frozen"), false);
check("  and says nothing about holding", local.some((l) => /still holds/.test(l)), false);

// The safeword. Failure: rule 2.
reset();
plantHold("frozen");
session.safeword();
say("frozen");
advance(0);
now += 1;
session.forceTrance(HYP, 80, 80);
now += 1;
session.safeword();
check("the safeword clears it all", [holds("frozen"), effects.hasOwnEffect("Freeze")], [false, false]);

// A one-shot. Failure: the teardown's sweep of used-up triggers deletes the very one kept.
reset();
plantHold("frozen");
find("frozen").oneShot = true;
session.safeword();
say("frozen");
advance(0);
check("setup: a one-shot holding, used up", [holds("frozen"), find("frozen")?.spent], [true, true]);
now += 1;
session.forceTrance(HYP, 80, 80);
now += 1;
session.wakeByHypnotist(HYP);
check("a used-up one-shot still finishes", holds("frozen"), true);
advance(MIN * 6);
check("  and is gone when it lets go", find("frozen"), undefined);

reset();
console.log(`command-pace: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
