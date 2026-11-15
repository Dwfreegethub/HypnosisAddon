// Held still: "you cannot move" holds the pose and the place, v0.91.0 (DW, 2026-09-26).
//
// BC's own Freeze blocks the Leave button and makes standing<->kneeling a struggle; arm poses and
// same-category changes stay free, and on a map it only slows walking. DW's answers: our freeze now
// (1) refuses her own pose changes, while the hypnotist's spoken pose commands still move her;
// (2) undoes another player changing her pose; (3) applies to the trance's own Cannot Move default
// too; and on a map adds BC's MapImmobile, which stops walking outright. Items are not blocked.
//
// v1.12.0 (DW, 2026-11-14) splits (2) into two levels. "You cannot move": she cannot move herself,
// and anyone else may still adjust her. "No one can move you": no one else can either, which was
// the old behaviour. Whose change it is comes from the event being handled (window.event): her own
// clicks and keys are hers, a socket message or a timer is not. asHer() / fromRemote() stand in for
// those, as the browser would set them.
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
// ANOTHER ADD-ON, as DW's live checks found them: a PoseSetActive hook at a higher priority than our
// old 5, which applies the pose itself and never passes the call on (v0.91.2) — AND refuses to pose a
// character who is frozen, as BC's own rules would (v0.92.3: once our Freeze really held, the
// hypnotist's spoken pose commands were refused). Failure: it runs before our hold, or it refuses
// the hypnotist.
const bcPoseSetActive = globalThis.PoseSetActive;
modApi.hookFunction("PoseSetActive", 50, (args) => {
	if (args[0].HasEffect("Freeze")) return undefined; // "frozen: can't move"
	bcPoseSetActive(...args);
	return undefined;
});

const { effects, storage, session, voice } = await import("./harness-bundle.mjs");
effects.installEffectAllowList();
effects.installEffectHooks(modApi);

// Her own click, or a message from the server (an add-on posing her for someone else).
const asHer = (fn) => { globalThis.event = { type: "click" }; try { return fn(); } finally { delete globalThis.event; } };
const fromRemote = (fn) => { globalThis.event = { type: "message" }; try { return fn(); } finally { delete globalThis.event; } };

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
asHer(() => PoseSetActive(Player, "BaseLower"));
check("held: standing up is refused", Player.ActivePose, ["BaseUpper", "Kneel"]);
asHer(() => PoseSetActive(Player, "OverTheHead"));
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
for (let i = 0; i < 5; i++) asHer(() => PoseSetActive(Player, "Kneel"));
check("repeated calls for her current pose: no refusal line", said.filter((s) => /your body does not answer/.test(s)).length, 0);
check("  and the pose is unchanged", Player.ActivePose, ["BaseUpper", "Kneel"]);

// --- an add-on that changes her pose WITHOUT PoseSetActive -------------------------------------------
// The safety net: every pose update she sends passes ServerSend. Failure: the room is told she stood.
later();
Player.ActivePose = ["BaseUpper", "BaseLower"]; // set directly, round every hook
asHer(() => ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose }));
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
check("  and the hold is back straight after (Freeze and MapImmobile)", [Player.HasEffect("Freeze"), Player.HasEffect("MapImmobile")], [true, true]);
// A REAL restraint's freeze is not ours to lift: the other add-on still refuses. Failure: our
// command pierces someone's actual bondage.
const heavy = { Asset: { Name: "HeavyChains", Group: { Name: "ItemFeet" }, Effect: ["Freeze"] }, Property: {} };
Player.Appearance.push(heavy);
CharacterLoadEffect(Player);
check("a real restraint's freeze still stops our command", [effects.setSuggestedPose("BaseLower", "stance"), Player.ActivePose], [false, ["BaseUpper", "Kneel"]]);
Player.Appearance.pop();
CharacterLoadEffect(Player);

