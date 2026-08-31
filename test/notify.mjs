// Who sees what. The failure this guards against is a message reaching the wrong audience:
// a private line leaking to a public room is worse than any bug in what it says.
globalThis.Player = {
	MemberNumber: 1,
	Name: "Missy",
	ExtensionSettings: {},
	ArousalSettings: {},
	GetPronouns: () => "SheHer",
};
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let local = [], room = [];
globalThis.ChatRoomSendLocal = (m) => local.push(m);
globalThis.ChatRoomSendEmote = (m) => room.push(m);

const { notify, flavor } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- bracketing ---
local = [];
notify.tellPlayer("only you can read this");
check("private text is bracketed", local, ["[only you can read this]"]);
check("  and never reaches the room", room.length, 0);

// --- the room gate ---
notify.setRoomVoice(() => true);
room = [];
notify.tellRoom("Missy goes very still.");
check("the room hears when allowed", room, ["Missy goes very still."]);

notify.setRoomVoice(() => false);
room = [];
notify.tellRoom("Missy goes very still.");
check("and hears nothing when not", room, []);
notify.setRoomVoice(() => true);

// --- which effects the room can see at all ---
// Perception effects are unobservable by definition: nobody can watch someone fail to
// notice their own clothes. Getting this wrong would broadcast the one category of thing
// that exists precisely because it is invisible.
for (const key of [
	"awareness-block", "awareness-release", "touch-block", "touch-release",
	"illusion-block", "illusion-release", "arousal-none", "arousal-high", "arousal-full",
]) {
	check(`${key} stays private`, flavor.publicFlavor(key), null);
}
for (const key of [
	"movement-block", "movement-release", "kneel", "stand", "clothing-block",
	"selftouch-frozen", "selftouch-blocked", "speech-blocked-attempt", "orgasm-refused",
]) {
	check(`${key} is visible`, typeof flavor.publicFlavor(key), "string");
}

// --- name and pronouns ---
// An emote carries no name of its own, so every public line must name the character or it
// reads as coming from nowhere.
for (const key of ["movement-block", "kneel", "selftouch-blocked", "speech-blocked-attempt"]) {
	check(`${key} names the character`, /Missy/.test(flavor.publicFlavor(key)), true);
	check(`  ${key} leaves no tokens unfilled`, /\{\w+\}/.test(flavor.publicFlavor(key)), false);
}

check("she/her", notify.fillTokens("{name} · {their} · {them} · {themselves}"), "Missy · her · her · herself");
Player.GetPronouns = () => "HeHim";
check("he/him", notify.fillTokens("{their} · {them} · {themselves}"), "his · him · himself");
Player.GetPronouns = () => "TheyThem";
check("they/them", notify.fillTokens("{their} · {them} · {themselves}"), "their · them · themselves");
Player.GetPronouns = () => "ItIt";
check("it/its", notify.fillTokens("{their} · {them} · {themselves}"), "its · it · itself");
// Anything unrecognised falls to they/them — the only harmless direction to be wrong in.
Player.GetPronouns = () => "SomethingNew";
check("unknown falls back to they/them", notify.fillTokens("{their}"), "their");
Player.GetPronouns = undefined;
check("no pronoun support at all falls back too", notify.fillTokens("{their}"), "their");
Player.GetPronouns = () => "SheHer";

// Nickname wins over name, because that is what the room is shown.
Player.Nickname = "Miss";
check("nickname is what the room reads", notify.fillTokens("{name}"), "Miss");
delete Player.Nickname;

// --- announce sends both halves, exactly once each ---
local = []; room = [];
flavor.announce("kneel");
check("announce tells the subject", local.length, 1);
check("  bracketed", /^\[.*\]$/.test(local[0]), true);
check("  and the room", room.length, 1);
check("  unbracketed", /^\[/.test(room[0]), false);

local = []; room = [];
flavor.announce("awareness-block");
check("a private effect tells only the subject", local.length, 1);
check("  and says nothing to the room", room.length, 0);

// --- body parts use the word the hypnotist used, on both sides ---
local = []; room = [];
flavor.announceBodyPart("pussy");
check("body part, private", /pussy/.test(local[0] ?? ""), true);
check("body part, public names the character", /Missy/.test(room[0] ?? ""), true);
check("  and uses their pronoun", /\bher\b/.test(room[0] ?? ""), true);
check("  with nothing left unfilled", /\{\w+\}/.test(room[0] ?? ""), false);

console.log(`notify: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
