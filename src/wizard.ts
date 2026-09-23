// First-run setup: quick presets, or a few questions.
//
// Replaces the tabbed settings screen while the subject has not yet been set up (starterState
// "new", i.e. a fresh install or a reset) and whenever they ask to run it again. Nothing here
// LOCKS anything — it only fills settings the player can then edit, exactly as design.md's
// wizard note requires. Everything it sets is reachable and reversible on the ordinary tabs.
//
// The apply core (applySetup / the presets) is pure with respect to storage, so the test suite
// drives it without a canvas. Only the drawing and click routing touch BC globals.

import {
	FeatureToggles,
	setFeature,
	getFeatures,
	setDepthOverride,
	clearDepthOverrides,
	setChemicalScope,
	setSkillHonour,
	setTriggerDecayRate,
	setChemicalReach,
	getStarterState,
	setStarterState,
} from "./storage";
import { DEPTH_GATES } from "./depth";
import { PANEL_TOP, PANEL_HEIGHT, drawLeftText, drawLeftTextFit, drawLeftTextWrap } from "./panel";

// --- the feature universe this screen manages ------------------------------------------------
// Deliberately NOT the trance defaults (they ship on) nor lockedWhileHypnotized (never auto-on,
// it removes an exit). Just the subject permissions.
const GROUP_FEATURES: Record<string, (keyof FeatureToggles)[]> = {
	movement: ["movementRestriction", "speechRestriction", "postureControl", "clothingRestriction"],
	undress: ["undressControl", "selfTouchControl"],
	arousal: ["arousalControl"],
	compel: ["compelActivity"],
	perception: ["suppressClothing", "suppressBondage", "suppressActivities", "illusionControl"],
	lasting: ["triggerControl", "carryForward"],
};
// Touching OTHER people is its own consent (v0.84.0) and no wizard question grants it — only
// Extreme, which is "everything on". Listed here so every other answer turns it off.
const ALL_FEATURES: (keyof FeatureToggles)[] = [
	"hypnoEnabled",
	...Object.values(GROUP_FEATURES).flat(),
	"compelTouchOthers",
];

export type Access = "easy" | "earned" | "deep";

export interface SetupConfig {
	/** Which permission features to turn ON; everything else in ALL_FEATURES goes off. */
	features: (keyof FeatureToggles)[];
	/** How deep someone must be to reach them. "earned" clears overrides (the defaults). */
	access: Access;
	/** May arousal stand in for trust on the shallow things. */
	arousalShortcut: boolean;
	/** How much of a hypnotist's claimed skill to honour. */
	honour: "ignore" | "trusted" | "capped";
	/** Do planted triggers fade without reinforcement. */
	triggersFade: boolean;
	/** Open the earned-only illusion and triggers to arousal (the fast-decay tradeoff). Extreme
	 * only — the wizard never turns this on for you. */
	openChemical?: boolean;
}

/** Write a whole configuration to storage. The one place presets and the wizard converge, so
 * they can never mean different things. Sets `starterState` done at the end — this IS the setup. */
export function applySetup(cfg: SetupConfig): void {
	const on = new Set(cfg.features);
	if (on.size > 0) on.add("hypnoEnabled"); // any permission implies the master switch
	for (const key of ALL_FEATURES) setFeature(key, on.has(key));

	if (cfg.access === "earned") {
		clearDepthOverrides();
	} else {
		const tier = cfg.access === "easy" ? "drifting" : "deep";
		for (const gate of DEPTH_GATES) setDepthOverride(gate.key, tier);
	}

	setChemicalScope(cfg.arousalShortcut ? "arousal" : "neither");
	setSkillHonour(cfg.honour);
	setTriggerDecayRate(cfg.triggersFade ? "typical" : "never");
	// The earned-only shortcut is off unless a preset (Extreme) explicitly opens it.
	setChemicalReach("illusionControl", !!cfg.openChemical);
	setChemicalReach("triggerControl", !!cfg.openChemical);

	setStarterState("done");
}

