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
declare function DrawRect(left: number, top: number, width: number, height: number, color: string): void;
declare function DrawEmptyRect(left: number, top: number, width: number, height: number, color: string, thickness?: number): void;
declare function DrawTextFit(text: string, x: number, y: number, width: number, color: string, backColor?: string): void;
declare function MouseIn(left: number, top: number, width: number, height: number): boolean;
declare const MouseX: number;
declare const MouseY: number;
declare const MainCanvas: CanvasRenderingContext2D;
declare const MainCanvasWidth: number;
declare const MainCanvasHeight: number;
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
// Pose control (Scripts/Pose.js via Character.js). Passing null resets to the base pose.
// Only sets the pose locally — the room is told separately via
// ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose }).
declare function CharacterSetActivePose(character: any, poseName: string | null, forceChange?: boolean): void;
// BC's own message-handler extension point (ChatRoom.js). Priority decides where in the
// pipeline the callback runs; returning true stops processing and the message never
// renders. See suppression.ts for the priorities that matter.
declare function ChatRoomRegisterMessageHandler(handler: {
	Description?: string;
	Priority: number;
	Callback: (data: any, sender: any, msg: string, metadata: any) => boolean | object | undefined;
}): void;
declare function ChatRoomMessageInvolvesPlayer(data: any): boolean;
// Activity.js — resolves a group to the one activities are actually mirrored from
// (ItemNipples mirrors to ItemBreast), so a per-part block can't be sidestepped.
declare function ActivityGetGroupOrMirror(family: string, groupName: string): any;

// DOM controls layered over the canvas (Scripts/Element.js). They are real elements in
// document.body, positioned in CANVAS coordinates — X,Y is the element's CENTRE, and the
// scaling to screen pixels is handled for us. They must be removed explicitly when the
// screen goes away or they linger over whatever comes next.
declare function ElementCreateDropdown(
	id: string | null,
	optionsList: readonly string[],
	onChange: (this: HTMLSelectElement, event: Event) => any,
	options?: null | { required?: boolean; multiple?: boolean; disabled?: boolean; size?: number; name?: string },
	htmlOptions?: any,
): HTMLSelectElement;
declare function ElementPosition(elementOrId: any, x: number, y: number, w: number, h?: number): void;
declare function ElementRemove(elementOrId: any): void;
/** Reputation lookup, e.g. ReputationCharacterGet(C, "Dominant"). Used by BC's own
 * permission ladder to decide who counts as dominant relative to whom. */
declare function ReputationCharacterGet(character: any, type: string): number;
