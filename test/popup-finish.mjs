// What a trigger can hold, as the popup greys it (v1.16.27; DW 2026-11-24, after the UI lab
// review). While the chat box holds the start of a compulsion, the Suggestions tab greys what a
// trigger can't hold (popup-suggest.ts notInTrigger) and adds the rest to the line. This plants
// EVERY Suggestions wording as a compulsion's action, with every permission granted, and checks the
// greying matches what voice.ts really keeps.
//
// Failure looks like: a wording greyed that would have planted (the hypnotist kept from something
// that works), or one left clickable that is refused (the F2 trap the review found).
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

const { voice, storage, triggers, session, timers, popupSuggest } = await import("./harness-bundle.mjs");
// The things BC itself would do when an action is performed, which planting never reaches.
globalThis.ActivitySetArousal ??= () => {};
globalThis.CurrentTime ??= Date.now();

let pass = 0, fail = 0;
const check = (label, ok, failure) => {
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label} — expected ${failure}`);
};
for (const k of Object.keys(storage.getFeatures())) if (!/extreme|lock/i.test(k)) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);
let clock = Date.now();
Date.now = () => clock;
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };

const greyedButPlants = [], clickableButRefused = [];
let planted = 0, greyed = 0;
for (const cat of popupSuggest.suggestCategories())
	for (const it of cat.items)
		for (const phrase of [it.phrase, ...it.alternates]) {
			session.safeword();
			timers.clearAllTimers();
			storage.forgetAllTriggers();
			toHyp = [];
			clock += 60_000;
			session.forceTrance(HYP, 80, 80);
			try {
				say(`Missy, when anyone kisses you, ${phrase}`);
				say("Missy, remember trigger");
			} catch (e) {
				toHyp.push(`threw ${e.message}`);
			}
			const kept = storage.listTriggers().some((t) => t.fireOn === "act");
			const refused = popupSuggest.notInTrigger(it, phrase);
			if (kept) planted++;
			if (refused) greyed++;
			if (kept && refused) greyedButPlants.push(`${it.id} "${phrase}"`);
			if (!kept && !refused) clickableButRefused.push(`${it.id} "${phrase}": ${toHyp.slice(1).join(" / ").slice(0, 120)}`);
		}
check("the run planted most wordings", planted > 150, `over 150 wordings planted, got ${planted}`);
check("and greyed some", greyed >= 20, `at least 20 greyed, got ${greyed}`);
check("nothing greyed that plants", greyedButPlants.length === 0, `none, got ${greyedButPlants.join("; ")}`);
check("nothing clickable that is refused", clickableButRefused.length === 0, `none, got ${clickableButRefused.join("; ")}`);
// The reasons a player reads.
const item = (id) => popupSuggest.suggestCategories().flatMap((c) => c.items).find((i) => i.id === id);
check("a trance move says so", /trance move/.test(popupSuggest.notInTrigger(item("x-deeper")) ?? ""), "the trance-move reason for sink deeper");
check("kiss me says it aims at a person", /aim at a person/.test(popupSuggest.notInTrigger(item("x-kiss-me")) ?? ""), "the aimed-at-a-person reason for kiss me");
check("one odd wording, not its line", popupSuggest.notInTrigger(item("stand"), "on your feet") !== null && popupSuggest.notInTrigger(item("stand"), "stand") === null, "on your feet greyed, stand not");

console.log(`popup-finish: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
