import { log } from "./log";
import { removeEffect, clearSuggestedPose, setSpeechBlocked, setScreenFade, clearTranceStates } from "./effects";
import { getFeatures, setFeature, FeatureToggles } from "./storage";
import { setSuppressed, clearAllSuppression } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";

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
	rows: Row[];
}

const TABS: Tab[] = [
	{
		name: "Permissions",
		blurb: "What others may do to you. All off by default.",
		rows: [
			{ key: "hypnoEnabled", label: "Hypnosis Enabled" },
			{ key: "movementRestriction", label: "Movement Restriction" },
			{ key: "clothingRestriction", label: "Clothing Restriction" },
			{ key: "postureControl", label: "Posture Control (kneel / stand)" },
			{ key: "speechRestriction", label: "Speech Restriction" },
			{ key: "selfTouchControl", label: "Self-Touch Control" },
			{ key: "hiddenActivities", label: "Hidden Activities" },
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
		],
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

const BLURB_Y = 305;
const BOX_LEFT = 260;
const BOX_SIZE = 70;
const ROW_TOP_START = 350;
const ROW_SPACING = 78;

// Same verified coordinate the remote subscreen uses — BC's own Information Sheet Back
// button is MouseIn(1815, 75, 90, 90), and this screen has no canvas equivalent of its
// own to copy (the Preferences exit is DOM-positioned via ElementMenu).
const BACK_LEFT = 1815;
const BACK_TOP = 75;
const BACK_SIZE = 90;

function tabLeft(index: number): number {
	return TAB_LEFT + index * (TAB_WIDTH + TAB_GAP);
}

function rowTop(index: number): number {
	return ROW_TOP_START + index * ROW_SPACING;
}

/** Left-aligned text. BC's canvas defaults to centered, so every label needs this. */
function drawLeftText(text: string, x: number, y: number, color = "Black"): void {
	MainCanvas.save();
	MainCanvas.textAlign = "left";
	DrawText(text, x, y, color, "Gray");
	MainCanvas.restore();
}

/** Tabs are DrawButtons sitting on the panel's top edge; the active one is painted the
 * same white as the panel and then has the border segment beneath it erased, so it reads
 * as continuous with the content rather than as a button floating above it. */
function drawTabs(): void {
	TABS.forEach((tab, i) => {
		const active = i === activeTab;
		DrawButton(tabLeft(i), TAB_TOP, TAB_WIDTH, TAB_HEIGHT, tab.name, active ? "White" : "#d8d8d8");
		if (active) {
			// Erase the panel's top border under this tab. Inset by the 3px border width so
			// the tab's own left and right edges survive.
			DrawRect(tabLeft(i) + 3, PANEL_TOP - 2, TAB_WIDTH - 6, 6, "White");
		}
	});
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: "HypnosisAddon",
		ButtonText: "Hypnosis Add-on",
		// Always open on the first tab — coming back to a screen part-way through a
		// previous visit's navigation is disorienting.
		load: () => {
			activeTab = 0;
		},
		run: () => {
			DrawText("BC Hypnosis Add-on — settings", MainCanvasWidth / 2, TITLE_Y, "Black");
			DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");

			DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
			DrawEmptyRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "Black", 3);
			drawTabs();

			const tab = TABS[activeTab];
			drawLeftText(tab.blurb, BOX_LEFT, BLURB_Y, "Gray");

			const features = getFeatures();
			tab.rows.forEach((row, i) => {
				const top = rowTop(i);
				// Empty label — DrawCheckbox centers its own at a fixed offset regardless of
				// Width, which overlaps the box for anything but very short text. Draw the
				// label ourselves, left-aligned and clear of the box.
				DrawCheckbox(BOX_LEFT, top, BOX_SIZE, BOX_SIZE, "", features[row.key]);
				drawLeftText(row.label, BOX_LEFT + BOX_SIZE + 20, top + 26);
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
			// Only the visible tab's rows are clickable — hidden tabs' rows occupy the same
			// coordinates, so without this a single click would toggle one row per tab.
			const features = getFeatures();
			TABS[activeTab].rows.forEach((row, i) => {
				if (MouseIn(BOX_LEFT, rowTop(i), BOX_SIZE, BOX_SIZE)) {
					const next = !features[row.key];
					setFeature(row.key, next);
					onToggle(row.key, next);
					log(`${row.key} set to ${next}`);
				}
			});
		},
		exit: () => true,
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
		case "hiddenActivities":
			// No direct effect — messaging.ts reads this flag itself before sending or
			// processing anything on the Hidden channel.
			break;
	}
}
