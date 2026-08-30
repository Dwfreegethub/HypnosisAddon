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

const { voice, storage, carry } = await import("./harness-bundle.mjs");

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
storage.setTrustValue(HYP, "GameBot", 40);
const low = carry.carryThese(HYP, "GameBot", carry.lastApplied());
check("refused below trust 65", /needs trust 65/.test(low.refusal ?? ""), true);
check("  nothing held", carry.carriedIds(), []);

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

// --- the tracker alone carries nothing ---
// Applying a suggestion must never make it durable by itself; that takes the phrase.
carry.noteApplied("clothing-block");
check("tracking is not carrying", carry.carriedIds(), []);

console.log(`carry: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
