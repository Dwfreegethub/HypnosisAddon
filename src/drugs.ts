// Crafted drinks and cigarettes (v0.101.0, DW 2026-10-28).
//
// A crafted item whose name or description carries `[hypno:relax]` or `[hypno:stimulate]` moves a
// drug level, -40 to +40, that feeds the chemical half of the induction alongside arousal
// (session.ts, chemicalLevel). relax makes her easier to put under; stimulate harder. The level
// is a moment, not a record: it decays toward 0, is never saved, and the safeword clears it — so
// rule 4 holds by construction, exactly as it does for arousal. Stored trust is never touched.
//
// Delivery, verified against the R132 client source:
//   - A drink is BC's SipItem activity aimed at her (Activity.js, ActivityRun). The cup is the
//     ACTOR's ItemHandheld, and its Craft — Name and Description both — is synced to everyone in
//     the room (Server.js, ServerAppearanceBundle), so her client reads it directly. The giver
//     needs no add-on, and sipping your own drink is the same activity with herself as actor.
//   - A cigarette has no smoking activity at all, only "In Mouth" / "In Hand" (ItemHandheld,
//     typed 0 / 1) or the ItemMouth cigarette. So a tagged cigarette counts while it is in her
//     mouth, polled once a minute, and builds toward a lower cap than a drink (DW: 40 and 20).
//
// Technique reference: LSCG's injector module (src/Modules/injector.ts) reads the actor's handheld
// Craft on SipItem the same way. No LSCG code is used (rule 7). Its keywords are plain words
// ("mind control", "hypnotizing"); ours are bracketed and namespaced so neither add-on fires on the
// other's drinks.
//
// Not yet built, kept in the design doc's Drug System table: sedate, restore, extend.
import { log, warn } from "./log";
import { tellPlayer } from "./notify";
import { getFeatures } from "./storage";
import { drugsCount, scopeLabel } from "./depth";
import { onTotalStop } from "./teardown";

export type DrugKind = "relax" | "stimulate";
const DIRECTION: Record<DrugKind, number> = { relax: 1, stimulate: -1 };

/** One sip. */
export const DRINK_DOSE = 15;
/** The furthest drinks take the level, either way. */
export const DRINK_CAP = 40;
/** What a cigarette in her mouth adds each minute. */
export const SMOKE_DOSE = 3;
/** The furthest a cigarette takes the level, either way — half a drink's (DW). It never pulls a
 * level that drinks took further back down to it. */
export const SMOKE_CAP = 20;
/** How fast the level returns toward 0 once nothing is feeding it. */
export const DECAY_PER_MINUTE = 1;
const SMOKE_TICK_MS = 60_000;

/** `[hypno:relax]`, any case, spaces allowed inside the brackets. */
const TAG = /\[\s*hypno\s*:\s*([a-z]+)\s*\]/gi;

let level = 0;
let settledAt = 0;
/** The kind of the cigarette in her mouth at the last check, or null. Decay pauses while one is. */
let smoking: DrugKind | null = null;

/** The craft's name and description as one string, description decoded the way BC stores it
 * (CraftingDescription.Decode, Crafting.js), falling back to the raw text. */
export function craftText(craft: any): string {
	if (!craft) return "";
	let description = typeof craft.Description === "string" ? craft.Description : "";
	try {
		if (typeof CraftingDescription !== "undefined" && description) description = CraftingDescription.Decode(description);
	} catch {
		// An undecodable description is still worth scanning as it stands.
	}
	return `${craft.Name ?? ""} | ${description}`;
}

/** The drug a crafted item carries, or null. The first tag we know wins; an unknown tag is
 * ignored rather than refused, so the not-yet-built ones (sedate, restore, extend) are inert. */
export function drugKindOf(craft: any): DrugKind | null {
	const text = craftText(craft);
	for (const match of text.matchAll(TAG)) {
		const word = match[1].toLowerCase();
		if (word === "relax" || word === "stimulate") return word;
	}
	return null;
}

/** Bring the level up to now: decay toward 0, unless a cigarette is holding it. */
function settle(now: number): void {
	if (settledAt && !smoking && level !== 0) {
		const fall = ((now - settledAt) / 60_000) * DECAY_PER_MINUTE;
		level = Math.abs(level) <= fall ? 0 : level - Math.sign(level) * fall;
	}
	settledAt = now;
}

/** The raw drug level, -40 to +40, whether or not the player lets drugs count. */
export function drugLevel(now: number = Date.now()): number {
	settle(now);
	return level;
}

/** The drug level as the induction reads it: 0 unless her chemical scope lets drugs count. */
export function countedDrugLevel(now: number = Date.now()): number {
	return drugsCount() ? drugLevel(now) : 0;
}

/** Move the level `amount` in `kind`'s direction, no further than `cap` that way. A level already
 * past the cap stays where it is: a cigarette does not undo a drink. Returns the new level. */
export function dose(kind: DrugKind, amount: number, cap: number, now: number = Date.now()): number {
	settle(now);
	const dir = DIRECTION[kind];
	const toward = level * dir; // how far it already sits in this drug's direction
	if (toward < cap) level = dir * Math.min(cap, toward + amount);
	return level;
}

