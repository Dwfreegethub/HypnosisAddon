// Does the person whose sheet you are looking at actually have the add-on?
//
// There is no way to know without asking, so the H icon draws on everyone's sheet and the
// panel asks on open. What this suite protects is the failure mode that existed before:
// no reply meant the panel sat on "(checking…)" forever, which is indistinguishable from a
// slow reply, a lost message, and a bug.
const THEM = 246108, STRANGER = 999;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: THEM, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.InformationSheetSelection = null;

// The clock is driven rather than waited on — a suite that actually slept for the timeout
// would be three seconds slower for no added confidence.
const realNow = Date.now;
let clock = 1_000_000;
Date.now = () => clock;

const { remote, messaging, session } = await import("./harness-bundle.mjs");
// Both installers, because the two replies that prove presence are handled by two
// different modules — state-response by remote.ts, session-update by session.ts. The
// no-op modApi stands in for the Information Sheet hooks, none of which are under test.
remote.installRemote({ hookFunction: () => {} });
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = got === want;
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}: want ${want}, got ${got}`);
};

const reply = (from, message) =>
	messaging.handleIncomingHidden({
		Type: "Hidden",
		Content: "HypnoMsg",
		Sender: from,
		Dictionary: [{ message }],
	});

// Never asked at all is "waiting", not "absent". Reporting somebody as add-on-less before
// asking them would be a confident lie, and the icon draws for everyone.
check("unprobed is waiting", remote.presenceOf(STRANGER), "waiting");

// --- the probe ---
remote.probeRemote({ MemberNumber: THEM });
check("just asked", remote.presenceOf(THEM), "waiting");

clock += 2999;
check("still waiting a hair under the timeout", remote.presenceOf(THEM), "waiting");

clock += 2;
check("absent once the timeout passes", remote.presenceOf(THEM), "absent");

// --- a reply, however late, settles it ---
// The timeout is a display decision, not a lockout: someone on a bad connection who
// answers at four seconds is present, and the panel has to come back to life.
reply(THEM, {
	type: "state-response",
	hypnoEnabled: true,
	movementRestriction: true,
	clothingRestriction: false,
	postureControl: false,
});
check("a late reply flips it back to present", remote.presenceOf(THEM), "present");

// --- re-probing clears the previous answer ---
// Otherwise "Check again" against someone who has since uninstalled would keep reporting
// the stale yes forever.
remote.probeRemote({ MemberNumber: THEM });
check("re-probing forgets the old answer", remote.presenceOf(THEM), "waiting");
clock += 3001;
check("  and can go absent again", remote.presenceOf(THEM), "absent");

// --- either query answering is proof ---
// state-response and session-update are handled by two different modules, and only this
// add-on registers either, so whichever arrives first settles it.
remote.probeRemote({ MemberNumber: THEM });
clock += 3001;
check("absent before any reply", remote.presenceOf(THEM), "absent");
reply(THEM, { type: "session-update", phase: "Idle" });
check("a session-update alone proves presence", remote.presenceOf(THEM), "present");

// One person answering says nothing about anybody else.
check("a different member is unaffected", remote.presenceOf(STRANGER), "waiting");

Date.now = realNow;
console.log(`presence: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