// --- the four presets ------------------------------------------------------------------------
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
		config: { features: [], access: "earned", arousalShortcut: false, honour: "ignore", triggersFade: false },
	},
	{
		key: "light",
		name: "Light / safe",
		blurb: "The five session-only basics — hypnosis, movement, speech, posture, wardrobe — easy to reach.",
		config: {
			features: GROUP_FEATURES.movement,
			access: "earned",
			arousalShortcut: true,
			honour: "trusted",
			triggersFade: false,
		},
	},
	{
		key: "balanced",
		name: "Balanced",
		blurb: "Most session things — adds undressing, touch, arousal and the awareness tricks — earned at a normal depth. Nothing that outlives the session.",
		config: {
			features: [
				...GROUP_FEATURES.movement,
				...GROUP_FEATURES.undress,
				...GROUP_FEATURES.arousal,
				"suppressClothing",
				"suppressBondage",
				"suppressActivities",
			],
			access: "earned",
			arousalShortcut: true,
			honour: "trusted",
			triggersFade: false,
		},
	},
	{
		key: "extreme",
		name: "Extreme",
		blurb: "Everything on — triggers, carry-forward and the illusion included — at the easiest access, arousal allowed to reach them. Complete trust.",
		config: {
			features: [...Object.values(GROUP_FEATURES).flat(), "compelTouchOthers"],
			access: "easy",
			arousalShortcut: true,
			// The highest rung the settings cycle offers today. Rung 4 ("Skill can beat my
			// resistance") waits on dual fatigue; a later build can raise Extreme to it.
			honour: "capped",
			triggersFade: false,
			openChemical: true,
		},
	},
];

export function applyPreset(key: string): boolean {
	const preset = PRESETS.find((p) => p.key === key);
	if (!preset) return false;
	applySetup(preset.config);
	return true;
}

// --- the wizard's five questions -------------------------------------------------------------
interface WizardOption {
	value: string;
	label: string;
}
interface WizardQuestion {
	key: string;
	title: string;
	multi: boolean;
	options: WizardOption[];
}
const QUESTIONS: WizardQuestion[] = [
	{
		key: "groups",
		title: "What may others do to you? (tick any)",
		multi: true,
		options: [
			{ value: "movement", label: "Hold you still, quiet, kneeling; block the wardrobe" },
			{ value: "undress", label: "Undress you, and stop you touching yourself" },
			{ value: "arousal", label: "Set your arousal, force or deny an orgasm" },
			{ value: "compel", label: "Make you perform actions — touch yourself on command" },
			{ value: "perception", label: "Make you not notice things, or misread your own clothes" },
			{ value: "lasting", label: "Plant triggers and suggestions that outlive the trance" },
		],
	},
	{
		key: "access",
		title: "How easily should they reach those?",
		multi: false,
		options: [
			{ value: "easy", label: "Easy — even a shallow trance is enough" },
			{ value: "earned", label: "Earned — the deeper things need a deeper trance (recommended)" },
			{ value: "deep", label: "Only deep — hardest to reach, nothing casual" },
		],
	},
	{
		key: "arousal",
		title: "Can arousal stand in for trust on the shallow things?",
		multi: false,
		options: [
			{ value: "yes", label: "Yes — being worked up can open the shallow, session-only effects" },
			{ value: "no", label: "No — only trust ever counts" },
		],
	},
	{
		key: "honour",
		title: "How much do you trust a hypnotist's claim to be skilled?",
		multi: false,
		options: [
			{ value: "ignore", label: "Not at all — their practice never helps against me" },
			{ value: "trusted", label: "Only from people I already know (recommended)" },
			{ value: "capped", label: "From anyone, up to a point" },
		],
	},
	{
		key: "decay",
		title: "Should planted triggers fade if they are not kept up?",
		multi: false,
		options: [
			{ value: "yes", label: "Yes — they weaken over time without reinforcement" },
			{ value: "no", label: "No — a trigger stays until it is removed" },
		],
	},
];

