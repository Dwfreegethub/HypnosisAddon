import { log, isTestingMode, isDebugFlagOn, setDebugFlag, isDebugLogging } from "./log";
import { tellPlayer } from "./notify";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { describeMatch, isTriggerInEffect, describeTriggerList } from "./voice";
import { freezeAppearance, clearIllusion, isIllusionActive, describeIllusion } from "./illusion";
import { AROUSAL_LEVELS, ArousalLevel, arousalAvailable, setArousalLevel, forceOrgasm, setOrgasmDenied } from "./arousal";
import {
	addInteractions,
	setTrustValue,
	setExperienceValue,
	trustWith,
	describeStorage,
	listTriggers,
	forgetTrigger,
	forgetTrust,
	listTrustRaw,
	exportSettings,
	importSettings,
	resetSettings,
	getFeatures,
	setRelationshipOverride,
	listRelationshipOverrides,
	getDecayRate,
	getTriggerDecayRate,
	setTriggerDecayRate,
	setDecayRate,
	DECAY_RATES,
	DecayRate,
	RelationKind,
} from "./storage";
import { describeTrust, describeRelationship, relationshipWith, accessFor } from "./trust";
import { skillValue, skillCount, getSkillHonour, SKILL_HONOUR_RUNGS } from "./storage";
import { describeRecording, describeDecayPace, ageTriggers } from "./triggers";
import { describeCarry, releaseCarried } from "./carry";
import { sendHiddenMessage } from "./messaging";
import {
	answerPrompt,
	selfWake,
	safeword,
	describeSession,
	describeChances,
	forceTrance,
	currentHypnotistId,
	isHypnotized,
	requestInduction,
	getSessionView,
} from "./session";
import { describeCurrentState, describeSavedState } from "./recovery";
import { openHelpScreen, EXTENSION_BUTTON_TEXT, settingsLocked, IMPORT_LOCKED_MESSAGE } from "./menu";
import {
	DEPTH_GATES,
	tierOf,
	tierLabel,
	requiredTier,
	requiredDepth,
	depthAllows,
	setCurrentDepths,
	currentDepth,
	currentDepthEarned,
	arousalCounts,
} from "./depth";

let suppressNextAction = false;

export function consumeSuppressFlag(): boolean {
	if (!suppressNextAction) return false;
	suppressNextAction = false;
	return true;
}

function findCharacter(memberId: number): any {
	return (
		typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []
	).find((c: any) => c?.MemberNumber === memberId);
}

// --- Target resolution ---------------------------------------------------------------
// Commands take a name OR a member number, and ask when they get neither. Typing
// "/hypno chance Missy" beats looking up a six-digit number, and the number stays valid
// for anyone not currently in the room.

interface Target {
	id: number;
	name: string;
}

/** Everyone in the room except us. */
function others(): any[] {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).filter(
		(c: any) => c?.MemberNumber && c.MemberNumber !== Player?.MemberNumber,
	);
}

/** Resolve a name or member number. Names match Name or Nickname, case-insensitively,
 * exact first and then unique prefix — so "Mis" works but an ambiguous prefix doesn't
 * silently pick one. Returns null for anything unresolvable; the caller reports why. */
function resolveTarget(token: string): Target | null {
	const t = (token ?? "").trim();
	if (!t) return null;
	if (/^\d+$/.test(t)) {
		const id = Number(t);
		return { id, name: findCharacter(id)?.Name ?? `#${id}` };
	}
	const lower = t.toLowerCase();
	const names = (c: any) => [c?.Name, c?.Nickname].filter(Boolean).map((n: string) => n.toLowerCase());
	const pool = others();
	const exact = pool.filter((c) => names(c).includes(lower));
	const matches = exact.length ? exact : pool.filter((c) => names(c).some((n: string) => n.startsWith(lower)));
	if (matches.length !== 1) return null;
	return { id: matches[0].MemberNumber, name: matches[0].Name };
}

/** Who `/hypno retry` means. Set by every induction started from a command, so a retry does
 * not need the name typed again — which is the whole point of having it. Module-level and
 * not persisted: it is a convenience for the next thirty seconds, not state. */
let lastInduced: Target | null = null;

/** Send an induction and say that one went out.
 *
 * `requestInduction` picks attempt-or-continue from our known view of them, so the command
 * and the remote's button cannot disagree about which message this is.
 *
 * The confirmation is not decoration. A request is one-way — the subject's client decides
 * privately and may refuse without telling us why — so without a line here, typing the
 * command and typing it wrong look identical. Rule 5. What comes back, if anything, arrives
 * later through the usual session-update path. */
function startInduction(target: Target): void {
	lastInduced = target;
	const view = getSessionView(target.id);
	requestInduction(target.id);
	reply(
		view?.phase === "AttemptFailed"
			? `Trying ${target.name} again.`
			: `Attempting an induction on ${target.name}.`,
	);
	reply("They decide how to respond, on their own client. Watch for what happens next.");
}

/** Work out who a command means, asking when it can't tell.
 *
 * With no argument and exactly one other person present, that's who you meant — which is
 * the normal case while testing with two accounts, and saves typing a number to state the
 * obvious. Otherwise it lists who's here rather than just repeating the usage line, since
 * "who?" is more useful when it also answers "who's available?". */
function targetOrAsk(token: string, usage: string): Target | null {
	const resolved = resolveTarget(token);
	if (resolved) return resolved;

	const pool = others();
	if (!token.trim() && pool.length === 1) {
		return { id: pool[0].MemberNumber, name: pool[0].Name };
	}
	reply(token.trim() ? `No one here matches "${token.trim()}".` : "Who? Give a name or member number.");
	reply(usage);
	if (!pool.length) reply("Nobody else is in the room — you'll need a member number.");
	else reply(`In the room: ${pool.map((c) => `${c.Name} (${c.MemberNumber})`).join(", ")}`);
	return null;
}

function firstWord(args: string): string {
	return (args ?? "").trim().split(/\s+/)[0] ?? "";
}

