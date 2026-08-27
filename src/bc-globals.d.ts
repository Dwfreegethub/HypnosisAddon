// Bondage Club's client defines these as page-level globals (non-module scripts).
// Typed loosely on purpose — we don't own this surface and it changes across releases.
declare const ServerSocket: any;
declare const Player: any;
declare const ChatRoomCharacter: any[];
declare function ServerSend(message: string, data: any): void;
declare function ChatRoomCharacterUpdate(character: any): void;
declare function ServerPlayerIsInChatRoom(): boolean;
declare function ServerPlayerExtensionSettingsSync(name: string): void;
declare function CommandCombine(add: any): void;
declare function ChatRoomSendLocal(message: string, timeout?: number): void;
