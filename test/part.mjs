const { matchBodyPartCommand, matchSuggestion } = await import("./voice-bundle.mjs");
// BODY_PARTS lives in selftouch.ts, which voice.ts imports but does not re-export.
const { selftouch: { BODY_PARTS } } = await import("./harness-bundle.mjs");

// BC's complete arousal-zone list, from Screens/Character/Preference/Text_Preference.csv
// (the ArousalZoneItem* rows). Any group not on this list can never be an activity target,
// so a block registered against it silently does nothing — which is exactly how "clit"
// ended up pointing at ItemVulva and leaving the clitoris reachable.
const BC_ZONES = new Set([
  "ItemBoots","ItemFeet","ItemLegs","ItemVulva","ItemVulvaPiercings","ItemButt","ItemPelvis",
  "ItemTorso","ItemNipples","ItemBreast","ItemArms","ItemHands","ItemNeck","ItemMouth",
  "ItemHead","ItemNose","ItemEars","ItemHood",
]);
const bogus = [];
for (const [word, groups] of Object.entries(BODY_PARTS))
  for (const g of groups) if (!BC_ZONES.has(g)) bogus.push(`${word} -> ${g}`);
console.log(`body-part groups: ${bogus.length ? "INVALID" : "all valid"}`);
for (const b of bogus) console.log(`  want a real BC arousal zone, got ${b}`);

const d = c => { const b = matchBodyPartCommand(c); return b ? `${b.block?"BLOCK":"RELEASE"} ${b.all?"ALL":b.groups.join("+")}` : `(falls through) ${matchSuggestion(c) ?? "no match"}`; };
const CASES = [
  ["Missy, you cannot touch your breasts.","BLOCK ItemBreast+ItemNipples"],
  ["Missy, don't touch your breasts.","BLOCK ItemBreast+ItemNipples"],
  ["Missy, you cannot touch your pussy.","BLOCK ItemVulva+ItemVulvaPiercings"],
  ["Missy, you cannot touch your ass.","BLOCK ItemButt"],
  // ItemVulvaPiercings is BC's "Clitoris" zone, not a piercing slot. Pointing "clit" at
  // ItemVulva blocked the pussy and left the clit reachable.
  ["Missy, you cannot touch your clit.","BLOCK ItemVulvaPiercings"],
  ["Missy, you cannot touch your clitoris.","BLOCK ItemVulvaPiercings"],
  // The broad word still reaches the clitoris; the specific one does not reach back.
  ["Missy, you cannot touch your pussy.","BLOCK ItemVulva+ItemVulvaPiercings"],
  // No ItemPenis group exists in BC — a penis uses the same two slots.
  ["Missy, you cannot touch your cock.","BLOCK ItemVulva+ItemVulvaPiercings"],
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
