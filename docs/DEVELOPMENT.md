# Development — BC Hypnosis Add-on

**The engineering record.** How to build, test and contribute; stage-by-stage implementation
notes; and the BC API traps that cost real time to find. If you are here to *play* the add-on
rather than work on it, go back to [`../README.md`](../README.md) and the
[wiki](https://github.com/Dwfreegethub/HypnosisAddon/wiki) instead.

Stack: TypeScript, bundled with esbuild into a single `.user.js`, built on `bondage-club-mod-sdk`.
Tampermonkey only loads one file, so unlike the Node bots in this workspace this needs a bundler,
not just `tsc`.

**The architectural short version.** Depth of access grows through accumulated relationship, not
through a command. Trust is per-hypnotist, stored on the subject's side, and derived from an
interaction count so the curve can be retuned without corrupting anyone's save. Every cross-player
action is only ever a *request* — the receiving client alone decides whether it lands, which is the
rule the whole architecture rests on.

## Where the documentation lives

| | |
|---|---|
| [`design.md`](design.md) | **The design.** Philosophy, the trust and depth models, every settled decision and why, open questions, the todo list. Start here for *what this is meant to be*. |
| [`feature-summary.md`](feature-summary.md) | Short player-facing list of what exists and what is planned. |
| [`declared-skill-proposal.md`](declared-skill-proposal.md) | Settled decisions on the induction roll, the AFK/prompt-timeout path, settings defaults and extreme mode. Read **first** if you are touching any of those. |
| [`../wiki/`](../wiki/) | Player-facing wiki pages, published to the GitHub wiki. Must be updated alongside the in-game help. |
| **This file** | The engineering record. Start here for *how it works and what will bite you*. |

> This file used to carry its own copy of the design — philosophy, trust curve, feature tables,
> open questions — duplicating `design.md` section for section. The copy drifted, as a duplicated
> source of truth always does: it was still presenting trust-percentage gating as current long
> after that had been superseded by the trance-depth redesign. It was removed on 2026-08-31 rather
> than re-synced, because re-syncing guarantees the same drift again. Design questions have exactly
> one answer now, and it lives in `design.md`.

---

## Getting set up

```bash
git clone https://github.com/Dwfreegethub/HypnosisAddon.git
cd HypnosisAddon
npm install
```

```bash
npm run build      # one-shot → dist/HypnosisAddon.user.js
npm run watch      # same, rebuilding on save
npm run typecheck  # tsc --noEmit
npm test           # bundles the modules, then runs every suite in test/
```

**Run `npm test` after any change to `voice.ts`.** Adding a suggestion whose wording overlaps an
existing one is the easiest mistake to make in this codebase and the hardest to notice by hand —
the suite exists because that has happened repeatedly. Read the check count off the test output,
not off any document.

### The dev loop against a live client

Install the built script in Tampermonkey from a `file://` URL pointing at
`dist/HypnosisAddon.user.js` (enable **"Allow access to file URLs"** for the extension), then
refresh the BC tab after each rebuild to pick up changes. With `npm run watch` running, that is
save → refresh → test.

`@match` targets `*://*.bondageprojects.elementfx.com/*`, `*://*.bondage-europe.com/*`,
`*://*.bondageeurope.com/*` and `*://*.bondage-asia.com/*` (each with a bare-domain twin) — BC is served from more than one
host and a non-matching `@match` fails completely silently. Adding a newly-appeared mirror is
the whole fix; there is no runtime host check anywhere in `src/` to update alongside it.

**Testing affordances are gated by the room, not a build flag.** `isTestingMode()` in `src/log.ts`
returns true only in a chat room named **"Hypno testing"** (case-insensitive), and is off everywhere
else and when not in a room — so the shipped build is safe by default with no release flip to
remember. The unit suites force it on through the `FORCE_TESTING` seed that `build-test.mjs`
rewrites; `build.mjs` does not. Keep that arrangement intact.

Two-account testing: install the built script on both, then drive it from either side. `ping` and
`bumptrust` need a real member number — get it from `/hypno logtrust` after a `bumptrust`, or from
the game's own UI.

### Rules that are not negotiable

The reasoning for each is in `design.md`'s *Orientation for a New Contributor*; this is the
checklist, and it is the same one `CLAUDE.md` carries.

1. **Subject-authoritative.** Every cross-player action is a request; the subject's client alone
   decides, from its own settings. Never trust the hypnotist's client for permissions, depth,
   session state, or whether a suggestion matched.
2. **The safeword always works.** `/hypno safeword` clears everything from any state. No feature,
   trigger or lock may reach it. Unticking *Hypnosis Enabled* is the same floor and shares the same
   teardown (`hardFloorStop()`).
3. **Never write `Player.Appearance` for the illusion.** It is server-synced and corruptible. The
   illusion is a shadow character on the subject's own screen.
4. **Chemical depth never writes anything permanent nor lies to the subject about their own state.**
   That is the `earnedOnly` split in `depth.ts`.
5. **A silent success is indistinguishable from a silent failure.** Anything that refuses, or runs
   without landing, says so.
6. **If a step cannot fail, it is not testing anything.** Every harness step states its expected
   result and what failure looks like.
7. **No BCX or LSCG code, ever.** Technique reference only, with the source named in a comment.
8. **Verify against the live BC client source before writing against any BC API.** Not from memory,
   not from the wiki. It has changed the answer four times.
9. **Bump `package.json` on every change that touches code.** It is the single source of truth for
   the version; the banner and the runtime `__VERSION__` both derive from it. Patch for a fix or a
   small visible change, minor only for a new feature or behaviour a player has to learn.
10. **`testbot/secrets.json` is never committed or printed.** It is gitignored.
11. **Keep the room-gated testing arrangement intact** (see above).
12. **Do not restart either live bot in this workspace (BD or SSS) without explicit confirmation.**
13. **Every release gets a plain-language line in the root [`CHANGELOG.md`](../CHANGELOG.md)**, in
    the same PR as the bump. The reasoning still goes in `docs/CHANGELOG.md`.

### Repository layout

`src/` is the add-on; `test/` is the unit suites (`npm test` runs every `.mjs` in it); `testbot/`
drives scripted play-tests against a live client; `docs/` is design and this file; `wiki/` is the
player-facing wiki source. `meta.txt` is the userscript banner — `build.mjs` rewrites its
`@version` line from `package.json` at build time, so the copy committed in `meta.txt` is allowed
to be stale and should not be hand-edited for version bumps.

**`dist/` is gitignored.** Nothing installable is currently committed; see *Publishing* below.

---

## Publishing and the install story

The player-facing install instructions in [`../README.md`](../README.md) are **live** as of v0.74.x.
A built userscript is committed at the repo **root** as `HypnosisAddon.user.js`, and testers install
it raw-on-`main`:
`https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js`.

This is **approach (A) below — "commit the build"**, chosen for alpha. `meta.txt` carries
`@downloadURL`/`@updateURL` pointing at that same raw URL, so Tampermonkey **auto-updates** installed
testers whenever the committed file's `@version` climbs. `dist/` stays gitignored; the ROOT file is
the only committed build. (Still absent, nice-to-haves not blockers: `@icon`, `@homepageURL`,
`@supportURL`.)

**Keeping it current is a release step, not automatic.** The committed root file is a build artifact,
so it goes stale the moment the version bumps unless regenerated — and a stale root file means testers
keep the old script (and, since `@updateURL` reads *its* version, are told they are up to date). So on
every release:

```bash
npm run release   # build, then copy dist/HypnosisAddon.user.js over the committed root file
```

then commit the changed `HypnosisAddon.user.js` with the version bump, and add the release's
plain-language line to the root [`CHANGELOG.md`](../CHANGELOG.md), which is what players read.
`npm run build` deliberately does NOT touch the root file, so the dev loop never churns it.

The two shapes this was chosen between:

**(A) Commit the build, point the banner at it (CHOSEN).** A raw-on-branch URL beats a release asset
because it is *stable*: it always serves the current file, so `@updateURL` never has to be rewritten.
A release-asset URL is per-tag and would need either a rewrite each release or the
`/releases/latest/download/` form plus a release step. The cost — paid by `npm run release` above — is
that every build shows up as a diff and must be regenerated before each push, or users get a stale
script.

**(B) The loader shape, which is what LSCG does.** LSCG's README publishes a small committed
*loader* userscript (`.../raw/main/lscgLoader.user.js`) that fetches the real bundle from GitHub
Pages at runtime. The loader almost never changes, so Tampermonkey rarely needs to update anything
and users are always on current code. Technique only — no LSCG code, per rule 7. This needs GitHub
Pages enabled and a published bundle, and is the better end state if FUSAM listing is the goal.

**FUSAM — not verified.** FUSAM's own user-facing page (`sidiousious.gitlab.io/bc-addon-loader`)
documents only how a *player* runs FUSAM, not what an add-on author must provide to be listed. The
project repository is on GitLab and its README did not render through plain fetching, so **the
listing requirements could not be established and are not documented here.** What *is* verifiable:
LSCG recommends FUSAM as the primary install route above its own Tampermonkey links, and serves a
stable bundle URL from GitHub Pages — which suggests a fetchable, always-current bundle URL is a
prerequisite. Treat that as inference, not fact, and confirm with the FUSAM maintainer before
relying on it.

---

**Stage 1 (done):** userscript loads, logs to console, shows a small on-screen indicator, and logs every incoming `ChatRoomMessage` event.

**Stage 2 (done):** command/response testing via `/hypno <subcommand>`, typed in the normal chat box and swallowed before it sends:
- `/hypno freeze` / `/hypno unfreeze` — apply/remove a Freeze effect via the invisible Emoticon-item technique (the same one LSCG uses) — no physical item needed
- `/hypno wardrobeblock on|off` — applies/removes BC's native `BlockWardrobe` effect (same Emoticon-item technique as Freeze — a function hook on `Player.CanChangeClothesOn` doesn't work here, see Technical Architecture Notes)
- `/hypno suppress` — arms a one-shot filter that logs and swallows the next incoming Action-type chat message instead of letting it render
- `/hypno ping <memberNumber>` — round-trips a Hidden message using our own `Content: "HypnoMsg"` tag; the receiving client logs it
- `/hypno bumptrust <memberNumber> <delta>` / `/hypno logtrust` — manually adjust and read back a per-member trust value, persisted via `Player.ExtensionSettings.HypnosisAddon`

