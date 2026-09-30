// Trust entries shown by name (v0.98.0, job.md).
//
// The list is only useful if it says who. Two ways it failed to: it showed the account name,
// never the nickname people actually go by, and a chat line from someone the roster could not
// resolve stored "#123456" OVER the real name already saved — so a known partner could turn into
// a bare number just by being briefly unresolvable.
const REI = 111, ANON = 222, GONE = 333;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, FriendList: [] };
globalThis.ChatRoomCharacter = [
	Player,
	{ MemberNumber: REI, Name: "ReiAccount", Nickname: "Rei" },
	{ MemberNumber: ANON, Name: "Plain", Nickname: "  " },
];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = () => {};

const { trust, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- which name ---------------------------------------------------------------------------------
check("the nickname is preferred", trust.displayNameOf(ChatRoomCharacter[1]), "Rei");
check("a blank nickname falls back to the account name", trust.displayNameOf(ChatRoomCharacter[2]), "Plain");
check("no character, no name", trust.displayNameOf(undefined), "");

// --- what is stored -----------------------------------------------------------------------------
trust.noteConversation(REI, trust.trustNameFor(REI), true);
check("a conversation stores the nickname", storage.getTrust(REI)?.memberName, "Rei");
// Failure: the roster could not resolve them and the old fallback wrote "#111" over "Rei".
storage.addInteractions(REI, "#111", 1);
check("a bare number never overwrites a stored name", storage.getTrust(REI)?.memberName, "Rei");
storage.addInteractions(REI, "", 1);
check("  nor does an empty one", storage.getTrust(REI)?.memberName, "Rei");

// --- how it is shown ----------------------------------------------------------------------------
check("shown as name then number", trust.trustEntryLabel(storage.getTrust(REI)), "Rei (#111)");
// Someone who has left the room keeps the name stored when trust last moved.
storage.addInteractions(GONE, "Absent", 5);
check("someone absent shows their stored name", trust.trustEntryLabel(storage.getTrust(GONE)), "Absent (#333)");
// An entry saved by older code with only the number falls back to the number, once.
check("a number-only entry shows the number once", trust.trustEntryLabel({ memberId: 444, memberName: "#444" }), "#444");
// A nickname change shows at once for someone in the room, without waiting for trust to move.
ChatRoomCharacter[1].Nickname = "Reiko";
check("a live nickname wins over the stored one", trust.trustEntryLabel(storage.getTrust(REI)), "Reiko (#111)");
check("the Stats tab rows use it", trust.trustStatRows().some((r) => r.name === "Reiko (#111)"), true);
check("and so does /echs logtrust", trust.describeTrust().some((l) => l.startsWith("Reiko (#111): trust")), true);

console.log(`trust-names: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
