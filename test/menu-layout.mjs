// The settings screen's checkbox lists: one column, scrolling (v0.86.0).
//
// v0.85.4: the thirteenth permission row made the Permissions tab's left column seven deep, and
// its last checkbox — Self-Touch Control — was drawn under the attempt-limit button, where it
// could be neither seen nor clicked. v0.85.4 moved the button into the one free slot; v0.86.0
// replaced the two-column layout with a scroll area so a list can keep growing.
//
// This drives the REAL settings screen (installMenu → BC's extension-settings hooks) through
// stubbed drawing primitives, recording every checkbox, button and line of text and the clip
// rectangle each was drawn under. It asserts that nothing overlaps, that the list is clipped to
// an area inside the panel, that the bar and the wheel move it, and — the part a scroll area
// most easily gets wrong — that clicks land where things are DRAWN: on a row after scrolling,
// and never on the clipped-off part of a row that is only half in view.
const FONT_RE = /(\d+)px/;
let curSize = 36;
let clip = null;       // the active clip rectangle, or null
const saved = [];      // save()/restore() stack, as the real canvas keeps one
let pendingRect = null;
const boxes = [];      // DrawCheckbox
const buttons = [];    // DrawButton
const texts = [];      // our own fillText (drawLeftTextFit / drawLeftTextWrap)
const rects = [];      // fillRect: the hover tip's box
const reset = () => { boxes.length = 0; buttons.length = 0; texts.length = 0; rects.length = 0; };

const wheelListeners = new Set();
globalThis.MainCanvas = {
	save() { saved.push(clip); }, restore() { clip = saved.pop() ?? null; },
	beginPath() {}, rect(l, t, w, h) { pendingRect = { left: l, top: t, width: w, height: h }; }, clip() { clip = pendingRect; },
	set font(f) { const m = FONT_RE.exec(f); curSize = m ? Number(m[1]) : 36; },
	get font() { return `${curSize}px arial`; },
	// Roughly Arial's average advance; every assertion is relative to the same measure.
	measureText(t) { return { width: t.length * curSize * 0.5 }; },
	set textAlign(_v) {}, set textBaseline(_v) {}, set fillStyle(_v) {}, set lineWidth(_v) {}, set strokeStyle(_v) {},
	fillRect(l, t, w, h) { rects.push({ left: l, top: t, width: w, height: h, clip }); }, strokeRect() {},
	fillText(text, x, y) { texts.push({ text, left: x, width: text.length * curSize * 0.5, top: y - curSize / 2, height: curSize, clip }); },
	canvas: {
		addEventListener(type, fn) { if (type === "wheel") wheelListeners.add(fn); },
		removeEventListener(type, fn) { if (type === "wheel") wheelListeners.delete(fn); },
	},
};
globalThis.MainCanvasWidth = 2000;
globalThis.MainCanvasHeight = 1000;
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.DrawCheckbox = (left, top, width, height, _t, checked, disabled) => boxes.push({ left, top, width, height, checked, disabled, clip });
globalThis.DrawButton = (left, top, width, height, label, _c, _i, hover) => buttons.push({ left, top, width, height, label, hover, clip });
for (const n of ["DrawText", "DrawTextFit", "DrawRect", "DrawEmptyRect", "DrawImage", "DrawImageResize", "DrawTextWrap"]) globalThis[n] = () => {};
globalThis.MouseX = 0;
globalThis.MouseY = 0;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;
globalThis.PreferenceSubscreenExtensionsClear = () => {};
// The Triggers tab's dropdowns are DOM; only their existence matters here.
const elements = {};
globalThis.document = { getElementById: (id) => elements[id] ?? null };
globalThis.ElementCreateDropdown = (id) => (elements[id] = { selectedIndex: 0, disabled: false });
globalThis.ElementCreateInput = (id) => (elements[id] = { value: "", disabled: false, addEventListener() {}, setAttribute() {} });
globalThis.ElementCreateDropdown = (id, _options, onChange) => (elements[id] = { selectedIndex: 0, disabled: false, onChange, addEventListener() {}, setAttribute() {} });
/** Where each DOM control was last put, centre and size, in canvas coordinates. */
const placed = {};
globalThis.ElementPosition = (id, x, y, w, h) => { placed[id] = { x, y, w, h }; };
globalThis.ElementNumberInputWheel = () => {};
globalThis.ElementRemove = (id) => { delete elements[id]; };
let screen = null;
globalThis.PreferenceRegisterExtensionSetting = (s) => { screen = s; };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomData = null;

