import { log } from "./log";

// Same technique LSCG uses (verified in their src/utils.ts): piggyback the always-worn,
// invisible "Emoticon" appearance item's Property.Effect array rather than depending on
// a real physical restraint. Works for a suggestion-driven effect with no item involved.
const EMOTICON_ASSET_NAME = "Emoticon";

// Every effect we inject onto the Emoticon item must be listed here. BC's own validation
// (ValidationSanitizeEffects in Validation.js) filters an item's Property.Effect down to
// what the *asset* permits, dropping anything not in Asset.Effect or Asset.AllowEffect.
const MANAGED_EFFECTS = ["Freeze", "BlockWardrobe", "DenialMode"];

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

/** Whether the player's current pose was put there by a suggestion rather than chosen. */
let poseSetBySuggestion = false;

/** Set (or with null, clear) the player's pose, following BC's own kneel/stand sequence
 * from ChatRoom.js: PoseSetActive only changes the pose locally — the room is told
 * separately via ChatRoomCharacterPoseUpdate. */
export function setSuggestedPose(pose: string | null): void {
	CharacterSetActivePose(Player, pose);
	if (ServerPlayerIsInChatRoom()) {
		ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
	}
	poseSetBySuggestion = pose !== null;
}

/** Undo a pose a suggestion put the player in. Deliberately leaves a pose they chose
 * themselves alone — ending a session shouldn't yank someone out of their own kneel. */
export function clearSuggestedPose(): void {
	if (!poseSetBySuggestion) return;
	setSuggestedPose(null);
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

/** Everything a trance turns on, turned back off. Called on every exit path. */
export function clearTranceStates(): void {
	speechBlocked = false;
	screenFade = 0;
}

export function applyEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	if (!item) {
		log(`no Emoticon item found on ${character?.Name ?? "target"}, cannot apply effect`);
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
	if (character === Player && ServerPlayerIsInChatRoom()) {
		ChatRoomCharacterUpdate(Player);
	}
	return true;
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
	if (character === Player && ServerPlayerIsInChatRoom()) {
		ChatRoomCharacterUpdate(Player);
	}
	return true;
}
