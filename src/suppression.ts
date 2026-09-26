import { log, warn } from "./log";

// Hiding messages about things done TO the subject, without touching what those things
// actually do. "You notice nothing that happens to you" — but arousal still moves.
//
// This uses BC's own message-handler API (ChatRoomRegisterMessageHandler) rather than our
// ChatRoomMessage hook, because WHERE in the pipeline we intervene is the whole feature.
// Verified handler order in ChatRoom.js:
//
//   210  Arousal processing        — calls ActivityEffect(), the thing DW wants kept
//   300  Hide per sensory deprivation ) BC's own hiding handlers, both of which
//   310  Hide sexual activity msgs    ) simply return true to make a message vanish
//   500  Push message to the chat   — ChatRoomMessageDisplay(), the actual render
//
// Registering at 320 means arousal (210) has already been applied and the render (500)
// never happens. Returning `true` stops processing, exactly as BC's own hiders do.
// Suppressing inside our ChatRoomMessage hook instead would have killed arousal too,
// because that hook runs before any of this.

export type SuppressionCategory = "clothing" | "bondage" | "activity";

/** What's currently being hidden. Runtime only — a trance shouldn't outlive a reload. */
const active = new Set<SuppressionCategory>();

export function setSuppressed(category: SuppressionCategory, on: boolean): void {
	if (on) active.add(category);
	else active.delete(category);
}

export function isSuppressed(category: SuppressionCategory): boolean {
	return active.has(category);
}

// --- Numbness -------------------------------------------------------------------------
//
// "You cannot feel my touch" is a claim about SENSATION, where "you will ignore my touches"
// above is a claim about ATTENTION. They were one suggestion until v0.39.0, and the bundling
// made the first of them untrue: the message was hidden and the arousal still landed, so a
// subject told she could not feel anything watched her own meter climb.
//
// Kept in this module because it is the same pipeline, and because clearAllSuppression() is
// already called on every teardown path there is — session end, safeword, hypnoEnabled off.
// Adding a second piece of state with its own clear function would have meant finding all
// three again and getting one of them wrong.
//
// The two compose rather than overlap, which is the point of splitting them:
//   ignore  → you are touched, you are aroused, you are not told
//   numb    → you are touched, you are told, nothing happens to you
//   both    → you are touched, and it may as well not have occurred
let numb = false;

export function setNumb(on: boolean): void {
	numb = on;
}

export function isNumb(): boolean {
	return numb;
}

export function clearAllSuppression(): void {
	active.clear();
	numb = false;
	hearing = null;
}

// --- Hearing only one voice (v0.93.0, DW 2026-09-26) --------------------------------------
//
// Two modes. "Missy, you hear only my voice": everything that one person says reaches her, named
// or not (a trigger locks it to whoever FIRED it). "Missy, you only hear what is said to you":
// only lines that use her name, from anyone. Everyone else's chat and in-character whispers are
// hidden, now and then replaced by a line that other voices are there and do not matter.
//
// DW's answers, 2026-09-26: OOC text in (parentheses), in chat or whispers, always gets through —
// the safety line; emotes, activities and actions stay visible (she can still SEE the room); and
// what she cannot hear cannot act on her: other people's commands and trigger words do nothing.
// That last part is enforced where lines are READ (voice.ts handleSpokenLine, via hearsLine); this
// module only hides the display.
//
// BC's own deafness cannot do this (verified, R132 Speech.js SpeechTransformDeafenIntensity and the
// "Sensory-deprivation processing" handler at 100): at any level it only garbles, never hides, and
// it cannot let one voice through. So the display half is a message handler at 90 — before BC's
// garble at 100 (the OOC we keep is read as typed) and before "Save chats and whispers to the chat
// log" at 110, so a line she did not hear is not in her log either. ECHS's own lines are local
// (tellPlayer) and never enter this pipeline; BC's safeword actions are Actions, never touched.

export type HearingMode = { kind: "voice"; member: number } | { kind: "name" };

let hearing: HearingMode | null = null;

export function setHearing(mode: HearingMode | null): void {
	hearing = mode;
}

export function hearingMode(): HearingMode | null {
	return hearing;
}

/** Can she hear a spoken line from `sender`? `namesHer` is whether the line uses her name. Her own
 * lines always; with no mode on, everything. */
export function hearsLine(sender: number, namesHer: boolean): boolean {
	if (!hearing || sender === Player?.MemberNumber) return true;
	return hearing.kind === "voice" ? sender === hearing.member : namesHer;
}

/** Messages the ChatRoomMessage hook (main.ts) found she cannot hear, for the handler below. Marked
 * there because that hook already knows the in-character text and her names; a WeakSet so nothing
 * is kept once BC lets go of the message. */
const unheard = new WeakSet<object>();

