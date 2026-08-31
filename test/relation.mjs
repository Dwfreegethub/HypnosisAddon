// Trust decay, and BC relationships as a floor under it.
//
// These are one mechanic, which is why they share a suite. Without the floor, decay means
// an owner who goes away for three weeks comes back having to re-earn the right to
// hypnotise you — and the relationship was there in BC's own data the whole time.
const FRIEND = 111, LOVER = 222, OWNER = 333, STRANGER = 444;

globalThis.Player = {
	MemberNumber: 1,
	Name: "Missy",
	ExtensionSettings: {},
	ArousalSettings: {},
	FriendList: [FRIEND],
	IsOwnedByCharacter: (C) => C?.MemberNumber === OWNER,
};
const mk = (n) => ({ MemberNumber: n, Name: `P${n}`, IsLoverOfCharacter: () => n === LOVER });
globalThis.ChatRoomCharacter = [Player, ...[FRIEND, LOVER, OWNER, STRANGER].map(mk)];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = () => {};

const realNow = Date.now;
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
const near = (label, got, want, tol = 1.5) => {
	const ok = Math.abs(got - want) <= tol;
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}: want ~${want}, got ${got.toFixed(2)}`);
};

// --- relationships are read from BC, highest wins ---
check("friend list", trust.relationshipWith(FRIEND), "friend");
check("lover", trust.relationshipWith(LOVER), "lover");
check("owner", trust.relationshipWith(OWNER), "owner");
check("nobody in particular", trust.relationshipWith(STRANGER), "none");

// --- the floors, and what each may lift -----------------------------------------------
// A relationship you have not built on gets you in the door, not through the whole house.
check("stranger gets nothing", trust.accessFor(STRANGER, "session"), 0);

near("friend floors session at 15", trust.accessFor(FRIEND, "session"), 15);
near("  but not arousal", trust.accessFor(FRIEND, "arousal"), 0);
near("  nor anything persistent", trust.accessFor(FRIEND, "persistent"), 0);
near("  nor the illusion", trust.accessFor(FRIEND, "deceptive"), 0);

near("lover floors session at 30", trust.accessFor(LOVER, "session"), 30);
near("  and arousal too", trust.accessFor(LOVER, "arousal"), 30);
near("  but still nothing persistent", trust.accessFor(LOVER, "persistent"), 0);

near("owner reaches session", trust.accessFor(OWNER, "session"), 65);
near("  arousal", trust.accessFor(OWNER, "arousal"), 65);
near("  persistent", trust.accessFor(OWNER, "persistent"), 65);
near("  and the illusion", trust.accessFor(OWNER, "deceptive"), 65);

// Ownership alone now clears every gate there is — the owner floor and all three
// thresholds are 65, which is the point of having lowered the illusion to match. That
// equality is the whole "an owner reaches everything" rule, so it is asserted rather than
// left to coincidence.
check("owner clears the trigger gate", trust.accessFor(OWNER, "persistent") >= 65, true);
check("owner clears the carry gate", trust.accessFor(OWNER, "persistent") >= 65, true);
check("owner clears the illusion too", trust.accessFor(OWNER, "deceptive") >= 65, true);
// A lover still does not, however much a lover may want to.
check("a lover does not reach the illusion", trust.accessFor(LOVER, "deceptive") >= 65, false);

// A floor is a floor, never a cap: earned trust above it wins.
storage.setTrustValue(FRIEND, "P111", 80);
near("earned trust beats the floor", trust.accessFor(FRIEND, "session"), 80);
near("  and is not lifted where the floor cannot reach", trust.accessFor(FRIEND, "persistent"), 80);

// --- decay ----------------------------------------------------------------------------
storage.setDecayRate("never");
storage.setTrustValue(STRANGER, "P444", 75);
clock += 60 * DAY;
near("never means never", storage.trustWith(STRANGER), 75);

// "Typical" should barely touch a week and bite over a month.
storage.setDecayRate("typical");
storage.setTrustValue(STRANGER, "P444", 75);
clock += 7 * DAY;
near("a week at typical barely moves it", storage.trustWith(STRANGER), 71, 2);

storage.setTrustValue(STRANGER, "P444", 75);
clock += 30 * DAY;
near("a month at typical bites", storage.trustWith(STRANGER), 37, 4);

// The shape, and it is the opposite of the intuitive one. `trust = 100n/(n+25)` is steep at
// the bottom and flat at the top, so a fixed number of lost interactions costs an
// acquaintance far more than an established relationship. Out of sight, out of mind applies
// to people you barely know; someone you have spent months with does not fade in a month.
// Asserted because the first version of this got it backwards in a comment.
storage.setTrustValue(STRANGER, "P444", 30);
clock += 30 * DAY;
const shallowLoss = 30 - storage.trustWith(STRANGER);
storage.setTrustValue(STRANGER, "P444", 90);
clock += 30 * DAY;
const deepLoss = 90 - storage.trustWith(STRANGER);
check("a deep relationship resists decay", deepLoss < shallowLoss, true);
near("  30 loses everything in a month", shallowLoss, 30, 1);
near("  90 barely notices", deepLoss, 3, 1.5);

storage.setDecayRate("veryfast");
storage.setTrustValue(STRANGER, "P444", 75);
clock += 7 * DAY;
near("very fast wipes a week", storage.trustWith(STRANGER), 0, 2);

// Never below zero, however long it has been.
clock += 3650 * DAY;
check("floors at zero", storage.trustWith(STRANGER) >= 0, true);

// --- decay reads must not double-charge ------------------------------------------------
// Decay is applied lazily on read, so the clock has to be advanced when it is charged.
// Without that, every later read bills the same elapsed days over again.
storage.setDecayRate("typical");
storage.setTrustValue(STRANGER, "P444", 75);
clock += 10 * DAY;
const first = storage.trustWith(STRANGER);
const second = storage.trustWith(STRANGER);
const third = storage.trustWith(STRANGER);
check("reading three times charges once", first === second && second === third, true);

// --- a relationship is what keeps decay from erasing an owner --------------------------
storage.setDecayRate("veryfast");
storage.setTrustValue(OWNER, "P333", 90);
clock += 30 * DAY;
near("earned trust decays away", storage.trustWith(OWNER), 0, 2);
near("but ownership still opens the door", trust.accessFor(OWNER, "persistent"), 65);
near("  while a stranger stays shut out", trust.accessFor(STRANGER, "persistent"), 0);

// --- the testing override ---------------------------------------------------------------
storage.setRelationshipOverride(STRANGER, "owner");
check("override applies", trust.relationshipWith(STRANGER), "owner");
near("  with the owner floor", trust.accessFor(STRANGER, "persistent"), 65);
// "none" actively pretends there is no relationship — different from clearing, and how you
// check that a real owner can be masked.
storage.setRelationshipOverride(OWNER, "none");
check("override can mask a real owner", trust.relationshipWith(OWNER), "none");
near("  losing the floor with it", trust.accessFor(OWNER, "persistent"), 0);
storage.setRelationshipOverride(OWNER, null);
check("clearing restores BC's own answer", trust.relationshipWith(OWNER), "owner");

Date.now = realNow;
console.log(`relation: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
