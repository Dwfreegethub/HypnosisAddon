import { log, warn } from "./log";
import { tellPlayer } from "./notify";

// Same technique LSCG uses (verified in their src/utils.ts): piggyback the always-worn,
// invisible "Emoticon" appearance item's Property.Effect array rather than depending on
// a real physical restraint. Works for a suggestion-driven effect with no item involved.
const EMOTICON_ASSET_NAME = "Emoticon";

// Every effect we inject onto the Emoticon item must be listed here. BC's own validation
// (ValidationSanitizeEffects in Validation.js) filters an item's Property.Effect down to
// what the *asset* permits, dropping anything not in Asset.Effect or Asset.AllowEffect.
// "Leash" is the odd one out: unlike the others it does not restrict the subject by itself.
// It only makes them LEASHABLE — ChatRoomCanBeLeashedBy scans the appearance for an item
// carrying this effect (InventoryItemHasEffect(item, "Leash", true) reads Property.Effect,
// verified in Inventory.js), so injecting it onto the Emoticon lets a hypnotist take the
// leash without the subject wearing a collar. The compulsion is in follow.ts.
const MANAGED_EFFECTS = ["Freeze", "BlockWardrobe", "DenialMode", "Leash"];

function findEmoticonItem(character: any): any {
	return character?.Appearance?.find((a: any) => a?.Asset?.Name === EMOTICON_ASSET_NAME);
}

/** Add our effects to the shared Emoticon asset definition. Returns false if BC's assets
 * aren't loaded yet (so the caller can retry).
 *
 * This has to happen on EVERY client, not just one applying an effect. Traced through the
 * live client source: an incoming appearance sync runs ChatRoomSyncCharacter ->
 * CharacterLoadOnline -> CharacterOnlineRefresh -> ServerAppearanceLoadFromBundle ->
 * ValidationResolveAppearanceDiff -> ValidationSanitizeProperties -> ValidationSanitizeEffects,
 * which strips any Property.Effect entry missing from that client's own copy of the
 * asset's AllowEffect. Asset.AllowEffect is a client-local definition and is NOT part of
 * the synced appearance bundle, so a sender patching it locally (as applyEffect used to do
 * on its own) only ever fixed their own view: the subject felt the effect, but every
 * *viewer* silently dropped it, leaving HasEffect() false for them forever. That's what
 * made the remote panel's buttons never flip to "Release".
 *
 * Patching the asset is safe for the room at large — the sanitize-and-correct path in
 * ServerAppearanceLoadFromBundle only rebroadcasts for `C.IsPlayer()`, so players without
 * this add-on drop the effect from their local copy without correcting it back for anyone. */
export function ensureEffectsAllowed(): boolean {
	if (typeof Asset === "undefined" || !Array.isArray(Asset) || Asset.length === 0) return false;
	// Item.Asset points into this shared global array, so patching the definition here
	// covers the Emoticon item on every character at once, including remote ones.
	const assets = Asset.filter((a: any) => a?.Name === EMOTICON_ASSET_NAME);
	if (assets.length === 0) return false;
	for (const asset of assets) {
		asset.AllowEffect ??= [];
		for (const effect of MANAGED_EFFECTS) {
			if (!asset.AllowEffect.includes(effect)) asset.AllowEffect.push(effect);
		}
	}
	return true;
}

/** Patch the allow-list as early as possible, retrying until BC's assets exist. Must win
 * this race before the first appearance sync arrives, or that sync's effects get stripped
 * on the way in (a later sync re-delivers them, so a slow patch self-corrects). */
export function installEffectAllowList(): void {
	if (ensureEffectsAllowed()) {
		log("Emoticon effect allow-list patched");
		return;
	}
	let tries = 0;
	const timer = setInterval(() => {
		tries += 1;
		if (ensureEffectsAllowed()) {
			clearInterval(timer);
			log(`Emoticon effect allow-list patched after ${tries} retries`);
		} else if (tries >= 60) {
			clearInterval(timer);
			log("gave up patching Emoticon effect allow-list — BC assets never appeared");
		}
	}, 500);
}

// --- Pose ----------------------------------------------------------------------------
// Lives here rather than in voice.ts so session.ts can reset a suggested pose when a
// session ends without the two modules importing each other in a cycle (voice.ts already
// depends on session.ts for the session gate).

