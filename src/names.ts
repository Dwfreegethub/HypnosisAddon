// The name a player goes by (v1.19.3, DW 2026-11-26: "Can we make sure to use the nickname all the
// time"). BC shows the nickname everywhere and the account name only in brackets on entering, so
// every name ECHS shows or sends is the nickname when there is one. Account names are still kept
// where they are used to MATCH someone (trust entries, /echs commands accept either).
//
// A leaf: no imports, so any module can use it.

/** Nickname, else account name, else "" when there is no character to read. Read straight off the
 * character rather than through BC's CharacterNickname, which returns a GGTS stand-in inside the
 * asylum: a name worth showing, not storing. */
export function displayNameOf(C: any): string {
	const nick = typeof C?.Nickname === "string" ? C.Nickname.trim() : "";
	return nick || (typeof C?.Name === "string" ? C.Name : "");
}

/** The same, falling back to "#<number>" (or `fallback`) when nobody is there to read. */
export function nameOrNumber(C: any, member: number | null | undefined, fallback?: string): string {
	return displayNameOf(C) || fallback || (member != null ? `#${member}` : "");
}
