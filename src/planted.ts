import { log } from "./log";
import { sendHiddenMessage } from "./messaging";
import { listPlantedNotes, savePlantedNote, PlantedEntry, PlantedNote, Trigger } from "./storage";

// A hypnotist's list of the triggers they planted (v1.4.0; Eri, 2026-10-04; DW 2026-11-05).
//
// TWO SOURCES, ONE TRUTH. The subject's client alone knows what is really planted (rule 1), so
// when they are in the room it is asked, and answers only about the asker's own triggers. Notes
// saved on the hypnotist's client mean the list also works when they are not, marked "last known".
// The notes are only ever displayed: nothing is decided from them.
//
// NO NEW MESSAGE TYPES, ON PURPOSE. A client that does not know a hidden message's type prints it on
// screen as raw text (messaging.ts), so a new type would show junk to anyone on an older build. The
// list rides as an extra field on two messages every build already exchanges: `state-query` and
// `state-response` for asking, and `trigger-status` for a change. An older client ignores the field.

/** How long a subject has to answer before the list says "last known" instead. */
export const PLANTED_ASK_MS = 3000;
/** No more than this many travel in one message, nor are kept for one subject. */
export const MAX_PLANTED_ENTRIES = 30;

let source: (hypnotist: number) => PlantedEntry[] = () => [];
/** voice.ts owns the words for what a trigger does, and already imports what this would need. */
export function registerPlantedSource(fn: (hypnotist: number) => PlantedEntry[]): void {
	source = fn;
}
let describer: (t: Trigger) => PlantedEntry = (t) => ({ word: t.phrase, when: "", does: [], strength: "", once: !!t.oneShot, holding: false });
/** One trigger in words, for anyone's list (v1.16.2: a full keyholder's too). Registered by voice.ts. */
export function registerPlantedDescriber(fn: (t: Trigger) => PlantedEntry): void {
	describer = fn;
}
export function plantedEntryFor(t: Trigger): PlantedEntry {
	return describer(t);
}

/** Subject side: what this hypnotist planted in us. Theirs only, never anyone else's. */
export function plantedEntriesFor(hypnotist: number): PlantedEntry[] {
	return source(hypnotist).slice(0, MAX_PLANTED_ENTRIES);
}

const askedAt = new Map<number, number>();
/** Who has answered since we last asked them. */
const answered = new Set<number>();

/** Ask a subject what is still planted. */
export function askPlanted(subject: number, now: number = Date.now()): void {
	askedAt.set(subject, now);
	answered.delete(subject);
	sendHiddenMessage({ type: "state-query", planted: true }, subject);
}

/** They are not here to ask (v1.5.2). An answer from an earlier ask must not be shown as current:
 * DW's J.4, "They answered just now" for someone who had left the room. */
export function forgetAsked(subject: number): void {
	askedAt.delete(subject);
	answered.delete(subject);
}

const text = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");

/** Hypnotist side: a list arrived. It came over the wire, so it is cleaned before it is kept. */
export function receivePlanted(subject: number, name: string, raw: unknown, now: number = Date.now()): void {
	if (!Array.isArray(raw)) return;
	answered.add(subject);
	const triggers: PlantedEntry[] = raw
		.slice(0, MAX_PLANTED_ENTRIES)
		.filter((e) => e && typeof e === "object")
		.map((e: any) => ({
			word: text(e.word, 100),
			when: text(e.when, 100),
			does: (Array.isArray(e.does) ? e.does : []).slice(0, 8).map((d: unknown) => text(d, 120)),
			strength: text(e.strength, 60),
			once: !!e.once,
			holding: !!e.holding,
		}));
	savePlantedNote(subject, triggers.length ? { name, updatedAt: now, triggers } : null);
	log(`planted list from ${subject}: ${triggers.length} trigger(s)`);
}

export type PlantedStatus = "asking" | "live" | "last-known";

export function plantedStatus(subject: number, now: number = Date.now()): PlantedStatus {
	const asked = askedAt.get(subject) ?? 0;
	if (asked && answered.has(subject)) return "live";
	return asked && now - asked < PLANTED_ASK_MS ? "asking" : "last-known";
}

export function plantedNote(subject: number): PlantedNote | null {
	return listPlantedNotes()[subject] ?? null;
}

/** Everyone we hold notes on, as member numbers. */
export function plantedSubjects(): number[] {
	return Object.keys(listPlantedNotes()).map(Number);
}

/** A subject named in `/echs planted`, from the notes, which reach people who are not here. */
export function findPlantedSubject(token: string): number | null {
	const t = token.trim().toLowerCase();
	if (!t) return null;
	const notes = listPlantedNotes();
	return Number(Object.keys(notes).find((id) => id === t || notes[id].name.toLowerCase() === t) ?? NaN) || null;
}

/** One trigger's headline, shared by the chat list and the panel. A compulsion carries its number
 * among the hypnotist's compulsions (v1.19.6), the one "forget the second compulsion" names. */
export function plantedTitle(entry: PlantedEntry, compulsionNo?: number | null): string {
	if (entry.word) return `"${entry.word}"`;
	const when = entry.when || "No word";
	return compulsionNo ? `Compulsion ${compulsionNo}: ${when}` : when;
}

/** Each entry's compulsion number (1, 2, … counting compulsions only, in list order), or null for a
 * word trigger. The subject numbers them the same way (voice.ts compulsionsNumberedFor). */
export function compulsionNumbers(entries: PlantedEntry[]): (number | null)[] {
	let n = 0;
	return entries.map((e) => (e.word ? null : ++n));
}

/** "first", "second", … "thirtieth": a compulsion by its number, as spoken (v1.19.6). An ordinal so
 * an older ECHS, which reads "forget compulsion …" as all of them, ignores the line instead. */
const ORDINAL_UNITS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
const ORDINAL_TEENS = ["tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth"];
export const ORDINALS: string[] = [
	...ORDINAL_UNITS,
	...ORDINAL_TEENS,
	"twentieth",
	...ORDINAL_UNITS.map((u) => `twenty ${u}`),
	"thirtieth",
];

/** Strength and options, in words. */
export function plantedState(entry: PlantedEntry): string {
	return [entry.strength, entry.once ? "works once" : "", entry.holding ? "holding them now" : ""].filter(Boolean).join(", ");
}

function dateText(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The line above one subject's list, or what to say in place of it. */
export function plantedHeading(subject: number, name: string, now: number = Date.now()): string {
	const note = plantedNote(subject);
	const status = plantedStatus(subject, now);
	if (status === "live") return note ? "They answered just now." : `They answered just now: nothing you planted is in ${name}.`;
	if (status === "asking") return "Asking them…";
	return note
		? `They did not answer, or are not here. Last known ${dateText(note.updatedAt)}.`
		: `They did not answer, and you have no notes on ${name}.`;
}

/** One subject, as chat lines. */
export function describePlanted(subject: number, fallbackName: string, now: number = Date.now()): string[] {
	const note = plantedNote(subject);
	const name = note?.name ?? fallbackName;
	const lines = [`${name} (#${subject}): ${plantedHeading(subject, name, now)}`];
	const triggers = note?.triggers ?? [];
	const numbers = compulsionNumbers(triggers);
	triggers.forEach((t, i) => {
		lines.push(`  ${i + 1}. ${plantedTitle(t, numbers[i])}: ${plantedState(t)}. ${t.does.join("; ")}.`);
	});
	return lines;
}
