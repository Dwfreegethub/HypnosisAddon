// Per-person access (v1.17.0, DW 2026-11-26): Blocked / Normal / Toy, ECHS's own blacklist grown
// into a level for each person. Each check says what failure looks like.
//
//   1. The list: Normal is "not listed"; Blocked and Toy are kept; Normal takes someone off.
//   2. Blocked: an induction is refused with the hypnosis-off words (the list stays private) and she
//      is told; their trigger words and activities set off nothing; someone else's still do.
//   3. Blocking someone who has her under ends the trance, and what they planted is forgotten, holding
//      or not; what others planted stays.
//   4. Toy: toy mode for them with her toy mode off; nobody else gets it; Blocked beats toy mode.
//   5. Her locks hold the list: Extreme, the session lock. Not herself.
//   6. Blocking a keyholder asks whether to take their keys back; Accept does, Decline keeps them.
//   7. /echs access sets and lists; a keyholder's snapshot carries the list, names and levels only.
const HYP = 246108, REI = 999, VEX = 424242;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: VEX, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let hidden = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat" && data?.Type === "Hidden") hidden.push({ to: data.Target, ...data?.Dictionary?.[0]?.message }); };
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m?.textContent ?? m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.ChatRoomSendChatMessage = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.InventoryGet = () => null;
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};
// Just enough DOM for the ask popup: a tree, found and clicked by button text.
const makeEl = (tag) => ({
	tagName: tag.toUpperCase(), id: "", style: {}, children: [], parent: null, listeners: {}, _text: "",
	get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); },
	set textContent(v) { this.children = []; this._text = String(v); },
	appendChild(k) { k.parent = this; this.children.push(k); return k; },
	remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; },
	addEventListener(t, fn) { (this.listeners[t] ??= []).push(fn); },
	removeEventListener() {},
	setAttribute() {}, focus() {},
	click() { for (const fn of this.listeners.click ?? []) fn({ type: "click" }); },
});
const body = makeEl("body");
globalThis.document = { body, createElement: makeEl, getElementById: () => null, addEventListener() {}, removeEventListener() {} };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const findAll = (n, pred, out = []) => { if (pred(n)) out.push(n); for (const c of n.children) findAll(c, pred, out); return out; };
const askButton = (label) => findAll(body, (n) => n.tagName === "BUTTON" && n.textContent === label)[0];
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);

