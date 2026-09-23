import { log, warn } from "./log";

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
// THE NAMES ARE THE 2026-09-23 BRIEF'S AND ARE UNCONFIRMED. BC's pose list could not be read
// from where this was written (rule 8), and several of these may not exist under these names.
// A name BC does not know simply does not take, and setSuggestedPose() reads the pose back
// and reports that, so a wrong name shows up as "did not land", never as a false announce.
// Correct a name here and nowhere else.
//
// ALSO UNCONFIRMED: that setting one named pose leaves the other group alone. Setting a pose
// by name here relies on BC replacing only that pose's own category, as its own pose menu
// does; the read-back logs a warning if the other group was lost, which is what to look for
// in a live run.

export type PoseGroup = "stance" | "arms";

/** The base pose names are in here so clearing a group also clears BC's explicit
 * neutral for it, if it keeps one. Harmless when it does not. */
export const POSE_GROUPS: Record<PoseGroup, readonly string[]> = {
	stance: ["Kneel", "KneelingSpread", "Spread", "LegsClosed", "Sit", "AllFours", "Hogtied", "BaseLower"],
	arms: ["HandsBehindBack", "BackBoxTie", "BackElbowTouch", "OverHead", "CrossedArms", "Yoke", "Surrender", "BaseUpper"],
};

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
	if (pose !== null) {
		CharacterSetActivePose(Player, pose);
	} else {
		// There is no "clear one group" call to rely on, so reset and put the other group back.
		CharacterSetActivePose(Player, null);
		for (const p of keep) CharacterSetActivePose(Player, p);
	}
	if (ServerPlayerIsInChatRoom()) {
		ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
	}
	const after = currentPoses();
	// Cleared means nothing but the group's neutral is left in it.
	const landed = pose !== null ? after.includes(pose) : !after.some((p) => POSE_GROUPS[group].includes(p) && !p.startsWith("Base"));
	const lost = keep.filter((p) => !after.includes(p));
	if (lost.length) warn(`pose: setting ${group} to ${pose ?? "neutral"} also lost ${lost.join(", ")}`);
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
		// `only`: a trigger undoing its own kneel must not also undo a sit said since.
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

export function applyEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	if (!item) {
		warn(`no Emoticon item found on ${character?.Name ?? "target"}, cannot apply effect`);
		return false;
	}
	// Defensive: normally already done at startup, but an effect applied before the
	// retry loop succeeded would otherwise be stripped from our own appearance too.
	ensureEffectsAllowed();
	item.Property ??= {};
	item.Property.Effect ??= [];
	if (!item.Property.Effect.includes(effectName)) {
		item.Property.Effect.push(effectName);
	}
	if (character === Player) {
		refreshOwnEffects();
		if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
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
export function hasOwnEffect(effectName: string): boolean {
	return !!findEmoticonItem(Player)?.Property?.Effect?.includes(effectName);
}

export function removeEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	const effects = item?.Property?.Effect;
	if (!effects) return false;
	const idx = effects.indexOf(effectName);
	if (idx === -1) return false;
	effects.splice(idx, 1);
	if (character === Player) {
		refreshOwnEffects();
		if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
	}
	return true;
}
