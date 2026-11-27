// The BC effects "the ropes feel real" (feel-real.ts, v1.22.0) may put on her, and the permission
// each needs. A leaf, so effects.ts (the Emoticon allow-list) and recovery.ts (orphans) can read it
// without importing the illusion code.
import type { FeatureToggles } from "./storage";

const GAGS = ["GagVeryLight", "GagEasy", "GagLight", "GagNormal", "GagMedium", "GagHeavy", "GagVeryHeavy", "GagTotal", "GagTotal2", "GagTotal3", "GagTotal4"];
const BLINDS = ["BlindLight", "BlindNormal", "BlindHeavy", "BlindTotal"];
const BODY = ["Block", "Prone", "Slow", "CuffedArms", "CuffedLegs", "CuffedFeet", "MapImmobile"];

export const REAL_EFFECTS: Record<string, keyof FeatureToggles> = {
	...Object.fromEntries(BODY.map((e) => [e, "movementRestriction" as const])),
	BlockMouth: "speechRestriction",
	...Object.fromEntries(GAGS.map((e) => [e, "speechRestriction" as const])),
	...Object.fromEntries(BLINDS.map((e) => [e, "sightControl" as const])),
};
export const REAL_EFFECT_NAMES = Object.keys(REAL_EFFECTS);

/** Effects ECHS also holds for other things ("you cannot move", the wardrobe block, the trance). Taken
 * from an item only when nothing else holds them, and let go only if feel-real put them on and
 * nothing else wants them by then (v1.23.1: Floor Shackles are Freeze + BlockWardrobe + MapImmobile). */
export const SHARED_REAL_EFFECTS: Record<string, keyof FeatureToggles> = { Freeze: "movementRestriction", BlockWardrobe: "clothingRestriction" };
