import { log } from "./log";

// Same technique LSCG uses (verified in their src/utils.ts): piggyback the always-worn,
// invisible "Emoticon" appearance item's Property.Effect array rather than depending on
// a real physical restraint. Works for a suggestion-driven effect with no item involved.
const EMOTICON_ASSET_NAME = "Emoticon";

function findEmoticonItem(character: any): any {
	return character?.Appearance?.find((a: any) => a?.Asset?.Name === EMOTICON_ASSET_NAME);
}

export function applyEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	if (!item) {
		log(`no Emoticon item found on ${character?.Name ?? "target"}, cannot apply effect`);
		return false;
	}
	item.Property ??= {};
	item.Property.Effect ??= [];
	if (!item.Property.Effect.includes(effectName)) {
		item.Property.Effect.push(effectName);
	}
	if (character === Player && ServerPlayerIsInChatRoom()) {
		ChatRoomCharacterUpdate(Player);
	}
	return true;
}

export function removeEffect(effectName: string, character: any = Player): boolean {
	const item = findEmoticonItem(character);
	const effects = item?.Property?.Effect;
	if (!effects) return false;
	const idx = effects.indexOf(effectName);
	if (idx === -1) return false;
	effects.splice(idx, 1);
	if (character === Player && ServerPlayerIsInChatRoom()) {
		ChatRoomCharacterUpdate(Player);
	}
	return true;
}
