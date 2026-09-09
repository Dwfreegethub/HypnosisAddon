// Shared chrome for our full-screen canvas panels — the settings screen and the help
// screen. Extracted rather than copied: the tab-to-panel join below is fiddly enough that
// two hand-maintained copies would drift, and the hairline it avoids took a release to
// diagnose the first time.

// --- Geometry ------------------------------------------------------------------------
export const TITLE_Y = 110;

export const TAB_TOP = 190;
export const TAB_HEIGHT = 72;
export const TAB_LEFT = 200;
export const TAB_GAP = 8;

/** Tab width, DIVIDED OUT of the panel rather than fixed.
 *
 * It was a constant 280, chosen when there were five tabs. The sixth pushed the row's right
 * edge to x=1920 against a panel that ends at 1800, so the last tab hung outside the box it
 * is supposed to be attached to — visible in the settings screenshot as Stats sticking out
 * past the border. A seventh would have ended at 2208, off a 2000-wide canvas entirely.
 *
 * Computed, the row always ends exactly where the panel does, whatever the count, and the two
 * screens can have different numbers of tabs without either being wrong. DrawTextFit shrinks
 * the labels, so the names go on reading. It stops being enough somewhere around nine, where
 * the text gets too small — that is when tabs move to the left-hand edge, and the arithmetic
 * for it is in the vertical-tabs note below. */
export function tabWidth(count: number): number {
	return (PANEL_WIDTH - (count - 1) * TAB_GAP) / count;
}

// ON MOVING THE TABS TO THE VERTICAL, which DW asked about and which does fit:
//
//   6 tabs x (72 + 8) - 8 = 472 tall, in a panel 640 tall — room for eight, at full width
//   and with the labels never shrinking. Content would start at 200 + 280 + 60 = 540 and run
//   to 1800, so 1260 wide against the 1540 it has now.
//
// Every absolute x in menu.ts shifts by +280, and two places get tight rather than
// impossible: the trigger-decay dropdown (940-1500 becomes 1220-1780, against an 1800 limit)
// and the two-column toggle rows (COLUMN_TWO_LEFT 1000 becomes 1280). Worth doing before
// there are more tabs and more content to move, not after.

export const PANEL_LEFT = 200;
export const PANEL_TOP = 262;
export const PANEL_WIDTH = 1600;
export const PANEL_HEIGHT = 640;
/** Border thickness. Everything is a filled rect rather than a stroke so the tab-to-panel
 * join lands on exact pixels — see drawTabsAndPanel. */
export const BORDER = 3;

export const BLURB_Y = 305;
export const CONTENT_LEFT = 260;

// BC's own Preferences exit icon is DOM/CSS-positioned via ElementMenu, so there is no
// canvas coordinate of its own to copy. This is the raw-canvas convention used by
// Dialog.js and Wardrobe.js, verified against the live client.
export const BACK_LEFT = 1815;
export const BACK_TOP = 75;
export const BACK_SIZE = 90;

export function tabLeft(index: number, count: number): number {
	return TAB_LEFT + index * (tabWidth(count) + TAB_GAP);
}

/** Which tab the mouse is over, or null. */
export function tabHitIndex(count: number): number | null {
	for (let i = 0; i < count; i++) {
		if (MouseIn(tabLeft(i, count), TAB_TOP, tabWidth(count), TAB_HEIGHT)) return i;
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
	const width = tabWidth(names.length);
	const activeLeft = tabLeft(activeIndex, names.length);
	const activeRight = activeLeft + width;
	const panelRight = PANEL_LEFT + PANEL_WIDTH;
	const panelBottom = PANEL_TOP + PANEL_HEIGHT;

	// Panel interior, and the inactive tabs sitting on its edge.
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	names.forEach((name, i) => {
		if (i !== activeIndex) DrawButton(tabLeft(i, names.length), TAB_TOP, width, TAB_HEIGHT, name, "#d8d8d8");
	});

	// Active tab: white through to the panel interior, so no join is visible at all.
	DrawRect(activeLeft, TAB_TOP, width, TAB_HEIGHT + BORDER, "White");
	DrawRect(activeLeft, TAB_TOP, width, BORDER, "Black"); // top
	DrawRect(activeLeft, TAB_TOP, BORDER, TAB_HEIGHT, "Black"); // left
	DrawRect(activeRight - BORDER, TAB_TOP, BORDER, TAB_HEIGHT, "Black"); // right
	DrawTextFit(names[activeIndex], activeLeft + width / 2, TAB_TOP + TAB_HEIGHT / 2 + 1, width - 4, "black");

	// Panel border: top in two pieces that stop either side of the active tab, then the
	// other three sides whole. Widths clamp to 0 when the active tab is at either end.
	DrawRect(PANEL_LEFT, PANEL_TOP, Math.max(0, activeLeft - PANEL_LEFT), BORDER, "Black");
	DrawRect(activeRight, PANEL_TOP, Math.max(0, panelRight - activeRight), BORDER, "Black");
	DrawRect(PANEL_LEFT, PANEL_TOP, BORDER, PANEL_HEIGHT, "Black");
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

const COLUMN_LEFTS = [CONTENT_LEFT, 1040];
const COLUMN_WIDTH = 700;
const LINE_TOP = 352;
const LINE_HEIGHT = 32;
/** Extra breathing room above a heading, so groups read as groups. */
const HEAD_LEAD = 14;
const BODY_SIZE = 24;
const HEAD_SIZE = 26;
/** Leaves room for the page control along the panel floor.
 *
 * 16 put the last line at y=832 — and 846 when it was a heading, which carries a lead —
 * against page buttons at 830. 14 stops the text at 782, two clear lines above them. */
const LINES_PER_COLUMN = 14;

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
