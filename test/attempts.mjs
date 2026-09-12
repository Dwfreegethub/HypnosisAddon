// How many times one hypnotist may try before the cooldown — the subject's own setting.
//
// design.md recorded this as decided ("default 2, with 3 available as a player setting")
// and the code kept the hardcoded 3 for months, which is the whole reason this suite is
// worth its length: the value is read in seven places and six of them are cosmetic, so a
// change that misses the ONE that gates the cooldown looks entirely correct on screen while
// the limit does nothing. Every check below that matters drives a real roll and reads the
// phase back, rather than trusting what the diagnostics print.
//
// The three things it protects:
//
//   1. The limit is read LIVE, so lowering it mid-session binds on the next roll. A captured
//      copy would leave the subject's own client enforcing a number they had just changed.
//   2. The default is 2 for someone who has never chosen, INCLUDING someone upgrading from a
//      build that had no such setting. Absent means "never chose", not "wanted 3".
//   3. A hypnotist is shown the SUBJECT's limit and never their own. Both clients run this
//      code, so the fallback for a message that carries no limit is the decided default —
//      reading our own setting there would report a stranger's limit as whatever ours is.
const HYP = 246108;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};

// Every hidden message the subject's client sends, so the hypnotist's half can be read off
// the wire rather than assumed.
const sent = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) sent.push(message);
};

// A controllable clock. The induction window is a 60-second setTimeout and the roll only
// happens when it fires, so without this the suite could not reach a second attempt at all —
// and a suite that never rolls cannot tell a working limit from a missing one (rule 6).
//
// The window timer is always the LAST one registered: answerPrompt clears the prompt timer
// before calling beginInductionWindow, and session-continue opens a fresh window the same
// way. Both are 60 seconds, so "the last live one" is the only way to tell them apart.
const pending = [];
globalThis.setTimeout = (fn, ms) => pending.push({ fn, ms });
globalThis.clearTimeout = (id) => {
	if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null;
};

/** Fire the most recently scheduled live timer — the induction roll. */
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) {
		if (pending[i].fn) {
			const fn = pending[i].fn;
			pending[i].fn = null;
			fn();
			return;
		}
	}
	throw new Error("nothing scheduled — the induction window was never opened");
};

// Every roll misses. 0.99 * 100 = 99, and the chance is clamped to 95 at the very top, so
// this is a guaranteed failure however trust and experience move underneath it — which is
// what lets the suite count attempts rather than retry until the RNG cooperates.
Math.random = () => 0.99;

