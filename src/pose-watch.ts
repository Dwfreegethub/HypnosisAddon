// Pose compulsions (v1.19.7, DW 2026-11-26: "Is there any compulsion that can trigger on a motion.
// When you kneel for example", then "Movment all movments. Arms. kneeling. What ever"): "whenever you
// kneel", "whenever you raise your arms", "whenever anyone puts you on all fours". This watches her
// pose and hands each state she comes into to voice.ts noteActivity as a pose event
// (compulsion-acts.ts poseEvent), the way outfit-watch.ts hands over a garment.
//
// What counts (DW): anyone moving her, she herself included; NEVER ECHS. ECHS poses her only through
// effects.ts setSuggestedPose (the spoken "kneel", a trigger's pose, a release, the safeword), which
// isEchsPosing() reports; a change made there is taken as it is, never as an event. Compulsions don't
// fire while she is under anyway (fireEventCompulsions).
//
// Checked against the live R134 client (2026-11-26):
//   - Every pose change of hers ends in PoseSetActive (Pose.js; the kneel button, the pose menu, the
//     stand-up mini-game). Add-ons posing her for someone else (BCX, LSCG) call it on HER client too.
//   - Another player kneeling or standing her (ChatRoomKneelStandAssist) syncs her whole character:
//     ChatRoomSyncSingle / ChatRoomSyncCharacter with SourceMemberNumber.
//   - What is DRAWN is Player.PoseMapping (PoseRefresh), which folds in poses her items force. So an
//     item that forces a kneel counts as whoever put it on her.
//   - The "held still" hold (effects.ts) refuses or puts back a change before anything else hears of
//     it, so the look is taken a microtask later: a refused change is no change.
//
// Read only: never changes her pose.

import { log, warn } from "./log";
import { poseEvent } from "./compulsion-acts";
import { noteActivity } from "./voice";
import { isEchsPosing, poseChangeSource } from "./effects";

/** BC's pose categories and names (R134 PoseFemale3DCG). */
const CATEGORY: Record<string, string> = {
	BaseUpper: "BodyUpper", Yoked: "BodyUpper", OverTheHead: "BodyUpper", BackBoxTie: "BodyUpper", BackElbowTouch: "BodyUpper", BackCuffs: "BodyUpper",
	BaseLower: "BodyLower", Kneel: "BodyLower", KneelingSpread: "BodyLower", LegsClosed: "BodyLower", Spread: "BodyLower",
	AllFours: "BodyFull", Hogtied: "BodyFull", Suspension: "BodyAddon", TapedHands: "BodyHands",
};

/** What she is drawn in, category → pose: PoseMapping, or ActivePose where there is none. */
export function poseMappingOf(C: any): Record<string, string> {
	const m = C?.PoseMapping;
	if (m && typeof m === "object" && Object.keys(m).length) return { ...m };
	const out: Record<string, string> = {};
	for (const p of Array.isArray(C?.ActivePose) ? C.ActivePose : []) if (CATEGORY[p]) out[CATEGORY[p]] = p;
	return out;
}

/** The states a mapping is in, as the pose acts name them. Pure; exported for the tests. */
export function poseStatesOf(m: Record<string, string>): Set<string> {
	const s = new Set<string>();
	const lower = m.BodyLower ?? "BaseLower";
	const upper = m.BodyUpper ?? "BaseUpper";
	const full = m.BodyFull;
	if (full === "AllFours") s.add("allfours");
	else if (full === "Hogtied") s.add("hogtied");
	else {
		s.add(lower === "Kneel" || lower === "KneelingSpread" ? "kneel" : "stand");
		if (lower === "Spread" || lower === "KneelingSpread") s.add("legs-spread");
		if (lower === "LegsClosed") s.add("legs-closed");
		if (upper === "OverTheHead") s.add("arms-up");
		else if (upper === "Yoked") s.add("arms-out");
		else if (upper === "BackBoxTie" || upper === "BackElbowTouch" || upper === "BackCuffs") s.add("arms-back");
		else s.add("arms-down");
	}
	return s;
}

const keyOf = (m: Record<string, string>) => Object.keys(m).sort().map((k) => `${k}=${m[k]}`).join(",");

/** The events from one look to the next: each state newly come into, or "changed" when the pose
 * changed with no new state (kneeling to kneeling spread is "legs-spread"; spread back to kneel is
 * "changed"). Pure; exported for the tests. */
