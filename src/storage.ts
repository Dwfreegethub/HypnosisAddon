import { compressToBase64, decompressFromBase64 } from "lz-string";
import { log } from "./log";

const SETTINGS_KEY = "HypnosisAddon";
const BACKUP_KEY = `${SETTINGS_KEY}_Backup`;

export interface TrustEntry {
	memberId: number;
	memberName: string;
	relationshipTrust: number;
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
	/** Silencing suggestions ("you cannot speak"). */
	speechRestriction: boolean;
	/** Permission to hide messages about clothing changes done to you. */
	suppressClothing: boolean;
	/** Permission to hide messages about restraints applied to or removed from you. */
	suppressBondage: boolean;
	/** Permission to hide messages about activities done to you (touching, kissing).
	 * Hides the message only — arousal still applies. */
	suppressActivities: boolean;
	/** Gates the Hidden-message cross-client channel (see messaging.ts) — both sending
	 * and receiving. */
	hiddenActivities: boolean;

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
	features: FeatureToggles;
}

function defaultFeatures(): FeatureToggles {
	return {
		hypnoEnabled: false,
		movementRestriction: false,
		clothingRestriction: false,
		postureControl: false,
		speechRestriction: false,
		suppressClothing: false,
		suppressBondage: false,
		suppressActivities: false,
		hiddenActivities: false,
		// On by default — see the note on the interface.
		tranceCannotMove: true,
		tranceCannotSpeak: true,
		tranceScreenFade: true,
	};
}

function defaultSettings(): HypnoAddonSettings {
	return { version: "0.4.0", trust: [], features: defaultFeatures() };
}

let cached: HypnoAddonSettings | null = null;

function loadSettings(): HypnoAddonSettings {
	if (cached) return cached;
	const raw: string = Player?.ExtensionSettings?.[SETTINGS_KEY] ?? localStorage.getItem(BACKUP_KEY) ?? "";
	if (!raw) {
		cached = defaultSettings();
		return cached;
	}
	try {
		const json = decompressFromBase64(raw);
		cached = json ? JSON.parse(json) : defaultSettings();
	} catch (err) {
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

export function bumpTrust(memberId: number, memberName: string, delta: number): TrustEntry {
	const settings = loadSettings();
	let entry = settings.trust.find((t) => t.memberId === memberId);
	if (!entry) {
		entry = { memberId, memberName, relationshipTrust: 0, lastUpdated: Date.now() };
		settings.trust.push(entry);
	}
	entry.relationshipTrust = Math.max(0, Math.min(100, entry.relationshipTrust + delta));
	entry.memberName = memberName;
	entry.lastUpdated = Date.now();
	saveSettings();
	return entry;
}

export function listTrust(): TrustEntry[] {
	return loadSettings().trust;
}

/** Set trust to an absolute value. Exists mainly so the session flow is testable before
 * the real trust engine lands — see /hypno settrust. */
export function setTrust(memberId: number, memberName: string, value: number): TrustEntry {
	const settings = loadSettings();
	let entry = settings.trust.find((t) => t.memberId === memberId);
	if (!entry) {
		entry = { memberId, memberName, relationshipTrust: 0, lastUpdated: Date.now() };
		settings.trust.push(entry);
	}
	entry.relationshipTrust = Math.max(0, Math.min(100, value));
	entry.memberName = memberName;
	entry.lastUpdated = Date.now();
	saveSettings();
	return entry;
}

export function getFeatures(): FeatureToggles {
	return loadSettings().features;
}

export function setFeature(key: keyof FeatureToggles, value: boolean): void {
	loadSettings().features[key] = value;
	saveSettings();
}
