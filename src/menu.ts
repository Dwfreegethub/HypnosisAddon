import { log } from "./log";
import { applyEffect, removeEffect } from "./effects";
import { getFeatures, setFeature, FeatureToggles } from "./storage";

// Registered via BC's real extension-settings screen (Screens/Character/Preference/
// Preference.js, PreferenceRegisterExtensionSetting) — adds one button into
// Preferences > Extensions, same mechanism LSCG uses. All draw/click coordinates and
// primitive signatures below (DrawCheckbox, DrawText, MouseIn) are verified against the
// live client source, not guessed.

interface Row {
	key: keyof FeatureToggles;
	label: string;
	effectName?: string;
}

const ROWS: Row[] = [
	{ key: "freeze", label: "Freeze (test)", effectName: "Freeze" },
	{ key: "wardrobeBlock", label: "Block Wardrobe (test)", effectName: "BlockWardrobe" },
	{ key: "suppressClothingMessages", label: "Suppress Clothing Messages (test)" },
];

const ROW_LEFT = 200;
const ROW_WIDTH = 90;
const ROW_HEIGHT = 90;
const ROW_TOP_START = 250;
const ROW_SPACING = 110;

function rowTop(index: number): number {
	return ROW_TOP_START + index * ROW_SPACING;
}

function applyToggle(row: Row, enabled: boolean): void {
	if (!row.effectName) return;
	if (enabled) applyEffect(row.effectName);
	else removeEffect(row.effectName);
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: "HypnosisAddon",
		ButtonText: "Hypnosis Add-on",
		load: () => {},
		run: () => {
			// Default canvas text alignment is centered — fine for this title (centered
			// on the canvas midpoint), wrong for the checkbox labels below.
			DrawText("BC Hypnosis Add-on — test menu", MainCanvasWidth / 2, ROW_TOP_START - 60, "Black");
			const features = getFeatures();
			ROWS.forEach((row, i) => {
				const top = rowTop(i);
				// Empty label here — DrawCheckbox centers its own label at a fixed offset
				// regardless of Width, which overlaps the box for anything but very short
				// text (confirmed: that's exactly what produced the overlap DW saw).
				// Draw the label ourselves, left-aligned, clear of the box instead.
				DrawCheckbox(ROW_LEFT, top, ROW_WIDTH, ROW_HEIGHT, "", features[row.key]);
				MainCanvas.save();
				MainCanvas.textAlign = "left";
				DrawText(row.label, ROW_LEFT + ROW_WIDTH + 20, top + 33, "Black", "Gray");
				MainCanvas.restore();
			});
		},
		click: () => {
			const features = getFeatures();
			ROWS.forEach((row, i) => {
				if (MouseIn(ROW_LEFT, rowTop(i), ROW_WIDTH, ROW_HEIGHT)) {
					const next = !features[row.key];
					setFeature(row.key, next);
					applyToggle(row, next);
					log(`${row.key} set to ${next}`);
				}
			});
		},
		exit: () => true,
	});
}
