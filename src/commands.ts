import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { describeMatch } from "./voice";
import { addInteractions, setTrustValue, setExperienceValue, trustWith, describeStorage } from "./storage";
import { describeTrust } from "./trust";
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
		// Jumps straight to a trust level without playing to it. Back-solves the
		// interaction count that produces the value, since counts are what's stored.
		Tag: "settrust",
		group: "Testing",
		Description: "<member> <0-100> — jump trust to a value without playing to it",
		Action: (args: string) => {
			const [rawTarget, rawValue] = args.trim().split(/\s+/);
			const target = Number(rawTarget);
			const value = Number(rawValue);
			if (!target || !Number.isFinite(value)) {
				reply("usage: /hypno settrust <memberNumber> <0-100>");
				return;
			}
			const entry = setTrustValue(target, findCharacter(target)?.Name ?? `#${target}`, value);
			reply(
				`trust with ${entry.memberName} → ${trustWith(target).toFixed(1)} ` +
					`(${entry.interactions.toFixed(1)} interactions)`,
			);
		},
	},
	{
		Tag: "setexp",
		group: "Testing",
		Description: "<0-100> — jump subject experience to a value",
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
		Tag: "storage",
		group: "Diagnostics",
		Description: "Where settings loaded from, and what each source holds",
		Action: () => describeStorage().forEach(reply),
	},
	{
		Tag: "chance",
		group: "Diagnostics",
		Description: "<member> — show the induction chance for each choice against them",
		Action: (args: string) => {
			const target = Number(firstWord(args));
			if (!target) {
				reply("usage: /hypno chance <memberNumber>");
				return;
			}
			describeChances(target).forEach(reply);
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
		Description: "<member> <n> — add n interactions (conversation is 1, an induction is 10)",
		Action: (args: string) => {
			const [rawTarget, rawDelta] = args.trim().split(/s+/);
			const target = Number(rawTarget);
			const delta = Number(rawDelta ?? "1");
			if (!target || !Number.isFinite(delta)) {
				reply("usage: /hypno bumptrust <memberNumber> <interactions>");
				return;
			}
			const entry = addInteractions(target, findCharacter(target)?.Name ?? `#${target}`, delta);
			reply(
				`trust with ${entry.memberName} → ${trustWith(target).toFixed(1)} ` +
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
