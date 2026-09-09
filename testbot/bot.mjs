// A hypnotist that is a script, not a person.
//
// Testing this add-on needs two accounts and precise timing, which makes every scenario slow
// and slightly different each time. This bot plays the hypnotist side: it speaks the hidden
// protocol the subject's client expects, says the suggestion phrases, and — crucially — knows
// what each step is SUPPOSED to do, so it can tell you what to look for and record what you
// saw. It never asserts anything about the subject itself, because it cannot: the subject's
// client is the only authority on whether something landed. That is the architecture, not a
// limitation, so the bot asks rather than assumes.
//
// Everything it sends and receives goes to testbot/session.log, which is the point — a
// scenario that misbehaves leaves a transcript rather than a memory.
//
//   npm install
//   node bot.mjs
//
// In the room, drive it from chat:
// TWO WAYS IN, and the second one matters more than it looks. Every command below can be
// typed in chat with a `!`, or given as a slash command — `/bot next` — which reaches us over
// the hidden channel instead of the room. Use the slash form whenever the subject is silenced,
// which several of these scenarios do on purpose: chat is blocked then, and `/bot` is not.
//
//   !tests            list the scenarios
//   !run <n>          run scenario n
//   !next             advance to the next step
//   !ok [note]        record the step as passing, and advance
//   !fail <note>      record the step as failing, and advance
//   !say <text>       make the bot say something arbitrary
//   !hidden <type>    send a raw protocol message, for poking at edge cases
//   !status           where we are
//   !join             (re)join the room, if the bot started before it existed
//   !rooms            list the rooms the server will show us — the Environment check
//   !trance [d] [e]   TESTING: put the subject under at a chosen depth, skipping the roll
//   !retry            another induction attempt after a missed roll (3, then a 10 min cooldown)
//   !abort            stop the scenario

import { io } from "socket.io-client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BC_SERVER = "https://bondage-club-server.herokuapp.com/";
/** Our namespace on BC's shared Type:"Hidden" channel. MUST match messaging.ts — if these
 * ever disagree the bot talks to itself and everything silently does nothing. */
const HIDDEN_TAG = "HypnoMsg";
const LOG_FILE = path.join(HERE, "session.log");

// --- config ---------------------------------------------------------------------------
let secrets;
const SECRETS_FILE = path.join(HERE, "secrets.json");
{
	// Missing and malformed are DIFFERENT problems and used to print the same sentence, which
	// sent DW hunting for a file that was sitting right there. A trailing comma is not a missing
	// file; say which one it is.
	let raw;
	try {
		raw = fs.readFileSync(SECRETS_FILE, "utf-8");
	} catch {
		console.error(`No ${SECRETS_FILE}.`);
		console.error("Copy secrets.example.json to secrets.json and fill it in.");
		process.exit(1);
	}
	try {
		secrets = JSON.parse(raw);
	} catch (err) {
		console.error(`${SECRETS_FILE} is not valid JSON: ${err.message}`);
		console.error("Usually a missing or extra comma between entries.");
		process.exit(1);
	}
}
const {
	username,
	password,
	roomName = "Hypno testing",
	subjectName = "",
	// THE ONE THAT MATTERS. Read app.js on the BC server:
	//
	//   function AccountGetEnvironment(socket) {
	//     if (origin header matches ChatRoomProduction) return "PROD";
	//     else if (origin header exists)                return "DEV";
	//     else return (Math.round(Math.random() * 1e12)).toString();
	//   }
	//
	// and then ChatRoomJoin refuses any room where `Acc.Environment != Room.Environment`.
	//
	// A browser sets Origin automatically; a Node socket.io client does not, so without this
	// the bot lands in an Environment named after a random number and can never see a room
	// made in a browser — the room is genuinely there (ChatRoomCreate says RoomAlreadyExist)
	// and genuinely invisible (ChatRoomJoin says CannotFindRoom). Both were true at once,
	// which is what gave it away.
	//
	// This is also why the SlaveParking bot never hit it: that one CREATES the room it lives
	// in, so both ends share whatever random Environment it was given.
	origin = "https://www.bondageprojects.elementfx.com",
} = secrets;

// --- logging --------------------------------------------------------------------------
// Written as it happens rather than buffered: the interesting runs are the ones that hang or
// crash, and a buffer loses exactly those.
function logLine(kind, text, data) {
	const stamp = new Date().toISOString().slice(11, 23);
	const line = `[${stamp}] ${kind.padEnd(9)} ${text}${data ? " " + JSON.stringify(data) : ""}`;
	console.log(line);
	try {
		fs.appendFileSync(LOG_FILE, line + "\n");
	} catch {
		/* never let logging break a run */
	}
}

