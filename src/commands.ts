import { log, TESTING_MODE } from "./log";
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
	setDecayRate,
	DECAY_RATES,
	DecayRate,
	RelationKind,
} from "./storage";
import { describeTrust, describeRelationship, relationshipWith, accessFor } from "./trust";
import { describeRecording } from "./triggers";
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
} from "./session";
import { describeCurrentState, describeSavedState } from "./recovery";
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
export function installCommands(): void {
	// The bare `/hypno` summary is GENERATED from this list rather than written out
	// separately. It was a hand-maintained string and had drifted behind the commands it
	// described — which is what a duplicated source of truth always eventually does.
	const summary = ["Session", "Diagnostics", "Data", "Testing"]
		.map((g) => {
			const inGroup = COMMANDS.filter((c) => c.group === g).map((c) => (c.args ? `${c.Tag} ${c.args}` : c.Tag));
			return `${g}: ${inGroup.join(", ")}`;
		})
		.join(" | ");

	CommandCombine({
		Tag: "hypno",
		Description:
			"BC Hypnosis Add-on — session control, diagnostics and test commands",
		Action: () => {
			reply(
				"Most of this add-on is used by SPEAKING to someone during a session, not by command. " +
					"The full guide — what to say, how trust works, every command — is under " +
					"Preferences > Extensions > Hypnosis Add-on > Help, and on the Help button in the " +
					"remote panel.",
			);
			reply(summary);
			reply("Stuck on a phrase? /hypno match <phrase> reports what it would do and why not.");
		},
		// Fold the argument hint into the Description BC renders, so its own help screen
		// shows it too rather than only our summary line.
		Subcommands: COMMANDS.map(({ group: _group, args, Description, ...cmd }) => ({
			...cmd,
			Description: args ? `${args} — ${Description}` : Description,
		})),
	});

	installBotCommand();
}

/** Drive the test bot from a slash command, because chat is not always available.
 *
 * The whole point: a silenced subject cannot type `!next`. ChatRoomSendChatMessage — where
 * the speech block lives — runs AFTER command parsing, so a slash command still gets through
 * when ordinary speech does not. That asymmetry is deliberate (it is what keeps
 * `/hypno safeword` reachable) and this rides on it.
 *
 * It does NOT send chat. Verified in the live client: CommandParse() returns CommandExecute()'s
 * BOOLEAN for anything starting with the command key, and ChatRoomSendChat() only sends when
 * it gets a string back — so an unregistered `/bot` never leaves the browser at all, it just
 * prints "no such command" locally. Registering it here is what makes it exist, and once it
 * exists the cleanest route to the bot is the hidden channel: unaffected by silence, invisible
 * to the room, and not dependent on the bot parsing room chat.
 *
 * `!` in chat keeps working. Two ways in, and the one that survives a gag is the point. */
function installBotCommand(): void {
	if (!TESTING_MODE) return;
	CommandCombine({
		Tag: "bot",
		Description: "TESTING: send a command to the test bot (works while silenced)",
		Action: (args: string) => {
			const text = (args ?? "").trim();
			if (!text) {
				reply("Usage: /bot <command> — e.g. /bot next, /bot run 2, /bot ok, /bot tests.");
				reply("Goes over the hidden channel, so it works while you cannot speak.");
				return;
			}
			// The hypnotist first: mid-trance they are by definition the bot, and being unable
			// to say who you meant is the exact situation this command exists for.
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
			log(`/bot -> ${target}: ${text}`);
		},
	});
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
				reply("This erases all trust, experience and settings. Run: /hypno reset confirm");
				return;
			}
			reply(resetSettings());
		},
	},
	{
		Tag: "triggers",
		group: "Diagnostics",
		// `full` is advertised only while it exists. When TESTING_MODE goes false the
		// argument stops working AND stops being mentioned, so the help screen cannot end up
		// documenting a command that ignores you.
		args: TESTING_MODE ? "[full]" : "",
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
			describeTriggerList(TESTING_MODE && firstWord(args).toLowerCase() === "full").forEach(reply);
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
				free.forEach((t) => forgetTrigger(t.phrase));
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
			const gone = forgetTrigger(all[index - 1].phrase);
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
			if (!TESTING_MODE) {
				reply("Not available — this build is not in testing mode.");
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
			if (!TESTING_MODE) {
				reply("Not available — this build is not in testing mode.");
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
