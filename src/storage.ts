import { compressToBase64, decompressFromBase64 } from "lz-string";
import { log } from "./log";
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
}

export type TriggerScope =
	| "hypnotist"
	| "owner"
	| "lovers"
	| "whitelist"
	| "dominants"
	| "notblack"
	| "everyone";

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
	/** Posture suggestions (kneel / stand). Separate from movementRestriction because
	 * being posed and being unable to move are quite different things to consent to. */
	postureControl: boolean;
	/** Blocking the subject from touching themselves, or named body parts. */
	selfTouchControl: boolean;
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
	/** Freeze this settings screen while in trance: every checkbox greys out and clicks are
	 * ignored until the session ends. Replaced a "Hidden Activities" toggle that ended up
	 * gating nothing (see messaging.ts).
	 *
	 * Deliberately locks ITSELF too — being able to switch the lock off mid-trance would
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
		speechRestriction: false,
		selfTouchControl: false,
		arousalControl: false,
		illusionControl: false,
		undressControl: false,
		releaseOnDisconnect: false,
		carryForward: false,
		showTriggerWords: false,
		selfTrigger: false,
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
		triggers: [],
		triggerScope: "hypnotist",
		triggerDurationMinutes: 5,
		// OFF by default, deliberately. Every existing entry carries a `lastUpdated` from
		// whenever it was last touched, so shipping this switched on would decay months of
		// stored trust the first time someone loaded the new build. Opt in.
		decayRate: "never",
		// OFF by default for the same reason trust decay is: every stored trigger carries a
		// reinforcedAt from whenever it was planted, so shipping this switched on would fade
		// triggers that were planted under a promise they would not. Opt in.
		triggerDecayRate: "never",
		depthGates: {},
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
		}
	}
	if (!s.depthGates || typeof s.depthGates !== "object") s.depthGates = {};
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
	// per-origin and bondage-europe.com is a separate origin from bondageprojects.
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
		log("failed to parse stored settings, resetting", err);
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
 * than reusing it: saveTrigger REPLACES by phrase+installer, which is right for re-planting
 * and wrong for updating in place. */
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
		log("reset: could not end the session:", err);
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

/** Store a trigger, replacing any existing one with the same phrase from the same person
 * — re-planting the same word should update it rather than stack duplicates. */
export function saveTrigger(trigger: Trigger): void {
	const settings = loadSettings();
	settings.triggers = settings.triggers.filter(
		(t) => !(t.phrase === trigger.phrase && t.installedBy === trigger.installedBy),
	);
	settings.triggers.push(trigger);
	saveSettings();
}

/** Remove by phrase. Returns how many went. */
export function forgetTrigger(phrase: string): number {
	const settings = loadSettings();
	const before = settings.triggers.length;
	settings.triggers = settings.triggers.filter((t) => t.phrase !== phrase);
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