// --- connection -----------------------------------------------------------------------
const socket = io(BC_SERVER, {
	transports: ["websocket"],
	// Applied to the WebSocket handshake in Node. Must match the site you actually play on,
	// because the server compares the two accounts' Environments and not the string itself.
	extraHeaders: { Origin: origin },
});
let me = 0;
/** memberNumber -> name, from ChatRoomSync. */
const room = new Map();
let subject = null;

socket.on("connect", () => {
	logLine("net", "connected, logging in");
	socket.emit("AccountLogin", { AccountName: username, Password: password });
});

socket.on("LoginResponse", (data) => {
	if (typeof data === "string") {
		logLine("ERROR", `login failed: ${data}`);
		process.exit(1);
	}
	me = data.MemberNumber;
	logLine("net", `logged in as ${data.Name} (${me})`);

	// The server needs a CHARACTER before it will put us in a room, and logging in does not
	// by itself produce one. Skipping this is why the first version sat there having "joined"
	// nothing: ChatRoomJoin went out and the server never answered at all, which reads
	// exactly like a lost packet. Same sequence the SlaveParking bot uses, which works.
	socket.emit("AccountUpdate", { Inventory: data.Inventory ?? [], OnlineSettings: data.OnlineSettings ?? {} });
	socket.emit("AccountUpdate", { Game: data.Game ?? {} });
	socket.emit("AccountUpdate", { AssetFamily: "Female3DCG" });

	// A beat for the server to apply those before asking it to seat us somewhere.
	setTimeout(tryJoin, 800);
});

// BC ROOMS ARE EPHEMERAL — they exist only while somebody is standing in one. An empty room
// is not an empty room, it is no room, so "CannotFindRoom" usually means the subject is not
// in it yet rather than that anything is wrong. The bot therefore keeps trying, and makes the
// room itself if it is first to arrive.
//
// The two responses are also easy to get wrong: a SUCCESSFUL join answers on
// ChatRoomJoinResponse, but a FAILED one comes back on ChatRoomSearchResponse. Listening only
// to the first is why the fallback below never ran on the first attempt.
let joined = false;
let joinTries = 0;

function tryJoin() {
	if (joined) return;
	joinTries += 1;
	logLine("net", `joining "${roomName}" (attempt ${joinTries})`);
	socket.emit("ChatRoomJoin", { Name: roomName });
}

function createRoom() {
	logLine("net", `creating "${roomName}"`);
	socket.emit("ChatRoomCreate", {
		Name: roomName,
		Description: "Hypnosis add-on test harness",
		Background: "IntroductionDark",
		Private: false,
		Locked: false,
		Space: "",
		Game: "",
		Admin: [me],
		Ban: [],
		Limit: 10,
		BlockCategory: [],
		Language: "EN",
	});
}

// THERE IS NO ChatRoomJoinResponse. The server emits every join outcome — success and
// failure alike — on ChatRoomSearchResponse; `grep -c ChatRoomJoinResponse app.js` is 0.
// Listening for a success event that does not exist is why the bot reported nothing after a
// join that may well have worked.
socket.on("ChatRoomSearchResponse", (data) => {
	if (data === "JoinedRoom" || data === "AlreadyInRoom") {
		joined = true;
		logLine("net", `in "${roomName}"`);
		return;
	}
	if (joined) return;
	if (data === "CannotFindRoom") {
		// Either nobody is in it — BC rooms exist only while occupied — or we cannot SEE it,
		// which is the Environment mismatch above. Make it once so there is somewhere to walk
		// into, then keep knocking.
		if (joinTries <= 1) createRoom();
		else setTimeout(tryJoin, 5000);
		return;
	}
	logLine("net", `join refused: ${JSON.stringify(data)}`);
	setTimeout(tryJoin, 5000);
});

socket.on("ChatRoomCreateResponse", (data) => {
	if (data === "ChatRoomCreated") {
		joined = true;
		logLine("net", `created and joined "${roomName}" — walk in whenever you are ready`);
		return;
	}
	// Somebody made it between our miss and our create, which is the normal race when both
	// sides start at once. Just join it.
	if (data === "RoomAlreadyExist") {
		logLine("net", "room appeared while we were creating it — joining");
		setTimeout(tryJoin, 500);
		return;
	}
	logLine("ERROR", `could not create the room: ${JSON.stringify(data)}`);
	setTimeout(tryJoin, 5000);
});

socket.on("ChatRoomSearchResult", (rooms) => {
	const names = (rooms ?? []).map((r) => `${r.Name} (${r.MemberCount ?? "?"})`);
	logLine("net", `${names.length} room(s) visible to us`, names.slice(0, 20));
	if (!names.length) {
		logLine("net", "NONE — if the subject is standing in one right now, our Environments differ; check `origin` in secrets.json");
	}
});

