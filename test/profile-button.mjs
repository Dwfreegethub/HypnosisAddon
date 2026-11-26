// The ECHS button on another player's profile, R134 (v1.12.7; Cassidy 11-18, idkkkkk 11-19).
// R134 builds the profile (Information Sheet) as HTML over the canvas, so the old canvas spiral
// was hidden under it and the panel drew behind it. Each check says what failure looks like.
//
//   1. Their profile gets our button in BC's own menubar, once, with the spiral; ours gets none.
//   2. The button opens the panel, which hides BC's page, draws over the canvas and takes clicks.
//   3. Every way out (our exit button, Escape/BC's exit, leaving the screen) shows BC's page again
//      and leaves nothing armed for the next profile.
//   4. A client without the HTML page still gets the canvas button; one without BC's button
//      helper still gets a plain button.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", Nickname: "", ExtensionSettings: {}, IsPlayer: () => true };
const hyp = { MemberNumber: HYP, Name: "Helper", Nickname: "Missys Helper", IsPlayer: () => false };
globalThis.ChatRoomCharacter = [Player, hyp];
globalThis.ChatRoomData = { Name: "Hypno Testing" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
let buttons = [], texts = [];
globalThis.DrawButton = (_x, _y, _w, _h, label, _c, _img, tip) => buttons.push(tip || label);
globalThis.DrawImageResize = () => true;
globalThis.DrawRect = () => {};
globalThis.DrawText = (t) => texts.push(String(t));
globalThis.DrawTextFit = (t) => texts.push(String(t));
globalThis.MainCanvasWidth = 2000;
globalThis.MainCanvas = { font: "36px Arial", textAlign: "center", textBaseline: "middle", save() {}, restore() {}, measureText: (t) => ({ width: t.length * 10 }) };
globalThis.MouseX = -1;
globalThis.MouseY = -1;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;

// A stand-in for the bits of the DOM the sheet uses: elements by id, the hidden attribute, append.
const byId = new Map();
const makeEl = (id) => {
	const el = {
		id, attrs: new Set(), children: [], textContent: "", listeners: {},
		toggleAttribute(name, force) { const on = force ?? !this.attrs.has(name); on ? this.attrs.add(name) : this.attrs.delete(name); return on; },
		hasAttribute(name) { return this.attrs.has(name); },
		setAttribute(name) { this.attrs.add(name); },
		addEventListener(type, fn) { this.listeners[type] = fn; },
		append(...kids) { for (const k of kids) { this.children.push(k); if (k.id) byId.set(k.id, k); } },
	};
	if (id) byId.set(id, el);
	return el;
};
globalThis.document = { getElementById: (id) => byId.get(id) ?? null, createElement: () => makeEl("") };
let helperCalls = [];
globalThis.InformationSheetMenuButton = (id, onClick, image, tooltip) => {
	helperCalls.push({ id, image, tooltip });
	const b = makeEl(id);
	b.image = image;
	b.click = onClick;
	return b;
};
// R134's sheet: Load builds the page, Unload removes it. Both async-free here except Load.
const buildSheet = () => { byId.clear(); const screen = makeEl("information-sheet-screen"); screen.append(makeEl("information-sheet-screen-menu")); };
globalThis.InformationSheetLoad = async () => buildSheet();
globalThis.InformationSheetUnload = () => byId.clear();
globalThis.InformationSheetSelection = hyp;

const { remote } = await import("./harness-bundle.mjs");
const hooks = {};
remote.installRemote({ hookFunction: (name, _p, fn) => (hooks[name] = fn) });

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const load = () => hooks.InformationSheetLoad([], () => globalThis.InformationSheetLoad());
const run = () => { buttons = []; texts = []; let bc = false; hooks.InformationSheetRun([], () => { bc = true; }); return bc; };
const click = (x, y) => { MouseX = x; MouseY = y; let bc = false; hooks.InformationSheetClick([], () => { bc = true; }); return bc; };
const exit = () => { let bc = false; hooks.InformationSheetExit([], () => { bc = true; }); return bc; };
const ours = () => byId.get("echs-information-sheet-remote") ?? null;
const screenHidden = () => byId.get("information-sheet-screen")?.hasAttribute("hidden") ?? null;

// --- 1. the button lands in BC's menubar ----------------------------------------------------------
check("the Load and Unload hooks are installed on a client that has them", [!!hooks.InformationSheetLoad, !!hooks.InformationSheetUnload], [true, true]);
await load();
// Failure: no button (Cassidy's "not at its usual place"), or not inside BC's menu.
check("their profile gets our button", !!ours(), true);
check("  inside the sheet's own menubar", byId.get("information-sheet-screen-menu").children.includes(ours()), true);
check("  built by BC's own helper, with the spiral and our tooltip", [helperCalls[0]?.image?.startsWith("data:image/svg+xml"), helperCalls[0]?.tooltip], [true, "ECHS Hypnosis Remote"]);
hooks.InformationSheetLoad([], () => undefined);
// Failure: a second spiral after a re-load of the same page.
check("  only once", byId.get("information-sheet-screen-menu").children.filter((c) => c.id === "echs-information-sheet-remote").length, 1);
check("the old canvas spiral is not drawn under BC's page", [run(), buttons.includes("ECHS Hypnosis Remote")], [true, false]);
check("  nor does a click on its old spot open anything", [click(120, 160), screenHidden()], [true, false]);

globalThis.InformationSheetSelection = Player;
await load();
// Failure: a remote for yourself.
check("your own profile gets no button", ours(), null);
globalThis.InformationSheetSelection = hyp;
await load();

// --- 2. it opens the panel over a hidden page -----------------------------------------------------
ours().click();
// Failure (idkkkkk): BC's page stays up and the panel draws behind it.
check("the button hides BC's page", screenHidden(), true);
check("  and the panel draws instead of BC's sheet", [run(), texts.some((t) => t.startsWith("Hypnosis Remote — Missys Helper"))], [false, true]);
check("  with its exit button", buttons.includes("Back"), true);

// --- 3. every way out shows BC's page again -------------------------------------------------------
check("our exit button closes the panel", [click(1850, 100), screenHidden()], [false, false]);
check("  and BC's sheet runs again", run(), true);
ours().click();
// Failure: Escape leaves the profile with BC's page still hidden, or skips straight out.
check("Escape/BC's exit closes the panel first", [exit(), screenHidden()], [false, false]);
check("  and a second one leaves the profile", exit(), true);
ours().click();
hooks.InformationSheetUnload([], () => globalThis.InformationSheetUnload());
// Failure: the next profile opens straight onto the old panel.
check("leaving the screen with the panel open leaves nothing armed", run(), true);

// --- 4. fallbacks -----------------------------------------------------------------------------------
byId.clear();
// Failure: an older client (no HTML page) loses its only way in.
check("no HTML page: the canvas spiral is drawn", [run(), buttons.includes("ECHS Hypnosis Remote")], [true, true]);
check("  and opens the panel", click(120, 160), false);
check("  which draws", [run(), texts.some((t) => t.startsWith("Hypnosis Remote — Missys Helper"))], [false, true]);
exit();
const realHelper = globalThis.InformationSheetMenuButton;
delete globalThis.InformationSheetMenuButton;
await load();
// Failure: BC renames its helper and the button vanishes, or throws into BC's screen load.
check("no BC helper: a plain button still lands", [ours()?.textContent, typeof ours()?.listeners.click], ["H", "function"]);
ours().listeners.click();
check("  and opens the panel", screenHidden(), true);
exit();
globalThis.InformationSheetMenuButton = realHelper;

console.log(`profile-button: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
