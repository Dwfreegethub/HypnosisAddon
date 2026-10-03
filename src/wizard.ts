// First-run setup: one-click templates, or five questions (v0.99.0, job2.md).
//
// Replaces the tabbed settings screen while the subject has not yet been set up (starterState
// "new", i.e. a fresh install or a reset) and whenever they ask to run it again. Every page has a
// Cancel that leaves without changing anything. The templates and the questions fill settings the
// player can then edit on the ordinary tabs — except Extreme, which, once its warning is confirmed,
// starts the progressive lock (extreme.ts) and is the only thing here that locks anything.
//
// The apply core (applySetup / the templates / the answers) is pure with respect to storage, so the
// test suite drives it without a canvas. Only the drawing and click routing touch BC globals.

import {
	FeatureToggles,
	TriggerScope,
	DropMode,
	DecayRate,
	setFeature,
	setDepthOverride,
	clearDepthOverrides,
	setChemicalScope,
	resetSkillHonour,
	setDeepestTier,
	DEFAULT_DEEPEST,
	setTriggerDecayRate,
	setChemicalReach,
	getStarterState,
	setStarterState,
	setDefaultStance,
	setAwayStance,
	DEFAULT_AWAY_STANCE,
	setToyMode,
	setToyScope,
	DEFAULT_TOY_SCOPE,
	setTriggerScope,
	setDropMode,
	setTriggerLifespan,
} from "./storage";
import { DEPTH_GATES } from "./depth";
import { EXTREME_WARNING, startExtremeTrial } from "./extreme";
import { tellPlayer } from "./notify";
import { PANEL_TOP, PANEL_HEIGHT, drawLeftText, drawLeftTextFit, drawLeftTextWrap } from "./panel";

// --- what a setup writes ------------------------------------------------------------------------
/** The permissions and grants a setup decides. Each is set ON if the setup lists it, otherwise OFF
 * (job2.md §5.2: "anything not listed is OFF"). The player's own preferences — showing trigger
 * words, firing their own, whole-word matching, release on disconnect, OOC silence, the room seeing
 * reactions, hiding trigger setup — are not a setup's business and are left alone. */
const MANAGED_FEATURES: (keyof FeatureToggles)[] = [
	"movementRestriction",
	"clothingRestriction",
	"postureControl",
	"followControl",
	"speechRestriction",
	"selfTouchControl",
	"compelActivity",
	"compelTouchOthers",
	"forcedSpeech",
	"hearingControl",
	"sightControl",
	"arousalControl",
	"illusionControl",
	"undressControl",
	"triggerControl",
	"carryForward",
	"suppressClothing",
	"suppressBondage",
	"suppressActivities",
	"lockedWhileHypnotized",
];

type TranceKey = "tranceCannotMove" | "tranceCannotSpeak" | "tranceScreenFade" | "tranceClothingFreeze";
/** The factory trance defaults. Every setup puts these back, then applies its own overrides. */
const TRANCE_DEFAULTS: Record<TranceKey, boolean> = {
	tranceCannotMove: true,
	tranceCannotSpeak: true,
	tranceScreenFade: true,
	tranceClothingFreeze: false,
};

export interface SetupConfig {
	hypnoEnabled: boolean;
	/** MANAGED_FEATURES to turn on; the rest of that list goes off. */
	features: (keyof FeatureToggles)[];
	/** Overrides on the factory trance defaults. */
	trance?: Partial<Record<TranceKey, boolean>>;
	/** Every depth gate set to this. Absent: the defaults (no overrides stored). */
	allDepths?: number;
	/** "Sink deeper" stops at — a DEEPEST_TIERS key. */
	deepest: string;
	/** Auto-answer — a DEFAULT_STANCES key. */
	stance: string;
	away?: string;
	toyMode?: boolean;
	toyScope?: TriggerScope;
	triggerScope?: TriggerScope;
	drop?: DropMode;
	triggerDecay?: DecayRate;
	/** Let arousal reach the illusion and planting triggers (the earned-only shortcut). */
	openChemical?: boolean;
}

/** Write a whole configuration to storage. The one place templates and the questions converge, so
 * they can never mean different things. Sets `starterState` done at the end — this IS the setup.
 * Anything a setup does not name goes back to its default (job2.md §5.3). */
