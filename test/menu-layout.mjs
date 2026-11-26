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
// BC's DrawText (drawLeftText's) recorded too, at its fixed 36px (v1.16.41: the Stats headings).
globalThis.DrawText = (text, x, y) => texts.push({ text: String(text), left: x, width: String(text).length * 18, top: y - 18, height: 36, clip, drawText: true });
globalThis.MouseX = 0;
globalThis.MouseY = 0;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;
globalThis.PreferenceSubscreenExtensionsClear = () => {};
// The Triggers tab's dropdowns are DOM; only their existence matters here.
const elements = {};
globalThis.document = { getElementById: (id) => elements[id] ?? null };
globalThis.ElementCreateDropdown = (id) => (elements[id] = { selectedIndex: 0, disabled: false });
globalThis.ElementCreateInput = (id, _type, value = "") => (elements[id] = { value, disabled: false, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, setAttribute() {} });
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

let localLines = [];
globalThis.ChatRoomSendLocal = (m) => localLines.push(String(m));
const lastLocal = () => localLines[localLines.length - 1] ?? "";
const { menu, storage, panel, session, triggers, depth } = await import("./harness-bundle.mjs");

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

// --- Dropdown tabs (v1.16.37, review F8): every choice is a dropdown, scrolling with the tab ---------
// Failure looked like: a cycle button that only went forward; labels shrunk to different sizes; a
// dropdown (DOM, which the canvas clip cannot hide) floating while its row is scrolled out.
const toTop = () => { MouseX = panel.CONTENT_LEFT + 200; MouseY = 400; for (let i = 0; i < 40; i++) wheel(-100); frame(); };
const toEnd = () => { MouseX = panel.CONTENT_LEFT + 200; MouseY = 400; for (let i = 0; i < 40; i++) { wheel(100); frame(); } };
/** Scroll from the top until the dropdown exists (it does only while wholly in view). */
const scrollTo = (id) => { toTop(); for (let i = 0; i < 40 && !elements[id]; i++) { wheel(50); frame(); } return elements[id]; };
const choose = (id, index) => { const el = elements[id]; el.selectedIndex = index; el.onChange.call(el); frame(); };
/** The dropdown tabs' shared checks: each reachable, labels one size and in order, each present
 * exactly while its row is in view, each changing its own setting and nothing else, and none
 * changing anything under the lock (unless it is a preference the lock does not hold). */
function dropdownTab(name, rows, read, unlocked = []) {
	frame();
	const ids = rows.map((r) => r.id);
	const reached = ids.map((id) => !!scrollTo(id));
	check(`${name}: every dropdown can be scrolled into view`, reached, ids.map(() => true));
	const labels = rows.map((r) => texts.find((t) => t.text === r.label));
	check(`${name}: every label drawn`, labels.map((l, i) => (l ? true : rows[i].label)), ids.map(() => true));
	check(`${name}:   at one size`, new Set(labels.filter(Boolean).map((l) => l.height)).size, 1);
	// The captions under them: one size (the lab showed them shrinking to different sizes).
	const captions = texts.filter((t) => t.clip && t.height < 28 && /\.$/.test(t.text) && !rows.some((r) => r.label === t.text));
	check(`${name}: captions one size`, [...new Set(captions.map((t) => t.height))], captions.length ? [22] : []);
	check(`${name}:   in order, a row apart`, labels.every((l, i) => i === 0 || (l && labels[i - 1] && l.top - labels[i - 1].top >= 90)), true);
	toTop();
	const area = texts.find((t) => t.text === rows[0].label)?.clip;
	const inView = (r) => { const l = texts.find((t) => t.text === r.label); const top = l.top + l.height / 2 - 22; return top >= area.top && top + 44 <= area.top + area.height; };
	check(`${name}: at the top, each present exactly when its row is in view`, rows.map((r) => !!elements[r.id] === inView(r)), ids.map(() => true));
	const changed = rows.map((r) => {
		const el = scrollTo(r.id);
		const was = read();
		choose(r.id, (el.selectedIndex + 1) % r.count);
		const now = read();
		choose(r.id, (el.selectedIndex + r.count - 1) % r.count); // back
		return Object.keys(was).filter((k) => JSON.stringify(was[k]) !== JSON.stringify(now[k]));
	});
	check(`${name}: each changes its own setting and no other`, changed, rows.map((r) => [r.key]));
	storage.startExtremeLock("trial");
	const lockedChanged = rows.map((r) => {
		const el = scrollTo(r.id);
		const was = JSON.stringify(read());
		const disabled = el.disabled;
		choose(r.id, (el.selectedIndex + 1) % r.count);
		const moved = JSON.stringify(read()) !== was;
		if (moved) choose(r.id, (el.selectedIndex + r.count - 1) % r.count);
		return [disabled, moved];
	});
	storage.clearExtremeLock();
	check(`${name}: locked, greyed and inert (but not what you see)`, lockedChanged, rows.map((r) => (unlocked.includes(r.id) ? [false, true] : [true, false])));
	toTop();
}

