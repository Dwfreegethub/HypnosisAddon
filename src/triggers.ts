import { log, isTestingMode } from "./log";
import { tellPlayer } from "./notify";
import {
	getFeatures,
	listTriggers,
	saveTrigger,
	forgetTrigger,
	updateTriggers,
	getTriggerDecayRate,
	getTriggerScope,
	Trigger,
	TriggerScope,
} from "./storage";
import { isSessionActiveWith } from "./session";
import { depthRefusal, depthAllows, currentDepth, currentDepthEarned, tierOf, tierLabel } from "./depth";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";

/** Setup feedback goes to the HYPNOTIST, not the subject.
 *
 * It's the hypnotist who needs to know recording started, what was captured and that it
 * saved — they're the one driving. Sending it to the subject was backwards, and worse, it
 * showed them the trigger phrase, which the design doc explicitly wants hidden ("trigger
 * words can be hidden from the subject entirely"). A subject who can read their own
 * trigger word can simply avoid reacting to it. */
export function tellHypnotist(hypnotistId: number, text: string): void {
	sendHiddenMessage({ type: "trigger-status", text }, hypnotistId);
}

/** The hypnotist's side: show status their subject sent us. */
export function installTriggers(): void {
	registerHiddenHandler("trigger-status", (sender, message) => {
		const text = typeof message.text === "string" ? message.text : "";
		if (text) tellPlayer(text);
	});

	// TESTING ONLY. Registered unconditionally — it has to already exist when you enter the
	// testing room — but `ageTriggers` below refuses unless testing mode is live, so outside the
	// room a stray message only gets a refusal back. This one WRITES, which is why its gate is
	// the sharp one: an ungated version would let anyone in the room age somebody's triggers to
	// nothing, which is the opposite of what the decay clock is for.
	//
	// It exists so the bot can drive the decay scenario. Eight steps, of which only the first
	// happens on a timescale a person can sit through: see ageTriggers below.
	registerHiddenHandler("test-age", (sender, message) => {
		const days = Number(message.days ?? 1);
		const index = message.index == null ? undefined : Number(message.index);
		const result = ageTriggers(days, index);
		// BOTH SIDES ARE TOLD, because neither can see the other's screen. A silent
		// success here would be indistinguishable from a message that never arrived,
		// which is the defect this codebase has fixed in three other places already.
		if (result.refusal) {
			tellHypnotist(sender, `[trigger] Aging refused — ${result.refusal}.`);
			return;
		}
		tellHypnotist(
			sender,
			`[trigger] Aged ${result.aged} trigger(s) by ${days} day(s). ${result.lines.join("  |  ")}`,
		);
		// The subject is told too. Nothing may happen to their triggers unseen, and a
		// testing affordance is not an exception to that.
		const who = characterFor(sender)?.Name ?? `#${sender}`;
		tellPlayer(`TESTING: ${who} aged ${result.aged} trigger(s) by ${days} day(s).`);
		result.lines.forEach(tellPlayer);
	});
}

// Persistent triggers: a word planted during a trance that fires afterwards.
//
// The flow DW described, and why each piece is where it is:
//
//   "Missy, your trigger word is sleepy time"   -> starts recording
//   "Missy, you cannot move"                    -> recorded, NOT executed
//   "Missy, you cannot speak"                   -> recorded
//   "Missy, remember trigger"                   -> committed
//   ...later, out of trance...
//   "sleepy time"                               -> both actions fire
//
// Recording does NOT execute. Setting a "you cannot move" trigger would otherwise freeze
// the subject in the middle of setting it up, which is both confusing and something the
// hypnotist then has to undo before continuing.
//
// THREE GATES, and they're deliberately different from everything else in the add-on:
//
// 1. Planting needs DEPTH — the tier set for `triggerControl`, Deep by default — measured
//    against depthEARNED rather than the full depth. The design doc is explicit that the
//    arousal/drug chemical floor must never reach persistent features no matter how high the
//    Stranger ceiling goes: a trigger outlives the state that created it, so it cannot be
//    bought with arousal. Under the depth model that is the earned/full split rather than a
//    trust-vs-access one, but it is the same rule and it protects the same thing.
// 2. Each action re-checks its OWN permission when the trigger fires, not when it was
//    planted. Revoking movement permission has to disarm the movement half of a trigger
//    planted last week.
// 3. A trigger fires only for the person who installed it. The doc lists wider scopes
//    (per-list, trust-threshold, anyone) as future work; installer-only is the safe start.

