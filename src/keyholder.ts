// Keyholders: changing someone's ECHS settings for them (v1.14.0; job5.md; DW 2026-11-21, from a
// player's request about people locking themselves into Extreme with nobody able to help).
//
// DW'S DECISIONS (job5.md):
//   - A keyholder is her BC owner, if she has said the owner may be one, or anyone she names.
//   - Per keyholder she chooses a level (v1.16.0, job6.md §1): minimal (may only switch things OFF),
//     moderate (may also shape the trance: Trance Defaults and Awareness boxes, and the choices
//     marked `moderate` in menu.ts remoteChoices), full (everything reachable). v1.14's "take" reads
//     as minimal and "grant" as moderate (storage.ts toKeyMode).
//   - It works at any time, and through her Extreme lock; a keyholder may also END that lock.
//   - It reaches the tick boxes on Permissions, Trance Defaults, Awareness and Triggers (menu.ts
//     remoteRows), nothing else.
//   - v1.14.1 (DW 2026-11-21): also the choices that are not tick boxes (menu.ts remoteChoices):
//     every Inductions control, and on Trance Defaults the screen effect (the spiral), her eyes, her
//     eye colour and the pulse colour. minimal keys may only set one to its off choice (None, Unchanged,
//     Ask me, Refuse, toy mode Off, Never deeper); one with no off (attempts, induction time, who toy
//     mode is for, pulse colour) needs more (v1.16.0: moderate or full, see keyLevelAllows).
//
// RULE 1. Every change is a REQUEST to her client, which alone decides: is the sender her keyholder,
// is the box one a keyholder may reach, and if it turns something on, may this keyholder grant? Then
// it applies the change through the same path as her own click (setFeature + menu's onToggle, so
// switching a permission off releases what it held), and tells her who changed what. A refusal is
// said to the keyholder (rule 5). Both have to be in the same room: hidden messages go no further.
//
// NEVER REACHABLE: the safeword, /echs reset, export/import, and the keyholder list itself, so a
// keyholder can never make themselves permanent. Her safeword and hard floor are untouched (rule 2).
//
// NO NEW MESSAGE TYPES (an older client prints an unknown type as raw text). Requests ride on
// `remote-request` with feature "settings", which every build since the old remote buttons already
// handles by ignoring what it doesn't know (remote.ts). Replies ride on `state-response`, as the
// planted list does. Her answer to anyone's state-query (badge.ts asks on joining a room) says,
// to that asker alone, whether they are her keyholder — so a keyholder's popup knows whose keys it
// holds without asking anyone extra.

import { log } from "./log";
import { tellPlayer } from "./notify";
import { sendHiddenMessage } from "./messaging";
import {
	getFeatures,
	setFeature,
	FeatureToggles,
	getOwnerKeyMode,
	listKeyholders,
	KeyMode,
	keyRank,
	KEY_LEVELS,
	setKeyholder,
	noteRemoteChange,
	clearExtremeLock,
	setKeyLock,
	clearKeyLock,
	removeKeyholder,
	LockKind,
	startExtremeLock,
	extendExtremeLock,
	EXTREME_MONTH_DAYS,
	listTriggers,
	forgetTrigger,
	trustWith,
	Trigger,
} from "./storage";
import { plantedEntryFor, MAX_PLANTED_ENTRIES } from "./planted";
import { triggerStrength } from "./triggers";
import { isTriggerInEffect } from "./voice";
import { remoteRows, remoteChoices, remoteChoiceLabel, onToggle, MODERATE_TABS, FULL_ONLY_TABS, ownLocked } from "./menu";
import { keyLockHolder, keysLockHolder, keysLocked } from "./keylock";
import { extremeLocked, extremeWarning } from "./extreme";
import { askPlayer, askOpen } from "./ask";
import { compareVersions } from "./update";
import { peerFor } from "./badge";
import { presenceFields } from "./badge";

// --- Subject side ----------------------------------------------------------------------------------

function characterFor(member: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find((c: any) => c?.MemberNumber === member) ?? null;
}

function nameOf(member: number): string {
	const c = characterFor(member);
	return (c?.Nickname || c?.Name || `#${member}`) as string;
}

/** Is this member her BC owner? BC's own check (R134 Character.js IsOwnedByCharacter), on someone here. */
function isBcOwner(member: number): boolean {
	const C = characterFor(member);
	try {
		return !!C && Player?.IsOwnedByCharacter?.(C) === true;
	} catch {
		return false;
	}
}

/** What this member may do to her settings: null when they are not her keyholder. Named and owner
 * together give the wider of the two. */
export function keyModeFor(member: number): KeyMode | null {
	if (!member || member === Player?.MemberNumber) return null;
	const named = listKeyholders().find((k) => k.id === member)?.mode ?? null;
	const owner = getOwnerKeyMode() && isBcOwner(member) ? getOwnerKeyMode() : null;
	if (named && owner) return keyRank(named) >= keyRank(owner) ? named : owner;
	return named ?? owner;
}

/** May a keyholder at `level` make this change? Switching something off (or to its off choice) is
 * every level's; shaping the trance (`moderateOk`) is moderate's and full's; the rest is full's. */
