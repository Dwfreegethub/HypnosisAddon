import { log } from "./log";
import { SPIRAL_ICON } from "./icon";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";
import { getFeatures } from "./storage";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import { drawLeftTextFit } from "./panel";
import { askPlanted, receivePlanted, plantedEntriesFor, plantedNote, plantedHeading, plantedTitle, plantedState } from "./planted";
import {
	getSessionView,
	countdownRemaining,
	requestInduction,
	requestWake,
	querySession,
	SessionView,
} from "./session";

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
const PLANTED_BUTTON_TOP = 430;
const STATUS_LINE_Y = 245;

const PLANTED_LEFT = 250;
const PLANTED_WIDTH = 1400;
const PLANTED_TITLE_WIDTH = 620;
const PLANTED_FIRST_ROW_Y = 320;
const PLANTED_ROW_HEIGHT = 105;
const PLANTED_ROWS_PER_PAGE = 5;
const PLANTED_NAV_TOP = 860;
const PLANTED_NAV_WIDTH = 160;
const PLANTED_NAV_HEIGHT = 60;
const PLANTED_PREV_LEFT = 700;
const PLANTED_NEXT_LEFT = 1140;

/** The "they don't have it" panel: a line of explanation and a way to ask again, in case
 * they installed it while you were looking at them. */
const ABSENT_LINE_Y = 380;
const RETRY_LEFT = 700;
const RETRY_TOP = 470;
const RETRY_WIDTH = 300;
const RETRY_HEIGHT = 80;

let activeTarget: any = null;

/** Who has answered since we last asked. There's no automatic way to know who runs ECHS, confirmed
 * in Character.js: CharacterLoadOnline never copies ExtensionSettings for anyone but the account's
 * own data. So opening the panel asks. */
const repliedToProbe = new Set<number>();

/** The planted-triggers page, in place of the panel while it is open. */
let plantedOpen = false;
let plantedPage = 0;

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
	if (repliedToProbe.has(memberNumber) || getSessionView(memberNumber)) return "present";
	const asked = probedAt.get(memberNumber);
	if (asked == null) return "waiting";
	return Date.now() - asked < PROBE_TIMEOUT_MS ? "waiting" : "absent";
}

function getViewedOtherCharacter(): any {
	const C = InformationSheetSelection;
	if (!C || (typeof C.IsPlayer === "function" && C.IsPlayer())) return null;
	return C;
}

function findCharacterName(member: number): string {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find((c: any) => c?.MemberNumber === member)?.Name ?? `#${member}`;
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
		drawHelp("Erotic Chat Hypnosis Suite (ECHS) — help");
		return;
	}
	if (plantedOpen) {
		drawPlantedPage(target);
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
	DrawButton(
		FEATURE_BUTTON_LEFT,
		PLANTED_BUTTON_TOP,
		FEATURE_BUTTON_WIDTH,
		FEATURE_BUTTON_HEIGHT,
		"Planted triggers",
		"White",
		"",
		"What you planted in them, and how it stands",
	);
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
	DrawButton(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "?", "White", "", "How this add-on works");
}

/** Shown instead of the controls, rather than alongside them. A row of permanently
 * disabled buttons under an explanation would only invite clicking them. */
