import { log, warn, isTestingMode } from "./log";
import {
	applyEffect,
	removeEffect,
	hasOwnEffect,
	setSuggestedPose,
	clearSuggestedPose,
	poseGroupOf,
	setSpeechBlocked,
	isWalkingTrance,
} from "./effects";
import { setSuppressed, setNumb } from "./suppression";
import { BODY_PARTS, setBodyPartBlocked, setAllSelfTouchBlocked, beginCommandedActivity, endCommandedActivity } from "./selftouch";
import { getFeatures, getTriggerDuration, listTriggers, FeatureToggles, Trigger } from "./storage";
import { accessFor, AccessCategory } from "./trust";
import {
	isSessionActiveWith,
	hasLiveSessionWith,
	wakeByHypnotist,
	enterWalkingTrance,
	leaveWalkingTrance,
	currentHypnotistId,
	saveForReconnect,
} from "./session";
import { applyFollow, releaseFollow } from "./follow";
import { depthAllows, depthRefusal, requiredDepth, tierOf, tierLabel } from "./depth";
import { flavor, bodyPartFlavor, announce, announceBodyPart, announceBodyPartApplied, FlavorKey } from "./flavor";
import { tellPlayer } from "./notify";
import { setArousalLevel, forceOrgasm, setOrgasmDenied, orgasmDeniedByUs, ArousalLevel } from "./arousal";
import { freezeAppearance, clearIllusion } from "./illusion";
import { undress, UndressResult } from "./undress";
import {
	carryThese,
	isCarrierOf,
	isCarried,
	dropCarried,
	releaseCarried,
	registerCarryHandlers,
	noteApplied,
	noteReleased,
	appliedSuggestions,
	lastApplied,
} from "./carry";
import {
	scheduleTimer,
	cancelTimer,
	markActive,
	clearActive,
	isActive,
	timerDeadline,
} from "./timers";
import { registerTriggerRecovery, SavedTrigger } from "./recovery";
import {
	isRecording,
	cancelRecording,
	commitRecording,
	beginRecording,
	renameRecording,
	recordAction,
	triggersFiredBy,
	triggersReleasableBy,
	triggersArmed,
	installerHasSession,
	tellHypnotist,
	triggerStrength,
	describeStrength,
	pruneFadedTriggers,
	reinforceTriggersBy,
	noteTriggerFired,
	TRIGGER_GHOST_THRESHOLD,
} from "./triggers";

// Natural-language suggestion parsing — the design doc's "free-form primary, /suggest as
// fallback" approach, in stub form with three suggestions.
//
// Runs entirely on the SUBJECT's client: it watches chat from the person currently running
// a session on them and matches against a small pattern library. Same subject-authoritative
// rule as everything else — the hypnotist's client isn't consulted and can't assert a
// match; it just talks, and the subject's own client decides whether anything landed.

