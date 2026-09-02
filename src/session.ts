import { log } from "./log";
import { tellPlayer } from "./notify";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures, trustWith, experienceValue } from "./storage";
import { noteInductionSuccess, noteInductionAttempt, accessFor, describeRelationship } from "./trust";
import { clearAllTimers, timerDeadline } from "./timers";
import {
	persist,
	clearSaved,
	snapshotLocalState,
	startRecovery,
	registerRecoveryHandlers,
	snapshotTriggers,
	stopWaiting,
	SavedSession,
} from "./recovery";
import { clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import { clearOrgasmDenial } from "./arousal";
import { freezeAppearance, clearIllusion, describeIllusion } from "./illusion";
import {
	carryThroughWake,
	releaseCarried,
	isCarried,
	carriedIds,
	describeCarry,
	clearActiveSuggestions,
} from "./carry";
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
// Session state is in memory, and ALSO written down for reconnects — see recovery.ts.
// "Reload to get out" used to be described here as a deliberate escape hatch; it never was
// one. It was a comment written around the behaviour rather than a decision, and it was not
// even true: the BC effects survived a reload while the session that would release them did
// not, so reloading made things worse rather than better. The safeword is the escape hatch.

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
/** How long the roleplay window runs before the roll.
 *
 * Back to a minute as of 2026-09-01, per DW's priority list. It sat at 10 seconds through
 * development so an induction could be exercised repeatedly without a minute of dead time
 * per attempt — but ten seconds is far too short to actually roleplay an induction, which
 * is the entire point of this window, and it is now also the window the RP bonus is earned
 * in. Three substantive lines in ten seconds is typing speed, not roleplay. */
const INDUCTION_WINDOW_MS = 60_000;
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
/** How far arousal alone can carry someone with zero relationship trust — the design doc's
 * "Stranger ceiling". Meant to be a player setting; a constant until the settings screen
 * grows a control that isn't a checkbox. At 30, a fully aroused stranger reaches the same
 * access as roughly an hour of conversation, and no further. */
const STRANGER_CEILING = 30;
/** Above this depth the subject can no longer pull themselves out — only the hypnotist,
 * the session timeout, or the safeword. */
const SELF_WAKE_MAX_DEPTH = 40;
const CHOICE_MODIFIER: Record<SessionChoice, number> = { agree: 25, ignore: 0, fight: -25 };

// --- The RP reward -------------------------------------------------------------------
//
// The design doc has always asked for this — "hypnotist is rewarded for engaging during the
// induction window (messages sent, time invested, actual RP effort)" — and the roll formula
// has always had a slot for it. It was never built, which left the induction ACCELERATOR
// looking like the RP reward when it is nothing of the kind: that pays out for completing an
// induction, identically whether you roleplayed one or waited out the window in silence.
//
// This is the one that actually reads effort. Deliberately session-only, exactly like the
// arousal floor: it moves this roll and is then gone, so it can never be farmed into stored
// trust or into anything persistent.
//
// It also raises the depth CEILING for free, since depth is `chance - roll`. Roleplaying the
// induction properly gets you in more often AND gets you deeper when you do, which is the
// right shape for a reward — no separate mechanic needed.
/** Per line that counts. */
const RP_BONUS_PER_LINE = 5;
/** Ceiling. Meaningful against Agree's +25, never decisive against a clamp of 95. */
const RP_BONUS_CAP = 15;
/** Shortest line that reads as roleplay rather than noise. Set low enough that real
 * induction phrasing clears it — "Look into my eyes" is 17 — and high enough that single
 * words and "ok" do not. */
const RP_MIN_LENGTH = 15;

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
	/** Who the pending prompt names, and when it lapses. Held here rather than in the
	 * prompt box so the on-screen panel and the chat fallback read one source of truth —
	 * the box is a second way to answer the same prompt, not a second prompt. */
	promptName: string;
	promptExpiresAt: number;
	/** Lines the hypnotist actually roleplayed during the induction window. Counted, not
	 * scored — see noteInductionLine. Never leaves this client and never reaches storage. */
	rpLines: number;
	/** The last line counted, so the same one pasted repeatedly cannot farm the bonus. */
	lastRpLine: string;
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
		promptName: "",
		promptExpiresAt: 0,
		rpLines: 0,
		lastRpLine: "",
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
	tellPlayer(message);
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

/** Absolute deadline of the running session timeout, so a resumed session gets the time it
 * had left rather than a fresh thirty minutes. */
let sessionEndsAt = 0;

/** How often to re-write the trance while it is running.
 *
 * A heartbeat is needed because pushUpdate() fires on SESSION transitions, and almost
 * nothing that needs saving is a session transition. Suggestions, triggers and panel buttons
 * all change what is in force without touching the phase, so a snapshot taken only at
 * transitions is stale in both directions: an effect applied by speech after the last one is
 * never saved at all, and an effect RELEASED after it stays saved as though it were still on.
 * The second is what made a reconnect announce a clothing illusion that had already been
 * lifted; the first is worse and quieter, since it drops real restrictions on resume. */
const PERSIST_HEARTBEAT_MS = 5_000;
let persistTimer: ReturnType<typeof setInterval> | null = null;

function stopPersistHeartbeat(): void {
	if (persistTimer) clearInterval(persistTimer);
	persistTimer = null;
}

/** Write the trance down where a reconnect can find it.
 *
 * Called from pushUpdate on every session transition AND on a heartbeat while under, so the
 * saved copy is never more than a few seconds behind whatever is actually in force. Only a
 * live trance is worth saving: an idle client has nothing to come back to. */
function persistSession(): void {
	if (session.phase !== "Hypnotized") {
		stopPersistHeartbeat();
		clearSaved();
		return;
	}
	// Self-arming, so no caller has to remember to start it — the phase check above is the
	// only place that decides whether a trance is running.
	if (!persistTimer) persistTimer = setInterval(persistSession, PERSIST_HEARTBEAT_MS);
	persist({
		...snapshotLocalState(),
		hypnotistId: session.hypnotistId,
		hypnotistName: findCharacterName(session.hypnotistId),
		depth: session.depth,
		sessionEndsAt,
		carried: carriedIds(),
		carriedUntil: timerDeadline("carry"),
		triggers: snapshotTriggers(),
	});
}

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
	persistSession();
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
	clearActiveSuggestions();
	stopWaiting();
	stopPersistHeartbeat();
	clearSaved();
	// The denial LOCK comes off; the arousal LEVEL stays. One is something we applied to
	// them, the other is a number they now carry — resetting it would be us reaching into
	// state that was theirs before the session and is theirs after it.
	clearOrgasmDenial();
	// The one effect the total-clear-then-reapply pattern cannot cover: re-applying the
	// illusion would take a FRESH snapshot, of the truth, at the moment of waking. So when
	// it is carried, the snapshot has to survive the clear rather than be rebuilt after it.
	if (!isCarried("illusion-block")) clearIllusion();
	clearAllTimers();
	session = freshSession();
	session.hypnotistId = hypnotist;
	pushUpdate();
	session.hypnotistId = null;
	if (!quiet) notify(had ? `You come out of trance. (${reason})` : `Hypnosis attempt ended. (${reason})`);
	// AFTER the clear, deliberately: the clear stays total so no branch can strand an
	// effect, and anything the hypnotist made durable is put back from a list rather than
	// by carving exceptions into the one function that guarantees a clean exit.
	const carried = carryThroughWake();
	if (carried && !quiet) notify(carried);
}

