// The ECHS popup (job4.md; DW, 2026-11-21). Players found ECHS hard to use because the typed
// commands are hard to find, and newer add-ons open small floating windows instead. This is ours:
// a round launcher in the chat room, and a window that can be dragged anywhere.
//
// STAGE 1 of job4.md: the window itself, the on/off setting, the safeword pinned at the bottom, and
// the player commands as +/- groups. The people list, the live suggestions, greying and the
// Triggers tab come in later stages.
//
// CLICKING FILLS THE CHAT BOX, never sends (DW): the player presses Enter, and can edit the line or
// make it a whisper first. Commands and suggestions are both typed things, so the popup teaches the
// wording instead of hiding it.
//
// THE ONE EXCEPTION IS THE SAFEWORD BUTTON, which runs the safeword at once. Rule 2: it must always
// work, from any state, with nothing between the player and it. A button that only types it would
// put a second step in the way.
//
// HTML, not the canvas. The window is a plain DOM element over BC's page, like BC's own chat log
// and other add-ons' windows, so it can be dragged without fighting BC's click handling. Built and
// removed by a light timer: it shows only on the chat room screen, only while the setting is on.

import { log, isTestingMode, RELEASE_SUFFIX } from "./log";
import { commandHelp } from "./commands";
import { openSettingsScreen, EXTENSION_BUTTON_TEXT, remoteRows, remoteChoices, remoteChoiceLabel, REMOTE_TABS, MODERATE_TABS, settingsLocked, ownLocked } from "./menu";
import { keyLockHolder, keysLockHolder } from "./keylock";
import { heldKeys, settingsOf, lastResult, askState, requestSettings, requestSetting, requestChoice, requestEndExtreme, requestRemoveTrigger, requestLock, requestUnlock, requestLockKeys, requestUnlockKeys, requestExtreme, requestRemoveKeyholder, keyLevelAllows, canRequestKeys } from "./keyholder";
import {
	safeword,
	getSessionView,
	countdownRemaining,
	getPendingPrompt,
	getPendingExtend,
	isHypnotized,
	isSessionLive,
	currentHypnotistId,
	currentTier,
} from "./session";
import { tierLabel } from "./depth";
import { extremeLocked } from "./extreme";
import { suggestCategories, suggestionText, SuggestItem } from "./popup-suggest";
import { PLANT_GROUPS, plantedLines, FORGET_ALL, COMPULSION_LINES, TriggerLine } from "./popup-triggers";
import { askPlanted, plantedNote, plantedStatus, plantedHeading, plantedTitle, plantedState } from "./planted";
import { sweptTriggers, triggerSummary, triggerPhrasesVisible, isTriggerInEffect } from "./voice";
import { listTriggers, getTriggerDecayRate, DECAY_RATES, getOwnerKeyMode, listKeyholders, listRemoteChanges, KeyMode, KEY_LEVELS, keyRank } from "./storage";
import { getPopupEnabled, getPopupPos, setPopupPos, PopupSpot, getPopupSize, setPopupSize } from "./storage";
import { SPIRAL_ICON } from "./icon";
import { peerFor } from "./badge";

export const POPUP_ID = "echs-popup";
export const LAUNCHER_ID = "echs-popup-launcher";
const STYLE_ID = "echs-popup-style";
const TICK_MS = 250;
/** A press that moves less than this is a click, not a drag. */
const DRAG_SLOP = 5;
export const LAUNCHER_SIZE = 44;
export const WINDOW_WIDTH = 340;
/** How much of a dragged window must stay on screen, so it can always be caught again. */
const KEEP_VISIBLE = 60;
/** The smallest the window may be resized to (v1.13.2): the tabs and the Safeword button still fit. */
export const MIN_WIDTH = 260;
export const MIN_HEIGHT = 220;
/** How long the size must stay put before it is saved: one save per resize, not one per frame. */
const SIZE_SAVE_MS = 400;

/** The groups shown, in this order. Testing commands only work in the testing room, so they are
 * only listed there. */
const GROUP_ORDER = ["Session", "Data", "Diagnostics", "Testing"];
const GROUP_TITLES: Record<string, string> = {
	Session: "Hypnosis",
	Data: "Your data",
	Diagnostics: "Checking things",
	Testing: "Testing room only",
};

let open = false;
let timer: any = null;
/** Which +/- groups are expanded. Session starts open: it is what a newcomer needs first. */
const expanded = new Set<string>(["Session"]);
let statusText = "Click anything to type it into the chat box. Nothing is sent until you press Enter.";
export type PopupTab = "me" | "people" | "suggest" | "triggers" | "keys" | "commands";
let tab: PopupTab = "people";
/** Which Suggestions groups are open. Trance first: waking and going deeper are needed most. */
const suggestOpen = new Set<string>(["trance"]);
/** Which suggestions have their other wordings showing. */
const altOpen = new Set<string>();
/** The subject the Suggestions tab is for, when more than one is under you. */
let chosenSubject: number | null = null;
/** For switching tabs by themselves only when something CHANGES, never against the player's click. */
let wasSubjectSide = false;
let hadSubjects = 0;
/** Which tab was last drawn, so its scroll position survives a redraw. */
let drawnTab: PopupTab | null = null;
/** The window's changing parts, kept so it can be redrawn as the room changes. */
let bodyEl: any = null;
let statusEl: any = null;
let tabsEl: any = null;
/** What the window last showed, so it is rebuilt only when that changes. */
let shownKey = "";

// --- Pure parts (tested directly) -----------------------------------------------------------

// THE PEOPLE TAB (stage 2). Everyone else in the room running ECHS, found by the room-wide ask
// every build already makes on joining (badge.ts), so opening this sends nothing. Anyone who unticked
// "Show others that I run ECHS" is left out: the same tick box hides them here (DW, 2026-11-21).
// DW chose to list ECHS players knowingly; it reverses the old rule that presence is never shown
// (job4.md §3). Their client still answers, because the profile remote needs that, so leaving them
// out is this client's courtesy, the same as the spiral over them.
//
// Clicking a name TYPES the induction (DW): `/echs induce Name`. The name as the room shows it, or
// the member number when that name would match more than one person, so it can never go to the
// wrong one. Each row shows only what is already known about a session with them; it asks nothing.

export type PopupPerson = { id: number; name: string; text: string; status: string };

function roomOthers(): any[] {
	const me = typeof Player !== "undefined" ? Player?.MemberNumber : undefined;
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).filter((c: any) => c?.MemberNumber && c.MemberNumber !== me);
}

const shownName = (c: any): string => (c?.Nickname || c?.Name || `#${c?.MemberNumber}`) as string;

/** What `/echs induce` should be given so it means exactly this person (commands.ts resolveTarget:
 * Name or Nickname, case-insensitive, exact match first). */
export function induceTarget(c: any, pool: any[]): string {
	const name = shownName(c);
	const lower = name.toLowerCase();
	const hits = pool.filter((o) => [o?.Name, o?.Nickname].filter(Boolean).some((n: string) => n.toLowerCase() === lower));
	// The command squeezes spaces (commands.ts wholeName), so a name it would change cannot be typed
	// back; nor can one that is all digits, which it reads as a member number.
	const survives = name === name.trim().replace(/\s+/g, " ") && !/^\d+$/.test(name);
	return hits.length === 1 && survives ? name : String(c.MemberNumber);
}

/** What is known of a session with them, from their last report to us. Empty when nothing is. */
export function personStatus(memberNumber: number): string {
	const v = getSessionView(memberNumber);
	if (!v) return "";
	switch (v.phase) {
		case "Hypnotized":
			return "under you";
		case "AttemptMade":
		case "InductionInProgress":
			return "induction under way";
		case "AttemptFailed":
			return "missed: you can try again";
		case "CooldownRequired": {
			const mins = Math.ceil(countdownRemaining(v, "cooldownRemaining") / 60_000);
			return mins > 0 ? `resting: ${mins} min` : "";
		}
		default:
			return v.refusedReason ? "refused last time" : "";
	}
}

/** The People list: everyone else here running ECHS who has not asked to be left out. */
export function popupPeople(): PopupPerson[] {
	const pool = roomOthers();
	return pool
		.filter((c) => {
			const p = peerFor(c.MemberNumber);
			return p !== undefined && p.show !== false;
		})
		.map((c) => ({
			id: c.MemberNumber,
			name: shownName(c),
			text: `/echs induce ${induceTarget(c, pool)}`,
			status: personStatus(c.MemberNumber),
		}));
}

export type PopupCommand = { tag: string; args: string; description: string; text: string };

/** The command groups the popup lists. `testing` decides whether the Testing group appears. */
export function popupGroups(testing: boolean): { group: string; title: string; commands: PopupCommand[] }[] {
	const all = commandHelp();
	return GROUP_ORDER.filter((g) => testing || g !== "Testing")
		.map((group) => ({
			group,
			title: GROUP_TITLES[group] ?? group,
			commands: all
				.filter((c) => c.group === group)
				.map((c) => ({ tag: c.tag, args: c.args, description: c.description, text: commandText(c.tag, c.args) })),
		}))
		.filter((g) => g.commands.length > 0);
}

/** What a click types. A command that takes something gets a trailing space, so the player can type
 * straight on; one that takes nothing is complete as it stands. */
export function commandText(tag: string, args: string): string {
	return `/echs ${tag}${args ? " " : ""}`;
}