// --- Normalisation -------------------------------------------------------------------
// Doing this well is most of what buys wording flexibility: expand contractions and strip
// punctuation FIRST, so each pattern below only has to describe one canonical phrasing
// instead of every typographic variant of it.
function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[‘’ʼ]/g, "'") // curly apostrophes → straight
		.replace(/\bcan'?t\b/g, "cannot")
		.replace(/\bcan not\b/g, "cannot")
		.replace(/\bdon'?t\b/g, "do not")
		.replace(/\bwon'?t\b/g, "will not")
		.replace(/\bmustn'?t\b/g, "must not")
		.replace(/\bdoesn'?t\b/g, "does not")
		.replace(/\bisn'?t\b/g, "is not")
		.replace(/\baren'?t\b/g, "are not")
		.replace(/\byou'?re\b/g, "you are")
		.replace(/\byou'?ve\b/g, "you have")
		.replace(/\bur\b/g, "your")
		.replace(/[^a-z\s]/g, " ") // punctuation → space, so "move!" == "move"
		.replace(/\s+/g, " ")
		.trim();
}

/** Strip out-of-character asides before anything reads the line.
 *
 * Parentheses are BC's own OOC convention, and until now the add-on ignored that completely:
 * normalize() turns punctuation into spaces, so "(ooc: brb, you cannot move)" was parsed
 * exactly as if it had been said in character. A player stepping out of a scene to say
 * something practical could fire a suggestion, build trust, or set off a trigger.
 *
 * Returns null when there is nothing left in character, which the caller must treat as "this
 * message does not exist" — no matching, no trust, no trigger firing.
 *
 * Deliberately strips SPANS rather than only whole-line asides. "Missy you cannot move (back
 * in 5)" is a real thing people type, and the in-character half of it should still land while
 * the aside is discarded. */
export function stripOOC(content: string): string | null {
	const text = String(content ?? "");
	// Counts depth rather than matching "(...)" with a flat pattern. The flat pattern stopped at
	// the FIRST ")", so a doubled "((brb))" — the other common OOC habit — left its second ")"
	// behind as in-character text: the speech gate then saw speech and blocked the lifeline.
	// Nested asides "(brb (dog))" had the same leftover.
	let kept = "";
	let depth = 0;
	for (const ch of text) {
		if (ch === "(") {
			depth++;
			kept += " "; // an aside separates the words either side of it
		} else if (ch === ")" && depth > 0) {
			depth--;
		} else if (depth === 0) {
			// A ")" with no "(" to close is not an aside; it stays, so ":)" is still speech.
			kept += ch;
		}
		// Anything else is inside an aside. An unclosed "(" is an aside that ran to the end of
		// the line — people do not close them — so depth never returns to 0 and the rest drops.
	}
	const final = kept.replace(/\s+/g, " ").trim();
	return final.length ? final : null;
}

// --- The pattern library -------------------------------------------------------------

interface Suggestion {
	/** Doubles as the flavor-text key — the two lists are deliberately kept in step. */
	id: FlavorKey;
	/** Which permission(s) the subject must have granted. With several, ANY one grants the
	 * suggestion — "you notice nothing" is worth saying if even one category is permitted,
	 * and run() then applies only the categories actually allowed. */
	permission: keyof FeatureToggles | (keyof FeatureToggles)[];
	/** Undoes a restriction rather than applying one. Still needs a live trance like
	 * everything else — releases briefly skipped that, which turned out to be too broad:
	 * it left ordinary hypnosis wording working on someone who wasn't under. What it does
	 * skip is the permission check, since a revoked permission must never leave an
	 * already-applied effect stuck on. */
	release?: boolean;
	/** Which restriction this release undoes. Lets a carried suggestion be let go by name
	 * when the ordinary release wording is spoken, and is what makes a release reachable at
	 * all outside a trance — see the carried-release exception in handleSpokenLine. */
	releaseOf?: FlavorKey | FlavorKey[];
	/** Reverses this suggestion. Used when a trigger is released by name — the release
	 * has to undo exactly what that trigger applied, not everything of that kind. */
	undo?: () => void;
	/** Wordings that land, for the help screen. Kept beside the patterns rather than in
	 * help.ts on purpose: a duplicated source of truth always eventually drifts, which is
	 * the same lesson the generated /hypno summary already learned. Every entry must have
	 * at least one, and it must be a phrase the patterns above actually match. */
	examples: string[];
	/** OPTIONAL display override for the help screen. `examples` are the real, test-checked
	 * phrasings; when one wording has an obvious slang twin — "come" / "cum" — listing both as
	 * separate examples reads as clutter, so this shows the merged "come/cum" form instead
	 * while `examples` keeps a matching entry for each spelling. Falls back to `examples`. */
	displayExamples?: string[];
	// NO trustThreshold any more. Depth is the gate as of v0.50.0, and it is looked up from
	// the suggestion's PERMISSION rather than stored here — so a player who raises the tier
	// for "clothing illusion" moves the button, the spoken phrase and the trigger action all
	// at once, instead of three places drifting apart.
	patterns: RegExp[];
	/** Wordings that VETO this entry even when a pattern matches, so the line carries on down
	 * the table to whatever it really is. For verbs that also turn up as the object of another
	 * suggestion — "you will not notice when I strip you" contains "strip", and is not an
	 * order to strip. */
	unless?: RegExp[];
	/** Returns a flavor key to report something OTHER than the usual outcome — used by the
	 * arousal suggestions, which can match and be permitted and still not land (the
	 * player's meter is off, or a chastity item refused the orgasm). Returning nothing
	 * means "it worked", and the suggestion's own id is used, as before. */
	run: () => FlavorKey | void;
}

/** Arousal suggestions can match, be permitted, and still not land — the player's own BC
 * arousal meter may be switched off entirely. Reported as a plain out-of-fiction line
 * rather than as atmosphere, so the hypnotist and the subject both learn the same thing. */
function applyArousal(level: ArousalLevel): FlavorKey | void {
	if (!setArousalLevel(level)) return "arousal-unavailable";
}

/** "You cannot cum until I allow you to cum": a negated orgasm, then a condition naming when it
 * ends. Vetoes orgasm-allow, whose phrases turn up inside that condition. */
const ORGASM_DENIED_UNTIL =
	/\b(?:cannot|will not|may not|must not|not allowed|not permitted|forbidden|do not|never|no)\b.*\b(?:come|cum|orgasm|climax|finish|coming|cumming)\b.*\b(?:until|unless|till|before)\b/;

/** A line about NOTICING being undressed is an awareness suggestion, not an order to undress.
 *
 * The undress pair sits before every awareness entry in the table (it has to come after
 * clothing-block, and awareness comes later still), and its bare /strip/ and /undress/ read
 * the whole line. So "Missy, you won't notice when I strip you" stripped her and never set
 * awareness at all, and "…when I undress you" took a garment off. That was "strip wipes
 * awareness" on DW's 2026-09-22 list. Vetoing on "notice" lets the line carry on down to
 * clothing-awareness-block, or to the broad awareness-block for "you notice nothing when I
 * strip you". */
const UNDRESS_IS_THE_OBJECT = [/\bnotic(e|es|ed|ing)\b/, /\bunnoticed\b/];

/** Undressing can match, be permitted, and still not happen — bound hands, a lock that is not
 * ours, or nothing left to take off. Each gets its own line rather than silence. */
function applyUndress(count: number): FlavorKey | void {
	// A command to undress is involuntary — the hypnotist's, not the subject's own choice — so
	// it overrides OUR hypnotic freeze ("you cannot move") the same way a commanded touch or a
	// forced orgasm does (DW, 2026-09-13: command always wins). We lift only the Freeze WE
	// applied and rebuild BC's effect cache; undress() then re-reads CanChangeOwnClothes, so a
	// REAL restraint (bound hands, a real freeze, a locked outfit) still refuses on its own —
	// the lift can only ever clear our own obstacle, never someone else's. Restored afterward:
	// the command pierced the freeze for this act, it did not lift it.
	//
	// Note it is NOT enough to skip undress()'s "frozen" line: our Freeze also makes BC's
	// CanChangeOwnClothes() answer false, which the "locked" branch would then blame. Actually
	// lifting the effect and re-reading is the only way to tell our freeze from a real lock.
	const liftedOwnFreeze = hasOwnEffect("Freeze");
	if (liftedOwnFreeze) {
		removeEffect("Freeze");
		if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
	}
	try {
		const result: UndressResult = undress(count);
		if (result.refusal === "already bare") return "undress-bare";
		// "frozen" now means a real freeze we could not lift — still its own line rather than
		// "somebody else's lock", the same distinction selftouch-frozen draws.
		if (result.refusal === "frozen") return "undress-frozen";
		if (result.refusal) return "undress-blocked";
		// The flavor is deliberately generic about WHICH garment. Naming it would read better
		// ("your skirt comes off") and garmentWord() exists for it — but it needs a built line
		// like announceBodyPartApplied rather than a fixed one, so it is a follow-up, not a gap.
		return count === 1 ? "undress" : "undress-all";
	} finally {
		if (liftedOwnFreeze) {
			applyEffect("Freeze");
			if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
		}
	}
}

function applyForcedOrgasm(): FlavorKey | void {
	// A forced orgasm is a COMMAND — the hypnotist tipping her over, not her own choice — so it
	// overrides OUR standing denial ("you cannot cum") the same way a commanded touch overrides
	// the self-touch block (DW, 2026-09-12: command always wins). We lift only the DenialMode WE
	// applied; a REAL chastity/edging item is a separate appearance item, survives the cache
	// rebuild below, and still bails ActivityOrgasmPrepare — so "physical always wins" holds.
	//
	// The denial is a standing restriction on her OWN volition, so it goes straight back: this
	// one act pierced it, it did not repeal it. Both halves go through setOrgasmDenied so the
	// in-memory flag denial.ts's hook trusts moves with the carrier (v0.84.1); a bare removeEffect
	// here would leave the flag set and the hook would stop the very orgasm being commanded.
	// setOrgasmDenied's apply/remove rebuild the cached C.Effect that ActivityOrgasmPrepare reads.
	const liftedOwnDenial = orgasmDeniedByUs();
	if (liftedOwnDenial) setOrgasmDenied(false);
	try {
		const result = forceOrgasm();
		if (result === "unavailable") return "arousal-unavailable";
		// "denied" now means a REAL item held it — ours is already lifted. Still not spelled out
		// to the subject: she shouldn't be told which of a belt, an edge, or a lock stopped her.
		if (result === "denied") return "orgasm-refused";
		// "already" means one is running; the ordinary flavor still reads correctly.
	} finally {
		if (liftedOwnDenial) setOrgasmDenied(true);
	}
}

/** Why this suggestion cannot run for this speaker, or null if it can. Returns a reason
 * string rather than a boolean so the log can say which gate stopped it — the same
 * "a silent rejection is a bug in its own right" rule the rest of this file follows. */
/** The consent half alone: is this switched on at all?
 *
 * Split out from the depth check because a TRIGGER needs exactly this and not that. A trigger
 * fires outside a trance, where depth is zero by definition — so re-checking depth when it
 * goes off would disarm every trigger ever planted, permanently. Depth is a property of the
 * induction that planted it and is checked once, then; permission is re-checked every single
 * time it fires, so revoking one disarms that action of every trigger already out there. */
function permissionReason(suggestion: Suggestion, features: FeatureToggles): string | null {
	if (suggestion.release) return null; // a revoked permission must never strand an effect
	if (!features.hypnoEnabled) return "hypnoEnabled is off";
	if (!permitted(suggestion, features)) return `${suggestion.permission} isn't granted`;
	return null;
}

function blockedReason(suggestion: Suggestion, speaker: number, features: FeatureToggles): string | null {
	const permission = permissionReason(suggestion, features);
	if (permission) return permission;
	if (suggestion.release) return null;
	// DEPTH, not trust. Trust decided how deep this induction could go; the feature asks only
	// whether they got there. See depth.ts — and note the check is per PERMISSION rather than
	// per suggestion, so "you notice nothing" answers to whichever of its three categories is
	// actually granted rather than to a single tier of its own.
	const depthBlock = depthReason(suggestion, features);
	if (depthBlock) return depthBlock;
	return null;
}

/** Why the subject is not deep enough for this suggestion, or null.
 *
 * With several permissions, the SHALLOWEST granted one wins — matching what run() does, which
 * applies only the categories actually permitted. Blocking "you notice nothing" at the
 * deepest of its three tiers would refuse a line that would have done something. */
function depthReason(suggestion: Suggestion, features: FeatureToggles): string | null {
	const keys = (Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission]).filter(
		(k) => features[k],
	);
	if (!keys.length) return null; // the permission check above already refused this
	if (keys.some((k) => depthAllows(k))) return null;
	return depthRefusal(keys[0]);
}

/** Which of a multi-permission suggestion's categories will actually take, and why each of
 * the rest will not. One helper, used both by the broad line's run() and by the report the
 * hypnotist gets afterwards, so the two cannot drift apart.
 *
 * Checks DEPTH per category as well as permission. depthReason() above passes the line if
 * ANY permitted category is deep enough — correctly, because refusing the whole line would
 * refuse something that would have done something — but run() then applied every permitted
 * category whatever its own tier said. With the three awareness gates left at their Drifting
 * default that was invisible; with one raised on the Depth tab it silently over-applied. */
function reachableCategories(
	keys: (keyof FeatureToggles)[],
	features: FeatureToggles,
): { applied: (keyof FeatureToggles)[]; skipped: { key: keyof FeatureToggles; why: string }[] } {
	const applied: (keyof FeatureToggles)[] = [];
	const skipped: { key: keyof FeatureToggles; why: string }[] = [];
	for (const key of keys) {
		if (!features[key]) skipped.push({ key, why: "not permitted" });
		else if (!depthAllows(key)) skipped.push({ key, why: depthRefusal(key) ?? "too shallow" });
		else applied.push(key);
	}
	return { applied, skipped };
}

/** How a permission key reads in a line to the hypnotist. */
const CATEGORY_WORDS: Partial<Record<keyof FeatureToggles, string>> = {
	suppressClothing: "clothing",
	suppressBondage: "bondage",
	suppressActivities: "touches",
};

function permitted(suggestion: Suggestion, features: FeatureToggles): boolean {
	const keys = Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission];
	return keys.some((k) => features[k]);
}

// ORDER MATTERS: releases are listed before their matching restrictions, because a release
// phrase usually contains the same verb ("you can move again" vs "you cannot move") and the
// first match wins.
/** What the clothing illusion costs, from the design doc's feature-threshold table.
 *
 * Was 70; DW lowered it to 65 so that ownership alone reaches it — the owner floor is 65,
 * and the doc's rule is that an owner reaches everything. At 70 an owner cleared triggers
 * and carry-forward but stopped one rung short of the illusion, which was an accident of
 * two numbers rather than a decision.
 *
 * Named and exported so the help screen can read it rather than repeat it; the same
 * duplicated-source-of-truth rule that made the /hypno summary generated. */
export const ILLUSION_TRUST_THRESHOLD = 65;

/** What undressing costs, from the design doc's feature-threshold table ("Remove clothes,
 * 60%"). Lower than the illusion's 65 deliberately: being undressed is a real, visible thing
 * that everyone including the subject can see, where the illusion is a lie told to her about
 * her own body. Session-scoped, so the arousal floor DOES reach it — the doc lists it among
 * the rows the chemical floor may lift. */
export const UNDRESS_TRUST_THRESHOLD = 60;

/** What a release lets go of, as a list — "stand" undoes every leg pose, not only kneeling. */
function releasesOf(suggestion: Suggestion): FlavorKey[] {
	const of = suggestion.releaseOf;
	return of === undefined ? [] : Array.isArray(of) ? of : [of];
}

// --- Poses -----------------------------------------------------------------------------
// The brief of 2026-09-23 (DW): the whole BC stance and arm catalogue, not just kneel/stand.
// All ride the one Posture Control tick at the same depth (DW's call), and all act on the
// subject only. Legs and arms are separate groups, so setting one never undoes the other —
// see POSE_GROUPS in effects.ts, where the BC names live and are marked unconfirmed.

/** Posed but did not take is its own outcome (rule 5): bondage, or a name BC does not know. */
function applyPose(pose: string): FlavorKey | void {
	if (!setSuggestedPose(pose)) return "pose-blocked";
}

function poseSuggestion(id: FlavorKey, pose: string, examples: string[], patterns: RegExp[], unless?: RegExp[]): Suggestion {
	return {
		id,
		examples,
		permission: "postureControl",
		patterns,
		unless,
		run: () => applyPose(pose),
		// Undo only while it is still this pose: a trigger's kneel must not also undo a sit said since.
		undo: () => clearSuggestedPose(poseGroupOf(pose) ?? "stance", pose),
	};
}

const STANCE_IDS: FlavorKey[] = ["kneel", "kneel-spread", "legs-spread", "legs-closed", "sit", "all-fours", "lie-down"];
const ARM_IDS: FlavorKey[] = ["hands-behind", "arms-behind", "elbows-behind", "arms-up", "arms-crossed", "arms-out", "surrender"];

/** Ordered: each entry is checked before the broader one it overlaps. "Stand with your legs
 * apart" is a stance, not "stand"; "kneel spread" is not a plain kneel; "hands up where I can
 * see them" is surrender, not arms up. So this whole block sits above stand and kneel. */
const POSE_SUGGESTIONS: Suggestion[] = [
	poseSuggestion("kneel-spread", "KneelingSpread", ["kneel spread", "spread your knees"], [
		/\bkneel (?:with your knees )?(?:spread|apart)\b/,
		/\bspread your knees\b/,
		/\bknees (?:apart|spread|wide)\b/,
	]),
	poseSuggestion("legs-spread", "Spread", ["spread your legs", "stand with your legs apart"], [
		/\b(?:spread|part) your legs\b/,
		/\b(?:legs|feet) (?:apart|wide)\b/,
	]),
	poseSuggestion("legs-closed", "LegsClosed", ["legs closed", "feet together"], [
		/\b(?:legs|feet) (?:closed|together)\b/,
		/\bclose your legs\b/,
	]),
	poseSuggestion("all-fours", "AllFours", ["on all fours", "get on your hands and knees"], [
		/\bon all fours\b/,
		/\bon your hands and knees\b/,
	]),
	poseSuggestion("lie-down", "Hogtied", ["lie down", "down on your stomach"], [
		/(?<!\bi )(?<!\bwe )\b(?:lie|lay) down\b/,
		/\bon your (?:stomach|belly|front)\b/,
	]),
	poseSuggestion(
		"sit",
		"Sit",
		["sit", "sit down", "sit on the floor"],
		[/(?<!\bi )(?<!\bwe )\bsit\b/],
		// Everyday induction patter uses "sit" without meaning the floor: "sit back and relax",
		// "just sit with that feeling", "sit still". Those are vetoed rather than listed out,
		// because bare "Missy, sit" is the command people will actually type.
		[/\bsit (?:back|with|still|tight|up|comfortably|quietly)\b/, /\bcannot sit\b/],
	),
	// Arms. Surrender first: "hands up where I can see them" should raise them to the ears,
	// not over the head.
	poseSuggestion("surrender", "Surrender", ["surrender", "hands where I can see them"], [
		// Bare "surrender" is also ordinary hypnosis patter ("surrender to my voice"). Kept on
		// DW's call, 2026-09-23, with the conflict noted in the wiki rather than guarded here.
		/(?<!\bi )(?<!\bwe )\bsurrender\b/,
		/\bwhere i can see them\b/,
	]),
	poseSuggestion("hands-behind", "HandsBehindBack", ["hands behind your back", "clasp your hands behind your back"], [
		/\bhands behind your back\b/,
	]),
	poseSuggestion("arms-behind", "BackBoxTie", ["arms behind your back", "box your arms"], [
		/\barms behind your back\b/,
		/\bbox your arms\b/,
	]),
	poseSuggestion("elbows-behind", "BackElbowTouch", ["elbows behind your back"], [
		/\belbows (?:behind your back|together)\b/,
	]),
	poseSuggestion("arms-up", "OverHead", ["put your hands up", "raise your arms", "hands above your head"], [
		/\b(?:hands|arms) up\b/,
		/\braise your (?:arms|hands)\b/,
		/\b(?:hands|arms) (?:above|over) your head\b/,
	]),
	poseSuggestion("arms-crossed", "CrossedArms", ["cross your arms"], [/\bcross your arms\b/, /\barms crossed\b/]),
	poseSuggestion("arms-out", "Yoke", ["hold your arms out", "yoke your arms"], [
		/\b(?:hold|put|stretch) your arms out\b/,
		/\byoke your arms\b/,
	]),
	{
		id: "arms-relax",
		examples: ["relax your arms", "arms at your sides"],
		release: true,
		releaseOf: ARM_IDS,
		permission: "postureControl",
		// "Relax your arms" is induction patter too; kept on DW's call, 2026-09-23. Like "stand",
		// it clears any arm pose, including one the subject chose themselves.
		patterns: [
			/\brelax your arms\b/,
			/\b(?:arms|hands) (?:at|by) your sides?\b/,
			/\b(?:lower|drop) your (?:arms|hands)\b/,
			/\b(?:arms|hands) down\b/,
		],
		run: () => (setSuggestedPose(null, "arms") ? undefined : "pose-blocked"),
	},
];

const SUGGESTIONS: Suggestion[] = [
	// Arousal goes FIRST. Its patterns are the most specific in the table (every one names
	// arousal, an orgasm, or the edge), so it can't shadow anything below it — while the
	// reverse is not true: "you are stuck at the edge" would otherwise be eaten by
	// movement-block's "stuck", and "you cannot stand it" by the posture entry.
	{
		id: "arousal-none",
		examples: ["you are not aroused", "your arousal fades", "you feel no desire"],
		permission: "arousalControl",
		patterns: [
			/\byou are (?:not|no longer) (?:\w+ ){0,2}(?:aroused|turned on|excited|horny|needy)\b/,
			/\byour (?:arousal|excitement|need|desire|heat|wanting) (?:is gone|fades|drains away|goes away|disappears|leaves you)\b/,
			/\byou feel no (?:arousal|desire|need|excitement)\b/,
			/\byou (?:do not|will not) (?:want|need) (?:it|anything|me)\b/,
		],
		run: () => applyArousal("none"),
	},
	{
		id: "arousal-light",
		examples: ["you are lightly aroused", "you feel a little warm"],
		permission: "arousalControl",
		patterns: [
			/\byou are (?:only |just )?(?:lightly|slightly|mildly|barely|a little|a bit) (?:aroused|turned on|excited|warm|horny)\b/,
			/\byou feel (?:a little|a bit|slightly|lightly) (?:aroused|warm|excited|horny)\b/,
			/\byou are (?:just )?(?:starting|beginning) to (?:feel it|get (?:warm|aroused|excited))\b/,
			/\ba (?:little|small|faint) (?:warmth|heat) (?:builds|starts|begins|settles)\b/,
		],
		run: () => applyArousal("light"),
	},
	{
		id: "arousal-high",
		examples: ["you are very aroused", "you are desperate", "you need it badly"],
		permission: "arousalControl",
		patterns: [
			/\byou are (?:\w+ )?(?:very|highly|deeply|so|extremely|badly|terribly|painfully) (?:aroused|turned on|excited|horny|needy)\b/,
			/\byou (?:are|feel) (?:\w+ )?(?:aching|burning|desperate|needy)\b/,
			/\byou (?:want|need) (?:it|this|me|to come|to cum) (?:badly|so much|desperately|now)\b/,
			/\byour (?:arousal|need|heat|desire) (?:climbs|builds|floods you|takes over)\b/,
		],
		run: () => applyArousal("high"),
	},
	{
		id: "arousal-full",
		examples: ["you are right on the edge", "you are so close"],
		permission: "arousalControl",
		patterns: [
			/\byou are (?:fully|completely|totally|utterly) (?:aroused|turned on)\b/,
			/\byou are (?:\w+ ){0,2}(?:on|at) the (?:very )?(?:edge|brink)\b/,
			/\byou are (?:so close|almost there|about to (?:come|cum|burst))\b/,
			/\byou are (?:\w+ )?edged\b/,
		],
		run: () => applyArousal("full"),
	},
	// allow before deny before force, and all three before anything else, because they
	// overlap: "you cannot come now" contains "come now", and "you may come now" contains
	// both. First match wins, so the most restrictive reading has to be listed first.
	{
		id: "orgasm-allow",
		examples: ["you may come now", "you may cum now", "you are allowed to orgasm"],
		displayExamples: ["you may come/cum now", "you are allowed to orgasm"],
		release: true,
		releaseOf: "orgasm-deny",
		permission: "arousalControl",
		patterns: [
			/\byou (?:can|may) (?:come|cum|orgasm|climax|finish) (?:again|now|freely|whenever|if|when)\b/,
			/\byou are (?:allowed|free|permitted) to (?:come|cum|orgasm|climax|finish)\b/,
			/\bi (?:allow|permit) you to (?:come|cum|orgasm|climax|finish)\b/,
			/\byour orgasm is (?:allowed|yours)\b/,
			/\byou are no longer denied\b/,
		],
		// A denial that names its own end — "you cannot cum until I allow you to cum" — holds a
		// permission phrase inside its condition. Listed first, allow read that half and LIFTED
		// the denial the line was laying down. A negated orgasm before an until/unless clause is
		// a denial, so the line carries on down to orgasm-deny.
		unless: [ORGASM_DENIED_UNTIL],
		run: () => setOrgasmDenied(false),
	},
	{
		id: "orgasm-deny",
		examples: ["you cannot come", "you cannot cum", "you are forbidden to come"],
		displayExamples: ["you cannot come/cum", "you are forbidden to come"],
		permission: "arousalControl",
		patterns: [
			/\byou (?:cannot|will not|may not|must not|are not to) (?:come|cum|orgasm|climax|finish)\b/,
			/\byou are (?:not allowed|not permitted|forbidden) to (?:come|cum|orgasm|climax|finish)\b/,
			/\byou are (?:forbidden|not allowed|not permitted) from (?:coming|cumming|orgasming|climaxing|finishing)\b/,
			/\b(?:do not|you will not) (?:you )?dare (?:to )?(?:come|cum|orgasm|climax|finish)\b/,
			/\byou will (?:not be able|be unable) to (?:come|cum|orgasm|climax|finish)\b/,
			/\byou have forgotten how to (?:come|cum|orgasm|climax)\b/,
			/\byour orgasm is denied\b/,
			/\byou are denied\b/,
			/\bno (?:coming|cumming|orgasms?)\b/,
			/\b(?:do not|never) (?:come|cum|orgasm|climax)\b/,
		],
		run: () => setOrgasmDenied(true),
		undo: () => setOrgasmDenied(false),
	},
	{
		id: "orgasm-force",
		examples: ["come for me", "cum for me", "you will come now"],
		displayExamples: ["come/cum for me", "you will come now"],
		permission: "arousalControl",
		patterns: [
			/\b(?:come|cum) for me\b/,
			/\b(?:come|cum|orgasm) now\b/,
			/\byou (?:will|are going to) (?:come|cum|orgasm|climax|finish) (?:now|for me)\b/,
			/\byou (?:come|cum|orgasm) (?:now|for me)\b/,
			/\bgo over (?:the edge )?(?:now|for me)\b/,
		],
		// No undo: an orgasm is an event, not a state, so there is nothing for a trigger
		// release to take back.
		run: () => applyForcedOrgasm(),
	},
	// The clothing illusion. Listed here, before the awareness entries, because the two
	// overlap: "you do not notice what you are wearing" also matches awareness-block's
	// "you do not notice what", and the more specific reading has to win.
	{
		id: "illusion-release",
		examples: [
			"look at yourself",
			"you can see yourself again",
			"you notice your clothes",
			"you notice you are naked",
		],
		release: true,
		releaseOf: "illusion-block",
		permission: "illusionControl",
		patterns: [
			/\byou (?:can|may) (?:see|tell) (?:what|how) you are (?:wearing|dressed)\b/,
			/\byou (?:can|may) see yourself (?:again|properly|clearly)\b/,
			/\byou (?:see|notice) yourself as you (?:really |actually )?are\b/,
			// "again" was mandatory on the next one and a qualifier was mandatory on the
			// last, so "you notice your clothes" and a bare "look at yourself" — two of the
			// most natural ways to say this — matched nothing at all.
			/\byou (?:notice|see|feel) your (?:clothes|clothing|outfit)\b/,
			/\byou (?:can|may) tell what you have on\b/,
			/\blook (?:down )?at yourself\b/,
			/\byou (?:notice|see|realise|realize) (?:that )?you are (?:naked|undressed|bare|dressed)\b/,
			/\byou (?:notice|see) what (?:you are wearing|is missing)\b/,
		],
		run: () => clearIllusion(),
	},
	{
		id: "illusion-block",
		examples: ["you cannot tell what you are wearing", "your clothes look the same to you"],
		permission: "illusionControl",
		// The first suggestion to carry a trust threshold, and still the only one. Checked
		// against relationship trust alone — the arousal floor must never reach a feature
		// that lies to someone about their own state. See ILLUSION_TRUST_THRESHOLD above for
		// why the number is 65 rather than the 70 this table originally called for.
		patterns: [
			/\byou cannot (?:tell|see|remember) (?:what|how) you are (?:wearing|dressed)\b/,
			/\byou (?:do not|will not|cannot) notice (?:what|how) you are (?:wearing|dressed)\b/,
			/\byou (?:do not|will not|cannot) notice your (?:clothes|clothing|outfit)\b/,
			/\byou (?:cannot|do not) (?:tell|see) what you have on\b/,
			/\byour (?:clothes|clothing|outfit) (?:look|looks|stay|stays) the same to you\b/,
			/\byou look the same to yourself\b/,
			/\bnothing about you (?:changes|has changed)\b/,
			/\byou (?:do not|cannot) see yourself change\b/,
			/\byou will (?:not be able|be unable) to (?:tell|see) (?:what|how) you are (?:wearing|dressed)\b/,
		],
		run: () => (freezeAppearance() ? undefined : undefined),
		undo: () => clearIllusion(),
	},
	{
		id: "movement-release",
		examples: ["you can move again", "your body is your own"],
		release: true,
		releaseOf: "movement-block",
		permission: "movementRestriction",
		patterns: [
			/\byou (can|may) move\b/,
			/\byou are (free|able|allowed) to move\b/,
			/\byou are no longer (frozen|paralyzed|rooted|immobile|still)\b/,
			/\byou (can|may) move (again|now|freely)\b/,
			/\bmove (again|freely)\b/,
			/\byour body is your own\b/,
		],
		run: () => { removeEffect("Freeze"); },
	},
	{
		id: "movement-block",
		examples: ["you cannot move", "stay still", "you are frozen"],
		permission: "movementRestriction",
		patterns: [
			// The optional (\w+ ) throughout lets one adverb slip in without needing a
			// separate pattern for it — "you are completely frozen", "you cannot even move".
			/\byou cannot (\w+ )?move\b/,
			/\byou are (unable|not able) to move\b/,
			/\byou are (\w+ )?(frozen|paralyzed|rooted|immobile|stuck)\b/,
			/\b(do not|never) move\b/,
			/\b(stay|hold|remain) (still|frozen|put)\b/,
			/\b(stay|remain) where you are\b/,
			/\byour body (will not|does not|cannot) (move|respond|obey)\b/,
			/\byou (cannot|will not) move (a muscle|an inch|at all)\b/,
			// Future phrasing, natural when building a trigger: "when I say sleepy time,
			// you will not be able to move". Same effect either way — the tense is for the
			// hypnotist's benefit, not a different mechanic.
			/\byou will (not be able|be unable) to move\b/,
			/\byou will not move\b/,
		],
		run: () => { applyEffect("Freeze"); },
		undo: () => removeEffect("Freeze"),
	},
	// Follow / leash. Release listed first, as everywhere: "you may leave" must win over the
	// block's verbs before the block gets a look. Deliberately no "come with me" — that would
	// collide with the orgasm "come" family, which is listed earlier and would swallow it.
	{
		id: "follow-release",
		examples: ["you can leave", "you don't have to follow me", "you are free to go"],
		release: true,
		releaseOf: "follow-block",
		permission: "followControl",
		patterns: [
			/\byou (?:can|may) (?:leave|go)(?: now| freely)?\b/,
			/\byou are (?:free|allowed) to (?:leave|go|wander|walk away)\b/,
			/\byou (?:can|may) (?:walk away|wander off|go your own way)\b/,
			/\byou (?:do not|don't) have to (?:follow|stay)(?: me| close| near)?\b/,
			/\byou no longer (?:have to|need to) (?:follow|stay near me|stay close)\b/,
			/\bstay (?:wherever|where) you (?:like|want|please)\b/,
		],
		run: () => { releaseFollow(); },
	},
	{
		id: "follow-block",
		examples: ["follow me", "stay close to me", "you cannot leave my side"],
		permission: "followControl",
		patterns: [
			/\bfollow me\b/,
			/\byou (?:will|must) follow(?: me)?\b/,
			/\byou follow (?:me|wherever i go)\b/,
			/\bstay (?:close|near)\b/,
			/\bstay (?:at|by) my (?:side|heel)\b/,
			/\byou (?:cannot|can't|will not|won't) (?:leave|walk away from) (?:my side|me)\b/,
			/\byou (?:belong|stay) (?:at|by) my (?:side|heel|feet)\b/,
			/\bheel\b/,
		],
		run: () => { applyFollow(currentHypnotistId()); },
		undo: () => releaseFollow(),
	},
	{
		id: "clothing-release",
		examples: ["you can change your clothes"],
		release: true,
		releaseOf: "clothing-block",
		permission: "clothingRestriction",
		patterns: [
			/\byou (can|may) (change|remove|touch|adjust) your (clothes|clothing|outfit)\b/,
			/\byou are (free|able|allowed) to (change|dress|undress)\b/,
			/\byou (can|may) (dress|undress)\b/,
			/\byour (clothes|clothing|outfit) are yours again\b/,
		],
		run: () => { removeEffect("BlockWardrobe"); },
	},
	{
		id: "clothing-block",
		examples: ["you cannot change your clothes", "leave your clothes alone"],
		permission: "clothingRestriction",
		patterns: [
			/\byou cannot (change|remove|take off|touch|adjust) your (clothes|clothing|outfit)\b/,
			/\byou cannot (dress|undress|strip|get dressed|get undressed)\b/,
			/\byou are (unable|not able) to (change|remove) your (clothes|clothing|outfit)\b/,
			/\byour (clothes|clothing|outfit) (stay|stays|will stay|must stay|are staying)\b/,
			/\b(do not|never) (touch|change|remove|adjust) your (clothes|clothing|outfit)\b/,
			/\bleave your (clothes|clothing|outfit) alone\b/,
			/\byou have forgotten how to (dress|undress|change)\b/,
			/\byou will (not be able|be unable) to (change|remove|touch) your (clothes|clothing|outfit)\b/,
		],
		run: () => { applyEffect("BlockWardrobe"); },
		undo: () => removeEffect("BlockWardrobe"),
	},
	// Taking clothes OFF, as opposed to clothing-block above, which is being unable to change
	// them. ORDER IS LOAD-BEARING: these sit AFTER clothing-block so that "you cannot undress"
	// and "you cannot strip" are read as restrictions rather than as instructions. First match
	// wins, and the negated forms have to get there first.
	//
	// "all-at-once" is listed first because "take everything off" contains "take", and the
	// single-garment patterns must not eat it. Same first-match-wins rule as releases.
	{
		id: "undress-all",
		examples: ["take everything off", "strip"],
		permission: "undressControl",
		patterns: [
			/\btake (everything|it all) off\b/,
			/\btake off (everything|all your clothes)\b/,
			/\b(strip|undress) (completely|entirely|all the way)\b/,
			/\byou are (getting|going) completely undressed\b/,
			/\bremove (everything|all your clothes)\b/,
			/\bnothing stays on\b/,
			// Bare, and safe to be bare: the name gate already requires the line to address
			// the subject, so "comic strip" only fires if somebody says "Missy, comic strip".
			/\bstrip\b/,
		],
		unless: UNDRESS_IS_THE_OBJECT,
		run: () => applyUndress(Infinity),
	},
	{
		id: "undress",
		examples: ["take something off", "undress"],
		permission: "undressControl",
		patterns: [
			/\btake (something|a piece|one thing|another|it) off\b/,
			/\btake off (something|a piece|one thing|another)\b/,
			/\b(you )?(start|begin) (to )?undress(ing)?\b/,
			/\byou (want|need) to undress\b/,
			/\bundress (for me|yourself|now)\b/,
			/\bundress\b/,
			/\btake your clothes off\b/,
			/\bremove (a|one) (piece|garment|item)\b/,
		],
		unless: UNDRESS_IS_THE_OBJECT,
		run: () => applyUndress(1),
	},
	// PER-CATEGORY awareness, and they sit BEFORE the broad pair below because the broad
	// block's /you (do not|will not) notice/ has no right-hand anchor and would take "you will
	// not notice your clothing" first — which is exactly what happened in play: the line
	// meant for clothing took every permitted category and reported the broad thing. Touch
	// already had its own pair (touch-block / touch-release, further down); clothing and
	// bondage did not, so the only way to reach either alone was to have unticked the others.
	//
	// Releases before blocks, as everywhere: "you notice your clothes again" contains
	// "notice your clothes".
	//
	// AND THE CLOTHING PAIR MUST NOT SOUND LIKE THE ILLUSION. "You will not notice your
	// clothing" is an illusion-block pattern — listed above, on purpose, because "notice" there
	// reads as perception and the more specific feature wins. That is the line DW said in play
	// at Drifting, and it was refused for depth by the illusion, not ignored by awareness. So
	// every phrasing here names the CHANGE or the ACT — being undressed, clothes changing —
	// rather than the clothes themselves, and the suite pins the illusion's claim on the other
	// wording so nobody "fixes" the collision by moving it.
	{
		id: "clothing-awareness-release",
		examples: ["you notice being undressed again", "clothing changes register again"],
		release: true,
		releaseOf: "clothing-awareness-block",
		permission: "suppressClothing",
		patterns: [
			/\byou notice (being|when you are) (dressed|undressed|redressed|changed|stripped) again\b/,
			/\byou notice changes to your (clothes|clothing|outfit)( again)?\b/,
			/\b(clothing|clothes|outfit) changes (register|reach you)( again)?\b/,
		],
		run: () => setSuppressed("clothing", false),
	},
	{
		id: "clothing-awareness-block",
		examples: ["you will not notice being undressed", "changes to your clothes go unnoticed"],
		permission: "suppressClothing",
		patterns: [
			/\byou (do not|will not|cannot) notice (being|when you are) (dressed|undressed|redressed|changed|stripped)\b/,
			/\byou (do not|will not|cannot) notice changes to your (clothes|clothing|outfit)\b/,
			/\byou (do not|will not|cannot) notice (anyone|someone|people|me) (changing|dressing|undressing|stripping) you\b/,
			// "...when I strip you" — the phrasing the undress entries used to take, and strip her.
			/\byou (do not|will not|cannot) notice (when|while|as|if) (i|we|they|he|she|someone|anyone|people) (strip|strips|undress|undresses|change|changes|dress|dresses) you\b/,
			/\b(clothing|clothes|outfit) changes go unnoticed\b/,
			/\bchanges to your (clothes|clothing|outfit) go unnoticed\b/,
		],
		run: () => setSuppressed("clothing", true),
		undo: () => setSuppressed("clothing", false),
	},
	{
		id: "bondage-awareness-release",
		examples: ["you notice the ropes again"],
		release: true,
		releaseOf: "bondage-awareness-block",
		permission: "suppressBondage",
		patterns: [
			/\byou notice (the |your |any )?(ropes|restraints|bondage|bindings|cuffs) again\b/,
			/\byou (notice|feel) being (tied|bound|restrained) again\b/,
		],
		run: () => setSuppressed("bondage", false),
	},
	{
		id: "bondage-awareness-block",
		examples: ["you will not notice the ropes", "you do not notice being tied"],
		permission: "suppressBondage",
		patterns: [
			/\byou (do not|will not|cannot) notice (the |your |any )?(ropes|restraints|bondage|bindings|cuffs)\b/,
			/\byou (do not|will not|cannot) notice being (tied|bound|restrained)\b/,
		],
		run: () => setSuppressed("bondage", true),
		undo: () => setSuppressed("bondage", false),
	},
	{
		// The broad one: clothing, bondage and touch together. Each category is still
		// applied only if separately permitted — saying it doesn't override a box the
		// subject left unchecked.
		id: "awareness-release",
		examples: ["you notice everything again"],
		release: true,
		releaseOf: "awareness-block",
		permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
		patterns: [
			/\byou notice (everything|things|them|it) again\b/,
			/\byou (notice|feel) what (happens|is happening|is done) to you\b/,
			// "awake" deliberately NOT here — "you are awake again" should end the trance,
			// not merely restore awareness of clothing changes. It belongs to wake.
			/\byou are aware (again|to it)\b/,
			// "You can notice" / "you may notice" needs an object that means awareness coming
			// BACK. It used to be bare, and ordinary patter starts that way far more often than a
			// release does: "you may notice a warmth spreading" matched here and silently lifted
			// clothing, bondage and touch hiding, the illusion and numbness, mid-scene, with
			// nothing said to the hypnotist. That was the "inconsistent suppression" and the
			// "awareness cancels the illusion" of DW's 2026-09-22 list, one cause for both.
			/\byou (can|may) notice (again|everything|things|it all)\b/,
			/\byou (can|may) notice (what|anything that) (happens|is happening|is done) to you\b/,
		],
		run: () => {
			setSuppressed("clothing", false);
			setSuppressed("bondage", false);
			setSuppressed("activity", false);
			// The broad release undoes MORE than the broad block applies, deliberately.
			// "You notice nothing" never switches the illusion on — that takes its own line —
			// but "you notice everything again" is the everything-back phrase, and a subject
			// told they notice everything who still cannot see that their clothes are gone
			// has been told something untrue.
			//
			// Same principle that already lets releases skip the permission check: handing
			// something back should always be easier than taking it away.
			clearIllusion();
			// And numbness, for the same reason: "you notice everything again" said to
			// someone who still cannot feel being touched is the same untruth.
			setNumb(false);
		},
	},
	{
		id: "awareness-block",
		examples: ["you notice nothing", "you are unaware"],
		permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
		patterns: [
			/\byou notice nothing\b/,
			/\byou (do not|will not) notice\b/,
			/\byou (cannot|do not) notice (anything|what)\b/,
			/\bnothing (that happens|done) to you (matters|registers)\b/,
			/\byou are (unaware|oblivious)\b/,
		],
		run: () => {
			// Per-category permission AND depth, not the any-of gate above — see
			// reachableCategories for why depth is checked here a second time.
			const { applied } = reachableCategories(
				["suppressClothing", "suppressBondage", "suppressActivities"],
				getFeatures(),
			);
			if (applied.includes("suppressClothing")) setSuppressed("clothing", true);
			if (applied.includes("suppressBondage")) setSuppressed("bondage", true);
			if (applied.includes("suppressActivities")) setSuppressed("activity", true);
		},
	},
	// The touch pair and the numbness pair below say different things and were one entry
	// until v0.39.0. "Ignore my touches" is about ATTENTION — it reaches you, you do not
	// attend to it, and your arousal still climbs with no visible cause, which is the good
	// half of the mechanic. "You cannot feel my touch" is about SENSATION, and bundling the
	// two made it a lie: the subject was told she felt nothing while her own arousal meter
	// told her otherwise. Same class of bug as the illusion surviving "you notice
	// everything again" in v0.38.2 — a suggestion the subject can directly observe to be
	// false.
	//
	// Numbness sits under arousalControl rather than suppressActivities, per DW. Consenting
	// to "you may hide when I am touched" is not consenting to "my body may be made not to
	// respond", and the two are worth being asked separately.
	{
		id: "touch-release",
		examples: ["you notice my touches again", "you register my touch"],
		release: true,
		releaseOf: "touch-block",
		permission: "suppressActivities",
		// "You can notice my touch" used to be left out, because awareness-release's bare
		// /you (can|may) notice/ took it first. That pattern was narrowed in v0.82.0 (it was
		// also taking ordinary patter), so the obvious phrasing lives here now.
		patterns: [
			/\byou (can|may) (notice|register) (my|his|her|their) (touch|touches)\b/,
			/\byou notice (my|his|her|their) (touch|touches) again\b/,
			/\byou (notice|register) (my|his|her|their) (touch|touches)\b/,
			/\byou (will |)stop ignoring (my|his|her|their) (touch|touches)\b/,
		],
		run: () => setSuppressed("activity", false),
	},
	{
		id: "touch-block",
		examples: ["you will ignore my touches"],
		permission: "suppressActivities",
		patterns: [
			/\byou (will |)ignore (my|his|her|their) (touch|touches)\b/,
			/\bignore (my|his|her|their) (touch|touches)\b/,
		],
		run: () => setSuppressed("activity", true),
		undo: () => setSuppressed("activity", false),
	},
	{
		id: "numb-release",
		examples: ["you can feel my touch again", "you can feel again"],
		release: true,
		releaseOf: "numb-block",
		permission: "arousalControl",
		patterns: [
			/\byou (can|may) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\byou feel (my|his|her|their) (touch|touches) again\b/,
			/\byou (can|may) feel (me|it|again|things again|everything again)\b/,
			/\byour (skin|body) (responds|reacts|works|feels)( again)?\b/,
			/\byou are not numb\b/,
			/\btouch reaches you again\b/,
		],
		// Generous, like every release: this also lifts the message-hiding above. Being told
		// you can feel someone's touch again while the touches are still being hidden from
		// you leaves the subject in a state the words deny — and handing something back is
		// always allowed to undo more than taking it away applies.
		run: () => {
			setNumb(false);
			setSuppressed("activity", false);
		},
	},
	{
		id: "numb-block",
		examples: ["you cannot feel my touch", "you feel nothing when I touch you"],
		permission: "arousalControl",
		patterns: [
			/\byou (cannot|do not) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\b(my|his|her|their) (touch|touches) (do not|does not) reach you\b/,
			/\byou (cannot|do not) feel (me|my hands|anything|it)\b/,
			/\byou feel nothing\b/,
			/\byou (are|go) numb\b/,
			/\byour (skin|body) (cannot|does not) feel\b/,
			/\btouch (cannot|does not) reach you\b/,
		],
		run: () => setNumb(true),
		undo: () => setNumb(false),
	},
	{
		id: "speech-release",
		examples: ["you can speak again", "your voice is back"],
		release: true,
		releaseOf: "speech-block",
		permission: "speechRestriction",
		patterns: [
			/\byou (can|may) (speak|talk)\b/,
			/\byou are (free|able|allowed) to (speak|talk)\b/,
			/\byour voice (is back|returns|is yours)\b/,
			/\b(speak|talk) (again|freely)\b/,
			/\byou have your voice back\b/,
		],
		run: () => setSpeechBlocked(false),
	},
	{
		id: "speech-block",
		examples: ["you cannot speak", "stay silent", "not a word"],
		permission: "speechRestriction",
		patterns: [
			/\byou cannot (\w+ )?(speak|talk)\b/,
			/\byou are (unable|not able) to (speak|talk)\b/,
			/\b(do not|never) (speak|talk)\b/,
			/\byou have (no voice|lost your voice)\b/,
			/\byour voice is gone\b/,
			/\b(stay|remain|be) (silent|quiet)\b/,
			/\bnot a (word|sound)\b/,
			/\byou have forgotten how to (speak|talk)\b/,
			/\byou will (not be able|be unable) to (speak|talk)\b/,
			/\byou will not (speak|talk)\b/,
			/(?<!\bi )(?<!\bwe )\bsilence\b/,
		],
		run: () => setSpeechBlocked(true),
		undo: () => setSpeechBlocked(false),
	},
	...POSE_SUGGESTIONS,
	{
		id: "stand",
		examples: ["stand", "get up", "on your feet"],
		release: true,
		releaseOf: STANCE_IDS,
		permission: "postureControl",
		// Bare "stand" and "rise" are matched now that a suggestion also has to name the
		// subject — that gate does most of the false-positive work, so these no longer have
		// to be excluded wholesale. The narrow guards that remain cover what the name gate
		// doesn't: "I can't stand it, Missy" (normalised to "cannot stand") and the
		// hypnotist narrating themselves ("I stand beside you, Missy").
		patterns: [
			/(?<!cannot )(?<!\bi )(?<!\bwe )\bstand\b/,
			/(?<!\bi )(?<!\bwe )\brise\b/,
			/(?<!\bto )(?<!\bi )(?<!\bwe )\bget up\b/,
			/\b(get|rise) to your feet\b/,
			/\bon your feet\b/,
		],
		// Clears the legs only now: "stand" no longer drops arms held behind the back.
		run: () => (setSuggestedPose(null, "stance") ? undefined : "pose-blocked"),
	},
	{
		id: "kneel",
		examples: ["kneel", "on your knees"],
		permission: "postureControl",
		// Guarded so the hypnotist narrating their own action ("I kneel beside you") doesn't
		// put the subject on the floor. "I want you to kneel" still lands — the guard is on
		// the pronoun immediately before the verb, not anywhere in the line.
		patterns: [
			/(?<!\bi )(?<!\bwe )\bkneel\b/,
			/\b(get|down|drop) on your knees\b/,
			/\bon your knees\b/,
			/\bdrop to your knees\b/,
		],
		run: () => applyPose("Kneel"),
		undo: () => clearSuggestedPose("stance", "Kneel"),
	},
];

// --- Entry point ---------------------------------------------------------------------

/** A line the speaker is plainly saying about themselves, not to the subject — "I need to
 * get up early". Cheap guard against ordinary conversation tripping a suggestion; the
 * presence of "you" anywhere is enough to treat the line as addressed outward again. */
function isSelfReferential(text: string): boolean {
	return /^(i|we)\b/.test(text) && !/\byou\b/.test(text);
}

/** Does this line address the subject by name? Required for any suggestion to land, so
 * that ordinary conversation — even conversation that happens to contain a trigger phrase —
 * stays inert unless the hypnotist deliberately names who they're talking to.
 *
 * Pure and name-injected rather than reading Player directly, so it can be tested. */
export function mentionsAnyName(content: string, names: string[]): boolean {
	const text = normalize(content);
	// Normalising the names the same way means punctuation and case can't cause a miss:
	// "Missy," and "MISSY" both reduce to the same thing the text did.
	const cleaned = names.map((n) => normalize(String(n ?? ""))).filter((n) => n.length > 0);
	// No usable name to check against → refuse rather than fall open. A name gate that
	// silently stops gating is worse than one that stops working.
	if (cleaned.length === 0) return false;
	return cleaned.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
}

/** The names the subject answers to. Nickname included because that's what BC shows other
 * players when it's set, so it's what a hypnotist would naturally type. */
export function playerOwnNames(): string[] {
	return [Player?.Name, Player?.Nickname].filter(Boolean) as string[];
}

// --- Addressee scoping ---------------------------------------------------------------
// The name gate above answers "is my name anywhere in this line". That was enough while a
// hypnotist only ever worked on one person, and wrong the moment they worked on two: for
// "Missy, cum. Ella, kneel." BOTH clients saw their own name, BOTH fed the WHOLE line to the
// matcher, and the matcher returned whichever entry sits earlier in SUGGESTIONS — so both
// subjects did the same thing and one of the two commands was simply lost. (DW, 2026-09-21.)
//
// The fix is to work out WHICH PART of the line is addressed to us before any matcher reads
// it. Everything here runs on the SUBJECT's own client off the room roster, which the BC
// server gives us directly — the hypnotist's client is not consulted and cannot assert who
// they meant, so rule 1 is untouched.
//
// Deliberately conservative: scoping only engages when the line names SOMEONE ELSE IN THE
// ROOM in vocative position. A line naming nobody but us is passed through byte-for-byte, so
// every single-subject phrasing behaves exactly as it did before this existed.

/** Words that can sit in front of a vocative without being part of the command. Kept short
 * on purpose — a long list is a long list of ways to swallow a real word. */
const VOCATIVE_FILLER = new Set(["ok", "okay", "now", "so", "hey", "hi", "well", "alright", "right", "but", "and", "then", "please", "listen"]);

/** Clause boundaries. "and"/"then" are in here because "Missy kneel and Ella stand" is a
 * perfectly ordinary way to type two commands, and a comma is not guaranteed. Splitting on
 * them is safe because segments belonging to the same person are rejoined afterwards.
 *
 * A LINE BREAK is a boundary too. BC carries newlines through inside one chat message, and
 * one subject per line is the obvious way to type a combo command:
 *
 *     Missy, kneel
 *     Natalia, cum for me
 *
 * Leaving `\n` out of this list was the whole reason v0.79.0 did not fix DW's case — the two
 * commands stayed welded into a single clause, the second name never landed in a vocative
 * position, and the line fell through unscoped. */
const CLAUSE_SPLIT = /[,;.!?:\n\r]+|\band\b|\bthen\b/i;

/** Words that make the name after them an OBJECT rather than an addressee. "Missy, look at
 * Ella" is one instruction to Missy; "Missy, kneel Natalia, cum for me" is two instructions to
 * two people. The difference is entirely the word in front of the name, so that is what is
 * checked — nothing here needs to understand either sentence.
 *
 * Kept to prepositions and comparatives, which is what actually precedes a name being talked
 * ABOUT. A verb in front of a name ("kneel Natalia") reads as the end of one order and the
 * start of the next. */
const OBJECT_MARKERS = new Set([
	"at", "to", "with", "about", "like", "for", "from", "of", "on", "near", "beside", "behind",
	"toward", "towards", "into", "onto", "against", "between", "around", "over", "under", "by",
	"as", "than", "or", "nor", "past", "beyond", "beneath", "above", "below", "off", "through",
]);

/** Activity verbs, which take a PERSON as their object (v0.84.0). "Missy, kiss Rei" is one
 * order to Missy with Rei as the thing kissed — without this set the name after the verb read
 * as the start of a new address, the line was cut to "Missy, kiss", and Rei vanished. Only
 * these verbs: "Natalia, stand Missy cum for me" must still split at Missy.
 *
 * KEEP IN STEP with ACTIVITY_VERBS below — the activity suite checks that every verb word
 * there is in here. */
export const OBJECT_VERBS = new Set([
	"grope", "squeeze", "fondle", "pinch", "spank", "smack", "slap", "scratch", "tickle", "pull",
	"tug", "choke", "massage", "knead", "nibble", "lick", "kiss", "suck", "bite", "pet", "finger",
	"masturbate", "pleasure", "caress", "stroke", "touch", "feel", "rub",
]);

const bareWord = (w: string) => w.replace(/[^A-Za-z]/g, "").toLowerCase();

interface Segment {
	/** Names used vocatively at the head of this segment, or the whole of it. */
	lead: string[];
	/** What is left once the vocative is taken off. Empty for a name-only segment. */
	body: string;
}

function splitSegments(content: string, known: Set<string>): Segment[] {
	const isName = (w: string) => known.has(bareWord(w));
	const isFiller = (w: string) => VOCATIVE_FILLER.has(bareWord(w));
	const out: Segment[] = [];
	for (const chunk of String(content ?? "").split(CLAUSE_SPLIT)) {
		const seg = chunk.trim();
		if (!seg) continue;
		let words = seg.split(/\s+/);
		// ONE CHUNK CAN HOLD MORE THAN ONE ADDRESS. Punctuation between two orders is not
		// guaranteed — "Natalia, stand Missy cum for me" has none at all between them — so a
		// name inside a chunk has to be able to start a new segment, not just a name at its
		// head. This loop peels off one addressed clause at a time.
		while (words.length) {
			let i = 0;
			while (i < words.length && isFiller(words[i])) i++;
			const lead: string[] = [];
			while (i < words.length && isName(words[i])) lead.push(bareWord(words[i++]));
			// Where does the NEXT address start? A name only counts when the word in front of
			// it is not an object marker, which is what keeps "look at Ella" one clause.
			let cut = -1;
			for (let j = i + 1; j < words.length; j++) {
				const before = bareWord(words[j - 1]);
				if (isName(words[j]) && !OBJECT_MARKERS.has(before) && !OBJECT_VERBS.has(before)) {
					cut = j;
					break;
				}
			}
			const end = cut === -1 ? words.length : cut;
			out.push({ lead, body: words.slice(i, end).join(" ") });
			if (cut === -1) break;
			words = words.slice(cut);
		}
	}
	return out;
}

export interface AddresseeScope {
	/** The part of the line meant for us, or null when none of it is. */
	text: string | null;
	/** True when the line named someone else and was actually cut down. */
	scoped: boolean;
	/** The line named several people and at least one clause could not be pinned to any of
	 * them. Refuse and say so rather than guess — a misdirected "cum" is not a small error. */
	ambiguous: boolean;
}

/** Cut `content` down to the clauses addressed to `mine`, given who else is in the room.
 *
 * Pure and name-injected, exactly like mentionsAnyName, so the whole decision table can be
 * exercised without a room, a session or the BC globals.
 *
 * The rules, in order:
 *   1. Nobody else named vocatively → the line is returned untouched. This is the common
 *      case and it is bit-for-bit what happened before addressee scoping existed.
 *   2. Someone else named, us not named at all → null. The line is not ours.
 *   3. We own one or more clauses → those clauses, rejoined.
 *   4. We were named but own nothing, or a clause floats with no addressee while several
 *      people are named → ambiguous. The caller refuses and tells the hypnotist.
 *
 * Rule 4 is the one that matters. It is what stops a room-mate whose name is an ordinary
 * word ("May", "Rose", "Grace") from silently eating a command meant for us: the worst case
 * becomes a refusal the hypnotist can read and retype, never a command landing on the wrong
 * person and never a command vanishing without a word. */
export function scopeToAddressee(content: string, mine: string[], others: string[]): AddresseeScope {
	const clean = (list: string[]) =>
		list.map((n) => bareWord(String(n ?? ""))).filter((n) => n.length > 0);
	const mineSet = new Set(clean(mine));
	const otherSet = new Set(clean(others));
	// Our own name always wins if somebody else in the room happens to share it — being
	// over-inclusive about ourselves can only cause a line to be READ, never misdirected.
	for (const n of mineSet) otherSet.delete(n);
	// No usable name for ourselves means the name gate is already going to refuse; there is
	// nothing to scope against, so hand the line back and let that gate do its job.
	if (mineSet.size === 0 || otherSet.size === 0) return { text: content, scoped: false, ambiguous: false };

	const known = new Set([...mineSet, ...otherSet]);
	const segments = splitSegments(content, known);
	const namedOther = segments.some((s) => s.lead.some((n) => otherSet.has(n)));
	if (!namedOther) return { text: content, scoped: false, ambiguous: false };

	let current: string[] = [];
	let prevWasVocative = false;
	let namedMe = false;
	const owned: { owner: string[]; body: string }[] = [];
	// Clauses seen before anyone was named, waiting for a vocative to close them — the
	// "you cannot move, Missy" shape, where the address comes after the command.
	let pending: { owner: string[]; body: string }[] = [];
	// The run a post-positioned vocative just claimed, so "you cannot move, Missy and Ella"
	// reaches both rather than only the first name.
	let justClaimed: { owner: string[]; body: string }[] = [];
	for (const seg of segments) {
		if (seg.lead.some((n) => mineSet.has(n))) namedMe = true;
		if (!seg.body) {
			if (pending.length) {
				// Post-positioned: it closes the clauses behind it rather than opening new
				// ones, so `current` is cleared and the next clause waits for its own name.
				for (const p of pending) p.owner = [...seg.lead];
				justClaimed = pending;
				pending = [];
				current = [];
			} else if (prevWasVocative && justClaimed.length) {
				for (const p of justClaimed) p.owner = [...p.owner, ...seg.lead];
			} else {
				// Consecutive pure vocatives accumulate, so "Missy and Ella, you cannot move"
				// addresses both rather than only the last one named.
				current = prevWasVocative ? [...current, ...seg.lead] : seg.lead;
				justClaimed = [];
			}
			prevWasVocative = true;
			continue;
		}
		prevWasVocative = false;
		justClaimed = [];
		if (seg.lead.length) current = seg.lead;
		const entry = { owner: [...current], body: seg.body };
		owned.push(entry);
		if (!current.length) pending.push(entry);
	}

	const floating = owned.some((o) => o.owner.length === 0);
	const forMe = owned.filter((o) => o.owner.some((n) => mineSet.has(n)));
	if (floating) return { text: null, scoped: true, ambiguous: true };
	if (forMe.length) {
		// Put our name back on the front. Every handler downstream still runs the ordinary
		// name gate on the text it is given, and stripping the vocative out would make all
		// eight of them refuse a command that was addressed to us perfectly clearly. The
		// original spelling is reused rather than the folded one, so a name carrying digits
		// or punctuation still matches the gate's own normalisation.
		const spoken = mine.map(String).find((n) => mineSet.has(bareWord(n))) ?? "";
		const body = forMe.map((o) => o.body).join(". ");
		return { text: `${spoken}, ${body}`.trim(), scoped: true, ambiguous: false };
	}
	// Named us and gave us nothing: either the hypnotist mistyped, or a room-mate's name
	// swallowed our clause. Either way we refuse out loud instead of guessing.
	if (namedMe) return { text: null, scoped: true, ambiguous: true };
	return { text: null, scoped: true, ambiguous: false };
}

/** The names of everyone else in the room, for scopeToAddressee. Read off BC's own roster on
 * OUR client — never off anything the speaker sent.
 *
 * `speaker` is excluded: people do not address themselves, and counting the hypnotist's own
 * name as a vocative would only invent clause boundaries that were never meant. */
export function otherRoomNames(speaker: number): string[] {
	const mine = new Set(playerOwnNames().map((n) => bareWord(n)));
	const roster = Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
	const names: string[] = [];
	for (const c of roster as any[]) {
		if (!c || c.MemberNumber === Player?.MemberNumber || c.MemberNumber === speaker) continue;
		for (const n of [c.Name, c.Nickname]) {
			if (typeof n === "string" && n.trim() && !mine.has(bareWord(n))) names.push(n);
		}
	}
	return names;
}

/** The pure half of this module: text in, suggestion id out. Split from handleSpokenLine
 * so the pattern library can be exercised directly against a phrase list without needing a
 * live session, a chat room, or the BC globals. Deliberately does NOT apply the name gate —
 * /hypno match stays useful for checking a phrasing on its own. */
export function matchSuggestion(content: string): FlavorKey | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	for (const suggestion of SUGGESTIONS) {
		if (suggestion.unless?.some((p) => p.test(text))) continue;
		if (suggestion.patterns.some((p) => p.test(text))) return suggestion.id;
	}
	return null;
}

// --- Body-part commands --------------------------------------------------------------
// "You cannot touch your breasts" needs to capture WHICH part, so it can't be a fixed entry
// in SUGGESTIONS. Checked before that table, and deliberately falls through when the
// captured word isn't a known body part — which is what keeps "you cannot touch your
// clothes" reaching the clothing suggestion instead of being swallowed here.

interface BodyPartCommand {
	/** The word as spoken, reused in the flavor text. */
	word: string;
	groups: string[];
	block: boolean;
	/** "yourself" rather than a named part. */
	all: boolean;
}

const PART_BLOCK = [
	/\byou (?:cannot|will not|do not) touch your ([a-z]+)\b/,
	// Future phrasing, the natural way to say it while building a trigger. Without this,
	// "you will not be able to touch your breasts" matched nothing at all and looked like
	// the command had simply been ignored.
	/\byou will (?:not be able|be unable) to touch your ([a-z]+)\b/,
	/\b(?:do not|never) touch your ([a-z]+)\b/,
];
const PART_RELEASE = [
	/\byou (?:can|may) touch your ([a-z]+)\b/,
	/\byour ([a-z]+) (?:are|is) yours again\b/,
];
const SELF_BLOCK = [
	/\byou (?:cannot|will not|do not) touch yourself\b/,
	/\byou will (?:not be able|be unable) to touch yourself\b/,
	/\b(?:do not|never) touch yourself\b/,
];
const SELF_RELEASE = [/\byou (?:can|may) touch yourself\b/];

export function matchBodyPartCommand(content: string): BodyPartCommand | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;

	for (const re of SELF_RELEASE) if (re.test(text)) return { word: "yourself", groups: [], block: false, all: true };
	for (const re of SELF_BLOCK) if (re.test(text)) return { word: "yourself", groups: [], block: true, all: true };

	// Release before block, same reason as the main table: the phrasings overlap.
	for (const [patterns, block] of [
		[PART_RELEASE, false],
		[PART_BLOCK, true],
	] as [RegExp[], boolean][]) {
		for (const re of patterns) {
			const m = re.exec(text);
			const word = m?.[1];
			const groups = word ? BODY_PARTS[word] : undefined;
			// Unknown word (e.g. "clothes") — not a body part, let the main table have it.
			if (groups) return { word, groups, block, all: false };
		}
	}
	return null;
}

export interface SuggestionHelp {
	id: string;
	permission: string;
	examples: string[];
	/** What the help screen should SHOW — the merged slang form where one exists, otherwise the
	 * same as `examples`. The test still checks `examples`, so display can read however it likes. */
	display: string[];
	release: boolean;
	/** The tier this needs, as a label. Looked up from the permission rather than stored on
	 * the suggestion, so the help screen and the gate cannot disagree. */
	depthTier?: string;
}

/** The tier a suggestion needs, for the help screen. Releases are deliberately blank: a
 * release is never depth-gated, because handing something back must always be easier than
 * taking it away. */
function tierLabelFor(permission: keyof FeatureToggles | (keyof FeatureToggles)[]): string | undefined {
	const keys = Array.isArray(permission) ? permission : [permission];
	const tiers = keys.map((k) => requiredDepth(k));
	const shallowest = Math.min(...tiers);
	return Number.isFinite(shallowest) ? tierLabel(tierOf(shallowest)) : undefined;
}

/** The pattern library as the help screen sees it. Table order is already grouped by
 * feature, and each release sits next to the restriction it undoes, so the list needs no
 * sorting — it reads the way it was written. */
export function suggestionHelp(): SuggestionHelp[] {
	return SUGGESTIONS.map((s) => ({
		id: s.id,
		permission: Array.isArray(s.permission) ? s.permission.join(" / ") : String(s.permission),
		examples: s.examples,
		display: s.displayExamples ?? s.examples,
		release: !!s.release,
		depthTier: s.release ? undefined : tierLabelFor(s.permission),
	}));
}

/** Human-readable verdict on a phrase for /hypno match — reports the pattern result and
 * the name gate separately, since a phrase can match perfectly and still be ignored. */
export function describeMatch(content: string): string {
	const id = matchSuggestion(content);
	if (!id) return "no match";
	return mentionsAnyName(content, playerOwnNames())
		? `${id} — would fire`
		: `${id} — but your name isn't in the line, so it would be ignored`;
}

// --- Triggers ---------------------------------------------------------------------------
// Recording control phrases, and firing. See triggers.ts for the gates and why they differ
// from everything else.

const TRIGGER_START = [
	/\byour trigger (?:word|phrase) is (.+)$/,
	/\bthe trigger (?:word|phrase) is (.+)$/,
	/\byour (?:new )?trigger is (.+)$/,
	/\bwhen (?:i say|you hear) (.+)$/,
];
const TRIGGER_COMMIT = [/\bremember (?:the |this |that )?trigger\b/, /\bthe trigger is set\b/, /\block (?:it |that )?in\b/];
const TRIGGER_CANCEL = [/\b(?:forget|cancel|never mind|nevermind) (?:the |that |this )?trigger\b/];

/** Strip the subject's own name out of a captured phrase.
 *
 * Needed because the name gate requires the name SOMEWHERE in the line, and the phrase is
 * captured to end-of-line — so "your trigger word is sleepy, Missy" would otherwise store
 * the trigger as "sleepy missy" and never fire when the hypnotist just says "sleepy". */
function cleanPhrase(raw: string): string {
	let phrase = raw.trim();
	for (const name of playerOwnNames()) {
		const n = normalize(String(name));
		if (!n) continue;
		phrase = phrase.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), " ");
	}
	return phrase.replace(/\s+/g, " ").trim();
}

/** Should this line be hidden from the subject entirely?
 *
 * While a trigger is being planted, the hypnotist's setup lines name the phrase and each
 * suggestion in open chat — so a subject reading along learns their own trigger word and
 * exactly what it does, which defeats the point. With the Awareness toggle on, those lines
 * never render: you know something is being given, not what.
 *
 * Only the installer's lines, only during setup, and only what's actually part of it —
 * ordinary conversation in the middle of a session still comes through. */
export function isTriggerSetupLine(sender: number, content: string): boolean {
	if (!getFeatures().suppressTriggerSetup) return false;
	if (!isSessionActiveWith(sender)) return false;
	// Covers the opening line too, which arrives before recording is technically running.
	// Scoped the same way handleSpokenLine is, and for the same reason: this decides whether
	// to HIDE the line from the subject, so reading another subject's clause here would hide a
	// line that was never part of our setup at all.
	const line = scopeToAddressee(content, playerOwnNames(), otherRoomNames(sender)).text;
	if (line === null) return false;
	if (parseTriggerControl(line)) return true;
	if (!isRecording()) return false;
	return !!matchSuggestion(line) || !!matchBodyPartCommand(line) || !!matchActivityCommand(line);
}

export type TriggerControl = { kind: "start"; phrase: string } | { kind: "commit" } | { kind: "cancel" } | null;

/** The pure half of trigger-control parsing: text in, intent out. Split from the handler
 * so the phrase capture and name-stripping — the fiddly part — can be tested without a
 * live session, exactly like matchSuggestion. */
export function parseTriggerControl(content: string): TriggerControl {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	if (TRIGGER_CANCEL.some((p) => p.test(text))) return { kind: "cancel" };
	if (TRIGGER_COMMIT.some((p) => p.test(text))) return { kind: "commit" };
	for (const pattern of TRIGGER_START) {
		const match = pattern.exec(text);
		if (match) return { kind: "start", phrase: cleanPhrase(match[1]) };
	}
	return null;
}

/** Handle "your trigger word is X" / "remember trigger" / "forget the trigger".
 * Returns true if the line was one of these. */
function handleTriggerControl(sender: number, content: string): boolean {
	const parsed = parseTriggerControl(content);
	if (!parsed) return false;

	// Control phrases only work mid-trance, from our hypnotist, with our name — planting
	// something persistent shouldn't be reachable in ordinary conversation.
	if (!isSessionActiveWith(sender) || !mentionsAnyName(content, playerOwnNames())) return false;

	if (parsed.kind === "cancel") {
		if (isRecording()) {
			cancelRecording();
			tellPlayer("Whatever was being set aside comes apart again.");
		}
		return true;
	}
	if (parsed.kind === "commit") {
		if (!isRecording()) return false;
		const message = commitRecording(isTriggerInEffect);
		if (message) tellPlayer(message);
		return true;
	}
	// A start phrase while already recording RENAMES in place, keeping the actions; otherwise it
	// begins a new recording. Both re-check phrase uniqueness, and both are handed isTriggerInEffect
	// so a colliding trigger that is currently holding her can be refused — that check lives here.
	const character = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === sender);
	if (isRecording()) {
		renameRecording(sender, parsed.phrase, isTriggerInEffect);
		return true;
	}
	const line = beginRecording(sender, character?.Name ?? `#${sender}`, parsed.phrase, isTriggerInEffect);
	if (line) tellPlayer(line);
	return true;
}

/** Run a trigger's stored actions. Each one re-checks its own permission NOW, not when the
 * trigger was planted — revoking a permission has to disarm that part of every trigger. */
// Pacing a fired trigger's actions (DW, 2026-09-13). A trigger used to apply everything in one
// synchronous tick, so a multi-action trigger read as a pile-up — the body did them all at once.
// Now each action lands on its own jittered tick. 1.2s-2.0s per step: about as long as clicking
// an activity in BC takes, so it reads as a body doing something rather than a list draining;
// jittered so it is not a metronome. (This paces actions WITHIN a fired trigger; pacing successive
// LIVE commands is a separate, still-unbuilt piece — see design.md's "Commanded Activities —
// pacing".)
const TRIGGER_STEP_BASE_MS = 1200;
const TRIGGER_STEP_JITTER_MS = 800;

/** Apply an ordered list of trigger steps, one per paced tick. The first runs immediately so the
 * trigger feels responsive; the rest drain through a keyed timer, so a safeword / wake / hard
 * floor cancels a half-drained sequence (endSession and totalStop both call clearAllTimers)
 * rather than leaving it running against a subject who is no longer under. Re-firing restarts it —
 * scheduleTimer replaces by key, so one trigger can never stack two drains. */
function drainTriggerSteps(trigger: Trigger, steps: (() => void)[]): void {
	if (!steps.length) return;
	steps[0]();
	if (steps.length === 1) return;
	const key = `trigger-drain:${trigger.installedBy}:${trigger.phrase}`;
	let i = 1;
	const tick = () => {
		steps[i++]();
		if (i < steps.length) scheduleTimer(key, TRIGGER_STEP_BASE_MS + Math.random() * TRIGGER_STEP_JITTER_MS, tick);
	};
	scheduleTimer(key, TRIGGER_STEP_BASE_MS + Math.random() * TRIGGER_STEP_JITTER_MS, tick);
}

function fireTrigger(trigger: Trigger): void {
	if (!triggersArmed()) {
		log(`trigger "${trigger.phrase}" matched but triggers aren't armed`);
		return;
	}
	const features = getFeatures();
	// THE TRIGGER'S OWN STRENGTH IS THE DEPTH IT FIRES AT.
	//
	// The doc: "a trigger planted at Deep that has faded may only hit Yielding when it fires,
	// so depth-gated effects don't fully land." So a faded trigger is not refused wholesale —
	// its shallow actions still work and its deep ones stop, which is a far better mechanic
	// than an on/off switch and costs one argument.
	//
	// Note what this is NOT: the SESSION's depth, which is zero outside a trance and would
	// disarm every trigger ever planted. That mistake was made once already and caught by the
	// suite; the comment below about permission-not-depth still holds for the same reason.
	const strength = triggerStrength(trigger);
	if (strength < TRIGGER_GHOST_THRESHOLD) {
		// Far enough gone to be a feeling and nothing else. Deliberately still announced: the
		// subject feeling a pull they cannot name is the point, and silence here would make a
		// nearly-dead trigger indistinguishable from one that had already gone.
		log(`trigger "${trigger.phrase}" is a ghost at strength ${strength} — no actions`);
		announce("trigger-ghost");
		noteTriggerFired(trigger);
		return;
	}
	// Gate every action NOW (permission, strength), but defer its APPLICATION into a paced step
	// list. `holding` counts the restriction actions (blocks, suggestions) that grip the subject
	// and so arm the auto-release; a compel is a one-shot event and must NOT reach that machinery,
	// or a compel-only trigger would report itself as gripping her and refuse forgettrigger — so
	// it is counted apart.
	const steps: (() => void)[] = [];
	let holding = 0;
	let compels = 0;
	let tooWeak = 0;
	for (const id of trigger.actions) {
		// Body-part actions carry their parameter in the id ("touch:breasts"), since the
		// pattern library can't hold a per-part entry for all 26 of them.
		if (id.startsWith("touch:")) {
			if (!features.selfTouchControl) {
				log(`trigger "${trigger.phrase}": ${id} skipped, selfTouchControl not granted`);
				continue;
			}
			const word = id.slice("touch:".length);
			if (word !== "all" && !BODY_PARTS[word]) continue;
			holding++;
			steps.push(() => {
				if (word === "all") setAllSelfTouchBlocked(true);
				else setBodyPartBlocked(word, BODY_PARTS[word], true);
				// A trigger fires with no spoken instruction behind it, so the subject has no idea
				// which part was just closed off. Saying so would hand them what the trigger does.
				announce(word === "all" ? "selftouch-applied" : "restriction-settles");
			});
			continue;
		}
		// Compelled activities ("act:Caress:breasts") — a real BC activity the trigger makes the
		// subject perform on themselves. A one-shot event: undoTrigger no-ops it, like orgasm-force.
		if (id.startsWith("act:")) {
			if (!features.compelActivity) {
				log(`trigger "${trigger.phrase}": ${id} skipped, compelActivity not granted`);
				continue;
			}
			// Gated by the trigger's STRENGTH like the suggestion actions below, not by permission
			// alone — a faded trigger loses its compels along with everything else, rather than
			// firing them from a husk. (DW's call, 2026-09-15: compels behave like every other
			// action under decay.)
			if (!depthAllows("compelActivity", strength, strength)) {
				log(`trigger "${trigger.phrase}": ${id} too weak at ${strength}`);
				tooWeak++;
				continue;
			}
			compels++;
			// Re-validated on its OWN tick, not here: a restraint, a chastity belt, or an untick
			// can land during the pause between steps, and ActivityRun validates nothing.
			// runCommandedActivity re-reads ActivityAllowedForGroup (so a belt landing mid-drain
			// yields nothing), and the permission and our-vs-real freeze are re-checked here too.
			steps.push(() => {
				if (!getFeatures().compelActivity) {
					log(`trigger "${trigger.phrase}": ${id} dropped mid-pace — compelActivity revoked`);
					return;
				}
				if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
					log(`trigger "${trigger.phrase}": ${id} dropped mid-pace — a real restraint has them frozen`);
					return;
				}
				// No announce: ActivityRun renders the activity as a visible room message, so that
				// IS the feedback — a separate local line would double-tell the same thing.
				performActivityAction(id);
			});
			continue;
		}
		const suggestion = SUGGESTIONS.find((s) => s.id === id);
		if (!suggestion) continue;
		// PERMISSION re-checked at firing time, not depth. Revoking a permission disarms that
		// action of every trigger already planted — but a trigger fires with no trance behind
		// it, so asking how deep the subject is would refuse all of them forever. Depth was
		// asked and answered when the trigger was planted.
		const blocked = permissionReason(suggestion, features);
		if (blocked) {
			log(`trigger "${trigger.phrase}": ${id} skipped, ${blocked}`);
			continue;
		}
		// Both halves are the trigger's strength: what it was planted on is what it carries,
		// so there is no separate earned number to keep. A chemically seeded trigger is the
		// one case where that is generous — and it pays for the generosity in the fast decay
		// rate, which is the whole design of the tradeoff.
		if (!depthAllows(keyFor(suggestion, features), strength, strength)) {
			log(`trigger "${trigger.phrase}": ${id} too weak at ${strength}`);
			tooWeak++;
			continue;
		}
		holding++;
		steps.push(() => announce(suggestion.run() || suggestion.id));
	}
	log(
		`trigger "${trigger.phrase}" firing ${steps.length} step(s) — ${holding} holding, ${compels} compel — ` +
			`at strength ${strength}${tooWeak ? ` (${tooWeak} too weak)` : ""}`,
	);
	// Counted whether or not anything landed. A trigger that fired and reached nothing was
	// still USED, and passive reinforcement is about use rather than success.
	noteTriggerFired(trigger);
	// A holding action grips the subject, so it arms the auto-release even though it is applied on
	// a paced tick — the few seconds of drain is nothing against a release measured in minutes,
	// and a teardown clears the drain and the release together. A compel holds nothing.
	if (holding) {
		markActive(timerKey(trigger));
		scheduleAutoRelease(trigger);
		// Written down NOW. A trigger normally fires with no trance running, so no session
		// transition will ever save it, and a reload with nothing saved treats its Freeze as an
		// orphan and takes it off.
		saveForReconnect();
	}
	drainTriggerSteps(trigger, steps);
}

/** Which permission a suggestion is actually running under right now — the shallowest one
 * granted, matching what depthReason() does for spoken lines and what run() itself does. */
function keyFor(suggestion: Suggestion, features: FeatureToggles): keyof FeatureToggles {
	const keys = (Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission]).filter(
		(k) => features[k],
	);
	return keys[0] ?? (Array.isArray(suggestion.permission) ? suggestion.permission[0] : suggestion.permission);
}