// --- Subject side: the roll ----------------------------------------------------------

/** The design doc's chemical access floor, from arousal. Drugs will feed the same floor
 * when they exist.
 *
 * Read off `Player.ArousalSettings.Progress` — OUR OWN arousal, on our own client. That's
 * both correct and convenient: it's the subject's lowered guard that matters, the roll
 * already runs here, and nothing has to be synced or trusted from anyone else.
 *
 * Verified against Activity.js: Progress is documented and clamped 0-100, and BC itself
 * treats arousal as active only when `Active` is "Hybrid" or "Automatic" (the check in its
 * own arousal handler). A player who turned the meter off gets no floor at all — their
 * setting, respected.
 *
 * IMPORTANT, per the doc: this floor is for SESSION-ONLY effects. It must never reach
 * persistent triggers or anything that writes lasting state, no matter how high the
 * ceiling goes. Today its only consumer is the induction roll, which is session-only by
 * definition — check this comment before wiring it anywhere else. */
function chemicalFloor(): number {
	const settings = Player?.ArousalSettings;
	const active = settings?.Active === "Hybrid" || settings?.Active === "Automatic";
	if (!active) return 0;
	const progress = typeof settings?.Progress === "number" ? settings.Progress : 0;
	return Math.max(0, Math.min(STRANGER_CEILING, progress));
}

/** Effective access for a threshold check: `max(relationshipTrust, chemicalFloor)`.
 *
 * A FLOOR, not a multiplier — deliberately, and the doc spells out why: a multiplier on
 * zero trust is still zero, so it would give a stranger nothing, which is the one case the
 * mechanic exists to serve. As a floor it also lets an established relationship push a
 * little past where trust alone would sit. */