export function applySetup(cfg: SetupConfig): void {
	const on = new Set(cfg.features);
	setFeature("hypnoEnabled", cfg.hypnoEnabled);
	for (const key of MANAGED_FEATURES) setFeature(key, on.has(key));
	for (const [key, value] of Object.entries({ ...TRANCE_DEFAULTS, ...(cfg.trance ?? {}) })) {
		setFeature(key as TranceKey, value);
	}

	if (cfg.allDepths === undefined) clearDepthOverrides();
	else for (const gate of DEPTH_GATES) setDepthOverride(gate.key, cfg.allDepths);

	setChemicalScope("arousal");
	setChemicalReach("illusionControl", !!cfg.openChemical);
	setChemicalReach("triggerControl", !!cfg.openChemical);
	resetSkillHonour();
	setDeepestTier(cfg.deepest);
	setDefaultStance(cfg.stance);
	setAwayStance(cfg.away ?? DEFAULT_AWAY_STANCE);
	setToyMode(!!cfg.toyMode);
	setToyScope(cfg.toyScope ?? DEFAULT_TOY_SCOPE);
	setTriggerScope(cfg.triggerScope ?? "hypnotist");
	setDropMode(cfg.drop ?? "off");
	setTriggerLifespan(0);
	setTriggerDecayRate(cfg.triggerDecay ?? "never");

	setStarterState("done");
}

// --- the four templates (job2.md §2, §5) ---------------------------------------------------------
export interface Preset {
	key: string;
	name: string;
	blurb: string;
	config: SetupConfig;
}
export const PRESETS: Preset[] = [
	{
		key: "hypnotist",
		name: "Hypnotist only",
		blurb: "You drive, you are not a subject. Nobody can hypnotize you; you can still hypnotize others.",
		config: { hypnoEnabled: false, features: [], deepest: DEFAULT_DEEPEST, stance: "fight" },
	},
	{
		key: "light",
		name: "Light / safe",
		blurb: "Poses and being held still, nothing more. A trance never silences you, and you are always asked first.",
		config: {
			hypnoEnabled: true,
			features: ["movementRestriction", "postureControl"],
			trance: { tranceCannotSpeak: false },
			deepest: "yielding",
			stance: "prompt",
		},
	},
	{
		key: "balanced",
		name: "Balanced",
		blurb: "Movement, poses, speech, touch, undressing, arousal and the wardrobe, plus triggers from people close to you. You are always asked first.",
		config: {
			hypnoEnabled: true,
			features: [
				"movementRestriction",
				"postureControl",
				"speechRestriction",
				"selfTouchControl",
				"arousalControl",
				"undressControl",
				"clothingRestriction",
				"triggerControl",
			],
			deepest: "entranced",
			stance: "prompt",
			triggerScope: "whitelist",
		},
	},
	{
		key: "extreme",
		name: "Extreme",
		blurb: "Everything on, easy to reach, no questions asked. Locks your settings read-only for a week, then 30 days at a time if you choose.",
		config: {
			hypnoEnabled: true,
			features: [
				"movementRestriction",
				"postureControl",
				"speechRestriction",
				"selfTouchControl",
				"arousalControl",
				"undressControl",
				"clothingRestriction",
				"followControl",
				"compelActivity",
				"compelTouchOthers",
				"forcedSpeech",
				"hearingControl",
				"sightControl",
				"illusionControl",
				"suppressClothing",
				"suppressBondage",
				"suppressActivities",
				"triggerControl",
				"carryForward",
				"lockedWhileHypnotized",
			],
			allDepths: 20,
			deepest: "blank",
			openChemical: true,
			stance: "agree",
			toyMode: true,
			toyScope: "whitelist",
			drop: "unlimited",
			away: "keep",
			triggerScope: "notblack",
			// DW, 2026-09-29: kept on purpose. The default is "never", so Extreme's triggers DO fade,
			// slowly, unless reinforced (job2.md §5.5).
			triggerDecay: "veryslow",
		},
	},
];

/** Apply a template's settings. Extreme's LOCK is not started here — only by confirming its
 * warning (confirmExtreme), so applying the settings and committing to the lock stay separate. */
export function applyPreset(key: string): boolean {
	const preset = PRESETS.find((p) => p.key === key);
	if (!preset) return false;
	applySetup(preset.config);
	return true;
}

