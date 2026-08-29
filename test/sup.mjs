const { matchSuggestion } = await import("./voice-bundle.mjs");
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