openTab(1); frame();
check("Inductions: no checkboxes and no buttons in the list", [boxes.length, buttons.filter((b) => b.clip).length], [0, 0]);
dropdownTab("Inductions", [
	{ id: "HypnosisAddonAttempts", label: "Attempts before they must wait:", key: "attempts", count: storage.ATTEMPT_LIMITS.length },
	{ id: "HypnosisAddonInductionTime", label: "Time to go under (after you answer):", key: "seconds", count: storage.INDUCTION_TIMES.length },
	{ id: "HypnosisAddonDefaultStance", label: "When someone tries to hypnotize me:", key: "stance", count: storage.DEFAULT_STANCES.length },
	{ id: "HypnosisAddonAwayStance", label: "When I'm away:", key: "away", count: storage.AWAY_STANCES.length },
	{ id: "HypnosisAddonToyMode", label: "Toy mode:", key: "toy", count: 2 },
	{ id: "HypnosisAddonToyScope", label: "Toy mode is for:", key: "toyScope", count: storage.TOY_SCOPES.length },
	{ id: "HypnosisAddonDeepest", label: '"Sink deeper" stops at:', key: "deepest", count: storage.DEEPEST_TIERS.length },
], () => ({ attempts: storage.getMaxAttempts(), seconds: storage.getInductionSeconds(), stance: storage.getDefaultStance(), away: storage.getAwayStance(), toy: storage.getToyMode(), toyScope: storage.getToyScope(), deepest: storage.getDeepestTier() }));
{
	// Captions follow the choice (the attempt one says what running out costs).
	scrollTo("HypnosisAddonAttempts");
	check("Inductions: the attempts caption is whole", texts.some((t) => t.text === "When they run out, they cannot try you again for ten minutes."), true);
	// The induction time: any of the five, not only the next one down.
	const times = storage.INDUCTION_TIMES;
	scrollTo("HypnosisAddonInductionTime");
	choose("HypnosisAddonInductionTime", times.indexOf(10));
	check("  induction time: straight to 10 seconds, no cycling round", storage.getInductionSeconds(), 10);
	choose("HypnosisAddonInductionTime", times.indexOf(60));
}
// --- Depth (v1.16.37, review F8): one scrolling page, not Prev/Next pages --------------------------
// Failure looked like: a page control; a row that can never be scrolled into view; a number box (DOM)
// floating over a row scrolled out; a step that works under the lock.
openTab(6); frame();
check("Depth: no page buttons", buttons.some((b) => b.label === "Next" || b.label === "Prev"), false);
check("  and no sink deeper (it is on Inductions)", buttons.some((b) => /Sink deeper/.test(b.label)), false);
{
	const gates = depth.DEPTH_GATES;
	const rowSeen = new Set();
	const boxPresentOnlyInView = [];
	toTop();
	for (let i = 0; i < 60; i++) {
		const area = buttons.find((b) => b.label === "-5")?.clip;
		for (const g of gates) {
			const label = texts.find((t) => t.text === g.label);
			if (!label || !area) continue;
			const top = label.top + label.height / 2 - 22;
			const inView = top >= area.top && top + 44 <= area.top + area.height;
			if (inView) rowSeen.add(g.key);
			boxPresentOnlyInView.push(!!elements[`HypnosisAddonDepth-${g.key}`] === inView);
		}
		wheel(50); frame();
	}
	check("Depth: every gate's row can be scrolled wholly into view", gates.filter((g) => !rowSeen.has(g.key)).map((g) => g.key), []);
	check("  each number box present exactly while its row is in view", boxPresentOnlyInView.every(Boolean), true);
	// +5 on the first row, where it is drawn; locked, nothing.
	toTop();
	const first = gates[0].key;
	const plus = () => buttons.filter((b) => b.label === "+5")[0];
	const was = storage.getDepthOverride(first) ?? null;
	clickAt(plus().left + 5, plus().top + 5); frame();
	check("  +5 steps the first row where it is drawn", storage.getDepthOverride(first) !== was, true);
	const now = storage.getDepthOverride(first);
	storage.startExtremeLock("trial");
	frame();
	clickAt(plus().left + 5, plus().top + 5); frame();
	check("  locked: +5 changes nothing", storage.getDepthOverride(first), now);
	storage.clearExtremeLock();
	// The earned-only rows' "may arousal reach it", as dropdowns: one opens, carry-forward can't.
	const earned = gates.filter((g) => g.earnedOnly);
	const openable = earned.find((g) => depth.isChemicalToggleable(g.key));
	const shut = earned.find((g) => !depth.isChemicalToggleable(g.key));
	const chem = (g) => `HypnosisAddonChem-${g.key}`;
	scrollTo(chem(openable));
	choose(chem(openable), 1);
	check("  arousal ok on an earned-only row saves it", storage.getChemicalReach(openable.key), true);
	choose(chem(openable), 0);
	check("    and back", storage.getChemicalReach(openable.key), false);
	if (shut) {
		scrollTo(chem(shut));
		check("  carry-forward's is greyed", elements[chem(shut)]?.disabled, true);
	}
	// Reset, then the two dropdowns, last on the page.
	toEnd();
	check("  Reset to defaults reachable at the end", buttons.some((b) => b.label === "Reset to defaults" && inside(b, b.clip)), true);
	dropdownTab("Depth", [
		{ id: "HypnosisAddonChemicalScope", label: "Chemicals count:", key: "scope", count: depth.CHEMICAL_SCOPES.length },
		{ id: "HypnosisAddonSkillHonour", label: "A hypnotist's skill:", key: "honour", count: storage.SKILL_HONOUR_OFFERED.length },
	], () => ({ scope: storage.getChemicalScope(), honour: storage.getSkillHonour() }));
	storage.clearDepthOverrides();
	openTab(0); frame();
	check("  another tab: its boxes and dropdowns go", Object.keys(elements).filter((id) => /Depth-|Chem-|ChemicalScope|SkillHonour/.test(id)), []);
}

