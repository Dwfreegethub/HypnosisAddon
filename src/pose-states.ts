// Her pose as states the pose compulsions name (v1.19.7): kneel, stand, allfours, hogtied,
// legs-spread, legs-closed, arms-up, arms-out, arms-back, arms-down. Pure: read by pose-watch.ts (the
// events) and voice.ts (a hold that lasts while she stays in one, v1.19.8).

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

/** The states she is in now. */
export function currentPoseStates(): Set<string> {
	return poseStatesOf(poseMappingOf(typeof Player === "undefined" ? null : Player));
}
