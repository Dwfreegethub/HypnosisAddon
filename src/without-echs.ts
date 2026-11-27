// Playing without ECHS (v1.20.0, DW 2026-11-26): "leave everything off by default and have an option
// somewhere to report you logging in without ECHS to your BC owner or BC full keyholders", then "We
// can beep the person if they are online and then again when you see them in person".
//
// ECHS cannot see a session it is not running in, so this compares afterwards. While the setting is
// on, ECHS keeps a small record on her account (its own ExtensionSettings key, SEEN_KEY): when it last
// ran, her last room as BC saved it, the items and locks she wears, and a fingerprint of her clothes.
// At the next login it compares that record with what BC loaded. BC saves those things itself, with
// or without ECHS, so a difference means something happened while ECHS was not running. Going
// offline changes none of them, so a gap alone is never reported. Checked against live R134:
//   - ChatRoom.js ChatRoomSetLastChatRoom: joining a room saves it as LastChatRoom (with "return to
//     last room" on); pressing Leave, or leaving the room search, saves null. Rejoining the same room
//     saves nothing new. So "logged in, rejoined, left" shows; "rejoined, closed the tab" does not.
//   - Login.js LoginResponse: everything (Appearance, LastChatRoom, ExtensionSettings, Ownership) is
//     set in LoginSetupPlayer before LoginDone, so the check runs straight after LoginResponse. A
//     ServerHandleRelog (a short disconnect) returns early and is not a new session.
//   - A timer lock that ran out while she was away is removed by BC itself: not reported.
// It can be fooled (her account data can be edited, a second account). It deters; it proves nothing.
//
// Who is told, and how: her BC owner and/or her full keyholders, by BC beep (server app.js
// AccountBeep: lands only if they have her on their friend list, in the same environment). Once when
// the server's OnlineFriends answer lists them (so it is known to land), and again the first time
// they are in a room with her. She is told each time it goes out. A report nobody received within
// 7 days is dropped and she is told so.

import { log, warn } from "./log";
import { tellPlayer } from "./notify";
import { getReportWithout, getWithoutReports, setWithoutReports, getOwnerKeyMode, listKeyholders, type ReportWithout, type WithoutReport } from "./storage";

export const SEEN_KEY = "HypnosisAddonSeen";
/** How often the record is brought up to date while ECHS runs. */
export const SEEN_POLL_MS = 10_000;
/** The record's time is refreshed this often even if nothing changed: the window it reports. */
export const SEEN_REFRESH_MS = 10 * 60_000;
/** How often the server is asked who is online while a report waits. */
export const ONLINE_ASK_MS = 5 * 60_000;
/** A report nobody received is dropped after this. */
export const REPORT_KEEP_MS = 7 * 24 * 60 * 60_000;
/** An in-person beep this soon after the online one is not sent again. */
export const SAME_BEEP_MS = 2 * 60_000;
const MAX_REPORTS = 20;

/** What ECHS saw last. items: group -> "Asset" or "Asset/Lock"; until: group -> a timer lock's end. */
export type Seen = { at: number; room: string; items: Record<string, string>; until?: Record<string, number>; clothes: string; names?: Record<string, string> };
export type Look = Omit<Seen, "at">;

function hash(s: string): string {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
	return h.toString(36);
}

/** What BC has on her now. Pure apart from reading the character given. */
export function lookOf(C: any): Look {
	const items: Record<string, string> = {};
	const until: Record<string, number> = {};
	const names: Record<string, string> = {};
	const clothes: string[] = [];
	for (const item of Array.isArray(C?.Appearance) ? C.Appearance : []) {
		const group = item?.Asset?.Group?.Name;
		const asset = item?.Asset?.Name;
		if (typeof group !== "string" || typeof asset !== "string") continue;
		if (group.startsWith("Item")) {
			const lock = item?.Property?.LockedBy;
			items[group] = typeof lock === "string" && lock ? `${asset}/${lock}` : asset;
			const t = item?.Property?.RemoveTimer;
			if (lock && typeof t === "number") until[group] = t;
			const desc = item?.Asset?.Description;
			if (typeof desc === "string" && desc && desc !== asset) names[asset] = desc.slice(0, 40);
			const gdesc = item?.Asset?.Group?.Description;
			if (typeof gdesc === "string" && gdesc && gdesc !== group) names[group] = gdesc.slice(0, 40);
		} else if (item?.Asset?.Group?.Clothing) {
			clothes.push(`${group}:${asset}`);
		}
	}
	const room = typeof C?.LastChatRoom?.Name === "string" ? C.LastChatRoom.Name : "";
	return { room, items, ...(Object.keys(until).length ? { until } : {}), clothes: hash(clothes.sort().join("|")), ...(Object.keys(names).length ? { names } : {}) };
}