const { menu, storage, panel } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const PANEL_BOTTOM = panel.PANEL_TOP + panel.PANEL_HEIGHT;
const PANEL_RIGHT = panel.PANEL_LEFT + panel.PANEL_WIDTH;
const BODY_TOP = panel.BLURB_Y + 25; // below the tab's blurb line
const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const inside = (r, c) => r.left >= c.left && r.top >= c.top && r.left + r.width <= c.left + c.width && r.top + r.height <= c.top + c.height;

storage.setStarterState("done"); // past the setup wizard, onto the tabs
menu.installMenu();
check("the settings screen registered", typeof screen?.run, "function");
screen.load();
check("load listens for the wheel", wheelListeners.size, 1);

const frame = () => { reset(); screen.run(); };
const clickAt = (x, y) => { MouseX = x; MouseY = y; screen.click(); };
const openTab = (i) => clickAt(panel.TAB_LEFT + 20, panel.tabTop(i) + 30);
const up = () => buttons.find((b) => b.label === "▲");
const down = () => buttons.find((b) => b.label === "▼");
const wheel = (deltaY) => { for (const fn of wheelListeners) fn({ deltaY }); };
// Text drawn under the list's clip: the row labels (and, at the end, the attempt caption). The
// blurb and the chrome are not clipped.
const rowLabels = () => texts.filter((t) => t.clip);

// --- Permissions: fixed rows, headings, the list (v0.100.0, job3.md) ---------------------------
// Hypnosis Enabled and the settings lock sit ABOVE the list, outside its clip, always in view; the
// rest scroll under four group headings. Failure: a fixed row inside the clip, overlapping the
// list or each other; a heading missing or out of order; anything in the list overlapping.
frame();
const fixedBoxes = () => boxes.filter((b) => !b.clip);
const listBoxes = () => boxes.filter((b) => b.clip);
const FIXED_LABELS = ["Hypnosis Enabled", "Lock settings while a session is on you"];
const HEADINGS = ["Body", "Voice & senses", "Touch & arousal", "Mind"];
check("two fixed checkboxes above the list", fixedBoxes().length, 2);
check("  labelled, outside the clip", texts.filter((t) => !t.clip && FIXED_LABELS.includes(t.text)).map((t) => t.text), FIXED_LABELS);
const area = listBoxes()[0]?.clip;
check("the rest are drawn under a clip", !!area, true);
check("  every list checkbox under the same clip", listBoxes().every((b) => b.clip === area), true);
check("  the fixed rows sit above it, clear of it", fixedBoxes().every((b) => b.top + b.height <= area.top), true);
check("  the fixed rows side by side, apart", fixedBoxes()[0].top === fixedBoxes()[1].top && !overlaps(fixedBoxes()[0], fixedBoxes()[1]), true);
check("  the clip is inside the panel", inside(area, { left: panel.PANEL_LEFT, top: BODY_TOP - 10, width: panel.PANEL_WIDTH, height: panel.PANEL_HEIGHT }), true);
check("  and stops 20px above its floor", area.top + area.height <= PANEL_BOTTOM - 20, true);
check("a scroll bar is drawn (the list does not fit)", [!!up(), !!down()], [true, true]);
check("  the bar is outside the clipped list", !overlaps(up(), area) && !overlaps(down(), area), true);
check("the list starts with the Body heading", rowLabels()[0]?.text, "Body");
{
	const shown = [...listBoxes().map((b) => ({ name: "box", ...b })), ...rowLabels().map((t) => ({ name: t.text, ...t }))];
	const hits = [];
	for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (overlaps(shown[i], shown[j])) hits.push(`${shown[i].name}@${shown[i].top} × ${shown[j].name}@${shown[j].top}`);
	check("nothing drawn in the list overlaps", hits, []);
	check("every label ends before the scroll bar", rowLabels().every((t) => t.left + t.width <= up().left), true);
	check("nothing is drawn wholly outside the clip", shown.filter((r) => !overlaps(r, area)).map((r) => r.name), []);
}

