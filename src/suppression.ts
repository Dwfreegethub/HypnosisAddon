import { log } from "./log";

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

export function clearAllSuppression(): void {
	active.clear();
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

/** Which bucket does this message fall into, if any?
 *
 * Asset.IsRestraint (Asset.js) is what separates clothing from bondage — it's set per
 * asset, falling back to the group's own IsRestraint, so it handles both a rope and a
 * dress without us maintaining a list of group names. */
function classify(data: any, metadata: any): SuppressionCategory | null {
	if (data?.Type === "Activity" || metadata?.ActivityName) return "activity";
	if (data?.Type !== "Action") return null;

	const assets: any[] = metadata?.Assets ? Object.values(metadata.Assets) : [];
	if (assets.some((a) => a?.IsRestraint)) return "bondage";
	if (assets.length > 0) return "clothing";

	// Some Action messages carry only a group, no asset (e.g. stripping a slot empty).
	const group = metadata?.FocusGroup;
	if (group) return group.IsRestraint || group.Category === "Item" ? "bondage" : "clothing";

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
		log("ChatRoomRegisterMessageHandler missing — suppression not installed");
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
				log("suppression handler failed:", err);
				return false;
			}
		},
	});
	log("suppression handler registered at priority 320");
}
