// The ECHS icon over players in a room (v1.7.0; Biker, Lianne; DW 2026-11-08). Each check says what
// failure looks like.
//
//   1. Joining a room asks everyone once, on a message every build knows, with our version and choice.
//   2. Who answers, or asks, gets the icon: in the free top-row slot, scaled by the zoom, with the
//      version on hover. An older build counts as showing it.
//   3. Rule 1: someone who unticked "Show others" gets none, though their client still answers.
//   4. Our own icon follows our own tick box, and changing it tells the room.
//   5. The viewer's spot: top row, below on the left, or off.
//   6. Our own room-wide ask comes back to us and is not answered; the same room is not re-asked
//      every sync; a new room forgets the old one; an older build that never asks is asked directly.
const HYP = 246108, OLD = 555, SHY = 777, LATE = 888;
globalThis.Player = { MemberNumber: 1, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
const hyp = { MemberNumber: HYP, Name: "Helper", Nickname: "Missys Helper" };
globalThis.ChatRoomCharacter = [Player, hyp, { MemberNumber: OLD, Name: "Old" }, { MemberNumber: SHY, Name: "Shy" }];
globalThis.ChatRoomData = { Name: "Hypno Testing" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let sent = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m) sent.push({ to: data.Target, ...m });
};
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
let now = Date.parse("2026-11-08T20:00:00Z");
Date.now = () => now;
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
let images = [], texts = [], fonts = [];
globalThis.DrawImageResize = (src, x, y, w, h) => { images.push({ src, x, y, w, h }); return true; };
globalThis.DrawCircle = () => {};
globalThis.DrawRect = () => {};
globalThis.DrawTextFit = (text) => texts.push(String(text));
globalThis.DrawText = (text) => { texts.push(String(text)); fonts.push(MainCanvas.font); };
globalThis.CommonGetFont = (size) => `${size}px Arial`;
globalThis.MainCanvas = { font: "36px Arial", textAlign: "center", textBaseline: "middle", _stack: [],
	save() { this._stack.push([this.font, this.textAlign, this.textBaseline]); },
	restore() { [this.font, this.textAlign, this.textBaseline] = this._stack.pop(); },
	measureText(t) { return { width: t.length * 10 }; } };
globalThis.MouseX = -1;
globalThis.MouseY = -1;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;

const { storage, messaging, remote, badge } = await import("./harness-bundle.mjs");
const hooks = {};
const sdk = { hookFunction: (name, _p, fn) => (hooks[name] = hooks[name] ?? fn) };
remote.installRemote(sdk);
const badgeHooks = {};
badge.installBadge({ hookFunction: (name, _p, fn) => (badgeHooks[name] = fn) });
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const sync = () => badgeHooks.ChatRoomSync([{}], () => undefined);
const draw = (C, x = 1000, y = 0, zoom = 0.5) => { images = []; texts = []; badgeHooks.ChatRoomDrawCharacterStatusIcons([C, x, y, zoom], () => undefined); return images; };
const roomAsks = () => sent.filter((m) => m.type === "state-query" && m.to == null);
const version = badge.presenceFields().version;

// --- 1. joining asks the room ------------------------------------------------------------------
sync();
// Failure: nobody learns we run ECHS, or a new message type that older builds print as junk.
check("joining a room asks everyone once", roomAsks().length, 1);
check("  on state-query, which every build knows", roomAsks()[0]?.type, "state-query");
check("  with our version and that we show the icon", [roomAsks()[0]?.version === version, roomAsks()[0]?.showIcon], [true, true]);

// --- 2. who answers gets the icon --------------------------------------------------------------
deliver(HYP, { type: "state-response", hypnoEnabled: true, version: "1.7.0", showIcon: true });
let drawn = draw(hyp);
// Failure: no icon, or not in the free slot (x 228-258 of BC's 500-wide character, docs/addon-icon-survey.md).
check("an ECHS player who answers gets the spiral", drawn.length, 1);
check("  in the top row's free slot, scaled by the zoom", [drawn[0]?.x, drawn[0]?.y, drawn[0]?.w], [1000 + 228 * 0.5 + 15 * 0.12, 2 * 0.5 + 15 * 0.12, 15 * 0.76]);
MouseX = 1000 + 228 * 0.5 + 5; MouseY = 2 * 0.5 + 5;
draw(hyp);
// DW 2026-11-08: the version only, small. Failure: the name is back, or BC's 36px text.
check("  hovering it shows the version, without the name", texts, ["ECHS v1.7.0"]);
check("  in a small font", fonts, ["20px Arial"]);
check("  and the canvas font is put back afterwards", MainCanvas.font, "36px Arial");
MouseX = MouseY = -1;
draw(hyp);
check("  and not without the mouse on it", texts.length, 0);
deliver(OLD, { type: "state-response", hypnoEnabled: true });
check("an older build, with no version or choice: shown", draw({ MemberNumber: OLD, Name: "Old" }).length, 1);
MouseX = 1000 + 228 * 0.5 + 5; MouseY = 2 * 0.5 + 5;
draw({ MemberNumber: OLD, Name: "Old" });
check("  as an older version", texts, ["ECHS (older version)"]);
MouseX = MouseY = -1;
check("someone we never heard from: no icon", draw({ MemberNumber: 4242, Name: "Plain" }).length, 0);