function drawAbsent(target: any): void {
	const name = target?.Name ?? "They";
	DrawText(`Hypnosis Remote — ${name}`, MainCanvasWidth / 2, 170, "Black");
	DrawText(`${name} doesn't appear to be running ECHS.`, MainCanvasWidth / 2, ABSENT_LINE_Y, "Black");
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

function clickSubscreen(target: any): void {
	if (isHelpOpen()) {
		clickHelp();
		return;
	}
	if (plantedOpen) {
		clickPlantedPage(target);
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
	if (MouseIn(FEATURE_BUTTON_LEFT, PLANTED_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) {
		plantedOpen = true;
		plantedPage = 0;
		askPlanted(target.MemberNumber);
	}
}

function plantedPageCount(target: any): number {
	const count = plantedNote(target.MemberNumber)?.triggers.length ?? 0;
	return Math.max(1, Math.ceil(count / PLANTED_ROWS_PER_PAGE));
}

/** The list a hypnotist opens from the panel: one trigger to a row, its word or condition first,
 * how it stands beside that, and what it does under it. */
function drawPlantedPage(target: any): void {
	const name = target?.Name ?? "them";
	const note = plantedNote(target.MemberNumber);
	const triggers = note?.triggers ?? [];
	DrawText(`What you planted in ${name}`, MainCanvasWidth / 2, 170, "Black");
	DrawText(plantedHeading(target.MemberNumber, name), MainCanvasWidth / 2, STATUS_LINE_Y, "Gray");
	const pages = plantedPageCount(target);
	if (plantedPage >= pages) plantedPage = pages - 1;
	const start = plantedPage * PLANTED_ROWS_PER_PAGE;
	triggers.slice(start, start + PLANTED_ROWS_PER_PAGE).forEach((t, i) => {
		const top = PLANTED_FIRST_ROW_Y + i * PLANTED_ROW_HEIGHT;
		drawLeftTextFit(`${start + i + 1}. ${plantedTitle(t)}`, PLANTED_LEFT, top, PLANTED_TITLE_WIDTH, "Black");
		drawLeftTextFit(plantedState(t), PLANTED_LEFT + PLANTED_TITLE_WIDTH + 30, top, PLANTED_WIDTH - PLANTED_TITLE_WIDTH - 30, "#555");
		drawLeftTextFit(t.does.join("; "), PLANTED_LEFT + 40, top + 44, PLANTED_WIDTH - 40, "#555");
	});
	if (pages > 1) {
		DrawButton(PLANTED_PREV_LEFT, PLANTED_NAV_TOP, PLANTED_NAV_WIDTH, PLANTED_NAV_HEIGHT, "Prev", plantedPage === 0 ? "#ddd" : "White", "", "", plantedPage === 0);
		DrawButton(PLANTED_NEXT_LEFT, PLANTED_NAV_TOP, PLANTED_NAV_WIDTH, PLANTED_NAV_HEIGHT, "Next", plantedPage >= pages - 1 ? "#ddd" : "White", "", "", plantedPage >= pages - 1);
		DrawText(`${plantedPage + 1} / ${pages}`, MainCanvasWidth / 2, PLANTED_NAV_TOP + PLANTED_NAV_HEIGHT / 2, "Gray");
	}
	DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back to the panel");
}

function clickPlantedPage(target: any): void {
	if (MouseIn(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
		plantedOpen = false;
		return;
	}
	const pages = plantedPageCount(target);
	if (pages <= 1) return;
	if (MouseIn(PLANTED_PREV_LEFT, PLANTED_NAV_TOP, PLANTED_NAV_WIDTH, PLANTED_NAV_HEIGHT) && plantedPage > 0) plantedPage--;
	if (MouseIn(PLANTED_NEXT_LEFT, PLANTED_NAV_TOP, PLANTED_NAV_WIDTH, PLANTED_NAV_HEIGHT) && plantedPage < pages - 1) plantedPage++;
}

function openRemoteFor(target: any): void {
	activeTarget = target;
	plantedOpen = false;
	probeRemote(target);
}

/** Ask both questions and start the clock. Split out so the Retry button can re-ask
 * without reopening the panel. */
export function probeRemote(target: any): void {
	repliedToProbe.delete(target.MemberNumber);
	probedAt.set(target.MemberNumber, Date.now());
	// Two independent asks: are they running ECHS at all, and what session state are they in.
	// Asks for the planted list as it goes, so the panel's button opens on something current.
	askPlanted(target.MemberNumber);
	querySession(target.MemberNumber);
}

export function installRemote(modApi: any): void {
	// --- Incoming message handling: this client as the SUBJECT being remoted ---

	registerHiddenHandler("state-query", (sender, message) => {
		sendHiddenMessage(
			{
				type: "state-response",
				hypnoEnabled: getFeatures().hypnoEnabled,
				// Theirs only, and only if they asked. See planted.ts.
				...(message.planted ? { planted: plantedEntriesFor(sender) } : {}),
			},
			sender,
		);
	});

	registerHiddenHandler("state-response", (sender, message) => {
		repliedToProbe.add(sender);
		if (message.planted !== undefined) receivePlanted(sender, findCharacterName(sender), message.planted);
	});

	// The panel's Movement, Clothing and Kneel buttons are gone (DW, 2026-11-05). A hypnotist still on
	// an older build can send this. Ignored quietly: with no handler, messaging.ts would print it on
	// the subject's screen as raw text.
	registerHiddenHandler("remote-request", (sender, message) => {
		log(`ignored a remote-request (${String(message.feature)}) from ${sender}: an older build's button`);
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
				DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, SPIRAL_ICON ? "" : "H", "White", "", "ECHS Hypnosis Remote");
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
				plantedOpen = false;
				closeHelp();
				return;
			}
			next([]);
		}) as any,
	);
}