/** Keeps a box of size w×h inside a view of vw×vh with at least KEEP_VISIBLE of it showing.
 * Small boxes (the launcher) are kept wholly on screen. */
export function clampPos(x: number, y: number, w: number, h: number, vw: number, vh: number): { x: number; y: number } {
	const keepW = Math.min(w, KEEP_VISIBLE);
	const minX = w <= KEEP_VISIBLE ? 0 : keepW - w;
	const maxX = Math.max(0, vw - keepW);
	const maxY = Math.max(0, vh - Math.min(h, KEEP_VISIBLE));
	return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, 0), maxY) };
}

// --- Chat box -------------------------------------------------------------------------------

/** Puts `text` in BC's chat box, cursor at the end, focused. Fires BC's own input handler so its
 * length counter keeps up (R134 ChatRoom.js: InputChat's `input` listener). Never sends.
 * Returns false when there is no chat box to type into — said out loud by the caller (rule 5). */
export function fillChat(text: string): boolean {
	const input: any = typeof document !== "undefined" ? document.getElementById("InputChat") : null;
	if (!input) return false;
	input.value = text;
	try {
		input.dispatchEvent(new Event("input", { bubbles: true }));
	} catch {
		/* older engines without Event: the counter is cosmetic */
	}
	input.focus?.();
	try {
		input.setSelectionRange?.(text.length, text.length);
	} catch {
		/* not a text field after all; the text is still in it */
	}
	return true;
}

// --- Visibility -------------------------------------------------------------------------------

/** The chat room itself (R134 Common.js `CurrentScreen`), with no character's item menu open over
 * it: that menu (`CurrentCharacter`) is drawn on the same screen, and the launcher would sit on
 * its buttons. */
function inChatRoom(): boolean {
	if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return false;
	return typeof CurrentCharacter === "undefined" || CurrentCharacter == null;
}

/** One look at the world: build what should be there, remove what should not. Exported so the
 * suite can drive it without a real timer. */
export function popupTick(): void {
	if (typeof document === "undefined" || !document.body) return;
	const show = getPopupEnabled() && inChatRoom();
	const launcher = document.getElementById(LAUNCHER_ID);
	if (!show) {
		launcher?.remove();
		removeWindow();
		return;
	}
	if (!launcher) buildLauncher();
	const win = document.getElementById(POPUP_ID);
	if (open && !win) buildWindow();
	if (!open && win) removeWindow();
	autoSwitch();
	// People come and go, and sessions change: redraw when what the window would show has changed.
	if (open && document.getElementById(POPUP_ID) && viewKey() !== shownKey) renderBody();
}

/** Someone just started on you → Me. Someone just went under you → Suggestions. The tab you were
 * on is gone → People. Otherwise the player's own choice stands. */
function autoSwitch(): void {
	const me = subjectSide() !== null;
	const subs = popupSubjects().length;
	if (me && !wasSubjectSide) tab = "me";
	else if (subs > hadSubjects) tab = "suggest";
	if (!availableTabs().includes(tab)) tab = "people";
	wasSubjectSide = me;
	hadSubjects = subs;
}

export function availableTabs(): PopupTab[] {
	const t: PopupTab[] = [];
	if (subjectSide() !== null) t.push("me");
	t.push("people");
	if (popupSubjects().length) t.push("suggest");
	t.push("triggers");
	t.push("keys");
	t.push("commands");
	return t;
}

function viewKey(): string {
	const parts = [availableTabs().join(","), tab];
	if (tab === "people") parts.push(peopleKey());
	if (tab === "suggest") {
		const who = currentSubject();
		parts.push(popupSubjects().map((s) => `${s.id}:${s.name}`).join("|"), String(chosenSubject));
		parts.push(JSON.stringify(who ? (getSessionView(who.id)?.gates ?? null) : null));
	}
	if (tab === "me") parts.push(String(subjectSide()), getPendingExtend() ? "extend" : "");
	if (tab === "triggers") parts.push(triggersKey());
	if (tab === "keys") parts.push(keysKey());
	return parts.join("#");
}

// --- Me (stage 3): the subject's own side ------------------------------------------------------

export type SubjectSide = "prompt" | "inducing" | "under" | null;

/** Where we stand as a SUBJECT: being asked, in the induction window, or under. */
export function subjectSide(): SubjectSide {
	if (getPendingPrompt()) return "prompt";
	if (isHypnotized()) return "under";
	if (isSessionLive()) return "inducing";
	return null;
}

function hypnotistName(): string {
	const id = currentHypnotistId();
	const c = roomOthers().find((x: any) => x?.MemberNumber === id);
	return c ? shownName(c) : id != null ? `#${id}` : "someone";
}

/** The Me tab's lines and buttons. Each button types its command, as everywhere else. */
export function meView(): { lines: string[]; buttons: { label: string; text: string; tip: string }[] } {
	const side = subjectSide();
	const b = (label: string, tag: string, tip: string) => ({ label, text: `/echs ${tag}`, tip });
	if (side === "prompt") {
		const p = getPendingPrompt()!;
		return {
			lines: [`${p.hypnotistName} is trying to hypnotize you.`, "Choose how you respond. They are never told which."],
			buttons: [b("Agree", "agree", "Go along with it: easier for them"), b("Ignore", "ignore", "Neither help nor resist"), b("Fight", "fight", "Resist: harder for them")],
		};
	}
	if (side === "inducing") {
		return { lines: [`An induction with ${hypnotistName()} is under way.`], buttons: [b("Wake", "wake", "Stop it now")] };
	}
	if (side === "under") {
		const out = [
			b("Wake", "wake", "Wake yourself, if the trance is shallow enough"),
			b("Fight", "fight", "Push back up, and fight going deeper"),
			b("Agree", "agree", "Stop resisting"),
			b("Ignore", "ignore", "Neither help nor resist going deeper"),
			b("What is on me", "effects", "List the effects on you now"),
		];
		const ext = getPendingExtend();
		if (ext) out.unshift(b(`Stay (${ext.minutes} min more)`, "stay", "Your time is up: stay under for as long again"));
		// The tier names from the Depth tab, from full depth, so it never tells her she is shallower
		// than she is (rule 4). Hidden under the Extreme lock, which hides her depth everywhere.
		const lines = [`You are under ${hypnotistName()}.`];
		if (!extremeLocked()) lines.push(`Depth: ${tierLabel(currentTier())}`);
		return { lines, buttons: out };
	}
	return { lines: ["Nobody has you under."], buttons: [] };
}

// --- Suggestions (stage 3): the hypnotist's side ---------------------------------------------

/** Whether a suggestion would land, from the subject's own report (stage 4). "unknown" when they
 * sent none: an older build, so nothing is greyed. Releases and the always-allowed lines (wake,
 * deeper) are always "ok": a release skips the permission check and is never depth-gated
 * (voice.ts). A line needing any of several permissions lands if any one does. */
export type Gate = "ok" | "deeper" | "off" | "unknown";
export function gateOf(it: SuggestItem, gates: { ok: string[]; deeper: string[] } | null): Gate {
	if (!gates) return "unknown";
	if (it.release || !it.permission) return "ok";
	const keys = it.permission.split(" / ");
	if (keys.some((k) => gates.ok.includes(k))) return "ok";
	if (keys.some((k) => gates.deeper.includes(k))) return "deeper";
	return "off";
}

/** Everyone in the room who is under YOU, by their last report to you. */
export function popupSubjects(): { id: number; name: string }[] {
	return roomOthers()
		.filter((c) => getSessionView(c.MemberNumber)?.phase === "Hypnotized")
		.map((c) => ({ id: c.MemberNumber, name: shownName(c) }));
}

/** Who the Suggestions tab is for: the one chosen, or the first if that one is gone. */
export function currentSubject(): { id: number; name: string } | null {
	const subs = popupSubjects();
	return subs.find((s) => s.id === chosenSubject) ?? subs[0] ?? null;
}

export function chooseSubject(id: number): void {
	chosenSubject = id;
	if (bodyEl) renderBody();
}

function removeWindow(): void {
	document.getElementById(POPUP_ID)?.remove();
	bodyEl = statusEl = tabsEl = null;
	sizeWatch?.disconnect?.();
	sizeWatch = null;
	if (sizeTimer) clearTimeout(sizeTimer);
	sizeTimer = null;
}

// --- Resizing (v1.13.2, DW) ------------------------------------------------------------------
// The browser's own grip in the bottom-right corner (CSS resize), so nothing here fights BC for the
// mouse. Dragging it writes an inline width and height on the window; a ResizeObserver notices, and
// once the size has stayed put for SIZE_SAVE_MS it is saved, once. Double-clicking the title bar puts
// it back to the normal size. Clamped on screen when applied, so a smaller window never loses it.
let sizeWatch: any = null;
let sizeTimer: any = null;

/** Keeps a size between the minimum and what the screen can show. */
export function clampSize(w: number, h: number, vw: number, vh: number): { w: number; h: number } {
	return {
		w: Math.round(Math.max(MIN_WIDTH, Math.min(w, Math.max(MIN_WIDTH, vw - 8)))),
		h: Math.round(Math.max(MIN_HEIGHT, Math.min(h, Math.max(MIN_HEIGHT, vh - 8)))),
	};
}

function applySize(win: any): void {
	const saved = getPopupSize();
	if (!saved) return;
	const { vw, vh } = viewSize();
	const z = clampSize(saved.w, saved.h, vw, vh);
	win.style.width = `${z.w}px`;
	win.style.height = `${z.h}px`;
}

