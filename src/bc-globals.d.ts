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
// pipeline the callback runs. Three return shapes, all three used here:
//   true       stop processing entirely — the message never renders
//   {msg}      rewrite the text and carry on
//   {skip}     carry on, but skip the later handlers the predicate matches
// See suppression.ts for the priorities that matter and which shape each feature needs.
declare function ChatRoomRegisterMessageHandler(handler: {
	Description?: string;
	Priority: number;
	Callback: (data: any, sender: any, msg: string, metadata: any) => boolean | object | undefined;
}): void;
/** The registered handlers themselves, so we can check one we depend on still exists. */
declare const ChatRoomMessageHandlers: { Description?: string; Priority: number }[] | undefined;
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
declare function ElementCreateInput(
	id: string | null,
	type: string,
	value?: string,
	maxLength?: number,
	form?: Node,
): HTMLInputElement;
/** BC's own clamp-on-blur for number inputs — respects the element's min/max/inputMode. */
declare function ElementNumberInputBlur(this: HTMLInputElement, event: Event): void;
declare function ElementNumberInputWheel(this: HTMLInputElement, event: Event): void;

// Arousal and orgasms (Scripts/Activity.js). ActivitySetArousal clamps 0-100 and syncs to
// the room; ActivityExpression is what actually moves the face and is NOT called by it.
// ActivityOrgasmPrepare enforces DenialMode / edging and is where an orgasm can be refused,
// ActivityOrgasmStart is the orgasm itself. See arousal.ts for how they're sequenced.
declare function ActivitySetArousal(character: any, progress: number): void;
declare function ActivityExpression(character: any, progress: number): void;
declare function ActivityOrgasmPrepare(character: any, bypass?: boolean): void;
declare function ActivityOrgasmStart(character: any): void;
/** BC's frame clock (Scripts/Game.js), milliseconds. Every orgasm timer is measured
 * against this rather than Date.now(). */
declare const CurrentTime: number;

// Character construction and rendering (Scripts/Character.js, Scripts/Drawing.js).
// CharacterLoadSimple makes a local-only CharacterType.SIMPLE character - documented in
// Character.js as "generally used internally and not to represent an actual in-game
// character". CharacterRefresh's second argument is Push: pass false to keep it off the
// server. DrawCharacter is the single funnel every screen uses to draw a body; see
// illusion.ts for why that matters.
declare function CharacterLoadSimple(characterId: string): any;
declare function CharacterRefresh(character: any, push?: boolean, refreshDialog?: boolean): void;
declare function CharacterLoadCanvas(character: any): void;
declare function DrawCharacter(
	character: any,
	x: number,
	y: number,
	zoom: number,
	isHeightResizeAllowed?: boolean,
	drawCanvas?: any,
): void;

/** Font string for a given size, respecting the player's font-stack preference
 * (Scripts/Common.js). BC sets MainCanvas.font from this everywhere it draws text. */
declare function CommonGetFont(size: number | string): string;

/** Sends an emote to the room (ChatRoom.js). The one message type that renders arbitrary
 * text — Action and Activity look their Content up as a translation key first. Honours the
 * owner rule that can block emotes, which is why we call it rather than build the packet. */
declare function ChatRoomSendEmote(message: string): void;

// Inventory.js — the appearance-editing API. InventoryRemove cascades an asset's
// RemoveItemOnRemove list, so removing a dress takes its sub-items with it rather than
// leaving orphans; pass Refresh=false while looping and refresh once at the end.
declare function InventoryRemove(character: any, assetGroup: string, refresh?: boolean): void;
declare function InventoryGet(character: any, assetGroup: string): any;

// Asset.js — turns a group/name pair back into the shared Asset definition (a lookup in
// AssetMap keyed `Group/Name`). Needed to rebuild an appearance item from stored identity,
// since the live Asset reference itself cannot be serialised. See illusion.ts.
declare function AssetGet(family: string, group: string, name: string): any;