socket.on("ChatRoomLeaveResponse", () => {
	joined = false;
	logLine("net", "left the room — will try to get back in");
	setTimeout(tryJoin, 2000);
});

socket.on("ChatRoomSync", (data) => {
	room.clear();
	for (const c of data?.Character ?? []) room.set(c.MemberNumber, c.Name);
	// Whoever else is here is the subject, unless secrets names one. With two accounts in a
	// test room, "the other person" is unambiguous and saves typing a member number.
	const others = [...room.entries()].filter(([n]) => n !== me);
	const picked = subjectName ? others.find(([, name]) => name === subjectName) : others[0];
	if (picked && subject?.id !== picked[0]) {
		subject = { id: picked[0], name: picked[1] };
		logLine("room", `subject is ${subject.name} (${subject.id})`);
	}
	if (!picked) subject = null;
});

// --- talking --------------------------------------------------------------------------
function say(text) {
	logLine("SAY", text);
	socket.emit("ChatRoomChat", { Content: text, Type: "Chat" });
}

function hidden(message, target = subject?.id ?? null) {
	logLine("SEND", message.type, message);
	socket.emit("ChatRoomChat", {
		Content: HIDDEN_TAG,
		Type: "Hidden",
		Target: target,
		Dictionary: [{ message }],
	});
}

// --- listening ------------------------------------------------------------------------
// The subject's client pushes a deliberately lossy view of its state — bands, never numbers,
// and never the private choice. That is the whole architecture and it means the bot can
// report the shape of what happened but never grade it. Hence the ask-the-human steps.
let lastUpdate = null;

// WHAT THE SUBJECT LOOKS LIKE, in one line.
//
// This is the assertion for most of the suite — did a garment come off, is the freeze on, is
// she kneeling — and until now the bot could not see any of it. The run-7 log recorded five
// steps of undressing and not one fact about whether any clothes moved; the answer had to be
// inferred from the ABSENCE of a sync, which is exactly the kind of reading-tea-leaves the
// harness exists to replace.
const CLOTHING = [
	"Cloth", "ClothLower", "SuitTop", "SuitLower", "Bra", "Panties", "Socks", "Shoes", "Gloves",
];
const ACCESSORY = ["Hat", "Glasses", "Necklace", "Mask", "Gloves2"];

function describeCharacter(c) {
	const app = Array.isArray(c?.Appearance) ? c.Appearance : [];
	const group = (n) => app.find((a) => a?.Group === n);
	// Our effects ride the Emoticon item — see effects.ts. Anything here is the add-on's doing.
	const effects = group("Emoticon")?.Property?.Effect ?? [];
	const worn = CLOTHING.filter(group);
	const extras = ACCESSORY.filter(group);
	return {
		effects,
		wearing: worn,
		accessories: extras,
		pose: c?.ActivePose ?? [],
	};
}

/** Only log a sync when something we care about actually changed — BC re-syncs constantly. */
let lastLook = "";
function noteAppearance(c) {
	if (!c || c.MemberNumber !== subject?.id) return;
	const look = describeCharacter(c);
	const key = JSON.stringify(look);
	if (key === lastLook) return;
	lastLook = key;
	logLine("look", subject.name, look);
}

socket.on("ChatRoomSyncSingle", (data) => noteAppearance(data?.Character));
socket.on("ChatRoomSyncCharacter", (data) => noteAppearance(data?.Character));