/** Kept only for the tests and the help text that still name a number. The GATE is the depth
 * tier for `triggerControl`; this is the trust that historically bought it. */
export const TRIGGER_TRUST_THRESHOLD = 65;
/** Shortest phrase we'll accept. One-letter triggers would fire constantly. */
const MIN_PHRASE_LENGTH = 3;
/** Cap on actions per trigger — LSCG caps at 3; the doc says we aim higher, but not
 * unbounded, since each one runs on every match. */
const MAX_ACTIONS = 8;

// --- Reinforcement and decay -------------------------------------------------------------
//
// The doc's rule, in four parts: the clock runs from the last reinforcement; a re-induction
// by the installer resets it; FIRING the trigger only slows it; and a trigger planted deep
// decays more slowly than one planted shallow.
//
// Lazy, on read, exactly like trust decay in storage.ts — nothing to schedule, nothing to
// miss while the game is closed, correct across reloads on its own. The difference is that
// trust charges a counter and writes back; strength here is DERIVED, so reading it is free
// and only pruning writes.

/** Strength lost per day at each setting, in depth points, before the tier discount and before
 * the acceleration below.
 *
 * RETUNED IN v0.62.0, by a factor of about twenty. The first numbers were picked to feel
 * conservative and were simply wrong: "very fast" gave a Blank-planted trigger twenty-one days,
 * which is not a fast anything. DW's reading is the one these are built to now — **very fast
 * should be a few hours, and about a day for something planted at the top**:
 *
 *              very slow    slow   typical    fast   very fast
 *   Drifting        1.8d     15h        6h      3h          1h
 *   Yielding        3.9d    1.5d       14h      7h          2h
 *   Entranced       8.4d    3.5d      1.5d     17h          5h
 *   Deep           14.7d    6.7d      3.1d    1.5d         12h
 *   Blank          23.7d   11.6d      5.7d    2.9d         24h
 *
 * Read that as "planted now, never used, never reinforced — gone by". Each step is roughly
 * half the one before, so the dial has five distinguishable positions rather than three usable
 * ones and a pair nobody would pick. Deep is the reference row: it is the tier planting
 * requires by default, so it is what somebody actually experiences.
 *
 * The old scale is not preserved anywhere. It was never shipped to anyone and nobody has a
 * trigger planted under it. */
const TRIGGER_DECAY_PER_DAY: Record<string, number> = {
	never: 0,
	veryslow: 5,
	slow: 15,
	typical: 40,
	fast: 90,
	veryfast: 300,
};

/** Neglect compounds: the loss is `rate x days x (1 + days/GRACE)`, so a trigger left alone
 * sheds points faster the longer it is left alone.
 *
 * WHY THIS SHAPE, and not the exponential curve it is easy to reach for first. A true
 * exponential DEcelerates — it drops fast, then trails a long thin tail that never quite
 * reaches zero. That is a decent model of human forgetting and the wrong model for this
 * mechanic: it would leave every neglected trigger loitering at strength 4 forever, which is
 * plant-and-forget wearing a different hat. The whole reason decay exists is the doc's
 * "creates an ongoing relationship mechanic", and a deadline is what creates one.
 *
 * WHERE IT ACTUALLY BITES, which is not where you would guess. At the fast settings it changes
 * nothing measurable — a trigger set to "very fast" is gone in hours, long before fourteen days
 * of compounding mean anything. It earns its keep at the slow end, where the straight line runs
 * away: Blank at "very slowly" is 64 days linear against 24 here. Without it, the two slowest
 * settings are indistinguishable from Never for any relationship that has a pause in it.
 *
 * Fourteen days because that is roughly the longest gap the slowest setting should tolerate. */
