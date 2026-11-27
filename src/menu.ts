import { log, warn, RELEASE_SUFFIX } from "./log";
import { SPIRAL_ICON } from "./icon";
import { announceIfChanged } from "./badge";
import { tellPlayer } from "./notify";
import { removeEffect, clearSuggestedPose, setSpeechBlocked, setScreenFade, getScreenFade, clearTranceStates, setSight, setHoldFully } from "./effects";
import {
	getFeatures,
	setFeature,
	FeatureToggles,
	experienceValue,
	getUsingSince,
	rawExperience,
	exportSettings,
	importSettings,
	resetSettings,
	getTriggerScope,
	forgetTrigger,
	forgetTrust,
	forgetAllTriggers,
	setTriggerScope,
	getTriggerLifespan,
	setTriggerLifespan,
	TRIGGER_LIFESPANS,
	getDropMode,
	setDropMode,
	DROP_MODES,
	getTriggerView,
	setTriggerView,
	TRIGGER_VIEWS,
	getTriggerDuration,
	setTriggerDuration,
	getDecayRate,
	getTriggerDecayRate,
	setTriggerDecayRate,
	setDecayRate,
	DECAY_RATES,
	setDepthOverride,
	clearDepthOverrides,
	getChemicalScope,
	setChemicalScope,
	getMaxAttempts,
	setMaxAttempts,
	nextAttemptLimit,
	getSkillHonour,
	setSkillHonour,
	SKILL_HONOUR_OFFERED,
	getDepthOverride,
	DEEPEST_TIERS,
	getDeepestTier,
	setDeepestTier,
	nextDeepestTier,
	getChemicalReach,
	setChemicalReach,
	DEFAULT_STANCES,
	getDefaultStance,
	setDefaultStance,
	nextDefaultStance,
	AWAY_STANCES,
	getAwayStance,
	setAwayStance,
	nextAwayStance,
	getPulseColor,
	setPulseColor,
	getPulseCustom,
	setPulseCustom,
	PULSE_COLORS,
	SCREEN_EFFECTS,
	TRANCE_EYES,
	TRANCE_EYE_COLORS,
	getTranceEyes,
	setTranceEyes,
	getTranceEyeColor,
	setTranceEyeColor,
	getScreenEffect,
	setScreenEffect,
	getSpiralStrength,
	ECHS_ICON_SPOTS,
	getEchsIconSpot,
	setEchsIconSpot,
	getPopupEnabled,
	setPopupEnabled,
	TOY_SCOPES,
	getToyMode,
	setToyMode,
	getInductionSeconds,
	setInductionSeconds,
	nextInductionSeconds,
	getToyScope,
	setToyScope,
	ATTEMPT_LIMITS,
	INDUCTION_TIMES,
	accessLevelOf, ACCESS_LEVELS, AccessLevel,
} from "./storage";
import { changeAccess, ACCESS_LABELS, ACCESS_WORDS } from "./access";
import type { TriggerScope, DecayRate, DropMode, TriggerView, ReportWithout } from "./storage";
import { REPORT_WITHOUT, getReportWithout, setReportWithout } from "./storage";
import { setSuppressed, setNumb, clearAllSuppression, setHearing, setVeiled } from "./suppression";
import { clearSelfTouchBlocks } from "./selftouch";
import { clearOrgasmDenial } from "./arousal";
import { clearIllusion } from "./illusion";
import { trustStatRows } from "./trust";
import { TRIGGER_SCOPES, decayLifetimeText } from "./triggers";
import {
	sweptTriggers,
	triggerRow,
	triggerPhrasesVisible,
	describeTriggerDetail,
	isTriggerInEffect,
	clearAllRefusal,
} from "./voice";
import { isHypnotized, isSessionLive, hardFloorStop } from "./session";
import { applyTranceEyes, restoreTranceEyes } from "./eyes";
import { clearFace } from "./face";
import {
	DEPTH_GATES,
	CHEMICAL_SCOPES,
	requiredDepth,
	tierLabel,
	tierOf,
	depthLabel,
	currentDepth,
	MAX_GATE_DEPTH,
	ChemicalScope,
	isChemicalToggleable,
} from "./depth";
import { isHelpOpen, openHelp, closeHelp, drawHelp, clickHelp } from "./help";
import { shouldShowWizard, startWizard, drawWizard, clickWizard } from "./wizard";
import { extremeLocked, extremeExpired, extremeBannerText, extremeRefusal, renewalPrompt, answerRenewal } from "./extreme";
import { keyLocked, keyLockRefusal, keyLockBannerText } from "./keylock";
import {
	TITLE_Y,
	PANEL_LEFT,
	PANEL_TOP,
	PANEL_WIDTH,
	PANEL_HEIGHT,
	BLURB_Y,
	CONTENT_LEFT,
	BACK_LEFT,
	BACK_TOP,
	BACK_SIZE,
	tabHitIndex,
	drawLeftText,
	drawLeftTextFit,
	drawLeftTextWrap,
	drawTabsAndPanel,
	tabTop,
	type ScrollArea,
	drawScrollArea,
	clickScrollBar,
	clampScroll,
	scrollBy,
	scrollY,
	scrollShows,
	scrollNeeded,
	scrollContentWidth,
	mouseInScroll,
	TAB_LEFT,
	TAB_WIDTH,
	tipButton,
	tipArea,
	flushTip,
	clearTipOverlap,
} from "./panel";

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
	/** Drawn indented under the row it depends on, and greyed and inert while that one is off
	 * (job3.md: Made to Touch Others under Made to Act). */
	needs?: keyof FeatureToggles;
	/** What it allows, shown when the pointer rests on the row (v1.16.37, review F8: the names alone
	 * did not say). From the Settings Reference wiki page. */
	tip?: string;
}

/** A group heading inside a checkbox list (job3.md §2B). Text only; it cannot be clicked. */
interface Heading {
	heading: string;
}

type ListItem = Row | Heading;

function isHeading(item: ListItem): item is Heading {
	return (item as Heading).heading !== undefined;
}

interface Tab {
	name: string;
	blurb: string;
	/** Checkbox tabs, with optional group headings. Omitted for a tab that draws itself. */
	rows?: ListItem[];
	/** Checkboxes held above the scrolling list, always in view, side by side (job3.md §2C). */
	fixedRows?: Row[];
	/** Read-only tabs supply their own drawing instead of a row list. */
	render?: () => void;
	/** Drawn AFTER the rows, for a tab that has both checkboxes and other controls. */
	extra?: () => void;
	/** A tab that draws itself usually has to handle its own clicks too. Returns true when it
	 * consumed the click, so the generic row handling below knows to stop. */
	clickExtra?: () => boolean;
	/** A control that scrolls with the checkbox rows, drawn below the last of them. `top` is
	 * its screen y; `width` is what it may use before the scroll bar. */
	scrollExtra?: {
		height: () => number;
		draw: (top: number, width: number) => void;
		click: (top: number) => boolean;
		/** Called instead of draw while it is scrolled wholly out of view, for a control that owns
		 * a DOM element, which the scroll area's clip cannot hide. */
		hide?: () => void;
	};
	/** Where the rows' scroll area ends, for a tab with fixed controls under it. Default: the
	 * panel floor. */
	rowsBottom?: number;
}

const TABS: Tab[] = [
	{
		name: "Permissions",
		blurb: "What others may do to you. All off by default. Triggers are persistent and outlive the session.",
		// v0.100.0 (job3.md): the master switch and the lock held at the top, always in view, and the
		// rest grouped under headings. How inductions reach you moved to its own tab.
		fixedRows: [
			{ key: "hypnoEnabled", label: "Hypnosis Enabled", tip: "The master switch. Off: nobody can hypnotize you, and a trance on you now ends, the same as the safeword." },
			{ key: "lockedWhileHypnotized", label: "Lock settings while a session is on you", tip: "While a session is on you, this screen is read-only until it ends. /echs safeword always works." },
		],
		rows: [
			{ heading: "Body" },
			{ key: "movementRestriction", label: "Movement Restriction", tip: "Lets you be held still: you cannot change your own pose, leave the room or walk on a map. Others can still adjust you." },
			{ key: "postureControl", label: "Posture Control", tip: "Lets them pose you: kneel, stand, all fours, lie down, arm poses. Also your face: eyes closed, mouth open, a smile, a blush." },
			{ key: "followControl", label: "Follow / Leash", tip: "\"Follow me\": you stay at their side, across room changes, on Bondage Club's own leash. Needs your BC setting that lets others leash you." },
			{ key: "clothingRestriction", label: "Clothing Restriction", tip: "Locks you out of the wardrobe while you are under." },
			{ key: "undressControl", label: "Undressing", tip: "Lets them have you take clothes off (\"take something off\", \"strip\")." },
			{ heading: "Voice & senses" },
			{ key: "speechRestriction", label: "Speech Restriction", tip: "\"You cannot speak\": mutes your room chat. Slash commands always get through." },
			{ key: "forcedSpeech", label: "Made to Speak (a trigger says words for you)", tip: "A planted trigger can make you say words aloud in the room (\"you will say 'I obey'\"). A gag still garbles them." },
			{ key: "hearingControl", label: "Hearing (hear only one voice, or only your name)", tip: "\"You hear only my voice\", or only lines with your name in them. Emotes and (out of character) text still get through." },
			{ key: "sightControl", label: "Sight (dimmed, very dark, or blind)", tip: "Dimmed, very dark, or blind: Bondage Club's own blindness, capped by your BC sensory settings. Nobody else sees a change." },
			{ heading: "Touch & arousal" },
			{ key: "selfTouchControl", label: "Self-Touch Control", tip: "\"You cannot touch yourself\": blocks your own touches on yourself." },
			{ key: "compelActivity", label: "Made to Act (touch yourself on command)", tip: "Lets them have you act on yourself on command (\"touch your breasts\")." },
			{ key: "compelTouchOthers", label: "Made to Touch Others", needs: "compelActivity", tip: "Lets them aim those commands at someone else in the room (\"kiss Rei\"). Not needed for the hypnotist themselves." },
			{ key: "arousalControl", label: "Arousal & Orgasm", tip: "Arousal raised or lowered, orgasm denied or forced, and numbness." },
			{ heading: "Mind" },
			{ key: "illusionControl", label: "Illusions (you see yourself otherwise)", tip: "Your own screen shows you otherwise than you are: still in clothes you were stripped of, naked while dressed, or tied up while free. Nobody else sees it." },
		],
	},
	{
		// v0.100.0 (job3.md §2A): how someone gets you under, out of the Permissions list where these
		// sat at the bottom, three screens down. "Sink deeper" came from the Depth tab.
		name: "Inductions",
		blurb: "How someone gets you under: how many tries they get, whether you are asked, and how deep they can take you.",
		rows: [],
		scrollExtra: dropdownsExtra(() => INDUCTION_DROPDOWNS),
	},
	{
		name: "Trance Defaults",
		blurb: "What being under is like, and what the room sees of it. On by default — this is the trance itself, not something granted.",
		rows: [
			{ key: "tranceCannotMove", label: "Cannot Move" },
			{ key: "tranceNoOneMoves", label: "...and no one else can move you either", needs: "tranceCannotMove" },
			{ key: "tranceCannotSpeak", label: "Cannot Speak" },
			{ key: "blockOOC", label: "Silence OOC too (text in parentheses)" },
			{ key: "tranceClothingFreeze", label: "Clothes Look Unchanged" },
			{ key: "roomSeesReactions", label: "Others See Your Reactions" },
		],
		scrollExtra: {
			// The screen effect and the eyes (v1.9.1, v1.10.0), then the pulse colour. Where others'
			// icons go and the popup moved to General (v1.16.37).
			height: () => tranceDropdownsHeight() + pulseControlsHeight(),
			draw: (top, width) => {
				drawDropdowns(TRANCE_DROPDOWNS, top, width);
				drawPulseControls(top + tranceDropdownsHeight(), width);
			},
			click: () => false,
			hide: () => {
				removePulseHexInput();
				removeDropdowns(TRANCE_DROPDOWNS);
			},
		},
	},
	{
		name: "Awareness",
		blurb: "What you can be made unaware of. Hides the chat message only: your own screen still shows the truth (that is Illusions), and arousal still applies.",
		rows: [
			{ key: "suppressClothing", label: "Clothing Changes" },
			{ key: "suppressBondage", label: "Bondage Changes" },
			{ key: "suppressActivities", label: "Touches / Activities" },
			{ key: "suppressTriggerSetup", label: "Trigger setup (hide what is planted)" },
		],
	},
	{
		// Triggers earned their own tab once there were three settings for them — a
		// permission, a scope and a duration. DW asked where the duration belonged, and
		// the honest answer was "nowhere yet".
		name: "Triggers",
		blurb: "Things that outlast the session. Both need a Deep trance by default, on earned depth — though the Depth tab can let arousal reach them, at the price of fading fast.",
		rows: [
			{ key: "triggerControl", label: "Allow triggers to be planted in you" },
			{ key: "carryForward", label: "Suggestions that outlive the trance" },
			{ key: "selfTrigger", label: "You can fire your own triggers" },
			{ key: "showTriggerWords", label: "Show trigger words when you list them" },
			{ key: "strictTriggerMatch", label: "Triggers fire only on whole words" },
		],
		// v1.16.37 (review F8): one scrolling page. The tick boxes had a box about four rows tall, the
		// fifth cut through by the label of the dropdowns fixed under it. Who else may fire them, the
		// longest a new one lasts, how long a fired one lasts, fading, drops, and her own list.
		scrollExtra: {
			height: () => (TRIGGER_DROPDOWNS.length + 1) * dropdownSlot(),
			draw: (top, width) => {
				drawDropdowns(TRIGGER_DROPDOWNS.slice(0, 2), top, width);
				drawDurationControl(top + 2 * dropdownSlot(), width);
				drawDropdowns(TRIGGER_DROPDOWNS.slice(2), top + 3 * dropdownSlot(), width);
			},
			click: () => false,
			hide: () => {
				removeDropdowns(TRIGGER_DROPDOWNS);
				if (document.getElementById(DURATION_ID)) ElementRemove(DURATION_ID);
			},
		},
	},
	{
		// The trigger inspector (v0.88.0, design.md "Trigger Overhaul", decisions 7-9). A tab of its
		// own because it is a LIST, which grows, and the Triggers tab is already full of controls.
		name: "Planted",
		blurb: "Triggers planted in you. Details shows what one does; Forget gets rid of it for good.",
		render: drawPlanted,
		clickExtra: clickPlanted,
	},
	{
		// Depth earned its own tab rather than a column beside the permissions: thirteen
		// features times a tier control is more than the Permissions tab can carry, and the
		// two questions are genuinely different anyway. The checkbox asks "may they ever";
		// this asks "how far under do I have to be first".
		name: "Depth",
		blurb: "How deep you must be before each thing can reach you. The checkbox still has to be on.",
		// v1.16.37 (review F8): scrolls like every other tab; it used Prev/Next pages.
		rows: [],
		scrollExtra: {
			height: depthHeight,
			draw: drawDepthGates,
			click: clickDepthGates,
			hide: () => {
				removeDepthInputs();
				removeDropdowns([...DEPTH_DROPDOWNS, ...chemDropdowns()]);
			},
		},
	},
	{
		name: "Stats",
		blurb: "Trust and experience. Counts are shown because they are what is actually stored.",
		render: drawStats,
	},
	// v1.16.37 (review F8, DW): how ECHS behaves for you, moved off Trance Defaults, which is about
	// the trance. Last in the column (DW). Keyholders reach it with full keys only (DW).
	{
		name: "General",
		blurb: "How ECHS behaves for you: a safety net, what you see, and what others see of you. Only a full keyholder can change these.",
		rows: [
			{ key: "releaseOnDisconnect", label: "Release everything if you disconnect" },
			{ key: "commandPulse", label: "Pulse when a command lands or a trigger fires" },
			{ key: "showEchsIcon", label: "Show others that I run ECHS (a spiral over you in rooms)" },
		],
		// The two dropdowns, then Export / Import / Reset (v1.16.38, DW; on Stats before).
		scrollExtra: {
			height: () => GENERAL_DROPDOWNS.length * dropdownSlot() + dataBlockHeight(),
			draw: (top, width) => {
				drawDropdowns(GENERAL_DROPDOWNS, top, width);
				drawDataBlock(top + GENERAL_DROPDOWNS.length * dropdownSlot(), width);
			},
			click: (top) => clickDataBlock(top + GENERAL_DROPDOWNS.length * dropdownSlot()),
			hide: () => removeDropdowns(GENERAL_DROPDOWNS),
		},
	},
];