socket.on("ChatRoomMessage", (data) => {
	if (data?.Type === "Hidden" && data?.Content === HIDDEN_TAG) {
		const message = data?.Dictionary?.[0]?.message;
		if (!message) return;
		logLine("RECV", `${message.type} from ${room.get(data.Sender) ?? data.Sender}`, message);
		if (message.type === "session-update") {
			lastUpdate = message;
			// The refusal reason is the single most useful field in the protocol: it is the
			// subject's client saying why it declined, in its own words.
			if (message.refusedReason) {
				logLine("REFUSED", message.refusedReason);
				// AND TELL DW, in game. The induction run failed because her client answered
				// "Already under." at step 1 — the bot logged it, nobody was reading the log,
				// and the step guidance said only "FAIL IF: no box appears". A refusal names
				// the cause outright; leaving it in a file while the person is looking at a
				// screen is the same mistake as the console-only suggestion refusals.
				report(`Your client refused: "${message.refusedReason}"`);
			}
		}
		// Refusals are the single most useful thing the subject's client says, so they get
		// their own line rather than being left inside a RECV blob. The depth-arousal run was
		// ungradeable for want of exactly this.
		if (message.type === "trigger-status" && /Refused/i.test(message.text ?? "")) {
			logLine("REFUSED", message.text);
		}
		// `/bot next` on the subject's side arrives here rather than as chat.
		//
		// This is not a convenience. The suite silences the subject on purpose, and a silenced
		// subject cannot type `!next` — the harness was disabling the only way to drive it, and
		// the better the addon worked the more thoroughly the tests locked themselves out.
		// Slash commands survive because the speech block hooks ChatRoomSendChatMessage, which
		// runs after command parsing; the hidden channel then carries it here untouched.
		if (message.type === "test-command" && typeof message.text === "string") {
			handleCommand(data.Sender, `!${message.text.replace(/^[!/]+/, "")}`);
		}
		return;
	}
	if (data?.Sender === me) return;
	if (data?.Type === "Chat" && typeof data?.Content === "string") {
		const text = data.Content.trim();
		logLine("said", `${room.get(data.Sender) ?? data.Sender}: ${text}`);
		if (text.startsWith("!")) handleCommand(data.Sender, text);
		return;
	}
	// EMOTES ARE RESULTS, not decoration. Almost everything the add-on does narrates itself to
	// the room — "hands move to undress and stop, held" IS the outcome of an undress command —
	// and the bot was dropping every one of them. Run 7 refused five times and the log recorded
	// none of it, which is why the failure could not be diagnosed from here.
	if (data?.Type === "Emote" || data?.Type === "Action") {
		if (typeof data?.Content === "string") {
			logLine("room", `${data.Type}: ${data.Content}`);
		}
	}
});

// --- scenarios ------------------------------------------------------------------------
// Each step says what the bot does and what YOU should look for. The bot cannot see the
// subject's screen, so a step that changes something invisible ends in a question.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Put the subject under at a chosen depth, with US as the hypnotist, in one message.
 *
 * EVERY depth scenario needs this and none of them had it. They opened by asking DW to run
 * `/hypno depth 30 30` and then started talking — but a forced depth is only a number, and
 * handleSpokenLine() checks `isSessionActiveWith(sender)` BEFORE it looks at any depth gate.
 * So the suggestions were refused for having no session, at a stage that never mentions
 * depth, and the whole suite was testing nothing while looking like the addon was broken.
 * "Missy, you cannot move" doing nothing was the correct behaviour.
 *
 * Handled by a TESTING_MODE-only handler on the subject's side; it does not exist in a
 * release build, which is the point — nobody should be able to force a trance for real. */
function trance(depth = 80, earned = depth) {
	hidden({ type: "test-trance", depth, earned });
}

