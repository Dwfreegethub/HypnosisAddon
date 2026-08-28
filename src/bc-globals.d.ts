// Bondage Club's client defines these as page-level globals (non-module scripts).
// Typed loosely on purpose — we don't own this surface and it changes across releases.
declare const ServerSocket: any;
declare const Player: any;
declare const ChatRoomCharacter: any[];
// BC's shared asset definitions. Item.Asset points into this array, so mutating an entry
// affects that asset on every character at once (see effects.ts's ensureEffectsAllowed).
declare const Asset: any[];
declare function ServerSend(message: string, data: any): void;
declare function ChatRoomCharacterUpdate(character: any): void;
declare function ServerPlayerIsInChatRoom(): boolean;
declare function ServerPlayerExtensionSettingsSync(name: string): void;
declare function CommandCombine(add: any): void;
declare function ChatRoomSendLocal(message: string, timeout?: number): void;
declare function PreferenceRegisterExtensionSetting(setting: any): void;
declare function DrawCheckbox(
	left: number,
	top: number,
	width: number,
	height: number,
	text: string,
	isChecked: boolean,
	disabled?: boolean,
	textColor?: string,
	checkImage?: string,
): void;
declare function DrawText(text: string, x: number, y: number, color: string, backColor?: string): void;
declare function MouseIn(left: number, top: number, width: number, height: number): boolean;
declare const MouseX: number;
declare const MouseY: number;
declare const MainCanvas: CanvasRenderingContext2D;
declare const MainCanvasWidth: number;
declare function DrawButton(
	left: number,
	top: number,
	width: number,
	height: number,
	label: string,
	color: string,
	image?: string | null,
	hoveringText?: string | null,
	disabled?: boolean,
): void;
// The documented, intended way for an extension's own subscreen to exit itself back to
// the Extensions list (Screens/Character/Preference/Extensions.js) — BC suppresses its
// own back button entirely while PreferenceExtensionsCurrent is set, so without calling
// this from our own UI there is no way out of the screen at all.
declare function PreferenceSubscreenExtensionsClear(): Promise<void>;
// The character currently shown on the Information Sheet screen (module-level global in
// Screens/Character/InformationSheet/InformationSheet.js, not a hook argument).
declare const InformationSheetSelection: any;