// --- tabs that fit, and the tab with DOM controls under its rows -----------------------------
openTab(3); frame(); // Awareness: four rows
check("another tab: the Inductions dropdowns go", Object.keys(elements).filter((id) => /Attempts|InductionTime|Stance|ToyMode|ToyScope|Deepest/.test(id)), []);
check("a tab that fits has no scroll bar", [!!up(), !!down()], [false, false]);
check("  and its rows start at the top again", rowLabels()[0].text, "Clothing Changes");
openTab(2); frame(); // Trance Defaults: eight rows and the pulse colour, once two columns
{
	// One column, with one sub-option indented under Cannot Move (v1.12.0: "no one else can move you").
	// Failure: a second column, i.e. lefts that differ by more than the indent.
	const lefts = [...new Set(boxes.map((b) => b.left))].sort((a, b) => a - b);
	check("Trance Defaults is one column now", lefts.length <= 1 || (lefts.length === 2 && lefts[1] - lefts[0] === 60), true);
	check("  and the hold's sub-option is indented under Cannot Move", boxes.filter((b) => b.left !== lefts[0]).length, 1);
}
{
	// v1.16.37: what is not about the trance moved to General. Failure: still listed here.
	toEnd();
	const all = () => rowLabels().map((t) => t.text);
	toTop();
	const seenLabels = new Set();
	for (let i = 0; i < 40; i++) { all().forEach((t) => seenLabels.add(t)); wheel(50); frame(); }
	check("Trance Defaults: the pulse, release and spiral-over-you boxes moved to General", ["Pulse when a command lands or a trigger fires", "Release everything if you disconnect", "Show others that I run ECHS (a spiral over you in rooms)"].filter((l) => seenLabels.has(l)), []);
	check("  and the icon and popup choices with them", ["ECHS icons over others:", "ECHS popup in rooms:"].filter((l) => seenLabels.has(l)), []);
	dropdownTab("Trance Defaults", [
		{ id: "HypnosisAddonScreenEffect", label: "Screen effect:", key: "effect", count: storage.SCREEN_EFFECTS.length },
		{ id: "HypnosisAddonTranceEyes", label: "Eyes while under:", key: "eyes", count: storage.TRANCE_EYES.length },
		{ id: "HypnosisAddonTranceEyeColor", label: "Eye colour while under:", key: "eyeColor", count: storage.TRANCE_EYE_COLORS.length },
		// Pink -> Purple and back; never onto Custom here (the hex box is checked below).
		{ id: "HypnosisAddonPulseColor", label: "Pulse colour:", key: "pulse", count: storage.PULSE_COLORS.length },
	], () => ({ effect: storage.getScreenEffect(), eyes: storage.getTranceEyes(), eyeColor: storage.getTranceEyeColor(), pulse: storage.getPulseColor() }));

	// Custom: a typed hex code, in a real DOM box, which only exists while it is wanted.
	const HEX = "HypnosisAddonPulseHex";
	const PULSE = "HypnosisAddonPulseColor";
	const blur = () => elements[HEX].listeners.blur.call(elements[HEX]);
	toEnd();
	check("  no hex box for a named colour", !!elements[HEX], false);
	choose(PULSE, storage.PULSE_COLORS.findIndex((c) => c.key === "custom"));
	toEnd();
	check("  Custom: the hex box appears, with her colour in it", elements[HEX]?.value, storage.DEFAULT_PULSE_CUSTOM);
	const box = placed[HEX];
	check("  and sits inside the panel", box && box.y + box.h / 2 <= PANEL_BOTTOM && box.x + box.w / 2 <= PANEL_RIGHT, true);
	// Failure: the box, which is DOM and ignores the canvas clip, overlaps the colour dropdown.
	check("  under the colour dropdown, clear of it", box && placed[PULSE] && box.y - box.h / 2 >= placed[PULSE].y + placed[PULSE].h / 2, true);
	check("  with its caption", texts.some((t) => /For example #FF69B4/.test(t.text)), true);
	elements[HEX].value = "#00ff80";
	blur();
	check("  a good code is saved, tidied", [storage.getPulseCustom(), elements[HEX].value], ["#00FF80", "#00FF80"]);
	elements[HEX].value = "banana";
	blur();
	frame();
	// Failure: a typo quietly does nothing (rule 5).
	check("  a bad code changes nothing", storage.getPulseCustom(), "#00FF80");
	check("  and says so", texts.some((t) => /"banana" is not a colour code/.test(t.text)), true);
	check("  and stays in the box to correct", elements[HEX].value, "banana");
	elements[HEX].value = "#123456";
	blur();
	frame();
	check("  fixing it clears the complaint", texts.some((t) => /is not a colour code/.test(t.text)), false);
	storage.startExtremeLock("trial");
	frame();
	check("  locked: the box is disabled", elements[HEX].disabled, true);
	elements[HEX].value = "#ABCDEF";
	blur();
	// Failure: a box focused before the lock began saves through it.
	check("  locked: a blur saves nothing", storage.getPulseCustom(), "#123456");
	storage.clearExtremeLock();
	frame();
	check("  back from the lock, it shows what is saved", elements[HEX].value, "#123456");
	openTab(0); frame();
	// Failure: the box floats over the next tab.
	check("  another tab: the box goes", [!!elements[HEX], !!elements[PULSE]], [false, false]);
	openTab(2); frame();
	toEnd();
	choose(PULSE, 0);
	check("  back to Pink, and the box goes", [storage.getPulseColor(), !!elements[HEX]], ["pink", false]);
	storage.setPulseCustom(storage.DEFAULT_PULSE_CUSTOM);
	storage.setPulseColor("pink");
}
openTab(4); frame(); // Triggers
// v1.16.37 (review F8): one scrolling page. Failure looked like: the rows in a box about four tall,
// the fifth cut through by a label of the dropdowns fixed under it.
{
	check("Triggers: the list runs to the panel floor", boxes[0].clip.top + boxes[0].clip.height >= PANEL_BOTTOM - 30, true);
	const seenRows = new Set();
	toTop();
	for (let i = 0; i < 40; i++) { boxes.filter((b) => inside(b, b.clip)).forEach((b) => seenRows.add(b.top + 1000 * 0)); rowLabels().forEach((t) => seenRows.add(t.text)); wheel(50); frame(); }
	check("  all five tick boxes can be seen", ["Allow triggers to be planted in you", "Suggestions that outlive the trance", "You can fire your own triggers", "Show trigger words when you list them", "Triggers fire only on whole words"].filter((l) => !seenRows.has(l)), []);
	dropdownTab("Triggers", [
		{ id: "HypnosisAddonTriggerScope", label: "Who else can fire your triggers:", key: "scope", count: triggers.TRIGGER_SCOPES.length },
		{ id: "HypnosisAddonTriggerLifespan", label: "Longest a new trigger lasts:", key: "lifespan", count: storage.TRIGGER_LIFESPANS.length },
		{ id: "HypnosisAddonTriggerDecay", label: "Triggers fade without reinforcement:", key: "decay", count: storage.DECAY_RATES.length },
		{ id: "HypnosisAddonDropMode", label: "Drop triggers:", key: "drop", count: storage.DROP_MODES.length },
		{ id: "HypnosisAddonTriggerView", label: "My triggers list:", key: "view", count: storage.TRIGGER_VIEWS.length },
	], () => ({ scope: storage.getTriggerScope(), lifespan: storage.getTriggerLifespan(), decay: storage.getTriggerDecayRate(), drop: storage.getDropMode(), view: storage.getTriggerView() }));
	// The minutes box, between the lifespan and fading dropdowns.
	const DUR = "HypnosisAddonTriggerDuration";
	const dur = scrollTo(DUR);
	check("  the minutes box scrolls into view", !!dur, true);
	check("  between the lifespan and fading dropdowns", placed[DUR] && placed.HypnosisAddonTriggerLifespan && placed[DUR].y > placed.HypnosisAddonTriggerLifespan.y && (!placed.HypnosisAddonTriggerDecay || placed[DUR].y < placed.HypnosisAddonTriggerDecay.y || !elements.HypnosisAddonTriggerDecay), true);
	globalThis.ElementNumberInputBlur = function () {};
	dur.value = "30";
	dur.listeners.blur.call(dur, {});
	check("  typing 30 saves it", storage.getTriggerDuration(), 30);
	storage.startExtremeLock("trial");
	frame();
	dur.value = "45";
	dur.listeners.blur.call(dur, {});
	check("  locked: disabled, and a blur saves nothing", [dur.disabled, storage.getTriggerDuration()], [true, 30]);
	storage.clearExtremeLock();
	storage.setTriggerDuration(0);
	toTop();
}

// --- Planted (v0.88.0): the trigger inspector -------------------------------------------------
{
	const plantedTab = 5;
	const t = (phrase, by) => ({ phrase, actions: ["movement-block"], installedBy: by, installedByName: `Hyp${by}`, installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
	storage.forgetAllTriggers();
	openTab(plantedTab); frame();
	check("Planted: empty says so", texts.some((x) => /No triggers are planted/.test(x.text)), true);
	check("  and draws no Clear All", buttons.some((b) => b.label === "Forget All"), false);
	for (let i = 1; i <= 8; i++) storage.saveTrigger(t(`word number ${i}`, 1000 + i));
	frame();
	const purges = () => buttons.filter((b) => b.label === "Forget");
	check("Planted: six rows on the first page", purges().length, 6);
	check("  each with Details", buttons.filter((b) => b.label === "Details").length, 6);
	check("  paging shows (8 triggers)", ["Prev", "Next"].every((l) => buttons.some((b) => b.label === l)), true);
	check("  Clear All shows", buttons.some((b) => b.label === "Forget All"), true);
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
	const clear = () => buttons.find((b) => b.label === "Forget All" || b.label === "Confirm?");
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
// The Extreme lock hides the Stats numbers (DW, 2026-11-05), but not the way out on the same tab.
{
	storage.addInteractions(2001, "Ella", 10);
	frame();
	// v1.16.37: always offered; the Advanced button that hid it is gone (room for General).
	check("Stats: no Advanced button", buttons.some((b) => /advanced/i.test(b.label)), false);
	openTab(7); frame();
	check("Stats: always offered, its own tab", texts.some((x) => x.text === "Experience"), true);
	check("Stats: unlocked, trust and experience show", [texts.some((x) => /Ella/.test(x.text)), texts.some((x) => x.text === "Experience")], [true, true]);
	storage.startExtremeLock("trial");
	frame();
	// Failure: the numbers are still on screen under the lock.
	check("Stats: locked, trust and experience are gone", [texts.some((x) => /Ella/.test(x.text)), texts.some((x) => x.text === "Experience")], [false, false]);
	check("  and it says why", texts.some((x) => /Extreme lock hides/.test(x.text)), true);
	// v1.16.38 (DW): Export / Import / Reset moved to General. Failure: they are still drawn here.
	check("  no data buttons on Stats any more", buttons.some((b) => /^(Export|Import|Reset)$/.test(b.label)), false);
	// Failure: the documented way out, now on General, is gone or dead under the lock.
	openTab(8); frame();
	toEnd();
	const reset = buttons.find((b) => b.label === "Reset");
	check("General: Reset is there under the Extreme lock", !!reset && inside(reset, reset.clip), true);
	clickAt(reset.left + 5, reset.top + 5); frame();
	check("  and works: the first click asks", /Click Reset again/.test(lastLocal()), true);
	const imp = buttons.find((b) => b.label === "Import");
	clickAt(imp.left + 5, imp.top + 5); frame();
	check("  Import refuses itself, out loud", /Extreme|locked/i.test(lastLocal()) && !/Imported/.test(lastLocal()), true);
	openTab(7); frame();
	storage.clearExtremeLock();
	storage.forgetTrust(2001);

	// The trust list: search (Senge, Eri) and a [x] on each row (Valerie).
	const SEARCH = "HypnosisAddonTrustSearch";
	frame();
	check("nobody at all: no search box", !!elements[SEARCH], false);
	// v1.16.41 (review F11). Failure: "value" and "detail" headings over "Nobody yet…".
	check("  and no column headings over nothing", [texts.some((t) => t.text === "value" || t.text === "detail"), texts.some((t) => /^Nobody yet/.test(t.text))], [false, true]);
	// Fifteen people, more than the list shows, so it scrolls (v1.16.38, DW: scroll bars, not pages).
	// Interactions set the order: Person 1 first.
	for (let i = 1; i <= 15; i++) storage.addInteractions(3000 + i, `Person ${i}`, 100 - i, `Account${i}`);
	const type = (text) => { elements[SEARCH].value = text; elements[SEARCH].listeners.input.call(elements[SEARCH]); frame(); };
	// What is wholly in view, which is what can be read and clicked.
	const shown = () => texts.filter((t) => /\(#\d+\)$/.test(t.text) && t.clip && inside(t, t.clip)).map((t) => t.text);
	const xs = () => buttons.filter((b) => (b.label === "[x]" || b.label === "Sure?") && b.clip && inside(b, b.clip));
	const clickX = (i) => { const b = xs()[i]; clickAt(b.left + 5, b.top + 5); frame(); };
	const held = () => storage.listTrust().map((t) => t.memberId - 3000).sort((a, b) => a - b);
	const listTop = () => { MouseX = panel.CONTENT_LEFT + 200; MouseY = 500; for (let i = 0; i < 40; i++) wheel(-100); frame(); };
	const listEnd = () => { MouseX = panel.CONTENT_LEFT + 200; MouseY = 500; for (let i = 0; i < 40; i++) wheel(100); frame(); };
	frame();
	check("search: the box appears", !!elements[SEARCH], true);
	const searchBox = placed[SEARCH];
	check("  inside the panel", searchBox.x + searchBox.w / 2 <= PANEL_RIGHT && searchBox.x - searchBox.w / 2 >= panel.PANEL_LEFT, true);
	check("  and clear of the first row and the experience line", [searchBox.y - searchBox.h / 2 >= 290 + 18, searchBox.y + searchBox.h / 2 <= 370 - 17], [true, true]);
	check("Stats: no page buttons", buttons.some((b) => b.label === "Next" || b.label === "Prev"), false);
	check("  the list starts at the top, and does not all fit", [shown()[0], shown().length >= 8 && shown().length < 15], ["Person 1 (#3001)", true]);
	check("  so it has a scroll bar", [!!up(), !!down()], [true, true]);
	check("  and says how many", texts.some((t) => t.text === "Trust · 15 people"), true);
	check("  with its column headings", [texts.some((t) => t.text === "value"), texts.some((t) => t.text === "detail")], [true, true]);
	check("  every row in view has a [x]", xs().length, shown().length);
	// Failure: the detail text runs under the button, or the button sits on the scroll bar.
	const firstX = xs()[0];
	const detail = texts.find((t) => /interactions/.test(t.text) && Math.abs(t.top + t.height / 2 - (firstX.top + firstX.height / 2)) < 2);
	check("  the [x] is clear of the row's detail", !!detail && detail.left + detail.width <= firstX.left, true);
	// v1.17.0: Blocked / Normal / Toy on each row, between the detail and the [x].
	const levels = buttons.filter((b) => ["Blocked", "Normal", "Toy"].includes(b.label) && b.clip && inside(b, b.clip) && Math.abs(b.top - firstX.top) < 2).sort((a, b) => a.left - b.left);
	check("  each row has the three access levels", levels.map((b) => b.label), ["Blocked", "Normal", "Toy"]);
	check("  clear of the detail", !!detail && levels.length === 3 && detail.left + detail.width <= levels[0].left, true);
	check("  and of the [x], without touching each other", levels.length === 3 && levels[0].left + levels[0].width <= levels[1].left && levels[1].left + levels[1].width <= levels[2].left && levels[2].left + levels[2].width <= firstX.left, true);
	check("  the detail still has room to be read", !!detail && !detail.text.endsWith("…"), true, detail?.text);
	check("  and of the scroll bar", firstX.left + firstX.width <= up().left, true);
	check("  the rows of [x]s do not touch", xs()[0].top + xs()[0].height <= xs()[1].top, true);
	listEnd();
	check("the wheel scrolls to the last person", [shown().at(-1), shown().includes("Person 1 (#3001)")], ["Person 15 (#3015)", false]);
	listTop();
	clickAt(down().left + 5, down().top + 5); frame();
	check("  and the down arrow moves it", shown()[0] !== "Person 1 (#3001)", true);
	type("person 8");
	// Failure: the list ignores the box, or case matters; or a search leaves it scrolled past its matches.
	check("by the name they go by, any case, from the top", shown(), ["Person 8 (#3008)"]);
	type("account3");
	check("by account name, though they left", shown(), ["Person 3 (#3003)"]);
	type("3005");
	check("by member number", shown(), ["Person 5 (#3005)"]);
	type("erso");
	check("part of a name will do", shown().length >= 8, true);
	listEnd();
	type("person");
	check("  a new search starts at the top of its matches", shown()[0], "Person 1 (#3001)");
	globalThis.ChatRoomCharacter = [Player, { MemberNumber: 3002, Name: "LiveAccount", Nickname: "LiveNick" }];
	type("liveaccount");
	check("someone in the room by their live account name", shown(), ["LiveNick (#3002)"]);
	type("livenick");
	check("  and live nickname", shown(), ["LiveNick (#3002)"]);
	delete globalThis.ChatRoomCharacter;
	type("zzz");
	check("no match: says so", texts.some((t) => /Nobody here matches "zzz"/.test(t.text)), true);
	check("  and keeps the box to fix it", !!elements[SEARCH], true);
	check("  and no [x]", xs().length, 0);
	type("");
	check("cleared: everyone again, from the top", shown()[0], "Person 1 (#3001)");

	// The [x]. Failure: one click deletes, or it deletes someone other than the row it is on.
	const everyone = held();
	clickX(1);
	check("[x]: the first click deletes nothing", held(), everyone);
	check("  and asks", xs().map((b) => b.label).slice(0, 3), ["[x]", "Sure?", "[x]"]);
	clickX(2);
	check("clicking another row moves the question", xs().map((b) => b.label).slice(0, 3), ["[x]", "[x]", "Sure?"]);
	check("  and still deletes nothing", held(), everyone);
	const realNow = Date.now;
	const later = realNow() + 6000;
	Date.now = () => later;
	frame();
	check("after five seconds it stops asking", xs()[2].label, "[x]");
	clickX(2);
	check("  and a late second click only asks again", [held(), xs()[2].label], [everyone, "Sure?"]);
	Date.now = realNow;
	clickX(1);
	clickX(1);
	check("two clicks delete that person, and only them", held(), everyone.filter((n) => n !== 2));
	check("  and it is said", /Forgot Person 2 \(#3002\)/.test(lastLocal()), true);
	// The dangerous case: a scrolled list, where the slot and the person differ.
	listEnd();
	const lastShown = shown().at(-1);
	clickX(xs().length - 1);
	clickX(xs().length - 1);
	check("scrolled: the [x] deletes the person drawn beside it", [lastShown, held().includes(15)], ["Person 15 (#3015)", false]);
	type("person 6");
	clickX(0);
	clickX(0);
	check("a filtered row deletes the person drawn there", held(), everyone.filter((n) => ![2, 15, 6].includes(n)));
	type("");
	check("the list closes up after", texts.some((t) => t.text === "Trust · 12 people"), true);

	// Locked. Failure: a read-only screen deletes someone, or search stops working.
	const lockedAt = held();
	storage.setFeature("lockedWhileHypnotized", true);
	storage.setFeature("hypnoEnabled", true);
	globalThis.ServerSend ??= () => {};
	globalThis.ServerPlayerIsInChatRoom ??= () => false;
	session.forceTrance(1234, 60, 60);
	frame();
	check("setup: the session lock is really on", menu.settingsLocked(), true);
	clickX(0);
	clickX(0);
	check("session lock: the [x] deletes nothing", held(), lockedAt);
	check("  and does not ask", xs()[0].label, "[x]");
	type("person 7");
	check("  searching still works, it is only reading", shown(), ["Person 7 (#3007)"]);
	type("");
	session.safeword();
	storage.setFeature("lockedWhileHypnotized", false);
	storage.setFeature("hypnoEnabled", false);
	frame();
	const whereX = xs()[0];
	storage.startExtremeLock("trial");
	frame();
	check("Extreme lock: no names, no box", [shown(), !!elements[SEARCH]], [[], false]);
	check("  and no [x]", xs().length, 0);
	clickAt(whereX.left + 5, whereX.top + 5); frame();
	clickAt(whereX.left + 5, whereX.top + 5); frame();
	// Failure: an invisible button still deletes from under the lock.
	check("  a click where it was deletes nothing", held(), lockedAt);
	storage.clearExtremeLock();
	frame();
	check("the box goes off the tab", (() => { openTab(0); frame(); return !!elements[SEARCH]; })(), false);
	openTab(7); frame();
	check("  and comes back on it", !!elements[SEARCH], true);
	for (const id of lockedAt) storage.forgetTrust(3000 + id);
	frame();
}

// --- Tab blurbs wrap, never cut (v1.16.37, review F8) ----------------------------------------------
// Failure looked like: "…(that is Clothing Illu…", cut exactly where the blurb said something.
{
	const cut = [], tooLow = [], tooMany = [];
	const names = menu.visibleTabNames();
	for (let i = 0; i < names.length; i++) {
		openTab(i); frame();
		const lines = texts.filter((t) => !t.clip && t.left === panel.CONTENT_LEFT && t.top + t.height / 2 > panel.PANEL_TOP && t.top + t.height / 2 < 265);
		if (lines.some((t) => t.text.endsWith("…"))) cut.push(names[i]);
		if (lines.some((t) => t.top + t.height > 270)) tooLow.push(names[i]);
		if (lines.length > 2) tooMany.push(names[i]);
	}
	check("tab blurbs: none cut with …", cut, []);
	check("  none reaching the rows at 270", tooLow, []);
	check("  two lines at most", tooMany, []);
	openTab(3); frame();
	const awareness = texts.filter((t) => !t.clip && t.left === panel.CONTENT_LEFT && t.top < 265).map((t) => t.text).join(" ");
	check("  Awareness's whole blurb is there", /that is Clothing Illusion\), and arousal still applies\.$/.test(awareness), true);
}

// --- Hover text on the permission rows (v1.16.37, review F8) -----------------------------------------
// Failure looked like: "Movement Restriction" with nothing to say what it allows.
openTab(0); frame();
{
	const label = rowLabels().find((t) => t.text === "Movement Restriction");
	MouseX = label.left + 40; MouseY = label.top + label.height / 2;
	frame();
	const tipBox = rects.find((r) => r.width === 450);
	const tipLines = texts.filter((t) => tipBox && inside(t, tipBox));
	check("hover a permission: a tip box of its own, outside the clip", !!tipBox && tipBox.clip === null, true);
	check("  saying what it allows, wrapped", tipLines.length > 1 && /held still/.test(tipLines.map((t) => t.text).join(" ")), true);
	check("  at a readable size", tipLines.every((t) => t.height >= 26), true);
	check("  drawn last, over everything", texts.slice(-tipLines.length).every((t) => tipLines.includes(t)), true);
	const fixed = texts.find((t) => t.text === "Hypnosis Enabled");
	MouseX = fixed.left + 20; MouseY = fixed.top + fixed.height / 2;
	frame();
	check("  the fixed rows have one too", texts.some((t) => /The master switch/.test(t.text)), true);
	MouseX = 5; MouseY = 5;
	frame();
	check("  gone when the pointer leaves", rects.some((r) => r.width === 450), false);
}

// --- General (v1.16.37, review F8, DW): how ECHS behaves for you, last in the column ---------------
check("nine tabs, General last", menu.visibleTabNames(), ["Permissions", "Inductions", "Trance Defaults", "Awareness", "Triggers", "Planted", "Depth", "Stats", "General"]);
check("  the last tab sits inside the panel", panel.tabTop(8) + panel.TAB_HEIGHT <= PANEL_BOTTOM, true);
openTab(8); frame();
{
	check("General: its three tick boxes", rowLabels().map((t) => t.text).filter((t) => /Release everything|Pulse when|Show others that I run ECHS/.test(t)), ["Release everything if you disconnect", "Pulse when a command lands or a trigger fires", "Show others that I run ECHS (a spiral over you in rooms)"]);
	dropdownTab("General", [
		{ id: "HypnosisAddonIconSpot", label: "ECHS icons over others:", key: "spot", count: storage.ECHS_ICON_SPOTS.length },
		{ id: "HypnosisAddonPopupEnabled", label: "ECHS popup in rooms:", key: "popup", count: 2 },
	], () => ({ spot: storage.getEchsIconSpot(), popup: storage.getPopupEnabled() }), ["HypnosisAddonIconSpot", "HypnosisAddonPopupEnabled"]);
	// The tick boxes are held by the lock like every other.
	storage.startExtremeLock("trial");
	frame();
	check("General: locked, its tick boxes are greyed", boxes.filter((b) => b.clip).every((b) => b.disabled), true);
	storage.clearExtremeLock();
	openTab(0); frame();
	check("  another tab: its dropdowns go", [!!elements.HypnosisAddonIconSpot, !!elements.HypnosisAddonPopupEnabled], [false, false]);
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
