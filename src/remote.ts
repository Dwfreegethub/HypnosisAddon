import { log } from "./log";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures } from "./storage";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { announce, FlavorKey } from "./flavor";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import {
	getSessionView,
	countdownRemaining,
	requestAttempt,
	requestContinue,
	requestWake,
	querySession,
	isSessionActiveWith,
	SessionView,
} from "./session";

// Mechanism learned from reading LSCG's src/Modules/remoteUI.ts (technique only, not
// copied — see memory: hypnosis-addon-dev-practices): hook the Information Sheet screen
// (Screens/Character/InformationSheet/InformationSheet.js) to draw an icon over another
// character's sheet, and take over that screen's draw/click while our own subscreen is
// open. InformationSheetRun/Click/Exit all take zero arguments — they read the
// module-level `InformationSheetSelection` global directly rather than receiving the
// viewed character as a parameter (verified against the live client, not assumed).

export type RemoteFeature = "movement" | "clothing" | "posture";

// LSCG draws its own remote icon at DrawButton(90, 60, 60, 60, ...) on this same screen
// — ours sits directly below it, same size, small gap. ADJUST-ME if it doesn't line up:
// increase ICON_TOP to move down, ICON_LEFT to move right.
const ICON_LEFT = 90;
const ICON_TOP = 130;
const ICON_SIZE = 60;

// Same verified coordinate as menu.ts's exit icon now (see there for how it was
// confirmed) — reusing it here too rather than a second guessed spot.
const SUB_EXIT_LEFT = 1815;
const SUB_EXIT_TOP = 75;
const SUB_EXIT_SIZE = 90;
/** Left of the exit icon, same size — same pairing as on the settings screen, so the
 * button is in the place someone already learned. */
const SUB_HELP_LEFT = 1700;

const FEATURE_BUTTON_LEFT = 400;
const FEATURE_BUTTON_WIDTH = 500;
const FEATURE_BUTTON_HEIGHT = 90;
const SESSION_BUTTON_TOP = 290;
const FIRST_FEATURE_TOP = 430;
const FEATURE_SPACING = 115;
const STATUS_LINE_Y = 245;

let activeTarget: any = null;

interface RemoteState {
	hypnoEnabled: boolean;
	movementRestriction: boolean;
	clothingRestriction: boolean;
	postureControl: boolean;
}

// FeatureToggles (storage.ts, our own local settings) and RemoteState (above, someone
// else's settings as last reported to us) happen to share this same shape — one
// function checks either, since "is this feature permitted" means the same thing for
// both, just read from a different source.
type PermissionSource = {
	hypnoEnabled: boolean;
	movementRestriction: boolean;
	clothingRestriction: boolean;
	postureControl: boolean;
};

/** One row of the panel. Posture is the reason this is a table rather than a pair of
 * if/elses: it isn't an effect at all, so "is it currently on" and "turn it on" differ
 * per feature and can't be derived from a single effect name any more. */
interface FeatureDef {
	key: RemoteFeature;
	permission: keyof PermissionSource;
	applyLabel: string;
	releaseLabel: string;
	/** Read on the VIEWER's client, off synced character data. */
	isActive: (target: any) => boolean;
	/** Run on the SUBJECT's client when a request is honored. */
	apply: () => void;
	release: () => void;
	/** Shared with the spoken-suggestion path, so a button and the equivalent spoken line
	 * are indistinguishable from the subject's side. */
	applyFlavor: FlavorKey;
	releaseFlavor: FlavorKey;
}

const FEATURES: FeatureDef[] = [
	{
		key: "movement",
		permission: "movementRestriction",
		applyLabel: "Apply Movement Restriction",
		releaseLabel: "Release Movement Restriction",
		isActive: (t) => !!t.HasEffect?.("Freeze"),
		apply: () => applyEffect("Freeze"),
		release: () => removeEffect("Freeze"),
		applyFlavor: "movement-block",
		releaseFlavor: "movement-release",
	},
	{
		key: "clothing",
		permission: "clothingRestriction",
		applyLabel: "Apply Clothing Restriction",
		releaseLabel: "Release Clothing Restriction",
		isActive: (t) => !!t.HasEffect?.("BlockWardrobe"),
		apply: () => applyEffect("BlockWardrobe"),
		release: () => removeEffect("BlockWardrobe"),
		applyFlavor: "clothing-block",
		releaseFlavor: "clothing-release",
	},
	{
		key: "posture",
		permission: "postureControl",
		applyLabel: "Kneel",
		releaseLabel: "Stand",
		// Not HasEffect — IsKneeling() reads PoseMapping.BodyLower, which is derived from
		// the synced ActivePose, so it's readable for anyone we can see.
		isActive: (t) => !!t.IsKneeling?.(),
		apply: () => setSuggestedPose("Kneel"),
		release: () => setSuggestedPose(null),
		applyFlavor: "kneel",
		releaseFlavor: "stand",
	},
];