// Two groups, legs and arms, so that "hands behind your back" does not stand a kneeling
// subject up and "kneel" does not drop her arms. BC keeps both in the one ActivePose array.
//
// NAMES VERIFIED by DW against upstream Typedef.d.ts, 2026-09-23 (docs/bc-pose-reference.md).
// BC has 15 poses and these are the ones a spoken line can reach; TapedHands (BodyHands) and
// Suspension (BodyAddon) are item-driven and left out. The brief's Sit, CrossedArms and
// Surrender do not exist in BC, and its HandsBehindBack, OverHead and Yoke are really BackCuffs,
// OverTheHead and Yoked. Correct a name here and nowhere else.
//
// STILL UNCONFIRMED: that setting one named pose leaves the other category alone. That is what
// BC's categories are for, but the setter itself was not read. The read-back below logs a
// warning if the other group was lost, which is what to look for in a live run.

export type PoseGroup = "stance" | "arms";

/** The base pose names are in here so clearing a group also clears BC's explicit neutral
 * for it (BaseLower / BaseUpper). AllFours and Hogtied are BodyFull in BC, not BodyLower:
 * they sit in the stance group because they are what a leg command reaches, but setting
 * one is expected to take the arms with it. */
export const POSE_GROUPS: Record<PoseGroup, readonly string[]> = {
	stance: ["Kneel", "KneelingSpread", "Spread", "LegsClosed", "AllFours", "Hogtied", "BaseLower"],
	arms: ["BackCuffs", "BackBoxTie", "BackElbowTouch", "OverTheHead", "Yoked", "BaseUpper"],
};

/** BC's BodyFull poses: whole-body, so they displace an arm pose and an arm pose displaces them. */
const FULL_BODY_POSES: readonly string[] = ["AllFours", "Hogtied"];

export function poseGroupOf(pose: string): PoseGroup | null {
	if (POSE_GROUPS.stance.includes(pose)) return "stance";
	if (POSE_GROUPS.arms.includes(pose)) return "arms";
	return null;
}

/** The pose a suggestion put each group in, or null where the pose is the player's own. */
const ours: Record<PoseGroup, string | null> = { stance: null, arms: null };

/** ActivePose as a list, whatever shape it arrives in. */
function currentPoses(): string[] {
	const p = Player?.ActivePose;
	if (Array.isArray(p)) return p.filter((x: unknown): x is string => typeof x === "string");
	return typeof p === "string" && p ? [p] : [];
}

/** Set (or with null, clear) one group of the player's pose, following BC's own kneel/stand
 * sequence from ChatRoom.js: CharacterSetActivePose only changes the pose locally — the room
 * is told separately via ChatRoomCharacterPoseUpdate. Only the pose goes to the room, not the
 * whole appearance.
 *
 * Returns whether it took. Rule 5: bondage can refuse a pose, and so can a name BC does not
 * know, and before this the add-on announced the kneel either way. */
export function setSuggestedPose(pose: string | null, group: PoseGroup = poseGroupOf(pose ?? "") ?? "stance"): boolean {
	const before = currentPoses();
	const otherGroup: PoseGroup = group === "stance" ? "arms" : "stance";
	const keep = before.filter((p) => poseGroupOf(p) === otherGroup);
	// OUR pose change: the hypnotist's spoken command still moves a held-still subject (DW,
	// 2026-09-26), so the PoseSetActive hold lets these through.
	ownPoseChange++;
	try {
		if (pose !== null) {
			CharacterSetActivePose(Player, pose);
		} else {
			// There is no "clear one group" call to rely on, so reset and put the other group back.
			CharacterSetActivePose(Player, null);
			for (const p of keep) CharacterSetActivePose(Player, p);
		}
	} finally {
		ownPoseChange--;
	}
	// The hold now holds her HERE. Before the room is told, so the ServerSend guard knows this one.
	noteHeldPose();
	if (ServerPlayerIsInChatRoom()) {
		ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
	}
	const after = currentPoses();
	// Cleared means nothing but the group's neutral is left in it.
	const landed = pose !== null ? after.includes(pose) : !after.some((p) => POSE_GROUPS[group].includes(p) && !p.startsWith("Base"));
	// Losing the other group is expected when a whole-body pose is involved on either side.
	const lost = keep.filter((p) => !after.includes(p) && !FULL_BODY_POSES.includes(p));
	if (lost.length && !FULL_BODY_POSES.includes(pose ?? "")) warn(`pose: setting ${group} to ${pose ?? "neutral"} also lost ${lost.join(", ")}`);
	if (landed) ours[group] = pose;
	else log(`pose: ${group} → ${pose ?? "neutral"} did not take; ActivePose=${JSON.stringify(Player?.ActivePose)}`);
	return landed;
}

