import { compressToBase64, decompressFromBase64 } from "lz-string";
import { log, warn } from "./log";
import { valueFromCount, countFromValue, H_TRUST, H_EXPERIENCE } from "./curve";
// A deliberate cycle: session.ts imports this module, and this module imports it back. DW's
// call, made 2026-09-12 with the cost stated — see the Known Bug #4 note in design.md. It is
// safe because nothing here calls into session.ts at module-init time; stopForReset() is
// reached only from inside resetSettings(), long after both modules have finished loading,
// and both sides are hoisted `function` declarations rather than const bindings.
// If anything in this module ever needs session.ts at TOP LEVEL, this breaks — go back to
// the registration hook rather than reordering imports and hoping.
import { stopForReset } from "./session";

const SETTINGS_KEY = "HypnosisAddon";
// The old un-keyed `HypnosisAddon_Backup` is abandoned rather than migrated: it was shared
// by every account in the browser, so there is no way to tell whose data is in it. Left in
// place rather than deleted, in case it's ever needed for forensics.

/** The localStorage backup key for THIS account.
 *
 * localStorage is per-ORIGIN, not per-tab or per-account, so two characters open in two
 * tabs of the same browser share it completely. With one fixed key they overwrote each
 * other's stats and, worse, a tab reading before login would fall back to whatever the
 * other character had just written and could then save that into its own account data.
 * DW hit exactly this: both characters showed identical stats.
 *
 * Returns null before we know who we are — callers must then neither read nor write the
 * backup, because a guess here silently corrupts real data. */
function backupKey(): string | null {
	const member = Player?.MemberNumber;
	return typeof member === "number" && member > 0 ? `${SETTINGS_KEY}_Backup_${member}` : null;
}

/** Decay speed, stored as a NAME rather than a number.
 *
 * DW's call, and the right one: the player picks "Slowly", not "1.0 interactions per day",
 * so the numbers behind these can be retuned freely without anyone's saved choice changing
 * meaning. Same reasoning as triggerScope — a stored index or a stored magnitude both go
 * quietly wrong the moment the scale is edited. */
export type DecayRate = "never" | "veryslow" | "slow" | "typical" | "fast" | "veryfast";

/** Interactions lost per day of no contact.
 *
 * Subtracting a flat count from `n` gives a decay shape for free, and it is the opposite of
 * the intuitive one — worth writing down, because the first version of this comment had it
 * backwards. Since `trust = 100n/(n+25)`, the curve is steep at the bottom and flat at the
 * top, so a fixed number of lost interactions costs a casual acquaintance far more than an
 * established relationship. A month at "typical" (60 interactions):
 *
 *     trust 30 -> 0      an acquaintance is simply forgotten
 *     trust 50 -> 0
 *     trust 75 -> 37     a real relationship is halved
 *     trust 90 -> 87     a deep one barely notices
 *
 * That is the right shape and needs no second curve: out of sight, out of mind applies to
 * people you barely know, while someone you have spent months with does not fade in a
 * month. It also means the low end can hit zero quickly, which is what the relationship
 * floors are for. */
export const DECAY_PER_DAY: Record<DecayRate, number> = {
	never: 0,
	veryslow: 0.25,
	slow: 1,
	typical: 2,
	fast: 5,
	veryfast: 12,
};

export const DECAY_RATES: { key: DecayRate; label: string }[] = [
	{ key: "never", label: "Never" },
	{ key: "veryslow", label: "Very slowly" },
	{ key: "slow", label: "Slowly" },
	{ key: "typical", label: "Typical" },
	{ key: "fast", label: "Fast" },
	{ key: "veryfast", label: "Very fast" },
];

/** How many times one hypnotist may try an induction before the cooldown shuts them out.
 *
 * Two values, not a range. design.md records the decision as *"default 2, with 3 available
 * as a player setting"*, so this offers exactly what was decided and nothing more — a 1 or a
 * 5 would be re-deciding it in code rather than implementing it. Stored as the NUMBER rather
 * than as a name, unlike the decay rates, because unlike "Slowly" the number is the whole
 * meaning: what a player picks here is literally how many tries someone gets, and there is
 * nothing behind it left to retune.
 *
 * It is the SUBJECT's setting and nobody else's. A hypnotist is shown the subject's limit
 * only because the subject's own client sends it; see session.ts's push. */
export const ATTEMPT_LIMITS = [2, 3];

/** How much of a hypnotist's CLAIMED skill the subject's client lets reach the roll. A ladder,
 * not a switch — the subject decides in advance how much to believe a number that arrives from
 * someone else's machine, which is the whole of what makes "declared and visible" skill obey
 * the subject-authoritative rule (declared-skill-proposal.md §1). The LAST rung ("full") is
 * defined here so the honour function and the test sweep are complete, but it is NOT offered by
 * the settings cycle: it is the CNC rung, and the proposal gates OFFERING it on dual fatigue
 * existing (§4). SKILL_HONOUR_OFFERED is what the button walks, and is every rung but that one.
 *
 * Ordered by how much they let through, so the button's cycle reads as a ladder. "floored" is
 * `max(trusted, capped)` and therefore sits above both — see DEFAULT_SKILL_HONOUR below. */
export const SKILL_HONOUR_RUNGS: { key: string; label: string }[] = [
	{ key: "ignore", label: "Ignore it" },
	{ key: "trusted", label: "Only from people I trust" },
	{ key: "capped", label: "Honour, capped" },
	{ key: "floored", label: "Full from people I trust, capped otherwise" },
	{ key: "full", label: "Skill can beat my resistance" },
];
export const SKILL_HONOUR_OFFERED = SKILL_HONOUR_RUNGS.slice(0, 4);
/** Rung 3b, and the default since v0.75.0 — `max(trusted, capped)`.
 *
 * Rung 2 was the default before, and it is worth EXACTLY ZERO to a stranger by construction:
 * it scales the claim by existing trust, and a new pair has none. So the whole skill ladder
 * was invisible on a first meeting, which is the one meeting where a practised hypnotist most
 * needs to read as practised. DW, 2026-09-17: make skill count, and make sure little or no
 * skill never LOWERS the chance.
 *
 * `max()` is what buys the second half. Rung 2 alone under-serves a stranger; rung 3 alone
 * under-serves an established pair (`min(v, 30)` is BELOW `v * trust/100` for any trust above
 * the ceiling, so defaulting everyone to rung 3 would have cut a trusted expert from +35 to
 * +10.5). Taking the larger of the two can only ever raise the honoured value relative to
 * either rung, and at a claim of zero both are zero, so the floor is free.
 *
 * This is deliberately the same shape as `effectiveAccess()`: a FLOOR, not a multiplier, for
 * the same settled reason — a multiplier on zero trust is still zero, and the stranger is the
 * case the mechanic exists to serve.
 *
 * Rung 2 is KEPT and still offered. Someone who chose "only from people I trust" meant
 * strangers get nothing, and quietly loosening a consent setting they picked on purpose is not
 * ours to do; only the default moves, and the setting is stored SPARSELY — written only when
 * the player changes it — so an existing explicit choice is untouched. See §2. */
export const DEFAULT_SKILL_HONOUR = "floored";

/** The starter set offered on first launch (proposal §9). Deliberately the mildest, most
 * obviously-reversible five: enough to show what the add-on does, nothing that persists past
 * the session or deceives the subject. Kept here as the single source so the button and its
 * test agree on exactly which. */
