import { log } from "./log";
import { tellPlayer } from "./notify";
import { getFeatures } from "./storage";
import {
	isSpeechBlocked,
	getScreenFade,
	setSpeechBlocked,
	setScreenFade,
	applyEffect,
	removeEffect,
	hasOwnEffect,
	suggestedPose,
	setSuggestedPose,
	clearSuggestedPose,
} from "./effects";
import { isSuppressed, setSuppressed, isNumb, setNumb, SuppressionCategory } from "./suppression";
import {
	selfTouchSnapshot,
	restoreSelfTouch,
	clearSelfTouchBlocks,
	describeSelfTouchBlocks,
} from "./selftouch";
import {
	clearIllusion,
	isIllusionActive,
	illusionSnapshot,
	restoreIllusion,
	describeIllusion,
	FrozenItem,
} from "./illusion";
import { clearOrgasmDenial } from "./arousal";

// Surviving a disconnect.
//
// BC drops people constantly, and a subject who reconnects inside a minute should walk back
// into the scene they left rather than have it end for a technical reason. What must NOT
// happen is the opposite failure: somebody left frozen and silent with nothing running that
// would ever release them.
//
// WHAT THIS FIXES IS NOT "state is lost" — it is worse than that today. The local half of a
// trance (speech block, screen fade, suppression, numbness, self-touch blocks, the session
// itself) lives in memory and dies with the page. But Freeze, BlockWardrobe and DenialMode
// are BC effects riding on the Emoticon item in Player.Appearance, which is SERVER-SIDE and
// comes back on reload. So the actual behaviour before this module was: reconnect still
// frozen and still wardrobe-blocked, with no session, no timers, and nothing that knows why
// — only the safeword gets you out, and a subject who does not know that is simply stuck.
// Whatever else happens here, hasOrphanedEffects() below must never stop running.
//
// The rules, per DW:
//   under 5 minutes, hypnotist present or returning  -> resume where it left off
//   over 5 minutes                                   -> the hypnosis breaks
//   a fired trigger with time left                   -> serves out its REMAINDER, always,
//                                                       because a trigger was never part of
//                                                       the session to begin with
//   "Release on disconnect" setting                  -> skip all of it and come back clear

/** How long a disconnect can last and still be the same scene. DW's number. */
export const RECOVERY_WINDOW_MS = 5 * 60_000;
/** How often to look for the hypnotist while waiting inside that window. */
const WAIT_POLL_MS = 3_000;
/** How often to check, at startup, whether we can act yet.
 *
 * Quick, because this interval is what a reconnecting subject SEES. Recovery cannot run
 * until login and the room exist, and until it does the real appearance is what draws — so
 * on a reload with a clothing illusion running there is a flash of the truth, whose length
 * is BC's load time plus however long we then wait to notice. The second half is ours, and
 * a quarter second of it is barely a frame or two rather than up to a full second.
 *
 * Cheap: two property reads, and the interval stops the moment it succeeds. DW confirmed in
 * play that a ROOM CHANGE has no flash at all — module state survives it, so nothing needs
 * restoring — which leaves the page reload as the only case this affects. */
const STARTUP_POLL_MS = 250;
/** Act on what we can once identity is known, even with no room yet. Time-based rather than
 * a tick count, so changing the poll rate cannot silently change the deadline. */
const NO_ROOM_FALLBACK_MS = 20_000;
const GIVE_UP_MS = 120_000;
/** The BC effects this add-on applies. Everything else on the Emoticon item is somebody
 * else's, and hasOwnEffect is what tells the difference. */
const OUR_EFFECTS = ["Freeze", "BlockWardrobe", "DenialMode"];

/** Storage key, per account.
 *
 * Deliberately its OWN localStorage key rather than a field in the synced settings blob.
 * Three reasons, in order of weight: the design doc's standing "Per-Account Storage Risk"
 * note says anything new written near `Player.ExtensionSettings` is a red flag and this
 * changes many times per session; a disconnect is a THIS-DEVICE event, so device-local
 * storage is the honest scope; and it keeps a chatty write off the server entirely.
 *
 * Per-account for the reason v0.17.0 learned the hard way: localStorage is per-ORIGIN, so
 * two characters in two tabs of one browser share it and would restore each other's trance. */
