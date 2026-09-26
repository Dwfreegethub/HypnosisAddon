// Our room lines and the double star, v0.92.7 (DW's trace, 2026-09-26).
//
// tellRoom sends "**text" through BC's ChatRoomSendEmote, which strips one "*" so the packet
// carries "*text", shown verbatim. A watcher saw "**Valerie rises…*": the packet had both stars,
// because something on the sender's client took over ChatRoomSendEmote and skipped the strip.
// The guard checks our own packets on their way out. Every check states what failure looks like.
globalThis.Player = { MemberNumber: 1, Name: "Valerie", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
let wire = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat") wire.push(data.Content); };
// R132 ChatRoomSendEmote, trimmed: strip one wrapping "*", then send.
const bcSendEmote = (msg) => {
	msg = msg.replace(/^\*/, "").replace(/\*$/, "").trim();
	if (msg === "" || msg === "*") return;
	ServerSend("ChatRoomChat", { Type: "Emote", Content: msg });
};
// ANOTHER ADD-ON that sometimes sends the text itself, skipping the strip.
let rogue = false;
globalThis.ChatRoomSendEmote = (msg) => (rogue ? ServerSend("ChatRoomChat", { Type: "Emote", Content: msg }) : bcSendEmote(msg));
// The mod SDK's hook chain on ServerSend.
const modApi = {
	hookFunction(name, _p, hook) {
		const original = globalThis[name];
		globalThis[name] = (...args) => hook(args, (a) => original(...a));
	},
};

const { notify } = await import("./harness-bundle.mjs");
notify.installRoomLineGuard(modApi);
notify.setRoomVoice(() => true);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// BC's own path: one star on the wire, left as it is. Failure: the guard strips a correct line.
wire = []; rogue = false;
notify.tellRoom("Valerie's feet draw together and stay there, neat and still.");
check("through BC: one star, untouched", wire, ["*Valerie's feet draw together and stay there, neat and still."]);

// The live fault. Failure: "**Valerie rises…" goes out (the watcher sees "**…*").
wire = []; rogue = true;
notify.tellRoom("Valerie rises, without seeming to decide to.");
check("strip skipped: the guard takes the extra star off", wire, ["*Valerie rises, without seeming to decide to."]);

// Not ours: a player's own "**" emote, sent by the same skipping add-on. Failure: we edit it.
wire = []; rogue = true;
ChatRoomSendEmote("**waves from across the room");
check("a player's own ** emote is left alone", wire, ["**waves from across the room"]);

// Each of our lines is fixed once: the same text typed later by the player is not ours.
wire = []; rogue = true;
ChatRoomSendEmote("**Valerie rises, without seeming to decide to.");
check("  our line is not matched twice", wire, ["**Valerie rises, without seeming to decide to."]);

// Other chat types pass untouched. Failure: a whisper or chat line edited.
wire = []; rogue = false;
ServerSend("ChatRoomChat", { Type: "Chat", Content: "**hello" });
check("chat lines are never touched", wire, ["**hello"]);

console.log(`room-line: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
