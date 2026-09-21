// Can a hypnotist walk out of the room and still put someone under?
//
// They could. An attempt opened a sixty-second window, the window fired the roll on a bare
// setTimeout, and nothing along that path ever asked whether the person who started it was
// still present — so leaving the room mid-induction cost nothing and the subject dropped
// into a trance alone, frozen, silenced and veiled, for the full thirty-minute timeout.
// DW reported it 2026-09-21: "before a subject actually goes under, make sure the tist is
// still in the room."
//
// What this suite is really protecting is the four ways a naive fix goes wrong:
//
//   1. Checking presence when the attempt is REQUESTED instead of when it RESOLVES. The
//      hole is the minute in between, so a request-time check closes nothing. Every check
//      below drives the timer to the roll rather than reading state at the request.
//   2. Ending the lapsed induction with endSession(), which resets `attempts` to zero — a
//      hypnotist who missed once could then step out, step back in and have two fresh
//      tries. The fix must not be a cooldown bypass.
//   3. Gating the WAKE message the same way as the attempt. A release that stops working
//      when the hypnotist leaves is the exact trap the safeword exists to rule out.
//   4. Reading an empty roster as "they left". The roster is empty when the SUBJECT is the
//      one out of the room, and at load before the room syncs. That must not end a trance.
//
// Rule 6: the control cases matter as much as the failures. A suite where inductions never
// succeed would pass check 1 while testing nothing, so the same roll is rigged to land and
// shown landing with the hypnotist present.
const HYP = 246108, OTHER = 777;

/** The subject is still in the room; the hypnotist is not on the roster any more. */
const ELSEWHERE = () => [Player];
const TOGETHER = () => [Player, { MemberNumber: HYP, Name: "GameBot" }];

// A real enough Player to carry an effect. Freeze and the rest ride the always-worn
// Emoticon item's Property.Effect array (see effects.ts), so without the item and the asset
// the trance would "apply" into nothing and every check that it landed would pass vacuously.
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = TOGETHER();
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};

let said = [];
let emoted = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);
globalThis.ChatRoomSendEmote = (m) => emoted.push(m);

const sent = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) sent.push(message);
};

// A driven clock. The trance grace is five minutes and the induction grace thirty seconds;
// a suite that actually waited them out would take five and a half minutes to say nothing
// the clock cannot say instantly.
let clock = 1_000_000;
Date.now = () => clock;
const advance = (ms) => { clock += ms; };

// Timers, same shape as attempts.mjs: the roll only happens when the window timer fires, so
// without a stub this suite could not reach a roll at all.
const pending = [];
globalThis.setTimeout = (fn, ms) => pending.push({ fn, ms });
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null; };
// The presence watcher runs on an interval. Stubbed to nothing on purpose — every check
// below calls checkHypnotistPresence() directly, so what is under test is the RULE and not
// the polling, and a real interval would fire against a clock that only moves when told.
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};

/** Fire the most recently scheduled live timer — the induction window's roll. */
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) {
		if (pending[i].fn) {
			const fn = pending[i].fn;
			pending[i].fn = null;
			fn();
			return true;
		}
	}
	return false;
};

const { session, messaging, storage, effects } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const tally = () => (session.describeSession().match(/attempts=(\d+\/\d+)/) ?? ["", ""])[1];
const cooling = () => /cooldown=/.test(session.describeSession());

const leave = () => { globalThis.ChatRoomCharacter = ELSEWHERE(); };
const comeBack = () => { globalThis.ChatRoomCharacter = TOGETHER(); };
/** The subject is the one who is nowhere — an empty roster with no one in it, including us. */
const roomless = () => { globalThis.ChatRoomCharacter = []; };

/** A fresh attempt, answered, sitting in an open induction window. */
const attempt = (who = HYP) => {
	incoming(who, { type: "session-attempt", hypnotistName: "GameBot" });
	session.answerPrompt("ignore");
};
const reset = () => {
	comeBack();
	session.safeword();
	said = [];
	emoted = [];
	sent.length = 0;
};

const LANDS = () => { Math.random = () => 0; };   // 0 is below any clamped chance: always succeeds
const MISSES = () => { Math.random = () => 0.99; }; // 99 is above the 95 ceiling: always fails

storage.setFeature("hypnoEnabled", true);
storage.setMaxAttempts(2);