function stateKey(): string | null {
	const member = Player?.MemberNumber;
	return typeof member === "number" && member > 0 ? `HypnosisAddon_Session_${member}` : null;
}

export interface SavedTrigger {
	key: string;
	/** Suggestion ids the trigger applied, so they can be undone when the remainder expires. */
	actions: string[];
	/** Absolute ms, or 0 for "holds until released" — the duration-0 case. */
	until: number;
}

export interface SavedSession {
	savedAt: number;
	hypnotistId: number | null;
	hypnotistName: string;
	depth: number;
	/** Absolute deadline of the session timeout, so a resume does not get a fresh 30 minutes. */
	sessionEndsAt: number;
	speechBlocked: boolean;
	screenFade: number;
	suppressed: SuppressionCategory[];
	numb: boolean;
	selfTouch: { all: boolean; groups: [string, string][] };
	/** The frozen garments themselves, so the ORIGINAL lie comes back rather than a fresh
	 * snapshot of the truth. Null when no illusion was running. */
	illusion: FrozenItem[] | null;
	/** Which of OUR BC effects were applied. These ride on the Emoticon item and usually
	 * survive a reload on their own — but an appearance sync that lands before the
	 * AllowEffect patch strips them, so re-asserting is the difference between usually and
	 * always. */
	effects: string[];
	/** A pose a suggestion put them in, so waking still knows to undo it. */
	pose: string | null;
	carried: string[];
	carriedUntil: number;
	carrierId: number | null;
	carrierName: string;
	triggers: SavedTrigger[];
}

function read(): SavedSession | null {
	const key = stateKey();
	if (!key) return null;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as SavedSession) : null;
	} catch (err) {
		log("could not read saved session:", err);
		return null;
	}
}

export function clearSaved(): void {
	const key = stateKey();
	if (!key) return;
	try {
		localStorage.removeItem(key);
	} catch {
		/* a failed clear is not worth breaking anything over */
	}
}

/** Write the current state down. Cheap enough to call on every meaningful change; the whole
 * point is that the last write before a crash is recent. */
export function persist(state: Omit<SavedSession, "savedAt">): void {
	const key = stateKey();
	if (!key) return;
	try {
		localStorage.setItem(key, JSON.stringify({ ...state, savedAt: Date.now() }));
	} catch (err) {
		log("could not save session state:", err);
	}
}

/** Everything currently in force on this client, gathered for persist(). Session-owned
 * fields are passed in, since session.ts holds them and this module must not import it —
 * session.ts already imports plenty and a cycle here would be easy to create. */
export function snapshotLocalState(): Omit<
	SavedSession,
		| "savedAt"
	| "hypnotistId"
	| "hypnotistName"
	| "depth"
	| "sessionEndsAt"
	| "carried"
	| "carriedUntil"
	| "carrierId"
	| "carrierName"
	| "triggers"
> {
	const suppressed: SuppressionCategory[] = (["clothing", "bondage", "activity"] as SuppressionCategory[]).filter(
		(c) => isSuppressed(c),
	);
	return {
		speechBlocked: isSpeechBlocked(),
		screenFade: getScreenFade(),
		suppressed,
		numb: isNumb(),
		selfTouch: selfTouchSnapshot(),
		illusion: illusionSnapshot(),
		effects: OUR_EFFECTS.filter((e) => hasOwnEffect(e)),
		pose: suggestedPose(),
	};
}

/** Take everything off, for the paths where recovery is refused or has run out of time.
 *
 * This is the "never leave anybody helpless" half, and it has to cover the BC effects as
 * well as the local ones precisely because those are the ones that survived on their own. */
export function releaseEverything(reason: string): void {
	removeEffect("Freeze");
	removeEffect("BlockWardrobe");
	clearOrgasmDenial();
	setSpeechBlocked(false);
	setScreenFade(0);
	setSuppressed("clothing", false);
	setSuppressed("bondage", false);
	setSuppressed("activity", false);
	setNumb(false);
	clearSelfTouchBlocks();
	clearIllusion();
	clearSuggestedPose();
	clearSaved();
	log(`recovery: released everything — ${reason}`);
}