/** Saves the window's size if the player has set one (an inline size) and it differs from the saved. */
export function noteWindowSize(win: any): void {
	if (!win?.style?.width && !win?.style?.height) return;
	const w = Math.round(win.offsetWidth || parseFloat(win.style.width) || 0);
	const h = Math.round(win.offsetHeight || parseFloat(win.style.height) || 0);
	if (!w || !h) return;
	const saved = getPopupSize();
	if (saved && saved.w === w && saved.h === h) return;
	setPopupSize({ w, h });
}

function watchSize(win: any): void {
	if (typeof ResizeObserver !== "function") return;
	sizeWatch = new ResizeObserver(() => {
		if (sizeTimer) clearTimeout(sizeTimer);
		sizeTimer = setTimeout(() => {
			sizeTimer = null;
			noteWindowSize(win);
		}, SIZE_SAVE_MS);
	});
	sizeWatch.observe(win);
}

/** Back to the normal size, and forget the saved one. */
export function resetWindowSize(): void {
	const win: any = document.getElementById(POPUP_ID);
	if (win) {
		win.style.width = "";
		win.style.height = "";
	}
	setPopupSize(null);
	if (statusEl) setStatus(statusEl, "Back to the normal size.");
}

export function isPopupOpen(): boolean {
	return open;
}

export function getPopupTab(): PopupTab {
	return tab;
}

export function setPopupTab(value: PopupTab): void {
	tab = value;
	if (bodyEl) renderBody();
}

function peopleKey(): string {
	return popupPeople()
		.map((p) => `${p.id}:${p.name}:${p.status}`)
		.join("|");
}

export function setPopupOpen(value: boolean): void {
	open = value;
	popupTick();
}

// --- Building -----------------------------------------------------------------------------------

function el(tag: string, cls: string, text?: string): any {
	const e: any = document.createElement(tag);
	if (cls) e.className = cls;
	if (text !== undefined) e.textContent = text;
	return e;
}

function viewSize(): { vw: number; vh: number } {
	return { vw: window.innerWidth || 1280, vh: window.innerHeight || 720 };
}

function place(node: any, which: PopupSpot, w: number, h: number, fallback: { x: number; y: number }): void {
	const { vw, vh } = viewSize();
	const saved = getPopupPos(which) ?? fallback;
	const p = clampPos(saved.x, saved.y, w, h, vw, vh);
	node.style.left = `${p.x}px`;
	node.style.top = `${p.y}px`;
}

/** Drag `node` by `handle`. `onClick` runs instead when the press barely moved. Saves where it was
 * left, once, on release — not on every move, which would be a settings save per mouse event. */