// --- the control: this roll really does land -------------------------------------------------
// Without this the headline check below would pass on a suite in which nothing ever succeeds.
reset();
LANDS();
attempt();
check("present, and the induction lands", runRoll() && phase(), "Hypnotized");

// --- THE BUG ----------------------------------------------------------------------------------
// Identical setup, identical rigged roll. The only difference is that the hypnotist is gone by
// the time the window fires. Before the fix this reported "Hypnotized".
reset();
LANDS();
attempt();
check("the window is open", phase(), "InductionInProgress");
leave();
runRoll();
check("they left mid-induction — nobody goes under", phase() !== "Hypnotized", true);
check("  and it is back to Idle", phase(), "Idle");
check("  nothing was applied", effects.hasOwnEffect("Freeze"), false);

// Nothing was SPENT either: an induction nobody was running is not one of the subject's tries.
check("  no attempt was used", tally(), "");
check("  and no cooldown was started", cooling(), false);

// Rule 5 — the subject is told, in words, by whom, and that nothing was used up.
check("  the subject is told who and what", said.some((m) => /GameBot.*(left|no longer)/i.test(m)), true);
check("  and that nothing was used up", said.some((m) => /nothing was used up/i.test(m)), true);

// --- what the ROOM sees ------------------------------------------------------------------------
// The room heard the induction begin, so it has to hear it end — but it must not be able to tell
// a lapse from an ordinary miss. A "he walked out on her" line would announce which of the two
// ended it, out loud, in front of everyone, every time.
const MISS_POOL = [
	/eyes flutter, drift/, /Something almost settles over/, /sways a little, blinks/, /For a breath .* is somewhere else/,
];
check("the room hears it close", emoted.length > 0, true);
check("  in the ordinary miss wording", MISS_POOL.some((re) => re.test(emoted[emoted.length - 1])), true);
check("  and nothing names the departure", emoted.some((m) => /left|gone|walked|alone|abandon/i.test(m)), false);

// An UNANSWERED prompt was never announced to the room, so closing it must not emote either —
// that would be narrating a moment the room never saw start.
reset();
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
check("a prompt is up", phase(), "AttemptMade");
leave();
emoted = [];
session.checkHypnotistPresence();          // first sighting: noted, not acted on
advance(31_000);
session.checkHypnotistPresence();          // past the induction grace
check("an abandoned prompt comes down", phase(), "Idle");
check("  and says nothing to the room", emoted.length, 0);
check("  but does tell the subject", said.some((m) => /GameBot/.test(m) && /room/i.test(m)), true);

// --- the cooldown bypass a careless fix would open ---------------------------------------------
// If the lapse ran through endSession() the session would reset, `attempts` would go back to
// zero, and leaving the room would become a way to refill your tries. The count has to stand.
reset();
MISSES();
attempt();
runRoll();
check("one attempt spent", tally(), "1/2");
check("  sitting on a miss", phase(), "AttemptFailed");
incoming(HYP, { type: "session-continue" });
check("  retry window open", phase(), "InductionInProgress");
leave();
runRoll();
check("the retry lapses", phase(), "AttemptFailed");
check("  and the spent attempt STILL counts", tally(), "1/2");
check("  the subject is told the count stands", said.some((m) => /still counts as 1 of 2/.test(m)), true);
// The real test of it: coming back gets the ONE try they had left, not two.
comeBack();
incoming(HYP, { type: "session-continue" });
runRoll();
check("  so the next miss is the last", phase(), "CooldownRequired");
check("  two of two", tally(), "2/2");

// --- a dormant cooldown is not cleared by them leaving -------------------------------------------
// CooldownRequired holds the subject's protection. Ending it because the hypnotist stepped out
// would be the same bypass by a different door.
leave();
session.checkHypnotistPresence();
// Well past both graces, and still short of the ten-minute cooldown itself.
advance(6 * 60_000);
session.checkHypnotistPresence();
check("the cooldown survives them leaving", phase(), "CooldownRequired");
check("  and is still counting", cooling(), true);

