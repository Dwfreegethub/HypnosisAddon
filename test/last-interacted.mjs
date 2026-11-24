// The Stats tab's "last interacted" date (v1.16.14, DW 2026-11-23).
//
// The tab used to show the entry's lastUpdated, which is decay's clock: reading the list charged
// decay and reset everyone to "just now". Now it shows lastInteracted, which only a direct
// interaction moves (a whisper, a line with her name, an induction). Ambient room chat and decay
// never do, and entries saved before it existed show a dash. Each check says what failure looks like.
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, FriendList: [] };
globalThis.ChatRoomCharacter = [Player];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = () => {};
let timers = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
const runTimers = () => { while (timers.length) { const t = timers; timers = []; t.forEach((fn) => fn()); } };
// Local noon, 2026-11-23, so "today" does not depend on the time zone the tests run in.
let clock = new Date(2026, 10, 23, 12, 0, 0).getTime();
Date.now = () => clock;
const DAY = 86_400_000;
const HOUR = 3_600_000;

const { storage, trust } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const detail = (id) => trust.trustStatRows().find((r) => r.memberId === id)?.detail ?? "";
const entry = (id) => storage.listTrust().find((t) => t.memberId === id);

// --- the date text -------------------------------------------------------------------------------
const now = clock;
check("no date reads a dash", trust.interactedText(undefined, now), "last —");
check("earlier today reads today", trust.interactedText(now - 3 * HOUR, now), "last today");
check("this year reads month and day", trust.interactedText(new Date(2026, 10, 20, 9).getTime(), now), "last Nov 20");
check("an earlier year adds the year", trust.interactedText(new Date(2025, 0, 5, 9).getTime(), now), "last Jan 5 2025");

// --- what moves it -------------------------------------------------------------------------------
// Failure: ambient chat sets the date, which is what made people nearby read "just now" in v1.15.1.
trust.noteConversation(2000, "Rei", false);
check("ambient chat grows trust", entry(2000)?.interactions > 0, true);
check("  but sets no date", entry(2000)?.lastInteracted, undefined);
check("  and the row shows a dash", detail(2000).endsWith("last —"), true);

clock += 10 * 60_000; // past the 5-minute rate limit
trust.noteConversation(2000, "Rei", true);
check("a directed line sets the date", entry(2000)?.lastInteracted, clock);
check("  and the row reads today", detail(2000).endsWith("last today"), true);

trust.noteInductionSuccess(3000, "Ash");
check("an induction sets the date", entry(3000)?.lastInteracted, clock);

// --- decay never moves it (the bug) --------------------------------------------------------------
// Failure: the row jumps to "today" because decay reset the clock it reads.
storage.addInteractions(2000, "Rei", 50); // enough to outlast the decay below; not direct, so no date
storage.setDecayRate("typical");
const setAt = entry(2000).lastInteracted;
clock += 3 * DAY;
trust.trustStatRows();
runTimers();
check("decay was charged", entry(2000).lastUpdated, clock);
check("  but the date stays", entry(2000).lastInteracted, setAt);
check("  and the row still reads the old day", detail(2000).endsWith("last Nov 23"), true);

// --- old saves -----------------------------------------------------------------------------------
// Failure: an old entry's decay-reset lastUpdated is shown as if it were a real date.
storage.addInteractions(4000, "Old", 20);
storage.addInteractions(4001, "Bad", 20);
entry(4001).lastInteracted = "yesterday";
const imported = storage.importSettings(storage.exportSettings());
check("an old save imports", imported.ok, true);
check("an entry from before the date shows a dash", detail(4000).endsWith("last —"), true);
check("a date that is not a number is dropped", entry(4001)?.lastInteracted, undefined);

console.log(`last-interacted: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