export function keyLevelAllows(level: KeyMode, turnsOff: boolean, moderateOk: boolean, fullOnly = false): boolean {
	if (level === "full") return true;
	// The General tab (v1.16.37, DW): full keys only, switching off included.
	if (fullOnly) return false;
	if (turnsOff) return true;
	return level === "moderate" && moderateOk;
}

/** The least level that may make a change keyLevelAllows refused, for the refusal's words. */
function levelNeeded(moderateOk: boolean): KeyMode {
	return moderateOk ? "moderate" : "full";
}

/** v1.14's word for a level, sent beside the new one so an older keyholder's ECHS still knows. */
function legacyWord(level: KeyMode): "take" | "grant" {
	return level === "minimal" ? "take" : "grant";
}

/** The fields her answer to a state-query carries for that asker: whether they hold her keys. */
export function keyholderFields(asker: number): { keyholder?: "take" | "grant"; keyLevel?: KeyMode } {
	const mode = keyModeFor(asker);
	return mode ? { keyholder: legacyWord(mode), keyLevel: mode } : {};
}

/** One trigger planted in her, as a full keyholder sees it (v1.16.2, job6.md §4). `id` stands for
 * the trigger without naming its word; `word` is empty unless they may see it. */
export type HeldTrigger = { id: string; word: string; when: string; does: string[]; strength: string; once: boolean; holding: boolean; by: string; removable: boolean; why: string };

export type SettingsSnapshot = { boxes: { key: string; on: boolean }[]; choices: { key: string; value: string }[]; extreme: boolean; mode: KeyMode; planted?: HeldTrigger[]; keyLock?: string; keysLock?: string; keyholders?: { id: number; name: string; mode: KeyMode }[] };

/** A trigger's id on the wire: a hash of its key, so a hidden word never travels to name it. */
export function triggerId(key: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, "0");
}

/** Why this keyholder may not remove this trigger, or null if they may (job6.md §4, DW 2026-11-22):
 * never under her Extreme lock (Extreme is add-only); never one she planted in herself; not while it
 * holds her (her own rule for forgetting one); and only if she trusts the keyholder more than whoever
 * planted it. Their own planting they may always take back, as they could by saying so. */
export function removeRefusal(t: Trigger, keyholder: number): string | null {
	if (extremeLocked()) return "Their Extreme lock is on: nothing planted in them can be removed until it ends.";
	if (t.installedBy === Player?.MemberNumber) return "They planted this in themselves: only they can remove it.";
	if (isTriggerInEffect(t)) return "It is holding them right now. Wait for it to wear off, or have it released.";
	if (t.installedBy === keyholder) return null;
	if (!(trustWith(keyholder) > trustWith(t.installedBy))) return `They don't trust you more than ${t.installedByName || "whoever planted it"}, so it stays.`;
	return null;
}

/** What is planted in her, for a full keyholder. The word only if they planted it or she lets
 * herself see her trigger words; otherwise what it does and who planted it. */
function plantedForKeyholder(member: number): HeldTrigger[] {
	const showWords = !!getFeatures().showTriggerWords;
	return listTriggers()
		.filter((t) => !t.spent && triggerStrength(t) > 0)
		.slice(0, MAX_PLANTED_ENTRIES)
		.map((t) => {
			const e = plantedEntryFor(t);
			const why = removeRefusal(t, member);
			return {
				id: triggerId(t.key),
				word: showWords || t.installedBy === member ? e.word : "",
				when: e.when,
				does: e.does,
				strength: e.strength,
				once: e.once,
				holding: e.holding,
				by: t.installedBy === Player?.MemberNumber ? "themselves" : t.installedByName || `#${t.installedBy}`,
				removable: !why,
				why: why ?? "",
			};
		});
}

/** What her answer carries: SettingsSnapshot's fields, with the level as both words (see below). */
function snapshotFor(member: number, mode: KeyMode): Record<string, unknown> {
	const f = getFeatures();
	return {
		boxes: remoteRows().map((r) => ({ key: r.key, on: !!f[r.key] })),
		choices: remoteChoices().map((c) => ({ key: c.key, value: c.get() })),
		extreme: extremeLocked(),
		// Who locked her settings (v1.16.2, job6.md §5), or "".
		keyLock: keyLockHolder()?.name ?? "",
		// Who locked who holds her keys (v1.16.3), or "".
		keysLock: keysLockHolder()?.name ?? "",
		// Her other named keyholders, for full keys, who may take theirs back (v1.16.3 owner, v1.16.4 any).
		...(mode === "full" ? { keyholders: listKeyholders().filter((k) => k.id !== member).map((k) => ({ id: k.id, name: k.name.slice(0, 60), mode: k.mode })) } : {}),
		// `mode` is v1.14's word, for an older keyholder; `level` is the real one.
		mode: legacyWord(mode),
		level: mode,
		// Full keys only (v1.16.2, job6.md §4): what is planted in her.
		...(mode === "full" ? { planted: plantedForKeyholder(member) } : {}),
	};
}

function reply(to: number, mode: KeyMode | null, result?: { ok: boolean; text: string }): void {
	sendHiddenMessage(
		{
			type: "state-response",
			...presenceFields(),
			...(mode ? { keyholder: legacyWord(mode), keyLevel: mode, settings: snapshotFor(to, mode) } : {}),
			...(result ? { settingsResult: result } : {}),
		},
		to,
	);
}