/** Same as far as the comparison goes (the names are only for the words). */
export function sameLook(a: Look, b: Look): boolean {
	return a.room === b.room && a.clothes === b.clothes && JSON.stringify(sortKeys(a.items)) === JSON.stringify(sortKeys(b.items));
}

function sortKeys(o: Record<string, string>): [string, string][] {
	return Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
}

/** What changed between the record and now, as plain phrases. Empty: nothing shows she was on. */
export function differences(before: Seen, now: Look, nowMs: number): string[] {
	const out: string[] = [];
	if (before.room !== now.room) {
		if (before.room && !now.room) out.push(`left the room "${before.room}"`);
		else if (now.room) out.push(`was in the room "${now.room}"`);
	}
	const label = (names: Record<string, string> | undefined, key: string) => names?.[key] ?? now.names?.[key] ?? before.names?.[key] ?? key;
	const groups = new Set([...Object.keys(before.items ?? {}), ...Object.keys(now.items)]);
	const itemLines: string[] = [];
	for (const g of [...groups].sort()) {
		const was = before.items?.[g];
		const is = now.items[g];
		if (was === is) continue;
		const [wasAsset, wasLock] = (was ?? "").split("/");
		const [isAsset, isLock] = (is ?? "").split("/");
		const where = label(undefined, g);
		if (wasAsset !== isAsset) {
			if (!isAsset) itemLines.push(`${label(before.names, wasAsset)} taken off (${where})`);
			else if (!wasAsset) itemLines.push(`${label(now.names, isAsset)} put on (${where})`);
			else itemLines.push(`${label(before.names, wasAsset)} changed to ${label(now.names, isAsset)} (${where})`);
		} else if (wasLock && !isLock) {
			// BC takes a timer lock off itself once its time is up.
			const t = before.until?.[g];
			if (typeof t === "number" && t <= nowMs) continue;
			itemLines.push(`lock taken off the ${label(now.names, isAsset)} (${where})`);
		} else if (!wasLock && isLock) itemLines.push(`${label(now.names, isAsset)} locked (${where})`);
		else itemLines.push(`lock changed on the ${label(now.names, isAsset)} (${where})`);
	}
	if (itemLines.length) out.push(`restraints changed: ${itemLines.slice(0, 6).join(", ")}${itemLines.length > 6 ? ` and ${itemLines.length - 6} more` : ""}`);
	if (before.clothes !== now.clothes) out.push("clothes changed");
	return out;
}

export function parseSeen(raw: unknown): Seen | null {
	if (typeof raw !== "string" || !raw) return null;
	try {
		const s = JSON.parse(raw);
		if (!s || typeof s.at !== "number" || typeof s.room !== "string" || typeof s.clothes !== "string" || !s.items || typeof s.items !== "object") return null;
		return s as Seen;
	} catch {
		return null;
	}
}

function when(ms: number): string {
	try {
		return new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
	} catch {
		return new Date(ms).toISOString();
	}
}

/** The words they get. */
export function reportText(name: string, member: number, from: number, to: number, what: string[]): string {
	return `ECHS: ${name} (${member}) was on Bondage Club without ECHS some time between ${when(from)} and ${when(to)}. What shows it: ${what.join("; ")}.`.slice(0, 990);
}

/** Who her setting says to tell. Her own number never. */
export function recipientsFor(choice: ReportWithout, C: any = Player): { id: number; name: string }[] {
	const out: { id: number; name: string }[] = [];
	const add = (id: unknown, name: unknown) => {
		if (typeof id !== "number" || !(id > 0) || id === C?.MemberNumber || out.some((r) => r.id === id)) return;
		out.push({ id, name: typeof name === "string" && name ? name.slice(0, 60) : `#${id}` });
	};
	const own = C?.Ownership;
	let fullyOwned = false;
	try {
		fullyOwned = typeof C?.IsFullyOwned === "function" ? C.IsFullyOwned() === true : own?.Stage === 1;
	} catch {
		fullyOwned = own?.Stage === 1;
	}
	if ((choice === "owner" || choice === "both") && fullyOwned) add(own?.MemberNumber, own?.Name);
	if (choice === "full" || choice === "both") {
		if (fullyOwned && getOwnerKeyMode() === "full") add(own?.MemberNumber, own?.Name);
		for (const k of listKeyholders()) if (k.mode === "full") add(k.id, k.name);
	}
	return out;
}