// --- asking from outside the room -----------------------------------------------------------------
// In ordinary play the hidden channel rides ChatRoomChat, so a sender is present by construction
// and these never fire. They exist because "cannot happen" is what a modified client is for.
reset();
leave();
sent.length = 0;
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
check("an attempt from outside the room is refused", phase(), "Idle");
check("  and the refusal says why", sent.some((m) => /aren't in the room/i.test(String(m.refusedReason ?? ""))), true);

// A retry from outside, which is the one that matters: the watcher deliberately leaves
// AttemptFailed alone to preserve the count, so this gate is what stops it being reachable.
reset();
MISSES();
attempt();
runRoll();
check("a miss to retry", phase(), "AttemptFailed");
leave();
sent.length = 0;
incoming(HYP, { type: "session-continue" });
check("a retry from outside the room is refused", phase(), "AttemptFailed");
check("  and says why", sent.some((m) => /aren't in the room/i.test(String(m.refusedReason ?? ""))), true);
check("  without spending anything", tally(), "1/2");

// --- the release is NEVER gated --------------------------------------------------------------------
// The trap this rules out: a fix that gates every message on presence makes the one message that
// ENDS a trance stop working the moment the hypnotist is gone. Then leaving does not merely
// strand the subject, it locks them in.
reset();
LANDS();
attempt();
runRoll();
check("under", phase(), "Hypnotized");
check("  and frozen", effects.hasOwnEffect("Freeze"), true);
leave();
incoming(HYP, { type: "session-wake" });
check("a wake from outside the room still works", phase(), "Idle");
check("  and lets go", effects.hasOwnEffect("Freeze"), false);
// The subject's own escape hatch, from the same position.
reset();
LANDS();
attempt();
runRoll();
leave();
session.safeword();
check("the safeword works with them gone", phase(), "Idle");
check("  and lets go", effects.hasOwnEffect("Freeze"), false);

// --- a live trance, once they are gone ----------------------------------------------------------
// Not instant. recovery.ts already settled the mirror-image case — a subject who drops out and
// returns inside five minutes is still in the same scene — and this is that question with the
// players swapped, so it gets the same five minutes rather than a second, different number.
reset();
LANDS();
attempt();
runRoll();
check("under again", phase(), "Hypnotized");
leave();
said = [];
session.checkHypnotistPresence();
check("a moment gone is not the end", phase(), "Hypnotized");
check("  but the subject is warned", said.some((m) => /not in the room/i.test(m)), true);
advance(4 * 60_000);
session.checkHypnotistPresence();
check("four minutes gone is still not the end", phase(), "Hypnotized");
advance(2 * 60_000);
session.checkHypnotistPresence();
check("past five minutes it ends", phase(), "Idle");
check("  and everything comes off", effects.hasOwnEffect("Freeze"), false);
check("  and the subject is told why", said.some((m) => /come out of trance/i.test(m)), true);

// Back inside the window, which is the half that makes the grace worth having.
reset();
LANDS();
attempt();
runRoll();
leave();
session.checkHypnotistPresence();
advance(60_000);
comeBack();
said = [];
session.checkHypnotistPresence();
check("they come back inside the window", phase(), "Hypnotized");
check("  and the subject is told", said.some((m) => /is back/i.test(m)), true);
// And the clock restarts rather than resuming where it left off — a hypnotist who ducks out
// for four minutes, waves, and ducks out again has not used up the grace.
advance(4 * 60_000);
leave();
session.checkHypnotistPresence();
advance(4 * 60_000);
session.checkHypnotistPresence();
check("the grace restarts on their return", phase(), "Hypnotized");

// --- an empty roster is NOT a departure --------------------------------------------------------
// The case that would turn this fix into a worse bug than the one it fixes: ChatRoomCharacter is
// empty when the SUBJECT is out of a room, and at load before the first sync. Reading that as
// "the hypnotist left" would end a trance every time the subject stepped out, and would end one
// on startup before recovery had a chance to restore it.
reset();
LANDS();
attempt();
runRoll();
check("under, one more time", phase(), "Hypnotized");
roomless();
session.checkHypnotistPresence();
advance(10 * 60_000);
session.checkHypnotistPresence();
check("no roster to read is not an absence", phase(), "Hypnotized");
// And the same blindness does not let an outsider through the attempt gate either — the gate
// refuses only on a definite `false`, never on "cannot tell".
comeBack();

// --- someone else entirely ----------------------------------------------------------------------
// The gate is about the hypnotist of THIS session, not about whoever is on screen. A third party
// being in the room must not stand in for the one who is running the induction.
reset();
LANDS();
attempt();
globalThis.ChatRoomCharacter = [Player, { MemberNumber: OTHER, Name: "Nyx" }];
runRoll();
check("a bystander is not the hypnotist", phase(), "Idle");

reset();
MISSES();

console.log(`departure: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