// Releasing a trigger by name: "Missy, you are released from frozen".
//
// This exists so that general release wording doesn't have to work outside a trance. A
// trigger fires out of trance, so something must be able to undo it out of trance — but
// making every release phrase work there meant ordinary hypnosis wording kept operating on
// someone who wasn't under. Naming the trigger is narrow, needs knowledge of the phrase
// (which only the hypnotist has), and undoes exactly what that trigger applied.
const TRIGGER_RELEASE = [
	/\byou are released from (.+)$/,
	/\bi release you from (.+)$/,
	/\brelease (?:the )?trigger (.+)$/,
];

/** Reverse everything a trigger applied. Shared by the named release, the timer, and
 * anything else that needs to let go — one path, so they can't drift apart. */
function undoTrigger(trigger: Trigger): void {
	for (const id of trigger.actions) {
		if (id.startsWith("touch:")) {
			const word = id.slice("touch:".length);
			if (word === "all") setAllSelfTouchBlocked(false);
			else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], false);
			continue;
		}
		SUGGESTIONS.find((s) => s.id === id)?.undo?.();
	}
	cancelTimer(timerKey(trigger));
	clearActive(timerKey(trigger));
	// The other direction: a released trigger left in the saved copy would be put back on by
	// the next reload, restoring something that had already let go.
	saveForReconnect();
	log(`released trigger "${trigger.phrase}" (${trigger.actions.length} actions undone)`);
}

