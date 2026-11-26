// One answer per compulsion line (v1.16.33, UI lab review F2). A compulsion whose action ECHS does
// not know used to send "RECORDING...", "Noted..." and "Nothing after that could be kept", all twice;
// "remember trigger" and the options with nothing recording got no answer at all.
//
// Failure looks like: more than one notice for a failed line, RECORDING sent for nothing, a silent
// "remember trigger", patter answered as an option, or a working compulsion losing its notices.
// + "this trigger holds while you wear it". It holds on no timer until the gag comes off, re-applies
// arousal and orgasm every 2 minutes meanwhile, and the release words and safeword still end it.
//
// Failure looks like: the option not parsed or silently kept on a word trigger; a timer releasing it
// while the gag is still on; it never letting go when the gag comes off (or another item replaces
// it); undressing repeated; no repeat; or the watch left running after the safeword.
const HYP = 246108, REI = 999, ZED = 555, OTHER_HYP = 424242;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: OTHER_HYP, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
const lastToHyp = () => toHyp[toHyp.length - 1] ?? "";
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let spoken = [];
globalThis.ChatRoomSendChatMessage = (msg) => { spoken.push(msg); return true; };
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


// What she wears, slot -> { Asset: { Name }, Property }, read by the add-on through BC's InventoryGet.
const wearing = {};
globalThis.InventoryGet = (C, g) => (C === Player ? wearing[g] ?? null : null);
const { voice, storage, session, timers } = await import('./harness-bundle.mjs');

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let arousalSet = [];
globalThis.ActivitySetArousal = (C, p) => { arousalSet.push(p); C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl", "postureControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10); // a timer that WOULD release an ordinary hold after 10 minutes
let clock = Date.now();
Date.now = () => clock;
const MIN = 60_000;
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const only = () => storage.listTriggers().find((t) => t.fireOn);
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; arousalSet = []; for (const k of Object.keys(wearing)) delete wearing[k]; clock += MIN; };
const rei = ChatRoomCharacter.find((c) => c.MemberNumber === REI);
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
const putOn = (group, name, by = rei) => {
	wearing[group] = { Asset: { Name: name, Group: { Name: group } }, Property: {} };
	handler.Callback({ Type: "Action", Content: "ActionUse" }, by, "", { TargetMemberNumber: Player.MemberNumber, GroupName: group, Assets: { NextAsset: { Name: name, Group: { Name: group } } } });
	drainPaced();
};

// --- a compulsion whose action ECHS doesn't know: one answer, naming it -------------------------------
reset(); under();
say("Missy, whenever anyone gags you, your arms go limp");
check("unknown action: one notice, no RECORDING or Noted", [toHyp.length, toHyp.some((t) => /Recording |Noted/.test(t))], [1, false]);
check("unknown action: names it and says what to do", /"your arms go limp" isn't something ECHS knows how to do.*Suggestions.*\/echs match/.test(toHyp[0] ?? ""), true);
check("unknown action: nothing planted", storage.listTriggers().length, 0);

// --- lines that only mean something while recording: answered, once --------------------------------
const NOT_REC = /Nothing is being recorded right now/;
for (const line of ["Missy, remember trigger", "Missy, this trigger holds while you wear it", "Missy, this trigger works once", "Missy, the trigger works every time"]) {
	toHyp = [];
	say(line);
	check(`nothing recording: "${line}" answered once`, [toHyp.length, NOT_REC.test(toHyp[0] ?? "")], [1, true]);
}
// "it" may be patter about anything: no answer for an option that doesn't name a trigger.
toHyp = [];
say("Missy, it will last ten minutes");
check("patter that only looks like an option: no answer", toHyp, []);

// --- the rest refused while recording: its refusal, one closing line, not read again live -----------
reset(); storage.setFeature("arousalControl", false); under();
say("Missy, whenever anyone gags you, you are very aroused");
check("refused rest: the refusal, then one closing line", [toHyp.length, /Refused/.test(toHyp[0] ?? ""), toHyp[1]], [2, true, "[trigger] So no compulsion was set up."]);
storage.setFeature("arousalControl", true);

// --- after a wake clause: still under, and told so, once ---------------------------------------------
reset(); under();
say("Missy, when you wake, your arms go limp");
check("wake clause, unknown: one notice, still under", [toHyp.length, /still under/.test(toHyp[0] ?? ""), session.isSessionActiveWith(HYP)], [1, true, true]);

// --- a compulsion that works: every notice still goes, in order --------------------------------------
reset(); under();
say("Missy, whenever anyone gags you, kneel");
check("kept: RECORDING, Noted, Recorded, in that order", toHyp.map((t) => /Recording /.test(t) ? "R" : /Noted/.test(t) ? "N" : /Recorded/.test(t) ? "A" : "?"), ["R", "N", "A"]);
toHyp = [];
say("Missy, remember trigger");
check("kept: remember trigger saves it", [storage.listTriggers().length, /Saved /.test(toHyp[0] ?? "")], [1, true]);

// --- a refused start is still told (held, then sent) --------------------------------------------------
reset(); storage.setFeature("triggerControl", false); under();
say("Missy, whenever anyone gags you, kneel");
check("refused start: the refusal reaches the hypnotist", toHyp.some((t) => /Refused/.test(t)), true);
storage.setFeature("triggerControl", true);

console.log(`notice-once: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
