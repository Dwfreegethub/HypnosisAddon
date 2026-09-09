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
		if (i !== activeIndex) DrawButton(TAB_LEFT, tabTop(i), TAB_WIDTH, TAB_HEIGHT, name, "#d8d8d8");
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

// --- Two-column text layout ----------------------------------------------------------
// The help screen is mostly prose in short lines. Two columns rather than one because the
// panel is 1600 wide and a single column of 16 lines wastes half the screen and forces
// pagination on content that would otherwise fit whole.

export type LineStyle = "head" | "body" | "dim" | "gap";

export interface HelpLine {
	text: string;
	style?: LineStyle;
}

// Both columns are offsets from CONTENT_LEFT now, and 100px narrower each: the tab column
// took 280px off the panel, and two 700-wide columns no longer fit in what is left. The cost
// is real — clip() trims to COLUMN_WIDTH, so a few more help lines will end in an ellipsis.
// The 72px the panel gained at the top would buy two more lines per column back; that means
// moving BLURB_Y, which both screens share, so it is deliberately a separate change.
const COLUMN_LEFTS = [CONTENT_LEFT, CONTENT_LEFT + 640];
const COLUMN_WIDTH = 600;
const LINE_TOP = 282;
const LINE_HEIGHT = 32;
/** Extra breathing room above a heading, so groups read as groups. */
const HEAD_LEAD = 14;
const BODY_SIZE = 24;
const HEAD_SIZE = 26;
/** Leaves room for the page control along the panel floor.
 *
 * Was 14, when LINE_TOP was 352 and 16 put the last line at y=832 — 846 with a heading's
 * lead — against page buttons at 830. The panel now starts 72px higher and LINE_TOP with it,
 * so 16 lands at 762 (776 with the lead) against buttons at 830: the two lines that the
 * narrower columns cost, given back. */
const LINES_PER_COLUMN = 16;

function styleOf(style: LineStyle | undefined): { size: number; color: string } {
	if (style === "head") return { size: HEAD_SIZE, color: "Black" };
	if (style === "dim") return { size: BODY_SIZE, color: "#777" };
	return { size: BODY_SIZE, color: "#222" };
}

/** Fit `text` to COLUMN_WIDTH by trimming and appending an ellipsis. Cheaper and steadier
 * than wrapping: every help line is authored short, and a line that silently rewrapped
 * would shift everything below it out of its column. */
function clip(text: string, size: number): string {
	MainCanvas.save();
	MainCanvas.font = typeof CommonGetFont === "function" ? CommonGetFont(size) : `${size}px arial`;
	let out = text;
	if (MainCanvas.measureText(out).width > COLUMN_WIDTH) {
		while (out.length > 1 && MainCanvas.measureText(`${out}…`).width > COLUMN_WIDTH) out = out.slice(0, -1);
		out = `${out}…`;
	}
	MainCanvas.restore();
	return out;
}

/** Lay lines out into two columns, paginating if they overrun. Returns the page count so
 * the caller can draw its own page control. */
export function drawHelpLines(lines: readonly HelpLine[], page: number): number {
	const perPage = LINES_PER_COLUMN * COLUMN_LEFTS.length;
	const pages = Math.max(1, Math.ceil(lines.length / perPage));
	const start = Math.min(page, pages - 1) * perPage;
	const slice = lines.slice(start, start + perPage);

	slice.forEach((line, i) => {
		if (line.style === "gap") return;
		const column = Math.floor(i / LINES_PER_COLUMN);
		const row = i % LINES_PER_COLUMN;
		const { size, color } = styleOf(line.style);
		// A heading gets its lead only when it isn't the first line of its column, so the
		// two columns stay on the same baselines.
		const lead = line.style === "head" && row > 0 ? HEAD_LEAD : 0;
		drawSmallText(
			clip(line.text, size),
			COLUMN_LEFTS[column],
			LINE_TOP + row * LINE_HEIGHT + lead,
			size,
			color,
		);
	});
	return pages;
}
