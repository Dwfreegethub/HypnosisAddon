// The add-on's entry point: start ECHS, once per page.
//
// Since v1.0.1 there is more than one way in. The Tampermonkey loader, the bookmark loader and FUSAM
// (the BC add-on manager, which loads cdn/HypnosisAddon.js itself) each run the same bundle, and a
// player can easily have two of them. A second copy would install every hook and message handler
// again, so a whisper would be read twice and a drink dosed twice. So the first copy claims the
// page, and any later one says so in the console and does nothing.
//
// The claim is a plain property on window, set before main.ts runs at all, because main.ts starts
// registering things at its top level. The dynamic import keeps main.ts and everything it pulls in
// from running in a second copy; esbuild inlines it, so the bundle is still one file.
// log.ts imports nothing, so a second copy loading it starts nothing.
import { warn } from "./log";

const page = window as unknown as { __ECHS_LOADED__?: string };

if (page.__ECHS_LOADED__) {
	warn(
		`ECHS v${page.__ECHS_LOADED__} is already running on this page, so this copy ` +
			`(v${__VERSION__}) did nothing. Two loaders are installed (for example Tampermonkey and FUSAM); you only need one.`,
	);
} else {
	page.__ECHS_LOADED__ = __VERSION__;
	void import("./main");
}
