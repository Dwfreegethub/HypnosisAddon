import { log, warn } from "./log";
import { getFeatures, listTriggers } from "./storage";
import { recordingPhrase } from "./triggers";
import {
	parseTriggerControl,
	triggerPhrasesVisible,
	scopeToAddressee,
	playerOwnNames,
	otherRoomNames,
	stripOOC,
	unstutter,
} from "./voice";
import { isSessionActiveWith } from "./session";

// Trigger words shown as "..." in the subject's own chat (v0.89.0, design.md "Trigger Overhaul",
// decision 6). The subject should not learn their trigger word from hearing it: not when it is
// planted, not when it is said. `/hypno triggers` already hid it; this is the chat half.
//
// HOW. BC's message-handler API, as suppression.ts uses it (verified in R132 ChatRoom.js):
// a post-handler may return `{ msg }`, and the display handler at 500 renders the transformed
// text. We register at 50: after "Emote messages formatting" (0), which adds the sender's name,
// and before "Sensory-deprivation processing" (100), whose deafness garbling would otherwise leave
// a half-recognisable word for us to miss. The notification at 500 reads the same `msg`, so a
// desktop notification is masked too.
//
// WHAT IT DOES NOT TOUCH. `data.Content` is left alone: our own ChatRoomMessage hook reads it to
// fire triggers, and BC's chat log and other add-ons read it too. This changes what is DRAWN on
// the subject's screen and nothing else. Nobody else's screen is affected (rule 3's principle).
//
// Technique reference: LSCG's hypnosis module also hides its trigger word in displayed chat (DW
// pointed at it, 2026-09-25). No LSCG code is used or copied (rule 7); this is BC's own API, the
// same way suppression.ts uses it.
//
// ORDER. Our ChatRoomMessage hook renders a line BEFORE reacting to it (main.ts), so the line that
// PLANTS a trigger is drawn before recording has begun and before the phrase is stored anywhere.
// So this handler parses a planting line itself, with the same parser and the same gates the
// planting path uses, and conceals what it would capture.

/** Normalised word → the raw spellings normalize() would have turned into it. */
const WORD_SPELLINGS: Record<string, string> = {
	cannot: String.raw`(?:cannot|can['‘’ʼ]?t|can\s+not)`,
	// normalize() reads "ur" as "your" only as a whole word, so the "ur" ending "our" must not match.
	your: String.raw`(?:your|(?<![a-z])ur)`,
};
/** Normalised word pairs that normalize() produced from a contraction. */
const PAIR_SPELLINGS: Record<string, string> = {
	"do not": String.raw`(?:do[^a-z]+not|don['‘’ʼ]?t)`,
	"will not": String.raw`(?:will[^a-z]+not|won['‘’ʼ]?t)`,
	"must not": String.raw`(?:must[^a-z]+not|mustn['‘’ʼ]?t)`,
	"does not": String.raw`(?:does[^a-z]+not|doesn['‘’ʼ]?t)`,
	"is not": String.raw`(?:is[^a-z]+not|isn['‘’ʼ]?t)`,
	"are not": String.raw`(?:are[^a-z]+not|aren['‘’ʼ]?t)`,
	"you are": String.raw`(?:you[^a-z]+are|you['‘’ʼ]?re)`,
	"you have": String.raw`(?:you[^a-z]+have|you['‘’ʼ]?ve)`,
};

/** One normalised word as it could appear in raw chat: any case, the sender's arousal stutter in
 * front of it ("s-s-sleepy", see unstutter), or the spelling normalize() folded into it. */
function wordPattern(word: string): string {
	const stutter = `(?:${word[0]}-)*`;
	return stutter + (WORD_SPELLINGS[word] ?? word);
}

/** A regex source that finds `phrase` (normalised) in raw chat text. Words may be separated by
 * anything that is not a letter — normalize() turned every such run into one space. */