// The whole list, read top to bottom by wheeling through it.
const ORDER = [
	"Body", "Movement Restriction", "Posture Control", "Follow / Leash", "Clothing Restriction", "Undressing",
	"Voice & senses", "Speech Restriction", "Made to Speak (a trigger says words for you)",
	"Hearing (hear only one voice, or only your name)", "Sight (dimmed, very dark, or blind)",
	"Touch & arousal", "Self-Touch Control", "Made to Act (touch yourself on command)", "Made to Touch Others", "Arousal & Orgasm",
	"Mind", "Clothing Illusion (you see old clothes)",
];
{
	const seen = [];
	MouseX = area.left + 200; MouseY = area.top + 100;
	for (let i = 0; i < 20; i++) wheel(-100);
	for (let i = 0; i < 30; i++) {
		frame();
		for (const t of rowLabels()) if (!seen.includes(t.text)) seen.push(t.text);
		wheel(100);
	}
	check("the list, in its groups and order", seen, ORDER);
	check("the moved controls are not on Permissions any more",
		seen.some((t) => /^Attempts before|^When someone tries|^Toy mode/.test(t)), false);
	for (let i = 0; i < 30; i++) wheel(-100);
	frame();
}

// --- a row half out of view is clickable only where it shows --------------------------------
{
	const cut = listBoxes().find((b) => b.top < area.top + area.height && b.top + b.height > area.top + area.height);
	check("a row is cut by the bottom of the area on the first screen", !!cut, true);
	const before = JSON.stringify(storage.getFeatures());
	clickAt(cut.left + cut.width / 2, area.top + area.height + 5);
	check("  a click on its clipped-off part does nothing", JSON.stringify(storage.getFeatures()), before);
}

// --- the fixed rows toggle where they are drawn -----------------------------------------------
{
	for (const [i, key] of [[0, "hypnoEnabled"], [1, "lockedWhileHypnotized"]]) {
		frame();
		const b = fixedBoxes()[i];
		const before = storage.getFeatures()[key];
		clickAt(b.left + b.width / 2, b.top + b.height / 2);
		check(`fixed row ${key} toggles where it is drawn`, storage.getFeatures()[key], !before);
		clickAt(b.left + b.width / 2, b.top + b.height / 2);
	}
}

// --- every list row toggles where it is drawn, reached by the down arrow ----------------------
const ROWS = [
	["movementRestriction", "Movement Restriction"], ["postureControl", "Posture Control"],
	["followControl", "Follow / Leash"], ["clothingRestriction", "Clothing Restriction"], ["undressControl", "Undressing"],
	["speechRestriction", "Speech Restriction"], ["forcedSpeech", "Made to Speak (a trigger says words for you)"],
	["hearingControl", "Hearing (hear only one voice, or only your name)"], ["sightControl", "Sight (dimmed, very dark, or blind)"],
	["selfTouchControl", "Self-Touch Control"], ["compelActivity", "Made to Act (touch yourself on command)"],
	["arousalControl", "Arousal & Orgasm"], ["illusionControl", "Clothing Illusion (you see old clothes)"],
];
/** The list checkbox drawn level with this label, if it is wholly in view. */
const boxFor = (label) => {
	const t = rowLabels().find((x) => x.text === label);
	return t && listBoxes().find((b) => Math.abs(b.top + 26 - (t.top + t.height / 2)) < 2 && inside(b, area));
};
const initial = { ...storage.getFeatures() };
const problems = [];
let arrowClicks = 0;
for (const [key, label] of ROWS) {
	frame();
	let box = boxFor(label);
	for (let guard = 0; !box && guard < 30 && down(); guard++) {
		clickAt(down().left + down().width / 2, down().top + down().height / 2);
		arrowClicks++;
		frame();
		box = boxFor(label);
	}
	if (!box) { problems.push(`${key} never came fully into view`); continue; }
	clickAt(box.left + box.width / 2, box.top + box.height / 2);
	const changed = ROWS.map(([k]) => k).concat(["compelTouchOthers"]).filter((k) => storage.getFeatures()[k] !== initial[k]);
	if (JSON.stringify(changed) !== JSON.stringify([key])) problems.push(`clicking ${label} changed [${changed}]`);
	clickAt(box.left + box.width / 2, box.top + box.height / 2);
}
check("every list checkbox toggles where it is drawn after scrolling", problems, []);
check("  and the down arrow did the scrolling", arrowClicks > 0, true);