/** The Extreme warning's Confirm: the settings, then the first-week lock. Returns what to tell her. */
export function confirmExtreme(now: number = Date.now()): string {
	applyPreset("extreme");
	return startExtremeTrial(now);
}

// --- the five questions (job2.md §3, §5.3) -------------------------------------------------------
interface WizardOption {
	value: string;
	label: string;
}
interface WizardQuestion {
	key: string;
	title: string;
	options: WizardOption[];
}
export const QUESTIONS: WizardQuestion[] = [
	{
		key: "role",
		title: "What role do you plan to take in hypnosis scenes?",
		options: [
			{ value: "hypnotist", label: "Hypnotist only — nobody hypnotizes me" },
			{ value: "subject", label: "Subject, or both" },
		],
	},
	{
		key: "induction",
		title: "How do you want to handle incoming trance attempts?",
		options: [
			{ value: "ask", label: "Always ask me first" },
			{ value: "trusted", label: "Go under at once for my owner and lovers (toy mode); ask anyone else" },
			{ value: "submit", label: "Complete submission: agree to everyone, toy mode on" },
		],
	},
	{
		key: "physical",
		title: "What physical commands are you comfortable allowing?",
		options: [
			{ value: "basics", label: "Poses and being held still only" },
			{ value: "standard", label: "Standard play: also silence, self-touch, undressing, orgasm control" },
			{ value: "deep", label: "Deep vulnerability: also touching others, following, acting on command" },
		],
	},
	{
		key: "senses",
		title: "Do you want hypnotists to change what you see, hear and notice?",
		options: [
			{ value: "none", label: "No — normal chat and sight (the trance veil still shows)" },
			{ value: "veil", label: "The trance veil, and the clothing illusion" },
			{ value: "full", label: "Full: blindness, hearing one voice, not noticing clothing, bondage or touch" },
		],
	},
	{
		key: "triggers",
		title: "How should triggers and lasting suggestions work?",
		options: [
			{ value: "none", label: "None — nothing outlives the trance" },
			{ value: "standard", label: "Triggers, from my owner, lovers and whitelist" },
			{ value: "deep", label: "Deep conditioning: triggers from almost anyone, made to speak, drops, lasting suggestions" },
		],
	},
];

/** Build a SetupConfig from the answers. "Hypnotist only" is the template itself. */
export function wizardConfig(answers: Record<string, string>): SetupConfig {
	if (answers.role === "hypnotist") return PRESETS[0].config;
	const features: (keyof FeatureToggles)[] = [];
	const cfg: SetupConfig = { hypnoEnabled: true, features, deepest: DEFAULT_DEEPEST, stance: "prompt" };

	if (answers.induction === "trusted") {
		cfg.toyMode = true;
		cfg.toyScope = "lovers";
	} else if (answers.induction === "submit") {
		cfg.stance = "agree";
		cfg.toyMode = true;
		cfg.toyScope = "lovers";
		cfg.away = "keep";
	}

	features.push("movementRestriction", "postureControl");
	cfg.deepest = "yielding";
	if (answers.physical === "standard" || answers.physical === "deep") {
		features.push("speechRestriction", "selfTouchControl", "undressControl", "arousalControl");
		cfg.deepest = "entranced";
	}
	if (answers.physical === "deep") {
		features.push("compelActivity", "compelTouchOthers", "followControl");
		cfg.deepest = "deep";
	}

	if (answers.senses === "veil" || answers.senses === "full") features.push("illusionControl");
	if (answers.senses === "full") {
		features.push("sightControl", "hearingControl", "suppressClothing", "suppressBondage", "suppressActivities");
	}

	if (answers.triggers === "standard") {
		features.push("triggerControl");
		cfg.triggerScope = "whitelist";
	} else if (answers.triggers === "deep") {
		features.push("triggerControl", "forcedSpeech", "carryForward");
		cfg.triggerScope = "notblack";
		cfg.drop = "unlimited";
	}
	return cfg;
}

// --- screen state --------------------------------------------------------------------------------
// stage: "welcome" | "extreme" (its warning) | 0..QUESTIONS.length-1 | "summary". `forced` re-runs
// it from the settings screen even after setup is done.
type Stage = "welcome" | "extreme" | "summary" | number;
let forced = false;
let stage: Stage = "welcome";
const answers: Record<string, string> = {};

