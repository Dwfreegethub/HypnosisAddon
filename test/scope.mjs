// Trigger scope: who besides the installer can fire a trigger.
// Mirrors BC's own AllowedInteractions ladder, so the ordering of the checks matters as
// much as the checks themselves — owner is allowed at every level and BEFORE blacklist.
const HYP = 246108, OWNER = 111, LOVER = 222, WHITE = 333, DOM = 444, BLACK = 555, RANDOM = 666, FRIEND = 777;

const rel = { owner: null, lover: null, white: [], black: [], friends: [], dom: 0 };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	IsOwnedByCharacter: (C) => C.MemberNumber === rel.owner,
	HasOnBlacklist: (C) => rel.black.includes(C.MemberNumber),
	HasOnWhitelist: (C) => rel.white.includes(C.MemberNumber),
	HasOnFriendlist: (C) => rel.friends.includes(C.MemberNumber),
};
const mk = (n) => ({ MemberNumber: n, Name: `P${n}`, IsLoverOfCharacter: () => n === rel.lover });
globalThis.ChatRoomCharacter = [Player, ...[HYP, OWNER, LOVER, WHITE, DOM, BLACK, RANDOM, FRIEND].map(mk)];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.ReputationCharacterGet = (C) => (C.MemberNumber === DOM ? 100 : C === Player ? 50 : 0);

