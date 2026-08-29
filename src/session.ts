import { log } from "./log";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures, trustWith, experienceValue } from "./storage";
import { noteInductionSuccess, noteInductionAttempt } from "./trust";
import { clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import {
	applyEffect,
	removeEffect,
	clearSuggestedPose,
	setSpeechBlocked,
	setScreenFade,
	clearTranceStates,
	TRANCE_FADE_OPACITY,
} from "./effects";

// The hypnosis session state machine, per the design doc's "Session Flow" section.
//
// SUBJECT-AUTHORITATIVE, same pattern as the remote-control feature: the subject's client
// owns the one true session state (it's the side holding trust, the private choice, and
// the cooldown) and pushes a deliberately lossy *view* of it to the hypnotist. The
// hypnotist's client never receives the subject's choice or any raw number — only bands —
// so a modified hypnotist client can't read them, rather than merely agreeing not to.
//
// Session state is intentionally in-memory only, not persisted: a trance shouldn't
// survive a page reload, and "reload to get out" is a useful last-ditch escape hatch on
// top of the safeword.

export type SessionPhase =
	| "Idle"
	| "AttemptMade" // prompt shown to subject, waiting on their answer
	| "InductionInProgress" // answered; RP window running before the roll
	| "AttemptFailed" // roll missed; hypnotist may Continue Trying
	| "Hypnotized"
	| "CooldownRequired";

export type SessionChoice = "agree" | "ignore" | "fight";

// The doc's state machine also lists a "Waking" state. We don't model it: waking is
// instantaneous here (release effects, go Idle) with nothing to observe in between. If a
// wake-up grace period is ever wanted, that's where it goes.

// --- Tuning constants. All guesses, meant to be played with. -------------------------
// Eventually several of these become player settings (the doc has session duration and
// max attempts as subject-set); constants until the flow itself is proven.
const PROMPT_TIMEOUT_MS = 60_000;
// TESTING VALUE — normally 60_000. Dropped to 10s so an induction can be exercised
// repeatedly without a minute of dead time per attempt. PUT THIS BACK before any real
// play: 10 seconds is far too short to actually roleplay an induction, which is the
// entire point of this window existing.
const INDUCTION_WINDOW_MS = 10_000;
const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 10 * 60_000;
const SESSION_TIMEOUT_MS = 30 * 60_000;
/** Floor and ceiling on the induction chance, so neither outcome is ever certain. The
 * floor is what an actively resisting stranger still leaves open: 5% per attempt, ~14%
 * across a session's three. DW's settled call; meant to become a player setting. */
const RESISTANCE_FLOOR = 5;
const CHANCE_CEILING = 95;
/** How hard subject experience pulls the roll, in either direction. At experience 100 this
 * is ±25 — the same magnitude as the choice modifier, which is probably too strong once
 * hypnotist skill exists to compete with it. Tune against real play. */
const EXPERIENCE_WEIGHT = 0.25;
/** Above this depth the subject can no longer pull themselves out — only the hypnotist,
 * the session timeout, or the safeword. */
const SELF_WAKE_MAX_DEPTH = 40;
const CHOICE_MODIFIER: Record<SessionChoice, number> = { agree: 25, ignore: 0, fight: -25 };

// --- Subject side: the real state ----------------------------------------------------

interface SubjectSession {
	phase: SessionPhase;
	hypnotistId: number | null;
	/** Never transmitted. The whole point of the private prompt. */
	choice: SessionChoice | null;
	attempts: number;
	/** Score of the last failed roll, drives the vague progress band. */
	progress: number;
	/** Fixed at the moment of successful induction, per the design doc — going deeper
	 * requires waking and running a fresh induction. */
	depth: number;
	cooldownUntil: number;
	hypnotizedAt: number;
}

function freshSession(): SubjectSession {
	return {
		phase: "Idle",
		hypnotistId: null,
		choice: null,
		attempts: 0,
		progress: 0,
		depth: 0,
		cooldownUntil: 0,
		hypnotizedAt: 0,
	};
}

let session: SubjectSession = freshSession();
let promptTimer: ReturnType<typeof setTimeout> | null = null;
let windowTimer: ReturnType<typeof setTimeout> | null = null;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers(): void {
	for (const t of [promptTimer, windowTimer, sessionTimer]) if (t) clearTimeout(t);
	promptTimer = windowTimer = sessionTimer = null;
}

function notify(message: string): void {
	log(message);
	// No timeout — these are consent-relevant, they should stay in the log rather than
	// fade out while the player is looking somewhere else.
	ChatRoomSendLocal(message);
}

// --- Bands: what the hypnotist is allowed to see -------------------------------------

/** `progress` now holds the CHANCE the last attempt had, not a score against a threshold —
 * so higher means closer, and the bands read straight off it. Still the only thing the
 * hypnotist ever learns about how it went: a feel for direction, never a number. */
function progressBand(chance: number): string {
	if (chance < 15) return "barely responsive";
	if (chance < 30) return "slightly relaxed";
	if (chance < 50) return "more relaxed";
	return "almost under";
}

function depthBand(depth: number): string {
	if (depth < 25) return "lightly under";
	if (depth < 60) return "deeply under";
	return "very deep";
}

// --- Subject side: pushing the view --------------------------------------------------

function pushUpdate(refusedReason?: string): void {
	if (session.hypnotistId == null) return;
	const now = Date.now();
	sendHiddenMessage(
		{
			type: "session-update",
			phase: session.phase,
			attempts: session.attempts,
			maxAttempts: MAX_ATTEMPTS,
			// Bands only — never `progress`, `depth`, or `choice` themselves.
			progressBand: session.phase === "AttemptFailed" ? progressBand(session.progress) : null,
			depthBand: session.phase === "Hypnotized" ? depthBand(session.depth) : null,
			cooldownRemaining: Math.max(0, session.cooldownUntil - now),
			windowRemaining: session.phase === "InductionInProgress" ? INDUCTION_WINDOW_MS : 0,
			refusedReason: refusedReason ?? null,
		},
		session.hypnotistId,
	);
}

/** Send a one-off refusal to someone who isn't (and isn't becoming) our hypnotist,
 * without disturbing whatever session state we're actually in. */
function refuse(to: number, reason: string): void {
	sendHiddenMessage(
		{
			type: "session-update",
			phase: session.hypnotistId === to ? session.phase : "Idle",
			attempts: 0,
			maxAttempts: MAX_ATTEMPTS,
			progressBand: null,
			depthBand: null,
			cooldownRemaining: Math.max(0, session.cooldownUntil - Date.now()),
			windowRemaining: 0,
			refusedReason: reason,
		},
		to,
	);
}

function endSession(reason: string, quiet = false): void {
	clearTimers();
	const had = session.phase === "Hypnotized";
	const hypnotist = session.hypnotistId;
	// Everything a session could have applied comes off together — a session ending must
	// never leave an effect stranded with no way to reach it.
	removeEffect("Freeze");
	removeEffect("BlockWardrobe");
	clearSuggestedPose();
	clearTranceStates();
	clearAllSuppression();
	clearSelfTouchBlocks();
	session = freshSession();
	session.hypnotistId = hypnotist;
	pushUpdate();
	session.hypnotistId = null;
	if (!quiet) notify(had ? `You come out of trance. (${reason})` : `Hypnosis attempt ended. (${reason})`);
}

// --- Subject side: the roll ----------------------------------------------------------

// The arousal/drug chemical floor from the design doc — effective access is
// `max(relationshipTrust, chemicalFloor)` — belongs inside inductionChance below, wrapping
// the trust term. Not built yet; neither arousal nor drugs are wired up.

/** The chance this attempt lands, 0-100. Read the number literally: 35 means a 35% chance.
 *
 * Replaces the old `score >= 50` threshold, which had almost no probabilistic zone — with
 * only a 20-wide random term, outcomes swung from impossible to certain across a 20-point
 * trust window (at trust 25 + Agree it was already 100%, at trust 25 + Ignore it was 0%).
 *
 * Experience is a SINGLE POOL whose sign follows the choice, per DW: practice with
 * hypnosis is one skill, and cooperating or resisting is what you do with it. So it helps
 * you go under when you agree and helps you resist when you fight, from the same number.
 *
 * The 5/95 clamps mean nothing is ever certain either way — a determined stranger keeps a
 * sliver, and a deeply trusted hypnotist can still miss. The floor is DW's settled call
 * and is meant to become a player setting. */
function inductionChance(hypnotistId: number, choice: SessionChoice): number {
	const trust = trustWith(hypnotistId);
	const exp = experienceValue();
	const experienceEffect = choice === "agree" ? exp * EXPERIENCE_WEIGHT : choice === "fight" ? -exp * EXPERIENCE_WEIGHT : 0;
	// Hypnotist skill belongs in this sum too, but it lives on the HYPNOTIST's client and
	// the roll runs here — see the design doc's step-2 note. Deliberately absent until
	// that's resolved, rather than trusting a self-reported number.
	const raw = trust + CHOICE_MODIFIER[choice] + experienceEffect;
	return Math.max(RESISTANCE_FLOOR, Math.min(CHANCE_CEILING, raw));
}

/** What the roll would be against this person right now, for each choice. The single most
 * useful thing to see while tuning: it exposes the inputs and the resulting chance without
 * needing to run an induction and infer them from the outcome. */
export function describeChances(memberId: number): string[] {
	const trust = trustWith(memberId);
	const exp = experienceValue();
	const perSession = (c: number) => 100 * (1 - Math.pow(1 - c / 100, MAX_ATTEMPTS));
	return [
		`vs [${memberId}] — trust ${trust.toFixed(1)}, experience ${exp.toFixed(1)}`,
		...(["agree", "ignore", "fight"] as SessionChoice[]).map((choice) => {
			const c = inductionChance(memberId, choice);
			return `  ${choice.padEnd(6)} ${c.toFixed(1)}% per attempt, ${perSession(c).toFixed(0)}% across ${MAX_ATTEMPTS}`;
		}),
	];
}

function runInductionRoll(): void {
	windowTimer = null;
	if (session.phase !== "InductionInProgress" || session.hypnotistId == null) return;

	const choice = session.choice ?? "ignore";
	const chance = inductionChance(session.hypnotistId, choice);
	const roll = Math.random() * 100;
	session.attempts += 1;
	// Every attempt is practice, whichever way it goes — see trust.ts. Called before the
	// branches so no exit path can miss it.
	noteInductionAttempt();
	const detail = `chance=${chance.toFixed(1)} roll=${roll.toFixed(1)} choice=${choice} trust=${trustWith(session.hypnotistId).toFixed(1)} exp=${experienceValue().toFixed(1)}`;

	if (roll < chance) {
		session.phase = "Hypnotized";
		// Depth falls out of the same roll: a comfortable success goes deep, a squeaker
		// leaves a shallow trance the subject can pull themselves out of.
		session.depth = Math.min(100, Math.max(0, Math.round(chance - roll)));
		session.hypnotizedAt = Date.now();
		sessionTimer = setTimeout(() => endSession("session timed out"), SESSION_TIMEOUT_MS);
		applyTranceState();
		// The accelerator, and the practice. Both halves only on success.
		noteInductionSuccess(session.hypnotistId, findCharacterName(session.hypnotistId));
		notify(`You slip under. (${depthBand(session.depth)})`);
		log(`induction SUCCEEDED: ${detail} depth=${session.depth}`);
	} else if (session.attempts >= MAX_ATTEMPTS) {
		session.phase = "CooldownRequired";
		session.cooldownUntil = Date.now() + COOLDOWN_MS;
		session.progress = chance;
		notify("The attempt fades. You feel clear-headed, and harder to reach for a while.");
		log(`induction FAILED (final): ${detail}`);
	} else {
		session.phase = "AttemptFailed";
		session.progress = chance;
		notify("The attempt doesn't quite land.");
		log(`induction failed: ${detail} attempt=${session.attempts}`);
	}
	pushUpdate();
}

function findCharacterName(memberId: number): string {
	const c = (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(x: any) => x?.MemberNumber === memberId,
	);
	return c?.Name ?? `#${memberId}`;
}

/** The baseline "you are hypnotized" state, applied the moment the induction lands.
 *
 * These read the trance-* settings, NOT the per-feature permissions: the permissions
 * govern what a hypnotist may reach for on demand, while these describe what being under
 * is like for this player — something they opted into by accepting the induction at all.
 * They still answer to hypnoEnabled, and every exit path calls clearTranceStates(). */
function applyTranceState(): void {
	const f = getFeatures();
	if (!f.hypnoEnabled) return;
	if (f.tranceCannotMove) applyEffect("Freeze");
	if (f.tranceCannotSpeak) setSpeechBlocked(true);
	if (f.tranceScreenFade) setScreenFade(TRANCE_FADE_OPACITY);
	log(
		`trance state applied: move=${f.tranceCannotMove} speak=${f.tranceCannotSpeak} fade=${f.tranceScreenFade}`,
	);
}

function beginInductionWindow(): void {
	session.phase = "InductionInProgress";
	if (windowTimer) clearTimeout(windowTimer);
	windowTimer = setTimeout(runInductionRoll, INDUCTION_WINDOW_MS);
	pushUpdate();
}

function showPrompt(hypnotistName: string): void {
	if (promptTimer) clearTimeout(promptTimer);
	promptTimer = setTimeout(() => {
		promptTimer = null;
		if (session.phase !== "AttemptMade") return;
		// Silence is neutral, not refusal — an AFK or distracted subject shouldn't get a
		// resistance bonus they didn't ask for, nor a cooperation bonus they didn't give.
		session.choice = "ignore";
		notify("You didn't respond — the induction proceeds without your intent either way.");
		beginInductionWindow();
	}, PROMPT_TIMEOUT_MS);
	notify(
		`${hypnotistName} is attempting to hypnotize you. Respond with /hypno agree, /hypno ignore, or /hypno fight — they will not be told which you chose. (${Math.round(PROMPT_TIMEOUT_MS / 1000)}s)`,
	);
}

// --- Subject side: public entry points (commands) ------------------------------------

export function answerPrompt(raw: string): void {
	const choice = (raw ?? "").trim().toLowerCase() as SessionChoice;
	if (!["agree", "ignore", "fight"].includes(choice)) {
		notify("usage: /hypno agree | ignore | fight");
		return;
	}
	if (session.phase !== "AttemptMade") {
		notify("Nobody is attempting to hypnotize you right now.");
		return;
	}
	if (promptTimer) {
		clearTimeout(promptTimer);
		promptTimer = null;
	}
	session.choice = choice;
	notify(
		choice === "agree"
			? "You let yourself go along with it."
			: choice === "fight"
				? "You brace against it."
				: "You neither help nor resist.",
	);
	beginInductionWindow();
}

export function selfWake(): void {
	if (session.phase !== "Hypnotized") {
		notify("You aren't in a trance.");
		return;
	}
	if (session.depth > SELF_WAKE_MAX_DEPTH) {
		// Deliberately not a hard refusal: the safeword below is always available, and the
		// player is told so, so "can't wake" is a game state and never an actual trap.
		notify("You're too far under to surface on your own. (/hypno safeword always works.)");
		return;
	}
	endSession("you woke yourself");
}

/** Hard floor from the design doc: always works, in any state, no permission checks, no
 * way for anyone to take it away. Deliberately the simplest path in this file. */
export function safeword(): void {
	clearTimers();
	const hypnotist = session.hypnotistId;
	removeEffect("Freeze");
	removeEffect("BlockWardrobe");
	clearSuggestedPose();
	clearTranceStates();
	clearAllSuppression();
	clearSelfTouchBlocks();
	session = freshSession();
	if (hypnotist != null) {
		session.hypnotistId = hypnotist;
		// Deliberately unambiguous on the hypnotist's screen. A safeword is an OOC stop
		// signal, not an in-fiction escape — the other player needs to read it as "back
		// off now", not wonder whether their subject cleverly broke the trance.
		pushUpdate("They used their safeword. Stop.");
		session.hypnotistId = null;
	}
	notify("Safeword. Trance cleared, all effects released, everything back under your control.");
}

export function describeSession(): string {
	// Permissions are reported alongside the session because a suggestion needs BOTH, and
	// "nothing happened" never says which one was missing.
	const f = getFeatures();
	const granted = (Object.keys(f) as (keyof typeof f)[]).filter((k) => f[k]).join(", ") || "none";
	const perms = `permissions: ${granted}`;
	if (session.phase === "Idle") return `session: Idle | ${perms}`;
	const bits = [`session: ${session.phase}`];
	if (session.hypnotistId != null) bits.push(`hypnotist=${session.hypnotistId}`);
	if (session.choice) bits.push(`choice=${session.choice}`);
	if (session.attempts) bits.push(`attempts=${session.attempts}/${MAX_ATTEMPTS}`);
	if (session.phase === "Hypnotized") bits.push(`depth=${session.depth} (${depthBand(session.depth)})`);
	if (session.phase === "AttemptFailed") bits.push(`progress=${session.progress.toFixed(1)}`);
	if (session.cooldownUntil > Date.now())
		bits.push(`cooldown=${Math.ceil((session.cooldownUntil - Date.now()) / 1000)}s`);
	return `${bits.join(" ")} | ${perms}`;
}

/** Spoken wake-up keyword, per the design doc's "wake-up keyword (spoken in chat) or a
 * Wake Up button — always available". Same effect as the button.
 *
 * Deliberately ungated by any permission: ending a trance is always allowed, the same
 * principle that makes a remote release always honored. Works from any live phase, so
 * waking someone mid-induction cancels the attempt rather than being ignored.
 * Returns false if this person isn't running a session on us. */
export function wakeByHypnotist(sender: number): boolean {
	if (session.hypnotistId !== sender || session.phase === "Idle") return false;
	endSession("they woke you");
	return true;
}

/** Are we in trance at all, regardless of who put us there? Used by the settings screen's
 * lock, which doesn't care which hypnotist is responsible. */
export function isHypnotized(): boolean {
	return session.phase === "Hypnotized";
}

/** Is this person running a live session on us, in any phase? Broader than
 * isSessionActiveWith, which means specifically "in trance". */
export function hasLiveSessionWith(memberNumber: number): boolean {
	return session.hypnotistId === memberNumber && session.phase !== "Idle";
}

/** The gate for every session-scoped remote feature: is this specific person currently
 * running a session on us? Read by remote.ts before honoring any effect request. */
export function isSessionActiveWith(memberNumber: number): boolean {
	return session.phase === "Hypnotized" && session.hypnotistId === memberNumber;
}

// --- Hypnotist side: the replica -----------------------------------------------------

export interface SessionView {
	phase: SessionPhase;
	attempts: number;
	maxAttempts: number;
	progressBand: string | null;
	depthBand: string | null;
	cooldownRemaining: number;
	windowRemaining: number;
	refusedReason: string | null;
	/** Local receipt time, so countdowns tick without trusting the other client's clock. */
	receivedAt: number;
}

const views = new Map<number, SessionView>();

export function getSessionView(memberNumber: number): SessionView | undefined {
	return views.get(memberNumber);
}

/** Remaining ms on a countdown the subject reported, adjusted for time since it arrived. */
export function countdownRemaining(view: SessionView, field: "cooldownRemaining" | "windowRemaining"): number {
	return Math.max(0, view[field] - (Date.now() - view.receivedAt));
}

export function requestAttempt(memberNumber: number): void {
	// Name travels with the request so the subject's prompt can say who it is without
	// depending on them having that character loaded and resolvable at that moment.
	sendHiddenMessage({ type: "session-attempt", hypnotistName: Player?.Name ?? "Someone" }, memberNumber);
	log(`sent session-attempt to ${memberNumber}`);
}

export function requestContinue(memberNumber: number): void {
	sendHiddenMessage({ type: "session-continue" }, memberNumber);
	log(`sent session-continue to ${memberNumber}`);
}

export function requestWake(memberNumber: number): void {
	sendHiddenMessage({ type: "session-wake" }, memberNumber);
	log(`sent session-wake to ${memberNumber}`);
}

export function querySession(memberNumber: number): void {
	views.delete(memberNumber);
	sendHiddenMessage({ type: "session-query" }, memberNumber);
}

// --- Wiring --------------------------------------------------------------------------

export function installSession(): void {
	// Incoming, as the SUBJECT.

	registerHiddenHandler("session-query", (sender) => {
		if (session.hypnotistId === sender) pushUpdate();
		else refuse(sender, "");
	});

	registerHiddenHandler("session-attempt", (sender, message) => {
		if (!getFeatures().hypnoEnabled) {
			refuse(sender, "They aren't open to hypnosis.");
			return;
		}
		if (session.cooldownUntil > Date.now() && session.hypnotistId === sender) {
			refuse(sender, "Not yet — try again later.");
			return;
		}
		if (session.phase === "Hypnotized") {
			refuse(sender, session.hypnotistId === sender ? "Already under." : "They're already in a trance.");
			return;
		}
		if (session.phase !== "Idle" && session.hypnotistId !== sender) {
			refuse(sender, "Someone else is already working on them.");
			return;
		}
		clearTimers();
		session = freshSession();
		session.hypnotistId = sender;
		session.phase = "AttemptMade";
		pushUpdate();
		showPrompt(String(message.hypnotistName ?? `#${sender}`));
	});

	registerHiddenHandler("session-continue", (sender) => {
		if (session.hypnotistId !== sender) return;
		if (session.phase !== "AttemptFailed") return;
		// Retry reuses the choice already made — the subject decided their stance for this
		// encounter once, and re-prompting on every retry would be nagging, not consent.
		notify("They try again.");
		beginInductionWindow();
	});

	registerHiddenHandler("session-wake", (sender) => {
		if (session.hypnotistId !== sender) return;
		if (session.phase === "Idle") return;
		endSession("they woke you");
	});

	// Incoming, as the HYPNOTIST.

	registerHiddenHandler("session-update", (sender, message) => {
		views.set(sender, {
			phase: (message.phase as SessionPhase) ?? "Idle",
			attempts: Number(message.attempts ?? 0),
			maxAttempts: Number(message.maxAttempts ?? MAX_ATTEMPTS),
			progressBand: (message.progressBand as string) ?? null,
			depthBand: (message.depthBand as string) ?? null,
			cooldownRemaining: Number(message.cooldownRemaining ?? 0),
			windowRemaining: Number(message.windowRemaining ?? 0),
			refusedReason: (message.refusedReason as string) || null,
			receivedAt: Date.now(),
		});
	});
}
