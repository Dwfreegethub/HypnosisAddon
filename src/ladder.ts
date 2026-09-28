import type { TriggerScope } from "./storage";

// Who counts, on BC's own permission ladder. Shared by trigger scope (triggers.ts) and, since
// v0.97.3, by who toy mode is for (session.ts; DW: "use the same format as the one used on the
// triggers tab"). A leaf module so both can import it: triggers.ts imports session.ts, so
// session.ts cannot import triggers.ts back (design.md, the import rule).
//
// Deliberately mirrors BC's own item-permission ladder (AllowedInteractions in Character.js) so it
// reads familiar and behaves the way players already expect, and uses BC's own helper methods
// rather than reimplementing what "owner" or "lover" means.

function characterFor(memberNumber: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(c: any) => c?.MemberNumber === memberNumber,
	);
}

/** Does this person clear `scope`? Never yourself, and never at "hypnotist", which means nobody
 * but the one who planted it (the caller decides that).
 *
 * Follows the same order of tests as ServerChatRoomGetAllowItem: the owner is allowed at every
 * level and is checked before the blacklist, and "Dominant" means within 25 reputation points,
 * both matching BC exactly rather than inventing our own reading. */
export function allowedByLadder(memberId: number, scope: TriggerScope): boolean {
	if (scope === "hypnotist") return false;
	// The ladder is about OTHER PEOPLE. Running it against yourself produced answers nobody
	// chose — "everyone" and "not blacklisted" trivially include you, and the dominants rung
	// asks whether your own reputation plus 25 beats your own reputation, which it always
	// does.
	if (memberId === Player?.MemberNumber) return false;
	const C = characterFor(memberId);
	if (!C) return false;
	if (Player?.IsOwnedByCharacter?.(C)) return true;
	if (scope === "everyone") return true;
	if (Player?.HasOnBlacklist?.(C)) return false;
	if (scope === "notblack") return true;
	if (scope === "owner") return false;
	if (C.IsLoverOfCharacter?.(Player)) return true;
	if (scope === "lovers") return false;
	if (Player?.HasOnWhitelist?.(C)) return true;
	if (scope === "whitelist") return false;
	try {
		return ReputationCharacterGet(C, "Dominant") + 25 >= ReputationCharacterGet(Player, "Dominant");
	} catch {
		return false;
	}
}
