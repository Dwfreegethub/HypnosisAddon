// Shared chrome for our full-screen canvas panels — the settings screen and the help
// screen. Extracted rather than copied: the tab-to-panel join below is fiddly enough that
// two hand-maintained copies would drift, and the hairline it avoids took a release to
// diagnose the first time.

// --- Geometry ------------------------------------------------------------------------
export const TITLE_Y = 110;

// TABS RUN DOWN THE LEFT EDGE, not across the top.
//
// Horizontal ran out. Six tabs at a fixed 280 ended at x=1920 against a panel ending at 1800,
// so the last one hung outside the box it is attached to; dividing the width out of the panel
// fixed the overflow but only pushes the real limit back to about nine, where DrawTextFit has
// shrunk the labels past reading. Down the side, a tab is a full 280 wide whatever the count
// and eight fit comfortably, which is enough for the screens still to come.
//
// The panel also reclaims the band the tab row used to occupy — PANEL_TOP moves from 262 to
// 190. Nothing inside moves, because every content coordinate is at y >= 305; the tab column
// simply starts where the panel now does.
export const TAB_LEFT = 200;
export const TAB_WIDTH = 280;
export const TAB_HEIGHT = 72;
export const TAB_GAP = 8;

export const PANEL_LEFT = TAB_LEFT + TAB_WIDTH;
export const PANEL_TOP = 190;
/** Right edge stays at 1800, where it has always been — the panel gives up its left 280px to
 * the tab column and takes back the 72px band above it. */
export const PANEL_WIDTH = 1800 - PANEL_LEFT;
export const PANEL_HEIGHT = 902 - PANEL_TOP;
/** Border thickness. Everything is a filled rect rather than a stroke so the tab-to-panel
 * join lands on exact pixels — see drawTabsAndPanel. */
export const BORDER = 3;

/** How many tabs fit down the side before they run past the panel floor. Not enforced —
 * exported so a screen can be told off in review rather than silently clipping. */
export const MAX_TABS = Math.floor((PANEL_HEIGHT + TAB_GAP) / (TAB_HEIGHT + TAB_GAP));

// 235 rather than 305: the panel top moved to 190 when the tabs turned, and the blurb sat
// where it had been left, 115px below an edge it used to clear by 43. Both screens read from
// this, so both move together.
export const BLURB_Y = 235;
/** Everything drawn inside the panel is placed relative to this, so the whole layout moves
 * with the panel rather than needing a per-screen sweep. It did need one sweep, when the tabs
 * turned: the constants that were absolute pixels are all offsets from here now, which is why
 * that sweep should be the last. */
export const CONTENT_LEFT = PANEL_LEFT + 60;

// BC's own Preferences exit icon is DOM/CSS-positioned via ElementMenu, so there is no
// canvas coordinate of its own to copy. This is the raw-canvas convention used by
// Dialog.js and Wardrobe.js, verified against the live client.
export const BACK_LEFT = 1815;
export const BACK_TOP = 75;
export const BACK_SIZE = 90;

export function tabTop(index: number): number {
	return PANEL_TOP + index * (TAB_HEIGHT + TAB_GAP);
}

/** Which tab the mouse is over, or null. */
export function tabHitIndex(count: number): number | null {
	for (let i = 0; i < count; i++) {
		if (MouseIn(TAB_LEFT, tabTop(i), TAB_WIDTH, TAB_HEIGHT)) return i;
	}
	return null;
}

/** Left-aligned text. BC's canvas defaults to centered, so every label needs this. */
export function drawLeftText(text: string, x: number, y: number, color = "Black"): void {
	MainCanvas.save();
	MainCanvas.textAlign = "left";
	DrawText(text, x, y, color, "Gray");
	MainCanvas.restore();
}

/** Left-aligned text that SHRINKS to fit a width, down to a floor, then gives up and
 * clips. BC's DrawTextFit does the shrinking but centres, and DrawText does neither — so a
 * long blurb simply ran off the right-hand edge of the panel and out of the screen, which
 * it had been doing on the wider tabs for some time. */