const DECAY_GRACE_DAYS = 14;

/** Planted deeper, held longer. Multiplies the per-day loss above, so Blank fades at a
 * quarter the rate of Drifting — "harder to plant, harder to lose". */
const TIER_HOLD: Record<string, number> = {
	drifting: 1,
	yielding: 0.8,
	entranced: 0.6,
	deep: 0.4,
	blank: 0.25,
};

/** The fixed rate for a chemically seeded trigger. Not multiplied by the tier and not read
 * from the setting: the doc is explicit that the shortcut's price cannot be configured away,
 * and a rate the subject could turn down would make the tradeoff decorative.
 *
 * Between "fast" and "very fast", and with no tier discount at all — so a trigger bought with
 * arousal at Deep is gone in about nine hours where an earned one at the same tier and the same
 * setting would have days. That is the trade stated in the design doc, priced. */
const CHEMICAL_DECAY_PER_DAY = 150;

/** What one firing buys back, as a fraction of THAT TRIGGER'S OWN lifetime.
 *
 * It was a flat 0.25 days, and a flat number cannot work here any more. Lifetimes now span from
 * forty minutes to a month, so a quarter of a day is a rounding error at one end of the dial and
 * immortality at the other — two firings would have outrun "very fast" completely, which is the
 * setting most likely to be used with a trigger that gets fired a lot.
 *
 * Passive reinforcement "slows decay but does not reset the clock", so this credits elapsed time
 * rather than moving `reinforcedAt`. */
const FIRING_CREDIT_FRACTION = 0.06;
/** Ceiling on that credit. Without it, a trigger fired often enough would never decay at all,
 * which is the plant-and-forget mechanic the decay system exists to remove — just with extra
 * steps. At half a lifetime, steady use buys about 50% more time and no more: use can hold
 * something at the edge; only a re-induction brings it back. */
const MAX_FIRING_CREDIT_FRACTION = 0.5;

/** Below this a trigger is a vague pull and nothing more — it fires flavour, applies no
 * action, and says so to nobody. The doc's "far enough gone, it produces just a vague pull". */
export const TRIGGER_GHOST_THRESHOLD = 10;

/** How strong a trigger is right now, 0-100, on the same scale as trance depth.
 *
 * This IS its effective depth when it fires: a Deep trigger faded to 45 reaches only what
 * Yielding reaches, so its deeper actions stop landing while the shallow ones still do. */
export function triggerStrength(t: Trigger): number {
	// A trigger planted at zero (or negative) depth has no strength to decay — return 0 before
	// the maths, not just for tidiness: lifeDays(0) is Infinity, and on the FIRST fire the firing
	// credit is 0, so `0 * Infinity` below would make the result NaN. `NaN < GHOST_THRESHOLD` is
	// false, so the ghost guard in fireTrigger would be skipped that one time and the trigger's
	// ungated actions would fire once from a husk (exactly the "worked once, then went inert" bug
	// DW hit). Planting now refuses below the ghost threshold, so a saved trigger should never be
	// here — this keeps an older or edge-case zero-depth trigger honestly a ghost.
	if (t.plantedDepth <= 0) return 0;
	const perDay = decayPerDayFor(t);
	if (perDay <= 0) return t.plantedDepth;
	const creditFraction = Math.min((t.firings ?? 0) * FIRING_CREDIT_FRACTION, MAX_FIRING_CREDIT_FRACTION);
	const days = Math.max(0, (Date.now() - t.reinforcedAt) / 86_400_000 - creditFraction * lifeDays(t.plantedDepth, perDay));
	return Math.max(0, Math.round(t.plantedDepth - perDay * days * (1 + days / DECAY_GRACE_DAYS)));
}