// --- Requests for her keys (v1.16.1, job6.md §3) ---------------------------------------------------
// Anyone here may ask for her keys at a level; she answers in a popup (ask.ts), and no answer in 30 s
// is a Decline (DW). Nothing changes unless she clicks Accept. One ask per person every
// KEY_REQUEST_GAP_MS, checked on her side whatever the asker's client does. Under her own locks her
// list is read-only, so the request is refused and she is told it came.

/** What each level lets a keyholder do, in plain words. Shared with commands.ts. */
export const KEY_LEVEL_WORDS: Record<KeyMode, string> = {
	minimal: "minimal keys: they can only switch your settings OFF",
	moderate: "moderate keys: they can switch things off, and shape your trance (Trance Defaults, Awareness, how it looks and its pace)",
	full: "full keys: they can switch everything they reach on and off, including your Triggers tab choices, trust fading and your Depth tab",
};
/** How long before the same person may ask again. */
export const KEY_REQUEST_GAP_MS = 3 * 60_000;
/** The first version that answers a request; older ones would say "not your keyholder". */
export const KEY_REQUEST_SINCE = "1.16.1";
const requestedFrom = new Map<number, number>();

function herName(): string {
	return (Player?.Nickname || Player?.Name || "They") as string;
}

/** Answer one request on her side. Returns what happened, for the suite. */
function handleKeyRequest(sender: number, message: any): string {
	const who = nameOf(sender);
	const current = keyModeFor(sender);
	const result = (ok: boolean, text: string) =>
		sendHiddenMessage({ type: "state-response", ...presenceFields(), keyRequestResult: { ok, text } }, sender);
	const level = KEY_LEVELS.find((l) => l === message?.level) ?? null;
	if (!level || !characterFor(sender)) {
		result(false, "That request did not make sense to their ECHS.");
		return "bad";
	}
	if (keysLocked()) {
		result(false, "Who holds their keys is locked right now, so they can't give keys.");
		tellPlayer(`${who} asked for your keys (${level}), but who holds your keys is locked, so you can't give them now.`);
		return "locked";
	}
	if (ownLocked()) {
		result(false, "Their settings are locked right now, so they can't give keys.");
		tellPlayer(`${who} asked for your keys (${level}), but your settings are locked, so you can't give them now.`);
		return "locked";
	}
	if (current && keyRank(current) >= keyRank(level)) {
		result(false, `You already hold their keys (${current}).`);
		return "has";
	}
	const now = Date.now();
	if (now - (requestedFrom.get(sender) ?? -Infinity) < KEY_REQUEST_GAP_MS) {
		result(false, "You asked them recently. Wait a few minutes before asking again.");
		return "too soon";
	}
	if (askOpen()) {
		result(false, "They are answering another question. Try again in a moment.");
		return "busy";
	}
	const asked = askPlayer({
		title: `${who} asks for your keys`,
		lines: [
			`They want ${KEY_LEVEL_WORDS[level]}.`,
			"A keyholder can change your ECHS settings while you're in a room together, even under Extreme, and can end your Extreme lock. You can take your keys back at any time.",
		],
		accept: `Give ${level} keys`,
		decline: "Decline",
	});
	if (!asked) {
		result(false, "Their ECHS could not show them the request.");
		return "no page";
	}
	requestedFrom.set(sender, now);
	log(`${who} (#${sender}) asked for ${level} keys`);
	asked.then((answer) => {
		if (answer !== "accept") {
			result(false, answer === "timeout" ? `${herName()} didn't answer in time.` : `${herName()} declined.`);
			if (answer === "timeout") tellPlayer(`${who}'s request for your keys timed out, so nothing changed.`);
			return;
		}
		// Checked again now: a lock may have begun while the box was up.
		if (ownLocked() || keysLocked()) {
			result(false, "Their settings locked before they could answer, so nothing changed.");
			tellPlayer("Your settings are locked now, so the keys were not given.");
			return;
		}
		if (!setKeyholder(sender, who, level)) {
			result(false, "They already have the most keyholders allowed.");
			tellPlayer("You already have the most keyholders allowed (10). Take someone's keys back first.");
			return;
		}
		announceKeysTo(sender);
		result(true, `${herName()} gave you ${level} keys.`);
		tellPlayer(`You gave ${who} ${KEY_LEVEL_WORDS[level]}. Take them back any time with /echs keyholder remove ${who}.`);
		log(`gave ${who} (#${sender}) ${level} keys on request`);
	});
	return "asked";
}

/** When each keyholder last asked her something with a popup (lock, keys lock, Extreme), by kind,
 * so a refused ask can't be repeated at once. */
const lockAskedBy = new Map<string, number>();

type AskedChange = {
	/** For the rate limit, and the log. */
	kind: string;
	title: string;
	lines: string[];
	accept: string;
	/** Refuse before asking (already locked, and so on), or null. */
	refusal: () => string | null;
	/** Make the change after she accepts. Returns what she is told and what the keyholder is told. */
	apply: () => { her: string; them: string; what: string };
};

/** A full keyholder asks for something that needs her Accept (v1.16.2 job6.md §5, v1.16.3 §6 and the
 * keys lock). She answers in the ask.ts popup; no answer in 30 s is a no. `skipAsk` (her BC owner and
 * the keys lock, DW 2026-11-22: "Owner does not need get permission") applies it at once. */
