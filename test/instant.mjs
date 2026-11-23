// Instant actions (v1.16.11; a player's suggestion, DW 2026-11-22): an orgasm, undressing, an arousal
// level or a release is over the moment it lands, so a trigger made only of those starts no expiry
// timer and never "holds" her. One that also holds something ("you cannot move") still does.
//
// Failure looks like: an arousal-only trigger reported as holding her (forgettrigger refused, a
// one-time one kept until a timer runs out, a "loosens on its own" line minutes later), a mixed one
// losing its timer, or the help / popup not saying which is which.
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

const { voice, storage, session, timers, popupSuggest } = await import("./harness-bundle.mjs");

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

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const byWord = (w) => storage.listTriggers().find((t) => t.phrase === w);
const plant = (word, lines, extra = []) => {
	under();
	say(`Missy, your trigger word is ${word}`);
	for (const l of lines) say(`Missy, ${l}`);
	for (const l of extra) say(`Missy, ${l}`);
	say("Missy, remember trigger");
	session.wakeByHypnotist(HYP);
	return byWord(word);
};

// --- the table ------------------------------------------------------------------------------------
const help = voice.suggestionHelp();
const instantIds = help.filter((s) => s.instant).map((s) => s.id).sort();
check("instant: the one-off events", instantIds, ["arousal-full", "arousal-high", "arousal-light", "arousal-none", "orgasm-force", "undress", "undress-all"]);
check("  a hold is not", help.find((s) => s.id === "movement-block")?.instant, false);
check("  a release is not marked (it is obviously over)", help.filter((s) => s.release && s.instant).length, 0);

// --- an instant-only trigger ---------------------------------------------------------------------------
let t = plant("hot flush", ["you are very aroused"], ["this trigger works only once"]);
check("planted", t?.actions, ["arousal-high"]);
arousalSet = [];
say("hot flush");
check("fires: the arousal is set", arousalSet.length, 1);
check("  not holding her", voice.isTriggerInEffect(t), false);
check("  a one-time one is gone at once", byWord("hot flush"), undefined);
check("  no expiry timer left behind", timers.timerDeadline(`trigger:${HYP}:hot flush`), 0);

// Every time: stays, still never holding.
t = plant("warm glow", ["you are very aroused"]);
say("warm glow");
check("every time: stays planted", !!byWord("warm glow"), true);
check("  and not holding", voice.isTriggerInEffect(byWord("warm glow")), false);

// --- a mixed trigger keeps its timer ---------------------------------------------------------------
t = plant("stuck", ["you are very aroused", "you cannot move"]);
say("stuck");
check("mixed: holding her (for the not moving)", voice.isTriggerInEffect(byWord("stuck")), true);
check("  with an expiry timer", timers.timerDeadline(`trigger:${HYP}:stuck`) > 0, true);

// --- shown as such ----------------------------------------------------------------------------------
{
	const items = popupSuggest.suggestCategories().flatMap((c) => c.items);
	check("popup: orgasm marked instant", items.find((i) => i.id === "orgasm-force")?.instant, true);
	check("popup: made-to-act marked instant", items.find((i) => i.id === "x-touch-self")?.instant, true);
	check("popup: kneel not", !!items.find((i) => i.id === "kneel")?.instant, false);
}

console.log(`instant: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