/** Is this trigger's grip currently on the subject? Read by `/hypno forgettrigger`, which
 * refuses while it is — you do not get to quietly delete the thing that is holding you.
 * The safeword is the way out of that, and saying so is the point. */
export function isTriggerInEffect(trigger: Trigger): boolean {
	return isActive(timerKey(trigger));
}

/** Should `/hypno triggers` print the phrases?
 *
 * Two ways to yes, and they are different in kind. The player's own **setting** is the
 * shipping answer — hidden by default, theirs to change. `full` is a **testing** argument that
 * only works while testing mode is live (the testing room); it is not a second setting and must
 * never become one, because an argument anybody can type is not a preference anybody chose.
 *
 * The testing gate is deliberately defeatable — a subject could name their own room the testing
 * room, the same objection that once ruled out gating this on room-admin. It is accepted for the
 * same reason it does not matter: like the setting, `full` only ever reveals the subject's OWN
 * trigger words to themselves, so the worst case is someone spoiling their own surprise, never
 * exposing them to anyone else. */
export function triggerPhrasesVisible(fullRequested: boolean): boolean {
	if (getFeatures().showTriggerWords) return true;
	return isTestingMode() && fullRequested;
}

/** The trigger list as the player sees it. Lives here rather than in commands.ts so the
 * suite can exercise the visibility rule without standing up the whole command layer —
 * this stopped being a formatting loop the moment it grew a decision. */
