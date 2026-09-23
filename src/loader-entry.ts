// Entry point for the installed loader build (build.mjs). Kept separate from loader.ts so the
// suite can import the loader's pieces without the import itself starting a load.
import { runLoader } from "./loader";

runLoader();