function handleAskedChange(sender: number, mode: KeyMode, who: string, c: AskedChange, skipAsk = false): string {
	const say = (ok: boolean, text: string) => reply(sender, mode, { ok, text });
	if (mode !== "full") {
		const text = `Your keys are ${mode}: that needs full keys.`;
		say(false, text);
		return text;
	}
	const refused = c.refusal();
	if (refused) {
		say(false, refused);
		return refused;
	}
	const done = () => {
		const r = c.apply();
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what: r.what });
		tellPlayer(r.her);
		log(`keyholder ${sender}: ${c.kind} applied`);
		say(true, r.them);
	};
	if (skipAsk) {
		done();
		return "applied";
	}
	const now = Date.now();
	const rateKey = `${c.kind}:${sender}`;
	if (now - (lockAskedBy.get(rateKey) ?? -Infinity) < KEY_REQUEST_GAP_MS) {
		const text = "You asked them recently. Wait a few minutes before asking again.";
		say(false, text);
		return text;
	}
	if (askOpen()) {
		const text = "They are answering another question. Try again in a moment.";
		say(false, text);
		return text;
	}
	const asked = askPlayer({ title: c.title, lines: c.lines, accept: c.accept, decline: "Decline" });
	if (!asked) {
		const text = "Their ECHS could not show them the request.";
		say(false, text);
		return text;
	}
	lockAskedBy.set(rateKey, now);
	log(`${who} (#${sender}) asked: ${c.kind}`);
	asked.then((answer) => {
		if (answer !== "accept") {
			say(false, answer === "timeout" ? `${herName()} didn't answer in time.` : `${herName()} declined.`);
			if (answer === "timeout") tellPlayer(`${who}'s request ("${c.title}") timed out, so nothing changed.`);
			return;
		}
		// Checked again now: they may have lost their keys, or it changed, while the box was up.
		if (keyModeFor(sender) !== "full") {
			say(false, "You no longer hold their full keys, so nothing changed.");
			tellPlayer(`${who} no longer holds your full keys, so nothing changed.`);
			return;
		}
		const late = c.refusal();
		if (late) {
			say(false, late);
			return;
		}
		done();
	});
	return "asked";
}

/** The keyholder lock on her settings (job6.md §5, DW: "Yes, but you must accept"). */
function settingsLockChange(sender: number, who: string): AskedChange {
	return {
		kind: "settings lock",
		title: `${who} asks to lock your settings`,
		lines: [
			"While locked, you can't change your ECHS settings; your keyholders still can. Any of your full keyholders can unlock them, and you can't take " + who + "'s keys back until then.",
			`It ends on its own if ${who} isn't in a room with you for 7 days. /echs safeword always works, you can still switch ECHS off, and /echs reset confirm still wipes everything.`,
		],
		accept: "Lock my settings",
		refusal: () => {
			const h = keyLockHolder();
			return h ? `Their settings are already locked${h.id === sender ? " by you" : ` by ${h.name}`}.` : null;
		},
		apply: () => {
			setKeyLock(sender, who);
			return {
				her: `${who} locked your settings. Any of your full keyholders can unlock them; it ends on its own if ${who} isn't in a room with you for 7 days. /echs safeword always works.`,
				them: `${herName()} agreed: their settings are locked.`,
				what: "locked your settings (you agreed)",
			};
		},
	};
}

/** The keys lock (v1.16.3, DW 2026-11-22): she can't give or take back keys. */
function keysLockChange(sender: number, who: string, byOwner: boolean): AskedChange {
	return {
		kind: "keys lock",
		title: `${who} asks to lock who holds your keys`,
		lines: [
			"While locked, you can't give anyone your keys or take anyone's back, and nobody can ask you for them. Your keyholders keep what they have.",
			`Any of your full keyholders can unlock it. It ends on its own if ${who} isn't in a room with you for 7 days. /echs safeword always works, and /echs reset confirm still wipes everything.`,
		],
		accept: "Lock my keys",
		refusal: () => {
			const h = keysLockHolder();
			return h ? `Who holds their keys is already locked${h.id === sender ? " by you" : ` by ${h.name}`}.` : null;
		},
		apply: () => {
			setKeyLock(sender, who, Date.now(), "keys");
			return {
				her: `${who}${byOwner ? " (your owner)" : ""} locked who holds your keys: you can't give or take back keys until a full keyholder unlocks it. It ends on its own if ${who} isn't in a room with you for 7 days.`,
				them: byOwner ? `As their owner, you locked who holds their keys.` : `${herName()} agreed: who holds their keys is locked.`,
				what: byOwner ? "locked who holds your keys (as your owner)" : "locked who holds your keys (you agreed)",
			};
		},
	};
}

/** Start or extend her Extreme lock (job6.md §6, DW: "Yes, with your acceptance"): the wizard's
 * warning in the popup; the same lock as the wizard's (a trial first, then 30 days at a time). */