/** Do we appear to be wearing our OWN effects with nothing to explain them?
 *
 * Runs even when there is no saved state, and that is the point: an orphaned Freeze from a
 * crash we never got to write down is exactly the case that leaves somebody stuck. */
export function hasOrphanedEffects(): boolean {
	return hasOwnEffect("Freeze") || hasOwnEffect("BlockWardrobe") || hasOwnEffect("DenialMode");
}

/** Everything currently in force, in the order a subject would think of it: what my body is
 * doing, then what I can perceive, then what will outlast this.
 *
 * Built from snapshotLocalState() — the same function the saved copy is written from — so
 * this readout and what a reconnect would restore cannot drift apart. A second hand-written
 * list of "things that can be on you" would be wrong within two features.
 *
 * Reports the OFF states too. "Nothing is holding you" is the answer most worth being able
 * to trust, and a readout that only ever lists problems cannot give it. */
export function describeCurrentState(): string[] {
	const st = snapshotLocalState();
	const on = (label: string, active: boolean, detail = "") =>
		`  ${active ? "ON " : "-  "} ${label}${detail && active ? ` (${detail})` : ""}`;

	const body = [
		on("frozen", hasOwnEffect("Freeze")),
		on("wardrobe blocked", hasOwnEffect("BlockWardrobe")),
		on("orgasm denied", hasOwnEffect("DenialMode")),
		on("posed by suggestion", !!st.pose, String(st.pose)),
		on("self-touch blocked", st.selfTouch.all || st.selfTouch.groups.length > 0, describeSelfTouchBlocks()),
	];
	const senses = [
		on("cannot speak", st.speechBlocked),
		on("screen faded", st.screenFade > 0, `${Math.round(st.screenFade * 100)}%`),
		on("numb to touch", st.numb),
		on("unaware of clothing", st.suppressed.includes("clothing")),
		on("unaware of bondage", st.suppressed.includes("bondage")),
		on("unaware of touches", st.suppressed.includes("activity")),
		on("clothing illusion", isIllusionActive(), describeIllusion().replace(/^clothing illusion: (ON, )?/, "")),
	];
	const anything = [...body, ...senses].some((l) => l.startsWith("  ON"));
	return [
		anything ? "Currently in force:" : "Nothing is holding you right now.",
		...(anything ? ["body:", ...body, "perception:", ...senses] : []),
	];
}

/** What a reconnect would find, for when the question is specifically about carry-over. */
export function describeSavedState(): string {
	const saved = read();
	if (!saved) return "saved for reconnect: nothing (no trance was running when last written)";
	const age = Math.round((Date.now() - (saved.savedAt || 0)) / 1000);
	const within = Date.now() - (saved.savedAt || 0) <= RECOVERY_WINDOW_MS;
	return (
		`saved for reconnect: ${age}s old (${within ? "inside" : "PAST"} the ` +
		`${RECOVERY_WINDOW_MS / 60_000}-minute window), hypnotist ${saved.hypnotistName || saved.hypnotistId}, ` +
		`depth ${saved.depth}, ${saved.triggers?.length ?? 0} trigger(s), ${saved.carried?.length ?? 0} carried` +
		`${isWaitingForHypnotist() ? " — WAITING for them to come back" : ""}`
	);
}

export type RecoveryOutcome =
	/** Nothing was saved and nothing was stranded. */
	| "nothing to do"
	/** Effects were left over with no session behind them; they have been taken off. */
	| "orphans cleared"
	/** The subject has asked to come back clear. */
	| "released by setting"
	/** Too long away; the trance is over, though triggers may still be serving time. */
	| "expired"
	/** Inside the window, waiting to see whether the hypnotist is still around. */
	| "waiting"
	/** Back in the scene. */
	| "resumed";

/** Handlers the session layer supplies, so this module can restore without importing it. */
export interface RecoveryHandlers {
	/** Put the session back — phase, hypnotist, depth, and the remaining timeout. */
	restoreSession: (saved: SavedSession) => void;
	/** Re-apply a carried suggestion by id, and re-arm its remaining time. */
	restoreCarried: (saved: SavedSession) => void;
	/** Is this member number in the room right now? */
	inRoom: (memberId: number) => boolean;
}