export const STARTER_FEATURES: (keyof FeatureToggles)[] = [
	"hypnoEnabled",
	"movementRestriction",
	"speechRestriction",
	"postureControl",
	"clothingRestriction",
];

/** The decided default. Read by anyone who has to name a limit without one to read —
 * notably the hypnotist's view of a subject who has not told us theirs. */
export const DEFAULT_MAX_ATTEMPTS = 2;

/** Cycle to the next allowed limit, wrapping. The settings screen advances by clicking,
 * the way the depth tiers do — a two-value choice does not earn a dropdown. */
export function nextAttemptLimit(current: number): number {
	const i = ATTEMPT_LIMITS.indexOf(current);
	return ATTEMPT_LIMITS[(i + 1) % ATTEMPT_LIMITS.length];
}

/** A BC relationship, as it bears on trust. */
export type RelationKind = "none" | "friend" | "lover" | "owner";

export interface TrustEntry {
	memberId: number;
	memberName: string;
	/** Interaction COUNT, not a 0-100 value — see curve.ts for why. Derive the trust
	 * value with `trustWith()`; never store one. */
	interactions: number;
	lastUpdated: number;
}

/** A planted trigger. Persistent — this is the first thing the add-on stores that outlives
 * a session, which is why the doc gates it on relationship trust alone. */
export interface Trigger {
	/** The trigger's identity, unique per subject: whatever fires it. For a phrase trigger it IS
	 * the phrase. Stored rather than computed so that a trigger with no phrase (touch-fired,
	 * delayed) can exist later without deletion and de-duplication each growing a branch —
	 * design.md, "Trigger Storage". Back-filled from `phrase` in normalise. */
	key: string;
	/** Normalised phrase, matched against normalised chat. */
	phrase: string;
	/** Suggestion ids to run, in the order they were spoken. */
	actions: string[];
	installedBy: number;
	installedByName: string;
	installedAt: number;
	// --- decay, added v0.60.0. See triggers.ts for the arithmetic. -------------------------
	/** How deep the subject was when this was planted, which is also its starting strength
	 * and its ceiling. The doc's rule that "a trigger planted at Blank decays more slowly
	 * than one at Drifting" needs the planting depth kept, not just the fact it was allowed. */
	plantedDepth: number;
	/** Planted on a chemically-elevated floor: it would NOT have been permitted on earned
	 * depth alone. Such triggers use the fixed fast rate whatever tier they were planted at —
	 * the price of the shortcut, and deliberately not configurable.
	 *
	 * Today this is always false, because triggerControl is earned-only and the chemical half
	 * cannot reach it at all. It is recorded rather than assumed because the earned-only
	 * default is becoming player-adjustable, and on that day a trigger planted at 80 full /
	 * 20 earned has to already know what it was. */
	plantedChemical: boolean;
	/** Last FULL reinforcement — a re-induction by the installer. Decay is measured from
	 * here, not from installedAt. */
	reinforcedAt: number;
	/** Firings since the last full reinforcement. Passive reinforcement: each one buys back
	 * some of the elapsed time, so use slows decay without ever resetting the clock. */
	firings: number;
	// --- per-trigger options, added v0.87.0 (design.md, "Trigger Overhaul"). All optional: ---
	// --- absent is exactly the behaviour every trigger had before, so none needs migrating. ---
	/** Who the INSTALLER asked to be able to fire it. Never wider than the subject's own global
	 * scope — the narrower of the two applies at fire time. Absent = follow the global. */
	scope?: TriggerScope;
	/** Hard end, as wall-clock ms, independent of decay: the trigger ends at whichever comes
	 * first. Set from what the installer asked for, clamped to the subject's lifespan ceiling.
	 * Absent = no hard end. */
	expiresAt?: number;
	/** Fires once, then removes itself. */
	oneShot?: boolean;
	/** A one-shot that has fired. It fires no more, and is deleted the moment it stops holding
	 * the subject — not before, or its effects would be left with nothing to release them. */
	spent?: boolean;
	/** Match the phrase only as whole words ("sleepy" does not fire on "sleepyhead"). The
	 * subject's `strictTriggerMatch` forces this on for every trigger. */
	strict?: boolean;
	// --- delayed compulsions (trigger overhaul Build 6, inside v0.90.0) ---------------------
	/** What fires it, when it is not a phrase. Absent = a phrase trigger, as every trigger was.
	 * `wake`: `delayMs` after the subject wakes from a trance with its installer.
	 * `arrive`: when the watched person enters the room. `speak`: when they speak.
	 * These have `phrase: ""` and a synthetic `key` — design.md, "Trigger Storage". */
	fireOn?: "wake" | "arrive" | "speak";
	/** `wake` only: how long after waking. */
	delayMs?: number;
	/** `wake` only: wall-clock time it is due, set when the trance ends. Absent = dormant. */
	dueAt?: number;
	/** `arrive`/`speak`: whose arrival or voice. "*" = anyone but the subject. */
	watchName?: string;
	/** `arrive`/`speak`: their member number, when they could be identified at planting. */
	watchMember?: number;
}

/** The non-phrase conditions a trigger can fire on. */
export const TRIGGER_CONDITIONS = ["wake", "arrive", "speak"] as const;

export type TriggerScope =
	| "hypnotist"
	| "owner"
	| "lovers"
	| "whitelist"
	| "dominants"
	| "notblack"
	| "everyone";

/** Every scope, tightest first — the same order as TRIGGER_SCOPES in triggers.ts, which carries
 * the labels. Here so normalise can validate a stored per-trigger scope without importing
 * triggers.ts, which imports this module. "Narrower" means earlier in this list. */
export const TRIGGER_SCOPE_KEYS: TriggerScope[] = [
	"hypnotist",
	"owner",
	"lovers",
	"whitelist",
	"dominants",
	"notblack",
	"everyone",
];