// EVERY STEP SAYS WHAT SHOULD HAPPEN AND WHAT WOULD MEAN IT FAILED.
//
// `look` used to be one sentence doing both jobs and it was not enough: DW ran the undress
// scenario, got four refusal messages, and could not tell whether that was the expected result
// or the bug. A test whose outcome has to be interpreted is not a test.
//
//   do    what the bot does
//   want  what SHOULD happen — the pass condition, stated as an observation
//   fail  what it looks like when it is broken. Optional, but write one wherever "nothing
//         happened" is a possible outcome, because "nothing happened" is ambiguous on its own.
//
// And keep the baseline in mind when writing one. Three scenarios have already been wrong
// because the setup produced the state the assertion was checking for: no session at all, a
// trance that freezes on its own, a trance freeze that then blocks undressing. If a step
// cannot fail, it is not testing anything.
const SCENARIOS = [
	{
		name: "induction",
		blurb: "The basic loop: attempt, choose, roll. The ONLY scenario that rolls.",
		// A FAILED ROLL IS NOT A FAILED TEST, and this is the one scenario where that has to be
		// said out loud. Every other scenario forces the depth; this one earns it, so it is at
		// the mercy of the dice:
		//
		//   chance = trust + 25 (agree) + experience*0.25 + RP bonus (up to 15), floor 5, ceil 95
		//
		// With little trust built with this bot that is somewhere near a coin flip. Three
		// attempts are allowed and then a TEN MINUTE cooldown starts, which would eat the
		// evening — so the retry is a step of its own rather than something to discover.
		steps: [
			{
				do: () => hidden({ type: "session-attempt", hypnotistName: "WinnersDice" }),
				want: "A box offering Agree / Ignore / Fight. Choose AGREE — the other two are separate tests.",
				fail: "No box appears at all.",
			},
			{
				do: async () => {
					say("Missy, look at me and let your eyes go still.");
					await wait(1500);
					say("Missy, every breath takes you further down, and that is fine.");
					await wait(1500);
					say("Missy, there is nothing to hold on to and nothing you need to do.");
				},
				want: "`/hypno chance WinnersDice` shows `roleplay bonus +15` — three lines, 5 each. THEN WAIT for the 60s window to close before the next step.",
				fail: "The bonus is below +15, or the command does not mention roleplay at all. That is the real assertion here; whether the roll then lands is luck.",
			},
			{
				// WAIT FOR THE ROLL RATHER THAN ASKING DW TO TIME IT.
				//
				// The step used to report whatever phase had arrived by then, which mid-window
				// is "InductionInProgress" — a non-answer. DW read it as nothing having
				// happened and asked for a retry twenty seconds into a running 60-second
				// window; session-continue correctly ignores anything that is not a failed
				// attempt, so there was no second prompt, and it looked like the prompt was
				// broken. It was not: the first attempt was still running and went on to
				// succeed at 01:45:13, exactly 60 seconds after the window opened.
				//
				// The bot has the window length in the protocol and a clock. Neither of those
				// is DW's job.
				do: async () => {
					report("Waiting for the window to close — I will say what the roll did. Nothing to do until then.");
					const until = Date.now() + 90_000;
					while (Date.now() < until) {
						const phase = lastUpdate?.phase;
						if (phase && phase !== "InductionInProgress" && phase !== "AttemptMade") break;
						await wait(1000);
					}
					const u = lastUpdate;
					if (!u) return report("I have heard nothing back from your client at all — that itself is the finding.");
					if (u.phase === "Hypnotized") {
						return report(`Under. Depth band "${u.depthBand}". Run /hypno effects and report the tier with /bot ok <tier>.`);
					}
					if (u.phase === "AttemptFailed") {
						return report(
							`The roll missed${u.progressBand ? ` (progress "${u.progressBand}")` : ""} — attempt ${u.attempts}/${u.maxAttempts}. ` +
								"That is luck, not a bug. /bot retry for another.",
						);
					}
					if (u.phase === "CooldownRequired") {
						return report(`Out of attempts — ${Math.ceil((u.cooldownRemaining ?? 0) / 60000)} minute cooldown. Still not a bug.`);
					}
					report(`Window did not close after 90s. Last phase was "${u.phase}" — THAT is a finding.`);
				},
				want: "I say what the roll did. Under → `/bot ok <tier>`. Missed → `/bot retry`, which is luck rather than a failure.",
				fail: "Only `/bot fail` if I report the window never closing, or that I heard nothing at all from your client.",
			},
		],
	},
	{
		name: "depth-shallow",
		blurb: "A shallow trance must refuse the deep three.",
		steps: [
			{
				do: () => trance(30, 30),
				want: "Under at Yielding. `/hypno effects` confirms the tier.",
			},
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				want: "REFUSED. I log a refusal naming Deep (60), and `/hypno effects` shows the clothing illusion OFF.",
				fail: "Your clothes stop reflecting changes — that means it applied when it should not have.",
			},
			{
				do: () => say("Missy, your trigger word is buttercup."),
				want: "REFUSED, naming Deep (60). I log the refusal.",
				fail: "It starts recording — `/hypno triggers` would then list it.",
			},
			{
				do: () => say("Missy, you cannot move."),
				want: "WORKS — movement only needs Yielding (20). You should be unable to move.",
				fail: "You can still move, or I log a refusal.",
			},
		],
	},
	{
		name: "depth-deep",
		blurb: "A Deep trance allows what a shallow one refused.",
		steps: [
			{ do: () => trance(80, 80), want: "Under at Blank, all of it earned." },
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				want: "APPLIES. `/hypno effects` shows the clothing illusion ON, listing the frozen groups.",
				fail: "I log a refusal, or effects shows it off.",
			},
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot speak.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				want: "PLANTS. I should log RECORDING, then SAVED. `/hypno triggers` lists it.",
				fail: "Any refusal in my log, or nothing listed.",
			},
		],
	},
	{
		name: "depth-arousal",
		blurb: "THE important one: arousal cannot buy the earned three.",
		steps: [
			{
				do: () => trance(80, 20),
				want: "Under at 80 full / 20 earned — deep because aroused, not because hypnotised.",
			},
			{
				do: () => say("Missy, you cannot move."),
				want: "WORKS. A session feature reads the FULL depth, and 80 clears Yielding.",
				fail: "You can still move, or I log a refusal.",
			},
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				want: "REFUSED. The illusion is earned-only and only 20 was earned. I log a refusal saying `arousal does not count`.",
				fail: "It applies anyway — then check `/hypno gates` for a lowered tier on Clothing illusion.",
			},
			{
				do: () => say("Missy, your trigger word is nightfall."),
				want: "REFUSED, also naming `arousal does not count`.",
				fail: "It starts recording.",
			},
		],
	},
	{
		name: "trigger-fires",
		blurb: "A trigger planted deep still fires later, with no trance at all.",
		steps: [
			{ do: () => trance(80, 80), want: "Under at Blank." },
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot move.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				want: "PLANTS. I log RECORDING then SAVED.",
				fail: "Any refusal in my log.",
			},
			{
				do: () => hidden({ type: "session-wake" }),
				want: "You wake. `/hypno effects` shows no session and no depth, and you can move again.",
				fail: "You are still under, or still frozen.",
			},
			{
				do: () => say("buttercup"),
				want: "THE TEST: you freeze, with no trance and zero depth. A trigger answers to the induction that planted it, not to how deep you are now.",
				fail: "Nothing happens — that means triggers are broken.",
			},
		],
	},
	{
		name: "ooc",
		blurb: "Parenthesised text must do nothing at all.",
		// TESTS A RELEASE, NOT A RESTRICTION, and that is the whole point of the rewrite.
		//
		// The first version asserted "nothing should happen. No freeze" straight after putting
		// the subject under — but applyTranceState() applies Freeze the moment she goes under
		// if she has "Cannot Move During Trance" ticked, which she does. So she was frozen
		// before the OOC line was ever spoken, "no freeze" could not fail, and the following
		// step's "you should be frozen" could not fail either.
		//
		// Releases have no such baseline: nothing about being in a trance un-freezes anybody.
		steps: [
			{ do: () => trance(80, 80), want: "Under at Blank. Your trance settings may already freeze you; the next step makes it certain either way." },
			{
				do: () => say("Missy, you cannot move."),
				want: "BASELINE: you cannot move. Confirm that before going on — the next step depends on it.",
			},
			{
				do: () => say("(Missy, you can move again)"),
				want: "NOTHING HAPPENS. Entirely OOC, so it must not reach you — you are STILL frozen.",
				fail: "You can move. That is OOC leaking, and there is no other way for it to happen.",
			},
			{
				do: () => say("Missy, you can move again (back in a sec)"),
				want: "RELEASES. The IC half of a mixed line still lands, so you can move now.",
				fail: "You are still frozen — the aside ate the whole line.",
			},
		],
	},
	{
		name: "undress",
		blurb: "Taking clothes off, one garment at a time.",
		// STEP 2 IS NOT OPTIONAL. Verified in the live client, Character.js:
		//   IsRestrained: () => HasEffect("Freeze") || HasEffect("Block") || HasEffect("BlockWardrobe")
		//   CanChangeClothesOn: (C) => !C.IsRestrained() && ...
		// so a subject frozen by her own trance settings cannot undress at all. The first
		// version ran straight from the trance into "take something off" and got four
		// refusals, which read as the feature being broken.
		steps: [
			{
				do: () => trance(60, 60),
				want: "Under at Entranced (60) — the tier undressing needs. Tick Undressing in the settings if it is not already on.",
			},
			{
				do: () => say("Missy, you can move again."),
				want: "You can move. Frozen hands cannot undress, so this clears the trance freeze first.",
				fail: "Still frozen — everything below will refuse, and correctly so.",
			},
			{
				do: () => say("Missy, take something off."),
				want: "ONE garment comes off, the outermost first — your top. The room sees an emote.",
				fail: "'Undressing would require moving' means step 2 did not take. 'Something holds them' means a real lock, not us.",
			},
			{
				do: () => say("Missy, take something off."),
				want: "The NEXT garment down, one only.",
				fail: "Two come off at once, or nothing does.",
			},
			{
				do: () => say("Missy, take everything off."),
				want: "The rest of the clothes go. Hats, glasses and jewellery STAY — they are not clothing.",
				fail: "Accessories come off too, or clothes are left behind.",
			},
		],
	},
	{
		name: "hard-floor",
		blurb: "hypnoEnabled off must release everything.",
		steps: [
			{ do: () => trance(80, 80), want: "Under at Blank, so there is something to tear down." },
			{
				do: async () => {
					say("Missy, you cannot move.");
					await wait(1000);
					say("Missy, you cannot speak.");
					await wait(1000);
					say("Missy, you cannot tell what you are wearing.");
				},
				want: "All three apply. `/hypno effects` lists movement, speech and the clothing illusion.",
				fail: "Any of the three missing from effects.",
			},
			{
				// LAST TIME THIS PRODUCED NO VERDICT. Frozen and silenced, the reflex is the
				// safeword — and the safeword is a DIFFERENT mechanism that clears everything
				// through its own path, so using it here proves nothing about the hard floor
				// and quietly reads as a pass. Say so in the step, since it is the natural
				// thing to reach for and the instruction never warned against it.
				do: () => {},
				want: "UNTICK 'Hypnosis Enabled' — Preferences > Extensions > Hypnosis Add-on, first toggle on the Permissions tab. Everything comes off at once: `/hypno effects` says nothing is holding you, and you can move and speak again.",
				fail: "Anything at all survives the untick — the most serious result in the suite. DO NOT USE THE SAFEWORD HERE: it clears everything by its own path, so it proves nothing and looks like a pass. The untick is the whole test. Re-tick it afterwards to carry on.",
			},
		],
	},
];

