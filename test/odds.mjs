// The induction odds invariant: FIGHTING MUST NEVER GIVE THE HYPNOTIST A BETTER CHANCE
// THAN BEING IGNORED.
//
// Decided 2026-09-10 (docs/declared-skill-proposal.md §A1) after tracing the rung-3 cap
// turned up an inversion that was also present in the original §4 tables: with a Fight
// floor of `5 + 0.25v` against an additive `0.35v`, Fight beat Ignore for EVERY honoured
// skill below 50. At v=30 that is 12.5% against 10.5% — choosing to resist would have made
// the induction more likely to land.
//
// Two reasons this suite exists rather than a spot check:
//
//   1. The failure is invisible at any value a person would try by hand. It survived two
//      passes over the design doc. Only a sweep finds it.
//   2. The skill ladder is NOT BUILT, so the inversion is not reachable through the live
//      formula — no term it carries today can produce it. The invariant is inert and the
//      only thing that can protect it until then is a test that supplies the proposed
//      terms itself, through the `skill` seam on `inductionChance()`.
//
// The weights below are the PROPOSAL's (§A2, parked). This suite models them to prove the
// rule; it does not settle them, and it must keep passing if they move.
const HYP = 246108;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};

const { session, messaging, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

storage.setFeature("hypnoEnabled", true);

const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

// --- the axes -------------------------------------------------------------------------
//
// Every input the roll reads, swept together rather than one at a time: the inversion is a
// relationship BETWEEN two choices, so it can hide behind any single axis looking sane.
const TRUSTS = [0, 1, 12.5, 25, 30, 49, 50, 51, 75, 99, 100];
const EXPERIENCES = [0, 1, 10, 25, 50, 75, 99, 100];
const AROUSALS = [0, 15, 30, 60, 99];
const RELATIONS = [null, "friend", "lover", "owner"];
// 0-100, the whole range a transmitted skill value can take, and one step either side of
// the 50 the inversion pivots on.
const SKILLS = [0, 1, 5, 10, 20, 29, 30, 40, 49, 50, 51, 60, 70, 80, 90, 99, 100];
// The proposal's two shapes for skill, with its proposed (parked) weights.
const ADDITIVE_WEIGHT = 0.35;
const FIGHT_FLOOR_WEIGHT = 0.25;
const RESISTANCE_FLOOR = 5;
const skillTerms = (v) => ({ additive: v * ADDITIVE_WEIGHT, fightFloor: RESISTANCE_FLOOR + v * FIGHT_FLOOR_WEIGHT });
// The honour rungs, as multipliers/caps on the transmitted value — rung 1 discards it,
// rung 2 scales it by trust, rung 3 clamps to STRANGER_CEILING, rung 3b ("floored", the
// v0.75.0 default) takes the larger of 2 and 3, and rung 4 passes it whole.
//
// 3b is swept even though every value it can return is one rung 2 or rung 3 also returns:
// the invariant is a relationship between two CHOICES at a given honoured value, so that
// argument is sound today and stops being sound the moment 3b's definition changes. Cheaper
// to sweep it than to re-derive why it did not need sweeping.
const honoured = (rung, value, trust) =>
	rung === 1 ? 0
		: rung === 2 ? (value * trust) / 100
		: rung === 3 ? Math.min(value, 30)
		: rung === 3.5 ? Math.max((value * trust) / 100, Math.min(value, 30))
		: value;

/** Put the subject in a given state. Deliberately does NOT safeword: the sweeps never open
 * an induction window, and a teardown per state would bury the result under ~1700 lines of
 * "Trance cleared". Sections that DO open a window clear it themselves. */
const setState = ({ trust, experience, arousal, relation }) => {
	storage.setTrustValue(HYP, "GameBot", trust);
	storage.setExperienceValue(experience);
	storage.setRelationshipOverride(HYP, relation);
	Player.ArousalSettings.Progress = arousal;
};

// --- 1. the live formula, every state, no skill ----------------------------------------
//
// What ships today. The invariant should be inert here — it is — but "inert" is the claim
// being tested, and a future term added to the sum without thought would land here first.
let sweptLive = 0, liveViolations = [], orderingViolations = [];
for (const trust of TRUSTS)
	for (const experience of EXPERIENCES)
		for (const arousal of AROUSALS)
			for (const relation of RELATIONS) {
				setState({ trust, experience, arousal, relation });
				for (const earnedOnly of [false, true]) {
					const fight = session.inductionChance(HYP, "fight", earnedOnly);
					const ignore = session.inductionChance(HYP, "ignore", earnedOnly);
					const agree = session.inductionChance(HYP, "agree", earnedOnly);
					sweptLive++;
					const where = `trust=${trust} exp=${experience} arousal=${arousal} rel=${relation} earnedOnly=${earnedOnly}`;
					if (fight > ignore) liveViolations.push(`${where} — fight ${fight} > ignore ${ignore}`);
					// Not the invariant, but the same ordering one step further: agreeing
					// should never be worse for the hypnotist than being ignored either.
					if (agree < ignore) orderingViolations.push(`${where} — agree ${agree} < ignore ${ignore}`);
					if (fight < RESISTANCE_FLOOR || fight > 95) liveViolations.push(`${where} — fight ${fight} outside the clamps`);
				}
			}
check(`live formula: fight never beats ignore (${sweptLive} states)`, liveViolations.slice(0, 3), []);
check(`live formula: agree never loses to ignore (${sweptLive} states)`, orderingViolations.slice(0, 3), []);
check("  and the sweep actually ran", sweptLive > 500, true);

// --- 2. the whole skill range, every rung ----------------------------------------------
//
// The one that matters. Same states, with the proposed skill terms supplied, across every
// skill value and every honour rung. WITHOUT the Math.min in inductionChance() this fails
// on hundreds of states — every one below an honoured 50 — which is the regression.
let sweptSkill = 0, skillViolations = [];
for (const trust of TRUSTS)
	for (const experience of EXPERIENCES)
		for (const relation of RELATIONS) {
			setState({ trust, experience, arousal: 0, relation });
			for (const value of SKILLS)
				for (const rung of [1, 2, 3, 3.5, 4]) {
					const skill = skillTerms(honoured(rung, value, trust));
					const fight = session.inductionChance(HYP, "fight", false, skill);
					const ignore = session.inductionChance(HYP, "ignore", false, skill);
					sweptSkill++;
					if (fight > ignore)
						skillViolations.push(`trust=${trust} exp=${experience} rel=${relation} skill=${value} rung=${rung} — fight ${fight} > ignore ${ignore}`);
				}
		}
check(`skill sweep: fight never beats ignore (${sweptSkill} states)`, skillViolations.slice(0, 3), []);
check("  and the sweep actually ran", sweptSkill > 5000, true);

// --- 3. the regression itself, named --------------------------------------------------
//
// Pin the worked example from the proposal so the suite says what it is defending, not just
// that nothing is wrong. New subject, no RP, expert hypnotist, rung 3 (value capped at 30).
setState({ trust: 0, experience: 0, arousal: 0, relation: null });
const rung3 = skillTerms(honoured(3, 80, 0));
const rawFight = Math.max(rung3.fightFloor, 0 - 25 + rung3.additive);
const rawIgnore = Math.max(RESISTANCE_FLOOR, 0 + 0 + rung3.additive);
check("the documented inversion is real: untreated, fight beats ignore", rawFight > rawIgnore, true);
check("  at the doc's numbers — fight 12.5 vs ignore 10.5", [rawFight, rawIgnore], [12.5, 10.5]);
check("the invariant caps it to a tie, not a win", session.inductionChance(HYP, "fight", false, rung3), rawIgnore);
check("  and leaves ignore alone", session.inductionChance(HYP, "ignore", false, rung3), rawIgnore);

// Above the pivot, skill is supposed to genuinely beat resistance (rung 4, real expert) —
// the invariant must NOT be quietly flattening that, or it has broken the ladder's top rung.
const rung4 = skillTerms(honoured(4, 80, 0));
check("above the pivot the cap does not bite: fight 25 as the doc has it", session.inductionChance(HYP, "fight", false, rung4), 25);
check("  and it is still below ignore", session.inductionChance(HYP, "ignore", false, rung4) >= 25, true);

// --- 4. the RP bonus is inside the invariant, not outside it ---------------------------
//
// rpBonusFor() is only non-zero during a live induction window, so the sweeps above never
// see it. It is added to both choices alike, but the invariant has to be computed AFTER it
// or a future per-choice RP rule would slip straight past.
setState({ trust: 20, experience: 40, arousal: 0, relation: null });
storage.setFeature("hypnoEnabled", true);
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
session.answerPrompt("ignore");
for (const line of [
	"Your eyelids are getting heavier with every breath",
	"Let your shoulders drop, and listen only to my voice",
	"Down and down, further with every word I say",
])
	session.noteInductionLine(HYP, line);
check("the window is carrying a bonus", session.rpBonusFor(HYP), 15);
let rpViolations = [];
for (const value of SKILLS) {
	const skill = skillTerms(honoured(4, value, 0));
	const fight = session.inductionChance(HYP, "fight", false, skill);
	const ignore = session.inductionChance(HYP, "ignore", false, skill);
	if (fight > ignore) rpViolations.push(`skill=${value} — fight ${fight} > ignore ${ignore}`);
}
check("mid-roleplay, fight still never beats ignore", rpViolations, []);

session.safeword();
console.log(`odds: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