/** How long a trigger of this strength lasts at this rate, in days, if it is never fired.
 *
 * The decay curve solved for zero: `rate x d x (1 + d/GRACE) = strength`, which is an ordinary
 * quadratic in d. Two callers, and both of them need it because every timescale in this system
 * now spans three orders of magnitude — the firing credit, which has to mean the same thing at
 * both ends of the dial, and the wording that tells the player what a setting actually costs. */
export function lifeDays(strength: number, perDay: number): number {
	if (perDay <= 0 || strength <= 0) return Infinity;
	return (DECAY_GRACE_DAYS / 2) * (Math.sqrt(1 + (4 * strength) / (perDay * DECAY_GRACE_DAYS)) - 1);
}

/** "about 3 days", "about 12 hours" — a duration a player can act on. */
function describeDuration(days: number): string {
	if (!Number.isFinite(days)) return "never";
	const hours = days * 24;
	if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
	if (hours < 36) return `${Math.round(hours)} hours`;
	return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
}

/** What a decay setting costs, said in time rather than in points.
 *
 * Measured on a DEEP planting because that is the tier planting requires by default, so it is
 * the row a player will actually meet. The dial was retuned in v0.62.0 precisely because the
 * labels alone ("Very fast") told nobody that they meant three weeks. */
export function describeDecayPace(rate: string = getTriggerDecayRate()): string {
	const perDay = (TRIGGER_DECAY_PER_DAY[rate] ?? 0) * TIER_HOLD.deep;
	if (perDay <= 0) return "never — planted triggers stay until something else removes them";
	return `a Deep planting fades away in about ${describeDuration(lifeDays(60, perDay))}, unused and unreinforced`;
}

/** The same fact in the few words a canvas caption has room for. */
export function decayLifetimeText(rate: string = getTriggerDecayRate()): string {
	const perDay = (TRIGGER_DECAY_PER_DAY[rate] ?? 0) * TIER_HOLD.deep;
	if (perDay <= 0) return "A planted trigger stays until it is removed.";
	return `A Deep planting lasts about ${describeDuration(lifeDays(60, perDay))} if it is never used.`;
}

function decayPerDayFor(t: Trigger): number {
	if (t.plantedChemical) return CHEMICAL_DECAY_PER_DAY;
	const base = TRIGGER_DECAY_PER_DAY[getTriggerDecayRate()] ?? 0;
	return base * (TIER_HOLD[tierOf(t.plantedDepth)] ?? 1);
}

/** Faded to nothing, and gone. Called on every read of the list rather than on a timer, for
 * the same reason the strength is derived: there is no moment we are guaranteed to be running.
 *
 * A trigger currently HOLDING the subject is spared — letting a decay tick silently drop the
 * thing that is gripping someone would leave the grip applied with nothing left to release it,
 * which is the stranded-effect bug this codebase has fixed twice already. It goes on the next
 * read after it lets go. */
export function pruneFadedTriggers(isHolding: (t: Trigger) => boolean): number {
	const all = listTriggers();
	const dead = all.filter((t) => triggerStrength(t) <= 0 && !isHolding(t));
	if (!dead.length) return 0;
	for (const t of dead) {
		log(`trigger "${t.phrase}" has faded away entirely (planted ${t.plantedDepth}, by ${t.installedByName})`);
		forgetTrigger(t.phrase);
	}
	return dead.length;
}

/** Human wording for how a trigger is holding up. */
export function describeStrength(t: Trigger): string {
	const now = triggerStrength(t);
	const label = tierLabel(tierOf(now));
	if (now <= 0) return "faded away";
	if (now < TRIGGER_GHOST_THRESHOLD) return `a vague pull only (${now})`;
	if (now >= t.plantedDepth) return `full strength (${now}, ${label})`;
	return `${now}/${t.plantedDepth} — reaches ${label}`;
}