export interface FeatureToggles {
	/** Master switch — see menu.ts's onToggle for the "turning this off suspends the
	 * others" behavior, matching the design doc's hard-floor philosophy. */
	hypnoEnabled: boolean;
	/** Freeze effect. */
	movementRestriction: boolean;
	/** BlockWardrobe effect only. Message suppression used to ride on this flag too — the
	 * design doc groups both under "Clothing Confusion" — but that made granting a
	 * permission silently eat Action messages during ordinary play, outside any session,
	 * with nothing in the settings admitting to it. Suppression is getting its own explicit
	 * toggles; this is now just the wardrobe block. */
	clothingRestriction: boolean;
	/** Posture suggestions: every leg and arm pose (kneel, stand, sit, hands behind back...). Separate from movementRestriction because
	 * being posed and being unable to move are quite different things to consent to. */
	postureControl: boolean;
	/** Follow / leash: a compulsion to trail the hypnotist, including across room changes.
	 * Its own permission rather than a corner of movementRestriction — being unable to move
	 * and being unable to leave someone's side are opposite kinds of restriction (one roots
	 * you, the other drags you), and are different things to consent to. Session-only: it
	 * makes the subject leashable via BC's own leash while entranced and cuts the leash on
	 * waking. See follow.ts. */
	followControl: boolean;
	/** Blocking the subject from touching themselves, or named body parts. */
	selfTouchControl: boolean;
	/** May a hypnotist make the subject PERFORM activities (touch themselves, on command).
	 * The mirror of selfTouchControl, which only ever BLOCKS: this compels. Separate consent,
	 * because being driven to act is a different thing from being stopped. */
	compelActivity: boolean;
	/** May a hypnotist make the subject act on SOMEONE ELSE in the room — "kiss Rei", "pinch
	 * Rei's nipples" (v0.84.0). Needs compelActivity as well. Its own consent because being
	 * made to act is not the same as being made to act on a stranger. Aiming at the hypnotist
	 * ("kiss me") does NOT need this: they asked for it, and compelActivity already covers it
	 * (DW, 2026-09-23). The TARGET's consent is BC's own — see handleTargetedActivityCommand. */
	compelTouchOthers: boolean;
	/** May a planted trigger make the subject SAY something aloud (v0.90.0, trigger overhaul Build 5).
	 * Its own consent: words in the subject's mouth, in front of the room, are a different thing from
	 * a restriction on them. Sent through BC's own chat path, so a gag still garbles it. */
	forcedSpeech: boolean;
	/** The clothing illusion: the subject's own screen keeps showing how they looked when
	 * it was applied, while everyone else sees the truth. Carries a trust threshold of 65
	 * on top of this permission — the same number as triggers and carry-forward, and the
	 * same number as the owner floor, so ownership alone reaches all three. Deceptive
	 * rather than restricting, so the arousal floor never counts toward it. */
	illusionControl: boolean;
	/** Taking the subject's own clothes off, one garment at a time.
	 *
	 * Its own permission rather than a corner of clothingRestriction, which is only the
	 * wardrobe BLOCK. Being undressed by somebody and being unable to open your wardrobe are
	 * quite different things to agree to, and this one is the only effect in the add-on that
	 * changes what the whole room can see rather than only what the subject experiences. */
	undressControl: boolean;
	/** Come back CLEAR after a disconnect instead of resuming where you left off.
	 *
	 * Off by default, because BC drops people constantly and losing a scene to a thirty-second
	 * network blip is the worse outcome. On, nothing survives a reconnect — no trance, no
	 * carried suggestion, and no remaining trigger time. The escape hatch for anyone who does
	 * not want a technical failure to be a way of being held. */
	releaseOnDisconnect: boolean;
	/** Whether `/hypno triggers` shows you the phrases that fire your own triggers.
	 *
	 * OFF by default, which is the design doc's "trigger words hidden by default, with a
	 * player setting to show them". Hiding is the interesting default — you cannot decide
	 * not to react to a word you have not read — but it is a preference rather than a
	 * protection, and it is the subject's own to set. Anyone determined to see their
	 * triggers can tick this, which is the same "feels locked, isn't literally" layer the
	 * doc describes everywhere else. */
	showTriggerWords: boolean;
	/** Whether being silenced ALSO gags out-of-character asides — text in parentheses,
	 * BC's own OOC convention: "(brb, dog needs out)".
	 *
	 * OFF by default (DW, 2026-09-16): stepping out of a scene to say something practical is
	 * not part of the fiction, and silencing it strands people mid-scene with no way to say
	 * "back in five" short of the safeword. So while the subject cannot speak, a message that
	 * is ENTIRELY OOC still goes through; a line with any in-character content left after the
	 * asides are stripped is blocked as before, so this cannot be used to smuggle real speech
	 * past the block. Someone who wants total silence — no lifeline — ticks this. Governs both
	 * the speechRestriction permission and the tranceCannotSpeak default, since both silence
	 * the same way. */
	blockOOC: boolean;
	/** Every trigger matches whole words only, whatever the installer chose — so a trigger
	 * cannot go off in the middle of an ordinary word. Off by default: substring matching is
	 * what every trigger did before v0.87.0. */
	strictTriggerMatch: boolean;
	/** Whether YOU may fire triggers planted in you, by saying the phrase yourself.
	 *
	 * Its own setting rather than a rung on the scope ladder, because the ladder answers
	 * "which OTHER people may fire this" and evaluating it against yourself gave answers
	 * nobody chose: `everyone` and `notblack` trivially include you, and `dominants`
	 * compared your own reputation against itself plus 25, which is always true. So three
	 * scopes allowed self-firing and four did not, for no reason a player could predict.
	 *
	 * Off by default. A trigger's whole fiction is that someone else put it there and it
	 * fires outside your control; someone who wants to reinforce their own conditioning can
	 * tick this, while someone who does not would otherwise have to discover it happening. */
	selfTrigger: boolean;
	/** Letting a suggestion given under trance survive waking. Separate from triggerControl
	 * because they are different bargains: a trigger lies dormant until someone says a word,
	 * while a carried suggestion is simply still true when you wake up. Same trust
	 * threshold (65) for the same reason — both outlive the session, so neither may be
	 * reached by the arousal floor. */
	carryForward: boolean;
	/** Letting a hypnotist plant persistent triggers. Separate from everything else
	 * because a trigger outlives the session that created it — the individual actions a
	 * trigger fires still answer to their own permissions when it goes off. */
	triggerControl: boolean;
	/** Silencing suggestions ("you cannot speak"). */
	speechRestriction: boolean;
	/** Arousal level, forced orgasm and orgasm denial — one permission for all six, per
	 * DW. They're deliberately NOT split the way kneel was split out of movement: kneeling
	 * and being frozen are different things to consent to, whereas "someone may move my
	 * arousal around" covers the whole set as one decision. Drives BC's own arousal system,
	 * so it does nothing at all for a player whose meter is set to Inactive. */
	arousalControl: boolean;
	/** Permission to hide messages about clothing changes done to you. */
	suppressClothing: boolean;
	/** Permission to hide messages about restraints applied to or removed from you. */
	suppressBondage: boolean;
	/** Hide the hypnotist's trigger-setup lines while a trigger is being planted, so the
	 * subject knows something is being given but not what, and never sees the phrase.
	 * Lives with the other awareness settings because it is the same kind of thing:
	 * choosing not to be shown something that is happening to you. */
	suppressTriggerSetup: boolean;
	/** Permission to hide messages about activities done to you (touching, kissing).
	 * Hides the message only — arousal still applies. */
	suppressActivities: boolean;
	/** Freeze this settings screen for the duration of a session: every checkbox greys out
	 * and clicks are ignored until it ends. Replaced a "Hidden Activities" toggle that ended
	 * up gating nothing (see messaging.ts).
	 *
	 * THE WHOLE SESSION, not only the trance — widened in v0.65.1 on DW's call. It used to
	 * bite only once the subject was actually under, which left the induction itself editable:
	 * a hypnotist could be mid-attempt and the subject could still grant the permission they
	 * were about to reach for, or move `maxAttempts` to hand them another try. The field keeps
	 * its old name because renaming a stored key costs a migration for nothing.
	 *
	 * Deliberately locks ITSELF too — being able to switch the lock off mid-session would
	 * make it decorative. `/hypno safeword` is the way out, and it's a chat command rather
	 * than a menu action, so this can never trap anyone. */
	lockedWhileHypnotized: boolean;

	// --- Trance state defaults -------------------------------------------------------
	// A different KIND of setting from the permissions above, and the defaults are
	// inverted for a reason. The permissions answer "may someone else do this to me",
	// so they start off. These answer "what is being under actually like for me" — the
	// baseline experience of a trance the player already consented to by accepting an
	// induction — so per the design doc they start ON.
	//
	// They gate on hypnoEnabled only, NOT on the matching permission above: the
	// permissions govern what a hypnotist can reach for on demand, while these describe
	// the state itself. A player who wants trance to feel like nothing can switch them off.