/** The poses suggestions put the player in and that are still in place, or null. Saved
 * across a reconnect so that waking still knows it has something to undo — Player.ActivePose
 * itself survives on the server, but the knowledge that WE set it does not. */
export function suggestedPose(): string[] | null {
	const now = currentPoses();
	const list = (["stance", "arms"] as PoseGroup[]).map((g) => ours[g]).filter((p): p is string => !!p && now.includes(p));
	return list.length ? list : null;
}

/** Put saved poses back. Accepts the old single-string and whole-array shapes too, since a
 * save written by an earlier version can still be waiting in the browser. */
export function restoreSuggestedPose(saved: string | string[] | null | undefined): void {
	const list = Array.isArray(saved) ? saved : saved ? [saved] : [];
	for (const p of list) if (typeof p === "string" && p) setSuggestedPose(p);
}

/** Undo the poses a suggestion put the player in, one group or both. Deliberately leaves a
 * pose they chose themselves alone — ending a session shouldn't yank someone out of their own
 * kneel, and one they have since changed out of is theirs now. With `only`, clears the group
 * only while that exact pose is the one a suggestion set. */
export function clearSuggestedPose(group?: PoseGroup, only?: string): void {
	const now = currentPoses();
	for (const g of group ? [group] : (["stance", "arms"] as PoseGroup[])) {
		const p = ours[g];
		// `only`: a trigger undoing its own kneel must not also undo a spread said since.
		if (only && p !== only) continue;
		ours[g] = null;
		if (p && now.includes(p)) setSuggestedPose(null, g);
	}
}

// --- Trance states -------------------------------------------------------------------
// Unlike Freeze/BlockWardrobe these are NOT BC effects — they're purely local to this
// client, enforced by hooks in main.ts. Nothing about them syncs, and nothing about them
// is visible to anyone else. Kept here so session.ts and voice.ts can both reach them
// without importing each other.

let speechBlocked = false;
/** Opacity of the trance veil, 0 = off. */
let screenFade = 0;

/** The design doc asks for "a soft white or grey veil at ~30% opacity — dreamlike without
 * cutting off visual context". Player-adjustable later. */
export const TRANCE_FADE_OPACITY = 0.3;
/** Walking trance: the same veil dropped to near-nothing. Still under, still parsing
 * suggestions, but ambulatory — so the fade thins to a hint rather than lifting, and the
 * movement lock comes off. The doc's "~5-10% opacity (near-invisible)". */
export const WALKING_FADE_OPACITY = 0.08;

/** Whether the subject is in walking trance right now. Local-only, like the fade — nobody
 * else can see it, which is the point: to the room the subject looks awake. */
let walkingTrance = false;
export function setWalkingTrance(on: boolean): void {
	walkingTrance = on;
}
export function isWalkingTrance(): boolean {
	return walkingTrance;
}

export function setSpeechBlocked(blocked: boolean): void {
	speechBlocked = blocked;
}

export function isSpeechBlocked(): boolean {
	return speechBlocked;
}

/** True only while a trigger is speaking FOR the subject (v0.90.0). The speech-block hook lets
 * that one line through: being silenced stops the subject speaking of their own accord, and a
 * forced line is the hypnotist speaking through them. BC's own BlockTalk rule and gag still apply. */
let forcedSpeaking = false;
export function withForcedSpeech<T>(send: () => T): T {
	forcedSpeaking = true;
	try {
		return send();
	} finally {
		forcedSpeaking = false;
	}
}
export function isForcedSpeech(): boolean {
	return forcedSpeaking;
}

export function setScreenFade(opacity: number): void {
	screenFade = Math.max(0, Math.min(1, opacity));
}

export function getScreenFade(): number {
	return screenFade;
}

