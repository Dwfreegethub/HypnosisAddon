import { log, warn } from "./log";
import { getFaceSaved, setFaceSaved, FaceSaved } from "./storage";

// Her face on command (v1.11.0, DW 2026-11-11: "open eyes, close eyes, open mouth, stick out tongue,
// things like that"). Spoken suggestions and trigger actions, under Posture Control like the poses.
//
// BC's own facial expressions, through BC's own CharacterSetFacialExpression (R132 Character.js):
// "Eyes" sets both eyes, an expression the group does not allow is refused without a word, and for
// the player in a chat room it sends the change to the room itself. The names are R132 Female3DCG's
// AllowExpression lists. Mouth: Open, HalfOpen, TonguePinch (the tip of the tongue out), Ahegao (all
// the way out), LipBite, Happy, Grin, Smirk, Pout, Moan. Eyes: Closed, Surprised, Dazed, Heart.
// Blush: High.
//
// It lasts until "relax your face" (or a release for its part: "open your eyes", "close your
// mouth") or until she wakes, by any way out (DW). Not carried by "that will stay with you".
//
// What was there before is saved FIRST, in her settings, because BC saves the expression with her
// character: a crash mid-trance must not leave her pulling a face for good (recovery.ts puts it
// back). And put back only where it is still what we set, as with her trance eyes: a face she or
// another add-on made since is hers. Saving what was there at the time of the command, rather than
// before the trance, is what makes "open your eyes" give back her spiral eyes while she is still
// under, and the waking order (this first, then eyes.ts) that takes the spirals off afterwards.

export type FaceGroup = "Eyes" | "Mouth" | "Blush";

function faceItem(group: FaceGroup): any {
	return typeof InventoryGet === "function" && typeof Player === "object" ? InventoryGet(Player, group) : null;
}

function current(group: FaceGroup): string | null {
	return faceItem(group)?.Property?.Expression ?? null;
}

/** Set one part of her face. False if BC did not take it (no such part, or the expression is not
 * allowed on it), with nothing saved, so the caller can say so (rule 5). */
export function setFace(group: FaceGroup, expression: string): boolean {
	if (typeof CharacterSetFacialExpression !== "function" || !faceItem(group)) return false;
	const saved: FaceSaved = getFaceSaved() ?? { at: Date.now(), groups: {} };
	const before = saved.groups[group];
	const now = current(group);
	// A second command on the same part keeps the face from before the FIRST one, while it is
	// still ours; if she changed it since, what she has now is what goes back.
	const was = before && now === before.set ? before.was : now;
	saved.groups[group] = { was, set: expression };
	setFaceSaved(saved);
	try {
		CharacterSetFacialExpression(Player, group, expression);
	} catch (err) {
		warn(`face: could not set ${group} to ${expression}`, err);
	}
	if (current(group) !== expression) {
		if (before) saved.groups[group] = before;
		else delete saved.groups[group];
		setFaceSaved(saved);
		log(`face: BC did not take ${group} ${expression}`);
		return false;
	}
	log(`face: ${group} ${expression} (was ${was ?? "none"})`);
	return true;
}

/** Put her face back: one part, or all of it. With `only`, just when that part is that expression
 * (a trigger letting go must not undo a face said since). Returns whether anything moved. */
export function clearFace(group?: FaceGroup, only?: string): boolean {
	const saved = getFaceSaved();
	if (!saved) return false;
	const groups = group ? [group] : (Object.keys(saved.groups) as FaceGroup[]);
	let changed = false;
	for (const g of groups) {
		const entry = saved.groups[g];
		if (!entry || (only && entry.set !== only)) continue;
		if (current(g) === entry.set) {
			try {
				CharacterSetFacialExpression(Player, g, entry.was);
				changed = true;
			} catch (err) {
				warn(`face: could not put ${g} back`, err);
			}
		}
		delete saved.groups[g];
	}
	setFaceSaved(saved);
	if (groups.length) log(`face: ${changed ? "put back" : "nothing to put back"} (${groups.join(", ")})`);
	return changed;
}

/** Is any part of her face held by a command right now? */
export function faceHeld(group?: FaceGroup): boolean {
	const saved = getFaceSaved();
	if (!saved) return false;
	return group ? !!saved.groups[group] : Object.keys(saved.groups).length > 0;
}
