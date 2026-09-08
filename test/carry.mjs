// Carry-forward: capture, the gates, what survives waking, and what must never survive.
//
// The last of those is why this suite exists. endSession is the function that guarantees a
// trance can never strand an effect, and carry-forward is the first feature to put things
// back afterwards — so the safeword taking everything with it is the assertion that matters
// most here.
const HYP = 246108, OTHER = 999;
globalThis.Player = {
	MemberNumber: 1,
	Name: "Missy",
	ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [],
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ServerSend = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);

// Enough of an appearance for the illusion to snapshot, and stubs for the two BC calls it
// makes. The illusion is the one carried effect that cannot simply be re-run — see below.
globalThis.Player.Appearance = [
	{ Asset: { Name: "Dress", Group: { Name: "Cloth", Clothing: true, Category: "Appearance" } } },
	{ Asset: { Name: "Body", Group: { Name: "BodyUpper", Category: "Appearance" } } },
];
globalThis.CharacterLoadSimple = () => ({ Appearance: [], IsPlayer: () => false });
globalThis.CharacterRefresh = () => {};

const { depth, voice, storage, carry, illusion } = await import("./harness-bundle.mjs");
// Depth is the gate now, not trust. Planting a trigger, carrying a suggestion and the
// clothing illusion all need a Deep trance by default, measured against the EARNED depth —
// so these suites have to say how deep the subject is, the way a real induction would. Set
// once here: every case below assumes a trance deep enough to work in, and the ones that
// test the gate itself lower it explicitly.
depth.setCurrentDepths(80, 80);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction"]) storage.setFeature(k, true);

// --- gates ---
// Refusals name the actual cause and go to the hypnotist, same as trigger setup.
storage.setFeature("carryForward", false);
storage.setTrustValue(HYP, "GameBot", 70);
carry.noteApplied("movement-block");
check("refused without permission", !!carry.carryThese(HYP, "GameBot", carry.lastApplied()).refusal, true);
check("  nothing held", carry.carriedIds(), []);

storage.setFeature("carryForward", true);
// DEPTH gates this now, not trust — and against the EARNED depth, because a carried
// suggestion outlives the session exactly as a trigger does and must be no more buyable
// with arousal. High trust does not substitute for a shallow trance.
storage.setTrustValue(HYP, "GameBot", 90);
depth.setCurrentDepths(30, 30); // Yielding, well short of the Deep this needs
const low = carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("refused above the tier's floor", /needs Deep/.test(low.refusal ?? ""), true);
check("  nothing held", carry.carriedIds(), []);

// Deep enough overall, but only because of arousal. The two-depth rule exists for this.
depth.setCurrentDepths(80, 30);
const chemical = carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("arousal cannot buy it either", !!chemical.refusal, true);
check("  and says arousal does not count", /arousal does not count/.test(chemical.refusal ?? ""), true);
check("  still nothing held", carry.carriedIds(), []);
depth.setCurrentDepths(80, 80);

// Nothing said yet is its own refusal, and it names the cause rather than going quiet.
storage.setTrustValue(HYP, "GameBot", 70);
carry.clearActiveSuggestions();
const empty = carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("refused with nothing to keep", /give the suggestion first/.test(empty.refusal ?? ""), true);

// --- targeting: "that" means the one just given, not everything in force -------------
// The whole point of the design. A session leaves the subject frozen, silent and unaware;
// "that stays with you" must keep only the thing actually meant.
carry.clearActiveSuggestions();
carry.noteApplied("movement-block");
carry.noteApplied("speech-block");
carry.noteApplied("illusion-block");
check("last applied is the most recent", carry.lastApplied(), ["illusion-block"]);
const ok = carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("keeps only that one", carry.carriedIds(), ["illusion-block"]);
check("  not the freeze", carry.isCarried("movement-block"), false);
check("  not the silence", carry.isCarried("speech-block"), false);
// The subject is told something lasts, never what.
check("  subject line hides the list", /illusion|clothes|wearing/i.test(ok.subject ?? ""), false);

// Said again after another suggestion, it accumulates rather than replacing.
carry.noteApplied("speech-block");
carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("accumulates", carry.carriedIds(), ["illusion-block", "speech-block"]);
check("  repeats are refused, not duplicated", !!carry.carryThese(HYP, "GameBot", ["speech-block"]).refusal, true);
check("  still two", carry.carriedIds().length, 2);