export function shouldShowWizard(): boolean {
	return forced || getStarterState() === "new";
}
export function startWizard(): void {
	forced = true;
	stage = "welcome";
	for (const k of Object.keys(answers)) delete answers[k];
}
function finish(): void {
	forced = false;
	stage = "welcome";
	for (const k of Object.keys(answers)) delete answers[k];
}

/** Leave the wizard from any page without applying anything (job2.md §1).
 *
 * On a first run this marks setup done, as Skip does: otherwise shouldShowWizard() would still be
 * true and Cancel would land straight back on the welcome page, which is not an exit. The Setup
 * button on the settings screen runs it again. On a re-run the settings are exactly as they were. */
export function cancelWizard(): void {
	if (getStarterState() === "new") setStarterState("done");
	finish();
}

// --- geometry ------------------------------------------------------------------------------------
const WZ_LEFT = 260;
const WZ_WIDTH = 1480;
const WZ_TOP = PANEL_TOP;
const WZ_HEIGHT = PANEL_HEIGHT;
const CONTENT_X = WZ_LEFT + 40;
const CONTENT_MAX = WZ_WIDTH - 80;
const OPT_TOP = WZ_TOP + 150;
const OPT_HEIGHT = 60;
const OPT_GAP = 14;
const OPT_WIDTH = WZ_WIDTH - 80;
const NAV_TOP = WZ_TOP + WZ_HEIGHT - 76;
const NAV_HEIGHT = 56;
const NAV_FORWARD_WIDTH = 200;
/** The forward button while a question has no answer yet. */
const FORWARD_WAITING = "#b8b8b8";
const NAV_FORWARD_LEFT = WZ_LEFT + WZ_WIDTH - 40 - NAV_FORWARD_WIDTH;
/** Extreme's Confirm is wider: its label is a commitment and must be read whole. */
const CONFIRM_WIDTH = 340;
const CONFIRM_LEFT = WZ_LEFT + WZ_WIDTH - 40 - CONFIRM_WIDTH;
// Cancel sits beside the forward button rather than at the far left, where Back already is, so
// the one-way-out button is never where a player reaches for "previous question".
const NAV_CANCEL_WIDTH = 200;
const NAV_CANCEL_LEFT = NAV_FORWARD_LEFT - 20 - NAV_CANCEL_WIDTH;
const CONFIRM_CANCEL_LEFT = CONFIRM_LEFT - 20 - NAV_CANCEL_WIDTH;
const PRESET_ROW = 90;
const PRESET_TOP = WZ_TOP + 150;
const PRESET_BUTTON_WIDTH = 360;
const PRESET_BUTTON_HEIGHT = 64;
const QUESTIONS_BUTTON_WIDTH = 500;
const SKIP_BUTTON_WIDTH = 300;

function optionTop(i: number): number {
	return OPT_TOP + i * (OPT_HEIGHT + OPT_GAP);
}
function bottomRowTop(): number {
	return PRESET_TOP + PRESETS.length * PRESET_ROW + 14;
}

export function drawWizard(): void {
	DrawText("Erotic Chat Hypnosis Suite (ECHS) — setup", MainCanvasWidth / 2, WZ_TOP - 40, "Black");
	DrawRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "White");
	DrawEmptyRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "Black", 3);

	if (stage === "welcome") return drawWelcome();
	if (stage === "extreme") return drawExtremeWarning();
	if (stage === "summary") return drawSummary();

	const q = QUESTIONS[stage];
	drawLeftText(q.title, CONTENT_X, WZ_TOP + 70, "Black");
	drawLeftText("Choose one.", CONTENT_X, WZ_TOP + 110, "Gray");
	q.options.forEach((opt, i) => {
		const on = answers[q.key] === opt.value;
		DrawButton(CONTENT_X, optionTop(i), OPT_WIDTH, OPT_HEIGHT, `${on ? "✓  " : ""}${opt.label}`, on ? "#dfe9df" : "White", "", "");
	});
	// Next waits for an answer: a question with nothing chosen has no honest default.
	drawNav(stage > 0, "Next", !answers[q.key]);
	// Centred in the nav bar, clear of the Back button on the left and Next on the right.
	DrawText(`${stage + 1} of ${QUESTIONS.length}`, WZ_LEFT + WZ_WIDTH / 2, NAV_TOP + NAV_HEIGHT / 2, "Gray");
}