function featureTop(index: number): number {
	return FIRST_FEATURE_TOP + index * FEATURE_SPACING;
}

// Populated by asking the target directly when we open their panel. There's no
// automatic sync of another character's permission settings to gray out against —
// confirmed in Character.js: CharacterLoadOnline never copies ExtensionSettings for
// anyone but the account's own data, only the separate (and here, unused)
// OnlineSharedSettings field is shared automatically. So we ask on demand instead of
// trying to keep every room member's state pre-synced.
const knownState = new Map<number, RemoteState>();

function isPermitted(state: PermissionSource | undefined, feature: FeatureDef): boolean {
	if (!state || !state.hypnoEnabled) return false;
	return !!state[feature.permission];
}

function getViewedOtherCharacter(): any {
	const C = InformationSheetSelection;
	if (!C || (typeof C.IsPlayer === "function" && C.IsPlayer())) return null;
	return C;
}

/** Feature buttons are session-scoped: outside an established trance they do nothing at
 * all, per the design doc ("locked until a session is successfully established"). Both
 * conditions have to hold, and the subject re-checks both itself before acting. */
function featureUnlocked(view: SessionView | undefined, state: RemoteState | undefined, feature: FeatureDef): boolean {
	return view?.phase === "Hypnotized" && isPermitted(state, feature);
}

function drawFeatureButton(index: number, feature: FeatureDef, target: any): void {
	const state = knownState.get(target.MemberNumber);
	const view = getSessionView(target.MemberNumber);
	const unlocked = featureUnlocked(view, state, feature);
	const label = !state
		? `${feature.applyLabel} (checking…)`
		: feature.isActive(target)
			? feature.releaseLabel
			: feature.applyLabel;
	const tooltip = !state
		? "Waiting for their status"
		: view?.phase !== "Hypnotized"
			? "Requires an active session"
			: isPermitted(state, feature)
				? ""
				: "Not permitted";
	DrawButton(
		FEATURE_BUTTON_LEFT,
		featureTop(index),
		FEATURE_BUTTON_WIDTH,
		FEATURE_BUTTON_HEIGHT,
		label,
		unlocked ? "White" : "#ddd",
		"",
		tooltip,
		!unlocked,
	);
}

function seconds(ms: number): number {
	return Math.ceil(ms / 1000);
}

/** The one contextual button that drives the whole session state machine — label and
 * action both follow the subject's reported phase, so there's never more than one
 * meaningful session action on screen at a time. */
function sessionButton(view: SessionView | undefined): { label: string; enabled: boolean; tooltip: string } {
	if (!view) return { label: "Checking…", enabled: false, tooltip: "Waiting for their status" };
	switch (view.phase) {
		case "AttemptMade":
			return { label: "Waiting for them…", enabled: false, tooltip: "They're deciding how to respond" };
		case "InductionInProgress":
			return {
				label: `Induction… (${seconds(countdownRemaining(view, "windowRemaining"))}s)`,
				enabled: false,
				tooltip: "Roleplay the induction while this runs",
			};
		case "AttemptFailed":
			return {
				label: `Continue Trying (${view.attempts}/${view.maxAttempts})`,
				enabled: true,
				tooltip: "Try another induction",
			};
		case "Hypnotized":
			return { label: "Wake Up", enabled: true, tooltip: "End the session" };
		case "CooldownRequired":
			return {
				label: `Cooldown (${seconds(countdownRemaining(view, "cooldownRemaining"))}s)`,
				enabled: false,
				tooltip: "They can't be attempted again yet",
			};
		default:
			return { label: "Attempt Hypnosis", enabled: true, tooltip: "Begin an induction" };
	}
}

function statusLine(view: SessionView | undefined): string {
	if (!view) return "Checking their status…";
	if (view.refusedReason) return view.refusedReason;
	switch (view.phase) {
		case "AttemptMade":
			return "They're deciding how to respond.";
		case "InductionInProgress":
			return "Induction underway — speak to them.";
		case "AttemptFailed":
			// The band is all the hypnotist ever gets: enough to feel progress, never the
			// number, and never which way the subject chose to respond.
			return `Not yet — they seem ${view.progressBand ?? "unchanged"}.`;
		case "Hypnotized":
			return `Under your influence — ${view.depthBand ?? "in trance"}.`;
		case "CooldownRequired":
			return "They've resisted enough for now.";
		default:
			return "Not in a session.";
	}
}