// Visible in-game feedback, not just console.log — command/response testing is only
// useful if the response is actually visible without needing DevTools open. Same
// function BC's own command system uses for its "no such command" message.
function reply(message: string): void {
	log(message);
	// No timeout arg — ChatRoomSendLocal only auto-removes when Timeout is a positive
	// number (confirmed in ChatRoom.js), so omitting it keeps this in the log permanently.
	tellPlayer(message);
}

/** One subcommand. `group` is ours, for the generated summary; everything else is BC's
* own ICommand shape and gets passed through untouched. */
interface HypnoCommand {
	Tag: string;
	/** Shown both in BC's native command help and in our `/hypno` summary. BC renders this
	* verbatim for externally-added commands (CommandsHelp._GetDescription checks
	* `command.Description` before its own translation cache), so it needs no CSV entry. */
	Description: string;
	group: "Session" | "Diagnostics" | "Data" | "Testing";
	/** Argument hint, e.g. "[name|number] <0-100>". Shown in the summary and prepended to
	 * the description, so a glance at `/hypno` tells you which commands take something —
	 * a bare list of names doesn't, which is what made `chance` look like it took nothing. */
	args?: string;
	Action: (args: string) => void;
}

// Registered via BC's own command registry (Screens/Online/ChatRoom/Commands.js),
// not by hooking CommandParse — that runs BEFORE registry lookup and would still hit
// BC's "no such command" path for anything we didn't recognize ourselves, fighting the
// game's own validation instead of using the extension point it already provides.
/** Every tag the main command answers to. `hypno` is first because it is the one the guide,
 * the wiki and every help line name; `echs` is the add-on's own name, registered so someone
 * who reaches for it is not met with BC's "no such command". */
const COMMAND_TAGS = ["hypno", "echs"] as const;

// Where the full guide lives if the on-screen jump can't run — the manual path is the
// fallback for `/hypno help`, and the tail of the bare `/hypno` menu. Built from menu.ts's
// own label rather than repeating it, so the two cannot name different entries.
const GUIDE_LOCATION = `Preferences > Extensions > ${EXTENSION_BUTTON_TEXT} — the ? button (or the Help button in the remote panel).`;

/** The bare `/hypno` menu: a short, friendly signpost rather than a wall of commands.
 * Points at the two ways to go deeper — the on-screen guide and the full typed list —
 * so the dense command dump moved to `/hypno commands` for anyone who wants it. */
function menuLines(): string[] {
	return [
		"Erotic Chat Hypnosis Suite (ECHS) — most of this works by SPEAKING to someone in a session, not by typing.",
		"  /hypno help — open the full on-screen guide: what to say, trust, depth, triggers",
		"  /hypno commands — list every typed command",
		"  /hypno match <phrase> — check what a phrase would do, and why nothing happened",
		"  /hypno safeword — hard stop; clears everything, always works",
		"  (/echs is the same command as /hypno — either works, anywhere.)",
	];
}

/** `/hypno commands`: the typed commands, one readable line per group instead of the old
 * single pipe-delimited dump. GENERATED from COMMANDS so it can't drift, and the Testing
 * group is listed only inside the Hypno Testing room — the same gate the commands obey. */
function commandListLines(): string[] {
	const ORDER: HypnoCommand["group"][] = ["Session", "Diagnostics", "Data", "Testing"];
	const NOTE: Record<HypnoCommand["group"], string> = {
		Session: "safeword never fails",
		Diagnostics: "look, change nothing",
		Data: "your settings & stats",
		Testing: "Hypno Testing room only",
	};
	const lines: string[] = ["Typed commands — most features are SPOKEN, not typed:"];
	for (const group of ORDER) {
		// Same room gate the commands themselves use: don't even name the Testing group elsewhere.
		if (group === "Testing" && !isTestingMode()) continue;
		const inGroup = COMMANDS.filter((c) => c.group === group);
		if (!inGroup.length) continue;
		const tags = inGroup.map((c) => (c.args ? `${c.Tag} ${c.args}` : c.Tag)).join(", ");
		lines.push(`${group} (${NOTE[group]}): ${tags}`);
	}
	lines.push("Full illustrated guide: /hypno help · what a phrase does and why not: /hypno match <phrase>");
	return lines;
}

export function installCommands(): void {
	// Two meta-commands sit ahead of the feature list: `help` jumps into the on-screen guide,
	// `commands` prints the full typed list. They are NOT in COMMANDS — the guide and the
	// command list document the features, and would only point back at themselves.
	const metaCommands = [
		{
			Tag: "help",
			Description: "Open the full on-screen guide",
			Action: () => {
				openHelpScreen()
					.then((ok) => {
						// A silent success is fine here — the screen visibly changes. Only a failure
						// needs words, and it gets the manual path rather than nothing (design rule 5).
						if (!ok) reply(`Couldn't open the guide from here. It's under ${GUIDE_LOCATION}`);
					})
					.catch(() => reply(`Couldn't open the guide from here. It's under ${GUIDE_LOCATION}`));
			},
		},
		{
			Tag: "commands",
			Description: "List every typed command",
			Action: () => {
				for (const line of commandListLines()) reply(line);
			},
		},
	];

	// ONE definition, registered under two tags. `/hypno` is what every wiki page, help line
	// and everyone's habit already says, so it keeps working untouched; `/echs` matches the
	// add-on's name for anyone who reaches for that instead.
	//
	// A factory rather than one object registered twice: BC keeps whatever it is handed in
	// its own Commands array, so two entries sharing one object would let anything BC ever
	// sets on one of them show up on the other. metaCommands is shallow-copied per call for
	// the same reason — spreading the array reuses the objects inside it.
	const hypnoCommand = (Tag: string) => ({
		Tag,
		Description:
			"Erotic Chat Hypnosis Suite — session control, diagnostics and test commands",
		Action: () => {
			for (const line of menuLines()) reply(line);
		},
		// Fold the argument hint into the Description BC renders, so its own help screen
		// shows it too rather than only our summary line.
		//
		// Every Testing-group command is gated to the testing room HERE, at the one place they
		// are all registered — so the gate covers the whole group at once, including the ones
		// (settrust, relate, …) that never carried their own runtime check and any added later,
		// rather than depending on each Action to remember to check. The help screen already
		// hides the group outside the room; this is what actually stops them running.
		Subcommands: [
			...metaCommands.map((c) => ({ ...c })),
			...COMMANDS.map(({ group, args, Description, ...cmd }) => ({
				...cmd,
				Description: args ? `${args} — ${Description}` : Description,
				Action:
					group === "Testing"
						? (a: string) => {
								if (!isTestingMode()) {
									reply("Not available — join the Hypno Testing room to use this test command.");
									return;
								}
								cmd.Action(a);
							}
						: cmd.Action,
			})),
		],
	});

	// Our two tags and NOTHING else. CommandCombine REPLACES any command with the same tag
	// (R132 Commands.js filters the old one out), so a top-level tag we register is taken from
	// BC or from another add-on, for every player who has ECHS installed. See the note on
	// sendToBot below for the one time that happened.
	for (const tag of COMMAND_TAGS) CommandCombine(hypnoCommand(tag));
}

