import { log } from "./log";
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
} from "./storage";
import { setSuppressed, clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import { trustStatRows } from "./trust";
import { TRIGGER_SCOPES } from "./triggers";
import { isHypnotized } from "./session";

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
			{ key: "triggerControl", label: "Triggers (needs trust 65)" },
			{ key: "lockedWhileHypnotized", label: "Lock settings while in trance" },
		],
	},
	{
		name: "Trance Defaults",
		blurb: "What being under is like. On by default — this is the trance itself, not something granted.",
		rows: [
			{ key: "tranceCannotMove", label: "Cannot Move" },
			{ key: "tranceCannotSpeak", label: "Cannot Speak" },
			{ key: "tranceScreenFade", label: "Screen Fade" },
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
		name: "Stats",
		blurb: "Read-only. Interaction counts are shown because they're what's actually stored — and what makes the pace legible.",
		render: drawStats,
	},
];

let activeTab = 0;

// --- Geometry ------------------------------------------------------------------------
const TITLE_Y = 110;

const TAB_TOP = 190;
const TAB_HEIGHT = 72;
const TAB_LEFT = 200;
const TAB_WIDTH = 340;
const TAB_GAP = 8;

const PANEL_LEFT = 200;
const PANEL_TOP = 262;
const PANEL_WIDTH = 1600;
const PANEL_HEIGHT = 640;
/** Border thickness. Everything is a filled rect rather than a stroke so the tab-to-panel
 * join lands on exact pixels — see drawTabsAndPanel. */
const BORDER = 3;

const BLURB_Y = 305;
const BOX_LEFT = 260;
const BOX_SIZE = 70;
const ROW_TOP_START = 350;
const ROW_SPACING = 78;

/** Columns for the Stats tab. */
const STAT_NAME_X = BOX_LEFT;
const STAT_VALUE_X = 900;
const STAT_DETAIL_X = 1100;
const STAT_LINE_HEIGHT = 40;
/** Rows that fit between the first line and the data buttons below. */
const STAT_MAX_ROWS = 8;

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
	ChatRoomSendLocal(message);
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

