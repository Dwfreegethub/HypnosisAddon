// Opening a long trust list must not flood BC's send queue (v1.12.8, Senge 11-18).
//
// Decay is charged lazily, on read, and the Stats tab and /echs logtrust read every entry at once.
// Each charge used to save straight away, and a save is one AccountUpdate carrying the whole
// settings blob. BC sends 14 messages per 1.2 s and queues the rest, so a 200-person list left
// for a few days queued 200 of them, and chat and clicks waited behind them. Each check says what
// failure looks like.
const PEOPLE = 200;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, FriendList: [] };
globalThis.ChatRoomCharacter = [Player];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
let syncs = 0;
globalThis.ServerPlayerExtensionSettingsSync = () => syncs++;
globalThis.ChatRoomSendLocal = () => {};
// Timers are held, so a check can see what was sent before the deferred save runs.
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
const runTimers = () => { const t = timers; timers = []; t.forEach((fn) => fn()); };
let clock = 1_000_000_000;
Date.now = () => clock;
const DAY = 86_400_000;

const { storage, trust } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (let i = 0; i < PEOPLE; i++) storage.addInteractions(1000 + i, `P${i}`, 40);
storage.setDecayRate("typical");
runTimers();
clock += 10 * DAY;
syncs = 0;

// --- the Stats tab -------------------------------------------------------------------------------
const before = storage.listTrust()[0].interactions;
const rows = trust.trustStatRows();
// Failure: 200 (one AccountUpdate per person, the bug).
check("reading the whole list sends nothing in the same frame", syncs, 0);
check("  but every entry is charged at once", [rows.length, storage.listTrust()[0].interactions < before], [PEOPLE, true]);
runTimers();
check("  and one save follows", syncs, 1);

// The tab is drawn every frame. Failure: a save per frame, or the days charged again.
const charged = storage.listTrust()[0].interactions;
for (let frame = 0; frame < 60; frame++) trust.trustStatRows();
runTimers();
check("a second of frames sends nothing more", syncs, 1);
check("  and charges nothing twice", storage.listTrust()[0].interactions, charged);

// --- /echs logtrust ------------------------------------------------------------------------------
clock += 3 * DAY;
syncs = 0;
trust.describeTrust();
check("/echs logtrust charges the whole list in one save too", [syncs, (runTimers(), syncs)], [0, 1]);

// --- what was saved is the decayed list ----------------------------------------------------------
// Failure: the one save goes out before the entries change, so the server keeps the old values.
const savedBlob = () => JSON.stringify(Player.ExtensionSettings);
clock += 3 * DAY;
const blobBefore = savedBlob();
trust.trustStatRows();
const blobHeld = savedBlob();
runTimers();
check("the saved settings change only when the save runs, and then they do", [blobHeld === blobBefore, savedBlob() !== blobBefore], [true, true]);

// --- an ordinary save is not held back -----------------------------------------------------------
syncs = 0;
storage.forgetTrust(1000);
// Failure: the [x] waits for a timer, or is folded into a decay save that never comes.
check("forgetting someone still saves at once", syncs, 1);
check("  and they are gone", storage.listTrust().some((t) => t.memberId === 1000), false);

console.log(`trust-burst: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
