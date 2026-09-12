// The broad awareness line, and what the hypnotist is told about the parts of it that did
// not take.
//
// v0.65.2. "You notice nothing" applies whichever of its three categories are permitted and
// deep enough, and used to say nothing about the rest — so a hypnotist with only touches
// ticked on the subject's side was told nothing, and read the clothing message she then saw
// as a bug. Two things are pinned here:
//
//   1. The hypnotist is told which categories took and which did not, with the reason, in
//      the same words a refusal uses. Rule 5: a silent partial success is a silent failure.
//   2. Depth is checked PER CATEGORY when the line runs. depthReason() passes the line if any
//      permitted category is deep enough — correctly — but run() then applied every permitted
//      category regardless of its own tier. Invisible at the Drifting defaults; wrong the
//      moment one of the three is raised on the Depth tab.
//
// Both are driven through handleSpokenLine with a forced trance, so what is asserted is what
// a room would see, not what a helper returns.
const HYP = 246108;
globalThis.Player = {
	MemberNumber: 1,
	Name: "Missy",
	ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterSetActivePose = () => {};

// Everything the subject's client sends to the hypnotist, read off the wire.
const toHypnotist = [];
globalThis.ServerSend = (_type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (m?.type === "trigger-status") toHypnotist.push(m.text);
};

const { voice, storage, session, suppression, depth } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const lastReport = () => toHypnotist.filter((t) => t.startsWith("[suggestion]")).at(-1) ?? "";
const reset = () => {
	suppression.clearAllSuppression();
	toHypnotist.length = 0;
};

storage.setFeature("hypnoEnabled", true);
check("forced under, Blank", session.forceTrance(HYP, 80, 80), null);

// --- all three permitted: the broad line takes all three and says nothing extra -------------
for (const k of ["suppressClothing", "suppressBondage", "suppressActivities"]) storage.setFeature(k, true);
reset();
voice.handleSpokenLine(HYP, "Missy, you notice nothing.");
check("all three suppressed", ["clothing", "bondage", "activity"].map(suppression.isSuppressed), [true, true, true]);
check("  and no partial report — nothing was skipped", lastReport(), "");

// --- only touches permitted: DW's case on 2026-09-12 ------------------------------------------
reset();
storage.setFeature("suppressClothing", false);
storage.setFeature("suppressBondage", false);
voice.handleSpokenLine(HYP, "Missy, you will not notice.");
check("touches suppressed", suppression.isSuppressed("activity"), true);
check("  clothing not — the box is unticked", suppression.isSuppressed("clothing"), false);
check("  and the hypnotist is TOLD which took", /took for touches/.test(lastReport()), true);
check("  and which did not, with the reason", /clothing \(not permitted\)/.test(lastReport()), true);
check("  bondage named too", /bondage \(not permitted\)/.test(lastReport()), true);

// --- per-category depth: raise clothing to Deep, go under at Yielding ------------------------
reset();
for (const k of ["suppressClothing", "suppressBondage", "suppressActivities"]) storage.setFeature(k, true);
storage.setDepthOverride("suppressClothing", "deep");
session.safeword();
check("under at Yielding", session.forceTrance(HYP, 30, 30), null);
toHypnotist.length = 0;
voice.handleSpokenLine(HYP, "Missy, you notice nothing.");
check("the line is not refused outright — touches and bondage are reachable", suppression.isSuppressed("activity"), true);
check("  bondage too", suppression.isSuppressed("bondage"), true);
check("  but clothing, raised to Deep, is NOT applied at Yielding", suppression.isSuppressed("clothing"), false);
check("  and the report says why", /clothing \(needs Deep/.test(lastReport()), true);
storage.clearDepthOverrides();

// --- the per-category lines reach exactly one category -----------------------------------
reset();
session.safeword();
session.forceTrance(HYP, 80, 80);
voice.handleSpokenLine(HYP, "Missy, you will not notice being undressed.");
check("clothing line takes clothing only", ["clothing", "bondage", "activity"].map(suppression.isSuppressed), [true, false, false]);
check("  single-permission lines get no partial report", lastReport(), "");
voice.handleSpokenLine(HYP, "Missy, you will not notice the ropes.");
check("bondage line adds bondage", ["clothing", "bondage", "activity"].map(suppression.isSuppressed), [true, true, false]);
voice.handleSpokenLine(HYP, "Missy, you notice being undressed again.");
check("clothing release lifts clothing alone", ["clothing", "bondage", "activity"].map(suppression.isSuppressed), [false, true, false]);
voice.handleSpokenLine(HYP, "Missy, you notice the ropes again.");
check("bondage release lifts bondage", ["clothing", "bondage", "activity"].map(suppression.isSuppressed), [false, false, false]);

// --- and the illusion still owns its wording ---------------------------------------------
// DW's actual line. At Blank with the illusion permitted it is the ILLUSION that answers, not
// awareness — pinned in sup.mjs by pattern, and here by effect.
reset();
storage.setFeature("illusionControl", true);
globalThis.CharacterLoadSimple = () => ({ Appearance: [], IsPlayer: () => false });
globalThis.CharacterRefresh = () => {};
voice.handleSpokenLine(HYP, "Missy, you will not notice your clothing.");
check("'you will not notice your clothing' is not clothing-awareness", suppression.isSuppressed("clothing"), false);

session.safeword();
console.log(`awareness: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