function extremeChange(sender: number, who: string): AskedChange {
	const extending = extremeLocked();
	return {
		kind: "extreme",
		title: extending ? `${who} asks to extend your Extreme lock by ${EXTREME_MONTH_DAYS} days` : `${who} asks to put you under Extreme`,
		lines: extending
			? [
					`Your Extreme lock would run ${EXTREME_MONTH_DAYS} days longer than it does now.`,
					...extremeWarning().slice(1, 3),
				]
			: extremeWarning(),
		accept: extending ? `Extend by ${EXTREME_MONTH_DAYS} days` : "Start Extreme",
		// Asked on its own terms: if it was not locked when asked, it starts; if it was, it extends.
		refusal: () => (extremeLocked() !== extending ? "Their Extreme lock changed while they were deciding, so nothing changed. Ask again." : null),
		apply: () => {
			const lock = extending ? extendExtremeLock() : startExtremeLock("trial");
			const until = new Date(lock.until).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
			return {
				her: extending
					? `${who} extended your Extreme lock (you agreed): it now runs until ${until}. /echs safeword always ends a trance.`
					: `${who} put you under Extreme (you agreed): your settings are read-only until ${until}. /echs safeword always ends a trance.`,
				them: extending ? `${herName()} agreed: their Extreme lock now runs until ${until}.` : `${herName()} agreed: they are under Extreme until ${until}.`,
				what: extending ? `extended your Extreme lock to ${until} (you agreed)` : `started your Extreme lock, until ${until} (you agreed)`,
			};
		},
	};
}

/** Taking someone else's keys back (v1.16.3 owner; v1.16.4 any full keyholder, DW 2026-11-22: "Any
 * full keyholder with a popup, owner no popup"). Her BC owner at full keys does it outright; any other
 * full keyholder needs her Accept. Never the one holding her settings lock while it holds (that lock
 * promises they keep full keys), and not by a non-owner while her keys lock holds (accepting would
 * be her taking keys back, which that lock stops). */
function removeKeyholderChange(sender: number, who: string, id: number, byOwner: boolean): AskedChange {
	const name = () => listKeyholders().find((k) => k.id === id)?.name ?? `#${id}`;
	return {
		kind: `remove keyholder ${id}`,
		title: `${who} asks to take ${name()}'s keys back`,
		lines: [
			`${name()} would no longer hold your keys, and could no longer change your settings. You can give them keys again later.`,
		],
		accept: `Take ${name()}'s keys back`,
		refusal: () => {
			const entry = listKeyholders().find((k) => k.id === id);
			if (!entry || id === sender) return "That person doesn't hold their keys.";
			if (keyLockHolder()?.id === id) return `${entry.name} locked their settings, so they keep their keys until a full keyholder unlocks them.`;
			if (!byOwner && keysLocked()) return "Who holds their keys is locked, so only their owner can take keys back.";
			return null;
		},
		apply: () => {
			const n = name();
			removeKeyholder(id);
			announceKeysTo(id);
			return {
				her: byOwner
					? `${who} (your owner) took ${n}'s keys back. They can no longer change your settings.`
					: `${who} took ${n}'s keys back (you agreed). They can no longer change your settings.`,
				them: `Done: ${n} no longer holds their keys.`,
				what: byOwner ? `took ${n}'s keys back (as your owner)` : `took ${n}'s keys back (you agreed)`,
			};
		},
	};
}

/** Any full keyholder lifts a lock: her settings (job6.md §5) or who holds her keys (v1.16.3). */
function handleUnlock(sender: number, mode: KeyMode, who: string, kind: LockKind): string {
	const things = kind === "settings" ? "their settings" : "who holds their keys";
	if (mode !== "full") {
		const text = `Your keys are ${mode}: unlocking ${things} needs full keys.`;
		reply(sender, mode, { ok: false, text });
		return text;
	}
	const holder = keyLockHolder(Date.now(), kind);
	if (!holder) {
		reply(sender, mode, { ok: true, text: kind === "settings" ? "Their settings are not locked by a keyholder." : "Who holds their keys is not locked." });
		return "not locked";
	}
	clearKeyLock(kind);
	const base = kind === "settings" ? "unlocked your settings" : "unlocked who holds your keys";
	const what = holder.id === sender ? base : `${base} (${holder.name} had locked ${kind === "settings" ? "them" : "it"})`;
	noteRemoteChange({ at: Date.now(), by: sender, byName: who, what });
	tellPlayer(`${who} (your keyholder) ${what}. ${kind === "settings" ? "They are yours to change again." : "You can give and take back keys again."}`);
	log(`keyholder ${sender} lifted the ${kind} lock`);
	reply(sender, mode, { ok: true, text: kind === "settings" ? "Their settings are unlocked." : "Who holds their keys is unlocked." });
	return "unlocked";
}

