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
import { safeword } from "./session";
import { getPopupEnabled, getPopupPos, setPopupPos, PopupSpot } from "./storage";
import { SPIRAL_ICON } from "./icon";

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
let statusText = "Click a command to type it into the chat box.";

// --- Pure parts (tested directly) -----------------------------------------------------------

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
		document.getElementById(POPUP_ID)?.remove();
		return;
	}
	if (!launcher) buildLauncher();
	const win = document.getElementById(POPUP_ID);
	if (open && !win) buildWindow();
	if (!open && win) win.remove();
}

export function isPopupOpen(): boolean {
	return open;
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

	const tabs = el("div", "echs-pop-tabs");
	const tab = el("span", "echs-pop-tab echs-pop-tab-on", "Commands");
	tabs.appendChild(tab);
	win.appendChild(tabs);

	const body = el("div", "echs-pop-body");
	win.appendChild(body);
	const status = el("div", "echs-pop-status", statusText);
	renderCommands(body, status);
	win.appendChild(status);

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
			item.addEventListener("click", () => {
				if (fillChat(c.text)) setStatus(status, c.args ? `Typed. Finish it (${c.args}), then press Enter.` : "Typed. Press Enter to send it.");
				else setStatus(status, "No chat box to type into. This works in a chat room.");
			});
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
.echs-pop-tab{padding:3px 10px;border:1px solid #3b4f86;border-bottom:none;border-radius:4px 4px 0 0;font-size:12px}
.echs-pop-tab-on{background:#26335c}
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
