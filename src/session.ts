import { log, TESTING_MODE } from "./log";
import { tellPlayer } from "./notify";
import { announceInductionBegin, announceTranceEnter } from "./flavor";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import {
	getFeatures, trustWith, experienceValue, getMaxAttempts, DEFAULT_MAX_ATTEMPTS,
	getSkillHonour, skillValue, addSkill,
} from "./storage";
import {
	noteInductionSuccess,
	noteInductionAttempt,
	accessFor,
	relationshipWith,
	describeRelationship,
} from "./trust";
import { clearAllTimers, timerDeadline } from "./timers";
import {
	tierOf,
	tierLabel,
	DepthTier,
	setCurrentDepths,
	clearCurrentDepths,
	arousalCounts,
} from "./depth";
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
	appliedSuggestions,
	restoreActiveSuggestions,
	carrierId,
	carrierNameFor,
	restoreCarried,
	describeCarry,
	clearActiveSuggestions,
} from "./carry";
import {
	applyEffect,
	removeEffect,
	clearSuggestedPose,
	setSpeechBlocked,
	setScreenFade,
	setWalkingTrance,
	isWalkingTrance,
	WALKING_FADE_OPACITY,
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
// Eventually several of these become player settings (the doc has session duration and the
// resistance floor as subject-set); constants until the flow itself is proven. The attempt
// limit has already left this list — see `maxAttempts()` below.
const PROMPT_TIMEOUT_MS = 60_000;
/** How long the roleplay window runs before the roll.
 *
 * Back to a minute as of 2026-09-01, per DW's priority list. It sat at 10 seconds through
 * development so an induction could be exercised repeatedly without a minute of dead time
 * per attempt — but ten seconds is far too short to actually roleplay an induction, which
 * is the entire point of this window, and it is now also the window the RP bonus is earned
 * in. Three substantive lines in ten seconds is typing speed, not roleplay. */
const INDUCTION_WINDOW_MS = 60_000;
/** How many attempts one hypnotist gets before the cooldown. A SETTING now, not a constant
 * — design.md decided "default 2, with 3 available as a player setting" and the code kept
 * the old 3. Read through the function at every use rather than captured into a local: it
 * is the subject's own, they can change it while a session is running, and the next roll
 * should honour what it says then. See storage.ts for the stored form. */
const maxAttempts = () => getMaxAttempts();
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
/** Skill the local player earns as a hypnotist, per roll and per success. Deliberately the same
 * numbers as the subject's own experience pool (ATTEMPT_EXPERIENCE / INDUCTION_EXPERIENCE in
 * trust.ts): practice is one skill whichever chair you are in. */
const SKILL_ATTEMPT_CREDIT = 0.25;
const SKILL_SUCCESS_CREDIT = 1;
/** Above this depth the subject can no longer pull themselves out — only the hypnotist,
 * the session timeout, or the safeword. */
const SELF_WAKE_MAX_DEPTH = 40;
const CHOICE_MODIFIER: Record<SessionChoice, number> = { agree: 25, ignore: 0, fight: -25 };

/** Depth a relationship guarantees on a successful, unfought induction.
 *
 * SETTLED 2026-08-31, and the reason the floors had to move here from the access number:
 * "a lover always reaches arousal" cannot be said with a trust floor at all. Depth is
 * `chance - roll`, so the deepest anyone lands is `chance` itself — and a lover at floor 30
 * choosing Ignore has chance 30, which is below the Entranced 40 that arousal sits at. Their
 * ceiling was under the tier; they would never have reached it, not merely unreliably.
 *
 * Fight forfeits the floor entirely, which is what keeps Fight worth choosing. */
const RELATION_DEPTH_FLOOR: Record<string, number> = {
	friend: 0,
	lover: 40, // Entranced — arousal, always
	owner: 60, // Deep — the illusion and triggers, always; Blank still has to be earned
};

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
	/** The same roll, resolved WITHOUT the chemical contribution.
	 *
	 * Two numbers rather than one because the structural rule — drugs and arousal may never
	 * write anything permanent nor reach a feature that lies to the subject — is about where
	 * the depth came from, not how much of it there is. A single number cannot carry that:
	 * if arousal feeds depth and depth gates everything, an aroused stranger reaches
	 * persistent triggers by construction. Never higher than `depth`. */
	depthEarned: number;
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
	/** The hypnotist's skill AS THIS SUBJECT'S CLIENT CHOSE TO HONOUR IT — claimed value run
	 * through the honour rung, 0-100, fixed when the attempt arrives. Zero means "no read on
	 * them" (rung Ignore, or a stranger on rung Trusted). Drives the roll and the prompt
	 * descriptor; never transmitted, never shown as a number. */
	honouredSkill: number;
}

