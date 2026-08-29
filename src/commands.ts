import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { describeMatch } from "./voice";
import { bumpTrust, listTrust, setTrust } from "./storage";
import { sendHiddenMessage } from "./messaging";
import { answerPrompt, selfWake, safeword, describeSession } from "./session";

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
	group: "Session" | "Diagnostics" | "Testing";
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
	const summary = ["Session", "Diagnostics", "Testing"]
		.map((g) => {
			const inGroup = COMMANDS.filter((c) => c.group === g).map((c) => c.Tag);
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
		Subcommands: COMMANDS.map(({ group: _group, ...cmd }) => cmd),
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
		Description:
			"<phrase> — report what a spoken phrase would trigger, and why not",
		Action: (args: string) => {
			if (!args.trim()) {
				reply("usage: /hypno match <phrase to test>");
				return;
			}
			reply(`"${args.trim()}" → ${describeMatch(args)}`);
		},
	},
	{
		// Stub for the trust engine that doesn't exist yet — without this there's no
		// way to get a roll above the induction threshold and test the flow at all.
		Tag: "settrust",
		group: "Testing",
		Description:
			"<member> <0-100> — set trust directly (stub until the trust engine)",
		Action: (args: string) => {
			const [rawTarget, rawValue] = args.trim().split(/\s+/);
			const target = Number(rawTarget);
			const value = Number(rawValue);
			if (!target || !Number.isFinite(value)) {
				reply("usage: /hypno settrust <memberNumber> <0-100>");
				return;
			}
			const entry = setTrust(
				target,
				findCharacter(target)?.Name ?? `#${target}`,
				value,
			);
			reply(`trust with ${entry.memberName} set to ${entry.relationshipTrust}`);
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
		Description: "<on|off> — toggle the BlockWardrobe effect on yourself",
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
		Description:
			"<member> — send a hidden-message round trip to test the channel",
		Action: (args: string) => {
			const target = Number(firstWord(args));
			if (!target) {
				reply("usage: /hypno ping <memberNumber>");
				return;
			}
			sendHiddenMessage({ type: "ping", at: Date.now() }, target);
			reply(`sent ping to ${target}`);
		},
	},
	{
		Tag: "bumptrust",
		group: "Testing",
		Description: "<member> <delta> — adjust stored trust by an amount",
		Action: (args: string) => {
			const [rawTarget, rawDelta] = args.trim().split(/\s+/);
			const target = Number(rawTarget);
			const delta = Number(rawDelta ?? "5");
			if (!target) {
				reply("usage: /hypno bumptrust <memberNumber> <delta>");
				return;
			}
			const entry = bumpTrust(
				target,
				findCharacter(target)?.Name ?? `#${target}`,
				delta,
			);
			reply(`trust with ${entry.memberName}: ${entry.relationshipTrust}`);
		},
	},
	{
		Tag: "logtrust",
		group: "Testing",
		Description: "List stored trust for everyone",
		Action: () => {
			const all = listTrust();
			if (!all.length) {
				reply("no trust data stored yet");
				return;
			}
			all.forEach((t) =>
				reply(`${t.memberName} [${t.memberId}]: ${t.relationshipTrust}`),
			);
		},
	},
];