function drawSubscreen(target: any): void {
	if (isHelpOpen()) {
		drawHelp("BC Hypnosis Add-on — help");
		return;
	}
	const view = getSessionView(target.MemberNumber);
	DrawText(`Hypnosis Remote — ${target?.Name ?? "?"}`, MainCanvasWidth / 2, 170, "Black");
	DrawText(statusLine(view), MainCanvasWidth / 2, STATUS_LINE_Y, "Black");
	const session = sessionButton(view);
	DrawButton(
		FEATURE_BUTTON_LEFT,
		SESSION_BUTTON_TOP,
		FEATURE_BUTTON_WIDTH,
		FEATURE_BUTTON_HEIGHT,
		session.label,
		session.enabled ? "White" : "#ddd",
		"",
		session.tooltip,
		!session.enabled,
	);
	FEATURES.forEach((feature, i) => drawFeatureButton(i, feature, target));
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
	DrawButton(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "?", "White", "", "How this add-on works");
}

function clickSessionButton(target: any): boolean {
	if (!MouseIn(FEATURE_BUTTON_LEFT, SESSION_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
	const view = getSessionView(target.MemberNumber);
	const { enabled } = sessionButton(view);
	if (!enabled) return true;
	if (view?.phase === "Hypnotized") requestWake(target.MemberNumber);
	else if (view?.phase === "AttemptFailed") requestContinue(target.MemberNumber);
	else requestAttempt(target.MemberNumber);
	return true;
}

function clickFeatureButton(index: number, feature: FeatureDef, target: any): boolean {
	if (!MouseIn(FEATURE_BUTTON_LEFT, featureTop(index), FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
	const state = knownState.get(target.MemberNumber);
	if (!featureUnlocked(getSessionView(target.MemberNumber), state, feature)) {
		log(`${feature.key} locked for ${target.MemberNumber} (no session, or not permitted), ignoring click`);
		return true;
	}
	const active = feature.isActive(target);
	sendHiddenMessage({ type: "remote-request", feature: feature.key, enable: !active }, target.MemberNumber);
	log(`sent remote request (${feature.key}, enable=${!active}) to ${target.MemberNumber}`);
	return true;
}

function clickSubscreen(target: any): void {
	if (isHelpOpen()) {
		clickHelp();
		return;
	}
	if (MouseIn(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
		openHelp();
		return;
	}
	if (MouseIn(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
		activeTarget = null;
		return;
	}
	if (clickSessionButton(target)) return;
	FEATURES.some((feature, i) => clickFeatureButton(i, feature, target));
}

function openRemoteFor(target: any): void {
	activeTarget = target;
	knownState.delete(target.MemberNumber);
	// Two independent asks: permissions (what they allow at all) and session state (what's
	// currently possible). Neither is inferable from the other.
	sendHiddenMessage({ type: "state-query" }, target.MemberNumber);
	querySession(target.MemberNumber);
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
				postureControl: features.postureControl,
			},
			sender,
		);
	});

	registerHiddenHandler("state-response", (sender, message) => {
		knownState.set(sender, {
			hypnoEnabled: !!message.hypnoEnabled,
			movementRestriction: !!message.movementRestriction,
			clothingRestriction: !!message.clothingRestriction,
			postureControl: !!message.postureControl,
		});
	});

	registerHiddenHandler("remote-request", (sender, message) => {
		const feature = FEATURES.find((f) => f.key === message.feature);
		if (!feature) return;
		const enable = !!message.enable;
		if (!enable) {
			// Releasing is always honored regardless of permission state — consent can
			// make it harder to restrict someone, never harder to release them.
			feature.release();
			// Flavor rather than "N releases you" — the sender is unambiguous during a
			// session, and it's still in the console for testing.
			announce(feature.releaseFlavor);
			return;
		}
		const features = getFeatures();
		if (!features.hypnoEnabled) {
			log(`remote request (${feature.key}) from ${sender} denied — Hypnosis Enabled is off`);
			return;
		}
		if (!isPermitted(features, feature)) {
			log(`remote request (${feature.key}) from ${sender} denied — not permitted`);
			return;
		}
		// The session gate, re-checked here rather than trusting the sender's UI to have
		// grayed the button out — a modified client can send this whenever it likes.
		if (!isSessionActiveWith(sender)) {
			log(`remote request (${feature.key}) from ${sender} denied — no active session with them`);
			return;
		}
		log(`remote request (${feature.key}) from ${sender} honored`);
		feature.apply();
		announce(feature.applyFlavor);
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
				closeHelp();
				return;
			}
			next([]);
		}) as any,
	);
}