export function phrasePattern(phrase: string, strict: boolean): string | null {
	const words = phrase.split(" ").filter(Boolean);
	if (!words.length) return null;
	const parts: string[] = [];
	for (let i = 0; i < words.length; i++) {
		const pair = words[i + 1] !== undefined ? PAIR_SPELLINGS[`${words[i]} ${words[i + 1]}`] : undefined;
		if (pair) {
			parts.push(`(?:${words[i][0]}-)*${pair}`);
			i++;
			continue;
		}
		parts.push(wordPattern(words[i]));
	}
	const body = parts.join("[^a-z]+");
	// A strict trigger fires on whole words only, so only whole words are concealed; a substring
	// trigger fires inside a longer word, so that is concealed too ("...head").
	return strict ? `(?<![a-z])${body}(?![a-z])` : body;
}

/** Replace every occurrence of any phrase with "...". Longest phrases first, so a phrase that
 * contains another is concealed whole rather than leaving part of itself showing. Pure. */
export function concealPhrases(text: string, phrases: { phrase: string; strict: boolean }[]): string {
	const sorted = phrases.slice().sort((a, b) => b.phrase.length - a.phrase.length);
	let out = text;
	for (const { phrase, strict } of sorted) {
		const source = phrasePattern(phrase, strict);
		if (!source) continue;
		out = out.replace(new RegExp(source, "gi"), "...");
	}
	return out;
}

/** The phrases to conceal in a line from `sender`: every stored trigger, the one being recorded,
 * and — for a planting line from the hypnotist who has us under — the phrase it is about to plant. */
export function phrasesToConceal(sender: number, content: string): { phrase: string; strict: boolean }[] {
	const strictAll = getFeatures().strictTriggerMatch;
	const phrases = listTriggers().map((t) => ({ phrase: t.phrase, strict: strictAll || !!t.strict }));
	const recording = recordingPhrase();
	if (recording) phrases.push({ phrase: recording, strict: false });
	// Only where handleTriggerControl would act on it: mid-trance, from that hypnotist, and the part
	// of the line addressed to us. Anything else is not a planting and names nothing of ours.
	if (isSessionActiveWith(sender)) {
		const inCharacter = stripOOC(unstutter(content));
		const line = inCharacter === null ? null : scopeToAddressee(inCharacter, playerOwnNames(), otherRoomNames(sender)).text;
		const parsed = line === null ? null : parseTriggerControl(line);
		if (parsed?.kind === "start" && parsed.phrase) phrases.push({ phrase: parsed.phrase, strict: false });
	}
	return phrases;
}

/** Should this message be looked at at all? */
function concealing(data: any): boolean {
	if (!getFeatures().hypnoEnabled) return false; // the hard floor: unticked, the add-on does nothing
	if (triggerPhrasesVisible(false)) return false; // they asked to see their words
	if (data?.Sender === Player?.MemberNumber) return false; // their own words, already on their screen
	return data?.Type === "Chat" || data?.Type === "Whisper" || data?.Type === "Emote";
}

/** The handler body, exported for the suite. Returns BC's "transform" shape, or false. */
export function concealHandler(data: any, msg: string, metadata: any): { msg: string } | false {
	if (!concealing(data) || typeof msg !== "string") return false;
	const phrases = phrasesToConceal(data.Sender, String(data.Content ?? ""));
	if (!phrases.length) return false;
	const masked = concealPhrases(msg, phrases);
	// BC shows a gagged sender's ungarbled text beside the garbled line when the viewer has "show
	// ungarbled messages" on (ChatRoom.js: metadata.OriginalMsg, drawn in ChatRoomMessageDisplay).
	// That copy would name the word in full.
	if (metadata && typeof metadata.OriginalMsg === "string") {
		metadata.OriginalMsg = concealPhrases(metadata.OriginalMsg, phrases);
	}
	if (masked === msg) return false;
	log("concealed a trigger word in a chat line");
	return { msg: masked };
}

export function installConcealment(): void {
	if (typeof ChatRoomRegisterMessageHandler !== "function") {
		warn("ChatRoomRegisterMessageHandler missing — trigger words will not be concealed in chat");
		return;
	}
	ChatRoomRegisterMessageHandler({
		Description: "HypnosisAddon: show trigger words as ... (after emote formatting, before garbling)",
		Priority: 50,
		Callback: (data: any, _sender: any, msg: string, metadata: any) => {
			try {
				return concealHandler(data, msg, metadata);
			} catch (err) {
				// Never let a bug in here eat or mangle someone's chat.
				warn("trigger-word concealment failed:", err);
				return false;
			}
		},
	});
}
