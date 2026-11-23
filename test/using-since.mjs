// "Using ECHS since" (v1.16.8; a player's request, DW 2026-11-22: "just the date and just the player
// using it", only since a reset). A date in her settings, shown on her own Stats tab.
// Failure looks like: a date that moves on every read, one that survives a reset, one invented for
// an old save but never saved (so it moves on every load), or a garbled date kept from an import.
import lz from "lz-string";
const { compressToBase64, decompressFromBase64 } = lz;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, FriendList: [], Appearance: [] };
globalThis.ChatRoomCharacter = [Player];
const ls = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.localStorage = ls;
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.ServerPlayerIsInChatRoom = () => false;

let clock = new Date(2026, 10, 3, 12, 0).getTime();
Date.now = () => clock;
const DAY = 86_400_000;

const { storage, menu } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const saved = () => JSON.parse(decompressFromBase64(storage.exportSettings()));
/** What is actually stored with her account, not the in-memory copy. */
const stored = () => JSON.parse(decompressFromBase64(Object.values(Player.ExtensionSettings).find((v) => typeof v === "string")));

const first = storage.getUsingSince();
check("a fresh save starts now", first, clock);
clock += 5 * DAY;
check("it stays put as time passes", storage.getUsingSince(), first);
check("the Stats tab's date", menu.usingSinceText(first), "3 Nov 2026");

storage.resetSettings();
check("a reset starts it again", storage.getUsingSince(), clock);
check("  shown as the reset day", menu.usingSinceText(storage.getUsingSince()), "8 Nov 2026");

// A save from before v1.16.8 has no date: it starts when first read, and is saved so it holds.
const old = saved();
delete old.usingSince;
storage.importSettings(compressToBase64(JSON.stringify(old)));
clock += DAY;
check("an old save starts the first time it is read", storage.getUsingSince(), clock);
check("  and is saved there", stored().usingSince, clock);
const fixed = clock;
clock += DAY;
check("  so it holds on the next read", storage.getUsingSince(), fixed);

// Garbage or a date in the future is dropped and starts again.
const bad = saved();
bad.usingSince = clock + 30 * DAY;
storage.importSettings(compressToBase64(JSON.stringify(bad)));
check("a date in the future is not kept", storage.getUsingSince(), clock);
const junk = saved();
junk.usingSince = "yesterday";
storage.importSettings(compressToBase64(JSON.stringify(junk)));
check("nor one that isn't a time", storage.getUsingSince(), clock);
// An exported save keeps its own date when imported back.
const mine = saved();
mine.usingSince = fixed - 10 * DAY;
storage.importSettings(compressToBase64(JSON.stringify(mine)));
check("an import keeps its date", storage.getUsingSince(), fixed - 10 * DAY);

console.log(`using-since: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