export function poseChanges(before: Record<string, string>, after: Record<string, string>): string[] {
	if (keyOf(before) === keyOf(after)) return [];
	const was = poseStatesOf(before);
	const entered = [...poseStatesOf(after)].filter((x) => !was.has(x));
	return (entered.length ? entered : ["changed"]).map(poseEvent);
}

let seen: Record<string, string> | null = null;
/** What the coming look is to be read as: someone's member number, or "adopt" (taken as it is). */
let pending: number | "adopt" | null = null;

function inRoom(): boolean {
	return typeof ServerPlayerIsInChatRoom === "function" && !!ServerPlayerIsInChatRoom();
}

/** Look now: pass on the changes since the last look as done by `by`; "adopt" takes it as it is.
 * Exported for the tests. */
export function settlePose(by: number | "adopt"): string[] {
	const now = poseMappingOf(Player);
	const before = seen;
	seen = now;
	if (before == null || by === "adopt" || !inRoom()) return [];
	const events = poseChanges(before, now);
	if (!events.length) return [];
	log(`pose: ${events.join(", ")} by ${by}`);
	for (const e of events) noteActivity(by, e);
	return events;
}

/** Look once the current burst is over. ECHS's own change wins the burst: it is never an event. */
function settleSoon(by: number | "adopt"): void {
	const first = pending === null;
	if (by === "adopt" || pending !== "adopt") pending = by;
	if (!first) return;
	Promise.resolve().then(() => {
		const as = pending ?? "adopt";
		pending = null;
		try {
			settlePose(as);
		} catch (err) {
			warn("pose watch failed:", err);
		}
	});
}

/** For the tests: forget what was seen. */
export function resetPoseWatch(): void {
	seen = null;
	pending = null;
}

const isMe = (n: unknown) => typeof n === "number" && n === Player?.MemberNumber;
const isPlayer = (C: any) => !!C && (C === Player || C?.IsPlayer?.());

export function installPoseWatch(modApi: any): void {
	seen = Player?.MemberNumber ? poseMappingOf(Player) : null;
	// Her own change, or an add-on's on her client. Not hers to name otherwise, so it is read as hers:
	// "anyone" includes her, and a named watch needs a sync that names the mover.
	const onPose = (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		if (isPlayer(args[0])) {
			try {
				if (isEchsPosing()) settleSoon("adopt");
				else {
					if (poseChangeSource() !== "hers") log("pose: a change not from her own click (an add-on, or BC itself)");
					settleSoon(Player.MemberNumber);
				}
			} catch (err) {
				warn("pose watch failed:", err);
			}
		}
		return result;
	};
	modApi.hookFunction("PoseSetActive", 0, onPose);
	modApi.hookFunction("CharacterSetActivePose", 0, onPose);
	// Someone else's change to her, or an item that forces a pose, arriving.
	const onSync = (args: any[], next: (a: any[]) => any) => {
		const data = args[0];
		const result = next(args);
		if (isMe(data?.Character?.MemberNumber)) settleSoon(typeof data?.SourceMemberNumber === "number" ? data.SourceMemberNumber : Player.MemberNumber);
		return result;
	};
	modApi.hookFunction("ChatRoomSyncSingle", 0, onSync);
	modApi.hookFunction("ChatRoomSyncCharacter", 0, onSync);
	modApi.hookFunction("ChatRoomSyncItem", 0, (args: any[], next: (a: any[]) => any) => {
		const data = args[0];
		const result = next(args);
		if (isMe(data?.Item?.Target)) settleSoon(typeof data?.Source === "number" ? data.Source : Player.MemberNumber);
		return result;
	});
	// Her own items going on (self-bondage that forces a pose).
	const own = (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		if (isPlayer(args[0])) settleSoon(isEchsPosing() ? "adopt" : Player.MemberNumber);
		return result;
	};
	modApi.hookFunction("ChatRoomCharacterUpdate", 0, own);
	modApi.hookFunction("ChatRoomCharacterItemUpdate", 0, own);
	// A room (re)joined: taken as it is.
	modApi.hookFunction("ChatRoomSync", 0, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		Promise.resolve(result)
			.then(() => settleSoon("adopt"))
			.catch(() => {});
		return result;
	});
}
