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

interface HypnoAddonSettings {
	version: string;
	trust: TrustEntry[];
}

function defaultSettings(): HypnoAddonSettings {
	return { version: "0.2.0", trust: [] };
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