export function effectiveAccess(memberId: number): number {
	// Three inputs, one max(): what they have earned, what a BC relationship confers, and
	// what arousal is lending right now. The relationship half is category-aware — an owner
	// lifts everything, a friend only session-scoped things — while the arousal half is
	// session-only by construction, which is why it is applied here and nowhere else.
	return Math.max(accessFor(memberId, "session"), chemicalFloor());
}

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
	const trust = effectiveAccess(hypnotistId);
	const exp = experienceValue();
	const experienceEffect = choice === "agree" ? exp * EXPERIENCE_WEIGHT : choice === "fight" ? -exp * EXPERIENCE_WEIGHT : 0;
	// Hypnotist skill belongs in this sum too, but it lives on the HYPNOTIST's client and
	// the roll runs here — see the design doc's step-2 note. Deliberately absent until
	// that's resolved, rather than trusting a self-reported number.
	const raw = trust + CHOICE_MODIFIER[choice] + experienceEffect + rpBonusFor(hypnotistId);
	return Math.max(RESISTANCE_FLOOR, Math.min(CHANCE_CEILING, raw));
}

/** What the roleplay in this induction window is currently worth, 0-15.
 *
 * Zero for anyone who is not the hypnotist of the live attempt, so the `/hypno chance`
 * diagnostic reports a clean number for people you are not mid-induction with. */
export function rpBonusFor(hypnotistId: number): number {
	if (hypnotistId !== session.hypnotistId) return 0;
	return Math.min(session.rpLines * RP_BONUS_PER_LINE, RP_BONUS_CAP);
}

/** Every ordinary line from the room, offered to the induction window.
 *
 * Only counts while an induction is actually running, and only from the person running it.
 * Deliberately does NOT require the hypnotist to say the subject's name, unlike suggestions:
 * an induction is a monologue delivered AT someone, and forcing "Missy" into every line of
 * it would buy nothing and make the scene read worse. The sender gate already establishes
 * who is being addressed.
 *
 * Two cheap defences rather than a real anti-gaming system, which the doc already accepts is
 * not winnable ("anything that measures effort is gameable too"): a length floor, and
 * refusing a line identical to the one before it. Faking +15 is then three distinct
 * sentences, which is most of the way to just roleplaying. */
export function noteInductionLine(sender: number, content: string): void {
	if (session.phase !== "InductionInProgress") return;
	if (!sender || sender !== session.hypnotistId) return;
	const text = (content ?? "").trim();
	if (text.length < RP_MIN_LENGTH) return;
	const key = text.toLowerCase();
	if (key === session.lastRpLine) return;
	session.lastRpLine = key;
	session.rpLines += 1;
	log(`induction RP line ${session.rpLines} — bonus now +${rpBonusFor(sender)}`);
}

/** What the roll would be against this person right now, for each choice. The single most
 * useful thing to see while tuning: it exposes the inputs and the resulting chance without
 * needing to run an induction and infer them from the outcome. */
export function describeChances(memberId: number): string[] {
	const trust = trustWith(memberId);
	const floor = chemicalFloor();
	const access = effectiveAccess(memberId);
	const exp = experienceValue();
	const perSession = (c: number) => 100 * (1 - Math.pow(1 - c / 100, MAX_ATTEMPTS));
	return [
		`vs [${memberId}] — trust ${trust.toFixed(1)}, arousal floor ${floor.toFixed(1)} ` +
			`→ access ${access.toFixed(1)}${floor > trust ? " (arousal carrying it)" : ""}, experience ${exp.toFixed(1)}`,
		`  ${describeRelationship(memberId)}`,
		// Only worth a line when there is one, since it is zero outside an induction window —
		// but silence about a live bonus would make the percentages below look wrong.
		...(rpBonusFor(memberId) > 0
			? [`  roleplay bonus +${rpBonusFor(memberId)} (${session.rpLines} line(s) this window)`]
			: []),
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
		sessionEndsAt = Date.now() + SESSION_TIMEOUT_MS;
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
	// Snapshot at the moment of going under, so the clothes the subject keeps seeing are
	// the ones they were wearing when they lost track — not whatever they had on at some
	// arbitrary later point.
	if (f.tranceClothingFreeze) freezeAppearance();
	log(
		`trance state applied: move=${f.tranceCannotMove} speak=${f.tranceCannotSpeak} ` +
			`fade=${f.tranceScreenFade} clothesFrozen=${f.tranceClothingFreeze}`,
	);
}

function beginInductionWindow(): void {
	session.phase = "InductionInProgress";
	// Fresh count per attempt. Three attempts in a session are three separate performances,
	// and letting the first one's effort pay for the third would reward giving up.
	session.rpLines = 0;
	session.lastRpLine = "";
	if (windowTimer) clearTimeout(windowTimer);
	windowTimer = setTimeout(runInductionRoll, INDUCTION_WINDOW_MS);
	pushUpdate();
}

function showPrompt(hypnotistName: string): void {
	if (promptTimer) clearTimeout(promptTimer);
	session.promptName = hypnotistName;
	session.promptExpiresAt = Date.now() + PROMPT_TIMEOUT_MS;
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
		`${hypnotistName} is attempting to hypnotize you. Choose on the box in the room, or with /hypno agree, /hypno ignore, /hypno fight — they will not be told which you chose. (${Math.round(PROMPT_TIMEOUT_MS / 1000)}s)`,
	);
}