// --- running them ---------------------------------------------------------------------
let active = null;

/** Everything the harness says to DW. Deliberately NOT say().
 *
 * say() puts text in the room, where the subject's client reads it as the hypnotist speaking —
 * and our guidance is full of hypnosis wording, because it is describing hypnosis. Trigger
 * matching happens before the name check and before the session check, so a step description
 * quoting a phrase can fire a stored trigger. That is what wrecked run 7: the release at step 2
 * worked, the log shows effects going to [], and 15ms later kneel and a freeze came back —
 * twice — with nothing spoken in between except our own four lines of instructions.
 *
 * Only the lines that are the test itself get spoken aloud now. Falls back to chat when there
 * is no subject to send to, so !rooms and !status still answer when the bot is alone. */
function report(text) {
	if (subject?.id) hidden({ type: "test-note", text }, subject.id);
	else say(text);
}

async function runStep() {
	if (!active) return;
	const step = active.scenario.steps[active.at];
	if (!step) {
		const { pass, fail } = active.results.reduce(
			(a, r) => ({ pass: a.pass + (r.ok ? 1 : 0), fail: a.fail + (r.ok ? 0 : 1) }),
			{ pass: 0, fail: 0 },
		);
		logLine("DONE", `${active.scenario.name}: ${pass} ok, ${fail} failed`, active.results);
		report(`[${active.scenario.name}] finished — ${pass} ok, ${fail} failed. Log written.`);
		active = null;
		return;
	}
	logLine("STEP", `${active.scenario.name} ${active.at + 1}/${active.scenario.steps.length}`);
	try {
		await step.do();
	} catch (err) {
		logLine("ERROR", `step threw: ${err?.message ?? err}`);
	}
	// Two lines rather than one, because the pass condition and the failure condition are
	// different thoughts and running them together is what made the undress result unreadable.
	const n = `[${active.at + 1}/${active.scenario.steps.length}]`;
	report(`${n} EXPECT: ${step.want}`);
	if (step.fail) report(`${n} FAIL IF: ${step.fail}`);
	report(`${n} Then /bot next${active.at + 1 === active.scenario.steps.length ? " — or /bot ok / /bot fail to finish" : ""}.`);
}

