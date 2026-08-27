import { log } from "./log";
import { applyEffect, removeEffect } from "./effects";
import { bumpTrust, listTrust } from "./storage";
import { sendHiddenMessage } from "./messaging";

// Stage 2 is deliberately command/response only, per the doc's roadmap — no menus yet.
// Typed in the normal chat box as "/hypno <subcommand> ...", swallowed before it sends.
const PREFIX = "/hypno";

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

function handleCommand(raw: string): boolean {
	const trimmed = raw.trim();
	if (!trimmed.toLowerCase().startsWith(PREFIX)) return false;

	const [sub, ...args] = trimmed
		.slice(PREFIX.length)
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	switch ((sub ?? "").toLowerCase()) {
		case "freeze":
			log(applyEffect("Freeze") ? "Freeze applied" : "Freeze failed — no Emoticon item found");
			break;

		case "unfreeze":
			log(removeEffect("Freeze") ? "Freeze removed" : "Freeze wasn't applied");
			break;

		case "suppress":
			suppressNextAction = true;
			log("armed: next incoming Action-type message will be logged and suppressed");
			break;

		case "wardrobeblock":
			wardrobeBlocked = (args[0] ?? "").toLowerCase() !== "off";
			log(`wardrobe block ${wardrobeBlocked ? "ON" : "OFF"}`);
			break;

		case "ping": {
			const target = Number(args[0]);
			if (!target) {
				log("usage: /hypno ping <memberNumber>");
				break;
			}
			sendHiddenMessage({ type: "ping", at: Date.now() }, target);
			log(`sent ping to ${target}`);
			break;
		}

		case "bumptrust": {
			const target = Number(args[0]);
			const delta = Number(args[1] ?? "5");
			if (!target) {
				log("usage: /hypno bumptrust <memberNumber> <delta>");
				break;
			}
			const entry = bumpTrust(target, findCharacter(target)?.Name ?? `#${target}`, delta);
			log(`trust with ${entry.memberName}: ${entry.relationshipTrust}`);
			break;
		}

		case "logtrust": {
			const all = listTrust();
			if (!all.length) {
				log("no trust data stored yet");
				break;
			}
			all.forEach((t) => log(`${t.memberName} [${t.memberId}]: ${t.relationshipTrust}`));
			break;
		}

		default:
			log(`unknown command: ${sub}`);
	}
	return true;
}

export function installCommandHook(modApi: any): void {
	modApi.hookFunction(
		"CommandParse",
		1000,
		((args: [string], next: (args: [string]) => string) => {
			if (typeof args[0] === "string" && handleCommand(args[0])) {
				return "";
			}
			return next(args);
		}) as any,
	);
}