/** Build a SetupConfig from the collected wizard answers. */
function wizardConfig(answers: Record<string, string | Set<string>>): SetupConfig {
	const groups = (answers.groups as Set<string>) ?? new Set<string>();
	const features: (keyof FeatureToggles)[] = [];
	for (const g of groups) features.push(...(GROUP_FEATURES[g] ?? []));
	return {
		features,
		access: (answers.access as Access) ?? "earned",
		arousalShortcut: (answers.arousal ?? "yes") === "yes",
		honour: (answers.honour as SetupConfig["honour"]) ?? "trusted",
		triggersFade: (answers.decay ?? "no") === "yes",
	};
}

// --- screen state ----------------------------------------------------------------------------
// stage: "welcome" | 0..QUESTIONS.length-1 | "summary". `forced` re-runs it from the settings
// screen even after setup is done.
let forced = false;
let stage: "welcome" | "summary" | number = "welcome";
const answers: Record<string, string | Set<string>> = {};

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
}

// --- geometry --------------------------------------------------------------------------------
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

function optionTop(i: number): number {
	return OPT_TOP + i * (OPT_HEIGHT + OPT_GAP);
}
function selected(q: WizardQuestion, value: string): boolean {
	const a = answers[q.key];
	return q.multi ? a instanceof Set && a.has(value) : a === value;
}

export function drawWizard(): void {
	DrawText("Erotic Chat Hypnosis Suite (ECHS) — setup", MainCanvasWidth / 2, WZ_TOP - 40, "Black");
	DrawRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "White");
	DrawEmptyRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "Black", 3);

	if (stage === "welcome") return drawWelcome();
	if (stage === "summary") return drawSummary();

	const q = QUESTIONS[stage];
	drawLeftText(q.title, CONTENT_X, WZ_TOP + 70, "Black");
	drawLeftText(q.multi ? "Tick any that apply." : "Choose one.", CONTENT_X, WZ_TOP + 110, "Gray");
	q.options.forEach((opt, i) => {
		const on = selected(q, opt.value);
		DrawButton(CONTENT_X, optionTop(i), OPT_WIDTH, OPT_HEIGHT, `${on ? "✓  " : ""}${opt.label}`,
			on ? "#dfe9df" : "White", "", "");
	});
	drawNav(typeof stage === "number" && stage > 0, "Next");
	// Centred in the nav bar, clear of the Back button on the left and Next on the right.
	DrawText(`${(stage as number) + 1} of ${QUESTIONS.length}`, WZ_LEFT + WZ_WIDTH / 2, NAV_TOP + NAV_HEIGHT / 2, "Gray");
}

function drawWelcome(): void {
	drawLeftText("Welcome. Nothing works until you set some of it up.", CONTENT_X, WZ_TOP + 66, "Black");
	drawLeftTextFit("Pick a starting point, or answer a few questions. You can change any of it afterward.",
		CONTENT_X, WZ_TOP + 104, CONTENT_MAX, "Gray");
	PRESETS.forEach((p, i) => {
		const top = WZ_TOP + 150 + i * 90;
		DrawButton(CONTENT_X, top, 360, 64, p.name, "White", "", "");
		// Wrapped, not shrunk-then-clipped: see drawLeftTextWrap. 84 of the row's 90 so two
		// neighbouring blurbs never touch.
		drawLeftTextWrap(p.blurb, CONTENT_X + 384, top + 32, CONTENT_MAX - 400, 84, "#333");
	});
	const bottom = WZ_TOP + 150 + PRESETS.length * 90 + 14;
	DrawButton(CONTENT_X, bottom, 500, 60, "Answer a few questions instead", "#e8e8ff", "", "");
	DrawButton(CONTENT_X + 520, bottom, 300, 60, "Skip — I'll set it up myself", "White", "", "");
}

function drawSummary(): void {
	const cfg = wizardConfig(answers);
	drawLeftText("Ready to apply", CONTENT_X, WZ_TOP + 70, "Black");
	const lines = describeConfig(cfg);
	lines.forEach((l, i) => drawLeftTextFit(l, CONTENT_X, WZ_TOP + 120 + i * 40, CONTENT_MAX, "#222"));
	drawNav(true, "Apply");
}

