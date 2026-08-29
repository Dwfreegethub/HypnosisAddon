const { matchSuggestion } = await import("./voice-bundle.mjs");
const CASES = [
  ["Missy, you cannot speak.","speech-block"], ["Missy, you can't talk.","speech-block"],
  ["Don't speak, Missy.","speech-block"], ["Missy, stay silent.","speech-block"],
  ["Be quiet, Missy.","speech-block"], ["Missy, your voice is gone.","speech-block"],
  ["Missy, you have no voice.","speech-block"], ["Not a word, Missy.","speech-block"],
  ["Silence, Missy.","speech-block"], ["Missy, you are unable to speak.","speech-block"],
  ["Missy, you have forgotten how to speak.","speech-block"],
  ["Missy, you can speak.","speech-release"], ["Missy, you may talk.","speech-release"],
  ["Your voice returns, Missy.","speech-release"], ["Speak freely, Missy.","speech-release"],
  ["Missy, you can talk again.","speech-release"], ["Missy, you have your voice back.","speech-release"],
  // must NOT fire
  ["I cannot speak for her, Missy.",null], ["We should be quiet, Missy.",null],
  ["I can't talk right now.",null],
  // must not collide with movement/clothing
  ["Missy, you cannot move.","movement-block"], ["Missy, stay still.","movement-block"],
  ["Missy, kneel.","kneel"], ["Missy, stand.","stand"],
  ["Missy, don't touch your clothes.","clothing-block"],
];
let pass=0; const fails=[];
for (const [p,e] of CASES){ const g=matchSuggestion(p); if(g===e) pass++; else fails.push([p,e,g]); }
console.log(`speech: ${pass}/${CASES.length}`);
for(const [p,e,g] of fails) console.log(`  ${JSON.stringify(p)}\n    want ${e}  got ${g}`);