/** Drive the test bot from a slash command, because chat is not always available.
 *
 * The whole point: a silenced subject cannot type `!next`. ChatRoomSendChatMessage — where
 * the speech block lives — runs AFTER command parsing, so a slash command still gets through
 * when ordinary speech does not. That asymmetry is deliberate (it is what keeps
 * `/hypno safeword` reachable) and this rides on it.
 *
 * ONLY as `/hypno bot` (and `/echs bot`) since v0.86.1. ECHS used to register a top-level
 * `/bot` too, on the belief that BC had none. It does — CommandsDefault.js, R132: it sends
 * "ChatRoomBot <text>" as a hidden message to everyone else in the room, which is how players
 * talk to room bots — and CommandCombine replaces a command with the same tag. So every player
 * with ECHS installed lost BC's `/bot`, and outside the testing room ours answered "join the
 * Hypno Testing room" (Bella, #223446 and #254192, on 0.84.1). An add-on must not take a name
 * it does not own.
 *
 * `/bot next` still works for testing, through BC's own command: testbot/bot.mjs reads the
 * "ChatRoomBot" hidden message as well as ours.
 *
 * `!` in chat keeps working. Two ways in, and the one that survives a gag is the point. */
/** Hand one line to the test bot, for `/hypno bot`.
 *
 * IT SAYS WHAT IT DID, and that is the point of this version. The first one sent the message
 * and returned in silence, so "the command never ran" and "the command ran and the bot did not
 * hear it" looked exactly alike from DW's chair — and an evening went on `/bot run 1` being
 * ignored with no way to tell which. That is the same defect as the console-only suggestion
 * refusals and the dropped emotes: a silent success is indistinguishable from a silent
 * failure, so it is not a success worth having. */
function sendToBot(args: string): void {
	if (!isTestingMode()) {
		reply("Not available — join the Hypno Testing room to use the test bot.");
		return;
	}
	const text = (args ?? "").trim();
	if (!text) {
		reply("Usage: /hypno bot <command> — e.g. /hypno bot next, /hypno bot run 2, /hypno bot ok.");
		reply("Goes over the hidden channel, so it works while you cannot speak. BC's own /bot reaches the test bot too.");
		return;
	}
	// The hypnotist first: mid-trance they are by definition the bot, and being unable to say
	// who you meant is the exact situation this command exists for.
	const hypnotist = currentHypnotistId();
	const target = hypnotist ?? (others().length === 1 ? others()[0].MemberNumber : null);
	if (target == null) {
		reply(
			others().length
				? `Not in a session, and more than one person is here: ${others().map((c: any) => `${c.Name} (${c.MemberNumber})`).join(", ")}.`
				: "Nobody else is in the room to send it to.",
		);
		return;
	}
	sendHiddenMessage({ type: "test-command", text }, target);
	const name = findCharacter(target)?.Name ?? `#${target}`;
	// Naming the target matters as much as confirming the send: if it went to the wrong person
	// — a second bot instance, someone else in the room — that is invisible otherwise.
	reply(`Sent "${text}" to ${name} (${target})${hypnotist ? " — your hypnotist" : ""}.`);
	log(`/hypno bot -> ${target}: ${text}`);
}

/** The command list as the help screen sees it. Same list BC's own help and the bare
 * `/hypno` summary are built from, so none of the three can fall behind the others. */
export function commandHelp(): { group: string; tag: string; args: string; description: string }[] {
	return COMMANDS.map((c) => ({
		group: c.group,
		tag: c.Tag,
		args: c.args ?? "",
		description: c.Description,
	}));
}