/** The tabs a keyholder can reach (v1.14.0, job5.md; DW): their tick boxes, and (v1.14.1)
 * remoteChoices() on Inductions and Trance Defaults; (v1.16.2, job6.md stage 3) for full keys the
 * Triggers tab's choices, the Depth tab, and trust fading from Stats. In screen order. */
export const REMOTE_TABS = ["Permissions", "Inductions", "Trance Defaults", "Awareness", "Triggers", "Depth", "Stats", "General"];

export type RemoteRow = { key: keyof FeatureToggles; label: string; tab: string; heading: string; needs?: keyof FeatureToggles };

/** Every tick box a keyholder may switch, read from the tabs themselves so the remote can never
 * offer one the settings screen does not have, or miss one it gains. In screen order. */
export function remoteRows(): RemoteRow[] {
	const out: RemoteRow[] = [];
	for (const tab of TABS.filter((t) => REMOTE_TABS.includes(t.name))) {
		for (const r of tab.fixedRows ?? []) out.push({ key: r.key, label: r.label, tab: tab.name, heading: "", needs: r.needs });
		let heading = "";
		for (const item of tab.rows ?? []) {
			if (isHeading(item)) heading = item.heading;
			else out.push({ key: item.key, label: item.label, tab: tab.name, heading, needs: item.needs });
		}
	}
	return out;
}

function visibleTabs(): Tab[] {
	// Every tab, Stats included (v1.16.37: the Advanced button that hid it went to make room for General).
	const tabs = TABS;
	// "My triggers list: Hidden" turns the Planted tab off (v1.16.30, DW).
	return getTriggerView() === "hidden" ? tabs.filter((t) => t.name !== "Planted") : tabs;
}

/** The settings tabs shown now, by name. For the suite. */
export function visibleTabNames(): string[] {
	return visibleTabs().map((t) => t.name);
}


let activeTab = 0;

// --- Geometry ------------------------------------------------------------------------
// Screen chrome (tabs, panel, exit icon, text helpers) lives in panel.ts, shared with the
// help screen. What stays here is what only the settings screen has: checkbox rows and the
// data buttons.
/** Sits left of the exit icon at 1815, same size, so the two read as a pair. */
const HELP_LEFT = 1700;
const SETUP_WIDTH = 170;
const SETUP_LEFT = HELP_LEFT - SETUP_WIDTH - 20;
const HELP_TOP = BACK_TOP;
const HELP_SIZE = BACK_SIZE;

const BOX_LEFT = CONTENT_LEFT;
const BOX_SIZE = 70;
const ROW_SPACING = 78;

/** Columns for the Stats tab. */
const STAT_NAME_X = BOX_LEFT;
// 460 rather than 640. The widest thing in this column is a name and a member number —
// "WinnersDice [252905]" is about 340px — so 640 left a hand's width of nothing between the
// name and its value, and pushed the detail column out to where it had least room.
const STAT_VALUE_X = BOX_LEFT + 420;
const STAT_DETAIL_X = BOX_LEFT + 500;
/** What a name may use before it reaches the value column. BC names can run to 20 characters
 * and the member number adds nine more, so this one does need a cap now that the column is
 * only as wide as it has to be. */
const STAT_NAME_MAX = 400;
const STAT_LINE_HEIGHT = 40;
const STAT_EXPERIENCE_Y = 290;
const STAT_HEADER_Y = 330;
/** Where the trust list's scroll area runs (v1.16.38, DW: scroll bars, not pages). */
const STAT_LIST_TOP = 352;
const STAT_LIST_BOTTOM = 800;
/** The first row's centre, used for the lines shown in the list's place (nobody yet, the lock). */
const STAT_FIRST_ROW_Y = STAT_LIST_TOP + 20;
/** Trust fading, under the list. */
const STAT_DECAY_Y = 848;

// Prev / Next, for the Planted tab's pages.
const PAGE_BUTTON_WIDTH = 110;
const PAGE_BUTTON_HEIGHT = 46;
const PAGE_PREV_LEFT = BOX_LEFT;
const PAGE_NEXT_LEFT = BOX_LEFT + 130;

// The search box, beside the list's header, clear of its short "detail" (Senge, Eri). And a [x] at the
// end of each row (Valerie), which is why the detail column now has an edge to fit inside.
const TRUST_SEARCH_ID = "HypnosisAddonTrustSearch";
const TRUST_SEARCH_LABEL_X = BOX_LEFT + 760;
const TRUST_SEARCH_LEFT = BOX_LEFT + 850;
const TRUST_SEARCH_WIDTH = 380;
const TRUST_SEARCH_HEIGHT = 40;
const STAT_FORGET_WIDTH = 90;
const STAT_FORGET_HEIGHT = 34;
// Left of the list's scroll bar (panel.ts SCROLLBAR_WIDTH, at the right of the scroll area).
const STAT_FORGET_LEFT = PANEL_LEFT + PANEL_WIDTH - 20 - 44 - STAT_FORGET_WIDTH - 12;
// Each person's access level (v1.17.0, DW): Blocked / Normal / Toy, just left of the [x].
const STAT_ACCESS_WIDTH = 72;
const STAT_ACCESS_GAP = 6;
const STAT_ACCESS_LEFT = STAT_FORGET_LEFT - ACCESS_LEVELS.length * (STAT_ACCESS_WIDTH + STAT_ACCESS_GAP) - 4;
const STAT_ACCESS_COLORS: Record<AccessLevel, string> = { blocked: "#ffb3b3", normal: "#cfe8cf", toy: "#d8c7ff" };
const STAT_DETAIL_MAX = STAT_ACCESS_LEFT - STAT_DETAIL_X - 12;
/** Blocked takes two clicks, as [x] does: it forgets everything they planted. */
let statBlockArmed = 0;
let statBlockArmedUntil = 0;
/** What is typed in the search. Reset whenever the screen opens. */
let trustSearch = "";
/** The member number whose [x] has been clicked once, and until when that counts. */
let statForgetArmed = 0;
let statForgetArmedUntil = 0;

// Export / Import / Reset, at the end of the General tab (v1.16.38, DW; on Stats before).
const DATA_BUTTON_WIDTH = 200;
const DATA_BUTTON_HEIGHT = 60;
const DATA_BUTTON_GAP = 20;
const DATA_BUTTONS = ["Export", "Import", "Reset"] as const;

/** Reset is two-click: the first arms it, the second within the window commits. Wiping
 * every stat and toggle shouldn't be one misclick away, and a canvas screen has no
 * confirmation dialog to lean on. */
let resetArmedUntil = 0;
const RESET_ARM_MS = 5000;

function dataButtonLeft(index: number): number {
	return BOX_LEFT + index * (DATA_BUTTON_WIDTH + DATA_BUTTON_GAP);
}

// --- Planted tab: the trigger inspector ------------------------------------------------
// A paged list, one row per trigger: the same summary `/echs triggers` prints (who, how strong,
// whether it is holding you), with Details and Purge. Details replaces the list with that one
// trigger in full, the settings-screen version of `/echs triggers <number>`: one deliberate
// step to see what a trigger does. Purge refuses while the trigger is holding you, exactly as
// `/echs forgettrigger` does; Clear All refuses while anything is, and asks once.
//
// Neither is under the settings lock, on purpose: removing something planted in you is "always
// available, never gated", the principle `/echs forgettrigger` states. What protects a scene is
// the refusal while a trigger holds you, and that applies here in full.
const PLANTED_ROW_TOP = 295;
const PLANTED_ROW_STEP = 62;
const PLANTED_ROW_HEIGHT = 48;
const PLANTED_ROWS_PER_PAGE = 6;
const PLANTED_BUTTON_WIDTH = 150;
const PLANTED_PURGE_LEFT = CONTENT_LEFT + 1060;
const PLANTED_DETAILS_LEFT = PLANTED_PURGE_LEFT - PLANTED_BUTTON_WIDTH - 16;
const PLANTED_TEXT_MAX = PLANTED_DETAILS_LEFT - CONTENT_LEFT - 20;
const PLANTED_PAGE_TOP = 680;
const CLEAR_ALL_TOP = 770;
const CLEAR_ALL_WIDTH = 260;
const CLEAR_ALL_HEIGHT = 60;
const CLEAR_ALL_NOTE_X = CONTENT_LEFT + CLEAR_ALL_WIDTH + 30;
const CLEAR_ALL_NOTE_WIDTH = PANEL_LEFT + PANEL_WIDTH - 40 - CLEAR_ALL_NOTE_X;
/** The detail view's Purge, right of its Back button. */
const DETAIL_PURGE_LEFT = CONTENT_LEFT + PLANTED_BUTTON_WIDTH + 20;
let plantedPage = 0;
/** 1-based index of the trigger shown in full, or 0 for the list. */
let plantedDetail = 0;
let clearAllArmedUntil = 0;
const CLEAR_ALL_ARM_MS = 5000;

function plantedPageCount(count: number): number {
	return Math.max(1, Math.ceil(count / PLANTED_ROWS_PER_PAGE));
}

function plantedRowTop(slot: number): number {
	return PLANTED_ROW_TOP + slot * PLANTED_ROW_STEP;
}

function drawPurgeButton(left: number, top: number, height: number, holding: boolean): void {
	tipButton(
		left,
		top,
		PLANTED_BUTTON_WIDTH,
		height,
		holding ? "Holding" : "Forget",
		holding || extremeLocked() ? "#ddd" : "#ffe0e0",
		"",
		extremeLocked() ? lockedTip() : holding ? "It is holding you. /echs safeword clears it" : "Forget this trigger",
		holding || extremeLocked(),
	);
}