/** The part of the canvas the trance veil covers: the chat room's character half, x 0-1003
 * by the full height. That is the rect BC's own ChatRoomDrawArousalOverlay fills (verified
 * for prompt.ts against Screens/Online/ChatRoom/ChatRoom.js), so the veil lies over the
 * bodies and nothing else — the room's menu buttons, the chat log and any dialog on the
 * right half stay clear. */
export const VEIL_WIDTH = 1003;

/** Paints the veil, if there is one. Called from the ChatRoomRun hook in main.ts after the
 * room has drawn, so it is only ever painted on the chat room screen.
 *
 * It used to paint after DrawProcess across the whole canvas, which put a white wash over
 * every menu, the settings screens, the wardrobe and BC's own dialogs — whatever was on
 * screen. The design asked for a veil over the scene, not over the game. */
export function drawTranceVeil(): void {
	if (screenFade <= 0) return;
	MainCanvas.save();
	MainCanvas.fillStyle = `rgba(255, 255, 255, ${screenFade})`;
	MainCanvas.fillRect(0, 0, VEIL_WIDTH, MainCanvasHeight);
	MainCanvas.restore();
}

/** Everything a trance turns on, turned back off. Called on every exit path. */
export function clearTranceStates(): void {
	speechBlocked = false;
	screenFade = 0;
	// Walking trance is a MODE of a trance, so it cannot outlive one — every exit path that
	// clears the veil clears this too, or a woken subject would keep a flag saying they are
	// still walking under.
	walkingTrance = false;
}

// --- Our effects, held by US, not only by the item (v0.90.2) ----------------------------------
//
// Found live by DW, 2026-09-26: "you cannot move" printed its flavour and did nothing. The Emoticon
// item's whole Property had been replaced with {} within seconds of our write — not by BC (its
// validator would have filtered the Effect array, not emptied the Property; our allow-list patch
// was verified in place), but by one of the ~20 other add-ons DW runs, several of which rewrite
// appearance or expressions. So the item cannot be the only place our effects live.
//
// OWN_EFFECTS is the truth for THIS client. The CharacterGetEffects hook (installEffectHooks) adds
// it to the player's computed effects, so Player.HasEffect / CanWalk / leaving the room honour our
// freeze whatever happens to the item. The item is still written, and re-written before every
// appearance sync from us, because OTHER clients can only see an effect through it (a leasher's
// ChatRoomCanBeLeashedBy, the hypnotist's remote panel).
const OWN_EFFECTS = new Set<string>();
let effectsHooked = false;

/** Put every effect we hold back onto our Emoticon item, if another add-on took them off. Returns
 * true if anything had to be restored. Cheap, and safe to call often. */
function reassertItemEffects(): boolean {
	if (!OWN_EFFECTS.size) return false;
	const item = findEmoticonItem(Player);
	if (!item) return false;
	item.Property ??= {};
	item.Property.Effect ??= [];
	let restored = false;
	for (const effect of OWN_EFFECTS) {
		if (!item.Property.Effect.includes(effect)) {
			item.Property.Effect.push(effect);
			restored = true;
		}
	}
	if (restored) log(`restored our effects on the Emoticon item (something else had removed them): ${[...OWN_EFFECTS].join(", ")}`);
	return restored;
}

// --- Held still (v0.91.0, DW 2026-09-26) ------------------------------------------------------
//
// BC's own Freeze is weak: it blocks the Leave button and makes standing<->kneeling a struggle, and
// nothing else — arms and same-category poses stay free, and in a map room it only slows walking
// (ChatRoomMapViewCanEnterTile, R132: `!Player.CanWalk()` multiplies the time by 6). DW wanted
// "you cannot move" to mean what it says: held in the pose and the place she is in.
//
// While OUR Freeze is on (the spoken suggestion, a trigger, or the trance's own Cannot Move
// default — DW: yes to all three):
//   - her own pose changes are refused (PoseSetActive hook). Our calls pass (ownPoseChange), so the
//     hypnotist's spoken pose commands still move her (DW: yes);
//   - another player changing her pose is undone on her client and re-synced (DW: no to others);
//   - on a map, BC's own MapImmobile is added beside Freeze, which stops walking outright.
// Items are NOT blocked: an item that forces a pose is applied by BC's item system under her item
// permissions, and refusing it would stop anyone restraining a held-still subject. Flagged to DW.
let ownPoseChange = 0;
let lastHeldNotice = 0;
/** The pose she is being held in, or null when she is not held. Set when the hold starts, and
 * after each of OUR pose changes; the ServerSend guard compares against it. */
