import { FeatureToggles, getDepthOverride, getChemicalScope, getChemicalReach } from "./storage";

// Trance depth as the feature gate — the design doc's ⚠ DESIGN CHANGE section, Phase 1.
//
// THE SHAPE OF THE CHANGE. Access used to be answered per feature by a trust percentage.
// Now trust decides how DEEP a hypnotist can take someone, and each feature asks one
// question instead: are you at least this deep? Trust is still the primary driver — what
// moved is where it is read, not how much it matters.
//
// Depth is fixed at the moment of induction (`chance - roll`) and does not drift during a
// session. Going deeper takes waking and running a fresh induction, which is what makes
// fractionation a mechanic rather than a mood.

export type DepthTier = "drifting" | "yielding" | "entranced" | "deep" | "blank";

/** The five named levels, in order. `min` is the lowest depth that counts as that tier. */
export const DEPTH_TIERS: { key: DepthTier; label: string; min: number; blurb: string }[] = [
	{ key: "drifting", label: "Drifting", min: 0, blurb: "barely under, still mostly present" },
	{ key: "yielding", label: "Yielding", min: 20, blurb: "noticeably affected, starting to respond" },
	{ key: "entranced", label: "Entranced", min: 40, blurb: "clearly hypnotized, suggestions land" },
	{ key: "deep", label: "Deep", min: 60, blurb: "will faded, limited self-direction" },
	{ key: "blank", label: "Blank", min: 80, blurb: "fully gone, complete receptivity" },
];

export function tierOf(depth: number): DepthTier {
	let found: DepthTier = "drifting";
	for (const t of DEPTH_TIERS) if (depth >= t.min) found = t.key;
	return found;
}

export function tierMinimum(tier: DepthTier): number {
	return DEPTH_TIERS.find((t) => t.key === tier)?.min ?? 0;
}

export function tierLabel(tier: DepthTier): string {
	return DEPTH_TIERS.find((t) => t.key === tier)?.label ?? String(tier);
}

/** Next tier round the loop, for the settings screen's click-to-cycle control. */
export function nextTier(tier: DepthTier): DepthTier {
	const at = DEPTH_TIERS.findIndex((t) => t.key === tier);
	return DEPTH_TIERS[(at + 1) % DEPTH_TIERS.length].key;
}

/** What may contribute to the chemical half of depth.
 *
 * Stored as a NAME for the same reason the decay rates are: the player picks "Arousal only",
 * not a set of flags, so what sits behind it can be retuned without their saved choice
 * changing meaning. */
export type ChemicalScope = "both" | "arousal" | "drugs" | "none";

export const CHEMICAL_SCOPES: { key: ChemicalScope; label: string }[] = [
	{ key: "both", label: "Arousal + drugs" },
	{ key: "arousal", label: "Arousal only" },
	{ key: "drugs", label: "Drugs only" },
	{ key: "none", label: "Neither" },
];

export function nextScope(scope: ChemicalScope): ChemicalScope {
	const at = CHEMICAL_SCOPES.findIndex((s) => s.key === scope);
	return CHEMICAL_SCOPES[(at + 1) % CHEMICAL_SCOPES.length].key;
}

/** Does arousal count toward depth right now? Drugs are unbuilt, so `drugs` and `none` are
 * currently the same answer — deliberately kept as four options anyway, so that switching a
 * saved preference does not become a migration the day drugs land. */
export function arousalCounts(): boolean {
	try {
		const scope = getChemicalScope();
		return scope === "both" || scope === "arousal";
	} catch {
		// Unreadable settings mean the default, which is that arousal counts — matching the
		// behaviour that has shipped since v0.18.0 rather than silently switching it off.
		return true;
	}
}

// --- where the current depth lives ---------------------------------------------------------
//
// HERE, not in session.ts, and that is a cycle-avoidance decision rather than a taste one.
// session.ts imports carry.ts and triggers.ts; both of those need to know how deep the
// subject is; so having them import session.ts back would close a loop — the exact trap
// timers.ts was created to avoid, and the same fix: put the shared state in a module that
// imports nothing but storage, and let the owner push into it.
//
// session.ts is still the authority. It resolves the roll and calls setCurrentDepths(); this
// module only remembers the answer so everyone else can ask without reaching for the session.
let depthFull = 0;
let depthEarned = 0;

