// Injected by build.mjs via esbuild's `define`, from package.json's version — single
// source of truth so the on-screen indicator can never drift from what actually built.
declare const __VERSION__: string;
// The release label shown after the version, from package.json's `releaseLabel` ("RC" for the 1.0
// release candidate, DW 2026-10-28). Display only: the version itself stays a plain number, because
// it is also the jsDelivr tag and what userscript managers compare. Empty in the test bundles.
declare const __RELEASE_LABEL__: string;
