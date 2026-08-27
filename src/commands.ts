import { log } from "./log";
import { applyEffect, removeEffect } from "./effects";
import { bumpTrust, listTrust } from "./storage";
import { sendHiddenMessage } from "./messaging";

let suppressNextAction = false;

export function consumeSuppressFlag(): boolean {
	if (!suppressNextAction) return false;
	suppressNextAction = false;
	return true;
}

function findCharacter(memberId: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(c: any) => c?.MemberNumber === memberId,
	);
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

// Registered via BC's own command registry (Screens/Online/ChatRoom/Commands.js),
// not by hooking CommandParse — that runs BEFORE registry lookup and would still hit
// BC's "no such command" path for anything we didn't recognize ourselves, fighting the
// game's own validation instead of using the extension point it already provides.
export function installCommands(): void {
	CommandCombine({
		Tag: "hypno",
		Description: "BC Hypnosis Add-on test commands (Stage 2)",
		Action: () =>
			reply(
				"subcommands: freeze, unfreeze, suppress, wardrobeblock <on|off>, ping <memberNumber>, bumptrust <memberNumber> <delta>, logtrust",
			),
		Subcommands: [
			{
				Tag: "freeze",
				Action: () =>
					reply(applyEffect("Freeze") ? "Freeze applied" : "Freeze failed — no Emoticon item found"),
			},
			{
				Tag: "unfreeze",
				Action: () => reply(removeEffect("Freeze") ? "Freeze removed" : "Freeze wasn't applied"),
			},
			{
				Tag: "suppress",
				Action: () => {
					suppressNextAction = true;
					reply("armed: next incoming Action-type message will be logged and suppressed");
				},
			},
			{
				Tag: "wardrobeblock",
				Action: (args: string) => {
					const on = firstWord(args).toLowerCase() !== "off";
					const ok = on ? applyEffect("BlockWardrobe") : removeEffect("BlockWardrobe");
					reply(ok ? `wardrobe block ${on ? "ON" : "OFF"}` : "wardrobe block failed — no Emoticon item found");
				},
			},
			{
				Tag: "ping",
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
				Action: (args: string) => {
					const [rawTarget, rawDelta] = args.trim().split(/\s+/);
					const target = Number(rawTarget);
					const delta = Number(rawDelta ?? "5");
					if (!target) {
						reply("usage: /hypno bumptrust <memberNumber> <delta>");
						return;
					}
					const entry = bumpTrust(target, findCharacter(target)?.Name ?? `#${target}`, delta);
					reply(`trust with ${entry.memberName}: ${entry.relationshipTrust}`);
				},
			},
			{
				Tag: "logtrust",
				Action: () => {
					const all = listTrust();
					if (!all.length) {
						reply("no trust data stored yet");
						return;
					}
					all.forEach((t) => reply(`${t.memberName} [${t.memberId}]: ${t.relationshipTrust}`));
				},
			},
		],
	});
}