Persistence, hooking (`bondage-club-mod-sdk`), and the Hidden-message envelope all follow the conventions confirmed from BCX/LSCG's own source (see Prior Art above). Two-account testing: install the built script on both, then run these from either side — `ping`/`bumptrust` need a real member number, get it from `/hypno logtrust` after a `bumptrust` or from the game's own UI.

**Stage 3 (in progress):** two screens now, both verified against the live client source rather than assumed.

**Settings (Preferences → Extensions → "Hypnosis Add-on")**, via `PreferenceRegisterExtensionSetting`. Originally four checkboxes; now five tabs (see Stage 6 and Stage 8 below). All permissions off by default, persisted the same way as trust data — these are **permission** settings ("do I allow this to be done to me"), not self-triggers; checking one never applies an effect to yourself. The four originals:
- **Hypnosis Enabled** — master switch/hard floor. Turning it off immediately releases Movement/Clothing Restriction if either is currently active (matches the design doc's "clears active trance, suspends all effects"); turning it back on doesn't auto-reapply anything.
- **Movement Restriction** — permission for a remote request to apply Freeze. Unchecking it releases Freeze immediately if it's currently active.
- **Clothing Restriction** — permission for a remote request to apply BlockWardrobe. It also gated clothing-message suppression at first, grouped to match the design doc's "Clothing Confusion" feature; that turned out to be wrong twice over (it fired outside any session, and it ate *every* Action message, not only clothing ones), and suppression got its own three toggles in v0.11.0.
- **Hidden Activities** — gated the Hidden-message cross-client channel for both sending and receiving. It caused two bugs doing that (below), was narrowed until it gated nothing at all, and was **removed in v0.14.0** in favour of "Lock settings while in trance". Left here because the mistake is the useful part: a *protocol* gate wearing a *content* preference's label.

**Remote control (another player's Information Sheet)**, via hooking `InformationSheetRun`/`Click`/`Exit` (`Screens/Character/InformationSheet/InformationSheet.js`) — same mechanism LSCG's own remote uses (technique only, not their code — see `remote.ts`). Viewing someone else's sheet shows a small "H" icon directly below LSCG's own remote icon; clicking it opens a subscreen with Movement Restriction / Clothing Restriction buttons. No custom icon asset exists yet, hence the plain letter.

Each button is a toggle, not a one-shot apply: `target.HasEffect("Freeze")` / `HasEffect("BlockWardrobe")` tells us the *current* state directly (effect state is normal synced character data, visible to anyone who can see them — no protocol needed for this part), so clicking sends `remote-request` with `enable` set to whichever direction it isn't currently in. **The request only ever asks** — the receiving client decides for itself whether to honor an `enable: true` request, checking Hypnosis Enabled + the specific permission locally (subject-authoritative, per the design doc — never trust what the requester's client claims); `enable: false` (release) is always honored regardless of permission state, since revoking consent should never be harder than granting it.

Buttons gray out if the target hasn't granted that permission — but unlike effect state, permission settings (`ExtensionSettings`) are **not** synced to other players (confirmed in `Character.js`'s `CharacterLoadOnline` — only the separate, unused-by-us `OnlineSharedSettings` field syncs automatically). So opening the panel sends a `state-query` to the target, who replies with `state-response` (their current Hypnosis Enabled / Movement / Clothing flags); buttons show "(checking…)" and stay disabled until that reply arrives.