let heldPose: string[] | null = null;

/** Hook priority for the hold (v0.91.2). The mod SDK runs hooks highest first, and DW's live check
 * showed WCE and LSCG both hooking PoseSetActive; at our old priority 5 one of them ran first,
 * applied the pose itself and never passed the call on, so our refusal was never reached. The
 * hold has to decide before anyone else acts. */
const HOLD_PRIORITY = 1000;

function noteHeldPose(): void {
	heldPose = isHeldStill() ? currentPoses() : null;
}
// 30 s (v0.91.3): DW saw the line "over and over" at 5 s. Mostly that was repeated no-op calls, now
// let through silently (poseWouldChange); this keeps any that remain from reading as spam.
const HELD_NOTICE_GAP_MS = 30_000;

/** Is our freeze holding her still? */
export function isHeldStill(): boolean {
	return hasOwnEffect("Freeze");
}

function heldNotice(line: string): void {
	const now = Date.now();
	if (now - lastHeldNotice < HELD_NOTICE_GAP_MS) return;
	lastHeldNotice = now;
	tellPlayer(line);
}

function samePoses(a: unknown, b: unknown): boolean {
	const norm = (p: unknown) => (Array.isArray(p) ? p : typeof p === "string" && p ? [p] : []).slice().sort().join(",");
	return norm(a) === norm(b);
}

/** Would PoseSetActive(Player, pose, force) actually change anything? BC and other add-ons call it
 * with the pose she is already in (DW, v0.91.2: the refusal line "over and over"); such calls change
 * nothing and are not an attempt to move, so they pass silently. */
function poseWouldChange(pose: unknown, force: unknown): boolean {
	const now = currentPoses();
	if (pose == null) return !now.every((p) => p.startsWith("Base"));
	if (typeof pose !== "string") return true;
	if (force) return !samePoses(now, [pose]);
	return !now.includes(pose);
}

/** Put her held pose back and tell the room, after something else moved her. */
function restoreHeldPose(held: string[]): void {
	Player.ActivePose = held;
	heldPose = held.slice();
	if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false);
	if (ServerPlayerIsInChatRoom()) ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
}

/** Hook BC so our effects count on this client even if the item loses them, and are put back on
 * the item before our appearance goes to the room. Called once from main.ts. */