export function describeTriggerList(fullRequested: boolean): string[] {
	// Sweep the dead ones first, so the list never shows something that no longer works.
	// Reading the list is the natural moment for it — there is no tick we are guaranteed to
	// be present for, and a trigger currently holding the subject is spared until it lets go.
	pruneFadedTriggers(isTriggerInEffect);
	const all = listTriggers();
	if (!all.length) return ["no triggers planted"];
	const reveal = triggerPhrasesVisible(fullRequested);
	return all.map(
		(t, i) =>
			`${i + 1}. ${reveal ? `"${t.phrase}"` : "(phrase hidden)"} → ${t.actions.join(", ")}  ` +
			`(by ${t.installedByName}, ${describeStrength(t)})` +
			`${isTriggerInEffect(t) ? "  ** HOLDING YOU NOW **" : ""}`,
	);
}

/** Keyed by installer AND phrase — two people can plant the same word, and one wearing
 * off must not cancel the other's. */
function timerKey(trigger: Trigger): string {
	return `trigger:${trigger.installedBy}:${trigger.phrase}`;
}

/** Let a fired trigger wear off on its own. Re-firing restarts the clock rather than
 * stacking a second timer — scheduleTimer replaces by key. */
function scheduleAutoRelease(trigger: Trigger): void {
	const minutes = getTriggerDuration();
	cancelTimer(timerKey(trigger));
	if (minutes <= 0) return; // 0 means it holds until released deliberately
	scheduleTimer(timerKey(trigger), minutes * 60_000, () => {
		undoTrigger(trigger);
		tellPlayer("Whatever was holding you loosens on its own.");
	});
	log(`trigger "${trigger.phrase}" will release itself in ${minutes} min`);
}

