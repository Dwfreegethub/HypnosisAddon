const { isWakeLine, matchSuggestion } = await import("./voice-bundle.mjs");
const CASES = [
  ["Missy, wake up.",true],["Wake up, Missy.",true],["Missy, wake up now.",true],
  ["Missy, you are awake.",true],["Missy, you are wide awake.",true],
  ["Missy, awaken.",true],["Missy, come back to me.",true],
  ["Missy, come out of it.",true],["Missy, you will wake up now.",true],
  ["Missy, you are awake again.",true],
  // must NOT wake
  ["I need to wake up early tomorrow.",false],
  ["Missy, you notice everything again.",false],
  ["Missy, you can move again.",false],
  ["Missy, you are aware again.",false],
  ["Missy, you cannot move.",false],
];
let p=0; const f=[];
for(const [s,e] of CASES){const g=isWakeLine(s); g===e?p++:f.push([s,e,g]);}
console.log(`wake: ${p}/${CASES.length}`);
for(const [s,e,g] of f) console.log(`  ${JSON.stringify(s)} want ${e} got ${g}`);
console.log("\n-- awareness collision check --");
for (const s of ["Missy, you are aware again.","Missy, you notice everything again."])
  console.log(`  ${matchSuggestion(s)}  <- ${s}`);
