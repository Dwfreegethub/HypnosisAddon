// The roleplay bonus: engaging during the induction window improves the roll.
//
// The doc has asked for this since the session flow was designed, and its absence is what
// made the induction ACCELERATOR look like the RP reward. It is not — that pays out for
// completing an induction whether or not a word was said. This is the one that reads effort,
// so what this suite mostly protects is that it reads the RIGHT effort: the hypnotist's, in
// the window, in more than one sentence.
const HYP = 246108, OTHER = 999;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};

const { session, messaging, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

storage.setFeature("hypnoEnabled", true);

const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

/** Drive a fresh attempt to the point where the RP window is open. */
const openWindow = () => {
	session.safeword();
	incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
	session.answerPrompt("ignore");
};

// Long enough to clear RP_MIN_LENGTH (15), which real induction phrasing does easily.
const LINE_A = "Your eyelids are getting heavier with every breath";
const LINE_B = "Let your shoulders drop, and listen only to my voice";
const LINE_C = "Down and down, further with every word I say";

// --- nothing outside a live window ------------------------------------------------------
// The counter has to be deaf by default: it is fed EVERY line of room chat.
session.safeword();
session.noteInductionLine(HYP, LINE_A);
check("no bonus with no session", session.rpBonusFor(HYP), 0);

// --- the window ---------------------------------------------------------------------
openWindow();
check("window opens at zero", session.rpBonusFor(HYP), 0);
session.noteInductionLine(HYP, LINE_A);
check("one line is +5", session.rpBonusFor(HYP), 5);
session.noteInductionLine(HYP, LINE_B);
check("two lines is +10", session.rpBonusFor(HYP), 10);
session.noteInductionLine(HYP, LINE_C);
check("three lines is +15", session.rpBonusFor(HYP), 15);
session.noteInductionLine(HYP, "And deeper still, with nothing else to hold onto");
check("and it caps there", session.rpBonusFor(HYP), 15);

// --- who and what counts -----------------------------------------------------------
openWindow();
session.noteInductionLine(OTHER, LINE_A);
check("a bystander earns the hypnotist nothing", session.rpBonusFor(HYP), 0);
check("  and nothing for themselves", session.rpBonusFor(OTHER), 0);

session.noteInductionLine(HYP, "ok");
check("a grunt does not count", session.rpBonusFor(HYP), 0);
session.noteInductionLine(HYP, "   ");
check("nor does whitespace", session.rpBonusFor(HYP), 0);

// The cheap anti-farm: the same line pasted repeatedly is one line.
session.noteInductionLine(HYP, LINE_A);
session.noteInductionLine(HYP, LINE_A);
session.noteInductionLine(HYP, LINE_A.toUpperCase());
check("a repeated line counts once", session.rpBonusFor(HYP), 5);
session.noteInductionLine(HYP, LINE_B);
check("  but a different one counts", session.rpBonusFor(HYP), 10);
// ...and going back to the first is fine — only the IMMEDIATELY preceding line is blocked,
// which is what stops paste-spam without punishing a returning refrain.
session.noteInductionLine(HYP, LINE_A);
check("  a refrain is allowed to return", session.rpBonusFor(HYP), 15);

// --- it does not survive the attempt ------------------------------------------------
// Three attempts in a session are three performances. Letting the first pay for the third
// would reward giving up and waiting out the window.
openWindow();
session.noteInductionLine(HYP, LINE_A);
session.noteInductionLine(HYP, LINE_B);
check("earned in this window", session.rpBonusFor(HYP), 10);
openWindow();
check("a fresh window starts at zero again", session.rpBonusFor(HYP), 0);

// --- it is session-only, and it shows in the diagnostic --------------------------------
// The whole reason this is a roll modifier rather than an accelerator: it can never reach
// storage, so it cannot be farmed into permanent access the way trust can.
const before = storage.trustWith(HYP);
openWindow();
for (const l of [LINE_A, LINE_B, LINE_C]) session.noteInductionLine(HYP, l);
check("trust is untouched by roleplay", storage.trustWith(HYP), before);
check("the diagnostic reports it", session.describeChances(HYP).some((l) => /roleplay bonus \+15/.test(l)), true);
check("  and stays quiet when there is none", session.describeChances(OTHER).some((l) => /roleplay bonus/.test(l)), false);

session.safeword();
check("the safeword takes it too", session.rpBonusFor(HYP), 0);

console.log(`rp: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
