import { log } from "./log";
import { SPIRAL_ICON } from "./icon";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures } from "./storage";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { announce, FlavorKey } from "./flavor";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import {
	getSessionView,
	countdownRemaining,
	requestInduction,
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
/** Padding between the button edge and the icon, so the spiral sits INSIDE the box (centred,
 * since it is inset equally on all four sides) rather than filling it edge-to-edge — matching
 * the lighter footprint of LSCG's remote icon above. Tune this one number to resize the icon. */
const ICON_INSET = 8;

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

/** The "they don't have it" panel: a line of explanation and a way to ask again, in case
 * they installed it while you were looking at them. */
const ABSENT_LINE_Y = 380;
const RETRY_LEFT = 700;
const RETRY_TOP = 470;
const RETRY_WIDTH = 300;
const RETRY_HEIGHT = 80;

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

// --- Presence probe -------------------------------------------------------------------
// The H icon draws on every player's sheet, because there is no way to know who is running
// this without asking them. Opening the panel asks; if nothing answers, the panel used to
// sit on "(checking…)" forever, which is indistinguishable from a slow reply, a lost
// message, and a bug. Saying so is the whole feature.
//
// Deliberately NOT used to hide the icon. It could be, once a member number has been
// probed once — but that would quietly turn the sheet into a directory of who in the room
// has the add-on installed, which is nobody's business but theirs.

const PROBE_TIMEOUT_MS = 3000;
/** When we last asked, per member number. */
const probedAt = new Map<number, number>();

export type Presence = "waiting" | "present" | "absent";

/** Any reply at all proves they are running it — the two queries are answered by handlers
 * that only exist in this add-on, so either arriving is proof. A late reply flips this back
 * to "present" on the next frame: the timeout is a display decision, never a lockout. */
export function presenceOf(memberNumber: number): Presence {
	if (knownState.has(memberNumber) || getSessionView(memberNumber)) return "present";
	const asked = probedAt.get(memberNumber);
	if (asked == null) return "waiting";
	return Date.now() - asked < PROBE_TIMEOUT_MS ? "waiting" : "absent";
}

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
		case "CooldownRequired": {
			const left = seconds(countdownRemaining(view, "cooldownRemaining"));
			// Once the local countdown has run out, offer the attempt even if the subject's
			// "back to Idle" push hasn't landed yet (it can be delayed or lost) — otherwise a
			// zeroed cooldown strands the button forever. The subject re-checks the real
			// cooldown itself and refuses if we jumped the gun, so this can only ever be early,
			// never a bypass.
			if (left <= 0) return { label: "Attempt Hypnosis", enabled: true, tooltip: "Begin an induction" };
			return { label: `Cooldown (${left}s)`, enabled: false, tooltip: "They can't be attempted again yet" };
		}
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
	if (presenceOf(target.MemberNumber) === "absent") {
		drawAbsent(target);
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

/** Shown instead of the controls, rather than alongside them. A row of permanently
 * disabled buttons under an explanation would only invite clicking them. */
function drawAbsent(target: any): void {
	const name = target?.Name ?? "They";
	DrawText(`Hypnosis Remote — ${name}`, MainCanvasWidth / 2, 170, "Black");
	DrawText(`${name} doesn't appear to be running the Hypnosis add-on.`, MainCanvasWidth / 2, ABSENT_LINE_Y, "Black");
	DrawText("Nothing on this panel would reach them.", MainCanvasWidth / 2, ABSENT_LINE_Y + 55, "Gray");
	DrawButton(RETRY_LEFT, RETRY_TOP, RETRY_WIDTH, RETRY_HEIGHT, "Check again", "White", "", "Ask them again");
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
	DrawButton(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "?", "White", "", "How this add-on works");
}

function clickSessionButton(target: any): boolean {
	if (!MouseIn(FEATURE_BUTTON_LEFT, SESSION_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
	const view = getSessionView(target.MemberNumber);
	const { enabled } = sessionButton(view);
	if (!enabled) return true;
	if (view?.phase === "Hypnotized") requestWake(target.MemberNumber);
	// attempt vs continue is requestInduction's call, not ours — the chat command routes
	// through the same helper so the two entry points cannot drift apart.
	else requestInduction(target.MemberNumber);
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
	if (presenceOf(target.MemberNumber) === "absent") {
		if (MouseIn(RETRY_LEFT, RETRY_TOP, RETRY_WIDTH, RETRY_HEIGHT)) probeRemote(target);
		return;
	}
	if (clickSessionButton(target)) return;
	FEATURES.some((feature, i) => clickFeatureButton(i, feature, target));
}

function openRemoteFor(target: any): void {
	activeTarget = target;
	probeRemote(target);
}

/** Ask both questions and start the clock. Split out so the Retry button can re-ask
 * without reopening the panel. */
export function probeRemote(target: any): void {
	knownState.delete(target.MemberNumber);
	probedAt.set(target.MemberNumber, Date.now());
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
				// Our own spiral icon (icon.ts, built at load). Draw the button CHROME first with
				// no image, then place the icon scaled into the box ourselves. BC's DrawButton draws
				// an Image at its NATURAL size anchored at the top-left, with no fit (Drawing.js:
				// DrawButton → DrawImage, verified R131) — so passing the 120px SVG there rendered it
				// full-size, spilling well out of the 60px button (the second half of Known Bug #6).
				// DrawImageResize scales it to the padded rect. Falls back to a plain "H" label if the
				// icon could not be built, so the button is never blank.
				DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, SPIRAL_ICON ? "" : "H", "White", "", "Hypnosis Add-on Remote");
				if (SPIRAL_ICON) {
					DrawImageResize(
						SPIRAL_ICON,
						ICON_LEFT + ICON_INSET,
						ICON_TOP + ICON_INSET,
						ICON_SIZE - 2 * ICON_INSET,
						ICON_SIZE - 2 * ICON_INSET,
					);
				}
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
