// Follow / leash (v1.1.0): BC's own leash pulls the subject between rooms, with no leash item and no
// Hold Leash click. Technique from LSCG's leashing module; see src/follow.ts. Each check says what
// failure looks like. BC's own functions are stood in for by the `next` each hook is given.
const HYP = 246108;
const STRANGER = 777;
const SUBJECT = 2;

const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [], ActivePose: [],
	OnlineSharedSettings: { AllowPlayerLeashing: true },
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
const hyp = { MemberNumber: HYP, Name: "GameBot", IsPlayer: () => false };
const sub = { MemberNumber: SUBJECT, Name: "Rei", IsPlayer: () => false };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacter = [Player, hyp, sub];
globalThis.ChatRoomData = { Name: "Hypno Testing", BlockCategory: [] };
globalThis.ChatRoomLeashPlayer = null;
globalThis.ChatRoomLeashList = [];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect]);
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
const local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = () => {};
/** Our hidden messages, as [target, type], and the AccountBeeps sent. */
const hidden = [];
const beeps = [];
const toHyp = [];
globalThis.ServerSend = (t, data) => {
	if (t === "AccountBeep") beeps.push([data.MemberNumber, data.BeepType]);
	const m = data?.Dictionary?.[0]?.message;
	if (!m) return;
	hidden.push([data.Target, m.type]);
	if (m.type === "trigger-status") toHyp.push(m.text);
};
// The 8-second wait for the hypnotist's acknowledgement runs when the test says, not in real time.
const ackTimers = [];
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
globalThis.setTimeout = (fn, ms, ...a) => {
	if (ms !== 8000) return realSetTimeout(fn, ms, ...a);
	const t = { fake: true, cleared: false };
	ackTimers.push(() => { if (!t.cleared) fn(); });
	return t;
};
globalThis.clearTimeout = (t) => (t?.fake ? (t.cleared = true) : realClearTimeout(t));

const { voice, storage, session, follow, messaging, recovery } = await import("./harness-bundle.mjs");
session.installSession();
const hooks = {};
follow.installFollow({ hookFunction: (name, _p, fn) => (hooks[name] = fn) });

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const hear = (line) => voice.handleSpokenLine(HYP, line);
const sentTo = (target, type) => hidden.some(([t, ty]) => t === target && ty === type);
const receive = (sender, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: sender, Dictionary: [{ message }] });
// BC's own answer when ECHS does not step in: no leash item, so no.
const canBeLeashedBy = (source, C = Player) => hooks.ChatRoomCanBeLeashedBy([source, C], () => false);
const bcCanLeave = () => true;

// --- setup --------------------------------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("followControl", true);
check("setup: under with the hypnotist", session.forceTrance(HYP, 50, 50), null);

// --- the subject's side -------------------------------------------------------------------------
check("before: the hypnotist cannot lead her", canBeLeashedBy(HYP), false);
hear("Missy, follow me");
check("'follow me' puts the compulsion on", follow.isFollowActive(), true);
check("  following the one who said it", follow.followTargetId(), HYP);
check("  the hypnotist's ECHS is told", sentTo(HYP, "follow-on"), true);
check("  no Leash effect is injected any more", emoticon.Property.Effect.includes("Leash"), false);
// Failure: BC still wants a leash item, which was the whole bug.
check("the hypnotist may now lead her, with no leash item", canBeLeashedBy(HYP), true);
check("  a stranger still may not", canBeLeashedBy(STRANGER), false);
check("  nor does it make anyone else leashable on her screen", canBeLeashedBy(HYP, hyp), false);
Player.Appearance.push({ Asset: { Name: "Cage", Effect: ["Enclose"] } });
check("  shut in a cage she cannot be led, as with BC's own leash", canBeLeashedBy(HYP), false);
Player.Appearance.pop();
ChatRoomData.BlockCategory = ["Leashing"];
check("  nor out of a room that blocks leashing", canBeLeashedBy(HYP), false);
ChatRoomData.BlockCategory = [];