const { depth, storage, triggers } = await import("./harness-bundle.mjs");
// Depth is the gate now, not trust. Planting a trigger, carrying a suggestion and the
// clothing illusion all need a Deep trance by default, measured against the EARNED depth —
// so these suites have to say how deep the subject is, the way a real induction would. Set
// once here: every case below assumes a trance deep enough to work in, and the ones that
// test the gate itself lower it explicitly.
depth.setCurrentDepths(80, 80);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = got === want;
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}: want ${want}, got ${got}`);
};

rel.owner = OWNER; rel.lover = LOVER; rel.white = [WHITE]; rel.black = [BLACK]; rel.friends = [FRIEND];
storage.setFeature("hypnoEnabled", true);
storage.setFeature("triggerControl", true);
storage.setTrustValue(HYP, "GameBot", 70);
triggers.beginRecording(HYP, "GameBot", "sleepy");
triggers.recordAction("movement-block");
triggers.commitRecording();

const fires = (who) => triggers.triggersFiredBy(who, "sleepy").length > 0;
const row = (scope, expected) => {
	storage.setTriggerScope(scope);
	for (const [who, name, want] of expected) check(`${scope}: ${name}`, fires(who), want);
};

// The installer always fires, at every level — that's the "plus hypnotist" in each option.
// Friends (v1.8.0): between Lovers and whitelist, so every rung from friends up includes them.
row("hypnotist", [[HYP,"hypnotist",true],[OWNER,"owner",false],[LOVER,"lover",false],[FRIEND,"friend",false],[WHITE,"whitelist",false],[DOM,"dominant",false],[BLACK,"blacklist",false],[RANDOM,"stranger",false]]);
row("owner",     [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",false],[FRIEND,"friend",false],[WHITE,"whitelist",false],[RANDOM,"stranger",false]]);
row("lovers",    [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",true],[FRIEND,"friend",false],[WHITE,"whitelist",false],[RANDOM,"stranger",false]]);
row("friends",   [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",true],[FRIEND,"friend",true],[WHITE,"whitelist",false],[DOM,"dominant",false],[RANDOM,"stranger",false]]);
row("whitelist", [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",true],[FRIEND,"friend",true],[WHITE,"whitelist",true],[RANDOM,"stranger",false]]);
row("dominants", [[HYP,"hypnotist",true],[OWNER,"owner",true],[FRIEND,"friend",true],[WHITE,"whitelist",true],[DOM,"dominant",true],[RANDOM,"stranger",false]]);
row("notblack",  [[HYP,"hypnotist",true],[RANDOM,"stranger",true],[FRIEND,"friend",true],[BLACK,"blacklisted",false],[OWNER,"owner",true]]);
row("everyone",  [[HYP,"hypnotist",true],[RANDOM,"stranger",true],[BLACK,"blacklisted",true]]);

// A friend you have also blacklisted is not let in by being a friend.
rel.black = [BLACK, FRIEND];
storage.setTriggerScope("friends");
check("friends: a blacklisted friend is refused", fires(FRIEND), false);
rel.black = [BLACK];

// A build without BC's helper still reads the plain list, as trust.ts does.
{
	const helper = Player.HasOnFriendlist;
	delete Player.HasOnFriendlist;
	Player.FriendList = [FRIEND];
	storage.setTriggerScope("friends");
	check("friends: read from Player.FriendList without the helper", fires(FRIEND), true);
	check("  and a stranger still is not", fires(RANDOM), false);
	Player.HasOnFriendlist = helper;
	delete Player.FriendList;
}

// Owner is checked before the blacklist, matching BC exactly.
rel.black = [OWNER];
storage.setTriggerScope("notblack");
check("blacklisted owner still allowed (matches BC)", fires(OWNER), true);

// --- yourself is NOT on the ladder ---------------------------------------------------
// The ladder answers "which OTHER people may fire this", and running it against yourself
// gave answers nobody chose: everyone and notblack trivially include you, and the dominants
// rung compares your own reputation with itself plus 25, which is always true. So three
// scopes let you fire your own triggers and four did not. It is one explicit setting now,
// and every scope must agree with it.
const SELF = Player.MemberNumber;
storage.setFeature("selfTrigger", false);
for (const scope of ["hypnotist", "owner", "lovers", "friends", "whitelist", "dominants", "notblack", "everyone"]) {
	storage.setTriggerScope(scope);
	check(`${scope}: self, setting off`, fires(SELF), false);
}
storage.setFeature("selfTrigger", true);
for (const scope of ["hypnotist", "owner", "lovers", "friends", "whitelist", "dominants", "notblack", "everyone"]) {
	storage.setTriggerScope(scope);
	check(`${scope}: self, setting on`, fires(SELF), true);
}

// Releasing is looser than firing on purpose: undoing can never harm the subject, and a
// silenced subject has few enough ways out already.
const canRelease = (who) => triggers.triggersReleasableBy(who, "sleepy").length > 0;
storage.setFeature("selfTrigger", false);
storage.setTriggerScope("hypnotist");
check("self may still RELEASE with the setting off", canRelease(SELF), true);
check("  but still cannot fire", fires(SELF), false);
check("a stranger still cannot release", canRelease(RANDOM), false);

// --- the one-time move (v1.8.0) -------------------------------------------------------
// Before the Friends rung, "whitelist" did not include friends. A save from then that says
// whitelist moves DOWN to friends once, so nobody's circle widens without their choosing (DW,
// 2026-11-08). Failure looks like: an old save left on whitelist (friends let in unasked), or a
// whitelist chosen after the move being moved again on the next load.
const lz = (await import("lz-string")).default;
const oldSave = JSON.parse(lz.decompressFromBase64(storage.exportSettings()));
delete oldSave.friendsRung;
oldSave.triggerScope = "whitelist";
oldSave.toyScope = "whitelist";
check("an old save imports", storage.importSettings(lz.compressToBase64(JSON.stringify(oldSave))).ok, true);
check("  its whitelist trigger scope moves down to friends", storage.getTriggerScope(), "friends");
check("  and so does its toy-mode scope", storage.getToyScope(), "friends");
const oldDom = { ...oldSave, triggerScope: "dominants", toyScope: "lovers" };
storage.importSettings(lz.compressToBase64(JSON.stringify(oldDom)));
check("  other rungs are left as they were", [storage.getTriggerScope(), storage.getToyScope()].join(), "dominants,lovers");
oldSave.toyScope = "friend";
storage.importSettings(lz.compressToBase64(JSON.stringify(oldSave)));
check("  v0.97's 'friend' toy key now means the Friends rung", storage.getToyScope(), "friends");
storage.setTriggerScope("whitelist");
storage.setToyScope("whitelist");
check("whitelist chosen after the move survives an export and import",
	storage.importSettings(storage.exportSettings()).ok && [storage.getTriggerScope(), storage.getToyScope()].join(), "whitelist,whitelist");
console.log(`scope: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