const { voice, storage, session, timers, messaging, access, commands, remote } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });
session.installSession();
commands.installCommands();
voice.installCompulsions();
const echs = (args) => { said = []; registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "access").Action(args); return said.join(" | "); };

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "postureControl", "compelActivity"]) storage.setFeature(k, true);
storage.setTriggerScope("everyone");
const under = (who = HYP) => session.forceTrance(who, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const incoming = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const plant = (who, word) => {
	under(who);
	say(`Missy, the trigger word is ${word}`, who);
	say("Missy, kneel", who);
	say("Missy, remember trigger", who);
	session.safeword();
	timers.clearAllTimers();
};
const reset = () => {
	session.safeword();
	timers.clearAllTimers();
	storage.forgetAllTriggers();
	for (const e of storage.listAccess()) storage.setAccessLevel(e.id, e.name, "normal");
	hidden = [];
	said = [];
};
const fired = () => storage.listTriggers()[0]?.fireCount ?? storage.listTriggers()[0]?.lastFired ?? 0;

// --- 1. the list -------------------------------------------------------------------------------------
check("nobody listed: everyone is Normal", storage.accessLevelOf(HYP), "normal");
check("set Toy", [storage.setAccessLevel(REI, "Rei", "toy"), storage.accessLevelOf(REI)], [true, "toy"]);
check("set Blocked", [storage.setAccessLevel(HYP, "GameBot", "blocked"), storage.accessLevelOf(HYP)], [true, "blocked"]);
check("Normal takes them off the list", [storage.setAccessLevel(REI, "Rei", "normal"), storage.listAccess().map((e) => e.id)], [true, [HYP]]);
reset();

// --- 2. Blocked: refused, and nothing they do reaches her -------------------------------------------
access.changeAccess(HYP, "GameBot", "blocked");
hidden = []; said = [];
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
check("blocked induction: refused with the hypnosis-off words", hidden.find((m) => m.to === HYP && m.refusedReason)?.refusedReason, "They aren't open to hypnosis.");
check("  she is told, and nothing started", [said.some((t) => /GameBot tried to hypnotize you\. You have them blocked/.test(t)), session.isHypnotized()], [true, false]);
// Rei plants a word; GameBot saying it sets nothing off, Vex saying it does.
access.changeAccess(HYP, "GameBot", "normal");
plant(REI, "bluebell");
access.changeAccess(HYP, "GameBot", "blocked");
check("set up: Rei's trigger is kept when GameBot is blocked", storage.listTriggers().map((t) => t.phrase), ["bluebell"]);
said = [];
say("bluebell", HYP);
check("blocked speaker: their trigger word fires nothing", [voice.isTriggerInEffect(storage.listTriggers()[0]), said.length], [false, 0]);
say("bluebell", VEX);
check("  while someone else's still does", voice.isTriggerInEffect(storage.listTriggers()[0]), true);
// A compulsion set off by an activity: not by a blocked person.
reset();
under(REI);
say("Missy, whenever anyone kisses you, kneel", REI);
say("Missy, remember trigger", REI);
session.safeword(); timers.clearAllTimers();
check("set up: a kiss compulsion", storage.listTriggers().length, 1);
access.changeAccess(VEX, "Vex", "blocked");
said = [];
voice.noteActivity(VEX, "Kiss");
drainPaced();
check("blocked: their kiss sets off no compulsion", voice.isTriggerInEffect(storage.listTriggers()[0]), false);
voice.noteActivity(HYP, "Kiss");
drainPaced();
check("  someone else's kiss still does", voice.isTriggerInEffect(storage.listTriggers()[0]), true);

// --- 3. blocking mid-trance: ends it, and their triggers go ------------------------------------------
reset();
plant(HYP, "starlight");
plant(REI, "moonbeam");
under(HYP);
check("set up: under GameBot, two triggers", [session.isSessionActiveWith(HYP), storage.listTriggers().length], [true, 2]);
const told = access.changeAccess(HYP, "GameBot", "blocked");
check("blocked mid-trance: the trance ends", session.isHypnotized(), false);
check("  their trigger is forgotten, Rei's stays", storage.listTriggers().map((t) => t.phrase), ["moonbeam"]);
check("  and she is told both", told, "GameBot is now Blocked: they can never hypnotize you, command you, plant in you or set off anything planted in you. Your trance with them ended, and 1 trigger they planted is forgotten.");
// One holding her right now lets go first.
reset();
plant(HYP, "starlight");
say("starlight", HYP);
check("set up: GameBot's trigger is holding her", voice.isTriggerInEffect(storage.listTriggers()[0]), true);
access.changeAccess(HYP, "GameBot", "blocked");
check("blocked: a holding trigger is released and forgotten", storage.listTriggers().length, 0);

// --- 4. Toy ------------------------------------------------------------------------------------------
reset();
storage.setToyMode(false);
access.changeAccess(REI, "Rei", "toy");
check("Toy: toy mode for Rei with toy mode off", session.toyModeFor(REI), true);
check("  but not for anyone else", session.toyModeFor(VEX), false);
storage.setToyMode(true);
storage.setToyScope("everyone");
access.changeAccess(VEX, "Vex", "blocked");
check("Blocked beats toy mode for everyone", session.toyModeFor(VEX), false);
storage.setToyMode(false);

// --- 5. her locks hold the list ----------------------------------------------------------------------
reset();
storage.startExtremeLock("trial");
check("Extreme: the list can't change", [access.changeAccess(REI, "Rei", "blocked") !== "", storage.accessLevelOf(REI)], [true, "normal"]);
storage.clearExtremeLock();
storage.setFeature("lockedWhileHypnotized", true);
under(HYP);
check("session lock: refused while under", [/locked while a session/.test(access.changeAccess(REI, "Rei", "blocked")), storage.accessLevelOf(REI)], [true, "normal"]);
session.safeword();
storage.setFeature("lockedWhileHypnotized", false);
check("yourself: refused", access.changeAccess(1, "Missy", "blocked"), "That's you.");

// --- 6. blocking a keyholder asks about their keys ---------------------------------------------------
reset();
storage.setKeyholder(REI, "Rei", "full");
access.changeAccess(REI, "Rei", "blocked");
check("blocking a keyholder: the popup asks", [!!askButton("Take their keys back"), !!askButton("Keep their keys")], [true, true]);
askButton("Take their keys back")?.click();
await settle();
check("  Accept takes their keys back", storage.listKeyholders().some((k) => k.id === REI), false);
check("  and she is told", said.some((t) => /Rei no longer holds your keys/.test(t)), true);
access.changeAccess(REI, "Rei", "normal");
storage.setKeyholder(REI, "Rei", "moderate");
access.changeAccess(REI, "Rei", "blocked");
askButton("Keep their keys")?.click();
await settle();
check("  Decline keeps them", storage.listKeyholders().find((k) => k.id === REI)?.mode, "moderate");
check("not a keyholder: nothing asked", access.offerKeysBack(VEX, "Vex"), "none");
storage.removeKeyholder(REI);

// --- 7. the command, and what a keyholder sees -------------------------------------------------------
reset();
check("/echs access Rei toy", [/Rei is now Toy/.test(echs("Rei toy")), storage.accessLevelOf(REI)], [true, "toy"]);
echs(`${VEX} blocked`);
check("/echs access <number> blocked", storage.accessLevelOf(VEX), "blocked");
const listed = echs("");
check("/echs access lists both", [/Blocked: Vex \(#424242\)/.test(listed), /Toy: Rei \(#999\)/.test(listed)], [true, true]);
check("a wrong level: usage", /Usage: \/echs access/.test(echs("Rei sometimes")), true);
storage.setKeyholder(HYP, "GameBot", "minimal");
hidden = [];
incoming(HYP, { type: "remote-request", feature: "settings", action: "read" });
const snap = hidden.find((m) => m.to === HYP && m.settings)?.settings;
check("a keyholder's snapshot carries the list, names and levels only", snap?.access, [{ name: "Rei", level: "toy" }, { name: "Vex", level: "blocked" }]);

console.log(`access: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
