// Held still: "you cannot move" holds the pose and the place, v0.91.0 (DW, 2026-09-26).
//
// BC's own Freeze blocks the Leave button and makes standing<->kneeling a struggle; arm poses and
// same-category changes stay free, and on a map it only slows walking. DW's answers: our freeze now
// (1) refuses her own pose changes, while the hypnotist's spoken pose commands still move her;
// (2) undoes another player changing her pose; (3) applies to the trance's own Cannot Move default
// too; and on a map adds BC's MapImmobile, which stops walking outright. Items are not blocked.
//
// BC's functions below are trimmed transcriptions of R132 (Pose.js PoseSetActive, Character.js
// CharacterGetEffects / CharacterLoadEffect / the deprecated CharacterSetActivePose alias,
// ChatRoom.js ChatRoomSyncCharacter / ChatRoomSyncPose). Hooks go in through a stand-in for the mod
// SDK's hookFunction, which wraps the global (hook first, then next), as bcModSdk does.
//
// Every check states what failure looks like.
const HYP = 246108;
const emoticonAsset = { Name: "Emoticon", Group: { Name: "Emoticon" }, Effect: [], AllowEffect: [] };
globalThis.Asset = [emoticonAsset];
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {},
	Appearance: [{ Asset: emoticonAsset, Property: {} }],
	Effect: [], ActivePose: ["BaseUpper", "BaseLower"],
	IsPlayer() { return true; },
	HasEffect(e) { return this.Effect.includes(e); },
	CanWalk() { return !this.HasEffect("Freeze"); },
};
globalThis.CharacterGetEffects = (C, Groups = undefined) => {
	const total = [];
	for (const item of C.Appearance) {
		if (Array.isArray(Groups) && Groups.length && !Groups.includes(item.Asset.Group.Name)) continue;
		for (const e of [...(item.Property?.Effect ?? []), ...(item.Asset.Effect ?? [])]) if (!total.includes(e)) total.push(e);
	}
	return total;
};
globalThis.CharacterLoadEffect = (C) => { C.Effect = CharacterGetEffects(C); };
globalThis.CharacterRefresh = () => {};
const LOWER = ["BaseLower", "Kneel", "KneelingSpread", "LegsClosed", "Spread"];
globalThis.PoseSetActive = (C, pose) => {
	const upper = C.ActivePose.find((p) => !LOWER.includes(p)) ?? "BaseUpper";
	const lower = C.ActivePose.find((p) => LOWER.includes(p)) ?? "BaseLower";
	if (pose == null) C.ActivePose = ["BaseUpper", "BaseLower"];
	else if (LOWER.includes(pose)) C.ActivePose = [upper, pose];
	else C.ActivePose = [pose, lower];
};
globalThis.CharacterSetActivePose = (C, pose) => PoseSetActive(C, pose);
// R132 Pose.js, trimmed: BC's own Freeze makes a cross-category change (stand<->kneel) a struggle.
globalThis.PoseChangeStatus = { NEVER: 0, NEVER_WITHOUT_AID: 1, ALWAYS_WITH_STRUGGLE: 2, ALWAYS: 3 };
globalThis.PoseCanChangeUnaidedStatus = (C, pose) => (C.HasEffect("Freeze") && LOWER.includes(pose) ? PoseChangeStatus.ALWAYS_WITH_STRUGGLE : PoseChangeStatus.ALWAYS);
// Another player's sync of her whole character: BC loads the pose (and items) that came with it.
globalThis.ChatRoomSyncCharacter = (data) => {
	if (data.Character.MemberNumber !== Player.MemberNumber) return;
	Player.ActivePose = [...data.Character.ActivePose];
	if (data.Character.Appearance) Player.Appearance = data.Character.Appearance;
};
globalThis.ChatRoomSyncPose = (data) => { if (data.MemberNumber === Player.MemberNumber) Player.ActivePose = [...data.Pose]; };
let poseUpdates = [];
let said = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomCharacterPoseUpdate") poseUpdates.push([...data.Pose]); };
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
// The mod SDK's hook chain, WITH priorities: highest runs first, each passes on via next(), and the
// original BC function runs at the end. v0.91.0's stand-in ignored priority, which is exactly why it
// could not catch what DW hit live (v0.91.1 check: WCE and LSCG also hook PoseSetActive).
const chains = {};
const modApi = {
	hookFunction(name, priority, hook) {
		if (!chains[name]) {
			const original = globalThis[name];
			chains[name] = { original, hooks: [] };
			globalThis[name] = (...args) => {
				const { hooks } = chains[name];
				const run = (i, a) => (i < hooks.length ? hooks[i].hook(a, (n) => run(i + 1, n)) : chains[name].original(...a));
				return run(0, args);
			};
		}
		chains[name].hooks.push({ priority, hook });
		chains[name].hooks.sort((a, b) => b.priority - a.priority);
	},
};
// ANOTHER ADD-ON, as DW's live check found them: a PoseSetActive hook at a higher priority than our
// old 5, which applies the pose itself and never passes the call on. Failure: it runs before our hold.
const bcPoseSetActive = globalThis.PoseSetActive;
modApi.hookFunction("PoseSetActive", 50, (args) => { bcPoseSetActive(...args); return undefined; });