let handlers: RecoveryHandlers | null = null;
let waitTimer: ReturnType<typeof setInterval> | null = null;

export function registerRecoveryHandlers(h: RecoveryHandlers): void {
	handlers = h;
}

/** The trigger half registers ITSELF, from voice.ts.
 *
 * Not passed through session.ts, which is where the rest of this is wired: voice.ts already
 * imports session.ts, so session.ts cannot import voice.ts back to ask what is in force.
 * Both sides depend on this module instead, which imports neither — the same leaf-module
 * trick timers.ts exists for. */
let triggerSnapshot: (() => SavedTrigger[]) | null = null;
let triggerRestore: ((t: SavedTrigger) => void) | null = null;

export function registerTriggerRecovery(snapshot: () => SavedTrigger[], restore: (t: SavedTrigger) => void): void {
	triggerSnapshot = snapshot;
	triggerRestore = restore;
}

/** Fired triggers currently in force, with their absolute deadlines. */
export function snapshotTriggers(): SavedTrigger[] {
	try {
		return triggerSnapshot?.() ?? [];
	} catch (err) {
		log("could not snapshot triggers:", err);
		return [];
	}
}

/** Triggers are NOT session state and never were — the whole point of one is that it fires
 * outside a session. So a fired trigger with time left serves out its remainder regardless
 * of the 5-minute window and regardless of whether the hypnotist ever comes back. */
function restoreTriggers(saved: SavedSession): number {
	let restored = 0;
	for (const t of saved.triggers ?? []) {
		// until === 0 means "holds until released" — no clock, still applied.
		if (t.until && t.until <= Date.now()) continue;
		try {
			triggerRestore?.(t);
			restored += 1;
		} catch (err) {
			log(`could not restore trigger ${t.key}:`, err);
		}
	}
	return restored;
}

function restoreLocalState(saved: SavedSession): void {
	setSpeechBlocked(!!saved.speechBlocked);
	setScreenFade(Number(saved.screenFade) || 0);
	for (const c of saved.suppressed ?? []) setSuppressed(c, true);
	setNumb(!!saved.numb);
	restoreSelfTouch(saved.selfTouch ?? { all: false, groups: [] });
	// Re-assert our BC effects rather than trusting them to have survived. They ride on the
	// Emoticon item and usually do come back, but a sync landing before the AllowEffect patch
	// strips them — and applyEffect is idempotent, so asserting costs nothing when they did.
	for (const e of saved.effects ?? []) if (!hasOwnEffect(e)) applyEffect(e);
	if (saved.pose) setSuggestedPose(saved.pose);
	// The illusion comes back as the ORIGINAL frozen clothes, rebuilt from their stored
	// identities. Re-freezing instead would snapshot whatever is worn at this moment — the
	// truth — which is the same trap carry.ts documents for waking, and would quietly turn
	// the illusion into a lie about nothing.
	//
	// Only if the assets still resolve. They normally will; a BC release that removed one is
	// the case that would not, and there the honest thing is to say so rather than to show
	// something other than what was frozen.
	if (saved.illusion?.length) {
		if (!restoreIllusion(saved.illusion)) {
			tellPlayer("Coming back, you catch sight of yourself as you actually are.");
		}
	}
}

/** Kick recovery off, waiting until we know who we are.
 *
 * attemptRecovery() cannot run at install time. The add-on loads before login, so
 * Player.MemberNumber is undefined, the per-account key cannot be built, and the settings
 * are not readable either — it would find nothing every single time and quietly do nothing,
 * which is the worst possible failure for a safety mechanism. The same window that made the
 * add-on track trust with itself in v0.38.0.
 *
 * Also waits to be in a room, since the whole question is whether the hypnotist is present
 * and the answer is meaningless before ChatRoomCharacter exists. */