// --- Made to Touch Others: indented under Made to Act, inert while it is off ---------------------
// Failure: drawn level with Made to Act, clickable while Made to Act is off, or still inert once on.
{
	storage.setFeature("compelActivity", false);
	storage.setFeature("compelTouchOthers", false);
	frame();
	for (let guard = 0; guard < 30 && !boxFor("Made to Touch Others"); guard++) { clickAt(down().left + 5, down().top + 5); frame(); }
	const others = boxFor("Made to Touch Others");
	const act = boxFor("Made to Act (touch yourself on command)");
	check("Touch Others is indented under Made to Act", !!others && !!act && others.left > act.left, true);
	check("  greyed while Made to Act is off", others?.disabled, true);
	clickAt(others.left + others.width / 2, others.top + others.height / 2);
	check("  and a click does nothing", storage.getFeatures().compelTouchOthers, false);
	storage.setFeature("compelActivity", true);
	frame();
	const live = boxFor("Made to Touch Others");
	check("  live once Made to Act is on", live?.disabled, false);
	clickAt(live.left + live.width / 2, live.top + live.height / 2);
	check("  and then toggles", storage.getFeatures().compelTouchOthers, true);
	storage.setFeature("compelTouchOthers", false);
	storage.setFeature("compelActivity", false);
}

// --- the up arrow and the wheel --------------------------------------------------------------
{
	frame();
	const firstBefore = rowLabels()[0].text;
	clickAt(up().left + up().width / 2, up().top + up().height / 2);
	frame();
	check("the up arrow moves the list back", rowLabels()[0].text !== firstBefore, true);
	MouseX = area.left + 200; MouseY = area.top + 100;
	for (let i = 0; i < 30; i++) { wheel(-100); frame(); }
	check("the wheel scrolls to the top", rowLabels()[0].text, "Body");
	const firstBox = listBoxes()[0].top;
	wheel(100); frame();
	check("one wheel notch is one row", listBoxes()[0].top, firstBox - 78);
	MouseX = 100; MouseY = 500;
	const top = listBoxes()[0].top;
	wheel(100); frame();
	check("the wheel does nothing with the pointer outside the list", listBoxes()[0].top, top);
	MouseX = area.left + 200; MouseY = area.top + 100;
	for (let i = 0; i < 30; i++) wheel(-100);
}

