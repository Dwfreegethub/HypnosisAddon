// Her stance survives a reload, v0.96.1 (DW, 2026-09-26: "if I choose fight at the start it will
// automatically be in fight mode for each attempt to go deeper").
//
// It is, within one page: the prompt sets the stance and nothing clears it when she goes under. But
// the stance was not saved, so a mid-trance reload restored the trance with no stance, which rolls
// as Ignore and never fights back up. This runs the whole chain, as relog.mjs does: a real
// induction answered Fight, a save, a genuinely fresh copy of the bundle, a restore.
// Failure: the restored trance is not fighting.
const HYP = 246108;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "Eri" }];
const store = {};
globalThis.localStorage = { getItem(k) { return store[k] ?? null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.ChatRoomSendLocal = () => {};
let now = Date.parse("2026-09-26T20:00:00Z");
Date.now = () => now;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = (fn, ms = 0) => { pending.push({ fn, ms, live: true, every: true }); return pending.length; };
globalThis.clearInterval = globalThis.clearTimeout;

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const stance = (m) => (m.session.describeSession().match(/choice=(\w+)/) ?? [])[1] ?? null;

// --- page one: a real induction, answered Fight ----------------------------------------------
const one = await import("./harness-bundle.mjs");
one.storage.setFeature("hypnoEnabled", true);
one.storage.setFeature("tranceCannotMove", false);
one.session.installSession();
one.messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri" } }] });
one.session.answerPrompt("fight");
// An owner, so a Fight lands even at the lowest 2d10 spread (v0.97.0: a landing at 0 slips away).
one.storage.setRelationshipOverride(HYP, "owner");
Math.random = () => 0;
const roll = pending.filter((t) => t.live && t.ms === 60_000).pop();
roll.live = false;
roll.fn();
check("under", one.session.isHypnotized(), true);
check("  still fighting once under", stance(one), "fight");

// --- the reload -----------------------------------------------------------------------------------
pending.forEach((t) => (t.live = false));
now += 60_000;
const two = await import("./harness-bundle.mjs?reload=stance");
two.session.installSession();
two.recovery.attemptRecovery();
check("restored under", two.session.isHypnotized(), true);
check("  and still fighting", stance(two), "fight");

console.log(`stance-reload: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