// --- 3. rule 1: their choice ----------------------------------------------------------------------
sent = [];
deliver(SHY, { type: "state-query", presence: true, version: "1.7.0", showIcon: false });
// Failure: drawn for someone who said not to.
check("unticked 'Show others': no icon", draw({ MemberNumber: SHY, Name: "Shy" }).length, 0);
check("  but they are still answered, for their panel", sent.some((m) => m.type === "state-response" && m.to === SHY), true);
check("  and our answer carries our version and choice", sent.find((m) => m.type === "state-response")?.showIcon, true);

// --- 4. our own icon --------------------------------------------------------------------------------
check("our own spiral shows while our box is ticked", draw(Player).length, 1);
sent = [];
storage.setFeature("showEchsIcon", false);
check("unticked: ours is gone", draw(Player).length, 0);
// Failure: the room keeps drawing ours after we said not to.
check("  and the room is told at once", roomAsks().map((m) => m.showIcon), [false]);
draw(Player);
check("  once, not every frame", roomAsks().length, 1);
storage.setFeature("showEchsIcon", true);
draw(Player);

// --- 5. the viewer's spot ---------------------------------------------------------------------------
storage.setEchsIconSpot("left");
drawn = draw(hyp, 0, 0, 1);
check("'Below, on the left': x 15, y 50", [drawn[0]?.x, drawn[0]?.y], [15 + 30 * 0.12, 50 + 30 * 0.12]);
storage.setEchsIconSpot("off");
check("'Off': nothing over anyone", [draw(hyp).length, draw(Player).length], [0, 0]);
storage.setEchsIconSpot("top");
check("back to the top row", draw(hyp).length, 1);
check("the spot is a stored choice, top by default", storage.getEchsIconSpot(), "top");

// --- 6. housekeeping --------------------------------------------------------------------------------
sent = [];
deliver(1, { type: "state-query", presence: true, version: "1.7.0", showIcon: true });
// Failure: we answer our own room-wide ask, which the server sends back to us.
check("our own ask, come back: not answered", sent.length, 0);
sent = [];
now += 10_000;
sync();
check("the same room, synced again within a minute: not re-asked", roomAsks().length, 0);
now += 60_000;
sync();
check("  after a minute: asked again", roomAsks().length, 1);
ChatRoomData.Name = "Elsewhere";
sent = [];
sync();
check("a new room: asked", roomAsks().length, 1);
check("  and the old room's players forgotten", draw(hyp).length, 0);
// An older build arrives and never asks the room.
sent = [];
ChatRoomCharacter.push({ MemberNumber: LATE, Name: "Late" });
badgeHooks.ChatRoomSyncMemberJoin([{ SourceMemberNumber: LATE }], () => undefined);
check("someone arrives: not asked straight away", sent.length, 0);
pendingTimers.filter((t) => t.live && t.ms === 4000).forEach((t) => { t.live = false; t.fn(); });
// Failure: an older build that never asks the room is never found.
check("  unheard after 4 seconds: asked directly", sent.filter((m) => m.type === "state-query" && m.to === LATE).length, 1);
sent = [];
deliver(HYP, { type: "state-query", presence: true, version: "1.7.0", showIcon: true });
badgeHooks.ChatRoomSyncMemberJoin([{ SourceMemberNumber: HYP }], () => undefined);
pendingTimers.filter((t) => t.live && t.ms === 4000).forEach((t) => { t.live = false; t.fn(); });
check("  heard from already: not asked again", sent.filter((m) => m.type === "state-query" && m.to === HYP).length, 0);

// --- 7. /echs icons (v1.7.1, after DW saw no icon on v1.7.0) --------------------------------------
// Failure: rule 5. A drawing error vanished, so a broken icon and a missing one looked the same.
let report = badge.describeIcons().join(" | ");
check("/echs icons: which hooks took", /hooked ChatRoomSync, ChatRoomSyncMemberJoin, ChatRoomDrawCharacterStatusIcons/.test(report), true);
check("  how often it was asked to draw, and drew", /Drawn [1-9]\d* times in [1-9]\d* calls/.test(report), true);
check("  who in the room it has heard from", /Old \(#555\): not heard from/.test(report) || /Late \(#888\)/.test(report), true);
const realCircle = globalThis.DrawCircle;
globalThis.DrawCircle = () => { throw new Error("canvas gone"); };
const bcResult = badgeHooks.ChatRoomDrawCharacterStatusIcons([Player, 0, 0, 1], () => "bc drew");
globalThis.DrawCircle = realCircle;
check("a drawing error does not break BC's own drawing", bcResult, "bc drew");
check("  and /echs icons reports it", /Last drawing error, \d+s ago: Error: canvas gone/.test(badge.describeIcons().join(" | ")), true);
storage.setEchsIconSpot("off");
draw(hyp);
check("  and says when the setting is why", /Not drawn because your ECHS icons setting is Off/.test(badge.describeIcons().join(" | ")), true);
storage.setEchsIconSpot("top");
// BCT's "icons only on hover" (DW's v1.7.0 run). Failure: the reason goes unnamed.
check("BCT's hover setting off: not mentioned", /BCT/.test(badge.describeIcons().join(" | ")), false);
Player.BCT = { bctSettings: { allIconOnlyShowOnHover: true } };
check("  on: named as the reason", /BCT is set to show icons only on hover/.test(badge.describeIcons().join(" | ")), true);
delete Player.BCT;

console.log(`echs-icon: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
