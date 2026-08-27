import { log } from "./log";
import { removeEffect } from "./effects";
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

const ROWS: Row[] = [
	{ key: "hypnoEnabled", label: "Hypnosis Enabled" },
	{ key: "movementRestriction", label: "Movement Restriction" },
	{ key: "clothingRestriction", label: "Clothing Restriction" },
	{ key: "hiddenActivities", label: "Hidden Activities" },
];

const ROW_LEFT = 200;
const ROW_WIDTH = 90;
const ROW_HEIGHT = 90;
const ROW_TOP_START = 250;
const ROW_SPACING = 110;

function rowTop(index: number): number {
	return ROW_TOP_START + index * ROW_SPACING;
}

// ADJUST-ME — exit icon position. Increase BACK_LEFT to move right, BACK_TOP to move
// down. There's no exact source value to copy for this screen specifically: Dialog.js
// and Wardrobe.js draw this same icon at a fixed canvas coordinate (1895,15), but the
// Preferences screen's own native exit button turned out to be DOM/CSS-positioned
// (ElementMenu in Element.js) rather than a canvas draw, so these four numbers are DW's
// own eyeballed best-fit against the native one, not a verified value — nudge freely.
const BACK_LEFT = 1850;
const BACK_TOP = 55;
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
			}
			break;
		case "movementRestriction":
			if (!enabled) removeEffect("Freeze");
			break;
		case "clothingRestriction":
			if (!enabled) removeEffect("BlockWardrobe");
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
			DrawText("BC Hypnosis Add-on — settings", MainCanvasWidth / 2, ROW_TOP_START - 60, "Black");
			DrawButton(BACK_LEFT, BACK_TOP, BACK_WIDTH, BACK_HEIGHT, "", "White", "Icons/Exit.png", "Exit");
			const features = getFeatures();
			ROWS.forEach((row, i) => {
				const top = rowTop(i);
				// Empty label here — DrawCheckbox centers its own label at a fixed offset
				// regardless of Width, which overlaps the box for anything but very short
				// text. Draw the label ourselves, left-aligned, clear of the box instead.
				DrawCheckbox(ROW_LEFT, top, ROW_WIDTH, ROW_HEIGHT, "", features[row.key]);
				MainCanvas.save();
				MainCanvas.textAlign = "left";
				DrawText(row.label, ROW_LEFT + ROW_WIDTH + 20, top + 33, "Black", "Gray");
				MainCanvas.restore();
			});
		},
		click: () => {
			if (MouseIn(BACK_LEFT, BACK_TOP, BACK_WIDTH, BACK_HEIGHT)) {
				PreferenceSubscreenExtensionsClear();
				return;
			}
			const features = getFeatures();
			ROWS.forEach((row, i) => {
				if (MouseIn(ROW_LEFT, rowTop(i), ROW_WIDTH, ROW_HEIGHT)) {
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