/** Undo everything a named trigger applied. Ungated beyond installer-only: undoing can
 * never harm the subject, and the safeword is the only other way out. */
function handleTriggerRelease(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;
	for (const pattern of TRIGGER_RELEASE) {
		const match = pattern.exec(text);
		if (!match) continue;
		const phrase = cleanPhrase(match[1]);
		const trigger = triggersReleasableBy(sender, phrase)[0];
		if (!trigger) {
			log(`release asked for "${phrase}" but no trigger of theirs matches`);
			return true;
		}
		undoTrigger(trigger);
		tellPlayer("Whatever was holding you lets go.");
		return true;
	}
	return false;
}

/** Returns true if a trigger fired on this line. */
// Formal reinforcement: "a brief re-induction by the original hypnotist resets the clock".
//
// Gated on a LIVE session with them, which is what a re-induction means — the subject went
// back under for it. Without that gate the phrase is a magic word any hypnotist could drop in
// passing to keep their work alive forever, which is precisely the plant-and-forget mechanic
// decay exists to replace.
const REINFORCE = [
	/\b(?:that|the|your) triggers? (?:will |)(?:holds?|stays?|remains?|settles? deeper)\b/,
	/\breinforce (?:that|the|your) triggers?\b/,
	/\b(?:that|the|your) triggers? (?:is|are) (?:stronger|deeper) now\b/,
	/\blet (?:that|the|your) triggers? (?:settle|sink) deeper\b/,
];

function handleReinforcement(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!REINFORCE.some((p) => p.test(text))) return false;
	if (!getFeatures().triggerControl) {
		tellHypnotist(sender, '[trigger] Refused — they have not enabled "Triggers".');
		return true;
	}
	// Reinforcing is not planting, so it does NOT ask for Deep again — it asks only that they
	// are actually under with you. Requiring the planting depth would mean a trigger could
	// only ever be maintained by repeating the hardest part of the work that made it.
	if (!isSessionActiveWith(sender)) {
		tellHypnotist(sender, "[trigger] Refused — reinforcing is a re-induction: they have to be under with you.");
		return true;
	}
	const count = reinforceTriggersBy(sender);
	if (!count) {
		tellHypnotist(sender, "[trigger] Nothing of yours is planted in them to reinforce.");
		return true;
	}
	tellHypnotist(sender, `[trigger] Reinforced ${count} trigger(s) back to full strength.`);
	announce("trigger-reinforced");
	return true;
}

function handleTriggerFiring(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text) return false;
	const matched = triggersFiredBy(sender, text);
	if (!matched.length) return false;
	// Don't double-fire while the installer already has us under and is speaking
	// suggestions directly — the words would land twice.
	for (const trigger of matched) {
		if (installerHasSession(trigger)) {
			log(`trigger "${trigger.phrase}" suppressed — installer already has a live session`);
			continue;
		}
		fireTrigger(trigger);
	}
	return true;
}

// --- Carry-forward -----------------------------------------------------------------
// "That will stay with you" keeps the suggestion just given; saying it again after another
// one keeps that too. See carry.ts for why it targets rather than sweeping.

const CARRY_LAST = [
	/\b(?:that|this|it) (?:will |)stays? with (?:you|her|him|them)\b/,
	/\byou will keep (?:that|this|it)\b/,
	/\b(?:that|this|it) (?:will |)(?:stay|stays|remain|remains) (?:with you )?(?:when|after) you wake\b/,
	/\byou will carry (?:that|this|it) with you\b/,
	/\b(?:that|this|it) (?:one |)stays\b/,
];
const CARRY_ALL = [
	/\ball of (?:this|that|it) (?:will |)stays? with you\b/,
	/\b(?:all|everything) (?:of it |)(?:will |)stays? with you\b/,
	/\byou will keep (?:all of |)(?:this|everything)\b/,
	/\beverything i (?:have |)told you stays\b/,
];
const CARRY_CANCEL = [
	/\b(?:this|that|it|none of it|nothing) will not stay with you\b/,
	/\bforget what i (?:said|told you)\b/,
	/\bnothing stays with you\b/,
];

/** Apply one action by id, covering both the suggestion table and the parameterised
 * body-part ids. Shared by carry's re-apply and its undo so the two cannot drift. */
function applyActionById(id: string): void {
	if (id.startsWith("touch:")) {
		const word = id.slice("touch:".length);
		if (word === "all") setAllSelfTouchBlocked(true);
		else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], true);
		return;
	}
	SUGGESTIONS.find((s) => s.id === id)?.run();
}

function undoActionById(id: string): void {
	if (id.startsWith("touch:")) {
		const word = id.slice("touch:".length);
		if (word === "all") setAllSelfTouchBlocked(false);
		else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], false);
		return;
	}
	SUGGESTIONS.find((s) => s.id === id)?.undo?.();
}

// Registered at module load: carry.ts needs these but importing voice.ts from it would be
// circular, so the dependency runs one way and the functions are handed over.
registerCarryHandlers(applyActionById, undoActionById);

// --- surviving a disconnect ---------------------------------------------------------------
// A trigger was never part of the session — the whole point of one is that it fires outside
// a trance — so a fired trigger with time left on it serves out the REMAINDER after a
// reconnect, regardless of the five-minute session window and regardless of whether the
// hypnotist ever comes back. Dropping and rejoining must not be a way to reset every clock
// currently holding you.
registerTriggerRecovery(
	() =>
		listTriggers()
			.filter((t) => isActive(timerKey(t)))
			.map((t) => ({ key: timerKey(t), actions: t.actions, until: timerDeadline(timerKey(t)) })),
	(saved: SavedTrigger) => {
		const trigger = listTriggers().find((t) => timerKey(t) === saved.key);
		if (!trigger) {
			log(`recovery: trigger ${saved.key} no longer exists, nothing to restore`);
			return;
		}
		for (const id of saved.actions) {
			try {
				applyActionById(id);
			} catch (err) {
				warn(`recovery: could not re-apply "${id}":`, err);
			}
		}
		markActive(saved.key);
		// until === 0 is the duration-0 case: applied, with no clock, until released deliberately.
		const remaining = saved.until ? saved.until - Date.now() : 0;
		if (remaining > 0) {
			scheduleTimer(saved.key, remaining, () => {
				undoTrigger(trigger);
				tellPlayer("Whatever was holding you loosens on its own.");
			});
		}
		// Re-saved, which also re-arms the heartbeat: otherwise the copy on disk is the one read
		// at startup and goes stale — a second reload after this trigger lets go would put it
		// back on again.
		saveForReconnect();
		log(
			`recovery: trigger "${trigger.phrase}" restored with ` +
				`${remaining > 0 ? `${Math.round(remaining / 60_000)} min left` : "no clock"}`,
		);
	},
);

/** Handle "that will stay with you" / "all of this stays with you" / "forget what I said".
 * Returns true if the line was one of them. Requires a live trance and the subject's name,
 * exactly like trigger setup — making something outlive a session should never be reachable
 * in ordinary conversation. */
function handleCarryControl(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;

	if (CARRY_CANCEL.some((p) => p.test(text))) {
		if (!isCarrierOf(sender)) return false;
		if (releaseCarried("the hypnotist took it back")) {
			tellPlayer("Whatever was going to stay with you doesn't.");
		}
		return true;
	}

	// All-of-it is checked first: "all of this stays with you" also matches the narrower
	// "this stays" pattern, and the broader reading has to win its own wording.
	const all = CARRY_ALL.some((p) => p.test(text));
	if (!all && !CARRY_LAST.some((p) => p.test(text))) return false;
	if (!isSessionActiveWith(sender) || !mentionsAnyName(content, playerOwnNames())) return false;

	const wanted = all ? appliedSuggestions() : lastApplied();

	const character = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === sender);
	const result = carryThese(sender, character?.Name ?? `#${sender}`, wanted);
	// The refusal goes to the HYPNOTIST, not the subject — same split as trigger setup, and
	// for the same reason: the subject learning "they aren't trusted enough yet" breaks the
	// fiction, while the hypnotist not learning it leaves them guessing.
	if (result.refusal) tellHypnotist(sender, `[carry] Refused — ${result.refusal}`);
	if (result.subject) tellPlayer(result.subject);
	return true;
}

// --- Wake ------------------------------------------------------------------------------
// Checked before everything else. Ending a trance answers to no permission — same
// principle as a remote release always being honored — so it doesn't belong in the
// permission-gated table, and it must not be shadowed by a suggestion that happens to
// share a word with it.

const WAKE_PATTERNS = [
	// Bare "wake" included: DW tried "Missy wake" and nothing happened. Guarded against
	// first-person the same way the other bare imperatives are.
	/(?<!\bi )(?<!\bwe )\bwake\b/,
	/\bwake up\b/,
	/\bwake now\b/,
	/\byou (?:are|will be) (?:wide )?awake\b/,
	/\byou (?:will |)wake (?:up )?(?:now|when|on)\b/,
	/\bawaken\b/,
	/\bcome back to me\b/,
	/\bcome out of (?:it|trance|the trance)\b/,
];

export function isWakeLine(content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;
	return WAKE_PATTERNS.some((p) => p.test(text));
}

