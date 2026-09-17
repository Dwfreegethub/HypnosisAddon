// The first-run notice (design.md "THE FIRST-RUN NOTICE"). It closes the discovery gap where a
// fresh install is silent — every permission off, wizard/starter only visible if you open
// settings — and it must fire once per install, local only, never auto-enable, and never greet
// an already-configured user (an upgrade must be quiet).
import lzString from "lz-string"; // CommonJS module — default-import then destructure
const { compressToBase64 } = lzString;

let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);
globalThis.ServerPlayerExtensionSettingsSync = () => {};
// An already-configured user's stored blob is placed BEFORE the first settings read, so the
// very first load runs normalise() and its welcomeShown back-fill against it. A configured user
// is signalled by starterState "done".
globalThis.Player = {
	MemberNumber: 1,
	ArousalSettings: {},
	ExtensionSettings: { HypnosisAddon: compressToBase64(JSON.stringify({ starterState: "done" })) },
};
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

const { storage, welcome } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- an already-configured user is back-filled as welcomed (normalise), so no upgrade greeting ---
check("configured user is back-filled as welcomed", storage.wasWelcomeShown(), true);
said = [];
welcome.maybeShowFirstRunNotice();
check("  so they are never greeted on upgrade", said.length, 0);

// --- fresh install: silent, so the notice fires, once, and only locally ---
storage.resetSettings();
check("a fresh install has not been welcomed", storage.wasWelcomeShown(), false);
said = [];
welcome.maybeShowFirstRunNotice();
check("a fresh install is greeted", said.length, 2);
check("  line 1: nothing on, and where to go", /nothing is switched on yet.*spiral/i.test(said[0]), true);
check("  line 2: reactions visible by default", /reactions are visible to the room by default/i.test(said[1]), true);
check("  local only (tellPlayer brackets it)", said[0].startsWith("[") && said[0].endsWith("]"), true);
check("  and is now marked shown", storage.wasWelcomeShown(), true);

// --- once per install: a second call is silent ---
said = [];
welcome.maybeShowFirstRunNotice();
check("never fires twice", said.length, 0);

// --- "enabled but nothing granted" is the same silence, so it still fires ---
storage.resetSettings();
storage.setFeature("hypnoEnabled", true);
said = [];
welcome.maybeShowFirstRunNotice();
check("hypnoEnabled on with no permission still greets", said.length, 2);

// --- a granted permission means configured: no notice, but marked shown so it never nags later ---
storage.resetSettings();
storage.setFeature("movementRestriction", true);
said = [];
welcome.maybeShowFirstRunNotice();
check("a configured user gets no notice", said.length, 0);
check("  but is marked welcomed so it can't fire later", storage.wasWelcomeShown(), true);

// --- hypnoEnabled alone is NOT a permission: turning only it on is still silence ---
storage.resetSettings();
storage.setFeature("hypnoEnabled", true);
check("hypnoEnabled alone leaves the add-on silent", storage.hasAnyPermissionGranted(), false);
storage.setFeature("triggerControl", true);
check("granting a real permission flips it", storage.hasAnyPermissionGranted(), true);

console.log(`welcome: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