const COMMANDS: HypnoCommand[] = [
	// --- Session flow. These stay usable in any state; safeword especially must
	// never be conditional on anything (design doc's hard floor). ---
	{
		Tag: "agree",
		group: "Session",
		Description: "Accept a hypnosis attempt — cooperative, improves their roll",
		Action: () => answerPrompt("agree"),
	},
	{
		Tag: "ignore",
		group: "Session",
		Description: "Neither help nor resist a hypnosis attempt",
		Action: () => answerPrompt("ignore"),
	},
	{
		Tag: "fight",
		group: "Session",
		Description: "Resist a hypnosis attempt — lowers their roll",
		Action: () => answerPrompt("fight"),
	},
	{
		Tag: "wake",
		group: "Session",
		Description: "Wake yourself, if the trance is shallow enough",
		Action: () => selfWake(),
	},
	{
		Tag: "safeword",
		group: "Session",
		Description: "Hard stop: clears the trance and every effect. Always works.",
		Action: () => safeword(),
	},
	{
		// The one to reach for after a reconnect, or any time the question is "why can I not
		// do that". `session` answers what PHASE you are in and what you have permitted;
		// this answers what is actually on you, which is a different question and was the
		// one with no command behind it.
		Tag: "effects",
		group: "Session",
		Description: "Show everything currently affecting you, and what would survive a reconnect",
		Action: () => {
			for (const line of describeCurrentState()) reply(line);
			const held = listTriggers().filter(isTriggerInEffect);
			reply(
				held.length
					? `triggers holding you: ${held.map((t) => `"${t.actions.join(", ")}" (by ${t.installedByName})`).join("; ")}`
					: "no trigger is holding you",
			);
			reply(describeCarry());
			reply(describeSavedState());
			reply("Out of any of it: /hypno safeword.");
		},
	},
	{
		Tag: "session",
		group: "Session",
		Description: "Show your session state and which permissions are granted",
		Action: () => reply(describeSession()),
	},
	{
		// Bypasses matching, permissions and the session entirely — calls BC's pose
		// API directly. If this works but saying "kneel" doesn't, the problem is in
		// our gating; if this fails too, it's the pose API itself.
		Tag: "kneel",
		group: "Diagnostics",
		Description: "Kneel directly, bypassing matching, permissions and session",
		Action: () => {
			setSuggestedPose("Kneel");
			reply(
				`pose set directly. ActivePose=${JSON.stringify(Player?.ActivePose)} ` +
					`PoseMapping.BodyLower=${Player?.PoseMapping?.BodyLower} IsKneeling=${Player?.IsKneeling?.()}`,
			);
		},
	},
	{
		Tag: "stand",
		group: "Diagnostics",
		Description: "Stand directly, bypassing matching, permissions and session",
		Action: () => {
			setSuggestedPose(null);
			reply(
				`pose reset directly. ActivePose=${JSON.stringify(Player?.ActivePose)} ` +
					`PoseMapping.BodyLower=${Player?.PoseMapping?.BodyLower} IsKneeling=${Player?.IsKneeling?.()}`,
			);
		},
	},
	{
		// Reports what the parser makes of a phrase without needing a live session,
		// so a line that "does nothing" can be pinned on matching vs. permissions.
		Tag: "match",
		group: "Diagnostics",
		args: "<phrase>",
		Description: "Report what a spoken phrase would trigger, and why not",
		Action: (args: string) => {
			if (!args.trim()) {
				reply("usage: /hypno match <phrase to test>");
				return;
			}
			reply(`"${args.trim()}" → ${describeMatch(args)}`);
		},
	},
	{
		// Jumps straight to a trust level without playing to it. Back-solves the
		// interaction count that produces the value, since counts are what's stored.
		Tag: "settrust",
		group: "Testing",
		args: "[name|number] <0-100>",
		Description: "Jump trust to a value without playing to it",
		Action: (args: string) => {
			const usage = "usage: /hypno settrust [name or member number] <0-100>";
			// One argument means the value, with the target inferred — the common case
			// when there's only one other person around. Two means target then value.
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const [token, rawValue] = parts.length >= 2 ? parts : ["", parts[0]];
			const value = Number(rawValue);
			if (!Number.isFinite(value)) {
				reply(usage);
				return;
			}
			const target = targetOrAsk(token, usage);
			if (!target) return;
			const entry = setTrustValue(target.id, target.name, value);
			reply(
				`trust with ${entry.memberName} → ${trustWith(target.id).toFixed(1)} ` +
					`(${entry.interactions.toFixed(1)} interactions)`,
			);
		},
	},
	{
		// BC relationships need an actual owner or lover to test against, which is not
		// something you can arrange on demand. This pretends, per member number, so the
		// floors and the category rules can be exercised with one alt.
		Tag: "relate",
		group: "Testing",
		args: "[name|number] <none|friend|lover|owner|clear>",
		Description: "Pretend a BC relationship with someone, to test the trust floors",
		Action: (args: string) => {
			const usage = "usage: /hypno relate [name or member number] <none|friend|lover|owner|clear>";
			const parts = args.trim().split(/\s+/).filter(Boolean);
			if (!parts.length) {
				const all = listRelationshipOverrides();
				reply(all.length ? "test overrides:" : "no relationship overrides set");
				all.forEach((o) => reply(`  ${findCharacter(o.memberId)?.Name ?? o.memberId} → ${o.kind}`));
				reply(usage);
				return;
			}
			const [token, rawKind] = parts.length >= 2 ? parts : ["", parts[0]];
			const kind = rawKind.toLowerCase();
			if (!["none", "friend", "lover", "owner", "clear"].includes(kind)) {
				reply(usage);
				return;
			}
			const target = targetOrAsk(token, usage);
			if (!target) return;
			// "clear" drops the pretence so BC's real answer shows through again; "none"
			// actively pretends there is no relationship, which is different and is how you
			// test that a real owner can be masked.
			setRelationshipOverride(target.id, kind === "clear" ? null : (kind as RelationKind));
			reply(`${target.name}: ${describeRelationship(target.id)}`);
			reply(
				`  access — session ${accessFor(target.id, "session").toFixed(1)}, ` +
					`arousal ${accessFor(target.id, "arousal").toFixed(1)}, ` +
					`deceptive ${accessFor(target.id, "deceptive").toFixed(1)}, ` +
					`persistent ${accessFor(target.id, "persistent").toFixed(1)}`,
			);
		},
	},
	{
		Tag: "decay",
		group: "Testing",
		args: "[never|veryslow|slow|typical|fast|veryfast]",
		Description: "Read or set how fast trust fades without contact",
		Action: (args: string) => {
			const token = firstWord(args).toLowerCase();
			if (!token) {
				reply(`trust decay: ${getDecayRate()} — ${DECAY_RATES.map((r) => r.key).join(", ")}`);
				return;
			}
			if (!DECAY_RATES.some((r) => r.key === token)) {
				reply(`usage: /hypno decay <${DECAY_RATES.map((r) => r.key).join("|")}>`);
				return;
			}
			setDecayRate(token as DecayRate);
			reply(`trust decay set to ${token}`);
		},
	},
	{
		Tag: "setexp",
		group: "Testing",
		args: "<0-100>",
		Description: "Jump subject experience to a value",
		Action: (args: string) => {
			const value = Number(firstWord(args));
			if (!Number.isFinite(value)) {
				reply("usage: /hypno setexp <0-100>");
				return;
			}
			reply(`experience → ${setExperienceValue(value).toFixed(1)}`);
		},
	},
	{
		Tag: "export",
		group: "Data",
		Description: "Print your settings as a blob you can copy and keep",
		Action: () => {
			reply("Copy the line below. /hypno import <blob> restores it.");
			reply(exportSettings());
		},
	},
	{
		Tag: "import",
		group: "Data",
		args: "<blob>",
		Description: "Replace all settings with a previously exported blob",
		Action: (args: string) => {
			// The same lock as the Data tab's Import button. Without it this is the way round the
			// lock, and the button's own clipboard-failure line points straight at it.
			if (settingsLocked()) {
				reply(IMPORT_LOCKED_MESSAGE);
				return;
			}
			const result = importSettings(args);
			reply(result.ok ? `Imported: ${result.message}` : `Import failed: ${result.message}`);
		},
	},
	{
		// Two-step on purpose: this throws away every stat and toggle, and a single
		// mistyped command shouldn't be able to do that.
		Tag: "reset",
		group: "Data",
		Description: "Wipe all settings and stats back to defaults (asks first)",
		Action: (args: string) => {
			if (firstWord(args).toLowerCase() !== "confirm") {
				// Told before anything happens, never blocked. The existing two-step IS the
				// accidental-use protection, so reset does not additionally refuse while under
				// — see design.md, Known Bug #4, for why refuse-and-instruct was rejected.
				if (isHypnotized()) {
					reply(
						"This erases all trust, experience and settings. You are also in a trance right now — " +
							"resetting will end it and release everything first. Run: /hypno reset confirm",
					);
					reply("(If you only want out of the trance, /hypno safeword does that and keeps your settings.)");
					return;
				}
				reply("This erases all trust, experience and settings. Run: /hypno reset confirm");
				return;
			}
			reply(resetSettings());
		},
	},
	{
		// The dropdown on the Triggers tab does the same thing. This exists because a setting
		// you can only reach by opening a screen is a setting that cannot be scripted, and the
		// test bot drives everything else by command.
		Tag: "triggerdecay",
		group: "Data",
		args: "[rate]",
		Description: "How fast planted triggers fade without reinforcement (separate from trust decay)",
		Action: (args: string) => {
			const token = firstWord(args).toLowerCase();
			if (!token) {
				reply(`Triggers fade: ${DECAY_RATES.find((r) => r.key === getTriggerDecayRate())?.label ?? "Never"} — ${describeDecayPace()}.`);
				reply(`Options: ${DECAY_RATES.map((r) => r.key).join(", ")}.`);
				return;
			}
			const rate = DECAY_RATES.find((r) => r.key === token);
			if (!rate) {
				reply(`No such rate "${token}". Options: ${DECAY_RATES.map((r) => r.key).join(", ")}.`);
				return;
			}
			setTriggerDecayRate(rate.key);
			reply(`Planted triggers now fade: ${rate.label} — ${describeDecayPace(rate.key)}.`);
			reply(
				"Deeper plantings fade more slowly, and neglect compounds: the longer one goes " +
					"unused the faster it sheds. Firing it slows that; only a re-induction resets it.",
			);
		},
	},
	{
		Tag: "triggers",
		group: "Diagnostics",
		// `full` is advertised only where it works. A getter, not a fixed value, because testing
		// mode is now a runtime room check: read afresh each time the help is drawn, the hint
		// appears in the testing room and is gone outside it, so the screen never documents an
		// argument that would ignore you.
		get args() {
			return isTestingMode() ? "[full]" : "";
		},
		Description: "List the triggers planted in you, and which are currently holding you",
		Action: (args: string) => {
			const all = listTriggers();
			if (!all.length) {
				reply("no triggers planted");
				return;
			}
			// Whether the phrases show is decided in voice.ts — the player's own "Show
			// trigger words" setting, or `full` while we are still the only ones running
			// this. You always see that a trigger exists, who planted it and what it does,
			// so nothing is ever happening to you unseen; only the word itself is optional.
			describeTriggerList(isTestingMode() && firstWord(args).toLowerCase() === "full").forEach(reply);
			reply(
				"Remove one with /hypno forgettrigger <number>, or all of them with 'all' — " +
					"but not while it is holding you. /hypno safeword is the way out of that.",
			);
		},
	},
	{
		Tag: "forgettrigger",
		group: "Data",
		args: "<number|all>",
		Description: "Remove a planted trigger by its number from /hypno triggers, or all",
		Action: (args: string) => {
			const token = args.trim().toLowerCase();
			if (!token) {
				reply("usage: /hypno forgettrigger <number|all>  (see /hypno triggers)");
				return;
			}
			// Always available, never gated: the subject can always take back something
			// planted in them, the same principle as the safeword. By INDEX rather than
			// phrase, since the phrase is hidden from them — hiding it must not also take
			// away the ability to remove it.
			//
			// EXCEPT while it has hold of you. Deleting the thing that is currently gripping
			// you would be too quiet an escape — it undermines the trigger being something
			// that happens to you, and it lets a subject no-op their way out of a scene
			// rather than saying so. The safeword exists for that and is meant to be said
			// out loud, so this refuses and points at it.
			const all = listTriggers();
			if (token === "all") {
				const held = all.filter(isTriggerInEffect);
				const free = all.filter((t) => !isTriggerInEffect(t));
				free.forEach((t) => forgetTrigger(t.key));
				reply(
					held.length
						? `forgot ${free.length} trigger(s). ${held.length} still holding you — ` +
								`/hypno safeword clears everything and always works.`
						: `forgot ${free.length} trigger(s)`,
				);
				return;
			}
			const index = Number(token);
			if (!Number.isInteger(index) || index < 1 || index > all.length) {
				reply(`no trigger ${token} — you have ${all.length}. See /hypno triggers.`);
				return;
			}
			if (isTriggerInEffect(all[index - 1])) {
				reply(
					`Trigger ${index} is holding you right now, so it can't be deleted. ` +
						`Wait for it to wear off, have whoever set it release you, or use /hypno safeword — ` +
						`that always works, from any state.`,
				);
				return;
			}
			const gone = forgetTrigger(all[index - 1].key);
			reply(gone ? `forgot trigger ${index}` : "nothing removed");
		},
	},
	{
		Tag: "storage",
		group: "Diagnostics",
		Description: "Where settings loaded from, and what each source holds",
		Action: () => describeStorage().forEach(reply),
	},
	{
		// Browser-console diagnostics, off by default so other mod developers' devtools stay
		// clear. Not a Testing command: a player may be asked to turn it on to send a report.
		Tag: "debug",
		group: "Diagnostics",
		args: "[on|off]",
		Description: "Switch the add-on's routine console lines on or off (this browser only)",
		Action: (args: string) => {
			const word = firstWord(args).toLowerCase();
			if (word && word !== "on" && word !== "off") {
				reply("usage: /hypno debug [on|off] — with nothing, it switches to the other setting.");
				return;
			}
			const on = word ? word === "on" : !isDebugFlagOn();
			const saved = setDebugFlag(on);
			reply(`Console debug lines are now ${on ? "ON" : "OFF"} for this browser.${saved ? "" : " (Couldn't save that — it lasts until you reload.)"}`);
			if (on) reply("They are filed under the console's Verbose (Chrome) or Debug (Firefox) level — switch that on to see them.");
			else if (isDebugLogging()) reply("They stay on while you're in the Hypno Testing room.");
		},
	},
	{
		// YOUR OWN number, never anyone else's — the only skill value a command will print, by
		// the same rule that keeps trust and experience to a sought-out screen (§5a). What the
		// far side then honours is their setting and is deliberately invisible to you.
		Tag: "skill",
		group: "Diagnostics",
		Description: "Show your own hypnotist skill, and how it is read",
		Action: () => {
			const v = skillValue();
			reply(`Your skill reads ${v.toFixed(1)}/100, from ${skillCount().toFixed(2)} of practice (every attempt counts, a success counts more).`);
			reply("It travels with each induction you attempt. How much of it lands is the other person's setting — you are never told.");
			reply(`Your own honour of others' skill is set to: ${SKILL_HONOUR_RUNGS.find((r) => r.key === getSkillHonour())?.label ?? "Only from people I trust"}.`);
		},
	},
	{
		Tag: "induce",
		group: "Session",
		args: "[name|number]",
		Description: "Attempt an induction on someone, the same as the remote's button",
		Action: (args: string) => {
			const target = targetOrAsk(firstWord(args), "usage: /hypno induce [name or member number]");
			if (!target) return;
			startInduction(target);
		},
	},
	{
		Tag: "retry",
		group: "Session",
		Description: "Try again on the last person you attempted",
		Action: () => {
			if (!lastInduced) {
				reply("You haven't attempted anyone yet this session — use /hypno induce [name].");
				return;
			}
			// Resolved fresh rather than trusting the stored name: they may have left, and
			// "retrying" at someone who is gone should say so rather than sending into the void.
			const still = others().some((c: any) => c?.MemberNumber === lastInduced!.id);
			if (!still) {
				reply(`${lastInduced.name} isn't in the room any more.`);
				return;
			}
			startInduction(lastInduced);
		},
	},
	{
		Tag: "chance",
		group: "Diagnostics",
		args: "[name|number]",
		Description: "Show the induction chance for each choice against someone",
		Action: (args: string) => {
			const target = targetOrAsk(firstWord(args), "usage: /hypno chance [name or member number]");
			if (target) describeChances(target.id).forEach(reply);
		},
	},
	{
		Tag: "freeze",
		group: "Testing",
		Description: "Apply the Freeze effect to yourself",
		Action: () =>
			reply(
				applyEffect("Freeze")
					? "Freeze applied"
					: "Freeze failed — no Emoticon item found",
			),
	},
	{
		Tag: "unfreeze",
		group: "Testing",
		Description: "Remove the Freeze effect from yourself",
		Action: () =>
			reply(
				removeEffect("Freeze") ? "Freeze removed" : "Freeze wasn't applied",
			),
	},
	{
		// Same job as /hypno kneel: exercise the arousal API with no matching, permission
		// or session in the way, so "saying it did nothing" can be pinned on the gates
		// rather than on BC's arousal system.
		Tag: "arousal",
		group: "Testing",
		args: "<none|light|high|full|orgasm|deny|allow>",
		Description: "Drive arousal directly, bypassing matching, permissions and session",
		Action: (args: string) => {
			const what = firstWord(args).toLowerCase();
			if (!arousalAvailable()) {
				reply(
					"arousal is switched off for this character — set Preferences > Arousal to " +
						"something other than Inactive",
				);
				return;
			}
			if (what === "orgasm") {
				reply(`forced orgasm: ${forceOrgasm()}`);
				return;
			}
			if (what === "deny" || what === "allow") {
				setOrgasmDenied(what === "deny");
				reply(`orgasm denial ${what === "deny" ? "applied" : "released"} (DenialMode effect)`);
				return;
			}
			if (!(what in AROUSAL_LEVELS)) {
				reply(`usage: /hypno arousal ${Object.keys(AROUSAL_LEVELS).join("|")}|orgasm|deny|allow`);
				return;
			}
			setArousalLevel(what as ArousalLevel);
			reply(
				`arousal set to ${what} (${AROUSAL_LEVELS[what as ArousalLevel]}). ` +
					`Progress=${Player?.ArousalSettings?.Progress} Active=${Player?.ArousalSettings?.Active}`,
			);
		},
	},
	{
		Tag: "carry",
		group: "Diagnostics",
		args: "[drop]",
		Description: "Show what is set to outlive the trance, or drop it",
		Action: (args: string) => {
			if (firstWord(args).toLowerCase() === "drop") {
				reply(releaseCarried("dropped by command") ? "carried suggestions released" : "nothing was carried");
				return;
			}
			reply(describeCarry());
		},
	},
	{
		// Bypasses matching, permissions, trust and session, like /hypno kneel. Also the
		// quickest way to confirm the draw hook is alive at all.
		Tag: "illusion",
		group: "Testing",
		args: "<on|off>",
		Description: "Freeze/release your own view of your clothes, bypassing all gates",
		Action: (args: string) => {
			// Bare form REPORTS rather than toggling. A toggle you have to run to inspect is
			// useless for checking state mid-test — you can never tell whether what you're
			// reading is what was there or what you just did.
			const word = firstWord(args).toLowerCase();
			if (word === "on") freezeAppearance();
			else if (word === "off") clearIllusion();
			reply(describeIllusion());
		},
	},
	{
		Tag: "suppress",
		group: "Testing",
		Description: "Arm a one-shot swallow of the next incoming Action message",
		Action: () => {
			suppressNextAction = true;
			reply(
				"armed: next incoming Action-type message will be logged and suppressed",
			);
		},
	},
	{
		Tag: "wardrobeblock",
		group: "Testing",
		args: "<on|off>",
		Description: "Toggle the BlockWardrobe effect on yourself",
		Action: (args: string) => {
			const on = firstWord(args).toLowerCase() !== "off";
			const ok = on
				? applyEffect("BlockWardrobe")
				: removeEffect("BlockWardrobe");
			reply(
				ok
					? `wardrobe block ${on ? "ON" : "OFF"}`
					: "wardrobe block failed — no Emoticon item found",
			);
		},
	},
	{
		Tag: "ping",
		group: "Testing",
		args: "[name|number]",
		Description: "Send a hidden-message round trip to test the channel",
		Action: (args: string) => {
			const target = targetOrAsk(firstWord(args), "usage: /hypno ping [name or member number]");
			if (!target) return;
			sendHiddenMessage({ type: "ping", at: Date.now() }, target.id);
			reply(`sent ping to ${target.name} (${target.id})`);
		},
	},
	{
		Tag: "bumptrust",
		group: "Testing",
		args: "[name|number] <n>",
		Description: "Add n interactions (conversation is 1, an induction is 5)",
		Action: (args: string) => {
			const usage = "usage: /hypno bumptrust [name or member number] <interactions>";
			// This split was /s+/ rather than /\s+/ — it split on the letter "s", so
			// "bumptrust Missy 5" parsed as target "Mi" and never worked with a name.
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const [token, rawDelta] = parts.length >= 2 ? parts : ["", parts[0]];
			const delta = Number(rawDelta ?? "1");
			if (!Number.isFinite(delta)) {
				reply(usage);
				return;
			}
			const target = targetOrAsk(token, usage);
			if (!target) return;
			const entry = addInteractions(target.id, target.name, delta);
			reply(
				`trust with ${entry.memberName} → ${trustWith(target.id).toFixed(1)} ` +
					`(${entry.interactions.toFixed(1)} interactions)`,
			);
		},
	},
	{
		// The escape hatch that was missing. A junk entry could previously only be removed by
		// resetting everything, which also throws away every real relationship — so the cost
		// of one bad row was the whole dataset.
		//
		// Takes a raw member number as well as a name, deliberately: the row you most want to
		// delete is the one that should not exist, and such a row is often for somebody who is
		// not in the room to be named.
		Tag: "forgettrust",
		group: "Data",
		args: "<name|number>",
		Description: "Delete a stored trust entry outright — see /hypno logtrust for the numbers",
		Action: (args: string) => {
			const token = firstWord(args);
			if (!token) {
				reply("Usage: /hypno forgettrust <name|number>. /hypno logtrust lists them with their numbers.");
				return;
			}
			// Resolve by number first, so an entry for somebody absent is still reachable.
			const byNumber = /^\d+$/.test(token) ? Number(token) : null;
			const entry = byNumber
				? listTrustRaw().find((t) => t.memberId === byNumber)
				: listTrustRaw().find((t) => t.memberName?.toLowerCase() === token.toLowerCase());
			if (!entry) {
				reply(`No stored trust entry matches "${token}". /hypno logtrust shows what is stored.`);
				return;
			}
			forgetTrust(entry.memberId);
			reply(`Forgot ${entry.memberName} [${entry.memberId}] — ${entry.interactions.toFixed(1)} interactions gone.`);
		},
	},
	{
		// TESTING ONLY. Depth normally comes from the induction roll, which means every check
		// of a depth gate is at the mercy of chance — you cannot ask "does Deep unlock the
		// illusion" without rolling until you get a Deep. This sets it directly.
		//
		// Two numbers, because one would hide the thing most worth testing: `full earned`
		// lets the earned-only rule be exercised deliberately. `/hypno depth 80 20` is a
		// subject who is deep because they are aroused, and must still be refused a trigger.
		Tag: "depth",
		group: "Testing",
		args: "<0-100> [earned]",
		Description: "TESTING: force the current trance depth, and optionally the earned half",
		Action: (args: string) => {
			if (!isTestingMode()) {
				reply("Not available — join the Hypno Testing room to use this.");
				return;
			}
			const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
			if (!parts.length) {
				reply(`Depth now: ${currentDepth()} full / ${currentDepthEarned()} earned (${tierLabel(tierOf(currentDepth()))}).`);
				reply("Usage: /hypno depth <0-100> [earned]. Try `/hypno depth 80 20` for an aroused-but-unearned trance.");
				return;
			}
			const full = Math.max(0, Math.min(100, Number(parts[0]) || 0));
			const earned = parts.length > 1 ? Math.max(0, Math.min(100, Number(parts[1]) || 0)) : full;
			setCurrentDepths(full, earned);
			reply(
				`Depth forced to ${currentDepth()} full / ${currentDepthEarned()} earned — ` +
					`${tierLabel(tierOf(currentDepth()))}. This does NOT start a session; it only sets the number gates read. ` +
					`For suggestions to land you also need a live session — see /hypno trance.`,
			);
		},
	},
	{
		// Under our own tag, never a top-level /bot: that name is BC's. See sendToBot.
		Tag: "bot",
		group: "Testing",
		args: "<command>",
		Description: "TESTING: send a command to the test bot (works while silenced)",
		Action: sendToBot,
	},
	{
		// TESTING ONLY, and the missing half of /hypno depth.
		//
		// Depth alone was never enough: handleSpokenLine() checks isSessionActiveWith(sender)
		// BEFORE it consults any depth gate, so a forced depth with no session refused every
		// suggestion and looked exactly like a broken feature. This starts a real session at
		// a chosen depth in one step, which is what the depth scenarios actually need.
		Tag: "trance",
		group: "Testing",
		args: "[who] [depth] [earned]",
		Description: "TESTING: go straight under with someone, at a chosen depth, skipping the roll",
		Action: (args: string) => {
			if (!isTestingMode()) {
				reply("Not available — join the Hypno Testing room to use this.");
				return;
			}
			const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
			// A leading number is ambiguous: `/hypno trance 80` could be a member number or a
			// depth. Depths are 0-100 and member numbers are far larger, so read a small first
			// number as a depth and let the usual one-other-person-in-the-room rule pick who.
			const looksLikeDepth = parts.length && /^\d{1,3}$/.test(parts[0]) && Number(parts[0]) <= 100;
			const token = looksLikeDepth ? "" : (parts.shift() ?? "");
			const target = targetOrAsk(token, "Usage: /hypno trance [who] [depth] [earned]");
			if (!target) return;
			const full = parts.length ? Math.max(0, Math.min(100, Number(parts[0]) || 0)) : 80;
			const earned = parts.length > 1 ? Math.max(0, Math.min(100, Number(parts[1]) || 0)) : full;
			const refused = forceTrance(target.id, full, earned);
			if (refused) {
				reply(`Can't: ${refused}.`);
				return;
			}
			reply(
				`Under with ${target.name} (${target.id}) at depth ${full} full / ${Math.min(full, earned)} earned — ` +
					`${tierLabel(tierOf(currentDepth()))}. No roll, no trust awarded. /hypno wake to come out.`,
			);
		},
	},
	{
		// TESTING ONLY, and the piece the decay scenario is blocked on.
		//
		// Trigger strength is derived from a clock, and every reading after the first one is
		// days away: even at *very fast* a Deep planting takes twelve hours to die. So the
		// scenario could watch a trigger start to fade and could not reach the compounding, the
		// firing credit, the ghost threshold or the sweep — four of its five expected results.
		// Turning the rate up further does not help, because a rate fast enough to sit through
		// is a rate too coarse to see the tier discount in.
		//
		// By NUMBER, not phrase — the same reasoning as /hypno forgettrigger. The phrase is
		// hidden from the subject unless they asked to see it, and a testing command must not
		// be the way round that.
		Tag: "agetrigger",
		group: "Testing",
		args: "[days] [number]",
		Description: "TESTING: wind a planted trigger's decay clock back, so fading can be watched",
		Action: (args: string) => {
			if (!isTestingMode()) {
				reply("Not available — join the Hypno Testing room to use this.");
				return;
			}
			const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
			// BOTH ARGUMENTS OPTIONAL, DW's call: a bare `/hypno agetrigger` means one day
			// across every planted trigger. The commonest thing to want mid-scenario is "move
			// it on a bit and look again", and that is the form with nothing to mistype — which
			// matters when the subject driving it may be frozen, silenced, or both.
			//
			// Safe to make the bare form DO something rather than print usage, because it is
			// exactly reversible: `/hypno agetrigger -1` puts the clock back. The usage text is
			// still one wrong word away, below.
			const days = parts.length ? Number(parts[0]) : 1;
			if (!Number.isFinite(days)) {
				reply("Usage: /hypno agetrigger [days] [number] — see /hypno triggers for the numbering.");
				reply("Bare, it ages every planted trigger by one day. A number picks just that one.");
				reply("Relative, so `1` twice is two days. A negative number winds the clock forward again.");
				reply(`Triggers currently fade: ${describeDecayPace()}. /hypno triggerdecay changes that.`);
				return;
			}
			// Validated here as well as inside ageTriggers, so a mistyped number reads as a
			// typo rather than as "no trigger NaN".
			const index = parts.length > 1 ? Number(parts[1]) : undefined;
			if (index !== undefined && !Number.isInteger(index)) {
				reply(`"${parts[1]}" is not a trigger number. /hypno triggers lists them by number.`);
				return;
			}
			const result = ageTriggers(days, index);
			if (result.refusal) {
				reply(`Can't: ${result.refusal}.`);
				return;
			}
			reply(`Aged ${result.aged} trigger(s) by ${days} day(s) — strength before and after:`);
			result.lines.forEach(reply);
			// Says what it did NOT do, because both would otherwise look like bugs from the
			// outside: a firing count that survived, and a trigger reading "faded away" that is
			// still in the list until something reads the list.
			reply(
				"The firing credit is untouched — only the clock moved. One aged to nothing is " +
					"swept on the next /hypno triggers, unless it is holding you.",
			);
			// Named explicitly because the bare form writes without being asked twice. Nothing
			// here is recoverable from the stored data alone — the old timestamp is gone — so
			// the way back has to be a thing you were told, not a thing you work out.
			reply(`Undo this exact move with /hypno agetrigger ${-days}${index !== undefined ? ` ${index}` : ""}.`);
		},
	},
	{
		// The companion to the above, and the one to read when something will not fire: it
		// answers "what would work right now" in one screen rather than by trying things.
		Tag: "gates",
		group: "Diagnostics",
		Description: "Show every depth gate, what it needs, and whether you are deep enough now",
		Action: () => {
			const full = currentDepth();
			const earned = currentDepthEarned();
			reply(
				`Depth ${full} full / ${earned} earned — ${tierLabel(tierOf(full))}. ` +
					`Chemicals: ${arousalCounts() ? "arousal counts" : "arousal does NOT count"}.`,
			);
			const features = getFeatures();
			for (const gate of DEPTH_GATES) {
				const granted = !!features[gate.key];
				const deep = depthAllows(gate.key, full, earned);
				// Both halves reported, because "off" and "not deep enough" are different
				// problems with different fixes and look identical from outside.
				const verdict = !granted ? "OFF (permission)" : deep ? "ready" : "too shallow";
				reply(
					`  ${verdict.padEnd(16)} ${gate.label} — needs ${tierLabel(requiredTier(gate.key))} ` +
						`(${requiredDepth(gate.key)})${gate.earnedOnly ? ", earned only" : ""}`,
				);
			}
		},
	},
	{
		Tag: "logtrust",
		group: "Testing",
		Description: "List stored trust and experience, with the counts behind them",
		Action: () => describeTrust().forEach(reply),
	},
];