export function startRecovery(): void {
	const startedAt = Date.now();
	const since = () => Date.now() - startedAt;
	const tick = () => {
		const known = typeof Player?.MemberNumber === "number" && Player.MemberNumber > 0;
		const inRoom = typeof ChatRoomCharacter !== "undefined" && ChatRoomCharacter?.length > 0;
		if (known && inRoom) {
			clearInterval(poll);
			log(`recovery: ${attemptRecovery()}`);
			return;
		}
		// Identity without a room still means orphaned effects can be dealt with, and being
		// stuck frozen in the lobby is no better than being stuck frozen in a room.
		if (known && since() > NO_ROOM_FALLBACK_MS) {
			clearInterval(poll);
			log(`recovery (no room): ${attemptRecovery()}`);
			return;
		}
		if (since() > GIVE_UP_MS) {
			clearInterval(poll);
			log("recovery: gave up waiting to learn who we are");
		}
	};
	const poll = setInterval(tick, STARTUP_POLL_MS);
	tick();
}

/** Called once identity is known. Returns what it decided, for logging and tests. */
export function attemptRecovery(): RecoveryOutcome {
	const saved = read();

	if (!saved) {
		// No saved state. If effects are nevertheless hanging off us, they are orphans from a
		// crash and must come off — this is the case that used to leave people frozen.
		if (hasOrphanedEffects()) {
			releaseEverything("effects left over with no session behind them");
			tellPlayer("Something was still holding you from before. It has let go.");
			return "orphans cleared";
		}
		return "nothing to do";
	}

	if (getFeatures().releaseOnDisconnect) {
		releaseEverything("the subject has asked to come back clear after a disconnect");
		tellPlayer("You come back to yourself, clear. Nothing followed you.");
		return "released by setting";
	}

	const away = Date.now() - (saved.savedAt || 0);

	// Triggers first, and unconditionally: they outlive sessions by design.
	const triggersBack = restoreTriggers(saved);

	if (away > RECOVERY_WINDOW_MS) {
		releaseEverything(`away ${Math.round(away / 60_000)} min, past the ${RECOVERY_WINDOW_MS / 60_000}-minute window`);
		// restoreTriggers ran BEFORE the release, so re-apply what still has time to serve.
		if (triggersBack) {
			restoreTriggers(saved);
			tellPlayer("The trance did not survive being away that long. Something else still has not let go.");
		} else {
			tellPlayer("You were gone long enough that whatever held you has ended.");
		}
		return "expired";
	}

	return waitForHypnotist(saved, triggersBack);
}

function waitForHypnotist(saved: SavedSession, triggersBack: number): RecoveryOutcome {
	const resume = () => {
		restoreLocalState(saved);
		try {
			handlers?.restoreSession(saved);
			if (saved.carried?.length) handlers?.restoreCarried(saved);
		} catch (err) {
			log("could not restore the session:", err);
		}
		tellPlayer("You were gone for a moment. You are still under, and it is as though you never left.");
		log("recovery: resumed");
	};

	if (saved.hypnotistId && handlers?.inRoom(saved.hypnotistId)) {
		resume();
		return "resumed";
	}

	// Inside the window but nobody to be under. Hold the effects and keep looking: DW's rule
	// is that a hypnotist who comes BACK inside the five minutes still counts.
	tellPlayer(
		`You are still somewhere under. If ${saved.hypnotistName || "they"} is not back within a few minutes, it will fade.`,
	);
	restoreLocalState(saved);
	if (waitTimer) clearInterval(waitTimer);
	waitTimer = setInterval(() => {
		const away = Date.now() - (saved.savedAt || 0);
		if (saved.hypnotistId && handlers?.inRoom(saved.hypnotistId)) {
			stopWaiting();
			resume();
			return;
		}
		if (away > RECOVERY_WINDOW_MS) {
			stopWaiting();
			releaseEverything("the hypnotist did not come back inside the window");
			if (triggersBack) restoreTriggers(saved);
			tellPlayer("They did not come back. Whatever was holding you loosens and lets go.");
		}
	}, WAIT_POLL_MS);
	return "waiting";
}

export function stopWaiting(): void {
	if (waitTimer) clearInterval(waitTimer);
	waitTimer = null;
}

/** For tests and `/hypno session`. */
export function isWaitingForHypnotist(): boolean {
	return waitTimer !== null;
}