function removeScopeControl(): void {
	if (document.getElementById(SCOPE_ID)) ElementRemove(SCOPE_ID);
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

function drawStats(): void {
	let y = ROW_TOP_START + 10;
	const line = (name: string, value: string, detail: string, color = "Black") => {
		drawLeftText(name, STAT_NAME_X, y, color);
		if (value) drawLeftText(value, STAT_VALUE_X, y, color);
		if (detail) drawLeftText(detail, STAT_DETAIL_X, y, "Gray");
		y += STAT_LINE_HEIGHT;
	};

	line("Experience", experienceValue().toFixed(1), `${rawExperience().toFixed(2)} from inductions`);
	y += 16;
	line("Trust", "value", "detail", "Gray");

	const rows = trustStatRows();
	if (!rows.length) {
		drawLeftText("Nobody yet — trust builds from conversation in the same room.", STAT_NAME_X, y, "Gray");
		drawDataButtons();
		return;
	}
	for (const row of rows.slice(0, STAT_MAX_ROWS)) line(row.name, row.trust, row.detail);
	if (rows.length > STAT_MAX_ROWS) {
		drawLeftText(`…and ${rows.length - STAT_MAX_ROWS} more — /hypno logtrust lists everyone.`, STAT_NAME_X, y, "Gray");
	}
	drawDataButtons();
}

// Same verified coordinate the remote subscreen uses — BC's own Information Sheet Back
// button is MouseIn(1815, 75, 90, 90), and this screen has no canvas equivalent of its
// own to copy (the Preferences exit is DOM-positioned via ElementMenu).
const BACK_LEFT = 1815;
const BACK_TOP = 75;
const BACK_SIZE = 90;

function tabLeft(index: number): number {
	return TAB_LEFT + index * (TAB_WIDTH + TAB_GAP);
}

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

/** Left-aligned text. BC's canvas defaults to centered, so every label needs this. */
function drawLeftText(text: string, x: number, y: number, color = "Black"): void {
	MainCanvas.save();
	MainCanvas.textAlign = "left";
	DrawText(text, x, y, color, "Gray");
	MainCanvas.restore();
}

/** Draw the tab strip and the content panel as one connected shape.
 *
 * The seam between the active tab and the panel is NEVER DRAWN, rather than drawn and
 * then painted over. A first attempt erased it with a white rectangle and left a visible
 * hairline: canvas strokes are anti-aliased and bleed sub-pixel past their nominal
 * bounds, so a cover rectangle on exact integer coordinates always leaves faint edges.
 *
 * So: inactive tabs are ordinary DrawButtons (hover highlighting comes free), while the
 * active tab is drawn by hand as a white fill plus three border segments — left, top,
 * right, no bottom — and the panel's own top border is drawn in two pieces that stop
 * either side of it. Every border is a filled DrawRect rather than a stroke, so nothing
 * is anti-aliased and the joins are exact. */
function drawTabsAndPanel(): void {
	const activeLeft = tabLeft(activeTab);
	const activeRight = activeLeft + TAB_WIDTH;
	const panelRight = PANEL_LEFT + PANEL_WIDTH;
	const panelBottom = PANEL_TOP + PANEL_HEIGHT;

	// Panel interior, and the inactive tabs sitting on its edge.
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	TABS.forEach((tab, i) => {
		if (i !== activeTab) DrawButton(tabLeft(i), TAB_TOP, TAB_WIDTH, TAB_HEIGHT, tab.name, "#d8d8d8");
	});

	// Active tab: white through to the panel interior, so no join is visible at all.
	DrawRect(activeLeft, TAB_TOP, TAB_WIDTH, TAB_HEIGHT + BORDER, "White");
	DrawRect(activeLeft, TAB_TOP, TAB_WIDTH, BORDER, "Black"); // top
	DrawRect(activeLeft, TAB_TOP, BORDER, TAB_HEIGHT, "Black"); // left
	DrawRect(activeRight - BORDER, TAB_TOP, BORDER, TAB_HEIGHT, "Black"); // right
	DrawTextFit(TABS[activeTab].name, activeLeft + TAB_WIDTH / 2, TAB_TOP + TAB_HEIGHT / 2 + 1, TAB_WIDTH - 4, "black");

	// Panel border: top in two pieces that stop either side of the active tab, then the
	// other three sides whole. Widths clamp to 0 when the active tab is at either end.
	DrawRect(PANEL_LEFT, PANEL_TOP, Math.max(0, activeLeft - PANEL_LEFT), BORDER, "Black");
	DrawRect(activeRight, PANEL_TOP, Math.max(0, panelRight - activeRight), BORDER, "Black");
	DrawRect(PANEL_LEFT, PANEL_TOP, BORDER, PANEL_HEIGHT, "Black");
	DrawRect(panelRight - BORDER, PANEL_TOP, BORDER, PANEL_HEIGHT, "Black");
	DrawRect(PANEL_LEFT, panelBottom - BORDER, PANEL_WIDTH, BORDER, "Black");
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: "HypnosisAddon",
		ButtonText: "Hypnosis Add-on",
		// Always open on the first tab — coming back to a screen part-way through a
		// previous visit's navigation is disorienting.
		load: () => {
			activeTab = 0;
			removeScopeControl();
		},
		run: () => {
			DrawText("BC Hypnosis Add-on — settings", MainCanvasWidth / 2, TITLE_Y, "Black");
			DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");

			drawTabsAndPanel();

			const tab = TABS[activeTab];
			const locked = settingsLocked();
			drawLeftText(
				locked ? "Locked while you are in trance. /hypno safeword always works." : tab.blurb,
				BOX_LEFT,
				BLURB_Y,
				"Gray",
			);

			// The scope dropdown belongs to Permissions only — remove it the moment any
			// other tab is showing, or a DOM element sits over the Stats table.
			if (tab.name === "Permissions") drawScopeControl(locked);
			else removeScopeControl();

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
		},
		click: () => {
			if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
				PreferenceSubscreenExtensionsClear();
				return;
			}
			for (let i = 0; i < TABS.length; i++) {
				if (MouseIn(tabLeft(i), TAB_TOP, TAB_WIDTH, TAB_HEIGHT)) {
					activeTab = i;
					return;
				}
			}
			// Data buttons live on the Stats tab, which has no rows.
			if (TABS[activeTab].render) {
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
		unload: () => removeScopeControl(),
		exit: () => {
			removeScopeControl();
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
		case "lockedWhileHypnotized":
			// No immediate effect — it only matters while a trance is running, and
			// settingsLocked() reads it live at draw and click time.
			break;
	}
}
