// Names with spaces in commands, v0.90.2.
//
// Found live by DW on v0.90.1: `/echs trance Missys Helper 80` put Missy under at depth 0. Every
// command that takes a name read the FIRST WORD as the name, so "Helper" was read as the depth
// (Number("Helper") || 0). The name-only commands (induce, chance, ping, forgettrust) worked by
// luck, while "Missys" happened to be a unique prefix — and not at all for forgettrust, which
// compares whole names. Values are now read from the end and the rest of the line is the name.
//
// Every check states what failure looks like; ten of the thirteen fail on v0.90.1.
const HELPER = 510001, MAID = 510002, REI = 999;
let Commands = [];
globalThis.CommandCombine = (add) => { Commands = Commands.concat(Array.isArray(add) ? add : [add]); };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, GetPronouns: () => "SheHer" };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HELPER, Name: "Missys Helper" }, { MemberNumber: REI, Name: "Rei" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m).replace(/^\[(.*)\]$/s, "$1"));
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;

const { storage, session, depth, commands } = await import("./harness-bundle.mjs");
commands.installCommands();
storage.setFeature("hypnoEnabled", true);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const run = (sub, args) => {
	said = [];
	Commands.find((c) => c.Tag === "hypno").Subcommands.find((s) => s.Tag === sub).Action(args);
	return said.join(" | ");
};
const under = () => [session.isHypnotized(), session.currentHypnotistId(), depth.currentDepth(), depth.currentDepthEarned()];

// --- trance: DW's report ---------------------------------------------------------------------------
// Failure: depth 0 (the name's second word read as the depth), or the wrong hypnotist.
run("trance", "Missys Helper 80");
check("trance Missys Helper 80 → under with the helper at 80", under(), [true, HELPER, 80, 80]);
session.safeword();
run("trance", "Missys Helper 70 40");
check("  with an earned depth too", under(), [true, HELPER, 70, 40]);
session.safeword();
run("trance", "Missys Helper");
check("  no depth → the default 80", under(), [true, HELPER, 80, 80]);
session.safeword();
run("trance", "Rei 60");
check("a one-word name still works", under(), [true, REI, 60, 60]);
session.safeword();
run("trance", `${HELPER} 55`);
check("a member number still works (too big to be a depth)", under(), [true, HELPER, 55, 55]);
session.safeword();

// --- two names sharing a first word ---------------------------------------------------------------
// Failure: "Missys Maid" resolves to nobody (the old first-word read gives the ambiguous "Missys").
ChatRoomCharacter.push({ MemberNumber: MAID, Name: "Missys Maid" });
check("induce Missys Maid → the maid, not a refusal", /Attempting an induction on Missys Maid/.test(run("induce", "Missys Maid")), true);
check("induce Missys (ambiguous) → says who is here", /No one here matches "Missys"/.test(run("induce", "Missys")), true);
check("chance Missys Helper → resolves", /No one here matches/.test(run("chance", "Missys Helper")), false);
run("trance", "Missys Maid 65");
check("trance Missys Maid 65 → the maid at 65", under(), [true, MAID, 65, 65]);
session.safeword();

// --- trust commands --------------------------------------------------------------------------------
// Failure: the value is taken from the name, or forgettrust can never match a two-word name.
run("settrust", "Missys Helper 70");
check("settrust Missys Helper 70 → a trust entry for the helper", storage.listTrustRaw().some((t) => t.memberId === HELPER), true);
run("bumptrust", "Missys Maid 3");
check("bumptrust Missys Maid 3 → the maid", storage.listTrustRaw().find((t) => t.memberId === MAID)?.interactions, 3);
check("forgettrust Missys Helper → forgotten by its whole name", /Forgot Missys Helper/.test(run("forgettrust", "Missys Helper")), true);
run("relate", "Missys Maid friend");
check("relate Missys Maid friend → the maid", storage.listRelationshipOverrides().some((o) => o.memberId === MAID && o.kind === "friend"), true);

console.log(`command-names: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