function describeConfig(cfg: SetupConfig): string[] {
	const groupNames: Record<string, string> = {
		movement: "movement & speech", undress: "undressing & touch", arousal: "arousal",
		perception: "perception tricks", compel: "made to act", lasting: "lasting triggers",
	};
	const chosen = Object.keys(GROUP_FEATURES).filter((g) =>
		GROUP_FEATURES[g].every((k) => cfg.features.includes(k)));
	return [
		`Allowed: ${chosen.length ? chosen.map((g) => groupNames[g]).join(", ") : "nothing — hypnosis stays off"}.`,
		`Reached: ${cfg.access === "easy" ? "easily, even shallow" : cfg.access === "deep" ? "only when deeply under" : "earned, deeper things need a deeper trance"}.`,
		`Arousal as a shortcut: ${cfg.arousalShortcut ? "yes" : "no"}.`,
		`A hypnotist's skill: ${cfg.honour === "ignore" ? "ignored" : cfg.honour === "trusted" ? "from people you trust" : "from anyone, capped"}.`,
		`Triggers: ${cfg.triggersFade ? "fade over time" : "stay until removed"}.`,
		"You can change every one of these on the tabs afterward.",
	];
}

function drawNav(showBack: boolean, forward: string): void {
	if (showBack) DrawButton(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT, "Back", "White", "", "");
	DrawButton(WZ_LEFT + WZ_WIDTH - 40 - 200, NAV_TOP, 200, NAV_HEIGHT, forward, "#dfe9df", "", "");
}

// --- clicks ----------------------------------------------------------------------------------
/** Returns true when the click was ours (it always is while the wizard is up — it owns the
 * whole screen). */
export function clickWizard(): boolean {
	if (stage === "welcome") return clickWelcome();
	if (stage === "summary") {
		if (navForwardHit()) {
			applySetup(wizardConfig(answers));
			finish();
		} else if (navBackHit()) {
			stage = QUESTIONS.length - 1;
		}
		return true;
	}
	const q = QUESTIONS[stage as number];
	for (let i = 0; i < q.options.length; i++) {
		if (MouseIn(CONTENT_X, optionTop(i), OPT_WIDTH, OPT_HEIGHT)) {
			toggleAnswer(q, q.options[i].value);
			return true;
		}
	}
	if (navForwardHit()) {
		stage = (stage as number) + 1 >= QUESTIONS.length ? "summary" : (stage as number) + 1;
	} else if (navBackHit() && (stage as number) > 0) {
		stage = (stage as number) - 1;
	}
	return true;
}

function toggleAnswer(q: WizardQuestion, value: string): void {
	if (!q.multi) {
		answers[q.key] = value;
		return;
	}
	const cur = answers[q.key] instanceof Set ? (answers[q.key] as Set<string>) : new Set<string>();
	cur.has(value) ? cur.delete(value) : cur.add(value);
	answers[q.key] = cur;
}

function clickWelcome(): boolean {
	PRESETS.forEach((p, i) => {
		if (MouseIn(CONTENT_X, WZ_TOP + 150 + i * 90, 360, 64)) {
			applyPreset(p.key);
			finish();
		}
	});
	const bottom = WZ_TOP + 150 + PRESETS.length * 90 + 14;
	if (MouseIn(CONTENT_X, bottom, 500, 60)) {
		stage = 0;
	} else if (MouseIn(CONTENT_X + 520, bottom, 300, 60)) {
		// Skip — set nothing, but stop the wizard from reappearing.
		setStarterState("done");
		finish();
	}
	return true;
}

function navForwardHit(): boolean {
	return MouseIn(WZ_LEFT + WZ_WIDTH - 40 - 200, NAV_TOP, 200, NAV_HEIGHT);
}
function navBackHit(): boolean {
	return MouseIn(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT);
}