	/** Freeze on entering trance. */
	tranceCannotMove: boolean;
	/** Block outgoing room chat while under. */
	tranceCannotSpeak: boolean;
	/** Dreamlike veil over the screen while under. */
	tranceScreenFade: boolean;
	/** Whether the room sees your reactions, as emotes.
	 *
	 * On by default: without it the add-on narrates a great deal that nobody but you can
	 * read, so a scene that is rich from the inside is silent from the outside. Only things
	 * somebody standing there could actually observe are ever emoted — perception effects
	 * stay private by construction, since nobody can watch you fail to notice something.
	 *
	 * Worth being able to switch off all the same: emoting in a public room tells everyone
	 * present that you are running this, and describes fairly intimate behaviour while it
	 * does so. */
	roomSeesReactions: boolean;
	/** Freeze-frame the subject's own view of their clothes on entering trance.
	 *
	 * DELIBERATELY OFF by default, unlike the three above. Those three are things the
	 * subject *feels* happening to them; this one makes their own screen tell them
	 * something untrue, which is a larger step and should not arrive unannounced on an
	 * upgrade. Opt in. */
	tranceClothingFreeze: boolean;
}

interface HypnoAddonSettings {
	version: string;
	trust: TrustEntry[];
	/** Single pool, per DW: practice with hypnosis is one skill, and which way you point
	 * it (cooperating or resisting) is a per-attempt choice rather than a separate stat.
	 * Also a count, not a value. */
	experience: number;
	triggers: Trigger[];
	/** Who besides the installer may fire a trigger. Stored as a NAME rather than an index
	 * so that reordering the dropdown can never silently change what someone chose. */
	triggerScope: TriggerScope;
	/** Minutes a fired trigger's effects last before releasing themselves. 0 means no
	 * limit — they stay until released by name or by the safeword. */
	triggerDurationMinutes: number;
	/** The longest a newly planted trigger may LIVE, in minutes; 0 = no ceiling. One of
	 * TRIGGER_LIFESPANS. Different from triggerDurationMinutes, which is how long a FIRED
	 * trigger's effects hold. Applies at planting only: lowering it does not shorten triggers
	 * already in place. */
	triggerLifespanMinutes: number;
	/** Drop triggers: off (the default — a drop is refused, planted or fired), once (every drop
	 * trigger works one time and is gone), or unlimited (it works until it fades, if its installer
	 * asked for that). One of DROP_MODES. */
	dropTriggers: DropMode;
	/** How many induction attempts one hypnotist gets before a cooldown. One of
	 * ATTEMPT_LIMITS; anything else is normalised back to the default on load. */
	maxAttempts: number;
	/** How fast trust fades without contact. */
	decayRate: DecayRate;
	/** How fast planted triggers fade without reinforcement. Deliberately a SEPARATE setting
	 * from trust's — the doc says so, and they are different relationships: trust is what
	 * someone has built with you, a trigger is a thing left inside you, and wanting one to
	 * persist says nothing about the other. */
	triggerDecayRate: DecayRate;
	/** Per-feature depth requirements, as tier NAMES, and ONLY where the player has changed
	 * one. The defaults live in depth.ts, so retuning them moves everyone who has not made a
	 * choice — the same principle as the decay rates. A stored copy of every default would
	 * freeze the design at whatever it was the day somebody first opened the screen. */
	depthGates: Record<string, string>;
	/** Which earned-only features the subject has chosen to let CHEMICAL depth reach — the
	 * per-feature toggle decided 2026-09-08. Sparse and true-only: a key present with `true`
	 * means "arousal may take me here"; absence means the earned-only default. Only the two
	 * chemically-toggleable gates (`illusionControl`, `triggerControl`) are ever written here;
	 * carry-forward stays earned-only until it has a decay clock of its own. The safeguard for
	 * anything seeded this way is that it fades fast — which for triggers is `plantedChemical`
	 * driving `CHEMICAL_DECAY_PER_DAY`, and for the session-scoped illusion is simply that it
	 * does not outlive the trance. */
	chemicalReach: Record<string, boolean>;
	/** How much of another hypnotist's claimed skill this subject's client honours. Absent means
	 * "never chose" and resolves to DEFAULT_SKILL_HONOUR in code — stored only on change, so the
	 * default stays reversible (§2, and the same reasoning as depthGates). One of
	 * SKILL_HONOUR_RUNGS; an invalid stored value is dropped on load. */
	skillHonour?: string;
	/** First-launch starter offer: absent = new (show it), "applied" = show the undo, "done" =
	 * dismissed. Sparse, so a fresh install is "new" with nothing stored. */
	starterState?: string;
	/** First-run notice shown once per install (the discovery notice, distinct from the starter
	 * offer above — that asks "have they configured?", this asks "have we told them the add-on is
	 * here and silent by default?"). Absent = not yet shown; set true the first time it fires, so
	 * it can never nag. `normalise()` back-fills it true for anyone already configured, so an
	 * upgrade does not greet every existing user. Sparse, like the other reversible defaults. */
	welcomeShown?: boolean;
	/** The player's OWN practice as a hypnotist, as an interaction COUNT through the shared
	 * curve — never a stored value — exactly like `experience`. Transmitted (derived) on every
	 * induction this player attempts; what the far side then does with it is their setting. */
	skill: number;
	/** What may contribute the chemical half of depth.
	 *
	 * The doc says wizard-skippers get "Neither". There is no wizard yet, and shipping that
	 * default would silently switch off the arousal floor that has worked since v0.18.0 — a
	 * regression dressed as a default. "Arousal only" IS the current behaviour; the wizard can
	 * set it to something else the day it exists. */
	chemicalScope: string;
	/** TESTING ONLY: pretend a relationship exists, keyed by member number as a string
	 * because JSON object keys always are. Set with `/hypno relate`. Lets the relationship
	 * floors be exercised without actually collaring anyone. */
	relationshipOverride: Record<string, RelationKind>;
	features: FeatureToggles;
}

function defaultFeatures(): FeatureToggles {
	return {
		hypnoEnabled: false,
		movementRestriction: false,
		clothingRestriction: false,
		postureControl: false,
		followControl: false,
		speechRestriction: false,
		selfTouchControl: false,
		compelActivity: false,
		compelTouchOthers: false,
		forcedSpeech: false,
		arousalControl: false,
		illusionControl: false,
		undressControl: false,
		releaseOnDisconnect: false,
		carryForward: false,
		showTriggerWords: false,
		// Off by default — OOC asides pass even while silenced. See the interface note.
		blockOOC: false,
		selfTrigger: false,
		strictTriggerMatch: false,
		triggerControl: false,
		suppressClothing: false,
		suppressBondage: false,
		suppressActivities: false,
		suppressTriggerSetup: false,
		lockedWhileHypnotized: false,
		// On by default — see the note on the interface.
		tranceCannotMove: true,
		tranceCannotSpeak: true,
		tranceScreenFade: true,
		roomSeesReactions: true,
		// The one trance default that starts off — see the note on the interface.
		tranceClothingFreeze: false,
	};
}

function defaultSettings(): HypnoAddonSettings {
	return {
		version: "0.4.0",
		trust: [],
		experience: 0,
		skill: 0,
		triggers: [],
		triggerScope: "hypnotist",
		triggerDurationMinutes: 5,
		triggerLifespanMinutes: 0,
		dropTriggers: "off",
		maxAttempts: DEFAULT_MAX_ATTEMPTS,
		// OFF by default, deliberately. Every existing entry carries a `lastUpdated` from
		// whenever it was last touched, so shipping this switched on would decay months of
		// stored trust the first time someone loaded the new build. Opt in.
		decayRate: "never",
		// OFF by default for the same reason trust decay is: every stored trigger carries a
		// reinforcedAt from whenever it was planted, so shipping this switched on would fade
		// triggers that were planted under a promise they would not. Opt in.
		triggerDecayRate: "never",
		depthGates: {},
		chemicalReach: {},
		chemicalScope: "arousal",
		relationshipOverride: {},
		features: defaultFeatures(),
	};
}

