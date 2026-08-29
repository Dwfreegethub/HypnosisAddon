import { log } from "./log";
import { removeEffect, clearSuggestedPose, setSpeechBlocked, setScreenFade, clearTranceStates } from "./effects";
import { getFeatures, setFeature, FeatureToggles } from "./storage";

// Registered via BC's real extension-settings screen (Screens/Character/Preference/
// Preference.js, PreferenceRegisterExtensionSetting) — adds one button into
// Preferences > Extensions, same mechanism LSCG uses. All draw/click coordinates and
// primitive signatures below (DrawCheckbox, DrawText, MouseIn) are verified against the
// live client source, not guessed.

interface Row {
	key: keyof FeatureToggles;
	label: string;
}

interface Column {
	left: number;
	heading: string;
	subheading: string;
	rows: Row[];
}

// Two columns because nine rows in one won't fit: at 110px spacing the ninth would land at
// y=1130 on a 1000-tall canvas. The split is also meaningful — the two groups answer
// different questions and have opposite defaults (see FeatureToggles in storage.ts).
const COLUMNS: Column[] = [
	{
		left: 180,
		heading: "Permissions",
		subheading: "what others may do to you",
		rows: [
			{ key: "hypnoEnabled", label: "Hypnosis Enabled" },
			{ key: "movementRestriction", label: "Movement Restriction" },
			{ key: "clothingRestriction", label: "Clothing Restriction" },
			{ key: "postureControl", label: "Posture Control (kneel / stand)" },
			{ key: "speechRestriction", label: "Speech Restriction" },
			{ key: "hiddenActivities", label: "Hidden Activities" },
		],
	},
	{
		left: 1080,
		heading: "In trance",
		subheading: "what being under is like — on by default",
		rows: [
			{ key: "tranceCannotMove", label: "Cannot Move" },
			{ key: "tranceCannotSpeak", label: "Cannot Speak" },
			{ key: "tranceScreenFade", label: "Screen Fade" },
		],
	},
];

const ROW_WIDTH = 90;
const ROW_HEIGHT = 90;
const ROW_TOP_START = 300;
const ROW_SPACING = 110;
const HEADING_Y = 225;
const SUBHEADING_Y = 262;

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

// ADJUST-ME — exit icon position. Increase BACK_LEFT to move right, BACK_TOP to move
// down. The Preferences screen's own native exit button is DOM/CSS-positioned
// (ElementMenu in Element.js), not a canvas draw, so there's still no exact value for
// THIS specific screen — but this now matches the verified InformationSheetClick()
// native Back button coordinate (MouseIn(1815, 75, 90, 90) in InformationSheet.js),
// corroborated by DW's own click-testing (bottom-right corner measured within ~4px of
// 1905,165 = 1815+90,75+90), and it's the same 90x90 size Dialog.js/Wardrobe.js use for
// this icon everywhere else — a reasonable cross-screen convention, not a blind guess.
const BACK_LEFT = 1815;
const BACK_TOP = 75;
const BACK_WIDTH = 90;
const BACK_HEIGHT = 90;

// These are PERMISSION settings now, not self-triggers — "do I allow someone else to do
// this to me", checked in messaging.ts when a remote request comes in over the Hidden
// channel (see remote.ts). Checking a box here never applies an effect to yourself;
// unchecking one DOES immediately release that effect if it's currently active (revoking
// consent mid-effect should end it, not just block future requests), and hypnoEnabled
// off is a hard floor that releases both regardless of their own permission state —
// matching the design doc's philosophy ("clears active trance, suspends all effects").
// hypnoEnabled back on does NOT restore an effect that was released this way.
function onToggle(key: keyof FeatureToggles, enabled: boolean): void {
	switch (key) {
		case "hypnoEnabled":
			if (!enabled) {
				removeEffect("Freeze");
				removeEffect("BlockWardrobe");
				clearSuggestedPose();
				clearTranceStates();
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
		case "hiddenActivities":
			// No direct effect — messaging.ts reads this flag itself before
			// sending/processing anything on the Hidden channel.
			break;
	}
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: "HypnosisAddon",
		ButtonText: "Hypnosis Add-on",
		load: () => {},
		run: () => {
			DrawText("BC Hypnosis Add-on — settings", MainCanvasWidth / 2, 150, "Black");
			DrawButton(BACK_LEFT, BACK_TOP, BACK_WIDTH, BACK_HEIGHT, "", "White", "Icons/Exit.png", "Exit");
			const features = getFeatures();
			for (const column of COLUMNS) {
				drawLeftText(column.heading, column.left, HEADING_Y);
				drawLeftText(column.subheading, column.left, SUBHEADING_Y, "Gray");
				column.rows.forEach((row, i) => {
					const top = rowTop(i);
					// Empty label here — DrawCheckbox centers its own label at a fixed offset
					// regardless of Width, which overlaps the box for anything but very short
					// text. Draw the label ourselves, left-aligned, clear of the box instead.
					DrawCheckbox(column.left, top, ROW_WIDTH, ROW_HEIGHT, "", features[row.key]);
					drawLeftText(row.label, column.left + ROW_WIDTH + 20, top + 33);
				});
			}
		},
		click: () => {
			if (MouseIn(BACK_LEFT, BACK_TOP, BACK_WIDTH, BACK_HEIGHT)) {
				PreferenceSubscreenExtensionsClear();
				return;
			}
			const features = getFeatures();
			for (const column of COLUMNS) {
				column.rows.forEach((row, i) => {
					if (MouseIn(column.left, rowTop(i), ROW_WIDTH, ROW_HEIGHT)) {
						const next = !features[row.key];
						setFeature(row.key, next);
						onToggle(row.key, next);
						log(`${row.key} set to ${next}`);
					}
				});
			}
		},
		exit: () => true,
	});
}