export function installEffectHooks(modApi: any): void {
	// Her own pose change, from any of BC's paths (pose menu, kneel/stand button, the struggle
	// mini-game) — all end in PoseSetActive (R132 Pose.js).
	modApi.hookFunction("PoseSetActive", HOLD_PRIORITY, (args: any[], next: (a: any[]) => any) => {
		const [C, pose, force] = args;
		if ((C === Player || C?.IsPlayer?.()) && isHeldStill() && !ownPoseChange && poseWouldChange(pose, force)) {
			heldNotice("You try to shift, and your body does not answer. You stay exactly as you are.");
			log("held still: refused a pose change");
			return undefined;
		}
		return next(args);
	});
	// Someone else changing her pose: their client sets it and syncs her whole character (R132
	// ChatRoomKneelStandAssist -> ChatRoomCharacterUpdate), which reaches her as a
	// ChatRoomSyncCharacter of herself. Her items from that sync stand; her pose goes back.
	modApi.hookFunction("ChatRoomSyncCharacter", HOLD_PRIORITY, (args: any[], next: (a: any[]) => any) => {
		const [data] = args;
		const aboutHer = data?.Character?.MemberNumber === Player?.MemberNumber && data?.SourceMemberNumber !== Player?.MemberNumber;
		if (!aboutHer || !isHeldStill()) return next(args);
		const held = currentPoses();
		const result = next(args);
		if (!samePoses(held, Player?.ActivePose)) {
			restoreHeldPose(held);
			heldNotice("Someone tries to move you, and your body will not be moved.");
			log(`held still: undid a pose change from ${data.SourceMemberNumber}`);
		}
		return result;
	});
	modApi.hookFunction("ChatRoomSyncPose", HOLD_PRIORITY, (args: any[], next: (a: any[]) => any) => {
		const [data] = args;
		if (data?.MemberNumber !== Player?.MemberNumber || !isHeldStill() || samePoses(data?.Pose, Player?.ActivePose)) return next(args);
		restoreHeldPose(currentPoses());
		log("held still: refused an incoming pose update");
		return undefined;
	});
	// THE BUTTON, the way a real restraint does it (v0.91.3). BC's kneel/stand button reads
	// PoseCanChangeUnaidedStatus for every pose it could go to (R132 ChatRoom.js): NEVER draws it
	// "Blocked" and ChatRoomToggleKneel then does nothing at all, which is how DW's frog-tie cuffs
	// behave. BC's own Freeze only gives ALWAYS_WITH_STRUGGLE ("Limited"): the mini-game runs, and its
	// success posts "stands up" to the room BEFORE asking for the pose — so our refusal left the room
	// told something that did not happen. Held still, every pose she is not already in answers NEVER.
	// BC's CanKneel reads the same status, so everything that asks "can she kneel" agrees.
	modApi.hookFunction("PoseCanChangeUnaidedStatus", HOLD_PRIORITY, (args: any[], next: (a: any[]) => any) => {
		const [C, poseName] = args;
		if ((C === Player || C?.IsPlayer?.()) && isHeldStill() && !ownPoseChange && !currentPoses().includes(poseName)) {
			return typeof PoseChangeStatus !== "undefined" ? PoseChangeStatus.NEVER : 0;
		}
		return next(args);
	});
	// THE SAFETY NET. Every way her pose reaches the room ends in ServerSend("ChatRoomCharacterPoseUpdate")
	// (R132: the pose menu's _ClickButton, ChatRoomToggleKneel). If something changed her pose
	// without PoseSetActive — or got round the hook above — the held pose goes back before the room
	// hears otherwise. Our own changes already moved heldPose, so they pass.
	modApi.hookFunction("ServerSend", HOLD_PRIORITY, (args: any[], next: (a: any[]) => any) => {
		if (args[0] !== "ChatRoomCharacterPoseUpdate" || !heldPose || !isHeldStill() || samePoses(Player?.ActivePose, heldPose)) {
			return next(args);
		}
		Player.ActivePose = heldPose.slice();
		if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false);
		heldNotice("You try to shift, and your body does not answer. You stay exactly as you are.");
		log("held still: a pose change got past the hook; put the held pose back before it was sent");
		return next([args[0], { ...(args[1] ?? {}), Pose: Player.ActivePose }]);
	});
	// CharacterGetEffects (R132 Character.js) builds a character's effect list from their items;
	// CharacterLoadEffect caches it as C.Effect, which HasEffect and CanWalk read. With a group
	// filter it is answering about specific item slots, so ours are added only when the Emoticon
	// group is in scope (or no filter was given).
	modApi.hookFunction("CharacterGetEffects", 5, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		const [C, groups] = args;
		if (!OWN_EFFECTS.size || !C || !(C === Player || C?.IsPlayer?.())) return result;
		if (Array.isArray(groups) && groups.length && !groups.includes("Emoticon")) return result;
		const merged = Array.isArray(result) ? result.slice() : [];
		for (const effect of OWN_EFFECTS) if (!merged.includes(effect)) merged.push(effect);
		// Held still on a map: BC's own MapImmobile stops walking outright (R132
		// ChatRoomMapViewCanEnterTile returns 0), where Freeze alone only slows it.
		if (merged.includes("Freeze") && isHeldStill() && !merged.includes("MapImmobile")) merged.push("MapImmobile");
		return merged;
	});
	// Before our appearance is sent (ours or another add-on's update), make sure the item carries
	// what we hold, so the room sees the same thing we do.
	modApi.hookFunction("ChatRoomCharacterUpdate", 5, (args: any[], next: (a: any[]) => any) => {
		const [C] = args;
		if (C === Player || C?.IsPlayer?.()) reassertItemEffects();
		return next(args);
	});
	effectsHooked = true;
}