export function markUnheard(data: object): void {
	unheard.add(data);
}

/** The out-of-character parts of a line, as typed: every "(…)" span, an unclosed one running to the
 * end, joined by a space. "" when there are none. */
export function oocOnly(text: string): string {
	const spans: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of String(text ?? "")) {
		if (ch === "(") {
			if (depth === 0) current = "";
			depth++;
			current += ch;
		} else if (ch === ")" && depth > 0) {
			current += ch;
			depth--;
			if (depth === 0) spans.push(current);
		} else if (depth > 0) {
			current += ch;
		}
	}
	if (depth > 0 && current.length > 1) spans.push(current);
	return spans.join(" ").trim();
}

/** How often the "other voices" line may appear. The first hidden line after the mode starts gets
 * one; after that at most one a minute, so it reads as atmosphere and never as a counter. */
const OTHERS_FADE_GAP_MS = 60_000;
let lastOthersFade = 0;

/** The display half. `onHidden` is given the mode when a line is hidden and a fade line is due. */
export function installHearingFilter(onHidden: (mode: HearingMode) => void): void {
	if (typeof ChatRoomRegisterMessageHandler !== "function") {
		warn("ChatRoomRegisterMessageHandler missing — hearing only one voice will not hide chat");
		return;
	}
	ChatRoomRegisterMessageHandler({
		Description: "HypnosisAddon: hear only one voice (before BC's deafness garble and the chat log)",
		Priority: 90,
		Callback: (data: any, _sender: any, msg: string) => hearingFilter(data, msg, onHidden),
	});
	log("hearing filter registered at priority 90");
}

/** The handler body, exported for the suite. BC's return shapes: false passes, true hides, {msg}
 * rewrites. */
export function hearingFilter(data: any, msg: string, onHidden: (mode: HearingMode) => void): boolean | { msg: string } {
	try {
		if (!hearing || !data || !unheard.has(data)) return false;
		if (data.Type !== "Chat" && data.Type !== "Whisper") return false;
		const ooc = oocOnly(msg);
		if (ooc) return { msg: ooc };
		const now = Date.now();
		if (now - lastOthersFade >= OTHERS_FADE_GAP_MS) {
			lastOthersFade = now;
			onHidden(hearing);
		}
		return true;
	} catch (err) {
		// Never let a bug in here eat someone's chat.
		warn("hearing filter failed:", err);
		return false;
	}
}

/** A new mode starts its own atmosphere: the first hidden line after it gets the fade line. */
export function resetOthersFade(): void {
	lastOthersFade = 0;
}

/** Did this message describe something happening TO us, rather than by us or to someone
 * else? Everything here is scoped to the subject — "you notice nothing that happens to
 * YOU" was never meant to blind them to the rest of the room. */
function targetsPlayer(data: any, metadata: any): boolean {
	if (metadata?.TargetMemberNumber != null) return metadata.TargetMemberNumber === Player.MemberNumber;
	// No explicit target: fall back to "we're involved but didn't send it".
	return data?.Sender !== Player.MemberNumber && !!ChatRoomMessageInvolvesPlayer?.(data);
}

/** Action messages that name no asset AND no group, so nothing in the payload says what
 * they are about — they have to be recognised by the message tag itself.
 *
 * `ChangeClothes` is the one that matters, and it was the hole in this: BC sends exactly
 * one of these for a whole WARDROBE session (ChatRoomAppearanceLoadCharacter in
 * ChatRoom.js), carrying only a source and a destination character, however many garments
 * actually changed. Item-by-item changes through the dialog carry their asset and were
 * being suppressed correctly all along — which is why this looked like it worked.
 *
 * Deliberately a short, verified list rather than a guess at every tag. Anything
 * safeword-, leash- or room-related stays off it: those are messages a subject must keep
 * seeing regardless of what they've agreed to not notice. */
const ACTION_TAGS: Record<string, SuppressionCategory> = {
	ChangeClothes: "clothing",
};

/** Is this an item-slot thing (bondage, in this module's words) rather than a garment?
 *
 * By the GROUP's category first, and IsRestraint only as a fallback. IsRestraint alone was
 * the rule until v0.82.0 and it is narrower than it sounds: it means "this restrains you",
 * so a gag, a collar, a blindfold, a vibrator or a padlock can be an Item-slot asset without
 * it. Those were sorted as CLOTHING — leaking under "you do not notice being tied" and hidden
 * under the clothing line instead. The asset-less branch below already asked the category;
 * the asset branch did not, so the same gag was bondage or clothing depending on which
 * message BC happened to send. This is the same split illusion.ts's isWornGroup draws. */
function isItemSlot(group: any, isRestraint?: boolean): boolean {
	return group?.Category === "Item" || !!isRestraint || !!group?.IsRestraint;
}

