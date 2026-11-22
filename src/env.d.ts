// Injected by build.mjs via esbuild's `define`, from package.json's version — single
// source of truth so the on-screen indicator can never drift from what actually built.
declare const __VERSION__: string;
// True only in the file:// test build (dist/HypnosisAddon.user.js), which shows the dev "D" like the
// FUSAM dev channel does (log.ts, RELEASE_SUFFIX). False in the shipped bundle and the loader.
declare const __LOCAL_BUILD__: boolean;