/** A re-induction by the installer resets the clock completely.
 *
 * Requires a LIVE session with them, because that is what "a brief re-induction" means — the
 * subject went back under for it. Without that gate the phrase would be a magic word any
 * hypnotist could say in passing to keep their work alive forever, which is the opposite of an
 * ongoing relationship mechanic.
 *
 * Reinforces everything that hypnotist planted, not one trigger: they are re-establishing the
 * whole of their work, and singling one out would mean naming it aloud in front of the subject.
 * Returns how many were refreshed. */
export function reinforceTriggersBy(hypnotistId: number): number {
	const mine = listTriggers().filter((t) => t.installedBy === hypnotistId);
	if (!mine.length) return 0;
	for (const t of mine) {
		t.reinforcedAt = Date.now();
		t.firings = 0;
	}
	updateTriggers();
	log(`reinforced ${mine.length} trigger(s) for ${hypnotistId}`);
	return mine.length;
}

/** Passive reinforcement. Firing buys back a little of the clock and no more. */
export function noteTriggerFired(t: Trigger): void {
	t.firings = (t.firings ?? 0) + 1;
	updateTriggers();
}

/** What an aging run did, or why it did nothing. */
export interface AgeResult {
	/** Non-null means nothing was changed, and this says why. */
	refusal: string | null;
	/** One line per trigger touched: its number, who planted it, and the strength either
	 * side of the move — which is the whole of what there is to observe.
	 *
	 * NO PHRASES. The subject's own list hides them unless they have asked to see them, and a
	 * testing affordance must not be the hole in that; triggers are named by their number in
	 * `/hypno triggers`, exactly as `/hypno forgettrigger` names them. */
	lines: string[];
	aged: number;
}

/** TESTING ONLY: wind a trigger's decay clock backwards so the model above can be watched in
 * a sitting rather than over a fortnight.
 *
 * WHY IT HAS TO EXIST. Strength is derived from `reinforcedAt`, and every interesting property
 * of the curve lives on a scale of days: the compounding, the firing credit, the ghost
 * threshold, the sweep. Even at *very fast* a Deep planting takes twelve hours to die and a
 * Blank one a day — so the decay scenario in the design doc can observe its first step and
 * nothing after it. There is no setting that fixes this, because a rate fast enough to watch is
 * a rate too fast to test the tier discount with. Moving the clock is the only way in.
 *
 * IT MOVES THE CLOCK AND NOTHING ELSE. `firings` is deliberately left alone: the firing credit
 * is one of the things being tested, and zeroing it here would quietly make "firing slows decay
 * but does not reset it" unfalsifiable — the step would pass against an implementation that had
 * the rule backwards.
 *
 * RELATIVE, not absolute. Each call subtracts from whatever the clock already reads, so "age a
 * day, look, age another day" gives the two readings the acceleration check needs without
 * anybody working out a total. A negative number winds it forward again — useful when a run
 * overshoots — capped at now, since a trigger reinforced in the future is not a state the rest
 * of the model has an answer for.
 *
 * It does NOT prune. A trigger aged past zero reads "faded away" here and disappears on the
 * next list read, which is where pruning belongs and is itself the thing step 4 of the scenario
 * is checking. */
export function ageTriggers(days: number, index?: number): AgeResult {
	const refuse = (why: string): AgeResult => ({ refusal: why, lines: [], aged: 0 });
	if (!isTestingMode()) return refuse("not available outside the testing room");
	if (!Number.isFinite(days) || days === 0) {
		return refuse("give a number of days to age by — 1, 0.5, or a negative number to wind it back");
	}
	const all = listTriggers();
	if (!all.length) return refuse("no triggers planted");
	if (index !== undefined && (!Number.isInteger(index) || index < 1 || index > all.length)) {
		return refuse(`no trigger ${index} — you have ${all.length}. See /hypno triggers for the numbering`);
	}
	const chosen = index === undefined ? all.slice() : [all[index - 1]];
	const lines: string[] = [];
	for (const t of chosen) {
		const before = describeStrength(t);
		t.reinforcedAt = Math.min(Date.now(), t.reinforcedAt - days * 86_400_000);
		lines.push(`${all.indexOf(t) + 1}. by ${t.installedByName}: ${before} -> ${describeStrength(t)}`);
	}
	updateTriggers();
	log(`TESTING: aged ${chosen.length} trigger(s) by ${days} day(s)`);
	return { refusal: null, lines, aged: chosen.length };
}

