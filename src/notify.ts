import { log, warn } from "./log";

// Where our text goes, and who can read it.
//
// Two audiences, and until now everything went to the first one. Playing in a public room
// made the problem obvious: the add-on narrates a great deal, all of it invisible to
// everyone but the subject, so a scene that reads as rich from the inside is completely
// silent from the outside.
//
// So: anything only the subject could know is bracketed, making its privacy legible at a
// glance, and anything the room could actually observe is emoted so the room sees it.
//
// EMOTE IS THE ONLY OPTION for custom text, which is worth writing down because the
// obvious alternatives look right and are not. Verified in ChatRoom.js: Action and
// Activity both render as "(text)" — exactly the shape we want — but both look their
// Content up as a translation key first (TextQueryMultiple / ActivityDictionaryText), and
// an unknown key renders as `MISSING TEXT IN "...": <key>` rather than falling back to the
// literal string. Emote is the one type that prints a literal string at all — but not quite
// "what it is given": BC prepends the SENDER'S NAME to a plain "*"-emote at display time
// (ChatRoom.js, the "Emote messages formatting" processor). A "**"-style emote — what
// tellRoom sends — is the one that prints verbatim with no name of BC's own, which is what
// we need because our text already carries the name. It is tinted with the sender's own
// label colour, so it stays visually distinct from ordinary chat. Verified against R131.

/** Whether the room hears anything at all. Read live from settings by the caller; kept as
 * a parameter rather than an import so this module stays a leaf. */
export type RoomVoice = () => boolean;

let roomVoice: RoomVoice = () => true;

export function setRoomVoice(fn: RoomVoice): void {
	roomVoice = fn;
}

/** Text only the subject can see. Bracketed so it is obvious it went nowhere else. */
export function tellPlayer(message: string): void {
	if (typeof ChatRoomSendLocal !== "function") return;
	ChatRoomSendLocal(`[${message}]`);
}

/** Text the room sees, as an emote from the subject.
 *
 * Deliberately routed through BC's own ChatRoomSendEmote rather than building the packet
 * ourselves: it honours the owner rule that can block emotes, which is somebody's consent
 * setting and not ours to step around. */
export function tellRoom(message: string): void {
	if (!roomVoice()) return;
	if (typeof ChatRoomSendEmote !== "function" || typeof ServerPlayerIsInChatRoom !== "function") return;
	if (!ServerPlayerIsInChatRoom()) return;
	noteRoomLine(message);
	try {
		// The leading "**" is load-bearing, not decoration. BC prepends the sender's name to
		// a plain "*"-emote at display time, so a line that already contains the character's
		// name — every line we build does, via fillTokens — would render it TWICE ("Missy
		// Missy goes still"). Sending it as a "**"-style emote makes BC print the text
		// verbatim and add no name of its own, so the one we placed stands alone. This was
		// Known Bug #5; verified against R131's ChatRoomSendEmote + emote display processor.
		ChatRoomSendEmote(`**${message}`);
	} catch (err) {
		warn("could not emote to the room:", err);
	}
}

// --- The double star (v0.92.7) ---------------------------------------------------------
// DW's trace, 2026-09-26: a watcher saw "**Valerie rises, without seeming to decide to.*". The raw
// packet from Valerie's client carried BOTH stars: something on her client (not ECHS, not WCE)
// took over that ChatRoomSendEmote call and sent our text without BC's step that strips one "*".
// The next line, through the same function, arrived correctly, so whatever it is does not do it
// every time. We cannot see which add-on from here, and stepping round ChatRoomSendEmote would
// also step round the owner's BlockEmote rule (see tellRoom). So the call still goes through BC,
// and the packet is checked on its way out: if it is one of OUR recent lines with the extra star
// still on, the star comes off. Nothing else is touched — a player's own "**" emote is not ours.

/** Our recent room lines, as they would arrive if the star were NOT stripped. Short-lived. */
const pendingLines: { line: string; at: number }[] = [];
const PENDING_MS = 10_000;

function noteRoomLine(message: string): void {
	const now = Date.now();
	while (pendingLines.length && (now - pendingLines[0].at > PENDING_MS || pendingLines.length > 20)) pendingLines.shift();
	pendingLines.push({ line: `**${message}`.trim(), at: now });
}

/** The packet check. Exported for the suite. Returns the Content to send. */
export function fixRoomLine(content: unknown): unknown {
	if (typeof content !== "string") return content;
	const i = pendingLines.findIndex((p) => p.line === content.trim() || p.line.slice(1) === content.trim());
	if (i < 0) return content;
	pendingLines.splice(i, 1);
	if (!content.startsWith("**")) return content; // BC stripped it, as it should
	log("room line: another add-on skipped BC's star strip; took the extra '*' off");
	return content.slice(1);
}

/** Called once from main.ts. */
export function installRoomLineGuard(modApi: any): void {
	modApi.hookFunction("ServerSend", 1000, (args: any[], next: (a: any[]) => any) => {
		const [type, data] = args;
		if (type !== "ChatRoomChat" || data?.Type !== "Emote" || typeof data?.Content !== "string") return next(args);
		const fixed = fixRoomLine(data.Content);
		return fixed === data.Content ? next(args) : next([type, { ...data, Content: fixed }]);
	});
}

// --- Pronouns -------------------------------------------------------------------------

interface Pronouns {
	/** "her" / "his" / "their" / "its" */
	their: string;
	/** "her" / "him" / "them" / "it" */
	them: string;
	/** "herself" / "himself" / "themselves" / "itself" */
	themselves: string;
}

const PRONOUNS: Record<string, Pronouns> = {
	SheHer: { their: "her", them: "her", themselves: "herself" },
	HeHim: { their: "his", them: "him", themselves: "himself" },
	TheyThem: { their: "their", them: "them", themselves: "themselves" },
	ItIt: { their: "its", them: "it", themselves: "itself" },
};

/** The player's own pronouns, from BC's Pronouns appearance group.
 *
 * Never guessed from a name or a body: Character.GetPronouns() reads the item the player
 * chose, and BC's own default when there is none is SheHer. They/them is the fallback here
 * when the value is something we do not recognise, because being wrong in the neutral
 * direction is the only harmless way to be wrong. */
function pronouns(): Pronouns {
	const name = typeof Player?.GetPronouns === "function" ? Player.GetPronouns() : undefined;
	return PRONOUNS[name] ?? PRONOUNS.TheyThem;
}

/** We emit room text as a verbatim "**"-emote (see tellRoom), so BC adds no name of its
 * own — the character's name has to be in the string. Being the subject of the sentence it
 * also settles the verb: "Missy reaches" is third-person singular whoever Missy is, which
 * is what keeps they/them from needing a whole second set of phrasings. */
export function fillTokens(template: string): string {
	const p = pronouns();
	return template
		.replace(/\{name\}/g, String(Player?.Nickname || Player?.Name || "Someone"))
		.replace(/\{their\}/g, p.their)
		.replace(/\{them\}/g, p.them)
		.replace(/\{themselves\}/g, p.themselves);
}
