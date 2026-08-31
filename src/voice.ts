import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose, setSpeechBlocked } from "./effects";
import { setSuppressed } from "./suppression";
import { BODY_PARTS, setBodyPartBlocked, setAllSelfTouchBlocked } from "./selftouch";
import { getFeatures, getTriggerDuration, FeatureToggles, Trigger } from "./storage";
import { accessFor, AccessCategory } from "./trust";
import { isSessionActiveWith, hasLiveSessionWith, wakeByHypnotist } from "./session";
import { flavor, bodyPartFlavor, announce, announceBodyPart, announceBodyPartApplied, FlavorKey } from "./flavor";
import { tellPlayer } from "./notify";
import { setArousalLevel, forceOrgasm, setOrgasmDenied, ArousalLevel } from "./arousal";
import { freezeAppearance, clearIllusion } from "./illusion";
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
import { scheduleTimer, cancelTimer, markActive, clearActive, isActive } from "./timers";
import {
	isRecording,
	cancelRecording,
	commitRecording,
	beginRecording,
	recordAction,
	triggersFiredBy,
	triggersReleasableBy,
	triggersArmed,
	installerHasSession,
	tellHypnotist,
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
	releaseOf?: FlavorKey;
	/** Reverses this suggestion. Used when a trigger is released by name — the release
	 * has to undo exactly what that trigger applied, not everything of that kind. */
	undo?: () => void;
	/** Wordings that land, for the help screen. Kept beside the patterns rather than in
	 * help.ts on purpose: a duplicated source of truth always eventually drifts, which is
	 * the same lesson the generated /hypno summary already learned. Every entry must have
	 * at least one, and it must be a phrase the patterns above actually match. */
	examples: string[];
	/** Minimum RELATIONSHIP trust to apply this, from the design doc's feature-threshold
	 * table. Deliberately not effectiveAccess(): the chemical floor is for session-only
	 * effects, and a threshold exists on a suggestion precisely because it is deeper than
	 * that. Omitted means the permission is the only gate, as it is for everything else. */
	trustThreshold?: number;
	/** Which access category the threshold is checked in — decides whether a BC
	 * relationship's floor may lift it. Defaults to "session"; the illusion is "deceptive",
	 * so only an owner's floor reaches it. */
	trustCategory?: AccessCategory;
	patterns: RegExp[];
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

function applyForcedOrgasm(): FlavorKey | void {
	const result = forceOrgasm();
	if (result === "unavailable") return "arousal-unavailable";
	// "denied" is BC's own refusal — our denial suggestion, an edging item, or a chastity
	// belt. Deliberately not distinguished any further: the subject shouldn't be told which
	// of those is holding them.
	if (result === "denied") return "orgasm-refused";
	// "already" means one is running; the ordinary flavor still reads correctly.
}

/** Why this suggestion cannot run for this speaker, or null if it can. Returns a reason
 * string rather than a boolean so the log can say which gate stopped it — the same
 * "a silent rejection is a bug in its own right" rule the rest of this file follows. */
function blockedReason(suggestion: Suggestion, speaker: number, features: FeatureToggles): string | null {
	if (suggestion.release) return null; // a revoked permission must never strand an effect
	if (!features.hypnoEnabled) return "hypnoEnabled is off";
	if (!permitted(suggestion, features)) return `${suggestion.permission} isn't granted`;
	if (suggestion.trustThreshold != null) {
		const access = accessFor(speaker, suggestion.trustCategory ?? "session");
		if (access < suggestion.trustThreshold)
			return `needs trust ${suggestion.trustThreshold}, at ${access.toFixed(1)}`;
	}
	return null;
}

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
		examples: ["you may come now", "you are allowed to orgasm"],
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
		run: () => setOrgasmDenied(false),
	},
	{
		id: "orgasm-deny",
		examples: ["you cannot come", "you are forbidden to come"],
		permission: "arousalControl",
		patterns: [
			/\byou (?:cannot|will not|may not) (?:come|cum|orgasm|climax|finish)\b/,
			/\byou are (?:not allowed|forbidden) to (?:come|cum|orgasm|climax|finish)\b/,
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
		examples: ["come for me", "you will come now"],
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
		// The design doc's feature-threshold table puts the clothing illusion at 70. This is
		// the first suggestion to carry one, and it is checked against relationship trust
		// alone — the arousal floor must never reach a feature that lies to someone about
		// their own state.
		trustThreshold: ILLUSION_TRUST_THRESHOLD,
		trustCategory: "deceptive",
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
			/\byou cannot (dress|undress|get dressed|get undressed)\b/,
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
			/\byou (can|may) notice\b/,
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
			// Per-category permission check, not the any-of gate above.
			const f = getFeatures();
			if (f.suppressClothing) setSuppressed("clothing", true);
			if (f.suppressBondage) setSuppressed("bondage", true);
			if (f.suppressActivities) setSuppressed("activity", true);
		},
	},
	{
		id: "touch-release",
		examples: ["you can feel my touch again"],
		release: true,
		releaseOf: "touch-block",
		permission: "suppressActivities",
		patterns: [
			/\byou (can|may) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\byou feel (my|his|her|their) (touch|touches) again\b/,
			/\byou (can|may) feel (me|it) again\b/,
			/\byou notice (my|his|her|their) (touch|touches) again\b/,
		],
		run: () => setSuppressed("activity", false),
	},
	{
		id: "touch-block",
		examples: ["you will ignore my touches", "you cannot feel my touch"],
		permission: "suppressActivities",
		patterns: [
			/\byou (will |)ignore (my|his|her|their) (touch|touches)\b/,
			/\bignore (my|his|her|their) (touch|touches)\b/,
			/\byou (cannot|do not) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\b(my|his|her|their) (touch|touches) (do not|does not) reach you\b/,
			/\byou (cannot|do not) feel (me|my hands)\b/,
		],
		run: () => setSuppressed("activity", true),
		undo: () => setSuppressed("activity", false),
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
	{
		id: "stand",
		examples: ["stand", "get up", "on your feet"],
		release: true,
		releaseOf: "kneel",
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
		run: () => setSuggestedPose(null),
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
		run: () => setSuggestedPose("Kneel"),
		undo: () => setSuggestedPose(null),
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

/** The pure half of this module: text in, suggestion id out. Split from handleSpokenLine
 * so the pattern library can be exercised directly against a phrase list without needing a
 * live session, a chat room, or the BC globals. Deliberately does NOT apply the name gate —
 * /hypno match stays useful for checking a phrasing on its own. */
export function matchSuggestion(content: string): FlavorKey | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	for (const suggestion of SUGGESTIONS) {
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
	release: boolean;
	trustThreshold?: number;
}

/** The pattern library as the help screen sees it. Table order is already grouped by
 * feature, and each release sits next to the restriction it undoes, so the list needs no
 * sorting — it reads the way it was written. */
export function suggestionHelp(): SuggestionHelp[] {
	return SUGGESTIONS.map((s) => ({
		id: s.id,
		permission: Array.isArray(s.permission) ? s.permission.join(" / ") : String(s.permission),
		examples: s.examples,
		release: !!s.release,
		trustThreshold: s.trustThreshold,
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
	if (parseTriggerControl(content)) return true;
	if (!isRecording()) return false;
	return !!matchSuggestion(content) || !!matchBodyPartCommand(content);
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
		const message = commitRecording();
		if (message) tellPlayer(message);
		return true;
	}
	const character = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === sender);
	tellPlayer(beginRecording(sender, character?.Name ?? `#${sender}`, parsed.phrase));
	return true;
}

/** Run a trigger's stored actions. Each one re-checks its own permission NOW, not when the
 * trigger was planted — revoking a permission has to disarm that part of every trigger. */
function fireTrigger(trigger: Trigger): void {
	if (!triggersArmed()) {
		log(`trigger "${trigger.phrase}" matched but triggers aren't armed`);
		return;
	}
	const features = getFeatures();
	let fired = 0;
	for (const id of trigger.actions) {
		// Body-part actions carry their parameter in the id ("touch:breasts"), since the
		// pattern library can't hold a per-part entry for all 26 of them.
		if (id.startsWith("touch:")) {
			if (!features.selfTouchControl) {
				log(`trigger "${trigger.phrase}": ${id} skipped, selfTouchControl not granted`);
				continue;
			}
			const word = id.slice("touch:".length);
			if (word === "all") setAllSelfTouchBlocked(true);
			else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], true);
			else continue;
			// A trigger fires with no spoken instruction behind it, so the subject has no idea
			// which part was just closed off. Saying so would hand them what the trigger does,
			// which is the one thing triggers deliberately keep back.
			announce(word === "all" ? "selftouch-applied" : "restriction-settles");
			fired++;
			continue;
		}
		const suggestion = SUGGESTIONS.find((s) => s.id === id);
		if (!suggestion) continue;
		// Re-checked at FIRING time against the installer, not at planting time — so a
		// permission revoked since, or trust that has decayed below the threshold, disarms
		// this action of every trigger already planted.
		const blocked = blockedReason(suggestion, trigger.installedBy, features);
		if (blocked) {
			log(`trigger "${trigger.phrase}": ${id} skipped, ${blocked}`);
			continue;
		}
		announce(suggestion.run() || suggestion.id);
		fired++;
	}
	log(`trigger "${trigger.phrase}" fired ${fired}/${trigger.actions.length} actions`);
	if (fired) {
		markActive(timerKey(trigger));
		scheduleAutoRelease(trigger);
	}
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
	log(`released trigger "${trigger.phrase}" (${trigger.actions.length} actions undone)`);
}

/** Is this trigger's grip currently on the subject? Read by `/hypno forgettrigger`, which
 * refuses while it is — you do not get to quietly delete the thing that is holding you.
 * The safeword is the way out of that, and saying so is the point. */
export function isTriggerInEffect(trigger: Trigger): boolean {
	return isActive(timerKey(trigger));
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
export function handleSpokenLine(sender: number, content: string): void {
	// Trigger control first, so "remember trigger" can't be read as anything else.
	if (handleTriggerControl(sender, content)) return;
	// Then carry control, before anything that could read "this will stay with you" as a
	// movement suggestion ("stay").
	if (handleCarryControl(sender, content)) return;
	// Then release-by-name, before firing — otherwise "you are released from frozen"
	// contains "frozen" and would set the trigger off instead of clearing it.
	if (handleTriggerRelease(sender, content)) return;
	// Then firing — deliberately BEFORE the session gate below, since the whole point of a
	// trigger is that it works outside a trance.
	if (handleTriggerFiring(sender, content)) return;
	if (handleWakeLine(sender, content)) return;
	if (handleBodyPartLine(sender, content)) return;
	// Match BEFORE the session check, so a line that WOULD have done something can say why
	// it didn't. Checking the session first was silent — an unmatched line and a matched
	// line with no session looked identical from the outside, which is exactly the case
	// that needed telling apart.
	const id = matchSuggestion(content);
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
		isCarried(suggestion.releaseOf);
	if (!isSessionActiveWith(sender) && !carriedRelease) {
		log(`heard "${id}" from ${sender} but no active session with them — ignoring`);
		return;
	}

	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard "${id}" from ${sender} but they didn't say your name — ignoring`);
		return;
	}

	const features = getFeatures();
	// Permission and trust gate restrictions, not releases — a revoked permission should
	// never leave an already-applied effect stuck on.
	const blocked = blockedReason(suggestion, sender, features);
	if (blocked) {
		log(`heard "${id}" from ${sender} but ${blocked}`);
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
	log(`matched suggestion "${id}" in: ${content}`);
	announce(suggestion.run() || id);
	// Tracked AFTER it runs, so "that will stay with you" has something to point at. A
	// release both un-tracks the restriction and lets go of it if it was being carried.
	if (suggestion.release) {
		if (suggestion.releaseOf) {
			noteReleased(suggestion.releaseOf);
			dropCarried(suggestion.releaseOf);
		}
	} else {
		noteApplied(id);
	}
}