/** The pending induction prompt, if there is one. Drives the in-room choice box (see
 * prompt.ts); null in every other phase, which is what makes the box appear and vanish.
 *
 * Returns the remaining time rather than the deadline so the caller can't accidentally
 * render a countdown against the wrong clock. */
export function getPendingPrompt(): { hypnotistName: string; remainingMs: number } | null {
	if (session.phase !== "AttemptMade") return null;
	return {
		hypnotistName: session.promptName || "Someone",
		remainingMs: Math.max(0, session.promptExpiresAt - Date.now()),
	};
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
	// Nothing survives a safeword, and that must include the copy on disk — otherwise the
	// next reload would faithfully restore the very thing the safeword was used to escape.
	// Explicit rather than relying on pushUpdate below, which is skipped entirely when there
	// is no hypnotist to tell.
	stopWaiting();
	stopPersistHeartbeat();
	clearSaved();
	const hypnotist = session.hypnotistId;
	removeEffect("Freeze");
	removeEffect("BlockWardrobe");
	clearSuggestedPose();
	clearTranceStates();
	clearAllSuppression();
	clearSelfTouchBlocks();
	clearActiveSuggestions();
	clearOrgasmDenial();
	clearIllusion();
	// Nothing survives a safeword — that is the whole point of it, and the one rule in this
	// file that no feature is allowed to make conditional.
	releaseCarried("safeword");
	clearAllTimers();
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
	// Both of these can be true with no session at all — that's the point of them — so they
	// are reported unconditionally, including on the Idle line.
	const lasting = `${describeIllusion()} | ${describeCarry()}`;
	if (session.phase === "Idle") return `session: Idle | ${lasting} | ${perms}`;
	const bits = [`session: ${session.phase}`];
	if (session.hypnotistId != null) bits.push(`hypnotist=${session.hypnotistId}`);
	if (session.choice) bits.push(`choice=${session.choice}`);
	if (session.attempts) bits.push(`attempts=${session.attempts}/${MAX_ATTEMPTS}`);
	if (session.phase === "Hypnotized") bits.push(`depth=${session.depth} (${depthBand(session.depth)})`);
	if (session.phase === "AttemptFailed") bits.push(`progress=${session.progress.toFixed(1)}`);
	if (session.cooldownUntil > Date.now())
		bits.push(`cooldown=${Math.ceil((session.cooldownUntil - Date.now()) / 1000)}s`);
	return `${bits.join(" ")} | ${lasting} | ${perms}`;
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

/** Put a saved trance back on. Called by recovery.ts once it has decided the scene is still
 * live — the decision is entirely there, and the mechanics entirely here. */
function restoreSavedSession(saved: SavedSession): void {
	session.phase = "Hypnotized";
	session.hypnotistId = saved.hypnotistId;
	session.depth = Number(saved.depth) || 0;
	session.hypnotizedAt = Date.now();
	// The session keeps the time it had left, not a fresh allowance. Reconnecting is not a way
	// to extend a trance, and a stale deadline that has already passed ends it immediately.
	const remaining = (saved.sessionEndsAt || 0) - Date.now();
	if (sessionTimer) clearTimeout(sessionTimer);
	if (remaining > 0) {
		sessionEndsAt = saved.sessionEndsAt;
		sessionTimer = setTimeout(() => endSession("session timed out"), remaining);
	} else {
		endSession("the session had already run out while you were away");
		return;
	}
	pushUpdate();
	log(`recovery: session restored, depth ${session.depth}, ${Math.round(remaining / 60_000)} min left`);
}

export function installSession(): void {
	registerRecoveryHandlers({
		restoreSession: restoreSavedSession,
		restoreCarried: () => {
			/* carried suggestions are re-applied by voice.ts's handlers; see registerCarryHandlers */
		},
		inRoom: (memberId: number) =>
			(typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).some(
				(c: any) => c?.MemberNumber === memberId,
			),
	});
	startRecovery();
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