function freshSession(): SubjectSession {
	return {
		phase: "Idle",
		hypnotistId: null,
		choice: null,
		attempts: 0,
		progress: 0,
		depth: 0,
		depthEarned: 0,
		cooldownUntil: 0,
		hypnotizedAt: 0,
		promptName: "",
		promptExpiresAt: 0,
		rpLines: 0,
		lastRpLine: "",
		honouredSkill: 0,
	};
}

let session: SubjectSession = freshSession();
let promptTimer: ReturnType<typeof setTimeout> | null = null;
let windowTimer: ReturnType<typeof setTimeout> | null = null;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers(): void {
	for (const t of [promptTimer, windowTimer, sessionTimer, cooldownTimer]) if (t) clearTimeout(t);
	promptTimer = windowTimer = sessionTimer = cooldownTimer = null;
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

/** Write down anything a reconnect would need, on a heartbeat and on every transition.
 *
 * "ONLY WHILE HYPNOTIZED" WAS THE BUG. Carried suggestions and fired triggers are precisely
 * the two things designed to OUTLIVE a session — and gating the save on a live trance meant
 * waking the subject wiped the record of them before they could ever be restored. DW hit it
 * exactly: carried two suggestions, was woken, disconnected, and came back with nothing. A
 * trigger firing outside a trance, which is the normal way a trigger fires, was never saved
 * at all.
 *
 * So the question is not "is a trance running" but "is anything in force". */
function persistState(): void {
	const live = session.phase === "Hypnotized";
	const carried = carriedIds();
	const triggers = snapshotTriggers();
	if (!live && !carried.length && !triggers.length) {
		stopPersistHeartbeat();
		clearSaved();
		return;
	}
	// Self-arming, so no caller has to remember to start it — the check above is the only
	// place that decides whether there is anything worth saving.
	if (!persistTimer) persistTimer = setInterval(persistState, PERSIST_HEARTBEAT_MS);
	persist({
		...snapshotLocalState(),
		sessionLive: live,
		hypnotistId: session.hypnotistId,
		hypnotistName: findCharacterName(session.hypnotistId),
		depth: session.depth,
		depthEarned: session.depthEarned,
		sessionEndsAt,
		applied: appliedSuggestions(),
		carried,
		carriedUntil: timerDeadline("carry-forward"),
		carrierId: carrierId(),
		carrierName: carrierNameFor(),
		triggers,
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
			maxAttempts: maxAttempts(),
			// Bands only — never `progress`, `depth`, or `choice` themselves.
			progressBand: session.phase === "AttemptFailed" ? progressBand(session.progress) : null,
			depthBand: session.phase === "Hypnotized" ? depthBand(session.depth) : null,
			cooldownRemaining: Math.max(0, session.cooldownUntil - now),
			windowRemaining: session.phase === "InductionInProgress" ? INDUCTION_WINDOW_MS : 0,
			refusedReason: refusedReason ?? null,
		},
		session.hypnotistId,
	);
	persistState();
}

/** Send a one-off refusal to someone who isn't (and isn't becoming) our hypnotist,
 * without disturbing whatever session state we're actually in. */
function refuse(to: number, reason: string): void {
	sendHiddenMessage(
		{
			type: "session-update",
			phase: session.hypnotistId === to ? session.phase : "Idle",
			attempts: 0,
			maxAttempts: maxAttempts(),
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
	clearCurrentDepths();
	stopWaiting();
	// NOT clearSaved() — carryThroughWake() below may put things back that are meant to
	// outlive this session, and persistState() at the end decides what is left to save.

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
	// The player's chemical scope decides whether arousal counts at all. Drugs are unbuilt, so
	// "Drugs only" and "Neither" currently mean the same thing — kept as four options anyway,
	// so that a saved preference does not need migrating the day drugs land.
	if (!arousalCounts()) return 0;
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

/** The roll, resolved twice: once with everything, once with only what was earned.
 *
 * Both use the SAME roll, so the two depths differ by exactly the chemical contribution and
 * `depthEarned` can never exceed `depth`. Computing a second roll would let a subject be
 * deeper in the earned sense than in reality, which is nonsense. */
function resolveDepths(hypnotistId: number, choice: SessionChoice, roll: number): { full: number; earned: number } {
	const full = inductionChance(hypnotistId, choice);
	const earned = inductionChance(hypnotistId, choice, true);
	const floor = choice === "fight" ? 0 : RELATION_DEPTH_FLOOR[relationshipWith(hypnotistId)] ?? 0;
	const at = (chance: number) => Math.min(100, Math.max(0, Math.round(Math.max(chance - roll, floor))));
	const fullDepth = at(full);
	return { full: fullDepth, earned: Math.min(fullDepth, at(earned)) };
}

/** Hypnotist skill's contribution to the roll. THE LADDER IS NOT BUILT — it is the
 * declared-skill proposal's §A1-A2 and stays out of this change. This type exists only so
 * the invariant below can be swept across the skill range by a test, which is the one thing
 * A1 asks for that cannot be done without a seam: the inversion it describes is caused by
 * `fightFloor`, and no value of any term the live formula carries today can produce it.
 * Every production caller passes `NO_SKILL`.
 *
 * The two fields are the two shapes the proposal gives skill — an additive term every
 * choice gets alike, and a floor under Fight alone. Their WEIGHTS are parked (§A2); a test
 * that supplies them is modelling a proposal, not settling it. */
export type SkillTerms = {
	/** Added to the raw score whichever choice was made. */
	additive: number;
	/** A floor under Fight specifically, replacing `RESISTANCE_FLOOR` when it is higher.
	 * This is the term that made fighting better for the hypnotist than being ignored. */
	fightFloor: number;
};
const NO_SKILL: SkillTerms = { additive: 0, fightFloor: 0 };

/** The two weights skill enters the roll through. PARKED as numbers (§A2) — rung-4 tuning can
 * move them, and `test/odds.mjs` re-checks the Fight invariant if they do. 0.35 is chosen so
 * skill outweighs the subject's own experience (EXPERIENCE_WEIGHT 0.25), which design.md settles
 * it should. */
const SKILL_ADDITIVE_WEIGHT = 0.35;
const SKILL_FIGHT_FLOOR_WEIGHT = 0.25;

/** The skill terms for the attempt in progress, built from `session.honouredSkill`.
 *
 * earnedOnly gets NONE: skill counts toward `depthFull` only, never `depthEarned`. That is the
 * one place skill must not reach — `depthEarned` gates the three features that outlive the
 * session or lie to the subject about her own body, and an expert stranger winning a roll is a
 * different thing from planting a trigger that survives it (§4). resolveDepths() asks for the
 * earned chance with earnedOnly=true, so this returns NO_SKILL there and the earned depth is
 * skill-free by construction rather than by a later subtraction. */
function currentSkillTerms(earnedOnly: boolean): SkillTerms {
	if (earnedOnly) return NO_SKILL;
	const v = session.honouredSkill;
	if (!v || v <= 0) return NO_SKILL;
	return { additive: v * SKILL_ADDITIVE_WEIGHT, fightFloor: RESISTANCE_FLOOR + v * SKILL_FIGHT_FLOOR_WEIGHT };
}

/** How much of a claimed 0-100 skill a rung lets through. The subject's client runs this on
 * every attempt; the far side never learns the answer. See declared-skill-proposal.md §1.
 *   ignore  — none, ever
 *   trusted — in proportion to how well she already knows him (relationship trust)
 *   capped  — anyone, but no further than the stranger ceiling
 *   full    — whole (the CNC rung; not offered by the settings cycle yet) */
export function honourSkill(rung: string, claimed: number, trust: number): number {
	const v = Math.max(0, Math.min(100, claimed));
	switch (rung) {
		case "trusted": return (v * Math.max(0, Math.min(100, trust))) / 100;
		case "capped": return Math.min(v, STRANGER_CEILING);
		case "full": return v;
		default: return 0; // "ignore", and any unknown rung, honour nothing
	}
}

/** The private clause appended to the induction prompt — a read on HER OWN instinct, never a
 * claim about him, and never a number (§3, the joined decision A3/A3a). Reads the HONOURED
 * value, so two subjects meeting the same hypnotist see him differently — incoherent as a fact
 * about him, exactly right as a fact about her. Null below 20: she has no read on this person.
 *
 * Placeholder prose — the register is settled (her instinct, behavioural, never evaluative),
 * the exact words are cosmetic and open (§3, §10 B1). Gender-neutral: the hypnotist's pronouns
 * are not ours to assume. */
export function skillDescriptor(honoured: number): string | null {
	if (honoured < 20) return null;
	if (honoured < 50) return "Something about the way they say your name makes you want to listen.";
	if (honoured < 80) return "Something in their voice puts you faintly off balance, and you are not sure why.";
	return "Something in how they speak to you makes you want to sit down before they ask.";
}

/** The chance before the Fight invariant is applied. Split out so `inductionChance()` can
 * state the invariant over the finished number rather than over one arrangement of the
 * terms — which is what keeps it true when a term is added or retuned later. */
function chanceBeforeInvariant(
	hypnotistId: number,
	choice: SessionChoice,
	earnedOnly: boolean,
	skill: SkillTerms,
): number {
	const trust = earnedOnly ? accessFor(hypnotistId, "session") : effectiveAccess(hypnotistId);
	const exp = experienceValue();
	const experienceEffect = choice === "agree" ? exp * EXPERIENCE_WEIGHT : choice === "fight" ? -exp * EXPERIENCE_WEIGHT : 0;
	// Hypnotist skill belongs in this sum too, but it lives on the HYPNOTIST's client and
	// the roll runs here — see the design doc's step-2 note. Deliberately absent until
	// that's resolved, rather than trusting a self-reported number.
	// The RP bonus is deliberately part of BOTH. The doc lists it beside the chemical
	// modifiers, but it is not one: it reads the hypnotist's effort, not the subject's
	// bloodstream, and nothing about roleplaying well should be barred from writing something
	// lasting. Flagged in the doc as the one place this implementation reads the design
	// rather than following it to the letter.
	const raw = trust + CHOICE_MODIFIER[choice] + experienceEffect + rpBonusFor(hypnotistId) + skill.additive;
	const floor = choice === "fight" ? Math.max(RESISTANCE_FLOOR, skill.fightFloor) : RESISTANCE_FLOOR;
	return Math.max(floor, Math.min(CHANCE_CEILING, raw));
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
/** THE INVARIANT — "fighting must never give the hypnotist a better chance than not
 * fighting." Decided 2026-09-10 (declared-skill proposal §A1) and a flaw, not a choice.
 *
 * Compute Ignore's chance and use it as a hard upper bound on Fight's. Deliberately stated
 * as a rule over the finished number rather than fixed by re-tuning a weight: the weights
 * that produce the inversion are still parked (§A2), and any of them can move without this
 * having to be rediscovered.
 *
 * What it was protecting against: with a Fight floor of `5 + 0.25v` against an additive
 * `0.35v`, Fight beat Ignore for every honoured skill below 50 — at v=30, 12.5% against
 * 10.5%. Choosing to resist would have made the induction MORE likely to land. Below 50
 * Fight now ties Ignore instead of beating it, which is acceptable: the 5% floor already
 * flattens the two at zero trust today, so the flattening is pre-existing and this only
 * stops it inverting.
 *
 * None of that arithmetic is live — no term in this formula carries skill yet — so the
 * invariant is inert today and is here to be true when the ladder lands. `test/odds.mjs`
 * sweeps it with the proposed terms supplied, and would fail without this `Math.min`. */
export function inductionChance(
	hypnotistId: number,
	choice: SessionChoice,
	earnedOnly = false,
	skill?: SkillTerms,
): number {
	const terms = skill ?? currentSkillTerms(earnedOnly);
	const chance = chanceBeforeInvariant(hypnotistId, choice, earnedOnly, terms);
	if (choice !== "fight") return chance;
	return Math.min(chance, chanceBeforeInvariant(hypnotistId, "ignore", earnedOnly, terms));
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
	const perSession = (c: number) => 100 * (1 - Math.pow(1 - c / 100, maxAttempts()));
	return [
		`vs [${memberId}] — trust ${trust.toFixed(1)}, arousal floor ${floor.toFixed(1)} ` +
			`→ access ${access.toFixed(1)}${floor > trust ? " (arousal carrying it)" : ""}, experience ${exp.toFixed(1)}`,
		`  ${describeRelationship(memberId)}`,
		// Skill only shows when this client honoured some — zero outside an attempt, zero on
		// rung Ignore, zero for a stranger on rung Trusted. It is the HONOURED value, the same
		// one the descriptor reads, not the claim.
		...(session.honouredSkill > 0
			? [`  honoured skill +${(session.honouredSkill * SKILL_ADDITIVE_WEIGHT).toFixed(1)} (they read as ${session.honouredSkill.toFixed(0)}/100 to you)`]
			// Skill is zero here for three different reasons, and saying nothing makes all three
			// look like "skill does nothing". The common one is simply that no attempt is in
			// flight: the claim rides IN on the attempt, so until someone actually tries, this
			// client has no number to honour and the odds below genuinely exclude it. The note
			// only fires when idle, so it never contradicts a live Ignore-rung zero.
			: session.phase === "Idle"
				? getSkillHonour() === "ignore"
					? ["  skill: ignored by your setting — it never counts against you"]
					: ["  skill: not counted until someone attempts (your client learns their claim from the attempt itself)"]
				: []),
		// Only worth a line when there is one, since it is zero outside an induction window —
		// but silence about a live bonus would make the percentages below look wrong.
		...(rpBonusFor(memberId) > 0
			? [`  roleplay bonus +${rpBonusFor(memberId)} (${session.rpLines} line(s) this window)`]
			: []),
		...(["agree", "ignore", "fight"] as SessionChoice[]).map((choice) => {
			const c = inductionChance(memberId, choice);
			return `  ${choice.padEnd(6)} ${c.toFixed(1)}% per attempt, ${perSession(c).toFixed(0)}% across ${maxAttempts()}`;
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
		const depths = resolveDepths(session.hypnotistId, choice, roll);
		session.depth = depths.full;
		session.depthEarned = depths.earned;
		setCurrentDepths(depths.full, depths.earned);
		session.hypnotizedAt = Date.now();
		sessionEndsAt = Date.now() + SESSION_TIMEOUT_MS;
		sessionTimer = setTimeout(() => endSession("session timed out"), SESSION_TIMEOUT_MS);
		applyTranceState();
		// The accelerator, and the practice. Both halves only on success.
		noteInductionSuccess(session.hypnotistId, findCharacterName(session.hypnotistId));
		notify(`You slip under. (${tierLabel(tierOf(session.depth)).toLowerCase()})`);
		// The room's cue that it landed — the only signal the hypnotist gets, since the line
		// above is the subject's alone. Here rather than in applyTranceState so a reconnect,
		// which reuses that path, does not re-announce the drop.
		announceTranceEnter();
		log(`induction SUCCEEDED: ${detail} depth=${session.depth}`);
	} else if (session.attempts >= maxAttempts()) {
		session.phase = "CooldownRequired";
		session.cooldownUntil = Date.now() + COOLDOWN_MS;
		session.progress = chance;
		scheduleCooldownEnd();
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

/** Return the subject to Idle when the cooldown runs out, and push one last view.
 *
 * The cooldown is the ONLY phase nothing else re-evaluates: a success ends on the running
 * session timer, a miss with tries left waits on the hypnotist, but a spent attempt just sat
 * there. So the phase stayed CooldownRequired forever — the hypnotist's countdown reached zero
 * and the button never re-enabled (there was no fresh view to re-enable it, and its disabled
 * state keys on the phase), and any OTHER hypnotist stayed refused with "someone else is already
 * working on them" (the phase-not-Idle gate). DW hit exactly this, 2026-09-13.
 *
 * A new attempt arriving DURING the cooldown was always handled correctly — the handler gates on
 * `cooldownUntil`, not the phase — so this only covers the case where none does: the clock simply
 * runs out and we drop back to Idle on our own. */
function scheduleCooldownEnd(): void {
	if (cooldownTimer) clearTimeout(cooldownTimer);
	cooldownTimer = setTimeout(
		() => {
			cooldownTimer = null;
			// A fresh attempt or a wake may already have moved us on — never stomp that.
			if (session.phase !== "CooldownRequired") return;
			const hypnotist = session.hypnotistId;
			session = freshSession();
			// pushUpdate() keys on hypnotistId, which freshSession just cleared — restore it just
			// long enough to send the Idle view, the same idiom totalStop uses.
			if (hypnotist != null) {
				session.hypnotistId = hypnotist;
				pushUpdate();
				session.hypnotistId = null;
			}
			log("cooldown expired — subject reachable again");
		},
		Math.max(0, session.cooldownUntil - Date.now()),
	);
}

/** TESTING ONLY: put the player straight into a trance with `hypnotistId`, skipping the
 * handshake, the induction window and the roll.
 *
 * This exists because of a real hole in the test harness. Every depth gate is checked by
 * handleSpokenLine(), which requires isSessionActiveWith(sender) FIRST — so the scenarios
 * that opened with `/hypno depth 30 30` and then had the bot speak could never do anything:
 * a forced depth is a number, not a session, and the suggestion was refused before the
 * depth was ever consulted. The addon was correct and the harness was testing nothing.
 *
 * Deliberately NOT counted as practice: no noteInductionAttempt, no noteInductionSuccess.
 * A hundred test tranches must not silently teach the trust store that this hypnotist is
 * enormously experienced, or later runs would be measuring the test runs instead of the
 * mechanic.
 *
 * Gated on TESTING_MODE at both call sites, and again here. This one is worth the
 * belt-and-braces: a remote party being able to force a trance with no consent step is
 * precisely the thing the whole subject-authoritative design exists to prevent, so it must
 * be impossible in a release build rather than merely unreachable. */
export function forceTrance(hypnotistId: number, full: number, earned: number): string | null {
	if (!TESTING_MODE) return "not available — this build is not in testing mode";
	if (!getFeatures().hypnoEnabled) return "hypnoEnabled is off — turn hypnosis on first";
	clearTimers();
	session.phase = "Hypnotized";
	session.hypnotistId = hypnotistId;
	session.depth = Math.max(0, Math.min(100, full));
	// Same invariant the roll produces: you cannot have earned more than you have.
	session.depthEarned = Math.max(0, Math.min(session.depth, earned));
	setCurrentDepths(session.depth, session.depthEarned);
	session.hypnotizedAt = Date.now();
	sessionEndsAt = Date.now() + SESSION_TIMEOUT_MS;
	sessionTimer = setTimeout(() => endSession("session timed out"), SESSION_TIMEOUT_MS);
	applyTranceState();
	pushUpdate();
	persistState();
	log(`TESTING: forced trance with ${hypnotistId}, depth ${session.depth}/${session.depthEarned}`);
	return null;
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

/** "Walk with me." Still under, but ambulatory: the movement lock comes off and the veil
 * thins to a hint. Everything else a trance is doing — speech, suppression, the illusion,
 * arousal — carries on untouched, because those are not about stillness.
 *
 * Governed by the trance DEFAULTS the subject accepted, not by the on-demand
 * `movementRestriction` permission: this is a change to what being under is like, the same
 * class of thing as the freeze and the fade it adjusts. Only reachable while actually under —
 * there is no walking a trance that is not happening. Returns false if there is nothing to
 * enter. */
export function enterWalkingTrance(): boolean {
	if (session.phase !== "Hypnotized") return false;
	if (isWalkingTrance()) return true; // already walking; saying it again is harmless
	removeEffect("Freeze");
	// The veil only thins if it was there to begin with — a subject who turned screen fade off
	// stays with no veil rather than gaining a faint one.
	if (getFeatures().tranceScreenFade) setScreenFade(WALKING_FADE_OPACITY);
	setWalkingTrance(true);
	notify("You are on your feet, moving — and still his. Nothing about that feels strange to you.");
	log("walking trance entered");
	return true;
}

/** "Be still." Back to a full trance: the movement lock and the full veil return, exactly as
 * the subject set their trance defaults, and the walking flag clears. A no-op when not
 * walking, so an ordinary "stay still" outside walking trance is left to the movement
 * suggestion. */
export function leaveWalkingTrance(): boolean {
	if (!isWalkingTrance()) return false;
	const f = getFeatures();
	if (f.tranceCannotMove) applyEffect("Freeze");
	if (f.tranceScreenFade) setScreenFade(TRANCE_FADE_OPACITY);
	setWalkingTrance(false);
	notify("You go still, and the world recedes again.");
	log("walking trance left — full trance restored");
	return true;
}

function beginInductionWindow(): void {
	session.phase = "InductionInProgress";
	// What onlookers see now that the hypnotist is actually working — until now the whole
	// induction was silent to the room. Choice-agnostic, so it never leaks agree/ignore/fight.
	announceInductionBegin();
	// Fresh count per attempt. The attempts in a session are separate performances,
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
	// The instinct clause, if she has any read on them — about her, never about him, and never a
	// number. Its own sentence so it reads as a feeling rather than as a stat tacked on.
	const descriptor = skillDescriptor(session.honouredSkill);
	notify(
		`${hypnotistName} is attempting to hypnotize you. Choose on the box in the room, or with /hypno agree, /hypno ignore, /hypno fight — they will not be told which you chose. (${Math.round(PROMPT_TIMEOUT_MS / 1000)}s)` +
			(descriptor ? ` ${descriptor}` : ""),
	);
}

/** The pending induction prompt, if there is one. Drives the in-room choice box (see
 * prompt.ts); null in every other phase, which is what makes the box appear and vanish.
 *
 * Returns the remaining time rather than the deadline so the caller can't accidentally
 * render a countdown against the wrong clock. */
export function getPendingPrompt(): { hypnotistName: string; remainingMs: number; descriptor: string | null } | null {
	if (session.phase !== "AttemptMade") return null;
	return {
		hypnotistName: session.promptName || "Someone",
		remainingMs: Math.max(0, session.promptExpiresAt - Date.now()),
		descriptor: skillDescriptor(session.honouredSkill),
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
	totalStop(
		// Deliberately unambiguous on the hypnotist's screen. A safeword is an OOC stop
		// signal, not an in-fiction escape — the other player needs to read it as "back
		// off now", not wonder whether their subject cleverly broke the trance.
		"They used their safeword. Stop.",
		"Safeword. Trance cleared, all effects released, everything back under your control.",
	);
}

/** The other total stop: the subject switched hypnosis off entirely.
 *
 * Same teardown as the safeword, different wording — it is not an OOC panic signal, it is a
 * consent setting being withdrawn, and the hypnotist should read it as such.
 *
 * This exists because the hard floor was not one. onToggle() stripped every effect and left
 * the SESSION running: phase stayed Hypnotized, the hypnotist stayed attached, the timer kept
 * counting and the depths stayed in depth.ts. Two consequences, both found in one evening —
 * re-ticking the switch resumed the trance with no new induction, and the next induction
 * attempt was refused "Already under." by a subject who had turned the add-on off and back on.
 * The doc's wording is "clears active trance, suspends all effects"; only the second half was
 * happening. */
export function hardFloorStop(): void {
	totalStop(
		"They turned hypnosis off. Everything has been released.",
		"Hypnosis disabled. Trance cleared and every effect released.",
	);
}

/** The third total stop: a full settings reset (Known Bug #4).
 *
 * Reset used to replace the settings object and nothing else, which left a subject who had
 * just typed "wipe everything" frozen, still under, and now reading hypnoEnabled false — the
 * exact half-working the safeword exists to make impossible. design.md pressure-tested
 * refuse-and-instruct against this and rejected it: nobody types "wipe everything" and wants
 * to stay frozen, and a second refusal path is how Bug #3 happened. So reset stops first,
 * through the same teardown as the other two, and says so.
 *
 * Returns what it actually ended, so the reply can name it rather than guess. Nothing is
 * spoken locally here: the reset path says the release and the wipe in one line, in that
 * order, because the release is the half the subject needs to trust immediately. */
export function stopForReset(): "trance" | "induction" | null {
	const ended = session.phase === "Hypnotized" ? "trance" : session.phase === "Idle" ? null : "induction";
	totalStop("They reset the add-on. Everything has been released.", "");
	return ended;
}

/** Stop everything, keep nothing. The one path in this file no feature may make conditional.
 *
 * Shared rather than duplicated on purpose: the safeword's list had already drifted from the
 * hard floor's once, and the half that drifted was the half nobody tests. */
function totalStop(hypnotistMessage: string, localMessage: string): void {
	clearTimers();
	// Nothing survives a safeword, and that must include the copy on disk — otherwise the
	// next reload would faithfully restore the very thing the safeword was used to escape.
	// Explicit rather than relying on pushUpdate below, which is skipped entirely when there
	// is no hypnotist to tell.
	clearCurrentDepths();
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
	// Nothing survives — that is the whole point, and carried suggestions are the ones most
	// likely to creep back, since carryThroughWake() re-applies them on an ordinary session
	// end. A total stop is not an ordinary session end.
	releaseCarried("total stop");
	clearAllTimers();
	session = freshSession();
	if (hypnotist != null) {
		session.hypnotistId = hypnotist;
		pushUpdate(hypnotistMessage);
		session.hypnotistId = null;
	}
	// Empty means the caller is saying it instead, in its own wording — only stopForReset
	// does that. It is never a silent stop: the subject is told either way.
	if (localMessage) notify(localMessage);
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
	if (session.attempts) bits.push(`attempts=${session.attempts}/${maxAttempts()}`);
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
/** Depth reached, and the earned half of it. Read by every depth gate; zero with no session,
 * which is the correct answer since every gated feature needs a trance. */
export function currentTier(): DepthTier {
	return tierOf(session.phase === "Hypnotized" ? session.depth : 0);
}

/** Who currently has us, or null. Exists for the `/bot` test command, which needs somewhere
 * to send a message from inside a trance — the one moment when the answer is not "ask them",
 * because being unable to speak is exactly the state it is there to work around. */
export function currentHypnotistId(): number | null {
	return session.phase === "Idle" ? null : session.hypnotistId;
}

export function isHypnotized(): boolean {
	return session.phase === "Hypnotized";
}

/** Is anything running on us at all — an attempt underway as well as a trance?
 *
 * Added v0.65.1 for the settings lock, which had always DESCRIBED itself as holding "until
 * the session ends" and in fact only held while `isHypnotized()`. The gap is the whole
 * induction: prompt, roleplay window and the misses between attempts are a live session in
 * every sense, and a subject who has ticked the lock could still edit their own permissions
 * and their own attempt limit throughout — raising it to hand a hypnotist more tries, or
 * dropping it to cut them off mid-sequence. DW's call, 2026-09-12.
 *
 * CooldownRequired is deliberately NOT live. The attempts are spent, nothing can reach the
 * subject until the cooldown expires, and a lock that outlasts what it is protecting against
 * is just a setting nobody can change. `/hypno safeword` clears the session from any of these
 * phases, so the lock can never be a trap — same reasoning the lock has always carried. */
export function isSessionLive(): boolean {
	return session.phase !== "Idle" && session.phase !== "CooldownRequired";
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
	// The derived skill value rides along — how much the far side believes it is THEIR setting.
	// Declared and visible, not verified: he can edit his own number, which is why the subject
	// is shown a read on it before she answers and why her rung decides whether it counts at all.
	sendHiddenMessage(
		{ type: "session-attempt", hypnotistName: Player?.Name ?? "Someone", skill: skillValue() },
		memberNumber,
	);
	log(`sent session-attempt to ${memberNumber} (skill ${skillValue().toFixed(1)})`);
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
	session.depthEarned = Number(saved.depthEarned) || 0;
	setCurrentDepths(session.depth, session.depthEarned);
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
		restoreCarried: (saved) => {
			restoreActiveSuggestions(saved.applied ?? []);
			if (saved.carried?.length) {
				restoreCarried(saved.carried, saved.carriedUntil, saved.carrierId, saved.carrierName);
			}
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
		// Honour the claim HERE, once, against trust as it stands at the attempt — the rung and
		// the relationship are the subject's, and the far side never learns the result.
		session.honouredSkill = honourSkill(getSkillHonour(), Number(message.skill ?? 0), trustWith(sender));
		pushUpdate();
		showPrompt(String(message.hypnotistName ?? `#${sender}`));
	});

	// THE TEST BOT'S OWN WORDS MUST NOT BE SPOKEN IN THE ROOM.
	//
	// They were, and it corrupted a run. The bot narrated its step guidance as ordinary chat —
	// "FAIL IF: Still frozen", "'Undressing would require moving' means step 2 did not take" —
	// and this client parses every word of ordinary chat from the hypnotist. Trigger phrases
	// are matched before the name check and before the session check, so guidance quoting
	// hypnosis wording can fire a stored trigger. In run 7 something re-applied kneel and a
	// freeze 15ms after the release that was supposed to clear it, twice, and the only thing
	// spoken in between was the bot's own instructions.
	//
	// So the harness gets its own channel. Instructions arrive as private text and never touch
	// the speech pipeline; only the lines that are deliberately under test are spoken aloud.
	if (TESTING_MODE) {
		registerHiddenHandler("test-note", (_sender, message) => {
			const text = typeof message.text === "string" ? message.text : "";
			if (text) tellPlayer(text);
		});
	}

	// TESTING ONLY, and registered only in a testing build so it does not so much as exist
	// in a release one. Lets the test bot set up the precondition every depth scenario needs
	// — a live session at a known depth — in one message instead of a handshake, a 60-second
	// window, a dice roll and a plea to the RNG for the tier you wanted.
	if (TESTING_MODE) {
		registerHiddenHandler("test-trance", (sender, message) => {
			const full = Number(message.depth ?? 80);
			const earned = Number(message.earned ?? full);
			const refused = forceTrance(sender, full, earned);
			if (refused) {
				refuse(sender, refused);
				return;
			}
			notify(`TESTING: forced under by ${findCharacterName(sender)} at depth ${full}/${earned}.`);
		});
	}

	registerHiddenHandler("session-continue", (sender) => {
		if (session.hypnotistId !== sender) return;
		// A retry only means something after an attempt has actually missed. Sent mid-window it
		// used to return in silence, which read on the hypnotist's screen as the retry having
		// been ignored — DW hit exactly this, asked for a retry twenty seconds into a running
		// 60-second window, and got no second prompt and no explanation. Say which it is.
		if (session.phase !== "AttemptFailed") {
			refuse(
				sender,
				session.phase === "InductionInProgress"
					? "The attempt is still running — wait for it to land or miss."
					: session.phase === "Hypnotized"
						? "They are already under."
						: "There is no failed attempt to retry.",
			);
			return;
		}
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
		// Practice accrues on the HYPNOTIST's client, read off what the subject reports rather
		// than guessed locally — only the hypnotist receives these, so only they credit. Mirrors
		// the subject's own experience (ATTEMPT_EXPERIENCE 0.25 / INDUCTION_EXPERIENCE 1): every
		// roll is +0.25, a success is +1 more. A refusal carries attempts=0 and credits nothing.
		// NOTE: no rolling-hour practice cap yet — that is the anti-grind half of §5 and its own
		// follow-up (it also owes DW a name). This is the progression, not the limiter.
		const prev = views.get(sender);
		const newAttempts = Number(message.attempts ?? 0);
		const gained = newAttempts - (prev?.attempts ?? 0);
		if (gained > 0) addSkill(SKILL_ATTEMPT_CREDIT * gained);
		if (message.phase === "Hypnotized" && prev?.phase !== "Hypnotized") addSkill(SKILL_SUCCESS_CREDIT);
		views.set(sender, {
			phase: (message.phase as SessionPhase) ?? "Idle",
			attempts: Number(message.attempts ?? 0),
			// The SUBJECT's limit, which they sent us — never our own setting. A hypnotist
			// whose own limit is 3 must not be shown 3 for a subject who allows 2, so the
			// fallback for a message that carries no limit is the decided default rather
			// than getMaxAttempts(). Only a pre-0.65.0 client sends one without it.
			maxAttempts: Number(message.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
			progressBand: (message.progressBand as string) ?? null,
			depthBand: (message.depthBand as string) ?? null,
			cooldownRemaining: Number(message.cooldownRemaining ?? 0),
			windowRemaining: Number(message.windowRemaining ?? 0),
			refusedReason: (message.refusedReason as string) || null,
			receivedAt: Date.now(),
		});
	});
}
