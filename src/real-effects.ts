// The BC effects "the ropes feel real" (feel-real.ts, v1.22.0) may put on her, and the permission
// each needs. A leaf, so effects.ts (the Emoticon allow-list) and recovery.ts (orphans) can read it
// without importing the illusion code.
import type { FeatureToggles } from "./storage";

const GAGS = ["GagVeryLight", "GagEasy", "GagLight", "GagNormal", "GagMedium", "GagHeavy", "GagVeryHeavy", "GagTotal", "GagTotal2", "GagTotal3", "GagTotal4"];
const BLINDS = ["BlindLight", "BlindNormal", "BlindHeavy", "BlindTotal"];
const BODY = ["Block", "Prone", "Slow", "CuffedArms", "CuffedLegs", "CuffedFeet"];

export const REAL_EFFECTS: Record<string, keyof FeatureToggles> = {
	...Object.fromEntries(BODY.map((e) => [e, "movementRestriction" as const])),
	BlockMouth: "speechRestriction",
	...Object.fromEntries(GAGS.map((e) => [e, "speechRestriction" as const])),
	...Object.fromEntries(BLINDS.map((e) => [e, "sightControl" as const])),
};
export const REAL_EFFECT_NAMES = Object.keys(REAL_EFFECTS);