// --- running ---------------------------------------------------------------------------------------

/** The member the login check ran for: once per login, not on a relog. */
let checkedFor = 0;
let lastWritten: Look | null = null;
let lastWrittenAt = 0;
let lastAsked = 0;
/** Lines for her that wait for a chat log. */
const toTell: string[] = [];

function say(line: string): void {
	toTell.push(line);
	flushTell();
}
function flushTell(): void {
	if (!toTell.length || typeof ServerPlayerIsInChatRoom !== "function" || !ServerPlayerIsInChatRoom()) return;
	for (const line of toTell.splice(0)) tellPlayer(line);
}

function loggedIn(): boolean {
	return typeof Player?.MemberNumber === "number" && Player.MemberNumber > 0 && !!Player.ExtensionSettings;
}

/** Writes the record now. */
export function writeSeen(now: number = Date.now()): void {
	if (!loggedIn()) return;
	const look = lookOf(Player);
	const seen: Seen = { at: now, ...look };
	try {
		Player.ExtensionSettings[SEEN_KEY] = JSON.stringify(seen);
		ServerPlayerExtensionSettingsSync(SEEN_KEY);
		lastWritten = look;
		lastWrittenAt = now;
	} catch (err) {
		warn("could not save the without-ECHS record:", err);
	}
}

/** Takes the record off her account (the setting was turned off). */
export function clearSeen(): void {
	lastWritten = null;
	lastWrittenAt = 0;
	if (!loggedIn() || Player.ExtensionSettings[SEEN_KEY] === undefined || Player.ExtensionSettings[SEEN_KEY] === "") return;
	try {
		Player.ExtensionSettings[SEEN_KEY] = "";
		ServerPlayerExtensionSettingsSync(SEEN_KEY);
	} catch (err) {
		warn("could not clear the without-ECHS record:", err);
	}
}

/** The check, once per login: compare, report, then start a fresh record. */
export function checkAtLogin(now: number = Date.now()): string[] {
	if (!loggedIn() || checkedFor === Player.MemberNumber) return [];
	checkedFor = Player.MemberNumber;
	const choice = getReportWithout();
	if (choice === "off") return [];
	let found: string[] = [];
	const before = parseSeen(Player.ExtensionSettings[SEEN_KEY]);
	if (before) {
		found = differences(before, lookOf(Player), now);
		if (found.length) report(choice, before.at, now, found);
	}
	writeSeen(now);
	return found;
}

function report(choice: ReportWithout, from: number, to: number, what: string[]): void {
	const name = (Player?.Nickname || Player?.Name || "You") as string;
	const text = reportText(name, Player.MemberNumber, from, to, what);
	const who = recipientsFor(choice);
	log(`without-ECHS: ${what.join("; ")}; telling ${who.map((w) => w.id).join(", ") || "nobody"}`);
	const head = `ECHS noticed you were on Bondage Club without it (between ${when(from)} and ${when(to)}: ${what.join("; ")}).`;
	if (!who.length) {
		const line = `${head} Your setting says to tell ${choice === "owner" ? "your BC owner" : choice === "full" ? "your full keyholders" : "your BC owner and full keyholders"}, but you have none, so nobody was told.`;
		say(line);
		showBeep(line);
		return;
	}
	const list = getWithoutReports();
	for (const w of who) list.push({ to: w.id, name: w.name, text, at: to });
	setWithoutReports(list.slice(-MAX_REPORTS));
	const line = `${head} ECHS will beep ${who.map((w) => w.name).join(", ")} about it when they are online, and again when they are in a room with you.`;
	say(line);
	showBeep(line);
	askOnline(to);
}

function showBeep(text: string): void {
	try {
		if (typeof ServerShowBeep === "function") ServerShowBeep(text, 15_000, {}, "ECHS");
	} catch {
		// the chat line carries it
	}
}

function beep(to: number, text: string): void {
	ServerSend("AccountBeep", { MemberNumber: to, BeepType: "", IsSecret: true, Message: text });
}

function askOnline(now: number = Date.now()): void {
	if (!getWithoutReports().some((r) => !r.beeped)) return;
	lastAsked = now;
	try {
		ServerSend("AccountQuery", { Query: "OnlineFriends" });
	} catch (err) {
		warn("could not ask who is online:", err);
	}
}

