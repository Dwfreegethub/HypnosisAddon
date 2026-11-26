// Per-person access (v1.17.0, DW 2026-11-26): ECHS's own blacklist, grown into a level for each
// person. "ECHS feature ideas.md" (blacklist) and DW's answers on 2026-11-26:
//   - Three levels: Blocked / Normal / Toy. Normal is everyone not listed: her other settings decide.
//   - Blocked: can never hypnotize her, command her, plant in her or set off anything planted. It wins
//     over every other setting, toy mode and Extreme's open door included. They are refused with the
//     words hypnosis being off gives ("They aren't open to hypnosis."), so the list stays private.
//   - Blocking someone while they have her under ends the trance, and everything they planted in her
//     is forgotten (DW: "Ends, and their triggers go too").
//   - Toy: toy mode for them even when her own toy mode is off or "Toy mode is for" leaves them out.
//   - Only she changes it. Her keyholders see it, read-only. Frozen under the Extreme lock, the
//     keyholder lock, and "Lock settings while a session is on you", as her other settings are.
//   - Keys are separate, but (DW, 2026-11-26) blocking someone who holds her keys asks her, in the
//     ask.ts popup, whether to take them back too. No answer keeps them. The block happens either way.
//   - Managed on the popup's Access tab (the old Keys tab), on the settings Stats tab, and by
//     /echs access.
//
// The gates themselves read accessLevelOf() from storage.ts (a leaf), so session.ts and voice.ts need
// nothing from here: session-attempt, toyModeFor, handleSpokenLine, noteActivity and noteArrival.

import { log } from "./log";
import { getFeatures, listAccess, setAccessLevel, accessLevelOf, AccessLevel, AccessEntry, MAX_ACCESS, listKeyholders, removeKeyholder, getOwnerKeyMode, setOwnerKeyMode } from "./storage";
import { extremeLocked, extremeRefusal } from "./extreme";
import { keyLocked, keyLockRefusal, keyLockHolder, keysLocked, keysLockRefusal } from "./keylock";
import { isSessionLive, endSessionWith } from "./session";
import { forgetEverythingFrom } from "./voice";
import { carrierId, releaseCarried } from "./carry";
import { keyModeFor, announceKeysTo } from "./keyholder";
import { askPlayer } from "./ask";
import { tellPlayer } from "./notify";

export const ACCESS_LABELS: Record<AccessLevel, string> = { blocked: "Blocked", normal: "Normal", toy: "Toy" };

/** What each level means, in the words the tab, the command and the help use. */
export const ACCESS_WORDS: Record<AccessLevel, string> = {
	blocked: "can never hypnotize you, command you, plant in you or set off anything planted in you",
	normal: "your usual settings decide",
	toy: "toy mode for them, even when your toy mode is off or doesn't include them",
};

/** Why she may not change anyone's level now, or null. Her settings' own locks, in their order. */
export function accessLockRefusal(): string | null {
	if (extremeLocked()) return extremeRefusal();
	if (keyLocked()) return keyLockRefusal();
	if (getFeatures().lockedWhileHypnotized && isSessionLive()) return "Your settings are locked while a session is on you, and so is who you have blocked.";
	return null;
}

/** Set one person's level, on her own say. Returns what she is told. */
export function changeAccess(id: number, name: string, level: AccessLevel): string {
	if (!Number.isInteger(id) || id <= 0) return "That isn't a member number.";
	if (id === Player?.MemberNumber) return "That's you.";
	const refusal = accessLockRefusal();
	if (refusal) return refusal;
	const before = accessLevelOf(id);
	if (before === level) return `${name} is already ${ACCESS_LABELS[level]}.`;
	if (!setAccessLevel(id, name, level)) return `Your list is full (${MAX_ACCESS} people). Set someone back to Normal first.`;
	log(`access: ${id} ${before} -> ${level}`);
	if (level !== "blocked") return `${name} is now ${ACCESS_LABELS[level]}: ${ACCESS_WORDS[level]}.`;
	// Blocked: whatever of theirs is on her goes now.
	const ended = endSessionWith(id);
	const forgot = forgetEverythingFrom(id);
	if (carrierId() === id) releaseCarried("blocked");
	offerKeysBack(id, name);
	const bits = [ended ? "your trance with them ended" : "", forgot ? `${forgot === 1 ? "1 trigger" : `${forgot} triggers`} they planted ${forgot === 1 ? "is" : "are"} forgotten` : ""].filter(Boolean);
	return `${name} is now Blocked: they ${ACCESS_WORDS.blocked}.${bits.length ? ` ${bits.join(", and ").replace(/^./, (c) => c.toUpperCase())}.` : ""}`;
}

/** She just blocked a keyholder: ask whether their keys go too (DW). Named keys, or her BC owner's
 * keys if that is how they hold them. The locks that stop her taking keys back still hold. */
export function offerKeysBack(id: number, name: string): "asked" | "none" | "locked" | "busy" {
	if (!keyModeFor(id)) return "none";
	const named = listKeyholders().some((k) => k.id === id);
	const asOwner = !named && !!getOwnerKeyMode();
	if (keysLocked()) {
		tellPlayer(`${name} still holds your keys: ${keysLockRefusal()}`);
		return "locked";
	}
	if (keyLockHolder()?.id === id) {
		tellPlayer(`${name} still holds your keys: they locked your settings, so they keep their keys until a full keyholder unlocks them.`);
		return "locked";
	}
	const asked = askPlayer({
		title: `Take ${name}'s keys back too?`,
		lines: [
			`${name} is blocked from hypnotizing you, but still holds your keys${asOwner ? " as your BC owner" : ""}, so they can still change your ECHS settings.`,
			asOwner ? "Taking them back means your BC owner no longer holds your keys." : "You can give them keys again later.",
		],
		accept: "Take their keys back",
		decline: "Keep their keys",
	});
	if (!asked) {
		tellPlayer(`${name} still holds your keys. /echs keyholder remove ${id} takes them back.`);
		return "busy";
	}
	asked.then((answer) => {
		if (answer !== "accept") {
			tellPlayer(`${name} keeps your keys.`);
			return;
		}
		if (keysLocked() || keyLockHolder()?.id === id) {
			tellPlayer(`${name} still holds your keys: a lock came on while you were deciding.`);
			return;
		}
		if (named) removeKeyholder(id);
		else setOwnerKeyMode(null);
		announceKeysTo(id);
		log(`access: took ${id}'s keys back after blocking`);
		tellPlayer(`${name} no longer holds your keys.`);
	});
	return "asked";
}

/** Everyone with a level other than Normal, Blocked first, then by name. */
export function accessList(): AccessEntry[] {
	return listAccess().sort((a, b) => (a.level === b.level ? a.name.localeCompare(b.name) : a.level === "blocked" ? -1 : 1));
}

/** The list as chat lines, for /echs access. */
export function describeAccess(): string[] {
	const list = accessList();
	if (!list.length) return ["Everyone is Normal: your usual settings decide. /echs access <name or number> blocked|normal|toy sets someone."];
	const of = (level: AccessLevel) => list.filter((e) => e.level === level).map((e) => `${e.name} (#${e.id})`);
	const lines: string[] = [];
	const blocked = of("blocked");
	const toy = of("toy");
	if (blocked.length) lines.push(`Blocked: ${blocked.join(", ")}.`);
	if (toy.length) lines.push(`Toy: ${toy.join(", ")}.`);
	lines.push("Everyone else is Normal. /echs access <name or number> normal sets someone back.");
	return lines;
}
