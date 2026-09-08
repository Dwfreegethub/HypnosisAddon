// Trigger scope: who besides the installer can fire a trigger.
// Mirrors BC's own AllowedInteractions ladder, so the ordering of the checks matters as
// much as the checks themselves — owner is allowed at every level and BEFORE blacklist.
const HYP = 246108, OWNER = 111, LOVER = 222, WHITE = 333, DOM = 444, BLACK = 555, RANDOM = 666;

const rel = { owner: null, lover: null, white: [], black: [], dom: 0 };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	IsOwnedByCharacter: (C) => C.MemberNumber === rel.owner,
	HasOnBlacklist: (C) => rel.black.includes(C.MemberNumber),
	HasOnWhitelist: (C) => rel.white.includes(C.MemberNumber),
};
const mk = (n) => ({ MemberNumber: n, Name: `P${n}`, IsLoverOfCharacter: () => n === rel.lover });
globalThis.ChatRoomCharacter = [Player, ...[HYP, OWNER, LOVER, WHITE, DOM, BLACK, RANDOM].map(mk)];
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

rel.owner = OWNER; rel.lover = LOVER; rel.white = [WHITE]; rel.black = [BLACK];
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
row("hypnotist", [[HYP,"hypnotist",true],[OWNER,"owner",false],[LOVER,"lover",false],[WHITE,"whitelist",false],[DOM,"dominant",false],[BLACK,"blacklist",false],[RANDOM,"stranger",false]]);
row("owner",     [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",false],[WHITE,"whitelist",false],[RANDOM,"stranger",false]]);
row("lovers",    [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",true],[WHITE,"whitelist",false],[RANDOM,"stranger",false]]);
row("whitelist", [[HYP,"hypnotist",true],[OWNER,"owner",true],[LOVER,"lover",true],[WHITE,"whitelist",true],[RANDOM,"stranger",false]]);
row("dominants", [[HYP,"hypnotist",true],[OWNER,"owner",true],[WHITE,"whitelist",true],[DOM,"dominant",true],[RANDOM,"stranger",false]]);
row("notblack",  [[HYP,"hypnotist",true],[RANDOM,"stranger",true],[BLACK,"blacklisted",false],[OWNER,"owner",true]]);
row("everyone",  [[HYP,"hypnotist",true],[RANDOM,"stranger",true],[BLACK,"blacklisted",true]]);

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
for (const scope of ["hypnotist", "owner", "lovers", "whitelist", "dominants", "notblack", "everyone"]) {
	storage.setTriggerScope(scope);
	check(`${scope}: self, setting off`, fires(SELF), false);
}
storage.setFeature("selfTrigger", true);
for (const scope of ["hypnotist", "owner", "lovers", "whitelist", "dominants", "notblack", "everyone"]) {
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

console.log(`scope: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
