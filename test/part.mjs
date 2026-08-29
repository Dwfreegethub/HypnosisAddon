const { matchBodyPartCommand, matchSuggestion } = await import("./voice-bundle.mjs");
const d = c => { const b = matchBodyPartCommand(c); return b ? `${b.block?"BLOCK":"RELEASE"} ${b.all?"ALL":b.groups.join("+")}` : `(falls through) ${matchSuggestion(c) ?? "no match"}`; };
const CASES = [
  ["Missy, you cannot touch your breasts.","BLOCK ItemBreast+ItemNipples"],
  ["Missy, don't touch your breasts.","BLOCK ItemBreast+ItemNipples"],
  ["Missy, you cannot touch your pussy.","BLOCK ItemVulva+ItemVulvaPiercings"],
  ["Missy, you cannot touch your ass.","BLOCK ItemButt"],
  ["Missy, you can touch your breasts.","RELEASE ItemBreast+ItemNipples"],
  ["Missy, you cannot touch yourself.","BLOCK ALL"],
  ["Missy, don't touch yourself.","BLOCK ALL"],
  ["Missy, you can touch yourself.","RELEASE ALL"],
  // CRITICAL: must NOT be swallowed as a body part
  ["Missy, you cannot touch your clothes.","(falls through) clothing-block"],
  ["Missy, don't touch your clothes.","(falls through) clothing-block"],
  ["Missy, you can touch your clothing.","(falls through) clothing-release"],
  // unknown part falls through to nothing
  ["Missy, you cannot touch your elbow.","(falls through) no match"],
  // self-reference guard
  ["I cannot touch your breasts.","(falls through) no match"],
];
let p=0; const f=[];
for(const [s,e] of CASES){const g=d(s); g===e?p++:f.push([s,e,g]);}
console.log(`body parts: ${p}/${CASES.length}`);
for(const [s,e,g] of f) console.log(`  ${JSON.stringify(s)}\n    want ${e}\n    got  ${g}`);
