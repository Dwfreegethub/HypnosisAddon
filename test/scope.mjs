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

const { storage, triggers } = await import("./harness-bundle.mjs");

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

console.log(`scope: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