interface Recording {
	hypnotistId: number;
	hypnotistName: string;
	phrase: string;
	actions: string[];
	/** Captured when permission was GRANTED, not when the trigger was committed — the depth
	 * that allowed the planting is the depth it was planted at, and the subject may well have
	 * drifted between the two. */
	plantedDepth: number;
	plantedChemical: boolean;
}

let recording: Recording | null = null;

export function isRecording(): boolean {
	return recording !== null;
}

export function cancelRecording(): void {
	recording = null;
}

export function describeRecording(): string {
	if (!recording) return "not recording a trigger";
	return `recording "${recording.phrase}" — ${recording.actions.length} action(s): ${recording.actions.join(", ") || "none yet"}`;
}

/** Begin recording. Returns a message to show the subject, or null if not allowed. */
export function beginRecording(hypnotistId: number, hypnotistName: string, phrase: string): string {
	const refuse = (why: string): string => { tellHypnotist(hypnotistId, why); return ""; };
	// Refusals say plainly what's wrong rather than staying in fiction. A blocked trigger
	// is almost always a SETUP problem — an unchecked box, not enough trust — and
	// atmospheric text for that just leaves you guessing, which is exactly what happened
	// the first time this shipped.
	const features = getFeatures();
	if (!features.hypnoEnabled) {
		log("trigger plant refused: hypnoEnabled off");
		return refuse("[trigger] Refused — they have not enabled Hypnosis.");
	}
	if (!features.triggerControl) {
		log("trigger plant refused: triggerControl not granted");
		return refuse('[trigger] Refused — they have not enabled "Triggers" in their Hypnosis Add-on settings.');
	}
	// Depth, against the EARNED half — see the gate note above.
	const refusal = depthRefusal("triggerControl");
	if (refusal) {
		log(`trigger plant refused: ${refusal}`);
		return refuse(
			`[trigger] Refused — planting a trigger ${refusal}. ` +
				"Take them deeper first; arousal does not count toward this one.",
		);
	}
	if (phrase.length < MIN_PHRASE_LENGTH) {
		return refuse(`[trigger] Refused — "${phrase}" is too short to use as a trigger.`);
	}
	// "Chemically seeded" means exactly: it would NOT have been permitted on earned depth
	// alone. Asked that way rather than by reading the chemical-scope setting, so it stays
	// correct in both regimes — today triggerControl is earned-only and this is always false,
	// and on the day the earned-only default becomes adjustable it starts being true without
	// this line changing.
	const plantedChemical = !depthAllows("triggerControl", currentDepthEarned(), currentDepthEarned());
	const plantedDepth = plantedChemical ? currentDepth() : currentDepthEarned();
	// A trigger's firing strength IS its planted depth (see triggerStrength). Planted below the
	// ghost threshold it is born dead — it can never fire more than a vague pull. That only
	// happens when the triggerControl depth gate has been set low enough to plant at Drifting;
	// refuse it here rather than silently save something that will never work. DW hit exactly this
	// (planted at 0, fired nothing but flavour), 2026-09-15. Same "take them deeper" shape as the
	// depth refusal above.
	if (plantedDepth < TRIGGER_GHOST_THRESHOLD) {
		log(`trigger plant refused: would be born a ghost at depth ${plantedDepth}`);
		return refuse(
			`[trigger] Refused — at this depth a trigger is too faint to ever fire (it would be a ghost). ` +
				"Take them deeper first.",
		);
	}
	recording = {
		hypnotistId,
		hypnotistName,
		phrase,
		actions: [],
		plantedDepth,
		plantedChemical,
	};
	log(`recording trigger "${phrase}" for ${hypnotistName}`);
	tellHypnotist(
		hypnotistId,
		`[trigger] RECORDING "${phrase}". Say each suggestion, then "remember trigger" to save (or "forget the trigger" to cancel).`,
	);
	// The subject gets atmosphere with no phrase in it — see tellHypnotist.
	return "Something is being set aside in you. You let it happen.";
}

