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
//   !tests            list the scenarios
//   !run <n>          run scenario n
//   !next             advance to the next step
//   !ok [note]        record the step as passing, and advance
//   !fail <note>      record the step as failing, and advance
//   !say <text>       make the bot say something arbitrary
//   !hidden <type>    send a raw protocol message, for poking at edge cases
//   !status           where we are
//   !join             (re)join the room, if the bot started before it existed
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
try {
	secrets = JSON.parse(fs.readFileSync(path.join(HERE, "secrets.json"), "utf-8"));
} catch {
	console.error("No secrets.json. Copy secrets.example.json to secrets.json and fill it in.");
	process.exit(1);
}
const { username, password, roomName = "Hypno testing", subjectName = "" } = secrets;

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
const socket = io(BC_SERVER, { transports: ["websocket"] });
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

socket.on("ChatRoomJoinResponse", (data) => {
	// BC answers "JoinedRoom" in most versions and a bare "ok" in some.
	if (data === "JoinedRoom" || data === "ok") {
		joined = true;
		logLine("net", `joined "${roomName}"`);
		return;
	}
	logLine("net", `join response: ${JSON.stringify(data)}`);
});

socket.on("ChatRoomSearchResponse", (data) => {
	if (joined) return;
	// The room does not exist right now. Make it on the first miss so the subject has
	// somewhere to walk into; after that just keep knocking, in case they made it first.
	if (data === "CannotFindRoom") {
		if (joinTries <= 1) createRoom();
		else setTimeout(tryJoin, 5000);
		return;
	}
	logLine("net", `search response: ${JSON.stringify(data)}`);
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

const SCENARIOS = [
	{
		name: "induction",
		blurb: "The basic loop: attempt, choose, roll.",
		steps: [
			{
				do: () => hidden({ type: "session-attempt", hypnotistName: "WinnersDice" }),
				look: "You should get the Agree / Ignore / Fight box. Choose AGREE. Then !next.",
			},
			{
				do: async () => {
					say("Missy, look at me and let your eyes go still.");
					await wait(1500);
					say("Missy, every breath takes you further down, and that is fine.");
					await wait(1500);
					say("Missy, there is nothing to hold on to and nothing you need to do.");
				},
				look: "Three RP lines = the full +15 bonus. Run `/hypno chance WinnersDice` — it should show `roleplay bonus +15`. Then wait for the window (60s) and !next.",
			},
			{
				do: () => {},
				look: "Did you go under? Run `/hypno effects` and `/hypno gates`. Report the tier with !ok <tier> or !fail <what happened>.",
			},
		],
	},
	{
		name: "depth-shallow",
		blurb: "A shallow trance must refuse the deep three.",
		steps: [
			{
				do: () => {},
				look: "First: `/hypno depth 30 30` (Yielding). Then !next.",
			},
			{
				do: () => {
					say("Missy, you cannot tell what you are wearing.");
				},
				look: "The illusion needs Deep. It should NOT apply. `/hypno effects` should show clothing illusion off. !next",
			},
			{
				do: () => {
					say("Missy, your trigger word is buttercup.");
				},
				look: "Planting needs Deep too. I should get a refusal naming the tier — I'll log it. !next",
			},
			{
				do: () => {
					say("Missy, you cannot move.");
				},
				look: "Movement only needs Yielding, so this SHOULD work. Confirm you cannot move, then !ok / !fail.",
			},
		],
	},
	{
		name: "depth-deep",
		blurb: "A Deep trance allows what a shallow one refused.",
		steps: [
			{ do: () => {}, look: "First: `/hypno depth 80 80` (Blank). Then !next." },
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				look: "The illusion should apply now. `/hypno effects` shows it on, with the frozen groups. !next",
			},
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot speak.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				look: "Planting should succeed — I'll log the trigger-status messages. `/hypno triggers` should list it. !ok / !fail",
			},
		],
	},
	{
		name: "depth-arousal",
		blurb: "THE important one: arousal cannot buy the earned three.",
		steps: [
			{
				do: () => {},
				look: "Set `/hypno depth 80 20` — deep, but only 20 of it earned. That is an aroused subject. Then !next.",
			},
			{
				do: () => say("Missy, you cannot move."),
				look: "A session feature reads the FULL depth, so this should still work. !next",
			},
			{
				do: () => say("Missy, you cannot tell what you are wearing."),
				look: "The illusion is earned-only. It must REFUSE. `/hypno effects` shows it off. !next",
			},
			{
				do: () => say("Missy, your trigger word is nightfall."),
				look: "Planting must refuse with 'arousal does not count'. I'll log it. !ok / !fail",
			},
		],
	},
	{
		name: "trigger-fires",
		blurb: "A trigger planted deep still fires later, with no trance at all.",
		steps: [
			{ do: () => {}, look: "Set `/hypno depth 80 80`, then !next to plant one." },
			{
				do: async () => {
					say("Missy, your trigger word is buttercup.");
					await wait(1200);
					say("Missy, you cannot move.");
					await wait(1200);
					say("Missy, remember trigger.");
				},
				look: "Should plant. Then !next.",
			},
			{
				do: () => hidden({ type: "session-wake" }),
				look: "You should wake. Run `/hypno depth 0 0` to be certain there is no depth left, then !next.",
			},
			{
				do: () => say("buttercup"),
				look: "THE TEST: the trigger should still fire with zero depth. If it does not, triggers are broken. !ok / !fail",
			},
		],
	},
	{
		name: "ooc",
		blurb: "Parenthesised text must do nothing at all.",
		steps: [
			{
				do: () => say("(Missy, you cannot move)"),
				look: "Entirely OOC — nothing should happen. No freeze, no message. !next",
			},
			{
				do: () => say("Missy, you cannot move (back in a sec)"),
				look: "The IC half should still land — you should be frozen. !ok / !fail",
			},
		],
	},
	{
		name: "undress",
		blurb: "Taking clothes off, one garment at a time.",
		steps: [
			{ do: () => {}, look: "Set `/hypno depth 60 60` (Entranced+) and tick Undressing. Then !next." },
			{ do: () => say("Missy, take something off."), look: "One garment, outermost first. The room should see an emote. !next" },
			{ do: () => say("Missy, take something off."), look: "The next garment down. !next" },
			{ do: () => say("Missy, take everything off."), look: "The rest — but NOT hats, glasses or jewellery. !ok / !fail" },
		],
	},
	{
		name: "hard-floor",
		blurb: "hypnoEnabled off must release everything.",
		steps: [
			{
				do: async () => {
					say("Missy, you cannot move.");
					await wait(1000);
					say("Missy, you cannot speak.");
					await wait(1000);
					say("Missy, you cannot tell what you are wearing.");
				},
				look: "Several things applied. Check `/hypno effects`, then !next.",
			},
			{
				do: () => {},
				look: "Now untick Hypnosis Enabled. EVERYTHING should come off — including the illusion and any denial. `/hypno effects` should say nothing is holding you. !ok / !fail",
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

function handleCommand(sender, text) {
	const [cmd, ...rest] = text.slice(1).split(/\s+/);
	const arg = rest.join(" ");
	logLine("CMD", text, { from: room.get(sender) ?? sender });

	switch (cmd.toLowerCase()) {
		case "tests":
			SCENARIOS.forEach((s, i) => report(`${i + 1}. ${s.name} — ${s.blurb}`));
			report("!run <n> to start. !ok / !fail <note> to record a step.");
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

logLine("boot", `starting — room "${roomName}", log ${LOG_FILE}`);