const { effects, storage, session, voice } = await import("./harness-bundle.mjs");
effects.installEffectAllowList();
effects.installEffectHooks(modApi);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
// Real time moves on between blocks, so the once-per-5-seconds notice can be seen again.
const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;
const later = () => { offset += 60_000; said = []; poseUpdates = []; }; // past the 30 s notice gap

// --- not held: poses are hers ------------------------------------------------------------------
PoseSetActive(Player, "Kneel");
check("not held: she can kneel", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  and no MapImmobile", Player.Effect.includes("MapImmobile"), false);

// --- held: her own changes are refused ----------------------------------------------------------
// Failure: she stands up, or raises her arms, while "you cannot move" holds her.
effects.applyEffect("Freeze");
check("held: BC sees Freeze", Player.HasEffect("Freeze"), true);
check("  and MapImmobile, so a map cannot be walked", Player.HasEffect("MapImmobile"), true);
check("  but a question about another slot sees neither", CharacterGetEffects(Player, ["ItemFeet"]).includes("MapImmobile"), false);
PoseSetActive(Player, "BaseLower");
check("held: standing up is refused", Player.ActivePose, ["BaseUpper", "Kneel"]);
PoseSetActive(Player, "OverTheHead");
check("  and so is an arm pose (BC's own Freeze allows these)", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  and she is told, once", said.filter((s) => /your body does not answer/.test(s)).length, 1);

// --- the kneel/stand button is Blocked, as a real restraint makes it (v0.91.3) -------------------------
// BC's own Freeze answers ALWAYS_WITH_STRUGGLE (the yellow "Limited" button, whose mini-game posts
// "stands up" before asking for the pose). Failure: anything but NEVER for a pose she is not in.
check("held: standing answers NEVER (button Blocked)", PoseCanChangeUnaidedStatus(Player, "BaseLower"), PoseChangeStatus.NEVER);
check("  an arm pose too", PoseCanChangeUnaidedStatus(Player, "OverTheHead"), PoseChangeStatus.NEVER);
check("  the pose she is already in is left to BC", PoseCanChangeUnaidedStatus(Player, "Kneel") !== PoseChangeStatus.NEVER, true);

// --- asking for the pose she is already in is not an attempt to move (v0.91.3) -------------------------
// DW saw the refusal line "over and over". Failure: any line for a call that changes nothing.
later();
for (let i = 0; i < 5; i++) PoseSetActive(Player, "Kneel");
check("repeated calls for her current pose: no refusal line", said.filter((s) => /your body does not answer/.test(s)).length, 0);
check("  and the pose is unchanged", Player.ActivePose, ["BaseUpper", "Kneel"]);

// --- an add-on that changes her pose WITHOUT PoseSetActive -------------------------------------------
// The safety net: every pose update she sends passes ServerSend. Failure: the room is told she stood.
later();
Player.ActivePose = ["BaseUpper", "BaseLower"]; // set directly, round every hook
ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
check("a pose set round every hook is put back before it is sent", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  and the room is sent the held pose", poseUpdates.at(-1), ["BaseUpper", "Kneel"]);
check("  and she is told", said.some((s) => /your body does not answer/.test(s)), true);

// --- the hypnotist's spoken pose commands still move her (DW: yes) ---------------------------------
// Failure: "Missy, stand" is refused like her own attempt.
later();
check("our own pose change goes through", effects.setSuggestedPose("BaseLower", "stance"), true);
check("  she stands", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  and the room is told her new pose", poseUpdates.at(-1), ["BaseUpper", "BaseLower"]);
effects.setSuggestedPose("Kneel", "stance");

// --- another player cannot change her pose (DW: no) -------------------------------------------------
// Failure: their "help her stand" sticks.
later();
ChatRoomSyncCharacter({ SourceMemberNumber: HYP, Character: { MemberNumber: 1, ActivePose: ["BaseUpper", "BaseLower"] } });
check("someone else's pose change is undone", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  and the room is re-told her held pose", poseUpdates.at(-1), ["BaseUpper", "Kneel"]);
check("  and she is told", said.some((s) => /Someone tries to move you/.test(s)), true);
later();
ChatRoomSyncPose({ MemberNumber: 1, Pose: ["BaseUpper", "BaseLower"] });
check("a bare pose update about her is refused too", Player.ActivePose, ["BaseUpper", "Kneel"]);
// Items still apply (not blocked): a sync with new items and her own pose keeps the items.
const cuffs = { Asset: { Name: "Cuffs", Group: { Name: "ItemArms" }, Effect: [] }, Property: {} };
ChatRoomSyncCharacter({ SourceMemberNumber: HYP, Character: { MemberNumber: 1, ActivePose: ["BaseUpper", "Kneel"], Appearance: [...Player.Appearance, cuffs] } });
check("an item someone puts on her still goes on", Player.Appearance.some((i) => i.Asset.Name === "Cuffs"), true);
// Her own syncs are hers: nothing is undone.
ChatRoomSyncCharacter({ SourceMemberNumber: 1, Character: { MemberNumber: 1, ActivePose: ["BaseUpper", "Kneel"] } });
check("her own sync is left alone", Player.ActivePose, ["BaseUpper", "Kneel"]);

// --- released: hers again ------------------------------------------------------------------------
// Failure: still held after the freeze comes off.
effects.removeEffect("Freeze");
PoseSetActive(Player, "BaseLower");
check("released: she can stand", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  and MapImmobile is gone", Player.HasEffect("MapImmobile"), false);
check("  and the button is hers again", PoseCanChangeUnaidedStatus(Player, "Kneel"), PoseChangeStatus.ALWAYS);

// --- the trance's own Cannot Move holds her too (DW: yes) -------------------------------------------
later();
for (const k of ["hypnoEnabled", "tranceCannotMove"]) storage.setFeature(k, true);
session.forceTrance(HYP, 80, 80);
PoseSetActive(Player, "Kneel");
check("in trance with Cannot Move: her own kneel is refused", Player.ActivePose, ["BaseUpper", "BaseLower"]);
// Walking trance lifts the freeze, and with it the hold.
voice.handleSpokenLine(HYP, "Missy, walk with me");
PoseSetActive(Player, "Kneel");
check("walking trance: she can move again", Player.ActivePose, ["BaseUpper", "Kneel"]);
// The safeword always ends it.
session.forceTrance(HYP, 80, 80);
session.safeword();
PoseSetActive(Player, "BaseLower");
check("after the safeword: hers again", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  nothing held", [effects.isHeldStill(), Player.HasEffect("MapImmobile")], [false, false]);

console.log(`held-still: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