export function setCurrentDepths(full: number, earned: number): void {
	depthFull = full;
	// Earned can never exceed full: it is the same roll with fewer inputs, and a subject who
	// was deeper in the earned sense than in reality would be nonsense.
	depthEarned = Math.min(full, earned);
}

export function clearCurrentDepths(): void {
	depthFull = 0;
	depthEarned = 0;
}

/** How deep they are, counting everything. Zero outside a trance, which is the right answer:
 * every gated feature here needs one. */
export function currentDepth(): number {
	return depthFull;
}

/** How deep they are counting only what was earned — no arousal, no drugs. */
export function currentDepthEarned(): number {
	return depthEarned;
}

/** One gated feature: the permission that must be granted, and how deep they must be.
 *
 * `earnedOnly` is the structural half of the design, and the reason there are two depths
 * rather than one. Arousal and drugs may not, BY DEFAULT, write anything permanent nor reach a
 * feature that lies to the subject about their own state — and that is a rule about where the
 * depth CAME FROM, which a single number cannot carry.
 *
 * `earnedOnly` here is the DEFAULT, not the last word. As of 2026-09-08 the subject may open two
 * of the three earned-only features — the illusion and trigger-planting — to chemical depth for
 * themselves (`chemicalReach` in storage, the toggle on the Depth tab), accepting the tradeoff:
 * anything seeded that way fades fast (`plantedChemical` for triggers) or is session-scoped
 * anyway (the illusion). The default stays earned-only, so a subject who changes nothing is
 * exactly where they were, and NOTHING a HYPNOTIST does can flip it — turning a chemical scope
 * up still cannot let an aroused stranger plant a lasting trigger. The choice is the subject's
 * alone, and it could not ship before the decay that prices it (v0.60.0) existed. Carry-forward
 * is deliberately NOT toggleable yet: it has no decay clock, so its half waits for one.
 *
 * `effectiveEarnedOnly()` below is what everything reads; `gate.earnedOnly` is only the seed. */
export interface DepthGate {
	key: keyof FeatureToggles;
	label: string;
	tier: DepthTier;
	earnedOnly: boolean;
}

/** Defaults, from the doc's Feature Depth Requirements table. Overrides live in storage and
 * only the differences are stored, so retuning these moves everyone who has not chosen —
 * the same principle as the decay rates and the trigger scope. */
export const DEPTH_GATES: DepthGate[] = [
	// Mood: noticing less is the shallowest thing hypnosis does.
	{ key: "suppressClothing", label: "Not noticing clothing changes", tier: "drifting", earnedOnly: false },
	{ key: "suppressBondage", label: "Not noticing bondage changes", tier: "drifting", earnedOnly: false },
	{ key: "suppressActivities", label: "Not noticing touches", tier: "drifting", earnedOnly: false },
	// Behavioural, session-only.
	{ key: "movementRestriction", label: "Cannot move", tier: "yielding", earnedOnly: false },
	{ key: "speechRestriction", label: "Cannot speak", tier: "yielding", earnedOnly: false },
	{ key: "postureControl", label: "Posture (kneel / stand)", tier: "yielding", earnedOnly: false },
	{ key: "clothingRestriction", label: "Cannot reach the wardrobe", tier: "yielding", earnedOnly: false },
	{ key: "selfTouchControl", label: "Cannot touch yourself", tier: "yielding", earnedOnly: false },
	{ key: "compelActivity", label: "Made to act on yourself", tier: "yielding", earnedOnly: false },
	// Deeper, still session-only.
	{ key: "undressControl", label: "Undressing", tier: "entranced", earnedOnly: false },
	{ key: "arousalControl", label: "Arousal & orgasm", tier: "entranced", earnedOnly: false },
	// The earned-only three: two outlive the session, one lies to the subject.
	{ key: "illusionControl", label: "Clothing illusion", tier: "deep", earnedOnly: true },
	{ key: "triggerControl", label: "Planting triggers", tier: "deep", earnedOnly: true },
	{ key: "carryForward", label: "Suggestions that outlive the trance", tier: "deep", earnedOnly: true },
];