// --- Inductions (v0.100.0, job3.md §2A): attempts, answering for you, toy mode, sink deeper ------
openTab(1); frame();
{
	// No checkboxes: the controls scroll in their own area, which has to be reached by the wheel.
	const attempt0 = buttons.find((b) => b.label.startsWith("Attempts before they must wait"));
	check("Inductions: the attempt control comes first", !!attempt0, true);
	const iarea = attempt0.clip;
	check("  under a clip inside the panel", !!iarea && inside(iarea, { left: panel.PANEL_LEFT, top: BODY_TOP - 10, width: panel.PANEL_WIDTH, height: panel.PANEL_HEIGHT }), true);
	check("  no checkboxes on this tab", boxes.length, 0);
	const caption = texts.filter((t) => /run out|ten minutes/.test(t.text));
	check("  its caption is whole", caption.map((t) => t.text).join(" "), "When they run out, they cannot try you again for ten minutes.");
	const before = storage.getMaxAttempts();
	clickAt(attempt0.left + attempt0.width / 2, attempt0.top + attempt0.height / 2);
	check("  the attempt button cycles where it is drawn", storage.getMaxAttempts() !== before, true);
	clickAt(attempt0.left + attempt0.width / 2, attempt0.top + attempt0.height / 2);

	MouseX = iarea.left + 200; MouseY = iarea.top + 100;
	for (let i = 0; i < 40; i++) { wheel(100); frame(); }
	const starts = ["When someone tries to hypnotize me:", "When I'm away:", "Toy mode:", '"Sink deeper" stops at:'];
	const found = starts.map((s) => buttons.find((b) => b.label.startsWith(s)));
	check("  the four cycle buttons are drawn, at the end", found.map((b) => !!b), [true, true, true, true]);
	check("  wholly in view", found.every((b) => b && inside(b, iarea)), true);
	check("  in order, none overlapping", found.every((b, i) => i === 0 || b.top >= found[i - 1].top + found[i - 1].height), true);
	const read = () => [storage.getDefaultStance(), storage.getAwayStance(), storage.getToyMode(), storage.getDeepestTier(), storage.getToyScope()];
	const changed = found.map((b) => {
		const was = read();
		clickAt(b.left + b.width / 2, b.top + b.height / 2);
		return read().map((v, i) => v !== was[i]);
	});
	check("  each changes its own setting and no other", changed, [
		[true, false, false, false, false],
		[false, true, false, false, false],
		[false, false, true, false, false],
		[false, false, false, true, false],
	]);
	const toy = elements.HypnosisAddonToyScope;
	const at = placed.HypnosisAddonToyScope;
	check("who toy mode is for is a dropdown", !!toy, true);
	check("  labelled", texts.some((t) => t.text === "Toy mode is for:" && inside(t, iarea)), true);
	check("  between the toy mode and sink deeper buttons", !!at && at.y - at.h / 2 >= found[2].top + found[2].height && at.y + at.h / 2 <= found[3].top, true);
	check("  showing the default, Owner and Lovers", toy.selectedIndex, 1);
	toy.selectedIndex = 5;
	toy.onChange.call(toy);
	check("  choosing saves it", storage.getToyScope(), "everyone");
	// The tab is short, so at the top the dropdown may still be in view. The rule is that it exists
	// exactly when its row is wholly inside the area (DOM cannot be clipped). Failure: present while
	// its row is cut or hidden, or missing while its row is in view.
	for (let i = 0; i < 40; i++) wheel(-100);
	frame();
	const label = texts.find((t) => t.text === "Toy mode is for:");
	const rowInView = !!label && label.top >= iarea.top && label.top + label.height <= iarea.top + iarea.height;
	check("  at the top, present exactly when its row is in view", !!elements.HypnosisAddonToyScope, rowInView);
	for (let i = 0; i < 40; i++) { wheel(100); frame(); }
	check("  and present at the end, where it is in view", !!elements.HypnosisAddonToyScope, true);
	// The hover tip (v0.97.4). Failure: shrunk onto one line, cut by the clip, or under other text.
	const away = buttons.find((b) => b.label.startsWith("When I'm away:"));
	MouseX = away.left + 40; MouseY = away.top + away.height / 2;
	frame();
	const tipBox = rects.at(-1);
	const tipLines = texts.filter((t) => tipBox && inside(t, tipBox));
	check("a long hover tip gets a box of its own", !!tipBox && tipBox.clip === null, true);
	check("  wrapped onto more than one line", tipLines.length > 1, true);
	check("  at a readable size, every line", tipLines.every((t) => t.height >= 26), true);
	check("  drawn last, over everything", texts.slice(-tipLines.length).every((t) => tipLines.includes(t)), true);
	check("  and BC's own one-line tip not drawn under it", buttons.find((b) => b.label.startsWith("When I'm away:")).hover, "");
	MouseX = 5; MouseY = 5;
	frame();
	check("  gone when the pointer leaves", rects.some((r) => r.width === 450), false);
	storage.setDefaultStance("prompt");
	storage.setAwayStance("refuse");
	storage.setToyMode(false);
	storage.setToyScope("lovers");
	storage.setDeepestTier("entranced");
}
// "Sink deeper" left the Depth tab. Failure: it is drawn in both places.
openTab(6); frame();
check("Depth no longer draws the sink deeper button", buttons.some((b) => /Sink deeper/.test(b.label)), false);
check("  the skill button stays on Depth (DW)", buttons.some((b) => b.label.startsWith("A hypnotist's skill:")), true);
// v0.100.2 (Veronica, 09-19): a locked player can still turn the Depth pages; paging only reads.
// Failure: Next does nothing while locked (the v0.100.1 bug), or a locked click changes a depth.
{
	const firstGate = () => texts.find((t) => t.top > 260 && t.top < 320 && t.left < panel.CONTENT_LEFT + 100)?.text;
	storage.startExtremeLock("trial");
	frame();
	const page1 = firstGate();
	const next = buttons.find((b) => b.label === "Next");
	clickAt(next.left + 5, next.top + 5); frame();
	check("locked: Next still turns the Depth page", firstGate() !== page1, true);
	const prev = buttons.find((b) => b.label === "Prev");
	clickAt(prev.left + 5, prev.top + 5); frame();
	check("  and Prev turns it back", firstGate(), page1);
	const minus = buttons.find((b) => b.label === "-5");
	const before = storage.getDepthOverride("suppressBondage");
	clickAt(minus.left + 5, minus.top + 5); frame();
	const plus = buttons.find((b) => b.label === "+5");
	clickAt(plus.left + 5, plus.top + 5); frame();
	check("  but -5 / +5 still change nothing while locked", storage.getDepthOverride("suppressBondage"), before);
	storage.clearExtremeLock();
	frame();
}