export function applyEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	if (character !== Player) {
		// Not used for anyone else today; kept item-only, as before.
		if (!item) return false;
		ensureEffectsAllowed();
		item.Property ??= {};
		item.Property.Effect ??= [];
		if (!item.Property.Effect.includes(effectName)) item.Property.Effect.push(effectName);
		return true;
	}
	OWN_EFFECTS.add(effectName);
	// Defensive: normally already done at startup, but an effect applied before the
	// retry loop succeeded would otherwise be stripped from our own appearance too.
	ensureEffectsAllowed();
	if (item) {
		item.Property ??= {};
		item.Property.Effect ??= [];
		if (!item.Property.Effect.includes(effectName)) item.Property.Effect.push(effectName);
	} else {
		warn(`no Emoticon item found on ${Player?.Name ?? "player"} — ${effectName} holds on this client only`);
	}
	refreshOwnEffects();
	if (ServerPlayerIsInChatRoom() && typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(Player);
	if (effectName === "Freeze") noteHeldPose();
	// Rule 5: did it LAND? Asked of BC itself, the way every other part of the game will ask.
	// Where BC has no effect cache to ask (outside the game), trust our own record.
	const landed = typeof Player?.HasEffect === "function" && Array.isArray(Player?.Effect) ? Player.HasEffect(effectName) : true;
	if (!landed) {
		warn(`${effectName} applied but BC does not report it — ${effectsHooked ? "hook installed" : "hook NOT installed"}`);
		// Take it back off everywhere: a freeze the room can see but she does not have would be a
		// second, quieter lie on top of the first.
		OWN_EFFECTS.delete(effectName);
		const effects = findEmoticonItem(Player)?.Property?.Effect;
		const at = Array.isArray(effects) ? effects.indexOf(effectName) : -1;
		if (at !== -1) {
			effects.splice(at, 1);
			if (ServerPlayerIsInChatRoom() && typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(Player);
		}
		return false;
	}
	return true;
}

/** Rebuild BC's cached effect list for the player from their appearance.
 *
 * BC does not read Property.Effect when it asks "is this player denied / frozen": it reads the
 * cached Player.Effect array (HasEffect, and ActivityOrgasmPrepare's DenialMode check), and only
 * CharacterLoadEffect rebuilds that. ChatRoomCharacterUpdate sends the appearance to the room
 * and does not touch the cache. So an effect written onto the Emoticon carrier did nothing on
 * the player's own client until something unrelated happened to refresh the character: "you
 * cannot cum" was stored, shown to the hypnotist as landed, and BC let the orgasm through. The
 * forced-orgasm path found this in v0.74.0 and rebuilt the cache itself; this makes every apply
 * and remove do it, so no caller can forget. */
function refreshOwnEffects(): void {
	if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
}

/** Is this effect one WE put on, as opposed to a real item doing the same thing? Reads our
 * own Emoticon carrier rather than Character.HasEffect, which cannot tell the difference —
 * and the difference matters whenever we are about to narrate something, since describing a
 * player's actual chastity belt as hypnosis would be both wrong and confusing. */
/** Does the Emoticon ITEM itself carry this effect right now — what the room sees? Separate from
 * hasOwnEffect, which also counts our own record: code that repairs the item after another add-on
 * wiped it has to ask about the item alone. */
export function itemCarriesEffect(effectName: string): boolean {
	return !!findEmoticonItem(Player)?.Property?.Effect?.includes(effectName);
}

//
// Our record OR the item: the item alone is not enough (other add-ons wipe it), and our record alone
// is not enough either — after a reload the record starts empty while the server hands back an item
// still carrying a Freeze we put on before, and recovery has to be able to see that.
export function hasOwnEffect(effectName: string): boolean {
	return OWN_EFFECTS.has(effectName) || !!findEmoticonItem(Player)?.Property?.Effect?.includes(effectName);
}

export function removeEffect(effectName: string, character: any = Player): boolean {
	const heldByUs = character === Player && OWN_EFFECTS.delete(effectName);
	const item = findEmoticonItem(character);
	const effects = item?.Property?.Effect;
	const idx = Array.isArray(effects) ? effects.indexOf(effectName) : -1;
	if (idx !== -1) effects.splice(idx, 1);
	if (!heldByUs && idx === -1) return false;
	if (character === Player) {
		refreshOwnEffects();
		if (ServerPlayerIsInChatRoom() && typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(Player);
		if (effectName === "Freeze") noteHeldPose();
	}
	return true;
}
