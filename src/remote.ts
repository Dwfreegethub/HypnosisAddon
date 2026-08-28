import { log } from "./log";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures } from "./storage";
import { applyEffect, removeEffect } from "./effects";

// Mechanism learned from reading LSCG's src/Modules/remoteUI.ts (technique only, not
// copied — see memory: hypnosis-addon-dev-practices): hook the Information Sheet screen
// (Screens/Character/InformationSheet/InformationSheet.js) to draw an icon over another
// character's sheet, and take over that screen's draw/click while our own subscreen is
// open. InformationSheetRun/Click/Exit all take zero arguments — they read the
// module-level `InformationSheetSelection` global directly rather than receiving the
// viewed character as a parameter (verified against the live client, not assumed).

export type RemoteFeature = "movement" | "clothing";

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

interface RemoteState {
	hypnoEnabled: boolean;
	movementRestriction: boolean;
	clothingRestriction: boolean;
}

// FeatureToggles (storage.ts, our own local settings) and RemoteState (above, someone
// else's settings as last reported to us) happen to share this same shape — one
// function checks either, since "is this feature permitted" means the same thing for
// both, just read from a different source.
type PermissionSource = { hypnoEnabled: boolean; movementRestriction: boolean; clothingRestriction: boolean };

// Populated by asking the target directly when we open their panel. There's no
// automatic sync of another character's permission settings to gray out against —
// confirmed in Character.js: CharacterLoadOnline never copies ExtensionSettings for
// anyone but the account's own data, only the separate (and here, unused)
// OnlineSharedSettings field is shared automatically. So we ask on demand instead of
// trying to keep every room member's state pre-synced.
const knownState = new Map<number, RemoteState>();

function effectNameFor(feature: RemoteFeature): string {
	return feature === "movement" ? "Freeze" : "BlockWardrobe";
}

function isPermitted(state: PermissionSource | undefined, feature: RemoteFeature): boolean {
	if (!state || !state.hypnoEnabled) return false;
	return feature === "movement" ? state.movementRestriction : state.clothingRestriction;
}

function getViewedOtherCharacter(): any {
	const C = InformationSheetSelection;
	if (!C || (typeof C.IsPlayer === "function" && C.IsPlayer())) return null;
	return C;
}

function drawFeatureButton(top: number, baseLabel: string, feature: RemoteFeature, target: any): void {
	const state = knownState.get(target.MemberNumber);
	const permitted = isPermitted(state, feature);
	const active = !!target.HasEffect?.(effectNameFor(feature));
	const label = !state ? `${baseLabel} (checking…)` : active ? `Release ${baseLabel}` : `Apply ${baseLabel}`;
	const tooltip = !state ? "Waiting for their status" : permitted ? "" : "Not permitted";
	DrawButton(FEATURE_BUTTON_LEFT, top, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT, label, permitted ? "White" : "#ddd", "", tooltip, !permitted);
}

function drawSubscreen(target: any): void {
	DrawText(`Hypnosis Remote — ${target?.Name ?? "?"}`, MainCanvasWidth / 2, 200, "Black");
	drawFeatureButton(MOVEMENT_BUTTON_TOP, "Movement Restriction", "movement", target);
	drawFeatureButton(CLOTHING_BUTTON_TOP, "Clothing Restriction", "clothing", target);
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
}

function clickFeatureButton(top: number, feature: RemoteFeature, target: any): boolean {
	if (!MouseIn(FEATURE_BUTTON_LEFT, top, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
	const state = knownState.get(target.MemberNumber);
	if (!isPermitted(state, feature)) {
		log(`${feature} not permitted (or not yet known) for ${target.MemberNumber}, ignoring click`);
		return true;
	}
	const active = !!target.HasEffect?.(effectNameFor(feature));
	sendHiddenMessage({ type: "remote-request", feature, enable: !active }, target.MemberNumber);
	log(`sent remote request (${feature}, enable=${!active}) to ${target.MemberNumber}`);
	return true;
}

function clickSubscreen(target: any): void {
	if (MouseIn(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
		activeTarget = null;
		return;
	}
	if (clickFeatureButton(MOVEMENT_BUTTON_TOP, "movement", target)) return;
	clickFeatureButton(CLOTHING_BUTTON_TOP, "clothing", target);
}

function openRemoteFor(target: any): void {
	activeTarget = target;
	knownState.delete(target.MemberNumber);
	sendHiddenMessage({ type: "state-query" }, target.MemberNumber);
}

export function installRemote(modApi: any): void {
	// --- Incoming message handling: this client as the SUBJECT being remoted ---

	registerHiddenHandler("state-query", (sender) => {
		const features = getFeatures();
		sendHiddenMessage(
			{
				type: "state-response",
				hypnoEnabled: features.hypnoEnabled,
				movementRestriction: features.movementRestriction,
				clothingRestriction: features.clothingRestriction,
			},
			sender,
		);
	});

	registerHiddenHandler("state-response", (sender, message) => {
		knownState.set(sender, {
			hypnoEnabled: !!message.hypnoEnabled,
			movementRestriction: !!message.movementRestriction,
			clothingRestriction: !!message.clothingRestriction,
		});
	});

	registerHiddenHandler("remote-request", (sender, message) => {
		const feature = message.feature as RemoteFeature;
		const enable = !!message.enable;
		const effectName = effectNameFor(feature);
		if (!enable) {
			// Releasing is always honored regardless of permission state — consent can
			// make it harder to restrict someone, never harder to release them.
			removeEffect(effectName);
			ChatRoomSendLocal(`${sender} releases you.`);
			return;
		}
		const features = getFeatures();
		if (!features.hypnoEnabled) {
			log(`remote request (${feature}) from ${sender} denied — Hypnosis Enabled is off`);
			return;
		}
		if (!isPermitted(features, feature)) {
			log(`remote request (${feature}) from ${sender} denied — not permitted`);
			return;
		}
		applyEffect(effectName);
		ChatRoomSendLocal(`${sender} triggers a ${feature} restriction on you.`);
	});

	// --- Information Sheet hooks: this client as the VIEWER ---

	modApi.hookFunction(
		"InformationSheetRun",
		10,
		((_args: [], next: (args?: any) => void) => {
			if (activeTarget) {
				drawSubscreen(activeTarget);
				return;
			}
			next([]);
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
			// Temporary — logs where every click on this screen actually lands, so you can
			// click near anything of interest (BC's own native Back button included) and
			// read off its real coordinate instead of eyeballing. Never blocks the click —
			// next([]) still runs below either way, so native buttons keep working
			// normally even as this logs. Remove once the layout work it's for is done.
			const coordMsg = `Information Sheet click at MouseX=${MouseX}, MouseY=${MouseY}`;
			log(coordMsg);
			ChatRoomSendLocal(coordMsg);
			const C = getViewedOtherCharacter();
			if (C && MouseIn(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE)) {
				openRemoteFor(C);
				return;
			}
			next([]);
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
			next([]);
		}) as any,
	);
}