/** Both entry points land here: `!cmd` typed in chat, and `/bot cmd` arriving over the hidden
 * channel. The leading marker is already stripped to a single `!` by the caller. */
function handleCommand(sender, text) {
	const [cmd, ...rest] = text.slice(1).split(/\s+/);
	const arg = rest.join(" ");
	logLine("CMD", text, { from: room.get(sender) ?? sender });

	switch (cmd.toLowerCase()) {
		case "tests":
			SCENARIOS.forEach((s, i) => report(`${i + 1}. ${s.name} — ${s.blurb}`));
			report("!run <n> to start. !ok / !fail <note> to record a step.");
			report("Cannot speak? Same commands as /bot run 2, /bot next, /bot ok — those work gagged.");
			return;
		case "run": {
			const n = Number(arg) - 1;
			const scenario = SCENARIOS[n];
			if (!scenario) return report(`No scenario ${arg}. !tests to list them.`);
			if (!subject) return report("I cannot see a subject in the room yet.");
			active = { scenario, at: 0, results: [] };
			logLine("RUN", scenario.name, { subject: subject.name });
			report(`Running "${scenario.name}" against ${subject.name}. ${scenario.steps.length} steps.`);
			return void runStep();
		}
		case "next":
			if (!active) return report("Nothing running. !run <n>.");
			// Two runs have now ended "0 ok, 0 failed" because next was pressed on the last
			// step. A scenario that finishes with no verdict is indistinguishable in the log
			// from one nobody ran, which is the whole reason the harness exists.
			if (active.at + 1 >= active.scenario.steps.length && !active.results.length) {
				return report("That is the last step — finish with /bot ok or /bot fail <note>, not next.");
			}
			active.at += 1;
			return void runStep();
		case "ok":
		case "fail": {
			if (!active) return report("Nothing running.");
			const ok = cmd.toLowerCase() === "ok";
			active.results.push({ step: active.at + 1, ok, note: arg });
			logLine(ok ? "PASS" : "FAIL", `step ${active.at + 1}: ${arg || "(no note)"}`);
			active.at += 1;
			return void runStep();
		}
		case "say":
			return say(arg);
		case "hidden":
			if (!arg) return report("!hidden <type> — e.g. !hidden session-wake");
			return hidden({ type: arg });
		case "join":
			joined = false;
			joinTries = 0;
			tryJoin();
			return;
		case "retry": {
			// session-continue reuses the choice already made — the subject decided their
			// stance for this encounter once, and re-prompting on every retry would be
			// nagging rather than consent. See the handler in session.ts.
			//
			// It reopens the RP window with a FRESH line count, so the bonus has to be earned
			// again: three attempts' effort does not accumulate. Which means a retry that only
			// sent the message would silently roll at +0 and look like the mechanic being
			// harsher than it is. So speak, then let the window run.
			// Only after a MISS. Sent mid-window it does nothing on the subject's side, and the
			// three RP lines below would go into the room as decoration — which is what
			// happened, and made a working induction look like a broken prompt.
			if (lastUpdate?.phase && lastUpdate.phase !== "AttemptFailed") {
				return report(
					`Not retrying — your client is in "${lastUpdate.phase}", and a retry only means something after an attempt has missed.` +
						(lastUpdate.phase === "InductionInProgress" ? " The window is still running; wait for it." : ""),
				);
			}
			hidden({ type: "session-continue" });
			report("Retrying. The RP window reopens with a fresh line count, so I will earn the bonus again — wait out the 60s, then /bot ok or /bot retry.");
			(async () => {
				await wait(1200);
				say("Missy, let it happen the way it was already happening.");
				await wait(1500);
				say("Missy, you have done the hard part, and there is nothing left to hold.");
				await wait(1500);
				say("Missy, further down, and easier every time.");
			})();
			return;
		}
		case "trance": {
			// e.g. `!trance 80 20` — the manual form of the same thing, for trying something
			// the scenarios do not cover without having to run one.
			const nums = (arg ?? "").trim().split(/\s+/).filter(Boolean).map(Number);
			const depth = Number.isFinite(nums[0]) ? nums[0] : 80;
			const earned = Number.isFinite(nums[1]) ? nums[1] : depth;
			trance(depth, earned);
			return report(`forcing a trance at ${depth}/${earned}`);
		}
		case "rooms": {
			// The direct test of whether we share an Environment with the subject: the server
			// only returns rooms from our own, so an empty list next to a room the subject is
			// standing in IS the mismatch, stated rather than inferred.
			logLine("net", "searching for visible rooms");
			socket.emit("ChatRoomSearch", { Query: "", Space: "", Game: "", FullRooms: true, Ignore: [] });
			return;
		}
		case "status":
			report(
				active
					? `"${active.scenario.name}" step ${active.at + 1}/${active.scenario.steps.length}`
					: "Idle. !tests to list scenarios.",
			);
			return report(`Last update from subject: ${lastUpdate ? JSON.stringify(lastUpdate) : "none yet"}`);
		case "abort":
			active = null;
			logLine("ABORT", "scenario aborted");
			return report("Stopped.");
		default:
			return report(`Unknown: !${cmd}. Try !tests.`);
	}
}

