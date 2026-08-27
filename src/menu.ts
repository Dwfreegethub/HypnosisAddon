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
			DrawText("BC Hypnosis Add-on — test menu", ROW_LEFT, ROW_TOP_START - 60, "White", "Black");
			const features = getFeatures();
			ROWS.forEach((row, i) => {
				DrawCheckbox(ROW_LEFT, rowTop(i), ROW_WIDTH, ROW_HEIGHT, row.label, features[row.key]);
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