export function drawLeftTextFit(text: string, x: number, y: number, maxWidth: number, color = "Black"): void {
	MainCanvas.save();
	MainCanvas.textAlign = "left";
	let size = 36;
	const font = (n: number) => (typeof CommonGetFont === "function" ? CommonGetFont(n) : `${n}px arial`);
	MainCanvas.font = font(size);
	while (size > 22 && MainCanvas.measureText(text).width > maxWidth) {
		size -= 2;
		MainCanvas.font = font(size);
	}
	let out = text;
	if (MainCanvas.measureText(out).width > maxWidth) {
		while (out.length > 1 && MainCanvas.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
		out = `${out}…`;
	}
	MainCanvas.textBaseline = "middle";
	MainCanvas.fillStyle = color;
	MainCanvas.fillText(out, x, y);
	MainCanvas.restore();
}

/** Left-aligned text that WRAPS onto extra lines before it shrinks too far, centred
 * vertically on `yCentre` within `maxHeight`. For prose that has to be read in full: the
 * preset blurbs on the setup wizard went through drawLeftTextFit, whose floor clips with "…",
 * and two of the four were longer than their 1000px column even at that floor in Arial — so
 * nobody could ever read how Balanced or Extreme ended. A player whose font preference is
 * wider (monospace, Verdana-like) lost the end of all four.
 *
 * Tries each size from `maxSize` down to `minSize`, word-wrapping at `maxWidth`, and takes the
 * largest whose lines fit the height. Only if even the floor cannot hold it is the last line
 * clipped with "…" — the same last resort as drawLeftTextFit, reached far later. Returns what
 * it drew, so the suites can check nothing was lost. */
export function drawLeftTextWrap(
	text: string,
	x: number,
	yCentre: number,
	maxWidth: number,
	maxHeight: number,
	color = "Black",
	maxSize = 32,
	minSize = 18,
): { size: number; lines: string[] } {
	MainCanvas.save();
	const font = (n: number) => (typeof CommonGetFont === "function" ? CommonGetFont(n) : `${n}px arial`);
	const pitch = (n: number) => Math.round(n * 1.2);
	let size = maxSize;
	let lines: string[] = [];
	for (; ; size -= 2) {
		MainCanvas.font = font(size);
		lines = wrapToWidth(text, maxWidth);
		if (lines.length * pitch(size) <= maxHeight || size - 2 < minSize) break;
	}
	const room = Math.max(1, Math.floor(maxHeight / pitch(size)));
	if (lines.length > room) {
		lines = lines.slice(0, room);
		let last = lines[room - 1];
		while (last.length > 1 && MainCanvas.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
		lines[room - 1] = `${last}…`;
	}
	MainCanvas.textAlign = "left";
	MainCanvas.textBaseline = "middle";
	MainCanvas.fillStyle = color;
	const first = yCentre - ((lines.length - 1) * pitch(size)) / 2;
	lines.forEach((line, i) => MainCanvas.fillText(line, x, first + i * pitch(size)));
	MainCanvas.restore();
	return { size, lines };
}

/** Word-wraps at the canvas's CURRENT font. A single word wider than the column is left
 * whole rather than hard-split, as wrapText below does for the help screen. */
function wrapToWidth(text: string, maxWidth: number): string[] {
	const out: string[] = [];
	let line = "";
	for (const w of text.split(/\s+/).filter(Boolean)) {
		const trial = line ? `${line} ${w}` : w;
		if (!line || MainCanvas.measureText(trial).width <= maxWidth) line = trial;
		else {
			out.push(line);
			line = w;
		}
	}
	if (line) out.push(line);
	return out.length ? out : [""];
}

/** Left-aligned text at a chosen size. DrawText is locked to BC's 36px; help content needs
 * to be denser than that or almost nothing fits on a page. */
export function drawSmallText(text: string, x: number, y: number, size: number, color = "Black"): void {
	MainCanvas.save();
	MainCanvas.textAlign = "left";
	MainCanvas.textBaseline = "middle";
	MainCanvas.font = typeof CommonGetFont === "function" ? CommonGetFont(size) : `${size}px arial`;
	MainCanvas.fillStyle = color;
	MainCanvas.fillText(text, x, y);
	MainCanvas.restore();
}

/** Draw the tab strip and the content panel as one connected shape.
 *
 * The seam between the active tab and the panel is NEVER DRAWN, rather than drawn and
 * then painted over. A first attempt erased it with a white rectangle and left a visible
 * hairline: canvas strokes are anti-aliased and bleed sub-pixel past their nominal
 * bounds, so a cover rectangle on exact integer coordinates always leaves faint edges.
 *
 * So: inactive tabs are ordinary DrawButtons (hover highlighting comes free), while the
 * active tab is drawn by hand as a white fill plus three border segments — left, top,
 * right, no bottom — and the panel's own top border is drawn in two pieces that stop
 * either side of it. Every border is a filled DrawRect rather than a stroke, so nothing
 * is anti-aliased and the joins are exact. */
export function drawTabsAndPanel(names: readonly string[], activeIndex: number): void {
	const activeTop = tabTop(activeIndex);
	const activeBottom = activeTop + TAB_HEIGHT;
	const panelRight = PANEL_LEFT + PANEL_WIDTH;
	const panelBottom = PANEL_TOP + PANEL_HEIGHT;

	// Panel interior, and the inactive tabs sitting on its edge.
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	names.forEach((name, i) => {
		// TAB_WIDTH + BORDER, not TAB_WIDTH: at exactly TAB_WIDTH the button's own right border
		// lands on the same pixels as the panel's left border and the pair reads as one heavy
		// line running the height of the column. Overlapping by a border hides it under the
		// panel's, the same way the active tab hides its join below.
		if (i !== activeIndex) DrawButton(TAB_LEFT, tabTop(i), TAB_WIDTH + BORDER, TAB_HEIGHT, name, "#d8d8d8");
	});

	// Active tab: white through to the panel interior, so no join is visible at all. Same
	// trick as the horizontal version, turned on its side — the tab is drawn one BORDER wider
	// than it is, so its right edge lands underneath the panel's left edge and neither a
	// hairline nor a doubled line can appear between them.
	DrawRect(TAB_LEFT, activeTop, TAB_WIDTH + BORDER, TAB_HEIGHT, "White");
	DrawRect(TAB_LEFT, activeTop, BORDER, TAB_HEIGHT, "Black"); // left
	DrawRect(TAB_LEFT, activeTop, TAB_WIDTH, BORDER, "Black"); // top
	DrawRect(TAB_LEFT, activeBottom - BORDER, TAB_WIDTH, BORDER, "Black"); // bottom
	DrawTextFit(names[activeIndex], TAB_LEFT + TAB_WIDTH / 2, activeTop + TAB_HEIGHT / 2 + 1, TAB_WIDTH - 32, "black");

	// Panel border: the LEFT side in two pieces that stop either side of the active tab, then
	// the other three whole. Heights clamp to 0 when the active tab is at either end.
	DrawRect(PANEL_LEFT, PANEL_TOP, BORDER, Math.max(0, activeTop - PANEL_TOP), "Black");
	DrawRect(PANEL_LEFT, activeBottom, BORDER, Math.max(0, panelBottom - activeBottom), "Black");
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, BORDER, "Black");
	DrawRect(panelRight - BORDER, PANEL_TOP, BORDER, PANEL_HEIGHT, "Black");
	DrawRect(PANEL_LEFT, panelBottom - BORDER, PANEL_WIDTH, BORDER, "Black");
}

// --- Help text layout: one column, word-wrapped ----------------------------------------
// One column, not two. Two columns halved the width, so nearly every authored line overran
// COLUMN_WIDTH and was cut off with an ellipsis — the whole point of the help is to be read,
// and half of it was "…". A single column across the panel is ~1220px, wide enough that most
// lines fit whole, and the ones that do not WRAP onto a second physical line rather than being
// clipped. Wrapping means a line's height is no longer fixed, so pagination is by vertical
// budget rather than a fixed line count.

export type LineStyle = "head" | "body" | "dim" | "gap";

export interface HelpLine {
	text: string;
	style?: LineStyle;
}

const HELP_LEFT = CONTENT_LEFT;
/** The full content width, edge to edge inside the panel with a small right margin. */
const HELP_WIDTH = PANEL_LEFT + PANEL_WIDTH - CONTENT_LEFT - 40;
const HELP_TOP = 282;
/** Stops clear of the page control, which sits at PANEL bottom - 72. */
const HELP_BOTTOM = PANEL_TOP + PANEL_HEIGHT - 96;
const BODY_SIZE = 24;
const HEAD_SIZE = 26;
/** Blank space before a heading, so groups read as groups. */
const HEAD_LEAD = 18;
/** A "gap" line's own height. */
const GAP_SIZE = 14;

function styleOf(style: LineStyle | undefined): { size: number; color: string } {
	if (style === "head") return { size: HEAD_SIZE, color: "Black" };
	if (style === "dim") return { size: BODY_SIZE, color: "#777" };
	return { size: BODY_SIZE, color: "#222" };
}

function helpFont(size: number): string {
	return typeof CommonGetFont === "function" ? CommonGetFont(size) : `${size}px arial`;
}

/** The band a line of this size occupies — a little more than the glyph height, for leading. */
function lineBand(size: number): number {
	return Math.round(size * 1.34);
}

/** Break `text` into as many pieces as fit HELP_WIDTH at this size. A single word wider than the
 * column is left whole rather than hard-split — it will overhang slightly, which never happens
 * with authored help but is better than an infinite loop. */
function wrapText(text: string, size: number): string[] {
	MainCanvas.save();
	MainCanvas.font = helpFont(size);
	const words = text.split(/\s+/).filter(Boolean);
	const out: string[] = [];
	let line = "";
	for (const w of words) {
		const trial = line ? `${line} ${w}` : w;
		if (!line || MainCanvas.measureText(trial).width <= HELP_WIDTH) line = trial;
		else {
			out.push(line);
			line = w;
		}
	}
	if (line) out.push(line);
	MainCanvas.restore();
	return out.length ? out : [""];
}

interface Placed {
	text: string;
	size: number;
	color: string;
	/** Band centre, since drawSmallText draws on the middle baseline. */
	y: number;
}

/** Wrap every line, then pour the physical rows into pages by vertical budget. Returns one
 * array of placed rows per page. */
function paginateHelp(lines: readonly HelpLine[]): Placed[][] {
	const pages: Placed[][] = [[]];
	let y = HELP_TOP;
	const newPage = () => {
		pages.push([]);
		y = HELP_TOP;
	};
	for (const line of lines) {
		const cur = () => pages[pages.length - 1];
		if (line.style === "gap") {
			// A gap at the top of a page would just waste a strip of it, so it is dropped there.
			if (cur().length) y += GAP_SIZE;
			continue;
		}
		const { size, color } = styleOf(line.style);
		const lead = line.style === "head" ? HEAD_LEAD : 0;
		const segments = wrapText(line.text, size);
		segments.forEach((seg, i) => {
			const band = lineBand(size);
			const gapBefore = i === 0 && cur().length ? lead : 0;
			if (y + gapBefore + band > HELP_BOTTOM && cur().length) newPage();
			const top = y + (cur().length ? gapBefore : 0);
			cur().push({ text: seg, size, color, y: top + band / 2 });
			y = top + band;
		});
	}
	return pages;
}

/** Draw one page of help, single column and word-wrapped. Returns the page count so the caller
 * can draw its own control. */
export function drawHelpLines(lines: readonly HelpLine[], page: number): number {
	const pages = paginateHelp(lines);
	const p = Math.min(Math.max(0, page), pages.length - 1);
	for (const row of pages[p]) {
		if (row.text) drawSmallText(row.text, HELP_LEFT, row.y, row.size, row.color);
	}
	return pages.length;
}

// --- Scrolling ----------------------------------------------------------------------------
// A vertical scroll area for a list that can outgrow its panel (v0.86.0). Before this, a tab
// that ran out of height either split into two cramped columns or, once the columns were full,
// drew its last row under whatever sat below — Self-Touch Control spent v0.84.0 to v0.85.3
// hidden under the attempt button. A list now scrolls instead, and it can grow without anyone
// re-laying out the screen.
//
// The canvas has no scrolling of its own, so this is three pieces that have to agree: the
// content is drawn shifted by `offset` and clipped to the area; clicks are only accepted inside
// the area (a row scrolled out of view must not be clickable where it WOULD be); and a bar down
// the right edge shows how much there is and moves it. The bar is click-driven — arrows at each
// end, the track pages — because BC's canvas has clicks but no drag, and that also serves touch.
// The mouse wheel is wired by the screen (BC's extension-settings hooks do not forward it,
// verified against R132 Extensions.js), through scrollBy below.
export const SCROLLBAR_WIDTH = 44;
const THUMB_MIN = 40;

export interface ScrollArea {
	left: number;
	top: number;
	width: number;
	height: number;
	/** Total height of what is drawn inside, in content coordinates from 0. */
	content: number;
	/** How far down the content is scrolled, 0 .. content - height. */
	offset: number;
	/** One arrow click or wheel notch. */
	step: number;
}

export function scrollMax(a: ScrollArea): number {
	return Math.max(0, a.content - a.height);
}

/** Whether there is anything to scroll. When not, no bar is drawn and nothing moves. */
export function scrollNeeded(a: ScrollArea): boolean {
	return scrollMax(a) > 0;
}

export function clampScroll(a: ScrollArea): void {
	a.offset = Math.min(scrollMax(a), Math.max(0, Math.round(a.offset)));
}

/** Move by `delta` pixels. Returns whether it moved, so a caller can tell an end from a scroll. */
export function scrollBy(a: ScrollArea, delta: number): boolean {
	const before = a.offset;
	a.offset += delta;
	clampScroll(a);
	return a.offset !== before;
}

/** Screen y of something at content y `y`. */
export function scrollY(a: ScrollArea, y: number): number {
	return a.top + y - a.offset;
}

/** Width the content may use: the area less the bar, always reserved so text does not reflow
 * the moment a list crosses the line into scrolling. */
export function scrollContentWidth(a: ScrollArea): number {
	return a.width - SCROLLBAR_WIDTH - 20;
}

export function mouseInScroll(a: ScrollArea): boolean {
	return MouseIn(a.left, a.top, a.width, a.height);
}

/** Whether a rectangle, in screen coordinates, can be seen at all. Rows that cannot are not
 * drawn, so a hidden button cannot raise a hover tooltip from outside the area. */
export function scrollShows(a: ScrollArea, top: number, height: number): boolean {
	return top + height > a.top && top < a.top + a.height;
}

function barLeft(a: ScrollArea): number {
	return a.left + a.width - SCROLLBAR_WIDTH;
}

function thumb(a: ScrollArea): { top: number; height: number } {
	const trackTop = a.top + SCROLLBAR_WIDTH;
	const track = a.height - 2 * SCROLLBAR_WIDTH;
	const height = Math.max(THUMB_MIN, Math.round((track * a.height) / a.content));
	const max = scrollMax(a);
	return { top: trackTop + (max ? Math.round(((track - height) * a.offset) / max) : 0), height };
}

/** Draw the content clipped to the area, then the bar if there is anything to scroll. */
export function drawScrollArea(a: ScrollArea, drawContent: () => void): void {
	clampScroll(a);
	MainCanvas.save();
	MainCanvas.beginPath();
	MainCanvas.rect(a.left, a.top, a.width - SCROLLBAR_WIDTH, a.height);
	MainCanvas.clip();
	drawContent();
	MainCanvas.restore();
	if (!scrollNeeded(a)) return;
	const x = barLeft(a);
	const atTop = a.offset === 0;
	const atEnd = a.offset >= scrollMax(a);
	DrawRect(x, a.top + SCROLLBAR_WIDTH, SCROLLBAR_WIDTH, a.height - 2 * SCROLLBAR_WIDTH, "#eee");
	const t = thumb(a);
	DrawRect(x + 6, t.top, SCROLLBAR_WIDTH - 12, t.height, "#999");
	DrawButton(x, a.top, SCROLLBAR_WIDTH, SCROLLBAR_WIDTH, "▲", atTop ? "#eee" : "White", "", "", atTop);
	DrawButton(x, a.top + a.height - SCROLLBAR_WIDTH, SCROLLBAR_WIDTH, SCROLLBAR_WIDTH, "▼", atEnd ? "#eee" : "White", "", "", atEnd);
}

/** A click on the bar: arrows move one step, the track above or below the thumb moves a page.
 * Returns true when the click was on the bar, moved or not, so it never falls through to a row
 * underneath. */
export function clickScrollBar(a: ScrollArea): boolean {
	if (!scrollNeeded(a) || !MouseIn(barLeft(a), a.top, SCROLLBAR_WIDTH, a.height)) return false;
	const page = Math.max(a.step, a.height - a.step);
	if (MouseY < a.top + SCROLLBAR_WIDTH) scrollBy(a, -a.step);
	else if (MouseY >= a.top + a.height - SCROLLBAR_WIDTH) scrollBy(a, a.step);
	else {
		const t = thumb(a);
		if (MouseY < t.top) scrollBy(a, -page);
		else if (MouseY >= t.top + t.height) scrollBy(a, page);
	}
	return true;
}
