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
import {
	safeword,
	getSessionView,
	countdownRemaining,
	getPendingPrompt,
	getPendingExtend,
	isHypnotized,
	isSessionLive,
	currentHypnotistId,
} from "./session";
import { suggestCategories, suggestionText, SuggestItem } from "./popup-suggest";
import { getPopupEnabled, getPopupPos, setPopupPos, PopupSpot } from "./storage";
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
export type PopupTab = "me" | "people" | "suggest" | "commands";
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
	t.push("commands");
	return t;
}

function viewKey(): string {
	const parts = [availableTabs().join(","), tab];
	if (tab === "people") parts.push(peopleKey());
	if (tab === "suggest") parts.push(popupSubjects().map((s) => `${s.id}:${s.name}`).join("|"), String(chosenSubject));
	if (tab === "me") parts.push(String(subjectSide()), getPendingExtend() ? "extend" : "");
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
		return { lines: [`You are under ${hypnotistName()}.`], buttons: out };
	}
	return { lines: ["Nobody has you under."], buttons: [] };
}

// --- Suggestions (stage 3): the hypnotist's side ---------------------------------------------

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

	place(win, "window", WINDOW_WIDTH, 420, { x: 70, y: Math.round(viewSize().vh * 0.2) });
	makeDraggable(win, head, "window");
	document.body.appendChild(win);
}

function setStatus(node: any, text: string): void {
	statusText = text;
	node.textContent = text;
}

const TAB_LABELS: Record<PopupTab, string> = { me: "Me", people: "People", suggest: "Suggestions", commands: "Commands" };

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
	for (const cat of suggestCategories()) {
		const isOpen = suggestOpen.has(cat.key);
		const head = el("button", "echs-pop-group", `${isOpen ? "−" : "+"}  ${cat.title}`);
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
		for (const it of cat.items) list.appendChild(suggestButton(it, who.name, status));
		body.appendChild(list);
	}
}

/** One suggestion: the line itself types its first wording; a + beside it opens the other wordings
 * one level down, each of which types itself (DW, 2026-11-21). */
function suggestButton(it: SuggestItem, name: string, status: any): any {
	const wrap = el("div", "echs-pop-sug");
	const row = el("div", "echs-pop-row");
	const say = (phrase: string, label: string, cls: string) => {
		const text = suggestionText(name, phrase);
		const b = el("button", cls, label);
		b.type = "button";
		b.title = text;
		b.addEventListener("click", () => typeIt(status, text, `Typed. Press Enter to say it to ${name}.`));
		return b;
	};
	row.appendChild(say(it.phrase, `${it.release ? "↺ " : ""}${it.label}`, `echs-pop-item echs-pop-say${it.release ? " echs-pop-release" : ""}`));
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
.echs-pop{position:fixed;z-index:1000;width:${WINDOW_WIDTH}px;max-height:70vh;display:flex;flex-direction:column;
 background:#0e1424;color:#d8e2ff;border:1px solid #3b4f86;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.55);
 font:13px/1.35 "Segoe UI",Arial,sans-serif}
.echs-pop button{font:inherit;color:inherit}
.echs-pop-head{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #2a3866;cursor:move;touch-action:none;user-select:none}
.echs-pop-title{font-weight:700;letter-spacing:.2em}
.echs-pop-ver{opacity:.6;font-size:11px;flex:1}
.echs-pop-x{background:none;border:1px solid #3b4f86;border-radius:4px;width:24px;height:24px;cursor:pointer}
.echs-pop-x:hover{background:#26335c}
.echs-pop-tabs{display:flex;gap:4px;padding:6px 8px 0}
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
.echs-pop-buttons{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 6px}
.echs-pop-chip{background:#18213b;border:1px solid #3b4f86;border-radius:12px;padding:3px 10px;cursor:pointer}
.echs-pop-chip:hover{background:#22305a}
.echs-pop-chip-on{background:#3b4f86;font-weight:600}
.echs-pop-state{font-weight:400;font-size:11px;margin-left:8px;padding:0 6px;border-radius:8px;background:#26335c;color:#ffd58a}
.echs-pop-body{overflow-y:auto;padding:6px 8px;border-top:1px solid #3b4f86;flex:1}
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