let cached: HypnoAddonSettings | null = null;
/** Did the cache come from the account's own server-synced data, or only from the
 * localStorage backup / defaults? See loadSettings. */
let cachedFromAccount = false;
/** Set when a load fell over, so /hypno storage can report it rather than it being a
 * console line nobody saw. */
let lastLoadError = "";

/** Bring a settings blob up to the current schema. Shared by load and import, so a blob
 * exported from an older version is migrated on the way in rather than later.
 *
 * Reconciles toggles by starting from the defaults and copying across only keys that still
 * exist. That does three jobs at once: a blob saved before `features` existed (0.2.x) gets
 * one; a newly-added toggle reads as a real `false` rather than `undefined`; and toggles
 * from an older schema are dropped rather than riding along forever. A plain spread of
 * stored-over-defaults kept dead keys, which then surfaced as granted permissions in
 * diagnostics — confusing in exactly the place you go to read the truth. */
function normalise(settings: HypnoAddonSettings | null): HypnoAddonSettings {
	const s = settings ?? defaultSettings();
	const stored = (s.features ?? {}) as Partial<FeatureToggles>;
	const merged = defaultFeatures();
	for (const key of Object.keys(merged) as (keyof FeatureToggles)[]) {
		if (typeof stored[key] === "boolean") merged[key] = stored[key];
	}
	s.features = merged;
	s.experience ??= 0;
	s.triggers ??= [];
	s.triggerScope ??= "hypnotist";
	if (typeof s.triggerDurationMinutes !== "number") s.triggerDurationMinutes = 5;
	// Absent means "never chose", which takes the default — the same rule the depth gates and
	// the chemical scope already follow, and the reason defaults live in code at all. So a
	// blob saved before this setting existed moves from the old hardcoded 3 to the decided 2.
	// Deliberately NOT the decay rates' treatment: those ship "never" because switching them
	// on would have eaten stored trust, and there is no equivalent loss here — one fewer try
	// per cooldown is a pace change, and it is the pace that was decided.
	if (!ATTEMPT_LIMITS.includes(s.maxAttempts)) s.maxAttempts = DEFAULT_MAX_ATTEMPTS;
	if (!TRIGGER_LIFESPANS.some((l) => l.minutes === s.triggerLifespanMinutes)) s.triggerLifespanMinutes = 0;
	if (!DROP_MODES.some((m) => m.key === s.dropTriggers)) s.dropTriggers = "off";
	if (typeof s.skill !== "number" || !(s.skill >= 0)) s.skill = 0;
	// An invalid rung is DELETED, not defaulted, so the code default keeps governing it — a
	// stored "trusted" would freeze today's default into that install forever.
	if (s.skillHonour !== undefined && !SKILL_HONOUR_RUNGS.some((r) => r.key === s.skillHonour)) {
		delete s.skillHonour;
	}
	if (!DECAY_RATES.some((r) => r.key === s.decayRate)) s.decayRate = "never";
	if (!DECAY_RATES.some((r) => r.key === s.triggerDecayRate)) s.triggerDecayRate = "never";
	// Triggers planted before v0.60.0 have no strength history. Planting has always required
	// Deep, so that is the honest floor to assume — generous readings would have old triggers
	// outliving new ones, and a stricter one would quietly weaken work already done.
	if (Array.isArray(s.triggers)) {
		for (const t of s.triggers as Trigger[]) {
			if (typeof t.plantedDepth !== "number") t.plantedDepth = 60;
			if (typeof t.plantedChemical !== "boolean") t.plantedChemical = false;
			// From installedAt, not from now: a trigger planted three weeks ago and never
			// reinforced has not just been reinforced. Decay is off by default, so nothing
			// fades until the subject opts in — but when they do, the clock must be honest.
			if (typeof t.reinforcedAt !== "number") t.reinforcedAt = t.installedAt ?? Date.now();
			if (typeof t.firings !== "number") t.firings = 0;
			// v0.87.0. Every trigger before it was a phrase trigger, so its key is its phrase.
			if (typeof t.key !== "string" || !t.key) t.key = t.phrase;
			// Invalid optional values are DELETED, so the absent default governs — the
			// skillHonour rule.
			if (t.scope !== undefined && !TRIGGER_SCOPE_KEYS.includes(t.scope)) delete t.scope;
			if (t.expiresAt !== undefined && !(typeof t.expiresAt === "number" && t.expiresAt > 0)) delete t.expiresAt;
			if (typeof t.oneShot !== "boolean") delete t.oneShot;
			if (typeof t.spent !== "boolean") delete t.spent;
			if (typeof t.strict !== "boolean") delete t.strict;
			if (t.fireOn !== undefined && !TRIGGER_CONDITIONS.includes(t.fireOn)) delete t.fireOn;
			if (t.delayMs !== undefined && !(typeof t.delayMs === "number" && t.delayMs >= 0)) delete t.delayMs;
			if (t.dueAt !== undefined && !(typeof t.dueAt === "number" && t.dueAt > 0)) delete t.dueAt;
			if (t.watchName !== undefined && typeof t.watchName !== "string") delete t.watchName;
			if (t.watchMember !== undefined && typeof t.watchMember !== "number") delete t.watchMember;
		}
	}
	// Anyone with evidence of having been through setup has already met the add-on, so mark the
	// first-run notice as shown for them — otherwise every existing user gets greeted on the next
	// load after this ships. Only a real signal counts: `starterState` is set precisely when
	// someone has taken or waved off the starter offer or finished the wizard.
	if (s.starterState === "done" || s.starterState === "applied") s.welcomeShown = true;
	if (!s.depthGates || typeof s.depthGates !== "object") s.depthGates = {};
	if (!s.chemicalReach || typeof s.chemicalReach !== "object") s.chemicalReach = {};
	if (typeof s.chemicalScope !== "string") s.chemicalScope = "arousal";
	if (!s.relationshipOverride || typeof s.relationshipOverride !== "object") s.relationshipOverride = {};
	s.trust ??= [];
	// Purge any entry for ourselves. Nothing should ever have created one — see the guard in
	// noteConversation — but entries written before that guard was tightened are still in
	// people's saved data, and "how much do I trust me" is noise in every list it appears in.
	if (typeof Player?.MemberNumber === "number") {
		s.trust = s.trust.filter((t) => t.memberId !== Player.MemberNumber);
	}
	// And anyone who has decayed away to nothing. Kept separate from the self purge above
	// because they are different problems: that one is data that should never have existed,
	// this one is data that has simply run out.
	s.trust = s.trust.filter((t) => typeof t.interactions !== "number" || t.interactions > 0);
	// Migrate entries written before trust was stored as a count. The old field held a
	// 0-100 value; convert it back through the curve so existing data survives rather than
	// silently resetting to zero.
	for (const entry of s.trust) {
		const legacy = (entry as unknown as { relationshipTrust?: number }).relationshipTrust;
		if (typeof entry.interactions !== "number" && typeof legacy === "number") {
			entry.interactions = countFromValue(legacy, H_TRUST);
			delete (entry as unknown as { relationshipTrust?: number }).relationshipTrust;
			log(`migrated trust for ${entry.memberName}: value ${legacy} → ${entry.interactions.toFixed(1)} interactions`);
		}
		entry.interactions ??= 0;
	}
	return s;
}