function drawWelcome(): void {
	drawLeftText("Welcome. Nothing works until you set some of it up.", CONTENT_X, WZ_TOP + 66, "Black");
	drawLeftTextFit("Pick a starting point, or answer a few questions. You can change any of it afterward.",
		CONTENT_X, WZ_TOP + 104, CONTENT_MAX, "Gray");
	PRESETS.forEach((p, i) => {
		const top = PRESET_TOP + i * PRESET_ROW;
		DrawButton(CONTENT_X, top, PRESET_BUTTON_WIDTH, PRESET_BUTTON_HEIGHT, p.name, p.key === "extreme" ? "#ffe0e0" : "White", "", "");
		// Wrapped, not shrunk-then-clipped: see drawLeftTextWrap. 84 of the row's 90 so two
		// neighbouring blurbs never touch.
		drawLeftTextWrap(p.blurb, CONTENT_X + 384, top + 32, CONTENT_MAX - 400, 84, "#333");
	});
	const bottom = bottomRowTop();
	DrawButton(CONTENT_X, bottom, QUESTIONS_BUTTON_WIDTH, 60, "Answer a few questions instead", "#e8e8ff", "", "");
	DrawButton(CONTENT_X + QUESTIONS_BUTTON_WIDTH + 20, bottom, SKIP_BUTTON_WIDTH, 60, "Skip — I'll set it up myself", "White", "", "");
	drawNav(false, null);
}

function drawExtremeWarning(): void {
	drawLeftText("Extreme — please read before you confirm", CONTENT_X, WZ_TOP + 70, "#a00000");
	let y = WZ_TOP + 140;
	for (const paragraph of EXTREME_WARNING) {
		drawLeftTextWrap(paragraph, CONTENT_X, y, CONTENT_MAX, 100, "#222");
		y += 120;
	}
	DrawButton(CONFIRM_CANCEL_LEFT, NAV_TOP, NAV_CANCEL_WIDTH, NAV_HEIGHT, "Cancel", "White", "", "");
	DrawButton(CONFIRM_LEFT, NAV_TOP, CONFIRM_WIDTH, NAV_HEIGHT, "Confirm 1-week lock", "#ffb3b3", "", "");
}

function drawSummary(): void {
	const cfg = wizardConfig(answers);
	drawLeftText("Ready to apply", CONTENT_X, WZ_TOP + 70, "Black");
	describeConfig(cfg).forEach((l, i) => drawLeftTextFit(l, CONTENT_X, WZ_TOP + 120 + i * 40, CONTENT_MAX, "#222"));
	drawNav(true, "Apply");
}

/** The summary page's lines: what the answers will set, in words. Exported for the suite. */
export function describeConfig(cfg: SetupConfig): string[] {
	if (!cfg.hypnoEnabled) {
		return [
			"Hypnosis off: nobody can hypnotize you. You can still hypnotize others.",
			"You can change every one of these on the tabs afterward.",
		];
	}
	const has = (k: keyof FeatureToggles) => cfg.features.includes(k);
	const allowed = [
		"poses and being held still",
		has("speechRestriction") && "silence, self-touch, undressing and orgasm control",
		has("compelActivity") && "touching others, following, acting on command",
		has("illusionControl") && "the clothing illusion",
		has("sightControl") && "sight, hearing and not noticing things",
		has("triggerControl") && (has("carryForward") ? "triggers, drops, made to speak and lasting suggestions" : "triggers"),
	].filter(Boolean);
	const whoTriggers = cfg.triggerScope === "notblack" ? "almost anyone (not your blacklist)" : "your owner, lovers and whitelist";
	return [
		`Allowed: ${allowed.join("; ")}.`,
		`When someone tries: ${cfg.stance === "agree" ? "you agree without being asked" : "you are asked first"}` +
			`${cfg.toyMode ? "; your owner and lovers put you straight under (toy mode)" : ""}.`,
		`"Sink deeper" stops at: ${cfg.deepest[0].toUpperCase()}${cfg.deepest.slice(1)}.`,
		has("triggerControl") ? `Triggers can be set off by ${whoTriggers}.` : "No triggers: nothing outlives the trance.",
		"You can change every one of these on the tabs afterward.",
	];
}