The `/hypno` chat commands from Stage 2 are unchanged and still useful for low-level testing independent of either screen.

**Toggle + gray-out are working as of v0.6.7** (tested with both accounts). Getting there took three separate fixes worth remembering, since two of them were self-inflicted and the third is a genuine BC trap:

1. **v0.6.3** — `state-query`/`state-response` were gated behind the Hidden Activities toggle, so a target with that unchecked never replied and the buttons hung on "(checking…)" forever.
2. **v0.6.4** — `remote-request` was gated the same way, but on the *viewer's own* flag, silently dropping their click before it was ever sent. `remote-request` already carries its own real consent check target-side, so the extra gate was pure bug. (Net effect: Hidden Activities currently gates nothing — every message type in use is exempt. It stays for future covert-content features.)
3. **v0.6.6, the real one** — see the allow-list entry in Lessons Learned below. The effect applied and worked on the subject, but was stripped from every *viewer's* copy on arrival, so `HasEffect()` was permanently false for them and the button could never flip to "Release".

Since v0.7.0 these buttons are **session-gated**: outside an established trance they draw disabled and the subject refuses the request anyway. A third row (Kneel / Stand) was added in v0.8.2, which is why the panel's hardcoded rows became a `FEATURES` table — posture isn't an effect, so "is it currently on" reads `IsKneeling()` rather than `HasEffect()`, and each row now carries its own active/apply/release.

---