function loadSettings(): HypnoAddonSettings {
	const accountRaw = Player?.ExtensionSettings?.[SETTINGS_KEY];
	const haveAccount = typeof accountRaw === "string" && accountRaw.length > 0;

	// Re-read once the account's real data becomes available.
	//
	// This is a data-loss trap, not a nicety. `Player` is a placeholder until login and
	// gets wholesale-replaced then (see CharacterCreatePlayer). If anything reads settings
	// before that, we'd cache localStorage-or-defaults and keep them forever — and the
	// next save would write that stale copy straight over the good server-side data. It
	// bites hardest exactly when localStorage is empty but the account has data: a
	// different browser, cleared site data, or a DIFFERENT BC HOST, since localStorage is
	// per-origin and each mirror BC is served from (bondage-europe.com, bondageeurope.com,
	// bondage-asia.com) is a separate origin from bondageprojects. Every one of them is in the
	// @match list in meta.txt; arriving on a host for the first time is exactly this case.
	if (cached && !cachedFromAccount && haveAccount) {
		log("account settings became available after an early read — reloading");
		cached = null;
	}
	if (cached) return cached;

	const key = backupKey();
	const raw: string = accountRaw ?? (key ? (localStorage.getItem(key) ?? "") : "");
	cachedFromAccount = haveAccount;
	if (!raw) {
		cached = defaultSettings();
		return cached;
	}
	try {
		const json = decompressFromBase64(raw);
		cached = json ? JSON.parse(json) : defaultSettings();
	} catch (err) {
		lastLoadError = String(err);
		warn("failed to parse stored settings, resetting", err);
		cached = defaultSettings();
	}
	cached = normalise(cached);
	return cached;
}

function saveSettings(): void {
	if (!cached) return;
	// Refuse to save before we know which account we are. Saving here would write whatever
	// was loaded from the shared/default state into a real account's data — the corruption
	// path that made two characters share stats.
	const key = backupKey();
	if (!key) {
		log("not saving — no MemberNumber yet, so this could belong to the wrong account");
		return;
	}
	const encoded = compressToBase64(JSON.stringify(cached));
	if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
	Player.ExtensionSettings[SETTINGS_KEY] = encoded;
	localStorage.setItem(key, encoded);
	ServerPlayerExtensionSettingsSync(SETTINGS_KEY);
}

export function getTrust(memberId: number): TrustEntry | undefined {
	return loadSettings().trust.find((t) => t.memberId === memberId);
}

/** Trust with this person as a 0-100 value, derived from their interaction count. */
/** A player's depth override for one feature, or "" if they have not set one. Returns a
 * loose string rather than the DepthTier type so storage.ts stays a leaf that depth.ts can
 * import without the two depending on each other. */
export function getDepthOverride(key: string): any {
	return loadSettings().depthGates[key] ?? "";
}

/** Whether the subject has opened this feature to chemical depth. True-only + sparse: setting
 * it false DELETES the key so the earned-only default keeps governing, the same reversibility
 * the depth-gate overrides have. */
export function getChemicalReach(key: string): boolean {
	return loadSettings().chemicalReach[key] === true;
}
export function setChemicalReach(key: string, allowed: boolean): void {
	const reach = loadSettings().chemicalReach;
	if (allowed) reach[key] = true;
	else delete reach[key];
	saveSettings();
}

export function setDepthOverride(key: string, tier: string): void {
	loadSettings().depthGates[key] = tier;
	saveSettings();
}

export function clearDepthOverrides(): void {
	const settings = loadSettings();
	settings.depthGates = {};
	saveSettings();
}

export function getChemicalScope(): any {
	return loadSettings().chemicalScope ?? "arousal";
}

export function setChemicalScope(scope: string): void {
	loadSettings().chemicalScope = scope;
	saveSettings();
}

export function getTriggerDecayRate(): DecayRate {
	return loadSettings().triggerDecayRate;
}

export function setTriggerDecayRate(rate: DecayRate): void {
	loadSettings().triggerDecayRate = rate;
	saveSettings();
}

/** Write a trigger back after its strength history changed. Kept beside saveTrigger rather
 * than reusing it: saveTrigger REPLACES by phrase, which is right for re-planting and
 * overriding but wrong for updating a record's strength history in place. */
export function updateTriggers(): void {
	saveSettings();
}

export function getDecayRate(): DecayRate {
	return loadSettings().decayRate;
}

export function setDecayRate(rate: DecayRate): void {
	loadSettings().decayRate = rate;
	saveSettings();
}

/** Charge an entry for the time since it was last touched.
 *
 * Applied LAZILY, on read, rather than from a timer: there is nothing to schedule, nothing
 * to miss while the game is closed, and it stays correct across reloads on its own. The
 * catch a timer would not have is that the clock must be advanced when it is charged —
 * otherwise every subsequent read bills the same elapsed days again. Hence the write-back,
 * which also only happens once a whole interaction has accrued, so ordinary reads do not
 * touch storage. */
function applyDecay(entry: TrustEntry | undefined): number {
	if (!entry) return 0;
	const perDay = DECAY_PER_DAY[loadSettings().decayRate] ?? 0;
	if (perDay <= 0 || entry.interactions <= 0) return entry?.interactions ?? 0;
	const days = (Date.now() - entry.lastUpdated) / 86_400_000;
	const lost = days * perDay;
	if (lost < 1) return entry.interactions; // not yet worth a write
	entry.interactions = Math.max(0, entry.interactions - lost);
	entry.lastUpdated = Date.now();
	saveSettings();
	return entry.interactions;
}

export function trustWith(memberId: number): number {
	return valueFromCount(applyDecay(getTrust(memberId)), H_TRUST);
}

/** Add (or with a negative delta, remove) interactions. The only way trust moves —
 * conversation, the induction accelerator and decay all come through here. */
export function addInteractions(memberId: number, memberName: string, delta: number): TrustEntry {
	const settings = loadSettings();
	let entry = settings.trust.find((t) => t.memberId === memberId);
	if (!entry) {
		entry = { memberId, memberName, interactions: 0, lastUpdated: Date.now() };
		settings.trust.push(entry);
	}
	entry.interactions = Math.max(0, entry.interactions + delta);
	if (memberName) entry.memberName = memberName;
	entry.lastUpdated = Date.now();
	saveSettings();
	return entry;
}

/** Set trust to an absolute 0-100 VALUE by back-solving the count it implies. Kept for
 * testing — it's how you get to a given trust level without playing to it. */
export function setTrustValue(memberId: number, memberName: string, value: number): TrustEntry {
	const settings = loadSettings();
	let entry = settings.trust.find((t) => t.memberId === memberId);
	if (!entry) {
		entry = { memberId, memberName, interactions: 0, lastUpdated: Date.now() };
		settings.trust.push(entry);
	}
	entry.interactions = countFromValue(value, H_TRUST);
	entry.memberName = memberName;
	entry.lastUpdated = Date.now();
	saveSettings();
	return entry;
}

export function getRelationshipOverride(memberId: number): RelationKind | null {
	const value = loadSettings().relationshipOverride[String(memberId)];
	return value === "friend" || value === "lover" || value === "owner" || value === "none" ? value : null;
}

export function setRelationshipOverride(memberId: number, kind: RelationKind | null): void {
	const settings = loadSettings();
	if (kind === null) delete settings.relationshipOverride[String(memberId)];
	else settings.relationshipOverride[String(memberId)] = kind;
	saveSettings();
}

