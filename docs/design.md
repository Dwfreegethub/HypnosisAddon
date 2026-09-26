# BC Hypnosis Add-on — Design Document
*Design notes and decision log — work in progress. For the version the code is at, read
`package.json`; it is the single source of truth and this line would only go stale.*

**Companion documents.** [`../README.md`](../README.md) is the engineering record: how to build and
test, the stage-by-stage implementation notes, and the BC API traps worth knowing. This file is the
design half — what the thing is meant to be and why. [`feature-summary.md`](feature-summary.md) is
the short player-facing list of what exists. [`CHANGELOG.md`](CHANGELOG.md) is the dated history —
what shipped, when, and why.

> **⚠ Unmerged design work lives in [`declared-skill-proposal.md`](declared-skill-proposal.md).**
> It carries the settled answer to *hypnotist skill in the induction roll* (the "declared and
> visible" model), the AFK backstop, the practice cap, the starter set, and the early notes on
> **extreme mode**. Many decisions in it are settled as of 2026-09-09 and not yet reflected
> anywhere in this file. It is being reviewed section by section with DW and folded in here as
> each section is agreed — sections 1, 2 and 3 have been walked; 4 onward have not.
>
> **Read it before planning any work touching the induction roll, the AFK/prompt-timeout path, the
> settings defaults, or extreme mode** — otherwise this document will look like it disagrees with
> decisions that have been made. Its **§10** is the single list of everything still awaiting an
> answer; its **§11** records what has *not* been verified and must not be treated as fact.

**How to read this.** *Current Implementation Status* is first, because "what actually works today"
is the question most often being asked. Everything after it is design, roughly outermost-first:
the trust model, then the depth redesign that will replace how it gates, then safety, then
features, then technical notes, then the plan and the open questions. Dated history is in
[`CHANGELOG.md`](CHANGELOG.md).

> ⚠ **The single most important thing to know before reading.** Feature access is being moved off
> *trust percentage* and onto *trance depth*. Both models are in this document: the trust one
> because it is what the code does today, the depth one because it is what the code is becoming.
> Sections describing the superseded model are marked. See
> [Trance Depth as the Feature Gate](#-design-change-trance-depth-as-the-feature-gate--phase-1-built-v0500).

| | |
|---|---|
| **New here** | **[Orientation for a New Contributor](#orientation-for-a-new-contributor)** — the rules, the module map, how to test |
| **What works now** | [Current Implementation Status](#current-implementation-status) |
| **How trust is earned** | [Philosophy](#philosophy) · [Core Mechanic](#core-mechanic-trust-as-a-depth-gate) · [What Builds Trust](#what-builds-trust) · [What Lowers Trust](#what-lowers-trust) · [Gain Curve](#trust--experience-gain-curve-non-linear) · [Hypnotist's Side](#the-hypnotists-side-skill--experience) |
| **How an induction resolves** | [Induction Success Formula](#induction-success-formula-built--v0150) · [Session Flow](#session-flow--natural-language-built--v070v091) |
| **How features are gated** | [Trust Percentage & Feature Thresholds](#trust-percentage--feature-thresholds) *(superseded)* · **[Trance Depth as the Feature Gate](#-design-change-trance-depth-as-the-feature-gate--phase-1-built-v0500)** |
| **Safety and consent** | [Control & Reset](#control--reset) · [Hard Limits](#hard-limits) · [Meta-Consent Layer](#meta-consent-layer-ooc-vs-ic) · [Gamification](#gamification-fighting-off-suggestions) · [Clothing & Bondage Consent](#clothing--bondage-consent-interfaces) |
| **The features themselves** | [Feature List](#feature-list) · [Triggers](#triggers) · [Trigger Overhaul](#trigger-overhaul--decided-2026-09-25-staged-across-six-builds) · [Carry-Forward](#carry-forward-detail--built-v0280v0290) · [Perception / Illusion](#perception--illusion-features-detail) · [Word-Level Control](#word-level-control-detail--approved-to-spec-2026-09-10) |
| **Building it** | [Technical Architecture](#technical-architecture-notes) · [Prior Art](#prior-art-lscgs-hypnomodule) · [Development Stages](#development-stages) · [Player Settings](#player-settings) |
| **What is broken** | [Known Bugs](#known-bugs) |
| **What to test next** | [Needs Testing](#needs-testing) |
| **Before testers** | [Pre-Release Checklist](#pre-release-checklist--early-tester-build) |
| **Undecided** | [Open Questions](#open-questions) |
| **History** | [CHANGELOG.md](CHANGELOG.md) — what shipped, when, and why |

---

## Orientation for a New Contributor

Read this first if you are coming to the project cold. It is the smallest set of facts needed to
plan work that will not have to be undone: the rules that cannot be broken, where the code lives,
and how to tell whether something works. Everything after this section is design.

### What this is, in one paragraph

A Tampermonkey userscript for **Bondage Club** (BC) that adds consensual hypnosis between two
players who both have it installed. A hypnotist attempts an induction from the subject's
Information Sheet; the subject's own client privately asks them how they want to respond and rolls
the outcome; success puts them under at a **trance depth**; depth then gates which suggestions,
triggers and illusions can reach them. **Trust** in a particular hypnotist — accumulated over many
interactions and stored on the subject's side — is what raises the depth that hypnotist can reach.
TypeScript, bundled by esbuild into a single `.user.js`.

### The rules that are not up for renegotiation

Each of these was decided once and cost real work to establish. A plan that violates one is wrong
even when it is otherwise good.

1. **Subject-authoritative.** Every cross-player action is only ever a *request*. The receiving
   client alone decides, checking its own local settings. The hypnotist's client is never trusted
   about permissions, session state, depth, or whether a suggestion matched. **Corollary:** any
   feature that needs a number from the hypnotist's side — hypnotist skill in the induction roll
   is the standing example — is blocked on a design answer, not on code.
2. **The safeword always works.** `/hypno safeword` clears everything from any state and no feature
   may take it away, including a trigger that claims nothing else can wake the subject. The master
   switch is the same floor by another route: unticking *Hypnosis Enabled* ends the session
   outright, not just its effects (see Known Bug #3 for what happens when it only did half).
3. **Never write `Player.Appearance` for the illusion.** That array is real, server-synced and
   corruptible, and BC character data is fragile. The clothing illusion draws a shadow character on
   the subject's own screen and never edits what they are actually wearing (`illusion.ts`).
4. **Chemical depth may never write anything permanent, nor lie to the subject about their own
   state.** This is the `earnedOnly` split in `depth.ts` and the entire reason two depth numbers
   are resolved from one roll rather than one.
5. **A silent success is indistinguishable from a silent failure.** Anything that refuses, or runs
   without landing, must say so — to the hypnotist, to the subject, or at minimum to the log. This
   was learned expensively across v0.54.0–v0.59.0: suggestion refusals, `/bot`, `session-continue`,
   dropped emotes and unparseable appearance dumps each cost a session before being made audible.
6. **If a step cannot fail, it is not testing anything.** Four harness scenarios once passed
   because the setup produced the very state the assertion checked for. Every assertion needs a
   describable version of the world in which it fails, and the harness now states the expected
   result of each step up front because DW asked for exactly that.
7. **No BCX or LSCG code, ever.** They are read for *technique* — how a hook is installed, which BC
   field carries what — and the technique is then written fresh, with a comment naming where it
   came from.
8. **Verify against the live BC client source before writing against any BC API.** Not from memory,
   not from the wiki. Fetch the actual client source and read the function. This has changed the
   answer four separate times: `CommandParse`'s return value gating whether a slash command ever
   leaves the browser; `IsRestrained()` silently including `Freeze`; `CanInteract()`; and where in
   the chain `ChatRoomSendChatMessage` sits relative to command parsing.
9. **Bump `package.json` on every change that touches code.** The on-screen indicator reads that
   version, and it is how DW knows which build is actually loaded in the browser.

### Repository layout

```
src/            the userscript, bundled to dist/HypnosisAddon.user.js
test/           node test suites, no browser — run with `npm test`
testbot/        the scripted hypnotist bot (Node, connects to BC as a second account)
docs/           this file, plus feature-summary.md
README.md       the engineering record: build/test, stage notes, BC API traps
```

### Module map

The import rule matters as much as the contents: **`session.ts` imports `carry.ts`, `triggers.ts`
and `depth.ts`, so none of those may import it back.** State that several modules need lives in a
*leaf* module that imports little or nothing, and the owner pushes into it. That is why `timers.ts`,
`log.ts`, `notify.ts`, `effects.ts` and `depth.ts` look thinner than their importance suggests.

**One deliberate exception, added v0.63.1: `storage.ts` and `session.ts` import each other.**
`resetSettings()` calls `stopForReset()` so that a reset ends the trance it is wiping the settings for
(Known Bug #4). It is safe only because nothing in `storage.ts` touches `session.ts` at module-init
time — esbuild flattens both into one scope as hoisted functions, and the call happens long after
load. **If you ever need `session.ts` at the top level of `storage.ts`, that breaks**; use a
registration hook (`registerCarryHandlers` is the pattern) rather than reordering imports. The full
reasoning, and the evidence it was checked rather than assumed, is under Known Bug #4.

| Module | What it owns |
|---|---|
| `main.ts` | Entry point: installs every hook, wires the modules, runs load-time recovery |
| `session.ts` | The induction state machine — attempt → private prompt → RP window → roll → trance → wake. Resolves both depths and pushes them into `depth.ts`. Owns `safeword()` / `hardFloorStop()` |
| `voice.ts` | Parses the hypnotist's chat: the suggestion pattern library, the name gate, trigger firing |
| `depth.ts` | Tiers, per-feature gates, the current depths, chemical scope. **Leaf** — imports only storage |
| `triggers.ts` | Recording, planting, scope, strength, reinforcement and decay |
| `storage.ts` | `ExtensionSettings` persistence, per-account keys, every setting, trust counts, triggers, migrations |
| `trust.ts`, `curve.ts` | Interaction counts → derived trust; the single growth curve `100n/(n+25)` |
| `carry.ts` | Suggestions that outlive the trance |
| `illusion.ts` | The clothing illusion, as a shadow character on the subject's own screen |
| `undress.ts` | Taking clothes off one garment at a time, and naming the reason when it refuses |
| `arousal.ts` | Drives BC's *own* arousal system; forced orgasm and denial |
| `selftouch.ts` | Hooks `ActivityRun`; whole-body and per-body-part blocks |
| `suppression.ts` | Hides messages about things done to the subject, without changing what they do |
| `conceal.ts` | Shows the subject's trigger words as `...` in their own chat, via BC's message-handler chain at priority 50. Changes only what is drawn |
| `effects.ts` | The Emoticon-item technique for injecting BC effects (`Freeze`, `BlockWardrobe`, `DenialMode`) |
| `recovery.ts` | Surviving a disconnect; clearing orphaned effects on every load |
| `remote.ts` | The hypnotist's panel, hooked onto the subject's Information Sheet |
| `menu.ts` | The subject's settings screen — seven tabs: Permissions, Trance Defaults, Awareness, Triggers, Planted, Depth, and Stats behind Advanced |
| `panel.ts` | Shared canvas chrome for the settings and help screens: tab geometry, borders, `CONTENT_LEFT` |
| `help.ts` | The help screen, generated *from* the pattern library and command table so it cannot fall behind them |
| `commands.ts` | Every `/hypno` subcommand, registered as `/hypno` and `/echs` (no top-level `/bot` since v0.86.1) |
| `messaging.ts` | The hidden channel — our `HypnoMsg` tag over BC's `Type:"Hidden"` chat messages |
| `notify.ts` | Where text goes: private to the subject, or emoted so the room can see it. **Leaf** |
| `timers.ts` | Keyed timer registry. **Leaf — imports nothing at all** |
| `flavor.ts` | All subject-facing wording, keyed by effect, with public and private variants |
| `prompt.ts` | The in-room Agree / Ignore / Fight choice box |
| `log.ts` | `log()` and the `TESTING_MODE` build flag. **Leaf — imports nothing** |

### How to build and test

```bash
npm install
npm run watch      # rebuilds dist/HypnosisAddon.user.js on save
npm run typecheck  # tsc --noEmit
npm test           # bundles the modules, then runs every suite in test/
```

**Run `npm test` after any change to `voice.ts`.** A new suggestion whose wording overlaps an
existing one is the easiest mistake in this codebase to make and the hardest to see by hand.

In the browser: install from a `file://` URL pointing at `dist/HypnosisAddon.user.js` (Tampermonkey
needs "Allow access to file URLs"), then refresh the BC tab after each rebuild.

**The test bot** (`testbot/`) is a Node script that logs into BC as a second account and plays the
hypnotist, so the subject side can be exercised without a second human. `testbot/secrets.json` holds
that account's password, is gitignored, and DW fills it in — never commit it, never print it. The
subject drives the run with `/bot next`, `/bot run <n>`, `/bot retry`; those go over the hidden
channel because a silenced subject cannot speak in the room. `/bot` is **BC's own command**, not
ours: ECHS registers only `/hypno` and `/echs` (v0.86.1), and `/hypno bot <text>` is its form. See *Test Harness — the eight
scenarios* for what each scenario proves.

### Build flags and release steps

- `TESTING_MODE` in `src/log.ts` is **`true`**. It gates `/hypno triggers full`, `/hypno trance`,
  `/hypno depth`, `/hypno agetrigger` and `/bot`, and announces itself in the console at startup so
  it cannot quietly ship switched on. Flipping it to `false` is a release step — and it **disables the test harness**,
  so it must be the last thing done before shipping, not the first.
- `dist/` is gitignored; the built userscript is not committed.

### Vocabulary

| Term | Meaning |
|---|---|
| **Subject** | The person being hypnotised. Their client is the authority on everything |
| **Hypnotist** | The other player. Sends requests, is told only what the subject's client chooses to tell them |
| **Trust** | Per-hypnotist, 0–100, derived from a stored *interaction count*. Never stored as a value |
| **Depth** | How far under the subject is right now, 0–100, resolved once at induction |
| **`depthFull` / `depthEarned`** | The same roll with and without the chemical floor. Gates marked `earnedOnly` read the second |
| **Tier** | A named band of depth: Drifting 0 / Yielding 20 / Entranced 40 / Deep 60 / Blank 80 |
| **Chemical floor** | Arousal (and eventually drugs) supplying access a stranger has not earned. Bounded, session-only |
| **Suggestion** | Something spoken during a session. Dies with the session unless carried |
| **Trigger** | A word planted under trance that fires later, outside it. Has its own strength and decays |
| **Carry-forward** | A suggestion deliberately made to outlive the trance |

---

## Current Implementation Status

*(as of 2026-09-08, v0.62.0 — full technical detail, version history, and code: github.com/Dwfreegethub/HypnosisAddon)*

**A full hypnosis loop now works end to end, tested with two accounts.** A hypnotist opens the subject's Information Sheet, clicks an icon, attempts an induction; the subject privately chooses how to respond; after an RP window a roll decides whether they go under; and once under, the hypnotist can restrict them either by clicking buttons or simply by speaking to them.

**Built:**

| Stage | What works |
|---|---|
| 1 — Proof of life | Userscript loads, hooks BC's own functions via `bondage-club-mod-sdk` |
| 2 — Command effects | `/hypno` commands: freeze, wardrobe block, message suppression, hidden-message round trip, trust read/write |
| 3 — Menus & remote | Preferences panel with five permission toggles; remote-control panel on another player's Information Sheet |
| 4 — Session flow | Full induction state machine with private choice, RP window, success roll, trance depth, wake, safeword |
| 5 — Spoken suggestions | Natural-language parsing of the hypnotist's speech, name-gated, with flavor text |
| 6 — Trust engine | Interaction counts per hypnotist, derived trust, single experience pool, chance-based induction roll, arousal as a chemical floor, Stats tab, export/import/reset |
| 7 — Triggers | Persistent trigger words planted under trance, fired afterwards, with scope, duration and targeted release |
| 8 — Arousal & orgasm | Four arousal levels, forced orgasm, orgasm denial — driving BC's own arousal system |
| 9 — Illusion & carry | Clothing illusion (freeze-frame, own screen only); suggestions that outlive the trance |
| 10 — Help & voice | Five-tab help screen on both panels; private messages bracketed, observable ones emoted to the room |
| 11 — Trust over time | Decay as named speeds, BC relationships as category-aware floors, access unified behind `accessFor()` |
| 12 — Sensation & effort | Numbness split from awareness; trigger words a player setting; roleplay rewarded in the induction roll |
| 13 — Undressing & survival | Taking clothes off one garment at a time; OOC filtering; a trance that survives a disconnect; `/hypno effects` |
| 14 — Test harness | A scripted hypnotist bot driving eight verification scenarios against a live client, with `/hypno trance` to force depth and `/bot` to drive it while silenced |
| 15 — Reinforcement & decay | Triggers weaken with disuse, hold better the deeper they were planted, and are refreshed by a re-induction; strength is their effective depth when they fire |
| 16 — Vertical tabs | Both canvas panels moved their tabs to the left edge, which lifts the ceiling from six tabs to nine and gives the panel back the band above it |

**Permissions (subject's Preferences screen, all off by default).** These are consent flags — "do I allow someone else to do this to me" — not self-triggers: Hypnosis Enabled (master), Movement Restriction, Clothing Restriction, Posture Control, Speech Restriction, Self-Touch Control, Arousal & Orgasm, Clothing Illusion, plus "Lock settings while a session is on you". The one control on that tab that is not a checkbox is **Attempts before they must wait** (2 or 3, default 2) — how many times one hypnotist may try before the cooldown. **The lock covers the whole session, not only the trance** (v0.65.1): the prompt, the roleplay window and the misses between attempts are all locked, so a permission cannot be granted to someone mid-attempt and the attempt limit cannot be moved to hand them another try. The cooldown after a spent run is not locked — there is nothing left to protect against. **Import is locked with them** (v0.84.3), from the Data tab button and `/hypno import` alike, because it replaces every toggle at once without ending anything; Export (read-only) and Reset (ends the session before it wipes, Known Bug #4) stay open. Unchecking one mid-effect releases it immediately — **except `arousalControl` and `illusionControl`, which is a bug, not a design** (see the todo).

A second tab holds the **trance defaults** — cannot move / cannot speak / screen fade, all ON by default, plus *Clothes Look Unchanged* (off, deliberately: the other three are things you feel, this one makes your own screen tell you something untrue) and *Others See Your Reactions* (on). A third holds **awareness** (what you can be made not to notice), a fourth **triggers** (planting, carry-forward, firing your own, showing the words, scope, duration), and a fifth is read-only **stats**. A **"?" button on both this screen and the remote panel** opens a five-tab help screen generated from the pattern library and command list themselves, so it cannot fall behind them.

**The session loop.** *Attempt Hypnosis* → the subject gets a private prompt (Agree / Ignore / Fight — **the hypnotist is never told which**, by construction rather than by agreement; no answer in 60s counts as Ignore) → a 60-second induction window for actual roleplay → a **chance-based roll**: `clamp(access + choiceModifier + experienceEffect + rpBonus, 5, 95)` read literally as a percentage, where `access = max(trust, min(arousal, 30))` and `rpBonus` is up to +15 for actually roleplaying the induction. Success fixes the trance depth at entry; failure shows the hypnotist only a vague band ("slightly relaxed", "almost under"), never a number. **Two attempts, then a 10-minute cooldown** — three if the subject sets it, on the Permissions tab. Built v0.65.0; it was hardcoded to three until then.

**Getting out**, in ascending order of authority: the hypnotist's Wake Up button; `/hypno wake`, which works only if the trance is shallow; a 30-minute session timeout; and `/hypno safeword`, which always works from any state and can't be taken away.

**Spoken suggestions.** During a session the subject's client parses the hypnotist's ordinary chat. Twenty-five entries exist — movement, clothing, posture, speech, three awareness categories, four arousal levels, forced/denied orgasm, numbness, undressing and the clothing illusion — plus parameterised self-touch blocks for 42 body words, each with restriction and release phrasings. The help screen's *What to Say* tab is generated from this same table, and the test suite asserts every example phrasing it shows actually matches. Contractions and punctuation are normalised away first, so wording is fairly free ("you can't move", "don't move", "stay still", "you're frozen" all land). **The hypnotist must address the subject by name** for anything to fire, which is what keeps ordinary conversation inert. Effects are identical whether triggered by button or by speech, flavor text included.

**Architectural spine — subject-authoritative throughout.** Every cross-player action is only ever a *request*; the receiving client alone decides, checking its own local settings. The hypnotist's client is never trusted about permissions, session state, or whether a suggestion matched. This is what the doc's own "Sync between players" section already called for, and it's worth checking future features against it.

**Relationship to the trust model above:** trust is **built** as of v0.15.0–v0.18.0. Per-hypnotist *interaction counts* are stored and the value is derived on read via `100n/(n+25)`, so retuning the curve can never corrupt saved data. Conversation accrues it (rate-limited, doubled when the line is directed at you), a successful induction is worth five conversations, and arousal supplies a floor rather than a multiplier. What is still missing from the model above: **hypnotist global skill** alone — decay landed in v0.36.0 and the RP bonus in v0.41.0. The **per-feature percentage thresholds** now have a real mechanism (`Suggestion.trustThreshold`, checked against relationship trust only) even though most permissions are still booleans — the three gates that exist today all sit at 65 — the clothing illusion, planting a trigger, and carrying a suggestion past waking — which is also the owner relationship floor, so ownership alone clears every one of them.

**Known rough edges (still true):** suggestion patterns are regex, not comprehension, so synonyms outside the library silently do nothing — which is why the pattern suite exists and why every gap found in play should become a case in it. The flavor-text wording DW wasn't sold on has been through one real pass since (the apply/attempt split in v0.34.0) but has not been re-reviewed as a whole. The **hypnotist's** side of the trigger system has no panel: reinforcement, decay state and strength are all visible to the subject via `/hypno triggers` and the Triggers tab, and to the hypnotist only through the messages the subject's client chooses to send.

**Test suite: 842 checks across nineteen files**, `npm test`. The ones earning their keep beyond the pattern library: every help example is asserted to match its own suggestion; every body-part word is validated against BC's real arousal-zone list; the public/private split is asserted key by key; and the safeword is asserted to clear carried suggestions.



---

## Philosophy

> **Related:** the mechanics this philosophy produces are *Core Mechanic* and *Trust & Experience
> Gain Curve*; the guarantees it makes are enforced in *Control & Reset* and *Hard Limits*.

Real hypnosis is based on **trust, rapport, and accumulated experience** — not instant control.
This add-on takes that seriously. Depth of access grows over time through genuine relationship-building, not through force or a single command.

Drugs and arousal can influence the process but cannot substitute for real trust. Hard limits are absolute.

---

## Core Mechanic: Trust as a Depth Gate

**Trust** is the primary variable. It is:
- Per-hypnotist (tracked separately for each person, 0–100%)
- Stored on the **subject's** side ("how much do I trust person X")
- Built over time, not granted instantly

Rather than fixed tiers, trust is a percentage. ~~Each feature has a **player-adjustable threshold** — the trust % required for that feature to become accessible.~~ **Superseded** by the Trance Depth redesign below: features are gated on achieved *depth*, and trust's job is to raise the depth ceiling rather than to answer each feature directly. In the zone near the threshold, outcomes are probabilistic (resistance mechanic applies). Well above it, effects are near-certain.

Trust remains the primary driver either way — what changed is where it is read, not how much it matters.

**Three inputs, one max().** As built (v0.36.0), effective access for a threshold check is `max(earnedTrust, relationshipFloor, chemicalFloor)` — where the relationship floor is category-aware (a friend lifts only session-scoped things, an owner lifts everything) and the chemical floor is session-only by construction. The paragraph below describes the second of those; the relationship floor is the third, and exists because decay would otherwise make an owner re-earn a relationship BC already records.

**Two access paths, not one.** Long-term depth is always relationship-trust-gated — that part is never bypassed. But arousal and drugs open a second, bounded path: a **chemical access floor** that lets someone with *zero* relationship trust still reach shallow, session-only effects, capped by a player-set ceiling ("Stranger ceiling," see Player Settings). Effective access for a threshold check is `max(relationshipTrust, chemicalFloor)` — a floor, not a multiplier, since a multiplier on zero trust is still zero and wouldn't give a stranger anything. Deep/persistent features stay out of the chemical floor's reach entirely (see Feature Thresholds below), consistent with the existing rule that drugs/arousal can't write anything permanent. **Additional rule confirmed in v0.28.0:** the chemical/arousal floor also never applies to any feature that deceives the subject about their own state (clothing illusion, bondage illusion, phantom sensation). These are relationship-trust-only gates.

---

## What Builds Trust

> **Related:** the curve these feed is *Trust & Experience Gain Curve*. Arousal and drugs raise a
> session-only floor, never stored trust — the rule is stated in *Core Mechanic* and enforced per
> feature in *Trance Depth as the Feature Gate* (`depthEarned` vs `depthFull`). The drug delivery
> mechanism is under *Session Flow > Drug System*.

### 1. Conversation (primary slow path)
- Chatting with someone in the same room gradually builds shallow trust
- Messages directed at each other count more than ambient chat
- Same-room-time-alone as a trust builder: **optional player setting** (off by default)

### 2. Formal Induction (accelerator)
- The hypnotist speaks an induction phrase or uses a command
- Subject receives a consent prompt and accepts
- Successful induction significantly accelerates trust growth
- At high trust levels, acceptance can become automatic (subject has already consented to that depth through relationship history)
- Pre-written induction scripts can be triggered by command — the add-on speaks them in chat

### 3. Arousal (real-time modifier)
- BC arousal level raises the **chemical access floor** (see Core Mechanic above), capped by the player's "Stranger ceiling" setting — a floor, not a multiplier, so it also helps an established relationship push slightly past where relationship trust alone would sit
- Higher arousal = lower inhibitions = deeper momentary access, regardless of relationship history
- Effect is temporary and session-only; never touches stored relationship trust, and never reaches persistent/deep features

### 4. Drugs (temporary blunt instrument)
- Can raise **or lower** the same chemical access floor temporarily, same "Stranger ceiling" cap
- Player-adjustable: character can be set as "drugs relax my guard" or "drugs make me paranoid"
- **Hard rule:** drugs cannot be used to plant triggers or lasting suggestions
- Drugs open or close the door temporarily; they cannot write anything permanent — the floor they raise never applies to persistent/deep features, only session-only ones

---

## What Lowers Trust

> **Related:** decay is built (v0.36.0) — see [`CHANGELOG.md`](CHANGELOG.md). Trigger decay is a *separate* clock;
> see *Triggers > Trigger Reinforcement and Decay*.

- Violation of hard limits
- Suggestions that fail (subject resists)
- Time apart — **decay rate is a player setting** (some characters: "once trust is built it stays"; others: "out of sight, out of mind")
- RP trust break: subject can invoke a "that broke my trust" response after a violation, which explicitly docks trust with that person
- Direct menu adjustment (OOC, explicit)
- **Trust-withdrawal command** — freely available, easy to use; naturally inaccessible when the subject is bound/gagged (BC bondage is the lock, not an artificial system setting)

---

## Trust & Experience Gain Curve (non-linear)

**Scale: 0–100.** Goal: an hour or two of play reaches a usable number, a couple of days reaches a moderate level, mastery takes far longer, and 100 is never actually reached.

> **Correction to the earlier draft.** The first formula here was `base_rate / (1 + current/scale)`, described as approaching 50 asymptotically. It does not — solved out, it gives `v(n) = S(√(1 + 2Bn/S) − 1)`, which is unbounded √n growth with no ceiling anywhere. Simulated at B=2, S=25 it reaches **99 in 147 interactions**, and gain at v=49 is a third of base rate rather than "nearly zero." It was a slow-growth curve, not a capped one.

**Formula:**
```
gain_per_interaction = base_rate × (1 − current_value / 100)²
```

The squared term is what creates the grind: gain falls off as the *square* of the remaining distance to the cap, so the last stretch costs disproportionately more than the first.

**Closed form — one knob:**
```
trust = 100 × n / (n + H)        H = 100 / base_rate
```

`H` is directly interpretable: **the number of interactions to reach 50.** Everything else follows from it, and the ratios are fixed no matter how H is tuned:

| Target | Cost |
|---|---|
| 50 | 1 × H |
| 75 | 3 × H |
| 90 | 9 × H |
| 95 | 19 × H |
| 99 | 99 × H |

**These ratios are not independent knobs.** "Faster to usable" and "still a grind at the top" both move together with H. Making the top *relatively* harder means changing the exponent, not H. Alternatives were checked: a linear falloff `(1 − v/100)` reaches 99 far too easily, and a cubed one makes the midrange a grind.

Same shape for trust, hypnotist skill, and subject experience — different `H` per stat, tuned in play.

### Interaction unit and tuning (settled)

**One interaction = one directed message, rate-limited to one per 5 minutes per person-pair.** Max 12/hour. The limit was originally sketched at 15 minutes; 5 was chosen instead because it produces the same curve with three times as many smaller steps, so trust drifts up smoothly rather than jumping ~5 points at a time.

**H = 25.** Resulting pace:

| After | Trust | | Time to reach | |
|---|---|---|---|---|
| 1 hour | 32 | | 50 | 2 hours |
| 2 hours | 49 | | 75 | 6 hours |
| 4 hours | 66 | | 90 | 19 hours |
| 8 hours (2 evenings) | 79 | | 95 | 40 hours |
| 16 hours (2 days) | 88 | | 99 | 206 hours |
| 40 hours | 95 | | | |

Note this is **conversation alone** — the induction accelerator (below) is not counted, so these are an upper bound on elapsed time, not a forecast.

**Known trade-off:** intensity doesn't count, only duration. A frantic scene and a lazy back-and-forth pay identically, and a pair could trickle one message every 5 minutes at full rate. Accepted for now — anything that measures "effort" is gameable too.

### Storage: keep the count, not the score

**Store `n`, the interaction count, per person. Derive trust on read.** Do not store the trust value itself.

This is the implementation shape, and it buys four things:

- **Legible state.** One integer per person. "40 exchanges → 62 trust" is easy to read and debug.
- **Decay is subtraction.** Remove interactions from `n`; "lost a week's worth of contact" expresses naturally.
- **The induction accelerator is addition.** A successful session is worth +N interactions — no separate mechanic, no second formula.
- **Retuning never corrupts saved data.** The important one. If trust values were stored and `H` later changed, every stored number would silently become wrong. Storing counts means changing `H` rescales everyone correctly and automatically. Since these numbers are guesses, this matters.

**Induction accelerator value: +5.** ~~+10~~ — lowered after real play, and settled there in 2026-08-31. At 10, one session was worth ~50 minutes of conversation, two sessions took a near-stranger to trust 44, and talking stopped being worth doing. At 5 it is still a real shortcut (~25 minutes) without replacing the slow path it exists to accelerate.

The number that decides this is **how many successful inductions take a total stranger to 65** — the gate on the illusion, triggers and carry-forward:

| Accelerator | Inductions, 0 → 65 |
|---|---|
| 3 | ~16 |
| **5** | **10** |
| 7 | ~7 |
| 10 | 5 |

Five inductions is under an hour with the cooldown, which is far too quick to reach the deepest gates in the game with somebody you have never spoken to. Ten is a real evening.

Worth noting the accelerator matters less than it looks during an actual scene, because **conversation is already accruing at double rate**: a hypnotist has to say the subject's name for any suggestion to fire, and a named line counts as directed. An hour of real play is ~24 interactions from talking alone, so two inductions add roughly a third on top rather than carrying the relationship.

**The accelerator is not the roleplay reward, and confusing the two produces a bad number.** It pays out for *completing an induction* — identically whether the hypnotist roleplayed one beautifully or waited out the window in silence. The lever that reads effort is the RP bonus in the induction roll; see below.

**Later: expose tuning in the player menu.** `H`, the rate-limit interval, and the accelerator value are all single numbers. Surfacing them as player settings (or presets — "slow burn" / "standard" / "quick") would let players tune the pace to their own RP style without a code change. Not needed for the first cut, but the storage model above is what makes it safe to do later.

---

## The Hypnotist's Side: Skill & Experience

Two dimensions, both non-linear (same curve as trust — see below):

**Global skill** — grows through practice across all subjects. Affects induction success rate and suggestion precision. Weighs more heavily than subject experience in the success formula.

**Per-subject familiarity** — grows through sessions with a specific person. Determines depth ceiling with that individual.

**Subject experience** — grows through being hypnotized. Cuts both ways: makes it easier to go under for trusted/familiar hypnotists (you know how), but also improves resistance against strangers (you know your own mind). Weighs less than hypnotist skill in the formula.

A skilled hypnotist needs less time to build trust; their suggestions land more reliably.

---

## Induction Success Formula (**built** — v0.15.0)

**Superseded (v0.7.0–v0.14.0):** `score = trust + choiceModifier + random(0..20)`, success if `score ≥ 50`. Replaced by the chance-based roll below in v0.15.0 — kept here because the reason it had to go is the clearest statement of what the replacement is for.

That has a flaw worth fixing before the trust engine lands. The random term is only 20 wide, so outcomes swing from impossible to certain across a 20-point trust window — the "probabilistic zone near the threshold" the doc calls for is almost nonexistent. Simulated: at trust 25 + Agree it is already **100%**, while trust 25 + Ignore is **0%**. A cliff, not a gradient.

**Proposed:** read the effective number as a *percentage chance*, which is how this doc already describes it ("10% trust + Agree = 35% effective"):

```
chance  = clamp(trust + choiceModifier + skillBonus + rpBonus, 5, 95)
success = random(0..100) < chance
```

The 5/95 clamps mean nothing is ever fully certain in either direction — a determined stranger has a sliver, and a deeply trusted hypnotist can still miss.

**`rpBonus` — built v0.41.0.** +5 for each line the hypnotist says during the induction window, capped at **+15**; the window's count resets per attempt, since three attempts are three performances. Meaningful against Agree's +25 and never decisive against the 95 clamp. Purely additive, so an induction where nobody speaks rolls exactly what it always did — a hypnotist who does not want to roleplay is not penalised, only unrewarded.

Session-only, like the arousal floor: it moves one roll and is then gone, so unlike trust it can never be farmed into permanent access. It also raises the depth **ceiling** for free, since `depth = chance − roll` — roleplaying properly gets you in more often *and* deeper when you do, with no second mechanic. That is what makes Blank reachable for an owner whose subject merely Ignores (see the owner table below).

Not name-gated, unlike suggestions: an induction is a monologue delivered *at* someone, and requiring the subject's name in every line of it would buy nothing and read worse. Two cheap defences instead of a real anti-gaming system, which this doc already accepts is unwinnable — a 15-character floor, and refusing a line identical to the one immediately before it, so paste-spam earns nothing while a returning refrain still counts.

**`skillBonus` remains unbuilt** — it lives on the hypnotist's client while the roll runs on the subject's, and taking a self-reported number would break the subject-authoritative rule. Still the open question it always was.

Per-attempt chance (and per session, across three attempts):

> The per-session column assumes three, which is what the code did when this was written. The
> limit became a player setting in v0.65.0 and **defaults to two**, so the bracketed figures are
> the upper reading — at two attempts a 35% chance compounds to 58%, not 73%. Worth recomputing
> if this table is ever retuned rather than read.


| Trust | Agree | Ignore | Fight |
|---|---|---|---|
| 0 | 25% (58%) | 5% (14%) | 5% (14%) |
| 10 | 35% (73%) | 10% (27%) | 5% (14%) |
| 25 | 50% (88%) | 25% (58%) | 5% (14%) |
| 40 | 65% (96%) | 40% (78%) | 15% (39%) |
| 50 | 75% (98%) | 50% (88%) | 25% (58%) |
| 70 | 95% (100%) | 70% (97%) | 45% (83%) |
| 90 | 95% (100%) | 90% (100%) | 65% (96%) |

This matches the doc's own worked example exactly — 10 trust + Agree really is a 35% chance — and a willing subject at zero trust lands 58% of the time across a session, satisfying "a willing subject with minimal trust baseline should be hypnotizable."

**Trance depth** falls out of the same roll: `depth = chance − roll`. A comfortable success goes deep; a squeaker leaves a shallow trance the subject can wake themselves from (the existing self-wake threshold is depth 40).

**Fight floor: settled at 5%** (≈14% across a session's three attempts), and **player-adjustable** — it belongs with the other pace settings rather than being a fixed constant.

### Two kinds of "no" — keep them separate

A recurring source of confusion. There are two distinct refusal mechanisms and they must not be conflated:

| | **Fight** | **AFK-block / OOC settings** |
|---|---|---|
| Nature | In-character choice, made in the moment | Out-of-character standing declaration |
| Behaviour | **Contested** — probabilistic, weighed against trust and skill | **Absolute** — not contested by anything |
| Can skill overcome it? | Yes, that's the point | Never |

Fight is a roleplay stance the fiction can overrule. The AFK-block and OOC preference are consent statements the fiction has no business overruling. Keeping them separate is what stops "a skilled enough hypnotist can get through anything" from leaking into territory where it must not apply.

**Design constraint from this:** *a new player should have little chance of resisting a very experienced hypnotist.* Skill has to carry enough weight in the roll to push through a Fight modifier. The current placeholder numbers don't achieve this — at 0 trust, Fight clamps to the 5% floor and even a large skill bonus barely moves it. **The skill weighting needs working out against this specific case** when the formula is finalised; it's the scenario that will expose whether the weights are right.

**Deferred for review:** how the OOC "Genuine resistance" setting interacts with all of the above. It promises effects *can actually be blocked*, which reads as absolute — putting it in the right-hand column above — but that needs a deliberate pass rather than being settled in passing.

**Hypnosis is still doable at low levels**, especially with a willing subject: the Agree modifier (+25 to the roll) means even 10% trust + Agree = 35% effective, and RP engagement during the induction window adds further. A willing subject with minimal trust baseline should be hypnotizable. *(See Induction Success Formula below — under the proposed model this reads literally: 35% per attempt, ~73% across a session.)*

**Analytics / progression tracking:** future feature — would require server-side infrastructure to track across players meaningfully. Flagged for later if the add-on is released publicly.

---

## Trust Percentage & Feature Thresholds

> ⚠ **Superseded.** Kept because it is what the code does today and the numbers carry forward as
> depth-tier inputs. The replacement is the next section.

*(Original design — superseded by the Trance Depth redesign below. Kept for reference while the new system is being implemented.)*

Each feature has a player-adjustable trust % threshold. Example defaults (placeholders — to be tuned through play):

| Feature | Default Threshold |
|---------|------------------|
| Mood suggestions | 20% |
| Behavioral suggestions (session-only) | 40% |
| Persistent triggers | 65% |
| Triggers only removable by hypnotist | 85% |
| Hypnotic immobilization | 50% |
| Follow / leash | 55% |
| Remove clothes | 60% |
| Clothing illusion | 65% |
| Bondage illusion | 75% |

**In the zone (near threshold):** outcome is probabilistic, resistance mechanic applies.
**Well above threshold:** near-certain success.
**Below threshold:** blocked entirely.

**Chemical floor applies only to session-only rows** (mood suggestions, behavioral suggestions, hypnotic immobilization, follow/leash, remove clothes, both illusions) — never to persistent triggers or hypnotist-only-removable triggers, no matter how high a player sets their Stranger ceiling. Those two stay relationship-trust-only.

---

## ⚠ DESIGN CHANGE: Trance Depth as the Feature Gate — **Phase 1 built, v0.50.0**

**Summary of change:** Feature access is gated on *trance depth*, not directly on trust percentage. Trust is still the primary driver — it determines how deep a hypnotist can take a subject — but the check the add-on makes per feature is "are you at depth tier X or higher?" rather than "is trust ≥ X%?" The subject's response (Agree/Ignore/Fight) and other modifiers then move the actual achieved depth up or down within that ceiling.

The existing relationship floors (friend/lover/owner) remain as trust minimums — they continue to feed into the depth ceiling calculation but are no longer direct feature gates themselves. An owner (trust 65) has a high ceiling; a stranger (trust 0) has almost none.

### Relationship floors become DEPTH floors (settled 2026-08-31)

DW's rule: *a friend should be able to reach arousal with a good roll or a little help; a lover should always reach it as long as the induction succeeded and they did not actively fight.*

**"Always" cannot be expressed by a trust floor, and this is the reason the mechanic had to move.** Depth is `chance − roll`, and success needs `roll < chance` — so on a success the roll is uniform across `0..chance`, which makes depth uniform across `0..chance` too. The deepest anyone can land is `chance` itself. Run a lover through it: floor 30, choosing Ignore, no modifier, so `chance = 30`. Arousal sits at Entranced (40). **Their ceiling is below the tier — they never reach it, not merely unreliably.**

So the floor moves one stage later in the pipeline, from the access number to the achieved depth:

```
depth = fought ? (chance − roll) : max(chance − roll, relationshipDepthFloor)
```

| | Depth floor on a successful, unfought induction | Reaches |
|---|---|---|
| **Friend** | none | Entranced only on a good roll, or with arousal/drugs/RP raising the ceiling |
| **Lover** | **Entranced (40)** | arousal, always |
| **Owner** | **Deep (60)** | the illusion and persistent triggers, always; Blank still has to be earned |

Fight forfeits the floor entirely, which is what keeps Fight worth choosing.

**The owner case, worked through with the real numbers** — DW's call was "at least Deep, with the RNG having a chance at Blank".

Reaching Blank needs `depth ≥ 80`, i.e. `roll ≤ chance − 80`. Given a success, that has probability `(chance − 80) / chance`, which is zero for any chance at or below 80:

| Owner, choice | chance | Depth range | Blank, given success |
|---|---|:-:|:-:|
| Fight | 40 | 0–40 — floor forfeited | never |
| Ignore | 65 | **60**–65 | never |
| Ignore + full RP | 80 | **60**–80 | ~0% |
| Agree | 90 | **60**–90 | ~11% |
| Agree + full RP | 95 | **60**–95 | ~16% |

**So Blank requires the subject to Agree**, and even then lands on about one successful induction in nine. Deep is guaranteed on every unfought success, exactly as asked. Nothing an owner can do alone reaches Blank — it takes the subject choosing to go, which is a better rule than any that could have been written deliberately.

The RP bonus is not what unlocks Blank here — at chance 80 it is still a rounding error. What it does is move Agree from 11% to 16%, and, far more importantly, lift a **friend** over the Entranced line they otherwise clear only on a good roll. That is the case it was built for.

**A depth floor is non-selective**, and that is the price of collapsing categories into one number. A lover floored at Entranced also gets Follow and Remove Clothes, since those share the tier. Accepted deliberately — see the reach matrix note below.

A good roll, a willing subject, and favorable modifiers are still needed to actually reach Blank even in an established relationship.

This enables non-consent RP: a subject can roleplay resistance while their OOC preference allows mechanics to work, and a skilled hypnotist who earns enough depth can reach any feature their subject has enabled. The OOC preference layer ("Genuine resistance" / "Hard no") remains the absolute backstop.

This change makes a good induction roll matter, makes modifiers like arousal and fractionation meaningful mid-session, enables the full range of non-consent RP scenarios within OOC consent, and gives the settings UI a clearer way to express player preferences.

### Trance Depth Tiers (5 named levels)

| Tier | Name | Depth range | What it represents |
|------|------|-------------|-------------------|
| 1 | **Drifting** | 0–19 | Barely under — relaxed, edges softened, still mostly present |
| 2 | **Yielding** | 20–39 | Giving in — noticeably affected, starting to respond |
| 3 | **Entranced** | 40–59 | Clearly hypnotized — focus narrowed, suggestions land reliably |
| 4 | **Deep** | 60–79 | Deep under — will faded, limited self-direction |
| 5 | **Blank** | 80+ | Fully gone — no resistance, complete receptivity |

Depth is calculated as `chance − roll` after a successful induction (roll < chance). High trust raises the ceiling; a good roll reaches it. Low trust caps depth even with a perfect roll.

### Feature Depth Requirements (defaults — player-adjustable)

Each feature has an on/off toggle (master consent gate) plus a depth tier selector showing the minimum depth required for that feature to activate. Players see the current default tier and can raise or lower it.

| Feature | Default Depth Required |
|---------|----------------------|
| Mood suggestions | Drifting |
| Behavioral suggestions (session-only) | Yielding |
| Hypnotic immobilization / cannot move | Yielding |
| Cannot speak | Yielding |
| Screen fade | Drifting |
| Follow / leash | Entranced |
| Remove clothes | Entranced |
| Arousal suggestions | Entranced |
| Persistent triggers | Deep |
| Clothing illusion | Deep |
| Bondage illusion | Blank |
| Triggers only removable by hypnotist | Blank |

> **This table is the design, not a mirror of the code.** It names tiers for features that do not
> exist yet (Follow / leash, Mood suggestions, Bondage illusion, hypnotist-only triggers) and omits
> gates that do (the three awareness categories, self-touch, carry-forward). `DEPTH_GATES` in
> `depth.ts` is what is actually gated, and the Depth tab draws from it. When a row here gets built,
> it gets a `DEPTH_GATES` entry and this note gets shorter.

**Two depths, not one.** The structural exclusion — drugs and arousal may never write anything permanent, nor reach a feature that lies to the subject about their own state — is not a *how deep are you* rule. It is a *where did the depth come from* rule, and a single depth number cannot carry it: if arousal contributes to depth and depth gates everything, then an aroused stranger reaches persistent triggers and the clothing illusion by construction, which this doc forbids everywhere else. So depth is computed twice:

| | Inputs |
|---|---|
| **`depthEarned`** | trust + relationship floor only |
| **`depthFull`** | plus arousal, drugs, fractionation, resistance fatigue, RP bonus |

Most features check `depthFull`. Three features default to `depthEarned` only — persistent triggers, clothing/bondage illusion, and carry-forward — because they are the ones that outlive the session or deceive the subject about their own body. **That is one boolean per feature, not four categories** — which is what replaces `AccessCategory` when the redesign lands (see the reach-matrix note in the v0.36.0 entry).

**The earned-only default is player-adjustable (decided 2026-09-08).** A subject can choose to allow chemical depth to reach illusion, triggers, or carry-forward for them — but the tradeoff is baked in structurally: any trigger or carried effect that was chemically seeded **decays significantly faster** than one earned through relationship trust. The fast-decay rate is fixed, not configurable — if you want the chemical shortcut, you accept the shorter shelf life. Illusion has no decay clock, but its "felt permanence" (how long it lingers as a carried impression after waking) is also shorter when chemically reached. UI: a per-feature toggle sitting alongside the depth selector and the enable/disable switch; layout to be finalised at coding time.

> **Sequencing constraint — SATISFIED, built v0.68.0.** This toggle reverses a rule that
> `depth.ts` used to state flatly, and the only thing that made reversing it safe was the faster
> decay — so it could not ship before v0.60.0. It now has: `effectiveEarnedOnly()` reads the
> `chemicalReach` map, the Depth tab flips it per feature, and the contradicting comment was
> rewritten in the same commit. **Still important:** nothing a *hypnotist* does can flip it — the
> map is the subject's own local storage with no cross-player writer — so "an aroused stranger
> cannot plant a lasting trigger" holds exactly as before unless the *subject* chose otherwise.
> Carry-forward needs the same fast-decay treatment before its half of the toggle is offered;
> today only triggers carry a decay clock.

**Chemical floor rule — player-configurable per feature:** What contributes to the floor is a player setting per feature via a **dropdown with four options:**

| Option | Effect |
|--------|--------|
| **Both** | Arousal and drugs both contribute depth for this feature |
| **Arousal only** | Only BC arousal raises the floor; drugs have no effect |
| **Drugs only** | Only administered drugs raise the floor; arousal has no effect |
| **Neither** | Chemical floor is disabled for this feature — trust only |

Default: set by wizard answers. A player who skips the wizard gets Neither (disabled) for all features — chemicals have no effect until they configure it.

**What happens when depth is insufficient:** flavor message to both. The hypnotist sees that the command didn't land; the subject sees a vague surface-pull message. For trigger *setup* specifically: the hypnotist gets a message that the depth wasn't enough but can continue building the trigger anyway — when the trigger is finally saved, the subject receives flavor text along the lines of "you feel like you rejected something they said, but something was still added."

**How modifiers interact with depth:** modifiers (arousal, drugs, resistance fatigue, fractionation bonus) raise the subject's effective depth for the roll. They do not lower the required depth tier of a feature — the tier is a consent setting, not a difficulty setting.

### Setup Wizard

A setup wizard runs on first launch (and can be re-run from settings) to generate a sensible starting config. The wizard does not lock anything — it just fills in defaults that would otherwise be all-off. **Built v0.71.0** — see the Todo entry and [`CHANGELOG.md`](CHANGELOG.md).

**First question — role:**
> "What is your role going to be?"
> - **Subject only** — continues to full subject setup questions
> - **Both** — continues to full subject setup questions (hypnotist features available by default)
> - **Hypnotist only** — skips remaining questions entirely; no subject settings needed

**Remaining questions (subject and both paths only):**
1. **Openness** — how receptive is your character to hypnosis? (sets base suggestibility, IC stance)
2. **Relationship trust** — should BC relationships (owner/lover/friend) automatically grant depth access? Which tiers? If they have an existing owner or lover, offer to designate them as Architect.
3. **Sensitive features** — which features require Deep or Blank trance? (sets depth thresholds for high-risk items)
4. **Chemical floor** — for each feature category: Both / Arousal only / Drugs only / Neither. Wizard sets a blanket default; individual features can be tuned afterward.
5. **Safeword** — confirm safeword is set and test it
6. **Decay** — how fast does trust fade without interaction? (Never / Very slowly / Slowly / Typical / Fast / Very fast — the six shipped in v0.36.0, not four)

Output: complete starting configuration, tunable per-feature afterward.

### Fractionation (named mechanic)

Waking a subject and re-inducing them repeatedly, each cycle going deeper. As a mechanic:

- A **fractionation bonus** applies to the induction roll if re-induction follows within a short window after waking (proposed: 5 minutes)
- The bonus stacks across cycles but with diminishing returns — you can't repeat indefinitely to reach Blank
- Each successful deeper induction resets the depth to the new (higher) value, not an average
- The fractionation window resets after a longer gap — you cannot "bank" cycles across sessions

Implementation of the window and diminishing returns TBD during development.

### Dual Fatigue System

Both the subject and hypnotist accumulate fatigue across induction attempts. Both counters decay over time when no attempts are happening.

**Resistance fatigue (subject):**
- Increases with each attempt the subject fights or resists
- Reduces the subject's effective resistance modifier on subsequent rolls (harder to fight)
- Base effect is higher than hypnotist fatigue — subjects tire faster than hypnotists
- Amount per attempt has a random component (some fights cost more than others)

**Hypnotist fatigue:**
- Increases with each induction attempt, success or fail
- Reduces the hypnotist's skill/precision modifier on subsequent rolls
- Base effect is lower than resistance fatigue — the hypnotist tires slower
- Also has a random component
- Acts as a natural limiter so a hypnotist cannot simply attempt indefinitely until the subject is worn down

Both counters are session-scoped (reset between sessions) unless carrying fatigue between sessions is deliberately designed in later.

**Interaction with fractionation:** fractionation and resistance fatigue pull in the same direction (deeper trance with each cycle) — but hypnotist fatigue pulls the other way, preventing indefinite cycling. The interplay between them creates a natural "sweet spot" of how many fractionation cycles are productive.

---

## Control & Reset

> **Related:** the absolute layer is *Hard Limits* and the OOC layer is *Meta-Consent*. The
> Architect role appears again in *Triggers > Who Controls the Subject's Visibility Level* and in
> *Open Questions*. `/hypno safeword` is the hard floor referenced throughout.

**Three layers:**

**Hard floor — always yours.** Panic/safeword equivalent. Always works regardless of trance state or bondage. Clears active trance, suspends all effects, restores full menu access. Cannot be taken away.

**RP layer — feels locked, isn't literally.** A hypnotist can plant a suggestion like "you won't try to remove your triggers." If the subject has OOC-consented to that depth, the UI shows resistance flavor text when editing — but the underlying data is still editable. Experience of being locked without removing the safety valve.

**Full lock (opt-in).** Some players want to be genuinely locked out of changes. Available as an explicit setting. Still subject to the hard floor override.

**Reset:**
- Hard reset (LSCG-style) always available — restores factory defaults, **and ends an in-flight trance first, through the same teardown as the safeword** (`hardFloorStop()`'s `totalStop()`). Built v0.63.1, closing Known Bug #4; it ends the trance and says so rather than refusing — see the note under the Known Bugs table for why refuse-and-instruct was rejected.
- **Named save states** — reset to a specific saved configuration rather than factory defaults (e.g., "reset to how my owner set me up")

**Architect role — the owner model:**
- **One architect at a time** (multiple levels of users too complex for now)
- Sets base configuration: features enabled, triggers, thresholds
- Other people can use installed triggers (within their scope) but cannot add/remove or change core settings
- **Both players must have the add-on installed**

**How Architect is granted — two paths:**
1. **BC owner or lovers:** The wizard asks if the subject wants to designate one of them as Architect. Subject chooses; it is never automatic.
2. **No owner/lovers (or none chosen):** Once a hypnotist reaches a high trust threshold (exact value TBD; modifiers optionally included), they may *request* Architect status. Subject accepts or declines — no silent elevation.

**Abandonment and breaking free:**
- The abandonment clock resets only on a **full induction session** — a whisper or passing contact does not count
- The Architect is **never removed automatically** — the subject must explicitly request or attempt to break free
- **Minimum trial period: 1 week** — subject cannot attempt to break free until at least 7 days have passed since the Architect relationship was established
- **Default abandonment period: 2 weeks** — if the Architect has not run a session in 2 weeks, the subject may attempt to break free. Configurable by the subject before the Architect is set (wizard step or pre-commit setting). **Once an Architect is in place, this period cannot be changed by anyone** — both parties commit to the agreed window upfront
- When breaking free: the subject chooses what resets (Architect triggers wiped, trust probably already faded — player's choice)
- **The Architect can always remove themselves** from the subject at any time — mutual dissolution (breakup) is also an option

**Architect control model:**
- Architect has **granular lock control** — can lock specific settings rather than everything at once (exact scope of lockable items TBD; review settings screen for what makes sense to include/exclude)
- **Only the Architect can change or unlock locked settings** — if the Architect is unavailable, locked settings stay locked. This is by design; choose carefully
- **Architect triggers do not decay** — they are permanent until the subject resets or the Architect removes them
- **Architect triggers cannot be removed or edited by other hypnotists** — only by the Architect or via a full subject reset
- **Reset is always available to the subject** — no lock can prevent a full reset

**Control hierarchy setting:** Subject decides whether the *player* or the *Architect* holds the highest level of control over settings. This is a toggle the subject sets. Regardless of how it is set, the subject always retains the ability to do a full reset.

### The hypnotist vanishing mid-trance — closed 2026-09-10: no special handling

**Decided: nothing is built for this.** No presence detection for the vanished hypnotist, no
auto-release on absence, no extended recovery. He goes quiet or leaves; she is still under; she uses
**`/hypno safeword`**, or `/hypno reset` if she wants the add-on gone too. This is now a settled
answer, not an open item — removed from the todo list, and **removed as a dependency of extreme
mode**, which was previously written as waiting on it.

**Why this is the right call.** The exits already exist and already work from any state. Building
presence detection would mean deciding how long absence counts, what happens if he is loading, what
happens if he is in another room, and what happens if she wants to stay under while he is gone —
which is a real thing people want. Every one of those is a judgement the subject can simply make for
herself with one command she already has.

**Consequence 1 — under extreme mode the safeword is the answer, not the fallback.** Ordinarily the
30-minute timeout (`SESSION_TIMEOUT_MS`, `src/session.ts`) catches this: he leaves, and within half
an hour she is out whether or not she does anything. Extreme's proposed 60–90 minutes pushes that
much further away. That does not change the decision, but it does change what the decision *means*:
in extreme, a subject whose hypnotist has vanished should expect to use the safeword rather than wait
it out. Worth saying in the tester documentation.

**Consequence 2 — the accepted risk, stated rather than left silent.** Checked against the code, and
the news is mostly good:

- **She will see him leave.** Room join/leave messages are not touched by awareness suppression.
  `classify()` in `src/suppression.ts` only ever matches `Activity` and `Action` messages, and its
  `ACTION_TAGS` list is deliberately one entry long, with the comment stating outright that
  "anything safeword-, leash- or room-related stays off it: those are messages a subject must keep
  seeing regardless of what they've agreed to not notice."
- **Nothing blocks the exit.** The safeword is a slash command and survives the speech block; the
  screen fade dims the view without hiding chat; `lockedWhileHypnotized` freezes the settings screen
  but never the command.

**What is accepted:** nothing *hides* the exit, but nothing *prompts* it either. A subject deep
under, enjoying being left there, may simply sit — and the add-on will not tell her that the person
who put her there is gone and she can leave whenever she likes. That is a real gap and it is
accepted deliberately: the cheap mitigation would be one private line when the hypnotist leaves the
room, and that is presence detection, which is exactly what this decision declines.

**Is the five-minute presence check now unused? No — it never covered this case.**
`RECOVERY_WINDOW_MS` and the `inRoom` handler in `src/recovery.ts` are for the mirror-image
situation: **she** disconnects and comes back. `attemptRecovery()` uses them to decide whether to
resume her trance (he is present, or returns inside the window) or let it go (he does not). That
path is live, tested, and unaffected. It was only ever *suggested* as machinery that could be
repurposed for the vanishing hypnotist; that suggestion is what has now been declined. Nothing
becomes dead code.

---

## Proxy / Helper Mode (not yet built)

A temporary, OOC support role — entirely separate from Architect. No RP framing; purely a tool for setup and troubleshooting.

**What Proxy can do (with subject confirmation per action):**
- View all settings tabs
- Propose changes to any setting — subject sees and agrees to each one before it applies
- Remove problem triggers (except Architect-placed triggers — see below)

**What Proxy cannot do:**
- Act without subject confirmation
- Plant new triggers
- Remove or modify Architect-placed triggers
- Retain any access after leaving the menu

**How it works:**
- Subject invokes: `/hypno proxy @name` — subject initiates, not the helper (reduces abuse vector)
- Access lasts only while the helper is actively in the shared menu view — closes automatically when they leave
- Subject sees a live summary of all changes made during the session

**Proxy and Architect interaction:**
- A subject with an Architect **can** invoke Proxy — decided.
- Proxy cannot touch anything the Architect has set or locked. This is structural: Proxy is OOC support access, not a privilege level that overrides relationship-based locks.
- Proxy cannot undo anything the Architect has done.

**⚠ Undecided — God mode:**
A special override flag for a designated super-user (working name: `/hypno proxy @player God`). Would grant view and override ability across all subjects except the invoking player themselves. If implemented, scope, consent model, and logging requirements need full design. Flagged for future discussion — do not implement without explicit sign-off.

---

## Hard Limits

> **Related:** *Meta-Consent Layer* is the OOC sibling of this — hard limits are absolute per
> action, OOC preference is absolute per player. *Two kinds of "no"* under Induction Success
> Formula explains why neither may be overcome by skill. **Not built.**

- Player-defined, stored locally
- **Absolute** — cannot be bypassed regardless of trust, arousal, or drugs
- Mirror real psychology: hypnosis cannot make you do something against your core values
- Serve as the consent backbone of the add-on

---

## Meta-Consent Layer (OOC vs IC)

Two separate settings:

**IC stance** — how your character behaves in roleplay (resistant / neutral / open). Drives RP flavor and resistance animations.

**OOC preference** — do you actually want the mechanics to work?
- "Yes, affect me" — mechanics work; IC resistance is purely cosmetic RP
- "Genuine resistance" — resistance mechanic is real; effects can actually be blocked
- "Hard no" — equivalent to a global hard limit; nothing goes through

Allows players to play a resistant character while genuinely wanting to be affected, without breaking character.

---

## Gamification: Fighting Off Suggestions

When a suggestion lands near the threshold (probabilistic zone):
- Subject gets a **resistance mechanic** — a contest, not an instant block
- Subject can also **consciously allow** a borderline suggestion
- **Arousal level** affects resistance (higher arousal = harder to resist)
- **Drug state** affects resistance (depends on type and player settings)
- Trust level determines the base difficulty

---

## Feature List

> **Related:** each entry has a detail section — *Triggers*, *Carry-Forward*, *Perception /
> Illusion Features*. Depth requirements per feature are in *Trance Depth as the Feature Gate*.

### Tier 1 — Works on anyone (BC native systems)
*Hypnotist's add-on sends BC game commands. Subject does not need add-on installed.*

| Feature | Description |
|---------|-------------|
| **Hypnotic immobilization** | Apply BC Freeze effect as a suggestion, not physical restraint |
| **Follow / leash** | Compulsion to follow — including across room transitions |
| **Remove clothes** | Triggered compulsion to remove items — gradual, one piece at a time |

### Tier 2 — Requires add-on on both sides
*Subject's client must be running the add-on.*

| Feature | Description |
|---------|-------------|
| **Verbal triggers** | Keyword planted in session; effect fires when word appears in chat |
| **Clothing illusion** | Subject's client renders wrong clothing state (see below) |
| **Bondage illusion** | Subject believes they are restrained when they are not (see below) |
| **Resistance mini-game** | UI prompt for fighting off or accepting borderline suggestions |
| **Consent / induction prompts** | Session start/end, hard limit notifications |
| **Induction scripts** | Pre-written scripts spoken in chat via command; customizable |
| **Collateral effect** | Partial effect on bystanders with high suggestibility (opt-in) |

*Most features work in both map rooms and regular rooms.*

---

## Session Flow & Natural Language (**built** — v0.7.0–v0.9.1)

*This section was written as a design. It is now implemented; see Current Implementation Status below for what shipped. Two deviations from what's described here are noted inline.*

### Session State Machine

A hypnosis session passes through defined states. Both players' add-ons track current state:

```
Idle → AttemptMade → InductionInProgress → [Success] Hypnotized → Waking → Idle
                                          → [Fail/MaxAttempts] CooldownRequired → Idle
```

**As built, two changes:** an `AttemptFailed` state was added, because Step 3's "Continue Trying" button needs somewhere to live that isn't cooldown yet. And `Waking` is not modelled — waking is instantaneous (release effects, go Idle) with nothing observable in between; that state is where a wake-up grace period would go if one is ever wanted.

**Ownership:** the subject's client holds the only real state and pushes a deliberately lossy view to the hypnotist — bands, never numbers, and never the private choice.

### Step 1 — Initiation
- Hypnotist presses "Attempt Hypnosis" button in the remote-control panel
- Subject's add-on receives a **private prompt** — three choices:
  - **Agree** — cooperative; positive modifier to success roll
  - **Ignore** — neutral; base trust/skill calculation only
  - **Actively fight** — resistant; negative modifier (connects to OOC preference setting)
- **Hypnotist does not know which was chosen** — they only see that an attempt is underway

**No-answer behaviour (player setting):**
- **Block (AFK-safe, recommended default):** no response within the timeout = attempt blocked entirely. **Hard block — absolute, no skill or trust override.** The hypnotist receives a flavor message indicating this person can't be hypnotized right now (not a cold error — something that fits the scene, e.g. "they seem distracted and distant — this isn't the moment").
- **Always Ignore:** neutral outcome, no modifier either way.

*~~Tie to IC stance~~ — under review.* The original third option mapped no-answer onto the player's IC stance (Resistant → Fight, Neutral → Ignore, Open → Agree). That looks wrong on reflection: it routes an out-of-character condition (the player is absent) through an in-character mechanic (their character's stance), and it hands an absent player a **+25 Agree bonus** they never chose. Neither Agree nor Fight makes sense for someone who isn't there — both represent deliberate acts. Likely resolution is to drop this option and keep the two above, but flagged rather than deleted pending a proper review.

*Shipped behaviour today (v0.7.0) is "Always Ignore" with a 60-second timeout, and no setting to change it. Adding the Block default requires the first non-checkbox control on the settings screen.*

### Step 2 — Induction Phase
- A generic induction script is generated and displayed — spoken by the hypnotist's character in chat (or the hypnotist types their own RP)
- **RP reward mechanic:** hypnotist is rewarded for engaging during the induction window (messages sent, time invested, actual RP effort) — this adds a modifier pushing the subject closer to success
- This window gives both players time to actually roleplay the induction rather than just clicking a button

### Step 3 — Checking Success
- After a short window, the hypnotist checks their panel to see if the attempt landed
- If not successful: a **"Continue Trying"** button appears, along with a **progress indicator** showing whether the subject is getting closer (e.g., "slightly relaxed → more relaxed → almost under") — without revealing exact numbers or the subject's private choice
- Maximum attempts allowed before a cooldown kicks in (player-set) — **built v0.65.0**, Permissions tab, 2 or 3, default 2
- After max attempts: panel shows "try again later" — subject cannot be re-attempted until cooldown expires

### Step 4 — Success
- Panel updates to show the subject is hypnotized
- Feature buttons (freeze, clothing, suggestions, etc.) become active
- Some state changes surfaced in chat for RP flavor (wording TBD)

### Trance Depth During a Session
- **Fixed at entry** — depth is determined at the moment of successful induction based on trust, skill, and modifiers
- To go deeper, the hypnotist must wake the subject and run a new induction
- Running a second induction on an already-trusting subject should be faster/easier than the first

> **Related:** the tiers themselves, the relationship depth floors and the modifiers are all in
> *Trance Depth as the Feature Gate*. "Wake and re-induce" is the loop *Fractionation* formalises —
> the third bullet is currently only an intention, since nothing yet distinguishes a first induction
> from a second.

### Ending a Session
- **Hypnotist:** wake-up keyword (spoken in chat) or a "Wake Up" button in the panel — always available
- **Subject:** can wake themselves early if trance depth is shallow (low trust = shallower = easier to self-wake)
- **Timeout:** subject sets a maximum session duration; add-on automatically wakes them when it expires
- On wake: feature buttons lock again, active suggestions that aren't persistent fade, triggers remain

### Starting a Session (summary)
- "Attempt Hypnosis" button in the existing remote-control panel (the Information Sheet icon)
- Feature buttons (movement restriction, clothing, etc.) are **locked** until a session is successfully established — they do nothing outside an active session

### Natural Language Suggestions During a Session
Once a session is active, the add-on monitors the hypnotist's chat output and pattern-matches against known suggestion types.

**Recognition approach: free-form primary, `/suggest` as fallback**
- During an active session, add-on parses the hypnotist's chat and matches against a pattern library ("raise your hands", "sit down", "remove your shirt", etc.)
- `/suggest [phrase]` available as an unambiguous fallback when natural language parsing is uncertain
- Pattern library grows over time; edge cases fall back to the slash command

**"Repeat after me" mechanic — tiered by trance depth:**
- Shallow: subject's add-on shows a visual cue/prompt; they type it themselves
- Medium: add-on intercepts their outgoing text, forces it to match the required phrase (BCX-style speech control)
- Deep: add-on speaks the phrase as an emote on their behalf (LSCG-style), or speaks it as them entirely — subject has no choice
- All three mechanisms are confirmed possible in BC add-ons; which depth unlocks which behavior is TBD during implementation

### Suggestion Progression (natural escalation)
Low-trust / early session suggestions:
- Sit down / stand up
- Raise your hands
- Look at me
- Speak only when spoken to

Mid-trust suggestions:
- Remove your [item]
- Follow me
- Stay still (Rooted — see below)

High-trust suggestions:
- Full lock (see below)
- Persistent triggers
- Don't speak / silence suggestion

### Movement Restriction — Two Distinct Types

*Not yet built. What ships today is a single blunt movement restriction (BC's native `Freeze` effect) with no Rooted/Full-lock distinction — the split below is still to do.*

**Full lock** (default at session start): No movement, no arm gestures, complete stillness. Arm/gesture inputs intercepted. Equivalent to a strict hogtie as a suggestion, not a physical restraint.

**Rooted** (arms free): Subject cannot move between tiles or exit the room, but can still gesture, emote, and move their arms. A lighter alternative the hypnotist can switch to. Since full lock is already the session default, Rooted does not need to be gated at a different depth tier — both are available from the same point.

Map room note: since most BC bondage items add Slow rather than Freeze, the Tier 2 client-side input intercept is the cleanest way to implement both types without requiring a specific item. The subject physically appears to be a free person who simply isn't moving.

### Drug System

**Delivery mechanism:** BC's crafted item system (players write custom names and descriptions). The add-on scans crafted item descriptions for a `[hypno:x]` tag and triggers the appropriate effect based on both the tag and the interaction type (drink, smoke, inject, etc.). This is the same general approach as LSCG; the `[hypno:]` namespace prevents conflicts if both add-ons are running simultaneously.

**Item types and actions scanned:**
- Cup / drink → `drink` action
- Cigarette → `smoke` action (BC-native item; LSCG does not use this)
- Hypodermic injector / syringe → `inject` action
- Potion / vial → `drink` action

**Effect keywords:**

| Tag | Effect | Natural item pairing |
|-----|--------|---------------------|
| `[hypno:relax]` | Mild inhibition lowering — small susceptibility bump | Drink, cigarette |
| `[hypno:sedate]` | Strong inhibition lowering — significant susceptibility bump | Injection, potion |
| `[hypno:stimulate]` | Inhibition raiser — makes subject harder to hypnotize | Stimulant drink, injection |
| `[hypno:restore]` | Recharges resistance fatigue so subject can fight harder | Tonic, injection |
| `[hypno:extend]` | Prolongs an active trance session slightly | Potion used during a session |

**Two directions:** drugs that lower resistance (raise chemical floor) AND items that boost resistance or recharge fatigue — players can have countermeasures if desired.

**Stacking:** Arousal and drug effects are tracked as separate floor values. The effective chemical floor at any moment is `max(arousalFloor, drugFloor)` — they do not add together. This prevents aroused + drugged from trivially pushing susceptibility near 100.

**Doses vs. distinct items:** two items with distinct identities (mild vs. strong) rather than stacking doses of the same item. Multi-dose works for LSCG's general sedation; for hypnosis specifically, the RP overhead of repeated dosing before the induction starts eats the scene.

Drugs raise or lower the chemical access floor temporarily — see Core Mechanic. They cannot plant persistent suggestions. Need to verify no conflicts with LSCG's own system before implementing.

### Hypnotic Visor / Glasses

**Decided:** an alternative induction method to the H icon — placing the visor/glasses on the subject initiates a session instead of using the menu button. Wearing them provides the same bonus as using an induction script. Does not stack with a script bonus.

---



### Default Hypnosis State Effects

When a subject enters trance, the following effects activate automatically — enabled by default, player-adjustable, gated by whatever trust level the player sets:

| Effect | Default | Implementation notes |
|--------|---------|---------------------|
| **Cannot move** | On | Full lock (Tier 2 input intercept, no physical restraint). Rooted vs. full lock distinction applies. |
| **Cannot speak** | On | Speech intercept — outgoing chat is blocked or replaced with silence. Needs implementation (similar to LSCG's sleep-speech override). At shallow trance: subject can still try to speak but it comes out garbled or empty. At deep trance: fully blocked. |
| **Screen fade** | On | Semi-transparent overlay on BC's canvas — not blind, not black. A soft white or grey veil at ~30% opacity. Dreamlike without cutting off visual context. Implemented as a CSS/canvas overlay in the userscript. Opacity and color player-adjustable. |

All three are intended to be the default "you are hypnotized" experience. Players who want lighter effects can dial them back or disable individually.

### Induction Visual — Spiral Overlay (planned)

An animated spiral drawn as a canvas overlay during the induction attempt — same mechanism as the screen fade. Color reflects the current state of the induction:

| State | Color | Notes |
|-------|-------|-------|
| Subject agreeing / relaxing | Soft blue or lavender | Calm, inviting |
| Subject resisting / fighting | Warm red or amber | Tension, struggle |
| Induction failing / roll poor | Spiral slows or stutters | Visual feedback that it isn't taking hold |

Implementation: canvas 2D overlay, rotating animation, color and speed driven by live induction state. Check BC's VR glasses item for any existing spiral asset worth reusing — if not, draw it independently. Player-adjustable (can disable). Does not appear outside of an active induction attempt.

---

## Triggers

> **Related:** carried suggestions are the *other* kind of persistence and are easy to confuse with
> these — see *Carry-Forward* for the three-way table that separates them. Trigger word visibility
> shipped as a player setting in v0.40.0 ([`CHANGELOG.md`](CHANGELOG.md)); the unbuilt *visibility levels* below are a
> different, larger feature.

- Planted during induction sessions by the hypnotist
- Fire when the trigger word/phrase appears in chat
- **Scope:** who can fire the trigger. Default is **planter only** (the hypnotist who planted it). The hypnotist can propose a wider scope when planting (trust-threshold, per-list, or anyone), but the subject's global scope setting caps what is allowed — a subject whose setting is "planter only" cannot have an "anyone"-scoped trigger planted regardless of what the hypnotist specifies. Subject-authoritative throughout.

  | Scope | Who fires it | Status |
  |-------|-------------|--------|
  | **Planter only** *(default)* | Only the hypnotist who planted it | **Built** (v0.20.0) |
  | **Anyone** | Any player in the room | **Built** — `speakerAllowedByScope()` returns true |
  | **Trust threshold** | Anyone above a configured trust level | *Future work* |
  | **Per-list** | A named set of people | *Future work* — stub in `TRIGGER_SCOPES` returns false |
  | **Owner / Lovers / Whitelist** | BC relationship-based scopes | *Future work* — stubs return false |

  The global scope setting exists in storage (`getTriggerScope()`) and `speakerAllowedByScope()` is wired in `triggers.ts`. Per-trigger scope override (vs. global setting) is a separate piece of work. Global default is a subject setting; individual triggers can be set to a wider scope at plant time, subject to the global cap.
- **Fade over time** if not reinforced — untriggered or un-refreshed suggestions weaken
- Hypnotist must periodically reinforce triggers (brief re-induction) to maintain them
- Creates ongoing relationship mechanic rather than "plant and forget"

### Accidental collateral effect
If other players are in the room during an induction, those with high base suggestibility or existing trust with the hypnotist could be partially pulled in — opt-in setting. Enables group induction and emergent unintended side effects.

---


---

### Detail — **partly built**, v0.20.0–v0.25.0 and v0.60.0


**What shipped:** verbal planting during a session; multiple effects per trigger (cap 8); scope; a flat duration timer; targeted release by name; the phrase hidden from the subject, and optionally the whole setup exchange.

**Also shipped since:** firing your **own** trigger is an explicit opt-in rather than a side effect of your chosen scope (v0.31.0); `/hypno forgettrigger` **refuses while a trigger is holding you** and points at the safeword (v0.32.0) — deleting the thing gripping you is too quiet an escape; and **reinforcement and decay** (v0.60.0), which gives every trigger a strength that fades, holds better the deeper it was planted, and is the depth it fires at.

**What has not:** the three *visibility levels* below (blanked word / blur / blackout) — the subject currently always sees the trigger fire, they just never see the word that planted it. Also unbuilt: the per-trigger hypnotist panel, offline programming, the trust-scaled blackout, ephemeral triggers, activity-fire conditions and wake-on-event. Several rows in the Trigger Effects table below have no suggestion behind them yet — follow, custom text response, remove clothing item, hypnotic induction. Scope is built for *planter only* and *anyone*; the other four scopes are stubs that return false.

### Programming Triggers
- Triggers can only be planted **during an active hypnosis session** — not from a menu while the subject is fully conscious
- Player option (advanced) to relax this restriction and allow offline programming
- Verbal planting during session: immersive, natural language ("when you hear the word X, you will Y")
- Hypnotist panel: precise, reliable fallback for complex or chained triggers

### Trigger Firing Experience (by subject visibility level)
| Level | What the subject experiences |
|-------|------------------------------|
| **Light RP** | Trigger word blanked in chat (LSCG-style), effect fires, subject is aware throughout |
| **Medium** | Screen blur/fade, blackout moment, subject notices aftermath only — not the moment itself |
| **Restricted** | Full silent blackout — no awareness unless they look around and notice the change |

**Blackout duration scales with trust and hypnotist skill:** a deeply trusted, highly skilled hypnotist produces a faster, deeper, cleaner blackout. A new or low-trust hypnotist produces a slower transition — more like a daze than a blackout, subject may be partially aware.

### Trigger Effects
A single trigger can fire **multiple effects simultaneously** (no hard limit planned — LSCG caps at 3, we aim higher). Effects a trigger can produce:

| Effect | Notes |
|--------|-------|
| Hypnotic induction | **Built v0.90.0** as the instant drop: the trigger puts the subject straight into trance, if they allow *Drop triggers*. See *Trigger Overhaul*, decision 10 |
| Arousal increase | **Built v0.27.0** — four named levels, driving BC's own `ActivitySetArousal` |
| Instant orgasm | **Built v0.27.0** — `ActivityOrgasmPrepare` + `ActivityOrgasmStart`, skipping BC's resist window |
| Block orgasm | **Built v0.27.0** — BC's own `DenialMode` effect, so it also stops vibrators and activities |
| Can't touch body part | **Built v0.12.0** — hooks `ActivityRun`, so the activity genuinely never happens (no arousal, no message). Self-touch only, structurally |
| Can ONLY touch body part | *Inverse restriction (not yet built)* — same `ActivityRun` hook but logic reversed: all body parts blocked except the specified one(s). More complex because the allow-list must survive across activity types. |
| Freeze / Full lock | **Built** — the `Freeze` effect |
| Rooted | Can't exit/move, arms still free |
| Follow | Compulsion to follow the trigger speaker |
| Remove clothing item | Gradual or immediate, per consent settings |
| Custom text response | **Built (Build 5, inside v0.90.0)** — "you will say 'I obey' three times". Needs *Made to Speak*; sent through BC's own chat path so a gag garbles it |
| Silence | **Built v0.10.0** — hooks `ChatRoomSendChatMessage`, so emotes, whispers and the safeword survive |
| Any other session suggestion | Triggers can call any effect a live suggestion can produce |
| **Wake** | Trigger effect that fires the normal wake flow — used with activity-fire triggers to wake on orgasm, touch, etc. |

### Trigger Expiry
- Triggers fade naturally via the reinforcement/decay system (see Triggers section above)
- Optional: hypnotist can set a hard expiry on a trigger — fires only N times, or disappears after X hours
- This is an interesting design space; needs further research into whether it adds meaningful gameplay vs. complexity

### Ephemeral Triggers (short-lived, not yet built)

A lighter trigger type that does not use the reinforcement/decay system at all — designed for a single session's worth of play and gone by the next day.

**Rules:**
- Maximum duration: ~2 hours from the moment of planting
- **Firing does not reinforce** — each use burns through the clock, not back to it
- Arousal or chemical state can extend the duration slightly (exact amount TBD — probably 20–30 min at most)
- Cannot be converted to a persistent trigger after the fact

**Design intent:** lets a hypnotist create responsive in-scene triggers without committing to an ongoing relationship mechanic. Lower trust threshold expected (TBD — likely Yielding or Entranced rather than Deep). The tradeoff is built in: they disappear whether used or not, and the hypnotist gets nothing for maintaining them.

### Wake on Event (not yet built)

A trigger option — or a session-close command — that holds the subject in trance until a specific real event occurs, rather than a timer or an explicit wake command.

**Proposed wake events:**

| Event | Notes |
|-------|-------|
| **Orgasm** | Stay under until BC fires an orgasm event for the subject |
| **Nose boop** | Default LSCG-style; a specific emote or item-use pattern |
| **Finger snap** | Sound/text pattern — hypnotist types a snap emote |
| **Spoken phrase** | A specific word or phrase the hypnotist says out loud |
| **Room entry** | Subject wakes when they enter a specific room (or any room change) |
| **Time limit** | Fallback: if no event fires within N minutes, wake anyway |

The time-limit fallback should probably always be on unless the subject has extreme-subject-level enabled — an indefinite "no way to wake" state is a hard limit concern.

**Default wake trigger:** like LSCG's boop/snap, there should be a default signal that any trusted hypnotist (or the subject themselves) can use to snap someone out. Proposed default: nose boop emote or `*snap*`. Subject-configurable. **Decision needed** before coding: should the default be boop, snap, or offer both as aliases?

**Subject awareness:** in walking trance the subject is ambulatory and aware of the condition; in a held trance they may or may not know what they are waiting for, depending on their visibility level setting.

#### Activity-fire triggers and wake suppression (decided 2026-09-08)

A trigger can use an **activity as its fire condition** instead of a spoken word — "when [activity] happens to the subject, fire this trigger." The wake effect becomes one of the possible trigger effects, so a hypnotist can plant a trigger that says "orgasm wakes you" or "being touched on the head wakes you." ~~This is a new fire-condition type; word-fire and activity-fire hook different systems (chat parser vs. activity hook) so they are separate trigger types in the panel.~~ **Reversed 2026-09-10: a fire-condition on the existing `Trigger`, not a second type.** Scope, strength, decay, reinforcement and the action list are identical whichever way it fires; a separate type would duplicate all of it and then drift. The two intakes are different — chat parser for words, the activity handler for touches — but they feed one record. Code findings and the touch-planting flow are in *Trigger firing — how it works today* below.

**Suppressing the standard wake signal** (boop/snap) is a higher-stakes option: a trigger that says "nothing else wakes you, only this event." This is a soft lock on consciousness and requires:
- **Blank depth** at planting time
- Subject has **extreme subject level** enabled (or a dedicated sub-option of it)

Without both conditions, the override cannot be planted regardless of the hypnotist's experience. The rationale is subject-authoritative: the subject's client decides what wakes it, and consenting to that suppression is a deliberate act, not a side effect of a deep trance.

**The safeword overrides everything.** `/hypno safeword` wakes the subject unconditionally even when a "nothing else wakes you" trigger is active. The hard floor is untouchable by any trigger.

### Trigger firing — how it works today, and the touch version

#### What the add-on currently hears

`ChatRoomMessage` is hooked in `src/main.ts`, but every consumer inside it is gated on
`data.Type === "Chat" || "Whisper"`. **Emotes and activity messages arrive, are logged, and are
ignored.** Neither can fire anything today. Adding touch triggers is a new intake, not an extension.

**Activity messages are cheap and carry everything needed.** `src/suppression.ts` already reads them:
`data.Type === "Activity"` or `metadata.ActivityName` identifies one, `data.Sender` is the actor,
`metadata.TargetMemberNumber` is the target, `metadata.FocusGroup` is the body part. Actor, action,
target, location — structured, and already proven in shipping code.

**Emote-fired triggers — PARKED 2026-09-10, "can be added later".** Activity-fired proceeds alone.
The question preserved so nobody re-derives it: **scanned or understood?** An emote is free prose
with no target field, no activity name and no group. *Understood* means parsing third-person
narration ("*ruffles Missy's hair*"), which is a different grammar from `voice.ts`'s second-person
pattern library and carries a permanent tail of phrasings that miss. *Scanned* means an emote fires a
trigger only by **containing the planted phrase**, reusing `triggersFiredBy()`'s existing
`normalisedText.includes(t.phrase)` unchanged — roughly a ten-line change, because the only new work
is widening the intake in `main.ts`. Scanned is recommended when this unparks.

#### Planting a verbal trigger — what exists now

Patterns from `src/voice.ts`, verbatim:

```
TRIGGER_START:  /your trigger (word|phrase) is (.+)$/    /the trigger (word|phrase) is (.+)$/
                /your (new )?trigger is (.+)$/           /when (i say|you hear) (.+)$/
TRIGGER_COMMIT: /remember (the |this |that )?trigger/    /the trigger is set/   /lock (it |that )?in/
TRIGGER_CANCEL: /(forget|cancel|never mind|nevermind) (the |that |this )?trigger/
```

Gated in `handleTriggerControl()`: mid-trance, from her hypnotist, **and her name in the line**. She
sees `"Something is being set aside in you. You let it happen."`; he sees
`[trigger] RECORDING "<phrase>". Say each suggestion, then "remember trigger" to save.` Each
suggestion recorded returns `"That settles into place, waiting."` to her and
`[trigger] Recorded <id> into "<phrase>" (<n> so far).` to him. Commit gives her
`"It settles somewhere you won't think to look for it."` and him `[trigger] SAVED …`.

#### The touch version — PROPOSED

**Confirmed by DW:** three repetitions inside **60 seconds**.

**New patterns** (proposed, alongside `TRIGGER_START`):

```
/when i do this( three times)?$/        /whenever anyone does this( three times)?$/
```

**The demonstration window.** He says the line; her client opens a **60-second capture window** and
waits for the first qualifying activity *from him, targeting her*. That activity's `ActivityName`
and `FocusGroup` become the trigger's definition — nothing is typed. Recording then proceeds exactly
as the verbal path does, and `remember trigger` commits.

- **Says it, never touches:** window lapses, recording is discarded, he is told
  `[trigger] Nothing was demonstrated, so nothing was recorded.` She is told nothing — the same
  silence `cancelRecording()` already produces when a plant comes to nothing.
- **Touches twice during planting:** the *first* qualifying activity defines it; later ones are
  ignored while recording. Deliberate — a demonstration is one gesture, and repeat-touching is how
  people naturally check something worked.
- **Someone else touches during the window:** ignored. Only `recording.hypnotistId` can define it.

**Scope — and a real architectural snag.** `getTriggerScope()` is a **single global subject setting**
(`src/triggers.ts`, `TRIGGER_SCOPES`), not per-trigger. So "whenever anyone does this" is the
hypnotist asking for something *she* owns. Two ways out, and this needs DW:

1. **Treat his phrasing as a request her setting answers.** "Whenever anyone" only works if her
   global scope already permits others; otherwise it silently plants as installer-only. Zero new
   storage, and subject-authority is untouched.
2. **Add per-trigger scope, capped by her global setting.** More expressive, more storage, and the
   cap is what keeps it honest.

**Firing and counting.** Each qualifying activity checks the actor against `speakerAllowedByScope()`
exactly as words do, then increments a counter **keyed per actor** — so two people booping her once
each never adds to three. The count is in memory only, never persisted: a partial count must not
survive a reload. On the third inside 60 seconds the stored actions run and `noteTriggerFired()`
credits the decay clock identically to a word trigger.

**Escalating flavour on partial counts — DW's call, overruling the silent version.** First touch,
nothing. Second, something like *"You feel a shiver as a thought forms deep in your head."* Third
fires.

> **The tradeoff, stated honestly.** The silent version withheld the fact that a trigger existed at
> all. This tells her. From one second touch she can infer: a trigger is planted, this specific
> gesture is its key, and one more will set it off — which is most of what *Trigger discovery* is
> meant to be a deliberate, depth-gated mechanic for. It also gives her a free warning she could act
> on, by walking away or safewording before the third.
>
> **What it does not damage:** the trigger still fires, scope still holds, decay is unaffected, and
> nothing about consent changes. This is an atmosphere-versus-concealment trade, not a safety one.
>
> **An option that keeps the atmosphere without the leak, offered rather than argued:** make the
> second-touch line **ambiguous and not trigger-specific** — the same shiver text fires on *any*
> unremarkable touch while any trigger is armed, at a low rate. She feels the atmosphere constantly;
> it stops being a reliable signal that she is two-thirds of the way into something. Costs one
> setting and some noise.

### Hypnotist Panel (per trigger)
Fields: trigger word · effect(s) · scope (who can fire it) · strength · last reinforced · decay status · expiry (if set)
Actions: add trigger · reinforce · test fire · remove
- **Test fire button** present during development; may or may not ship in final release

### Who Controls the Subject's Visibility Level
- Subject sets their own level initially (comfortable with loss of control)
- Architect can override and change the level as part of their configuration
- Trust-based automatic progression is a future consideration

### Trigger Discovery (probe mechanic)

A hypnotist who didn't plant a trigger has no automatic knowledge of it. Discovery happens through a **probe** during an active session — the subject "answers" involuntarily as an emote, not consciously. The trigger word never appears in the response; only the effect or a vague sensation surfaces.

Gated by trance depth at time of probe:

| Depth | What surfaces |
|-------|--------------|
| Drifting | Subject stirs slightly, nothing surfaces |
| Yielding | A vague sense that something is there — no details |
| Entranced | Number of triggers and their effects, but not the words that fire them |
| Deep | Effect plus a vague hint about what kind of word fires it |
| Blank | Full revelation — effect and trigger word |

Subject's visibility level also applies: on Restricted, the subject is unaware they just revealed anything.

### Trigger Removal by Another Hypnotist

A trigger can only be removed by the hypnotist who planted it, or by someone who achieves a depth **at or above the level the trigger was planted at**. To *override* (replace rather than remove), the new hypnotist needs a depth level *above* the planting depth.

This creates natural protection: a trigger planted at Deep is resistant to anyone who can only reach Yielding. A trigger planted at Blank is effectively protected from all but the most trusted and skilled hypnotists.

The subject's architect always has removal rights regardless of depth.

### Trigger Reinforcement and Decay — **built v0.60.0**

The shape is the one designed here, unchanged: the clock runs from the last reinforcement, a
re-induction by the installer resets it, firing only slows it, and a trigger planted deep decays
more slowly than one planted shallow.

**Strength is derived, never stored.** The stored fields are `plantedDepth`, `reinforcedAt`,
`firings` and `plantedChemical`; `triggerStrength()` computes the current number on read. This is
the same lazy-decay pattern trust already used, and it is the reason nothing has to be scheduled:
there is no moment the add-on is guaranteed to be running, and a trigger must keep fading while
the game is closed. It also means retuning any constant below moves every trigger already planted,
not just new ones.

**A trigger's strength IS its effective depth when it fires.** It is on the same 0–100 scale as
trance depth, and `fireTrigger` gates each action against the *trigger's* strength rather than the
session's — a trigger fires outside a trance, where session depth is zero by definition. So a Deep
trigger faded to 45 reaches only what Yielding reaches: its shallow actions still land and its
deeper ones stop.

**Retuned in v0.62.0, by roughly twentyfold.** The first numbers were chosen to feel
conservative and were simply wrong — "Very fast" gave a Blank-planted trigger twenty-one days,
which is not a fast anything, and DW read the whole dial as sitting two positions off. The scale
is now built around one sentence: *very fast should be a few hours, and about a day for something
planted at the top.* Here is what each setting means in time — planted now, never fired, never
reinforced, gone by:

| Planted at | Very slow | Slow | Typical | Fast | Very fast |
|---|---|---|---|---|---|
| Drifting (10) | 1.8d | 15h | 6h | 3h | **1h** |
| Yielding (20) | 3.9d | 1.5d | 14h | 7h | **2h** |
| Entranced (40) | 8.4d | 3.5d | 1.5d | 17h | **5h** |
| **Deep (60)** | **14.7d** | **6.7d** | **3.1d** | **1.5d** | **12h** |
| Blank (80) | 23.7d | 11.6d | 5.7d | 2.9d | **24h** |

Deep is the row that matters — it is the tier planting requires by default, so it is the one a
player actually meets. Each step is about half the one before, which is what makes five positions
worth having rather than three usable ones and a pair nobody would pick. Underneath, the rates are
5 / 15 / 40 / 90 / 300 points per day before the tier discount, and **Never** is still 0 and still
the default.

Because a name cannot be checked and a duration can, the Triggers tab now prints the current
setting's cost under the dropdown, and `/hypno triggerdecay` says it too: *"a Deep planting fades
away in about 3.1 days, unused and unreinforced."* The old dial was misleading precisely because
"Very fast" told nobody it meant three weeks.

**The tier discount** multiplies that loss — Drifting ×1, Yielding ×0.8, Entranced ×0.6, Deep ×0.4,
Blank ×0.25. Harder to plant, harder to lose.

**Neglect compounds (v0.62.0).** The loss is `rate × days × (1 + days/14)`, not `rate × days`, so a
trigger left alone sheds points faster the longer it is left alone. Two days of neglect cost more
than twice one day's.

The shape was chosen against the obvious alternative. A true exponential *decelerates* — a fast
initial drop and then a long thin tail that never quite reaches zero. That is a fair model of human
forgetting and the wrong model for this mechanic: it leaves every neglected trigger loitering at
strength 4 indefinitely, which is plant-and-forget wearing a different hat. Decay exists to create
an ongoing relationship mechanic, and what creates one is a deadline.

It also earns its keep somewhere counter-intuitive. At the fast settings it changes nothing
measurable, because the trigger is gone in hours long before fourteen days of compounding mean
anything. It matters at the **slow** end, where a straight line runs away: Blank at *Very slow*
would be 64 days linear against 24 here. Without the acceleration the two slowest settings are
indistinguishable from Never for any relationship that has a pause in it.

**Firing buys back time, it does not reset the clock.** Each firing credits **6% of that trigger's
own lifetime**, capped at **50%** — a fraction rather than a fixed number of days, because
lifetimes now run from forty minutes to a month and a flat quarter-day would be a rounding error
at one end of the dial and immortality at the other. The cap is the point: without it, a trigger
fired often enough would never decay at all. Steady use buys about half again as long; only a
re-induction brings it back.

**Reinforcement** is the phrase *"that trigger holds"* (and its variants) spoken by the installer
**during a live session** with the subject. The session requirement is what makes it a re-induction
rather than a magic word any hypnotist could say in passing to keep their work alive forever. It
refreshes everything that hypnotist planted rather than one named trigger — they are re-establishing
the whole of their work, and singling one out would mean saying the trigger word aloud in front of
the subject.

**Below 10, a trigger is a ghost:** it fires flavour and nothing else, the vague pull this section
always described. At 0 it is pruned from storage on the next read — *unless it is currently holding
the subject*, in which case it is spared until it lets go. Dropping a trigger mid-grip would leave
the effect applied with nothing left to release it, which is the stranded-effect bug this codebase
has now fixed twice.

**Chemically seeded triggers decay faster (decided 2026-09-08).** A trigger planted on a
chemically-elevated floor uses a fixed **150** points a day, ignoring both the rate setting and the
tier discount — between *Fast* and *Very fast*, and with no tier hold at all, so one bought with
arousal at Deep is gone in about nine hours where an earned one at the same tier and setting would
have days. The tradeoff for the chemical shortcut is a shorter shelf life and it cannot be configured
away — a rate the subject could turn down would make the tradeoff decorative. Carry-forward follows
the same rule when it ships.

> **This half is plumbing, not yet live.** `plantedChemical` is computed and stored on every
> trigger, and the fast rate is wired — but `triggerControl` is still `earnedOnly`, so chemical
> depth cannot reach a plant at all and the flag is always false today. It goes live the moment the
> earned-only toggle ships, which is the sequencing constraint recorded under *Feature Depth
> Requirements*.

**Where it surfaces:** `/hypno triggers` shows each trigger's strength and the tier it still
reaches ("45/80 — reaches Yielding", "a vague pull only (6)", "faded away"); the rate is a dropdown
on the Triggers settings tab and `/hypno triggerdecay <rate>`.

**Still designed, not built:** the resistance mini-game on a weak trigger. A decayed trigger can
invoke it — consistent with how LSCG uses mini-games for chemicals and sleep — and whether it does
is a subject setting. The mini-game itself does not exist yet.

### Extreme Subject Level

An opt-in subject configuration equivalent to BC's "extreme" difficulty setting — for players who want to genuinely and durably commit to a deep hypnosis state.

**What it locks:**
- Trigger removal requires Blank depth, or architect only
- Settings changes locked or gated behind high depth requirements
- Trigger decay disabled or near-zero
- Visibility level defaults to Restricted
- **Time gate:** subject cannot return to lower subject levels for a configured period (hours to days). Set during wizard setup.

**What it does not change:**
- `/hypno safeword` always works — the hard floor is untouchable even here
- Architect can still adjust within the locked configuration

Primarily configured through the setup wizard. Makes the wizard important before this feature reaches testers, since it's the natural place to set the time gate duration and scope.

### Physically Impossible Actions (bondage conflict)

When a trigger or suggestion fires an action the subject physically cannot perform due to existing BC bondage, the add-on needs to handle it gracefully without duplicating BC's own messages.

**Approach:** check feasibility before passing the action to BC. If bondage prevents it:
- Emit a single RP-flavored message visible to the room (not a system error)
- Do not pass the action to BC — no attempt is made, so BC emits nothing
- If we do pass to BC and BC blocks it, BC's message handles it; we stay silent

**Message style:** passive, RP-flavored, context-aware. Examples:
- Arms bound: "*[Name] strains against her restraints, unable to reach*"
- Kneeling blocked: "*[Name] shifts her weight, unable to kneel*"
- General: "*[Name] tries to comply but cannot*"

**Deduplication rule:** our message fires only when *we* block the action. If BC sees it first and rejects it, BC's message stands alone.

**Feasibility checks needed (incomplete list):**
- Remove clothing / self-touch → check arms/hands free
- Kneel / stand → check legs/posture not locked by restraints
- Follow → check movement not frozen

The full list depends on which suggestions and trigger effects are built. Add checks as each action is implemented.

---

## Carry-Forward (detail) — **built**, v0.28.0–v0.29.0

The third kind of persistence, and it did not exist in this doc before — it came out of a mid-session question of DW's rather than the plan. The set is now:

| | Lives for | Fires when |
|---|---|---|
| **Suggestion** | the session | said, during a trance |
| **Trigger** | until deleted | someone says its word, any time |
| **Carried suggestion** | the effect duration | never again — it is simply still true after waking |

**Wording.** Give the suggestion, then say it stays. `"Missy, that will stay with you"` keeps the one just given; said again after another, it keeps that too. `"all of this stays with you"` takes everything currently in force. `"forget what I said"` takes it back.

**Gates.** Its own permission (*Suggestions that outlive the trance*), plus relationship trust 65 — same as a trigger, since both outlive the session and neither may be reached by the arousal floor. Capped at 8.

**Trance defaults can never be carried.** They are applied directly by `applyTranceState` and never enter the tracker the phrase reads from, so a subject always gets their movement and their voice back on waking. Making one of those durable takes saying it out loud as a suggestion first, which is the deliberateness it should require.

**Getting out**: the effect duration, the carrier speaking the ordinary release wording (which works outside a trance *only* while they still hold something), or the safeword, which takes everything unconditionally.

**Implementation note worth keeping.** Carried effects are re-applied *after* the session's total clear, not exempted from it — `endSession` clearing everything in one place is what guarantees a trance can never strand an effect, and carving exceptions into it would put that guarantee at the mercy of this feature. The one exception is the clothing illusion, which cannot be rebuilt afterwards: re-freezing at the moment of waking would snapshot the truth.

---

## Perception / Illusion Features (detail)

> **Related:** both illusions are gated on relationship trust alone and may never be reached by the
> arousal floor — see *Core Mechanic* and the `depthEarned` rule in *Trance Depth as the Feature
> Gate*. Consent granularity is in *Clothing & Bondage Consent Interfaces*.

### Clothing Confusion — **built**, v0.11.0 / v0.28.0 / v0.29.0
Targets the subject's information environment — not their actual state.

- ~~**Suppress BC clothing messages**~~ — done. Answers to *Awareness > Clothing Changes*, independently of the rendering below.
- ~~**Block wardrobe access**~~ — done via BC's native `BlockWardrobe`, and since v0.34.0 it says so when you try rather than refusing in silence.
- ~~**Client-side rendering**~~ — done as a **freeze-frame**: the subject keeps seeing what they had on when it took hold, rather than an arbitrary substitution. Room view only; the wardrobe and item menus still show the truth, which was a deliberate scope call.
- Others in the room see reality; the subject's own perception is the target
- Result: the whole room can see the subject is naked while the subject genuinely doesn't know

#### Reverse Illusion — "Naked when dressed" (planned)
Make a subject believe they are undressed (or partly undressed) when they are actually clothed. Two implementation options:

**Option A — Naked shadow overlay (preferred long-term).** The bondage illusion already renders a shadow character on top of the real one. That same machinery can render a "bare" version of the subject instead of a frozen snapshot — hypnotist applies the illusion, no stripping required. BC's clothing is slot-based, so the illusion can target specific slots: fully naked (all slots cleared), topless only, bottomless only, or any combination. This is the right long-term approach.

**Option B — Automated strip/freeze/restore command (faster to build).** A single hypnotist command that saves the subject's current outfit, strips them, freezes the illusion, then restores the outfit automatically. One action; all complexity hidden. Easier to implement than Option A but less flexible.

Either option supports **partial undress** — since clothing is slot-based, the illusion can be scoped to specific body regions rather than all or nothing.

#### Room Change Persistence — **tested 2026-09-01, and the worry was wrong**

The concern here was that BC refreshes character appearance from the server on every room
transition, so the frozen snapshot would be overwritten and the illusion would break on room
entry. DW tested it: **it holds, with no flash at all.**

The reason is worth keeping, because it also says which cases *are* affected. The illusion is
local JS state — the frozen array and the shadow character live in `illusion.ts` — and a room
change does not reload the page, so that state survives untouched. BC does refresh
`Player.Appearance`, but `rebuildIfStale()` only ever rebuilds the LIVE half of the shadow
(body, face, pose); the frozen clothes are a separate cloned array it never consults. So a
room change cannot disturb them.

**A page reload is the different case,** and the only one. There the module state genuinely is
gone, and recovery cannot run until login and the room exist — so the true appearance draws in
the gap. DW saw exactly that: a brief flash of the real body, then the illusion returning, and
judged it acceptable since BC does the same thing on its own while assets load.

Half that gap is BC loading and is not ours. The other half was the startup poll noticing, and
was cut from 1s to 250ms in v0.46.2, which is a frame or two rather than up to a second.

**The dissociation effect is therefore optional rather than needed.** It was proposed as cover
for an unavoidable seam; the seam turns out to be avoidable on room change and small on
reload. It remains a good idea on its own merits — a moment of blur as perception settles is
a nice thing for the subject to feel — but it is now a feature rather than a patch, and should
be judged as one.

#### Self-undress breaking the illusion *(lower priority — design only, not yet built)*

When the subject removes their own clothing while the illusion is active, the reality of feeling clothes come off contradicts what they're seeing. Whether this breaks the illusion depends on two existing settings:

- **Clothing awareness suppressed** — the subject doesn't register the change. The illusion holds cleanly; no roll needed. The two features work together by design.
- **Clothing awareness active** — a reality-check roll fires. Chance of breaking is weighted by trance depth: at Blank, dissociation is deep enough that contradictions don't land; at Drifting, undressing yourself is likely enough to snap through. A partial break (illusion weakens rather than shatters, firing at reduced effective depth) mirrors the decayed-trigger behavior.

**The reverse illusion flips the flavor.** A subject who believes they are already naked and then receives an undress trigger would experience confusion rather than a snap — "I thought I was already bare?" This is probably RP flavor text rather than a mechanical break, and is worth handling separately.

The general principle: "always breaks" is wrong (genuine dissociation is real), and "never breaks" is also wrong. Depth and awareness suppression are what determine which side you're on.

### Bondage Illusion
Two approaches:

**Tier 1 (physical):** Apply BC Freeze effect. Real movement lock, works without subject's add-on. Visible to others — they see a frozen character. Blunt but effective.

**Tier 2 (mental — preferred):** No physical restraints applied. Subject's client:
- Suppresses inventory and wardrobe interaction
- Renders ghost restraints client-side (cuffs, rope that only they see)
- Suppresses any messages that would reveal the truth

Result: subject believes they are bound; to everyone else they look like a free person standing still. The suggestion is what holds them, not the restraints. The disconnect between the subject's experience and observable reality is a feature, not a bug.

---

## Word-Level Control (detail) — approved to spec, 2026-09-10

> **Related:** set as trigger actions, so *Triggers* governs scope, depth and decay; the
> incoming half sits beside awareness suppression (*Feature List*, *Player Settings*); the
> exits it must not touch are in *Control & Reset* and *Hard Limits*.

Three features, each its own setting. **Where they sit:**

| Feature | Pipeline position | What she experiences |
|---|---|---|
| **Words she cannot hear** | Incoming, alongside `src/suppression.ts`'s `ChatRoomRegisterMessageHandler` | The word is blanked or the line is dropped as she reads the room |
| **Words she cannot say** | Outgoing, the existing `ChatRoomSendChatMessage` hook in `src/main.ts` that already does speech blocking | Her message is refused or the word is stripped before it sends |
| **A word required in every message** | Same outgoing hook, test inverted | Messages without it do not send |

The hooks all exist. Suppression already blanks by category; this blanks by string. Speech blocking
already refuses wholesale; this refuses conditionally. **None of the three needs new plumbing.**

**How he sets one:** as trigger actions, recorded into a trigger like any other suggestion — which
means they inherit scope, depth gating, decay and reinforcement for free.

**⚠ The consent shape is genuinely different, and this is the part to decide before building.**
Every existing permission is per-*effect*: "may someone stop me moving." These are per-*word*, and
the word is chosen later, by someone else. "Yes, you may take words from me" cannot be reviewed in
advance the way "yes, you may freeze me" can. Options worth weighing: a count cap (no more than N
words at once), or requiring the words be shown to her at planting time.

### ⚠ Exit-path audit — 2026-09-10

**Her ability to *type* the safeword is not at risk. Corrected — the earlier "reserved word list"
framing was wrong.** `/hypno safeword` is a slash command, not speech. BC's `CommandParse` runs
before `ChatRoomSendChatMessage`, which is where the speech block lives and where both outgoing
word rules would live (`src/main.ts`). A word rule on outgoing speech cannot reach a command, for
exactly the same structural reason silence cannot.

**Implementation constraint that follows, and it is not optional.** Both outgoing rules —
*cannot say* and *must include* — **must be implemented in the `ChatRoomSendChatMessage` hook, never
in `ChatRoomSendChat`.** The latter runs *before* command parsing, and a required-word test placed
there would demand she append a word to `/hypno safeword` before it would send. The exit would be
damaged without anything looking broken. Same hook as speech blocking, same reason, and it should be
asserted in the tests rather than trusted to a comment.

**But the incoming filter is a real risk, and this is where a safeguard survives.**

Her safeword confirmation reaches her through `notify()` → `tellPlayer()` → `ChatRoomSendLocal`
(`src/session.ts`, `src/notify.ts`), which puts it into the same message pipeline a per-word incoming
filter would sit in. The strings it would be filtering:

- `"Safeword. Trance cleared, all effects released, everything back under your control."`
- `"Hypnosis disabled. Trance cleared and every effect released."` (`hardFloorStop()`)
- `"Trance ended and every effect released. Settings reset to defaults."` (Known Bug #4 fix)
- `"Missy has asked to stop. Release in 5 minutes."` (extreme mode's room announcement)

A hypnotist who makes **"stop"**, **"wake"**, **"release"** or **"clear"** unhearable — all entirely
plausible choices, not contrived ones — blanks her own confirmation that the exit worked. She types
the safeword, it works, and she sees nothing. That is precisely the failure the project's rule #5
exists to prevent: *a silent success is indistinguishable from a silent failure.*

**It inherits no protection from what already exists.** `classify()` in `src/suppression.ts` is safe
only because it matches on message *type* and its `ACTION_TAGS` list has one entry — the comment's
promise that "anything safeword-, leash- or room-related stays off it" describes a curated list, not
a mechanism. A filter matching on text content is a new path and inherits none of it.

**So the safeguard survives, narrowed as DW framed it — protecting the messages, not the keyboard.
And it should be by ORIGIN, not by word list**, which is stronger than the thing it replaces:

> **Any message the add-on itself generated is never subject to the incoming word filter.**
> Everything routed through `tellPlayer()` / `tellRoom()` (`src/notify.ts`) is exempt, as are BC's
> own safeword actions (`ActionActivateSafewordRevert`, `ActionActivateSafewordReleaseAll`).

An origin exemption does not depend on predicting which words matter, and it stays correct when the
flavour text is reworded — which it is due for (the flavour pass is still outstanding). A literal
word list would have to be revisited every time a string changes, and would fail silently when
somebody forgot.

**Proposed tab: Awareness** for "cannot hear", since that tab already means *what you can be made
not to notice*. The two speech ones belong on **Permissions** beside Speech Restriction, because
they are things done *to* her expression rather than to her perception.

---

## Trigger Phrase Uniqueness and Override — decided 2026-09-16

> **DW's decision.** A trigger phrase is **unique per subject**. Two people cannot both hold
> "sleepy time" on Missy. A hypnotist who names an existing phrase either overrides it or is refused;
> one who names a phrase that merely *overlaps* an existing one is always refused.
>
> **Status: fully settled as of 2026-09-16.** Every question this raised has an answer below — the
> collision test, the two override branches, the holding-trigger refusal, history, what she sees, the
> rename flow, the disclosure shape, the rate limit and the minimum length. Superseded wording is
> struck in place rather than removed. The only outstanding items are listed at the end.

### The rules, settled

A phrase collides if it is **exactly equal to**, **contains**, or **is contained by** an existing
phrase on this subject. What happens then depends on which kind of collision it is:

| Collision | Who is planting | Outcome |
|---|---|---|
| **Exact** | The original installer | **Override** — always, **even at a shallower depth** than the original planting |
| **Exact** | Anyone else | **Override** only when their current **earned** depth exceeds the existing trigger's stored `plantedDepth`; otherwise refused |
| **Containment** | Anyone, including the original installer | **Always refused. There is no entitlement path.** |
| Any | Anyone | **Refused outright** while the conflicting trigger is currently **holding her** |

**Why the installer asymmetry.** Re-planting your own word is maintenance, not conquest — a hypnotist
correcting a trigger they built should not have to re-earn the depth to do it. Taking somebody else's
word away from them is a different act and should cost more than they paid.

**Why containment never overrides.** Override means *"he named the word that exists."* In a
containment collision he named something else, and overriding would silently destroy a trigger he
never mentioned and cannot see. Entitlement does not apply because there is nothing he has claimed a
right to. This also closes the disclosure hole — see below.

**Minimum phrase length is 6.** A phrase is meant to be a phrase, and under the containment rule
anything shorter poisons too much ordinary speech: at the old minimum of 3, a trigger "cat" would
block *"catch your breath"*, *"delicate"* and *"scatter"*. Those blocks are *correct* — all of them
would fire it — which is exactly why the floor has to rise rather than the rule bend. Six is also the
shortest phrase any existing fixture uses (`"sleepy"`), so the suites and the bot scenarios are
unaffected. Plant-time refusals should say what the minimum is; it is not sensitive.

### Existing data at the new minimum: grandfather, do not invalidate

**Nothing is at risk today.** `normalise()` does not read `phrase` at all — it back-fills
`plantedDepth`, `plantedChemical`, `reinforcedAt` and `firings` and touches nothing else. So raising
the constant cannot retroactively affect stored data unless somebody *adds* a length check to the
migration path.

**Do not add one.** The new minimum belongs in `beginRecording()` — the plant path — and nowhere
else. A stored phrase shorter than 6 keeps working: it fires, it decays, it can be reinforced,
released and deleted exactly as before.

**Why grandfathering is right here, against the house precedent that points the other way.**
`normalise()` *does* delete invalid enum values (`skillHonour`), so that the code default keeps
governing. That reasoning does not transfer: an invalid rung has a safe substitute — the default — and
a too-short phrase has none. Deleting it destroys a trigger somebody planted under rules that were
valid when they planted it, and the subject may have been reinforcing it for weeks. **Retroactively
deleting a working trigger is a worse outcome than a temporary inconsistency**, and the
inconsistency is self-clearing: the old phrase cannot be re-planted at its current length, so it
disappears the first time anyone replaces or forgets it.

The one live consequence to note: a grandfathered short phrase **still blocks by containment**, so a
legacy `"cat"` will keep refusing longer phrases. That is correct — it would still fire on them — and
it is a reason to mention the minimum in the refusal, not a reason to purge the record.

### The comparison basis: `plantedDepth`, not `strength`

Both are numbers on the same 0–100 scale, so both are *comparable*; they are not equally *good*.

**Settled: compare the challenger's current earned depth against the stored `plantedDepth`.** Apples
to apples — `plantedDepth` is itself recorded as `currentDepthEarned()` (except in the chemical
case), and planting is gated on earned depth, so the challenger's earned depth is the right side of
the comparison.

**Why not `strength`.** It decays, so an old neglected trigger becomes progressively easier to take.
That has a certain logic — *the word faded, someone stronger claimed it* — but it turns theft into a
**waiting game**: sit out a rival's decay and take their word at a depth they would never have
allowed. Worse, it is unpredictable to both parties, because neither can see the other's numbers.

**And the case it was meant to serve is already handled.** `pruneFadedTriggers()` deletes any trigger
whose strength reaches zero, on every list read. So a genuinely dead trigger's phrase **frees itself
naturally** — no override needed, no rule required. Decay already does this job.

Note also that trigger decay is **off by default**, so for most installs `strength === plantedDepth`
permanently and the two rules are indistinguishable. Choosing the one that behaves better when decay
*is* on costs nothing.

### ⚠ Normalisation — and exact equality is not enough

Phrases are already normalised on the way in: `parseTriggerControl` runs `normalize()` (lowercase,
contractions expanded, punctuation folded) and `cleanPhrase()` strips the subject's own names. So
"Sleepy Time" and "sleepy time" are already the same stored string, and uniqueness on `===` gets
case and punctuation for free. **Use the stored form; do not re-normalise or compare raw input.**

**But exact equality does not deliver what the decision asks for.** `triggersFiredBy()` matches with
`normalisedText.includes(t.phrase)` — a **substring** test. So:

> Alice plants **"sleep"**. Bob plants **"sleepy time"** — no exact collision, so it is allowed.
> Anyone saying *"sleepy time"* now fires **both triggers**. Two people effectively hold the same
> word, which is the thing the decision exists to prevent.

**Containment counts as collision** (decided, stated in the rules table above). Comparison is on the
**stored** normalised form, both sides — do not re-normalise, and do not compare raw input.

~~The refusal wording should say which way round it is (*"'sleep' is already in use and your phrase
contains it"*).~~ — **withdrawn, and it was a bad suggestion.** See the disclosure section below: that
wording hands the challenger somebody else's trigger phrase. The clarity it buys is also worth very
little, because **the remedy is identical either way** — pick a different word. Knowing whether his
phrase was too long or too short does not help him choose the next one.

### ⚠ The collision message is an information leak — and containment amplifies it

**This is the part to get right.** An *exact* refusal tells the challenger only that the word he just
typed is taken; he already knew the word, so nothing escapes. A *containment* refusal is different in
kind:

> Bob tries **"sleepy time"**, is refused because Alice planted **"sleep"** — and Bob has now learned
> one of Missy's trigger phrases that he never guessed.

Trigger phrases are hidden from **the subject herself** by default (`showTriggerWords`). They are
emphatically not meant to be readable by a third party.

**And it is probeable, which is the real problem.** Exact matching already permits a limited oracle —
guess a word, read the refusal, confirm. Containment turns that from *confirming a guess* into
**discovery**: probe with a long ordinary sentence, and a refusal means some substring of it is a
trigger; then bisect down to the exact phrase. One long probe covers an enormous phrase space, and
`MIN_PHRASE_LENGTH` bounds how far the bisection has to run.

#### The residual: silence alone does not fix this

Worth stating plainly rather than assuming the wording carries the defence. **A refusal is one bit,
and with containment one bit is enough** — bisection extracts the phrase from yes/no answers alone.
So an uncharacterised refusal fixes the *accidental* leak (Bob learning "sleep" without trying) and
barely dents the *deliberate* one.

**What actually bounds the threat is who can attempt at all.** `handleTriggerControl` requires a live
session with her, and `beginRecording` requires `hypnoEnabled`, the `triggerControl` permission, and
Deep depth **on earned trust**. A prober is therefore not a stranger in the room — it is someone she
has granted persistent-trigger permission to and taken deeply under. That is a high bar and it is
most of the actual defence.

The realistic threat is narrow and worth naming: **her regular hypnotist mapping a rival's triggers.**
Everything below is aimed at that, not at outsiders.

#### The disclosure shape, settled

**1. Containment collisions always refuse, and never override.** Decided 2026-09-16 and stated in the
rules table above; repeated here because it is half the disclosure defence, not only a fairness rule.
It removes the branch in which a challenger could act on a phrase he never named.

**2. The default refusal is uncharacterised.** No phrase, no direction, no planter, no depth, no
count. Something in the register of:

> `[trigger] Refused — that phrase is too close to something already set aside in her. Choose a
> different, more distinctive word.`

**3. Exact collision where he is entitled to override → there is no refusal**, so the question does
not arise. He named the word, he takes it, he learns nothing he did not supply.

**4. Exact collision where he is NOT entitled → refuse without the number.**
*"You are not deep enough with her to take that word."* **Never state the threshold**, which would
leak another hypnotist's `plantedDepth`. He still learns one bit — their planting depth exceeds his
current depth — which is unavoidable if the rule exists at all, and bounding it further would take
repeated re-inductions at depths he cannot choose. Accepted residual; not worth solving.

**5. Exception — name it when the conflict is his own trigger.** No leak: it is his word, planted by
him. And it is the case where detail is genuinely useful: *"your own 'sleep' already covers this."*
This is the one branch that should be chatty.

**6. Rate-limit collision refusals.** This is the only measure that attacks the oracle rather than the
wording. A small per-session cap, after which further collisions return a flat *"too many attempts;
try again later"* and stop distinguishing. Bisection needs many queries; capping queries is what
makes it impractical.

**Never, in any branch: the conflicting phrase** (except 5), **who planted it**, **its planting
depth**, or **how many triggers she has.** The success message after an override must be identical
whether he overwrote his own trigger or somebody else's — otherwise success itself becomes the
oracle.

**Offered, not recommended: tell her.** A subject-side line when someone repeatedly trips collisions
has some appeal — it is her data being probed. It is not recommended now, because it would disclose
to her that a trigger exists at all, which the default `showTriggerWords: false` deliberately does
not. Worth revisiting alongside *Trigger Discovery*, which is the mechanic meant to own that
question.

#### The rest of the flow, checked for the same problem

- **The subject's override line** — atmosphere only, no phrase, no planter. Already right.
- **Attribution** stays where it belongs: `/hypno triggers` shows `by <installedByName>` **to her**,
  and nothing shows it to the challenger.
- **The preserved-recording collision at commit** leaks nothing extra — he has already narrated the
  actions, and the message names his own phrase back to him, not the conflicting one.
- **`/hypno triggers full`** is room-gated testing only and is not a disclosure path in play.

### What is still open on this feature

Three, and none of them block building it:

1. **The rate-limit numbers** — how many collision refusals per session before it goes flat, and
   whether "later" means a cooldown or the end of the session. The mechanism is decided; the dials
   are not. Pick them in play.
2. **Telling her when someone is probing** — offered above, not recommended now, parked against
   *Trigger Discovery*. Needs DW only if he wants it sooner.
3. **Per-trigger scope** (item 2 of the schema section) is still recorded two different ways
   elsewhere in this document. It does not interact with uniqueness — scope is a property of one
   record — but it is the one unresolved thing the same schema pass touches.

Everything else in this section is decided. The exact wording of the refusal strings and of her
displacement line is drafting, not design, and should follow the house register rather than be
copied verbatim from here.

### ⚠ Refuse the override while the existing trigger is holding her

If the trigger being overridden is currently **in effect**, overriding it would replace the record
while its effects are still applied — stranding them with nothing left to release them. That is the
exact bug class this codebase has fixed twice.

**Settled: refuse, and say so** — the same rule and the same reasoning
`/hypno forgettrigger` already uses (*"you do not get to quietly delete the thing that is holding
you"*). `isTriggerInEffect()` is the check and it already exists. The alternative — running
`undoTrigger()` first — works, but it means a stranger's plant silently releases effects she is
currently under, which is a surprising side effect for the hypnotist and for her.

### History: a fresh record

The overriding trigger is a **new trigger that reuses a word**, not a continuation. So:
`installedAt`, `reinforcedAt` and `firings` reset; `installedBy`, `installedByName`, `plantedDepth`
and `plantedChemical` are the new planter's. Nothing is inherited.

Inheriting would be worse in an obvious way: a stranger's trigger would arrive pre-strengthened by
**the previous hypnotist's** weeks of reinforcement, which is somebody else's work.

**Say plainly what this costs her, because it is not nothing.** A subject who reinforced a trigger for
weeks loses all of that strength the moment it is overridden. The word survives; the thing behind it
does not. That is the single strongest argument for telling her something happened.

### What she experiences

The convention holds — **atmosphere, never the phrase**. But an override is a genuinely notable
event: something she has been carrying, possibly planted by someone else entirely, has just been
displaced.

**Settled: a distinct line, conveying displacement without detail.** Something in the register
of *"Something already set aside in you comes loose, and something else settles into the space."*
She learns that a replacement happened; she learns neither the word nor who held it before.

**Attribution is already solved and needs nothing new.** `/hypno triggers` prints `by
<installedByName>` for every trigger, so she can read at her leisure that a trigger is now attributed
to someone else. Atmosphere in the moment, full attribution in the list she can consult whenever she
likes — which is the same split the whole feature already uses.

### The collision flow, and preserving the recording

**Check in both places.** At `beginRecording()`, because that is cheapest and nothing has been
recorded yet; and again at `commitRecording()`, because the window between them is real — another
hypnotist could plant the same phrase while this one is still narrating.

**At the start** — nothing is lost, so this is an ordinary refusal in the existing shape:
`return refuse('[trigger] Refused — "sleepy time" is already in use. Choose another word.')`

**At commit** — the actions must survive. `commitRecording()` gains a third outcome beside *saved*
and *nothing recorded*: **hold the recording open and report the collision.**

> `[trigger] "sleepy time" is already in use and you cannot override it. Say a different trigger
> word to rename this one — the 3 suggestions you recorded are kept.`

**Renaming needs no new grammar.** A `TRIGGER_START` line arriving *while already recording* should
**rename in place, preserving `actions`**. Today `handleTriggerControl` calls `beginRecording()`
again, which replaces `recording` wholesale and **silently discards everything recorded so far** —
a latent wart that this change fixes as a side effect. Saying the start phrase twice should never
have cost you your work.

**Abandoning** is unchanged: *"forget the trigger"* → `cancelRecording()`, which already exists and
already tells her *"Whatever was being set aside comes apart again."*

### No extra permission or depth gate

**Settled: none.** Planting is already gated three ways — the `triggerControl` permission, the
`triggerControl` depth tier against earned depth, and now the override rule itself. A fourth gate
would be consent theatre.

A subject setting — *"others may overwrite my triggers"*, off by default — was considered and is
**not** recommended now: it would make the different-person branch of DW's rule unreachable by
default, which contradicts the decision that was just made. It is worth revisiting under **Extreme
mode**, where "your triggers cannot be taken from whoever planted them" is a coherent thing to want.

### What this does not break

Checked against the open design items:

- **Per-trigger scope** — unaffected. Scope is a property of one record; uniqueness does not touch it.
- **Third-party targets in `act:` actions** — unaffected.
- **Emote-fired triggers (parked)** — unaffected; "scanned" reuses `phrase` unchanged.
- **Nothing in the design ever assumed same-named triggers coexisting.** One *implementation* detail
  permitted it: `saveTrigger()` de-duplicates on `(phrase, installedBy)` (`storage.ts:910`). **That
  must change to de-duplicate on the phrase alone**, or an override by a different installer leaves
  two records with the same phrase — exactly what the decision forbids. This is a required change,
  not an optional one.
- **Touch-fired triggers need their own uniqueness rule**, because they have no phrase. See below.

---

## Trigger Storage — one consolidated schema change (detail), 2026-09-16

> **Why now.** Missy is currently the only person with any planted triggers. Every change to the
> `Trigger` record is free while that is true and becomes a migration the moment alpha testers have
> real triggers on real accounts. This section collects every open design item that would touch the
> record, so the shape changes **once**.

### First, the good news: almost nothing here is breaking

`normalise()` (`storage.ts:467`) is the migration machinery, and it already does exactly this job.
It runs on **load and on import**, so a blob exported from an older build is brought forward on the
way in. The pattern is field-presence back-fill with a reasoned default:

```ts
if (typeof t.plantedDepth !== "number") t.plantedDepth = 60;
if (typeof t.reinforcedAt !== "number") t.reinforcedAt = t.installedAt ?? Date.now();
```

**v0.60.0 is the precedent and it is the same case as this one** — four fields added to `Trigger`,
back-filled in `normalise` with defaults chosen by argument rather than convenience (`plantedDepth`
60 "because planting has always required Deep"; `reinforcedAt` from `installedAt`, *not* now,
because "a trigger planted three weeks ago has not just been reinforced"). Two other house rules
worth keeping: an **invalid enum value is deleted rather than defaulted**, so the code default keeps
governing (`skillHonour`), and **defaults live in code**, so "absent" means "never chose".

So: **an optional field with a sensible default needs one line in `normalise` and no migration.**

**The urgency is therefore not what it looks like.** The risk of waiting is not data loss — it is
**touching the same four call sites over and over**. `timerKey()`, `forgetTrigger()`, `saveTrigger()`
and `describeTriggerList()` all key off `phrase`, and every item below moves at least one of them.
Doing that once is the saving; the migration was never the expensive part.

### Everything open that touches the record

| # | Design item | Status | Needs |
|---|---|---|---|
| 1 | **Identity** — `phrase` is not a key | *resolved by the uniqueness decision; see below* | `key` |
| 2 | **Per-trigger scope**, capped by the global setting | recorded twice, **inconsistently** | `scope?` |
| 3 | **Touch-fired triggers** — "when I do this three times" | proposed, 3-in-60s confirmed | `fireOn`, `activityName`, `focusGroup`, `repeat` |
| 4 | **Third-party targets in `act:` actions** | decided 2026-09-16 | richer action records |
| 5 | **Ephemeral / expiring triggers** | listed, not spec'd | `expiresAt?` |
| 6 | **Emote-fired triggers** | parked 2026-09-10 | nothing — reuses `phrase` |
| 7 | Sensory suppression as trigger actions | unbuilt, undecided | nothing — action ids are strings |

### ⚠ Item 1, revised by the uniqueness decision

**The uniqueness decision (section above) dissolves most of this item, and changes what is left.**

~~`forgetTrigger(phrase)` deleting every trigger sharing a phrase is a live bug.~~ — **no longer a
bug.** Once a phrase is unique per subject there is at most one match, so filtering on the phrase
deletes exactly the right record. `/hypno forgettrigger <n>` resolving an index to a phrase becomes
correct by construction. *(It was a real defect before the decision: two hypnotists both planting
"sleepy time" meant deleting one deleted both.)*

**What the decision creates instead is a required fix in the other direction.** `saveTrigger()`
de-duplicates on **`(phrase, installedBy)`** (`storage.ts:910`) — that pair is what *allowed*
coexistence. Under uniqueness it must de-duplicate on the **phrase alone**, or an override by a
different installer leaves two records with the same phrase.

`timerKey()` is `trigger:${installedBy}:${phrase}`, which stays correct; `installedBy` simply becomes
redundant in it. Harmless, and not worth churning.

**So phrase is identity again — for phrase triggers.** Touch-fired triggers still have none, and that
is the only remaining identity problem.

### The consolidated schema

```ts
export interface Trigger {
  /** NEW — the NATURAL key: whatever fires this trigger, and unique per subject.
   *  Phrase triggers: identical to `phrase`.
   *  Activity triggers: `gesture:<ActivityName>:<FocusGroup>`.
   *  Stored rather than computed so deletion and timer keying need no discriminator branch. */
  key: string;

  /** What fires it. Absent means "phrase", so existing records read correctly. */
  fireOn?: "phrase" | "activity";
  /** Phrase triggers only. Stays required for them; empty string for activity triggers. */
  phrase: string;
  /** Activity triggers only — the demonstrated gesture. */
  activityName?: string;
  focusGroup?: string;
  /** Qualifying repetitions needed. Absent = 1. "three times" plants 3. */
  repeat?: number;

  /** Ordered actions. See the note below on why this is the hard one. */
  actions: string[];

  installedBy: number;
  installedByName: string;
  installedAt: number;

  /** NEW — requested scope, always capped by the subject's global setting at fire time.
   *  Absent = follow the global setting, which is exactly today's behaviour. */
  scope?: TriggerScope;

  /** NEW — optional hard expiry, independent of decay. Absent = no expiry. */
  expiresAt?: number;

  plantedDepth: number;
  plantedChemical: boolean;
  reinforcedAt: number;
  firings: number;
}
```

**Field by field:**

| Field | For | Required | Default for existing records |
|---|---|---|---|
| `key` | item 1 | **yes** | `t.key ??= t.phrase` — every existing record is a phrase trigger, so the natural key is already there |
| `fireOn` | item 3 | no | absent ⇒ `"phrase"` |
| `activityName` / `focusGroup` | item 3 | no | absent — meaningless for phrase triggers |
| `repeat` | item 3 | no | absent ⇒ `1` |
| `scope` | item 2 | no | absent ⇒ follow global, i.e. today's behaviour exactly |
| `expiresAt` | item 5 | no | absent ⇒ never expires, i.e. today's behaviour |

`windowMs` is deliberately **not** a field. DW confirmed 60 seconds; a constant in `triggers.ts` is
right until somebody wants it per-trigger, and nobody has asked.

### Item 4 is the one that is genuinely awkward

`actions: string[]` carries parameters by string encoding — `touch:breasts`, `act:Caress:breasts`,
plus the two bare literals `act:genital` and `act:vague`. That already has **inconsistent arity** and
is parsed by `split(":")` with literal-matching in front of it.

A third-party target needs **two** values that a string cannot hold safely: a member number (identity)
and a name (display, and the absent-target message). Encoding `act:Caress:breasts:1234:Elena` works
right up until somebody is called `Bob:Jr`.

**Recommendation — additive, not a rewrite:**

```ts
actions: string[];                      // unchanged, still the ordered list
actionData?: Record<string, {           // keyed by the action id
  targetId?: number;
  targetName?: string;
}>;
```

Existing records have no `actionData` and behave identically. A self-targeted `act:` id has no entry.
Only third-party targets add one. **Nothing has to be re-encoded and no parser changes.**

The alternative — promoting `actions` to `TriggerAction[]` objects — is cleaner on paper and is the
thing I would design from scratch today. It is also the one genuinely **breaking** change here: it
rewrites every stored record, every consumer in `voice.ts` (`fireTrigger`, `undoTrigger`,
`applyActionById`, `undoActionById`), `recordAction`, `commitRecording`, and the display path. If it
is ever going to happen, **now is the only cheap moment** — but it should not be done speculatively
for a Phase 2 feature that is still being designed.

### What is safe to lock in today

Honestly: **three, and only three.**

1. **Uniqueness itself — the `saveTrigger` de-dupe fix, the collision check, and `key`.** The de-dupe
   change is *required* by the decision, not optional. `key` back-fills from `phrase` and costs
   nothing today, but it is what lets phrase-less triggers exist later without revisiting deletion
   and timer keying a second time.
2. **`scope?`.** Its default *is* current behaviour, so adding the field commits to nothing — it can
   sit unread until DW picks option 1 or option 2 below. Zero risk, removes a future migration.
3. **`expiresAt?`.** Same argument: optional, defaults to today's behaviour, costs one line.

**A defensible smaller version:** do the uniqueness work and skip `key` entirely, since phrase *is*
identity now and nothing phrase-less exists. That is honest and it works. It costs a second pass
through `forgetTrigger`, `saveTrigger` and `timerKey` on the day touch triggers land — which is the
same four-call-site churn this whole exercise exists to avoid paying twice.

**Not yet:**

- **Touch-trigger fields** (`fireOn`, `activityName`, `focusGroup`, `repeat`). The shape is settled
  enough that the *names* are safe, but the feature is proposed rather than approved, and adding four
  fields nothing writes is clutter that will be read as intent. Cheap to add when it is built —
  they are all optional.

  **When they do land, uniqueness has to extend to them, and it is a different question.** Two touch
  triggers on the same gesture would both fire on the same touch, exactly as two identical phrases
  would — so `gesture:<ActivityName>:<FocusGroup>` must be unique per subject too, with the same
  override rules. Whether a *gesture* and a *phrase* can collide is moot: different key namespaces,
  different intake. Note there is no substring problem here — a gesture key is a pair of exact
  enum-ish values, not free text, so exact equality is genuinely sufficient for that half.
- **`actionData`.** Waits on the Phase 2 decisions. Adding it now bakes in a shape for a feature that
  is still moving.

**So the pass DW should authorise is small:** one required field with a computed back-fill, two
optional fields that change no behaviour, and a fix to the deletion path. Everything else stays
genuinely free because `normalise()` makes optional fields free.

### Item 2 was recorded two different ways — **resolved 2026-09-25: option 2**, see *Trigger Overhaul*

*Trigger firing* (above) presents per-trigger scope as **option 2 of 2, explicitly "this needs DW"**.
The earlier *Detail* section states it as settled: *"individual triggers can be set to a wider scope
at plant time, subject to the global cap."* Those are not the same claim. **The field is safe to add
either way** — absent means follow the global — but which one is true governs whether anything ever
writes it.

### While the window is open — what I would design differently

Independent of new features:

- ~~**`phrase` does three jobs**: identity, match key, and display.~~ — **the uniqueness decision
  settles this by making the three jobs the same job.** A phrase that is unique per subject *is* a
  legitimate natural key, and "identity is whatever fires it" is a better rule than a synthetic id
  would have been. `key` exists only to extend that rule to things with no phrase.
- **`installedByName` is a snapshot.** Names and nicknames change; a trigger planted a month ago can
  attribute itself to a name that no longer exists. Harmless (display only), but the member number is
  there and could be resolved live with the stored name as a fallback.
- **Parameters encoded into action id strings** — covered under item 4. This is the single thing I
  would do differently from scratch.
- **Nothing records the add-on version a trigger was planted under.** The settings blob has
  `version`, but `normalise` correctly migrates by field presence rather than version number, which
  is more robust. Not worth adding — noted so nobody "fixes" it later.
- **`describeTriggerList` indexes by array position**, and `/hypno forgettrigger <n>` uses that index.
  That is fine and should stay — an index is the right *display* key precisely because the phrase is
  hidden. It just must not be the *storage* key, which is item 1.

---

## Trigger Overhaul — decided 2026-09-25, staged across six builds

> **Source.** DW brought an outside spec (`job.md`, *"ECHS Unified Trigger & Drop Overhaul"*) and
> answered the questions it raised on 2026-09-25. About half of it was already built or already
> decided differently; this section records only what was **decided**, including where DW reversed
> an earlier call. The spec itself is not the authority: where it and this section disagree, this
> section wins.

### What the spec asked for that we are NOT doing, and why

| Spec item | Why not |
|---|---|
| A runtime timer per trigger, re-armed by a "rehydration sweep" on load | Strength is derived from timestamps on read (v0.60.0) precisely because there is no moment the add-on is guaranteed to be running. Hard expiry is an `expiresAt` field checked on read, the same pattern. Offline time already counts. |
| A synthetic trigger ID | The phrase-uniqueness decision (2026-09-16) makes the phrase the natural key, with `key` for phrase-less triggers. A second identity would bring back the deletion bug that decision fixed. |
| "Tier 1" as the drop's landing depth | Depth tiers are named, and Drifting reaches almost nothing. See *Instant drop* below. |
| Instant Purge of any trigger | A trigger holding you refuses removal (v0.32.0). Kept. |
| Allow Stranger Triggers toggle | Parked by DW: planting is already gated by depth, trust and the trigger permission. |
| A hypnotist-chosen HIDDEN flag per trigger | Replaced by the subject-side concealment below. The subject decides what they see, not the installer (rule 1). |

### Decisions

1. **Per-trigger scope, capped by the global setting.** Resolves *Trigger Storage* item 2 as option
   2. The hypnotist may request a wider scope when planting; the subject's global setting is the
   ceiling at fire time. Absent `scope` means "follow the global", which is today's behaviour.
2. **Hard expiry sits alongside decay.** `expiresAt`, optional. A trigger ends at whichever comes
   first: decay to zero or the expiry time. This is the *Ephemeral Triggers* idea in data form.
3. **Lifespan ceiling — a subject setting.** Any newly planted trigger's expiry is clamped to it
   (e.g. 15m / 30m / 1h / 2h / uncapped; uncapped is the default, so nothing changes for anyone who
   does not touch it). Distinct from `triggerDurationMinutes`, which is how long a fired effect
   *holds*, not how long the trigger *lives*.
4. **One-shot vs unlimited.** A one-shot trigger deletes itself after its actions run and the
   deletion is saved immediately. One line containing the phrase twice fires it once.
5. **Strict matching.** Per-trigger match mode, plus a subject master toggle that forces
   word-boundary matching for all their triggers. Substring stays the default. The planting overlap
   checks (`triggers.ts`, the uniqueness section) must follow the mode actually used.
6. **The phrase is concealed from the subject everywhere by default** — when planted, when said in
   chat, and in the list. *Show trigger words when you list them* stays for players who want it.
   In chat the phrase is replaced by **`...`** on the subject's own screen only.
7. **`/echs triggers` becomes a summary**: how many, who installed each, and its level (strength).
   **`/echs triggers <#>`** shows what that trigger does. You have to go out of your way to look,
   and it still never shows the phrase unless the setting above is on.
8. **Settings-screen inspector** with a per-trigger **Purge**, refused while that trigger is holding
   the subject (the v0.32.0 rule; it points at the safeword).
9. **Clear All refuses while any trigger is holding the subject or any session is running**, and
   asks for confirmation when it is allowed. The subject clears the active state first (safeword or
   release), then clears the list. `forgettrigger all` follows the same rule.
10. **Instant drop — reverses the "no auto-drop" note in *Open Questions*.** A new subject setting,
    **off by default**, with three positions: Disabled / One-time / Unlimited. The subject's position
    is the ceiling on what the installer asks for; an unspecified install is one-time. When on, a
    drop is allowed to the same people who may hypnotise the subject today. It **lands at the
    trigger's current strength** (a trigger's strength is already its effective depth when it fires),
    and **the person who spoke the phrase becomes the hypnotist** of the resulting trance. Drop
    triggers decay like any other.
11. **Delayed compulsions run on wall-clock time**, including while the subject is offline — the same
    call DW made for effect clocks on 2026-09-22. Revisit if it plays badly.

### Build order

Each is a separate minor release (rule 9) with its own live test.

| Build | Contents |
|---|---|
| 1 | **Built v0.87.0.** Record fields (`key`, `scope?`, `expiresAt?`, usage mode, match mode), hard expiry, lifespan ceiling, one-shot, strict matching, and the spoken options that set them. See `docs/CHANGELOG.md` for how, and *Needs Testing* item 19 |
| 2 | **Built v0.88.0.** `/echs triggers` summary and `<#>` detail; settings inspector with Purge; Clear All rules and confirmation. The inspector is its own tab, **Planted**. See *Needs Testing* item 20 |
| 3 | **Built v0.89.0** (`conceal.ts`). Chat concealment of the phrase (`...`), checked against R132 `ChatRoom.js`: a post-handler at 50 transforms the displayed `msg`, and the ungarbled copy in `metadata.OriginalMsg`. See *Needs Testing* item 21 |
| 4 | **Built v0.90.0.** Instant drop: `DROP_ACTION` recorded by "you will drop into trance" (or on the start line itself), the subject's Off / One time / Unlimited ceiling, and `dropIntoTrance()` in `session.ts` behind the induction attempt's own gates. See *Needs Testing* item 22 |
| 5 | **Built, shipped inside v0.90.0** (DW, 2026-09-25: no bump until the overhaul is finished). Spoken and mantra triggers: `say:<n>:<text>` actions, the new *Made to Speak* permission (Entranced), sent through BC's `ChatRoomSendChatMessage`. A forced line goes through our own trance silence — **decided by DW 2026-09-25** (see below). See *Needs Testing* item 23 |
| 6 | **Built, shipped inside v0.90.0.** Delayed compulsions: phrase-less triggers (`fireOn` wake / arrive / speak, synthetic `key`) planted by a condition line. Wake arms on an ordinary wake by the installer and is a stored `dueAt`, polled every 5s; arrival from BC's `ServerEnter`; speech from any chat line. One-time by default, never while under, discarded by the safeword. See *Needs Testing* item 24 |

**Versioning (DW, 2026-09-25):** Builds 5 and 6 ship inside v0.90.0, with no bump, until the
overhaul is finished. This is a deliberate exception to rule 9. Their player-facing lines go under
the v0.90.0 heading in the root `CHANGELOG.md`.

### Build 5: a forced line goes through our own silence — decided 2026-09-25

A trigger that makes the subject speak goes out through BC's `ChatRoomSendChatMessage`, which is
what a typed line uses. Our speech-block hook sits on that same function. As built, the hook lets
a forced line through (`withForcedSpeech` in `effects.ts`). The reasoning is that *Cannot speak*
stops the subject speaking of their own accord, and a spoken trigger is the hypnotist speaking
through them. Without the bypass, a drop plus a spoken line could never be heard: the drop applies
the trance defaults, and *cannot speak* is on by default.

**BC's own rules still apply:** an owner's BlockTalk rule, forbidden words, and gags (garbled by
BC's `SpeechTransformProcess`). Only our own silence is bypassed. **DW chose this over "silence wins" on 2026-09-25**, for the
drop-plus-words reason above. Do not re-decide it without flagging that you are.

---

## Commanded Activities — pacing (detail), spec'd 2026-09-13, half built v0.72.5

> **Related:** Phase 1 of commanded activities is **built v0.72.0** — the grammar, the three consent
> layers and the command-beats-our-own-restrictions rule are in *Added 2026-09-12 (v0.72.0)* and
> *(v0.72.1)*. The queue below would share `timers.ts` with trigger auto-release; the teardown it
> leans on is `endSession()` / `totalStop()` in *Control & Reset*.
>
> **Promoted to a dependency, 2026-09-13.** *Commanded Activities — as trigger actions* (below) lets
> one spoken word fire up to eight compels in a single synchronous tick, so this queue is no longer a
> nicety that can follow the feature. Build it first.
>
> **Partly shipped v0.72.5, and a suspected shortfall — DW, from play, 2026-09-14.** A fired
> trigger's actions are now drained one per tick (*Added 2026-09-13 (v0.72.5)*); pacing successive
> *live* commands is still unbuilt, so this section's heading is stale. **DW's observation:** the
> pause looks like it is only spacing the **flavour text**, with the actual activities still
> arriving together. Recorded as observed, **not verified** — nobody has read the drain path or
> reproduced it against the code, and it is equally possible the pacing is correct and only the
> narration reads wrong. His report, not a diagnosis.

**DW's ask, 2026-09-13:** *a slight delay between each commanded activity* — everything resolves
instantly and he wants pauses, so a compelled touch is more interesting to watch from inside the
room.

### First, the correction: there is nothing within one command to pace

A command produces exactly **one** activity today, not several. `runCommandedActivity()`
(`voice.ts:1707`) walks the group list for the spoken part and `return`s on the first group BC
allows — "breasts" is `["ItemBreast", "ItemNipples"]`, `ItemBreast` succeeds, `ItemNipples` is never
reached. So "a delay between each activity" has nothing to sit between until one of three things
exists: a **repeat** count ("touch your breasts three times"), the **sustained** form ("keep going"),
or a deliberate change to run *every* allowed group rather than the first.

That reframes the ask rather than refusing it. What is actually visible today is **the rhythm
between successive commands** — the hypnotist saying three lines in five seconds and getting three
activity messages stacked on top of each other. Pace that, and build the mechanism as a **queue**,
because the queue is what the repeat and sustained forms will both need and it costs nothing extra
now.

| What the pause sits between | Exists today | Worth pacing |
|---|---|---|
| Activities within one command | No — one command, one activity | Not yet; the queue makes it free when it does |
| Successive commands | Yes | **This is the visible case.** Pace it |
| Repeats of one command ("three times") | No | The reason to build a queue and not a `setTimeout` |

### Where the delay sits, and what breaks when it does

`handleActivityCommand()` (`voice.ts:1732`) currently gates and runs in one synchronous pass.
The shape that survives becoming asynchronous:

- **Gating stays where it is, at command time.** A refusal has to reach the hypnotist in reply to
  the line she spoke — that is Rule 5, and a refusal arriving 1.5s later attached to nothing is
  worse than no pause at all.
- **The activity moves into a queue step**, drained by a keyed `scheduleTimer` from `timers.ts`. Not a
  bare `setTimeout`: the registry is the module that imports nothing, it is keyed, and it is what the
  two teardown paths already sweep. Namespace the key the way trigger auto-release uses `trigger:`.
  *(Shipped for the fired-trigger half in v0.72.5 as `trigger-drain:<installer>:<phrase>`.)*
- **`markActive()` is the wrong tool here** and must not be used. A pending one-shot touch is not an
  effect holding the subject, and marking it active would make `/hypno` and the remote report that
  something has her when nothing does.

**The `commandInProgress` boolean does not need to become a counter — provided the bracket stays
inside the step.** Today `beginCommandedActivity()` / `endCommandedActivity()` (`selftouch.ts:103`)
wrap one `ActivityRun` inside one `finally`, in one tick, which is the only reason a boolean is
safe. Keep the bracket *around the single `ActivityRun` in each queue step* and that property is
untouched: each step is still synchronous, still self-closing, still cannot interleave with another.

The boolean breaks the moment somebody wraps the **whole sequence** — `begin…`, await, await,
`end…`. Then a second command's inner `end` clears the outer's flag, the self-touch block snaps back
on mid-sequence, and the remaining steps are silently refused by our own hook. If the sequence ever
does need wrapping, it must become a depth counter (`begin` increments, `end` decrements, the hook
stands aside while `> 0`) **and** be reset to zero by `totalStop()`, which today it is not and does
not need to be. Write the reason down next to the boolean, because the next person to reach for
`await` here will not know it is load-bearing.

### Re-validation on the subject's turn is mandatory — and it is the real work

DW's instinct is right, and it is the strongest argument for the queue being cancellable.
`ActivityAllowedForGroup` was asked at command time; by the time step 3 of 5 runs, seconds later,
somebody may have cuffed her, locked a chastity belt, or walked out of range — and **`ActivityRun`
validates nothing**. It checks that the group resolves and then applies arousal and publishes the
message. Fire a stale queue step and the room sees her masturbate through a belt.

So each step re-runs the full check, not just BC's filter:

| Re-checked on the step | Why it can change mid-queue | Covered by teardown instead? |
|---|---|---|
| `ActivityAllowedForGroup` | She gets restrained, chaste, or moved out of range | No — must be re-read |
| `depthRefusal("compelActivity")` | She drifts shallower than Yielding as the session decays | No — must be re-read |
| `Player.HasEffect("Freeze") && !hasOwnEffect("Freeze")` | A real restraint lands mid-queue | No — must be re-read |
| `isSessionActiveWith(sender)` | She wakes, or the window expires | Yes — `endSession()` calls `clearAllTimers()` |
| `hypnoEnabled` / `compelActivity` off | She unticks it | Yes — `hardFloorStop()` → `totalStop()` → `clearAllTimers()` |
| Safeword | — | Yes — same path |

**Two of those come free and three do not.** `endSession()` (`session.ts:399`) and `totalStop()`
(`session.ts:1031`) both already call `clearAllTimers()`, so a wake, a hard floor and a safeword
cancel a pending queue with no new code — which is the part of this that is genuinely cheap, and the
reason to use `timers.ts` rather than roll a timer locally. Depth drift, a real restraint arriving,
and BC's own filter are *not* reachable from a teardown and have to be asked again on the step.

The cost is structural, not large: the gate block inside `handleActivityCommand` has to come out
into something callable twice, and the second call has a different obligation — **say what happened
to the rest of the queue.** "Refused" was said at command time and cannot be said again; a
mid-queue stop needs its own wording ("`[command] stopped after 2 of 5 — a restraint reached her`"),
or the hypnotist watches the rhythm die and cannot tell a refusal from a dropped message. This is
the same class of silence as the one v0.72.1's test pass was written to close.

### Magnitude, and why it should not be a metronome

**1.2s–2.0s, jittered, per step.** Reasoning rather than a number picked to feel right: a person
clicking an activity button in BC takes roughly that long, so it reads as a body doing something
rather than a script draining a list. Under about 800ms the messages still arrive as a block and
nothing is gained; over about 3s the hypnotist starts to wonder whether the command landed at all,
which is a refusal-versus-silence problem wearing a stopwatch.

**Jittered, not fixed.** The fiction the feature sells is the line the subject already gets — *"Your
body does it without waiting for you to decide"* — and a body is not evenly spaced. A fixed interval
reads as a cron job, which is the one thing a compelled touch should not look like. ±30% around the
base is enough to break the pattern without becoming erratic. It also incidentally spaces the
`Type:"Activity"` sends, which rapid-fire commands currently push out back-to-back.

Not a player setting, at least not first. The pace is atmosphere, not consent, and the settings
surface is already the thing the wizard exists to apologise for.

### A second command arriving mid-delay — this needs deciding, not defaulting

`scheduleTimer` **replaces by key**, so the naive one-key implementation makes a second command
silently cancel the first's pending step. That is the wrong default and it fails Rule 5 invisibly.
Three honest shapes:

1. **Queue behind it** — append, drain at the paced interval, cap the depth (the `MAX_ACTIONS = 8`
   precedent in `triggers.ts:104` is the house answer to "not unbounded"). Best fit for what DW
   wants: rapid commands become a rhythm instead of a pile-up.
2. **Refuse while one is pending** — `[command] still resolving the last one`. Cheapest, honest,
   reads like the attempt cooldown. But it makes a hypnotist who talks fast feel broken.
3. **Last command wins**, and *says so*. Defensible for the sustained form later ("keep going" then
   "stop"), wrong for one-shots.

**Recommend 1, with the cap, and 2's wording kept for when the cap is hit.**

### What this does to the collisions already on the books

**It makes the recording collision harder to diagnose, not worse in kind.** Today a deepening line
misread as a command (`your arms feel heavy` → `Caress`, `voice.ts:1664`) executes on the same line
it was spoken, so at least the cause sits next to the effect. Add a pause and the caress lands a
second and a half later, during the *next* line — so a hypnotist mid-recording sees an activity she
cannot attribute to anything she said. Cause and effect come apart, which is exactly what made the
swallowed-command case hard to find in the first place.

**A queue is not where that gets fixed.** The guard belongs at parse time in
`handleActivityCommand`, because refusing is what tells the hypnotist; a drain-time check would only
add a second place to get it wrong. Fix the verb list and the recording guard **before** adding the
delay, or the delay will be blamed for a bug it merely hid.

### Verdict on size

**The pacing is small. The re-validation is not, and it is not optional.** Keyed timer, existing
registry, both teardown paths already sweep it, boolean stays a boolean if the bracket stays inside
the step — that half is an afternoon. Re-asking the gates on each step means lifting the gate block
out of `handleActivityCommand`, inventing wording for a mid-queue stop, and a suite that proves a
step refuses when the world changed under it (Rule 6: a step that cannot fail is not testing
anything — the test that matters is *restrain her between command and step, assert nothing ran and
the hypnotist was told*). That is the work. Doing the first half without the second ships a path
that publishes activities BC would have refused, which is worse than instant resolution.

---

## Commanded Activities — as trigger actions (detail), approved and built 2026-09-13, v0.72.4

> **Built, and this section is the spec it was built from.** Recording and firing shipped in
> **v0.72.4**, the pacing of a fired trigger's actions in **v0.72.5**, and the fire-time depth gate in
> **v0.72.6**. Where the shipped code chose differently from this spec it is marked inline; **one
> item, the plant-time depth gate, is still divergent and awaiting DW's ruling** (see *Depth* below).
>
> **Related:** Phase 1 of the feature is **built v0.72.0** (*Added 2026-09-12 (v0.72.0)*, *(v0.72.1)*).
> The queue this now depends on is specified in *Commanded Activities — pacing* above. The recording
> and firing machinery it plugs into is *Triggers* → *Programming Triggers* and *Trigger Reinforcement
> and Decay*; the gates are in *Trance Depth as the Feature Gate*.

**DW's decision, 2026-09-13: YES — a commanded activity is recordable as a trigger action.** So
"Missy, your trigger word is sleepy time / Missy, touch your breasts / Missy, remember trigger"
plants a word that later makes her do it, in or out of trance, with no hypnotist speaking.

### The encoding: `act:<Activity>:<word>` (shipped) — specced as `compel:`

**This section originally specced the prefix `compel:`. The shipped scheme is `act:`** — v0.72.4 chose
the shorter prefix and it is what is in the code, the saved triggers and the tests. The doc follows the
code. The only thing lost is the word "compel" reading more plainly in a saved trigger list, which the
label helper below covers anyway; nothing about the argument for the shape changed.

`act:Caress:breasts`, `act:Pinch:nipples`, `act:Spank:bottom`. The precedent is already load-bearing:
`touch:<word>` exists because *"the pattern library can't hold a per-part entry for all 26 of them"*
(`voice.ts:1142`), and a compel has two parameters rather than one for exactly the same reason.

**A second colon breaks nothing — checked, not assumed.** Every consumer of an action id tests
`startsWith("touch:")` and then `slice`s a fixed prefix; **nothing in `src/` splits an id on colons**
(`fireTrigger` `voice.ts:1144`, `undoTrigger` `:1222`, `applyActionById` `:1398`, `undoActionById`
`:1408`). Ids are otherwise opaque strings — pushed into `Recording.actions`, `join(", ")`ed for
display, and persisted as JSON in `Trigger.actions`. `timerKey()` (`:1279`) already emits
`trigger:<member>:<phrase>`, a three-part colon key, so multi-colon strings are established here.
Each site gains a `startsWith("act:")` branch **before** the `SUGGESTIONS.find` fallback, and
`performActivityAction` parses with `split(":")`. Activity names (BC's, e.g. `MasturbateHand`) and
`BODY_PARTS` keys (`selftouch.ts:43`) contain no colons, so the round trip is lossless.

**Three kinds, because the grammar has three and only one names a part.** `matchActivityCommand`
(`voice.ts`) returns `part`, `genital` or `vague`, and `activityActionId()` encodes each:

| Spoken | Recorded as (shipped) | Resolved when |
|---|---|---|
| "pinch your nipples" | `act:Pinch:nipples` | Groups from `BODY_PARTS` at fire time |
| "finger yourself" | `act:genital` | Fixed `["ItemVulva"]` at fire time |
| "touch yourself" | `act:vague` | **Zone re-rolled at fire time** via `pickVagueZone()` |

> **Specced as `act:MasturbateHand:@genital` / `act:Caress:@wander`; shipped as the bare `act:genital`
> and `act:vague`.** The sigil existed to keep one shape across all three forms, so every id read as
> `<prefix>:<activity>:<target>`. The shipped forms are two-field literals matched before the split,
> which means the ids have **inconsistent arity** — deliberate on the implementation's part, and it
> works because `performActivityAction` tests the two literals first. The reason the sigil was proposed
> still stands and is worth keeping in view if a fourth kind ever arrives: a recorded id must resolve to
> the same groups the spoken line did, and overloading a body word would not have — `genital` uses
> `["ItemVulva"]` while the body word "pussy" is `["ItemVulva", "ItemVulvaPiercings"]`, close enough to
> look interchangeable and not be. The shipped literals avoid that trap by naming neither.

Re-rolling the vague zone at fire time is not a shortcut: it keeps the *"her hands wander on their
own"* fiction and gets the reachability re-check for free.

**Not carryable, and not undoable — both deliberate.** A compel is a one-shot event, so there is
nothing for `undoTrigger` or `undoActionById` to reverse: both skip `act:` ids, the same way
`orgasm-force` is skipped. `applyActionById` must not run one either, because its only caller is
carry-forward's re-apply (`carry.ts`, `registerCarryHandlers`) and re-running a one-shot on waking is
a touch nobody asked for. The spoken path never calls `noteApplied` for a command, so a compel cannot
reach carry's `applied` list — that is the belt; the skip is the braces.

### Recording: this was also the fix for the ordering collision — **done v0.72.4**

Before v0.72.4 a touch command spoken mid-recording **executed and was not recorded**:
`handleActivityCommand` is dispatched in `handleSpokenLine` ahead of the `matchSuggestion` →
`recordAction` gate, and it never consulted `isRecording()`. That was the bug found in review on
2026-09-13, and this feature was its fix — one change, not two, exactly as specced.

**Shipped:** `handleActivityCommand` calls `recordAction(activityActionId(cmd))`; if it returns a
message, `tellPlayer` it and return, so nothing is performed. `isTriggerSetupLine` also gained
`matchActivityCommand`, so the hypnotist's own compel lines no longer render to a subject with the
Awareness toggle on and hand her the contents of her trigger.

**⚠ One divergence, still open — where the record call sits relative to the depth gate.** This spec
said **gates first, then record**: planting an action she has not permitted, to fire weeks later, is
worse than executing one now, and it matches the suggestion path, where `blockedReason` (which
includes depth) runs before `recordAction`. The shipped order records **after the permission check but
before `depthRefusal("compelActivity")`**, on the reasoning that depth and freeze *"are about doing it
NOW, not planting it"* — which is a real argument, not an oversight.

Effect of the difference is narrow, because `beginRecording` already demands `triggerControl` (Deep,
earned) to be recording at all, so she was deep enough moments earlier; the gap is depth drifting down
mid-recording. It also means compel now matches `handleBodyPartLine`, which likewise checks its
permission but no depth before recording — so the two parameterised paths at least agree with each
other and disagree with the suggestion path.

**Awaiting DW's ruling: pick one and delete the other.** Either move the record call below
`depthRefusal` (and consider doing the same for `handleBodyPartLine`), or record here that
plant-time depth is deliberately not gated for parameterised actions and strike this flag.

### Firing: re-check everything, trust nothing from plant time — **done, v0.72.4 + v0.72.6**

`fireTrigger` has an `act:` branch beside the `touch:` one. **The trigger may fire weeks later, in a
different room, with her restrained, at a fraction of its planted strength** — which is precisely the
case the existing design already answers, so the composition fell out of it rather than needing new
machinery. All five checks are in the shipped code:

| Checked at fire time | Mechanism | Status |
|---|---|---|
| `hypnoEnabled && triggerControl` | `triggersArmed()` (`triggers.ts`) | Shipped v0.72.4 |
| `compelActivity` granted **now** | per-action re-check, and again on the paced step | Shipped v0.72.4 / v0.72.5 |
| Deep enough **now** | `depthAllows("compelActivity", strength, strength)` | **Shipped v0.72.6** — see below |
| Not a Freeze we did not apply | `HasEffect("Freeze") && !hasOwnEffect("Freeze")` | Shipped v0.72.4, re-checked per step v0.72.5 |
| Bound / chaste / out of range / zone she disabled | `ActivityAllowedForGroup`, via `runCommandedActivity` | Shipped v0.72.4, **on each paced tick** v0.72.5 |

**The depth row was missing until v0.72.6, and its absence surfaced in play.** As first shipped, the
`act:` branch `continue`d before reaching the `depthAllows(…, strength, strength)` check the suggestion
actions get, so a faded trigger fired its compels at full force. DW hit the consequence: a trigger
planted at depth 0 *"fired nothing but the vague-pull flavour — except the first utterance, which
spanked once."* `triggerStrength` returned `NaN` on a depth-0 trigger's first fire (`0 * Infinity`),
`NaN < GHOST_THRESHOLD` is false so the ghost guard was skipped that once, the depth-gated suggestions
all failed their check — **and the compel, being ungated, was the one thing that landed.** v0.72.6
fixed all three: an early `if (t.plantedDepth <= 0) return 0`, planting refused below the ghost
threshold, and the compel depth gate. A faded trigger now loses its compels with everything else.

**That last row is the one that must not be skipped.** `ActivityRun` validates nothing — it resolves
the group, applies arousal, publishes the message (verified against R131 `Activity.js`). BC's
validating entry point is `ActivityAllowedForGroup`, and it is the only thing standing between a
word spoken in a corridor and the room seeing her masturbate through a chastity belt. It is also
where her *own BC preferences* still hold: `ActivityPossibleOnGroup` refuses a zone whose arousal
factor she set to zero, and `ActivityCheckPermissions` refuses an activity she disabled — a veto that
survives the trigger completely and that the add-on does not have to know about.

Structurally this is the same requirement the pacing note reached from the other direction: **a
queued step re-validates on its turn.** One implementation serves both.

### Depth: the trigger's gate and the action's gate are different questions

- **To plant one:** she must clear `triggerControl` (Deep by default, against `depthEarned`) **and**
  `compelActivity` (Yielding, `depth.ts:153`). Two gates, both required, for two different reasons —
  the first is "may something persistent be put in me", the second is "may I be made to act at all".
  With the defaults, Deep dominates and Yielding is satisfied on the way; state the rule, not the
  arithmetic, because both tiers are player-adjustable and a subject who raises `compelActivity` to
  Blank must not find planting still open at Deep.
  **⚠ Shipped code does not gate plant-time depth** — see the divergence flagged under *Recording*
  above. This bullet describes the specced rule, not current behaviour, and is awaiting DW's ruling.
- **When it fires: shipped v0.72.6, and this is now what the code does.** The trigger's current
  `triggerStrength()` is the depth. A Deep-planted trigger faded to 45 still reaches Yielding, so the
  compel still lands; faded to 20 it does not, and the trigger's other actions may still work. That
  disagreement between `plantedDepth` and the action's gate is not a conflict to resolve — **it is the
  decay mechanic doing its job**, and it means a neglected compel trigger loses its teeth before it
  loses its word. v0.72.6 also refuses to plant below the ghost threshold at all, so a trigger can no
  longer be born dead.
- **`compelActivity` is `earnedOnly: false`**, so unlike the illusion it can be reached on chemical
  depth. That stays true at plant time only in the sense that `triggerControl` is earned-only and
  gates the planting; `plantedChemical` then prices the shortcut through the fast decay rate
  (`CHEMICAL_DECAY_PER_DAY`). No new rule needed — but worth noting that a compel is the first
  *session-only* action to become persistent by proxy, and the earned-only split is what keeps that
  honest.

### Multiple compels in one trigger — pacing stopped being optional, and **shipped v0.72.5**

`MAX_ACTIONS = 8` (`triggers.ts:104`), so one word can carry up to eight compels. As first written
`fireTrigger`'s loop was synchronous, which meant **eight `ActivityRun` calls and eight
`Type:"Activity"` publishes in a single tick** — the pile-up the pacing note exists to prevent,
arriving all at once from a single spoken word.

**Shipped v0.72.5:** `fireTrigger` gates each action as before but defers the *application* into an
ordered step list, drained one per jittered tick (1.2s–2.0s, first lands immediately so it stays
responsive), keyed `trigger-drain:<installer>:<phrase>` in `timers.ts` — so `endSession()` and
`totalStop()`, which both call `clearAllTimers()`, cancel a half-drained sequence on wake, hard floor
or safeword. Each compel step re-validates on its own tick, which is where the `ActivityAllowedForGroup`
requirement above actually lives. *Pacing successive **live** commands remains unbuilt — see the pacing
section's open half.*

**A related trap in the same loop, also closed in v0.72.5:** `fired++` drove `markActive(timerKey)`
and `scheduleAutoRelease`. A compel has nothing to hold and nothing to release, so a compel-only
trigger would have marked itself active, scheduled a release that undoes nothing, reported
`** HOLDING YOU NOW **` in `describeTriggerList`, and refused `/hypno forgettrigger` on the grounds
that it was gripping her. Compels are now counted apart from the holding count, so only restriction
actions arm the auto-release.

### What each side sees, following the existing asymmetry

The rule is already set and this inherits it: setup feedback goes to the **hypnotist**, because
showing the subject her own trigger contents defeats the point (`triggers.ts:18`).

| Moment | Hypnotist | Subject |
|---|---|---|
| Planting | `[trigger] Recorded act:Caress:breasts into "sleepy time" (2 so far)` — still needs a human label, see below | *"That settles into place, waiting."* No phrase, no action |
| Committed | `[trigger] SAVED … 3 action(s): …` | *"It settles somewhere you won't think to look for it."* |
| Firing | **Nothing** — a trigger fires with no hypnotist necessarily present, and that is deliberate | She cannot be kept in the dark: her body just did it and the room watched. She gets the line the spoken path already uses — *"Your body does it without waiting for you to decide"* |
| Refused at fire time | Nothing (no channel) | Nothing spoken; log only, as the other actions do |

**No public flavor half for a compel, unlike every other trigger action.** `announce()` (`flavor.ts:404`)
publishes a room line, and `ActivityRun` has *already* published the activity message — the room sees
*Missy caresses her breasts* either way. A second narration would double-narrate the same event.

**`describeTriggerList` still needs a label — not done.** It prints `t.actions.join(", ")` raw, so her
own list reads `act:genital`. Her seeing *what* a trigger does is correct and already the case for
`touch:breasts`; seeing it as an internal id is not. One `describeActionLabel(id)` helper, used by both
the list and the recorded-confirmation line. **Open.**

### Scope — **decided 2026-09-13: a compel follows the trigger's scope, no installer clamp**

> **DW's ruling, 2026-09-13.** A compel action in a trigger is **not** clamped to the installer; it
> follows the trigger's scope like any other action. No code change was needed — v0.72.4 already
> behaves this way. The argument that was put against it is kept below rather than deleted, struck
> through, so anyone revisiting this sees what was weighed and does not re-open it by accident.

A compel action inherits the trigger's scope, and scope is the seven-rung ladder in
`TRIGGER_SCOPES` (`triggers.ts:519`) topping out at **"Hypnotist and everyone, no exceptions"**.
Follow that through: a subject who set a permissive ceiling has made it so that **any stranger in the
room, with no session, no induction and no relationship, can say a word and make her masturbate in
public — and the room sees an ordinary activity message, indistinguishable from her choosing it.**

**Mechanically this is coherent.** `triggersArmed()` still requires `hypnoEnabled` and
`triggerControl`; the per-action re-check still requires `compelActivity` ticked; BC still refuses
zones and activities she disabled; she chose the rung, the default is *Hypnotist only*, and a
stranger on that ceiling can already freeze her or block her hands. Nothing here bypasses a gate.

**The consent shape is nevertheless new, and that is what was weighed.** Every other trigger action is
a *restriction* — something taken from her. A compel is the first that makes her **perform a sexual
act, on her own body, publicly, attributed to her**. "Yes, anyone may fire my triggers" was answered
about being stopped, and it is being read as an answer about being made to perform — the same objection
recorded against word-level control (*"the consent shape is genuinely different… cannot be reviewed in
advance the way 'yes, you may freeze me' can"*), arriving here by inheritance rather than by anyone
choosing it. **DW considered this and ruled the other way: the rung she picked is her answer, and the
ladder means what it says.**

~~**Recommendation: clamp a compel action to the installer, regardless of the trigger's scope, until
DW rules otherwise.** `triggersFiredBy` keeps returning the trigger on whatever rung she set — the
other actions still fire for the wider audience — and the `act:` branch in `fireTrigger` skips unless
the speaker is `trigger.installedBy`. Reasons: it is the same *"installer-only is the safe start"*
reasoning the scope ladder itself was built on (`triggers.ts:95`); it is one condition, and reversible
in one line the day he decides otherwise; and it fails in the direction that costs a feature rather
than the direction that costs consent.~~ — **rejected 2026-09-13.** The two alternatives that were on
the table alongside it, and remain available if play changes his mind: a separate rung-cap for compel
actions, or letting the ladder stand and **making the scope setting's own wording say plainly what the
top rung now includes**. That second one is cheap and is worth doing regardless of the clamp question —
it is a labelling fix, not a gate.

### ⚠ Question 2 just got more urgent

The `Caress`-on-`feel` false positive (`ACTIVITY_VERBS`, `voice.ts:1664`) is still open and still
deferred — but recording changes what it costs. **Today** a misread deepening line ("Missy, your arms
feel heavy") fires one stray caress; annoying, visible, over. **Once commands are recordable**, the
same line spoken during planting **silently writes `act:Caress:arms` into a trigger she will carry
for weeks** — and she cannot audit it, because the confirmation goes to the hypnotist and her own
list shows the action without telling her it was never meant. A parser false positive stops being a
stray event and becomes a persistent one. **Recording shipped in v0.72.4 and question 2 is still
open, so this is live behaviour now, not a forecast.**

**This should be fixed before recording ships, not after.** Two other items stay deferred by DW's
call and are recorded here so they are not lost: **question 2** (drop `feel` from the `Caress` verb
list) and **question 3** (`handleTriggerFiring` returning `false` when it suppresses a double-fire,
so a trigger phrase inside a command line stops swallowing the command).

---

## Commanded Activities — Phase 2: acting on others (detail), spec'd 2026-09-16, named targets built v0.84.0

> **Built v0.84.0 (2026-09-23): named targets and "me".** *"Missy, kiss Rei"*, *"...Rei's nipples"*,
> *"...Rei on the neck"*, *"...kiss me"*, *"...pinch my nipples"*. DW settled six calls that day,
> recorded in [`CHANGELOG.md`](CHANGELOG.md) v0.84.0. In short: **exact names only**; per-verb
> default part only for kiss, spank and pet; the subject's new `compelTouchOthers` (off) for anyone
> but the hypnotist; reasons given only for the hypnotist's own body; the same `compelActivity` depth;
> **triggers later**. **Still unbuilt from this spec:** `(someone|anyone)'s <part>` with the
> filter-then-pick pool, zone tiers by depth, targets in triggers (member number plus name), and a
> per-target cooldown. **Differs from the spec below:** no `allowTouchHypnotist` setting was added.
> "Me" is gated by BC's own checks on the hypnotist and by the subject's *Made to act*, because the
> hypnotist asking for it is their consent (DW's call 3).

> **Related:** Phase 1 (self, one-shot) is **built v0.72.0–v0.72.6** — see the two sections above for
> the grammar, the consent layers, the `act:` encoding and the pacing queue. This is the *others*
> item from v0.72.0's "kept in mind for later" list, now specified by DW.

**DW's spec, 2026-09-16, in brief.** Three settings — `allowTouchSelf` (the existing baseline),
`allowTouchHypnotist` (default TRUE during a session), `allowTouchBystanders` (default false). Zones
tiered **Social/Neutral · Sensitive · Intimate** and mapped to the subject's current depth, so
shallow reaches only social zones. Grammar extends to `<verb> my <part>` (the active hypnotist),
`<verb> <Name>'s <part>`, and `<verb> (someone|somebody|anyone)'s <part>` (a random bystander, with a
retry loop past refusals). A named target that is not present aborts and emits subject-side flavour.
Everything routed through native dispatchers.

### Already built — do not re-derive these

His task list includes four things that exist:

- **A target resolver.** `resolveTarget()` (`commands.ts:95`) already resolves a token to a room
  occupant: Name or Nickname, case-insensitive, **exact first then unique prefix**, and
  `if (matches.length !== 1) return null` — so it refuses on ambiguity *and* on no match, and leaves
  the caller to say why. `others()` (`:86`) is the room pool minus the player. This is the resolver;
  it needs lifting into a shared module, not writing.
- **The validating entry point.** `ActivityAllowedForGroup` is the gate and `ActivityRun` is the raw
  runner that validates nothing — established at length under *as trigger actions* above. "Route
  through native dispatchers" is already how Phase 1 works, and it is the whole reason a third party
  is safe at all.
- **The missing-target failure convention.** Rule 5 plus the shipped `[command] Refused — …` /
  `[command] "x" won't land there right now` wording. His *"reaches out blindly… but finds only empty
  air"* is the subject-side half; the hypnotist-side half already has a house form.
- **The pacing queue** (v0.72.5), which a multi-target command will want immediately.

### ⚠ Fuzzy matching: reject. This one should lose.

**The spec asks for "exact **or fuzzy** display-name match". It should not get fuzzy.** A near-miss
here does not produce a confusing error — it performs a real, published, intimate act on a person who
was never named, and nothing undoes that it happened. The room sees Missy grope Elena because the
hypnotist typed *"Elen"* and Elena was the closest string.

The existing `resolveTarget` is the right shape and is already deterministic: exact, else a **unique**
prefix, else refuse. **Recommendation: reuse it, and tighten to exact-only for touch specifically.**
The unique-prefix allowance is defensible when a player types a slash command and can see the refusal
and retype; it is a worse trade when the output is an intimate act on somebody else, and the cost of
exact-only is that a hypnotist occasionally types a full name.

*(Provenance, so nobody hunts for it: DW recalls this as a settled decision. It is not recorded in
this document — `resolveTarget`'s own comment is the only place the rule is written down. It is a
shipped implementation, not a design entry. Recording it here now is what makes it one.)*

### The random-bystander retry loop — the sharpest thing in the spec

**(a) Mechanically it is inert, and this is worth stating plainly.** `ActivityAllowedForGroup` is
**pure local computation over already-synced data**: `InventoryIsBlockedByDistance`, `AssetAllActivities`,
`ActivityPossibleOnGroup`, `ActivityCheckPrerequisites`, `ActivityCheckPermissions`. It sends nothing,
asks nobody, and touches no socket. Verified against R131 `Activity.js`. So iterating a candidate pool
is not probing the room — it is reading objects already in memory. **The loop is far less alarming
than it sounds.**

And the data it reads is genuinely theirs: `Char.ArousalSettings` and `Char.AllowedInteractions` are
part of the synced account data every client receives (`Character.js:1253–1254`,
`ServerAccountDataSyncedValidate`). So `ActivityCheckPermissions` and `ActivityPossibleOnGroup`
evaluate the **bystander's own real preferences**, not a default. The consent claim rests on that and
the claim holds.

**(b) Consent — and DW's distinction is the right one to have drawn.** If BC's permission system is
honoured, a bystander who allowed that kind of touch has opted in, exactly as settled for Phase 1.
But **"keep trying until someone doesn't refuse" is a different act from "touch a random person"**:

- Touching a random person distributes across the room and lands on whoever it lands on.
- Retrying past refusals **systematically selects the most permissive person present**, every time.
  Over a session it will find the same one or two people repeatedly.
- Because the whole search is local and silent, **nobody who was considered and skipped ever learns
  it happened**, and the person finally selected cannot tell they were the fourth choice.

That is not a consent violation — every individual touch was permitted by its recipient. It is a
**targeting bias with a social cost**, and it is the kind of thing that reads badly in play even when
every gate was honoured.

**SETTLED 2026-09-16 — filter first, then pick. No retry loop.** Determine who can actually be
touched *on the requested zone*, then choose at random from that pool. This is strictly better than
retrying: the bias disappears because nobody is ever "tried and skipped", the randomness is genuinely
uniform over eligible people, and it is less code than the loop.

**Filter on the specific zone, not on general touchability.** Confirmed: `ActivityAllowedForGroup`
**already answers per-zone** — it takes a group name and `ActivityPossibleOnGroup` checks
`PreferenceGetArousalZone(C, Group.Name).Factor > 0` for that group specifically. So *"someone's
breasts"* must resolve the spoken part to its groups **first**, then filter candidates on those
groups. Otherwise we pick somebody who is generally touchable and then discover the intimate zone is
closed, which is the retry loop wearing a different hat.

Note `BODY_PARTS` maps one word to a *list* of groups (breasts → `ItemBreast`, `ItemNipples`). A
candidate qualifies if **any** group in the list works, and the group that qualified them must be
remembered, so the dispatch does not re-resolve to a different zone than the one they were chosen for.

#### Check order, and what is cheap across a whole room

BC's own order inside `ActivityAllowedForGroup`, which is the order to mirror:

| # | Check | Scope | Cost |
|---|---|---|---|
| 1 | `InventoryIsBlockedByDistance(C)` | whole character | **cheap** — rejects the candidate outright |
| 2 | `ActivityGetGroupOrMirror` / `AssetAllActivities` | per asset family | **constant** — resolve once, reuse for every candidate |
| 3 | `ActivityPossibleOnGroup`: enclosure · `ActivityAllowed()` · `CharacterHasArousalEnabled` · zone factor > 0 | per character + zone | **cheap** — field reads. `ActivityAllowed()` is room-global, so hoist it |
| 4 | Per-activity: `ActivityHasValidTarget` · `ActivityCheckPrerequisites` · `ActivityCheckPermissions` | per activity × character | **expensive** — inventory scans, `InventoryGroupIsBlocked`, `InventoryPrerequisiteMessage`, and it runs for *every* activity in the family, then sorts |

So: **narrow cheaply on 1–3, then call `ActivityAllowedForGroup` only on the survivors** and keep
those whose result contains the requested activity. Step 4 is the only costly part and this avoids
paying it for people who were never candidates.

**⚠ The pre-filter must only ever be a narrowing, never a decider.** Anything it rejects must be
something BC would also reject — it is an optimisation, not a reimplementation, and
`ActivityAllowedForGroup` stays authoritative. Wrong that way round, a pre-filter bug costs a
candidate; the other way round it admits someone BC would have refused. Do not reimplement step 4.

Cost in practice is fine: this is a one-shot command, not a per-frame path. A twenty-person room is
twenty narrow field checks and a handful of full passes. **It must never go anywhere near a draw
loop.**

### `allowTouchHypnotist` — two parties, two settings, both required

**Clarified by DW 2026-09-16, and an earlier objection in this document was wrong.** This setting is
the **hypnotist's own consent to being touched**, not the subject's permission to touch. Those are
different people, and both sides must hold:

| Who | Setting | Default | Asks |
|---|---|---|---|
| **Hypnotist** | `allowTouchHypnotist` | **true**, during an active session | may my subject be made to touch **me**? |
| **Subject** | `compelActivity` (+ `allowTouch*`) | **false**, like everything else | may I be made to act at all? |

~~*Earlier objection: "every permission defaults false, so this would be the only pre-granted one."*~~
That was aimed at the wrong party. It is a sound objection to a **subject-side** permission arriving
pre-granted, and the subject's side still defaults false and still has to be turned on. It is not an
objection to a hypnotist declaring, by running a session at all, that their own body is in scope.
Defaulting it true is reasonable: someone who opened a hypnosis session has already opted into the
scene, and it remains one tick to withdraw.

### Telling the hypnotist when *their own* settings refused — safe, and the boundary is load-bearing

**DW's addition, and it is right.** If the hypnotist commands a touch on themselves and **their own**
BC settings block it — a zone factor they zeroed, an activity they disabled, an item permission — say
so, and suggest the fix: whitelist the subject, or adjust the setting.

**Why that is safe here and nowhere else.** Three conditions hold simultaneously, and all three are
required:

1. **It is their own configuration.** Nothing is disclosed that they did not set themselves.
2. **They asked for the act.** They spoke the line; the refusal is the answer to their own question.
3. **They are a party to the session.** There is an established consent relationship, which is the
   same ground Rule 5 already stands on for refusals to the subject's hypnotist.

> **⚠ Do not "make this consistent" by loosening the bystander case.** The no-reason rule for third
> parties (below) is unchanged and is not an inconsistency to be tidied away. A bystander fails
> **none** of the three conditions above: it is not their configuration being reported, they did not
> ask for anything, and there is no session with them. Telling a hypnotist *why* a stranger refused
> turns the command into a reader for that stranger's settings. The two rules differ because the
> situations differ, and the difference is the whole safeguard.

### Zone tiers by depth — good, and it should extend rather than replace

The Social/Sensitive/Intimate ladder fits `DEPTH_GATES` cleanly and is a **better model than what
shipped**. Today `compelActivity` is one flat gate at **Yielding** covering every zone
(`depth.ts:153`), so *"touch your hand"* and *"finger yourself"* need exactly the same depth — which
is obviously wrong and only survived because Phase 1 is self-only.

**They compose rather than conflict, as two axes:**

| Axis | Question | Where |
|---|---|---|
| `compelActivity` | may I be commanded to act **at all** | existing `DEPTH_GATES` row |
| zone tier | how deep before **this zone** is reachable | new, per-tier |
| `allowTouch*` | may I be commanded to act **on this person** | new, per-relationship |

So: keep `compelActivity` as the entry gate, add the zone ladder underneath it, and let the deepest
of the applicable checks win. **This should be retro-fitted to Phase 1 too** — the self case has the
same flaw and fixing it in one place covers both.

*(One correction: there is no "verb-implied 80% body-part threshold" in the code. `BODY_PARTS`
(`selftouch.ts:43`) maps ~40 spoken words to BC zones with no tiering at all, and the verb list is a
flat curated set. The 80 is probably the **Blank** tier's minimum from `DEPTH_TIERS`. Nothing tiers
zones today — which is why this part of the spec is an addition rather than a change.)*

### Missing from the spec

- **⚠ Never reveal *which* of a third party's settings refused.** The spec's failure messages are
  per-cause, and for a bystander that turns the command into a **probe for reading strangers'
  configurations** — say *"touch Elena's breasts"*, read the refusal, learn what Elena has disabled.
  All third-party refusals must collapse to one indistinguishable message: *that did not land*, with
  no reason. The distinction from Phase 1 matters — telling the **subject's** hypnotist why their own
  subject refused is Rule 5 working as intended, because there is an established session and a
  consent relationship. There is neither with a bystander.
- **A cooldown or rate limit per target.** Nothing stops the same bystander being targeted every few
  seconds. Not a permission failure, but a harassment vector that BC's own permissions do not model,
  and the quietest one to miss. *(DW recalls this being flagged previously; it is not recorded
  anywhere in this document. Recording it here now.)*
- **What the subject sees and consents to.** Phase 1's fiction is *"your body does it without waiting
  for you to decide."* Phase 2 makes her touch a third party — she may consent to being made to act
  and still not consent to being made to act **on strangers**. `allowTouchBystanders` is that consent
  and should be worded as such, not as a targeting option.
- **Trigger interaction — DECIDED 2026-09-16: named third-party targets ARE allowed in triggers.**
  DW's call. A trigger may carry `act:Caress:breasts` aimed at a named person, and the id grows a
  target field. Two failure cases, and they resolve differently:

  - **Target absent when it fires** → **fail with flavour.** She reached for someone who was not
    there — *"reaches out for someone who is not here, and finds only empty air."* No activity is
    dispatched. This is DW's wording and it is the right shape: visible, harmless, in fiction.
  - **A *different* person now matches that name** → **refuse silently, do not touch them.**
    Recommendation, and it follows the same logic as rejecting fuzzy matching: re-resolve by name at
    fire time through `resolveTarget`, and if the resolved member number is not the one recorded when
    the trigger was planted, treat it as absent. **Names are not unique and are not stable** — people
    change nicknames, and a stranger can arrive who matches. A trigger planted weeks ago must not
    perform an intimate act on someone who happened to inherit the string. Store **both** the member
    number and the name at plant time: the number is identity, the name is for display and for the
    absent-target message.

  **Documentation note, per DW:** the in-game help and the wiki should both recommend *against*
  naming a specific person in a trigger unless it is deliberately situational — his example being
  that if you are routinely in a room with the same person, aiming a trigger at them makes sense. A
  name in a trigger is a bet that the room will look the same later, and usually it will not.
- **Depth and permission re-checks at dispatch**, per the Phase 1 rule: `ActivityAllowedForGroup` was
  checked when the line was spoken and the world may have changed by the time a paced step runs.

### Provenance — premises I could not confirm

Filed honestly rather than silently accepted. DW's framing referenced several prior decisions; of
these, **the validating entry point** and **the target resolver** are real and are pointed at above.
The following are **not recorded anywhere in this repository** and no decision by these names exists:
a name-resolver borrowed from **SlaveParking** (that project is cited in these docs for
`HANDLER_UNDRESS_ORDER`, `NON_CLOTHING_GROUPS` and two constants — nothing about names); a settled
third-party consent principle referred to as **"Bob"**; and a **per-refused-target cooldown**. They may
have been settled in conversation and never written down. They are written down now, as
recommendations rather than as recalled decisions.

---

## Clothing & Bondage Consent Interfaces

### Clothing Removal Consent
Subject configures per-item or per-category willingness for clothing removal suggestions:

| Level | Meaning |
|-------|---------|
| **Comfortable** | Will comply without resistance |
| **Hesitant** | Will show resistance; high trust / deep trance can overcome it |
| **Never** | Hard limit — cannot be suggested regardless of trust level |

BC already organizes clothing into slot groups (head, mouth, chest, lower, feet, etc.) — the interface could work per-slot rather than per-item to keep it manageable. Per-item override could be an advanced option.

### Bondage Consent Interface
Same three-level system (comfortable / hesitant / never) applied to restraint types. Challenge: BC has a very large number of bondage items — a per-item list would be unmanageable.

Options to keep it tractable:
- Per-slot (ItemArms, ItemLegs, ItemMouth, etc.) — same grouping BC already uses
- Per-effect (Freeze, Slow, Blind, Deaf, Gag, etc.) — more meaningful to the player than item names
- Combination: effect-level defaults with per-slot overrides
- TBD — needs more thought before implementing

### Free-form Command Recognition via BC's Activity System
BC already has a named activity system (spank, kiss, caress, kneel, etc.) with buttons that fire when interacting with a player. This activity library is a natural starting point for the free-form parser — if the hypnotist types a phrase that maps to a known BC activity name or alias, the add-on can trigger it. Extend from there with custom suggestion patterns (remove clothing, freeze, follow, etc.).

---

## Player Settings

> **Related:** this is the settings *surface*; the mechanics behind each row live in their own
> sections. The setup wizard that fills these in is under *Trance Depth as the Feature Gate*.

| Setting | Description |
|---------|-------------|
| Base suggestibility | How quickly trust builds with anyone |
| Same-room-time trust | Toggle — passive trust from time alone together |
| Trust decay rate | ~~How fast trust fades without interaction~~ — **built** v0.36.0, on the Stats tab. Named speeds (Never / Very slowly / Slowly / Typical / Fast / Very fast) rather than a number, so the values behind them stay retunable |
| Pace tuning (later) | `H`, rate-limit interval, induction accelerator value — or presets: slow burn / standard / quick |
| Attempt limit | ~~Maximum attempts before a cooldown~~ — **built** v0.65.0, on the Permissions tab. Two or three, default two; a ten-minute cooldown when they run out |
| Resistance floor | Minimum success chance when actively fighting (default 5%) |
| No-answer behaviour | Block attempt entirely (default) or treat as Ignore |
| Drug response | Whether drugs raise or lower effective trust |
| Hard limits | List of always-blocked actions |
| Auto-accept depth | Trust % at which induction acceptance becomes automatic |
| IC stance | RP flavor: resistant / neutral / open |
| OOC preference | Whether mechanics actually work |
| Feature thresholds | ~~Per-feature trust % required~~ — becomes a per-feature **depth tier** selector under the redesign below |
| Stranger ceiling | Max chemical access floor for someone with zero relationship trust (session-only effects only) |

---

## Technical Architecture Notes

> **Related:** the README carries the implementation detail and the BC API traps. *Per-Account
> Storage Risk* under Open Questions is the standing hazard to re-read before any new stored field.

### Data storage
- Subject stores: trust per hypnotist, personal settings, hard limits, active triggers, trigger strength/decay
- Hypnotist stores: global skill, per-subject familiarity, planted trigger records
- Data must persist across sessions
- **Confirmed mechanism** (BCX and LSCG both do this — established convention, not one dev's preference): one LZString-compressed JSON blob written to `Player.ExtensionSettings.<Name>`, pushed via BC's real `ServerPlayerExtensionSettingsSync(name)` API, mirrored to `localStorage` as an offline backup. Use this rather than inventing our own storage/sync path.

### Sync between players
- Communication via BC's Hidden chat message system (same pattern as BCX/LSCG) — confirmed against the live client: `Type: "Hidden"` on a `ChatRoomChat` message is delivered through the normal `ChatRoomMessage` event but never rendered in the visible chat log
- **The channel is shared.** BCX tags its traffic `Content: "BCXMsg"`, LSCG uses `Content: "LSCGMsg"`. We need our own tag (placeholder: `Content: "HypnoAddonMsg"`) from the start so we don't collide with either
- Trust values are subject-authoritative — subject's client is source of truth
- Hypnotist's commands are requests; subject's add-on decides whether they succeed

### Effect hooking
- Adopt `bondage-club-mod-sdk` (MIT license, by Jomshir98 — one of BC's own coders) for wrapping/intercepting BC's own functions, rather than writing our own hook utility. Both BCX and LSCG build on this same package.

### Add-on loader compatibility
- Ship as standalone Tampermonkey userscript
- **FUSAM, corrected:** the real project is `gitlab.com/sidiousious/bc-addon-loader`. It needs no code-level integration — getting listed is a `manifest.json` entry (short ID, long name, description, author, script URL) submitted via merge request or the BC Scripting Community Discord, once we have a stable published script URL. It's a listing step to do whenever we're ready to publish, not a Stage 3 engineering task.

---

## Prior Art: LSCG's HypnoModule

LSCG (a mature, popular BC add-on) already ships a mechanic close to ours — read in full from its source, not summarized secondhand. A per-hypnotist "influence" score, 0–100:
- Suggestion strength = the *installer's* stored influence plus the *current speaker's* stored influence (each halved, then summed), doubled if the subject is already in trance, capped at 100
- Successful compulsion raises influence for both the speaker and (if different) whoever originally installed the suggestion; successful resistance lowers both — a self-reinforcing loop, control begets more control
- Passive decay independent of that loop: every 10 minutes, logarithmic (`ceil(log10(influence))`), so it trends toward zero without contact but slows down as it gets low
- Below-certainty suggestions trigger a resistance mini-game: a random 0–100 roll compared against the influence score, full-screen blur/tint scaling with it, plus an instant "Submit" button as a conscious-allow that skips the roll entirely
- A separate post-wake cooldown, independent of influence, blocks immediate re-triggering
- Trigger words auto-rotate periodically and can be hidden from the subject entirely unless overridden

This validates the shape of our trust mechanic — we're implementing our own, not depending on LSCG's, and we're deliberately differing from it, including in how it's presented to the player, not just internally:
- Per-feature trust thresholds (our table above) vs. LSCG's single all-purpose influence number
- OOC preference layer (genuine resistance / cosmetic RP resistance / hard no) — no equivalent in LSCG
- Architect/ownership as a role distinct from raw trust — LSCG only checks BC's native owner/lover relationship for suggestion-editing rights
- Resistance visual — options noted for decision: (a) short screen pulse/flash when fighting, (b) slow blur that builds the longer the struggle goes, (c) text flavor only, no screen effect. Decision deferred.

## Development Stages

The original staging plan. Stages 1–6 are done; what remains is the Todo below, which is the
live list. These lived orphaned under Session Flow until the 2026-08-31 reorganisation, with
the trance-defaults table stranded between Stage 3 and Stage 4.

### Stage 1 — Proof of life
- Working userscript that loads without errors
- Confirms it is running (console log + optional on-screen indicator)
- Hooks into BC's socket event stream and logs received events to console
- Goal: verify the add-on loads correctly and can see BC's data

### Stage 2 — Command line effects
- Simple text commands (whispered to self or typed in a dev channel) to trigger effects manually
- Test targets:
  - Apply / remove Freeze effect
  - Suppress a clothing message
  - Block wardrobe UI
  - Send a Hidden chat message to another player running the add-on
  - Log trust state for a player
- No menus — pure command/response to verify each mechanic works in isolation

### Stage 3 — Menu design and BC UI integration
- Design where menus live in BC (preference screen, existing mod panels, custom overlay)
- Implement basic settings UI
- Implement trust display (subject can see their trust level with each hypnotist)
- Begin wiring Stage 2 commands to menu actions
- Everything not yet built goes on the **Todo list** with priority and dependency notes

### Stage 4 — Session flow (done, v0.7.0)
- Session state machine with the subject's client as the sole authority
- Attempt → private Agree/Ignore/Fight prompt → induction window → success roll → trance
- Feature buttons gated behind an established session
- Hard-floor safeword

### Stage 5 — Spoken suggestions (done, v0.8.0–v0.9.1)
- Natural-language parsing of the hypnotist's chat during a session
- Three suggestions with restriction and release phrasings, plus flavor text
- Name gate: the hypnotist must address the subject by name

### Stage 6 — Trust accumulation engine (done, v0.15.0–v0.18.0)
- Per-hypnotist **interaction counts** stored in ExtensionSettings, keyed by member number — trust derived on read, never stored (see Trust & Experience Gain Curve)
- Conversation tracking: messages directed at each other build trust slowly over time
- Formal induction as an accelerator (successful session grants a trust bump)
- Non-linear gain curve: fast at low values, increasingly slow near the cap
- ~~Separate "going under" and "resistance" experience stats per subject~~ — settled as a **single pool** whose sign follows the choice (see Open Questions)
- **Still outstanding:** optional player notification when trust meaningfully changes; decay; base suggestibility and same-room-time settings; hypnotist global skill (see the Todo below — it lives on the hypnotist's client while the roll runs on the subject's)
- Settings for default trance effects: cannot move, cannot speak, screen fade (on/off toggles initially, threshold sliders later)
- Debug mode: visible trust readout per hypnotist for testing

### Todo (staging TBD)

- **The stray asterisk on the induction's room line — parked 2026-09-23 by DW, to address later.**
  From DW's tracker (group C): *"The induction chat announcement contains an erroneous leading
  asterisk."* Not fixed in v0.82.3 because nothing in our code singles that line out: every room
  line goes through `tellRoom()` as a `**`-emote, the v0.72.7 fix for the doubled name (Known Bug
  #5). A stray `*` can only come from how BC *displays* a `**`-emote, which `test/notify.mjs`
  models but cannot prove, and the BC source is unreachable from cloud sessions. **Start with** the
  raw induction line copied from DW's chat exactly as shown, and ideally one other room line from the
  same session to tell whether every room line has it or only this one. **Do not** change the `**`
  prefix without that: the obvious "fix" brings the doubled name back.

- **Spoken orgasm denial still does not stop orgasms — NOT RESOLVED, parked 2026-09-23 by DW.**
  Known Bug #10. Two fixes shipped and neither held live. v0.83.1 got DenialMode into BC's cached
  `Player.Effect`; in play a toy was then held at 99 but the subject's own masturbation still
  finished her. v0.83.2 hooks `ActivityOrgasmPrepare` and `ActivityOrgasmStart` (`src/denial.ts`)
  and swallows both while our carrier holds DenialMode; DW reported it "still not working" the same
  night and parked it, with no transcript. **Start with** a raw transcript of a v0.83.2 run (the
  subject's first ECHS chat line must read v0.83.2), the subject's add-on list, and, straight after
  "you cannot cum", the subject's console output of `hasOwnEffect`'s source of truth:
  `Player.Appearance.find(a => a.Asset.Name === "Emoticon")?.Property?.Effect` and
  `bcModSdk.getPatchingInfo().get("ActivityOrgasmPrepare")?.hookedByMods`. If our name is missing
  from `hookedByMods`, the hook never installed; if DenialMode is missing from the carrier, something
  stripped it; if both are there, the orgasm is taking a route through neither function. BC's own
  code for both functions is quoted in `src/denial.ts`. Run sheet: *Needs Testing* item 14, step 1b.

- ~~**▶ NEXT — THE FIRST-RUN NOTICE. Approved 2026-09-16, ahead of alpha.**~~ — **built v0.74.3.** To the spec below: `welcome.ts` `maybeShowFirstRunNotice()`, fired from `startRecovery()`'s identity-and-room-known branch (no second poll); the two-line notice via `tellPlayer`; a sparse `welcomeShown` flag with the `normalise()` back-fill for already-configured users; fires whenever no hypnotist-actionable permission is granted (fresh install *or* enabled-but-empty), and marks a configured user shown without greeting them. `test/welcome.mjs`, 14 checks. See [`CHANGELOG.md`](CHANGELOG.md) (v0.74.3). The spec is left intact below as the record of the decision. **Moved v0.84.2:** riding `startRecovery()` meant it almost never fired, since that poll stops for good 20 s after load when there is no room, and logging in then browsing the room list takes longer. It now rides the startup banner's poll in `welcome.ts` (up to ten minutes, gated on a known member number as well as a room), still with no poll of its own. `test/first-run-login.mjs`.

  **The problem, in one line:** every permission including `hypnoEnabled` defaults false, and the
  wizard and starter set only appear *if you open settings* — so a fresh install is completely
  silent and indistinguishable from a broken one.

  **The fix:** one notice, printed once per install, into the chat log.

  #### The string

  ```
  [Hypnosis Add-on v0.73.2 — nothing is switched on yet. Click the spiral to set up.]
  [Your reactions are visible to the room by default; Trance Defaults turns that off.]
  ```

  Two lines, deliberately. Line one is why nothing is happening and what to do; line two is the
  thing a tester should learn **before** their first attempt announces itself rather than after.
  Anything longer will not be read.

  **The version comes from `__VERSION__`**, the esbuild `define` fed from `package.json`
  (`build.mjs`) — the same constant the on-screen banner and the `bcModSdk` registration already
  use (`main.ts:22`, `:49`, `:59`). Never hand-write it; it cannot go stale that way.

  Route it through `tellPlayer()` (`notify.ts`), which brackets it and uses `ChatRoomSendLocal` —
  so it is local-only, it never reaches the room, and it inherits the origin exemption.

  #### Where it hooks

  **Use `startRecovery()`'s existing startup poll (`recovery.ts:421`).** It already solves the hard
  part: it waits until `Player.MemberNumber` is known *and* `ChatRoomCharacter` exists before doing
  anything, because **settings must not be read before login**. Reading early caches
  localStorage-or-defaults and the next save writes that stale copy over good server-side data —
  the v0.17.0 data-loss trap, documented at `storage.ts:542`. Fire the notice from the same
  identity-known branch that calls `attemptRecovery()`. **Do not add a second poll.**

  #### The state, and what a returning user sees

  `starterState` already exists (`storage.ts:373`) — absent = "new", `"done"` once the wizard
  finishes — but it answers *"have they configured?"*, not *"have we told them?"*. Used alone, a
  player who never opens settings would be nagged on **every** load, which is the thing this must
  not do.

  So: **one new sparse field, `welcomeShown?: true`.** Absent means not yet shown. Set it the first
  time the notice fires and never show it again. Sparse, like every other reversible default here.

  **`normalise()` needs one back-fill line, and it matters:** treat an existing user as already
  welcomed, or everyone upgrading gets a first-run notice on their next load.

  ```ts
  // Anyone with evidence of having configured the add-on has already met it.
  if (s.starterState === "done" || s.starterState === "applied") s.welcomeShown = true;
  ```

  A stricter version could also check "any feature granted or any trust recorded", but
  `starterState` is the honest signal — it is set precisely when someone has been through setup.

  #### The second trigger condition

  **Yes, fire it for `hypnoEnabled` on with no other permission granted** — that is the same silence
  for a different reason, and nobody chooses it deliberately: enabling hypnosis and granting nothing
  is not a configuration anyone wants. It uses the **same one-shot `welcomeShown` flag**, so it
  still cannot nag.

  **But not for "Hypnotist only".** Someone who picked that preset has `hypnoEnabled` off *on
  purpose* and is fully configured (`starterState === "done"`), so the back-fill above already
  excludes them. Do not add a third condition for them — their case is covered by the hypnotist
  being told which gate refused, which already works.

  #### What it must NOT do

  - **Not auto-enable anything.** Not one toggle, not the starter set, not `hypnoEnabled`.
  - **Not pre-tick.** The starter-set offer's existing behaviour is the model: *offered, not
    applied*, undoable in one click.
  - **Not nag.** Once per install, full stop — no per-load, no per-version, no re-show on a bump.
    Alpha will bump the version often and a version-keyed notice would fire constantly.
  - **Not reach the room.** `tellPlayer`, never `tellRoom`.

  The gap between *"we set this up for you"* and *"shall we?"* is the whole point for a consent
  tool. This notice exists to close a discovery gap, not a configuration one.

  #### What already exists — extend, do not duplicate

  - **`main.ts:22` already draws an on-screen banner**, `Hypnosis Add-on v${__VERSION__} loaded` —
    a DOM element, not a chat line. It proves the script is running but says nothing about setup.
    **Leave it alone**; the new notice is the chat-log half, not a replacement.
  - **The wizard** (`wizard.ts`) already owns first-run *configuration* and the `starterState`
    lifecycle. The notice must not duplicate any of it — it only points at it.
  - **The starter-set offer** on the Permissions tab is the in-settings version of the same nudge.
    Same relationship: the notice gets them to settings, that offer takes over.
  - **There is no existing load-time chat notice and no version-changed notice.** This is new
    surface, and it should stay the only one.

- **▶ THEN — A PENDING TRIGGER RECORDING MUST NOT SURVIVE THE SESSION THAT STARTED IT. Found by
  review 2026-09-16; not yet seen in play, but it is the cheapest bug here to trip over.**

  #### The failure, as cause and effect

  A hypnotist says *"Missy, your trigger word is sleepy time"* and starts narrating suggestions into
  it. Before he commits, **the session ends** — she safewords, she wakes, it times out, or she
  unticks *Hypnosis Enabled*. `cancelRecording()` is called from exactly one place, the explicit
  *"forget the trigger"* (`voice.ts:1095`), so **the recording survives, still pointing at him.**

  Later, in a new session with **a different hypnotist**, he says *"Missy, you cannot move."*
  `handleSpokenLine` matches it, the gates pass, and `recordAction()` returns a message — so the
  suggestion is **captured into the stale trigger instead of performed**. He watches nothing happen,
  five lines running. She gets *"That settles into place, waiting"* where the effect should be. The
  confirmations go to the **first** hypnotist, who may not be in the room.

  **Both players conclude the add-on is broken, and neither can work out why.** The trigger flow is
  one of the first things a tester pokes at, and the safeword is the thing they will be told to try
  first — so the two halves of the repro are the two most likely things to happen on day one.

  #### The teardown surface is wider than it looks — which decides the fix

  Enumerated:

  | Path | Reaches |
  |---|---|
  | `totalStop()` | safeword (`session.ts:965`), `hardFloorStop()` (`:987`, master switch off via `menu.ts:1081`), `stopForReset()` (`:1007`, via `storage.ts:866`) |
  | `endSession()` | self-wake (`:959`), hypnotist wake (`:1081`, `:1326`), session timeout (three `setTimeout` sites), and the reconnect "already ran out" path (`:1206`) |
  | `releaseEverything()` | **recovery.ts:214 — and it goes through neither of the above.** It strips effects directly on the orphan/disconnect path |

  **Three separate surfaces, one of which bypasses both shared teardowns.** An eager fix has to
  remember all three *and* every one added later. That is the argument against doing it eagerly.

  #### Recommended fix: lazy invalidation, which cannot be forgotten

  **Do not call `cancelRecording()` from the teardown paths. Make the recording check its own
  liveness instead.** `triggers.ts` already imports `session.ts`, so `isSessionActiveWith()` is
  available with **no import cycle, no new module and no registration**:

  - `isRecording()`, `recordAction()`, `commitRecording()` and `describeRecording()` each drop the
    recording and behave as "not recording" when
    `!isSessionActiveWith(recording.hypnotistId)`.

  **Why this over the registration patterns.** `timers.ts` and `carry.ts` both exist to break exactly
  this cycle, and either could be copied — but both require the teardown paths to *remember* to fire
  the hook, which is the failure mode that produced this bug in the first place. Lazy invalidation is
  correct by construction: a teardown path added next year needs no change, and `releaseEverything()`
  needs none today. **It is also the idiom this codebase already uses** for trust decay and trigger
  strength — *"lazily on read… nothing to schedule, nothing to miss, correct across reloads on its
  own."* Same reasoning, same shape.

  **Do not widen `timers.ts`'s remit to carry a teardown registry.** Its `clearAllTimers()` is
  already called from both shared teardowns and it would be tempting to hang this off it — but
  cancelling a recording is not clearing a timer, and that coupling would be a third pattern
  invented to avoid a problem lazy checking does not have.

  #### What survives, and the reconnect case answers itself

  **A brief disconnect with successful recovery should keep the recording, and with lazy invalidation
  it does — for free.** A socket drop without a page reload leaves the module-level `recording`
  intact; recovery resumes the session with the same hypnotist; the liveness check then passes and
  narration continues where it left off. A disconnect *with* a reload destroys all JS state anyway,
  so there is nothing to preserve and nothing to decide.

  So: **it survives precisely the case that should survive, and dies in every case that should die,
  without anyone enumerating the paths.** No extra work, no stored state, no persistence.

  #### Who is told

  Check the existing explicit path first and stay consistent with it. `cancelRecording()` itself is a
  bare `recording = null`; the messaging lives at the call site (`voice.ts:1093–1098`), where **the
  subject** gets *"Whatever was being set aside comes apart again."* and **the hypnotist gets
  nothing.**

  That asymmetry is right and it inverts here, for the same reason: on the explicit path *he caused
  it and knows*. On a teardown path he may not know — he might still be narrating, or he might have
  been the one disconnected. So:

  - **Tell the hypnotist, at the moment the stale recording is dropped** (i.e. on his next line, from
    inside the lazy check): `[trigger] That recording ended with the trance — nothing was saved.`
    Rule 5: he narrated suggestions into something that no longer exists, and silence would leave him
    debugging his own phrasing.
  - **Tell the subject nothing.** Two reasons, and the second is the stronger: the teardown already
    speaks for itself (*"Safeword. Trance cleared, all effects released…"*), and a dedicated line
    would **disclose that a recording was in progress** — which is exactly what *Awareness → Trigger
    setup* exists to hide from her. A counterpart to *"Something is being set aside in you"* would
    leak the thing that line was careful not to name.

  #### The test — this is the class the suite exists for

  In `test/triggers.mjs`, one assertion per teardown surface: start a recording, end the session by
  **safeword**, by **wake**, by **timeout**, and by **unticking Hypnosis Enabled**; after each,
  assert `isRecording()` is false **and** that a subsequent suggestion is *performed, not recorded*.
  The second half is the one that matters — `isRecording()` returning false while `recordAction()`
  still captures would pass a weaker test and ship the bug.

  Add one positive case so the suite is not just asserting destruction: recording survives a
  disconnect that resumes to the same hypnotist.

  #### Relationship to the first-run notice above

  **Independent — no shared files.** The notice touches `main.ts`/`recovery.ts` (the startup hook),
  `storage.ts` (the `welcomeShown` field and its `normalise()` back-fill) and `notify.ts`. This
  touches `triggers.ts` and `test/triggers.mjs`, and on the recommended approach **does not touch
  `session.ts` at all**. Bundling them is batching, not shared work — one version bump instead of
  two, and one round of `npm test`. If the code bot would rather ship them separately, nothing is
  lost by doing so.

- ~~Add a way to read off coordinates for future layout, next to the H button, comparable against the game's own Back button~~ — done and since removed; the exit icon now sits at BC's own verified `(1815, 75, 90, 90)`.
- ~~Induction flow (command → prompt → acceptance)~~ — done in Stage 4. The **trust gain** half is still outstanding.
- ~~Hard floor / panic command~~ — done: `/hypno safeword`.
- ~~Trust accumulation engine~~ — moved to Stage 6
- ~~Trigger system (plant, scope, fire, expiry)~~ — done in v0.20.0–v0.25.0. ~~**Decay**~~ — done in v0.60.0: derived strength, tier discount, capped firing credit, reinforcement by re-induction. The flat duration timer is still there and still separate — that is how long a *fired* trigger holds you, not how long the trigger itself survives.
- Resistance mini-game
- **OOC chat filtering** — any message wrapped in parentheses (e.g. `(just going AFK a moment)`) is OOC by BC convention and must be ignored entirely by the suggestion parser. No suggestion matching, no trust interaction, no trigger firing. Strip the message before it reaches any add-on logic. Add test cases to the pattern suite covering OOC-wrapped versions of known suggestion phrases to prevent regressions.
- ~~**Session state recovery after disconnect**~~ — **built v0.44.0**, see the Priority list. The open design question ("reconnect prompt or silent auto-restore?") resolved as **silent**, with the subject told what happened: the hypnotist is already shown session state through the normal push, and a prompt would make a network blip into a negotiation. **Bug #1 is worth re-testing against this** — a dirty disconnect was a plausible path to awareness flags surviving into a fresh session, and orphaned state is now cleared on load.
- ~~Clothing illusion (rendering override)~~ — done in v0.28.0. What shipped is the **freeze-frame** reading: the subject keeps seeing the clothes they had on when it took hold. Deliberately scoped to the room view — the wardrobe and the item menus still show the truth, which DW ruled out of scope at the time.
- Bondage illusion (Tier 2 mental version) — the *opposite* direction to the clothing illusion and still unbuilt: showing restraints that are not there, rather than hiding changes that are. The shadow-character machinery from illusion.ts is most of what it needs.
- Collateral effect system
- ~~Arousal integration~~ — done twice over: as the **chemical floor** feeding the induction roll (v0.18.0), and as **spoken suggestions** that set the level, force an orgasm or deny one (v0.27.0).
- Drug integration
- Architect role / permission hierarchy
- Save states / named reset points
- Induction script library
- FUSAM compatibility
- **Clothing consent interface** — see below
- **Bondage consent interface** — see below
- Free-form command parser using BC's existing activity system as a base library
- ~~**Commanded activities as trigger actions**~~ — **built v0.72.4**, paced v0.72.5, depth-gated at
  fire time v0.72.6. Encoded `act:<Activity>:<word>` (plus `act:genital` / `act:vague`) beside the
  existing `touch:<word>`; it was also the fix for the recording collision. Full spec and the shipped
  divergences: *Commanded Activities — as trigger actions*.
- **Pacing for commanded activities — half built.** ~~A fired trigger's actions arrive all at once~~
  — **fixed v0.72.5**, drained one per jittered tick with per-step re-validation. **Still open: pacing
  successive *live* commands**, and **DW's suspicion from play 2026-09-14 that the pause is only
  spacing the flavour text and not the activities** — unverified, nobody has read the drain path
  against it. See *Commanded Activities — pacing*.
- **⚠ Plant-time depth for parameterised actions — awaiting DW's ruling.** `handleActivityCommand`
  records into a trigger after the permission check but **before** the depth gate, and
  `handleBodyPartLine` does the same; the suggestion path checks depth first. Narrow in practice
  (planting already demands Deep), but the two rules disagree and one should go. Detail under
  *Commanded Activities — as trigger actions* → *Recording*.
- **Still open, deferred by DW 2026-09-13.** (2) Drop `feel` from the `Caress` verb list — "your arms
  feel heavy" parses as a command, and **now that recording ships it writes itself into a trigger**
  rather than firing one stray caress. (3) Make `handleTriggerFiring` return `false` when it
  suppresses a double-fire, so a trigger phrase inside a command line stops silently swallowing the
  command.
- **A human label for trigger actions.** `describeTriggerList` prints raw ids, so a subject's own list
  reads `act:genital`. One `describeActionLabel(id)` helper, shared with the recorded-confirmation
  line. Small, and it is the difference between a readable list and an internal one.

- **⚠ TRIGGER SCHEMA — the window closes at alpha. 2026-09-16.** Missy is the only person with
  planted triggers, so changing the `Trigger` record is free today and a migration forever after.
  Full consolidated schema in *Trigger Storage — one consolidated schema change*, now revised by the
  **phrase-uniqueness decision** (*Trigger Phrase Uniqueness and Override*, decided 2026-09-16).
  **Authorise the small pass now:** enforce uniqueness (which *requires* changing `saveTrigger`'s
  de-dupe from `(phrase, installedBy)` to phrase alone), add `key` as the natural key so phrase-less
  touch triggers do not force a second pass later, plus optional `scope?` and `expiresAt?` whose
  defaults are exactly today's behaviour. Touch-trigger fields and the third-party `actionData` wait
  on decisions. **The migration is not the expensive part** —
  `normalise()` makes optional fields free; the cost of deferring is re-touching `timerKey`,
  `forgetTrigger`, `saveTrigger` and `describeTriggerList` each time.

- **Commanded activities Phase 2 — acting on others. DW's spec, 2026-09-16, POST-ALPHA.** Touching
  the hypnotist, a named player, or a random bystander, with zones tiered by depth. Full assessment
  in *Commanded Activities — Phase 2: acting on others*. **Four things to settle before building:**
  drop the fuzzy name match (the resolver in `commands.ts:95` already refuses on ambiguity, and a
  near-miss here performs a real intimate act on someone never named); **pick one bystander rather
  than retrying past refusals**, which otherwise systematically finds the most permissive person in
  the room; default `allowTouchHypnotist` to **false** like every other permission; and collapse all
  third-party refusals to one reasonless message, or the command becomes a probe for reading
  strangers' settings. The zone-tier ladder is good and should be **retro-fitted to Phase 1**, where
  `compelActivity` currently gates every zone at one flat tier.

- **⚠ THE WIKI IS A SECOND SURFACE AND IT WILL DRIFT — keep it in step. Added 2026-09-16.** Player
  documentation now lives in **`wiki/`** (one markdown file per GitHub wiki page: `Home`,
  `Getting-Started`, `Consent-and-Safety`, `Your-First-Session`, `What-to-Say`, `Depth-and-Trust`,
  `Triggers-and-Lasting-Effects`, `Commanded-Activities`, `Settings-Reference`, `Commands`,
  `Troubleshooting`). The old developer README moved to **`docs/DEVELOPMENT.md`**; `README.md` is now
  short and user-facing.

  **DW's decision: the wiki and the in-game help are deliberately separate and both must stay
  independently usable** — some players will read ahead, some will look things up mid-scene. The
  wiki is hand-written and self-contained rather than a dump of generated output, so a reader who has
  not installed anything can still follow it.

  **The cost of that decision is drift, and it is now a standing obligation.** The in-game *What to
  Say* and *Commands* tabs are **generated** from `SUGGESTIONS` and the command table, so they cannot
  fall behind the code; the wiki pages covering the same ground **can and will**. So:

  - **Any change to `voice.ts`'s pattern library, the command table, `DEPTH_GATES`, the permission
    list or the settings tabs is also a wiki change.** Treat it as part of the same piece of work,
    the way `package.json` is.
  - The wiki pages say in their own text that the in-game help is generated and is the more current
    of the two where they disagree. That is the honest fallback, not a substitute for updating them.
  - `Troubleshooting` carries a *Known rough edges* section naming open bugs by behaviour (the
    `Caress`-on-"feel" false positive, the swallowed command). **Those entries come out when the bugs
    are fixed**, or the wiki starts warning about things that no longer happen.
  - The pages are written against **v0.73.2** and say so. Bump that line when the content is
    re-checked, not when the version changes.
  - **Publishing is automatic since 2026-09-23.** `.github/workflows/sync-wiki.yml` mirrors `wiki/`
    into the GitHub wiki on every push to `main` that touches it. Until then it was copied by hand,
    and the live wiki was found at v0.77.0 with `wiki/` at v0.85.0. The sync overwrites the live
    wiki, so an edit made in the website's editor is lost at the next push: edit `wiki/` only.

- **⚠ EARLY-SESSION PROGRESSION — DW's spec, 2026-09-17. Three levers for low-trust starts.**
  Restated in our terms; his intent and his three levers are unchanged and marked as his. **Read the
  premise check first — it changes which lever is worth building.**

  **His problem statement.** New players, or new partners with zero trust and zero experience, expect
  results; baseline resistance gates success behind accumulated history; early attempts fail or
  stall; people get confused and give up. He does not want to gut progression — he wants levers that
  let *willing* participants streamline entry, plus an in-fiction alternative.

  **His three levers.** **A** — an explicit-consent multiplier, so accepting the prompt substantially
  offsets low trust. **B** — subject-side pacing controls: an `inductionDifficulty` /
  `susceptibilityBias` (Easy / Standard / Strict) and a `bypassTrustRequirements` toggle. **C** — a
  chemical / aphrodisiac / substance system as an in-fiction fast track, with `activeSubstance`,
  `resistanceDebuff`, `durationRemaining`.

  ### ⚠ Premise check — computed, not recalled. The stated problem does not exist for willing subjects.

  Two brand-new profiles: trust 0, experience 0, no arousal, no relationship, no skill (skill is
  inert today — every production caller passes `NO_SKILL`). From `chanceBeforeInvariant`
  (`session.ts:550`): `raw = access + CHOICE_MODIFIER + exp×0.25 + rpBonus + skill`, clamped to
  **[5, 95]**. `CHOICE_MODIFIER` is `{agree: +25, ignore: 0, fight: −25}`; RP is **+5 per line,
  capped at +15**; default attempts **2**.

  | Choice | Per attempt | Across a session (2 attempts) |
  |---|---|---|
  | **Agree, no roleplay** | **25%** | **44%** |
  | **Agree, 3+ RP lines** | **40%** | **64%** |
  | Ignore, no roleplay | 5% *(floor)* | 10% |
  | Ignore, 3+ RP lines | 15% | 28% |
  | Fight, any | 5% *(floor)* | 10% |

  With the subject's attempt limit set to 3, Agree + roleplay is **78% across a session**. With
  arousal at or above 30 (the stranger ceiling), Agree + roleplay is **70% per attempt, 91% across a
  session** — at zero trust, with a total stranger.

  **So a willing subject and a hypnotist who bothers to roleplay already land inside one session,
  most of the time.** The punishing numbers are Ignore and Fight at zero trust, both pinned to the
  5% floor — and those are subjects who chose not to cooperate. **That is the system working.**

  ### The real friction is depth, not induction — and it is one line of code away

  `resolveDepths` (`session.ts:466`) sets `depth = chance − roll`. At a 40% chance, a successful roll
  is uniform in [0, 40), so **depth is uniform in (0, 40] with a mean near 20** — and **Yielding
  starts at 20**. So roughly **half of all first successes land at Drifting**, where the only things
  that work are the three awareness suppressions. Everything a new player would actually try —
  *cannot move*, *cannot speak*, posture — needs **Yielding**.

  **The experience is therefore: the induction works, and then nothing does.** That reads as failure
  and is much more likely to be what DW is seeing than the attempt rate. It is also a different fix:
  a floor under first-success depth, or lowering the Yielding-tier gates, not a consent multiplier.

  ### Lever A — already shipped, and already dominant

  `CHOICE_MODIFIER.agree = +25` **is** the explicit-consent multiplier. At zero trust it is 25 of the
  40 points a willing, roleplayed attempt carries — the single largest term in the formula. **A is
  not absent; it is the thing already doing the work.**

  So A is a **tuning question, not a feature**: is +25 enough? Worth answering with the table above
  in hand rather than by adding a second consent term that would double-count the same signal.

  ### Lever B — genuinely new, consent-positive, and it has a sharp edge

  A subject choosing to be easier to hypnotise is categorically different from a hypnotist-side
  lever, and it is the right direction. Two notes:

  **It is the same shape as the skill-honour ladder** (Depth tab: *ignore · only from people I trust ·
  up to a cap from anyone*) — subject-side control over how much reaches her. `susceptibilityBias`
  should **compose with it and sit beside it on the Depth tab**, presented as one axis, not bolted on
  elsewhere as a second difficulty concept.

  > **⚠ Making induction easy must not make DEPTH easy, and today it would.** `resolveDepths` calls
  > `inductionChance` — the *same* number. Any bias added to `raw` therefore raises the resulting
  > depth by exactly as much, which would quietly lift a zero-trust subject toward **Deep**, where
  > `triggerControl`, `carryForward` and `illusionControl` live. Those are the earned-only three and
  > the whole point of them is that they cannot be bought.
  >
  > **So `susceptibilityBias` must apply to the success test only, not to `resolveDepths`.** That
  > means splitting one number into two, which is a real change, not a setting. Build it that way or
  > not at all.

  **`bypassTrustRequirements` is worse and should not ship as written.** Trust feeds both the roll
  *and* `depthAllows` via `accessFor`. A blanket bypass opens the earned-only features to a stranger
  directly — it is not a pacing control, it is a hole in the consent model. **If the intent is
  "skip the grind with someone I already trust", that is what the relationship floors already do**
  (friend 15 · lover 30 · owner 65, each with its own reach) and what `/hypno settrust` does for
  testing. Recommend: drop this, or reframe it as a manual per-person trust grant capped at the
  session-only reach.

  ### Lever C — the channel exists; only the source is missing

  Already shipped: `chemicalFloor()` (`session.ts:435`) reads BC arousal and returns
  `min(progress, STRANGER_CEILING = 30)`; `effectiveAccess` takes `max(trust, relationship,
  chemicalFloor)`; the `chemicalScope` setting already has **four** options (*Both / Arousal / Drugs /
  Neither*) with *"Drugs only"* and *"Neither"* deliberately behaving alike **until drugs land, so no
  saved preference needs migrating on the day they do**; and the earned/full split plus
  `plantedChemical`'s fixed fast decay already price the shortcut.

  **So `resistanceDebuff` as a new parallel resistance term would duplicate a channel that exists and
  is already safety-checked.** The right shape is: **a substance sets the chemical floor; everything
  downstream is unchanged.** `activeSubstance` + `durationRemaining` are genuinely new and fine —
  they are the *source*. The debuff is not.

  This also inherits the guarantee already recorded at `session.ts:431`: the chemical floor is for
  **session-only** effects and must never reach persistent state, however high the ceiling goes.

  ### Collisions with settled work

  - **§A2 of `declared-skill-proposal.md` — PARKED until fatigue exists — governs this exact axis.**
    It parks two weights (proposed `0.35` additive, `0.25` on the Fight floor) precisely because
    retuning induction difficulty without fatigue is unsafe. **Lever B is the same dial.** Doing both
    independently means two unrelated changes fighting over one number. Either unpark A2 and treat
    B as part of it, or hold B until fatigue lands.
  - **The Fight-never-worse-than-Ignore invariant is live** (`inductionChance`, the `Math.min`
    against the Ignore branch). A bias added inside `chanceBeforeInvariant` is safe because the
    invariant wraps it; a bias applied *after* would break it. `test/odds.mjs` sweeps this — keep it
    passing.
  - **The skill seam (`skill.additive`, `skill.fightFloor`) is the slot a bias would occupy.** Adding
    a second additive term before the ladder lands makes the ladder's tuning harder, not easier.

  ### ⚠ The honest risk: three solutions to one problem

  A difficulty slider, a trust bypass and a chemical fast-track are three independent ways to reach
  the same outcome. **Ship all three and the trust curve is decorative** — there is no configuration
  in which anyone would grind it, and the relationship mechanic that the whole design rests on stops
  mattering.

  **He does not need all three, and the premise check says he may need none of them urgently.**
  Recommended order:

  1. **Fix the depth problem first** — a floor under first-success depth, or re-examining which
     features sit at Yielding. This is the actual reported experience and it is the smallest change.
  2. **Then re-read the numbers above and decide whether +25 is enough.** Tuning, not building.
  3. **Then Lever C**, because it is in-fiction, it is capped at 30 by construction, it cannot reach
     persistent features, and the channel already exists — it is the *safest* of the three.
  4. **Lever B last, and only the bias half, and only with A2**, with the depth split done properly.
     Drop `bypassTrustRequirements`.

- **⚠ SENSORY SUPPRESSION — two specs from DW, 2026-09-16. POST-ALPHA: ship alpha first, then these
  next.** Vision and hearing arrived as separate specs and are filed as one item, because **they are
  one feature.** DW's rule that blindness must *not* mask names is justified by voice identification;
  his rule that deafness at level 2 *must* mask names is the case where voice identification fails.
  Written independently, a week apart, the two specs agree — and the agreement is the design: **what
  she loses determines how she identifies people, and each sense covers the other's gap.** Build them
  on one state model and one set of gates, not as two features that happen to be adjacent.
  Restated below in our terms at DW's invitation; **his level ladders and his intent are unchanged**
  and are marked as his.

  ### Vision — `visionLevel` 0–3 *(ladder and intent: DW)*

  **His model, kept:** 0 normal · 1 impaired/partial darkness · 2 heavy/tunnel · 3 complete blindness,
  capped by the player's own base-game settings. Lifecycle on the existing session timer, trigger
  durations and wake/release. Spoken triggers to raise, lower and clear. **His two rules, kept:** do
  not mask names (voice still identifies), and clamp to the client's own blindness cap rather than
  forcing an unapproved black screen.

  **Verified against R131 `Scripts/Character.js`:**

  - His ladder *is* BC's ladder — `BlindLight` 1, `BlindNormal` 2, `BlindHeavy` 3
    (`CharacterBlindLevels`), rendering at brightness 0.3 / 0.15 / 0.0 through
    `CharacterGetDarkFactor()` (`:2266`). He described BC's design without having read it.
  - The cap is real and nameable: `GetBlindLevel()` clamps to 2 when
    `Player.GameplaySettings.SensDepChatLog === "SensDepLight"`, else to 3 (`:297`).
  - **⚠ The Emoticon carrier does not work for blindness.** `GetBlindLevel` ignores the cached
    `C.Effect` and re-derives from items in `ItemHead`, `ItemHood`, `ItemNeck`, `ItemDevices` **only**
    (`:289`). A `BlindHeavy` on our Emoticon validates, syncs, and still reads as zero.
  - **So hook `CharacterGetDarkFactor` instead** — a plain global and the single funnel for screen
    darkness, hookable like `DrawCharacter` and `ActivityRun` already are. That route bypasses the
    clamp inside `GetBlindLevel`, which makes DW's "query the native setting" rule **mandatory rather
    than redundant**: read `SensDepChatLog` and apply `min(2, …)` ourselves.

  **Premise to correct: there is no 30% darkness overlay to deprecate.** What exists is
  `TRANCE_FADE_OPACITY = 0.3` (`effects.ts:115`), painted `rgba(255,255,255,0.3)` — **white** — in a
  `DrawProcess` hook (`main.ts:218`), thinning to `0.08` in walking trance. *Default Hypnosis State
  Effects* specs it as *"not blind, not black… dreamlike without cutting off visual context"*: it is
  the trance **indicator**. Deleting it removes the only sign she is under, and white over dark washes
  out rather than compounding. Keep it; layer vision on top.

  ### Hearing — `hearingLevel` 0–4 *(ladder and intent: DW)*

  **His model, kept:** 0 normal · 1 garbled, sender visible · 2 garbled, sender masked · 3 suppressed
  with sporadic atmospheric fallback · 4 complete silence. A `maxHearingLevel` cap; a trigger asking
  for more **clamps silently, without an error**. Settings, kill-switches and emergency release stay
  live at every tier. Public chat and whispers treated alike unless exempted; the subject's own
  outgoing and reflected messages never blocked.

  **Verified against R131 `Scripts/Speech.js` and `Character.js`:**

  - **The garble routine is `SpeechTransformGagGarble(text, intensity, ignoreOOC)`** — character-
    agnostic, takes a raw intensity, directly callable. `SpeechTransformProcess(C, text, effects)` is
    the orchestrator; `"deafen"` is its receiver-side effect (`SpeechTransformReceiverEffects`).
    `SpeechGarble` / `SpeechGetTotalGagLevel` / `SpeechGarbleByGagLevel` are the deprecated aliases —
    **do not write against those.**
  - `SpeechTransformDeafenIntensity(C)` maps `Player.GetDeafLevel()` to garble intensity: 1→2, 2→4,
    3→6, 4→8, 5→12, 6→16, 7→20.
  - **BC already does his level 2, and names it the way he guessed.** `SpeechAnonymize(msg, characters)`
    replaces names with `InterfaceTextGet("Someone")`, gated per character by
    `ChatRoomIsCharacterImpactedBySensoryDeprivation(C)`, documented as *"used as part of
    sensory-deprivation processing."*
  - **⚠ The asymmetry that matters — deafness is the mirror image of blindness, in both directions.**
    `GetDeafLevel()` iterates **all** of `this.Appearance` with no group restriction
    (`Character.js:624`), so **the Emoticon carrier DOES work here** — the opposite of vision. But it
    applies **no SensDep clamp at all**, so BC will not protect her: `maxHearingLevel` is entirely
    ours to build. Vision gets a free cap and an unusable carrier; hearing gets a usable carrier and
    no cap. Neither spec anticipated this and both assumed symmetry.
  - **Level 4 is not reachable through BC's engine.** Deafness garbles, it never silences — at maximum
    it returns `mmmmm`. A single `DeafTotal` on the Emoticon is level 4 → intensity 8 (*VeryHeavy*),
    not silence. So **levels 1–2 are BC's engine; levels 3–4 are ours** and are the only part that
    needs a message handler at all.

  **⚠ OPEN — do whispers still work under hearing impairment?** The original spec treated whispers as
  room chat unless exempted; **DW is no longer sure, and this is recorded as open rather than
  settled.** The two arguments, both good:

  - **For exempting whispers:** a whisper is the channel a person reaches for to check on someone out
    of character — *"are you still alright with this?"* — and that check happening in the same room,
    quietly, without breaking the scene, is a real safety affordance. Deafening it means the only way
    to ask is to break the scene entirely. Note this is *not* covered by the origin exemption, which
    protects add-on-generated messages, not another player's.
  - **Against exempting whispers:** an exempt channel is an obvious cheat channel. If whispers always
    land, "deafened" becomes a costume — the hypnotist (or anyone) simply whispers instead, and the
    feature stops meaning anything the moment both players notice.

  Worth weighing alongside two things already settled: OOC text in parentheses is **already** stripped
  before the add-on reads any line (`stripOOC`), so the genuinely out-of-character check may be
  protected without exempting the whisper *channel* at all — which, if it holds, dissolves most of the
  first argument and points at exempting OOC content rather than whispers. And the name rule above
  interacts: if her name cuts through, a whispered *"Missy, are you okay?"* already reaches her.

  ### Shared — what both need, and what neither spec has

  - **`suppression.ts` should own the hook, and extending it is additive.** It already registers a
    `ChatRoomRegisterMessageHandler` at Priority 320, *"after arousal, before display"*. Its
    `classify()` returns null for anything that is not `Activity` or `Action` (`suppression.ts:96`),
    so **it does not touch dialogue today** — `Chat`, `Whisper` and `Emote` pass through untouched.
    Hearing would be the first consumer of those types, colliding with nothing that exists.
  - **⚠ Ordering against *words she cannot hear*, which is specced and sits on the same hook.** They
    compose, but only one way round: **content filtering first, channel degradation second.** Garble
    first and the word filter can no longer recognise its own target, so it silently stops working at
    `hearingLevel ≥ 1`. Filter first and garble after, and the redaction is hidden inside the garble
    rather than leaving a visible hole that says *"a word you may not hear was here."* At
    `hearingLevel ≥ 3` the message is not rendered at all, so the word filter is moot. One handler,
    one ordered pipeline, hearing last. **Somebody has to own this decision before either is built.**
  - **The origin exemption already covers this, and the wording generalises.** *Word-Level Control →
    Exit-path audit*: **"Any message the add-on itself generated is never subject to the incoming word
    filter."** It holds for hearing for a structural reason as well as a stated one — `tellPlayer()`
    routes through `ChatRoomSendLocal` (`notify.ts:36`), which renders directly and never enters the
    incoming handler chain, so `hearingLevel` 4 cannot reach it however it is implemented. **The part
    that is not free: BC's own safeword actions** (`ActionActivateSafewordRevert`,
    `ActionActivateSafewordReleaseAll`) are real `Type:"Action"` messages that *do* traverse the
    pipeline, and a level-4 "drop all incoming" would eat them. Exempt by origin, exactly as the word
    filter does.
  - **DW's "parse commands before suppression" rule is already satisfied — as long as nobody mutates
    the payload.** `handleSpokenLine` reads `data.Content` via `stripOOC` (`main.ts:104`), independent
    of what is rendered, and the trigger-setup path already parses-then-suppresses (`:111–115`). So
    **garble the rendered output, never `data.Content` in place** — mutating it would silently stop her
    triggers firing and the hypnotist's commands landing, and it would look like a parser bug.
  - **DECIDED 2026-09-16 — her name cuts through. A line that starts with the subject's name is
    heard, and she reacts to it.** DW's rule, and it is the better answer to *"does a deafened subject
    still obey?"* than the one the hook order was about to give by default. "She is controlled by
    words she cannot hear" is coherent but slightly hollow; **"her name cuts through the fog"** is
    real hypnotic fiction, is how attention actually works, and is a cleaner rule to implement and to
    explain to a player.

    **Concretely, of the three readings, take the third.** *Bypass garbling entirely* is too clean —
    at `hearingLevel` 4 a perfectly crisp line in a silent world reads as a bug, not as focus.
    *Garbled but still obeyed* is the default we are replacing, and keeps the hollow version. So:
    **she perceives the name-prefixed line while everything around it stays degraded.** The line
    renders intelligibly — at high levels with a marker that it arrived through the fog rather than
    around it (an addon-side line, not a raw pass-through, so it also inherits the origin exemption) —
    and every other message in the room continues to garble and drop at the current level. One
    sentence lands; the room stays underwater.

    **Residue, and it is real: a command without her name at level 3+.** The rule answers most of the
    question, not all of it. A hypnotist who says "sleep" with no name, to a subject at `hearingLevel`
    3 or 4, is the uncovered case — the line is suppressed for display but `handleSpokenLine` still
    sees `data.Content`. Two consistent options, and this one is **open**: either nothing lands (the
    name is the whole channel, which is tidy and matches the fiction), or it lands unheard (back to
    the hollow version for exactly the lines the new rule does not cover). *Recommendation, not a
    decision: nothing lands.* It makes the rule total — **at level 3+, hearing is name-gated, full
    stop** — rather than leaving a quiet back door that behaves differently from everything a player
    would have inferred.

  - **⚠ Question for DW, arising from the rule above — is the hypnotist simply always audible?**
    Not answered here, because it is his to answer. Every spoken suggestion and every command
    **already** requires her name in the line (`mentionsAnyName`, enforced in `handleSpokenLine` and
    in `handleActivityCommand`). So "name-prefixed lines cut through" means, in practice, that
    **essentially everything the hypnotist says to her cuts through, and only the rest of the room
    fades.** That may well be exactly right — the hypnotist's voice is the one thing that reaches her,
    which is the whole fantasy — but it should be *chosen*, not arrive as a side effect of two rules
    agreeing. Worth noting the two are not identical: the name gate wants the name *anywhere* in the
    line, while this rule as stated wants it at the **start**. If they are meant to be the same
    channel they should use the same test; if "starts with" is deliberate, then a hypnotist who writes
    "come here, Missy" is inaudible while "Missy, come here" is not, and that distinction needs to be
    intentional and documented, because players will hit it within a session.
  - **CONFIRMED 2026-09-16 — both get their own settings and their own depth/trust gating.** Raised as
    a gap, accepted by DW; **this is no longer an open decision, it is work.** Each of vision and
    hearing needs, like every other gated feature:

    - a `FeatureToggles` key of its own — two keys, not one shared "sensory" permission, because
      consenting to be blinded is not consenting to be deafened;
    - a row in `DEPTH_GATES` with its own tier, player-adjustable like the rest;
    - a Permissions row and a wizard group, so the setup wizard can offer them;
    - the existing per-level caps as a second, independent axis — DW's `maxHearingLevel` and the
      vision clamp are *ceilings within* a permission, not substitutes for one.

    Session-scoped and `earnedOnly: false` puts both beside `selfTouchControl`. **The earned split
    becomes necessary the moment either can be carried or planted into a trigger**, since being
    blinded for a scene and being blinded until you next log in are different consents — so if
    carry-forward or trigger actions are in scope for these, they follow the `triggerControl` /
    `carryForward` precedent rather than the session-only one. The depth ladder on the help screen
    picks both up for free once the `DEPTH_GATES` rows exist, since it is generated.
  - **Exit paths are the hard constraint on both.** DW's "keep essential UI accessible" and his
    "kill-switches stay live at every tier" are the same rule from two directions.
    `/hypno safeword` must stay readable at `visionLevel` 3 and its confirmation must arrive at
    `hearingLevel` 4. The veil used to paint after `DrawProcess`, over menus and chat alike; since
    v0.82.3 it paints after `ChatRoomRun` over the character half only, and a vision layer should
    start from there.
  - **Unverified, flagged rather than assumed:** the exact `SensDepChatLog` values that make
    `ChatRoomIsCharacterImpactedBySensoryDeprivation` return true. BC anonymising names under sensory
    deprivation is confirmed; the thresholds are not. This matters because **it is her setting, not
    ours** — if she has chosen a level where BC masks names, DW's no-masking rule for vision must not
    fight it. Read `ChatRoom.js` before writing code.
  - **TO OBSERVE IN ALPHA, not to research now — DW, 2026-09-16. Do players actually use BC's own
    sensory settings, or BCX's more granular ones?** Deliberately unresearched at his instruction;
    recorded so it is not lost. **Why it matters:** every cap in this item clamps against *BC's*
    settings — `SensDepChatLog` for vision, and whatever we build for hearing. If the community mostly
    sets its sensory limits in **BCX** instead, then a player who believes she has capped her own
    blindness or deafness may have capped it somewhere we never read, and **we would be
    under-respecting a limit she thinks she has set** — which is the worst failure mode this feature
    has, because it fails silently and in the unsafe direction. No code follows from this yet.
    **Watch during alpha, decide after.** If it turns out to matter, the options are to read BCX's
    settings too (no BCX *code*, per rule 7 — reading a value another add-on published is a different
    thing from copying its implementation, and that distinction should be confirmed before anyone
    relies on it), or to surface our own cap prominently enough that nobody assumes BCX governs it.
  - **Cheaper than both specs read.** No shaders, no CSS, no rendering-loop audit, no bundle archaeology
    for a garble function that is named above. Vision: one hooked global, one clamp. Hearing: one
    effect on the existing carrier for 1–2, one handler branch for 3–4, one cap. Plus the
    permission/depth plumbing that already exists as a pattern. Both level ladders survive intact.
- **The add-on is close to invisible to everyone except the two people in the scene — DW, 2026-09-14.**
  Three separate asks that are one observation from three angles, grouped so whoever picks up one sees
  the others. BC is a multiplayer social game and the audience is part of the point; a room watching a
  hypnosis happen currently has almost nothing to see.

  - ~~**An icon for the add-on.** DW's thought: **spirals.**~~ — **built v0.72.8**, the two-arm
    hypnotic spiral, replacing the "H" on the button and the remote.
  - **Spirals on screen during an induction** — a visual effect while an attempt runs, presumably on
    the *subject's* own screen. There is already an *Induction Visual — Spiral Overlay (planned)*
    section above; this is DW asking for it, not a new idea. **Still open** — the icon is not this.
  - ~~**More flavour text for onlookers**, and the question underneath it: does anything show the room
    that the subject *was* hypnotised?~~ — **his impression was right, and it is fixed in v0.72.9.**
    He said *"I don't think there is anything"*; the whole induction was in fact silent to the room.
    The room now gets a line when an induction **begins** (`announceInductionBegin`, choice-agnostic so
    it never leaks agree/ignore/fight) and when the subject **goes under** (`announceTranceEnter`, at
    the success branch rather than `applyTranceState`, so a reconnect does not re-announce it). Both
    behind *Others see your reactions*. The sensual/submission flavour was warmed in the same pass; the
    "absence" lines were deliberately left alone.

- **Remote panel: the eight missing toggles + live state sync.** The panel has Session, Movement, Clothing and Kneel/Stand; speech, self-touch, and the three awareness categories exist only as speech. Eight binary toggles would fit in two columns of four under the session button without paging.

  **The work is the sync, not the buttons.** The three existing feature buttons know whether to read "Apply" or "Release" because their state comes from *synced* character data — `HasEffect("Freeze")`, `HasEffect("BlockWardrobe")`, `IsKneeling()`. None of the new ones are synced: speech blocking, self-touch blocks and suppression are all local state in our own modules, invisible to the viewer's client. So this needs `state-response` extended to carry live state alongside permissions, *and* the subject pushing an update whenever any of it changes — a one-shot query at panel-open goes stale the moment anything toggles. Same class of work as the original gray-out feature.

  **Worth doing for the gray-out, not the clicking:** a disabled button says "they haven't permitted that", which speech can never do — right now you find out by saying something and watching nothing happen.

  **Body parts deliberately excluded:** 26 of them, so flat buttons are out and it would need a picker sub-screen. Speech is genuinely the better interface for a parameterised command.
- Widen the suggestion pattern library as gaps turn up in play
- ~~**Hypnotist global skill in the induction roll.**~~ **Built v0.66.0, rungs 1–3.** The "declared and visible" model: the hypnotist's client sends a derived 0–100 value with each attempt; the subject's client alone decides how much of it counts, through a four-rung honour setting on the Depth tab (default rung 2, "Only from people I trust"). Skill feeds `depthFull` only, never `depthEarned`, so it can raise a roll but never reach the three features that outlive the session or lie about the body. The prompt gains a private instinct clause read off the *honoured* value. **Rung 4 ("Skill can beat my resistance") is honoured but not OFFERED by the settings cycle** — it is the CNC rung, and the proposal gates offering it on dual fatigue existing. Still deferred from §5: the rolling-hour practice cap (anti-grind on the stat's growth) and demoting the Stats tab behind an Advanced button. Full working in [`declared-skill-proposal.md`](declared-skill-proposal.md).
- **The Fight-never-worse-than-Ignore invariant.** Below an honoured skill of 50 the proposed skill formula gives a fighting subject *worse* odds than one who ignores — `Fight = max(5 + 0.25v, …)` overtakes `Ignore = max(5, 0.35v)` whenever `v < 50`. Nonsense on its face and easy to find in play. Fix by computing Ignore first and using it as a hard upper bound on Fight, expressed as an invariant so it survives retuning, with a swept test assertion. **Blocks the skill ladder.** Found 2026-09-09 while pricing the rung-3 cap.
- ~~**First-launch guidance and the starter-set button.**~~ **Built v0.70.0.** A first-time subject sees an offer in the empty lower-right of the Permissions tab: *turn on a safe starter set* — `hypnoEnabled`, movement, speech, posture, wardrobe (`STARTER_FEATURES` in storage.ts). It **pre-ticks nothing** (offered, not applied), **says what it turned on**, and undoes in one click; it then dismisses and does not return. The set is pinned by `test/starter.mjs` against the earned-only gates, so no persistent or deceiving flag can be added to it without failing. Reasoning: `declared-skill-proposal.md` §9.
- ~~**`MAX_ATTEMPTS` never got its decided value.**~~ **Built v0.65.0** (and the settings lock widened to cover attempts in v0.65.1) as `maxAttempts` in storage.ts, read live through `maxAttempts()` in session.ts and set by a click-to-cycle button on the Permissions tab. Two values only, 2 and 3, because that is what was decided — a wider range would be re-deciding it. Existing saved settings have no such field, and absent means "never chose", so an upgrade moves from the old hardcoded 3 to the decided 2; see the note in `normalise()` for why that is not the decay rates' case. Covered by `test/attempts.mjs`.
- **Dual fatigue system — promoted, and it now blocks something.** Both counters (subject resistance fatigue, hypnotist fatigue) are designed in *Dual Fatigue System* above and **entirely unbuilt** — `grep -ri fatigue src/` returns nothing.

  **Dependency, settled 2026-09-09: build fatigue BEFORE the skill ladder's fourth rung.** That rung lets a skilled hypnotist overpower a subject's Fight, and DW's justification for it being survivable is that the subject wears down across repeated attempts. That mechanic does not exist. Worse, the one term that *does* move across a session runs the other way: subject experience accrues on every attempt win or lose (`ATTEMPT_EXPERIENCE`), and under the single-pool model it is negative when the choice is Fight — so today each failed attempt makes the subject fractionally *better* at resisting. The magnitude is a rounding error (~0.7 on the roll across three attempts), but the sign is the opposite of the assumption, and fatigue will be fighting this term rather than joining it. Rungs 1–3 do not depend on fatigue and may ship first.
- ~~**Trust decay**~~ — done in v0.36.0. Subtraction from the interaction count, lazily on read, as named speeds rather than a number. **Off by default**; the residual question is whether it should ship on, which only play can answer.
- ~~**`STRANGER_CEILING` (30) should be a player setting**~~ — **decided: 30 is the default, adjustable as a player setting.** Range TBD but 0–100 with the trust floor logic capping effective reach.
- **Arousal on the remote panel.** The six arousal actions exist only as speech; folds into the remote-panel item below rather than being separate work.
- ~~Revisit `MAX_ATTEMPTS`~~ — **decided: default 2, with 3 available as a player setting.** ~~Never implemented~~ — **built v0.65.0.**
- Revisit flavor-text wording (DW: "not sure if I like the wording") — one real pass done in v0.34.0 (apply vs attempt), never re-reviewed whole
- ~~**Decide whether decay ships ON.**~~ **Decided: Never is the right default.** Wizard will offer the setting at setup. No change to current behavior.
- ~~**RP reward for engaging during the induction window.**~~ **Built v0.41.0** as `rpBonus`: +5/line, cap +15, session-only, resets per attempt.
- **Relationship floors must move from access to DEPTH when the redesign lands.** Settled 2026-08-31 — friend none, lover Entranced, owner Deep, Fight forfeits it. The current trust-floor form cannot express "a lover always reaches arousal", because a lover's chance ceiling sits below the tier. See the redesign section.
- **The lover tier does nothing today.** `accessFor(id, "arousal")` has no consumer; arousal suggestions gate on their permission alone. Deliberately left for the depth redesign to close rather than patched in the trust model — see the reach-matrix warning in the v0.36.0 notes.
- **`arousalControl` and `illusionControl` do not release on revoke.** The rule everywhere else is that unchecking a permission frees the effect immediately, and `menu.ts`'s `onToggle` has no case for either — so unchecking *Arousal & Orgasm* leaves `DenialMode` applied and unchecking *Clothing Illusion* leaves the illusion running. v0.39.0 added the `arousalControl` case for numbness only. Small, and a consent rule rather than a nicety.
- **Widen release wording as gaps turn up, not just restriction wording.** v0.38.2 found four natural illusion releases matching nothing while the restriction side was fine. Restrictions get exercised constantly in play and releases only once each, so the release half of every pair is where the gaps hide.
- ~~**Per-feature trust thresholds are still only three.**~~ **Superseded by the depth redesign.** `Suggestion.trustThreshold` exists and works, and the three gates that use it all sit at 65 — but the doc's full percentage table is not what gets wired up now. Under the redesign each feature carries a **depth tier** plus the one `depthEarned`/`depthFull` boolean, so this stopped being data entry and went back to being part of the depth work.
- ~~**Decide whether `/hypno triggers full` ships.**~~ **Done in v0.40.0.** Room-admin idea dropped — admin is a chat-room property and a subject can make their own room. `full` is now gated on a testing check and does not exist outside it; visibility ships as a player setting instead. ~~**Release step: flip `TESTING_MODE` in `log.ts`.**~~ — **no longer a release step, as of v0.73.0:** testing mode is now `isTestingMode()`, read live from the room name, so the shipped build is safe by default and there is no flag to remember.
- **Public/private review as new flavor is added.** Every new flavor key is private unless it is given a public variant, so the safe default is silence — but a genuinely observable effect that nobody remembers to give a public line will simply be invisible to the room. Worth a pass whenever a batch of new effects lands.
- ~~Decide what, if anything, the **Hidden Activities** toggle should gate~~ — removed in v0.14.0 and replaced by "Lock settings while a session is on you" (named "…while in trance" until v0.65.1, when it was widened to cover the induction as well).
- ~~**H icon detection**~~ — done in v0.35.0, as a 3-second probe. The icon deliberately still appears for everyone: hiding it would turn the Information Sheet into a directory of who has the add-on installed.
- **Command authority** — by default only the hypnotist who established the session can issue commands to the subject. Add a hypnotist command to expand control to additional players ("allow [name] to command you"), revocable at any time. Ties into the permission hierarchy / Architect role already on the list.
- **Body part protection (others touching you)** — self-touch is done (`ActivityRun` hook). Blocking others from touching you needs a different approach since `ActivityRun` executes on the actor's client, not the subject's. Research needed.
- **Carry touch restrictions to nearby people (planned)** — extend the body-part block and body-part-only (inverse) restrictions so they apply to *other players* touching the subject, not just self-touch. Under the subject-authoritative model this is harder: the activity runs on the toucher's client, so enforcement needs either a message-back mechanism (subject client notices and emits a correction) or cooperation from a shared signal. Complexity note: blocking others' activities without their add-on installed may require a different approach than the hook used for self-touch.
- ~~**BC relationship → trust floor**~~ — done in v0.36.0 as friend 15 / lover 30 / owner 65, each with a REACH as well as a number (see the version notes). ~~**Architect status tied to ownership**~~ — **decided: not automatic.** Wizard asks owner/lovers if they want to set it up. Strangers reach it via trust threshold + request/accept flow. One architect at a time. Subject always holds reset.
- **Persona / alter ego** — "when you hear X, you become [name/personality]." Mostly RP, but add-on can nudge: if the alter ego is defined as wearing little clothing, add-on resists attempts to get fully dressed while the persona is active. Add to trigger effects.
- **Custom phrase localization** — let subjects replace built-in flavor text and suggestion patterns with their own wording. Stored as a small `effect_id → custom phrase` map in ExtensionSettings (minimal storage impact after LZString compression). Two layers: flavor text (what the subject sees when an effect fires — subject-side only, simple substitution) and suggestion aliases (what the hypnotist says to trigger it — harder, requires exposing the subject's aliases to the hypnotist via help screen or OOC). Primary use case: players for whom English is not their first language, and players who want more personal or thematic phrasing. Ship flavor text first; aliases as a later extension.
- **Phantom sensation** — feeling touch that isn't there, or not feeling touch that is. Separate category from clothing illusion. Excellent trigger effect: warmth, numbness, phantom touch on specific body parts. Many implementation paths — explore.
- ~~**Compelled self-touch + block combination**~~ — **the compel half built v0.72.0** (see *Compelled activities*): a command pierces the self-touch block because it is involuntary, so "you cannot touch yourself" + "touch your breasts" already coexist as DW's rule intends. The *conditional* form ("...whenever arousal drops below X") is the remaining piece, waiting on the conditional command type.
- **Fractionation** — waking and re-inducing repeatedly, each time going deeper. As a named mechanic: if re-induction follows a wake within a short window, the roll gets a bonus (subject still partway primed, rapport warm). Currently no mechanic distinguishes first from second induction.
- **Anchoring** *(maybe)* — physical gesture re-triggers trance, separate from verbal triggers. Could tie to existing induction with a trust/depth advantage for using it.
- **Resistance fatigue** — the more someone fights off inductions, the more tired they get, making future attempts easier. Currently resistance is stateless. Review when developing trust/experience further.
- **Suggestion stacking / conditionals** — "if X then Y, if Y then Z." Chains of triggers. Body part blocks already stack naturally; review for formal support.
- **Honesty / amnesia** — compulsive truth-telling and targeted forgetting. RP-prompt features only (no way to enforce mechanically), but the add-on can emit a hint visible only to the subject reminding them to RP accordingly.
- ~~**Waking trance**~~ — **built v0.67.0.** A trance MODE, governed by the trance defaults rather than the on-demand movement permission — it is a change to what being under is like, the same class of thing as the freeze and the veil it adjusts. *"Walk with me"* lifts the freeze and thins the veil to ~8% (`WALKING_FADE_OPACITY`) while the trance runs on and suggestions still parse and fire; *"be still" / "stop" / "stay still"* re-freeze and restore the full veil. A dedicated handler (`handleWalkingTrance`, alongside wake) rather than a table suggestion, so it needs no permission gate and the leave phrases pre-empt the movement suggestion only while actually walking. `/hypno effects` names the mode. The one interpretive call: the only "deep stillness" effect is the freeze itself, so "lighter effects continue" means everything except the freeze carries on — there was nothing else to suspend. `test/walking.mjs`, bot scenario 9.
- ~~**Safe signal while silenced**~~ — resolved. Speech blocking hooks `ChatRoomSendChatMessage`, which runs *after* command parsing and after the emote and whisper branches, so a silenced subject keeps `/hypno` commands, emotes and whispers; only ordinary room speech goes. Documented in the help screen's Lasting tab (v0.32.0). The residual case is a fired trigger with the duration set to **0**, where the safeword is the only self-serve exit — DW's deliberate call.
- **Session log** — record of what was suggested, what stuck, and when. Hypnotist-side. TBD.
- ~~**Setup wizard**~~ — **built v0.71.0** (`src/wizard.ts`). Runs on first launch and reset (starterState "new"), and re-runnable from a **Setup** button in the settings top bar. First screen offers four presets — **Hypnotist only · Light / safe · Balanced · Extreme** — or "answer a few questions": five single-decision screens (which feature groups, how easy to reach them, arousal as a shortcut, whose skill you honour, whether triggers fade), a summary, and Apply. Presets and the wizard converge on one `applySetup()`, so they cannot mean different things. It **locks nothing** and never runs mid-session. `test/wizard.mjs` pins every preset's storage result. **Two calls made and flagged:** "Hypnotist only" turns the subject side off (`hypnoEnabled` off + all permissions off) but cannot hide the H-icon on your sheet — the icon is drawn by whoever views you and the anti-directory rule keeps it universal; and "Extreme" sets skill honour to **capped**, not full, since rung 4 is still gated on dual fatigue.
- **Depth system implementation** — implement the 5-tier depth gate (Drifting/Yielding/Entranced/Deep/Blank), per-feature depth selectors in settings UI, chemical floor per-feature dropdown (Both/Arousal/Drugs/Neither), fractionation bonus, dual fatigue counters. See design change section above.
- **Trigger discovery (probe mechanic)** — depth-gated involuntary reveal during a session. Trigger word never spoken aloud; effect and vague hints surface based on depth tier.
- **Trigger removal by another hypnotist** — depth comparison check: must match or exceed the depth at which the trigger was planted. Override (replace) requires one tier higher.
- ~~**Trigger aging for the harness**~~ — **built v0.63.0.** `/hypno agetrigger [days] [number]` plus a `test-age` hidden handler and `!age` on the bot, all `TESTING_MODE`-only and all gone at release, same shape as `/hypno trance`/`test-trance`. Backdates `reinforcedAt` and nothing else — the firing credit is left alone deliberately, since it is one of the things the scenario is checking. Both arguments optional — bare, it ages every planted trigger by one day (DW's call, 2026-09-12). Relative, so `1` twice is two days; negative winds it forward; triggers are named by their number in `/hypno triggers`, not by phrase, so the hidden-phrase rule survives it. This unblocks scenario 8 in *Needs Testing*, which still owes its live run.
- ~~**Trigger reinforcement and decay**~~ — **built v0.60.0**, retuned v0.62.0. Formal re-induction resets the clock; firing credits capped time only; rate is separate from trust decay and defaults to Never.
- ~~**Help screen pass (DW wants this)**~~ — **done v0.69.0–v0.69.1.** Layout is one word-wrapped column (v0.69.0). Content read-through v0.69.1: five tabs reordered simple→complex (Start Here · What to Say · **Depth & Trust** · Lasting · Commands), the old trust-threshold gate framing replaced by a **depth ladder generated from `DEPTH_GATES`/`DEPTH_TIERS`** (so it cannot drift), trigger decay/reinforcement and the earned-only toggle written up in Lasting, skill in Depth & Trust, and the Commands tab bucketed by group in a fixed order (the groups were non-contiguous, so headers used to repeat) with the Testing group hidden when `TESTING_MODE` is off. A deeper future nicety only: the handler-driven phrases (wake, walking, body parts) are still hand-listed rather than generated — low priority, they change rarely.
- ~~**Make `earnedOnly` a per-feature player setting**~~ — **built v0.68.0** for illusion and triggers. `effectiveEarnedOnly()` in `depth.ts` reads a sparse, true-only `chemicalReach` map (stored like `depthGates`, default earned-only in code); `gate.earnedOnly` is now only the seed. A per-row toggle on the Depth tab flips it. **Carry-forward is deliberately NOT toggleable** — it has no decay clock to price the shortcut, so it is drawn locked and the gate ignores any stored value for it. The safeguard is exactly the decay: a chemically-planted trigger is `plantedChemical` and fades at the fixed fast rate; the illusion is session-scoped so it clears on wake regardless. The `depth.ts` comment that stated the opposite rule was rewritten in the same commit, as required. Only the subject's own client writes the map — no hypnotist path touches it. `test/chemical-reach.mjs`.
- **Extreme subject level** — opt-in lock: trigger removal requires Blank or architect, settings gated, decay disabled, visibility defaults to Restricted, time gate prevents downgrading for configured period. Wizard-configured. **Extended 2026-09-09** with two further intentions from DW — no access to the advanced stats view, and the safeword *possibly* restricted — which turn this from a settings preset into a design area with a real safety question in it. Open questions and the exits that must survive regardless are worked through in [`declared-skill-proposal.md`](declared-skill-proposal.md) §8. Nothing here is specced yet.

### Version history — moved

The dated entries that used to run from here to the end of this section are in
[`CHANGELOG.md`](CHANGELOG.md) as of 2026-09-18. The Todo above is the live list; the history
was 27% of this file and none of it was work waiting to be done.

---

## Known Bugs

Observed in play but not yet traced to a root cause. Add date and any reproduction details when logging.

| # | Bug | Observed | Notes |
|---|-----|----------|-------|
| ~~1~~ | ~~**Session starts with clothing awareness already suppressed**~~ — **closed.** Confirmed fixed in testing (v0.57.0): fresh load, start session, `/hypno effects` before any suggestion — all three awareness lines off. Root cause was orphaned state surviving between sessions; cleared by v0.44.0–v0.44.1 fixes. | 2026-09-01 | Fixed v0.44.0–v0.44.1. Confirmed clean in testing 2026-09-07. |
| ~~2~~ | ~~**Our own freeze blocked undressing and blamed a nonexistent lock**~~ — undressing was refused with a lock message when nothing was locked. **Root cause (corrected):** there was no freeze check to run early. BC's own `IsRestrained()` returns true for `HasEffect("Freeze")`, `CanChangeClothesOn()` is built on it, and our guard reported every failure of that call as `"locked"`. The freeze usually responsible is not a suggestion at all — it is the **trance baseline**, which freezes the subject the moment they go under. Fixed v0.55.0 by giving freeze its own refusal (`"frozen"`) and its own flavor line, checked before the lock branch. | 2026-09-07 | Found by the undress scenario. The false reason was the bug; the refusal itself was correct. |
| ~~3~~ | ~~**The hard floor stripped every effect and left the session running**~~ — unticking *Hypnosis Enabled* cleared eight effects one at a time and never touched `session.phase`. The subject was left in a trance with nothing applied: the hypnotist still had a live session, spoken suggestions still parsed and re-applied, and `/hypno effects` reported a session the player had just switched off. Fixed v0.58.0 — `hardFloorStop()`, shared with the safeword so the two can no longer disagree about what stopping means. | 2026-09-08 | **Not** found by scenario 8, which passed — it only asked whether the effects came off. Found when scenario 1 would not start afterwards, refusing an induction with "Already under." Four assertions in `test/revoke.mjs`, verified failing (12/16) against the previous build; the scenario was rewritten to ask `/hypno session` and re-confirmed in play the same day. |
| ~~6~~ | ~~**The spiral icon on another player's profile has moved, looks larger, and partly covers LSCG's remote button**~~ — **fixed v0.74.1–v0.74.2.** DW's screenshots (2026-09-16) settled it: LSCG's remote and ours have a **clear gap, no overlap**, so nothing moved. Two real causes, fixed in turn. The *heaviness* was artwork — the filled two-arm spiral merged into a navy disc at button size — replaced with a single **stroked** spiral (v0.74.1, `icon.ts`, DW's "option 5"). The *size / out-of-box* was `DrawButton` drawing an Image at its **natural 120 px, unscaled**: the `RectFitIntoRect` fit assumed by the note below **does not exist** — verified R131, `DrawButton` calls `DrawImage(Image, Left+2, Top+2)` with no dimensions — fixed by drawing the icon with `DrawImageResize` into a padded 44×44 rect (v0.74.2, `remote.ts`). No coordinate touched, so the FUSAM-convention question is moot. Full notes in [`CHANGELOG.md`](CHANGELOG.md) (v0.74.1, v0.74.2). Original report: a **visual regression introduced by v0.72.8**, which replaced the "H" label with the drawn spiral. Reported by DW from in-game play 2026-09-16; screenshot to follow. **Established from code so far:** the button's own box is **unchanged** — `ICON_LEFT = 90`, `ICON_TOP = 130`, `ICON_SIZE = 60` were not touched by v0.72.8, which altered only `DrawButton`'s *Label* and *Image* arguments. So nothing moved in the layout; what changed is what is painted inside the same rectangle. BC's `DrawButton` (R131 `Drawing.js:1117`) draws a Label **centred** but an Image **anchored at the button's top-left** (`baseImageRect.x/y` = `Left + 2, Top + 2`), scaled to fit. A small centred glyph therefore became a 56×56 shape starting in the top-left corner — which reads as *both* bigger and moved up-and-left, from one cause, exactly as suspected. **The overlap is the part not yet explained** and is the thing the screenshot should settle: see the investigation note below the table. | 2026-09-16 | Unverified: whether LSCG still draws at the `(90, 60, 60, 60)` recorded in `remote.ts:29`. If it has grown or moved, the 10px gap that comment assumes is gone — and the two 60×60 boxes would have been overlapping since long before v0.72.8, with the "H" simply leaving the overlap white and invisible. |
| ~~5~~ | ~~**Missy's name is printed twice on an emote**~~ — **fixed v0.72.7.** Reported by DW from in-game play 2026-09-14, with the hypothesis that the add-on and BC were both supplying the name. **His hypothesis held.** Root cause: BC prepends the sender's name to a plain `*`-emote at display time (`ChatRoom.js`, the *Emote messages formatting* processor, R131), and our lines already carry the name via `fillTokens` — so the two stacked into "Missy Missy goes very still." `tellRoom` now sends a `**`-style emote, which BC prints verbatim and adds no name to. Two comments claiming *"an emote has no name of its own"* were corrected in the same pass. | 2026-09-14 | `test/notify.mjs` models R131's send-strip and display-prepend, **reproduces the doubling first** (rule 6) and then asserts `tellRoom` names once. Caveat worth keeping: the suite models BC rather than proving it, so it can only ever confirm the model — one emote in play is what settles it. |
| ~~4~~ | ~~**`/hypno reset confirm` does not stop an in-flight trance**~~ — **fixed v0.63.1**, as decided 2026-09-10; the note directly below this table carries the decision and the pressure-test that produced it. `resetSettings()` now runs the same `totalStop()` teardown the safeword and the hard floor use, before it wipes, and reports the release ahead of the wipe. Fourteen assertions in `test/revoke.mjs`, ten of them verified failing (20/30) against the previous build. **Confirmed in play 2026-09-12** by DW, on the v0.64.0 combined build: forced trance, the warning named the trance, `reset confirm` released immediately and reported the release first, `/hypno session` read Idle, and a tab reload brought nothing back. That last step is the one the unit suite could never reach. Original report: `resetSettings()` replaces the settings object and saves — that is all. It does not call `hardFloorStop()`, does not touch the module-level session state or its timers, does not remove the Emoticon effects, and does not clear the recovery key (which lives in its own `localStorage` entry, so wiping `ExtensionSettings` cannot reach it). After a reset mid-trance the subject is still frozen and still under, with `hypnoEnabled` now reading false. Same class as Bug #3 and the same fix: delegate to `hardFloorStop()`, and clear the recovery key. Found by code inspection 2026-09-09 while checking whether "reset the add-on" is a sufficient exit for extreme mode. **Not yet observed in play — no repro has been run.** | 2026-09-09 | Matters more than it looks: reset is one of two exits DW has proposed as sufficient in extreme mode. The other — logging in with the *userscript* disabled — is worse, since a script that is not running cannot clear the server-side effects that come back on reload. See `declared-skill-proposal.md` §8. |
| ~~7~~ | ~~**Self-touch stayed locked out by bondage gear after the session ended**~~ — **fixed v0.81.1.** DW's tracker (2026-09-22): after "don't touch yourself" and then a restraint, self-touch stayed blocked through the safeword, unticking movement, and switching the add-on off; only removing the item cleared it. **Root cause:** the `ActivityRun` hook in `selftouch.ts` stopped self-touch on `Player.HasEffect("Freeze")`, which is true for **any** Freeze — a real device's as well as ours on the Emoticon carrier. Every exit cleared our state correctly; the hook then kept tripping on the item, with no session, no permission and no add-on behind it, and narrated the restraint to the room as hypnosis. The "don't touch yourself" order was incidental. Now reads `hasOwnEffect("Freeze")` (the split `voice.ts` already drew for commanded touch), and the hook stands aside entirely while *Hypnosis Enabled* is off. | 2026-09-22 | `test/selftouch.mjs`, 25 checks, **10 verified failing against v0.81.0**; each half of the fix was reverted in turn and its own checks seen to fail. **Not run live.** Unverified against BC source: whether BC itself stops self-activities under a real Freeze. Either way that is BC's rule to apply, not ours. |
| ~~8~~ | ~~**A fired trigger was cleared by a relog instead of serving out its time**~~ — **fixed v0.82.1.** DW's tracker (2026-09-22): active trigger effects and their durations were wiped by logging out or reconnecting. **Root cause:** the reconnect design (v0.44.0, *Priority Work Session — 2026-09-01* item 5) was right and the restore half worked, but the save half never ran for a trigger. `persistState()` in `session.ts` already knew to save one; nothing asked it to. Every caller sits on a session transition and the 5-second heartbeat is armed only by one, while a trigger normally fires with no trance running. The reload then found nothing saved, read the trigger's Freeze on the Emoticon item as an orphan from a crash, and took it off with *"Something was still holding you from before."* Fixed by saving when a trigger fires, when it lets go, and when one is restored (`saveForReconnect()`). Saving exposed a second trap, fixed in the same change: once a copy exists the orphan check is skipped, so a trigger whose clock ran out while the subject was away left its Freeze on with nothing to release it. The durable-only restore now takes our BC effects off first and puts back only what still has time. An expired **carried** suggestion had the same shape (`restoreCarried()` reads a spent remainder as "no clock" and held forever) and is skipped the same way. Clocks keep running while logged out, as `until` has always been wall time. **DW's call 2026-09-22: keep ticking, do not pause.** | 2026-09-22 | `test/relog.mjs`, 38 checks, reloads by importing a **second copy of the bundle** so no module state carries over: **20 verified failing against v0.82.0**. Four more in `test/recovery.mjs`, plus two for the carry, all six seen failing first. **Not run live.** *Needs Testing* item 3 below was marked covered by the test bot; the code as it stood could not have passed it, so that run most likely had something else in force keeping the heartbeat alive. |
| ~~9~~ | ~~**A trance that timed out told nobody**~~ — **fixed v0.82.2.** DW's tracker (2026-09-22): when a 30-minute trance times out, neither side is told. **Half right:** the subject did get *"[You come out of trance. (session timed out)]"*, which reads as a status code. The hypnotist got nothing in chat (only the panel flipping to idle) and the room never saw the subject surface. Now announced on all three screens, v0.76.0's pattern: subject line with the reason in words, a room line behind *Others see your reactions*, and an `ended: "timeout"` marker on the final `session-update` that the hypnotist's client prints a line for. Choice-agnostic by word list and by byte-identical wire message across agree / ignore / fight. Same change: a trance that ran out while logged out, resumed inside the five-minute window, no longer follows the expiry with *"You are still under."* | 2026-09-22 | `test/expiry.mjs`, 48 checks; crashes on v0.82.1, and the still-under check fails with only the `recovery.ts` half reverted. **Not run live.** Telling the hypnotist was a default taken while DW was away; the timeout reveals nothing about the choice or depth. |
| 10 | **Spoken orgasm denial does not stop orgasms** — **OPEN, parked 2026-09-23 by DW; on the Todo list.** v0.83.1 failed live; v0.83.2 was also reported not working the same night, no transcript yet. What follows is the record of both attempts. **v0.83.2:** the subject's own masturbation still finished her on v0.83.1 while a toy was held (DW's transcript, *Needs Testing* item 14). BC's `ActivityOrgasmPrepare` and `ActivityTimerProgress`, read from the live client via `bcModSdk.getPatchingInfo()`, confirm the cache was the right thing to fix: BC refuses only when `C.Effect` carries DenialMode, and only when nobody passes `Bypass`. BCX and WCE were hooking those two functions in the room. `src/denial.ts` now hooks both `ActivityOrgasmPrepare` and `ActivityOrgasmStart` and, while OUR carrier holds DenialMode, swallows the call and pins the meter at 99 as BC does, so no other mod's route around BC's check matters. `test/denial.mjs`, 20 checks, 8 failing with the hook disabled. **Not verified:** which path Rei's orgasm actually took. **The v0.83.1 entry:** DW's tracker (2026-09-22): *"Spoken orgasm denial suggestions fail to hook and prevent orgasm events."* Two causes. **(1) BC never saw it.** `setOrgasmDenied()` wrote `DenialMode` onto the Emoticon carrier and sent the appearance to the room, but BC answers "is this player denied" from the cached `Player.Effect` (both `HasEffect` and `ActivityOrgasmPrepare` read it), and only `CharacterLoadEffect` rebuilds that. The hypnotist was told it landed; the next orgasm BC started from a vibrator or an activity went through until something unrelated refreshed the character. v0.74.0 had found exactly this for the forced-orgasm pierce and fixed it there only. `applyEffect`/`removeEffect` now rebuild the cache for the player every time, which also makes our Freeze, BlockWardrobe and Leash take hold at once. **(2) The words missed.** *must not / mustn't*, *are not to*, *not permitted to*, *forbidden from cumming* and *don't you dare* matched nothing, and a denial that names its own end, *"you cannot cum until I allow you to cum"*, matched **allow** first and lifted the denial it was laying down. `orgasm-allow` now has an `unless` veto for a negated orgasm followed by *until/unless/till/before*. | 2026-09-22 | `test/activity.mjs` (+7) and `test/arousal.mjs` (+12): **3 and 10 verified failing on v0.82.3**. **Not run live**, and **unverified against BC source** (unreachable from the workspace): that `ActivityOrgasmPrepare` reads the cache is taken from the v0.74.0 comment and `DEVELOPMENT.md`, not re-read. *Needs Testing* item 14. By design and unchanged: "cum for me" still pierces our own denial (DW, 2026-09-12, command always wins), and every trance ending lifts it. |
| 11 | **Room emotes show an unbalanced asterisk: `**Missy kneels…*`** — **OPEN, parked 2026-09-24 by DW.** Reported by DW from in-game play on v0.85.1, on DW's own screen with no other add-on believed to be involved. Seen on pose flavour lines (kneel, elbows behind), and probably the same thing as the stray induction asterisk that `docs/CHANGELOG.md` left unfixed in the v0.82.3 entry. **Traced so far, against current BC master (`GameVersion` R132, `ChatRoom.js`):** `tellRoom` (`notify.ts`) is the only room-emote path, and it sends `` ChatRoomSendEmote(`**${message}`) ``. `ChatRoomSendEmote` strips one leading `*` (unchanged since 2021), so `*Missy kneels…` goes out. The *Emote messages formatting* processor strips the next `*` and adds no name (unchanged since 2022), and the display wraps the result as `*…*`. That gives a balanced `*Missy kneels…*`. The observed `**…*` is exactly that wrap with one strip missing, so the text most likely arrives with **two** leading asterisks, or a display step is being skipped. No template begins with `*`. None of our hooks (`ChatRoomMessage`, `ChatRoomSendChatMessage`) or registered handlers (`suppression.ts`, priorities 205 and 320) touch emotes. **Control:** DW typing `**test` by hand in the same room showed a correct `*test*`, although it goes through the same `ChatRoomSendEmote`. **Do not "fix" by sending a single `*`:** that brings back Known Bug #5 (doubled name) for everyone on unmodded BC. | 2026-09-24 | **Next step is one capture, not more code reading.** Trigger a broken line in the Hypno Testing room and read the raw `Content` of its `ChatRoomMessage` console entry (our hook logs it at *Verbose*; on by itself in that room, `/hypno debug` elsewhere), or run `ServerSocket.on("ChatRoomMessage", d => { if (d.Type === "Emote") console.log(JSON.stringify(d.Content)); })`. `"*Missy…"` means the wire text is right and something at display adds the `*`. `"**Missy…"` means the send side stripped too little: check `ChatRoomSendEmote.toString()` and `bcModSdk.getModsInfo()`. `testbot/session.log` predates v0.72.7 and cannot answer this. |

### Known Bug #6 — what the code says before the screenshot arrives

**What v0.72.8 changed, precisely.** One `DrawButton` call in `remote.ts`, arguments 5 and 7 only:

```
before:  DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, "H", "White", "",           "…Remote")
after:   DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, "",  "White", SPIRAL_ICON, "…Remote")
```

`ICON_LEFT = 90`, `ICON_TOP = 130`, `ICON_SIZE = 60` are untouched. **The button rectangle is
identical before and after** — same position, same size, same white fill, same black border.

**Text and image anchor differently, and that is the whole of "moved and bigger".** From R131
`Drawing.js:1117`:

- `DrawTextFit(Label, Left + Width/2, Top + Height/2 + 1, …)` — the "H" was drawn **centred**, at
  whatever the default font size gives, shrinking only if too wide. Call it a ~25×30 blob around
  (120, 161).
- The image path computes `buttonRect` = (92, 132, 56, 56) and `baseImageRect` = (92, 132,
  `img.width`, `img.height`), fits the second into the first with
  `RectFitIntoRect(…, ShowFullOriginalRatio)` — **and then draws at `baseImageRect.x/y`, i.e. the
  button's top-left**, using only the *size* from the fitted rect.

So the spiral renders 56×56 with its **top-left at (92, 132)**, where the glyph's top-left sat around
(107, 146). Same centre, roughly — but the visible edges move up and left by ~14px and the painted
area roughly quadruples. **One cause, both symptoms.**

**It does scale, so the SVG's intrinsic size is not the problem.** `icon.ts:55` declares
`width="120" height="120"` on a `viewBox="0 0 100 100"`, and those explicit dimensions are load-
bearing — without them `img.width` would be 0 and the fit maths would produce nothing usable. But
`RectFitIntoRect` scales 120 down to 56, so the icon stays inside its own box. **Nothing overflows.**

**Which leaves the overlap unexplained by v0.72.8 alone — and points at the more likely story.**
`remote.ts:29` records LSCG drawing at `DrawButton(90, 60, 60, 60, …)`, so LSCG occupies y 60–120 and
ours y 130–190: a deliberate 10px gap, chosen by observation, with an `ADJUST-ME` note. If LSCG has
since moved or grown, **the two boxes have been overlapping all along** — and the "H" left that
overlap white-on-white and invisible, while the spiral paints ink into it. On that reading v0.72.8
did not cause the collision; it *revealed* one. The screenshot will distinguish the two: if the
spiral's ink intrudes into LSCG's button, look at where LSCG's bottom edge actually is now.

**The position is not coincidence — it is deliberate and relative.** The comment above the constants
says ours *"sits directly below"* LSCG's. That matters for the fix: this is not two add-ons
accidentally picking nearby coordinates, it is ours aimed at a neighbour whose position was read off
the screen once and hard-coded. **A fix that nudges our coordinates is aiming at a moving target.**

**⚠ Is there a convention for this? Not established — flagged rather than guessed.** No BC extension
point for Information Sheet buttons appears anywhere in this repository's record; `remote.ts:19`
notes the mechanism was learned by reading how LSCG hooks `InformationSheetRun`, which is itself
evidence that **both add-ons are hooking the same screen function because there is no official API**.
FUSAM's public page documents only how a *player* runs FUSAM; whether it brokers button placement
between add-ons **could not be established** (see the note under *Publishing* in
`docs/DEVELOPMENT.md`). If such a convention does exist, adopting it is the correct fix and nudging
pixels is not. **Worth one question to the FUSAM maintainer before any coordinate is changed.**

**What the screenshot needs to answer:** where LSCG's button actually sits now; whether the spiral's
*ink* or its *button rectangle* is doing the covering; and whether any third add-on is also in that
column.

### Known Bug #4 — the fix, and why it is not the obvious one

**DW's instinct, and it is right about the important half:** reset must not silently half-work. If
she is in a trance and types `/hypno reset confirm`, she must not be left frozen by a command that
told her it had wiped everything.

**His proposed shape was refuse-and-instruct** — tell her to safeword first, then reset. That was
pressure-tested before writing, because reset is the thing people reach for when something has gone
wrong, and refusing it makes the last resort conditional on another path working.

**The pressure-test, answered straight: no, I could not find a state where `/hypno safeword` fails
but reset would have saved her.** What was checked:

- **Silenced or entranced.** `safeword()` is a slash command, and `CommandParse` runs *before*
  `ChatRoomSendChatMessage`, where the speech block lives (`src/main.ts`). It stays reachable.
- **Settings locked.** `lockedWhileHypnotized` freezes the settings *screen* only; `settingsLocked()`
  in `src/menu.ts` says so in its own comment — the safeword is untouched by it.
- **Corrupt stored settings.** `loadSettings()` (`src/storage.ts`) wraps the parse in try/catch and
  falls back to defaults, so bad data degrades rather than throwing. The safeword still runs.
- **After a reload, or a partially restored session.** `totalStop()` clears unconditionally: it calls
  `removeEffect()` for `Freeze` and `BlockWardrobe`, `clearSaved()` for the recovery key, and rebuilds
  `session` from scratch — none of it gated on the session looking sane first.
- **In-memory disagreeing with storage.** The refusal check would read `isHypnotized()`, which reads
  the same in-memory session the safeword clears. They share one source of truth, so the check cannot
  be right while the cure is wrong.

**So refuse-and-instruct is not dangerous. It is just worse, for four reasons:**

1. **It is not what she asked for.** Nobody types "wipe everything" and wants to stay frozen.
2. **It adds a step for someone already in trouble** — two commands where one would do.
3. **It creates a second refusal path that has to be kept correct.** Bug #3 was caused by exactly
   that: a second copy of the everything-off list that drifted from the first. `hardFloorStop()`
   exists because the fix was to *delegate to the shared teardown*, and this should follow it.
4. **The accidental-use protection DW wants already exists** — reset is two-step (`/hypno reset`
   warns, `/hypno reset confirm` acts).

**Decided: reset calls `hardFloorStop()` itself, then wipes, and says both things out loud.** DW's
requirement is met by making it fully work *loudly*, rather than by refusing. The existing warning
step carries the notice, so she is told before anything happens and never blocked.

**Wording — both lines matter, and neither may read as stonewalling.**

Unconfirmed `/hypno reset`, while in a trance:

> *This erases all trust, experience and settings. You are also in a trance right now — resetting
> will end it and release everything first. Run: `/hypno reset confirm`*
> *(If you only want out of the trance, `/hypno safeword` does that and keeps your settings.)*

After `/hypno reset confirm`:

> *Trance ended and every effect released. Settings reset to defaults.*

The second line names the release **first**, because that is the part she needs to trust immediately.
The parenthetical on the first line offers the gentler option without withholding the stronger one.

**Implementation — built v0.63.1.** `resetSettings()` (`src/storage.ts`) runs the teardown before
it replaces the settings object, and the recovery key goes with it (`totalStop()` already calls
`clearSaved()`).

`stopForReset()` (`src/session.ts`) is a **third entry point onto the one shared `totalStop()`** — not
a second copy of the everything-off list, which is the whole reason #3 happened. It differs from
`safeword()` and `hardFloorStop()` only in what it says: it passes an empty local message, because the
reset path speaks in one line with the release named first, and it returns what it ended (`"trance"`,
`"induction"` or `null`) so the reply names it rather than guessing. An idle reset still says only
`"settings reset to defaults"`; a reset that lands mid-induction says *Induction stopped*, not *Trance
ended*.

**`storage.ts` imports `session.ts` directly for this, and that is a deliberate cycle — DW's call,
made 2026-09-12 with the cost stated first.** `session.ts` has imported `storage.ts` since it was
written, so the two now import each other, which is the shape the module map's import rule exists to
discourage. The alternative on the table was a registration hook (`registerResetTeardown()`, the leaf
trick `registerCarryHandlers` and the trigger half of `registerRecoveryHandlers` use); the direct
import was chosen for being the plainer thing to read. It was built both ways, and the direct import
was checked rather than assumed:

- **It bundles clean.** esbuild flattens both modules into one IIFE scope as hoisted `function`
  declarations, so there is no live-binding indirection to be undefined and no TDZ. `stopForReset` is
  defined well before `resetSettings` reaches it, and neither is a `const` arrow.
- **It loads clean.** The shipped `dist/HypnosisAddon.user.js` was executed under Node against stubbed
  BC globals. It reaches `script loaded`, and every error it raises is a missing BC function in the
  stub, caught by `safely()`. None is a reference error from our own modules.
- **Every suite still passes**, `revoke` at 30/30.

**What would break it, for whoever reads this next:** nothing in `storage.ts` may call into
`session.ts` at **module-init time**. `stopForReset()` is reached only from inside `resetSettings()`,
long after both module bodies have run. A top-level call — a `const` initialised from a session
function, say — would put one side's binding in the other's way, and the fix then is to go back to the
registration hook rather than to reorder imports and hope. The same warning is in the code, above the
import.

The two-step warning lives in the `reset` entry of the command table (`src/commands.ts`), and the
extra trance sentence and the safeword parenthetical appear only when `isHypnotized()`.

Fourteen assertions added to `test/revoke.mjs`, which was built for this class of bug when #3 was
fixed. Ten of them were verified failing against the previous `resetSettings()` (20/30) before the fix
went in; the four that pass either way are the guards that ending the trance did not cost the wipe,
and that an idle reset does not announce a trance nobody was in.

> **One caveat on those assertions — since fixed in v0.64.1, recorded here because the reasoning
> matters more than the patch.** `revoke.mjs` could not pass against a `TESTING_MODE: false` build:
> it stands a trance up with `forceTrance()`, which a release build correctly refuses. Measured at
> **25/30** with the flag off. Two of the fourteen failed loudly, which is fine — but nine of the
> rest then passed *without testing anything*, because there was never a trance for reset to end,
> and that is rule 6. This predated the fix (the first `forceTrance` check does the same) and was
> found independently by the trigger-ageing work.
>
> **Settled by DW on 2026-09-12: pin the flag in the harness bundler.** `build-test.mjs` now
> rewrites `src/log.ts` on the way into all three test bundles so `TESTING_MODE` always reads true,
> and throws if it cannot find the declaration to rewrite. `build.mjs` deliberately does **not** do
> this, so the shipped userscript still honours whatever the flag says. Verified both directions
> rather than assumed: with the flag set to `false` in source, `revoke` goes back to **30/30** and
> all 17 suites pass, while `dist/HypnosisAddon.user.js` still bundles `TESTING_MODE = false`.


---

## Open Questions

> **Related:** settled questions are struck through here and explained in [`CHANGELOG.md`](CHANGELOG.md). Live work
> items are in *Development Stages > Todo*, which is the list to read first.

- Global skill vs per-subject familiarity — interaction mechanics
- **Skill weighting in the induction roll** — must satisfy "a new player has little chance of resisting a very experienced hypnotist" without letting skill leak into the absolute-refusal cases (AFK-block, OOC hard no). See "Two kinds of no."
- ~~**OOC "Genuine resistance" vs. the contested roll**~~ — **Settled.** AFK-block = hard block with flavor message. Active Fight + "Genuine resistance" = steep but possible — very heavy negative modifier, not an absolute wall. Since players can toggle "Genuine resistance" on and off, the setting is a difficulty dial, not a lock.
- Trigger reinforcement — how often, how much decay per day (LSCG's logarithmic-every-10-minutes is a reasonable starting reference, not necessarily our final formula)
- ~~Trigger word visibility~~ — **built v0.40.0.** Hidden by default, with *Show trigger words when you list them* on the Triggers tab. `/hypno triggers full` is a testing override that disappears when `TESTING_MODE` is flipped. The unbuilt *visibility levels* (blanked word / blur / blackout) are a separate, larger feature — see *Triggers*.
- **Induction trigger (spoken word → attempt)** — a special trigger type that, when heard, initiates a trance *attempt* rather than instant trance: goes through the normal attempt flow, subject gets the option to fight by default. No LSCG-style auto-drop. **Reversed 2026-09-25:** instant drop is an opt-in subject setting, off by default — see *Trigger Overhaul*, decision 10. To be decided: is this an opt-in trigger type players can configure, or a separate feature? Does the subject see the attempt coming or is it framed as a sudden pull?
- ~~Induction script library~~ — **decided: both defaults and user-created.** Scripts speak in the hypnotist's own voice.
- Clothing illusion interaction with BC's existing blindfold/sensory systems — deferred, revisit later
- ~~Collateral effect range~~ — collateral effect pushed further into the future; not planned for near term
- ~~Hypnotist without add-on~~ — **decided: triggers only.** A hypnotist without the add-on can activate existing triggers scoped to them, nothing else. More access can be added later.
- How should the current boolean permission toggles evolve into the trust-percentage threshold system — same settings screen with a slider instead of a checkbox, or a genuinely different UI once trust is a computed/accumulating value rather than something the player just sets directly?

### Design Debate: Single Experience Pool vs Separate Stats

**Decided: single pool.** Too much math already in the system; one pool whose sign follows the choice (cooperating vs resisting) is the right call. Not revisiting this.

### Per-Account Storage Risk

BC stores character data in `localStorage` and the server. Corrupting `Player.ExtensionSettings` can corrupt the player's character entirely — BC is known to have fragile character data. Key safeguards already in place: never write to `Player.Appearance` (the clothing illusion rule); key storage per account (v0.17.0); export/import/reset available. Needs ongoing review as new features write to storage — any new field that touches `Player` rather than `ExtensionSettings` is a red flag.

### Trust Change Visibility

**Decided:** flavor text fires as trust crosses meaningful thresholds — not on every small gain, so it stays useful rather than noisy. As trust gets higher and harder to move, each notification carries more weight. Frequency should thin out at higher trust levels where each step is a larger investment. Exact thresholds and wording TBD during implementation.

---

*Last updated: 2026-09-10 — two days of design work with the dispatch bot: hypnotist skill answered
("declared and visible", in `declared-skill-proposal.md`, being folded in section by section),
touch-fired triggers proposed, word-level control approved to spec, the vanishing hypnotist closed
with no special handling, and Known Bug #4 found by inspection — reset does not end a trance (fixed
in v0.63.1). This
pass refiled that material into the sections it belongs to and cut `CLAUDE.md` down to rules and
pointers after it drifted in a day. Decay still owes its live run. Code at v0.64.1.*

*Updated 2026-09-12 — Known Bug #4 fixed in v0.63.1: reset now runs the shared teardown before it
wipes. Confirmed in play by DW the same day, reload included, so item 9 of Needs Testing is closed.*

## Version History

Moved out on 2026-09-18. The dated entries — what shipped and why — now live in
[`CHANGELOG.md`](CHANGELOG.md), newest first, together with the two other runs of history that
used to sit elsewhere in this file. Nothing was dropped. This document is what the add-on is meant
to be and why; `CHANGELOG.md` is what it has actually been.

---

## Test Harness — the eight scenarios (**built** — v0.51.0, extended through v0.59.0)

`testbot/bot.mjs` is a standalone Node script that logs into BC as a second account and plays the
hypnotist: it sends the hidden-message protocol, speaks suggestion-phrased lines into the room, and
walks the subject through a scenario a step at a time. The subject's client does all the actual
work; the bot is a protocol-aware message sender that knows what each step is supposed to produce.

**Driving it.** `/bot run <n>` starts a scenario and `/bot next` advances it; `/bot retry`
re-attempts a failed induction; `/bot status`, `/bot rooms` and `/bot trance` are utilities. These
are slash commands that travel over the hidden channel rather than room chat — the scenarios that
silence the subject would otherwise make it impossible to reach the next step. **Since v0.86.1
`/bot` is BC's native command**, which sends "ChatRoomBot <text>" hidden to everyone else in the
room; the test bot reads that as well as ECHS's own `/hypno bot <text>`. ECHS used to register
`/bot` itself, believing BC had none. `CommandCombine` replaces a command with the same tag, so
every player with ECHS lost BC's `/bot` (Bella's reports, on 0.84.1). **ECHS registers `/hypno`
and `/echs` and nothing else**, and `test/command-namespace.mjs` holds it to that.

**Every step carries its expected result.** DW asked for this after a run where the output was
impossible to grade: each step declares `want` (what should be observed) and, where it is not
obvious, `fail` (what would mean it is broken). The bot prints both before waiting.

**Two rules the harness itself is built on**, written into the file's header because both were
learned by getting them wrong:

- **If a step cannot fail, it is not testing anything.** Three scenarios were once passing because
  the setup produced the state the assertion was checking for — no session at all, a trance that
  freezes on its own, and that same freeze then blocking undressing.
- **"Ran but nothing happened" must be a reportable outcome.** "Nothing happened" is ambiguous on
  its own, so the subject's client reports non-matching outcomes explicitly rather than staying
  quiet.

**The bot never speaks its own instructions into the room.** Step guidance goes over the hidden
channel as `test-note`. It used to be said aloud, where the subject's trigger matching — which runs
before the name gate and the session check — parsed it and fired a stored trigger twice. The
harness was poisoning its own test.

| # | Scenario | What it proves |
|---|---|---|
| 1 | **induction** | The basic loop end to end: attempt, private choice, RP window, roll. The **only** scenario that rolls — every other one forces the depth. A failed roll is not a failed test, which is why `/bot retry` exists as a step of its own rather than something to discover after three attempts start a ten-minute cooldown |
| 2 | **depth-shallow** | At Yielding, the earned-only three (illusion, trigger, carry) refuse and name the tier they need |
| 3 | **depth-deep** | At Blank with all of it earned, the same three apply |
| 4 | **depth-arousal** | **The important one.** 80 full / 20 earned — deep because aroused, not because hypnotised. Session features work; the earned three still refuse with *arousal does not count* |
| 5 | **trigger-fires** | A trigger planted deep still fires later with no trance at all. This is the one that nearly shipped broken |
| 6 | **ooc** | Parenthesised text does nothing. Tests a **release**, not a restriction — see the note below |
| 7 | **undress** | One garment at a time, accessories left alone, and refusals that name the real reason |
| 8 | **hard-floor** | Unticking *Hypnosis Enabled* releases everything **and ends the session** |

**Why scenario 6 tests a release.** The first version put the subject under, sent
`(ooc: Missy you cannot move)`, and asserted she was not frozen. But `applyTranceState()` freezes
her the moment she goes under if *Cannot Move During Trance* is ticked, which it is — so she was
already frozen and the assertion could not fail. It now sends a parenthesised *release* and asserts
the freeze is still there, then sends the same release unparenthesised and asserts it lands.

**Setup.** `testbot/secrets.json` holds the bot account's login, is gitignored, and DW fills it in.
It is never committed and never printed.

**Scope: testing only.** Not for RP use with real players. Full RP integration into SSS (Handler as
hypnotist) remains a separate, larger idea and is not planned.

---

## Needs Testing

*Last reconciled against the code 2026-09-21, at v0.80.0. Three items are open: 8 (decay in play),
10 (the Data tab's Reset button) and 11 (a hypnotist leaving the room). Everything else on this list
is struck through.*

Items 0–7 are confirmed — 0–6 against the test bot on 2026-09-07, and 7 on 2026-09-08 once the
scenario was rewritten to be capable of failing. Item 9, the Known Bug #4 fix, was confirmed by DW on
2026-09-12. **Two things are open:** decay has never run outside the unit suite, and the Data tab's
Reset button (item 10) has never been exercised in play. Expected results are spelled out, because DW
asked for that after a run whose output could not be graded.

### ~~9. Reset while in a trance (v0.63.1)~~ — **confirmed in play 2026-09-12**

Run by DW on the combined v0.64.0 build, the same day the fix was written. Every step below passed,
**including step 5** — which is the one that mattered, since the recovery key lives in its own
`localStorage` entry and a settings wipe cannot reach it, so a reload was the only way to prove it
had gone. Nothing came back.

The steps are kept rather than deleted: this is the script to re-run if `resetSettings()` or
`totalStop()` is ever touched again.

The unit suite proves the in-memory state comes down. What it could not prove is the half that only
exists in the browser: the BC effects riding on the Emoticon item, and the recovery key surviving a
reload. Both are the parts that made this bug matter.

1. Go under. Confirm with `/hypno session` that the phase is `Hypnotized`, and that you are frozen.
2. Type `/hypno reset` — **not** confirmed. *Expect:* the warning names the trance and offers
   `/hypno safeword` as the gentler option. *Failure looks like:* the old one-line warning, with no
   mention of the trance; or a refusal.
3. Type `/hypno reset confirm`. *Expect:* one line reading *"Trance ended and every effect released.
   Settings reset to defaults."*, movement back immediately, and the hypnotist seeing *"They reset
   the add-on. Everything has been released."* *Failure looks like:* still frozen, or only the wipe
   reported.
4. `/hypno session` → `Idle`, no hypnotist. `/hypno effects` → nothing applied.
5. **Reload the tab.** *Expect:* still clear — nothing restored, no orphaned-effect message. *Failure
   looks like:* the trance or any effect coming back, which is the recovery key not having been
   cleared and is the specific thing a settings wipe cannot reach on its own.
6. Check the settings screen actually reset: trust empty, every permission off.

### 10. The Data tab's Reset button, while in a trance — **open, never run live**

Item 9 covered the `/hypno reset` command. The **Reset button on the Data tab** was not tested, and
it is not quite the same path: it goes through the same `resetSettings()`, so the teardown is
identical and it should free you the same way — but it has its own two-step arm (click twice within
five seconds) and it carries **no trance warning**, because the warning added for Bug #4 lives in the
command table. So from the screen you get the release without the heads-up the command now gives.

*Expect:* the trance ends and everything releases, exactly as the command does. *Failure looks like:*
still frozen after the second click, which would mean the button is not reaching the same teardown.
Worth deciding separately whether the missing warning is a bug or acceptable — the settings screen may
be locked while hypnotized anyway (`lockedWhileHypnotized`), which would make it unreachable and the
question moot. That has not been checked either.

> Note on numbering: this list is a list of *topics*. The harness has eight scenarios and its own
numbers — see *Test Harness — the eight scenarios*.

### ~~0. The depth system in play (v0.50.0)~~ — **covered by test bot**

The largest untested change in the project. Everything below assumed trust gates; they are
gone. Worth checking, roughly in this order:

- **A shallow trance refuses the deep things.** Take someone under with Ignore and no
  relationship — depth will be low — then try the illusion, a trigger and carry-forward. All
  three should refuse and name the tier. `/hypno effects` shows the tier reached.
- **A deep one allows them.** Agree, ideally with roleplay for the bonus.
- **Arousal cannot buy the earned three.** Get aroused, go under, confirm the session
  features work and the illusion/trigger/carry still refuse with *arousal does not count*.
- **A trigger planted deep still fires later**, out of trance, at depth zero. This is the one
  that nearly shipped broken.
- **The Depth tab**: cycle a tier, confirm the gate moves; reset to defaults.

### ~~1. Carried suggestions across a wake AND a disconnect~~ — **covered by test bot**

The full chain (awareness block + illusion + carry-forward → wake → disconnect → reconnect) was run. Confirmed: `/hypno effects` after reconnect shows both carried effects still on, `recovery: durable only` in console, illusion rebuilt from the original garment list.

### ~~2. Known Bug #1 — awareness suppressed at session start~~ — **confirmed closed**

Fresh load, start session, `/hypno effects` before any suggestion: all three awareness lines off. Closed.

### ~~3. A trigger firing outside a trance, then a disconnect~~ — **covered by test bot**

Trigger planted, woken, fired in conversation, disconnected, reconnected. Still holding with remaining time, not a fresh duration.

**Reopened by Known Bug #8 (v0.82.1).** On the code as it stood through v0.82.0 this could not pass: a trigger fired after waking was never written down, so a reconnect cleared it as an orphan. Whatever the earlier run had in force that kept the save heartbeat alive, it was not this path. Re-run it on v0.82.1: fire a trigger outside a trance, **refresh the tab** within its duration, and `/hypno effects` should still show it holding with the remaining time. Failure looks like *"Something was still holding you from before. It has let go."* on reload.

### ~~4. Undressing~~ — **covered by test bot**

Single items, full undress, accessories left alone, refusal with hands bound named the reason correctly. The freeze-blocking-undress bug (v0.57.0) was found and fixed during this scenario.

### ~~5. The RP bonus~~ — **covered by test bot**

`/hypno chance` showed the bonus climbing as the bot typed. 15-character floor not rejecting real phrasing.

### ~~6. OOC filtering~~ — **covered by test bot**

Parenthetical-only suggestion fired nothing. Mid-line aside stripped, surrounding suggestion still landed. Made falsifiable by following with a non-parenthetical version and asserting it fired.

### ~~7. `hypnoEnabled` off as the hard floor~~ — **confirmed 2026-09-08, v0.61.2**

Run twice before v0.58.0 and never caught: the scenario asked only whether the effects came off,
which they did on both builds. The bug was the session surviving, and the step could not see it —
the same blind spot `test/revoke.mjs` had, for the same reason. The scenario was rewritten to ask
`/hypno session` and to re-tick the switch afterwards, and the pass below is against the rewrite.

**What the bot recorded**, from the subject's own state pushes rather than from a typed answer:

| | |
|---|---|
| 03:10:03 | `effects:["Freeze"]`, `phase:"Hypnotized"`, `depthBand:"very deep"` — under at Blank |
| **03:11:30** | **`effects:[]`, `phase:"Idle"`, `depthBand:null`** — the untick, and `phase` is the field v0.58.0 fixed |
| 03:12:16 | re-tick: no state push at all, so nothing came back with the permission |
| 03:12:32 | *"Missy, you cannot move."* — no effect change follows, so no session for it to attach to |

The client volunteered its own reason, which is the v0.58.0 shared-teardown wording doing its job:
*"They turned hypnosis off. Everything has been released."*

Note for anyone reading the log: the three-step version run at 03:00 also reported `1 ok, 0 failed`.
Both versions pass now, because the code is correct. Only the five-step one demonstrates it.

### 8. Trigger reinforcement and decay in play (v0.60.0) — **not yet run**

Covered by unit tests, never exercised against a live client.

> **The tooling this was blocked on now exists (v0.63.0).** Even at *Very fast* a Deep planting
> takes twelve hours to die, so the first step of a decay scenario was watchable and every step
> after it was not. **`/hypno agetrigger [days] [number]`** backdates `reinforcedAt` by a stated
> number of days — both arguments optional, so a bare `/hypno agetrigger` is one day across every
> planted trigger — with a `test-age` hidden handler behind it so the bot can drive the same thing
> with `!age [days] [number]`. `TESTING_MODE`-only at three points — the command refuses, the core
> function refuses, and the handler is never registered — so it does not exist in a release build,
> which matters more here than for `/hypno triggers full` because this one *writes*.
>
> It is **relative**: `/hypno agetrigger 1` twice is two days, which is how the two readings part 5
> needs are taken without working out a total. It moves the clock and **nothing else** — the firing
> credit is left alone on purpose, because zeroing it would make part 2 unfalsifiable. A negative
> number winds the clock forward again, capped at now, for a run that overshoots. Triggers are named
> by their **number** in `/hypno triggers`, never by phrase, so the hidden-phrase rule survives the
> testing affordance. It does not prune: something aged past zero reads *"faded away"* and goes on
> the next list read, which is part 4 demonstrating itself.
>
> **The run is still owed.** With aging, the scenario below is about ten minutes of work.

**How to run it, once aging exists:** `/hypno triggerdecay veryfast` — since v0.62.0 that is a Deep
planting gone in about twelve hours and a Blank one in about a day, so step 1 is observable
unaided. Plant a trigger under a Blank trance, wake, then check `/hypno triggers`.

**Plant it with two actions at different tiers** — *cannot move* (Yielding, 20) and the clothing
illusion (Deep, 60) on the same trigger word. That pairing is what makes step 2 below falsifiable:
one half of a single trigger keeps working while the other stops, which no other arrangement
demonstrates. Plant from **Blank**, not Deep: planted at exactly 60 the illusion half is out of
reach the moment any decay starts, which is correct behaviour and a useless test.

**Expected result, in five parts:**

1. `/hypno triggers` shows a strength and the tier it still reaches — *"60/60 — full strength
   (Deep)"* at first, drifting down as `plantedDepth` decays.
2. Firing the trigger slows it but does not restore it. Fire it a few times and the number should
   stop falling rather than jump back to 60 — that is the 0.25-days-per-firing credit, capped at 2
   days.
3. Saying **"that trigger holds"** while under with the hypnotist who planted it resets the clock
   fully; the strength returns to `plantedDepth` and the firing credit clears. Said by anyone else,
   or said outside a session, it must do **nothing** — that gate is what stops the phrase being a
   magic word that keeps someone's work alive forever.
4. A trigger driven below 10 fires flavour and no actions; at 0 it disappears from the list
   entirely — unless it is holding you at that moment, in which case it survives until it lets go.
5. Aged **two** days it has lost more than twice what it lost in one. That is the v0.62.0
   acceleration, and it is the only part of the model that cannot be confirmed by watching a single
   reading.

**What failure looks like:** strength that does not move at all (the rate setting is not being
read); strength that resets on firing (the credit is moving `reinforcedAt` instead of crediting
elapsed time); a reinforcement phrase working from a non-installer or outside a session; or a
trigger vanishing while it is still holding you, which would strand the effect with nothing left to
release it.

Set the rate back to **Never** afterwards, or every trigger planted during later testing will
evaporate.

---

### 11. A hypnotist who leaves the room (v0.80.0) — **open, never run live**

Two clients, both with the add-on. DW's own report, 2026-09-21, and the unit suite
(`test/departure.mjs`, 51 checks) can only prove the rule — it cannot prove that BC's own roster
updates on the subject's client the moment someone walks out, which is the single assumption the
whole fix rests on.

1. **The bug itself.** Hypnotist attempts. Subject answers *agree*. Hypnotist **leaves the room**
   before the sixty-second window is up. *Expect:* when the window ends, the subject is told
   *"GameBot left before it could land. Nothing came of it, and nothing was used up."*, `/hypno
   session` reads `Idle`, and `/hypno effects` shows nothing applied. *Failure looks like:* the
   subject going under with nobody there — which is exactly what happened before v0.80.0.
2. **Nothing was spent.** Still in that state, hypnotist comes back and attempts again. *Expect:*
   a full two tries, because the abandoned one was never counted. *Failure looks like:* the
   cooldown arriving one attempt early.
3. **The other direction — the count must NOT reset.** Attempt, let it miss, hypnotist leaves
   mid-retry, comes back, retries. *Expect:* the second miss is the last and the cooldown starts.
   *Failure looks like:* three or more tries, which is leaving the room used as a cooldown bypass.
4. **A live trance.** Subject under. Hypnotist leaves. *Expect:* the subject is told they are not
   in the room and that it ends if they are not back in five minutes; at five minutes the trance
   ends and every effect comes off. *Failure looks like:* still frozen at six minutes, or ending
   instantly with no warning.
5. **Back inside the window.** Same, but the hypnotist returns after two minutes. *Expect:* *"GameBot
   is back."* and the trance continues.
6. **The subject leaves instead.** Subject under, subject walks out to the lobby and back in.
   *Expect:* nothing ends on account of the empty roster — recovery handles this case and this
   watcher must stay out of its way. *Failure looks like:* the trance ending the moment the subject
   leaves the room, which would be a worse bug than the one being fixed.

### 12. Small visible fixes (v0.82.3) — **open, never run live**

One client is enough for all of it. The unit suites prove the logic; what they cannot prove is what
BC actually draws, which is the whole of steps 2 and 3.

1. **Double brackets while silenced.** Be put under with *cannot speak* on, then type
   `((brb, door))` in the room. *Expect:* it goes through to the room. *Failure looks like:* the
   "cannot speak" refusal and the text left in the input box, which is what happened before.
   Then type `hello ((sorry))`. *Expect:* still refused, because "hello" is speech.
2. **The veil stays on the room.** Under, with screen fade on. *Expect:* the white wash covers the
   characters on the left half of the room only; the chat log, the menu buttons along the top right
   and the settings screens are untouched. Click a character to open their dialog. **Unverified
   either way:** whether BC still runs the room's draw while a dialog is open. If it does, the
   characters behind the dialog stay veiled; if it does not, the veil lifts until the dialog closes.
   Either is acceptable; write down which. *Failure looks like:* white over the menu, the dialog or
   the settings.
3. **Preset blurbs.** Open settings with a fresh setup (or run the wizard again). *Expect:* each of
   the four preset descriptions shows in full, wrapped onto two lines where needed, with no "…". Try
   it again with a different font in BC's preferences. *Failure looks like:* a blurb ending in "…",
   or two blurbs overlapping.
4. **The loaded note.** Refresh the page. *Expect:* "ECHS v0.82.3 loaded" in the bottom-right
   corner, gone about six seconds later. *Failure looks like:* it staying.
5. ~~**Console.**~~ **Done — marked by DW 2026-09-24 on v0.85.3** ("the log is much better").
   Seen live: the default level is quiet in a busy room. Not run separately: the `/hypno debug`
   toggle, its survival across a refresh, and the Hypno Testing room turning it on; DW closed the
   step without them, and `test/console.mjs` covers all three. Original step kept for reference:
   Open devtools at the default level and chat in a room. *Expect:* one "script
   loaded" line and nothing per message. Switch on *Verbose* (Chrome) and the per-message lines
   appear. *Failure looks like:* a line for every message at the default level.
   **Since v0.85.3** the per-message lines need more than *Verbose*: outside the Hypno Testing room
   they appear only after `/hypno debug`. *Expect:* with *Verbose* on in an ordinary room, nothing
   per message; `/hypno debug` says ON in chat and the lines start; refresh and they are still on;
   `/hypno debug` again and they stop. In the Hypno Testing room they appear with the switch off.
   *Failure looks like:* lines at *Verbose* with the switch off outside the room, or none inside it.
6. ~~**The scrolling lists.**~~ **Done — marked by DW 2026-09-25 on v0.86.0** ("It looks very nice. I am
   happy with it"). Seen live: the one-column list and the scroll bar. Not run separately: a click on
   the hidden half of a cut-off row, the wheel over the help page, and scrolling under the session
   lock; DW closed the step without them, and `test/menu-layout.mjs` covers all three. Original
   step kept for reference: **The scrolling lists (v0.86.0; replaces the v0.85.4 two-column
   check).** Open settings on the
   Permissions tab. *Expect:* one column of checkboxes, full width, with a scroll bar on the right
   (▲ at the top, ▼ at the bottom, a grey thumb between). The list is cut off cleanly at the bottom
   of the panel, with no row drawn over the panel's edge. Then:
   - Click ▼ a few times. *Expect:* the list moves up one row per click, and ▼ greys out at the
     end, where the *Attempts before they must wait* button and its one-line caption sit under the
     Lock row. Click ▲ and the list comes back. Click the grey track below the thumb. *Expect:* it
     jumps about a screen.
   - Turn the mouse wheel over the list. *Expect:* one row per notch. Over the tabs on the left:
     nothing. With the help page open: nothing moves behind it.
   - With a row half cut off at the bottom, click the **hidden** half of its box (just below the
     list's edge). *Expect:* nothing changes. Click the visible half. *Expect:* it ticks.
   - Click Self-Touch Control and the Attempts button. *Expect:* each changes its own setting.
   - Awareness and Trance Defaults: one column and no scroll bar. Triggers: four rows, no bar, and
     the dropdowns below them untouched.
   - Under a session lock, the scroll bar still works, but the checkboxes do not.
   *Failure looks like:* a row drawn outside the list, a click landing on the wrong row after
   scrolling, the wheel scrolling something you cannot see, or the list opening part-way down.

### 13. The install loader (v0.83.0) — **open, never run live. Steps 1 and 2 belong BEFORE the merge**

A merge here reaches every tester's install at their manager's next update check, and from then on
their add-on only exists if the loader can fetch it. So the two things nothing here could check are
run first, by hand, from the PR's own commit, with the loader not yet installed anywhere. Replace
`<commit>` with the PR's latest commit hash.

1. **BC accepts a script from jsDelivr.** Switch ECHS **off** in your userscript manager and load BC.
   Open the browser console and paste
   `document.head.appendChild(Object.assign(document.createElement("script"), {src: "https://cdn.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@<commit>/cdn/HypnosisAddon.js"}))`.
   *Expect:* "ECHS v0.83.0 loaded" in the bottom-right corner and `script loaded (v0.83.0)` in the
   console; entering a room prints the v0.83.0 chat line. *Failure looks like:* a console error
   naming *Content Security Policy*, or nothing at all. Then the loader cannot work: **do not merge**.
2. **The GitHub fallback runs.** Refresh, ECHS still off, and paste
   `fetch("https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/<commit>/cdn/HypnosisAddon.js").then(r => r.text()).then(t => document.head.appendChild(Object.assign(document.createElement("script"), {textContent: t})))`.
   *Expect:* the same as step 1. *Failure looks like:* a *Content Security Policy* error about an
   inline script. The fallback is then useless, but jsDelivr alone still works, so this one does not
   block the merge; write down what it said.

After the merge:

3. **The cache purge ran.** GitHub → Actions → *Purge jsDelivr cache*. *Expect:* a green run for the
   merge commit. *Failure looks like:* red. That costs lag of up to 12 hours, not a broken install.
4. **The update moves you over in place.** Switch ECHS back on, then in Tampermonkey use *Check for
   userscript updates*. *Expect:* one ECHS entry, now v0.83.0, a few KB in size. *Failure looks like:*
   two ECHS entries, which would load everything twice.
5. **It loads.** Refresh BC. *Expect:* `loader v0.83.0: loading ECHS from jsDelivr` in the console,
   then everything from step 1. Your settings, trust and triggers are as you left them.
6. **The fallback, and the note.** Devtools → Network → block `cdn.jsdelivr.net` and refresh.
   *Expect:* a console warning that the jsDelivr copy failed, then the add-on loads from GitHub. Also
   block `raw.githubusercontent.com` and refresh. *Expect:* a red note in the corner saying ECHS could
   not load, which stays until clicked and goes when clicked. *Failure looks like:* no add-on and no
   note, which is the silent failure the note exists for.

### 14. Spoken orgasm denial (v0.83.2) — **open. v0.83.1 and v0.83.2 both reported failing 2026-09-23; parked, see Todo**

Two clients, the subject with *Arousal & Orgasm* ticked and BC arousal not set to Inactive.

**The v0.83.1 run (DW, 2026-09-23), for the record.** Subject on v0.83.1, under. "Rei you cannot
cum" landed with its denial line. A taped egg at maximum then held her meter still (BC's own
denial pins it at 99), but her own masturbation finished her with a full orgasm. Nobody said "cum
for me". The room had BCX hooking `ActivityOrgasmPrepare` and WCE hooking `ActivityTimerProgress`;
the subject's own add-ons were not recorded. v0.83.2 stops the orgasm in the add-on itself. Step 1
below is the one that failed, and **step 1b is the exact move that got through**.

1. **It holds on its own.** Put the subject under, then say *"Missy, you cannot cum."* Straight away,
   with nothing else in between, raise her arousal to 100 with a vibrator or activities. *Expect:*
   the meter stops short and no orgasm happens. *Failure looks like:* an orgasm, which is what v0.82.3
   did. If it fails, run `Player.Effect.includes("DenialMode")` in her console and send the answer.
   *Also expect:* one line to her, and one to the room, that she was held at the brink.
1b. **Her own hand.** Still denied, the subject masturbates (her own activity, not a command). *Expect:*
   no orgasm, the meter stays at 99. *Failure looks like:* an orgasm, which is what v0.83.1 did.
   If it fails, send the list of add-ons she runs.
2. **Permission lifts it.** Say *"Missy, you may cum now"* and raise her again. *Expect:* an orgasm.
3. **A denial with an end.** Say *"Missy, you cannot cum until I allow you to cum"*, then repeat step
   1. *Expect:* denied. *Failure looks like:* an orgasm; the hypnotist would also have been told
   the line was a permission.
4. **Command still wins.** While denied, say *"Missy, cum for me."* *Expect:* an orgasm, then denial
   back in force (repeat step 1). That is the settled rule, not a failure.

### 15. Commanded activities on someone else (v0.84.0) — **open, never run live**

Three characters in a room: the hypnotist, the subject (*Made to act* ticked, under at Yielding or
deeper) and a third, Rei, who needs no add-on. Send the raw chat transcript back, not a summary.

1. **Kiss me.** The hypnotist says *"Missy, kiss me."* *Expect:* a BC kiss on the hypnotist's lips in
   the room, and one line to the subject that her body moved. *Failure looks like:* nothing, or a
   `[command]` line naming a setting the hypnotist has not changed.
2. **The new tick guards everyone else.** *"Missy, kiss Rei."* with *Made to Touch Others* off.
   *Expect:* nothing happens and the hypnotist reads *Refused — they have not enabled "Made to touch
   others"*. Tick it and say the line again. *Expect:* a kiss on Rei's lips.
3. **A named spot.** *"Missy, kiss Rei's nipples."* *Expect:* the kiss lands on her nipples.
4. **BC still decides.** Rei sets her own nipples to "no" in her BC arousal zones. Repeat step 3.
   *Expect:* nothing happens and the hypnotist reads only *"kiss" didn't land.*, with no reason.
   *Failure looks like:* the kiss happening anyway (we bypassed BC), or a reason being shown.
5. **Item permission.** Rei sets her BC item permission so the subject may not use items on her, then
   step 3 with her zone back on. *Expect:* didn't land. **This step also settles an unverified
   point:** if clicking her in BC would still let the subject kiss her, we are stricter than BC. Say
   which it was.
6. **Your own settings.** The hypnotist turns their own lips to "no", then *"Missy, kiss me."*
   *Expect:* the hypnotist is told their own zone is set to no.
7. **Names are exact.** *"Missy, kiss Re."* (a partial name). *Expect:* nothing at all happens.
8. **Two subjects, one line.** If a second subject is present: *"Missy, kiss Rei. Ella, kneel."*
   *Expect:* both happen, each to the right person.

---

### 16. The first-run notice on an ordinary login (v0.84.2) — **open, never run live**

A character that has never had ECHS set up (or clear `welcomeShown` with a fresh settings reset on
the Data tab). Send the raw chat transcript back.

1. **The ordinary arrival.** Refresh BC, log in, and stay on the room list for at least **30
   seconds** before joining any room. *Expect:* the first lines in the room's chat are the version
   line, then *"nothing is switched on yet. Click the spiral to set up."* and the line about
   reactions. *Failure looks like:* the version line alone. That was every fresh login before
   v0.84.2, because the notice waited on a poll that had stopped 20 seconds after load.
2. **Once only.** Refresh and join a room again. *Expect:* the version line, and no notice.
3. **Nobody else sees it.** Have a second character in the room for step 1. *Expect:* they see
   nothing from it.

### 17. The pose library (v0.85.0) — **open, never run live**

Every pose rides **Posture Control**. Two characters, a trance at Yielding or deeper. Send the raw
chat transcript back. The names are BC's own, from `docs/bc-pose-reference.md` (DW, verified
against upstream `Typedef.d.ts`); what this run checks is how BC behaves when they are set.

1. **Legs and arms together.** *"Missy, kneel."* then *"Missy, hands behind your back."* *Expect:*
   kneeling with hands behind. *Failure looks like:* standing with hands behind, which means BC's
   setter replaces the whole pose rather than one category; the console also logs
   `pose: setting ... also lost`.
2. **Stand keeps the arms.** *"Missy, stand."* *Expect:* upright, hands still behind. Then
   *"Missy, relax your arms."* *Expect:* arms at the sides.
3. **Every other pose.** One line each from the What to Say list. *Expect:* the pose, and the room
   line that matches it. *Failure looks like:* *"...tries to obey, but {their} body will not go
   there"* with no bondage on, which means BC will not allow that pose unaided (item-only,
   `AllowMenuTransient`). Hogtied, behind *"lie down"*, is the likeliest.
4. **Whole-body poses.** *"Missy, hands behind your back."* then *"Missy, on all fours."*
   *Expect:* on all fours, arms no longer behind. That is BC's BodyFull category and is expected.
5. **Bondage refuses.** Put the subject in leg restraints that stop kneeling, then *"Missy,
   kneel."* *Expect:* no kneel, the room hears her try, and the hypnotist's chat says it matched
   but did not land. *Failure looks like:* the kneel line with no kneel, which is what every
   version before v0.85.0 did.
6. **Her own pose survives waking.** Have the hypnotist say *"Missy, kneel."*, then the subject
   raises her arms from BC's own pose menu. Wake her. *Expect:* standing, arms still raised.
7. **Patter.** *"Missy, surrender to my voice."* *Expect:* her arms go up over her head. That
   clash is deliberate (DW, 2026-09-23) and noted in the wiki. *"Missy, sit."* *Expect:* nothing,
   since BC has no sitting pose.

### 18. Cancel in the setup wizard (v0.85.1) — **open, never run live**

One character, fresh settings (`/hypno reset confirm`, or a new account). Open ECHS settings.

1. **First run.** Choose *Answer a few questions instead*, tick one answer, click **Cancel**.
   *Expect:* the ordinary settings tabs, with nothing ticked on Permissions. *Failure looks like:*
   the welcome page again (setup not marked done), or the ticked permission switched on.
2. **Where it sits.** On every question and the summary, **Cancel** is left of *Next* / *Apply*,
   clear of *Back* and of the "2 of 5" counter. *Failure looks like:* overlapping buttons or text.
3. **Re-run.** Apply any preset, then press **Setup**, go to the summary, click **Cancel**.
   *Expect:* the tabs, every setting exactly as the preset left it.

### 19. Trigger options (v0.87.0) — **open, never run live**

Two characters: a hypnotist H and a subject S with Triggers allowed, S in a Deep trance from H.
`test/trigger-options.mjs` covers the logic; this is the part it cannot see — the real chat path, the
settings screen and a reload.

1. **Options while planting.** H: *"S, your trigger word is ember glow"*, *"S, you cannot move"*,
   *"S, this trigger works only once"*, *"S, it lasts 2 hours"*, *"S, remember trigger"*.
   *Expect:* H sees a `[trigger] Noted …` line for each option, then a SAVED line ending
   `Options: works once, ends in 2 hours`. S sees *"The shape of it shifts, just slightly."*
   twice. *Failure looks like:* an option line recorded as a suggestion (H's SAVED line lists
   extra actions), or no Noted line.
2. **Once means once.** Wake S. H says *"ember glow"*. *Expect:* S is frozen. `/echs triggers` on S
   shows it *used up, letting go*. H says it again: nothing. Release it (*"S, you are released from
   ember glow"*). *Expect:* S can move, and `/echs triggers` no longer lists it. *Failure looks
   like:* it fires twice, or it is still listed after release.
3. **Reload while a one-shot holds.** Repeat 1–2 with a new word, and reload S's tab while frozen.
   *Expect:* still frozen after the reload, listed as used up; releasing it removes it.
4. **The ceiling.** On S's Triggers tab set *Longest a new trigger lasts* to **15 minutes**. Plant a
   trigger with *"it lasts 2 hours"*. *Expect:* H's SAVED line says her settings let a trigger live at
   most 15 minutes. Wait 15 minutes (or longer): `/echs triggers` no longer lists it, and saying the
   word does nothing. *Failure looks like:* still firing after 15 minutes.
5. **Whole words.** Tick *Triggers fire only on whole words* on S. Plant *"sleepy"*. H says
   *"hey sleepyhead"*. *Expect:* nothing. H says *"so sleepy"*. *Expect:* it fires.
6. **Scope ask, capped.** S's scope *Hypnotist only*. H plants with *"S, anyone can use it"*.
   *Expect:* H told her settings only allow *Hypnotist only*. A third player saying the word fires
   nothing.
7. **Layout.** S's Triggers tab: the lifespan dropdown sits right of the scope dropdown, on the same
   row, not overlapping it or its label, and both disappear on switching tabs.

### 20. The trigger inspector (v0.88.0) — **open, never run live**

Two characters, H and S as in item 19, with S's *Show trigger words* **off**. H plants two triggers
in S (any suggestion each; make one "you cannot move").

1. **The list.** S: `/echs triggers`. *Expect:* "You have 2 triggers planted:" and one line each,
   giving H's name and member number and a strength such as *full strength (60, Deep)*. No words and
   no actions. *Failure looks like:* a phrase or a suggestion name in the list.
2. **The detail.** S: `/echs triggers 1`. *Expect:* who planted it, strength, "Word: hidden …",
   and "What it does: you cannot move" (or the other suggestion in words). `/echs triggers 7`
   answers "no trigger 7 — you have 2."
3. **The Planted tab.** Open ECHS settings → **Planted**. *Expect:* the same two lines, each with
   *Details* and *Purge*, and *Clear All* below. *Details* shows the detail text and a *Back*
   button. Nothing overlaps; the tab list on the left still fits.
4. **Purge refused while held.** Close settings. H says the "you cannot move" trigger. Open
   **Planted**: that row reads **HOLDING YOU NOW** in red and its button says *Holding*. Click it.
   *Expect:* a chat line saying it cannot be removed while it holds you. The row is still there.
   *Clear All* is greyed with the reason beside it; clicking it gives the same reason.
5. **Clear All refused in a session.** Safeword, so nothing holds. H hypnotises S again. *Expect:*
   *Clear All* greyed, the note says a session is running. `/echs forgettrigger all` in chat
   refuses the same way.
6. **Clear All asks first.** Safeword again. Click *Clear All* once. *Expect:* it turns to
   *Confirm?*, the note turns red, nothing is removed. Wait 5 seconds: back to *Clear All*. Click
   twice quickly. *Expect:* "Removed 2 trigger(s)." and the tab says none are planted.
7. **The chat version.** Plant one more. `/echs forgettrigger all` → a warning naming
   `/echs forgettrigger all confirm`, nothing removed. Then the confirm → removed.
8. **Purge a free one.** Plant one; on **Planted** click *Purge*. *Expect:* "Trigger 1 removed."

### 21. Trigger words shown as "..." in chat (v0.89.0) — **open, never run live**

H and S as before; S's *Show trigger words* **off**, *Awareness > Trigger setup* **off** (so the
setup lines are drawn at all). A third player R in the room, to compare screens.
`test/conceal.mjs` proves the masking; only a live run proves BC draws what the handler returns.

1. **Planting.** H, with S under: *"S, your trigger word is ember glow"*. *Expect on S's screen:*
   "S, your trigger word is ...". *On R's:* the full line — only S's screen changes. *Failure
   looks like:* the word on S's screen, or R's line changed.
2. **While recording.** H: *"ember glow, S — you cannot move"*, then *"S, remember trigger"*.
   *Expect:* S sees "..., S — you cannot move".
3. **Firing.** Wake S. H says *"Ember glow!"*. *Expect:* S sees "...!" and is frozen. Release.
4. **Other senders, emotes, whispers.** R says it in chat; H emotes *"whispers ember glow"*; H
   whispers it to S. *Expect:* "..." every time, and the emote still starts with H's name.
5. **Stutter.** Raise H's arousal until BC stutters their speech; H says it. *Expect:* "..." with
   no leftover "e-" in front.
6. **Gagged, with "Show ungarbled messages" on.** Gag H; on S turn on BC's *Show ungarbled
   messages* (Immersion). H says it. *Expect:* the bracketed ungarbled copy reads "[...]".
7. **The opt-out and the floor.** Tick *Show trigger words*: H says it, S sees the word. Untick it;
   untick *Hypnosis Enabled*: S sees the word. Re-tick. *Failure looks like:* masking with either
   one set that way.
8. **Your own line.** S types the word. *Expect:* S sees what they typed, unmasked.
9. **Notifications.** With BC chat notifications on and the tab in the background, H says it.
   *Expect:* the desktop notification shows "..." too.

### 22. Instant drop triggers (v0.90.0) — **open, never run live**

H and S as before, plus a third player R. `test/drop.mjs` covers the rules; this checks the real
trance: the freeze and fade, the room announcement, H's panel, and waking.

1. **Refused while off.** S leaves *Drop triggers: Off* (Triggers tab, scroll down). H, with S under:
   *"S, when you hear ember glow, you will drop into trance"*. *Expect:* H told S has not allowed
   drop triggers; the recording starts but holds no drop. Cancel it.
2. **Planting.** S sets *Drop triggers: Unlimited*. H plants the same line and *"S, remember
   trigger"*. *Expect:* H's SAVED line lists `trance-drop` and says *works once*, because nothing
   said otherwise. Wake S.
3. **The drop.** H says *"ember glow"*. *Expect:* S goes straight under with no prompt: frozen,
   the screen fade, "You drop straight under. (deep)", and the room sees the usual trance line. H
   is told they dropped; H's remote panel shows S hypnotised by H. `/echs triggers` on S: the
   trigger is gone (it was one-time).
4. **Waking.** H's Wake button, or `/echs wake` if shallow, ends it as any trance. *Failure looks
   like:* S cannot be woken except by safeword.
5. **Unlimited.** Plant again with *"S, it works every time"*. Wake, drop, wake, drop. *Expect:* it
   works each time and stays listed.
6. **Lowered to once.** Set S to *One time*. H drops S. *Expect:* it works, then it is gone.
7. **Refusals said out loud.** With S already under H, R speaks a drop trigger R may fire (widen S's
   scope). *Expect:* R told S is already in a trance. S sets *Off*; H speaks one. *Expect:* no
   trance, H told, S sees "Something pulls at you, toward trance, and lets go."
8. **Reload while dropped.** Drop S, reload S's tab. *Expect:* the trance resumes as any trance
   does (item 3 of the recovery rules).

### 23. Spoken and mantra triggers (Build 5, inside v0.90.0) — **open, never run live**

H and S as before, plus R watching. `test/say.mjs` stubs BC's send; only a live room shows what
the room actually receives, garbled or not.

1. **Refused without the permission.** S leaves *Made to Speak* off (Permissions tab). H, with S
   under, plants *"S, when you hear ember glow, you will say 'I obey'"*. *Expect:* H told S has not
   enabled Made to Speak. Cancel.
2. **Planting.** S ticks *Made to Speak*. H: *"S, your trigger word is ember glow"*, *"S, you will
   say 'Good girls obey.' three times"*, *"S, remember trigger"*. *Expect:* SAVED lists a `say:3:`
   action. `/echs triggers 1` on S reads `you say "Good girls obey." 3 times`.
3. **Firing.** Wake S. H says *"ember glow"*. *Expect:* R sees S say "Good girls obey." three
   times, a second or two apart, capitals and full stop intact.
4. **Gagged.** Gag S (a ball gag). Fire it. *Expect:* R sees garbled text; with *Show ungarbled
   messages* on, R sees the original in brackets.
5. **Silenced.** Drop-and-say: plant a trigger with both a drop and a line. Fire it. *Expect:* S
   drops (and, by default, cannot speak), and the line is still heard. This is the
   behaviour DW decided on, 2026-09-25.
6. **An owner's BlockTalk rule** (if one can be set up): the line does not go out; S sees "The words
   rise in you, but something stronger holds them back."
7. **Loop guard.** S ticks *You can fire your own triggers*; plant a line that says the trigger's
   own word. Fire it. *Expect:* said once, not forever.

### 24. Delayed compulsions (Build 6, inside v0.90.0) — **open, never run live**

H and S as before, plus R. `test/compulsion.mjs` drives the rules with a fake clock; the parts it
cannot reach are BC's real `ServerEnter` message, the 5-second poller in a real tab, and a
reload while a compulsion is armed.

1. **After waking.** S under H. H: *"S, two minutes after you wake, you cannot move"*, then *"S,
   remember trigger"*. *Expect:* H's SAVED line ends "It fires 2 minutes after they wake".
   `/echs triggers 1`: "When: 2 minutes after you wake". H wakes S. S can move. `/echs triggers
   1` now reads "— due in 2 minutes". About two minutes later S is frozen (within 5 seconds of due).
   *Failure looks like:* frozen at once, never, or still listed as waiting after the wake.
2. **Offline.** Repeat 1, then log S out right after the wake and back in after three minutes.
   *Expect:* the freeze lands within seconds of arriving in a room.
3. **Safeword clears it.** Plant another, wake, then `/echs safeword` before it is due. *Expect:*
   nothing fires; `/echs triggers` does not list it.
4. **Arrival.** R leaves. H, with S under: *"S, when R comes in, you cannot move"* (R's name),
   remember, wake. R rejoins. *Expect:* "R entered." then S frozen. R leaving and rejoining again
   does nothing (it was one-time).
5. **"When I come back."** *"S, when I come back, you will say 'Welcome back.'"* (needs Made to
   Speak). H leaves and rejoins after the wake. *Expect:* S says it.
6. **Speech.** *"S, when R speaks, you cannot move"*, wake, R says anything. *Expect:* S frozen.
7. **Never while under.** Plant an arrival compulsion, keep S under, have R rejoin. *Expect:*
   nothing; after the wake, R rejoining fires it.
8. **Old meaning kept.** S under. H: *"S, when you wake up you will feel refreshed"*. *Expect:* S
   wakes, as this line always did; H is told nothing was set up as a compulsion.

---

**Nine of twenty-five topics confirmed; sixteen open, above.** Next bugs or regressions go in Known Bugs.

---


## Pre-Release Checklist — Early Tester Build

Items required before handing the add-on to external testers. Ordered: hard blockers first, then things that make it survivable, then what makes it actually feel right. Check off as done.

### Hard blockers (ship nothing without these)

- [x] ~~**Flip `TESTING_MODE` to `false` in `src/log.ts`**~~ — **closed v0.73.0: there is no flag
  left to flip.** `grep -rn TESTING_MODE src/` returns nothing. `isTestingMode()` in `src/log.ts`
  now reads the room name at runtime and returns true only in **Hypno Testing**, so the shipped
  build is safe by default and there is no release step to forget. This item sat on the list as
  the number-one hard blocker for thirteen releases after it stopped being true; that is what the
  reconciliation pass on 2026-09-18 was for.

  - ~~**`test/revoke.mjs` does not survive the flip**~~ — **fixed v0.64.1; the flip no longer
    breaks the suites.** Its checks stand their trance up with `forceTrance`, which correctly
    refuses in a release build, so some failed outright — and more went on **passing while testing
    nothing**, because there was never a trance for the revoke to take down. Rule 6 exactly: a
    check that cannot fail is not checking anything, and these read green while the release build
    is the one build nobody has ever verified revocation on. Confirmed against a flipped build, not
    inferred, and independently reproduced by two threads at 25/30. **DW's call, 2026-09-12: pin it
    in the bundler.** `build-test.mjs` now forces `TESTING_MODE` true for the test bundles only, so
    the suites test the logic and this flag stays purely a release concern. Re-verify when you do
    flip it: the suites should stay green, and `dist/` should still carry `TESTING_MODE = false`.
- [x] ~~**Install and usage documentation**~~ — **done.** `wiki/` is twelve pages covering install,
  first session, commands, settings, consent and troubleshooting; `wiki/Getting-Started.md` carries
  the userscript-manager steps, the install link and the "does the other person need it" answer.
  The first-run notice in `src/welcome.ts` (v0.74.3) and the setup wizard (v0.71.0) cover the same
  ground in-game. **Keep the wiki in step** — it is a second surface and it will drift; see the
  Todo item of that name.

### Strongly recommended (testers can survive without, but experience is rough)

- [x] ~~**Per-feature depth selectors in the settings UI**~~ — **done in v0.50.0 after all.** The **Depth** tab carries one row per gated feature with a click-to-cycle tier button, the earned-only three marked as such, a chemical-scope control and a reset-to-defaults. This item was written from the deviation note ("per-feature UI selectors can follow in a later pass"), which referred to the *chemical scope* dropdown below, not the tier selectors.
- [ ] **Chemical floor per-feature dropdown** — currently one global control (deferred from v0.50.0 spec). The design calls for Both/Arousal/Drugs/Neither per feature; right now it's one setting for everything.
- [x] ~~**First-launch guidance**~~ — **built v0.70.0.** The starter-set offer on the Permissions tab: a "New here?" note plus a one-click, one-click-undo button that turns on the five safe session-scoped basics. Not the wizard, but it closes the "a fresh install looks broken" cliff.

### Makes it feel right (do before wider release)

- [x] ~~**Trigger reinforcement and decay**~~ — **built v0.60.0.** Defaults to *Never*, so a tester who changes nothing still gets plant-and-forget; the mechanic exists for anyone who wants it and the habit-forming problem is gone either way. **Still owes one live run** — see *Needs Testing* item 8.
- [ ] **Review and final pass on flavor text wording** — DW flagged this as unreviewed since v0.34.0. Worth one pass before outside eyes see it.

### Already confirmed done (do not re-check)

- ~~`INDUCTION_WINDOW_MS` → 60,000~~ — fixed v0.43.0
- ~~`hypnoEnabled` off leaving the session running~~ — fixed v0.58.0, **verified in play 2026-09-08** (Needs Testing 7)
- ~~`arousalControl` and `illusionControl` not releasing on permission revoke~~ — fixed v0.43.0
- ~~`hypnoEnabled` off not clearing illusion/denial~~ — fixed v0.43.0
- ~~OOC filtering~~ — done v0.43.0
- ~~Session state recovery after disconnect~~ — done v0.44.0–v0.45.0

---

## Priority Work Session — 2026-09-01 (closed)

> **Every item here is done.** This is kept for the reasoning, not as a list of work: item 5 is the
> only place the disconnect-recovery design is written down in full — why the bug was the opposite
> of the one described, why the state lives in its own `localStorage` key rather than near
> `ExtensionSettings`, and why the illusion rebuilds the original garments instead of re-freezing.
> **The live list is [Development Stages > Todo](#development-stages).** Do not pick work up from here.

The items below were the implementation priority as of 2026-09-01, in order.

1. ~~**`INDUCTION_WINDOW_MS` → 60,000**~~ — **done v0.43.0.** It was in `session.ts`, not `log.ts`. Also matters more than it did: the RP bonus is earned in this window, and three substantive lines in ten seconds is typing speed rather than roleplay.

2. ~~**Fix `arousalControl` and `illusionControl` not releasing on revoke**~~ — **done v0.43.0.** Both cases added. Writing the test found a third instance one level up: **`hypnoEnabled` off did not clear the illusion or the denial lock either**, which is worse, since the master switch is what someone reaches for when they want all of it to stop. All three total-clear paths (`onToggle`, `endSession`, `safeword`) now agree. `test/revoke.mjs`.

3. ~~**Depth system Phase 1**~~ — **done v0.50.0** (`depth.ts`, new **Depth** settings tab). Tiers, per-feature requirements, the two-depth split, relationship depth floors, and a chemical-scope control. Three deviations from the spec, all deliberate and all flagged in the version notes: the chemical default is *Arousal only* rather than *Neither*; the chemical scope is one global control rather than per-feature; and the RP bonus counts toward **both** depths rather than the full one alone. Original item: **Depth system Phase 1** — implement the 5-tier trance depth gate (Drifting 0–19 / Yielding 20–39 / Entranced 40–59 / Deep 60–79 / Blank 80+). See the full design in *Trance Depth as the Feature Gate*. Minimum viable slice: tier detection from roll outcome, features gated by `depthFull` vs `depthEarned`, chemical floor per-feature dropdown (Both / Arousal only / Drugs only / Neither). Per-feature UI selectors can follow in a later pass.

4. ~~**OOC filtering**~~ — **done v0.43.0.** `stripOOC()` in voice.ts, applied once in main.ts so suggestions, triggers, trust accrual and the RP counter all see the same in-character text. Strips SPANS rather than only whole-line asides, so "Missy you cannot move (back in 5)" still lands while the aside is discarded; an unclosed `(` is treated as running to end of line, because people do not close them. `test/ooc.mjs`.

5. ~~**Session state recovery after disconnect**~~ — **done v0.44.0** (`recovery.ts`). DW's rules: under 5 minutes with the hypnotist present or returning, resume where it left off; over 5 minutes, the trance breaks; a fired trigger with time left serves out its **remainder** regardless, because a trigger was never session state to begin with; and *Release everything if you disconnect* opts out of all of it.

   **The bug it actually fixed was the opposite of the one described.** State was not simply lost. The local half of a trance (speech block, screen fade, suppression, numbness, self-touch blocks, the session itself) dies with the page — but `Freeze`, `BlockWardrobe` and `DenialMode` ride on the Emoticon item in `Player.Appearance`, which is **server-side and comes back on reload**. So a reconnecting subject was still frozen and still wardrobe-blocked, with no session, no timers and nothing that knew why. Only the safeword got them out, and a subject who does not know that is simply stuck. `hasOrphanedEffects()` now runs on every load even when nothing was saved, because that case needs no disconnect to happen — a crash is enough.

   Stored in its **own per-account `localStorage` key**, not in `ExtensionSettings` as this list proposed. The doc's own *Per-Account Storage Risk* note says anything new written near `Player.ExtensionSettings` is a red flag, and this changes many times per session; a disconnect is also a this-device event, so device-local is the honest scope, and it keeps a chatty write off the server.

   **Everything restorable is restored** (v0.45.0, DW's call — *"all the states restored unless they are not possible"*). The first cut left four things out: the clothing illusion, carried suggestions, our own BC effects, and a suggested pose. All are back.

   The illusion rebuilds the **original** frozen garments from their stored group/name identities via `AssetGet`, rather than re-freezing. Re-freezing would snapshot whatever is worn at that moment — the truth — which is the same trap `carry.ts` documents for waking, and would quietly turn the illusion into a lie about nothing. The only genuine impossibility left is an asset a BC release has removed; there the subject is told rather than shown something other than what was frozen.

   Carried suggestions were a **stub** — `restoreCarried` was registered as an empty function with a comment claiming another module handled it, and nothing did. They now return with their carrier and the time they had *left*, which is deliberately unlike `carryThroughWake`: waking is when that clock is meant to start, and reconnecting must never top up how long something holds you.

   **~~Open, and related~~ — CLOSED 2026-09-10, no special handling.** The *hypnotist* vanishing mid-trance is deliberately not handled: the subject stays under until the session timeout, or uses `/hypno safeword` / `/hypno reset`. The five-minute presence check was suggested as machinery that could drive it; that suggestion was declined. See *Control & Reset > The hypnotist vanishing mid-trance* for the reasoning and the accepted risk.