// The blunt wording is available when it really is what you want.
carry.releaseCarried("reset");
carry.clearActiveSuggestions();
carry.noteApplied("movement-block");
carry.noteApplied("speech-block");
carry.carryThese(HYP, "GameBot", carry.appliedSuggestions());
check("all-of-it keeps everything in force", carry.carriedIds(), ["movement-block", "speech-block"]);

// A release un-tracks it, so it can no longer be the thing "that" points at.
carry.noteReleased("speech-block");
check("released drops out of the tracker", carry.lastApplied(), ["movement-block"]);

// Ending a session clears the tracker — nothing spoken is still in force afterwards.
carry.clearActiveSuggestions();
check("exit clears the tracker", carry.appliedSuggestions(), []);
check("  but not what was already carried", carry.carriedIds().length, 2);

carry.releaseCarried("reset");
carry.clearActiveSuggestions();
carry.noteApplied("movement-block");
carry.noteApplied("speech-block");
carry.carryThese(HYP, "GameBot", carry.appliedSuggestions());

// --- surviving a wake ---
// carryThroughWake runs AFTER the session's total clear, so it must re-apply rather than
// merely decline to clear.
storage.setTriggerDuration(5);
said = [];
const line = carry.carryThroughWake();
check("wake line returned", typeof line, "string");
check("  still holding after the wake", carry.carriedIds(), ["movement-block", "speech-block"]);

// --- releasing one by name, out of trance ---
said = [];
voice.handleSpokenLine(HYP, "Missy you can move again");
check("carried release works out of trance", said.length, 1);
check("  and drops just that one", carry.carriedIds(), ["speech-block"]);

// Someone else cannot release it, and ordinary wording from them stays inert.
said = [];
voice.handleSpokenLine(OTHER, "Missy you can speak again");
check("only the carrier can release", said.length, 0);
check("  still held", carry.carriedIds(), ["speech-block"]);

// A restriction still does NOT work out of trance, carried or not — carrying grants the
// right to take back what you gave, not to keep giving.
said = [];
voice.handleSpokenLine(HYP, "Missy you cannot move");
check("restriction still inert out of trance", said.length, 0);

// --- the hypnotist taking it back ---
said = [];
voice.handleSpokenLine(HYP, "Missy forget what I said");
check("cancel phrase releases everything", carry.carriedIds(), []);
check("  and says so", said.length, 1);
check("  carrier forgotten", carry.isCarrierOf(HYP), false);

// --- nothing survives a safeword ---
storage.setTrustValue(HYP, "GameBot", 70);
carry.clearActiveSuggestions();
carry.noteApplied("movement-block");
carry.carryThese(HYP, "GameBot", carry.lastApplied());
carry.carryThroughWake();
check("carrying before the safeword", carry.carriedIds(), ["movement-block"]);
carry.releaseCarried("safeword");
check("safeword takes it too", carry.carriedIds(), []);
check("  and the carrier with it", carry.isCarrierOf(HYP), false);

// --- releasing a CARRIED illusion actually turns it off ---------------------------------
// The path that matters for the thing DW hit in play: the illusion is the one carried
// effect whose undo has to reach into another module, so "carry released it" and "the
// subject can see again" are two different claims. Assert the second.
storage.setFeature("illusionControl", true);
storage.setTrustValue(HYP, "GameBot", 70);
carry.releaseCarried("reset");
carry.clearActiveSuggestions();

illusion.freezeAppearance();
check("illusion applied", illusion.isIllusionActive(), true);
carry.noteApplied("illusion-block");
carry.carryThese(HYP, "GameBot", carry.lastApplied());
carry.carryThroughWake();
check("carried past waking", carry.isCarried("illusion-block"), true);
check("  and still showing the old clothes", illusion.isIllusionActive(), true);

carry.releaseCarried("test");
check("releasing it clears the carry", carry.carriedIds(), []);
check("  AND lets the subject see again", illusion.isIllusionActive(), false);

// --- the tracker alone carries nothing ---
// Applying a suggestion must never make it durable by itself; that takes the phrase.
carry.noteApplied("clothing-block");
check("tracking is not carrying", carry.carriedIds(), []);

console.log(`carry: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
