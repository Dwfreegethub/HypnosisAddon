import { compressToBase64, decompressFromBase64 } from "lz-string";
import { log } from "./log";
import { valueFromCount, countFromValue, H_TRUST, H_EXPERIENCE } from "./curve";

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
	};
}

function defaultSettings(): HypnoAddonSettings {
	return { version: "0.4.0", trust: [], experience: 0, triggers: [], triggerScope: "hypnotist", triggerDurationMinutes: 5, features: defaultFeatures() };
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
	s.trust ??= [];
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
export function trustWith(memberId: number): number {
	return valueFromCount(getTrust(memberId)?.interactions ?? 0, H_TRUST);
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

export function listTrust(): TrustEntry[] {
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

/** Back to factory defaults for this account. Trust, experience and every toggle. */
export function resetSettings(): string {
	cached = defaultSettings();
	cachedFromAccount = true;
	saveSettings();
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
