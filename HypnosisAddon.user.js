// ==UserScript==
// @name         Erotic Chat Hypnosis Suite (ECHS)
// @namespace    https://github.com/Dwfreegethub/HypnosisAddon
// @version      0.90.0
// @description  Trust-based hypnosis mechanics for Bondage Club
// @author       DWfree
// The install file committed at the repo root. updateURL is where Tampermonkey reads the
// version line above; downloadURL is what it pulls when the root file is newer than installed.
// Both point at the same raw-on-main URL the README installs from, so every release that updates
// the committed root build reaches installed testers automatically — no reinstall.
// Since v0.83.0 that root file is the small loader, which fetches the add-on itself from jsDelivr
// on every page load (src/loader.ts). This header is shared by the loader and the local dev build.
// The two update URLs must never change: installs from before the loader find it only because it
// sits at the address they already check.
//
// TWO THINGS NO COMMENT LINE IN THIS BLOCK MAY DO, both of which this block once did.
// Every line of the block is fed to the userscript manager's metadata parser, so prose here is
// not inert. A line may not BEGIN WITH an "@" key — a prose line opening with the version key
// is a second declaration below the real one, and a manager that takes the last wins would read
// it as the script's version and stop seeing new releases. A line may also not contain the
// block's own closing marker, even mid-sentence, since a parser scanning for it truncates the
// block there and the download and update keys below would simply vanish. Name keys bare in
// prose, and describe the markers rather than typing them. Both fixed v0.75.0.
// @downloadURL  https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js
// @updateURL    https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js
// Every host BC is served from needs its own @match or the script simply never runs
// there — no error, it just isn't loaded. `*.host` also covers the bare domain; the bare
// form is listed anyway, belt-and-braces, since a silent miss is the worst failure here.
// bondageprojects.com was checked and does not serve the game, so it isn't listed.
// Europe is listed both with and without the hyphen, bondage-europe and bondageeurope, on DW's
// word (v0.81.1): players reach it under both spellings, and a miss here is silent.
// Each regional mirror is a separate origin, so a player switching hosts loads settings from
// their BC account rather than localStorage — see loadSettings() in src/storage.ts.
// @match        *://*.bondageprojects.elementfx.com/*
// @match        *://bondageprojects.elementfx.com/*
// @match        *://*.bondage-europe.com/*
// @match        *://bondage-europe.com/*
// @match        *://*.bondageeurope.com/*
// @match        *://bondageeurope.com/*
// @match        *://*.bondage-asia.com/*
// @match        *://bondage-asia.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  // src/log.ts
  var TAG = "[HypnosisAddon]";
  var DEBUG_KEY = "ECHS_DEBUG";
  function readDebugFlag() {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(DEBUG_KEY) === "true";
    } catch {
      return false;
    }
  }
  var debugFlag = readDebugFlag();
  function warn(...args) {
    console.warn(TAG, ...args);
  }
  function info(...args) {
    console.info(TAG, ...args);
  }

  // src/loader.ts
  var CDN_URL = "https://cdn.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@main/cdn/HypnosisAddon.js";
  var FALLBACK_URL = "https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/cdn/HypnosisAddon.js";
  function loadFromCdn() {
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = CDN_URL;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      (document.head || document.documentElement).appendChild(s);
    });
  }
  async function loadFromFallback() {
    try {
      const res = await fetch(FALLBACK_URL, { cache: "no-cache" });
      if (!res.ok) {
        warn(`loader: GitHub fallback answered ${res.status}`);
        return false;
      }
      const code = await res.text();
      if (!code.trim()) {
        warn("loader: GitHub fallback returned an empty file");
        return false;
      }
      const s = document.createElement("script");
      s.textContent = `${code}
//# sourceURL=${FALLBACK_URL}`;
      (document.head || document.documentElement).appendChild(s);
      return true;
    } catch (err) {
      warn("loader: GitHub fallback could not be fetched:", err);
      return false;
    }
  }
  var FAILED_NOTICE = "ECHS could not load: neither jsDelivr nor GitHub could be reached. Refresh the page to try again. (Click to dismiss.)";
  function showFailedNotice() {
    const el = document.createElement("div");
    el.textContent = FAILED_NOTICE;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "4px",
      right: "4px",
      maxWidth: "420px",
      zIndex: "9999",
      padding: "4px 8px",
      background: "rgba(140,0,0,0.85)",
      color: "#fff",
      fontSize: "12px",
      fontFamily: "sans-serif",
      borderRadius: "3px",
      cursor: "pointer"
    });
    el.addEventListener("click", () => el.remove());
    (document.body || document.documentElement).appendChild(el);
  }
  async function runLoader() {
    info(`loader v${"0.90.0"}: loading ECHS from jsDelivr`);
    if (await loadFromCdn()) return "cdn";
    warn(`loader: jsDelivr copy failed to load (${CDN_URL}); trying GitHub directly`);
    if (await loadFromFallback()) {
      info("loader: loaded ECHS from the GitHub fallback");
      return "fallback";
    }
    warn("loader: ECHS was not loaded: both jsDelivr and the GitHub fallback failed");
    showFailedNotice();
    return "failed";
  }

  // src/loader-entry.ts
  runLoader();
})();
