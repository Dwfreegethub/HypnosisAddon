// The update notice (v1.15.0, update.ts; DW 2026-11-21). Each check says what failure looks like.
//
//   1. It fires once, on the first load of a NEWER stable version: never on a fresh install (the
//      first-run notice owns that), never on dev, never on a downgrade, never twice.
//   2. A player from before the feature (no lastSeenVersion) gets it.
//   3. It shows BC's beep (ServerShowBeep) with a click that opens the changelog, and one private
//      chat line with a link. Nothing reaches the room.
//   4. It rides the startup banner's poll, after the banner.
let local = [], room = [], beeps = [], opened = [];
let inRoom = true;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = (m) => room.push(m);
globalThis.ServerSend = (t, d) => room.push(d);
globalThis.ServerPlayerIsInChatRoom = () => inRoom;
globalThis.ServerShowBeep = (message, duration, options, title) => beeps.push({ message, duration, options, title });
globalThis.window = { open: (url) => opened.push(url) };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const { update, storage, welcome } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const reset = () => { local = []; room = []; beeps = []; opened = []; };

// Pure rules.
check("compare: newer", update.compareVersions("1.15.0", "1.14.1") === 1 && update.compareVersions("1.14.10", "1.14.9") === 1, "1.15.0 > 1.14.1 and 1.14.10 > 1.14.9 (numbers, not text)");
check("compare: same and older", update.compareVersions("1.14.1", "1.14.1") === 0 && update.compareVersions("1.13.0", "1.14.0") === -1, "0 and -1");
check("due: newer stable", update.updateNoticeDue("1.15.0", "1.14.1", false, false) === true, "due");
check("not due: fresh install", update.updateNoticeDue("1.15.0", undefined, true, false) === false, "the first-run notice owns a fresh install");
check("not due: dev", update.updateNoticeDue("1.15.0", "1.14.1", false, true) === false, "dev records silently");
check("not due: downgrade", update.updateNoticeDue("1.14.1", "1.15.0", false, false) === false, "going back says nothing");
check("due: from before the feature", update.updateNoticeDue("1.15.0", undefined, false, false) === true, "an existing player with no lastSeenVersion gets it");
check("note: written for this version", update.updateNoteText(update.UPDATE_NOTE.version) === update.UPDATE_NOTE.text, "the note's own text");
check("note: other version falls back", update.updateNoteText("9.9.9") === "ECHS was updated to v9.9.9.", "the plain fallback");
check("note has no HTML of its own", !/[<>&]/.test(update.UPDATE_NOTE.text), "plain words (the chat line is HTML)");

// The real thing: an existing player on a new stable version.
storage.markWelcomeShown();
storage.setLastSeenVersion("1.14.1");
reset();
let shown = update.maybeShowUpdateNotice(false, "1.15.0", false);
check("shown", shown === true && beeps.length === 1 && local.length === 1, `one beep and one line, got ${beeps.length} / ${local.length}`);
check("  beep title and text", beeps[0]?.title === "ECHS updated to v1.15.0" && beeps[0].message.startsWith(update.updateNoteText("1.15.0")) && beeps[0].duration === update.UPDATE_BEEP_MS, `the title and note, got ${JSON.stringify(beeps[0])}`);
beeps[0]?.options?.onClick?.();
check("  clicking the beep opens the changelog", opened[0] === update.CHANGELOG_URL, `the changelog, got ${JSON.stringify(opened)}`);
check("  chat line has the note and a link", local[0]?.includes(update.updateNoteText("1.15.0")) && local[0].includes(`href="${update.CHANGELOG_URL}"`) && local[0].includes('target="_blank"'), `a linked line, got ${local[0]}`);
check("  nothing reached the room", room.length === 0, `no room traffic, got ${JSON.stringify(room)}`);
check("  version recorded", storage.getLastSeenVersion() === "1.15.0", `1.15.0, got ${storage.getLastSeenVersion()}`);
reset();
shown = update.maybeShowUpdateNotice(false, "1.15.0", false);
check("never twice", shown === false && beeps.length === 0 && local.length === 0, "nothing on the second load");

// Dev: recorded, silent.
reset();
shown = update.maybeShowUpdateNotice(false, "1.15.1", true);
check("dev: silent", shown === false && beeps.length === 0 && local.length === 0, "nothing shown on dev");
check("  but recorded", storage.getLastSeenVersion() === "1.15.1", `1.15.1, got ${storage.getLastSeenVersion()}`);

// No beep function (an older BC): the chat line still comes.
const saved = globalThis.ServerShowBeep;
globalThis.ServerShowBeep = undefined;
reset();
shown = update.maybeShowUpdateNotice(false, "1.16.0", false);
check("no ServerShowBeep: the chat line still shows", shown === true && local.length === 1, `one line, got ${local.length}`);
globalThis.ServerShowBeep = () => { throw new Error("boom"); };
reset();
shown = update.maybeShowUpdateNotice(false, "1.17.0", false);
check("a throwing beep: the chat line still shows", shown === true && local.length === 1, `one line, got ${local.length}`);
globalThis.ServerShowBeep = saved;

// Junk in storage counts as none.
storage.setLastSeenVersion("<b>x");
check("junk lastSeenVersion reads as none", storage.getLastSeenVersion() === undefined, "undefined");

// The poll: banner first, then the notice (the build's own version; the harness is a local build, so dev).
storage.setLastSeenVersion("0.1.0");
reset();
welcome.startStartupBanner();
check("poll: banner prints", /ECHS\) · v/.test(local[0] ?? ""), `the banner first, got ${JSON.stringify(local)}`);
check("poll: a build with no real number notifies nothing", local.length === 1 && beeps.length === 0 && storage.getLastSeenVersion() === "0.1.0", `only the banner, got ${JSON.stringify(local)}`);

console.log(`update-notice: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
