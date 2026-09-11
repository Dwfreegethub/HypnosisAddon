# HypnosisAddon

A Bondage Club Tampermonkey userscript, in TypeScript, that lets one player act as hypnotist over
another: induction, spoken suggestions, persistent triggers, the clothing illusion, carry-forward,
and a trust-and-depth gating system underneath all of it.

**Version:** `package.json` is the single source of truth; the on-screen banner derives from it.

## Where the facts live — do not copy them here

This file used to carry a module map, a built list and a numbered priority list. Within a day it
disagreed with the code in three places, which is the same drift the README records removing its
own design copy for. So it now points, and does not duplicate.

| Need | Read |
|---|---|
| **Coming to the project cold** | `docs/design.md` → *Orientation for a New Contributor* — the rules, the module map, the import rule, how to test, the vocabulary |
| What works today, by stage | `docs/design.md` → *Current Implementation Status* |
| What to build next, and why | `docs/design.md` → *Development Stages > Todo* and *Pre-Release Checklist* |
| What still owes a live run | `docs/design.md` → *Needs Testing* |
| Known faults and decided fixes | `docs/design.md` → *Known Bugs* |
| **Anything touching the induction roll, the AFK/prompt-timeout path, settings defaults, or extreme mode** | `docs/declared-skill-proposal.md` **first** — its decisions are settled and not all folded into `design.md` yet. §10 is the list of what is still open; §11 is what has *not* been verified |
| Engineering record, BC API traps | `README.md` |

Settled decisions are recorded in `design.md`. Do not re-decide one without flagging that you are.

## Rules that are not negotiable

The reasoning for each is in the Orientation section; this is the checklist.

1. **Subject-authoritative.** Every cross-player action is a request; the subject's client alone decides, from its own settings. Never trust the hypnotist's client for permissions, depth, session state, or whether a suggestion matched.
2. **The safeword always works.** `/hypno safeword` clears everything from any state. No feature, trigger or lock may reach it. Unticking *Hypnosis Enabled* is the same floor and shares the same teardown (`hardFloorStop()`).
3. **Never write `Player.Appearance` for the illusion.** It is server-synced and corruptible. The illusion is a shadow character on the subject's own screen.
4. **Chemical depth never writes anything permanent nor lies to the subject about their own state.** That is the `earnedOnly` split in `depth.ts`.
5. **A silent success is indistinguishable from a silent failure.** Anything that refuses, or runs without landing, says so.
6. **If a step cannot fail, it is not testing anything.** Every harness step states its expected result and what failure looks like.
7. **No BCX or LSCG code, ever.** Technique reference only, with the source named in a comment.
8. **Verify against the live BC client source before writing against any BC API.** Not from memory, not from the wiki. It has changed the answer four times.
9. **Bump `package.json` on every change that touches code.**
10. **`testbot/secrets.json` is never committed or printed.** It is gitignored; DW fills it in.
11. **`TESTING_MODE` in `src/log.ts` stays `true` until release, and flipping it is the last step** — it disables the test harness.
12. **Do not restart either live bot in this workspace (BD or SSS) without explicit confirmation from DW.**

## Build and test

```
npm run build        # esbuild → dist/HypnosisAddon.user.js
npm run watch        # same, rebuilding on save
npm run typecheck    # tsc --noEmit
npm test             # bundles, then runs every suite in test/
```

Run `npm test` after any change to `src/voice.ts` — overlapping suggestion wording is the easiest
mistake in this codebase to make and the hardest to see by hand. Read the check count off the test
output, not off any document.

In the browser: install from a `file://` URL pointing at `dist/HypnosisAddon.user.js` (Tampermonkey
needs "Allow access to file URLs"), then refresh the BC tab after each rebuild.