// Anything the server says that we do not explicitly handle still goes in the log.
//
// This exists because of how the first run failed: ChatRoomJoin was emitted, no response
// handler fired, and the log simply stopped — indistinguishable from a crash, a lost packet
// and a wrong event name. A harness whose whole purpose is diagnosing silent failures should
// not have one of its own. The noisy high-frequency events are dropped; everything else is
// worth seeing once.
const NOISY = new Set([
	"ChatRoomSync",
	"ChatRoomSyncMemberJoin",
	"ChatRoomSyncMemberLeave",
	"ServerInfo",
	"ChatRoomMessage",
	// Summarised below instead. Dumping these raw wrote ~4KB per sync — a whole appearance
	// including the crafting and wheel-of-fortune blobs — and the run-7 log could not be read
	// at all: the payload contains characters that break the line, so even a parser could not
	// recover the three fields that actually matter.
	"ChatRoomSyncSingle",
	"ChatRoomSyncCharacter",
	"ChatRoomSyncPose",
	"ChatRoomSyncArousal",
]);
socket.onAny((event, ...args) => {
	if (NOISY.has(event)) return;
	logLine("event", event, args.length === 1 ? args[0] : args);
});

socket.on("connect_error", (err) => logLine("ERROR", `connect_error: ${err?.message ?? err}`));
socket.on("disconnect", (why) => logLine("net", `disconnected: ${why}`));

logLine("boot", `starting — room "${roomName}", origin ${origin}`);
logLine("boot", `log: ${LOG_FILE}`);