> **Stages 1–3** (proof of life, command-line effects, menu integration) were planning rather than
> implementation and now live with the rest of the staging plan in
> [`design.md`](design.md#development-stages). The notes below start where there was code
> worth describing.

## Stage 4 — Session flow (`session.ts`, v0.7.0)

The subject's client owns the only real session state and pushes a lossy view to the hypnotist — bands, never numbers, never the private Agree/Ignore/Fight choice. That's a structural guarantee rather than an agreement: a modified hypnotist client has nothing to read.

Flow: *Attempt Hypnosis* → private prompt (60s, silence counts as Ignore) → 60s induction window for RP → roll of `trust + choice modifier (+25/0/−25) + spread` vs. threshold 50 → `Hypnotized` with depth fixed at entry, or `AttemptFailed` with a vague progress band. Three attempts, then a 10-minute cooldown.

Exits, ascending: hypnotist's Wake Up button; `/hypno wake` (shallow trance only); 30-minute timeout; `/hypno safeword`, which always works from any state. Two deviations from the design doc's state machine are documented at the top of `session.ts`.

Trust is a **stub** — `/hypno settrust <member> <0-100>` — deliberately, so the real engine lands behind an interface that already has live consumers.

## Stage 5 — Spoken suggestions (`voice.ts`, `flavor.ts`, v0.8.0–v0.9.1)

During a session the subject's client parses the hypnotist's ordinary chat. Most of the wording flexibility comes from normalising *first* — contractions expanded, punctuation stripped, case folded — so each pattern describes one canonical phrasing instead of every variant.

Three guards keep ordinary conversation inert: the hypnotist must **address the subject by name** (Name or Nickname); a line starting "I"/"we" with no "you" is ignored; and bare imperatives carry lookbehind guards so "I kneel beside you" and "I can't stand it" don't fire.

Matching is split into a pure `matchSuggestion()`, exercised by a 60-case suite in the scratchpad covering phrasings, name-gate substring probes, and false positives. It has caught four real bugs before they shipped — adverbs breaking `you are completely frozen`, `get up` firing on everyday chat, and bare `stand`/`rise` never matching at all. **Worth keeping: every pattern change should be run through it.**

`flavor.ts` is shared between the spoken path and the panel buttons, so the subject can't tell from the wording which was used — flavor belongs to the effect, not the delivery mechanism.

**Diagnostics that earned their place:** `/hypno session` (phase + granted permissions in one line), `/hypno match <phrase>` (pattern result and name gate reported separately), `/hypno kneel` / `/hypno stand` (call BC's pose API directly, bypassing all gating). Between them they bisect "nothing happened" to matching, permissions, session, or the underlying API in a single test — which is how the last three bugs were found.

---

## Stage 6 — Trance states, suppression, self-touch (v0.10.0–v0.13.1)

**Where you intervene in BC's pipeline is the feature.** Three restrictions built this stage, each needing a different hook, and picking the wrong one would have silently broken the requirement:

| Goal | Hook | Why there |
|---|---|---|
| Silence room speech | `ChatRoomSendChatMessage` | After command parsing and the emote/whisper branches — keeps `/hypno safeword`, emotes, whispers |
| Trance veil | `ChatRoomRun`, priority 9 | Paint after `next()` over x 0–1003 only, the character half. It was `DrawProcess` across the whole canvas until v0.82.3, which washed out every menu, settings screen and dialog. Priority 9 keeps it inside the induction prompt's hook (10), so the box draws on top |
| Hide messages, **keep arousal** | `ChatRoomRegisterMessageHandler`, priority **320** | After Arousal Processing (210) and BC's own hiders (300/310), before Push-to-chat (500) |
| Block self-touch **entirely** | `ActivityRun` | It applies arousal, runs the self-effect *and* sends the message — skipping it means nothing happened at all |

The last two are deliberate opposites. Suppression lets everything happen and hides the message; self-touch blocking stops the activity outright. Suppressing in our `ChatRoomMessage` hook would have killed arousal, since that hook runs before BC processes anything.

Self-touch is structurally self-only: `ActivityRun` executes on the *actor's* client.

**Settings screen went tabbed** (v0.13.0) — Permissions / Trance Defaults / Awareness. The seam between active tab and panel is *never drawn* rather than drawn and erased; erasing left a hairline, because canvas strokes are anti-aliased and bleed past their nominal bounds. Previous layout tagged `menu-checkbox-layout`.

**The pattern test suite has now caught a dozen real bugs pre-ship**, including bare `stand` never matching, and `awareness-release` swallowing "you are awake again" — which would have made the wake keyword restore awareness while leaving the subject under. Moved into the repo in v0.13.2; `npm test` runs it.

~~⚠ **`INDUCTION_WINDOW_MS` is at the 10-second testing value.** Restore to `60_000` before real
play.~~ — **done in v0.43.0.** Left here struck through because the note read as a live instruction.

---

## Stage 7 — Trust engine (`trust.ts`, `curve.ts`, `storage.ts`, v0.15.0–v0.18.0)

**Store the count, derive the value.** `trust = 100n/(n+H)` with `H = 25`, where `n` is the number of interactions. Storing the *score* would mean any later retune of `H` silently corrupts every saved relationship; storing the count means a retune simply reprices them. Same curve, same `H`, for subject experience.

An interaction is one conversational message, rate-limited to one per five minutes and worth double when the line is addressed to you by name. A successful induction is worth five (dropped from ten in v0.18.0 — trust was arriving too fast to feel earned). Every induction *attempt* grants a quarter-point of experience whether it lands or not, since practice is practice.

**The roll became a chance, not a threshold.** `clamp(access + choiceModifier + experienceEffect, 5, 95)`, read literally as a percentage. The old `score >= 50` had almost no probabilistic zone — with only a 20-wide random term, outcomes swung from impossible to certain across a 20-point trust window (at trust 25 + Agree it was already 100%; trust 25 + Ignore was 0%). Depth now falls out of the same roll as `chance - roll`, so a comfortable success goes deep and a squeaker leaves a trance the subject can pull themselves out of.

**Experience is one pool, not two.** Its sign follows the choice: it helps you go under when you agree and helps you resist when you fight. Practice with hypnosis is one skill; what you point it at is a per-attempt decision.

**Arousal is a floor, not a multiplier:** `access = max(trust, min(arousal, 30))`. Read off `Player.ArousalSettings.Progress` on the player's own client — which is both correct and convenient, since the roll already runs there and nothing needs syncing or trusting. A multiplier on zero trust is still zero, which would give a stranger nothing, and a stranger is precisely the case the mechanic exists for.

**Diagnostics that earned their place:** `/hypno chance <name>` prints the inputs *and* the resulting percentage for all three choices — the single most useful thing while tuning, because it exposes the formula without having to run an induction and infer it from the outcome. `/hypno storage` reports where settings actually loaded from.

**A real data-integrity bug (v0.17.0):** `localStorage` is per-**origin**, and the backup key was a single fixed string — so two characters on one browser shared one set of trust and stats, and each login overwrote the other. Keyed per account number now, and `saveSettings` refuses outright until the member number is known rather than writing somewhere wrong.

---

## Stage 8 — Persistent triggers (`triggers.ts`, `timers.ts`, v0.20.0–v0.25.0)

Planted by speaking during a trance and fired **afterwards, outside any session** — which is the whole point, and the reason firing is checked before the session gate in `handleSpokenLine`.

Gated on its own permission *and* trust 65, with arousal deliberately excluded from that check: the design doc's rule is that the chemical floor never reaches anything persistent.

**Each action re-checks its own permission at firing time**, not at planting time. Revoking a permission therefore disarms that part of every trigger already planted, rather than leaving old grants to outlive the consent that created them.

Things that turned out to matter more than expected:

- **The subject must not see the phrase.** Someone who can read their own trigger word can simply decide not to react to it. So the phrase goes to the *hypnotist* over the Hidden channel and the subject gets atmosphere — and with the Awareness toggle on, the whole setup exchange never renders for them at all. The line still has to be *processed* (it is how the trigger gets built), so the handler reacts and then does not call `next()`, rather than suppressing wholesale.
- **Refusals must name the cause.** The first version answered a permission problem with "Something in the words slides off you", and it was genuinely impossible to tell why a trigger would not plant. Now: `[trigger] Refused — ...` with the actual reason.
- **Blanket release was too broad.** Letting release wording work outside a trance fixed "a trigger fired and nothing can undo it" but broke something bigger: ordinary hypnosis phrasing kept working on people who were not under. Replaced with a targeted `"you are released from <name>"`, which is narrow, needs knowledge only the hypnotist has, and undoes exactly what that trigger applied.
- **Scope reuses BC's own permission ladder** — `IsOwnedByCharacter`, `IsLoverOfCharacter`, `HasOnWhitelist`, `HasOnBlacklist`, `ReputationCharacterGet(C, "Dominant")`. People without the add-on can fire a trigger, because the matching happens entirely on the subject's client; all the speaker has to do is say the word.
- **Non-checkbox controls, finally** (v0.24.0): `ElementCreateDropdown` and `ElementCreateInput` are real DOM elements layered over the canvas in canvas coordinates, positioned by *centre*. They must be removed explicitly on tab switch, `exit()` and `unload()`, or they linger over whatever screen comes next.
- **`timers.ts` exists purely to break an import cycle.** The auto-release timer is scheduled in `voice.ts` (which owns undo) but cancelled by `session.ts` (safeword, wake); `voice.ts` already imports `session.ts`. Same trap the pose helpers hit, same fix: put the shared state in a leaf module both can depend on.

---

## Stage 9 — Prompt box and arousal (`prompt.ts`, `arousal.ts`, v0.26.0–v0.27.1)

**The Agree / Ignore / Fight prompt got a box** (`ChatRoomRun` to draw after `next()`, `ChatRoomClick` to consume before it). It sits in the character half of the screen — x 0–1003, the rect BC's own arousal overlay fills — so the chat log and input stay clear and the safeword is still typeable. The chat commands **remain**: `ChatRoomRun` only runs on the chat room screen, so a player in the wardrobe when an attempt lands sees no box at all. One prompt, two ways to answer.

**Arousal drives BC's own system, not a parallel one.** Arousal is already visible to the whole room — the meter, the pink screen filter, facial expressions — so a private number of our own would look disconnected from what everyone else can see.

| Level | Value | Why that number |
|---|---|---|
| not aroused | 0 | also clears a running orgasm timer |
| lightly aroused | 30 | where BC starts the blush |
| highly aroused | 70 | BC's "Horny" eyes and drool band |
| fully aroused | 95 | what BC itself sets an *edged* character to, and its cap for any zone not allowed to finish |

**`ActivitySetArousal` moves the meter but not the face** — BC only runs `ActivityExpression` from its own timer path. `arousal.ts` calls both, guarded by the same condition BC uses.

**Forced orgasm delegates the decision, not just the action.** `ActivityOrgasmPrepare` is where BC enforces `DenialMode`, edging and chastity; it declines by leaving `OrgasmTimer` untouched. Reading the timer back is how we tell "it happened" from "something refused it" — so a real chastity item wins without this add-on knowing the rules. Then `ActivityOrgasmStart` fires immediately, skipping BC's five-second Resist/Surrender window: a forced orgasm that offers a Resist button is not forced.

**Denial uses BC's own `DenialMode` effect**, so it stops vibrators and activities too, not just our suggestion. `removeEffect` only touches our injected Emoticon entry, so releasing it can never strip denial off a chastity item the player is actually wearing.

**Body-part mapping was wrong, and the fix is a test** (v0.27.1). `clit` pointed at `ItemVulva`; BC's own preference file labels `ItemVulvaPiercings` as "Clitoris" and `ItemVulva` as "Pussy & Vagina", so the block landed on the wrong zone and the clit stayed reachable. `cock` and `penis` were worse — they pointed at `ItemPenis`/`ItemGlans`, which **do not exist as groups**; a character with a penis uses the same two slots as everyone else, and the penis wording lives only in `ActivityBuildChatTag`'s message lookup. `test/part.mjs` now holds BC's complete arousal-zone list and validates every group name against it, because a name that is not a real zone can never be an activity target — so the block fails silently, which is the worst way for this to fail.

---

## Stage 10 — Illusion, carry-forward, help, and who sees what (v0.28.0–v0.34.0)

**The clothing illusion** (`illusion.ts`) is a freeze-frame: the subject's own screen keeps showing the clothes they had on when it took hold, while the room sees the truth.

The rule the module is built around is **never touch `Player.Appearance`** — that array is what `ServerAppearanceBundle` reads for every sync, so a lie written there goes out to the whole room, which is the exact inverse of the feature. The lie lives in a local-only `CharacterType.SIMPLE` character that nothing syncs, and `DrawCharacter` — the single funnel every screen uses to draw a body — is hooked to pass that shadow through instead.

Which groups freeze is read off the groups' own flags rather than a hand-written list: `Clothing: true` (32 groups) plus `Category: "Item"` (28) is everything worn, and the remaining 25 — body, face, expressions, hair, and `Emoticon` — stay live. So the subject still sees their own blush and pose change while their clothes do not, and our effect-carrier item is never frozen.

`IsPlayer()` is overridden for the duration of that one call only. `DrawCharacter` branches on it to decide whether to apply the viewer's own blindness and tints; without the override the subject's own body would start being dimmed like everyone else's. A shadow claiming to be the player *globally* would be read as the player by `Timer.js` and the activity code too.

**Carry-forward** (`carry.ts`) is the third kind of persistence — a suggestion that is simply still true after waking, as distinct from a trigger that sleeps until someone says a word. Carried effects are re-applied **after** the session's total clear rather than exempted from it: `endSession` clearing everything in one place is what guarantees a trance can never strand an effect, and carving exceptions into it would put that guarantee at the mercy of this feature. The illusion is the one exception, because it cannot be rebuilt afterwards — re-freezing at the moment of waking would snapshot the truth.

**Per-suggestion trust thresholds** (`Suggestion.trustThreshold`) finally give the design doc's feature-threshold table a consumer. Checked against relationship trust alone, never `effectiveAccess` — the arousal floor must not reach a feature that lies to someone about their own state. Re-checked at *firing* time for triggers, so trust that decays below the line disarms that action of every trigger already planted.

**The help screen** (`help.ts`, `panel.ts`) is five tabs behind a "?" on both the settings panel and the remote. The vocabulary tab is generated from the suggestion table and the command tab from the command list, because hand-writing either guarantees the drift the `/hypno` summary already suffered. `Suggestion` gained an `examples` field for it, and the suite asserts all 44 examples actually match their own suggestion — an example that has drifted is worse than no help, since it teaches a phrase that silently does nothing.

**Who sees what** (`notify.ts`) split the output in two. Anything only the subject can know is `[bracketed]`; anything the room could have observed is emoted. Enforced structurally — there is no direct `ChatRoomSendLocal` call anywhere in `src/` outside that module.

**Emote is the only type that renders custom text.** `Action` and `Activity` both render as `(text)`, which is the nicer shape, but both resolve their `Content` as a translation key first and print `MISSING TEXT IN "...": <key>` for anything unknown. Routed through BC's own `ChatRoomSendEmote` so the owner rule that can block emotes is honoured.

**Applying a restriction and walking into one are different moments**, and separating them settled the public/private question: *placing* a restriction is invisible, *bumping into* one is the visible part. Movement and posture are the exceptions — going still and kneeling are visible in themselves. A trigger firing gets a deliberately vague line, because it fires with no spoken instruction and naming the part would hand the subject what the trigger does.

**Two bugs from play worth remembering:**

- **The scope ladder was being run against the player themselves.** `speakerAllowedByScope` looks the speaker up in `ChatRoomCharacter`, which includes you — so `everyone` and `notblack` trivially passed, and the dominants rung asked whether your own reputation plus 25 beat your own reputation, which is always true. Three scopes allowed self-firing and four did not, for no reason anyone could predict. Self is one explicit setting now and never touches the ladder.
- **BC sends two different clothing messages.** Item-by-item through the dialog carries the asset; the whole wardrobe sends a single `ChangeClothes` Action naming only a source and a destination character. With no asset and no group there was nothing to classify by, so suppression never saw it — while the item-by-item path had worked all along, which is exactly why it looked like the feature was working.

---

## Stage 11 — Trust over time, and a run of play-testing fallout (v0.35.0–v0.38.2)

**Presence detection** (`remote.ts`). The H icon draws on every player's sheet because there is no way to know who has the add-on without asking. Clicking it on someone who does not sent both queries and then sat on `(checking…)` indefinitely — indistinguishable from a slow reply, a lost message, and a bug. A 3-second probe now says so, with a *Check again* button.

The icon is deliberately **not** hidden once probed: that would turn the Information Sheet into a directory of who in the room is running this. The timeout is a display decision and never a lockout — any reply, however late, restores the panel on the next frame, and either query answering counts as proof since only this add-on handles either.

**Trust decay** (`storage.ts`). Subtraction from the stored interaction count, applied **lazily on read** rather than from a timer: nothing to schedule, nothing missed while the game is closed, correct across reloads on its own. The one catch a timer would not have is that the clock must be advanced when charged, or every later read bills the same elapsed days again.

The shape is the opposite of the intuitive one, and this is worth internalising because the first version of the comment had it backwards. `trust = 100n/(n+25)` is steep at the bottom and flat at the top, so a fixed number of lost interactions costs an acquaintance far more than an established relationship — a month at "typical" takes trust 30 to zero, 75 to 37, and 90 to 87. That is the right behaviour and needs no second curve.

Stored as a **name**, not a number, so the values behind Never / Very slowly / … / Very fast can be retuned without changing what anyone's saved choice means. Same reasoning as `triggerScope`, and the same reasoning that put counts rather than scores in storage in the first place.

**Relationship floors** (`trust.ts`). Read from BC's `FriendList`, `IsOwnedByCharacter` and `IsLoverOfCharacter`. Each floor carries a **reach** as well as a number — a friend lifts only session-scoped gates, a lover adds arousal, an owner lifts everything — which is what makes it a design rather than three constants. Introduced `AccessCategory` and `accessFor()`, which now backs every trust gate and folds the older arousal chemical floor into the same `max()` instead of two floors applied in different places.

Decay and floors are one mechanic, not two: without the floor, an owner who goes away for three weeks returns having to re-earn a relationship BC records the whole time.

**Four bugs off one screenshot** (v0.38.0), of which the first is the instructive one:

- **The add-on was tracking trust with the player themselves.** There *was* a guard — `sender === Player?.MemberNumber` — and it never fired, because the add-on loads before login and BC echoes your own chat back through the same hook. In that window `Player.MemberNumber` is `undefined`, so `sender === undefined` is false and every message you send counts as somebody building trust with you. **The lesson generalises: a guard comparing against your own identity has to handle not yet knowing it.** It now refuses whenever we cannot tell who we are.
- `DrawText` does not fit to a width and `DrawTextFit` centres, so long left-aligned text ran off the canvas with nothing to stop it. `drawLeftTextFit` shrinks then clips.
- A DOM control positioned for a short list, over a list that grew.
- A list ending in "…and 30 more" is not a list. Paged rather than given a person-dropdown, because the ranking is the information.

**Release wording is where the gaps hide** (v0.38.2). Four natural ways to release the clothing illusion matched nothing at all, while the restriction side had been fine all along — restrictions get exercised constantly in play and each release only once. Worth checking the release half of every pair deliberately rather than waiting to trip over it.

The subtler half of the same report: `"you notice everything again"` cleared message suppression and left the illusion running. Two separate features, correctly separated — but that phrase is the everything-back line, so it now lifts both. The broad release undoes more than the broad block applies, which is the same asymmetry that already lets releases skip permission checks.

---

## Stage 12 — Sensation, visibility, and rewarding the roleplay (v0.39.0–v0.41.0)

**Numbness split from awareness** (`suppression.ts`). `touch-block` held two suggestions wearing one
name: *"you will ignore my touches"* is a claim about **attention**, *"you cannot feel my touch"* is
a claim about **sensation**. Suppression registers at priority 320, deliberately after BC's arousal
handler at 210 — correct for the first, and it made the second untrue, since the message was hidden
while the arousal still landed. A subject told she could feel nothing watched her own meter climb.

The two now compose instead of colliding: ignore and you are not told, numb and nothing happens,
both and it may as well not have occurred. Numbness answers to `arousalControl`, not
`suppressActivities` — consenting to "hide it from me" is not consenting to "make my body not
respond".

**Trigger words became a player setting** (v0.40.0), with `/hypno triggers full` demoted to a
testing override behind a `TESTING_MODE` build flag in `log.ts`. ~~**Flipping that flag is a
release step.**~~ — **superseded in v0.73.0:** the build flag became the runtime `isTestingMode()`
room check described under *The dev loop* above, so there is no release flip any more. The earlier
idea of gating on room-admin status was dropped: admin is a property of
a chat room, this add-on is not one, and a subject can create their own room and be admin of it — so
the gate sat one room-creation away from being no gate at all.

The listing moved from `commands.ts` into `voice.ts` as `describeTriggerList()` because it stopped
being a formatting loop the moment it grew a decision, and `commands.ts` is not in the test harness.
Its tests assert against `TESTING_MODE` rather than against `true`, so the suite stays correct after
the release flip instead of failing at the moment somebody is trying to ship.

**The roleplay bonus** (v0.41.0). +5 per line the hypnotist says during the induction window, capped
at +15, reset per attempt, session-only. The design doc had specified it since the session flow was
written and the roll formula always had a slot for it; its absence is why the induction *accelerator*
looked like the RP reward when it is nothing of the kind.

---

## Lessons Learned (BC API gotchas — quick reference)

- **BC's message dispatcher has three return shapes, and the third one is the useful one.**
  `ChatRoomMessageRunHandlers` treats `true` as "stop the whole pipeline", an object with `msg` as a
  rewrite, and an object with **`skip`** as "keep processing, but skip the later handlers this
  predicate matches". That last one is how you disable exactly one of BC's own handlers — numbness
  skips *Arousal processing* at 210 and leaves the display, the sensory-deprivation hiders and the
  Asylum GGTS tracking running. Returning `true` is the obvious move and takes all of them with it.
- **Two of BC's handlers share Priority 210**, so a skip predicate matching on priority would also
  eat the kneel stimulation message. Match on `Description` — and since that makes the feature depend
  on an upstream string, check the handler still exists at install time and log if it does not,
  rather than failing silently in play.

Full detail on each is inline above where relevant; this is just an index so nothing gets rediscovered the hard way twice.

- **`Player` gets wholesale-replaced at login** (`CharacterCreatePlayer` in `Scripts/Character.js`) — never hook a method hanging off `Player` specifically (it'll silently go stale); hook a real top-level global (`ChatRoomMessage`, `CommandCombine`) or read `Player`'s state live at call time instead.
- **BC has a real command registry** (`CommandCombine`, `Screens/Online/ChatRoom/Commands.js`) — don't hook `CommandParse` to add a command; it runs before registry lookup and you'll fight BC's own "no such command" validation.
- **`bcModSdk.registerMod(info, options)`** — `allowReplace` is `options`' own field, a *separate second argument*, not a field on `info`.
- **Canvas text is center-aligned by default** (`MainCanvas.textAlign`) — `DrawText`'s X is a center point. `DrawCheckbox`'s built-in label overlaps the box for anything but very short text; draw your own label left-aligned instead (`save()` / `textAlign = "left"` / `DrawText` / `restore()`).
- **`PreferenceRegisterExtensionSetting`'s `exit()` isn't validated at registration but is required at runtime** — `PreferenceSubscreenExtensionsExit` calls it with no `?.` guard; omitting it throws the first time someone backs out of your screen.
- **A `PreferenceRegisterExtensionSetting` subscreen must draw its own exit control** — BC draws none of its own chrome while a specific extension's screen is active.
- **The Preferences screen's own native exit icon is DOM/CSS-positioned**, not a canvas coordinate — there's nothing exact to copy for it; `Dialog.js`/`Wardrobe.js`'s raw-canvas convention (`DrawButton(1895, 15, 90, 90, "", "White", "Icons/Exit.png")`) is a reasonable visual approximation, not the real value.
- **`InformationSheetRun`/`Click`/`Exit` take zero arguments** — they read the module-level `InformationSheetSelection` global directly, not a hook argument.
- **`character.HasEffect("Name")` works for free on anyone you can see** (synced Appearance data) — but **`ExtensionSettings` does NOT sync to other players** (confirmed absent from `CharacterLoadOnline`); reading someone else's permission state needs an explicit query/response, not a passive read.
- **Injected effects must be added to `Asset.AllowEffect` on EVERY client, not just the sender.** BC validates incoming appearance data and `ValidationSanitizeEffects` (`Scripts/Validation.js`) filters an item's `Property.Effect` down to what that client's own copy of the asset permits via `Asset.Effect`/`Asset.AllowEffect`, logging `Filtering out invalid Effect entry on <asset>: <effect>`. **`Asset.AllowEffect` is a client-local definition and is not carried in the synced appearance bundle** — so patching it only where the effect is applied fixes only that client's view. The full strip path on arrival is `ChatRoomSyncCharacter` → `CharacterLoadOnline` → `CharacterOnlineRefresh` → `ServerAppearanceLoadFromBundle` → `ValidationResolveAppearanceDiff` → `ValidationSanitizeProperties` → `ValidationSanitizeEffects`. Symptom to recognize: the effect visibly works on the subject but `HasEffect()` is permanently false for everyone else. Patching the shared asset is safe for non-addon players in the room — the sanitize-and-correct rebroadcast in `ServerAppearanceLoadFromBundle` only fires for `C.IsPlayer()`, so they drop it locally without correcting it back for anyone else.
- **`ChatRoomCharacterUpdate` is a silent no-op unless `ChatRoomAllowCharacterUpdate` is true** (and it doesn't write to the server DB — that needs `CharacterRefresh` or `ServerPlayerAppearanceSync`). Not a problem in practice, but worth knowing before debugging a sync that seems to vanish.
- **WebFetch summarizes pages through a small model before you see them** — good enough for "does X exist," too lossy to implement against directly. Download the real file and read it yourself for anything you're about to write code against.

---

- **A silent rejection is a bug in its own right.** The spoken-suggestion path checked the session before matching, so "line didn't match" and "line matched but no session" looked identical from outside — the exact pair that needed telling apart. Matching first, then logging which gate stopped it, turned a guessing game into one test. Same lesson as the diagnostics above: when something can fail for several reasons, make it say which.
- **Reconcile stored settings against the current schema, don't merge over it.** Spreading stored settings over the defaults preserves keys that no longer exist, and they resurface later as real-looking values (dead toggles reported as granted permissions). Start from the defaults and copy across only keys that still exist.

---

- **BC's message pipeline has documented insertion points — use them instead of hooking `ChatRoomMessage`.** `ChatRoomRegisterMessageHandler({Priority, Callback})` runs handlers in priority order; returning `true` stops processing so the message never renders. Landmarks: **210** arousal processing, **300**/**310** BC's own hiders, **500** push-to-chat. Hooking `ChatRoomMessage` intervenes before all of it, which kills side effects you may want to keep.
- **`ActivityRun` (Activity.js) is the single entry point for an activity** — it applies arousal, runs the actor's self-effect, then sends the chat message. Skip it and none of the three happen. It runs on the *actor's* client, so hooking it can only govern what the player does themselves.
- **Never erase an anti-aliased stroke.** Canvas strokes bleed sub-pixel past their nominal bounds, so covering one with a rect on integer coordinates leaves a visible hairline. Draw borders as filled `DrawRect` segments and simply don't draw the part you don't want.
- **A userscript with a non-matching `@match` fails completely silently.** BC is served from more than one host (`bondageprojects.elementfx.com`, `bondage-europe.com`, `bondageeurope.com`, `bondage-asia.com`); if the addon appears totally dead — no indicator, no console line — check the `@match` list first.
- **Overlapping hit regions need an explicit active-view check.** Tabs share coordinates across their content; without gating clicks to the visible tab, one click toggles a row in *every* tab, mostly invisibly.
- **`Player.Appearance` is what syncs — never write a lie into it.** `ServerAppearanceBundle` reads that array for every appearance sync, so a client-side illusion written there reaches the whole room, which is the inverse of the feature. Draw from a separate local-only `CharacterType.SIMPLE` character instead, and hook `DrawCharacter` (the single funnel every screen uses) to substitute it.
- **Asset groups classify themselves.** `AssetGroup.Clothing === true` plus `Category === "Item"` is exactly "everything worn"; the remainder is the body, face, hair and expressions. Reading those flags beats a hand-written group list, which goes stale the moment BC adds content.
- **Emote is the only message type that renders arbitrary text.** `Action` and `Activity` look their `Content` up as a translation key first and print `MISSING TEXT IN "...": <key>` for anything unknown. **But an emote is not name-free** — BC *prepends the sender's name* to a plain `*`-emote at display time (`ChatRoom.js`, the "Emote messages formatting" processor, verified R131). A `**`-style emote is the one printed verbatim. Our lines already carry the name, so `tellRoom` sends `**`; sending a plain one doubled the name, which was Known Bug #5, fixed in v0.72.7. *(An earlier version of this entry claimed the opposite and was wrong.)*
- **Read pronouns, never infer them.** `Character.GetPronouns()` returns the player's chosen `SheHer` / `HeHim` / `TheyThem` / `ItIt`. Making the character's *name* the subject of a generated sentence fixes the verb as third-person singular and saves writing a second set of phrasings.
- **BC sends one `ChangeClothes` Action for a whole wardrobe session**, carrying only a source and a destination character however many garments changed. Item-by-item changes carry their asset instead. Anything classifying clothing messages has to handle both, and the wardrobe one can only be recognised by its tag.
- **`Player.FriendList` is a plain array of member numbers**, so friendship can be checked for someone who is not in the room. Ownership and lovership need the loaded character (`Player.IsOwnedByCharacter(C)`, `C.IsLoverOfCharacter(Player)`).
- **`ChatRoomCharacter` includes the player.** Any check that walks it to answer "what is this person to me" will happily answer it about yourself — which is how a permission ladder ended up letting people fire their own triggers on three of seven settings.
- **A guard against your own identity must handle not yet having one.** The add-on runs before login, so `Player.MemberNumber` is `undefined` for a window; `sender === Player?.MemberNumber` is false for every sender during it. Refuse when you cannot tell, not only when you can tell it is you.
- **`DrawText` does not fit to a width and `DrawTextFit` centres.** There is no left-aligned fitted text primitive, so anything long and left-aligned runs off the canvas silently.
- **DOM controls do not move when the canvas beneath them does.** A dropdown positioned against a short list stays put when the list grows; every screen owning one needs per-tab cleanup, not a single "not on that tab" check.

---

- **BC's arousal zone names do not match anatomy — read the label file before mapping one.** `Screens/Character/Preference/Text_Preference.csv` has an `ArousalZoneItem*` row per zone, and it is the complete list of groups any activity can target. `ItemVulvaPiercings` is **"Clitoris"** (not a piercing slot), `ItemVulva` is "Pussy & Vagina", `ItemFeet` is "Lower Legs" while `ItemBoots` is "Feet & Toes", and `ItemPelvis` is "Pelvis & Belly". **There is no `ItemPenis` or `ItemGlans` group** — a character with a penis uses `ItemVulva`/`ItemVulvaPiercings` like everyone else, and those two names appear only in `ActivityBuildChatTag`'s message lookup. A block registered against a name that is not a real zone fails *silently*, so validate the mapping in a test rather than trusting it.
- **`ActivitySetArousal` does not touch facial expressions.** BC only runs `ActivityExpression` from `ActivityTimerProgress`, so setting arousal directly moves the meter and leaves the face blank. Call both, guarded by BC's own condition (`AffectExpression` not disabled, no orgasm running).
- **`ActivityOrgasmPrepare` is where an orgasm can be refused**, and it refuses by doing nothing — `DenialMode`, `IsEdged()` and an `Edging` craft each make it return with `OrgasmTimer` untouched. Read the timer back to tell "it happened" from "something declined", instead of reimplementing the rules. `ActivityOrgasmStart` immediately afterwards skips the five-second Resist/Surrender window; `Timer.js` then drives the rest of the lifecycle (`OrgasmStop` at expiry, arousal 20).
- **`ChatRoomRun`/`ChatRoomClick` are the chat room's draw and click hooks.** Draw *after* `next()` to paint over the room; consume *before* `next()` to take a click. The character half of the screen is x 0–1003 — the exact rect `ChatRoomDrawArousalOverlay` fills — so anything drawn there leaves the chat log and input box usable. BC's own orgasm buttons sit at y 532–600 in that same space; stay clear of them.
- **TypeScript's "return anything where `void` is expected" allowance does not extend to a union.** Widening a callback from `() => void` to `() => FlavorKey | void` breaks every arrow that returned a value incidentally (`run: () => applyEffect("Freeze")`), which is a compile error rather than a silent change — but it is a surprising one.
- **`localStorage` is per-origin, not per-account.** A fixed backup key means every character on that browser shares one blob and each login overwrites the last. Key it by member number, and refuse to save at all before the member number is known.

---

*Stage notes above are a historical record and are dated where they were written — they describe
what was true at that version, not necessarily what is true now. `design.md` is authoritative for
current behaviour. Split out of `README.md` on 2026-09-16 at v0.73.2.*
