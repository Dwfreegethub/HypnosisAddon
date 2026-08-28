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
	/** BlockWardrobe effect + clothing-change message suppression together — grouped to
	 * match the design doc's "Clothing Confusion" feature. */
	clothingRestriction: boolean;
	/** Posture suggestions (kneel / stand). Separate from movementRestriction because
	 * being posed and being unable to move are quite different things to consent to. */
	postureControl: boolean;
	/** Gates the Hidden-message cross-client channel (see messaging.ts) — both sending
	 * and receiving. */
	hiddenActivities: boolean;
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
		hiddenActivities: false,
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
	// Backfill for settings blobs saved before a field existed (`features` didn't exist at
	// all in 0.2.x; individual toggles get added as features land). Merging over the
	// defaults covers both cases at once, so a newly-added toggle reads as a real `false`
	// rather than `undefined` on anyone's existing saved settings.
	if (cached) cached.features = { ...defaultFeatures(), ...(cached.features ?? {}) };
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