const lz = (await import("lz-string")).default;
const { session, messaging, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

/** The phase word out of the diagnostic line, which is the only public read of it. */
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
/** The `attempts=n/limit` the diagnostic reports, or "" outside a session. */
const tally = () => (session.describeSession().match(/attempts=(\d+\/\d+)/) ?? ["", ""])[1];

/** A fresh attempt, answered, sitting in an open induction window. */
const attempt = () => {
	incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
	session.answerPrompt("ignore");
};
/** Retry after a miss — the hypnotist's "Continue Trying". */
const retry = () => incoming(HYP, { type: "session-continue" });

storage.setFeature("hypnoEnabled", true);

// --- the stored setting -------------------------------------------------------------------
// Two values, not a range: the decision named 2 and 3, so offering a 1 or a 5 would be
// re-deciding it in code.
check("a fresh install allows two", storage.getMaxAttempts(), 2);
check("the default is named, not just implied", storage.DEFAULT_MAX_ATTEMPTS, 2);
check("exactly two and three are on offer", storage.ATTEMPT_LIMITS, [2, 3]);
check("three can be chosen", storage.setMaxAttempts(3), 3);
check("  and it sticks", storage.getMaxAttempts(), 3);
// The button cannot produce anything else, so a value outside the set is a bug here rather
// than a player's typo — it lands on the default rather than being kept or rejected.
check("four is not a limit", storage.setMaxAttempts(4), 2);
check("nor is one", storage.setMaxAttempts(1), 2);
check("nor is nonsense", storage.setMaxAttempts(NaN), 2);
// Cycling is what the settings screen does; it must come back round rather than dead-end,
// the same rule the depth tiers are held to.
check("the button cycles up", storage.nextAttemptLimit(2), 3);
check("  and wraps back", storage.nextAttemptLimit(3), 2);

// --- upgrading from a build that had no such setting ----------------------------------------
// The migration rule, and the one genuine judgement call in this change: absent means "never
// chose", which takes the default — so an existing player moves from the old hardcoded 3 to
// the decided 2. Deliberately NOT the decay rates' treatment, which ship "never" because
// switching them on would have eaten stored trust; one fewer try per cooldown loses nobody
// anything. Imported rather than loaded because import runs the same normalise() an old blob
// meets on load, and it is reachable without faking a login.
const legacy = {
	version: "0.4.0", trust: [], experience: 0, triggers: [], triggerScope: "hypnotist",
	triggerDurationMinutes: 5, decayRate: "never", triggerDecayRate: "never",
	depthGates: {}, chemicalScope: "arousal", relationshipOverride: {},
	features: { hypnoEnabled: true },
};
check("an old blob imports", storage.importSettings(lz.compressToBase64(JSON.stringify(legacy))).ok, true);
check("  and comes back on the decided default", storage.getMaxAttempts(), 2);
// Junk in the field is the same case, not a different one — a hand-edited or corrupted blob
// must not be able to hand someone an unlimited number of tries.
check("a junk value imports", storage.importSettings(lz.compressToBase64(JSON.stringify({ ...legacy, maxAttempts: 99 }))).ok, true);
check("  and is normalised away", storage.getMaxAttempts(), 2);
storage.setFeature("hypnoEnabled", true);

// --- two attempts, then the cooldown ---------------------------------------------------------
// The check the whole change exists for. Under the old constant the second miss left the
// subject in AttemptFailed and a third try was still allowed.
storage.setMaxAttempts(2);
session.safeword();
attempt();
runRoll();
check("the first miss is not the end", phase(), "AttemptFailed");
check("  one of two", tally(), "1/2");
retry();
runRoll();
check("the second miss closes it", phase(), "CooldownRequired");
check("  two of two", tally(), "2/2");
// And the cooldown is real: a fresh attempt from the same hypnotist is refused rather than
// quietly starting a third window.
sent.length = 0;
attempt();
check("a third attempt is refused", phase(), "CooldownRequired");
check("  and the refusal says so", sent.some((m) => /wait|cooldown|later|clear/i.test(String(m.refusedReason ?? ""))), true);

// --- three, when three is chosen ---------------------------------------------------------------
storage.setMaxAttempts(3);
session.safeword();
attempt();
runRoll();
check("first of three", tally(), "1/3");
retry();
runRoll();
check("the second miss still leaves a try", phase(), "AttemptFailed");
check("  two of three", tally(), "2/3");
retry();
runRoll();
check("the third closes it", phase(), "CooldownRequired");
check("  three of three", tally(), "3/3");

// --- changed mid-session, honoured on the next roll -----------------------------------------
// Read live rather than captured when the session opened. A subject who decides part-way
// through that they have had enough should not have to end the session to be heard — and a
// captured copy would leave their own client enforcing a number they had just changed.
storage.setMaxAttempts(3);
session.safeword();
attempt();
runRoll();
check("one miss, three allowed", tally(), "1/3");
storage.setMaxAttempts(2);
check("  the tally follows the setting at once", tally(), "1/2");
retry();
runRoll();
check("  and the next miss is the last", phase(), "CooldownRequired");

// --- what the hypnotist is told ------------------------------------------------------------
// The subject's client is the only authority on this, so it has to travel: the hypnotist's
// panel prints "Continue Trying (1/2)" straight off these pushes.
storage.setMaxAttempts(3);
session.safeword();
sent.length = 0;
attempt();
const updates = sent.filter((m) => m.type === "session-update");
check("the push carries a limit", updates.length > 0, true);
check("  and it is the subject's", updates.every((m) => m.maxAttempts === 3), true);
storage.setMaxAttempts(2);
sent.length = 0;
session.safeword();
attempt();
check("  which follows the setting", sent.filter((m) => m.type === "session-update").every((m) => m.maxAttempts === 2), true);

// --- reading someone ELSE's session -----------------------------------------------------------
// Both halves of this file run on both clients, so the hypnotist-side fallback is the trap:
// a client whose own limit is 3, told nothing by a subject on an older build, must not report
// that subject as allowing 3. The decided default is the only honest guess.
session.safeword();
storage.setMaxAttempts(3);
incoming(HYP, { type: "session-update", phase: "AttemptFailed", attempts: 1, maxAttempts: 2 });
check("their limit is taken from them", session.getSessionView(HYP).maxAttempts, 2);
incoming(HYP, { type: "session-update", phase: "AttemptFailed", attempts: 1 });
check("  and an old client falls back to the default", session.getSessionView(HYP).maxAttempts, 2);
check("  not to ours", storage.getMaxAttempts(), 3);

// --- the odds diagnostic spans the right number of tries ---------------------------------------
// `/hypno chance` prints a per-session figure compounded over the limit. Left on the constant
// it would have quoted odds across three tries to someone who allows two.
storage.setMaxAttempts(2);
session.safeword();
check("the diagnostic spans two", session.describeChances(HYP).some((l) => /across 2$/.test(l)), true);
storage.setMaxAttempts(3);
check("  and three when three", session.describeChances(HYP).some((l) => /across 3$/.test(l)), true);

session.safeword();
storage.setMaxAttempts(2);

console.log(`attempts: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