/** Back (optional), Cancel (always) and the forward button (when there is one). */
function drawNav(showBack: boolean, forward: string | null, forwardDisabled = false): void {
	if (showBack) DrawButton(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT, "Back", "White", "", "");
	DrawButton(NAV_CANCEL_LEFT, NAV_TOP, NAV_CANCEL_WIDTH, NAV_HEIGHT, "Cancel", "White", "", "Leave setup without changing anything");
	if (forward) {
		// White when it can be clicked, like every other live button (and BC turns it cyan on hover);
		// a clearly darker grey while it waits for an answer. The old pale green read as disabled
		// even when it was not (DW, v0.100.1). BC's Disabled flag only stops the hover highlight.
		DrawButton(NAV_FORWARD_LEFT, NAV_TOP, NAV_FORWARD_WIDTH, NAV_HEIGHT, forward, forwardDisabled ? FORWARD_WAITING : "White", "", "", forwardDisabled);
	}
}

// --- clicks --------------------------------------------------------------------------------------
/** Returns true when the click was ours (it always is while the wizard is up — it owns the
 * whole screen). */
export function clickWizard(): boolean {
	if (stage === "extreme") return clickExtremeWarning();
	if (MouseIn(NAV_CANCEL_LEFT, NAV_TOP, NAV_CANCEL_WIDTH, NAV_HEIGHT)) {
		cancelWizard();
		return true;
	}
	if (stage === "welcome") return clickWelcome();
	if (stage === "summary") {
		if (navForwardHit()) {
			applySetup(wizardConfig(answers));
			finish();
		} else if (navBackHit()) {
			stage = answers.role === "hypnotist" ? 0 : QUESTIONS.length - 1;
		}
		return true;
	}
	const q = QUESTIONS[stage];
	for (let i = 0; i < q.options.length; i++) {
		if (MouseIn(CONTENT_X, optionTop(i), OPT_WIDTH, OPT_HEIGHT)) {
			answers[q.key] = q.options[i].value;
			return true;
		}
	}
	if (navForwardHit() && answers[q.key]) {
		// "Hypnotist only" needs nothing more: straight to the summary.
		const last = stage + 1 >= QUESTIONS.length || (q.key === "role" && answers.role === "hypnotist");
		stage = last ? "summary" : stage + 1;
	} else if (navBackHit() && stage > 0) {
		stage = stage - 1;
	}
	return true;
}

function clickWelcome(): boolean {
	for (let i = 0; i < PRESETS.length; i++) {
		if (!MouseIn(CONTENT_X, PRESET_TOP + i * PRESET_ROW, PRESET_BUTTON_WIDTH, PRESET_BUTTON_HEIGHT)) continue;
		const key = PRESETS[i].key;
		// Extreme asks first; the other three apply on one click (DW, job2.md §5.5).
		if (key === "extreme") {
			stage = "extreme";
			return true;
		}
		applyPreset(key);
		finish();
		return true;
	}
	const bottom = bottomRowTop();
	if (MouseIn(CONTENT_X, bottom, QUESTIONS_BUTTON_WIDTH, 60)) {
		stage = 0;
	} else if (MouseIn(CONTENT_X + QUESTIONS_BUTTON_WIDTH + 20, bottom, SKIP_BUTTON_WIDTH, 60)) {
		// Skip — set nothing, but stop the wizard from reappearing.
		setStarterState("done");
		finish();
	}
	return true;
}

function clickExtremeWarning(): boolean {
	if (MouseIn(CONFIRM_LEFT, NAV_TOP, CONFIRM_WIDTH, NAV_HEIGHT)) {
		tellPlayer(confirmExtreme());
		finish();
	} else if (MouseIn(CONFIRM_CANCEL_LEFT, NAV_TOP, NAV_CANCEL_WIDTH, NAV_HEIGHT)) {
		cancelWizard();
	}
	return true;
}

function navForwardHit(): boolean {
	return MouseIn(NAV_FORWARD_LEFT, NAV_TOP, NAV_FORWARD_WIDTH, NAV_HEIGHT);
}
function navBackHit(): boolean {
	return MouseIn(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT);
}