// Walking trance — "walk with me" thins the veil and lifts the freeze without ending the
// trance; "be still" puts it back. ENTER phrases are checked before LEAVE, so
// "stay with me as you move" reads as entering rather than as the bare "stay" that leaves.
const WALK_ENTER_PATTERNS = [
	/\bwalk with me\b/,
	/\bcome (?:and )?walk with me\b/,
	/\b(?:stay|come) with me as you (?:move|walk)\b/,
	/\byou (?:can|may) (?:move|walk) (?:with me |)(?:but |and |)stay under\b/,
	/\byou (?:can|may) walk(?: with me)?\b/,
	/\bmove with me\b/,
	/\bon your feet\b/,
];
// Only ever consulted while already walking, so these can be the plain words for "stop" —
// outside walking trance they fall through to the movement suggestion instead.
const WALK_LEAVE_PATTERNS = [
	/\bbe still\b/,
	/\bbe frozen\b/,
	/\bstop\b/,
	/\b(?:stand|hold|stay) still\b/,
	/\bstay put\b/,
	/\bstillness\b/,
	/\bfreeze again\b/,
	/\bstay\b/,
];

/** Returns true if the line changed walking-trance mode and has been dealt with. */
function handleWalkingTrance(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;
	const wantsEnter = WALK_ENTER_PATTERNS.some((p) => p.test(text));
	// Leave phrases only mean "return to full trance" while walking; otherwise they belong to
	// the movement suggestion, and swallowing them here would stop an ordinary "stay still"
	// from ever freezing anyone.
	const wantsLeave = isWalkingTrance() && WALK_LEAVE_PATTERNS.some((p) => p.test(text));
	if (!wantsEnter && !wantsLeave) return false;
	if (!hasLiveSessionWith(sender)) {
		log(`heard a walking-trance line from ${sender} but they have no session with you`);
		return true;
	}
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard a walking-trance line from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	// Enter wins a tie: "stay with me as you move" contains "stay". It only does anything from a
	// full trance, so if we are already walking this falls through to leave, which is correct —
	// nothing about "walk with me" should re-freeze someone already walking.
	if (wantsEnter && !isWalkingTrance()) {
		if (!enterWalkingTrance()) log(`walking-trance enter from ${sender} ignored — not under`);
		return true;
	}
	leaveWalkingTrance();
	return true;
}

/** Returns true if the line was a wake-up keyword and has been dealt with. */
function handleWakeLine(sender: number, content: string): boolean {
	if (!isWakeLine(content)) return false;
	if (!hasLiveSessionWith(sender)) {
		log(`heard a wake keyword from ${sender} but they have no session with you`);
		return true;
	}
	// Named, like every other suggestion — otherwise "wake up" in ordinary room chat would
	// end someone's session from across the room.
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard a wake keyword from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	wakeByHypnotist(sender);
	return true;
}

/** Returns true if the line was a body-part command and has been dealt with. */
function handleBodyPartLine(sender: number, content: string): boolean {
	const cmd = matchBodyPartCommand(content);
	if (!cmd) return false;
	const label = cmd.all ? "self-touch" : `touch:${cmd.word}`;
	if (!isSessionActiveWith(sender)) {
		log(`heard "${label}" from ${sender} but no active session with them — ignoring`);
		return true;
	}
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard "${label}" from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	const features = getFeatures();
	if (!features.hypnoEnabled || !features.selfTouchControl) {
		log(`heard "${label}" from ${sender} but selfTouchControl isn't granted`);
		return true;
	}
	// Recordable into a trigger like any other suggestion. These take a different code
	// path because they carry a parameter, and that's exactly why they were silently
	// executing instead of being captured while a trigger was being built.
	const recorded = recordAction(cmd.all ? "touch:all" : `touch:${cmd.word}`);
	if (recorded) {
		tellPlayer(recorded);
		return true;
	}
	if (cmd.all) setAllSelfTouchBlocked(cmd.block);
	else setBodyPartBlocked(cmd.word, cmd.groups, cmd.block);
	const actionId = cmd.all ? "touch:all" : `touch:${cmd.word}`;
	if (cmd.block) {
		noteApplied(actionId);
	} else {
		noteReleased(actionId);
		dropCarried(actionId);
	}
	log(`${cmd.block ? "blocked" : "released"} ${label}`);
	if (!cmd.block) announce("selftouch-part-release");
	else if (cmd.all) announce("selftouch-applied");
	else announceBodyPartApplied(cmd.word);
	return true;
}

/** Called for every ordinary chat line we receive. Does nothing unless the speaker is the
 * person currently running a session on us. */
// --- Compelled activities (v0.72.0) ------------------------------------------------------
// "Missy, touch your breasts" makes the SUBJECT perform a real BC activity on themselves — run
// through ActivityRun so it renders in the room exactly like she clicked it, and validated with
// ActivityAllowedForGroup so anything impossible while bound/chaste/out-of-reach simply is not
// offered. One standardized grammar: <verb> your <part>. Learn "touch your breasts" and
// "pinch your nipples", "lick your thighs", "spank your bottom" all follow.
//
// The verb picks the BC activity; "your <part>" picks the zone, reusing BODY_PARTS. First match
// wins, so the specific verbs sit above the catch-all Caress. Bare "touch yourself" is handled
// separately (a random spot). No held-item activities here — those want a "with the <toy>"
// extension later.
export const ACTIVITY_VERBS: { activity: string; re: RegExp }[] = [
	{ activity: "Grope", re: /\b(?:grope|squeeze|fondle)\b/ },
	{ activity: "Pinch", re: /\bpinch\b/ },
	{ activity: "Spank", re: /\b(?:spank|smack)\b/ },
	{ activity: "Slap", re: /\bslap\b/ },
	{ activity: "Scratch", re: /\bscratch\b/ },
	{ activity: "Tickle", re: /\btickle\b/ },
	{ activity: "Pull", re: /\b(?:pull|tug)\b/ },
	{ activity: "Choke", re: /\bchoke\b/ },
	{ activity: "MassageHands", re: /\b(?:massage|knead)\b/ },
	{ activity: "Nibble", re: /\bnibble\b/ },
	{ activity: "Lick", re: /\blick\b/ },
	{ activity: "Kiss", re: /\bkiss\b/ },
	{ activity: "Suck", re: /\bsuck\b/ },
	{ activity: "Bite", re: /\bbite\b/ },
	{ activity: "Pet", re: /\bpet\b/ },
	{ activity: "MasturbateHand", re: /\b(?:finger|masturbate|pleasure|play with)\b/ },
	// The universal — Caress reaches almost every zone, so "touch your <anything>" lands.
	{ activity: "Caress", re: /\b(?:caress|stroke|touch|feel|rub)\b/ },
];
// A positive command never contains a negation; if one is present this is a block/stop, which
// the body-part handler (run earlier) owns. Guards against "do not touch your breasts" being
// read as a command to do it.
const COMMAND_NEGATION = /\b(?:not|never|cannot|can ?not|dont|do ?not|wont|will ?not|no longer|stop)\b/;
/** Bare self-pleasure with no part named — the obvious intent is the genitals. */
const GENITAL_SELF = /\b(?:finger|masturbate|pleasure|play with) yourself\b/;
/** Bare generic self-touch — too vague, so it wanders (see handleActivityCommand). */
const VAGUE_SELF = /\b(?:touch|feel|caress|stroke|rub|please) yourself\b/;

export type ActivityCommand =
	| { kind: "genital" }
	| { kind: "vague" }
	| { kind: "part"; activity: string; word: string };

/** Parse a compelled-activity command. Pure — no BC calls — so the grammar is unit-testable. */
export function matchActivityCommand(content: string): ActivityCommand | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text) || COMMAND_NEGATION.test(text)) return null;
	if (GENITAL_SELF.test(text)) return { kind: "genital" };
	if (VAGUE_SELF.test(text)) return { kind: "vague" };
	// Longest part word first, so "clitoris" is not shadowed by "clit" etc.
	const words = Object.keys(BODY_PARTS).sort((a, b) => b.length - a.length);
	for (const v of ACTIVITY_VERBS) {
		if (!v.re.test(text)) continue;
		for (const word of words) {
			if (new RegExp(`\\byour ${word}\\b`).test(text)) return { kind: "part", activity: v.activity, word };
		}
	}
	return null;
}

/** The trigger-action id for a compelled-activity command — so "touch your breasts" can be
 * RECORDED into a trigger and replayed later, exactly as a body-part block records "touch:breasts".
 * The `act:` prefix keeps it distinct from those blocks; performActivityAction() reads it back. */
function activityActionId(cmd: ActivityCommand): string {
	if (cmd.kind === "vague") return "act:vague";
	if (cmd.kind === "genital") return "act:genital";
	return `act:${cmd.activity}:${cmd.word}`;
}

// Where a bare "touch yourself" may wander. The commonplace zones; the pick is filtered to what
// is actually reachable right now, so a bound subject's hands go somewhere they still can.
const VAGUE_ZONES = [
	"ItemBreast", "ItemButt", "ItemArms", "ItemLegs", "ItemTorso",
	"ItemNeck", "ItemHead", "ItemPelvis", "ItemHands", "ItemFeet", "ItemNipples",
];

/** A random reachable zone for a bare "touch yourself", or null if nothing is within reach —
 * filtered to where BC currently allows a Caress, so a bound subject's hands go somewhere they
 * still can. Shared by the live command and a fired trigger. */
function pickVagueZone(): string | null {
	const reachable = VAGUE_ZONES.filter((g) => {
		try {
			return (ActivityAllowedForGroup(Player, g) || []).some((a: any) => a?.Activity?.Name === "Caress");
		} catch {
			return false;
		}
	});
	return reachable.length ? reachable[Math.floor(Math.random() * reachable.length)] : null;
}

/** Perform `activityName` on the first of `groupNames` where BC currently allows it, as a
 * COMMANDED (involuntary) activity — the self-touch block stands aside, the physical filters do
 * not. Returns the group it landed on, or null if none were possible.
 *
 * `target` is who it lands ON (v0.84.0); the actor is always us. ActivityAllowedForGroup is
 * asked about THEIR zone, so BC reads their own synced arousal settings and our own reach,
 * hands and mouth — the same answer BC would give if the subject clicked them herself. We add
 * nothing to it and take nothing away. */
function runCommandedActivity(activityName: string, groupNames: string[], target: any = Player): string | null {
	const family = target?.AssetFamily ?? Player?.AssetFamily ?? "Female3DCG";
	for (const groupName of groupNames) {
		let allowed: any[] = [];
		try {
			allowed = ActivityAllowedForGroup(target, groupName) || [];
		} catch {
			allowed = [];
		}
		const itemActivity = allowed.find((a) => a?.Activity?.Name === activityName);
		if (!itemActivity) continue;
		const groupObj = typeof AssetGroupGet === "function" ? AssetGroupGet(family, groupName) : null;
		if (!groupObj) continue;
		try {
			beginCommandedActivity();
			ActivityRun(Player, target, groupObj, itemActivity);
		} finally {
			endCommandedActivity();
		}
		return groupName;
	}
	return null;
}

/** Replay a compelled-activity trigger action (an `act:` id from activityActionId). Returns
 * whether it landed. Used only by a FIRING trigger — the live command path builds its own cmd
 * and reports to the hypnotist; here there is no hypnotist to nudge, so a vague one just wanders
 * silently. The caller (fireTrigger) has already checked the permission and the freeze. */
function performActivityAction(id: string): boolean {
	if (id === "act:vague") {
		const zone = pickVagueZone();
		return zone ? runCommandedActivity("Caress", [zone]) != null : false;
	}
	if (id === "act:genital") return runCommandedActivity("MasturbateHand", ["ItemVulva"]) != null;
	const [, activity, word] = id.split(":");
	const groups = word ? BODY_PARTS[word] ?? [] : [];
	return activity && groups.length ? runCommandedActivity(activity, groups) != null : false;
}

/** Returns true if the line was a compelled-activity command and has been dealt with. */
function handleActivityCommand(sender: number, content: string): boolean {
	const cmd = matchActivityCommand(content);
	if (!cmd) return false;
	if (!isSessionActiveWith(sender)) {
		log(`heard an activity command from ${sender} but no active session with them`);
		return true;
	}
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard an activity command from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	const f = getFeatures();
	if (!f.hypnoEnabled || !f.compelActivity) {
		tellHypnotist(sender, '[command] Refused — they have not enabled "Made to act".');
		return true;
	}
	// Recordable into a trigger, captured not performed, while one is being built — the same
	// reason handleBodyPartLine records before it acts. Without this, "touch your breasts" said
	// during trigger setup fired the touch instead of joining the trigger (DW, 2026-09-13). After
	// the permission check (so recording needs "Made to act" like firing does) and before the
	// perform-time gates below, which are about doing it NOW, not planting it.
	const recorded = recordAction(activityActionId(cmd));
	if (recorded) {
		tellPlayer(recorded);
		return true;
	}
	const refusal = depthRefusal("compelActivity");
	if (refusal) {
		tellHypnotist(sender, `[command] Refused — ${refusal}.`);
		return true;
	}
	// Command always wins over OUR OWN spoken restrictions (DW, 2026-09-12). "You cannot move"
	// is a hypnotic freeze WE applied, and a commanded touch is involuntary — the hypnotist is
	// driving her hand — so it pierces our freeze exactly as it pierces the self-touch block.
	// A REAL restraint that freezes her (a heavy item) is physical and still stops her:
	// hasOwnEffect tells our freeze from a real one, and BC's ActivityAllowedForGroup filters
	// real bondage/chastity regardless of this check.
	if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
		tellHypnotist(sender, "[command] Refused — a restraint has them frozen; they cannot move to.");
		return true;
	}

	if (cmd.kind === "vague") return runVagueTouch(sender);
	const activity = cmd.kind === "genital" ? "MasturbateHand" : cmd.activity;
	const groups = cmd.kind === "genital" ? ["ItemVulva"] : BODY_PARTS[cmd.word] ?? [];
	const landed = runCommandedActivity(activity, groups);
	if (!landed) {
		tellHypnotist(sender, `[command] "${activity.toLowerCase()}" won't land there right now — bound, out of reach, or not somewhere it works.`);
		return true;
	}
	tellPlayer("Your body does it without waiting for you to decide.");
	return true;
}

/** Bare "touch yourself" — too generic, so the hands go somewhere at random, and the hypnotist
 * is quietly told it was vague (DW's call: it still happens, and it teaches specificity). */
function runVagueTouch(sender: number): boolean {
	const pick = pickVagueZone();
	if (!pick) {
		tellHypnotist(sender, "[command] Too vague — and nothing is within reach right now anyway.");
		return true;
	}
	const landed = runCommandedActivity("Caress", [pick]);
	tellHypnotist(sender, "[command] Too vague — her hands wander on their own. Name a part to steer them.");
	if (landed) tellPlayer("Your hands move on their own, with no place in mind.");
	return true;
}

// --- Commanded activities on OTHERS (v0.84.0) ---------------------------------------------
// "Missy, kiss Rei" · "Missy, pinch Rei's nipples" · "Missy, kiss me". The same verbs as the
// self grammar, aimed at somebody in the room. DW's calls, 2026-09-23:
//   - Names are EXACT: a room member's Name or Nickname, whole. No prefix, no fuzzy. A near
//     miss here would perform an intimate act on someone who was never named.
//   - "me" / "my" is whoever spoke the line — the hypnotist, by member number.
//   - No part named: a few verbs have one obvious spot (DEFAULT_PART). The rest ask.
//   - Aiming at the hypnotist rides on "Made to act". Anyone else also needs the subject's
//     "Made to touch others" (compelTouchOthers), off by default.
//   - The TARGET's consent is BC's: ActivityAllowedForGroup asked about their zone, which reads
//     their own synced settings, plus BC's item permission. We never widen it.
//   - Refusals: the hypnotist hears why when it is THEIR OWN body; for anyone else only "did
//     not land", so the command cannot be used to read a stranger's settings.
//   - Not recordable into a trigger yet (a separate piece of work).

/** Where a verb lands when no part is named. Only verbs with one obvious spot; the rest ask
 * rather than choose a place on somebody else's body. */
const DEFAULT_PART: Record<string, string> = { Kiss: "lips", Spank: "bottom", Pet: "head" };