function inRoomWithHer(member: number): boolean {
	if (typeof ServerPlayerIsInChatRoom !== "function" || !ServerPlayerIsInChatRoom()) return false;
	return Array.isArray(ChatRoomCharacter) && ChatRoomCharacter.some((c: any) => c?.MemberNumber === member);
}

/** The server's OnlineFriends answer: beep each waiting one it lists. */
export function onOnlineFriends(result: unknown, now: number = Date.now()): void {
	if (!Array.isArray(result)) return;
	const online = new Set(result.map((f: any) => f?.MemberNumber).filter((n) => typeof n === "number"));
	const list = getWithoutReports();
	let changed = false;
	const keep: WithoutReport[] = [];
	for (const r of list) {
		if (!r.beeped && online.has(r.to)) {
			beep(r.to, r.text);
			r.beeped = now;
			changed = true;
			if (inRoomWithHer(r.to)) {
				say(`ECHS beeped ${r.name} that you were on Bondage Club without it.`);
				continue; // online and in person in one
			}
			say(`ECHS beeped ${r.name} that you were on Bondage Club without it. It will again when they are in a room with you.`);
		}
		keep.push(r);
	}
	if (changed) setWithoutReports(keep);
}

/** Every poll: in-person beeps, dropping old ones, the record kept up to date, and lines for her. */
export function tick(now: number = Date.now()): void {
	flushTell();
	if (!loggedIn()) return;
	if (checkedFor !== Player.MemberNumber) checkAtLogin(now);
	const list = getWithoutReports();
	if (list.length) {
		const keep: WithoutReport[] = [];
		let changed = false;
		for (const r of list) {
			if (inRoomWithHer(r.to)) {
				if (!r.beeped || now - r.beeped > SAME_BEEP_MS) beep(r.to, r.text);
				say(`ECHS beeped ${r.name} that you were on Bondage Club without it, now they are in a room with you.`);
				changed = true;
				continue;
			}
			if (now - r.at > REPORT_KEEP_MS) {
				say(r.beeped ? `ECHS beeped ${r.name} once about playing without it, but they were not in a room with you within 7 days, so that report is done.` : `ECHS could not reach ${r.name} within 7 days about playing without it, so that report was dropped.`);
				changed = true;
				continue;
			}
			keep.push(r);
		}
		if (changed) setWithoutReports(keep);
		if (now - lastAsked >= ONLINE_ASK_MS) askOnline(now);
	}
	if (getReportWithout() === "off") return;
	const look = lookOf(Player);
	if (!lastWritten || !sameLook(look, lastWritten) || now - lastWrittenAt >= SEEN_REFRESH_MS) writeSeen(now);
}

/** The setting changed: start or end the record. */
export function onSettingChanged(choice: ReportWithout): void {
	if (choice === "off") clearSeen();
	else if (loggedIn()) {
		checkedFor = Player.MemberNumber;
		writeSeen();
	}
}

/** For the suites. */
export function resetWithoutEchs(): void {
	checkedFor = 0;
	lastWritten = null;
	lastWrittenAt = 0;
	lastAsked = 0;
	toTell.length = 0;
}

export function installWithoutEchs(modApi: any): void {
	modApi.hookFunction("LoginResponse", 0, (args: any[], next: (a: any[]) => any) => {
		const out = next(args);
		try {
			checkAtLogin();
		} catch (err) {
			warn("without-ECHS check failed:", err);
		}
		return out;
	});
	modApi.hookFunction("ServerAccountQueryResult", 0, (args: any[], next: (a: any[]) => any) => {
		const out = next(args);
		try {
			if (args[0]?.Query === "OnlineFriends") onOnlineFriends(args[0].Result);
		} catch (err) {
			warn("without-ECHS online check failed:", err);
		}
		return out;
	});
	// ECHS loaded after login (a bookmarklet): the time before it counts too.
	try {
		if (loggedIn()) checkAtLogin();
	} catch (err) {
		warn("without-ECHS check failed:", err);
	}
	setInterval(() => {
		try {
			tick();
		} catch (err) {
			warn("without-ECHS poll failed:", err);
		}
	}, SEEN_POLL_MS);
	// The last state as the page closes, so a change in the final seconds isn't taken for one made later.
	try {
		window.addEventListener("pagehide", () => {
			if (getReportWithout() !== "off" && checkedFor === Player?.MemberNumber) writeSeen();
		});
	} catch {
		// no window in the suites
	}
}