export function gateFor(key: keyof FeatureToggles): DepthGate | undefined {
	return DEPTH_GATES.find((g) => g.key === key);
}

/** The two earned-only features a subject may open to chemical depth. Carry-forward is absent
 * on purpose — it outlives the session and has no decay clock, so there is nothing yet to price
 * the shortcut with. */
const CHEMICAL_TOGGLEABLE = new Set<keyof FeatureToggles>(["illusionControl", "triggerControl"]);

/** Is this a feature whose earned-only gate the SUBJECT may lift for themselves? */
export function isChemicalToggleable(key: keyof FeatureToggles): boolean {
	const g = gateFor(key);
	return !!g && g.earnedOnly && CHEMICAL_TOGGLEABLE.has(key);
}

/** Whether this feature reads the EARNED depth right now — its `earnedOnly` default, unless the
 * subject has opened it to chemical depth. Reading a setting needs a logged-in Player, and this
 * is reached from the help screen and the pattern suite with no BC globals, so a failure to read
 * is treated as "not opened" — the safe, default-earned answer. */
export function effectiveEarnedOnly(key: keyof FeatureToggles): boolean {
	const g = gateFor(key);
	if (!g || !g.earnedOnly) return false;
	if (!CHEMICAL_TOGGLEABLE.has(key)) return true; // carry-forward: locked earned-only
	try {
		return !getChemicalReach(key);
	} catch {
		return true;
	}
}

/** The tier this feature currently needs — the player's choice if they made one, otherwise
 * the default above. */
export function requiredTier(key: keyof FeatureToggles): DepthTier {
	// A preference we cannot read is a preference not set. Reading settings needs a logged-in
	// Player, and this is called from the help screen, which the pattern suite exercises with
	// no BC globals at all — `Player?.x` throws outright when Player was never declared, as
	// opposed to being undefined. Falling back to the default is both correct and what the
	// caller wants.
	try {
		const override = getDepthOverride(key);
		if (override && DEPTH_TIERS.some((t) => t.key === override)) return override;
	} catch {
		/* not logged in, or no storage — use the default below */
	}
	return gateFor(key)?.tier ?? "drifting";
}

export function requiredDepth(key: keyof FeatureToggles): number {
	return tierMinimum(requiredTier(key));
}

/** Is this feature reachable at these depths?
 *
 * Takes both numbers rather than one, because which of them applies is a property of the
 * feature: an earned-only feature never sees the chemical half at all. Callers pass what the
 * session has and this decides — no caller should be choosing between the two itself, since
 * that decision is the structural rule.
 *
 * Depth 0 with no session means nothing is reachable, which is the correct answer: every
 * gated feature here needs a trance. */
export function depthAllows(
	key: keyof FeatureToggles,
	full: number = currentDepth(),
	earned: number = currentDepthEarned(),
): boolean {
	const gate = gateFor(key);
	if (!gate) return true; // ungated feature — permission is the only check
	const have = effectiveEarnedOnly(key) ? earned : full;
	return have >= requiredDepth(key);
}

/** Why a feature is out of reach, phrased for a log line or a hypnotist's panel. Null when
 * it is reachable. */
export function depthRefusal(
	key: keyof FeatureToggles,
	full: number = currentDepth(),
	earned: number = currentDepthEarned(),
): string | null {
	if (depthAllows(key, full, earned)) return null;
	const need = requiredTier(key);
	const earnedGate = effectiveEarnedOnly(key);
	const have = earnedGate ? earned : full;
	return (
		`needs ${tierLabel(need)} (${requiredDepth(key)}), at ${have.toFixed(0)}` +
		`${earnedGate ? " earned — arousal does not count toward this one" : ""}`
	);
}