/** Which bucket does this message fall into, if any? */
function classify(data: any, metadata: any): SuppressionCategory | null {
	if (data?.Type === "Activity" || metadata?.ActivityName) return "activity";
	if (data?.Type !== "Action") return null;

	const assets: any[] = metadata?.Assets ? Object.values(metadata.Assets) : [];
	if (assets.some((a) => isItemSlot(a?.Group, a?.IsRestraint))) return "bondage";
	if (assets.length > 0) return "clothing";

	// Some Action messages carry only a group, no asset (e.g. stripping a slot empty).
	const group = metadata?.FocusGroup;
	if (group) return isItemSlot(group) ? "bondage" : "clothing";

	// Neither asset nor group: fall back to the message's own name.
	const tag = typeof data?.Content === "string" ? ACTION_TAGS[data.Content] : undefined;
	return tag ?? null;
}

/** Exposed for the test suite — classify is the part with all the branches, and it is pure
 * apart from reading two fields off its arguments. */
export function classifyForTest(data: any, metadata: any): SuppressionCategory | null {
	return classify(data, metadata);
}

export function installSuppression(): void {
	if (typeof ChatRoomRegisterMessageHandler !== "function") {
		warn("ChatRoomRegisterMessageHandler missing — suppression not installed");
		return;
	}
	ChatRoomRegisterMessageHandler({
		Description: "HypnosisAddon: hide suppressed categories (after arousal, before display)",
		Priority: 320,
		Callback: (data: any, _sender: any, _msg: string, metadata: any) => {
			try {
				if (active.size === 0) return false;
				const category = classify(data, metadata);
				if (!category || !active.has(category)) return false;
				if (!targetsPlayer(data, metadata)) return false;
				log(`suppressed ${category} message:`, data?.Content);
				return true; // stop processing — never reaches the display handler at 500
			} catch (err) {
				// Never let a bug in here eat someone's whole chat log.
				warn("suppression handler failed:", err);
				return false;
			}
		},
	});
	log("suppression handler registered at priority 320");
	installNumbness();
}

/** The name of BC's own arousal handler, as it appears in ChatRoomMessageHandlers. Matched
 * by string because that is the only thing identifying it — two handlers share Priority 210
 * and skipping both would also lose the kneel stimulation message. */
const AROUSAL_HANDLER = "Arousal processing";

/** Stop another person's activity from arousing us, without hiding it and without touching
 * anything else in the pipeline.
 *
 * BC's dispatcher (ChatRoomMessageRunHandlers) supports THREE return shapes, and the third
 * is what makes this precise. Verified in the live R131 source:
 *
 *   true            stop the whole pipeline — kills the display too, and everything between
 *   {msg}           rewrite the text
 *   {skip: fn}      keep processing, but skip the specific later handlers fn matches
 *
 * So we register just ahead of arousal at 210 and skip that one handler by name. Returning
 * `true` here instead would have been the obvious move and the wrong one: it would take the
 * display with it, which is a different feature the subject consented to separately, plus
 * BC's own sensory-deprivation hiders and the Asylum GGTS activity tracking.
 *
 * Scope mirrors the arousal handler's own condition exactly — an ActivityName aimed at us
 * by somebody who is not us. Our own touches never reach here at all: those are stopped in
 * selftouch.ts at ActivityRun, on the actor's client, before a message is ever sent. */
function installNumbness(): void {
	ChatRoomRegisterMessageHandler({
		Description: "HypnosisAddon: numbness (skip arousal, leave the message alone)",
		Priority: 205,
		Callback: (data: any, sender: any, _msg: string, metadata: any) => {
			try {
				if (!numb) return false;
				if (!metadata?.ActivityName) return false;
				if (metadata?.TargetMemberNumber !== Player?.MemberNumber) return false;
				// Someone else's doing. Our own is handled at the source, and skipping it
				// here as well would be a silent second implementation of the same rule.
				if (sender?.MemberNumber === Player?.MemberNumber) return false;
				log(`numb to ${metadata.ActivityName} — skipping arousal`);
				return { skip: (h: any) => h?.Description === AROUSAL_HANDLER };
			} catch (err) {
				warn("numbness handler failed:", err);
				return false;
			}
		},
	});
	// A rename upstream would leave the skip matching nothing, and numbness would quietly
	// stop working with no error anywhere. Say so at install time instead of in play.
	const handlers = typeof ChatRoomMessageHandlers !== "undefined" ? ChatRoomMessageHandlers : null;
	if (handlers && !handlers.some((h: any) => h?.Description === AROUSAL_HANDLER)) {
		warn(`WARNING: no handler named "${AROUSAL_HANDLER}" — numbness will not block arousal`);
	}
	log("numbness handler registered at priority 205");
}
