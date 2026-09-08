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

socket.on("ChatRoomMessage", (data) => {
	if (data?.Type === "Hidden" && data?.Content === HIDDEN_TAG) {
		const message = data?.Dictionary?.[0]?.message;
		if (!message) return;
		logLine("RECV", `${message.type} from ${room.get(data.Sender) ?? data.Sender}`, message);
		if (message.type === "session-update") {
			lastUpdate = message;
			// The refusal reason is the single most useful field in the protocol: it is the
			// subject's client saying why it declined, in its own words.
			if (message.refusedReason) logLine("REFUSED", message.refusedReason);
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
	if (data?.Type === "Chat" && data?.Sender !== me && typeof data?.Content === "string") {
		const text = data.Content.trim();
		if (text.startsWith("!")) handleCommand(data.Sender, text);
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

const SCENARIOS = [
	{
		name: "induction",
		blurb: "The basic loop: attempt, choose, roll.",
		steps: [
			{
				do: () => hidden({ type: "session-attempt", hypnotistName: "WinnersDice" }),
				look: "You should get the Agree / Ignore / Fight box. Choose AGREE. Then /bot next.",
			},
			{
				do: async () => {
					say("Missy, look at me and let your eyes go still.");
					await wait(1500);
					say("Missy, every breath takes you further down, and that is fine.");
					await wait(1500);
					say("Missy, there is nothing to hold on to and nothing you need to do.");
				},
				look: "Three RP lines = the full +15 bonus. Run `/hypno chance WinnersDice` — it should show `roleplay bonus +15`. Then wait for the window (60s) and /bot next.",
			},
			{
				do: () => {},
				look: "Did you go under? Run `/hypno effects` and `/hypno gates`. Report the tier with /bot ok <tier> or /bot fail <what happened>.",
			},
		],
	},
	{
		name: "depth-shallow",
		blurb: "A shallow trance must refuse the deep three.",
		steps: [
			{
				do: () => trance(30, 30),
				look: "You should be under at Yielding, no roll. `/hypno effects` confirms it. Then /bot next.",
			},
			{
				do: () => {
					say("Missy, you cannot tell what you are wearing.");
				},
				look: "The illusion needs Deep. It should NOT apply. `/hypno effects` should show clothing illusion off. /bot next",
			},
			{
				do: () => {
					say("Missy, your trigger word is buttercup.");
				},
				look: "Planting needs Deep too. I should get a refusal naming the tier — I'll log it. /bot next",
			},
			{
				do: () => {
					say("Missy, you cannot move.");
				},
				look: "Movement only needs Yielding, so this SHOULD work. Confirm you cannot move, then /bot ok / /bot fail.",
			},
		],
	},
	{
		name: "depth-deep",
		blurb: "A Deep trance allows what a shallow one refused.",
		steps: [
			{ do: () => trance(80, 80), look: "Under at Blank, all of it earned. Then /bot next." },
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				look: "The illusion should apply now. `/hypno effects` shows it on, with the frozen groups. /bot next",
			},
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot speak.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				look: "Planting should succeed — I'll log the trigger-status messages. `/hypno triggers` should list it. /bot ok / /bot fail",
			},
		],
	},
	{
		name: "depth-arousal",
		blurb: "THE important one: arousal cannot buy the earned three.",
		steps: [
			{
				do: () => trance(80, 20),
				look: "Deep, but only 20 of it earned — an aroused subject rather than a deeply hypnotised one. Then /bot next.",
			},
			{
				do: () => say("Missy, you cannot move."),
				look: "A session feature reads the FULL depth, so this should still work. /bot next",
			},
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				look: "The illusion is earned-only. It must REFUSE. `/hypno effects` shows it off. /bot next",
			},
			{
				do: () => say("Missy, your trigger word is nightfall."),
				look: "Planting must refuse with 'arousal does not count'. I'll log it. /bot ok / /bot fail",
			},
		],
	},
	{
		name: "trigger-fires",
		blurb: "A trigger planted deep still fires later, with no trance at all.",
		steps: [
			{ do: () => trance(80, 80), look: "Under at Blank. /bot next to plant one." },
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot move.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				look: "Should plant. Then /bot next.",
			},
			{
				do: () => hidden({ type: "session-wake" }),
				look: "You should wake. `/hypno effects` should show no session and no depth. Then /bot next.",
			},
			{
				do: () => say("buttercup"),
				look: "THE TEST: the trigger should still fire with zero depth. If it does not, triggers are broken. /bot ok / /bot fail",
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
		// step's "you should be frozen" could not fail either. Both assertions were
		// unfalsifiable and the scenario passed on a state it had created itself.
		//
		// Releases have no such baseline: nothing about being in a trance un-freezes anybody.
		// So freeze her deliberately, then try to release it OOC. If she can move, OOC leaked
		// — and there is no other way for that to happen.
		steps: [
			{ do: () => trance(80, 80), look: "Under at Blank. Your own trance settings may freeze you here; the next step makes it certain either way. /bot next" },
			{
				do: () => say("Missy, you cannot move."),
				look: "Baseline: you should be frozen. Confirm you cannot move before going on. /bot next",
			},
			{
				do: () => say("(Missy, you can move again)"),
				look: "THE TEST: entirely OOC, so it must NOT release you. You should still be frozen. If you can move, OOC leaked. /bot next",
			},
			{
				do: () => say("Missy, you can move again (back in a sec)"),
				look: "The IC half of a mixed line still lands — you should be free now. /bot ok / /bot fail",
			},
		],
	},
	{
		name: "undress",
		blurb: "Taking clothes off, one garment at a time.",
		steps: [
			{ do: () => trance(60, 60), look: "Under at Entranced. Tick Undressing in the settings if it is not on. Then /bot next." },
			{ do: () => say("Missy, take something off."), look: "One garment, outermost first. The room should see an emote. /bot next" },
			{ do: () => say("Missy, take something off."), look: "The next garment down. /bot next" },
			{ do: () => say("Missy, take everything off."), look: "The rest — but NOT hats, glasses or jewellery. /bot ok / /bot fail" },
		],
	},
	{
		name: "hard-floor",
		blurb: "hypnoEnabled off must release everything.",
		steps: [
			{ do: () => trance(80, 80), look: "Under at Blank, so there is something to tear down. Then /bot next." },
			{
				do: async () => {
					say("Missy, you cannot move.");
					await wait(1000);
					say("Missy, you cannot speak.");
					await wait(1000);
					say("Missy, you cannot tell what you are wearing.");
				},
				look: "Several things applied. Check `/hypno effects`, then /bot next.",
			},
			{
				do: () => {},
				look: "Now untick Hypnosis Enabled. EVERYTHING should come off — including the illusion and any denial. `/hypno effects` should say nothing is holding you. /bot ok / /bot fail",
			},
		],
	},
];

// --- running them ---------------------------------------------------------------------
let active = null;

function report(text) {
	say(text);
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
	report(`[${active.at + 1}/${active.scenario.steps.length}] ${step.look}`);
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
const NOISY = new Set(["ChatRoomSync", "ChatRoomSyncMemberJoin", "ChatRoomSyncMemberLeave", "ServerInfo", "ChatRoomMessage"]);
socket.onAny((event, ...args) => {
	if (NOISY.has(event)) return;
	logLine("event", event, args.length === 1 ? args[0] : args);
});

socket.on("connect_error", (err) => logLine("ERROR", `connect_error: ${err?.message ?? err}`));
socket.on("disconnect", (why) => logLine("net", `disconnected: ${why}`));

logLine("boot", `starting — room "${roomName}", origin ${origin}`);
logLine("boot", `log: ${LOG_FILE}`);