function makeDraggable(node: any, handle: any, which: PopupSpot, onClick?: () => void): void {
	handle.addEventListener("pointerdown", (ev: any) => {
		if (ev.button !== undefined && ev.button !== 0) return;
		// A press on a button inside the header is that button's, not a drag.
		if (handle !== node && ev.target !== handle && ev.target?.closest?.("button")) return;
		ev.preventDefault?.();
		ev.stopPropagation?.();
		const startX = ev.clientX;
		const startY = ev.clientY;
		const left0 = parseFloat(node.style.left) || 0;
		const top0 = parseFloat(node.style.top) || 0;
		let moved = false;
		const move = (e: any) => {
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
			moved = true;
			const { vw, vh } = viewSize();
			const p = clampPos(left0 + dx, top0 + dy, node.offsetWidth || LAUNCHER_SIZE, node.offsetHeight || LAUNCHER_SIZE, vw, vh);
			node.style.left = `${p.x}px`;
			node.style.top = `${p.y}px`;
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			if (moved) setPopupPos(which, parseFloat(node.style.left) || 0, parseFloat(node.style.top) || 0);
			else onClick?.();
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	});
}

function buildLauncher(): void {
	ensureStyle();
	const b = el("button", "echs-pop-launcher");
	b.id = LAUNCHER_ID;
	b.type = "button";
	b.title = "ECHS — commands and help (drag to move)";
	if (SPIRAL_ICON) {
		const img = el("img", "");
		img.src = SPIRAL_ICON;
		img.alt = "ECHS";
		img.draggable = false;
		b.appendChild(img);
	} else b.textContent = "E";
	place(b, "launcher", LAUNCHER_SIZE, LAUNCHER_SIZE, { x: 10, y: Math.round(viewSize().vh * 0.45) });
	makeDraggable(b, b, "launcher", () => setPopupOpen(!open));
	document.body.appendChild(b);
}

function buildWindow(): void {
	ensureStyle();
	const win = el("div", "echs-pop");
	win.id = POPUP_ID;

	const head = el("div", "echs-pop-head");
	head.appendChild(el("span", "echs-pop-title", "ECHS"));
	head.appendChild(el("span", "echs-pop-ver", `v${__VERSION__}${RELEASE_SUFFIX}`));
	// The gear (v1.13.4, DW): straight into the ECHS settings. The window hides on the settings screen
	// by itself (it shows only in a room) and is open again when the player comes back.
	const gear = el("button", "echs-pop-x echs-pop-gear", "⚙");
	gear.type = "button";
	gear.title = "ECHS settings";
	gear.setAttribute?.("aria-label", "ECHS settings");
	gear.addEventListener("click", () => {
		openSettingsScreen()
			.then((ok) => {
				if (!ok && statusEl) setStatus(statusEl, `Couldn't open them from here. They're under Preferences > Extensions > ${EXTENSION_BUTTON_TEXT}.`);
			})
			.catch(() => statusEl && setStatus(statusEl, `Couldn't open them from here. They're under Preferences > Extensions > ${EXTENSION_BUTTON_TEXT}.`));
	});
	head.appendChild(gear);
	const close = el("button", "echs-pop-x", "×");
	close.type = "button";
	close.title = "Close (the spiral button opens it again)";
	close.addEventListener("click", () => setPopupOpen(false));
	head.appendChild(close);
	win.appendChild(head);

	tabsEl = el("div", "echs-pop-tabs");
	win.appendChild(tabsEl);
	bodyEl = el("div", "echs-pop-body");
	win.appendChild(bodyEl);
	const status = el("div", "echs-pop-status", statusText);
	statusEl = status;
	win.appendChild(status);
	renderBody();

	const foot = el("div", "echs-pop-foot");
	const sw = el("button", "echs-pop-safeword", "Safeword — stop everything");
	sw.type = "button";
	sw.title = "Ends any trance and releases every effect, at once. Always works.";
	sw.addEventListener("click", () => {
		safeword();
		setStatus(status, "Safeword used: everything stopped.");
	});
	foot.appendChild(sw);
	win.appendChild(foot);

	head.title = "Drag to move. Double-click for the normal size.";
	head.addEventListener("dblclick", (ev: any) => {
		if (ev?.target?.closest?.("button")) return;
		resetWindowSize();
	});
	applySize(win);
	const z = getPopupSize();
	place(win, "window", z?.w ?? WINDOW_WIDTH, z?.h ?? 420, { x: 70, y: Math.round(viewSize().vh * 0.2) });
	makeDraggable(win, head, "window");
	document.body.appendChild(win);
	watchSize(win);
}

function setStatus(node: any, text: string): void {
	statusText = text;
	node.textContent = text;
}

const TAB_LABELS: Record<PopupTab, string> = { me: "Me", people: "People", suggest: "Suggestions", triggers: "Triggers", keys: "Keys", commands: "Commands" };

/** The tab row and whichever tab is chosen. */
function renderBody(): void {
	if (!bodyEl || !statusEl) return;
	if (!availableTabs().includes(tab)) tab = "people";
	if (tabsEl) {
		tabsEl.textContent = "";
		for (const t of availableTabs()) {
			const b = el("button", `echs-pop-tab${t === tab ? " echs-pop-tab-on" : ""}`, TAB_LABELS[t]);
			b.type = "button";
			b.addEventListener("click", () => setPopupTab(t));
			tabsEl.appendChild(b);
		}
	}
	const keep = drawnTab === tab ? bodyEl.scrollTop || 0 : 0;
	if (tab === "people") renderPeople(bodyEl, statusEl);
	else if (tab === "suggest") renderSuggest(bodyEl, statusEl);
	else if (tab === "me") renderMe(bodyEl, statusEl);
	else if (tab === "triggers") renderTriggers(bodyEl, statusEl);
	else if (tab === "keys") renderKeys(bodyEl, statusEl);
	else renderCommands(bodyEl, statusEl);
	bodyEl.scrollTop = keep;
	drawnTab = tab;
	shownKey = viewKey();
}

function renderMe(body: any, status: any): void {
	body.textContent = "";
	const v = meView();
	for (const line of v.lines) body.appendChild(el("div", "echs-pop-hint", line));
	const row = el("div", "echs-pop-buttons");
	for (const x of v.buttons) {
		const btn = el("button", "echs-pop-chip", x.label);
		btn.type = "button";
		btn.title = `${x.tip} (types ${x.text})`;
		btn.addEventListener("click", () => typeIt(status, x.text, "Typed. Press Enter to send it."));
		row.appendChild(btn);
	}
	body.appendChild(row);
}

function renderSuggest(body: any, status: any): void {
	body.textContent = "";
	const subs = popupSubjects();
	const who = currentSubject();
	if (!who) {
		body.appendChild(el("div", "echs-pop-empty", "Nobody is under you right now."));
		return;
	}
	if (subs.length > 1) {
		const row = el("div", "echs-pop-buttons");
		for (const s of subs) {
			const chip = el("button", `echs-pop-chip${s.id === who.id ? " echs-pop-chip-on" : ""}`, s.name);
			chip.type = "button";
			chip.addEventListener("click", () => chooseSubject(s.id));
			row.appendChild(chip);
		}
		body.appendChild(row);
	}
	body.appendChild(el("div", "echs-pop-hint", `Speaking to ${who.name}. Click a line to type it with their name. ↺ gives something back.`));
	const gates = getSessionView(who.id)?.gates ?? null;
	if (!gates) body.appendChild(el("div", "echs-pop-hint", `${who.name}'s ECHS doesn't say what they allow (an older version), so nothing is greyed.`));
	for (const cat of suggestCategories()) {
		const isOpen = suggestOpen.has(cat.key);
		// Judged on what needs a permission: releases and wake/deeper always land, so they say nothing
		// about whether the group is allowed. A group of only those (Trance) is never "not allowed".
		const gated = cat.items.filter((i) => !i.release && i.permission);
		const noneLand = gates !== null && gated.length > 0 && gated.every((i) => gateOf(i, gates) === "off");
		const head = el("button", `echs-pop-group${noneLand ? " echs-pop-off" : ""}`, `${isOpen ? "−" : "+"}  ${cat.title}${noneLand ? "  (not allowed)" : ""}`);
		head.type = "button";
		head.setAttribute?.("aria-expanded", String(isOpen));
		head.addEventListener("click", () => {
			if (suggestOpen.has(cat.key)) suggestOpen.delete(cat.key);
			else suggestOpen.add(cat.key);
			renderBody();
		});
		body.appendChild(head);
		if (!isOpen) continue;
		const list = el("div", "echs-pop-list");
		for (const it of cat.items) list.appendChild(suggestButton(it, who.name, status, gateOf(it, gates)));
		body.appendChild(list);
	}
}

/** One suggestion: the line itself types its first wording; a + beside it opens the other wordings
 * one level down, each of which types itself (DW, 2026-11-21). */
function suggestButton(it: SuggestItem, name: string, status: any, gate: Gate): any {
	const wrap = el("div", `echs-pop-sug${gate === "off" ? " echs-pop-off" : gate === "deeper" ? " echs-pop-deeper" : ""}`);
	const row = el("div", "echs-pop-row");
	// Greyed, not disabled: the subject's client decides (rule 1), and the hint may be a beat stale.
	// What the status says on a click is the honest part (rule 5).
	const done =
		gate === "off"
			? `Typed, but ${name} hasn't allowed this. It won't land.`
			: gate === "deeper"
				? `Typed, but ${name} isn't deep enough for this yet. Take them deeper first.`
				: `Typed. Press Enter to say it to ${name}.`;
	const why = gate === "off" ? `${name} hasn't allowed this. ` : gate === "deeper" ? `Needs ${name} deeper. ` : "";
	const say = (phrase: string, label: string, cls: string) => {
		const text = suggestionText(name, phrase);
		const b = el("button", cls, label);
		b.type = "button";
		b.title = `${why}${text}`;
		b.addEventListener("click", () => typeIt(status, text, done));
		return b;
	};
	const main = say(it.phrase, `${it.release ? "↺ " : ""}${it.label}`, `echs-pop-item echs-pop-say${it.release ? " echs-pop-release" : ""}`);
	row.appendChild(main);
	if (gate === "deeper") row.appendChild(el("span", "echs-pop-state echs-pop-tag", "deeper"));
	const isOpen = altOpen.has(it.id);
	if (it.alternates.length) {
		const more = el("button", "echs-pop-more", isOpen ? "−" : `+${it.alternates.length}`);
		more.type = "button";
		more.title = isOpen ? "Hide the other wordings" : "Other ways to say it";
		more.addEventListener("click", () => {
			if (altOpen.has(it.id)) altOpen.delete(it.id);
			else altOpen.add(it.id);
			renderBody();
		});
		row.appendChild(more);
	}
	wrap.appendChild(row);
	if (isOpen) {
		const alts = el("div", "echs-pop-alts");
		for (const a of it.alternates) alts.appendChild(say(a, a, `echs-pop-item echs-pop-alt${it.release ? " echs-pop-release" : ""}`));
		wrap.appendChild(alts);
	}
	return wrap;
}

// --- Triggers (stage 5) ----------------------------------------------------------------------
// Three parts, by role. Planting: for whoever is under you now. What you planted: per person here
// you hold notes on (planted.ts — the subject's client is asked, once in a while, and answers only
// about your own; nothing is decided from the notes). In you: the subject's own triggers and fade
// speed, numbered exactly as /echs triggers numbers them, because the commands it types use them.

/** Which Triggers groups are open. Planting first: it is what this tab is mostly for. */
const triggerOpen = new Set<string>(["plant", "mine"]);
/** When we last asked each person for their planted list from here, so the tab never floods. */
const plantedAskedAt = new Map<number, number>();
export const PLANTED_REASK_MS = 30_000;

/** The people whose planted lists this tab shows: here now, and either under you or on your notes. */
export function plantedPeople(): { id: number; name: string }[] {
	const under = new Set(popupSubjects().map((s) => s.id));
	return roomOthers()
		.filter((c) => under.has(c.MemberNumber) || plantedNote(c.MemberNumber))
		.map((c) => ({ id: c.MemberNumber, name: shownName(c) }));
}

/** Ask each of them, at most once every PLANTED_REASK_MS. One message per person, never per row. */
function askPlantedLists(now: number = Date.now()): void {
	for (const p of plantedPeople()) {
		if (now - (plantedAskedAt.get(p.id) ?? 0) < PLANTED_REASK_MS) continue;
		plantedAskedAt.set(p.id, now);
		askPlanted(p.id, now);
	}
}

function triggersKey(): string {
	const who = currentSubject();
	const planted = plantedPeople().map((p) => `${p.id}:${plantedStatus(p.id)}:${plantedNote(p.id)?.updatedAt ?? 0}`);
	const mine = listTriggers().map((t) => `${t.key}:${isTriggerInEffect(t) ? 1 : 0}`);
	return [who?.id ?? "", planted.join(","), mine.join(","), getTriggerDecayRate(), extremeLocked() ? "x" : ""].join("|");
}

function triggerGroup(body: any, key: string, title: string, fill: (list: any) => void): void {
	const isOpen = triggerOpen.has(key);
	const head = el("button", "echs-pop-group", `${isOpen ? "−" : "+"}  ${title}`);
	head.type = "button";
	head.setAttribute?.("aria-expanded", String(isOpen));
	head.addEventListener("click", () => {
		if (triggerOpen.has(key)) triggerOpen.delete(key);
		else triggerOpen.add(key);
		renderBody();
	});
	body.appendChild(head);
	if (!isOpen) return;
	const list = el("div", "echs-pop-list");
	fill(list);
	body.appendChild(list);
}

function triggerLineButton(line: TriggerLine, name: string, status: any): any {
	const text = suggestionText(name, line.phrase);
	const b = el("button", `echs-pop-item echs-pop-say${line.release ? " echs-pop-release" : ""}`, `${line.release ? "↺ " : ""}${line.label}`);
	b.type = "button";
	b.title = text;
	b.addEventListener("click", () =>
		typeIt(status, text, line.finish ? `Typed. Finish it (${line.finish}), then press Enter.` : `Typed. Press Enter to say it to ${name}.`),
	);
	return b;
}

function chip(label: string, tip: string, onClick: () => void, faded = false): any {
	const c = el("button", `echs-pop-chip${faded ? " echs-pop-off" : ""}`, label);
	c.type = "button";
	c.title = tip;
	c.addEventListener("click", onClick);
	return c;
}

function renderTriggers(body: any, status: any): void {
	body.textContent = "";
	askPlantedLists();
	const who = currentSubject();
	// 1. Planting, for whoever is under you.
	if (who) {
		body.appendChild(el("div", "echs-pop-hint", `Planting in ${who.name}. Needs a Deep trance, on earned depth.`));
		for (const g of PLANT_GROUPS)
			triggerGroup(body, g.key, g.title, (list) => {
				if (g.hint) list.appendChild(el("div", "echs-pop-hint", g.hint));
				for (const line of g.lines) {
					if (!line.choices) {
						list.appendChild(triggerLineButton(line, who.name, status));
						continue;
					}
					// A line with a list: the button opens it, and each choice types its own start.
					const key = `choices-${g.key}-${line.id}`;
					const isOpen = triggerOpen.has(key);
					const b = el("button", "echs-pop-item echs-pop-say", `${isOpen ? "−" : "+"} ${line.label}`);
					b.type = "button";
					b.setAttribute?.("aria-expanded", String(isOpen));
					b.addEventListener("click", () => {
						if (triggerOpen.has(key)) triggerOpen.delete(key);
						else triggerOpen.add(key);
						renderBody();
					});
					list.appendChild(b);
					if (!isOpen) continue;
					const chips = el("div", "echs-pop-buttons");
					for (const choice of line.choices) {
						const text = suggestionText(who.name, choice.phrase);
						chips.appendChild(chip(choice.label, text, () => typeIt(status, text, `Typed. Finish it (${line.finish}), then press Enter.`)));
					}
					list.appendChild(chips);
				}
			});
	} else {
		// Shown greyed rather than hidden (DW, 2026-11-22: the compulsions seemed missing), so the
		// lines can be read before anyone is under; a click says why it typed nothing.
		body.appendChild(el("div", "echs-pop-hint", "To plant a trigger, put someone under first (a Deep trance, on earned depth). The lines are below to read."));
		for (const g of PLANT_GROUPS)
			triggerGroup(body, g.key, g.title, (list) => {
				if (g.hint) list.appendChild(el("div", "echs-pop-hint", g.hint));
				for (const line of g.lines) {
					const b = el("button", `echs-pop-item echs-pop-off${line.release ? " echs-pop-release" : ""}`, `${line.release ? "↺ " : ""}${line.label}`);
					b.type = "button";
					b.title = "Put someone under first.";
					b.addEventListener("click", () => {
						setStatus(status, "Nobody is under you: put someone under first, then this types it for them.");
					});
					list.appendChild(b);
				}
			});
	}
	// 2. What you planted, per person here.
	for (const p of plantedPeople()) {
		triggerGroup(body, `planted-${p.id}`, `What you planted in ${p.name}`, (list) => {
			list.appendChild(el("div", "echs-pop-hint", plantedHeading(p.id, p.name)));
			const entries = plantedNote(p.id)?.triggers ?? [];
			for (const t of entries) {
				const row = el("div", "echs-pop-entry");
				row.appendChild(el("div", "echs-pop-person", plantedTitle(t)));
				const detail = [plantedState(t), t.does.join("; ")].filter(Boolean).join(" · ");
				if (detail) row.appendChild(el("div", "echs-pop-desc", detail));
				if (t.word) {
					const chips = el("div", "echs-pop-buttons");
					for (const line of plantedLines(t.word)) {
						const text = suggestionText(p.name, line.phrase);
						chips.appendChild(chip(line.label, text, () => typeIt(status, text, `Typed. Press Enter to say it to ${p.name}.`)));
					}
					row.appendChild(chips);
				} else {
					// A compulsion (v1.16.10): no word, so these type the lines that cover all of yours.
					row.appendChild(el("div", "echs-pop-desc", "No word: release and remove act on every compulsion you planted in them."));
					const chips = el("div", "echs-pop-buttons");
					for (const line of COMPULSION_LINES) {
						const text = suggestionText(p.name, line.phrase);
						chips.appendChild(chip(line.label, text, () => typeIt(status, text, `Typed. Press Enter to say it to ${p.name}.`)));
					}
					row.appendChild(chips);
				}
				list.appendChild(row);
			}
			if (entries.length) list.appendChild(triggerLineButton(FORGET_ALL, p.name, status));
		});
	}
	// 3. Triggers in you.
	const mine = sweptTriggers();
	const locked = extremeLocked();
	triggerGroup(body, "mine", `Triggers in you (${mine.length})`, (list) => {
		if (!mine.length) list.appendChild(el("div", "echs-pop-empty", "Nothing is planted in you."));
		const reveal = triggerPhrasesVisible(false);
		mine.forEach((t, i) => {
			const n = i + 1;
			const holding = isTriggerInEffect(t);
			const row = el("div", "echs-pop-entry");
			row.appendChild(el("div", "echs-pop-person", `${n}. ${reveal && t.phrase ? `"${t.phrase}"` : t.fireOn ? "a compulsion" : "word hidden"}`));
			row.appendChild(el("div", "echs-pop-desc", triggerSummary(t)));
			const chips = el("div", "echs-pop-buttons");
			chips.appendChild(chip("details", `/echs triggers ${n}`, () => typeIt(status, `/echs triggers ${n}`, "Typed. Press Enter to see it in full.")));
			// Typed even when it will be refused, and the status says why: the command decides (rule 1),
			// and a refusal said out loud beats a button that silently does nothing (rule 5).
			const why = locked
				? "Your Extreme lock is on: triggers can only be added until it ends."
				: holding
					? "It is holding you: wait, have it released, or use the safeword."
					: "";
			chips.appendChild(
				chip(
					"forget",
					why || `/echs forgettrigger ${n}`,
					() => typeIt(status, `/echs forgettrigger ${n}`, why ? `Typed, but it will be refused. ${why}` : "Typed. Press Enter to remove it."),
					!!why,
				),
			);
			row.appendChild(chips);
			list.appendChild(row);
		});
		if (mine.length > 1)
			list.appendChild(
				chip(
					"forget all",
					locked ? "Your Extreme lock is on." : "/echs forgettrigger all (asks first)",
					() => typeIt(status, "/echs forgettrigger all", locked ? "Typed, but it will be refused: your Extreme lock is on." : "Typed. Press Enter; it asks you to confirm."),
					locked,
				),
			);
		list.appendChild(el("div", "echs-pop-hint", "How fast your triggers fade:"));
		const rates = el("div", "echs-pop-buttons");
		const now = getTriggerDecayRate();
		for (const r of DECAY_RATES) {
			const c = chip(
				r.label,
				locked ? "Your Extreme lock is on." : `/echs triggerdecay ${r.key}`,
				() => typeIt(status, `/echs triggerdecay ${r.key}`, locked ? "Typed, but it will be refused: your Extreme lock is on." : "Typed. Press Enter to set it."),
				locked,
			);
			if (r.key === now) c.className += " echs-pop-chip-on";
			rates.appendChild(c);
		}
		list.appendChild(rates);
	});
}

// --- Keys (v1.14.0, job5.md) --------------------------------------------------------------------
// Two parts. YOUR KEYHOLDERS: who may change your settings, typed as /echs keyholder commands like
// everything else here (read-only under your own locks: the command refuses and says why). SETTINGS
// YOU HOLD KEYS TO: the other person's tick boxes. A click there ACTS rather than types (there is no
// chat line for it, the same exception as the Safeword button): it sends a request their ECHS
// decides on, and the answer shows in the status line.

const keysOpen = new Set<string>(["mine", "held", "ask"]);
/** Which of a held person's tabs are folded shut (v1.16.2). Depth and Stats start shut: Depth alone
 * is some twenty rows, and full keys are the only ones that can use them. */
const heldTabsShut = new Set<string>(["Depth", "Stats", "Planted"]);
/** A remove button clicked once (v1.16.2): the trigger it is armed for, and when. A second click
 * within END_EXTREME_ARM_MS sends it, as ending an Extreme lock does. */
let removeArmed = { id: "", at: 0 };
/** The unlock button clicked once (v1.16.2): when. */
let unlockArmedAt = 0;
/** The keys-lock unlock button clicked once (v1.16.3): when. */
let unlockKeysArmedAt = 0;
/** An owner's "take their keys back" clicked once (v1.16.3): whose, and when. */
let ownerRemoveArmed = { id: 0, at: 0 };
let chosenHolder: number | null = null;
/** When we last asked each person for their settings from here: at most every KEYS_REASK_MS. */
const keysAskedAt = new Map<number, number>();
const KEYS_REASK_MS = 30_000;
/** "End their Extreme lock" needs a second click within this long. */
const END_EXTREME_ARM_MS = 5_000;
let endExtremeArmedAt = 0;

// "Give keys (level)" (v1.16.0, job6.md §2, DW): one button per person that cycles minimal → moderate
// → full. Its label is what a click types; a second click on the same button moves on to the next
// level and types that instead. Still typed, never done on click: Enter applies it.
/** Per person ("owner" or a member number), the level their button shows, as an index. */
const keyCycle = new Map<string, number>();
/** The button that typed last, so only a repeat click advances. */
let keyCycleLast = "";

/** The level a "Give keys" button shows: one above what they hold (wrapping), minimal for nobody. */
export function cycleLevel(key: string, held: KeyMode | null): KeyMode {
	const i = keyCycle.get(key) ?? (held ? (keyRank(held) + 1) % KEY_LEVELS.length : 0);
	return KEY_LEVELS[i];
}

/** A click on a "Give keys" button: advance if it was the last one clicked, and say which to type. */
export function clickCycle(key: string, held: KeyMode | null): KeyMode {
	let i = KEY_LEVELS.indexOf(cycleLevel(key, held));
	if (keyCycleLast === key) i = (i + 1) % KEY_LEVELS.length;
	keyCycle.set(key, i);
	keyCycleLast = key;
	return KEY_LEVELS[i];
}

/** For the suite. */
export function resetKeyCycle(): void {
	keyCycle.clear();
	keyCycleLast = "";
}

const LEVEL_HINT = "minimal = only switch things off · moderate = also shape your trance · full = everything";

export function currentHolder(): { id: number; name: string; mode: KeyMode } | null {
	const held = heldKeys();
	return held.find((h) => h.id === chosenHolder) ?? held[0] ?? null;
}

function keysKey(): string {
	const h = currentHolder();
	const snap = h ? settingsOf(h.id) : null;
	const res = h ? lastResult(h.id) : null;
	return [
		heldKeys().map((k) => `${k.id}:${k.mode}`).join(","),
		// The Ask for keys group: who is here to ask, and their answers as they come.
		askable().map((p) => `${p.id}:${lastResult(p.id)?.at ?? 0}`).join(","),
		h?.id ?? "",
		JSON.stringify(snap),
		res?.at ?? 0,
		h ? askState(h.id) : "",
		JSON.stringify(listKeyholders()),
		getOwnerKeyMode() ?? "",
		listRemoteChanges().length,
		extremeLocked() ? "x" : "",
		settingsLocked() ? "l" : "",
	].join("|");
}

/** Are we this person's BC owner? BC's own check (R134 Character.js IsOwnedByPlayer). Only for the
 * words on a button: their ECHS decides whether we are. */
function isOwnerOf(member: number): boolean {
	try {
		return roomOthers().find((c) => c.MemberNumber === member)?.IsOwnedByPlayer?.() === true;
	} catch {
		return false;
	}
}

/** Everyone here we could ask for keys (v1.16.1): runs a new enough ECHS, and we don't hold their full keys. */
function askable(): { id: number; name: string }[] {
	const held = new Map(heldKeys().map((h) => [h.id, h.mode]));
	return popupPeople().filter((p) => canRequestKeys(p.id) && held.get(p.id) !== "full");
}

function keysGroup(body: any, key: string, title: string, fill: (list: any) => void): void {
	const isOpen = keysOpen.has(key);
	const head = el("button", "echs-pop-group", `${isOpen ? "−" : "+"}  ${title}`);
	head.type = "button";
	head.addEventListener("click", () => {
		if (keysOpen.has(key)) keysOpen.delete(key);
		else keysOpen.add(key);
		renderBody();
	});
	body.appendChild(head);
	if (!isOpen) return;
	const list = el("div", "echs-pop-list");
	fill(list);
	body.appendChild(list);
}

function renderKeys(body: any, status: any): void {
	body.textContent = "";
	// Her own locks hold the list; the keyholder lock (v1.16.2) only keeps its keyholder's keys full.
	const keysLocker = keysLockHolder();
	const locked = ownLocked() || !!keysLocker;
	const why = extremeLocked()
		? "Your Extreme lock is on: who holds your keys can't change until it ends."
		: keysLocker
			? `${keysLocker.name} locked who holds your keys: you can't give or take back keys until a full keyholder unlocks it.`
			: "Your settings are locked while a session is on you.";
	const locker = keyLockHolder();
	const typed = (text: string) => typeIt(status, text, locked ? `Typed, but it will be refused. ${why}` : "Typed. Press Enter to do it.");

	// 1. Your keyholders.
	keysGroup(body, "mine", "Your keyholders", (list) => {
		list.appendChild(el("div", "echs-pop-hint", "A keyholder can change your ECHS settings while you're in a room together, even under Extreme, and can end your Extreme lock."));
		list.appendChild(el("div", "echs-pop-hint", LEVEL_HINT));
		if (locked) list.appendChild(el("div", "echs-pop-hint", why));
		if (locker) list.appendChild(el("div", "echs-pop-hint", `${locker.name} locked your settings: you can't change them, or take ${locker.name}'s keys back, until a full keyholder unlocks them. It ends on its own if ${locker.name} isn't in a room with you for 7 days.`));
		const give = (key: string, held: KeyMode | null, command: (level: KeyMode) => string) =>
			chip(`Give keys (${cycleLevel(key, held)})`, "Click again for the next level. Nothing happens until you press Enter.", () => {
				typed(command(clickCycle(key, held)));
				renderBody();
			}, locked);
		const owner = getOwnerKeyMode();
		list.appendChild(el("div", "echs-pop-person", owner ? `Your BC owner · ${owner}` : "Your BC owner · no keys"));
		const ownerRow = el("div", "echs-pop-buttons");
		ownerRow.appendChild(give("owner", owner, (level) => `/echs keyholder owner ${level}`));
		if (owner) ownerRow.appendChild(chip("Take keys back", "", () => typed("/echs keyholder owner off"), locked));
		list.appendChild(ownerRow);
		const named = listKeyholders();
		for (const k of named) {
			const row = el("div", "echs-pop-entry");
			row.appendChild(el("div", "echs-pop-person", `${k.name} · ${k.mode}`));
			const chips = el("div", "echs-pop-buttons");
			chips.appendChild(give(String(k.id), k.mode, (level) => `/echs keyholder add ${k.id} ${level}`));
			chips.appendChild(chip("Take keys back", "", () => typed(`/echs keyholder remove ${k.id}`), locked));
			row.appendChild(chips);
			list.appendChild(row);
		}
		const candidates = popupPeople().filter((p) => !named.some((k) => k.id === p.id));
		if (candidates.length) {
			list.appendChild(el("div", "echs-pop-hint", "Give someone here your keys:"));
			for (const p of candidates) {
				const row = el("div", "echs-pop-entry");
				row.appendChild(el("div", "echs-pop-person", p.name));
				const chips = el("div", "echs-pop-buttons");
				const target = induceTarget(roomOthers().find((c) => c.MemberNumber === p.id), roomOthers());
				chips.appendChild(give(String(p.id), null, (level) => `/echs keyholder add ${target} ${level}`));
				row.appendChild(chips);
				list.appendChild(row);
			}
		}
		const recent = listRemoteChanges().slice(-3).reverse();
		if (recent.length) {
			list.appendChild(el("div", "echs-pop-hint", "Last changes to your settings:"));
			for (const c of recent) list.appendChild(el("div", "echs-pop-desc", `${c.byName} ${c.what}`));
		}
	});

	// 2. Ask for someone's keys (v1.16.1, job6.md §3). Typed like Give keys, cycling the same way;
	// their ECHS shows them a popup, and the answer comes back in chat and under their name here.
	const canAsk = askable();
	if (canAsk.length) {
		keysGroup(body, "ask", "Ask for keys", (list) => {
			list.appendChild(el("div", "echs-pop-hint", "Ask someone here for their keys. They get a popup to accept or decline; no answer in 30 seconds is a no."));
			const heldNow = new Map(heldKeys().map((h) => [h.id, h.mode]));
			for (const p of canAsk) {
				const row = el("div", "echs-pop-entry");
				const has = heldNow.get(p.id) ?? null;
				row.appendChild(el("div", "echs-pop-person", has ? `${p.name} · you hold ${has}` : p.name));
				const chips = el("div", "echs-pop-buttons");
				const target = induceTarget(roomOthers().find((c) => c.MemberNumber === p.id), roomOthers());
				const key = `ask:${p.id}`;
				chips.appendChild(
					chip(`Request keys (${cycleLevel(key, has)})`, "Click again for the next level. Nothing is sent until you press Enter.", () => {
						typeIt(status, `/echs keyholder request ${target} ${clickCycle(key, has)}`, "Typed. Press Enter to ask.");
						renderBody();
					}),
				);
				row.appendChild(chips);
				list.appendChild(row);
				const res = lastResult(p.id);
				if (res && Date.now() - res.at < 30_000) list.appendChild(el("div", "echs-pop-desc", res.text));
			}
		});
	}

	// 3. Settings you hold keys to.
	const held = heldKeys();
	if (!held.length) return;
	const who = currentHolder()!;
	const now = Date.now();
	if (now - (keysAskedAt.get(who.id) ?? 0) >= KEYS_REASK_MS) {
		keysAskedAt.set(who.id, now);
		requestSettings(who.id);
	}
	keysGroup(body, "held", `Settings you hold keys to`, (list) => {
		if (held.length > 1) {
			const row = el("div", "echs-pop-buttons");
			for (const h of held) {
				const c = chip(h.name, "", () => {
					chosenHolder = h.id;
					renderBody();
				});
				if (h.id === who.id) c.className += " echs-pop-chip-on";
				row.appendChild(c);
			}
			list.appendChild(row);
		}
		list.appendChild(
			el(
				"div",
				"echs-pop-hint",
				who.mode === "full"
					? `${who.name}'s settings. You hold full keys: you can switch them on and off, and set their Triggers choices, trust fading and Depth (open those below).`
					: who.mode === "moderate"
						? `${who.name}'s settings. You hold moderate keys: you can switch things off, and shape their trance (Trance Defaults, Awareness, how it looks and its pace).`
						: `${who.name}'s settings. You hold minimal keys: you can only switch things off.`,
			),
		);
		const snap = settingsOf(who.id);
		const asking = askState(who.id);
		if (!snap) {
			list.appendChild(el("div", "echs-pop-empty", asking === "silent" ? `${who.name}'s ECHS did not answer.` : "Asking them…"));
			return;
		}
		const res = lastResult(who.id);
		if (res && now - res.at < 15_000) list.appendChild(el("div", "echs-pop-hint", res.text));
		const on = new Map(snap.boxes.map((b) => [b.key, b.on]));
		// Tab by tab, in screen order: its tick boxes, then its choices (v1.14.1: Inductions and
		// Trance Defaults), one row of chips each with the current one lit. What the keys' level can't
		// set is faded (keyLevelAllows); her ECHS would refuse it anyway.
		const chosen = new Map(snap.choices.map((c) => [c.key, c.value]));
		for (const tab of REMOTE_TABS) {
			const rows = remoteRows().filter((r) => r.tab === tab && on.has(r.key));
			const choices = remoteChoices().filter((c) => c.tab === tab && chosen.has(c.key));
			if (!rows.length && !choices.length) continue;
			const shut = heldTabsShut.has(tab);
			const head = el("button", "echs-pop-item echs-pop-person", `${shut ? "+" : "−"} ${tab}`);
			head.type = "button";
			head.title = shut ? `Show ${tab}` : `Hide ${tab}`;
			head.addEventListener("click", () => {
				if (heldTabsShut.has(tab)) heldTabsShut.delete(tab);
				else heldTabsShut.add(tab);
				renderBody();
			});
			list.appendChild(head);
			if (shut) continue;
			for (const r of rows) {
				const isOn = on.get(r.key) === true;
				const blocked = !keyLevelAllows(who.mode, isOn, MODERATE_TABS.includes(r.tab));
				const b = el("button", `echs-pop-item echs-pop-say${blocked ? " echs-pop-off" : ""}`, `${isOn ? "☑" : "☐"} ${r.label}`);
				b.type = "button";
				b.title = blocked ? `Your ${who.mode} keys can't switch this on.` : `Switch ${isOn ? "off" : "on"}`;
				b.addEventListener("click", () => {
					requestSetting(who.id, r.key, !isOn);
					setStatus(status, `Asked ${who.name}'s ECHS to switch ${isOn ? "off" : "on"} "${r.label}"…`);
				});
				list.appendChild(b);
			}
			for (const c of choices) {
				const value = chosen.get(c.key)!;
				list.appendChild(el("div", "echs-pop-desc", `${c.label}: ${remoteChoiceLabel(c, value)}`));
				const row = el("div", "echs-pop-buttons");
				// A number (v1.16.2: a depth, the trigger duration): step buttons from where it is now.
				if (c.range) {
					const r = c.range;
					const blocked = !keyLevelAllows(who.mode, false, !!c.moderate);
					const at = Number(value);
					for (const step of r.steps) {
						const next = String(Math.min(r.max, Math.max(r.min, (Number.isFinite(at) ? at : r.min) + step)));
						const label = step > 0 ? `+${step}` : String(step);
						row.appendChild(
							chip(label, blocked ? `Your ${who.mode} keys can't change this.` : `Set ${c.label} to ${remoteChoiceLabel(c, next)}`, () => {
								if (next === value) return;
								requestChoice(who.id, c.key, next);
								setStatus(status, `Asked ${who.name}'s ECHS to set ${c.label} to ${remoteChoiceLabel(c, next)}…`);
							}, blocked || next === value),
						);
					}
					list.appendChild(row);
					continue;
				}
				for (const o of c.options) {
					const blocked = !keyLevelAllows(who.mode, o.key === c.off, !!c.moderate);
					const ch = chip(o.label, blocked ? `Your ${who.mode} keys can't choose this.` : `Set ${c.label} to ${o.label}`, () => {
						if (o.key === value) return;
						requestChoice(who.id, c.key, o.key);
						setStatus(status, `Asked ${who.name}'s ECHS to set ${c.label} to ${o.label}…`);
					}, blocked && o.key !== value);
					if (o.key === value) ch.className += " echs-pop-chip-on";
					row.appendChild(ch);
				}
				list.appendChild(row);
			}
		}
		// What is planted in them (v1.16.2, job6.md §4): full keys only, so only a full snapshot has it.
		if (who.mode === "full" && snap.planted) {
			const shut = heldTabsShut.has("Planted");
			const head = el("button", "echs-pop-item echs-pop-person", `${shut ? "+" : "−"} Planted in them (${snap.planted.length})`);
			head.type = "button";
			head.title = shut ? "Show what is planted in them" : "Hide it";
			head.addEventListener("click", () => {
				if (heldTabsShut.has("Planted")) heldTabsShut.delete("Planted");
				else heldTabsShut.add("Planted");
				renderBody();
			});
			list.appendChild(head);
			if (!shut) {
				if (!snap.planted.length) list.appendChild(el("div", "echs-pop-desc", "Nothing is planted in them."));
				else
					list.appendChild(
						el("div", "echs-pop-hint", "You can remove one only if they trust you more than whoever planted it. Never one they planted in themselves, and never under their Extreme lock."),
					);
				for (const t of snap.planted) {
					const title = t.word ? `"${t.word}"` : t.when || "A trigger word you can't see";
					const state = [t.strength, t.once ? "works once" : "", t.holding ? "holding them now" : ""].filter(Boolean).join(", ");
					list.appendChild(el("div", "echs-pop-person", `${title} · planted by ${t.by}`));
					list.appendChild(el("div", "echs-pop-desc", [state, t.does.join("; ")].filter(Boolean).join(". ")));
					const armed = removeArmed.id === t.id && now - removeArmed.at < END_EXTREME_ARM_MS;
					const row = el("div", "echs-pop-buttons");
					row.appendChild(
						chip(armed ? "click again to remove it" : "remove", t.removable ? "Removes this trigger from them. Click twice." : t.why, () => {
							if (!t.removable) {
								setStatus(status, t.why);
								return;
							}
							if (removeArmed.id === t.id && Date.now() - removeArmed.at < END_EXTREME_ARM_MS) {
								removeArmed = { id: "", at: 0 };
								requestRemoveTrigger(who.id, t.id);
								setStatus(status, `Asked ${who.name}'s ECHS to remove that trigger…`);
							} else {
								removeArmed = { id: t.id, at: Date.now() };
								setStatus(status, "Click again within 5 seconds to remove it.");
								renderBody();
							}
						}, !t.removable),
					);
					list.appendChild(row);
				}
			}
		}
		const refresh = chip("refresh", "Ask for their settings again", () => {
			keysAskedAt.set(who.id, Date.now());
			requestSettings(who.id);
			setStatus(status, `Asked ${who.name}'s ECHS for their settings.`);
		});
		const tail = el("div", "echs-pop-buttons");
		tail.appendChild(refresh);
		// The keyholder lock (v1.16.2, job6.md §5): full keys ask to lock (she must accept), and any
		// full keyholder may unlock.
		if (snap.keyLock) list.appendChild(el("div", "echs-pop-hint", `Their settings are locked by ${snap.keyLock}: only keyholders can change them.`));
		if (who.mode === "full") {
			if (snap.keyLock) {
				const armed = Date.now() - unlockArmedAt < END_EXTREME_ARM_MS;
				tail.appendChild(
					chip(armed ? "click again to unlock" : "unlock their settings", "Gives them back their own settings. Click twice.", () => {
						if (Date.now() - unlockArmedAt < END_EXTREME_ARM_MS) {
							unlockArmedAt = 0;
							requestUnlock(who.id);
							setStatus(status, `Asked ${who.name}'s ECHS to unlock their settings…`);
						} else {
							unlockArmedAt = Date.now();
							setStatus(status, "Click again within 5 seconds to unlock their settings.");
							renderBody();
						}
					}),
				);
			} else {
				tail.appendChild(
					chip("lock their settings", "Asks them to let only their keyholders change their settings. They get a popup and must accept.", () => {
						requestLock(who.id);
						setStatus(status, `Asked ${who.name} to let you lock their settings. They have 30 seconds to accept.`);
					}),
				);
			}
			// The keys lock (v1.16.3): their BC owner sets it outright; anyone else, they must accept.
			const owner = isOwnerOf(who.id);
			if (snap.keysLock) {
				const armed = Date.now() - unlockKeysArmedAt < END_EXTREME_ARM_MS;
				tail.appendChild(
					chip(armed ? "click again to unlock their keys" : "unlock who holds their keys", "Lets them give and take back keys again. Click twice.", () => {
						if (Date.now() - unlockKeysArmedAt < END_EXTREME_ARM_MS) {
							unlockKeysArmedAt = 0;
							requestUnlockKeys(who.id);
							setStatus(status, `Asked ${who.name}'s ECHS to unlock who holds their keys…`);
						} else {
							unlockKeysArmedAt = Date.now();
							setStatus(status, "Click again within 5 seconds to unlock who holds their keys.");
							renderBody();
						}
					}),
				);
			} else {
				tail.appendChild(
					chip(
						"lock who holds their keys",
						owner ? "As their owner, this locks it at once: they can't give or take back keys." : "Asks them to stop giving and taking back keys. They get a popup and must accept.",
						() => {
							requestLockKeys(who.id);
							setStatus(status, owner ? `Locking who holds ${who.name}'s keys…` : `Asked ${who.name} to let you lock who holds their keys. They have 30 seconds to accept.`);
						},
					),
				);
			}
			// Extreme (job6.md §6): start it, or extend it by 30 days; they see the full warning and must accept.
			tail.appendChild(
				chip(snap.extreme ? "extend their Extreme lock" : "start Extreme for them", "They get the Extreme warning in a popup and must accept.", () => {
					requestExtreme(who.id);
					setStatus(status, `Asked ${who.name} to ${snap.extreme ? "extend their Extreme lock" : "go under Extreme"}. They have 30 seconds to accept.`);
				}),
			);
		}
		if (snap.keysLock) list.appendChild(el("div", "echs-pop-hint", `Who holds their keys is locked by ${snap.keysLock}.`));
		// Who else holds their keys, each with "take their keys back" (v1.16.3 owner, v1.16.4 any full
		// keyholder): their owner's is at once (two clicks); anyone else's asks them (one click).
		if (snap.keyholders && who.mode === "full") {
			const owner = isOwnerOf(who.id);
			list.appendChild(el("div", "echs-pop-person", owner ? "Their other keyholders (you're their owner)" : "Their other keyholders"));
			if (!snap.keyholders.length) list.appendChild(el("div", "echs-pop-desc", "Nobody else holds their keys."));
			for (const k of snap.keyholders) {
				const armed = ownerRemoveArmed.id === k.id && Date.now() - ownerRemoveArmed.at < END_EXTREME_ARM_MS;
				const isLocker = snap.keyLock !== undefined && snap.keyLock === k.name;
				const row = el("div", "echs-pop-buttons");
				row.appendChild(el("div", "echs-pop-desc", `${k.name} · ${k.mode}`));
				row.appendChild(
					chip(armed ? "click again" : "take their keys back", isLocker ? `${k.name} locked their settings, so they keep their keys until it is unlocked.` : owner ? "As their owner, their keys are taken back at once. Click twice." : `Asks ${who.name} to take ${k.name}'s keys back. They must accept.`, () => {
						if (isLocker) {
							setStatus(status, `${k.name} locked their settings, so they keep their keys until it is unlocked.`);
							return;
						}
						if (!owner) {
							requestRemoveKeyholder(who.id, k.id);
							setStatus(status, `Asked ${who.name} to take ${k.name}'s keys back. They have 30 seconds to accept.`);
							return;
						}
						if (ownerRemoveArmed.id === k.id && Date.now() - ownerRemoveArmed.at < END_EXTREME_ARM_MS) {
							ownerRemoveArmed = { id: 0, at: 0 };
							requestRemoveKeyholder(who.id, k.id);
							setStatus(status, `Taking ${k.name}'s keys to ${who.name}'s settings back…`);
						} else {
							ownerRemoveArmed = { id: k.id, at: Date.now() };
							setStatus(status, `Click again within 5 seconds to take ${k.name}'s keys back.`);
							renderBody();
						}
					}, isLocker),
				);
				list.appendChild(row);
			}
		}
		if (snap.extreme) {
			const armed = Date.now() - endExtremeArmedAt < END_EXTREME_ARM_MS;
			tail.appendChild(
				chip(armed ? "click again to end it" : "end their Extreme lock", "Ends their Extreme lock early; their settings stay as they are.", () => {
					if (Date.now() - endExtremeArmedAt < END_EXTREME_ARM_MS) {
						endExtremeArmedAt = 0;
						requestEndExtreme(who.id);
						setStatus(status, `Asked ${who.name}'s ECHS to end their Extreme lock…`);
					} else {
						endExtremeArmedAt = Date.now();
						setStatus(status, "Click again within 5 seconds to end their Extreme lock.");
						renderBody();
					}
				}),
			);
		}
		list.appendChild(tail);
	});
}

function typeIt(status: any, text: string, done: string): void {
	if (fillChat(text)) setStatus(status, done);
	else setStatus(status, "No chat box to type into. This works in a chat room.");
}

function renderPeople(body: any, status: any): void {
	body.textContent = "";
	const people = popupPeople();
	if (!people.length) {
		body.appendChild(el("div", "echs-pop-empty", "Nobody else here is running ECHS, or those who are have chosen not to be shown."));
		return;
	}
	body.appendChild(el("div", "echs-pop-hint", "Click someone to type an induction for them. They decide, on their own screen, how to respond."));
	for (const p of people) {
		const item = el("button", "echs-pop-item");
		item.type = "button";
		item.title = p.text;
		const line = el("div", "echs-pop-person", p.name);
		if (p.status) line.appendChild(el("span", "echs-pop-state", p.status));
		item.appendChild(line);
		item.addEventListener("click", () => typeIt(status, p.text, `Typed. Press Enter to start the induction on ${p.name}.`));
		body.appendChild(item);
	}
}

function renderCommands(body: any, status: any): void {
	body.textContent = "";
	for (const g of popupGroups(isTestingMode())) {
		const isOpen = expanded.has(g.group);
		const head = el("button", "echs-pop-group", `${isOpen ? "−" : "+"}  ${g.title}`);
		head.type = "button";
		head.setAttribute?.("aria-expanded", String(isOpen));
		head.addEventListener("click", () => {
			if (expanded.has(g.group)) expanded.delete(g.group);
			else expanded.add(g.group);
			renderCommands(body, status);
		});
		body.appendChild(head);
		if (!isOpen) continue;
		const list = el("div", "echs-pop-list");
		for (const c of g.commands) {
			const item = el("button", "echs-pop-item");
			item.type = "button";
			item.appendChild(el("div", "echs-pop-cmd", `/echs ${c.tag}${c.args ? " " + c.args : ""}`));
			item.appendChild(el("div", "echs-pop-desc", c.description));
			item.addEventListener("click", () =>
				typeIt(status, c.text, c.args ? `Typed. Finish it (${c.args}), then press Enter.` : "Typed. Press Enter to send it."),
			);
			list.appendChild(item);
		}
		body.appendChild(list);
	}
}

function ensureStyle(): void {
	if (document.getElementById(STYLE_ID)) return;
	const s = el("style", "");
	s.id = STYLE_ID;
	s.textContent = POPUP_CSS;
	document.head.appendChild(s);
}

// Dark, like the other add-ons' windows players already know; everything under .echs-pop* so it
// cannot restyle BC or another add-on.
const POPUP_CSS = `
.echs-pop-launcher{position:fixed;z-index:1000;width:${LAUNCHER_SIZE}px;height:${LAUNCHER_SIZE}px;border-radius:50%;
 padding:4px;border:2px solid #2c2352;background:#f4f0ff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.4);touch-action:none}
.echs-pop-launcher img{width:100%;height:100%;pointer-events:none}
.echs-pop-launcher:hover{background:#fff}
.echs-pop{position:fixed;z-index:1000;width:${WINDOW_WIDTH}px;height:min(460px,70vh);max-height:90vh;max-width:90vw;
 min-width:${MIN_WIDTH}px;min-height:${MIN_HEIGHT}px;resize:both;overflow:hidden;display:flex;flex-direction:column;
 background:#0e1424;color:#d8e2ff;border:1px solid #3b4f86;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.55);
 font:13px/1.35 "Segoe UI",Arial,sans-serif}
.echs-pop button{font:inherit;color:inherit}
.echs-pop-head{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #2a3866;cursor:move;touch-action:none;user-select:none}
.echs-pop-title{font-weight:700;letter-spacing:.2em}
.echs-pop-ver{opacity:.6;font-size:11px;flex:1}
.echs-pop-x{background:none;border:1px solid #3b4f86;border-radius:4px;width:24px;height:24px;cursor:pointer}
.echs-pop-x:hover{background:#26335c}
.echs-pop-gear{font-size:15px;line-height:1;padding:0}
.echs-pop-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px 0}
.echs-pop-tab{padding:3px 10px;border:1px solid #3b4f86;border-bottom:none;border-radius:4px 4px 0 0;font-size:12px;background:none;cursor:pointer}
.echs-pop-tab:hover{background:#1b2648}
.echs-pop-tab-on,.echs-pop-tab-on:hover{background:#26335c;font-weight:600}
.echs-pop-hint,.echs-pop-empty{font-size:12px;opacity:.75;padding:4px 2px 6px}
.echs-pop-person{font-weight:600}
.echs-pop-row{display:flex;align-items:stretch}
.echs-pop-row .echs-pop-item{flex:1}
.echs-pop-say{color:#e4ecff}
.echs-pop-say.echs-pop-release,.echs-pop-alt.echs-pop-release{color:#9fe0b8}
.echs-pop-more{background:none;border:none;border-bottom:1px solid #1d2747;color:#9fd0ff;font-size:11px;min-width:34px;cursor:pointer}
.echs-pop-more:hover{background:#1b2648}
.echs-pop-alts{margin-left:14px;border-left:2px solid #26335c}
.echs-pop-alt{font-size:12px;opacity:.85}
.echs-pop-tag{align-self:center;margin:0 4px}
.echs-pop-entry{padding:4px 6px;border-bottom:1px solid #1d2747}
.echs-pop-entry .echs-pop-buttons{padding:3px 0 0}
.echs-pop-off{opacity:.38}
.echs-pop-off:hover{opacity:.6}
.echs-pop-deeper .echs-pop-say{color:#c9cfe0}
.echs-pop-buttons{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 6px}
.echs-pop-chip{background:#18213b;border:1px solid #3b4f86;border-radius:12px;padding:3px 10px;cursor:pointer}
.echs-pop-chip:hover{background:#22305a}
.echs-pop-chip-on{background:#3b4f86;font-weight:600}
.echs-pop-state{font-weight:400;font-size:11px;margin-left:8px;padding:0 6px;border-radius:8px;background:#26335c;color:#ffd58a}
.echs-pop-body{overflow-y:auto;padding:6px 8px;border-top:1px solid #3b4f86;flex:1;min-height:0}
.echs-pop-group{display:block;width:100%;text-align:left;background:#18213b;border:1px solid #2a3866;border-radius:4px;
 padding:5px 8px;margin:4px 0;cursor:pointer;font-weight:600}
.echs-pop-group:hover{background:#22305a}
.echs-pop-list{margin:0 0 4px 8px}
.echs-pop-item{display:block;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid #1d2747;
 padding:4px 6px;cursor:pointer}
.echs-pop-item:hover{background:#1b2648}
.echs-pop-cmd{font-family:Consolas,monospace;color:#9fd0ff}
.echs-pop-desc{font-size:12px;opacity:.75}
.echs-pop-status{padding:5px 8px;border-top:1px solid #2a3866;font-size:12px;color:#9fe0b8;min-height:16px}
.echs-pop-foot{padding:6px 8px;border-top:1px solid #2a3866}
.echs-pop-safeword{width:100%;padding:6px;background:#6b1022;border:1px solid #c0354f;border-radius:4px;cursor:pointer;font-weight:700}
.echs-pop-safeword:hover{background:#8a1630}
`;

export function installPopup(): void {
	if (timer) return;
	timer = setInterval(() => {
		try {
			popupTick();
		} catch (e) {
			log(`popup: ${e}`);
		}
	}, TICK_MS);
	popupTick();
}