export interface TargetedActivityCommand {
	activity: string;
	/** "me" for whoever spoke; otherwise the roster name as normalize() spells it. */
	target: string;
	/** The spoken part word, or null when none was named. */
	word: string | null;
	/** A part was named but is not one we know ("Rei's cheek"). Refused rather than read as no
	 * part at all, which would have sent the default — a kiss on the lips — somewhere else. */
	unknownPart?: string;
}

/** Parse "<verb> <Name>[’s <part>]", "<verb> <Name> on the <part>", "<verb> me [on my <part>]"
 * and "<verb> my <part>". `roster` is every name that may be aimed at — this is pure, so the
 * grammar is testable without a room. Longest name first, so "Rei Chan" is not read as "Rei". */
export function matchTargetedActivityCommand(content: string, roster: string[]): TargetedActivityCommand | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text) || COMMAND_NEGATION.test(text)) return null;
	const names = [...new Set(roster.map((n) => normalize(String(n ?? ""))).filter((n) => n && n !== "me" && n !== "my"))]
		.sort((a, b) => b.length - a.length);
	const part = `(${Object.keys(BODY_PARTS).sort((a, b) => b.length - a.length).join("|")})`;
	const hit = (rest: string, lead: string): { word: string | null; unknownPart?: string } | null => {
		// normalize() turns "Rei's" into "rei s", so the possessive is a bare "s" token.
		const m =
			new RegExp(`^${lead}(?: s)? ${part}\\b`).exec(rest) ??
			new RegExp(`^${lead} on (?:the|her|his|their|my) ${part}\\b`).exec(rest);
		if (m) return { word: m[1] };
		const other = new RegExp(`^${lead}(?: s| on (?:the|her|his|their|my)) ([a-z]+)`).exec(rest);
		if (other) return { word: null, unknownPart: other[1] };
		return new RegExp(`^${lead}\\b`).test(rest) ? { word: null } : null;
	};
	for (const v of ACTIVITY_VERBS) {
		for (const m of text.matchAll(new RegExp(`${v.re.source} (.+)$`, "g"))) {
			const rest = m[m.length - 1];
			// "feel my voice", "feel my hands on you" is ordinary patter, not an order to caress
			// the hypnotist — and a match here pre-empts every suggestion after it. So "feel" is
			// a self-only verb; touch, caress, stroke and rub still aim.
			if (/^feel\b/.test(m[0])) continue;
			// Only a KNOWN part after "my": "rub my back" falls through to the suggestion table
			// untouched rather than being claimed and refused.
			const mine = new RegExp(`^my ${part}\\b`).exec(rest);
			if (mine) return { activity: v.activity, target: "me", word: mine[1] };
			const me = hit(rest, "me");
			if (me) return { activity: v.activity, target: "me", ...me };
			for (const n of names) {
				const got = hit(rest, n);
				if (got) return { activity: v.activity, target: n, ...got };
			}
		}
	}
	return null;
}

/** Everyone in the room but us, off BC's own roster on OUR client. */
function roomOthers(): any[] {
	const roster = Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
	return (roster as any[]).filter((c) => c?.MemberNumber && c.MemberNumber !== Player?.MemberNumber);
}

const namesOf = (c: any): string[] => [c?.Name, c?.Nickname].filter((n) => typeof n === "string" && n.trim());

/** BC's item permission — may WE use items on them. Only an explicit false blocks, so a BC
 * that lacks the function, or answers something unexpected, leaves the decision to
 * ActivityAllowedForGroup rather than silently switching the feature off.
 *
 * UNVERIFIED against BC source (unreachable from where this was written): that
 * ServerChatRoomGetAllowItem(source, target) exists with this shape, and whether BC itself
 * gates ACTIVITIES on item permission at all. Honouring it can only refuse more, never less,
 * which is the side DW asked to err on ("any limitations will stop me"). */
function itemPermissionBlocks(target: any): boolean {
	try {
		if (typeof ServerChatRoomGetAllowItem === "function") return ServerChatRoomGetAllowItem(Player, target) === false;
	} catch {
		/* fall through to the synced flag */
	}
	return target?.AllowItem === false;
}

/** Why a touch on the HYPNOTIST's own body did not land, in terms of their own settings. Only
 * ever called for the hypnotist — never for a third party (see the header above). Names a cause
 * only where one is positively identified; otherwise lists where to look, rather than guess. */
function ownRefusalReason(hyp: any, word: string, groups: string[]): string {
	if (itemPermissionBlocks(hyp))
		return "your BC item permissions don't let them use items on you. Whitelist them, or lower your item permission";
	if (hyp?.ArousalSettings?.Active === "Inactive")
		return "your BC arousal preference is set to Inactive, which turns activities on you off";
	if (typeof PreferenceGetArousalZone === "function") {
		try {
			const closed = groups.every((g) => (PreferenceGetArousalZone(hyp, g)?.Factor ?? 1) <= 0);
			if (closed) return `your BC arousal zones have your ${word} set to no`;
		} catch {
			/* fall through to the general answer */
		}
	}
	return (
		"something blocks it in BC — your arousal settings for that activity or zone, or they " +
		"cannot reach (gagged, hands bound, too far away)"
	);
}

/** Returns true if the line was an activity command aimed at someone else, and has been dealt
 * with. Runs before the self grammar; a line with "your <part>" never matches here. */
function handleTargetedActivityCommand(sender: number, content: string): boolean {
	const roster = roomOthers();
	const cmd = matchTargetedActivityCommand(content, roster.flatMap(namesOf));
	if (!cmd) return false;
	if (!isSessionActiveWith(sender)) {
		log(`heard a targeted activity command from ${sender} but no active session with them`);
		return true;
	}
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard a targeted activity command from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	const f = getFeatures();
	if (!f.hypnoEnabled || !f.compelActivity) {
		tellHypnotist(sender, '[command] Refused — they have not enabled "Made to act".');
		return true;
	}
	let target: any;
	if (cmd.target === "me") {
		target = roster.find((c) => c.MemberNumber === sender);
	} else {
		const hits = roster.filter((c) => namesOf(c).some((n) => normalize(n) === cmd.target));
		if (hits.length > 1) {
			tellHypnotist(sender, `[command] Refused — more than one person here answers to "${cmd.target}". I won't guess which.`);
			return true;
		}
		target = hits[0];
	}
	if (!target) {
		tellHypnotist(sender, "[command] Refused — I can't find who that's aimed at in the room.");
		return true;
	}
	const onHypnotist = target.MemberNumber === sender;
	const verb = cmd.activity === "MasturbateHand" ? "finger" : cmd.activity.toLowerCase();
	if (!onHypnotist && !f.compelTouchOthers) {
		tellHypnotist(sender, '[command] Refused — they have not enabled "Made to touch others".');
		return true;
	}
	if (isRecording()) {
		tellHypnotist(sender, "[command] Not recorded — a trigger can't aim at a person yet, only at themselves.");
		return true;
	}
	const refusal = depthRefusal("compelActivity");
	if (refusal) {
		tellHypnotist(sender, `[command] Refused — ${refusal}.`);
		return true;
	}
	// Same rule as the self grammar: OUR freeze yields to a command, a real restraint does not.
	if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
		tellHypnotist(sender, "[command] Refused — a restraint has them frozen; they cannot move to.");
		return true;
	}
	if (cmd.unknownPart) {
		tellHypnotist(sender, `[command] I don't know "${cmd.unknownPart}" as a body part, so nothing happened.`);
		return true;
	}
	const word = cmd.word ?? DEFAULT_PART[cmd.activity] ?? null;
	if (!word) {
		const who = onHypnotist ? "my" : `${cmd.target}'s`;
		tellHypnotist(sender, `[command] Name a part — "${verb}" has no obvious spot. For example: "${verb} ${who} arms".`);
		return true;
	}
	const groups = BODY_PARTS[word] ?? [];
	const landed = itemPermissionBlocks(target) ? null : runCommandedActivity(cmd.activity, groups, target);
	if (!landed) {
		if (onHypnotist) tellHypnotist(sender, `[command] "${verb}" didn't land on you — ${ownRefusalReason(target, word, groups)}.`);
		else tellHypnotist(sender, `[command] "${verb}" didn't land.`);
		return true;
	}
	log(`commanded ${cmd.activity} on ${target.MemberNumber}'s ${landed}`);
	tellPlayer("Your body moves to them without waiting for you to decide.");
	return true;
}

export function handleSpokenLine(sender: number, content: string): void {
	// ADDRESSEE SCOPING, BEFORE ANY MATCHER READS THE LINE. "Missy, cum. Ella, kneel." used to
	// reach both clients whole: each saw its own name, each matched the whole line, and both
	// ran whichever suggestion sits earlier in SUGGESTIONS — so one command was lost and the
	// other landed on someone it was never meant for. `line` is the part addressed to us, with
	// our own name put back on the front so every name gate below still works unchanged.
	//
	// It only ever differs from `content` when the line named SOMEONE ELSE IN THE ROOM in
	// vocative position, so a one-subject scene sees byte-identical behaviour.
	const scope = scopeToAddressee(content, playerOwnNames(), otherRoomNames(sender));
	const line = scope.text;

	if (line !== null) {
		// Trigger control first, so "remember trigger" can't be read as anything else.
		if (handleTriggerControl(sender, line)) return;
		// Then carry control, before anything that could read "this will stay with you" as a
		// movement suggestion ("stay").
		if (handleCarryControl(sender, line)) return;
		// Then release-by-name, before firing — otherwise "you are released from frozen"
		// contains "frozen" and would set the trigger off instead of clearing it.
		if (handleTriggerRelease(sender, line)) return;
		// Reinforcement before firing: "let that trigger settle deeper" could otherwise contain a
		// planted word and set the thing off in the middle of maintaining it.
		if (handleReinforcement(sender, line)) return;
	}
	// Then firing — deliberately BEFORE the session gate below, since the whole point of a
	// trigger is that it works outside a trance.
	//
	// Firing reads the WHOLE line, not the scoped one, on purpose. A trigger phrase is a
	// keyword: it has never had a name gate, it fires from anyone the scope setting allows,
	// and it works in ordinary conversation. Cutting the line down first would add a name
	// requirement that was never part of the contract. Whether a shared phrase SHOULD still
	// fire for a subject the line didn't address is a separate question, left alone here.
	if (handleTriggerFiring(sender, content)) return;

	if (line === null) {
		if (scope.ambiguous) {
			// Rule 5: a refusal says so. Only to someone actually running a session on us,
			// though — otherwise every bystander who names two people gets nagged.
			if (isSessionActiveWith(sender))
				tellHypnotist(
					sender,
					"[command] That line named more than one person and it was not clear which part was meant for me. Give each subject their own line.",
				);
			log(`ambiguous multi-subject line from ${sender} — refusing rather than guessing which part is ours`);
		}
		return;
	}

	if (handleWakeLine(sender, line)) return;
	// After wake (so "come back to me" wakes rather than walks) and before the matcher (so the
	// leave phrases can pre-empt the movement suggestion while walking).
	if (handleWalkingTrance(sender, line)) return;
	if (handleBodyPartLine(sender, line)) return;
	// Positive activity COMMANDS ("touch your breasts") after the block/release handler above,
	// so "you cannot touch your breasts" stays a block, and before the table matcher, which does
	// not know these verbs.
	// Aimed at someone else first: "kiss Rei" never contains "your <part>", and "kiss your
	// lips" never names a room member, so the order only matters for being explicit.
	if (handleTargetedActivityCommand(sender, line)) return;
	if (handleActivityCommand(sender, line)) return;
	// Match BEFORE the session check, so a line that WOULD have done something can say why
	// it didn't. Checking the session first was silent — an unmatched line and a matched
	// line with no session looked identical from the outside, which is exactly the case
	// that needed telling apart.
	const id = matchSuggestion(line);
	if (!id) return;
	const suggestion = SUGGESTIONS.find((s) => s.id === id);
	if (!suggestion) return;

	// EVERY suggestion needs a live trance, releases included. Letting releases through
	// outside one was too broad a fix for a narrow problem: it meant ordinary hypnosis
	// wording kept working on someone who wasn't under. Undoing what a trigger did is
	// handled by its own targeted phrase instead — "you are released from <trigger>".
	// A release of something CARRIED works outside a trance, from the person who carried it
	// and only while they still have it. Deliberately this narrow: a blanket
	// releases-work-anywhere rule was tried for triggers and had to be reverted, because it
	// left ordinary hypnosis wording operating on people who weren't under.
	const carriedRelease =
		!!suggestion.release &&
		!!suggestion.releaseOf &&
		isCarrierOf(sender) &&
		releasesOf(suggestion).some(isCarried);
	if (!isSessionActiveWith(sender) && !carriedRelease) {
		log(`heard "${id}" from ${sender} but no active session with them — ignoring`);
		return;
	}

	if (!mentionsAnyName(line, playerOwnNames())) {
		log(`heard "${id}" from ${sender} but they didn't say your name — ignoring`);
		return;
	}

	const features = getFeatures();
	// Permission and trust gate restrictions, not releases — a revoked permission should
	// never leave an already-applied effect stuck on.
	const blocked = blockedReason(suggestion, sender, features);
	if (blocked) {
		log(`heard "${id}" from ${sender} but ${blocked}`);
		// TELL THE HYPNOTIST. This was console-only, and the silence cost a whole test run:
		// the depth-arousal scenario refused the illusion exactly as designed and reported
		// nothing, so the run could not be graded and the correct behaviour read as a bug.
		// Planting a trigger already answered this way — it was only ordinary suggestions
		// that vanished.
		//
		// It is not just a testing affordance either. A hypnotist saying something that does
		// nothing, with no feedback at all, cannot tell a refusal from a typo. Nothing new is
		// disclosed: the remote panel already shows which features are granted, and trigger
		// refusals already name the depth and the earned rule in these words.
		tellHypnotist(sender, `[suggestion] Refused — "${suggestion.id}" ${blocked}.`);
		return;
	}
	// While recording a trigger, suggestions are stored rather than performed — otherwise
	// building a "you cannot move" trigger freezes the subject mid-setup, and the
	// hypnotist has to undo it before they can carry on.
	const recorded = recordAction(id);
	if (recorded) {
		tellPlayer(recorded);
		return;
	}
	log(`matched suggestion "${id}" in: ${line}`);
	// MATCHED, PERMITTED, DEEP ENOUGH — AND STILL DIDN'T HAPPEN is its own outcome, and until
	// now the only outcome with nowhere to be reported. A refusal reaches the hypnotist and a
	// success is visible; this third case narrated itself to the room and said nothing else.
	//
	// It cost a whole test run: "take something off" was refused five times because a freeze
	// was holding her hands, the emote said so, and the hypnotist's client showed nothing at
	// all — so the log recorded five commands and no results, and the failure could not be
	// diagnosed from either end.
	//
	// run() returning a key OTHER than the suggestion's own id is exactly this case, and that
	// is why it returns a key rather than a boolean.
	const outcome = suggestion.run() || id;
	if (outcome !== id) tellHypnotist(sender, `[suggestion] "${id}" matched but did not land: ${outcome}.`);
	// A PARTIAL SUCCESS IS ITS OWN OUTCOME TOO. The broad awareness line applies whichever of
	// its three categories are permitted and deep enough, and used to say nothing about the
	// rest — so a hypnotist who said "you will not notice" with only touches ticked was told
	// nothing, and read the clothing change she then noticed as a bug. Rule 5: the hypnotist
	// learns what took and what did not, in the same words a refusal would have used.
	if (Array.isArray(suggestion.permission) && !suggestion.release) {
		const { applied, skipped } = reachableCategories(suggestion.permission, features);
		if (skipped.length && applied.length) {
			const word = (k: keyof FeatureToggles) => CATEGORY_WORDS[k] ?? k;
			tellHypnotist(
				sender,
				`[suggestion] "${id}" took for ${applied.map(word).join(", ")}; ` +
					`not ${skipped.map((s) => `${word(s.key)} (${s.why})`).join(", ")}.`,
			);
		}
	}
	announce(outcome);
	// Tracked AFTER it runs, so "that will stay with you" has something to point at. A
	// release both un-tracks the restriction and lets go of it if it was being carried.
	if (suggestion.release) {
		for (const of of releasesOf(suggestion)) {
			noteReleased(of);
			dropCarried(of);
		}
	} else {
		noteApplied(id);
	}
}