/** A keyholder's request, on this client as the SUBJECT. Returns what was said back, for the suite. */
export function handleSettingsRequest(sender: number, message: any): string {
	// A request for her keys comes from someone who does not hold them yet, so before the check below.
	if (message?.action === "request-keys") return handleKeyRequest(sender, message);
	const mode = keyModeFor(sender);
	const who = nameOf(sender);
	if (!mode) {
		const text = "They have not made you their keyholder, so you cannot change their settings.";
		reply(sender, null, { ok: false, text });
		return text;
	}
	const action = String(message?.action ?? "");
	if (action === "read") {
		reply(sender, mode);
		return "read";
	}
	if (action === "set") {
		const row = remoteRows().find((r) => r.key === message?.key);
		if (!row) {
			const text = "That is not something a keyholder can change.";
			reply(sender, mode, { ok: false, text });
			return text;
		}
		const value = message?.value === true;
		const current = !!getFeatures()[row.key];
		if (value === current) {
			reply(sender, mode, { ok: true, text: `${row.label} is already ${value ? "on" : "off"}.` });
			return "unchanged";
		}
		const moderateOk = MODERATE_TABS.includes(row.tab);
		const fullOnly = FULL_ONLY_TABS.includes(row.tab);
		if (!keyLevelAllows(mode, !value, moderateOk, fullOnly)) {
			const text = fullOnly
				? `Your keys are ${mode}: "${row.label}" is on their General tab, which needs full keys.`
				: `Your keys are ${mode}: turning on "${row.label}" needs ${levelNeeded(moderateOk)} keys.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		if (value && row.needs && !getFeatures()[row.needs]) {
			const needsLabel = remoteRows().find((r) => r.key === row.needs)?.label ?? row.needs;
			const text = `"${row.label}" needs "${needsLabel}" on first.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		setFeature(row.key as keyof FeatureToggles, value);
		onToggle(row.key as keyof FeatureToggles, value);
		const what = `turned ${value ? "on" : "off"} ${row.label}`;
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what });
		tellPlayer(`${who} (your keyholder) ${what}.`);
		log(`keyholder ${sender} ${what}`);
		reply(sender, mode, { ok: true, text: `Done: ${row.label} is now ${value ? "on" : "off"}.` });
		return "set";
	}
	if (action === "choose") {
		const choice = remoteChoices().find((c) => c.key === message?.key);
		if (!choice) {
			const text = "That is not something a keyholder can change.";
			reply(sender, mode, { ok: false, text });
			return text;
		}
		const value = typeof message?.value === "string" ? message.value : "";
		// A number choice (v1.16.2: a depth, the trigger duration) takes any whole number in its range,
		// written plainly ("45", not "45.0" or "4.5e1"), so what she is told is exactly what is saved.
		const r = choice.range;
		const valid = r
			? /^\d{1,5}$/.test(value) && String(Number(value)) === value && Number(value) >= r.min && Number(value) <= r.max
			: choice.options.some((o) => o.key === value);
		const option = valid ? { key: value, label: remoteChoiceLabel(choice, value) } : null;
		if (!option) {
			const text = `That is not one of the choices for ${choice.label}.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		if (choice.get() === value) {
			reply(sender, mode, { ok: true, text: `${choice.label} is already ${option.label}.` });
			return "unchanged";
		}
		if (!keyLevelAllows(mode, value === choice.off, !!choice.moderate)) {
			const offLabel = choice.off !== undefined ? choice.options.find((o) => o.key === choice.off)?.label : undefined;
			const needed = levelNeeded(!!choice.moderate);
			const text = offLabel
				? `Your keys are ${mode}: for ${choice.label} you can only choose "${offLabel}". Anything else needs ${needed} keys.`
				: `Your keys are ${mode}: changing ${choice.label} needs ${needed} keys.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		choice.set(value);
		const what = choice.key === "depthDefaults" ? "reset your Depth requirements to their defaults" : `set ${choice.label} to ${option.label}`;
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what });
		tellPlayer(`${who} (your keyholder) ${what}.`);
		log(`keyholder ${sender} ${what}`);
		reply(sender, mode, { ok: true, text: `Done: ${choice.label} is now ${remoteChoiceLabel(choice, choice.get())}.` });
		return "chosen";
	}
	if (action === "lock") return handleAskedChange(sender, mode, who, settingsLockChange(sender, who));
	if (action === "unlock") return handleUnlock(sender, mode, who, "settings");
	// Her BC owner holding full keys locks who holds her keys without asking (DW 2026-11-22).
	if (action === "lock-keys") return handleAskedChange(sender, mode, who, keysLockChange(sender, who, isBcOwner(sender)), isBcOwner(sender));
	if (action === "unlock-keys") return handleUnlock(sender, mode, who, "keys");
	if (action === "extreme") return handleAskedChange(sender, mode, who, extremeChange(sender, who));
	if (action === "remove-keyholder") {
		const byOwner = isBcOwner(sender);
		return handleAskedChange(sender, mode, who, removeKeyholderChange(sender, who, Number(message?.id), byOwner), byOwner);
	}
	if (action === "remove-trigger") {
		if (mode !== "full") {
			const text = `Your keys are ${mode}: removing a planted trigger needs full keys.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		const id = typeof message?.id === "string" ? message.id : "";
		const t = listTriggers().find((x) => !x.spent && triggerId(x.key) === id);
		if (!t) {
			const text = "That trigger is no longer there.";
			reply(sender, mode, { ok: false, text });
			return text;
		}
		const refusal = removeRefusal(t, sender);
		if (refusal) {
			reply(sender, mode, { ok: false, text: refusal });
			return refusal;
		}
		forgetTrigger(t.key);
		const planter = t.installedBy === sender ? "they" : t.installedByName || "someone";
		const word = getFeatures().showTriggerWords && t.phrase ? ` ("${t.phrase}")` : "";
		const what = `removed a trigger ${planter} planted in you${word}`;
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what });
		tellPlayer(`${who} (your keyholder) ${what}.`);
		log(`keyholder ${sender} removed a trigger planted by ${t.installedBy}`);
		reply(sender, mode, { ok: true, text: "Done: that trigger is gone." });
		return "removed";
	}
	if (action === "end-extreme") {
		if (!extremeLocked()) {
			reply(sender, mode, { ok: true, text: "Their Extreme lock is not on." });
			return "not locked";
		}
		clearExtremeLock();
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what: "ended your Extreme lock" });
		tellPlayer(`${who} (your keyholder) ended your Extreme lock. Your settings are editable again; nothing in them has changed.`);
		log(`keyholder ${sender} ended the Extreme lock`);
		reply(sender, mode, { ok: true, text: "Their Extreme lock is ended. Their settings are editable again." });
		return "ended";
	}
	reply(sender, mode, { ok: false, text: "Their ECHS did not understand that request." });
	return "unknown";
}

/** Tell one person, now, whether they hold her keys: after she adds, changes or removes them. */
export function announceKeysTo(member: number): void {
	if (!characterFor(member)) return;
	const mode = keyModeFor(member);
	sendHiddenMessage(
		// keysChanged (v1.16.36, review F6): this answer is news, so their ECHS says so in chat. The
		// same fields on an ordinary answer (joining a room, reading settings) are not.
		{ type: "state-response", ...presenceFields(), keyholder: mode ? legacyWord(mode) : "none", keyLevel: mode ?? "none", keysChanged: true },
		member,
	);
}

// --- Keyholder side --------------------------------------------------------------------------------

/** Whose keys this client holds, as their answers last said, and their settings when asked. */
const holds = new Map<number, KeyMode>();
const snapshots = new Map<number, { snap: SettingsSnapshot; at: number }>();
const results = new Map<number, { ok: boolean; text: string; at: number }>();
const askedAt = new Map<number, number>();
/** How long to wait for an answer before saying they did not answer. */
export const SETTINGS_ASK_MS = 3000;

/** The level an answer names: v1.16's `level`, or from an older subject v1.14's word. Their "grant"
 * meant everything their ECHS reaches, so it reads as full here (unlike a saved "grant", which a
 * subject's own storage turns into moderate). */
function levelFromWire(level: unknown, legacy: unknown): KeyMode | null {
	if (level === "minimal" || level === "moderate" || level === "full") return level;
	if (legacy === "take") return "minimal";
	if (legacy === "grant") return "full";
	return null;
}

/** A state-response arrived (remote.ts). Picks out what concerns keys. Cleaned: it came over the wire. */
export function receiveKeyholderFields(sender: number, message: any): void {
	const held = levelFromWire(message?.keyLevel, message?.keyholder);
	const before = holds.get(sender);
	if (message?.keyholder === "none" || message?.keyLevel === "none") {
		holds.delete(sender);
		snapshots.delete(sender);
	} else if (held) holds.set(sender, held);
	// Told in chat when they give, change or take back our keys (v1.16.36, review F6): the Keys tab
	// just grew a section, below everything else, and nobody said so.
	const after = holds.get(sender);
	if (message?.keysChanged === true && after !== before) {
		const name = nameOf(sender);
		tellPlayer(
			!after
				? `${name} took their keys back.`
				: !before
					? `${name} gave you ${after} keys to their ECHS settings. They're on the popup's Keys tab.`
					: `${name} changed your keys to ${after}.`,
		);
	}
	const s = message?.settings;
	if (s && Array.isArray(s.boxes) && s.boxes.length <= 80) {
		const boxes = s.boxes
			.filter((b: any) => b && typeof b.key === "string" && b.key.length <= 40)
			.map((b: any) => ({ key: b.key as string, on: b.on === true }));
		// Choices arrived in v1.14.1; an older subject sends none, and the popup shows none.
		// 80: v1.16.2 sends about 45 (the Depth tab is most of them).
		const choices = (Array.isArray(s.choices) ? s.choices.slice(0, 80) : [])
			.filter((c: any) => c && typeof c.key === "string" && c.key.length <= 40 && typeof c.value === "string" && c.value.length <= 40)
			.map((c: any) => ({ key: c.key as string, value: c.value as string }));
		// What is planted in her (v1.16.2, full keys only): cleaned like the planter's list (planted.ts).
		const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
		const planted: HeldTrigger[] | undefined = Array.isArray(s.planted)
			? s.planted
					.slice(0, MAX_PLANTED_ENTRIES)
					.filter((e: any) => e && typeof e === "object" && typeof e.id === "string" && /^[0-9a-f]{8}$/.test(e.id))
					.map((e: any) => ({
						id: e.id,
						word: str(e.word, 100),
						when: str(e.when, 100),
						does: (Array.isArray(e.does) ? e.does : []).slice(0, 8).map((d: unknown) => str(d, 120)),
						strength: str(e.strength, 60),
						once: e.once === true,
						holding: e.holding === true,
						by: str(e.by, 60),
						removable: e.removable === true,
						why: str(e.why, 200),
					}))
			: undefined;
		const keyLock = str(s.keyLock, 60);
		const keysLock = str(s.keysLock, 60);
		const keyholders = Array.isArray(s.keyholders)
			? s.keyholders
					.slice(0, 12)
					.filter((k: any) => k && Number.isInteger(k.id) && k.id > 0 && KEY_LEVELS.includes(k.mode))
					.map((k: any) => ({ id: k.id as number, name: str(k.name, 60) || `#${k.id}`, mode: k.mode as KeyMode }))
			: undefined;
		snapshots.set(sender, { snap: { boxes, choices, extreme: s.extreme === true, mode: levelFromWire(s.level, s.mode) ?? "minimal", ...(planted ? { planted } : {}), ...(keyLock ? { keyLock } : {}), ...(keysLock ? { keysLock } : {}), ...(keyholders ? { keyholders } : {}) }, at: Date.now() });
		askedAt.delete(sender);
	}
	// The answer to our request for their keys (v1.16.1): said in chat, since the popup may be shut.
	const kr = message?.keyRequestResult;
	if (kr && typeof kr.text === "string") {
		const text = kr.text.slice(0, 200);
		results.set(sender, { ok: kr.ok === true, text, at: Date.now() });
		tellPlayer(`${nameOf(sender)}: ${text}`);
	}
	const r = message?.settingsResult;
	if (r && typeof r.text === "string") {
		results.set(sender, { ok: r.ok === true, text: r.text.slice(0, 200), at: Date.now() });
		askedAt.delete(sender);
	}
}

