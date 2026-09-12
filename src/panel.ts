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