export function listRelationshipOverrides(): { memberId: number; kind: RelationKind }[] {
	const settings = loadSettings();
	return Object.entries(settings.relationshipOverride).map(([id, kind]) => ({ memberId: Number(id), kind }));
}

export function listTrust(): TrustEntry[] {
	// Filtered as well as purged on load: the purge only runs once the member number is
	// known, and a stale self entry should not show in the meantime.
	const self = Player?.MemberNumber;
	return loadSettings().trust.filter(
		// Someone decayed to nothing is not a relationship, they are a row taking up space.
		// DW's call. The entry is dropped rather than shown at 0.0 — talking again simply
		// creates a fresh one, so nothing is lost by forgetting a person you no longer know.
		(t) => t.memberId !== self && t.interactions > 0,
	);
}

/** Delete a stored relationship outright.
 *
 * The escape hatch that was missing: a junk entry could only be got rid of by resetting
 * everything. Returns whether anything was removed. */
export function forgetTrust(memberId: number): boolean {
	const settings = loadSettings();
	const before = settings.trust.length;
	settings.trust = settings.trust.filter((t) => t.memberId !== memberId);
	if (settings.trust.length === before) return false;
	saveSettings();
	log(`forgot trust entry for ${memberId}`);
	return true;
}

/** Every stored entry INCLUDING the ones listTrust hides, for diagnostics. When a row shows
 * up that should not exist, the first question is what its member number actually is — and a
 * list that has already filtered the answer out cannot say. */
export function listTrustRaw(): TrustEntry[] {
	return loadSettings().trust;
}

/** Subject experience as a 0-100 value. One pool: cooperating and resisting both build it,
 * and the roll decides which direction it points based on the choice made. */
export function experienceValue(): number {
	return valueFromCount(loadSettings().experience, H_EXPERIENCE);
}

export function addExperience(delta: number): number {
	const settings = loadSettings();
	settings.experience = Math.max(0, settings.experience + delta);
	saveSettings();
	return experienceValue();
}

export function setExperienceValue(value: number): number {
	const settings = loadSettings();
	settings.experience = countFromValue(value, H_EXPERIENCE);
	saveSettings();
	return experienceValue();
}

/** Where the current settings actually came from, and what each source holds. Exists
 * because "my data vanished" has too many candidate causes to guess between — account vs
 * localStorage vs a parse failure vs an early read — and each looks identical from the
 * outside. */
export function describeStorage(): string[] {
	// Force the load FIRST. Without this the "loaded from" line below read the flag before
	// the later lines' listTrust() call triggered the account re-read, so it reported the
	// state from before its own diagnostic ran — reliably one step out of date.
	loadSettings();
	const accountRaw = Player?.ExtensionSettings?.[SETTINGS_KEY];
	const key = backupKey();
	const backupRaw = key ? localStorage.getItem(key) : null;
	const summarise = (raw: unknown): string => {
		if (typeof raw !== "string" || !raw) return "absent";
		try {
			const parsed = JSON.parse(decompressFromBase64(raw) || "{}");
			const people = (parsed.trust ?? []).length;
			const total = (parsed.trust ?? []).reduce((s: number, t: any) => s + (t.interactions ?? 0), 0);
			return `${raw.length} chars, ${people} people, ${total.toFixed(1)} interactions, exp ${parsed.experience ?? 0}`;
		} catch (err) {
			return `${raw.length} chars but UNREADABLE (${err})`;
		}
	};
	return [
		`account:      #${Player?.MemberNumber ?? "unknown"} (backup key ${backupKey() ?? "NONE — not saving yet"})`,
		`loaded from: ${cachedFromAccount ? "account (ExtensionSettings)" : "localStorage backup or defaults"}`,
		`account:      ${summarise(accountRaw)}`,
		`localStorage: ${summarise(backupRaw)}`,
		`in memory:    ${listTrust().length} people, exp ${experienceValue().toFixed(1)}`,
		lastLoadError ? `LAST LOAD ERROR: ${lastLoadError}` : "no load errors",
	];
}

// --- Export / import / reset ---------------------------------------------------------
// The compressed blob IS the export format — it's exactly what's stored, so a round trip
// can't lose anything, and there's no second serialiser to drift out of step.

export function exportSettings(): string {
	return compressToBase64(JSON.stringify(loadSettings()));
}

/** Replace everything with a previously exported blob. Validated before it's applied:
 * a bad paste must fail cleanly rather than half-import and leave a mess. */
export function importSettings(blob: string): { ok: boolean; message: string } {
	const trimmed = (blob ?? "").trim();
	if (!trimmed) return { ok: false, message: "nothing to import" };
	let parsed: any;
	try {
		const json = decompressFromBase64(trimmed);
		if (!json) return { ok: false, message: "not a valid export (could not decompress)" };
		parsed = JSON.parse(json);
	} catch (err) {
		return { ok: false, message: `not a valid export (${err})` };
	}
	if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.trust)) {
		return { ok: false, message: "not a valid export (missing trust data)" };
	}
	cached = normalise(parsed as HypnoAddonSettings);
	cachedFromAccount = true;
	saveSettings();
	return {
		ok: true,
		message: `imported ${listTrust().length} people, experience ${experienceValue().toFixed(1)}`,
	};
}

/** Back to factory defaults for this account. Trust, experience and every toggle — and any
 * trance that was running, because a subject who typed "wipe everything" must not be left
 * frozen by the command that told her it had. */
export function resetSettings(): string {
	// Stop BEFORE the wipe. The teardown reads the live session rather than the settings, but
	// it also has to know what it is ending in order to say so, and it clears the recovery key
	// — which lives in its own localStorage entry, so wiping ExtensionSettings cannot reach it.
	let ended: "trance" | "induction" | null = null;
	let stopFailed = false;
	try {
		ended = stopForReset();
	} catch (err) {
		// Reported rather than swallowed: a reset that quietly skipped the teardown is the bug.
		stopFailed = true;
		warn("reset: could not end the session:", err);
	}
	cached = defaultSettings();
	cachedFromAccount = true;
	saveSettings();
	if (stopFailed) {
		return "Settings reset to defaults — but the trance could not be ended. Use /hypno safeword.";
	}
	// Release first, wipe second, in the wording as well as the order: the release is the half
	// she needs to trust immediately.
	if (ended === "trance") return "Trance ended and every effect released. Settings reset to defaults.";
	if (ended === "induction") return "Induction stopped and every effect released. Settings reset to defaults.";
	return "settings reset to defaults";
}

export function getFeatures(): FeatureToggles {
	return loadSettings().features;
}

export function setFeature(key: keyof FeatureToggles, value: boolean): void {
	loadSettings().features[key] = value;
	saveSettings();
}

/** The stored experience COUNT, not the derived value. Shown on the Stats tab alongside
 * the value so the pace is legible — 1.25 per session says more about speed than "4.8". */
export function rawExperience(): number {
	return loadSettings().experience;
}

// --- Triggers ------------------------------------------------------------------------

export function listTriggers(): Trigger[] {
	return loadSettings().triggers;
}

/** Store a trigger, replacing any existing one with the SAME KEY (for a phrase trigger, the
 * same phrase). A phrase is unique per
 * subject (the uniqueness decision in design.md), so at most one record can hold a given word.
 * De-dupe is on the phrase alone — NOT phrase+installer, which is what used to let two people
 * coexist on one word: an override by a different hypnotist must replace the record, not sit
 * beside it. Whether an override is *allowed* is decided upstream in triggers.ts; by the time a
 * trigger reaches here, it has been. */