/** Everyone here whose keys this client holds. */
export function heldKeys(): { id: number; name: string; mode: KeyMode }[] {
	return [...holds.entries()].filter(([id]) => characterFor(id)).map(([id, mode]) => ({ id, name: nameOf(id), mode }));
}

export function settingsOf(member: number): SettingsSnapshot | null {
	return snapshots.get(member)?.snap ?? null;
}

export function lastResult(member: number): { ok: boolean; text: string; at: number } | null {
	return results.get(member) ?? null;
}

/** "asking" while a request is out and unanswered, "silent" once it has waited too long. */
export function askState(member: number, now: number = Date.now()): "asking" | "silent" | null {
	const at = askedAt.get(member);
	if (at == null) return null;
	return now - at < SETTINGS_ASK_MS ? "asking" : "silent";
}

function ask(member: number, body: Record<string, unknown>): void {
	askedAt.set(member, Date.now());
	sendHiddenMessage({ type: "remote-request", feature: "settings", ...body }, member);
}

export function requestSettings(member: number): void {
	ask(member, { action: "read" });
}
export function requestSetting(member: number, key: string, value: boolean): void {
	ask(member, { action: "set", key, value });
}
export function requestChoice(member: number, key: string, value: string): void {
	ask(member, { action: "choose", key, value });
}
/** Can this person answer a request for their keys? Their ECHS must be new enough. */
export function canRequestKeys(member: number): boolean {
	const v = peerFor(member)?.version ?? "";
	return /^\d+(\.\d+)*$/.test(v) && compareVersions(v, KEY_REQUEST_SINCE) >= 0;
}