// --- tabs that fit, and the tab with DOM controls under its rows -----------------------------
openTab(3); frame(); // Awareness: four rows
check("another tab: the toy mode dropdown goes", !!elements.HypnosisAddonToyScope, false);
check("a tab that fits has no scroll bar", [!!up(), !!down()], [false, false]);
check("  and its rows start at the top again", rowLabels()[0].text, "Clothing Changes");
openTab(2); frame(); // Trance Defaults: seven rows, once two columns
check("Trance Defaults is one column now", new Set(boxes.map((b) => b.left)).size, 1);
check("  and fits without scrolling", !!down(), false);
openTab(4); frame(); // Triggers
check("Triggers' rows stop above its dropdowns at 630", boxes[0].clip.top + boxes[0].clip.height <= 630, true);
// Five rows since v0.87.0 (whole-words matching): four fit above the dropdowns, and the list
// scrolls to the fifth rather than running under them.
check("  four fit wholly in view", boxes.filter((b) => inside(b, b.clip)).length, 4);
check("  and a scroll bar reaches the fifth", !!down(), true);
// v0.90.0: the drop-trigger control scrolls in after the rows, as the attempt control does on
// Inductions. Failure: it cannot be reached, or clicking it does not cycle the setting.
{
	for (let i = 0; i < 10; i++) { const d = down(); if (d) clickAt(d.left + 5, d.top + 5); frame(); }
	const drop = buttons.find((b) => /^Drop triggers: /.test(b.label));
	check("  the Drop triggers control scrolls into view", !!drop && inside(drop, drop.clip), true);
	check("    and reads Off by default", drop?.label, "Drop triggers: Off");
	clickAt(drop.left + 5, drop.top + 5); frame();
	check("    a click cycles it to One time", storage.getDropMode(), "once");
	storage.setDropMode("off");
}

