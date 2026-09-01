globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
const registered = [];
globalThis.ChatRoomRegisterMessageHandler = (h) => registered.push(h);
// BC's own handler list, as far as the skip predicate is concerned. Both entries really do
// sit at Priority 210 in ChatRoom.js, which is exactly why the predicate matches on the
// Description instead: skipping by priority would take the kneel message with it.
globalThis.ChatRoomMessageHandlers = [
  { Description: "Handle stimulation events", Priority: 210 },
  { Description: "Arousal processing", Priority: 210 },
];
const { matchSuggestion } = await import("./voice-bundle.mjs");
const { suppression } = await import("./harness-bundle.mjs");
const { classifyForTest } = suppression;

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
  // --- attention vs sensation ---------------------------------------------------------
  // These two families were ONE suggestion until v0.39.0, and the split is the whole point:
  // "ignore" hides the message and leaves arousal alone, "cannot feel" skips the arousal and
  // leaves the message alone. Getting a phrase into the wrong family is the failure this
  // section exists to catch, so every one of them is pinned to its family by name.
  ["Missy, you will ignore my touches.","touch-block"],
  ["Ignore my touches, Missy.","touch-block"],
  ["Missy, you notice my touches again.","touch-release"],
  ["Missy, you register my touch.","touch-release"],
  ["Missy, you stop ignoring my touches.","touch-release"],
  // Shadowed on purpose, and pinned so nobody "fixes" it: awareness-release's broad
  // /you (can|may) notice/ takes this first, and it clears activity suppression anyway.
  ["Missy, you can notice my touch.","awareness-release"],
  // Sensation. The first two used to answer to touch-block, which is the bug.
  ["Missy, you cannot feel my touch.","numb-block"],
  ["Missy, my touches do not reach you.","numb-block"],
  ["Missy, you cannot feel my hands.","numb-block"],
  ["Missy, you cannot feel anything.","numb-block"],
  ["Missy, you feel nothing.","numb-block"],
  ["Missy, you are numb.","numb-block"],
  ["Missy, your skin does not feel.","numb-block"],
  ["Missy, touch does not reach you.","numb-block"],
  ["Missy, you can feel my touch.","numb-release"],
  ["Missy, you feel my touches again.","numb-release"],
  ["Missy, you can feel again.","numb-release"],
  ["Missy, your skin responds again.","numb-release"],
  ["Missy, touch reaches you again.","numb-release"],
  // no collisions with existing
  ["Missy, you cannot move.","movement-block"],
  ["Missy, you cannot speak.","speech-block"],
  ["Missy, kneel.","kneel"],
  ["Missy, don't touch your clothes.","clothing-block"],
  ["Missy, you cannot change your clothes.","clothing-block"],
  // --- undressing vs being unable to undress -------------------------------------------
  // These two families read almost identically and mean opposite things. The negated forms
  // MUST reach clothing-block, which is why the undress pair sits after it in the table.
  ["Missy, take everything off.","undress-all"],
  ["Missy, strip.","undress-all"],
  ["Missy, take off all your clothes.","undress-all"],
  ["Missy, nothing stays on.","undress-all"],
  ["Missy, take something off.","undress"],
  ["Missy, undress.","undress"],
  ["Missy, start undressing.","undress"],
  ["Missy, take your clothes off.","undress"],
  // The opposite meaning, same words.
  ["Missy, you cannot undress.","clothing-block"],
  ["Missy, you cannot strip.","clothing-block"],
  ["Missy, you cannot get undressed.","clothing-block"],
  ["Missy, you cannot take off your clothes.","clothing-block"],
  ["Missy, leave your clothes alone.","clothing-block"],
  // must not fire
  ["I didn't notice, Missy.",null],
  ["We should ignore that, Missy.",null],
];
let p=0; const f=[];
for(const [s,e] of CASES){const g=matchSuggestion(s); g===e?p++:f.push([s,e,g]);}
console.log(`suppression: ${p}/${CASES.length}`);
for(const [s,e,g] of f) console.log(`  ${JSON.stringify(s)}\n    want ${e}  got ${g}`);

// --- the numbness handler itself -------------------------------------------------------
// The pattern table above only proves the right WORDS reach the right suggestion. This
// proves the effect: that numbness skips BC's arousal handler and nothing else, and that it
// leaves the message alone — which is the whole reason it is a separate feature from
// touch-block rather than a flag on it.
suppression.installSuppression();
const numbHandler = registered.find((h) => h.Priority === 205);
const hideHandler = registered.find((h) => h.Priority === 320);

let np = 0; const nf = [];
const ncheck = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? np++ : nf.push([label, want, got]);
};

// Someone else caressing us: the exact shape BC's own arousal handler acts on.
const TOUCH = [
  { Type: "Activity", Content: "ChatOther-ItemBreast-Caress" },
  { MemberNumber: 2 },
  "",
  { ActivityName: "Caress", TargetMemberNumber: 1, FocusGroup: { Name: "ItemBreast" } },
];
const call = (h, [d, s, m, meta]) => h.Callback(d, s, m, meta);
/** What the handler's return value actually does to a named BC handler. */
const skips = (ret, description) =>
  typeof ret === "object" && ret !== null && typeof ret.skip === "function"
    ? !!ret.skip({ Description: description, Priority: 210 })
    : false;

ncheck("both handlers registered", [!!numbHandler, !!hideHandler], [true, true]);
ncheck("numb starts off", suppression.isNumb(), false);
ncheck("  and does nothing while off", call(numbHandler, TOUCH), false);

suppression.setNumb(true);
const ret = call(numbHandler, TOUCH);
ncheck("numb skips arousal", skips(ret, "Arousal processing"), true);
// Returning `true` would have done this too, and taken four other handlers with it.
ncheck("  but not the stimulation handler", skips(ret, "Handle stimulation events"), false);
ncheck("  nor BC's own hiders", skips(ret, "Hide anything per sensory deprivation rules"), false);
ncheck("  nor the display", skips(ret, "Push message to the chat"), false);
ncheck("  and never stops the pipeline outright", ret === true, false);

// Scope: exactly the arousal handler's own condition, so we can neither miss a touch it
// would have acted on nor eat one it would have ignored.
ncheck("our own touch is not ours to skip", call(numbHandler, [TOUCH[0], { MemberNumber: 1 }, "", TOUCH[3]]), false);
ncheck("someone else's activity is untouched",
  call(numbHandler, [TOUCH[0], TOUCH[1], "", { ActivityName: "Caress", TargetMemberNumber: 2 }]), false);
ncheck("a message with no activity is untouched",
  call(numbHandler, [{ Type: "Chat", Content: "hello" }, TOUCH[1], "", {}]), false);

// The composability claim, and the reason these are two permissions rather than one.
ncheck("numb alone does NOT hide the message", call(hideHandler, TOUCH), false);
suppression.setSuppressed("activity", true);
ncheck("  ignoring alone does", call(hideHandler, TOUCH), true);
ncheck("  and the two are independent", suppression.isNumb(), true);

// Every teardown path in the add-on runs through this one function.
suppression.clearAllSuppression();
ncheck("clearAllSuppression takes numbness too", suppression.isNumb(), false);
ncheck("  and the hiding", call(hideHandler, TOUCH), false);
ncheck("  so the handler falls silent", call(numbHandler, TOUCH), false);

console.log(`numbness: ${np}/${np + nf.length}`);
for (const [l, e, g] of nf) console.log(`  ${l}\n    want ${JSON.stringify(e)}  got ${JSON.stringify(g)}`);
