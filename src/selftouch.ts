import { log } from "./log";
import { flavor, bodyPartFlavor } from "./flavor";

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

/** Spoken body-part words → the BC asset groups they cover. Group names verified against
 * the live client. Plural and singular both present because people say both. */
export const BODY_PARTS: Record<string, string[]> = {
	breasts: ["ItemBreast", "ItemNipples"],
	breast: ["ItemBreast", "ItemNipples"],
	chest: ["ItemBreast", "ItemNipples"],
	nipples: ["ItemNipples"],
	pussy: ["ItemVulva", "ItemVulvaPiercings"],
	vulva: ["ItemVulva", "ItemVulvaPiercings"],
	clit: ["ItemVulva"],
	crotch: ["ItemVulva", "ItemVulvaPiercings", "ItemPelvis", "ItemPenis", "ItemGlans"],
	cock: ["ItemPenis", "ItemGlans"],
	penis: ["ItemPenis", "ItemGlans"],
	butt: ["ItemButt"],
	ass: ["ItemButt"],
	bottom: ["ItemButt"],
	mouth: ["ItemMouth"],
	lips: ["ItemMouth"],
	face: ["ItemHead"],
	head: ["ItemHead"],
	hair: ["ItemHead"],
	neck: ["ItemNeck"],
	throat: ["ItemNeck"],
	legs: ["ItemLegs"],
	thighs: ["ItemLegs"],
	feet: ["ItemFeet", "ItemBoots"],
	hands: ["ItemHands"],
	arms: ["ItemArms"],
	belly: ["ItemTorso"],
	stomach: ["ItemTorso"],
	waist: ["ItemTorso"],
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

function notify(message: string): void {
	log(message);
	ChatRoomSendLocal(message);
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
						notify(flavor("selftouch-frozen"));
						return undefined;
					}
					if (blockAllSelfTouch) {
						notify(flavor("selftouch-blocked"));
						return undefined;
					}
					for (const name of groupNamesFor(targetGroup)) {
						const word = blockedGroups.get(name);
						if (word) {
							notify(bodyPartFlavor(word));
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
