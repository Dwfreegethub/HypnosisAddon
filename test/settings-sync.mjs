// One account sync per frame, however many saves (v1.12.9).
//
// Each sync is an AccountUpdate carrying the whole settings blob, and BC sends 14 messages per
// 1.2 s and queues the rest. Several saves in a row are ordinary (a trigger firing saves twice,
// each face command saves), so they now share one sync at the end of the frame, while the saved
// copies change at once. Each check says what failure looks like.
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, FriendList: [] };
globalThis.ChatRoomCharacter = [Player];
const ls = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.localStorage = ls;
let syncs = [];
let syncThrows = false;
globalThis.ServerPlayerExtensionSettingsSync = (key) => {
	if (syncThrows) throw new Error("socket gone");
	syncs.push({ key, blob: Player.ExtensionSettings[key] });
};
globalThis.ChatRoomSendLocal = () => {};
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
const runTimers = () => { const t = timers; timers = []; t.forEach((fn) => fn()); };

const { storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const localBlob = () => Object.values(ls._d).find((v) => typeof v === "string" && v.length > 20) ?? null;

storage.addInteractions(500, "Seed", 1);
runTimers();
syncs = [];

// --- several saves in one frame --------------------------------------------------------------------
storage.addInteractions(501, "A", 3);
storage.addInteractions(502, "B", 3);
storage.setDecayRate("slow");
storage.forgetTrust(500);
// Failure: 4 (one AccountUpdate per save, the old behaviour).
check("four saves in one frame send nothing yet", syncs.length, 0);
check("  but the account copy is current at once", typeof Player.ExtensionSettings.HypnosisAddon === "string" && storage.listTrust().length === 2, true);
check("  and so is the device backup", localBlob() === Player.ExtensionSettings.HypnosisAddon, true);
check("  with one send queued, not four", timers.length, 1);
runTimers();
check("then one sync goes", syncs.length, 1);
// Failure: the sync carries an earlier save's state, so the server misses the last change.
check("  carrying the last state", syncs[0]?.blob === Player.ExtensionSettings.HypnosisAddon, true);

// --- separate frames are separate syncs ------------------------------------------------------------
syncs = [];
storage.setDecayRate("fast");
runTimers();
storage.setDecayRate("never");
runTimers();
// Failure: a later change is swallowed because the flag was never cleared.
check("a save in each of two frames: two syncs", syncs.length, 2);
runTimers();
check("  and nothing more when nothing changed", syncs.length, 2);

// --- a failed send ---------------------------------------------------------------------------------
syncs = [];
syncThrows = true;
storage.setDecayRate("slow");
let threw = false;
try { runTimers(); } catch { threw = true; }
// Failure: a dead socket throws out of the timer, or leaves the flag stuck so nothing syncs again.
check("a failed sync does not throw", threw, false);
syncThrows = false;
storage.setDecayRate("typical");
runTimers();
check("  and the next save still syncs", syncs.length, 1);

// --- no account yet --------------------------------------------------------------------------------
const realNumber = Player.MemberNumber;
Player.MemberNumber = undefined;
syncs = [];
storage.setDecayRate("fast");
runTimers();
// Failure: a save before login reaches some account (the shared-stats corruption).
check("before the member number is known, nothing is sent", syncs.length, 0);
Player.MemberNumber = realNumber;

console.log(`settings-sync: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
