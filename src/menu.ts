import { log } from "./log";
import { tellPlayer } from "./notify";
import { removeEffect, clearSuggestedPose, setSpeechBlocked, setScreenFade, clearTranceStates } from "./effects";
import {
	getFeatures,
	setFeature,
	FeatureToggles,
	experienceValue,
	rawExperience,
	exportSettings,
	importSettings,
	resetSettings,
	getTriggerScope,
	setTriggerScope,
	getTriggerDuration,
	setTriggerDuration,
	getDecayRate,
	getTriggerDecayRate,
	setTriggerDecayRate,
	setDecayRate,
	DECAY_RATES,
	setDepthOverride,
	clearDepthOverrides,
	getChemicalScope,
	setChemicalScope,
} from "./storage";
import { setSuppressed, setNumb, clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import { clearOrgasmDenial } from "./arousal";
import { clearIllusion } from "./illusion";
import { trustStatRows } from "./trust";
import { TRIGGER_SCOPES, decayLifetimeText } from "./triggers";
import { isHypnotized, currentTier, hardFloorStop } from "./session";
import {
	DEPTH_GATES,
	CHEMICAL_SCOPES,
	requiredTier,
	tierLabel,
	nextTier,
	nextScope,
	ChemicalScope,
} from "./depth";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import {
	TITLE_Y,
	PANEL_LEFT,
	PANEL_TOP,
	PANEL_WIDTH,
	PANEL_HEIGHT,
	BLURB_Y,
	CONTENT_LEFT,
	BACK_LEFT,
	BACK_TOP,
	BACK_SIZE,
	tabHitIndex,
	drawLeftText,
	drawLeftTextFit,
	drawTabsAndPanel,
} from "./panel";

// Registered via BC's real extension-settings screen (Screens/Character/Preference/
// Preference.js, PreferenceRegisterExtensionSetting) — adds one button into
// Preferences > Extensions, same mechanism LSCG uses. All draw/click coordinates and
// primitive signatures below (DrawCheckbox, DrawText, MouseIn, DrawRect, DrawEmptyRect)
// are verified against the live client source, not guessed.
//
// LAYOUT: tabs across the top, one group of settings visible at a time. Replaced a
// three-groups-in-two-columns sheet that was already at the edge of the canvas at twelve
// rows; tabs mean the next group costs a tab rather than a redesign. The previous layout
// is tagged `menu-checkbox-layout` in git if it needs to come back.

interface Row {
	key: keyof FeatureToggles;
	label: string;
}

interface Tab {
	name: string;
	blurb: string;
	/** Checkbox tabs. Omitted for a tab that draws itself. */
	rows?: Row[];
	/** Read-only tabs supply their own drawing instead of a row list. */
	render?: () => void;
	/** Drawn AFTER the rows, for a tab that has both checkboxes and other controls. */
	extra?: () => void;
	/** A tab that draws itself usually has to handle its own clicks too. Returns true when it
	 * consumed the click, so the generic row handling below knows to stop. */
	clickExtra?: () => boolean;
}

const TABS: Tab[] = [
	{
		name: "Permissions",
		blurb: "What others may do to you. All off by default. Triggers are persistent and outlive the session.",
		rows: [
			{ key: "hypnoEnabled", label: "Hypnosis Enabled" },
			{ key: "movementRestriction", label: "Movement Restriction" },
			{ key: "clothingRestriction", label: "Clothing Restriction" },
			{ key: "postureControl", label: "Posture Control" },
			{ key: "speechRestriction", label: "Speech Restriction" },
			{ key: "selfTouchControl", label: "Self-Touch Control" },
			{ key: "arousalControl", label: "Arousal & Orgasm" },
			{ key: "illusionControl", label: "Clothing Illusion" },
			{ key: "undressControl", label: "Undressing" },
			{ key: "lockedWhileHypnotized", label: "Lock settings while in trance" },
		],
	},
	{
		name: "Trance Defaults",
		blurb: "What being under is like, and what the room sees of it. On by default — this is the trance itself, not something granted.",
		rows: [
			{ key: "tranceCannotMove", label: "Cannot Move" },
			{ key: "tranceCannotSpeak", label: "Cannot Speak" },
			{ key: "tranceScreenFade", label: "Screen Fade" },
			{ key: "tranceClothingFreeze", label: "Clothes Look Unchanged" },
			{ key: "roomSeesReactions", label: "Others See Your Reactions" },
			{ key: "releaseOnDisconnect", label: "Release everything if you disconnect" },
		],
	},
	{
		name: "Awareness",
		blurb: "What you can be made unaware of. Hides the message only — arousal still applies.",
		rows: [
			{ key: "suppressClothing", label: "Clothing Changes" },
			{ key: "suppressBondage", label: "Bondage Changes" },
			{ key: "suppressActivities", label: "Touches / Activities" },
			{ key: "suppressTriggerSetup", label: "Trigger setup (hide what is planted)" },
		],
	},
	{
		// Triggers earned their own tab once there were three settings for them — a
		// permission, a scope and a duration. DW asked where the duration belonged, and
		// the honest answer was "nowhere yet".
		name: "Triggers",
		blurb: "Things that outlast the session. Both need a Deep trance by default — arousal never counts toward either.",
		rows: [
			{ key: "triggerControl", label: "Allow triggers to be planted in you" },
			{ key: "carryForward", label: "Suggestions that outlive the trance" },
			{ key: "selfTrigger", label: "You can fire your own triggers" },
			{ key: "showTriggerWords", label: "Show trigger words when you list them" },
		],
		extra: drawTriggerControls,
	},
	{
		// Depth earned its own tab rather than a column beside the permissions: thirteen
		// features times a tier control is more than the Permissions tab can carry, and the
		// two questions are genuinely different anyway. The checkbox asks "may they ever";
		// this asks "how far under do I have to be first".
		name: "Depth",
		blurb: "How deep you must be before each thing can reach you. The checkbox still has to be on.",
		render: drawDepthGates,
		clickExtra: clickDepthGates,
	},
	{
		name: "Stats",
		blurb: "Trust and experience. Counts are shown because they are what is actually stored.",
		render: drawStats,
	},
];

let activeTab = 0;

// --- Geometry ------------------------------------------------------------------------
// Screen chrome (tabs, panel, exit icon, text helpers) lives in panel.ts, shared with the
// help screen. What stays here is what only the settings screen has: checkbox rows and the
// data buttons.
/** Sits left of the exit icon at 1815, same size, so the two read as a pair. */
const HELP_LEFT = 1700;
const HELP_TOP = BACK_TOP;
const HELP_SIZE = BACK_SIZE;

const BOX_LEFT = CONTENT_LEFT;
const BOX_SIZE = 70;
const ROW_TOP_START = 280;
const ROW_SPACING = 78;

/** Columns for the Stats tab. */
const STAT_NAME_X = BOX_LEFT;
// 460 rather than 640. The widest thing in this column is a name and a member number —
// "WinnersDice [252905]" is about 340px — so 640 left a hand's width of nothing between the
// name and its value, and pushed the detail column out to where it had least room.
const STAT_VALUE_X = BOX_LEFT + 460;
const STAT_DETAIL_X = BOX_LEFT + 620;
/** What a name may use before it reaches the value column. BC names can run to 20 characters
 * and the member number adds nine more, so this one does need a cap now that the column is
 * only as wide as it has to be. */
const STAT_NAME_MAX = 440;
const STAT_LINE_HEIGHT = 40;
const STAT_EXPERIENCE_Y = 290;
const STAT_HEADER_Y = 330;
const STAT_FIRST_ROW_Y = 370;
/** Rows that fit above the page control. Everything past this pages rather than being
 * summarised away — a list that ends in "…and 30 more" is not a list. */
const STAT_ROWS_PER_PAGE = 7;

// Paging sits on the left, under the rows; the decay control is on the right, on the same
// band. They used to overlap the trust list entirely: the dropdown was positioned for a
// short list and the list grew past it.
const PAGE_BUTTON_TOP = 635;
const PAGE_BUTTON_WIDTH = 110;
const PAGE_BUTTON_HEIGHT = 46;
const PAGE_PREV_LEFT = BOX_LEFT;
const PAGE_NEXT_LEFT = BOX_LEFT + 130;
/** Which page of the trust list is showing. Reset whenever the screen opens. */
let statPage = 0;

// Export / Import / Reset, along the bottom of the Stats tab.
const DATA_BUTTON_TOP = 740;
const DATA_BUTTON_WIDTH = 200;
const DATA_BUTTON_HEIGHT = 60;
const DATA_BUTTON_GAP = 20;
const DATA_BUTTONS = ["Export", "Import", "Reset"] as const;

/** Reset is two-click: the first arms it, the second within the window commits. Wiping
 * every stat and toggle shouldn't be one misclick away, and a canvas screen has no
 * confirmation dialog to lean on. */
let resetArmedUntil = 0;
const RESET_ARM_MS = 5000;

function dataButtonLeft(index: number): number {
	return BOX_LEFT + index * (DATA_BUTTON_WIDTH + DATA_BUTTON_GAP);
}

// --- Depth tab ------------------------------------------------------------------------
// Click-to-cycle rather than thirteen dropdowns: DOM controls have to be created, positioned
// in canvas coordinates and explicitly removed, and thirteen of them layered over a screen
// that also pages would be a maintenance problem out of all proportion to a five-value
// choice. A button that advances one step reads fine for an ordered scale.
const DEPTH_ROW_TOP = 270;
const DEPTH_ROW_HEIGHT = 52;
const DEPTH_ROWS_PER_PAGE = 7;
const DEPTH_TIER_LEFT = BOX_LEFT + 890;
/** Room for the gate name before it reaches the tier button. The earned-only rows carry a
 * "(arousal never counts)" suffix that makes them half again as long as the rest, and page 2
 * of the Depth tab is entirely earned-only rows — so this is not a hypothetical. */
const DEPTH_LABEL_MAX = 890 - 40;
const DEPTH_TIER_WIDTH = 250;
const DEPTH_BUTTON_HEIGHT = 44;
const SCOPE_BUTTON_LEFT = BOX_LEFT;
const SCOPE_BUTTON_TOP = 740;
const SCOPE_BUTTON_WIDTH = 430;
const DEFAULTS_BUTTON_LEFT = BOX_LEFT + 470;
const DEFAULTS_BUTTON_WIDTH = 240;
let depthPage = 0;

function depthPageCount(): number {
	return Math.max(1, Math.ceil(DEPTH_GATES.length / DEPTH_ROWS_PER_PAGE));
}

function visibleGates(): typeof DEPTH_GATES {
	const from = depthPage * DEPTH_ROWS_PER_PAGE;
	return DEPTH_GATES.slice(from, from + DEPTH_ROWS_PER_PAGE);
}

function drawDepthGates(): void {
	const locked = settingsLocked();
	const features = getFeatures();
	visibleGates().forEach((gate, i) => {
		const top = DEPTH_ROW_TOP + i * DEPTH_ROW_HEIGHT;
		// A feature whose permission is off can never happen whatever the tier says, and
		// showing that plainly stops the tier reading as the only thing standing in the way.
		const granted = !!features[gate.key];
		drawLeftTextFit(
			`${gate.label}${gate.earnedOnly ? "  (arousal never counts)" : ""}`,
			BOX_LEFT,
			top + 30,
			DEPTH_LABEL_MAX,
			granted ? "Black" : "Gray",
		);
		DrawButton(
			DEPTH_TIER_LEFT,
			top,
			DEPTH_TIER_WIDTH,
			DEPTH_BUTTON_HEIGHT,
			tierLabel(requiredTier(gate.key)),
			locked ? "#ddd" : granted ? "White" : "#eee",
			"",
			locked ? "Locked while in trance" : "Click to require a deeper trance",
			locked,
		);
	});

	if (depthPageCount() > 1) {
		DrawButton(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Prev", "White", "", "", depthPage === 0);
		DrawButton(
			PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Next", "White", "", "",
			depthPage >= depthPageCount() - 1,
		);
		drawLeftText(`page ${depthPage + 1} of ${depthPageCount()}`, PAGE_NEXT_LEFT + 130, PAGE_BUTTON_TOP + 30, "Gray");
	}

	const scope = CHEMICAL_SCOPES.find((c) => c.key === getChemicalScope())?.label ?? "Arousal only";
	DrawButton(
		SCOPE_BUTTON_LEFT, SCOPE_BUTTON_TOP, SCOPE_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT,
		`Chemicals count: ${scope}`, locked ? "#ddd" : "White", "",
		"What may push you deeper besides trust. Never applies to the three above that say otherwise.",
		locked,
	);
	DrawButton(
		DEFAULTS_BUTTON_LEFT, SCOPE_BUTTON_TOP, DEFAULTS_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT,
		"Reset to defaults", locked ? "#ddd" : "White", "", "Forget every tier you have changed", locked,
	);

	// Where they are RIGHT NOW, so the numbers above mean something while reading the list.
	//
	// Beside the buttons rather than above the rows: it used to be drawn at DEPTH_ROW_TOP - 34,
	// which is exactly where the generic tab renderer puts the blurb, so the two printed on top
	// of each other and neither could be read. This row is the only band on the tab with space
	// to spare, and the status belongs with the summary controls anyway.
	const here = isHypnotized() ? `You are ${tierLabel(currentTier())} right now.` : "You are not under.";
	drawLeftText(here, DEFAULTS_BUTTON_LEFT + DEFAULTS_BUTTON_WIDTH + 40, SCOPE_BUTTON_TOP + 30, "Gray");
}

function clickDepthGates(): boolean {
	if (settingsLocked()) return true; // consume, so a locked screen cannot be edited by touch
	if (depthPageCount() > 1) {
		if (MouseIn(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
			depthPage = Math.max(0, depthPage - 1);
			return true;
		}
		if (MouseIn(PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
			depthPage = Math.min(depthPageCount() - 1, depthPage + 1);
			return true;
		}
	}
	if (MouseIn(SCOPE_BUTTON_LEFT, SCOPE_BUTTON_TOP, SCOPE_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT)) {
		const next: ChemicalScope = nextScope(getChemicalScope());
		setChemicalScope(next);
		log(`chemical scope set to ${next}`);
		return true;
	}
	if (MouseIn(DEFAULTS_BUTTON_LEFT, SCOPE_BUTTON_TOP, DEFAULTS_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT)) {
		clearDepthOverrides();
		notifyLocal("Depth requirements reset to their defaults.");
		return true;
	}
	const gates = visibleGates();
	for (let i = 0; i < gates.length; i++) {
		const top = DEPTH_ROW_TOP + i * DEPTH_ROW_HEIGHT;
		if (MouseIn(DEPTH_TIER_LEFT, top, DEPTH_TIER_WIDTH, DEPTH_BUTTON_HEIGHT)) {
			const next = nextTier(requiredTier(gates[i].key));
			setDepthOverride(gates[i].key, next);
			log(`${gates[i].key} now needs ${next}`);
			return true;
		}
	}
	return false;
}

function notifyLocal(message: string): void {
	log(message);
	tellPlayer(message);
}

function clickDataButton(index: number): void {
	const name = DATA_BUTTONS[index];
	if (name === "Export") {
		const blob = exportSettings();
		// Clipboard first — a 470-character blob is miserable to select out of the chat
		// log. Falls back to printing it, since clipboard access can be refused.
		navigator.clipboard?.writeText(blob).then(
			() => notifyLocal("Settings copied to clipboard. Keep it somewhere safe."),
			() => {
				notifyLocal("Could not reach the clipboard — copy the line below instead:");
				notifyLocal(blob);
			},
		);
		return;
	}
	if (name === "Import") {
		navigator.clipboard?.readText().then(
			(text) => {
				const result = importSettings(text);
				notifyLocal(result.ok ? `Imported: ${result.message}` : `Import failed: ${result.message}`);
			},
			() => notifyLocal("Could not read the clipboard — use /hypno import <blob> instead."),
		);
		return;
	}
	if (Date.now() > resetArmedUntil) {
		resetArmedUntil = Date.now() + RESET_ARM_MS;
		notifyLocal("Click Reset again within 5 seconds to erase all trust, experience and settings.");
		return;
	}
	resetArmedUntil = 0;
	notifyLocal(resetSettings());
}

function drawDataButtons(): void {
	const armed = Date.now() < resetArmedUntil;
	DATA_BUTTONS.forEach((name, i) => {
		const isReset = name === "Reset";
		DrawButton(
			dataButtonLeft(i),
			DATA_BUTTON_TOP,
			DATA_BUTTON_WIDTH,
			DATA_BUTTON_HEIGHT,
			isReset && armed ? "Confirm?" : name,
			isReset ? (armed ? "#ffb3b3" : "#ffe0e0") : "White",
			"",
			isReset ? "Erases everything — asks once first" : `${name} via clipboard`,
		);
	});
}

// --- Trigger scope dropdown ----------------------------------------------------------
// The first control here that isn't a canvas checkbox. It's a real DOM <select> layered
// over the canvas, which means a lifecycle the canvas widgets don't have: create it once,
// reposition it every frame (so it survives window resizes), and REMOVE it whenever it
// shouldn't be visible. Forget the removal and it hangs over whatever screen comes next.

const SCOPE_ID = "HypnosisAddonTriggerScope";
const SCOPE_LABEL_Y = 630;
const SCOPE_CENTRE_X = CONTENT_LEFT + 380;
const SCOPE_CENTRE_Y = 675;
const SCOPE_WIDTH = 760;
const SCOPE_HEIGHT = 56;

const DECAY_ID = "HypnosisAddonDecayRate";
const DECAY_LABEL_X = CONTENT_LEFT + 560;
// The last trust row sits at y=610 and 36px text reaches ~18px either side of its centre,
// so 635 would leave the label resting on top of it. 660 clears the row; the dropdown then
// has to fit between there and the data buttons at 740, hence 46 tall rather than 52.
const DECAY_LABEL_Y = 660;
const DECAY_CENTRE_X = CONTENT_LEFT + 940;
const DECAY_CENTRE_Y = 705;
// 520 rather than 640: the panel gave up 280px to the tab column, and this dropdown was the
// one control that could not simply move right — at its old width it would have ended at
// x=1970, past both the panel and the canvas.
const DECAY_WIDTH = 520;
const DECAY_HEIGHT = 46;

const TRIGGER_DECAY_ID = "HypnosisAddonTriggerDecay";
// Shares the duration row rather than claiming one of its own: the Triggers tab is already
// four toggles, a scope dropdown and a number box, and the next free band below runs into the
// bottom of the screen. Both labels go through drawLeftTextFit with a hard width, so a long
// translation shrinks instead of colliding — the duration box sits at 260-400 and this
// dropdown to its right, which is the whole reason they can share the line.
// Left-aligned with the dropdown it labels rather than floating between the two controls:
// +680 is the dropdown's own left edge (centre 930, width 500). It was 180px to the left of
// it, which read as a label belonging to neither box.
const TRIGGER_DECAY_LABEL_X = CONTENT_LEFT + 680;
const TRIGGER_DECAY_LABEL_MAX = 500;
const TRIGGER_DECAY_CENTRE_X = CONTENT_LEFT + 930;
const TRIGGER_DECAY_WIDTH = 500;

const DURATION_ID = "HypnosisAddonTriggerDuration";
const DURATION_LABEL_Y = 760;
const DURATION_CENTRE_X = CONTENT_LEFT + 70;
const DURATION_CENTRE_Y = 802;
const DURATION_WIDTH = 140;
const DURATION_HEIGHT = 56;
/** Under the decay dropdown, which ends at 830, and clear of the panel floor at 902. */
const DECAY_CAPTION_Y = 858;

/** Remove every DOM control this screen owns. Called from all three exits. */
function removeScopeControl(): void {
	for (const id of [SCOPE_ID, DURATION_ID, DECAY_ID, TRIGGER_DECAY_ID]) {
		if (document.getElementById(id)) ElementRemove(id);
	}
}

/** DOM controls are real elements over the canvas, so each one has to be taken away the
 * moment its own tab stops showing — otherwise it floats on top of whatever is drawn next.
 * Two tabs own controls now, which is why this is per-tab rather than a single "not the
 * Triggers tab" check: switching from Triggers to Stats left the scope dropdown sitting
 * over the stats table. */
function syncTabControls(tabName: string): void {
	if (tabName !== "Triggers") {
		if (document.getElementById(SCOPE_ID)) ElementRemove(SCOPE_ID);
		if (document.getElementById(DURATION_ID)) ElementRemove(DURATION_ID);
		if (document.getElementById(TRIGGER_DECAY_ID)) ElementRemove(TRIGGER_DECAY_ID);
	}
	if (tabName !== "Stats" && document.getElementById(DECAY_ID)) ElementRemove(DECAY_ID);
}

/** How fast trust fades without contact.
 *
 * Named speeds rather than a number, per DW: the player picks "Slowly", so what that means
 * behind the scenes can be retuned without their saved choice changing meaning. Lives on
 * the Stats tab because that is where trust is already shown — it is the one control that
 * changes what those numbers do. */
function drawDecayControl(): void {
	const locked = settingsLocked();
	drawLeftText("Trust fades when you don't see someone:", DECAY_LABEL_X, DECAY_LABEL_Y, locked ? "Gray" : "Black");
	let element = document.getElementById(DECAY_ID) as HTMLSelectElement | null;
	if (!element) {
		element = ElementCreateDropdown(
			DECAY_ID,
			DECAY_RATES.map((r) => r.label),
			function () {
				setDecayRate(DECAY_RATES[this.selectedIndex]?.key ?? "never");
				log(`trust decay set to ${getDecayRate()}`);
			},
		);
	}
	const index = DECAY_RATES.findIndex((r) => r.key === getDecayRate());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	ElementPosition(DECAY_ID, DECAY_CENTRE_X, DECAY_CENTRE_Y, DECAY_WIDTH, DECAY_HEIGHT);
}

/** The trigger tab's two DOM controls: scope and duration. */
function drawTriggerControls(): void {
	const locked = settingsLocked();
	drawScopeControl(locked);
	drawDurationControl(locked);
	drawTriggerDecayControl(locked);
}

/** How fast planted triggers fade without reinforcement.
 *
 * A separate control from the trust one on the Stats tab, and separate on purpose: trust is
 * what someone has built with you and a trigger is a thing they left inside you. Wanting one
 * to persist says nothing about the other, and the doc calls for two settings. */
function drawTriggerDecayControl(locked: boolean): void {
	drawLeftTextFit(
		"Triggers fade without reinforcement:",
		TRIGGER_DECAY_LABEL_X,
		DURATION_LABEL_Y,
		TRIGGER_DECAY_LABEL_MAX,
		locked ? "Gray" : "Black",
	);
	let element = document.getElementById(TRIGGER_DECAY_ID) as HTMLSelectElement | null;
	if (!element) {
		element = ElementCreateDropdown(
			TRIGGER_DECAY_ID,
			DECAY_RATES.map((r) => r.label),
			function () {
				setTriggerDecayRate(DECAY_RATES[this.selectedIndex]?.key ?? "never");
				log(`trigger decay set to ${getTriggerDecayRate()}`);
			},
		);
	}
	// Re-synced every frame like the scope control, for the same reason: an import or a reset
	// changes the stored value underneath us and the control must not keep showing the old one.
	const index = DECAY_RATES.findIndex((r) => r.key === getTriggerDecayRate());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	ElementPosition(TRIGGER_DECAY_ID, TRIGGER_DECAY_CENTRE_X, DURATION_CENTRE_Y, TRIGGER_DECAY_WIDTH, DURATION_HEIGHT);
	// What the setting COSTS, under the control that sets it. The names alone were actively
	// misleading before v0.62.0 — "Very fast" meant three weeks — and a name is not something a
	// player can check. A duration is.
	drawLeftTextFit(
		decayLifetimeText(),
		TRIGGER_DECAY_LABEL_X,
		DECAY_CAPTION_Y,
		TRIGGER_DECAY_WIDTH,
		locked ? "Gray" : "#555",
	);
}

/** How long a fired trigger holds before letting go by itself. A number box rather than a
 * dropdown so any value can be typed; BC's own blur handler does the clamping, using the
 * min/max attributes below. */
function drawDurationControl(locked: boolean): void {
	// Shortened and width-capped now that the decay dropdown shares this row. The long form
	// ran past x=900 and would have sat under the label beside it.
	drawLeftTextFit(
		"Minutes a fired trigger lasts (0 = until released):",
		CONTENT_LEFT,
		DURATION_LABEL_Y,
		460,
		locked ? "Gray" : "Black",
	);
	let element = document.getElementById(DURATION_ID) as HTMLInputElement | null;
	if (!element) {
		element = ElementCreateInput(DURATION_ID, "number", String(getTriggerDuration()), 4);
		element.min = "0";
		element.max = "1440";
		element.inputMode = "numeric";
		// Commit on blur, not on every keystroke — otherwise typing "15" saves 1 on the way
		// to 15. ElementNumberInputBlur clamps to min/max first.
		element.addEventListener("blur", function (this: HTMLInputElement, event: Event) {
			ElementNumberInputBlur.call(this, event);
			const saved = setTriggerDuration(Number(this.value));
			this.value = String(saved);
			log(`trigger duration set to ${saved} min`);
		});
		element.addEventListener("wheel", ElementNumberInputWheel as any);
	}
	if (document.activeElement !== element) element.value = String(getTriggerDuration());
	element.disabled = locked;
	ElementPosition(DURATION_ID, DURATION_CENTRE_X, DURATION_CENTRE_Y, DURATION_WIDTH, DURATION_HEIGHT);
}

function drawScopeControl(locked: boolean): void {
	drawLeftText("Who else can fire triggers planted in you:", CONTENT_LEFT, SCOPE_LABEL_Y, locked ? "Gray" : "Black");
	let element = document.getElementById(SCOPE_ID) as HTMLSelectElement | null;
	if (!element) {
		element = ElementCreateDropdown(
			SCOPE_ID,
			TRIGGER_SCOPES.map((s) => s.label),
			function () {
				setTriggerScope(TRIGGER_SCOPES[this.selectedIndex]?.key ?? "hypnotist");
				log(`trigger scope set to ${getTriggerScope()}`);
			},
		);
	}
	// Re-sync each frame rather than only on create: an import or a reset changes the
	// stored value underneath us, and the control must not keep showing the old one.
	const index = TRIGGER_SCOPES.findIndex((s) => s.key === getTriggerScope());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	ElementPosition(SCOPE_ID, SCOPE_CENTRE_X, SCOPE_CENTRE_Y, SCOPE_WIDTH, SCOPE_HEIGHT);
}

function statPageCount(): number {
	return Math.max(1, Math.ceil(trustStatRows().length / STAT_ROWS_PER_PAGE));
}

/** Paged rather than a pick-one dropdown, deliberately. The ranking IS the information —
 * who you are closest to, and how far ahead of everyone else they are — and a dropdown
 * showing one person at a time throws that away while also being a worse way to find
 * anyone in a list of forty. */
function drawStats(): void {
	const line = (y: number, name: string, value: string, detail: string, color = "Black") => {
		drawLeftTextFit(name, STAT_NAME_X, y, STAT_NAME_MAX, color);
		if (value) drawLeftText(value, STAT_VALUE_X, y, color);
		if (detail) drawLeftText(detail, STAT_DETAIL_X, y, "Gray");
	};

	drawDecayControl();
	line(STAT_EXPERIENCE_Y, "Experience", experienceValue().toFixed(1), `${rawExperience().toFixed(2)} from inductions`);
	line(STAT_HEADER_Y, "Trust", "value", "detail", "Gray");

	const rows = trustStatRows();
	if (!rows.length) {
		drawLeftText("Nobody yet — trust builds from conversation in the same room.", STAT_NAME_X, STAT_FIRST_ROW_Y, "Gray");
		drawDataButtons();
		return;
	}

	const pages = statPageCount();
	if (statPage >= pages) statPage = pages - 1;
	const start = statPage * STAT_ROWS_PER_PAGE;
	rows.slice(start, start + STAT_ROWS_PER_PAGE).forEach((row, i) => {
		line(STAT_FIRST_ROW_Y + i * STAT_LINE_HEIGHT, row.name, row.trust, row.detail);
	});

	if (pages > 1) {
		DrawButton(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Prev", "White", "", "", statPage === 0);
		DrawButton(PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Next", "White", "", "", statPage >= pages - 1);
		drawLeftText(
			`${statPage + 1} / ${pages}  ·  ${rows.length} people`,
			PAGE_NEXT_LEFT + PAGE_BUTTON_WIDTH + 24,
			PAGE_BUTTON_TOP + PAGE_BUTTON_HEIGHT / 2,
			"Gray",
		);
	}
	drawDataButtons();
}

// Same verified coordinate the remote subscreen uses — BC's own Information Sheet Back
/** Only 7 rows fit between ROW_TOP_START and the panel floor, so a tab with more spills
 * off the bottom invisibly — which is exactly what happened when Permissions reached 8 and
 * the Lock row was drawn below the panel with no sign anything was missing. Past the
 * threshold a tab splits into two columns instead. */
const MAX_ROWS_PER_COLUMN = 6;
const COLUMN_TWO_LEFT = BOX_LEFT + 650;
/** What a row label may use before it reaches the next column — or, in the right-hand column,
 * the panel edge. Only applied in two-column mode: capping a single-column tab would shrink
 * text that has the whole width to itself. */
const ROW_LABEL_MAX = 480;

function rowPosition(index: number, total: number): { left: number; top: number; labelMax: number } {
	const twoColumn = total > MAX_ROWS_PER_COLUMN;
	const perColumn = twoColumn ? Math.ceil(total / 2) : total;
	const column = Math.floor(index / perColumn);
	const row = index % perColumn;
	return {
		left: column === 0 ? BOX_LEFT : COLUMN_TWO_LEFT,
		top: ROW_TOP_START + row * ROW_SPACING,
		// A single column has the whole panel; two share it, and the left one must stop before
		// the right one's checkbox rather than running under it.
		labelMax: twoColumn ? ROW_LABEL_MAX : PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - BOX_SIZE - 60,
	};
}

/** Are the checkboxes currently frozen? Read live at draw and click time rather than
 * cached, so the lock lifts the instant a session ends without anything having to notice.
 *
 * Tabs stay clickable and the exit button still works — the screen is readable while
 * locked, just not editable. `/hypno safeword` remains the way out in every case, and
 * being a chat command it's untouched by any of this. */
function settingsLocked(): boolean {
	return getFeatures().lockedWhileHypnotized && isHypnotized();
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: "HypnosisAddon",
		ButtonText: "Hypnosis Add-on",
		// Always open on the first tab — coming back to a screen part-way through a
		// previous visit's navigation is disorienting.
		load: () => {
			activeTab = 0;
			statPage = 0;
			removeScopeControl();
			closeHelp();
		},
		run: () => {
			if (isHelpOpen()) {
				// DOM controls belong to the settings screen and would float over the help
				// text, which is canvas — they have to go before help draws over them.
				removeScopeControl();
				drawHelp("BC Hypnosis Add-on — help");
				return;
			}
			DrawText("BC Hypnosis Add-on — settings", MainCanvasWidth / 2, TITLE_Y, "Black");
			DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");
			DrawButton(HELP_LEFT, HELP_TOP, HELP_SIZE, HELP_SIZE, "?", "White", "", "How this add-on works");

			drawTabsAndPanel(TABS.map((t) => t.name), activeTab);

			const tab = TABS[activeTab];
			const locked = settingsLocked();
			// Fitted, not just drawn: these run long, and the panel edge is not a hint the
			// canvas takes on its own.
			drawLeftTextFit(
				locked ? "Locked while you are in trance. /hypno safeword always works." : tab.blurb,
				BOX_LEFT,
				BLURB_Y,
				PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - 40,
				"Gray",
			);

			syncTabControls(tab.name);

			if (tab.render) {
				tab.render();
				return;
			}
			const features = getFeatures();
			const rows = tab.rows ?? [];
			rows.forEach((row, i) => {
				const { left, top, labelMax } = rowPosition(i, rows.length);
				// Empty label — DrawCheckbox centers its own at a fixed offset regardless of
				// Width, which overlaps the box for anything but very short text. Draw the
				// label ourselves, left-aligned and clear of the box.
				DrawCheckbox(left, top, BOX_SIZE, BOX_SIZE, "", features[row.key], locked);
				drawLeftTextFit(row.label, left + BOX_SIZE + 20, top + 26, labelMax, locked ? "Gray" : "Black");
			});
			tab.extra?.();
		},
		click: () => {
			if (isHelpOpen()) {
				clickHelp();
				return;
			}
			if (MouseIn(HELP_LEFT, HELP_TOP, HELP_SIZE, HELP_SIZE)) {
				removeScopeControl();
				openHelp();
				return;
			}
			if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
				PreferenceSubscreenExtensionsClear();
				return;
			}
			const hitTab = tabHitIndex(TABS.length);
			if (hitTab !== null) {
				activeTab = hitTab;
				depthPage = 0;
				removeScopeControl();
				return;
			}
			// A self-drawing tab handles its own clicks first. Stats predates this and keeps
			// its handling inline below; Depth uses the hook.
			if (TABS[activeTab].clickExtra?.()) return;
			// Data buttons live on the Stats tab, which has no rows.
			if (TABS[activeTab].render) {
				if (MouseIn(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
					statPage = Math.max(0, statPage - 1);
					return;
				}
				if (MouseIn(PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
					statPage = Math.min(statPageCount() - 1, statPage + 1);
					return;
				}
				for (let i = 0; i < DATA_BUTTONS.length; i++) {
					if (MouseIn(dataButtonLeft(i), DATA_BUTTON_TOP, DATA_BUTTON_WIDTH, DATA_BUTTON_HEIGHT)) {
						clickDataButton(i);
						return;
					}
				}
				return;
			}
			// Checked here as well as at draw time, not just relied on visually: a greyed
			// checkbox that still toggles when clicked is worse than no lock at all.
			if (settingsLocked()) return;
			// Only the visible tab's rows are clickable — hidden tabs' rows occupy the same
			// coordinates, so without this a single click would toggle one row per tab.
			const features = getFeatures();
			const clickRows = TABS[activeTab].rows ?? [];
			clickRows.forEach((row, i) => {
				const { left, top } = rowPosition(i, clickRows.length);
				if (MouseIn(left, top, BOX_SIZE, BOX_SIZE)) {
					const next = !features[row.key];
					setFeature(row.key, next);
					onToggle(row.key, next);
					log(`${row.key} set to ${next}`);
				}
			});
		},
		// Both exit paths matter: exit() for our own back button, unload() for BC tearing
		// the screen down some other way. Missing either leaves the dropdown floating.
		// Both exit paths also close help: it is a module-level flag shared with the remote
		// panel, so leaving it set would greet the next screen with a help page.
		unload: () => {
			removeScopeControl();
			closeHelp();
		},
		exit: () => {
			removeScopeControl();
			closeHelp();
			return true;
		},
	});
}

// These are PERMISSION settings, not self-triggers — "do I allow someone else to do this
// to me", checked when a remote request or spoken suggestion arrives. Checking a box never
// applies an effect to yourself; unchecking one DOES immediately release that effect if
// it's currently active (revoking consent mid-effect should end it, not merely block future
// requests), and hypnoEnabled off is a hard floor that releases everything regardless of
// the individual flags — matching the design doc's "clears active trance, suspends all
// effects". Turning hypnoEnabled back on does NOT restore what was released.
export function onToggle(key: keyof FeatureToggles, enabled: boolean): void {
	switch (key) {
		case "hypnoEnabled":
			// The hard floor, and it now ends the SESSION rather than only stripping effects.
			//
			// The old list cleared eight things and left the session running — phase still
			// Hypnotized, hypnotist still attached, timer still counting, depths still set.
			// So turning the master switch off and back on resumed the trance with no new
			// induction, and the next attempt was refused "Already under." by someone who had
			// switched the add-on off. The doc says "clears active trance, suspends all
			// effects"; only the second half was happening.
			//
			// Delegated rather than extended, because keeping a second copy of the
			// everything-off list in step with the safeword's is what failed here before: the
			// illusion and the denial lock had already gone missing from this one once.
			if (!enabled) hardFloorStop();
			break;
		case "movementRestriction":
			if (!enabled) removeEffect("Freeze");
			break;
		case "clothingRestriction":
			if (!enabled) removeEffect("BlockWardrobe");
			break;
		case "postureControl":
			if (!enabled) clearSuggestedPose();
			break;
		case "speechRestriction":
		case "tranceCannotSpeak":
			if (!enabled) setSpeechBlocked(false);
			break;
		case "tranceCannotMove":
			if (!enabled) removeEffect("Freeze");
			break;
		case "tranceScreenFade":
			if (!enabled) setScreenFade(0);
			break;
		case "selfTouchControl":
			if (!enabled) clearSelfTouchBlocks();
			break;
		case "suppressClothing":
			if (!enabled) setSuppressed("clothing", false);
			break;
		case "suppressBondage":
			if (!enabled) setSuppressed("bondage", false);
			break;
		case "suppressActivities":
			if (!enabled) setSuppressed("activity", false);
			break;
		case "arousalControl":
			// Two lasting states answer to this permission. Numbness lives with the
			// suppression state (see suppression.ts for why, despite the permission); the
			// denial LOCK is a BC effect we applied. The arousal LEVEL is deliberately NOT
			// reset — that is a number they now carry, not something still being done to
			// them, exactly as endSession already reasons about it.
			if (!enabled) {
				setNumb(false);
				clearOrgasmDenial();
			}
			break;
		case "illusionControl":
			// The one that mattered most and was missing longest: revoking this left the
			// subject still unable to see their own clothes, with the setting that caused it
			// switched off. A permission that cannot be withdrawn is not a permission.
			if (!enabled) clearIllusion();
			break;
		case "lockedWhileHypnotized":
			// No immediate effect — it only matters while a trance is running, and
			// settingsLocked() reads it live at draw and click time.
			break;
	}
}
