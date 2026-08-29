import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { describeMatch } from "./voice";
import {
	addInteractions,
	setTrustValue,
	setExperienceValue,
	trustWith,
	describeStorage,
	listTriggers,
	forgetTrigger,
	forgetAllTriggers,
	exportSettings,
	importSettings,
	resetSettings,
} from "./storage";
import { describeTrust } from "./trust";
import { describeRecording } from "./triggers";
import { sendHiddenMessage } from "./messaging";
import { answerPrompt, selfWake, safeword, describeSession, describeChances } from "./session";

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
	ChatRoomSendLocal(message);
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
			reply(summary);
			reply(
				"Most features are used by SPEAKING to a subject during a session, not by command — " +
					"try /hypno match <phrase> to see what a phrase would do.",
			);
		},
		// Fold the argument hint into the Description BC renders, so its own help screen
		// shows it too rather than only our summary line.
		Subcommands: COMMANDS.map(({ group: _group, args, Description, ...cmd }) => ({
			...cmd,
			Description: args ? `${args} — ${Description}` : Description,
		})),
	});
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
		Description: "List the triggers planted in you (phrases stay hidden)",
		Action: () => {
			const all = listTriggers();
			if (!all.length) {
				reply("no triggers planted");
				return;
			}
			// Phrases are deliberately NOT shown. Per the design doc, trigger words can be
			// hidden from the subject — and a subject who can read their own trigger word
			// can simply decide not to react to it. You still see that a trigger exists,
			// who planted it and what it does, so nothing is happening to you unseen.
			all.forEach((t, i) =>
				reply(`${i + 1}. [hidden phrase] → ${t.actions.join(", ")}  (by ${t.installedByName})`),
			);
			reply("Remove one with /hypno forgettrigger <number>, or all of them with 'all'.");
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
			if (token === "all") {
				reply(`forgot ${forgetAllTriggers()} trigger(s)`);
				return;
			}
			const index = Number(token);
			const all = listTriggers();
			if (!Number.isInteger(index) || index < 1 || index > all.length) {
				reply(`no trigger ${token} — you have ${all.length}. See /hypno triggers.`);
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
		Tag: "logtrust",
		group: "Testing",
		Description: "List stored trust and experience, with the counts behind them",
		Action: () => describeTrust().forEach(reply),
	},
];
