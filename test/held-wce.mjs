// Held still, under WCE's animation engine (v0.92.5; DW's live trace, 2026-09-26).
//
// With WCE's "animation engine" setting on, WCE hooks BOTH PoseSetActive and the deprecated alias
// CharacterSetActivePose (priority 10, never calling next), queues the pose, and applies its queue
// itself: it writes Player.ActivePose directly and sends ChatRoomCharacterPoseUpdate — at once, and
// again every 250 ms from a timer. When the server echoes her pose back, its socket listener calls
// PoseSetActive(Player, p) for each pose. Technique described from reading wce.js (functions L and R,
// and the hook loop over [`CharacterSetActivePose`,`PoseSetActive`]); no WCE code here.
//
// What DW saw: held still, the hypnotist's "arms up" came back "pose-blocked", with "You try to
// shift…" — our ServerSend safety net took WCE's send of OUR change for her own attempt (heldPose
// was only moved after), put the old pose back, and WCE's 250 ms timer then fought it forever.
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
const category = (p) => (LOWER.includes(p) ? "BodyLower" : "BodyUpper");
// R132: PoseSetActive in Pose.js; CharacterSetActivePose (Character.js) is only an alias for it.
globalThis.PoseSetActive = (C, pose) => {
	if (pose == null) C.ActivePose = ["BaseUpper", "BaseLower"];
	else C.ActivePose = [...C.ActivePose.filter((p) => category(p) !== category(pose)), pose];
};
globalThis.CharacterSetActivePose = (C, pose) => PoseSetActive(C, pose);
globalThis.PoseChangeStatus = { NEVER: 0, NEVER_WITHOUT_AID: 1, ALWAYS_WITH_STRUGGLE: 2, ALWAYS: 3 };
globalThis.PoseCanChangeUnaidedStatus = () => PoseChangeStatus.ALWAYS;
globalThis.ChatRoomSyncCharacter = () => {};
globalThis.ChatRoomSyncPose = () => {};
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
// The mod SDK's hook chain with priorities: highest first, each passes on via next().
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

// --- WCE's animation engine, as a stand-in -----------------------------------------------------
// A queue of wanted poses, newest wins per category; applied by writing ActivePose and sending it.
const wce = { queue: [], id: 0 };
const wceApply = () => {
	const want = {};
	for (const e of wce.queue) want[category(e.pose)] = e.pose;
	const next = [want.BodyUpper ?? "BaseUpper", want.BodyLower ?? "BaseLower"];
	if (JSON.stringify(Player.ActivePose) === JSON.stringify(next)) return;
	Player.ActivePose = next;
	ServerSend("ChatRoomCharacterPoseUpdate", { Pose: next });
};
for (const name of ["CharacterSetActivePose", "PoseSetActive"]) {
	modApi.hookFunction(name, 10, (args) => {
		const [C, pose] = args;
		if (C !== Player) return undefined;
		const poses = pose == null ? ["BaseUpper", "BaseLower"] : [pose];
		for (const p of poses) wce.queue.push({ id: ++wce.id, pose: p });
		wceApply();
		return undefined;
	});
}
/** WCE's 250 ms timer. */
const wceTick = (n = 8) => { for (let i = 0; i < n; i++) wceApply(); };
/** WCE's socket listener for ChatRoomSyncPose about her: PoseSetActive for each pose. */
const wceEcho = (pose) => { for (const p of pose) PoseSetActive(Player, p, false); };

const { effects } = await import("./harness-bundle.mjs");
effects.installEffectAllowList();
effects.installEffectHooks(modApi);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;
const later = () => { offset += 60_000; said = []; poseUpdates = []; };
const refusals = () => said.filter((s) => /your body does not answer/.test(s)).length;

// --- not held: the stand-in behaves as WCE does ----------------------------------------------------
PoseSetActive(Player, "Kneel");
check("not held: WCE applies her kneel", Player.ActivePose, ["BaseUpper", "Kneel"]);

// --- held: the hypnotist's command lands (the live fault) --------------------------------------------
// Failure: "pose-blocked" (false), the old pose kept, or "You try to shift…" for our own change.
effects.applyEffect("Freeze");
later();
check("held: the hypnotist's 'arms up' lands", effects.setSuggestedPose("OverTheHead", "arms"), true);
check("  she is in it", Player.ActivePose, ["OverTheHead", "Kneel"]);
check("  the room is told the new pose, last", poseUpdates.at(-1), ["OverTheHead", "Kneel"]);
check("  and she is NOT told she failed to move", refusals(), 0);

// --- no fight afterwards --------------------------------------------------------------------------------
// Failure: WCE's timer and our net undo each other, sending her pose to the server over and over.
later();
wceTick();
wceEcho(Player.ActivePose);
check("WCE's timer and the server echo: nothing sent", poseUpdates.length, 0);
check("  pose unchanged", Player.ActivePose, ["OverTheHead", "Kneel"]);
check("  no refusal line", refusals(), 0);

// --- her own changes are still refused, by BOTH names ------------------------------------------------
// WCE's hook on the alias never calls PoseSetActive, so a hold on PoseSetActive alone is walked round.
// Failure: she stands, or WCE's queue picks the attempt up and a fight starts on the next tick.
later();
PoseSetActive(Player, "BaseLower");
check("held: her own PoseSetActive is refused", Player.ActivePose, ["OverTheHead", "Kneel"]);
CharacterSetActivePose(Player, "BaseLower");
check("  and so is the old alias, which WCE hooks separately", Player.ActivePose, ["OverTheHead", "Kneel"]);
check("  she is told, once", refusals(), 1);
wceTick();
check("  and WCE's queue never got it: nothing sent on the next ticks", poseUpdates.length, 0);
check("  the alias with her current pose is not an attempt to move", (CharacterSetActivePose(Player, "Kneel"), refusals()), 1);

// --- the hypnotist's next command, and release -------------------------------------------------------
later();
check("held: a second command lands too", [effects.setSuggestedPose("BaseLower", "stance"), Player.ActivePose], [true, ["OverTheHead", "BaseLower"]]);
check("  silently", refusals(), 0);
effects.removeEffect("Freeze");
CharacterSetActivePose(Player, "Kneel");
check("released: hers again, by the alias too", Player.ActivePose, ["OverTheHead", "Kneel"]);

console.log(`held-wce: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
