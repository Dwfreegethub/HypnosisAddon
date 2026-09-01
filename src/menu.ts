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
	setDecayRate,
	DECAY_RATES,
} from "./storage";
import { setSuppressed, setNumb, clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import { trustStatRows } from "./trust";
import { TRIGGER_SCOPES } from "./triggers";
import { isHypnotized } from "./session";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import {
	TITLE_Y,
	TAB_TOP,
	TAB_HEIGHT,
	TAB_WIDTH,
	PANEL_LEFT,
	PANEL_TOP,
	PANEL_WIDTH,
	PANEL_HEIGHT,
	BLURB_Y,
	CONTENT_LEFT,
	BACK_LEFT,
	BACK_TOP,
	BACK_SIZE,
	tabLeft,
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
		blurb: "Things that outlast the session. Both need trust 65 — arousal does not count toward either.",
		rows: [
			{ key: "triggerControl", label: "Allow triggers to be planted in you" },
			{ key: "carryForward", label: "Suggestions that outlive the trance" },
			{ key: "selfTrigger", label: "You can fire your own triggers" },
			{ key: "showTriggerWords", label: "Show trigger words when you list them" },
		],
		extra: drawTriggerControls,
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
const ROW_TOP_START = 350;
const ROW_SPACING = 78;

/** Columns for the Stats tab. */
const STAT_NAME_X = BOX_LEFT;
const STAT_VALUE_X = 900;
const STAT_DETAIL_X = 1100;
const STAT_LINE_HEIGHT = 40;
const STAT_EXPERIENCE_Y = 360;
const STAT_HEADER_Y = 400;
const STAT_FIRST_ROW_Y = 440;
/** Rows that fit above the page control. Everything past this pages rather than being
 * summarised away — a list that ends in "…and 30 more" is not a list. */
const STAT_ROWS_PER_PAGE = 7;

// Paging sits on the left, under the rows; the decay control is on the right, on the same
// band. They used to overlap the trust list entirely: the dropdown was positioned for a
// short list and the list grew past it.
const PAGE_BUTTON_TOP = 705;
const PAGE_BUTTON_WIDTH = 110;
const PAGE_BUTTON_HEIGHT = 46;
const PAGE_PREV_LEFT = BOX_LEFT;
const PAGE_NEXT_LEFT = BOX_LEFT + 130;
/** Which page of the trust list is showing. Reset whenever the screen opens. */
let statPage = 0;

// Export / Import / Reset, along the bottom of the Stats tab.
const DATA_BUTTON_TOP = 810;
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
const SCOPE_LABEL_Y = 700;
const SCOPE_CENTRE_X = 260 + 380;
const SCOPE_CENTRE_Y = 745;
const SCOPE_WIDTH = 760;
const SCOPE_HEIGHT = 56;

const DECAY_ID = "HypnosisAddonDecayRate";
const DECAY_LABEL_X = 950;
// The last trust row sits at y=680 and 36px text reaches ~18px either side of its centre,
// so 705 left the label resting on top of it. 730 clears the row; the dropdown then has to
// fit between there and the data buttons at 810, hence 46 tall rather than 52.
const DECAY_LABEL_Y = 730;
const DECAY_CENTRE_X = 1370;
const DECAY_CENTRE_Y = 775;
const DECAY_WIDTH = 640;
const DECAY_HEIGHT = 46;

const DURATION_ID = "HypnosisAddonTriggerDuration";
const DURATION_LABEL_Y = 830;
const DURATION_CENTRE_X = 260 + 70;
const DURATION_CENTRE_Y = 872;
const DURATION_WIDTH = 140;
const DURATION_HEIGHT = 56;

/** Remove every DOM control this screen owns. Called from all three exits. */
function removeScopeControl(): void {
	for (const id of [SCOPE_ID, DURATION_ID, DECAY_ID]) {
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
}

/** How long a fired trigger holds before letting go by itself. A number box rather than a
 * dropdown so any value can be typed; BC's own blur handler does the clamping, using the
 * min/max attributes below. */
function drawDurationControl(locked: boolean): void {
	drawLeftText(
		"Minutes a fired trigger lasts before it wears off (0 = until released):",
		260,
		DURATION_LABEL_Y,
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
	drawLeftText("Who else can fire triggers planted in you:", 260, SCOPE_LABEL_Y, locked ? "Gray" : "Black");
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
		drawLeftText(name, STAT_NAME_X, y, color);
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
const COLUMN_TWO_LEFT = 1000;

function rowPosition(index: number, total: number): { left: number; top: number } {
	const perColumn = total > MAX_ROWS_PER_COLUMN ? Math.ceil(total / 2) : total;
	const column = Math.floor(index / perColumn);
	const row = index % perColumn;
	return {
		left: column === 0 ? BOX_LEFT : COLUMN_TWO_LEFT,
		top: ROW_TOP_START + row * ROW_SPACING,
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
				const { left, top } = rowPosition(i, rows.length);
				// Empty label — DrawCheckbox centers its own at a fixed offset regardless of
				// Width, which overlaps the box for anything but very short text. Draw the
				// label ourselves, left-aligned and clear of the box.
				DrawCheckbox(left, top, BOX_SIZE, BOX_SIZE, "", features[row.key], locked);
				drawLeftText(row.label, left + BOX_SIZE + 20, top + 26, locked ? "Gray" : "Black");
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
				removeScopeControl();
				return;
			}
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
function onToggle(key: keyof FeatureToggles, enabled: boolean): void {
	switch (key) {
		case "hypnoEnabled":
			if (!enabled) {
				removeEffect("Freeze");
				removeEffect("BlockWardrobe");
				clearSuggestedPose();
				clearTranceStates();
				clearAllSuppression();
				clearSelfTouchBlocks();
			}
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
			// Numbness is the only arousal-permission effect that is a lasting STATE rather
			// than a one-off change to a number, so it is the only one there is anything to
			// release. See the note in suppression.ts on why it lives with the suppression
			// state despite answering to this permission.
			if (!enabled) setNumb(false);
			break;
		case "lockedWhileHypnotized":
			// No immediate effect — it only matters while a trance is running, and
			// settingsLocked() reads it live at draw and click time.
			break;
	}
}