// --- HELD: another player may still adjust her (v1.12.0) ---------------------------------------------
// Failure: their change is undone, or she is told she tried to move.
later();
ChatRoomSyncCharacter({ SourceMemberNumber: HYP, Character: { MemberNumber: 1, ActivePose: ["BaseUpper", "BaseLower"] } });
check("held: someone else's 'help her stand' sticks", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  nothing re-sent to undo it", poseUpdates.length, 0);
check("  and no refusal line", said.length, 0);
asHer(() => PoseSetActive(Player, "Kneel"));
check("  and that pose is what she is now held in: her own kneel is refused", Player.ActivePose, ["BaseUpper", "BaseLower"]);
ChatRoomSyncPose({ MemberNumber: 1, Pose: ["BaseUpper", "Kneel"] });
check("held: a bare pose update about her sticks too", Player.ActivePose, ["BaseUpper", "Kneel"]);
// DW's live report: an add-on posing her for someone else calls PoseSetActive on HER client.
later();
fromRemote(() => PoseSetActive(Player, "OverTheHead"));
check("held: an add-on posing her for someone else lands", Player.ActivePose, ["OverTheHead", "Kneel"]);
check("  and she is NOT told she tried to move (the bug)", said.some((s) => /your body does not answer/.test(s)), false);
ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
check("  and the safety net lets it be sent", poseUpdates.at(-1), ["OverTheHead", "Kneel"]);
fromRemote(() => PoseSetActive(Player, "BaseUpper"));
check("  (back to arms down, the same way)", Player.ActivePose, ["BaseUpper", "Kneel"]);
// The safety net with nobody's click behind it: kept while only held.
later();
Player.ActivePose = ["BaseUpper", "BaseLower"];
ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
check("held: a change round every hook, not hers, is kept", [Player.ActivePose, poseUpdates.at(-1)], [["BaseUpper", "BaseLower"], ["BaseUpper", "BaseLower"]]);
fromRemote(() => PoseSetActive(Player, "Kneel"));

// --- HELD FULLY: no one else can move her either (the old behaviour, now "no one can move you") ------
// Failure: their "help her stand" sticks, or she is told it was her own attempt.
effects.setHoldFully(true);
check("held fully: says so", effects.isHeldFully(), true);
later();
ChatRoomSyncCharacter({ SourceMemberNumber: HYP, Character: { MemberNumber: 1, ActivePose: ["BaseUpper", "BaseLower"] } });
check("held fully: someone else's pose change is undone", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  and the room is re-told her held pose", poseUpdates.at(-1), ["BaseUpper", "Kneel"]);
check("  and she is told", said.some((s) => /Someone tries to move you/.test(s)), true);
later();
ChatRoomSyncPose({ MemberNumber: 1, Pose: ["BaseUpper", "BaseLower"] });
check("held fully: a bare pose update about her is refused too", Player.ActivePose, ["BaseUpper", "Kneel"]);
later();
fromRemote(() => PoseSetActive(Player, "OverTheHead"));
check("held fully: an add-on posing her for someone else is refused", Player.ActivePose, ["BaseUpper", "Kneel"]);
check("  with the 'someone tries' line, not her own (DW's report)", [said.some((s) => /Someone tries to move you/.test(s)), said.some((s) => /your body does not answer/.test(s))], [true, false]);
later();
Player.ActivePose = ["BaseUpper", "BaseLower"];
ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
check("held fully: a change round every hook is put back", [Player.ActivePose, poseUpdates.at(-1)], [["BaseUpper", "Kneel"], ["BaseUpper", "Kneel"]]);
later();
asHer(() => PoseSetActive(Player, "BaseLower"));
check("held fully: her own is still refused, with her own line", [Player.ActivePose, said.some((s) => /your body does not answer/.test(s))], [["BaseUpper", "Kneel"], true]);
check("  the hypnotist's command still moves her", effects.setSuggestedPose("OverTheHead", "arms"), true);
check("  and the full hold survives it", effects.isHeldFully(), true);
effects.setSuggestedPose("BaseUpper", "arms");
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
check("released: the full hold goes with the freeze", effects.isHeldFully(), false);
asHer(() => PoseSetActive(Player, "BaseLower"));
check("released: she can stand", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  and MapImmobile is gone", Player.HasEffect("MapImmobile"), false);
check("  and the button is hers again", PoseCanChangeUnaidedStatus(Player, "Kneel"), PoseChangeStatus.ALWAYS);

// --- the trance's own Cannot Move holds her too (DW: yes) -------------------------------------------
later();
for (const k of ["hypnoEnabled", "tranceCannotMove", "movementRestriction"]) storage.setFeature(k, true);
storage.setFeature("tranceNoOneMoves", false);
session.forceTrance(HYP, 80, 80);
asHer(() => PoseSetActive(Player, "Kneel"));
check("in trance with Cannot Move: her own kneel is refused", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  the ordinary hold by default: others may adjust her", effects.isHeldFully(), false);
// Walking trance lifts the freeze, and with it the hold.
voice.handleSpokenLine(HYP, "Missy, walk with me");
asHer(() => PoseSetActive(Player, "Kneel"));
check("walking trance: she can move again", Player.ActivePose, ["BaseUpper", "Kneel"]);
// The safeword always ends it.
session.forceTrance(HYP, 80, 80);
session.safeword();
asHer(() => PoseSetActive(Player, "BaseLower"));
check("after the safeword: hers again", Player.ActivePose, ["BaseUpper", "BaseLower"]);
check("  nothing held", [effects.isHeldStill(), Player.HasEffect("MapImmobile")], [false, false]);

// --- "...and no one else can move you either" (tranceNoOneMoves, v1.12.0) ---------------------------
// Failure: the trance's hold is the ordinary one with the box ticked, or it outlives the walk.
storage.setFeature("tranceNoOneMoves", true);
session.forceTrance(HYP, 80, 80);
check("ticked: the trance holds her fully", [effects.isHeldStill(), effects.isHeldFully()], [true, true]);
voice.handleSpokenLine(HYP, "Missy, walk with me");
check("  walking lifts it all", [effects.isHeldStill(), effects.isHeldFully()], [false, false]);
voice.handleSpokenLine(HYP, "Missy, be still");
check("  and 'be still' puts the full hold back", [effects.isHeldStill(), effects.isHeldFully()], [true, true]);
session.safeword();
check("  the safeword ends it", [effects.isHeldStill(), effects.isHeldFully()], [false, false]);
storage.setFeature("tranceNoOneMoves", false);

// --- the spoken levels -------------------------------------------------------------------------------
// Failure: a wording reaches the wrong level, a release misses the full hold, or the levels do not step.
for (const [line, id] of [
	["Missy, you cannot move", "movement-block"],
	["Missy, you are frozen", "movement-block"],
	["Missy, no one can move you", "movement-lock"],
	["Missy, nobody else can move you", "movement-lock"],
	["Missy, you cannot be moved", "movement-lock"],
	["Missy, you will not be moved", "movement-lock"],
	["Missy, you are frozen solid", "movement-lock"],
	["Missy, you are a statue", "movement-lock"],
	["Missy, you can move again", "movement-release"],
]) check(`"${line}"`, voice.matchSuggestion(line), id);
storage.setFeature("tranceCannotMove", false);
session.forceTrance(HYP, 80, 80);
voice.handleSpokenLine(HYP, "Missy, no one can move you");
check("'no one can move you': held fully", [effects.isHeldStill(), effects.isHeldFully()], [true, true]);
voice.handleSpokenLine(HYP, "Missy, you cannot move");
check("then 'you cannot move': eased to the ordinary hold", [effects.isHeldStill(), effects.isHeldFully()], [true, false]);
voice.handleSpokenLine(HYP, "Missy, you are a statue");
voice.handleSpokenLine(HYP, "Missy, you can move again");
check("'you can move again' ends the full hold too", [effects.isHeldStill(), effects.isHeldFully()], [false, false]);
session.safeword();
storage.setFeature("tranceCannotMove", true);

console.log(`held-still: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