export function saveTrigger(trigger: Trigger): void {
	const settings = loadSettings();
	// A record built without a key is a phrase trigger; say so here too, not only in normalise,
	// or a key-less save would match every other key-less record and delete them all.
	if (!trigger.key) trigger.key = trigger.phrase;
	settings.triggers = settings.triggers.filter((t) => t.key !== trigger.key);
	settings.triggers.push(trigger);
	saveSettings();
}

/** Remove by key. Returns how many went. */
export function forgetTrigger(key: string): number {
	const settings = loadSettings();
	const before = settings.triggers.length;
	settings.triggers = settings.triggers.filter((t) => t.key !== key);
	saveSettings();
	return before - settings.triggers.length;
}

export function forgetAllTriggers(): number {
	const settings = loadSettings();
	const count = settings.triggers.length;
	settings.triggers = [];
	saveSettings();
	return count;
}

export function getTriggerScope(): TriggerScope {
	return loadSettings().triggerScope;
}

export function setTriggerScope(scope: TriggerScope): void {
	loadSettings().triggerScope = scope;
	saveSettings();
}

/** The subject's own attempt limit. Read live at every point that needs it rather than
 * captured once — changing it mid-session should take effect on the next roll, not the next
 * login, and the subject is the only authority on it. */
export function getMaxAttempts(): number {
	return loadSettings().maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
}

/** The subject's honour rung — the code default when they have never chosen. */
export function getSkillHonour(): string {
	return loadSettings().skillHonour ?? DEFAULT_SKILL_HONOUR;
}

/** First-launch starter state: "new" until the subject either takes the offer or waves it off. */
export function getStarterState(): "new" | "applied" | "done" {
	const s = loadSettings().starterState;
	return s === "applied" || s === "done" ? s : "new";
}
export function setStarterState(state: "new" | "applied" | "done"): void {
	// "new" is the ABSENCE of a choice, so it is stored as absence — the same sparse pattern as
	// every other reversible default here.
	if (state === "new") delete loadSettings().starterState;
	else loadSettings().starterState = state;
	saveSettings();
}

/** Has the one-per-install first-run notice already been shown (or back-filled true for an
 * already-configured user)? */
export function wasWelcomeShown(): boolean {
	return loadSettings().welcomeShown === true;
}
export function markWelcomeShown(): void {
	loadSettings().welcomeShown = true;
	saveSettings();
}

/** The permissions that let a hypnotist actually DO something to the subject — everything on
 * the Permissions tab except the master switch and the settings-lock, plus the two persistent
 * grants that live on the Lasting tab. Excludes subject-preference/awareness toggles (trance
 * defaults, suppression, showTriggerWords, selfTrigger…): granting none of these is what makes
 * a fresh install silent. KEEP IN STEP with the Permissions/Lasting tabs when a permission is
 * added — a new one omitted here would only mean the first-run notice greets a configured user. */
const PERMISSION_KEYS: (keyof FeatureToggles)[] = [
	"movementRestriction",
	"clothingRestriction",
	"postureControl",
	"followControl",
	"speechRestriction",
	"selfTouchControl",
	"compelActivity",
	"compelTouchOthers",
	"forcedSpeech",
	"arousalControl",
	"illusionControl",
	"undressControl",
	"triggerControl",
	"carryForward",
];

/** True if the subject has granted any hypnotist-actionable permission — i.e. the add-on can
 * actually do something. `hypnoEnabled` is deliberately NOT counted: "enabled but nothing
 * granted" is the same silence as a fresh install, and the first-run notice fires for both. */
export function hasAnyPermissionGranted(): boolean {
	const f = loadSettings().features;
	return PERMISSION_KEYS.some((k) => f[k] === true);
}
export function setSkillHonour(rung: string): void {
	if (SKILL_HONOUR_RUNGS.some((r) => r.key === rung)) loadSettings().skillHonour = rung;
	saveSettings();
}
/** The next rung the settings button should show — walks the OFFERED rungs only, so the cycle
 * can never land a player on rung 4 by clicking. */
export function nextSkillHonour(current: string): string {
	const i = SKILL_HONOUR_OFFERED.findIndex((r) => r.key === current);
	// If they are somehow on rung 4 (set by an older build or by hand), the next click brings
	// them back to a safe offered rung rather than leaving them stuck there.
	return SKILL_HONOUR_OFFERED[(i + 1) % SKILL_HONOUR_OFFERED.length].key;
}

/** The player's own derived skill, 0-100, and the count that feeds it. Mirrors experience
 * exactly, through the same curve — the comment on `skill` says why. */
export function addSkill(delta: number): number {
	const settings = loadSettings();
	settings.skill = Math.max(0, settings.skill + delta);
	saveSettings();
	return skillValue();
}
export function skillValue(): number {
	return valueFromCount(loadSettings().skill, H_EXPERIENCE);
}
export function skillCount(): number {
	return loadSettings().skill;
}

/** Clamped to the allowed set rather than rejected: the only caller is a button that cycles
 * through that set, so a value outside it is a bug here and not a player's typo. */
export function setMaxAttempts(limit: number): number {
	const value = ATTEMPT_LIMITS.includes(limit) ? limit : DEFAULT_MAX_ATTEMPTS;
	loadSettings().maxAttempts = value;
	saveSettings();
	return value;
}

/** The lifespan ceiling's choices. Named by minutes, stored by minutes; 0 is "no ceiling" and
 * the default, so nobody who leaves it alone sees any change. */
export const TRIGGER_LIFESPANS: { minutes: number; label: string }[] = [
	{ minutes: 0, label: "No limit" },
	{ minutes: 15, label: "15 minutes" },
	{ minutes: 30, label: "30 minutes" },
	{ minutes: 60, label: "1 hour" },
	{ minutes: 120, label: "2 hours" },
	{ minutes: 360, label: "6 hours" },
	{ minutes: 1440, label: "1 day" },
];

/** Whether a trigger may drop the subject straight into trance (v0.90.0, design.md "Trigger
 * Overhaul", decision 10). The subject's ceiling on what an installer asks for. */
export type DropMode = "off" | "once" | "unlimited";
export const DROP_MODES: { key: DropMode; label: string }[] = [
	{ key: "off", label: "Off" },
	{ key: "once", label: "One time" },
	{ key: "unlimited", label: "Unlimited" },
];

export function getDropMode(): DropMode {
	return loadSettings().dropTriggers;
}

export function setDropMode(mode: DropMode): DropMode {
	const value = DROP_MODES.some((m) => m.key === mode) ? mode : "off";
	loadSettings().dropTriggers = value;
	saveSettings();
	return value;
}

export function getTriggerLifespan(): number {
	return loadSettings().triggerLifespanMinutes;
}

export function setTriggerLifespan(minutes: number): number {
	const value = TRIGGER_LIFESPANS.some((l) => l.minutes === minutes) ? minutes : 0;
	loadSettings().triggerLifespanMinutes = value;
	saveSettings();
	return value;
}

export function getTriggerDuration(): number {
	return loadSettings().triggerDurationMinutes;
}

/** Clamped rather than validated at the edges: a number box can be typed into, and a
 * negative or absurd duration should land somewhere sane rather than be rejected. */
export function setTriggerDuration(minutes: number): number {
	const value = Number.isFinite(minutes) ? Math.max(0, Math.min(1440, Math.round(minutes))) : 5;
	loadSettings().triggerDurationMinutes = value;
	saveSettings();
	return value;
}