/** Record a suggestion instead of running it. Returns the message to show, or null if
 * we're not recording and the caller should run it normally. */
export function recordAction(id: string): string | null {
	if (!recording) return null;
	if (recording.actions.length >= MAX_ACTIONS) {
		log(`trigger action ignored — already at the ${MAX_ACTIONS} action cap`);
		tellHypnotist(recording.hypnotistId, `[trigger] Ignored — already at the ${MAX_ACTIONS} action limit.`);
		return "Nothing more will fit.";
	}
	recording.actions.push(id);
	log(`trigger "${recording.phrase}" now has ${recording.actions.length} action(s)`);
	tellHypnotist(
		recording.hypnotistId,
		`[trigger] Recorded ${id} into "${recording.phrase}" (${recording.actions.length} so far).`,
	);
	return "That settles into place, waiting.";
}

/** Commit. Returns a message for the subject. */
export function commitRecording(): string {
	if (!recording) return "";
	if (!recording.actions.length) {
		tellHypnotist(recording.hypnotistId, `[trigger] Nothing was recorded for "${recording.phrase}", so nothing was saved.`);
		recording = null;
		return "Whatever it was, it comes to nothing.";
	}
	const trigger: Trigger = {
		phrase: recording.phrase,
		actions: recording.actions.slice(),
		installedBy: recording.hypnotistId,
		installedByName: recording.hypnotistName,
		installedAt: Date.now(),
		plantedDepth: recording.plantedDepth,
		plantedChemical: recording.plantedChemical,
		reinforcedAt: Date.now(),
		firings: 0,
	};
	saveTrigger(trigger);
	const count = trigger.actions.length;
	log(`trigger committed: "${trigger.phrase}" (${count} actions) by ${trigger.installedByName}`);
	tellHypnotist(
		trigger.installedBy,
		`[trigger] SAVED "${trigger.phrase}" — ${count} action(s): ${trigger.actions.join(", ")}. ` +
			`Planted at ${trigger.plantedDepth} (${tierLabel(tierOf(trigger.plantedDepth))}). ` +
			`Saying it will now fire them, in or out of trance.`,
	);
	recording = null;
	return "It settles somewhere you won't think to look for it.";
}

/** Triggers this speaker could fire with this line. Matched on the normalised text so
 * punctuation and case don't matter, same as suggestions.
 *
 * No name gate here, unlike suggestions — "reacts without thinking" means the word itself
 * is the key. The narrowing that keeps this safe is installer-only scope. */
/** The scope options, in the order the dropdown shows them: tightest first.
 *
 * Deliberately mirrors BC's own item-permission ladder (AllowedInteractions in
 * Character.js) so it reads familiar and behaves the way players already expect — the
 * relationship checks below use BC's own helper methods rather than reimplementing what
 * "owner" or "lover" means. The one addition is that the INSTALLER always counts,
 * whatever the level: they're the one who put it there. */
export const TRIGGER_SCOPES: { key: TriggerScope; label: string }[] = [
	{ key: "hypnotist", label: "Hypnotist only" },
	{ key: "owner", label: "Hypnotist and Owner" },
	{ key: "lovers", label: "Hypnotist, Owner and Lovers" },
	{ key: "whitelist", label: "Hypnotist, Owner, Lovers and whitelist" },
	{ key: "dominants", label: "Hypnotist, Owner, Lovers, whitelist & Dominants" },
	{ key: "notblack", label: "Hypnotist and everyone, except blacklist" },
	{ key: "everyone", label: "Hypnotist and everyone, no exceptions" },
];