// --- Planted (v0.88.0): the trigger inspector -------------------------------------------------
{
	const plantedTab = 5;
	const t = (phrase, by) => ({ phrase, actions: ["movement-block"], installedBy: by, installedByName: `Hyp${by}`, installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
	storage.forgetAllTriggers();
	openTab(plantedTab); frame();
	check("Planted: empty says so", texts.some((x) => /No triggers are planted/.test(x.text)), true);
	check("  and draws no Clear All", buttons.some((b) => b.label === "Clear All"), false);
	for (let i = 1; i <= 8; i++) storage.saveTrigger(t(`word number ${i}`, 1000 + i));
	frame();
	const purges = () => buttons.filter((b) => b.label === "Purge");
	check("Planted: six rows on the first page", purges().length, 6);
	check("  each with Details", buttons.filter((b) => b.label === "Details").length, 6);
	check("  paging shows (8 triggers)", ["Prev", "Next"].every((l) => buttons.some((b) => b.label === l)), true);
	check("  Clear All shows", buttons.some((b) => b.label === "Clear All"), true);
	check("  the phrase is not drawn", texts.some((x) => /word number/.test(x.text)), false);
	const drawn = [...buttons.filter((b) => b.left >= panel.PANEL_LEFT && b.top > panel.BLURB_Y).map((b) => ({ name: b.label, ...b })), ...texts.filter((x) => x.top > panel.BLURB_Y + 20).map((x) => ({ name: x.text, ...x }))];
	const hits = [];
	for (let i = 0; i < drawn.length; i++) for (let j = i + 1; j < drawn.length; j++) if (overlaps(drawn[i], drawn[j])) hits.push(`${drawn[i].name}@${drawn[i].top} × ${drawn[j].name}@${drawn[j].top}`);
	check("  nothing on it overlaps", hits, []);
	check("  everything inside the panel", drawn.filter((r) => !inside(r, { left: panel.PANEL_LEFT, top: panel.PANEL_TOP, width: panel.PANEL_WIDTH, height: panel.PANEL_HEIGHT })).map((r) => r.name), []);
	const next = buttons.find((b) => b.label === "Next");
	clickAt(next.left + 5, next.top + 5); frame();
	check("  Next shows the last two", purges().length, 2);
	// Purge the first row on page 2 (trigger 7). Failure: nothing removed, or the wrong one.
	const p7 = purges()[0];
	clickAt(p7.left + 5, p7.top + 5); frame();
	check("  Purge removes that trigger", storage.listTriggers().map((x) => x.installedBy).includes(1007), false);
	check("  and only that one", storage.listTriggers().length, 7);
	// Details, then Back.
	const d = buttons.find((b) => b.label === "Details");
	clickAt(d.left + 5, d.top + 5); frame();
	check("  Details shows what it does", texts.some((x) => /What it does: you cannot move/.test(x.text)), true);
	check("    and hides the word", texts.some((x) => /word number/.test(x.text)), false);
	const back = buttons.find((b) => b.label === "Back");
	clickAt(back.left + 5, back.top + 5); frame();
	check("  Back returns to the list", buttons.some((b) => b.label === "Details"), true);
	// Clear All asks first. Failure: one click clears.
	const clear = () => buttons.find((b) => b.label === "Clear All" || b.label === "Confirm?");
	clickAt(clear().left + 5, clear().top + 5); frame();
	check("  Clear All: first click only arms it", [storage.listTriggers().length, clear().label], [7, "Confirm?"]);
	clickAt(clear().left + 5, clear().top + 5); frame();
	check("  second click clears", storage.listTriggers().length, 0);
	// A click where the Stats tab's Reset button would be must be consumed here, not reset.
	storage.saveTrigger(t("left alone", 2000));
	storage.setFeature("hypnoEnabled", true);
	frame();
	clickAt(panel.CONTENT_LEFT + 2 * 220 + 10, 745);
	check("  a click on empty panel space changes nothing", [storage.listTriggers().length, storage.getFeatures().hypnoEnabled], [1, true]);
	storage.forgetAllTriggers();
	storage.setFeature("hypnoEnabled", false);
}
// The wheel listener outlives the list: it must not scroll it while something else is drawn.
// Probed through the help page, because closing help (unlike changing tab) keeps the offset.
openTab(0); frame();
{
	clickAt(1700 + 10, panel.BACK_TOP + 10); // the "?" button
	frame();                                  // help is drawn, not the rows
	MouseX = area.left + 200; MouseY = area.top + 100;
	wheel(100); wheel(100);
	clickAt(panel.BACK_LEFT + 10, panel.BACK_TOP + 10); // help's own back button
	frame();
	check("a wheel turned over the help page does not scroll the list behind it", rowLabels()[0]?.text, "Body");
}

screen.exit();
check("exit stops listening for the wheel", wheelListeners.size, 0);
screen.load();
screen.unload();
check("unload stops listening too", wheelListeners.size, 0);

console.log(`menu-layout: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
