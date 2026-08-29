import { compressToBase64, decompressFromBase64 } from "lz-string";
import { log } from "./log";
import { valueFromCount, countFromValue, H_TRUST, H_EXPERIENCE } from "./curve";

const SETTINGS_KEY = "HypnosisAddon";
const BACKUP_KEY = `${SETTINGS_KEY}_Backup`;

export interface TrustEntry {
	memberId: number;
	memberName: string;
	/** Interaction COUNT, not a 0-100 value — see curve.ts for why. Derive the trust
	 * value with `trustWith()`; never store one. */
	interactions: number;
	lastUpdated: number;
}

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
	/** Silencing suggestions ("you cannot speak"). */
	speechRestriction: boolean;
	/** Permission to hide messages about clothing changes done to you. */
	suppressClothing: boolean;
	/** Permission to hide messages about restraints applied to or removed from you. */
	suppressBondage: boolean;
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
		suppressClothing: false,
		suppressBondage: false,
		suppressActivities: false,
		lockedWhileHypnotized: false,
		// On by default — see the note on the interface.
		tranceCannotMove: true,
		tranceCannotSpeak: true,
		tranceScreenFade: true,
	};
}

function defaultSettings(): HypnoAddonSettings {
	return { version: "0.4.0", trust: [], experience: 0, features: defaultFeatures() };
}

let cached: HypnoAddonSettings | null = null;
/** Did the cache come from the account's own server-synced data, or only from the
 * localStorage backup / defaults? See loadSettings. */
let cachedFromAccount = false;
/** Set when a load fell over, so /hypno storage can report it rather than it being a
 * console line nobody saw. */
let lastLoadError = "";

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

	const raw: string = accountRaw ?? localStorage.getItem(BACKUP_KEY) ?? "";
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
	// Reconcile stored toggles against the current schema. Start from the defaults and copy
	// across only keys that still exist, which does three jobs at once: a blob saved before
	// `features` existed at all (0.2.x) gets one; a newly-added toggle reads as a real
	// `false` rather than `undefined`; and toggles from an older schema (`wardrobeBlock`,
	// `suppressClothingMessages`) are dropped instead of riding along forever. A plain
	// spread of stored-over-defaults kept those dead keys, which then showed up as granted
	// permissions in diagnostics — confusing exactly when you're trying to read them.
	if (cached) {
		const stored = (cached.features ?? {}) as Partial<FeatureToggles>;
		const merged = defaultFeatures();
		for (const key of Object.keys(merged) as (keyof FeatureToggles)[]) {
			if (typeof stored[key] === "boolean") merged[key] = stored[key];
		}
		cached.features = merged;
		cached.experience ??= 0;
		cached.trust ??= [];
		// Migrate entries written before trust was stored as a count. The old field held a
		// 0-100 value; convert it back through the curve so existing test data survives
		// rather than silently resetting to zero.
		for (const entry of cached.trust) {
			const legacy = (entry as unknown as { relationshipTrust?: number }).relationshipTrust;
			if (typeof entry.interactions !== "number" && typeof legacy === "number") {
				entry.interactions = countFromValue(legacy, H_TRUST);
				delete (entry as unknown as { relationshipTrust?: number }).relationshipTrust;
				log(`migrated trust for ${entry.memberName}: value ${legacy} → ${entry.interactions.toFixed(1)} interactions`);
			}
			entry.interactions ??= 0;
		}
	}
	return cached as HypnoAddonSettings;
}

function saveSettings(): void {
	if (!cached) return;
	const encoded = compressToBase64(JSON.stringify(cached));
	if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
	Player.ExtensionSettings[SETTINGS_KEY] = encoded;
	localStorage.setItem(BACKUP_KEY, encoded);
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
	const backupRaw = localStorage.getItem(BACKUP_KEY);
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
		`loaded from: ${cachedFromAccount ? "account (ExtensionSettings)" : "localStorage backup or defaults"}`,
		`account:      ${summarise(accountRaw)}`,
		`localStorage: ${summarise(backupRaw)}`,
		`in memory:    ${listTrust().length} people, exp ${experienceValue().toFixed(1)}`,
		lastLoadError ? `LAST LOAD ERROR: ${lastLoadError}` : "no load errors",
	];
}

export function getFeatures(): FeatureToggles {
	return loadSettings().features;
}

export function setFeature(key: keyof FeatureToggles, value: boolean): void {
	loadSettings().features[key] = value;
	saveSettings();
}