// The beep. BC's handler only follows ChatRoomLeashPlayer, and reads it before its first await.
let seenByBC = "not called";
const bcBeep = () => { seenByBC = ChatRoomLeashPlayer; return Promise.resolve(); };
await hooks.ServerHandleLeashBeep([{ MemberNumber: HYP, ChatRoomName: "Elsewhere" }], bcBeep);
check("the hypnotist's beep: BC sees them as her leash holder", seenByBC, HYP);
check("  and the real value is put back after", ChatRoomLeashPlayer, null);
ChatRoomLeashPlayer = 555;
await hooks.ServerHandleLeashBeep([{ MemberNumber: HYP, ChatRoomName: "Elsewhere" }], bcBeep);
check("  a real leash held by someone else is restored, not cut", ChatRoomLeashPlayer, 555);
ChatRoomLeashPlayer = null;
seenByBC = "not called";
await hooks.ServerHandleLeashBeep([{ MemberNumber: STRANGER, ChatRoomName: "Elsewhere" }], bcBeep);
check("a stranger's beep is left to BC, which ignores it", seenByBC, null);
// Failure: a second beep mid-join pulls her back out of the room she is entering.
let calls = 0;
let finishJoin;
const slowBeep = () => { calls++; return new Promise((r) => (finishJoin = r)); };
const first = hooks.ServerHandleLeashBeep([{ MemberNumber: HYP, ChatRoomName: "Elsewhere" }], slowBeep);
await hooks.ServerHandleLeashBeep([{ MemberNumber: HYP, ChatRoomName: "Elsewhere" }], slowBeep);
check("a second beep for the room she is joining is ignored", calls, 1);
finishJoin();
await first;

// Leaving.
check("she cannot walk out while the hypnotist is here", hooks.ChatRoomCanLeave([], bcCanLeave), false);
ChatRoomCharacter = [Player, sub];
check("  once they have gone, BC decides again", hooks.ChatRoomCanLeave([], bcCanLeave), true);
ChatRoomCharacter = [Player, hyp, sub];

// No acknowledgement means the hypnotist has no ECHS.
check("one wait for an acknowledgement", ackTimers.length, 1);
local.length = 0;
ackTimers[0]();
check("no answer: she is told the pull cannot lead her anywhere", local.some((l) => l.includes("isn't running ECHS")), true);
hear("Missy, you can leave");
hear("Missy, follow me");
receive(HYP, { type: "follow-ack" });
local.length = 0;
ackTimers[ackTimers.length - 1]();
check("answered: no warning", local.some((l) => l.includes("isn't running ECHS")), false);

// Saved for a reload.
check("a reload's save carries the follow and its leader", recovery.snapshotLocalState().follow, { leader: HYP });

// Release.
hidden.length = 0;
hear("Missy, you can leave");
check("'you can leave' takes it off", follow.isFollowActive(), false);
check("  and the hypnotist's ECHS is told", sentTo(HYP, "follow-off"), true);
check("  she can no longer be led by them", canBeLeashedBy(HYP), false);
check("  and may leave", hooks.ChatRoomCanLeave([], bcCanLeave), true);
check("  the save no longer has it", recovery.snapshotLocalState().follow, undefined);

// Her own leashing setting off: rule 5, it does not land and the hypnotist hears why.
Player.OnlineSharedSettings.AllowPlayerLeashing = false;
toHyp.length = 0;
hear("Missy, follow me");
check("leashing off in her settings: nothing is put on", follow.isFollowActive(), false);
check("  and the hypnotist is told why", toHyp.some((t) => t.includes("can't be led between rooms") && t.includes("setting")), true);
Player.OnlineSharedSettings.AllowPlayerLeashing = true;

// The safeword.
hear("Missy, follow me");
check("setup: following again", follow.isFollowActive(), true);
session.safeword();
check("the safeword ends the follow", follow.isFollowActive(), false);
check("  and she can leave", hooks.ChatRoomCanLeave([], bcCanLeave), true);

// --- the hypnotist's side -----------------------------------------------------------------------
local.length = 0;
hidden.length = 0;
receive(SUBJECT, { type: "follow-on" });
check("a subject's follow-on is acknowledged", sentTo(SUBJECT, "follow-ack"), true);
check("  and the hypnotist is told they will be followed", local.some((l) => l.includes("Rei will follow you")), true);
let bcPinged = false;
beeps.length = 0;
hooks.ChatRoomPingLeashedPlayers([], () => { bcPinged = true; });
check("on a room change BC's own ping still runs", bcPinged, true);
check("  and the follower is called with a Leash beep", beeps, [[SUBJECT, "Leash"]]);
ChatRoomLeashList = [SUBJECT];
beeps.length = 0;
hooks.ChatRoomPingLeashedPlayers([], () => {});
check("  not twice when BC already holds their leash", beeps, []);
ChatRoomLeashList = [];
local.length = 0;
receive(SUBJECT, { type: "follow-on", again: true });
check("a repeat follow-on says nothing new", local.length, 0);
receive(SUBJECT, { type: "follow-off" });
beeps.length = 0;
hooks.ChatRoomPingLeashedPlayers([], () => {});
check("after follow-off they are no longer called", beeps, []);
check("  and the hypnotist is told", local.some((l) => l.includes("Rei no longer follows you")), true);

console.log(`follow: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
