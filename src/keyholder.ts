// Keyholders: changing someone's ECHS settings for them (v1.14.0; job5.md; DW 2026-11-21, from a
// player's request about people locking themselves into Extreme with nobody able to help).
//
// DW'S DECISIONS (job5.md):
//   - A keyholder is her BC owner, if she has said the owner may be one, or anyone she names.
//   - Per keyholder she chooses "take" (may only switch things OFF) or "grant" (may switch them on).
//   - It works at any time, and through her Extreme lock; a keyholder may also END that lock.
//   - It reaches the tick boxes on Permissions, Trance Defaults, Awareness and Triggers (menu.ts
//     remoteRows), nothing else.
//   - v1.14.1 (DW 2026-11-21): also the choices that are not tick boxes (menu.ts remoteChoices):
//     every Inductions control, and on Trance Defaults the screen effect (the spiral), her eyes, her
//     eye colour and the pulse colour. "take" may only set one to its off choice (None, Unchanged,
//     Ask me, Refuse, toy mode Off, Never deeper); one with no off (attempts, induction time, who toy
//     mode is for, pulse colour) needs "grant".
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
	noteRemoteChange,
	clearExtremeLock,
} from "./storage";
import { remoteRows, remoteChoices, onToggle } from "./menu";
import { extremeLocked } from "./extreme";
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
	if (named === "grant" || owner === "grant") return "grant";
	return named ?? owner;
}

/** The fields her answer to a state-query carries for that asker: whether they hold her keys. */
export function keyholderFields(asker: number): { keyholder?: KeyMode } {
	const mode = keyModeFor(asker);
	return mode ? { keyholder: mode } : {};
}

export type SettingsSnapshot = { boxes: { key: string; on: boolean }[]; choices: { key: string; value: string }[]; extreme: boolean; mode: KeyMode };

function snapshotFor(member: number, mode: KeyMode): SettingsSnapshot {
	const f = getFeatures();
	return {
		boxes: remoteRows().map((r) => ({ key: r.key, on: !!f[r.key] })),
		choices: remoteChoices().map((c) => ({ key: c.key, value: c.get() })),
		extreme: extremeLocked(),
		mode,
	};
}

function reply(to: number, mode: KeyMode | null, result?: { ok: boolean; text: string }): void {
	sendHiddenMessage(
		{
			type: "state-response",
			hypnoEnabled: getFeatures().hypnoEnabled,
			...presenceFields(),
			...(mode ? { keyholder: mode, settings: snapshotFor(to, mode) } : {}),
			...(result ? { settingsResult: result } : {}),
		},
		to,
	);
}

/** A keyholder's request, on this client as the SUBJECT. Returns what was said back, for the suite. */
export function handleSettingsRequest(sender: number, message: any): string {
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
		if (value && mode !== "grant") {
			const text = `You can only switch their settings off; turning on "${row.label}" needs them to let you grant.`;
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
		const option = choice.options.find((o) => o.key === value);
		if (!option) {
			const text = `That is not one of the choices for ${choice.label}.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		if (choice.get() === value) {
			reply(sender, mode, { ok: true, text: `${choice.label} is already ${option.label}.` });
			return "unchanged";
		}
		if (mode !== "grant" && value !== choice.off) {
			const offLabel = choice.options.find((o) => o.key === choice.off)?.label;
			const text = offLabel
				? `You can only switch their settings off; for ${choice.label} that is "${offLabel}". Anything else needs them to let you grant.`
				: `Changing ${choice.label} needs them to let you grant.`;
			reply(sender, mode, { ok: false, text });
			return text;
		}
		choice.set(value);
		const what = `set ${choice.label} to ${option.label}`;
		noteRemoteChange({ at: Date.now(), by: sender, byName: who, what });
		tellPlayer(`${who} (your keyholder) ${what}.`);
		log(`keyholder ${sender} ${what}`);
		reply(sender, mode, { ok: true, text: `Done: ${choice.label} is now ${option.label}.` });
		return "chosen";
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
	sendHiddenMessage({ type: "state-response", hypnoEnabled: getFeatures().hypnoEnabled, ...presenceFields(), keyholder: keyModeFor(member) ?? "none" }, member);
}

// --- Keyholder side --------------------------------------------------------------------------------

/** Whose keys this client holds, as their answers last said, and their settings when asked. */
const holds = new Map<number, KeyMode>();
const snapshots = new Map<number, { snap: SettingsSnapshot; at: number }>();
const results = new Map<number, { ok: boolean; text: string; at: number }>();
const askedAt = new Map<number, number>();
/** How long to wait for an answer before saying they did not answer. */
export const SETTINGS_ASK_MS = 3000;

const isMode = (m: unknown): m is KeyMode => m === "take" || m === "grant";

/** A state-response arrived (remote.ts). Picks out what concerns keys. Cleaned: it came over the wire. */
export function receiveKeyholderFields(sender: number, message: any): void {
	if (message?.keyholder === "none") {
		holds.delete(sender);
		snapshots.delete(sender);
	} else if (isMode(message?.keyholder)) holds.set(sender, message.keyholder);
	const s = message?.settings;
	if (s && Array.isArray(s.boxes) && s.boxes.length <= 80) {
		const boxes = s.boxes
			.filter((b: any) => b && typeof b.key === "string" && b.key.length <= 40)
			.map((b: any) => ({ key: b.key as string, on: b.on === true }));
		// Choices arrived in v1.14.1; an older subject sends none, and the popup shows none.
		const choices = (Array.isArray(s.choices) ? s.choices.slice(0, 20) : [])
			.filter((c: any) => c && typeof c.key === "string" && c.key.length <= 40 && typeof c.value === "string" && c.value.length <= 40)
			.map((c: any) => ({ key: c.key as string, value: c.value as string }));
		snapshots.set(sender, { snap: { boxes, choices, extreme: s.extreme === true, mode: isMode(s.mode) ? s.mode : "take" }, at: Date.now() });
		askedAt.delete(sender);
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
export function requestEndExtreme(member: number): void {
	ask(member, { action: "end-extreme" });
}

/** For the suite. */
export function resetKeyholderViews(): void {
	holds.clear();
	snapshots.clear();
	results.clear();
	askedAt.clear();
}
