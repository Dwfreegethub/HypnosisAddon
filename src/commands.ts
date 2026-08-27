import { log } from "./log";
import { applyEffect, removeEffect } from "./effects";
import { bumpTrust, listTrust } from "./storage";
import { sendHiddenMessage } from "./messaging";

let suppressNextAction = false;
let wardrobeBlocked = false;

export function isWardrobeBlocked(): boolean {
	return wardrobeBlocked;
}

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

// Registered via BC's own command registry (Screens/Online/ChatRoom/Commands.js),
// not by hooking CommandParse — that runs BEFORE registry lookup and would still hit
// BC's "no such command" path for anything we didn't recognize ourselves, fighting the
// game's own validation instead of using the extension point it already provides.
export function installCommands(): void {
	CommandCombine({
		Tag: "hypno",
		Description: "BC Hypnosis Add-on test commands (Stage 2)",
		Action: () =>
			log(
				"subcommands: freeze, unfreeze, suppress, wardrobeblock <on|off>, ping <memberNumber>, bumptrust <memberNumber> <delta>, logtrust",
			),
		Subcommands: [
			{
				Tag: "freeze",
				Action: () =>
					log(applyEffect("Freeze") ? "Freeze applied" : "Freeze failed — no Emoticon item found"),
			},
			{
				Tag: "unfreeze",
				Action: () => log(removeEffect("Freeze") ? "Freeze removed" : "Freeze wasn't applied"),
			},
			{
				Tag: "suppress",
				Action: () => {
					suppressNextAction = true;
					log("armed: next incoming Action-type message will be logged and suppressed");
				},
			},
			{
				Tag: "wardrobeblock",
				Action: (args: string) => {
					wardrobeBlocked = firstWord(args).toLowerCase() !== "off";
					log(`wardrobe block ${wardrobeBlocked ? "ON" : "OFF"}`);
				},
			},
			{
				Tag: "ping",
				Action: (args: string) => {
					const target = Number(firstWord(args));
					if (!target) {
						log("usage: /hypno ping <memberNumber>");
						return;
					}
					sendHiddenMessage({ type: "ping", at: Date.now() }, target);
					log(`sent ping to ${target}`);
				},
			},
			{
				Tag: "bumptrust",
				Action: (args: string) => {
					const [rawTarget, rawDelta] = args.trim().split(/\s+/);
					const target = Number(rawTarget);
					const delta = Number(rawDelta ?? "5");
					if (!target) {
						log("usage: /hypno bumptrust <memberNumber> <delta>");
						return;
					}
					const entry = bumpTrust(target, findCharacter(target)?.Name ?? `#${target}`, delta);
					log(`trust with ${entry.memberName}: ${entry.relationshipTrust}`);
				},
			},
			{
				Tag: "logtrust",
				Action: () => {
					const all = listTrust();
					if (!all.length) {
						log("no trust data stored yet");
						return;
					}
					all.forEach((t) => log(`${t.memberName} [${t.memberId}]: ${t.relationshipTrust}`));
				},
			},
		],
	});
}
