// The help screen's single-column, word-wrapped layout (v0.69.0).
//
// The two-column version cut nearly every line off with "…" and let headings overlap the body.
// This drives the real drawHelpLines through a stubbed canvas and asserts the three things that
// were wrong: nothing is drawn wider than the column, nothing is drawn off the bottom of the
// panel, and long content paginates instead of piling up. A fake measureText stands in for BC's —
// the ratio does not have to match BC, only be consistent, since every assertion is relative to
// the same measure the layout used.
const FONT_RE = /(\d+)px/;
let curSize = 24;
const drawn = []; // {text, x, y, width}

globalThis.MainCanvas = {
	save() {}, restore() {},
	set font(f) { const m = FONT_RE.exec(f); curSize = m ? Number(m[1]) : 24; },
	get font() { return `${curSize}px arial`; },
	measureText(t) { return { width: t.length * curSize * 0.5 }; },
	// drawSmallText sets textAlign/textBaseline/fillStyle then fillText — capture the draw.
	set textAlign(_v) {}, set textBaseline(_v) {}, set fillStyle(_v) {},
	fillText(text, x, y) { drawn.push({ text, x, y, width: text.length * curSize * 0.5 }); },
};
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { panel } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// Geometry the layout uses, recomputed from the panel's own exported constants.
const HELP_LEFT = panel.CONTENT_LEFT;
const HELP_WIDTH = panel.PANEL_LEFT + panel.PANEL_WIDTH - panel.CONTENT_LEFT - 40;
const PANEL_BOTTOM = panel.PANEL_TOP + panel.PANEL_HEIGHT;

const render = (lines, page) => {
	drawn.length = 0;
	const pages = panel.drawHelpLines(lines, page);
	return { pages, rows: [...drawn] };
};

// --- a single wide line is WRAPPED, not clipped ---------------------------------------------
const longText = "This is a deliberately long help line that in the old two-column layout would have run well past the column edge and been cut off with an ellipsis instead of wrapping onto the next line where it belongs.";
{
	const { rows } = render([{ text: longText, style: "body" }], 0);
	check("a long line becomes more than one row", rows.length > 1, true);
	check("  and no piece ends in the clip ellipsis", rows.some((r) => r.text.endsWith("…")), false);
	check("  every piece fits the column width", rows.every((r) => r.width <= HELP_WIDTH + 0.01), true);
	check("  all drawn at the single column's left edge", rows.every((r) => r.x === HELP_LEFT), true);
	check("  wrapped pieces stack downward, never overlapping", rows.every((r, i) => i === 0 || r.y > rows[i - 1].y), true);
}

// --- one column: everything shares one x ----------------------------------------------------
{
	const lines = [
		{ text: "First heading", style: "head" },
		{ text: "Body under it", style: "body" },
		{ text: "A dim aside", style: "dim" },
	];
	const { rows } = render(lines, 0);
	check("no second column — one x for all", new Set(rows.map((r) => r.x)).size, 1);
	check("  a heading and its body do not collide", rows[1].y - rows[0].y >= 20, true);
}

// --- long content paginates, and each page stays inside the panel ----------------------------
{
	const many = [];
	for (let i = 0; i < 60; i++) many.push({ text: `Line number ${i} with a little text after it`, style: i % 5 === 0 ? "head" : "body" });
	const first = render(many, 0);
	check("sixty lines need more than one page", first.pages > 1, true);
	check("  page 1 is not empty", first.rows.length > 0, true);
	check("  nothing on page 1 is drawn below the panel floor", first.rows.every((r) => r.y < PANEL_BOTTOM), true);
	const last = render(many, first.pages - 1);
	check("  the last page also renders", last.rows.length > 0, true);
	check("  and stays inside the panel", last.rows.every((r) => r.y < PANEL_BOTTOM), true);
	// A page past the end clamps rather than drawing blank.
	const beyond = render(many, 999);
	check("  a page past the end clamps to the last", beyond.rows.length, last.rows.length);
}

// --- a gap line never renders as text --------------------------------------------------------
{
	const { rows } = render([{ text: "A", style: "body" }, { style: "gap" }, { text: "B", style: "body" }], 0);
	check("gap draws nothing but spaces the two lines", rows.map((r) => r.text), ["A", "B"]);
	check("  and B sits below A with the gap between", rows[1].y - rows[0].y >= 40, true);
}

// --- v1.16.37 (review F8): paragraphs, the full width, and pages that break between them ---------
// Failure looked like: the text hand-wrapped at about 70 characters, using the left half of the box,
// and a page ending mid-sentence ("…choose Agree, Ignore or" | next page).
{
	const join = panel.joinHelpParagraphs;
	const j = join([
		{ text: "Almost nothing here is a command. You SPEAK to someone, and their" },
		{ text: "own client decides whether anything lands." },
		{ text: "2. Someone attempts hypnosis; you privately choose Agree, Ignore or" },
		{ text: "   Fight. They are never told which." },
		{ text: "  3. a numbered item" },
		{ text: '"Missy, kneel" ← an example' },
		{ text: "/echs safeword, a command" },
		{ text: "Drifting (0+) — barely under", keep: true },
		{ text: "Yielding (20+) — affected", keep: true },
		{ text: "A dim line", style: "dim" },
	]);
	check("hand-wrapped lines rejoin into paragraphs", j.map((l) => l.text), [
		"Almost nothing here is a command. You SPEAK to someone, and their own client decides whether anything lands.",
		"2. Someone attempts hypnosis; you privately choose Agree, Ignore or Fight. They are never told which.",
		"  3. a numbered item",
		'"Missy, kneel" ← an example',
		"/echs safeword, a command",
		"Drifting (0+) — barely under",
		"Yielding (20+) — affected",
		"A dim line",
	]);
	const { rows } = render([{ text: "A sentence that was hand-wrapped at seventy characters for the old" }, { text: "layout runs on now, so the paragraph uses the full width of the help box rather than half." }], 0);
	check("  and use the full width", rows[0].width > HELP_WIDTH * 0.75, true);
	// Every real help tab: no paragraph split across pages (when it fits one), no heading left alone.
	const { help } = await import("./harness-bundle.mjs");
	const split = [], orphans = [];
	for (const name of help.helpTabNames()) {
		const lines = help.helpLinesFor(name);
		const paras = join(lines).filter((l) => l.style !== "gap");
		const n = render(lines, 0).pages;
		const pageOf = new Map();
		for (let p = 0; p < n; p++) for (const r of render(lines, p).rows) if (!pageOf.has(r.text)) pageOf.set(r.text, p);
		for (let p = 0; p < n; p++) {
			const rows = render(lines, p).rows;
			const lastRow = rows.at(-1);
			if (p < n - 1 && paras.some((l) => l.style === "head" && l.text === lastRow?.text)) orphans.push(`${name} p${p + 1}: ${lastRow.text}`);
		}
		// A paragraph's first and last rows on different pages = split.
		for (let p = 0; p < n - 1; p++) {
			const last = render(lines, p).rows.at(-1)?.text ?? "";
			const next = render(lines, p + 1).rows[0]?.text ?? "";
			const para = paras.find((l) => l.text.includes(last) && l.text.includes(next) && l.text.indexOf(next) > l.text.indexOf(last));
			if (para) split.push(`${name} p${p + 1}: …${last.slice(-30)} | ${next.slice(0, 30)}…`);
		}
	}
	check("help: no paragraph split across a page", split, []);
	check("  no heading left alone at the bottom of a page", orphans, []);
}

console.log(`help-layout: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
