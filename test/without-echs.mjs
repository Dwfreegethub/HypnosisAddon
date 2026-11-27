// Playing without ECHS (v1.20.0, DW 2026-11-26): off by default; when on, a login after a session
// without ECHS that changed something BC saves (her last room, her restraints and locks, her clothes)
// is reported by beep to her BC owner and/or full keyholders: once when they are online, again the
// first time they are in a room with her.
//
// Failure looks like: anything recorded or sent while it is off; a plain offline gap reported; a timer
// lock BC took off itself reported; a change missed; the wrong people beeped; an online beep to
// someone the server didn't list; no in-person beep; two beeps at once when they are both online and
// here; her not told; a report kept forever.
const OWNER = 500, FULL = 600, MOD = 700;
const item = (group, asset, lock, timer, clothing = false) => ({
	Asset: { Name: asset, Description: asset === "BallGag" ? "Ball Gag" : asset, Group: { Name: group, Description: group === "ItemMouth" ? "Mouth" : group, Clothing: clothing } },
	...(lock ? { Property: { LockedBy: lock, ...(timer ? { RemoveTimer: timer } : {}) } } : {}),
});
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true,
	Appearance: [item("Cloth", "TShirt", null, null, true), item("ItemArms", "HempRope")],
	LastChatRoom: { Name: "Hypno Testing" },
	Ownership: { MemberNumber: OWNER, Name: "Owner", Stage: 1 }, IsFullyOwned() { return this.Ownership?.Stage === 1; },
};
globalThis.ChatRoomCharacter = [Player];
globalThis.ChatRoomData = { Name: "Hypno Testing" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
let synced = [];
globalThis.ServerPlayerExtensionSettingsSync = (k) => synced.push(k);
let beeps = [], queries = 0;
globalThis.ServerSend = (type, data) => {
	if (type === "AccountBeep") beeps.push(data);
	if (type === "AccountQuery" && data?.Query === "OnlineFriends") queries++;
};
let inRoom = true;
globalThis.ServerPlayerIsInChatRoom = () => inRoom;
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let shown = [];
globalThis.ServerShowBeep = (m) => shown.push(m);
globalThis.ChatRoomSendEmote = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.setTimeout = (fn) => { fn(); return 0; };

const { storage, withoutEchs: w } = await import("./harness-bundle.mjs");
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let clock = Date.parse("2026-11-26T20:00:00Z");
Date.now = () => clock;
storage.onReportWithoutChange(w.onSettingChanged);
const SEEN = w.SEEN_KEY;
const relogin = () => { w.resetWithoutEchs(); return w.checkAtLogin(clock); };
const clear = () => { beeps = []; said = []; shown = []; queries = 0; synced = []; };

// --- off by default: nothing kept, nothing sent ---
check("off by default", storage.getReportWithout(), "off");
relogin();
w.tick(clock);
check("off: no record, nothing sent", [Player.ExtensionSettings[SEEN], synced.includes(SEEN), beeps.length, queries], [undefined, false, 0, 0]);

// --- turned on: a record at once ---
storage.setReportWithout("both");
const rec = w.parseSeen(Player.ExtensionSettings[SEEN]);
check("on: the record is written and synced", [!!rec, rec?.room, rec?.items, synced.includes(SEEN)], [true, "Hypno Testing", { ItemArms: "HempRope" }, true]);

// --- offline for hours, nothing changed: nothing ---
clear();
clock += 5 * 3600_000;
check("offline 5 hours, back: nothing found", relogin(), []);
check("  nothing beeped or queued", [beeps.length, storage.getWithoutReports().length], [0, 0]);

// --- rejoined, left (last room cleared), no other change ---
clear();
Player.LastChatRoom = undefined;
check("logged in without ECHS, left the room: found", relogin(), ['left the room "Hypno Testing"']);
const reps = storage.getWithoutReports();
check("  reports queued for owner and full keyholders (none yet but the owner)", reps.map((r) => r.to), [OWNER]);
check("  she is told, by beep and in chat", [shown.length, said.some((l) => /noticed you were on Bondage Club without it/.test(l) && /Owner/.test(l))], [1, true]);
check("  the server is asked who is online", queries, 1);
check("  the report says when and what", /between .* and .*left the room "Hypno Testing"/.test(reps[0].text), true);

// online: only if the server lists them
clear();
w.onOnlineFriends([{ MemberNumber: 42 }], clock);
check("server doesn't list the owner: no beep", beeps.length, 0);
w.onOnlineFriends([{ MemberNumber: OWNER }], clock);
check("server lists the owner: one beep, secret", [beeps.length, beeps[0]?.MemberNumber, beeps[0]?.IsSecret, beeps[0]?.BeepType], [1, OWNER, true, ""]);
check("  she is told it went out", said.some((l) => /beeped Owner/.test(l) && /again when they are in a room/.test(l)), true);
w.onOnlineFriends([{ MemberNumber: OWNER }], clock);
check("  not beeped twice online", beeps.length, 1);
// in person
clear();
clock += 30 * 60_000;
ChatRoomCharacter.push({ MemberNumber: OWNER, Name: "Owner" });
w.tick(clock);
check("owner in the room later: beeped again, report done", [beeps.length, storage.getWithoutReports().length], [1, 0]);
check("  she is told", said.some((l) => /now they are in a room with you/.test(l)), true);
ChatRoomCharacter.pop();

// --- restraints changed; a timer lock that ran out is not counted ---
storage.setKeyholder(FULL, "Fullkeys", "full");
storage.setKeyholder(MOD, "Modkeys", "moderate");
Player.LastChatRoom = { Name: "Hypno Testing" };
Player.Appearance = [item("Cloth", "TShirt", null, null, true), item("ItemArms", "HempRope", "TimerPadlock", clock + 3600_000), item("ItemLegs", "LegCuffs", "ExclusivePadlock")];
w.writeSeen(clock);
clear();
clock += 2 * 3600_000; // the timer ran out
Player.Appearance = [item("Cloth", "TShirt", null, null, true), item("ItemArms", "HempRope"), item("ItemLegs", "LegCuffs", "ExclusivePadlock")];
check("a timer lock BC took off by itself: nothing", relogin(), []);
clear();
Player.Appearance = [item("Cloth", "TShirt", null, null, true), item("ItemArms", "HempRope"), item("ItemMouth", "BallGag")];
const found = relogin();
check("gag put on, cuffs taken off: found, with names", found, ["restraints changed: LegCuffs taken off (ItemLegs), Ball Gag put on (Mouth)"]);
check("  owner and full keyholder told, not moderate", storage.getWithoutReports().map((r) => r.to).sort(), [OWNER, FULL]);
// both online and here at once: one beep each
clear();
ChatRoomCharacter.push({ MemberNumber: FULL, Name: "Fullkeys" });
w.onOnlineFriends([{ MemberNumber: FULL }], clock);
w.tick(clock);
check("online and in the room together: one beep, done", [beeps.filter((b) => b.MemberNumber === FULL).length, storage.getWithoutReports().map((r) => r.to)], [1, [OWNER]]);
ChatRoomCharacter.pop();
// beeped online, then walks in a minute later: not beeped again so soon
storage.setWithoutReports([...storage.getWithoutReports(), { to: MOD, name: "Modkeys", text: "x", at: clock }]);
clear();
w.onOnlineFriends([{ MemberNumber: MOD }], clock);
clock += 60_000;
ChatRoomCharacter.push({ MemberNumber: MOD, Name: "Modkeys" });
w.tick(clock);
check("online beep, then here a minute later: one beep, done", [beeps.filter((b) => b.MemberNumber === MOD).length, storage.getWithoutReports().some((r) => r.to === MOD)], [1, false]);
ChatRoomCharacter.pop();
// never reached: dropped after 7 days, she is told
clear();
clock += 8 * 86_400_000;
w.tick(clock);
check("nobody reached in 7 days: dropped, she is told", [storage.getWithoutReports().length, said.some((l) => /could not reach Owner within 7 days/.test(l))], [0, true]);

// --- clothes ---
w.writeSeen(clock);
clear();
Player.Appearance = [item("Cloth", "Dress", null, null, true), item("ItemArms", "HempRope"), item("ItemMouth", "BallGag")];
check("clothes changed: found", relogin(), ["clothes changed"]);
storage.setWithoutReports([]);

// --- owner choice only; nobody to tell ---
storage.setReportWithout("owner");
Player.Ownership = null;
w.writeSeen(clock);
Player.LastChatRoom = undefined;
clear();
relogin();
check("no owner: nothing queued, she is told nobody was told", [storage.getWithoutReports().length, said.some((l) => /you have none, so nobody was told/.test(l))], [0, true]);
check("recipients: full only", (Player.Ownership = { MemberNumber: OWNER, Name: "Owner", Stage: 1 }, w.recipientsFor("full").map((r) => r.id)), [FULL]);
check("recipients: trial owner is not an owner", (Player.Ownership = { MemberNumber: OWNER, Name: "Owner", Stage: 0 }, w.recipientsFor("owner").map((r) => r.id)), []);

// --- turned off: the record is cleared, nothing further kept ---
storage.setReportWithout("off");
check("off again: record cleared", Player.ExtensionSettings[SEEN], "");
clear();
Player.LastChatRoom = { Name: "Elsewhere" };
check("off: a change is not reported", [relogin(), beeps.length, queries], [[], 0, 0]);

// --- the relog (short disconnect) is not a new session ---
storage.setReportWithout("both");
Player.LastChatRoom = undefined;
clear();
check("same login checked once only", w.checkAtLogin(clock), []);

console.log(`without-echs: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