function drawPlanted(): void {
	const all = sweptTriggers();
	if (plantedDetail > all.length) plantedDetail = 0;
	if (plantedDetail) {
		drawPlantedDetail(isTriggerInEffect(all[plantedDetail - 1]));
		return;
	}
	const pages = plantedPageCount(all.length);
	if (plantedPage >= pages) plantedPage = pages - 1;
	if (!all.length) drawLeftTextFit("No triggers are planted in you.", CONTENT_LEFT, PLANTED_ROW_TOP + 24, PLANTED_TEXT_MAX, "Gray");
	const reveal = triggerPhrasesVisible(false);
	const start = plantedPage * PLANTED_ROWS_PER_PAGE;
	all.slice(start, start + PLANTED_ROWS_PER_PAGE).forEach((t, slot) => {
		const top = plantedRowTop(slot);
		const holding = isTriggerInEffect(t);
		drawLeftTextFit(
			`${start + slot + 1}. ${triggerRow(t, reveal, all)}`,
			CONTENT_LEFT,
			top + PLANTED_ROW_HEIGHT / 2,
			PLANTED_TEXT_MAX,
			holding ? "#a00000" : "Black",
		);
		tipButton(PLANTED_DETAILS_LEFT, top, PLANTED_BUTTON_WIDTH, PLANTED_ROW_HEIGHT, "Details", "White", "", "What it does");
		drawPurgeButton(PLANTED_PURGE_LEFT, top, PLANTED_ROW_HEIGHT, holding);
	});
	if (pages > 1) {
		tipButton(PAGE_PREV_LEFT, PLANTED_PAGE_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Prev", "White", "", "", plantedPage === 0);
		tipButton(PAGE_NEXT_LEFT, PLANTED_PAGE_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Next", "White", "", "", plantedPage >= pages - 1);
		drawLeftText(`${plantedPage + 1} / ${pages}`, PAGE_NEXT_LEFT + PAGE_BUTTON_WIDTH + 20, PLANTED_PAGE_TOP + PAGE_BUTTON_HEIGHT / 2, "Gray");
	}
	drawClearAll(all.length);
}

/** Clear All is drawn greyed with the reason beside it when it would refuse — a disabled button
 * with no reason is the silent refusal rule 5 forbids. It stays clickable, and says why. */
function drawClearAll(count: number): void {
	if (!count) return;
	const refusal = clearAllRefusal();
	const armed = !refusal && Date.now() < clearAllArmedUntil;
	tipButton(
		CONTENT_LEFT,
		CLEAR_ALL_TOP,
		CLEAR_ALL_WIDTH,
		CLEAR_ALL_HEIGHT,
		armed ? "Confirm?" : "Forget All",
		refusal ? "#ddd" : armed ? "#ffb3b3" : "#ffe0e0",
		"",
		refusal ? "Not while anything has hold of you" : "Forgets every trigger, asks once first",
		!!refusal,
	);
	drawLeftTextWrap(
		refusal ??
			(armed
				? `Click again to forget ${count === 1 ? "it" : `all ${count}`}, including any you cannot see. This cannot be undone.`
				: `Forgets ${count === 1 ? "the 1 trigger" : `all ${count} triggers`}, including any you cannot see.`),
		CLEAR_ALL_NOTE_X,
		CLEAR_ALL_TOP + CLEAR_ALL_HEIGHT / 2,
		CLEAR_ALL_NOTE_WIDTH,
		CLEAR_ALL_HEIGHT + 20,
		refusal || armed ? "#a00000" : "Gray",
	);
}

function drawPlantedDetail(holding: boolean): void {
	let y = PLANTED_ROW_TOP + 20;
	for (const line of describeTriggerDetail(plantedDetail, false)) {
		drawLeftTextWrap(line, CONTENT_LEFT, y, PANEL_WIDTH - 120, 64, "Black");
		y += 70;
	}
	tipButton(CONTENT_LEFT, CLEAR_ALL_TOP, PLANTED_BUTTON_WIDTH, CLEAR_ALL_HEIGHT, "Back", "White", "", "Back to the list");
	drawPurgeButton(DETAIL_PURGE_LEFT, CLEAR_ALL_TOP, CLEAR_ALL_HEIGHT, holding);
}

/** Remove one trigger, or say why not. Exported for the suite, which drives it without a canvas. */
export function purgePlanted(index: number): string {
	const t = sweptTriggers()[index - 1];
	if (!t) return `There is no trigger ${index}.`;
	if (extremeLocked()) return extremeRefusal();
	if (isTriggerInEffect(t)) {
		return (
			`Trigger ${index} is holding you right now, so it can't be forgotten. ` +
			"Wait for it to wear off, have whoever set it release you, or use /echs safeword."
		);
	}
	forgetTrigger(t.key);
	log(`purged trigger ${index} (by ${t.installedByName}) from the settings screen`);
	return `Trigger ${index} forgotten.`;
}

/** Clear All's click: refuse with the reason, arm, or clear. Exported for the suite. */
export function clickClearAll(): string {
	const refusal = clearAllRefusal();
	if (refusal) {
		clearAllArmedUntil = 0;
		return refusal;
	}
	if (Date.now() > clearAllArmedUntil) {
		clearAllArmedUntil = Date.now() + CLEAR_ALL_ARM_MS;
		return "Click Forget All again within 5 seconds to forget every trigger planted in you.";
	}
	clearAllArmedUntil = 0;
	const n = forgetAllTriggers();
	return `Forgot ${n === 1 ? "1 trigger" : `${n} triggers`}.`;
}

/** Every click on this tab is consumed, hit or miss: one falling through would reach the Stats
 * tab's handling below, whose Export/Import/Reset buttons sit at these same coordinates. */
function clickPlanted(): boolean {
	const all = sweptTriggers();
	if (plantedDetail) {
		if (MouseIn(CONTENT_LEFT, CLEAR_ALL_TOP, PLANTED_BUTTON_WIDTH, CLEAR_ALL_HEIGHT)) {
			plantedDetail = 0;
		} else if (MouseIn(DETAIL_PURGE_LEFT, CLEAR_ALL_TOP, PLANTED_BUTTON_WIDTH, CLEAR_ALL_HEIGHT)) {
			const before = all.length;
			notifyLocal(purgePlanted(plantedDetail));
			if (sweptTriggers().length < before) plantedDetail = 0;
		}
		return true;
	}
	const pages = plantedPageCount(all.length);
	if (pages > 1) {
		if (MouseIn(PAGE_PREV_LEFT, PLANTED_PAGE_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
			plantedPage = Math.max(0, plantedPage - 1);
			return true;
		}
		if (MouseIn(PAGE_NEXT_LEFT, PLANTED_PAGE_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
			plantedPage = Math.min(pages - 1, plantedPage + 1);
			return true;
		}
	}
	const start = plantedPage * PLANTED_ROWS_PER_PAGE;
	const onPage = Math.min(PLANTED_ROWS_PER_PAGE, all.length - start);
	for (let slot = 0; slot < onPage; slot++) {
		const top = plantedRowTop(slot);
		if (MouseIn(PLANTED_DETAILS_LEFT, top, PLANTED_BUTTON_WIDTH, PLANTED_ROW_HEIGHT)) {
			plantedDetail = start + slot + 1;
			return true;
		}
		if (MouseIn(PLANTED_PURGE_LEFT, top, PLANTED_BUTTON_WIDTH, PLANTED_ROW_HEIGHT)) {
			notifyLocal(purgePlanted(start + slot + 1));
			return true;
		}
	}
	if (all.length && MouseIn(CONTENT_LEFT, CLEAR_ALL_TOP, CLEAR_ALL_WIDTH, CLEAR_ALL_HEIGHT)) {
		notifyLocal(clickClearAll());
	}
	return true;
}

// --- Permissions tab: the attempt limit ------------------------------------------------
// One row of the settings screen that is not a checkbox: a dropdown with its label (left), and what
// the current choice MEANS written under it. The sizes are the old attempt button's.
const ATTEMPT_BUTTON_HEIGHT = 44;
const ATTEMPT_CAPTION_HEIGHT = 44;
const ATTEMPT_CAPTION_GAP = 8;

function attemptControlHeight(): number {
	return ATTEMPT_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT;
}

// The dropdowns under the Trance Defaults rows (v1.9.1, v1.10.0). DOM <select>s, shown only while
// wholly in view, as the toy mode dropdown is, and removed off their tab and on every exit.
//
// The screen effect (v1.9.1, DW 2026-11-08): one dropdown for what was the Screen Fade tick box and
// v1.9.0's spiral tick box, which only worked together. None, the grey fade, or the spiral at three
// strengths. Her eyes while under (v1.10.0): BC's own eye expressions, and a colour (eyes.ts).
interface DropdownRow {
	id: string;
	label: string;
	options: { key: string; label: string }[];
	get: () => string;
	set: (key: string) => void;
	caption: () => string;
	/** False for a preference the settings lock does not hold (where you see spirals, the popup). */
	lockable?: boolean;
}
const SCREEN_EFFECT_ID = "HypnosisAddonScreenEffect";
const TRANCE_EYES_ID = "HypnosisAddonTranceEyes";
const TRANCE_EYE_COLOR_ID = "HypnosisAddonTranceEyeColor";
// v1.16.37 (review F8): every choice on the screen is one of these now, the click-to-cycle buttons
// gone (DW: dropdowns). One label size for all of them; the labels used to shrink to fit, so
// "Screen effect:" was large and "Eye colour while under:" tiny.
const DROPDOWN_LABEL_WIDTH = 520;
const DROPDOWN_WIDTH = 630;
const DROPDOWN_LABEL_SIZE = 28;
/** Every caption under a choice, one size (the lab showed them shrinking to different sizes). */
const CAPTION_SIZE = 22;
/** One dropdown, its caption and the gap under it. A function: CYCLE_GAP is declared further down. */
function dropdownSlot(): number {
	return attemptControlHeight() + CYCLE_GAP;
}

/** Her eyes changed while she is under: undo what is there and put the new choice on now. */
function reapplyTranceEyes(): void {
	if (!isHypnotized()) return;
	restoreTranceEyes();
	applyTranceEyes();
}

const TRANCE_DROPDOWNS: DropdownRow[] = [
	{
		id: SCREEN_EFFECT_ID,
		label: "Screen effect:",
		options: SCREEN_EFFECTS,
		get: getScreenEffect,
		set: (key) => {
			const was = getScreenEffect();
			setScreenEffect(key);
			const now = getScreenEffect();
			log(`screen effect: ${was} -> ${now}`);
			// None takes the fade off at once, as unticking Screen Fade did.
			if (now === "none" && was !== "none") onToggle("tranceScreenFade", false);
			// From None mid-trance there is no fade to draw yet (rule 5: say so).
			else if (was === "none" && now !== "none" && getScreenFade() === 0 && isHypnotized())
				tellPlayer("Your screen effect starts with your next trance.");
		},
		caption: () => {
			const e = getScreenEffect();
			if (e === "none") return "Nothing over your screen while you are under.";
			if (e === "fade") return "A soft grey veil over the room while you are under. Only you see it.";
			return "A spiral in your pulse colour turns over the room while you are under. Only you see it.";
		},
	},
	{
		id: TRANCE_EYES_ID,
		label: "Eyes while under:",
		options: TRANCE_EYES,
		get: getTranceEyes,
		set: (key) => {
			setTranceEyes(key);
			log(`trance eyes: ${key || "unchanged"}`);
			reapplyTranceEyes();
		},
		caption: () =>
			getTranceEyes()
				? getTranceEyes() === "Dizzy"
					? "Spiral eyes while you are under, with your eye shadow hidden; both back when you wake. The room sees it."
					: "Your eyes change while you are under, and back when you wake. Everyone in the room sees it."
				: "Your eyes stay as they are while you are under.",
	},
	{
		id: TRANCE_EYE_COLOR_ID,
		label: "Eye colour while under:",
		options: TRANCE_EYE_COLORS,
		get: getTranceEyeColor,
		set: (key) => {
			setTranceEyeColor(key);
			log(`trance eye colour: ${key || "unchanged"}`);
			reapplyTranceEyes();
		},
		caption: () =>
			getTranceEyeColor()
				? "Your real eye colour is saved first and put back when you wake, even after a crash. The room sees it."
				: "Your eye colour stays as it is while you are under.",
	},
];

function removeDropdowns(rows: DropdownRow[]): void {
	for (const r of rows) if (document.getElementById(r.id)) ElementRemove(r.id);
}

/** A list of dropdowns as a tab's scrolling extra. */
function dropdownsExtra(rows: () => DropdownRow[]): NonNullable<Tab["scrollExtra"]> {
	return {
		height: () => rows().length * dropdownSlot(),
		draw: (top, width) => drawDropdowns(rows(), top, width),
		click: () => false,
		hide: () => removeDropdowns(rows()),
	};
}

function drawDropdowns(rows: DropdownRow[], top: number, width: number): void {
	rows.forEach((row, i) => drawDropdownRow(row, top + i * dropdownSlot(), width, row.lockable === false ? false : settingsLocked()));
}

function drawDropdownRow(row: DropdownRow, top: number, width: number, locked: boolean): void {
	drawLeftTextFit(row.label, BOX_LEFT, top + ATTEMPT_BUTTON_HEIGHT / 2, DROPDOWN_LABEL_WIDTH, locked ? "Gray" : "Black", DROPDOWN_LABEL_SIZE);
	drawLeftTextWrap(
		row.caption(),
		BOX_LEFT,
		top + ATTEMPT_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT / 2,
		width,
		ATTEMPT_CAPTION_HEIGHT,
		locked ? "Gray" : "#555",
		CAPTION_SIZE,
		18,
	);
	const inView = top >= rowScroll.top && top + ATTEMPT_BUTTON_HEIGHT <= rowScroll.top + rowScroll.height;
	let element = document.getElementById(row.id) as HTMLSelectElement | null;
	if (!inView) {
		if (element) ElementRemove(row.id);
		return;
	}
	if (!element) {
		element = ElementCreateDropdown(
			row.id,
			row.options.map((o) => o.label),
			function () {
				// Again here, not only through `disabled`: a lock can begin while it is open.
				if (row.lockable !== false && settingsLocked()) return;
				const picked = row.options[this.selectedIndex];
				if (picked) {
					row.set(picked.key);
					log(`setting now: ${row.label} ${picked.label}`);
				}
			},
		);
	}
	// Re-synced every frame: an import or a reset changes it underneath us.
	const index = row.options.findIndex((o) => o.key === row.get());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	const left = BOX_LEFT + DROPDOWN_LABEL_WIDTH + 20;
	ElementPosition(row.id, left + DROPDOWN_WIDTH / 2, top + ATTEMPT_BUTTON_HEIGHT / 2, DROPDOWN_WIDTH, ATTEMPT_BUTTON_HEIGHT);
}

function tranceDropdownsHeight(): number {
	return TRANCE_DROPDOWNS.length * dropdownSlot();
}

/** On the Trance Defaults tab, under the other dropdowns. */
const PULSE_COLOR_ID = "HypnosisAddonPulseColor";
const PULSE_COLOR_DROPDOWN: DropdownRow = {
	id: PULSE_COLOR_ID,
	label: "Pulse colour:",
	options: PULSE_COLORS.map((c) => ({ key: c.key, label: c.label })),
	get: getPulseColor,
	set: (key) => {
		setPulseColor(key);
		pulseHexError = "";
	},
	caption: () =>
		!getFeatures().commandPulse && !getSpiralStrength()
			? "The pulse is off and there is no spiral, so this does nothing until you choose one."
			: getPulseColor() === "custom"
				? "Your own colour: type a hex code below, the kind BC's colour picker uses."
				: "The pulse (on the General tab) and the trance spiral, if on. Only you see them.",
};

/** A choice (not a tick box) a keyholder may set (v1.14.1, DW 2026-11-21): every control on the
 * Inductions tab, and on Trance Defaults the screen effect (the spiral), her eyes, her eye colour and
 * the pulse colour. `off` is the one choice a minimal keyholder may set, the one that switches the
 * thing off; a choice with no off (a number, a colour, who toy mode is for) needs more.
 * `moderate` (v1.16.0, job6.md §1): a moderate keyholder may pick any option, because it shapes the
 * trance rather than opening something new. Without it, only full may pick beyond `off`. */
export type RemoteChoice = {
	key: string;
	label: string;
	tab: string;
	options: { key: string; label: string }[];
	off?: string;
	moderate?: boolean;
	/** A number rather than a list (v1.16.2): any whole number from min to max, offered on the
	 * keyholder's side as step buttons. `options` is then empty. */
	range?: { min: number; max: number; steps: number[] };
	/** How a value reads, when it is not simply one of `options` (a number, or a state no one picks). */
	labelOf?: (value: string) => string;
	get: () => string;
	set: (value: string) => void;
};

/** How a choice's value reads: its own labelOf, else its option's label, else the value itself. */
export function remoteChoiceLabel(c: RemoteChoice, value: string): string {
	return c.labelOf?.(value) ?? c.options.find((o) => o.key === value)?.label ?? value;
}

/** Tabs whose tick boxes a moderate keyholder may switch ON too (v1.16.0, job6.md §1, DW): how the
 * trance is, not what may be done to her. Permissions and Triggers stay off-only below full. */
export const MODERATE_TABS = ["Trance Defaults", "Awareness"];

/** Tabs whose tick boxes only a full keyholder may switch at all, off included (v1.16.37, DW): the
 * General tab, which moved off Trance Defaults. A safety net, and what others see of her. */
export const FULL_ONLY_TABS = ["General"];

/** The choices, through the same setters as her own dropdowns, so their side effects (the fade
 * coming off, her eyes redone mid-trance) happen as they would for her. Custom pulse colour is left
 * out: it needs a hex code typed on her screen. */
export function remoteChoices(): RemoteChoice[] {
	const fromDropdown = (key: string, label: string, id: string, off: string): RemoteChoice => {
		const d = TRANCE_DROPDOWNS.find((x) => x.id === id)!;
		return { key, label, tab: "Trance Defaults", options: d.options, off, moderate: true, get: d.get, set: d.set };
	};
	const inductions = (key: string, label: string, options: { key: string; label: string }[], get: () => string, set: (v: string) => void, off?: string, moderate = false): RemoteChoice =>
		({ key, label, tab: "Inductions", options, off, moderate, get, set });
	return [
		// The Inductions tab, in its screen order.
		inductions("maxAttempts", "Attempts before they must wait", ATTEMPT_LIMITS.map((n) => ({ key: String(n), label: String(n) })), () => String(getMaxAttempts()), (v) => setMaxAttempts(Number(v)), undefined, true),
		inductions("inductionSeconds", "Time to go under (after you answer)", INDUCTION_TIMES.map((n) => ({ key: String(n), label: `${n} seconds` })), () => String(getInductionSeconds()), (v) => setInductionSeconds(Number(v)), undefined, true),
		inductions("defaultStance", "When someone tries to hypnotize me", DEFAULT_STANCES, getDefaultStance, setDefaultStance, "prompt"),
		inductions("awayStance", "When I'm away", AWAY_STANCES, getAwayStance, setAwayStance, "refuse"),
		inductions("toyMode", "Toy mode", [{ key: "off", label: "Off" }, { key: "on", label: "On" }], () => (getToyMode() ? "on" : "off"), (v) => setToyMode(v === "on"), "off"),
		inductions("toyScope", "Toy mode is for", TOY_SCOPES, getToyScope, setToyScope),
		inductions("deepestTier", '"Sink deeper" stops at', DEEPEST_TIERS, getDeepestTier, setDeepestTier, "never", true),
		// Trance Defaults.
		fromDropdown("screenEffect", "Screen effect", SCREEN_EFFECT_ID, "none"),
		fromDropdown("tranceEyes", "Eyes while under", TRANCE_EYES_ID, ""),
		fromDropdown("tranceEyeColor", "Eye colour while under", TRANCE_EYE_COLOR_ID, ""),
		{
			key: "pulseColor",
			label: "Pulse colour",
			tab: "Trance Defaults",
			moderate: true,
			options: PULSE_COLORS.filter((c) => c.key !== "custom").map((c) => ({ key: c.key, label: c.label })),
			get: getPulseColor,
			set: (value) => {
				setPulseColor(value);
				pulseHexError = "";
			},
		},
		// Full keys only from here (v1.16.2, job6.md stage 3, DW): no `off`, no `moderate`. Appended,
		// so a v1.16.1 keyholder, which keeps the first 20, still sees everything it knows.
		...fullOnlyChoices(),
	];
}

/** The Triggers tab's choices, trust fading (on Stats), and the Depth tab. */
function fullOnlyChoices(): RemoteChoice[] {
	const full = (tab: string, key: string, label: string, options: { key: string; label: string }[], get: () => string, set: (v: string) => void): RemoteChoice =>
		({ key, label, tab, options, get, set });
	const depthLabel = (v: string) => `${v} (${tierLabel(tierOf(Number(v)))})`;
	const out: RemoteChoice[] = [
		full("Triggers", "triggerScope", "Who else can fire triggers planted in you", TRIGGER_SCOPES, getTriggerScope, (v) => setTriggerScope(v as TriggerScope)),
		full("Triggers", "triggerLifespan", "Longest a new trigger lasts", TRIGGER_LIFESPANS.map((l) => ({ key: String(l.minutes), label: l.label })), () => String(getTriggerLifespan()), (v) => setTriggerLifespan(Number(v))),
		{
			key: "triggerDuration",
			label: "Minutes a fired trigger lasts (0 = until released)",
			tab: "Triggers",
			options: [],
			range: { min: 0, max: 1440, steps: [-60, -5, 5, 60] },
			labelOf: (v) => (v === "0" ? "until released" : `${v} min`),
			get: () => String(getTriggerDuration()),
			set: (v) => setTriggerDuration(Number(v)),
		},
		full("Triggers", "triggerDecay", "Triggers fade without reinforcement", DECAY_RATES, getTriggerDecayRate, (v) => setTriggerDecayRate(v as DecayRate)),
		full("Triggers", "dropTriggers", "Drop triggers", DROP_MODES, getDropMode, (v) => setDropMode(v as DropMode)),
		full("Triggers", "triggerView", "My triggers list", TRIGGER_VIEWS, getTriggerView, (v) => setTriggerView(v as TriggerView)),
		full("General", "reportWithout", "Played without ECHS, tell", REPORT_WITHOUT, getReportWithout, (v) => setReportWithout(v as ReportWithout)),
		full("Stats", "trustDecay", "Trust fades when you don't see someone", DECAY_RATES, getDecayRate, (v) => setDecayRate(v as DecayRate)),
	];
	for (const gate of DEPTH_GATES) {
		out.push({
			key: `depth:${gate.key}`,
			label: gate.label,
			tab: "Depth",
			options: [],
			range: { min: 0, max: MAX_GATE_DEPTH, steps: [-20, -5, 5, 20] },
			labelOf: depthLabel,
			get: () => String(requiredDepth(gate.key)),
			set: (v) => setDepthOverride(gate.key, Number(v)),
		});
		if (isChemicalToggleable(gate.key)) {
			out.push(
				full("Depth", `reach:${gate.key}`, `${gate.label}: may arousal reach it`, [{ key: "earned", label: "Earned only" }, { key: "arousal", label: "Arousal ok" }], () => (getChemicalReach(gate.key) ? "arousal" : "earned"), (v) => setChemicalReach(gate.key, v === "arousal")),
			);
		}
	}
	out.push(
		full("Depth", "chemicalScope", "Chemicals count", CHEMICAL_SCOPES, () => getChemicalScope(), (v) => setChemicalScope(v)),
		// The offered rungs only: the last ("skill can beat my resistance") is not on her own button either.
		full("Depth", "skillHonour", "A hypnotist's skill", SKILL_HONOUR_OFFERED, getSkillHonour, setSkillHonour),
		{
			key: "depthDefaults",
			label: "Depth requirements",
			tab: "Depth",
			// Only "defaults" can be picked; "changed" is how it reads once anyone has moved one.
			options: [{ key: "defaults", label: "Reset to defaults" }],
			labelOf: (v) => (v === "defaults" ? "all at their defaults" : "some changed"),
			get: () => (DEPTH_GATES.some((g) => getDepthOverride(g.key) !== undefined) ? "changed" : "defaults"),
			set: () => clearDepthOverrides(),
		},
	);
	return out;
}

/** The General tab's two choices (v1.16.37; on Trance Defaults before). Neither is held by the
 * settings lock: they are what you see, not what may be done to you. */
const GENERAL_DROPDOWNS: DropdownRow[] = [
	{
		// Playing without ECHS (v1.20.0, DW): off by default. Held by the settings locks, unlike the two below.
		id: "HypnosisAddonReportWithout",
		label: "Played without ECHS, tell:",
		options: REPORT_WITHOUT,
		get: getReportWithout,
		set: (key) => setReportWithout(key as ReportWithout),
		caption: () =>
			getReportWithout() === "off"
				? "Nobody is told and nothing is kept. Pick someone and ECHS beeps them if you play without it."
				: "If BC shows something changed while ECHS was off, they get a beep. They need you as a friend.",
	},
	{
		// Where other players' ECHS icons are drawn (v1.7.0).
		id: "HypnosisAddonIconSpot",
		label: "ECHS icons over others:",
		options: ECHS_ICON_SPOTS.map((s) => ({ key: s.key, label: s.label })),
		get: getEchsIconSpot,
		set: (key) => setEchsIconSpot(key as Parameters<typeof setEchsIconSpot>[0]),
		caption: () =>
			getEchsIconSpot() === "off"
				? "You see no spiral over anyone. Others still see yours, if the box above is ticked."
				: "A spiral over each player who runs ECHS. If another add-on's icon covers it, move it here.",
		lockable: false,
	},
	{
		// The floating ECHS window in chat rooms (job4.md). On by default.
		id: "HypnosisAddonPopupEnabled",
		label: "ECHS popup in rooms:",
		options: [{ key: "on", label: "On" }, { key: "off", label: "Off" }],
		get: () => (getPopupEnabled() ? "on" : "off"),
		set: (key) => setPopupEnabled(key === "on"),
		caption: () =>
			getPopupEnabled()
				? "A spiral button in chat rooms opens a window listing the commands. Drag either to move it."
				: "No spiral button in rooms. The /echs commands still work as typed.",
		lockable: false,
	},
];

// The hex box under it, only while the colour is Custom (DW, 2026-11-05). Saves as the Depth boxes
// do, when it loses focus or on Enter, and refuses out loud rather than quietly keeping the old colour.
const PULSE_HEX_ID = "HypnosisAddonPulseHex";
const PULSE_HEX_LABEL_WIDTH = 200;
const PULSE_HEX_WIDTH = 220;
const PULSE_SWATCH_SIZE = 50;
/** Why the last code typed was refused, or empty. */
let pulseHexError = "";

function removePulseHexInput(): void {
	if (document.getElementById(PULSE_HEX_ID)) ElementRemove(PULSE_HEX_ID);
}

function pulseControlsHeight(): number {
	return dropdownSlot() * (getPulseColor() === "custom" ? 2 : 1);
}

function drawPulseControls(top: number, width: number): void {
	const locked = settingsLocked();
	drawDropdownRow(PULSE_COLOR_DROPDOWN, top, width, locked);
	if (getPulseColor() !== "custom") {
		removePulseHexInput();
		return;
	}
	const at = top + dropdownSlot();
	const inputLeft = BOX_LEFT + PULSE_HEX_LABEL_WIDTH + 20;
	drawLeftTextFit("Colour code:", BOX_LEFT, at + ATTEMPT_BUTTON_HEIGHT / 2, PULSE_HEX_LABEL_WIDTH, locked ? "Gray" : "Black");
	DrawRect(inputLeft + PULSE_HEX_WIDTH + 20, at + (ATTEMPT_BUTTON_HEIGHT - PULSE_SWATCH_SIZE) / 2, PULSE_SWATCH_SIZE, PULSE_SWATCH_SIZE, getPulseCustom());
	drawLeftTextWrap(
		pulseHexError || "For example #FF69B4. Saves when you click away or press Enter.",
		BOX_LEFT,
		at + ATTEMPT_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT / 2,
		width,
		ATTEMPT_CAPTION_HEIGHT,
		pulseHexError ? "#a00000" : locked ? "Gray" : "#555",
		CAPTION_SIZE,
		18,
	);
	// A DOM element, which the scroll area's clip cannot hide. As the toy mode dropdown.
	if (at < rowScroll.top || at + ATTEMPT_BUTTON_HEIGHT > rowScroll.top + rowScroll.height) {
		removePulseHexInput();
		return;
	}
	let element = document.getElementById(PULSE_HEX_ID) as HTMLInputElement | null;
	if (!element) {
		element = ElementCreateInput(PULSE_HEX_ID, "text", getPulseCustom(), 9);
		element.addEventListener("blur", function (this: HTMLInputElement) {
			// Again here, not only through `disabled`: a box focused before a lock began can blur after.
			if (settingsLocked()) return;
			const saved = setPulseCustom(this.value);
			pulseHexError = saved ? "" : `"${this.value.trim().slice(0, 12)}" is not a colour code, so your colour is unchanged. Try one like #FF69B4.`;
			if (saved) {
				this.value = saved;
				log(`pulse colour now ${saved}`);
			}
		});
		element.addEventListener("keydown", function (this: HTMLInputElement, event: KeyboardEvent) {
			if (event.key === "Enter") this.blur();
		});
	}
	// Not while she is typing in it, and not over a refused code she may want to correct.
	if (document.activeElement !== element && !pulseHexError) element.value = getPulseCustom();
	element.disabled = locked;
	ElementPosition(PULSE_HEX_ID, inputLeft + PULSE_HEX_WIDTH / 2, at + ATTEMPT_BUTTON_HEIGHT / 2, PULSE_HEX_WIDTH, ATTEMPT_BUTTON_HEIGHT);
}

// --- Inductions tab (v1.16.37, review F8): seven dropdowns -------------------------------------------
const CYCLE_GAP = 16;
const TOY_SCOPE_ID = "HypnosisAddonToyScope";

// Click-to-cycle buttons before, which only went forward (DW: dropdowns). Each says under it what the
// current choice MEANS, as the buttons did.
const INDUCTION_DROPDOWNS: DropdownRow[] = [
	{
		id: "HypnosisAddonAttempts",
		label: "Attempts before they must wait:",
		options: ATTEMPT_LIMITS.map((n) => ({ key: String(n), label: String(n) })),
		get: () => String(getMaxAttempts()),
		set: (key) => setMaxAttempts(Number(key)),
		// What the setting COSTS: a count on its own does not say what happens when it runs out.
		caption: () => "When they run out, they cannot try you again for ten minutes.",
	},
	{
		// v1.6.0 (DW, 2026-11-08). Before the answers, since they answer or skip part of it.
		id: "HypnosisAddonInductionTime",
		// Renamed v1.16.42 (review F11, DW): it starts after you answer, or after the minute to answer.
		label: "Time to go under (after you answer):",
		options: INDUCTION_TIMES.map((n) => ({ key: String(n), label: `${n} seconds` })),
		get: () => String(getInductionSeconds()),
		set: (key) => setInductionSeconds(Number(key)),
		caption: () =>
			getInductionSeconds() >= 60
				? "Starts once you answer: how long they have before it lands or misses. Toy mode waits it too."
				: "Shorter than the usual minute: less time for their roleplay to count. Toy mode waits it too.",
	},
	{
		id: "HypnosisAddonDefaultStance",
		label: "When someone tries to hypnotize me:",
		options: DEFAULT_STANCES,
		get: getDefaultStance,
		set: (key) => setDefaultStance(key as Parameters<typeof setDefaultStance>[0]),
		caption: () =>
			getDefaultStance() === "prompt"
				? "You choose Agree, Ignore or Fight each time."
				: `No box: you ${getDefaultStance() === "agree" ? "go along with it" : getDefaultStance() === "fight" ? "fight it" : "neither help nor resist"}. They are not told which.`,
	},
	{
		id: "HypnosisAddonAwayStance",
		label: "When I'm away:",
		options: AWAY_STANCES,
		get: getAwayStance,
		set: (key) => setAwayStance(key as Parameters<typeof setAwayStance>[0]),
		caption: () =>
			getAwayStance() === "refuse"
				? "After 10 minutes with no input, the answer above and toy mode turn them away."
				: getAwayStance() === "ignore"
					? "After 10 minutes with no input, you are treated as Ignore, and toy mode is off."
					: "Being away changes nothing: the answer above and toy mode still apply.",
	},
	{
		id: "HypnosisAddonToyMode",
		label: "Toy mode:",
		options: [{ key: "off", label: "Off" }, { key: "on", label: "On" }],
		get: () => (getToyMode() ? "on" : "off"),
		set: (key) => setToyMode(key === "on"),
		caption: () =>
			getToyMode()
				? "No roll: when your time to go under is up, you go under to your \"sink deeper\" limit, triggers too."
				: "Every induction rolls as usual.",
	},
	{
		// v0.97.3: the Triggers tab's choices (DW: "use the same format as the one used on the triggers tab").
		id: TOY_SCOPE_ID,
		label: "Toy mode is for:",
		options: TOY_SCOPES,
		get: getToyScope,
		set: (key) => setToyScope(key as Parameters<typeof setToyScope>[0]),
		caption: () =>
			getToyScope() === "everyone" || getToyScope() === "notblack"
				? "Anyone in the room, strangers too. Read from your BC relationships and lists."
				: "Read from your BC relationships and lists, the same as for triggers.",
	},
	{
		// Moved from the Depth tab (job3.md).
		id: "HypnosisAddonDeepest",
		label: '"Sink deeper" stops at:',
		options: DEEPEST_TIERS,
		get: getDeepestTier,
		set: (key) => setDeepestTier(key as Parameters<typeof setDeepestTier>[0]),
		caption: () =>
			getDeepestTier() === "never"
				? "A hypnotist cannot talk you deeper once you are under."
				: "How far a hypnotist can talk you down mid-trance. Toy mode puts you straight here.",
	},
];

// --- Triggers tab (v1.16.37, review F8): its choices, all dropdowns, scrolling with the tick boxes -----
// Drop triggers: Off / One time / Unlimited (v0.90.0, design.md "Trigger Overhaul", decision 10).
function dropCaption(): string {
	const mode = getDropMode();
	if (mode === "off") return "A trigger cannot drop you straight into trance.";
	if (mode === "once") return "A trigger may drop you into trance once, then it is gone.";
	return "A trigger may drop you into trance each time, until it fades — if its hypnotist asked.";
}

const SCOPE_ID = "HypnosisAddonTriggerScope";
const LIFESPAN_ID = "HypnosisAddonTriggerLifespan";
const TRIGGER_DECAY_ID = "HypnosisAddonTriggerDecay";
const DURATION_ID = "HypnosisAddonTriggerDuration";
const DURATION_WIDTH = 160;

/** In screen order; the minutes box (drawDurationControl) goes between the second and third. */
const TRIGGER_DROPDOWNS: DropdownRow[] = [
	{
		id: SCOPE_ID,
		label: "Who else can fire your triggers:",
		options: TRIGGER_SCOPES,
		get: getTriggerScope,
		set: (key) => setTriggerScope(key as TriggerScope),
		caption: () => "Whoever planted a trigger can always fire it. This is who else can.",
	},
	{
		// Applies at planting: a hypnotist asking for longer is clamped to it and told so.
		id: LIFESPAN_ID,
		label: "Longest a new trigger lasts:",
		options: TRIGGER_LIFESPANS.map((l) => ({ key: String(l.minutes), label: l.label })),
		get: () => String(getTriggerLifespan()),
		set: (key) => setTriggerLifespan(Number(key)),
		caption: () => "Someone asking for longer gets this. Lowering it doesn't shorten triggers already planted.",
	},
	{
		// Its own setting, apart from trust fading on Stats: trust is what someone built with you, a
		// trigger is a thing they left inside you.
		id: TRIGGER_DECAY_ID,
		label: "Triggers fade without reinforcement:",
		options: DECAY_RATES,
		get: getTriggerDecayRate,
		set: (key) => setTriggerDecayRate(key as DecayRate),
		// What the setting COSTS: before v0.62.0 "Very fast" meant three weeks.
		caption: () => decayLifetimeText(),
	},
	{
		id: "HypnosisAddonDropMode",
		label: "Drop triggers:",
		options: DROP_MODES,
		get: getDropMode,
		set: (key) => setDropMode(key as DropMode),
		caption: dropCaption,
	},
	{
		// How much of her own triggers she sees (v1.16.30, DW). Under the lock it is read-only like the rest.
		id: "HypnosisAddonTriggerView",
		label: "My triggers list:",
		options: TRIGGER_VIEWS,
		get: getTriggerView,
		set: (key) => setTriggerView(key as TriggerView),
		caption: () =>
			getTriggerView() === "full"
				? "Lists show who planted each trigger, what sets it off and what it does."
				: getTriggerView() === "who"
					? "Lists show only who planted each and how strong it is. Details shows the rest."
					: "Only how many. No Planted tab and no details. The safeword still clears everything.",
	},
];

/** How long a fired trigger holds before letting go by itself. A number box rather than a dropdown,
 * so any value can be typed; BC's own blur handler clamps it to min/max. Laid out as a dropdown row. */
function drawDurationControl(top: number, width: number): void {
	const locked = settingsLocked();
	drawLeftTextFit("Minutes a fired trigger lasts:", BOX_LEFT, top + ATTEMPT_BUTTON_HEIGHT / 2, DROPDOWN_LABEL_WIDTH, locked ? "Gray" : "Black", DROPDOWN_LABEL_SIZE);
	drawLeftTextWrap(
		"0 keeps it until it is released, or until the safeword. Up to 1440 (a day).",
		BOX_LEFT,
		top + ATTEMPT_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT / 2,
		width,
		ATTEMPT_CAPTION_HEIGHT,
		locked ? "Gray" : "#555",
		CAPTION_SIZE,
		18,
	);
	// A DOM element, which the scroll area's clip cannot hide: only while wholly in view.
	if (top < rowScroll.top || top + ATTEMPT_BUTTON_HEIGHT > rowScroll.top + rowScroll.height) {
		if (document.getElementById(DURATION_ID)) ElementRemove(DURATION_ID);
		return;
	}
	let element = document.getElementById(DURATION_ID) as HTMLInputElement | null;
	if (!element) {
		element = ElementCreateInput(DURATION_ID, "number", String(getTriggerDuration()), 4);
		element.min = "0";
		element.max = "1440";
		element.inputMode = "numeric";
		// Commit on blur, not on every keystroke — otherwise typing "15" saves 1 on the way
		// to 15. ElementNumberInputBlur clamps to min/max first.
		element.addEventListener("blur", function (this: HTMLInputElement, event: Event) {
			ElementNumberInputBlur.call(this, event);
			if (settingsLocked()) return;
			const saved = setTriggerDuration(Number(this.value));
			this.value = String(saved);
			log(`trigger duration set to ${saved} min`);
		});
		// No wheel listener of our own: ElementCreateInput (R132) already adds BC's, and a second
		// one stepped two at a time.
	}
	if (document.activeElement !== element) element.value = element.defaultValue = String(getTriggerDuration());
	element.disabled = locked;
	const left = BOX_LEFT + DROPDOWN_LABEL_WIDTH + 20;
	ElementPosition(DURATION_ID, left + DURATION_WIDTH / 2, top + ATTEMPT_BUTTON_HEIGHT / 2, DURATION_WIDTH, ATTEMPT_BUTTON_HEIGHT);
}

// --- Depth tab ------------------------------------------------------------------------
// Each gate is a number 0-99 since v0.98.0 (job.md): a typed box between -5 and +5 steps, with the
// tier it falls in beside it. v1.16.37 (review F8): one scrolling page, not Prev/Next pages; the
// rows, then where you are now with Reset, then two dropdowns (what may push you deeper, and a
// hypnotist's skill). The boxes and dropdowns are DOM, so each exists only while its row is wholly
// in view, and goes off the tab with the rest (tabDomIds).
const DEPTH_ROW_HEIGHT = 56;
/** Where a row's controls start: -5, the number box, +5, then the tier name. */
const DEPTH_CTRL_LEFT = BOX_LEFT + 520;
/** Room for the gate name before it reaches the -5 button. Fitted, so a long name shrinks. */
const DEPTH_LABEL_MAX = 520 - 30;
const DEPTH_STEP_WIDTH = 64;
const DEPTH_STEP = 5;
const DEPTH_INPUT_LEFT = DEPTH_CTRL_LEFT + DEPTH_STEP_WIDTH + 8;
const DEPTH_INPUT_WIDTH = 96;
const DEPTH_PLUS_LEFT = DEPTH_INPUT_LEFT + DEPTH_INPUT_WIDTH + 8;
const DEPTH_TIER_TEXT_LEFT = DEPTH_PLUS_LEFT + DEPTH_STEP_WIDTH + 14;
const DEPTH_TIER_TEXT_MAX = 150;
const DEPTH_BUTTON_HEIGHT = 44;
/** The per-row "may arousal reach this" dropdown, on the earned-only rows only. */
const CHEM_LEFT = BOX_LEFT + 940;
const CHEM_WIDTH = 230;
const CHEM_PREFIX = "HypnosisAddonChem-";
const DEPTH_INPUT_PREFIX = "HypnosisAddonDepth-";
const DEPTH_INPUT_IDS = DEPTH_GATES.map((g) => DEPTH_INPUT_PREFIX + g.key);
/** The band under the rows: where you are now, and Reset to defaults. */
const DEPTH_SUMMARY_GAP = 16;
const DEPTH_SUMMARY_HEIGHT = 70;
const DEFAULTS_BUTTON_WIDTH = 240;

/** What may push you deeper besides trust, and how much a hypnotist's own practice counts. */
const DEPTH_DROPDOWNS: DropdownRow[] = [
	{
		id: "HypnosisAddonChemicalScope",
		label: "Chemicals count:",
		options: CHEMICAL_SCOPES,
		get: getChemicalScope,
		set: (key) => setChemicalScope(key as ChemicalScope),
		caption: () => "What may push you deeper besides trust. Never the rows above marked earned only.",
	},
	{
		id: "HypnosisAddonSkillHonour",
		label: "A hypnotist's skill:",
		options: SKILL_HONOUR_OFFERED,
		get: getSkillHonour,
		set: (key) => setSkillHonour(key as Parameters<typeof setSkillHonour>[0]),
		caption: () => "How much their own practice helps them put you under. Never past the earned-only rows.",
	},
];

/** The earned-only rows' "may arousal reach it" choice, as dropdowns. Carry-forward is shown, but
 * cannot be opened: it has no decay clock yet to price the shortcut with. */
function chemDropdowns(): DropdownRow[] {
	return DEPTH_GATES.filter((g) => g.earnedOnly).map((g) => ({
		id: CHEM_PREFIX + g.key,
		label: "",
		options: [{ key: "earned", label: "Earned only" }, { key: "arousal", label: "Arousal ok" }],
		get: () => (isChemicalToggleable(g.key) && getChemicalReach(g.key) ? "arousal" : "earned"),
		set: (key) => {
			if (!isChemicalToggleable(g.key)) return;
			const now = key === "arousal";
			if (now === getChemicalReach(g.key)) return;
			setChemicalReach(g.key, now);
			notifyLocal(now ? `${g.label}: arousal may reach this now — anything seeded this way fades fast.` : `${g.label}: back to trust only.`);
		},
		caption: () => "",
	}));
}

function depthRowsHeight(): number {
	return DEPTH_GATES.length * DEPTH_ROW_HEIGHT;
}

function depthHeight(): number {
	return depthRowsHeight() + DEPTH_SUMMARY_GAP + DEPTH_SUMMARY_HEIGHT + DEPTH_DROPDOWNS.length * dropdownSlot();
}

/** Is this band wholly inside the scroll area? A DOM control is shown only then. */
function wholeInView(top: number, height: number): boolean {
	return top >= rowScroll.top && top + height <= rowScroll.top + rowScroll.height;
}

function drawDepthGates(top0: number, width: number): void {
	const locked = settingsLocked();
	const features = getFeatures();
	const tip = (text: string) => (mouseInScroll(rowScroll) ? text : "");
	const chems = new Map(chemDropdowns().map((d) => [d.id, d]));
	DEPTH_GATES.forEach((gate, i) => {
		const top = top0 + i * DEPTH_ROW_HEIGHT;
		// A feature whose permission is off can never happen whatever the tier says, and
		// showing that plainly stops the tier reading as the only thing standing in the way.
		const granted = !!features[gate.key];
		drawLeftTextFit(gate.label, BOX_LEFT, top + DEPTH_BUTTON_HEIGHT / 2, DEPTH_LABEL_MAX, granted ? "Black" : "Gray", DROPDOWN_LABEL_SIZE);
		const need = requiredDepth(gate.key);
		const stepColor = locked ? "#ddd" : granted ? "White" : "#eee";
		tipButton(DEPTH_CTRL_LEFT, top, DEPTH_STEP_WIDTH, DEPTH_BUTTON_HEIGHT, `-${DEPTH_STEP}`, stepColor, "", "", locked || need <= 0);
		const id = DEPTH_INPUT_PREFIX + gate.key;
		if (wholeInView(top, DEPTH_BUTTON_HEIGHT)) drawDepthInput(gate.key, top, need, locked);
		else if (document.getElementById(id)) ElementRemove(id);
		tipButton(DEPTH_PLUS_LEFT, top, DEPTH_STEP_WIDTH, DEPTH_BUTTON_HEIGHT, `+${DEPTH_STEP}`, stepColor, "", "", locked || need >= MAX_GATE_DEPTH);
		drawLeftTextFit(`[${tierLabel(tierOf(need))}]`, DEPTH_TIER_TEXT_LEFT, top + DEPTH_BUTTON_HEIGHT / 2, DEPTH_TIER_TEXT_MAX, granted ? "Black" : "Gray", DROPDOWN_LABEL_SIZE);
		const chem = chems.get(CHEM_PREFIX + gate.key);
		if (chem) drawChemDropdown(chem, top, locked || !isChemicalToggleable(gate.key));
	});

	// Where they are RIGHT NOW, so the numbers above mean something, beside Reset.
	const summary = top0 + depthRowsHeight() + DEPTH_SUMMARY_GAP;
	tipButton(BOX_LEFT, summary, DEFAULTS_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT, "Reset to defaults", locked ? "#ddd" : "White", "", tip("Forget every depth you have changed"), locked);
	const here = isHypnotized() ? `You are ${depthLabel(Math.floor(currentDepth()))} right now.` : "You are not under.";
	drawLeftTextFit(here, BOX_LEFT + DEFAULTS_BUTTON_WIDTH + 40, summary + DEPTH_BUTTON_HEIGHT / 2, width - DEFAULTS_BUTTON_WIDTH - 40, "Gray", DROPDOWN_LABEL_SIZE);
	drawDropdowns(DEPTH_DROPDOWNS, summary + DEPTH_SUMMARY_HEIGHT, width);
}

/** One earned-only row's dropdown, right of its tier, only while wholly in view. */
function drawChemDropdown(row: DropdownRow, top: number, locked: boolean): void {
	let element = document.getElementById(row.id) as HTMLSelectElement | null;
	if (!wholeInView(top, DEPTH_BUTTON_HEIGHT)) {
		if (element) ElementRemove(row.id);
		return;
	}
	if (!element) {
		element = ElementCreateDropdown(
			row.id,
			row.options.map((o) => o.label),
			function () {
				if (settingsLocked()) return;
				const picked = row.options[this.selectedIndex];
				if (picked) row.set(picked.key);
			},
		);
	}
	const index = row.options.findIndex((o) => o.key === row.get());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	ElementPosition(row.id, CHEM_LEFT + CHEM_WIDTH / 2, top + DEPTH_BUTTON_HEIGHT / 2, CHEM_WIDTH, DEPTH_BUTTON_HEIGHT);
}

/** One row's number box. Commits on blur or Enter, not per keystroke, so typing "45" never saves
 * 4 on the way — the trigger-duration box's rule. Re-synced from storage whenever it is not being
 * typed in, because a step button, an import or a reset changes the number underneath it. */
function drawDepthInput(key: keyof FeatureToggles, top: number, need: number, locked: boolean): void {
	const id = DEPTH_INPUT_PREFIX + key;
	let element = document.getElementById(id) as HTMLInputElement | null;
	if (!element) {
		element = ElementCreateInput(id, "number", String(need), 2);
		element.min = "0";
		element.max = String(MAX_GATE_DEPTH);
		element.inputMode = "numeric";
		element.addEventListener("blur", function (this: HTMLInputElement, event: Event) {
			// The lock is checked again here, not only through `disabled`: a box focused before the
			// session started can still blur after it has.
			if (settingsLocked()) return;
			ElementNumberInputBlur.call(this, event);
			const saved = setDepthOverride(key, Number(this.value));
			this.value = String(saved);
			log(`${key} now needs ${saved}`);
		});
		element.addEventListener("keydown", function (this: HTMLInputElement, event: KeyboardEvent) {
			if (event.key === "Enter") this.blur();
		});
		// No wheel listener of our own: ElementCreateInput (R132) already adds BC's to every number
		// box, and a second one stepped two at a time.
	}
	// defaultValue too: BC's blur handler puts defaultValue back when the box is left empty, and
	// without this it would restore the number the box was CREATED with, not the one saved since.
	if (document.activeElement !== element) element.value = element.defaultValue = String(need);
	element.disabled = locked;
	ElementPosition(id, DEPTH_INPUT_LEFT + DEPTH_INPUT_WIDTH / 2, top + DEPTH_BUTTON_HEIGHT / 2, DEPTH_INPUT_WIDTH, DEPTH_BUTTON_HEIGHT);
}

/** Take away every depth number box. */
function removeDepthInputs(): void {
	for (const id of DEPTH_INPUT_IDS) if (document.getElementById(id)) ElementRemove(id);
}

/** A click inside the Depth list (the scroll area already checked the pointer is in view). */
function clickDepthGates(top0: number): boolean {
	const summary = top0 + depthRowsHeight() + DEPTH_SUMMARY_GAP;
	const onReset = MouseIn(BOX_LEFT, summary, DEFAULTS_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT);
	for (let i = 0; i < DEPTH_GATES.length; i++) {
		const top = top0 + i * DEPTH_ROW_HEIGHT;
		const step = MouseIn(DEPTH_CTRL_LEFT, top, DEPTH_STEP_WIDTH, DEPTH_BUTTON_HEIGHT)
			? -DEPTH_STEP
			: MouseIn(DEPTH_PLUS_LEFT, top, DEPTH_STEP_WIDTH, DEPTH_BUTTON_HEIGHT)
				? DEPTH_STEP
				: 0;
		if (!step) continue;
		// Consumed either way: a locked screen cannot be edited by touch.
		if (settingsLocked()) return true;
		const gate = DEPTH_GATES[i];
		const saved = setDepthOverride(gate.key, requiredDepth(gate.key) + step);
		log(`${gate.key} now needs ${saved}`);
		return true;
	}
	if (onReset) {
		if (settingsLocked()) return true;
		clearDepthOverrides();
		notifyLocal("Depth requirements reset to their defaults.");
		return true;
	}
	return false;
}

function notifyLocal(message: string): void {
	log(message);
	tellPlayer(message);
}

/** What a refused import says, from the Data tab button and `/echs import` alike, so the two
 * cannot drift apart. Import is the one data action the settings lock covers: it replaces every
 * toggle in one go without ending anything, so an open Import made the lock decorative — paste a
 * blob and every permission the lock was holding still is rewritten mid-session. Export only
 * reads. Reset stays open on purpose: it ends the session before it wipes (Known Bug #4), so it
 * is a way out, not a way round. */
export const IMPORT_LOCKED_MESSAGE = "Import refused: your settings are locked until this session ends.";

/** Exported for test/import-lock.mjs, which cannot reach the canvas click handler. */
export function clickDataButton(index: number): void {
	const name = DATA_BUTTONS[index];
	if (name === "Export") {
		const blob = exportSettings();
		// Clipboard first — a 470-character blob is miserable to select out of the chat
		// log. Falls back to printing it, since clipboard access can be refused.
		navigator.clipboard?.writeText(blob).then(
			() => notifyLocal("Settings copied to clipboard. Keep it somewhere safe."),
			() => {
				notifyLocal("Could not reach the clipboard — copy the line below instead:");
				notifyLocal(blob);
			},
		);
		return;
	}
	if (name === "Import") {
		// Refused before the clipboard is read, so a locked click does not raise the browser's
		// clipboard prompt for nothing, and said out loud because the button being grey is easy
		// to miss (rule 5).
		if (settingsLocked()) {
			notifyLocal(extremeLocked() ? extremeRefusal() : IMPORT_LOCKED_MESSAGE);
			return;
		}
		navigator.clipboard?.readText().then(
			(text) => {
				// Again here: the clipboard read is async, and a session can start while the
				// browser is still asking.
				if (settingsLocked()) {
					notifyLocal(extremeLocked() ? extremeRefusal() : IMPORT_LOCKED_MESSAGE);
					return;
				}
				const result = importSettings(text);
				notifyLocal(result.ok ? `Imported: ${result.message}` : `Import failed: ${result.message}`);
			},
			() => notifyLocal("Could not read the clipboard — use /echs import <blob> instead."),
		);
		return;
	}
	if (Date.now() > resetArmedUntil) {
		resetArmedUntil = Date.now() + RESET_ARM_MS;
		notifyLocal("Click Reset again within 5 seconds to erase all trust, experience and settings.");
		return;
	}
	resetArmedUntil = 0;
	notifyLocal(resetSettings());
}

/** "Your data": a heading, the three buttons, and what they do. Scrolls with the General tab. */
const DATA_HEADING_HEIGHT = 44;
function dataBlockHeight(): number {
	return DATA_HEADING_HEIGHT + DATA_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT + 10;
}

function drawDataBlock(top: number, width: number): void {
	drawLeftTextFit("Your data:", BOX_LEFT, top + DATA_HEADING_HEIGHT / 2, DROPDOWN_LABEL_WIDTH, "Black", DROPDOWN_LABEL_SIZE);
	drawDataButtons(top + DATA_HEADING_HEIGHT);
	drawLeftTextWrap(
		"Export copies your settings to the clipboard; Import puts them back. Reset erases everything.",
		BOX_LEFT,
		top + DATA_HEADING_HEIGHT + DATA_BUTTON_HEIGHT + ATTEMPT_CAPTION_GAP + ATTEMPT_CAPTION_HEIGHT / 2,
		width,
		ATTEMPT_CAPTION_HEIGHT,
		"#555",
		CAPTION_SIZE,
		18,
	);
}

/** A click on one of the three. Not under the settings lock: Export and Reset stay live (Reset is a
 * documented way out of the Extreme lock); Import refuses itself, out loud. */
function clickDataBlock(top: number): boolean {
	for (let i = 0; i < DATA_BUTTONS.length; i++) {
		if (MouseIn(dataButtonLeft(i), top + DATA_HEADING_HEIGHT, DATA_BUTTON_WIDTH, DATA_BUTTON_HEIGHT)) {
			clickDataButton(i);
			return true;
		}
	}
	return false;
}

function drawDataButtons(top: number): void {
	const armed = Date.now() < resetArmedUntil;
	// Only Import greys out under the lock — see IMPORT_LOCKED_MESSAGE for why the other two
	// stay live.
	const importLocked = settingsLocked();
	DATA_BUTTONS.forEach((name, i) => {
		const isReset = name === "Reset";
		const locked = name === "Import" && importLocked;
		tipButton(
			dataButtonLeft(i),
			top,
			DATA_BUTTON_WIDTH,
			DATA_BUTTON_HEIGHT,
			isReset && armed ? "Confirm?" : name,
			isReset ? (armed ? "#ffb3b3" : "#ffe0e0") : locked ? "#ddd" : "White",
			"",
			!mouseInScroll(rowScroll) ? "" : isReset ? "Erases everything — asks once first" : locked ? lockedTip() : `${name} via clipboard`,
			locked,
		);
	});
}

const DECAY_ID = "HypnosisAddonDecayRate";
const DECAY_HEIGHT = 44;


/** The DOM controls each tab owns (v1.16.37: one list, read from the tabs' own dropdowns). */
function tabDomIds(tabName: string): string[] {
	switch (tabName) {
		case "Inductions":
			return INDUCTION_DROPDOWNS.map((d) => d.id);
		case "Trance Defaults":
			return [...TRANCE_DROPDOWNS.map((d) => d.id), PULSE_COLOR_ID, PULSE_HEX_ID];
		case "Triggers":
			return [...TRIGGER_DROPDOWNS.map((d) => d.id), DURATION_ID];
		case "General":
			return GENERAL_DROPDOWNS.map((d) => d.id);
		case "Stats":
			return [DECAY_ID, TRUST_SEARCH_ID];
		case "Depth":
			return [...DEPTH_INPUT_IDS, ...chemDropdowns().map((d) => d.id), ...DEPTH_DROPDOWNS.map((d) => d.id)];
		default:
			return [];
	}
}

/** Every DOM control this screen can own. */
function ownedControlIds(): string[] {
	return [...new Set(TABS.flatMap((t) => tabDomIds(t.name)))];
}

/** Remove every DOM control this screen owns. Called from all three exits. */
function removeScopeControl(): void {
	for (const id of ownedControlIds()) if (document.getElementById(id)) ElementRemove(id);
}

/** DOM controls are real elements over the canvas, so each one has to be taken away the moment its
 * own tab stops showing, or it floats on top of whatever is drawn next. */
function syncTabControls(tabName: string): void {
	const keep = new Set(tabDomIds(tabName));
	for (const id of ownedControlIds()) if (!keep.has(id) && document.getElementById(id)) ElementRemove(id);
}

/** How fast trust fades without contact.
 *
 * Named speeds rather than a number, per DW: the player picks "Slowly", so what that means
 * behind the scenes can be retuned without their saved choice changing meaning. Lives on
 * the Stats tab because that is where trust is already shown — it is the one control that
 * changes what those numbers do. */
function drawDecayControl(): void {
	const locked = settingsLocked();
	drawLeftTextFit("Trust fades when you don't see someone:", BOX_LEFT, STAT_DECAY_Y, DROPDOWN_LABEL_WIDTH, locked ? "Gray" : "Black", DROPDOWN_LABEL_SIZE);
	let element = document.getElementById(DECAY_ID) as HTMLSelectElement | null;
	if (!element) {
		element = ElementCreateDropdown(
			DECAY_ID,
			DECAY_RATES.map((r) => r.label),
			function () {
				setDecayRate(DECAY_RATES[this.selectedIndex]?.key ?? "never");
				log(`trust decay set to ${getDecayRate()}`);
			},
		);
	}
	const index = DECAY_RATES.findIndex((r) => r.key === getDecayRate());
	if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
	element.disabled = locked;
	ElementPosition(DECAY_ID, BOX_LEFT + DROPDOWN_LABEL_WIDTH + 20 + DROPDOWN_WIDTH / 2, STAT_DECAY_Y, DROPDOWN_WIDTH, DECAY_HEIGHT);
}

/** The trust list in the shared scroll area: from under the header to above trust fading. */
function layoutStats(count: number): void {
	rowScroll.top = STAT_LIST_TOP;
	rowScroll.height = STAT_LIST_BOTTOM - STAT_LIST_TOP;
	rowScroll.content = count * STAT_LINE_HEIGHT + 8;
	rowScroll.step = STAT_LINE_HEIGHT;
	clampScroll(rowScroll);
}

/** Screen centre of list row `slot`, scroll applied. */
function statRowY(slot: number): number {
	return scrollY(rowScroll, 4 + slot * STAT_LINE_HEIGHT + STAT_LINE_HEIGHT / 2);
}

function statForgetTop(slot: number): number {
	return statRowY(slot) - STAT_FORGET_HEIGHT / 2;
}

function statAccessLeft(index: number): number {
	return STAT_ACCESS_LEFT + index * (STAT_ACCESS_WIDTH + STAT_ACCESS_GAP);
}

/** A click on one of a row's level buttons. Normal and Toy at once; Blocked needs a second click
 * within 5 seconds. What she is told comes from access.ts changeAccess, as the command's does.
 * Exported for the suite. */
export function clickStatAccess(): boolean {
	if (!mouseInScroll(rowScroll)) return false;
	const rows = trustStatRows(trustSearch);
	layoutStats(rows.length);
	for (let i = 0; i < rows.length; i++) {
		const li = ACCESS_LEVELS.findIndex((_, j) => MouseIn(statAccessLeft(j), statForgetTop(i), STAT_ACCESS_WIDTH, STAT_FORGET_HEIGHT));
		if (li < 0) continue;
		if (settingsLocked()) return true;
		const row = rows[i];
		const level = ACCESS_LEVELS[li];
		if (level === "blocked" && accessLevelOf(row.memberId) !== "blocked" && !(statBlockArmed === row.memberId && Date.now() < statBlockArmedUntil)) {
			statBlockArmed = row.memberId;
			statBlockArmedUntil = Date.now() + CLEAR_ALL_ARM_MS;
			return true;
		}
		statBlockArmed = 0;
		notifyLocal(changeAccess(row.memberId, row.name.replace(/\s*\(#\d+\)$/, ""), level));
		return true;
	}
	return false;
}

/** A click on a row's [x], if that is where it landed: the first arms it, a second within 5 seconds
 * deletes. Two clicks because this cannot be undone, and the buttons sit one above the other. */
function clickStatForget(): boolean {
	// Only inside the list: a row scrolled out of view still has coordinates.
	if (!mouseInScroll(rowScroll)) return false;
	const rows = trustStatRows(trustSearch);
	layoutStats(rows.length);
	const slot = rows.findIndex((_, i) => MouseIn(STAT_FORGET_LEFT, statForgetTop(i), STAT_FORGET_WIDTH, STAT_FORGET_HEIGHT));
	if (slot < 0) return false;
	if (settingsLocked()) return true;
	const row = rows[slot];
	if (statForgetArmed === row.memberId && Date.now() < statForgetArmedUntil) {
		statForgetArmed = 0;
		forgetTrust(row.memberId);
		notifyLocal(`Forgot ${row.name}.`);
		return true;
	}
	statForgetArmed = row.memberId;
	statForgetArmedUntil = Date.now() + CLEAR_ALL_ARM_MS;
	return true;
}

function removeTrustSearch(): void {
	if (document.getElementById(TRUST_SEARCH_ID)) ElementRemove(TRUST_SEARCH_ID);
}

/** The search box: filters as it is typed, and works while the settings are locked, because finding
 * someone is reading, not editing. The same reasoning as paging. */
function drawTrustSearch(): void {
	drawLeftTextFit("Find:", TRUST_SEARCH_LABEL_X, STAT_HEADER_Y, TRUST_SEARCH_LEFT - TRUST_SEARCH_LABEL_X - 10, "Black");
	let element = document.getElementById(TRUST_SEARCH_ID) as HTMLInputElement | null;
	if (!element) {
		element = ElementCreateInput(TRUST_SEARCH_ID, "text", trustSearch, 40);
		element.placeholder = "Name or number";
		element.addEventListener("input", function (this: HTMLInputElement) {
			trustSearch = this.value;
			rowScroll.offset = 0;
			statForgetArmed = 0;
		});
	}
	ElementPosition(TRUST_SEARCH_ID, TRUST_SEARCH_LEFT + TRUST_SEARCH_WIDTH / 2, STAT_HEADER_Y, TRUST_SEARCH_WIDTH, TRUST_SEARCH_HEIGHT);
}

/** A list rather than a pick-one dropdown, deliberately: the ranking IS the information — who you
 * are closest to, and how far ahead of everyone else. Scrolls since v1.16.38 (DW); paged before. */
/** "3 Nov 2026", the same on every browser. */
export function usingSinceText(at: number): string {
	const d = new Date(at);
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function drawStats(): void {
	const line = (y: number, name: string, value: string, detail: string, color = "Black", detailMax = STAT_DETAIL_MAX) => {
		drawLeftTextFit(name, STAT_NAME_X, y, STAT_NAME_MAX, color);
		if (value) drawLeftText(value, STAT_VALUE_X, y, color);
		if (detail) drawLeftTextFit(detail, STAT_DETAIL_X, y, detailMax, "Gray");
	};

	drawDecayControl();
	// The Extreme lock hides the numbers (DW, 2026-11-05). Export and Reset, the documented way out,
	// are on the General tab since v1.16.38.
	if (extremeLocked()) {
		removeTrustSearch();
		drawLeftTextFit("Your Extreme lock hides these numbers until it ends.", STAT_NAME_X, STAT_FIRST_ROW_Y, PANEL_LEFT + PANEL_WIDTH - STAT_NAME_X - 40, "Gray");
		return;
	}
	// Since when she has used ECHS (v1.16.8): on the Experience row, so the trust list keeps its room.
	line(STAT_EXPERIENCE_Y, "Experience", experienceValue().toFixed(1), `${rawExperience().toFixed(2)} from inductions · using ECHS since ${usingSinceText(getUsingSince())}`, "Black", STAT_FORGET_LEFT + STAT_FORGET_WIDTH - STAT_DETAIL_X);
	// How many, in the header (v1.16.38): the list no longer says "page 1 / 3".
	const listed = trustStatRows(trustSearch).length;
	// No "value" / "detail" over an empty list (v1.16.41, review F11): headings for nothing.
	const anyone = trustStatRows().length > 0;
	line(STAT_HEADER_Y, anyone ? `Trust · ${listed} ${listed === 1 ? "person" : "people"}` : "Trust", "", "", "Gray");
	// The headings fitted to their columns (v1.17.0: the value column is narrower for the level buttons).
	if (anyone) {
		drawLeftTextFit("value", STAT_VALUE_X, STAT_HEADER_Y, STAT_DETAIL_X - STAT_VALUE_X - 8, "Gray");
		drawLeftTextFit("detail", STAT_DETAIL_X, STAT_HEADER_Y, STAT_DETAIL_MAX, "Gray");
	}

	// Nobody at all, and there is nothing to search. A search with no matches keeps its box.
	if (!trustStatRows().length) {
		removeTrustSearch();
		drawLeftText("Nobody yet — trust builds from conversation in the same room.", STAT_NAME_X, STAT_FIRST_ROW_Y, "Gray");
		return;
	}
	drawTrustSearch();
	const rows = trustStatRows(trustSearch);
	if (!rows.length) {
		drawLeftTextFit(`Nobody here matches "${trustSearch.trim()}".`, STAT_NAME_X, STAT_FIRST_ROW_Y, PANEL_LEFT + PANEL_WIDTH - STAT_NAME_X - 40, "Gray");
		return;
	}

	const locked = settingsLocked();
	layoutStats(rows.length);
	drawScrollArea(rowScroll, () => {
		rows.forEach((row, i) => {
			const y = statRowY(i);
			if (!scrollShows(rowScroll, y - STAT_LINE_HEIGHT / 2, STAT_LINE_HEIGHT)) return;
			line(y, row.name, row.trust, row.detail);
			const level = accessLevelOf(row.memberId);
			ACCESS_LEVELS.forEach((l, j) => {
				const blockArmed = l === "blocked" && statBlockArmed === row.memberId && Date.now() < statBlockArmedUntil;
				tipButton(
					statAccessLeft(j), statForgetTop(i), STAT_ACCESS_WIDTH, STAT_FORGET_HEIGHT,
					blockArmed ? "Sure?" : ACCESS_LABELS[l],
					locked ? "#ddd" : blockArmed ? "#ffb3b3" : level === l ? STAT_ACCESS_COLORS[l] : "White",
					"",
					!mouseInScroll(rowScroll)
						? ""
						: locked
							? lockedTip()
							: blockArmed
								? "Click again to block them. Anything they planted in you is forgotten."
								: `${ACCESS_LABELS[l]}${level === l ? " (now)" : ""}: they ${l === "normal" ? "get what your usual settings allow" : ACCESS_WORDS[l]}`,
					locked,
				);
			});
			const armed = statForgetArmed === row.memberId && Date.now() < statForgetArmedUntil;
			tipButton(
				STAT_FORGET_LEFT, statForgetTop(i), STAT_FORGET_WIDTH, STAT_FORGET_HEIGHT,
				armed ? "Sure?" : "[x]",
				locked ? "#ddd" : armed ? "#ffb3b3" : "White",
				"",
				!mouseInScroll(rowScroll) ? "" : locked ? lockedTip() : armed ? "Click again to delete this person's trust. It cannot be undone." : "Forget this person: deletes their trust",
				locked,
			);
		});
	});
	// The wheel scrolls it, as it does the other tabs' lists.
	rowsDrawnAt = Date.now();
}

// Same verified coordinate the remote subscreen uses — BC's own Information Sheet Back
// --- Checkbox rows: one column, scrolling ---------------------------------------------
// History: a tab past six rows used to split into two columns (when Permissions reached eight,
// the Lock row had been drawn below the panel with no sign anything was missing). Two columns
// then filled too, and at thirteen rows Self-Touch Control was drawn under the attempt button
// (v0.85.4). Since v0.86.0 every checkbox tab is one full-width column in a scroll area
// (panel.ts), so a list can grow without re-laying out the screen, and a label never has to
// squeeze into half the panel.
const ROWS_TOP = 270;
/** The tab's blurb: up to two lines, centred just above the rows. */
const BLURB_HEIGHT = 62;
/** A group heading's slot: shorter than a checkbox row. */
const HEADING_SPACING = 50;
/** The fixed rows' band above the list: one row of checkboxes, and a gap under it. */
const FIXED_BAND = 92;
/** Where the second fixed checkbox starts, so two fit side by side. */
const FIXED_COLUMN = 560;
/** How far a dependent row is indented under the row it needs. */
const INDENT = 60;
/** Space above the first row inside the area, so the first box does not touch its top. */
const ROWS_PAD = 10;
/** The area stops this far above the panel floor. */
const ROWS_FLOOR_GAP = 20;

/** One area, re-sized for whichever tab is showing. The offset is reset on every tab change
 * and every visit — a list that opens half-scrolled hides its first rows. */
const rowScroll: ScrollArea = {
	left: BOX_LEFT,
	top: ROWS_TOP,
	width: PANEL_LEFT + PANEL_WIDTH - 20 - BOX_LEFT,
	height: 0,
	content: 0,
	offset: 0,
	step: ROW_SPACING,
};

/** When the rows were last drawn. The wheel listener acts only while they are on screen: it
 * outlives the tab (and, if BC ever skips our unload, the screen), and a wheel turned over the
 * Depth tab or the help page must not scroll a list nobody can see. */
let rowsDrawnAt = 0;
const ROWS_ON_SCREEN_MS = 500;

function layoutRows(tab: Tab): void {
	rowScroll.step = ROW_SPACING;
	rowScroll.top = ROWS_TOP + (tab.fixedRows?.length ? FIXED_BAND : 0);
	rowScroll.height = (tab.rowsBottom ?? PANEL_TOP + PANEL_HEIGHT - ROWS_FLOOR_GAP) - rowScroll.top;
	rowScroll.content = ROWS_PAD + itemsHeight(tab.rows ?? [], (tab.rows ?? []).length) + (tab.scrollExtra?.height() ?? 0);
	clampScroll(rowScroll);
}

function itemsHeight(items: ListItem[], count: number): number {
	let h = 0;
	for (let i = 0; i < count; i++) h += isHeading(items[i]) ? HEADING_SPACING : ROW_SPACING;
	return h;
}

/** Screen y of the list's item `index` (a heading or a row), scroll applied. */
function rowTop(tab: Tab, index: number): number {
	return scrollY(rowScroll, ROWS_PAD + itemsHeight(tab.rows ?? [], index));
}

function scrollExtraTop(tab: Tab): number {
	return rowTop(tab, tab.rows?.length ?? 0);
}

/** The fixed rows' checkbox left edges. */
function fixedLeft(i: number): number {
	return BOX_LEFT + i * FIXED_COLUMN;
}

function onSettingsWheel(event: WheelEvent): void {
	if (Date.now() - rowsDrawnAt > ROWS_ON_SCREEN_MS) return;
	if (!scrollNeeded(rowScroll) || !mouseInScroll(rowScroll) || !event.deltaY) return;
	// One row per notch, whatever the device reports: a trackpad sends many small deltas and a
	// mouse a few large ones, and pixel-exact scrolling would leave rows cut in half.
	scrollBy(rowScroll, Math.sign(event.deltaY) * rowScroll.step);
}

/** BC's extension-settings hooks do not forward the wheel (R132 Extensions.js has no wheel
 * member), so the screen listens on the canvas itself, from load to exit/unload. The arrows
 * work without it; a failure to attach is said, not swallowed. */
function attachWheel(): void {
	try {
		MainCanvas.canvas.addEventListener("wheel", onSettingsWheel);
	} catch (e) {
		warn("settings: could not listen for the mouse wheel; use the scroll arrows", e);
	}
}

function detachWheel(): void {
	try {
		MainCanvas.canvas.removeEventListener("wheel", onSettingsWheel);
	} catch {
		// Nothing was attached.
	}
}

/** Are the checkboxes currently frozen? Read live at draw and click time rather than
 * cached, so the lock lifts the instant a session ends without anything having to notice.
 *
 * From the whole SESSION, not just the trance — v0.65.1, DW's call. It used to read
 * `isHypnotized()`, which left the induction itself unlocked: someone could be three
 * questions into an attempt on you and you could still edit the permissions they were about
 * to reach, or move your own attempt limit up to give them another try. The label says "while
 * in trance" and the blurb has always said "until the session ends"; the second one was the
 * honest description and this makes it true. The cooldown after a spent attempt run is not
 * live — see isSessionLive.
 *
 * Tabs stay clickable and the exit button still works — the screen is readable while
 * locked, just not editable. `/echs safeword` remains the way out in every case, and
 * being a chat command it's untouched by any of this. */
const LOCK_BANNER_BACK = "#ffe3a3";
const LOCK_BANNER_TEXT = "#5c3d00";

export function settingsLocked(): boolean {
	return ownLocked() || keyLocked();
}

/** Her own locks: a session on her (if she asked for that) and Extreme. Unlike the keyholder lock,
 * these also hold her keyholder list (v1.16.2: under the keyholder lock she still manages it, except
 * that whoever locked it keeps full keys). */
export function ownLocked(): boolean {
	return (getFeatures().lockedWhileHypnotized && isSessionLive()) || extremeLocked();
}

/** May she not click this top-of-tab box to `next`? Locked as the rest of the screen is, except that
 * switching ECHS off always works under the keyholder lock (job6.md §5). */
export function fixedRowLocked(key: keyof FeatureToggles, next: boolean): boolean {
	if (!settingsLocked()) return false;
	return !(key === "hypnoEnabled" && !next && !ownLocked());
}

/** The hover text on a locked control: which lock, and until when. */
function lockedTip(): string {
	return extremeLocked() ? extremeRefusal() : keyLocked() ? keyLockRefusal() : "Locked until this session ends";
}

// --- The Extreme renewal prompt (v0.99.0, job2.md §4B) -------------------------------------------
// When a lock period has run out, opening the settings shows this instead of the tabs. The settings
// stay read-only until one of the two is chosen; leaving with the exit icon just asks again next time.
const RENEW_LEFT = PANEL_LEFT + 120;
const RENEW_TOP = PANEL_TOP + 360;
const RENEW_WIDTH = 520;
const RENEW_HEIGHT = 80;
const RENEW_GAP = 60;

function drawRenewalPrompt(): void {
	const p = renewalPrompt();
	if (!p) return;
	DrawText(`Erotic Chat Hypnosis Suite (ECHS) v${__VERSION__}${RELEASE_SUFFIX} — Extreme`, MainCanvasWidth / 2, TITLE_Y, "Black");
	tipButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Decide later (your settings stay read-only)");
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	DrawEmptyRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "Black", 3);
	drawLeftTextWrap(p.title, PANEL_LEFT + 60, PANEL_TOP + 120, PANEL_WIDTH - 120, 120, "Black");
	drawLeftTextWrap(
		"Either way, nothing in your settings changes now. Renewing keeps them read-only; unlocking makes them editable again.",
		PANEL_LEFT + 60, PANEL_TOP + 250, PANEL_WIDTH - 120, 90, "#555",
	);
	DrawButton(RENEW_LEFT, RENEW_TOP, RENEW_WIDTH, RENEW_HEIGHT, p.unlock, "White", "", "");
	DrawButton(RENEW_LEFT + RENEW_WIDTH + RENEW_GAP, RENEW_TOP, RENEW_WIDTH, RENEW_HEIGHT, p.renew, "#ffe0e0", "", "");
}

/** Exported for the suite. `renew` true is the right-hand button. */
export function clickRenewal(renew: boolean): string {
	const said = answerRenewal(renew);
	notifyLocal(said);
	return said;
}

function clickRenewalPrompt(): void {
	if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
		PreferenceSubscreenExtensionsClear();
	} else if (MouseIn(RENEW_LEFT, RENEW_TOP, RENEW_WIDTH, RENEW_HEIGHT)) {
		clickRenewal(false);
	} else if (MouseIn(RENEW_LEFT + RENEW_WIDTH + RENEW_GAP, RENEW_TOP, RENEW_WIDTH, RENEW_HEIGHT)) {
		clickRenewal(true);
	}
}

/** The Identifier this add-on registers under, used both to register the settings screen
 * below and to find it again when a chat command jumps straight to the help. */
const EXTENSION_ID = "HypnosisAddon";

/** The label on our entry in the Preferences > Extensions list.
 *
 * Deliberately the abbreviation and not the full name: BC draws this into a fixed-width list
 * button, the text it replaced was 15 characters, and "Erotic Chat Hypnosis Suite" is 26 — the
 * screen titles carry the full name where there is room for it.
 *
 * Exported because commands.ts spells out the manual path to this same entry for anyone whose
 * `/echs help` jump cannot run. That string is BUILT from this one rather than repeating it:
 * renaming one and not the other would send the player looking for a label that is not there,
 * and nothing at runtime would notice. */
export const EXTENSION_BUTTON_TEXT = "ECHS Hypnosis";

/** Open Preferences > Extensions > ECHS Hypnosis with the on-screen guide already showing —
 * the target of `/echs help`, so the full illustrated guide is one line away from chat.
 *
 * This does exactly what clicking our entry in the Extensions list does (verified against
 * R131): PreferenceOpenSubscreen switches to Preferences and builds the list from any screen,
 * then we enter our own entry — set it current, hide BC's list DOM, run its load — and open
 * help on top. load() closes help as part of its reset, so openHelp() comes last.
 *
 * Every BC global it touches is typeof-guarded: if a future release renames one, this returns
 * false rather than throwing, and the caller points the user at the manual path instead. */
export async function openHelpScreen(): Promise<boolean> {
	return enterSettings(true);
}

/** Open Preferences > Extensions > ECHS Hypnosis on its first tab, no guide: the ECHS popup's gear
 * (v1.13.4, DW). The same entry as `/echs help`, checked again against R134 (Preference.js
 * PreferenceOpenSubscreen, Extensions.js's list click). Leaving it is the game's own way back. */
export async function openSettingsScreen(): Promise<boolean> {
	return enterSettings(false);
}

async function enterSettings(withHelp: boolean): Promise<boolean> {
	try {
		if (typeof PreferenceOpenSubscreen !== "function" || typeof PreferenceExtensionsSettings === "undefined") {
			return false;
		}
		await PreferenceOpenSubscreen("Extensions");
		const screen = PreferenceExtensionsSettings[EXTENSION_ID];
		if (!screen) return false;
		PreferenceExtensionsCurrent = screen;
		// Mirror the list-entry click: hide BC's own Extensions list DOM so it does not float
		// over our canvas help. Best-effort — the guide still draws if these globals moved.
		if (typeof ElementWrap === "function" && typeof PreferenceIDs !== "undefined") {
			ElementWrap(PreferenceIDs.subscreen)?.toggleAttribute("hidden", true);
		}
		screen.load?.();
		if (withHelp) openHelp();
		return true;
	} catch {
		return false;
	}
}

/** One frame of the settings screen. Buttons queue their hover tip; run() draws it last. */
function runSettings(): void {
	rowsDrawnAt = 0;
	if (isHelpOpen()) {
		// DOM controls belong to the settings screen and would float over the help
		// text, which is canvas — they have to go before help draws over them.
		removeScopeControl();
		drawHelp("Erotic Chat Hypnosis Suite (ECHS) — help");
		return;
	}
	// A run-out Extreme period owns the screen until it is answered (job2.md §4B).
	if (extremeExpired()) {
		removeScopeControl();
		drawRenewalPrompt();
		return;
	}
	// First-run (or re-run) setup owns the whole screen; it is never shown mid-session,
	// because it changes consent settings and those are locked while a trance is on you.
	if (shouldShowWizard() && !settingsLocked()) {
		removeScopeControl();
		tipButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");
		drawWizard();
		return;
	}
	// The version rides the title rather than getting a line of its own: it is the one
	// place a player already looks when something is not behaving, and DrawText here is
	// centred on a 2000-wide canvas with room to spare. Same __VERSION__ define as the
	// chat banner and the corner watermark, so all three cannot disagree.
	DrawText(`Erotic Chat Hypnosis Suite (ECHS) v${__VERSION__}${RELEASE_SUFFIX} — settings`, MainCanvasWidth / 2, TITLE_Y, "Black");
	tipButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");
	tipButton(HELP_LEFT, HELP_TOP, HELP_SIZE, HELP_SIZE, "?", "White", "", "How this add-on works");
	if (!settingsLocked()) {
		tipButton(SETUP_LEFT, HELP_TOP, SETUP_WIDTH, HELP_SIZE, "Setup", "White", "", "Run the setup again");
	}

	const tabs = visibleTabs();
	if (activeTab >= tabs.length) activeTab = 0;
	drawTabsAndPanel(tabs.map((t) => t.name), activeTab);

	const tab = tabs[activeTab];
	const locked = settingsLocked();
	// Fitted, not just drawn: these run long, and the panel edge is not a hint the
	// canvas takes on its own.
	if (locked) {
		// A banner rather than the grey blurb line it replaces (v0.98.0, job.md): greyed controls
		// alone read as a broken screen, not a locked one.
		DrawRect(BOX_LEFT - 20, BLURB_Y - 24, PANEL_LEFT + PANEL_WIDTH - BOX_LEFT, 48, LOCK_BANNER_BACK);
		drawLeftTextFit(
			extremeLocked()
				? extremeBannerText()
				: keyLocked() && !ownLocked()
					? keyLockBannerText()
					: "Read-only: locked while someone is working on you, until the session ends. /echs safeword always works.",
			BOX_LEFT,
			BLURB_Y,
			PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - 40,
			LOCK_BANNER_TEXT,
		);
	} else {
		// Wrapped onto two lines, not cut with "…" (v1.16.37, review F8): the cut fell exactly where the
		// blurb said something ("…(that is Clothing Illu…"). Above the rows, which start at 270.
		drawLeftTextWrap(tab.blurb, BOX_LEFT, BLURB_Y - 3, PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - 40, BLURB_HEIGHT, "Gray", 26, 20);
	}

	syncTabControls(tab.name);

	if (tab.render) {
		tab.render();
		return;
	}
	const features = getFeatures();
	const rows = tab.rows ?? [];
	layoutRows(tab);
	const contentWidth = scrollContentWidth(rowScroll);
	// The fixed rows, above the list and outside its clip: always in view (job3.md §2C).
	(tab.fixedRows ?? []).forEach((row, i) => {
		const left = fixedLeft(i);
		DrawCheckbox(left, ROWS_TOP, BOX_SIZE, BOX_SIZE, "", features[row.key], locked);
		if (row.tip) tipArea(left, ROWS_TOP, FIXED_COLUMN - 20, BOX_SIZE, row.tip);
		drawLeftTextFit(row.label, left + BOX_SIZE + 20, ROWS_TOP + 26, FIXED_COLUMN - BOX_SIZE - 40, locked ? "Gray" : "Black");
	});
	drawScrollArea(rowScroll, () => {
		rows.forEach((item, i) => {
			const top = rowTop(tab, i);
			if (isHeading(item)) {
				if (scrollShows(rowScroll, top, HEADING_SPACING)) {
					drawLeftTextFit(item.heading, BOX_LEFT, top + HEADING_SPACING / 2, contentWidth, "#555");
				}
				return;
			}
			if (!scrollShows(rowScroll, top, BOX_SIZE)) return;
			const left = item.needs ? BOX_LEFT + INDENT : BOX_LEFT;
			// A dependent row is inert while the row it needs is off.
			const inert = locked || (!!item.needs && !features[item.needs]);
			// Empty label — DrawCheckbox centers its own at a fixed offset regardless of
			// Width, which overlaps the box for anything but very short text. Draw the
			// label ourselves, left-aligned and clear of the box.
			DrawCheckbox(left, top, BOX_SIZE, BOX_SIZE, "", features[item.key], inert);
			// Only while the pointer is in the list: a row half scrolled out would raise it from its clipped half.
			if (item.tip && mouseInScroll(rowScroll)) tipArea(left, top, Math.min(contentWidth - (left - BOX_LEFT), BOX_SIZE + 20 + 640), BOX_SIZE, item.tip);
			drawLeftTextFit(item.label, left + BOX_SIZE + 20, top + 26, contentWidth - (left - BOX_LEFT) - BOX_SIZE - 20, inert ? "Gray" : "Black");
		});
		const extra = tab.scrollExtra;
		if (extra) {
			const top = scrollExtraTop(tab);
			if (scrollShows(rowScroll, top, extra.height())) extra.draw(top, contentWidth);
			else extra.hide?.();
		}
	});
	rowsDrawnAt = Date.now();
	tab.extra?.();
}

export function installMenu(): void {
	PreferenceRegisterExtensionSetting({
		Identifier: EXTENSION_ID,
		ButtonText: EXTENSION_BUTTON_TEXT,
		// Our spiral icon beside the label in Preferences > Extensions (icon.ts). Undefined
		// if it could not be built, which BC accepts — the entry then shows text only.
		Image: SPIRAL_ICON,
		// Always open on the first tab — coming back to a screen part-way through a
		// previous visit's navigation is disorienting.
		load: () => {
			activeTab = 0;
			trustSearch = "";
			statForgetArmed = 0;
			plantedPage = 0;
			plantedDetail = 0;
			clearAllArmedUntil = 0;
			rowScroll.offset = 0;
			attachWheel();
			removeScopeControl();
			closeHelp();
		},
		// Every path ends in flushTip, so the hover tip a button queued is drawn last, on top — and
		// any DOM control under it steps aside, since canvas cannot draw over one (DW: the page-3
		// "earned only" tip went under the v0.98.0 number boxes).
		run: () => {
			try {
				runSettings();
			} finally {
				clearTipOverlap(flushTip(), ownedControlIds());
			}
		},
		click: () => {
			if (extremeExpired()) {
				clickRenewalPrompt();
				return;
			}
			if (shouldShowWizard() && !settingsLocked()) {
				if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
					PreferenceSubscreenExtensionsClear();
					return;
				}
				clickWizard();
				return;
			}
			if (isHelpOpen()) {
				clickHelp();
				return;
			}
			if (!settingsLocked() && MouseIn(SETUP_LEFT, HELP_TOP, SETUP_WIDTH, HELP_SIZE)) {
				startWizard();
				return;
			}
			if (MouseIn(HELP_LEFT, HELP_TOP, HELP_SIZE, HELP_SIZE)) {
				removeScopeControl();
				openHelp();
				return;
			}
			if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
				PreferenceSubscreenExtensionsClear();
				return;
			}
			const tabs = visibleTabs();
			const hitTab = tabHitIndex(tabs.length);
			if (hitTab !== null) {
				activeTab = hitTab;
				plantedDetail = 0;
				clearAllArmedUntil = 0;
				rowScroll.offset = 0;
				removeScopeControl();
				return;
			}
			// The scroll bar first: scrolling is not a setting, so it works while locked, and a
			// click on the bar must never reach a row under it.
			const tab = tabs[activeTab];
			if (tab.rows) {
				layoutRows(tab);
				if (clickScrollBar(rowScroll)) return;
			}
			// The fixed rows above the list.
			const fixed = (tab.fixedRows ?? []).find((_, i) => MouseIn(fixedLeft(i), ROWS_TOP, BOX_SIZE, BOX_SIZE));
			if (fixed) {
				const next = !getFeatures()[fixed.key];
				if (fixedRowLocked(fixed.key, next)) return;
				setFeature(fixed.key, next);
				onToggle(fixed.key, next);
				log(`${fixed.key} set to ${next}`);
				return;
			}
			// A self-drawing tab handles its own clicks first. Stats predates this and keeps
			// its handling inline below; Depth uses the hook.
			if (tab.clickExtra?.()) return;
			// Stats draws itself: its list's scroll bar, then a row's [x].
			if (tabs[activeTab].render) {
				if (tab.name === "Stats" && !extremeLocked()) {
					layoutStats(trustStatRows(trustSearch).length);
					if (clickScrollBar(rowScroll)) return;
					if (clickStatAccess()) return;
					if (clickStatForget()) return;
				}
				return;
			}
			// Checked here as well as at draw time, not just relied on visually: a greyed
			// checkbox that still toggles when clicked is worse than no lock at all.
			// Outside the scroll area nothing in the list is clickable: a row scrolled out of
			// view still has coordinates, and they are wherever it WOULD be drawn.
			if (!mouseInScroll(rowScroll)) return;
			if (tab.scrollExtra?.click(scrollExtraTop(tab))) return;
			if (settingsLocked()) return;
			// Only the visible tab's rows are clickable — hidden tabs' rows occupy the same
			// coordinates, so without this a single click would toggle one row per tab.
			const features = getFeatures();
			const clickRows = tab.rows ?? [];
			clickRows.forEach((item, i) => {
				if (isHeading(item)) return;
				if (item.needs && !features[item.needs]) return; // inert while what it needs is off
				const left = item.needs ? BOX_LEFT + INDENT : BOX_LEFT;
				if (MouseIn(left, rowTop(tab, i), BOX_SIZE, BOX_SIZE)) {
					const next = !features[item.key];
					setFeature(item.key, next);
					onToggle(item.key, next);
					log(`${item.key} set to ${next}`);
				}
			});
		},
		// Both exit paths matter: exit() for our own back button, unload() for BC tearing
		// the screen down some other way. Missing either leaves the dropdown floating.
		// Both exit paths also close help: it is a module-level flag shared with the remote
		// panel, so leaving it set would greet the next screen with a help page.
		unload: () => {
			removeScopeControl();
			closeHelp();
			detachWheel();
		},
		exit: () => {
			removeScopeControl();
			closeHelp();
			detachWheel();
			// Hypnosis switched on or off here: the room hears at once (People tab, review F10).
			announceIfChanged();
			return true;
		},
	});
}

// These are PERMISSION settings, not self-triggers — "do I allow someone else to do this
// to me", checked when a remote request or spoken suggestion arrives. Checking a box never
// applies an effect to yourself; unchecking one DOES immediately release that effect if
// it's currently active (revoking consent mid-effect should end it, not merely block future
// requests), and hypnoEnabled off is a hard floor that releases everything regardless of
// the individual flags — matching the design doc's "clears active trance, suspends all
// effects". Turning hypnoEnabled back on does NOT restore what was released.
export function onToggle(key: keyof FeatureToggles, enabled: boolean): void {
	switch (key) {
		case "hypnoEnabled":
			// The hard floor, and it now ends the SESSION rather than only stripping effects.
			//
			// The old list cleared eight things and left the session running — phase still
			// Hypnotized, hypnotist still attached, timer still counting, depths still set.
			// So turning the master switch off and back on resumed the trance with no new
			// induction, and the next attempt was refused "Already under." by someone who had
			// switched the add-on off. The doc says "clears active trance, suspends all
			// effects"; only the second half was happening.
			//
			// Delegated rather than extended, because keeping a second copy of the
			// everything-off list in step with the safeword's is what failed here before: the
			// illusion and the denial lock had already gone missing from this one once.
			if (!enabled) hardFloorStop();
			break;
		case "movementRestriction":
			if (!enabled) removeEffect("Freeze");
			break;
		case "clothingRestriction":
			if (!enabled) removeEffect("BlockWardrobe");
			break;
		case "postureControl":
			if (!enabled) {
				clearSuggestedPose();
				clearFace();
			}
			break;
		case "speechRestriction":
		case "tranceCannotSpeak":
			if (!enabled) setSpeechBlocked(false);
			break;
		case "tranceCannotMove":
			if (!enabled) removeEffect("Freeze");
			break;
		// Unticked mid-trance: the hold she is in eases to the ordinary one. Ticking it waits for the next trance.
		case "tranceNoOneMoves":
			if (!enabled) setHoldFully(false);
			break;
		case "tranceScreenFade":
			if (!enabled) setScreenFade(0);
			break;
		case "selfTouchControl":
			if (!enabled) clearSelfTouchBlocks();
			break;
		case "hearingControl":
			if (!enabled) {
				setHearing(null);
				setVeiled(null);
			}
			break;
		case "sightControl":
			if (!enabled) setSight(0);
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
		case "arousalControl":
			// Two lasting states answer to this permission. Numbness lives with the
			// suppression state (see suppression.ts for why, despite the permission); the
			// denial LOCK is a BC effect we applied. The arousal LEVEL is deliberately NOT
			// reset — that is a number they now carry, not something still being done to
			// them, exactly as endSession already reasons about it.
			if (!enabled) {
				setNumb(false);
				clearOrgasmDenial();
			}
			break;
		case "illusionControl":
			// The one that mattered most and was missing longest: revoking this left the
			// subject still unable to see their own clothes, with the setting that caused it
			// switched off. A permission that cannot be withdrawn is not a permission.
			if (!enabled) clearIllusion();
			break;
		case "lockedWhileHypnotized":
			// No immediate effect — it only matters while a trance is running, and
			// settingsLocked() reads it live at draw and click time.
			break;
	}
}