/** Set by a total stop while a cigarette is in her mouth: it doses nothing more until it has been
 * taken out, so the safeword is not undone a minute later by what she is still wearing. */
let stubbedOut = false;

/** Everything back to nothing: tests, and the reset below. */
export function clearDrugs(): void {
	level = 0;
	settledAt = 0;
	smoking = null;
	stubbedOut = false;
}

// The safeword and the hard floor end every chemical effect with the rest (rule 2). Registered at
// module load, as teardown.ts asks, so it is in force before anything is installed.
onTotalStop(() => {
	const lit = smoking;
	clearDrugs();
	stubbedOut = !!lit;
});

const FEEL: Record<DrugKind, string> = {
	relax: "A warm looseness spreads through you, and your guard slips a little.",
	stimulate: "A sharp, buzzing clarity sets in. Your mind feels harder to slip past.",
};

function off(kind: DrugKind, what: string): string {
	return `The [hypno:${kind}] in that ${what} does nothing: Chemicals count is set to "${scopeLabel()}". Choose "Arousal + drugs" or "Drugs only" on the Depth tab to let it work.`;
}

/** A sip aimed at her. `actor` is the character holding the cup — her, for her own drink. */
export function handleSip(actor: any): void {
	if (!getFeatures().hypnoEnabled) return; // the hard floor: unticked, the add-on does nothing
	const cup = typeof InventoryGet === "function" ? InventoryGet(actor, "ItemHandheld") : null;
	const kind = drugKindOf(cup?.Craft);
	if (!kind) return; // an ordinary drink is not ours to remark on
	if (!drugsCount()) {
		tellPlayer(off(kind, "drink"));
		return;
	}
	const before = drugLevel();
	const after = dose(kind, DRINK_DOSE, DRINK_CAP);
	log(`drink: ${kind} ${before.toFixed(1)} → ${after.toFixed(1)} (from [${actor?.MemberNumber}])`);
	tellPlayer(after === before ? `${FEEL[kind]} It can't take you any further than it has.` : FEEL[kind]);
}

/** The tagged cigarette in her mouth, if there is one. */
export function cigaretteInMouth(C: any): DrugKind | null {
	if (typeof InventoryGet !== "function") return null;
	const mouth = InventoryGet(C, "ItemMouth");
	if (mouth?.Asset?.Name === "Cigarette") {
		const kind = drugKindOf(mouth.Craft);
		if (kind) return kind;
	}
	const hand = InventoryGet(C, "ItemHandheld");
	// typed 0 is "In Mouth", and the option a fresh cigarette starts on (Female3DCGExtended.js).
	if (hand?.Asset?.Name === "Cigarette" && (hand.Property?.TypeRecord?.typed ?? 0) === 0) return drugKindOf(hand.Craft);
	return null;
}

/** The once-a-minute cigarette check. Exported so the tests can drive it without a clock. */
export function smokeTick(now: number = Date.now()): void {
	const kind = getFeatures().hypnoEnabled ? cigaretteInMouth(Player) : null;
	const was = smoking;
	settle(now); // decay up to now under the OLD state, before a new cigarette pauses it
	if (stubbedOut) {
		if (!kind) stubbedOut = false; // taken out: the next one counts again
		return;
	}
	smoking = kind;
	if (!kind) return;
	if (!drugsCount()) {
		if (was !== kind) tellPlayer(off(kind, "cigarette"));
		return;
	}
	const before = level;
	const after = dose(kind, SMOKE_DOSE, SMOKE_CAP, now);
	if (was !== kind) tellPlayer(FEEL[kind]);
	if (after !== before) log(`cigarette: ${kind} ${before.toFixed(1)} → ${after.toFixed(1)}`);
}

/** One line for /echs drugs and the diagnostics. */
export function describeDrugs(): string {
	const raw = drugLevel();
	const shown = Math.round(raw);
	const what = shown > 0 ? `relaxed (+${shown})` : shown < 0 ? `stimulated (${shown})` : "clear";
	const counts = drugsCount() ? "" : ` — not counting: Chemicals count is "${scopeLabel()}"`;
	const holding = smoking ? `, a ${smoking} cigarette is holding it` : "";
	return `Drugs: ${what}${holding}${counts}.`;
}

export function installDrugs(): void {
	ChatRoomRegisterMessageHandler({
		Description: "HypnosisAddon: crafted drinks",
		// Ahead of BC's arousal handler (210) only so we read the cup before anything else runs; we
		// never stop or rewrite the message.
		Priority: 200,
		Callback: (_data: any, sender: any, _msg: string, metadata: any) => {
			try {
				if (metadata?.ActivityName === "SipItem" && metadata?.TargetMemberNumber === Player?.MemberNumber && sender) {
					handleSip(sender);
				}
			} catch (err) {
				warn("drink handler failed:", err);
			}
			return false;
		},
	});
	setInterval(() => {
		try {
			smokeTick();
		} catch (err) {
			warn("cigarette check failed:", err);
		}
	}, SMOKE_TICK_MS);
	log("drinks and cigarettes installed");
}
