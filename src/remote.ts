import { log } from "./log";
import { sendHiddenMessage, RemoteFeature } from "./messaging";

// Mechanism learned from reading LSCG's src/Modules/remoteUI.ts (technique only, not
// copied — see memory: hypnosis-addon-dev-practices): hook the Information Sheet screen
// (Screens/Character/InformationSheet/InformationSheet.js) to draw an icon over another
// character's sheet, and take over that screen's draw/click while our own subscreen is
// open. InformationSheetRun/Click/Exit all take zero arguments — they read the
// module-level `InformationSheetSelection` global directly rather than receiving the
// viewed character as a parameter (verified against the live client, not assumed).

// LSCG draws its own remote icon at DrawButton(90, 60, 60, 60, ...) on this same screen
// — ours sits directly below it, same size, small gap. ADJUST-ME if it doesn't line up:
// increase ICON_TOP to move down, ICON_LEFT to move right.
const ICON_LEFT = 90;
const ICON_TOP = 130;
const ICON_SIZE = 60;

// Reusing the same exit convention as our Preferences screen (menu.ts) for this
// subscreen's own back control, rather than a second meaning for the entry icon's spot.
const SUB_EXIT_LEFT = 1850;
const SUB_EXIT_TOP = 55;
const SUB_EXIT_SIZE = 90;

const FEATURE_BUTTON_LEFT = 400;
const FEATURE_BUTTON_WIDTH = 500;
const FEATURE_BUTTON_HEIGHT = 90;
const MOVEMENT_BUTTON_TOP = 300;
const CLOTHING_BUTTON_TOP = 420;

let activeTarget: any = null;

function getViewedOtherCharacter(): any {
	const C = InformationSheetSelection;
	if (!C || (typeof C.IsPlayer === "function" && C.IsPlayer())) return null;
	return C;
}

function requestFeature(target: any, feature: RemoteFeature): void {
	if (typeof target?.MemberNumber !== "number") return;
	sendHiddenMessage({ type: "remote-request", feature }, target.MemberNumber);
	log(`sent remote request (${feature}) to ${target.MemberNumber}`);
}

function drawSubscreen(target: any): void {
	DrawText(`Hypnosis Remote — ${target?.Name ?? "?"}`, MainCanvasWidth / 2, 200, "Black");
	DrawButton(FEATURE_BUTTON_LEFT, MOVEMENT_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT, "Movement Restriction", "White");
	DrawButton(FEATURE_BUTTON_LEFT, CLOTHING_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT, "Clothing Restriction", "White");
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
}

function clickSubscreen(target: any): void {
	if (MouseIn(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
		activeTarget = null;
		return;
	}
	if (MouseIn(FEATURE_BUTTON_LEFT, MOVEMENT_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) {
		requestFeature(target, "movement");
	} else if (MouseIn(FEATURE_BUTTON_LEFT, CLOTHING_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) {
		requestFeature(target, "clothing");
	}
}

export function installRemote(modApi: any): void {
	modApi.hookFunction(
		"InformationSheetRun",
		10,
		((_args: [], next: (args?: any) => void) => {
			if (activeTarget) {
				drawSubscreen(activeTarget);
				return;
			}
			next([] as any);
			const C = getViewedOtherCharacter();
			if (C) {
				// No custom icon asset of our own yet — a plain label is safer than a
				// guessed-at image path that might not exist.
				DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, "H", "White", "", "Hypnosis Add-on Remote");
			}
		}) as any,
	);

	modApi.hookFunction(
		"InformationSheetClick",
		10,
		((_args: [], next: (args?: any) => void) => {
			if (activeTarget) {
				clickSubscreen(activeTarget);
				return;
			}
			const C = getViewedOtherCharacter();
			if (C && MouseIn(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE)) {
				activeTarget = C;
				return;
			}
			next([] as any);
		}) as any,
	);

	modApi.hookFunction(
		"InformationSheetExit",
		10,
		((_args: [], next: (args?: any) => void) => {
			if (activeTarget) {
				activeTarget = null;
				return;
			}
			next([] as any);
		}) as any,
	);
}