function characterFor(memberNumber: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(c: any) => c?.MemberNumber === memberNumber,
	);
}

/** Does this speaker clear the subject's chosen scope?
 *
 * Follows the same order of tests as ServerChatRoomGetAllowItem: the owner is allowed at
 * every level and is checked before the blacklist, and "Dominant" means within 25
 * reputation points, both matching BC exactly rather than inventing our own reading. */
function speakerAllowedByScope(speaker: number): boolean {
	const scope = getTriggerScope();
	if (scope === "hypnotist") return false;
	// The ladder is about OTHER PEOPLE. Running it against yourself produced answers nobody
	// chose — "everyone" and "not blacklisted" trivially include you, and the dominants rung
	// asks whether your own reputation plus 25 beats your own reputation, which it always
	// does — so three scopes silently allowed self-firing and four did not. Whether you may
	// fire your own triggers is one explicit setting now; see triggersFiredBy.
	if (speaker === Player?.MemberNumber) return false;
	const C = characterFor(speaker);
	if (!C) return false;
	if (Player?.IsOwnedByCharacter?.(C)) return true;
	if (scope === "everyone") return true;
	if (Player?.HasOnBlacklist?.(C)) return false;
	if (scope === "notblack") return true;
	if (scope === "owner") return false;
	if (C.IsLoverOfCharacter?.(Player)) return true;
	if (scope === "lovers") return false;
	if (Player?.HasOnWhitelist?.(C)) return true;
	if (scope === "whitelist") return false;
	try {
		return ReputationCharacterGet(C, "Dominant") + 25 >= ReputationCharacterGet(Player, "Dominant");
	} catch {
		return false;
	}
}

export function triggersFiredBy(speaker: number, normalisedText: string): Trigger[] {
	if (!normalisedText) return [];
	const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
	// Yourself is decided by one setting and nothing else — including the installedBy
	// shortcut below, which would otherwise let a trigger you somehow planted in yourself
	// fire regardless of the setting.
	if (speaker === Player?.MemberNumber) return getFeatures().selfTrigger ? matching : [];
	const allowedByScope = speakerAllowedByScope(speaker);
	return matching.filter((t) => t.installedBy === speaker || allowedByScope);
}

/** Triggers this speaker may RELEASE by name. Deliberately looser than firing: undoing can
 * never harm the subject, so it does not answer to the self-trigger setting the way firing
 * does. That matters most for the case it was written for — a subject who has been silenced
 * cannot say a release phrase at all, so the ways out that remain (this, `/hypno release`,
 * the duration timer, the safeword) must not be narrowed further than they already are. */
export function triggersReleasableBy(speaker: number, normalisedText: string): Trigger[] {
	if (!normalisedText) return [];
	const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
	if (speaker === Player?.MemberNumber) return matching;
	const allowedByScope = speakerAllowedByScope(speaker);
	return matching.filter((t) => t.installedBy === speaker || allowedByScope);
}

/** For the settings screen and /hypno triggers. */
export function describeScope(): string {
	return TRIGGER_SCOPES.find((s) => s.key === getTriggerScope())?.label ?? "Hypnotist only";
}

/** Can this hypnotist still reach us at all? Firing needs Hypnosis Enabled and the trigger
 * permission — revoking either disarms every trigger they planted, without needing to hunt
 * them down individually. */
export function triggersArmed(): boolean {
	const features = getFeatures();
	return features.hypnoEnabled && features.triggerControl;
}

/** True while the trigger's installer has a live trance on us. Used only to keep a trigger
 * from double-firing the suggestions the hypnotist is already speaking directly. */
export function installerHasSession(trigger: Trigger): boolean {
	return isSessionActiveWith(trigger.installedBy);
}
