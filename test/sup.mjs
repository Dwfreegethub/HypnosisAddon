globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomRegisterMessageHandler = () => {};
const { matchSuggestion } = await import("./voice-bundle.mjs");
const { suppression: { classifyForTest } } = await import("./harness-bundle.mjs");

// --- classification of the actual BC messages ---------------------------------------
// Which bucket a message lands in is decided from its payload, and the payloads differ far
// more than the wording does. The wardrobe message is the case that was silently missed:
// BC sends ONE "ChangeClothes" Action for an entire wardrobe session, naming only a source
// and a destination character - no asset, no group - so there was nothing to classify by
// and it fell straight through to the chat log.
const CLASSIFY = [
  ["whole-wardrobe change",
   { Type: "Action", Content: "ChangeClothes" }, { TargetMemberNumber: 1 }, "clothing"],
  ["one garment, by asset",
   { Type: "Action", Content: "Whatever" }, { Assets: { AssetName: { IsRestraint: false } } }, "clothing"],
  ["one restraint, by asset",
   { Type: "Action", Content: "Whatever" }, { Assets: { AssetName: { IsRestraint: true } } }, "bondage"],
  ["emptied a clothing slot, by group",
   { Type: "Action", Content: "Whatever" }, { FocusGroup: { Category: "Appearance", IsRestraint: false } }, "clothing"],
  ["emptied an item slot, by group",
   { Type: "Action", Content: "Whatever" }, { FocusGroup: { Category: "Item" } }, "bondage"],
  ["an activity", { Type: "Activity", Content: "ChatOther-ItemBreast-Caress" }, {}, "activity"],
  // Must stay unclassified: an unknown asset-less Action is not ours to eat, and the
  // safeword messages in particular must always reach the subject.
  ["unknown asset-less action", { Type: "Action", Content: "HoldLeash" }, {}, null],
  ["safeword release", { Type: "Action", Content: "ActionActivateSafewordRelease" }, {}, null],
  ["ordinary chat", { Type: "Chat", Content: "hello" }, {}, null],
];
let cp = 0; const cf = [];
for (const [label, data, meta, want] of CLASSIFY) {
  const got = classifyForTest(data, meta);
  got === want ? cp++ : cf.push([label, want, got]);
}
console.log(`message classification: ${cp}/${CLASSIFY.length}`);
for (const [l, e, g] of cf) console.log(`  ${l}
    want ${e}  got ${g}`);

const CASES = [
  ["Missy, you notice nothing that happens to you.","awareness-block"],
  ["Missy, you notice nothing.","awareness-block"],
  ["Missy, you will not notice.","awareness-block"],
  ["Missy, you won't notice anything.","awareness-block"],
  ["Missy, you are unaware.","awareness-block"],
  ["Missy, you notice everything again.","awareness-release"],
  ["Missy, you notice what happens to you.","awareness-release"],
  ["Missy, you are aware again.","awareness-release"],
  ["Missy, you will ignore my touches.","touch-block"],
  ["Ignore my touches, Missy.","touch-block"],
  ["Missy, you cannot feel my touch.","touch-block"],
  ["Missy, my touches do not reach you.","touch-block"],
  ["Missy, you can feel my touch.","touch-release"],
  ["Missy, you feel my touches again.","touch-release"],
  // no collisions with existing
  ["Missy, you cannot move.","movement-block"],
  ["Missy, you cannot speak.","speech-block"],
  ["Missy, kneel.","kneel"],
  ["Missy, don't touch your clothes.","clothing-block"],
  ["Missy, you cannot change your clothes.","clothing-block"],
  // must not fire
  ["I didn't notice, Missy.",null],
  ["We should ignore that, Missy.",null],
];
let p=0; const f=[];
for(const [s,e] of CASES){const g=matchSuggestion(s); g===e?p++:f.push([s,e,g]);}
console.log(`suppression: ${p}/${CASES.length}`);
for(const [s,e,g] of f) console.log(`  ${JSON.stringify(s)}\n    want ${e}  got ${g}`);