/** When we last asked each person for their keys, so a second click does not send again at once. */
const keysAskedOf = new Map<number, number>();

/** Ask someone for their keys. Returns what to tell the player. */
export function requestKeys(member: number, level: KeyMode, now: number = Date.now()): string {
	const name = nameOf(member);
	if (!characterFor(member)) return `${name} is not in this room.`;
	if (!canRequestKeys(member)) return `${name}'s ECHS can't answer a request for keys (they need v${KEY_REQUEST_SINCE} or newer).`;
	const since = now - (keysAskedOf.get(member) ?? -Infinity);
	if (since < KEY_REQUEST_GAP_MS) return `You asked ${name} recently. Try again in ${Math.ceil((KEY_REQUEST_GAP_MS - since) / 60_000)} min.`;
	keysAskedOf.set(member, now);
	sendHiddenMessage({ type: "remote-request", feature: "settings", action: "request-keys", level }, member);
	return `Asked ${name} for ${level} keys. They have 30 seconds to answer.`;
}

export function requestEndExtreme(member: number): void {
	ask(member, { action: "end-extreme" });
}

/** Ask her to let us lock her settings (full keys, v1.16.2); she answers in a popup. */
export function requestLock(member: number): void {
	ask(member, { action: "lock" });
}
/** Unlock her settings (any full keyholder, v1.16.2). */
export function requestUnlock(member: number): void {
	ask(member, { action: "unlock" });
}
/** Lock who holds her keys (v1.16.3): her owner outright, anyone else with her Accept. */
export function requestLockKeys(member: number): void {
	ask(member, { action: "lock-keys" });
}
export function requestUnlockKeys(member: number): void {
	ask(member, { action: "unlock-keys" });
}
/** Take someone else's keys back (full keys; v1.16.4). Her owner at once; anyone else, she must accept. */
export function requestRemoveKeyholder(member: number, id: number): void {
	ask(member, { action: "remove-keyholder", id });
}
/** Start or extend her Extreme lock (v1.16.3, job6.md §6); she answers in a popup. */
export function requestExtreme(member: number): void {
	ask(member, { action: "extreme" });
}

/** Ask her ECHS to remove one planted trigger (full keys, v1.16.2). Her side decides. */
export function requestRemoveTrigger(member: number, id: string): void {
	ask(member, { action: "remove-trigger", id });
}

/** For the suite. */
export function resetKeyholderViews(): void {
	keysAskedOf.clear();
	lockAskedBy.clear();
	requestedFrom.clear();
	holds.clear();
	snapshots.clear();
	results.clear();
	askedAt.clear();
}
