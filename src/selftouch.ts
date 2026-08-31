import { log } from "./log";
import { announce, announceBodyPart } from "./flavor";

// Blocking the subject from touching THEMSELVES — either at all (while frozen) or on
// named body parts ("you cannot touch your breasts").
//
// This hooks ActivityRun rather than joining the message-handler chain, and the difference
// matters. ActivityRun (Activity.js) is the single entry point for performing an activity,
// and it does three things in order: applies arousal via ActivityEffect, runs the actor's
// own self-effect, then sends the ChatRoomChat message. Not calling next() therefore stops
// all three — the activity genuinely doesn't happen, rather than happening invisibly.
//
// That's the opposite of suppression.ts, which deliberately lets everything happen and only
// hides the message. Here the point is that nothing occurs at all, so no arousal, and
// nobody else sees an activity message either.
//
// Scope: SELF-touch only. ActivityRun runs on the actor's own client, so this can only
// govern what the player does to themselves — which is exactly what was asked for. Someone
// else touching them runs on THEIR client and is out of reach here by construction.

/** Spoken body-part words -> the BC asset groups they cover.
 *
 * The right-hand side is BC's AROUSAL ZONE list, not a guess — every name here appears in
 * Screens/Character/Preference/Text_Preference.csv as an ArousalZoneItem* row, which is
 * also the complete set of groups any activity can target. That list is worth reading
 * before adding an entry, because BC's zone names do not line up with anatomy the way you
 * would expect:
 *
 *   ItemVulva            "Pussy & Vagina"
 *   ItemVulvaPiercings   "Clitoris"     <- NOT a piercing slot for activity purposes
 *   ItemFeet             "Lower Legs"
 *   ItemBoots            "Feet & Toes"
 *   ItemLegs             "Upper Legs"
 *   ItemPelvis           "Pelvis & Belly"
 *   ItemTorso            "Torso & Ribs"
 *
 * There is no ItemPenis or ItemGlans group. A character with a penis uses ItemVulva and
 * ItemVulvaPiercings like everyone else — the penis wording exists only in ActivityRun's
 * chat tag (ActivityBuildChatTag maps ItemVulva->ItemPenis, ItemVulvaPiercings->ItemGlans
 * purely to pick the message). So the anatomy words below deliberately share slots.
 *
 * Plural and singular both present because people say both. */
export const BODY_PARTS: Record<string, string[]> = {
	breasts: ["ItemBreast", "ItemNipples"],
	breast: ["ItemBreast", "ItemNipples"],
	chest: ["ItemBreast", "ItemNipples"],
	nipples: ["ItemNipples"],
	nipple: ["ItemNipples"],
	// The broad words cover the clitoris too; the specific ones don't reach back.
	pussy: ["ItemVulva", "ItemVulvaPiercings"],
	vulva: ["ItemVulva", "ItemVulvaPiercings"],
	cunt: ["ItemVulva", "ItemVulvaPiercings"],
	clit: ["ItemVulvaPiercings"],
	clitoris: ["ItemVulvaPiercings"],
	// Same two slots as above — see the note on ItemPenis not existing.
	cock: ["ItemVulva", "ItemVulvaPiercings"],
	penis: ["ItemVulva", "ItemVulvaPiercings"],
	dick: ["ItemVulva", "ItemVulvaPiercings"],
	tip: ["ItemVulvaPiercings"],
	crotch: ["ItemVulva", "ItemVulvaPiercings", "ItemPelvis"],
	butt: ["ItemButt"],
	ass: ["ItemButt"],
	bottom: ["ItemButt"],
	mouth: ["ItemMouth"],
	lips: ["ItemMouth"],
	face: ["ItemHead"],
	head: ["ItemHead"],
	hair: ["ItemHead"],
	ears: ["ItemEars"],
	ear: ["ItemEars"],
	nose: ["ItemNose"],
	neck: ["ItemNeck"],
	throat: ["ItemNeck"],
	// "Legs" as spoken means the whole leg, so it takes both of BC's leg zones.
	legs: ["ItemLegs", "ItemFeet"],
	leg: ["ItemLegs", "ItemFeet"],
	thighs: ["ItemLegs"],
	feet: ["ItemBoots"],
	toes: ["ItemBoots"],
	hands: ["ItemHands"],
	arms: ["ItemArms"],
	shoulders: ["ItemArms"],
	belly: ["ItemPelvis", "ItemTorso"],
	stomach: ["ItemPelvis", "ItemTorso"],
	tummy: ["ItemPelvis", "ItemTorso"],
	waist: ["ItemTorso"],
	ribs: ["ItemTorso"],
	hips: ["ItemPelvis"],
};

/** Blocked group name → the word the subject was told, so the flavor text can use their
 * hypnotist's own wording ("your breasts") rather than a raw group name. */
const blockedGroups = new Map<string, string>();
/** Set by "you cannot touch yourself" — everything, without naming a part. */
let blockAllSelfTouch = false;

export function setBodyPartBlocked(word: string, groups: string[], on: boolean): void {
	for (const g of groups) {
		if (on) blockedGroups.set(g, word);
		else blockedGroups.delete(g);
	}
}

export function setAllSelfTouchBlocked(on: boolean): void {
	blockAllSelfTouch = on;
}

export function clearSelfTouchBlocks(): void {
	blockedGroups.clear();
	blockAllSelfTouch = false;
}

export function describeSelfTouchBlocks(): string {
	const parts = [...new Set(blockedGroups.values())];
	return `${blockAllSelfTouch ? "all self-touch blocked; " : ""}${parts.length ? `parts: ${parts.join(", ")}` : "no parts blocked"}`;
}

function isSelfActivity(actor: any, acted: any): boolean {
	return !!actor?.IsPlayer?.() && !!acted?.IsPlayer?.();
}

/** Resolve the group the activity actually lands on, following BC's mirror mapping —
 * ItemNipples mirrors to ItemBreast for activity purposes, so blocking one has to
 * cover the other or the block is trivially sidestepped. */
function groupNamesFor(targetGroup: any): string[] {
	const names = [targetGroup?.Name].filter(Boolean) as string[];
	try {
		const mirrored = ActivityGetGroupOrMirror?.(Player?.AssetFamily ?? "Female3DCG", targetGroup?.Name);
		if (mirrored?.Name && !names.includes(mirrored.Name)) names.push(mirrored.Name);
	} catch {
		/* mirror lookup is a nicety, not a requirement */
	}
	return names;
}



export function installSelfTouch(modApi: any): void {
	modApi.hookFunction(
		"ActivityRun",
		10,
		((args: any[], next: (args: any[]) => any) => {
			try {
				const [actor, acted, targetGroup] = args;
				if (isSelfActivity(actor, acted)) {
					// Frozen means frozen. Reaching for yourself is still moving, so the
					// existing Freeze effect now covers it rather than needing its own
					// setting — anyone who consented to being frozen consented to this.
					if (Player?.HasEffect?.("Freeze")) {
						announce("selftouch-frozen");
						return undefined;
					}
					if (blockAllSelfTouch) {
						announce("selftouch-blocked");
						return undefined;
					}
					for (const name of groupNamesFor(targetGroup)) {
						const word = blockedGroups.get(name);
						if (word) {
							announceBodyPart(word);
							return undefined;
						}
					}
				}
			} catch (err) {
				// A bug here must never make activities impossible — fall through to normal.
				log("self-touch check failed:", err);
			}
			return next(args);
		}) as any,
	);
	log("self-touch hook installed on ActivityRun");
}
