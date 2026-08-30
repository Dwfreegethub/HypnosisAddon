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
check("refused without permission", !!carry.beginCarry(HYP, "GameBot").refusal, true);
check("  nothing recording", carry.isRecordingCarry(), false);

storage.setFeature("carryForward", true);
storage.setTrustValue(HYP, "GameBot", 40);
const low = carry.beginCarry(HYP, "GameBot");
check("refused below trust 65", /needs trust 65/.test(low.refusal ?? ""), true);
check("  nothing recording", carry.isRecordingCarry(), false);

storage.setTrustValue(HYP, "GameBot", 70);
const ok = carry.beginCarry(HYP, "GameBot");
check("accepted at trust 70", carry.isRecordingCarry(), true);
// The subject is told something is being made to last, never what.
check("  subject line hides the list", /movement|speech|freeze/i.test(ok.subject ?? ""), false);

// --- capture ---
carry.noteCarried("movement-block");
carry.noteCarried("speech-block");
carry.noteCarried("movement-block"); // repeats must not stack
check("captures each id once", carry.carriedIds(), ["movement-block", "speech-block"]);
check("isCarried", carry.isCarried("speech-block"), true);
check("carrier is known", carry.isCarrierOf(HYP), true);
check("  and only them", carry.isCarrierOf(OTHER), false);

// --- surviving a wake ---
// carryThroughWake runs AFTER the session's total clear, so it must re-apply rather than
// merely decline to clear.
storage.setTriggerDuration(5);
said = [];
const line = carry.carryThroughWake();
check("wake line returned", typeof line, "string");
check("  still holding after the wake", carry.carriedIds(), ["movement-block", "speech-block"]);
check("  recording stopped", carry.isRecordingCarry(), false);

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
carry.beginCarry(HYP, "GameBot");
carry.noteCarried("movement-block");
carry.carryThroughWake();
check("carrying before the safeword", carry.carriedIds(), ["movement-block"]);
carry.releaseCarried("safeword");
check("safeword takes it too", carry.carriedIds(), []);
check("  and the carrier with it", carry.isCarrierOf(HYP), false);

// --- capture is inert when it was never turned on ---
carry.noteCarried("clothing-block");
check("no capture without beginCarry", carry.carriedIds(), []);

console.log(`carry: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
