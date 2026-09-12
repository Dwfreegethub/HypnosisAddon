# BC Hypnosis Add-on — Design Document
*Design notes and decision log — work in progress. Code at v0.63.0.*

**Companion documents.** [`../README.md`](../README.md) is the engineering record: how to build and
test, the stage-by-stage implementation notes, and the BC API traps worth knowing. This file is the
design half — what the thing is meant to be and why. [`feature-summary.md`](feature-summary.md) is
the short player-facing list of what exists.

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
features, then technical notes, then the plan and the open questions. Dated history is in the
Appendix at the end.

> ⚠ **The single most important thing to know before reading.** Feature access is being moved off
> *trust percentage* and onto *trance depth*. Both models are in this document: the trust one
> because it is what the code does today, the depth one because it is what the code is becoming.
> Sections describing the superseded model are marked. See
> [Trance Depth as the Feature Gate](#-design-change-trance-depth-as-the-feature-gate-not-yet-implemented).

| | |
|---|---|
| **New here** | **Orientation for a New Contributor** — the rules, the module map, how to test |
| **What works now** | Current Implementation Status |
| **How trust is earned** | Philosophy · Core Mechanic · What Builds Trust · What Lowers Trust · Gain Curve · Hypnotist's Side |
| **How an induction resolves** | Induction Success Formula · Session Flow |
| **How features are gated** | Trust Percentage & Feature Thresholds *(superseded)* · **Trance Depth as the Feature Gate** |
| **Safety and consent** | Control & Reset · Hard Limits · Meta-Consent Layer · Gamification · Clothing & Bondage Consent |
| **The features themselves** | Feature List · Triggers · Carry-Forward · Perception / Illusion · Word-Level Control |
| **Building it** | Technical Architecture · Prior Art · Development Stages · Player Settings |
| **What to test next** | Needs Testing — as of v0.63.0 |
| **Undecided** | Open Questions |
| **History** | Appendix: Version History |

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
| `effects.ts` | The Emoticon-item technique for injecting BC effects (`Freeze`, `BlockWardrobe`, `DenialMode`) |
| `recovery.ts` | Surviving a disconnect; clearing orphaned effects on every load |
| `remote.ts` | The hypnotist's panel, hooked onto the subject's Information Sheet |
| `menu.ts` | The subject's settings screen — six tabs: Permissions, Trance Defaults, Awareness, Triggers, Depth, Stats |
| `panel.ts` | Shared canvas chrome for the settings and help screens: tab geometry, borders, `CONTENT_LEFT` |
| `help.ts` | The help screen, generated *from* the pattern library and command table so it cannot fall behind them |
| `commands.ts` | Every `/hypno` subcommand, plus `/bot` |
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
channel because a silenced subject cannot speak in the room. See *Test Harness — the eight
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

**Permissions (subject's Preferences screen, all off by default).** These are consent flags — "do I allow someone else to do this to me" — not self-triggers: Hypnosis Enabled (master), Movement Restriction, Clothing Restriction, Posture Control, Speech Restriction, Self-Touch Control, Arousal & Orgasm, Clothing Illusion, plus "Lock settings while in trance". Unchecking one mid-effect releases it immediately — **except `arousalControl` and `illusionControl`, which is a bug, not a design** (see the todo).

A second tab holds the **trance defaults** — cannot move / cannot speak / screen fade, all ON by default, plus *Clothes Look Unchanged* (off, deliberately: the other three are things you feel, this one makes your own screen tell you something untrue) and *Others See Your Reactions* (on). A third holds **awareness** (what you can be made not to notice), a fourth **triggers** (planting, carry-forward, firing your own, showing the words, scope, duration), and a fifth is read-only **stats**. A **"?" button on both this screen and the remote panel** opens a five-tab help screen generated from the pattern library and command list themselves, so it cannot fall behind them.

**The session loop.** *Attempt Hypnosis* → the subject gets a private prompt (Agree / Ignore / Fight — **the hypnotist is never told which**, by construction rather than by agreement; no answer in 60s counts as Ignore) → a 60-second induction window for actual roleplay → a **chance-based roll**: `clamp(access + choiceModifier + experienceEffect + rpBonus, 5, 95)` read literally as a percentage, where `access = max(trust, min(arousal, 30))` and `rpBonus` is up to +15 for actually roleplaying the induction. Success fixes the trance depth at entry; failure shows the hypnotist only a vague band ("slightly relaxed", "almost under"), never a number. Three attempts, then a 10-minute cooldown.

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

> **Related:** decay is built (v0.36.0) — see the Appendix. Trigger decay is a *separate* clock;
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

Per-attempt chance (and per session, across the 3 permitted attempts):

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

> **Sequencing constraint — decay must ship first, and it now has (v0.60.0).** This toggle
> reverses a rule stated flatly in `depth.ts`: *"It is not a player setting; a subject who turns
> their chemical scope up cannot thereby let an aroused stranger plant a trigger."* The only
> thing that makes reversing it safe is the faster decay, so the toggle could not have shipped
> before the decay system existed. With v0.60.0 built, the remaining work is: flip `earnedOnly`
> from a constant to a per-feature setting, add the UI, **and rewrite that comment in `depth.ts`
> in the same commit** — a comment that contradicts the code is worse than no comment.
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

A setup wizard runs on first launch (and can be re-run from settings) to generate a sensible starting config. The wizard does not lock anything — it just fills in defaults that would otherwise be all-off.

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
- Maximum attempts allowed before a cooldown kicks in (player-set)
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
> shipped as a player setting in v0.40.0 (Appendix); the unbuilt *visibility levels* below are a
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
| Hypnotic induction | Trigger word puts the subject directly into trance |
| Arousal increase | **Built v0.27.0** — four named levels, driving BC's own `ActivitySetArousal` |
| Instant orgasm | **Built v0.27.0** — `ActivityOrgasmPrepare` + `ActivityOrgasmStart`, skipping BC's resist window |
| Block orgasm | **Built v0.27.0** — BC's own `DenialMode` effect, so it also stops vibrators and activities |
| Can't touch body part | **Built v0.12.0** — hooks `ActivityRun`, so the activity genuinely never happens (no arousal, no message). Self-touch only, structurally |
| Can ONLY touch body part | *Inverse restriction (not yet built)* — same `ActivityRun` hook but logic reversed: all body parts blocked except the specified one(s). More complex because the allow-list must survive across activity types. |
| Freeze / Full lock | **Built** — the `Freeze` effect |
| Rooted | Can't exit/move, arms still free |
| Follow | Compulsion to follow the trigger speaker |
| Remove clothing item | Gradual or immediate, per consent settings |
| Custom text response | Subject speaks a specific phrase (auto-spoken by the add-on) |
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
- **Remote panel: the eight missing toggles + live state sync.** The panel has Session, Movement, Clothing and Kneel/Stand; speech, self-touch, and the three awareness categories exist only as speech. Eight binary toggles would fit in two columns of four under the session button without paging.

  **The work is the sync, not the buttons.** The three existing feature buttons know whether to read "Apply" or "Release" because their state comes from *synced* character data — `HasEffect("Freeze")`, `HasEffect("BlockWardrobe")`, `IsKneeling()`. None of the new ones are synced: speech blocking, self-touch blocks and suppression are all local state in our own modules, invisible to the viewer's client. So this needs `state-response` extended to carry live state alongside permissions, *and* the subject pushing an update whenever any of it changes — a one-shot query at panel-open goes stale the moment anything toggles. Same class of work as the original gray-out feature.

  **Worth doing for the gray-out, not the clicking:** a disabled button says "they haven't permitted that", which speech can never do — right now you find out by saying something and watching nothing happen.

  **Body parts deliberately excluded:** 26 of them, so flat buttons are out and it would need a picker sub-screen. Speech is genuinely the better interface for a parameterised command.
- Widen the suggestion pattern library as gaps turn up in play
- **Hypnotist global skill in the induction roll.** ~~Needs a design answer before code.~~ **Answered 2026-09-09: the "declared and visible" model** — the hypnotist's client sends a derived 0–100 value, the subject's client alone decides whether to honour it and how far, via a four-rung setting. Subject-authority holds literally rather than by exception. Full working in [`declared-skill-proposal.md`](declared-skill-proposal.md), pending review before it is folded in here.
- **The Fight-never-worse-than-Ignore invariant.** Below an honoured skill of 50 the proposed skill formula gives a fighting subject *worse* odds than one who ignores — `Fight = max(5 + 0.25v, …)` overtakes `Ignore = max(5, 0.35v)` whenever `v < 50`. Nonsense on its face and easy to find in play. Fix by computing Ignore first and using it as a hard upper bound on Fight, expressed as an invariant so it survives retuning, with a swept test assertion. **Blocks the skill ladder.** Found 2026-09-09 while pricing the rung-3 cap.
- **First-launch guidance and the starter-set button.** Every permission ships `false`, `hypnoEnabled` included, so a fresh install does nothing at all and a new user cannot distinguish broken from off. Not the wizard — a note plus one button offering five session-scoped permissions, on the line `earnedOnly` already draws: nothing that outlives the session, nothing that lies to the subject about their own body. Set and reasoning in [`declared-skill-proposal.md`](declared-skill-proposal.md) §9.
- **`MAX_ATTEMPTS` never got its decided value.** This list already records *"decided: default 2, with 3 available as a player setting"*; the code has 3 and no setting. A dropped implementation, not an open question.
- **Dual fatigue system — promoted, and it now blocks something.** Both counters (subject resistance fatigue, hypnotist fatigue) are designed in *Dual Fatigue System* above and **entirely unbuilt** — `grep -ri fatigue src/` returns nothing.

  **Dependency, settled 2026-09-09: build fatigue BEFORE the skill ladder's fourth rung.** That rung lets a skilled hypnotist overpower a subject's Fight, and DW's justification for it being survivable is that the subject wears down across repeated attempts. That mechanic does not exist. Worse, the one term that *does* move across a session runs the other way: subject experience accrues on every attempt win or lose (`ATTEMPT_EXPERIENCE`), and under the single-pool model it is negative when the choice is Fight — so today each failed attempt makes the subject fractionally *better* at resisting. The magnitude is a rounding error (~0.7 on the roll across three attempts), but the sign is the opposite of the assumption, and fatigue will be fighting this term rather than joining it. Rungs 1–3 do not depend on fatigue and may ship first.
- ~~**Trust decay**~~ — done in v0.36.0. Subtraction from the interaction count, lazily on read, as named speeds rather than a number. **Off by default**; the residual question is whether it should ship on, which only play can answer.
- ~~**`STRANGER_CEILING` (30) should be a player setting**~~ — **decided: 30 is the default, adjustable as a player setting.** Range TBD but 0–100 with the trust floor logic capping effective reach.
- **Arousal on the remote panel.** The six arousal actions exist only as speech; folds into the remote-panel item below rather than being separate work.
- ~~Revisit `MAX_ATTEMPTS`~~ — **decided: default 2, with 3 available as a player setting.**
- Revisit flavor-text wording (DW: "not sure if I like the wording") — one real pass done in v0.34.0 (apply vs attempt), never re-reviewed whole
- ~~**Decide whether decay ships ON.**~~ **Decided: Never is the right default.** Wizard will offer the setting at setup. No change to current behavior.
- ~~**RP reward for engaging during the induction window.**~~ **Built v0.41.0** as `rpBonus`: +5/line, cap +15, session-only, resets per attempt.
- **Relationship floors must move from access to DEPTH when the redesign lands.** Settled 2026-08-31 — friend none, lover Entranced, owner Deep, Fight forfeits it. The current trust-floor form cannot express "a lover always reaches arousal", because a lover's chance ceiling sits below the tier. See the redesign section.
- **The lover tier does nothing today.** `accessFor(id, "arousal")` has no consumer; arousal suggestions gate on their permission alone. Deliberately left for the depth redesign to close rather than patched in the trust model — see the reach-matrix warning in the v0.36.0 notes.
- **`arousalControl` and `illusionControl` do not release on revoke.** The rule everywhere else is that unchecking a permission frees the effect immediately, and `menu.ts`'s `onToggle` has no case for either — so unchecking *Arousal & Orgasm* leaves `DenialMode` applied and unchecking *Clothing Illusion* leaves the illusion running. v0.39.0 added the `arousalControl` case for numbness only. Small, and a consent rule rather than a nicety.
- **Widen release wording as gaps turn up, not just restriction wording.** v0.38.2 found four natural illusion releases matching nothing while the restriction side was fine. Restrictions get exercised constantly in play and releases only once each, so the release half of every pair is where the gaps hide.
- ~~**Per-feature trust thresholds are still only three.**~~ **Superseded by the depth redesign.** `Suggestion.trustThreshold` exists and works, and the three gates that use it all sit at 65 — but the doc's full percentage table is not what gets wired up now. Under the redesign each feature carries a **depth tier** plus the one `depthEarned`/`depthFull` boolean, so this stopped being data entry and went back to being part of the depth work.
- ~~**Decide whether `/hypno triggers full` ships.**~~ **Done in v0.40.0.** Room-admin idea dropped — admin is a chat-room property and a subject can make their own room. `full` is now gated on a `TESTING_MODE` build flag and disappears at release; visibility ships as a player setting instead. **Release step: flip `TESTING_MODE` in `log.ts`.**
- **Public/private review as new flavor is added.** Every new flavor key is private unless it is given a public variant, so the safe default is silence — but a genuinely observable effect that nobody remembers to give a public line will simply be invisible to the room. Worth a pass whenever a batch of new effects lands.
- ~~Decide what, if anything, the **Hidden Activities** toggle should gate~~ — removed in v0.14.0 and replaced by "Lock settings while in trance".
- ~~**H icon detection**~~ — done in v0.35.0, as a 3-second probe. The icon deliberately still appears for everyone: hiding it would turn the Information Sheet into a directory of who has the add-on installed.
- **Command authority** — by default only the hypnotist who established the session can issue commands to the subject. Add a hypnotist command to expand control to additional players ("allow [name] to command you"), revocable at any time. Ties into the permission hierarchy / Architect role already on the list.
- **Body part protection (others touching you)** — self-touch is done (`ActivityRun` hook). Blocking others from touching you needs a different approach since `ActivityRun` executes on the actor's client, not the subject's. Research needed.
- **Carry touch restrictions to nearby people (planned)** — extend the body-part block and body-part-only (inverse) restrictions so they apply to *other players* touching the subject, not just self-touch. Under the subject-authoritative model this is harder: the activity runs on the toucher's client, so enforcement needs either a message-back mechanism (subject client notices and emits a correction) or cooperation from a shared signal. Complexity note: blocking others' activities without their add-on installed may require a different approach than the hook used for self-touch.
- ~~**BC relationship → trust floor**~~ — done in v0.36.0 as friend 15 / lover 30 / owner 65, each with a REACH as well as a number (see the version notes). ~~**Architect status tied to ownership**~~ — **decided: not automatic.** Wizard asks owner/lovers if they want to set it up. Strangers reach it via trust threshold + request/accept flow. One architect at a time. Subject always holds reset.
- **Persona / alter ego** — "when you hear X, you become [name/personality]." Mostly RP, but add-on can nudge: if the alter ego is defined as wearing little clothing, add-on resists attempts to get fully dressed while the persona is active. Add to trigger effects.
- **Custom phrase localization** — let subjects replace built-in flavor text and suggestion patterns with their own wording. Stored as a small `effect_id → custom phrase` map in ExtensionSettings (minimal storage impact after LZString compression). Two layers: flavor text (what the subject sees when an effect fires — subject-side only, simple substitution) and suggestion aliases (what the hypnotist says to trigger it — harder, requires exposing the subject's aliases to the hypnotist via help screen or OOC). Primary use case: players for whom English is not their first language, and players who want more personal or thematic phrasing. Ship flavor text first; aliases as a later extension.
- **Phantom sensation** — feeling touch that isn't there, or not feeling touch that is. Separate category from clothing illusion. Excellent trigger effect: warmth, numbness, phantom touch on specific body parts. Many implementation paths — explore.
- **Compelled self-touch + block combination** — "touch yourself whenever arousal drops below X" AND "you cannot touch yourself on your own." Both halves are already built separately; needs a combined trigger or conditional.
- **Fractionation** — waking and re-inducing repeatedly, each time going deeper. As a named mechanic: if re-induction follows a wake within a short window, the roll gets a bonus (subject still partway primed, rapport warm). Currently no mechanic distinguishes first from second induction.
- **Anchoring** *(maybe)* — physical gesture re-triggers trance, separate from verbal triggers. Could tie to existing induction with a trust/depth advantage for using it.
- **Resistance fatigue** — the more someone fights off inductions, the more tired they get, making future attempts easier. Currently resistance is stateless. Review when developing trust/experience further.
- **Suggestion stacking / conditionals** — "if X then Y, if Y then Z." Chains of triggers. Body part blocks already stack naturally; review for formal support.
- **Honesty / amnesia** — compulsive truth-telling and targeted forgetting. RP-prompt features only (no way to enforce mechanically), but the add-on can emit a hint visible only to the subject reminding them to RP accordingly.
- **Waking trance** — **decided: build it.** Subject is ambulatory but still under — screen tint drops to ~5–10% opacity (near-invisible) vs the full-trance 30%, movement restriction lifts, suggestions continue to parse and fire. Effects that require deep stillness (full freeze, etc.) do not fire in walking trance; lighter effects do. Vocal commands: *"Walk with me"* / *"Stay with me as you move"* → enters walking trance; *"Stop"* / *"Be still"* / *"Stay"* → re-applies movement lock and returns to full trance. Subject-authoritative: subject knows they are still under even if they appear conscious to others.
- ~~**Safe signal while silenced**~~ — resolved. Speech blocking hooks `ChatRoomSendChatMessage`, which runs *after* command parsing and after the emote and whisper branches, so a silenced subject keeps `/hypno` commands, emotes and whispers; only ordinary room speech goes. Documented in the help screen's Lasting tab (v0.32.0). The residual case is a fired trigger with the duration set to **0**, where the safeword is the only self-serve exit — DW's deliberate call.
- **Session log** — record of what was suggested, what stuck, and when. Hypnotist-side. TBD.
- **Setup wizard** — first-launch guided config (openness, relationship trust, depth thresholds for sensitive features, chemical floor scope, safeword, decay rate). Re-runnable from settings. Does not lock anything — just fills sensible defaults.
- **Depth system implementation** — implement the 5-tier depth gate (Drifting/Yielding/Entranced/Deep/Blank), per-feature depth selectors in settings UI, chemical floor per-feature dropdown (Both/Arousal/Drugs/Neither), fractionation bonus, dual fatigue counters. See design change section above.
- **Trigger discovery (probe mechanic)** — depth-gated involuntary reveal during a session. Trigger word never spoken aloud; effect and vague hints surface based on depth tier.
- **Trigger removal by another hypnotist** — depth comparison check: must match or exceed the depth at which the trigger was planted. Override (replace) requires one tier higher.
- ~~**Trigger aging for the harness**~~ — **built v0.63.0.** `/hypno agetrigger [days] [number]` plus a `test-age` hidden handler and `!age` on the bot, all `TESTING_MODE`-only and all gone at release, same shape as `/hypno trance`/`test-trance`. Backdates `reinforcedAt` and nothing else — the firing credit is left alone deliberately, since it is one of the things the scenario is checking. Both arguments optional — bare, it ages every planted trigger by one day (DW's call, 2026-09-12). Relative, so `1` twice is two days; negative winds it forward; triggers are named by their number in `/hypno triggers`, not by phrase, so the hidden-phrase rule survives it. This unblocks scenario 8 in *Needs Testing*, which still owes its live run.
- ~~**Trigger reinforcement and decay**~~ — **built v0.60.0**, retuned v0.62.0. Formal re-induction resets the clock; firing credits capped time only; rate is separate from trust decay and defaults to Never.
- **Make `earnedOnly` a per-feature player setting** — the toggle decided on 2026-09-08, letting a subject allow chemical depth to reach illusion, triggers or carry-forward. Its safeguard is the faster decay, which now exists, so this is unblocked. Three parts: turn `earnedOnly` from a constant in `DEPTH_GATES` into a stored per-feature setting, add the toggle beside each Depth-tab row, and **rewrite the comment in `depth.ts` that currently states the opposite rule**. Carry-forward has no decay clock yet, so its half of the toggle waits for one.
- **Extreme subject level** — opt-in lock: trigger removal requires Blank or architect, settings gated, decay disabled, visibility defaults to Restricted, time gate prevents downgrading for configured period. Wizard-configured. **Extended 2026-09-09** with two further intentions from DW — no access to the advanced stats view, and the safeword *possibly* restricted — which turn this from a settings preset into a design area with a real safety question in it. Open questions and the exits that must survive regardless are worked through in [`declared-skill-proposal.md`](declared-skill-proposal.md) §8. Nothing here is specced yet.

### Added 2026-09-12 (v0.63.0) — the decay scenario is unblocked

**v0.63.0 — trigger aging, so decay can be looked at.** The one thing standing between the v0.60.0
decay model and a live run was time: strength is derived from `reinforcedAt`, and four of the
scenario's five expected results are a day or more apart. Turning the rate up does not help, because
a rate fast enough to sit through is too coarse to see the tier discount in.

`/hypno agetrigger [days] [number]` moves the clock instead of waiting on it, with `test-age` behind
it for the bot and `!age` on the bot side. Three decisions worth recording, because each of them
could have gone the other way and made the tool quietly useless:

- **It moves the clock and nothing else.** `firings` is untouched. Clearing it would have been
  tidier and would have made *"firing slows decay but never resets it"* pass against an
  implementation with the rule backwards — a step that cannot fail is not testing anything.
- **Relative, not absolute.** Each call subtracts from what the clock already reads, so the two
  readings the acceleration check needs come from *age a day, look, age another day* rather than
  from arithmetic done in someone's head.
- **By number, not by phrase.** The phrase is hidden from the subject unless they asked to see it,
  and the report names triggers the way `/hypno forgettrigger` does. A testing affordance must not
  be the hole in a privacy rule.
- **Both arguments optional**, DW 2026-09-12 — a bare `/hypno agetrigger` is one day across every
  planted trigger. The first draft printed usage instead, which is the wrong trade for a command
  whose whole job is to be run repeatedly by somebody who may be frozen or silenced at the time.
  Safe to let the bare form write because it is exactly reversible, and the result line now names
  the `-1` that reverses it rather than leaving it to be worked out.

It also does not prune. A trigger aged past zero reads *"faded away"* and disappears on the next
list read, which is where pruning belongs and is itself part 4 of the scenario demonstrating itself.

---

## Known Bugs

Observed in play but not yet traced to a root cause. Add date and any reproduction details when logging.

| # | Bug | Observed | Notes |
|---|-----|----------|-------|
| ~~1~~ | ~~**Session starts with clothing awareness already suppressed**~~ — **closed.** Confirmed fixed in testing (v0.57.0): fresh load, start session, `/hypno effects` before any suggestion — all three awareness lines off. Root cause was orphaned state surviving between sessions; cleared by v0.44.0–v0.44.1 fixes. | 2026-09-01 | Fixed v0.44.0–v0.44.1. Confirmed clean in testing 2026-09-07. |
| ~~2~~ | ~~**Our own freeze blocked undressing and blamed a nonexistent lock**~~ — undressing was refused with a lock message when nothing was locked. **Root cause (corrected):** there was no freeze check to run early. BC's own `IsRestrained()` returns true for `HasEffect("Freeze")`, `CanChangeClothesOn()` is built on it, and our guard reported every failure of that call as `"locked"`. The freeze usually responsible is not a suggestion at all — it is the **trance baseline**, which freezes the subject the moment they go under. Fixed v0.55.0 by giving freeze its own refusal (`"frozen"`) and its own flavor line, checked before the lock branch. | 2026-09-07 | Found by the undress scenario. The false reason was the bug; the refusal itself was correct. |
| ~~3~~ | ~~**The hard floor stripped every effect and left the session running**~~ — unticking *Hypnosis Enabled* cleared eight effects one at a time and never touched `session.phase`. The subject was left in a trance with nothing applied: the hypnotist still had a live session, spoken suggestions still parsed and re-applied, and `/hypno effects` reported a session the player had just switched off. Fixed v0.58.0 — `hardFloorStop()`, shared with the safeword so the two can no longer disagree about what stopping means. | 2026-09-08 | **Not** found by scenario 8, which passed — it only asked whether the effects came off. Found when scenario 1 would not start afterwards, refusing an induction with "Already under." Four assertions in `test/revoke.mjs`, verified failing (12/16) against the previous build; the scenario was rewritten to ask `/hypno session` and re-confirmed in play the same day. |
| ~~4~~ | ~~**`/hypno reset confirm` does not stop an in-flight trance**~~ — **fixed v0.63.1**, as decided 2026-09-10; the note directly below this table carries the decision and the pressure-test that produced it. `resetSettings()` now runs the same `totalStop()` teardown the safeword and the hard floor use, before it wipes, and reports the release ahead of the wipe. Fourteen assertions in `test/revoke.mjs`, ten of them verified failing (20/30) against the previous build. **Confirmed in play 2026-09-12** by DW, on the v0.64.0 combined build: forced trance, the warning named the trance, `reset confirm` released immediately and reported the release first, `/hypno session` read Idle, and a tab reload brought nothing back. That last step is the one the unit suite could never reach. Original report: `resetSettings()` replaces the settings object and saves — that is all. It does not call `hardFloorStop()`, does not touch the module-level session state or its timers, does not remove the Emoticon effects, and does not clear the recovery key (which lives in its own `localStorage` entry, so wiping `ExtensionSettings` cannot reach it). After a reset mid-trance the subject is still frozen and still under, with `hypnoEnabled` now reading false. Same class as Bug #3 and the same fix: delegate to `hardFloorStop()`, and clear the recovery key. Found by code inspection 2026-09-09 while checking whether "reset the add-on" is a sufficient exit for extreme mode. **Not yet observed in play — no repro has been run.** | 2026-09-09 | Matters more than it looks: reset is one of two exits DW has proposed as sufficient in extreme mode. The other — logging in with the *userscript* disabled — is worse, since a script that is not running cannot clear the server-side effects that come back on reload. See `declared-skill-proposal.md` §8. |

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

> **One caveat on those assertions, and it is not specific to this fix.** `revoke.mjs` cannot pass
> against a `TESTING_MODE: false` build: it stands a trance up with `forceTrance()`, which a release
> build correctly refuses. Measured at **25/30** with the flag off. Two of the fourteen fail loudly,
> which is fine — but nine of the rest then pass without testing anything, because there was never a
> trance for reset to end, and that is rule 6. This predates the fix (the first `forceTrance` check
> does the same) and it is shared with the trigger-ageing work, so it is filed here rather than
> patched here. It must be settled before `TESTING_MODE` is flipped, not after.


---

## Open Questions

> **Related:** settled questions are struck through here and explained in the Appendix. Live work
> items are in *Development Stages > Todo*, which is the list to read first.

- Global skill vs per-subject familiarity — interaction mechanics
- **Skill weighting in the induction roll** — must satisfy "a new player has little chance of resisting a very experienced hypnotist" without letting skill leak into the absolute-refusal cases (AFK-block, OOC hard no). See "Two kinds of no."
- ~~**OOC "Genuine resistance" vs. the contested roll**~~ — **Settled.** AFK-block = hard block with flavor message. Active Fight + "Genuine resistance" = steep but possible — very heavy negative modifier, not an absolute wall. Since players can toggle "Genuine resistance" on and off, the setting is a difficulty dial, not a lock.
- Trigger reinforcement — how often, how much decay per day (LSCG's logarithmic-every-10-minutes is a reasonable starting reference, not necessarily our final formula)
- ~~Trigger word visibility~~ — **built v0.40.0.** Hidden by default, with *Show trigger words when you list them* on the Triggers tab. `/hypno triggers full` is a testing override that disappears when `TESTING_MODE` is flipped. The unbuilt *visibility levels* (blanked word / blur / blackout) are a separate, larger feature — see *Triggers*.
- **Induction trigger (spoken word → attempt)** — a special trigger type that, when heard, initiates a trance *attempt* rather than instant trance: goes through the normal attempt flow, subject gets the option to fight by default. No LSCG-style auto-drop. To be decided: is this an opt-in trigger type players can configure, or a separate feature? Does the subject see the attempt coming or is it framed as a sudden pull?
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
pointers after it drifted in a day. Decay still owes its live run. Code at v0.63.0.*

*Updated 2026-09-12 — Known Bug #4 fixed in v0.63.1: reset now runs the shared teardown before it
wipes. Confirmed in play by DW the same day, reload included, so item 9 of Needs Testing is closed.*

## Appendix: Version History

Dated notes on what shipped and, more usefully, *why* — the reasoning that did not fit in a
commit message. The README carries the same versions from the engineering side (hooks, BC API
traps, what broke); this half is the design half.

### Added 2026-08-29 (v0.10.0 – v0.13.1)

**Trance state defaults.** Going under now automatically applies *cannot move*, *cannot speak* and a *screen fade*, per the doc's "Default Hypnosis State Effects" table. All three on by default and individually toggleable. Speech blocking hooks `ChatRoomSendChatMessage`, which sits after command parsing and after the emote and whisper branches — so a silenced player keeps `/hypno safeword`, emotes, and whispers as an OOC lifeline, losing only ordinary room speech. The veil hooks `DrawProcess` and paints after it, white at 30%.

**Message suppression, with arousal preserved.** "You notice nothing that happens to you" (clothing + bondage + touch) and the narrower "you will ignore my touches". The constraint that arousal must still apply is what shaped it: suppressing in our own `ChatRoomMessage` hook would have killed arousal too, so this registers into BC's own handler chain at priority 320 — after Arousal Processing (210) and BC's own hiders (300, 310), before Push-message-to-chat (500). Categories separate via `Asset.IsRestraint`, so a rope and a dress classify correctly without maintaining a group-name list.

**Self-touch restrictions.** Freeze now covers reaching for yourself, and named body parts can be blocked ("you cannot touch your breasts"), plus "you cannot touch yourself" for the lot. This hooks `ActivityRun` instead, and the difference is deliberate: `ActivityRun` applies arousal, runs the self-effect and sends the message, so not calling it means the activity genuinely never happens — the opposite of suppression, where everything happens and only the message is hidden. Scope is self-touch only, structurally: `ActivityRun` executes on the actor's own client.

**Spoken wake-up keyword** ("wake up", "you are awake", "come back to me", "awaken"). Ungated by permission — ending a trance is always allowed — and works from any live phase, so it cancels a running induction rather than being ignored.

**Tabbed settings screen.** Three tabs — Permissions (7), Trance Defaults (3), Awareness (3) — replacing three groups crammed into two columns. The previous layout is tagged `menu-checkbox-layout` in git.

**Testing discipline that's earning its keep:** the pattern library is exercised by a ~135-case suite covering phrasings, false-positive probes and cross-suggestion collisions. It has caught six real bugs before they shipped, including bare "stand" never matching at all, and `awareness-release` swallowing "you are awake again" — which would have made the wake keyword merely restore awareness while leaving the subject under.

**⚠ One thing to restore before real play:** `INDUCTION_WINDOW_MS` in `session.ts` is set to 10 seconds as a testing value. Normal is 60_000. Ten seconds is far too short to actually roleplay an induction, which is the entire point of that window. Marked in-code. *(The second item that used to sit here — the chance-based roll being proposed rather than implemented — shipped in v0.15.0.)*

---

### Added 2026-08-29 (v0.14.0 – v0.27.1)

**The trust engine (v0.15.0–v0.18.0).** Everything Stage 6 asked for except decay and hypnotist skill. The shape that matters: **store the interaction count, derive the value**, `trust = 100n/(n+H)` with `H = 25`. Retuning `H` therefore reprices every stored relationship instead of corrupting it, which is not true of storing the score. One conversation is worth 1 interaction (rate-limited to one per 5 minutes, doubled when the line is addressed to you by name); a successful induction is worth 5. Experience is a **single pool** whose sign follows the choice — practice with hypnosis is one skill, and cooperating or resisting is what you do with it.

**The induction roll became a chance, not a threshold (v0.15.0).** `clamp(access + choiceModifier + experienceEffect, 5, 95)`, read literally as a percentage, with depth falling out of the same roll (`chance - roll`), so a comfortable success goes deep and a squeaker leaves a trance the subject can pull themselves out of. The 5/95 clamps mean nothing is ever certain in either direction.

**Arousal as a chemical floor (v0.18.0).** `access = max(trust, min(arousal, 30))`, read off the player's own `ArousalSettings.Progress` on their own client — correct *and* convenient, since the roll already runs there and nothing has to be synced or trusted. A floor rather than a multiplier, exactly as this doc argues: a multiplier on zero trust is still zero, which would give a stranger nothing, and a stranger is the one case the mechanic exists for.

**Persistent triggers (v0.20.0–v0.25.0).** Planted by speaking during a trance — "your trigger word is X", then the suggestions, then "remember trigger" — and fired afterwards, outside any session, which is the whole point. Gated on its own permission *and* trust 65, with arousal explicitly not counting toward that gate (this doc's rule that the chemical floor never reaches persistent features). Each action re-checks its own permission **at firing time**, so revoking a permission disarms that part of every trigger already planted. Also: the phrase is hidden from the subject (they can't decide not to react to a word they can read), setup lines can be hidden entirely, scope mirrors BC's own permission ladder (hypnotist / owner / lovers / whitelist / dominants / not-blacklisted / everyone), and each firing wears off after a configurable duration (default 5 min).

**Arousal & orgasm suggestions (v0.27.0).** Four levels — not / lightly / highly / fully aroused — plus forced orgasm and denied orgasm, all under one permission. The levels land on bands BC already has expressions for; "fully aroused" is 95 because that is what BC itself sets an edged character to. Forced orgasm delegates the *decision* to `ActivityOrgasmPrepare`, so a chastity item or our own denial silently wins without the add-on knowing the rules. Denial uses BC's own `DenialMode` effect, so it applies to vibrators and activities too, not just to us.

**The Agree / Ignore / Fight prompt became a box (v0.26.0).** The chat commands remain, because the box only exists on the chat room screen — a player in the wardrobe when the attempt lands sees no box, and the commands are the only thing that reaches them.

**Data (v0.16.0–v0.17.0).** A read-only Stats tab, export / import / reset — and a real data-integrity fix: `localStorage` is per-**origin**, so a single fixed backup key meant two characters on one browser shared one set of trust and stats. Keyed per account now, and saving refuses outright until the member number is known rather than writing to the wrong place.

---

### Added 2026-08-30 (v0.28.0 – v0.30.0)

**Clothing illusion (v0.28.0 — illusion.ts).** Freeze-frames the subject's own screen to show the clothes they had on when the illusion took hold, while the room sees the truth. Critical rule: never touch `Player.Appearance` — that array syncs to the whole room, so lying there produces the exact inverse of the feature. The lie lives in a local-only `SIMPLE` character that nothing syncs; `DrawCharacter` is hooked to pass that shadow through instead of `Player`. Groups frozen are the clothes and worn items (body, face, expressions, hair and Emoticon stay live so the subject still sees their blush and pose change). Trust threshold: **65** (was 70; lowered in v0.37.0 so that the owner floor, also 65, reaches it — the doc's rule is that an owner reaches everything, and 70 left them one rung short by accident), relationship trust only — the chemical/arousal floor never reaches any feature that deceives the subject about their own state. Off by default in trance settings, unlike the other three defaults, because those are things you feel and this one makes your own screen tell you something untrue.

**Suggestions that outlive the trance / carry-forward (v0.28.0 — carry.ts).** "This will stay with you" — said during a trance captures every suggestion that lands afterward, and they are still true after waking. Duration: same as the trigger timeout set in the player's settings. Re-applied after the session's total clear rather than by exempting things from it (so `endSession`'s guarantee that trance can never strand an effect is preserved). Releasing: carrier speaks ordinary release wording outside trance, but only while still holding something. Trust threshold: 65. Per-suggestion trust thresholds (`Suggestion.trustThreshold`) are now implemented — the feature-threshold table in this doc finally has a consumer.

**The wardrobe message is suppressible (v0.29.0).** Correction to the note that used to sit here: it is **not** tied to the clothing illusion, and it never was. It answers to **Awareness > Clothing Changes**, like every other suppression category, so the illusion and the message-hiding have to be switched on separately — the illusion hides the pixels, the Awareness toggle hides the text.

What was actually broken: BC sends **two different** clothing messages, and only one of them was being caught. Changing someone item-by-item through the dialog sends an Action carrying the asset; changing them through the **wardrobe** sends a single `ChangeClothes` Action naming only a source and a destination character, however many garments changed. With no asset and no group in the payload there was nothing to classify by, so it fell straight through to the chat log. Fixed with a short, verified table of Action tags — deliberately short, with safeword, leash and room messages kept off it.

**Carry-forward targets one suggestion (v0.29.0).** Correction: it applies to the suggestion **just given**, not the next one. Order matters in play — give the suggestion first, *then* say it stays:

> "Missy, you cannot tell what you are wearing."
> "Missy, that will stay with you."

Said again after another suggestion, it keeps that one too — it accumulates. `"all of this stays with you"` is the blunt version for when you really do mean everything currently in force.

Both alternatives were tried and rejected, and the reasons are worth keeping. A capture *mode* running forward from the phrase reads backwards: you would have to declare what you are about to do before doing it, which is not how anyone talks. Sweeping up everything in force is the blunt one — by the end of a session the subject is typically frozen, silent, unaware of clothing changes *and* holding an illusion, so one phrase carrying all of it wakes her still unable to move or speak because the hypnotist wanted the illusion to hold.

**Help screen (v0.30.0).** Five tabs reachable from a "?" button on both the settings panel and the remote: Start Here (the full loop, four suggestion gates, every way out), What to Say (the whole spoken vocabulary), Lasting (triggers and carried suggestions), Trust (how access is earned and what each depth costs), Commands (grouped with argument hints).

---

### Added 2026-08-30 (v0.31.0 – v0.34.0)

Four releases of play-testing fallout. Nothing here was planned; every item came from DW hitting it in a room.

**Firing your own trigger is a setting, not an accident of scope (v0.31.0).** DW found they could set off their own trigger — on three of the seven scopes but not the other four, which turned out to be arithmetic rather than a decision. `speakerAllowedByScope` looks the speaker up in `ChatRoomCharacter`, which includes the player, then runs them down a ladder written to answer *which other people may fire this*: `everyone` returns true unconditionally, `notblack` returns true unless you blacklisted yourself, and the dominants rung asks whether your own reputation plus 25 beats your own reputation, which it always does. Meanwhile owner / lovers / whitelist correctly said no, because you are not your own owner.

The ladder now refuses self outright, and **"You can fire your own triggers"** is one checkbox on the Triggers tab, **off by default** — a trigger's whole fiction is that someone else put it there and it fires outside your control. *Releasing* stays self-allowed regardless, through a separate path: undoing can never harm the subject, and a silenced subject cannot speak a release phrase at all.

**You cannot delete the trigger that is holding you (v0.32.0).** `/hypno forgettrigger` now refuses while a trigger is in force, and points at the safeword. Deleting the thing currently gripping you is too quiet an escape: it undermines a trigger being something that happens *to* you, and it lets a subject no-op their way out of a scene rather than saying so. Triggers not currently in force delete exactly as before.

That needed real tracking, and the obvious shortcut was wrong: "has a pending auto-release timer" is not the same as "is holding you", because a duration of **0** means no timer and still applied — precisely the case where someone would most want to delete their way out. There is an explicit marker set alongside the timers now.

`/hypno triggers` gained that state (`** HOLDING YOU NOW **`) and a **provisional** `full` argument that reveals the phrases for testing. Provisional because it defeats the hiding it sits next to — a subject who can read their own trigger word can simply decide not to react to it. **Decide whether it ships.**

**Private messages are bracketed; the room hears what it could see (v0.33.0).** Playing in public made it obvious that the add-on narrates a great deal that only the subject can read, and nothing said so. Two halves:

- Anything only the subject can know is wrapped in `[square brackets]`. Enforced structurally — there is no direct `ChatRoomSendLocal` call anywhere in `src/` outside `notify.ts`.
- Anything the room could actually have observed is **emoted**, so everyone present reads it.

**Emote is the only option for custom text**, which is worth recording because the obvious alternatives look right. `Action` and `Activity` both render as `(text)` — exactly the shape wanted — but both resolve their `Content` as a translation key first, and an unknown key renders as `MISSING TEXT IN "...": <key>` rather than falling back to the literal string. Emote prints what it is given, and is tinted with the sender's own label colour. Sent through BC's own `ChatRoomSendEmote` so the owner rule that can block emotes is honoured.

**Pronouns** come from BC's `Character.GetPronouns()` — never guessed from a name or a body — with they/them for anything unrecognised. The character's **name** is always the subject of the public sentence, which fixes the verb as third-person singular and means they/them needs no second set of phrasings.

New setting: **Trance Defaults > Others See Your Reactions**, on by default. Worth an off switch, since emoting in a public room tells everyone present you are running this and describes fairly intimate behaviour while doing it.

**Applying a restriction stopped sounding like walking into one (v0.34.0).** A trigger placing a self-touch block announced it with the text meant for having reached for yourself and been stopped — nothing had been reached for. Auditing the rest:

| | Apply-time | Attempt-time | |
|---|---|---|---|
| speech | `speech-block` | `speech-blocked-attempt` | already correct |
| self-touch | same key | same key | conflated |
| body part | same text | same text | conflated |
| clothing | text described *reaching* | nothing at all | backwards, and missing |

Separating the two moments settled the public/private question more cleanly than v0.33.0 had drawn it: **placing a restriction is invisible; bumping into one is the visible part.** The public lines moved accordingly. Movement and posture stay visible at apply time because going still and kneeling are visible in themselves.

A **trigger** firing gets a deliberately vague line — *"You feel something close off. You are not sure what yet, and the not-knowing is oddly interesting."* It has to stay vague: a trigger fires with no spoken instruction, so naming the part would hand the subject what the trigger does. Spoken blocks still name the part, since the subject just heard it named.

And `BlockWardrobe` had been refusing in **total silence** — the only restriction where the player clicks a button and gets nothing back at all. `ChatRoomOpenWardrobeScreen` is hooked now, guarded on *our* effect rather than on `CanChangeOwnClothes` alone, since a real locked outfit blocks the wardrobe too and narrating somebody's actual chastity belt as hypnosis would be both wrong and confusing.

---

### Added 2026-08-30 (v0.35.0 – v0.38.2)

**The remote panel says when someone isn't running the add-on (v0.35.0).** The H icon draws on every player's sheet, because there is no way to know who has this without asking. Clicking it on someone who does not sent both queries and then sat on "(checking…)" forever — indistinguishable from a slow reply, a lost message, and a bug, and the first thing a new user would hit. Three seconds with nothing back and the panel says so, with a *Check again* button.

The icon is **deliberately not hidden**, per DW. It could be once a member number has been probed, but that would quietly turn the Information Sheet into a directory of who in the room has the add-on installed. The timeout is a display decision, never a lockout: any reply, however late, brings the panel back on the next frame.

**Trust decay, and BC relationships as a floor under it (v0.36.0).** DW spotted these were one mechanic — without a floor, an owner who goes away for three weeks comes back having to re-earn the right to hypnotise you, while the relationship sat in BC's own data the whole time.

Decay is subtraction from the stored interaction count, exactly as this doc already settled, and needed no storage migration: `lastUpdated` has been on every entry since v0.15.0. Applied **lazily on read** rather than from a timer — nothing to schedule, nothing missed while the game is closed. The catch a timer would not have is that the clock must be advanced when charged, or every later read bills the same elapsed days again.

**The decay shape is the opposite of the intuitive one**, and worth recording because the first attempt at this comment had it backwards. Since `trust = 100n/(n+25)` is steep at the bottom and flat at the top, a fixed number of lost interactions costs an acquaintance far more than an established relationship. A month at "typical":

| Trust before | After a month of no contact |
|---|---|
| 30 | **0** — an acquaintance is simply forgotten |
| 75 | 37 — a real relationship is halved |
| 90 | 87 — a deep one barely notices |

That is the right shape and needs no second curve. It also means the low end reaches zero quickly, which is exactly what the floors are for.

Stored as a **name** (Never / Very slowly / Slowly / Typical / Fast / Very fast) rather than a number, per DW, so the values behind them can be retuned without anyone's saved choice changing meaning — the same reasoning as `triggerScope`. Defaults to **Never**: every existing entry carries a `lastUpdated` from whenever it was last touched, so shipping this switched on would have decayed months of stored trust on first load.

**Relationship floors** are DW's values, and each carries not just a number but a REACH:

| | Session | Arousal | Illusion | Persistent |
|---|:-:|:-:|:-:|:-:|
| Friend (15) | ✓ | | | |
| Lover (30) | ✓ | ✓ | | |
| Owner (65) | ✓ | ✓ | ✓ | ✓ |

> ⚠ **The Arousal column has never worked, and the matrix is superseded rather than fixed.**
>
> Found 2026-08-31 by auditing the code against this table. `accessFor(id, "arousal")` has **no consumer in the product** — the six arousal and orgasm suggestions carry a permission and no trust threshold at all, so a stranger with *Arousal & Orgasm* ticked has exactly a lover's access. `relation.mjs` asserts the function returns 30 for a lover and passes; it tests the function, not the feature. In effect **friend and lover are currently the same tier with different numbers**.
>
> Deliberately **not** fixed in the trust model, because the depth redesign dissolves the reason it existed. Reach is a *category* concept and depth is a *magnitude* one; under depth, a lover gets arousal because their floor puts them at the Entranced tier where arousal sits, not because they hold a key to a category. One mechanism instead of two, and the lover tier stops being decorative. See "Relationship floors become DEPTH floors" above.
>
> **What survives of `AccessCategory` is one boolean per feature** — does chemical contribution count — which is the `depthEarned` / `depthFull` split. The four-way category split does not survive.

Read from BC's own `FriendList`, `IsOwnedByCharacter` and `IsLoverOfCharacter`, highest wins. This introduced `AccessCategory` (session / arousal / deceptive / persistent) and `accessFor()`, which now backs **every** trust gate in the codebase and folds the existing arousal chemical floor into the same `max()` rather than leaving two floors applied in different places.

`/hypno relate [name] <none|friend|lover|owner|clear>` pretends a relationship for testing, since a real owner cannot be arranged on demand, and prints the resulting access in all four categories. `none` masks a real relationship; `clear` drops the pretence.

**Clothing illusion lowered to 65 (v0.37.0).** At 70 an owner cleared the trigger and carry gates and stopped one rung short of the illusion — two numbers disagreeing rather than a decision, and it contradicted the rule the owner floor was set to express. All three gates and the owner floor are now 65, so ownership alone clears every one of them and a lover still clears none.

**Four fixes from the Stats screen (v0.38.0).** All found by DW in one screenshot:

- **Trust with yourself.** The guard only refused when the sender *was* us — but the add-on loads before login, BC echoes your own chat back through the same hook, and in that window `Player.MemberNumber` is undefined, so `sender === undefined` is false and every message you send counts as somebody building trust with you. It now refuses whenever we cannot tell who we are, which is the honest condition. Existing entries are purged on load and filtered out meanwhile.
- **The blurb ran off the canvas.** `DrawText` does not fit and `DrawTextFit` centres, so long tab blurbs simply ran past the panel edge — for some time. New `drawLeftTextFit` shrinks to fit, then clips.
- **The decay dropdown sat on the trust list.** Positioned for a short list that then grew past it.
- **"…and 30 more" is not a list.** DW asked whether a per-person dropdown or a scroll box would be better; it is **paged**, because the ranking *is* the information — who you are closest to and how far ahead of everyone else they are — and a dropdown showing one person at a time throws that away while also being a worse way to find anyone among forty.

**The illusion released only if you said it exactly right (v0.38.2).** DW took the clothes, spoke a release, and Missy still could not see anything had changed. Running the likely phrasings through the matcher found four that matched **nothing at all** — `"look at yourself"`, `"look down at yourself"`, `"you notice your clothes"`, `"you notice you are naked"` — because "again" was mandatory on one pattern and a qualifier on another, ruling out the most natural ways to say it.

The likelier culprit was separate: **"you notice everything again" cleared message suppression and left the illusion running.** The two are separate features by design — one hides messages, the other freezes pixels — but that phrase is the everything-back line, and a subject told they notice everything who still cannot see they are naked has been told something untrue. It now lifts the illusion too.

That makes the broad release undo *more* than the broad block applies, since "you notice nothing" never switches the illusion on. Deliberate, and the same principle that already lets releases skip the permission check: handing something back should always be easier than taking it away.

---

### Added 2026-08-31 (v0.39.0 – v0.41.0)

**"You cannot feel my touch" was hiding the message and letting the arousal land (v0.39.0).** DW asked whether it should block arousal, which turned out to be two suggestions wearing one name. `touch-block` held both *"you will ignore my touches"* and *"you cannot feel my touch"*, and those say different things:

| | Claim | Correct behaviour |
|---|---|---|
| "ignore my touches" | **attention** — it reaches you, you do not attend to it | message hidden, arousal still climbs |
| "you cannot feel my touch" | **sensation** — it does not reach you | arousal skipped, message left alone |

Suppression registers at priority 320, deliberately *after* BC's arousal handler at 210 — which is right for the first and made the second untrue. A subject told she could feel nothing watched her own arousal meter climb, the same class of bug as the illusion surviving "you notice everything again" in v0.38.2.

Now split. Numbness skips BC's arousal handler rather than suppressing the message, using **the third return shape of `ChatRoomMessageRunHandlers`**, verified in the live R131 source: `{skip: fn}` continues the pipeline but skips the later handlers the predicate matches. Returning `true` would have been the obvious move and the wrong one — it takes the display, BC's own sensory-deprivation hiders and the Asylum GGTS tracking with it. Matched on Description because two handlers share Priority 210 and skipping both would lose the kneel stimulation message; install logs a warning if that name ever stops existing upstream.

**Keyed to `arousalControl`, not `suppressActivities`, per DW.** Consenting to "you may hide when I am touched" is not consenting to "my body may be made not to respond". The two compose rather than overlap: ignore and you are not told, numb and nothing happens, both and it may as well not have occurred. Numbness deliberately leaves the chat line visible — she can *see* it happening and feel nothing, which reads better than blindness and keeps the two consents genuinely separate.

**Trigger word visibility settled (v0.40.0).** The earlier "gate it to room admins" idea was dropped by DW: admin is a property of a chat room and this add-on is not one, and a subject can make their own room and be admin of it — so the gate would have sat one room-creation away from no gate at all, for exactly the person it was meant to keep the words from.

Two answers instead, because there were always two questions:

- **The setting** — new *Show trigger words when you list them* on the Triggers tab, **off by default**. This is the shipping answer and matches this doc's existing "hidden by default, with a player setting to show it". Hiding is the interesting default since you cannot decide not to react to a word you have not read, but it is a preference rather than a protection and it is the subject's own to set.
- **`full`** — a testing argument, now gated on a `TESTING_MODE` build flag. When that goes false the argument stops working *and* stops being advertised, so `/hypno triggers` alone becomes the command. It must never become a second setting: an argument anybody can type is not a preference anybody chose. Startup logs the flag so it cannot quietly ship switched on.

What is never optional either way: that a trigger exists, who planted it, what it does, and whether it is holding you now. Only the word is. Private, not secret.

**The roleplay bonus, finally (v0.41.0).** See the induction formula section above for the mechanic. What matters here is the conflation it resolved: **the induction accelerator was never the RP reward**, and reading it as one was producing pressure to raise a number that would have let strangers reach the deepest gates in an hour. The accelerator pays for *finishing* an induction; the RP bonus pays for *performing* one. Both now exist, at 5 and +5/line respectively, and they do different jobs.

---

### Added 2026-09-01 (v0.42.0 – v0.48.0)

Undressing, then the whole of DW's priority list except the depth system, then a long
bug-chase in play that turned out to be the valuable part of the day.

**Undressing (v0.42.0).** The doc's Tier 1 *Remove clothes*: one garment at a time, outermost
first, so saying it again takes the next piece and the pace belongs to the scene. Slots are
SlaveParking's `HANDLER_UNDRESS_ORDER` on DW's pointer — a curated list rather than all 32
`Clothing: true` groups, which would take a subject's earrings off when told to undress.

**The exact inverse of `illusion.ts`, and the two now state each other's rule.** The illusion
must never touch `Player.Appearance` because that array syncs to the whole room; undressing
must, for the same reason. Undressing only the subject can see *is* the illusion, under a
different permission and a higher trust bar.

Order in the suggestion table is load-bearing: the pair sits **after** `clothing-block` so
that "you cannot undress" reads as a restriction rather than an instruction. The suite caught
bare `/undress/` eating `clothing-block`'s own example.

**Priority items 1, 2 and 4 (v0.43.0).** The induction window back to 60s. `arousalControl`
and `illusionControl` releasing on revoke — and writing that test found a third case one level
up and worse: **`hypnoEnabled` off did not clear the illusion or the denial lock either**,
which is the hard floor, the switch someone reaches for when they want everything to stop. And
OOC filtering, which was a real hole rather than a nicety: `normalize()` turns punctuation into
spaces, so `(ooc: brb, you cannot move)` was parsed exactly as if said in character.

**Disconnect recovery (v0.44.0 – v0.48.0).** Item 5, and it took five versions because every
play-test found the next layer of it. The rules are DW's and did not change; what changed
repeatedly was the answer to *what counts as state*.

  1. **v0.44.0** — the window, the hypnotist check, triggers serving their remainder, the
     opt-out. The bug it actually fixed was not the one the list described: state was not
     merely lost. `Freeze`, `BlockWardrobe` and `DenialMode` ride on the Emoticon item in
     `Player.Appearance`, which is **server-side and comes back on reload**, while the session
     that would release them does not — so a reconnecting subject was still frozen with
     nothing that knew why, and only the safeword out. `hasOrphanedEffects()` runs on every
     load for that reason, disconnect or not.
  2. **v0.44.1** — the saved snapshot only refreshed on session *transitions*, and almost
     nothing worth saving is one. Stale in both directions: an effect released after the last
     transition stayed saved as on, and an effect applied after it was never saved at all. A
     5-second heartbeat while anything is in force.
  3. **v0.45.0** — *"all the states restored unless they are not possible"*, so four more:
     the illusion (rebuilt from the **original** garments via `AssetGet`, not re-frozen), our
     BC effects, a suggested pose, and carried suggestions — which had been **a stub that did
     nothing** while claiming another module handled it.
  4. **v0.47.0** — the `applied` tracker, which is what *"that will stay with you"* points at.
     Easy to miss precisely because it holds no effect: losing it strands nothing, it just
     makes the phrase deny a suggestion that was given.
  5. **v0.48.0** — the sharpest one. Carried suggestions and fired triggers exist *specifically
     to outlive a session*, and the save was gated on a session being live, so **waking wiped
     the record of them**. The five-minute window belongs to the trance; durable state carries
     its own clocks and returns regardless of how long the subject was away or whether the
     hypnotist is anywhere near.

**`/hypno effects` (v0.46.0).** DW asked how to see what carried over and there was no answer:
`/hypno session` reports the phase and the permissions, neither of which is what is currently
on you. Generated from the same snapshot the restore reads, so the readout and what would
actually come back cannot drift apart. It reports the **off** states too — "nothing is holding
you" is the answer most worth being able to trust.

It immediately earned itself twice. It exposed that the illusion had been **freezing
EyeShadow** (v0.46.1) — two of BC's 32 `Clothing: true` groups are cosmetics, not garments, and
freezing makeup contradicts the split the module is built on. And its own wording overclaimed
(v0.47.0): *"unaware of clothing"* reads as *cannot see her clothes*, which is the illusion, a
different feature two lines below. Suppression hides the message; the illusion hides the body.

**Room-change persistence, answered.** See that section: DW tested it and the illusion holds
with no flash, because a room change does not reload the page. A page reload is the only case,
and the poll that notices went from 1s to 250ms.

---

## Test Harness — the eight scenarios (**built** — v0.51.0, extended through v0.59.0)

`testbot/bot.mjs` is a standalone Node script that logs into BC as a second account and plays the
hypnotist: it sends the hidden-message protocol, speaks suggestion-phrased lines into the room, and
walks the subject through a scenario a step at a time. The subject's client does all the actual
work; the bot is a protocol-aware message sender that knows what each step is supposed to produce.

**Driving it.** `/bot run <n>` starts a scenario and `/bot next` advances it; `/bot retry`
re-attempts a failed induction; `/bot status`, `/bot rooms` and `/bot trance` are utilities. These
are registered slash commands that travel over the hidden channel rather than room chat — the
scenarios that silence the subject would otherwise make it impossible to reach the next step. `/hypno bot <text>`
is the collision-proof alias — BC's `GetCommands().find()` takes the *first* tag match, so a bare
`/bot` can be shadowed by MBS, UBC or LSCG if one of them ever registers the same tag.

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

### Added 2026-09-12 (v0.63.1) — reset stops what it wipes

**Known Bug #4 closed.** `/hypno reset confirm` wiped the settings and left the trance running: the
subject stayed frozen, the timers kept counting, the Emoticon effects stayed applied and the recovery
key — which lives in its own `localStorage` entry, out of reach of an `ExtensionSettings` wipe —
would have rebuilt the whole session on the next load, with `hypnoEnabled` now reading false. Found
by inspection on 2026-09-09, never observed in play.

The decision this implements was made on 2026-09-10 and is argued at length under the Known Bugs
table: reset **ends the trance itself** rather than refusing and telling her to safeword first. The
short version is that refuse-and-instruct is not dangerous — the pressure-test found no state where
the safeword fails and reset would have saved her — it is just worse, and its worst part is that it
adds a second refusal path that has to be kept correct, which is exactly how #3 happened.

**What went in:** a third entry point onto the one shared `totalStop()`, not a second teardown list.
`stopForReset()` differs from `safeword()` and `hardFloorStop()` only in its wording, and it returns
what it ended so the reply can name it. `storage.ts` imports it directly, which makes storage and
session import each other — a deliberate cycle, taken knowingly after the alternative (a registration
hook) was built and compared, and verified by bundling it, loading the real user script under Node and
running the suites. The full note, including what would break it, is under the Known Bugs table.

**The wording is part of the fix.** *"Trance ended and every effect released. Settings reset to
defaults."* — release first, because that is the half she needs to trust immediately. The unconfirmed
`/hypno reset` now tells her the trance will end too, and offers the gentler option
(`/hypno safeword` keeps the settings) without withholding the stronger one.

**Confirmed in play 2026-09-12**, the same day, by DW on the combined v0.64.0 build — including the
tab reload afterwards, which is the half the unit suite cannot see, since the recovery key lives in
its own `localStorage` entry. Nothing came back.

### Added 2026-09-08 (v0.57.1 – v0.62.0) — the pass finished, reinforcement and decay, vertical tabs

**v0.57.1 — the two gaps in the pass.** Seven scenarios, and neither of the two things most worth
checking: that an induction can be completed end to end by the bot, and that the master switch is a
real hard floor. Both added; the pass is **eight** scenarios now, and the first of the two new ones
immediately found a bug.

**v0.58.0 — the hard floor left the session running.** `onToggle("hypnoEnabled", false)` cleared
eight effects one at a time and never touched `session.phase`. The subject was left in a trance with
nothing applied — the hypnotist still had a live session, spoken suggestions still parsed and
re-applied, and `/hypno effects` reported a session the player had just switched off. Now
`hardFloorStop()`, shared with the safeword via a common `totalStop()`, so the two paths differ only
in the wording each side is told and can no longer disagree about what stopping means. The four new
assertions in `test/revoke.mjs` were verified to fail (12/16) against the previous build before the
fix went in. Recorded as **Known Bug #3**.

**v0.58.1 — `/bot` said nothing on success.** DW reported `/bot run 1` being ignored and it could
not be diagnosed remotely, because a successful send and a dropped one looked identical from the
subject's side. `/bot` now replies with what it sent and to whom — `Sent "run 1" to WinnersDice
(252905) — your hypnotist.` Same lesson as the suggestion refusals four versions earlier, arriving
by a different road.

**v0.59.0 — the induction was working; the step was wrong.** "I did not get the window a second
time, but the hypno worked." `/bot retry` had been sent 20 seconds into a running 60-second window,
and `session-continue` correctly ignores anything that is not an `AttemptFailed` — but it returned
*silently*, so a correct refusal was indistinguishable from a broken command. Step 3 now waits for
the roll to resolve before offering the retry, and both sides refuse out loud.

**v0.60.0 — trigger reinforcement and decay.** The full model is in *Triggers > Trigger
Reinforcement and Decay*. In short: strength is derived on read from `plantedDepth`, `reinforcedAt`,
`firings` and `plantedChemical`, exactly as trust decay works; it is the trigger's effective depth
when it fires, so a faded Deep trigger reaches only what Yielding reaches; firing buys back a
capped amount of clock; a re-induction resets it; below 10 it is a ghost and at 0 it is pruned
unless it is currently holding someone. Rate is a dropdown on the Triggers tab and
`/hypno triggerdecay`, defaulting to **Never** — the same call DW made for trust decay, for the same
reason.

The one design decision made while building it: **`fireTrigger` gates on the trigger's own strength,
never the session's.** The session is the wrong thing to ask — a trigger fires outside a trance,
where session depth is zero — and asking it was how the depth gate nearly disarmed every trigger in
existence back in v0.50.0. This closes that hole properly rather than by exemption.

**v0.60.1–v0.60.2 — layout fallout.** Two faults from DW's screenshots, then the sixth tab pushing
the tab row's right edge to x=1920 against a panel ending at 1800. Tab width became a division of
the panel rather than a constant, which fixed the overflow and made the real ceiling visible: about
nine tabs, where `DrawTextFit` has shrunk the labels past reading.

**v0.61.0–v0.61.2 — tabs run down the left edge.** DW had asked whether the tabs could go vertical;
the arithmetic said yes with room to spare. A tab is now a full 280 wide whatever the count, nine
fit down the panel, and the panel takes back the 72px band the tab row used to occupy. The cost was
one sweep of `menu.ts`: every absolute x became an offset from `CONTENT_LEFT`, so the *next* layout
move costs one constant instead of another sweep. Three rounds of screenshot-driven tweaks followed
— the inactive tabs' right border tucked under the panel's so the column stops reading as one heavy
doubled line, the decay label left-aligned with the dropdown it labels, and the stats name column
narrowed from 640 to 460 because the widest thing in it is a name and a member number.

**v0.62.0 — the decay dial was two positions out.** DW: *"in my mind the very fast would be more
where I expect slow or very slow to be. I was thinking very fast as more like a few hours. Maybe a
day if added at the highest level."* Correct, and worse than it sounds — *Very fast* gave a
Blank-planted trigger **twenty-one days**. The rates went up roughly twentyfold, to 5 / 15 / 40 /
90 / 300 points a day, built around DW's sentence rather than around a feeling of caution. A Deep
planting — the tier planting requires by default, so the row a player meets — now runs 14.7d /
6.7d / 3.1d / 1.5d / **12h**, and Blank at *Very fast* lands within an hour of exactly one day.
The full table is in *Triggers > Trigger Reinforcement and Decay*.

**Neglect compounds, which was DW's other question.** The loss became `rate × days × (1 + days/14)`.
Deliberately **not** the exponential curve that is easy to reach for first: a true exponential
*decelerates*, and its long thin tail would leave every neglected trigger loitering at strength 4
indefinitely — plant-and-forget wearing a different hat, when a deadline is the entire point of the
mechanic.

It also bites nowhere near where you would expect. At the fast settings it changes nothing
measurable, because the trigger is gone in hours before fourteen days of compounding can mean
anything. It earns its keep at the **slow** end, where the straight line ran away: Blank at *Very
slowly* was 64 days linear against 24 now. Without it the two slowest settings were Never with
extra steps.

**The firing credit had to stop being a flat 0.25 days**, and this is the kind of thing a retune
turns up. Lifetimes now span forty minutes to a month, so a fixed number of days is a rounding
error at one end of the dial and immortality at the other — two firings would have outrun *Very
fast* completely, and *Very fast* is exactly the setting somebody would pair with a trigger they
fire constantly. It is 6% of that trigger's own lifetime now, capped at 50%, so steady use buys
about half again as long at any setting and a re-induction is still the only reset.

**A name cannot be checked; a duration can.** The Triggers tab prints the current setting's cost
under the dropdown and `/hypno triggerdecay` says it too — *"a Deep planting fades away in about
3.1 days, unused and unreinforced."* The old dial misled precisely because "Very fast" told nobody
it meant three weeks, and a label nobody can verify is how that survives a build.

Every expected value in the retuned suite is worked by hand from the published constants rather
than read back off the implementation — a suite that echoes its subject would have accepted the old
tuning just as happily. The new assertion worth naming: two days of neglect must cost more than
twice one day's, which is the one property a straight line cannot have.

**The doc caught up the same day.** It had drifted into carrying six wrong claims — version
attributions off by two or three releases, a run-7 fix that was never built, Known Bug #2's root
cause, and "all 7 scenarios passed" when there were eight and one had no verdict. All corrected
against `git log` and the code. The larger addition is an **Orientation** section at the top: the
doc had been a design record that assumed you already knew the project, and it is now also the
thing you can hand someone with none of that context.

### Added 2026-09-07 (v0.51.0 – v0.57.0) — test bot, and what it found

**v0.51.0 — a scripted hypnotist.** The harness described above was built. **v0.52.0** added
`/hypno trance` and the `test-trance` hidden handler — forcing yourself under at a stated depth —
because six scenarios had been written against `/hypno depth`, which explicitly does *not* start a
session, and `handleSpokenLine` checks the session before it ever reaches a depth gate. Nothing was
landing, and the reason was that nothing was under.

**Getting the bot into the room (v0.51.0–v0.52.0).** Four commits of BC connection problems before
the bot could do anything useful: the `AccountUpdate` BC requires before joining was missing, the
join confirmation fires on a different event than the sync, rooms are ephemeral so a stale room name
fails silently, and the `Origin` header BC checks was wrong. None of it obvious from the docs. A
fifth fix made a malformed `secrets.json` report itself as malformed rather than missing —
`readFileSync` and `JSON.parse` shared one try/catch, so a missing comma read as "no file here"
while the file was plainly on disk.

**What the scenarios found, in order:**

- **`/bot` added (v0.53.0).** The harness reads the subject's typed confirmations, but a speech
  restriction silences the subject — so the first scenario that tested speech made it impossible to
  drive the next step. Verified in the live `Commands.js` first: `CommandParse` returns whatever
  `CommandExecute` returns, and `ChatRoomSendChat` only sends when it gets a *string* back, so an
  unregistered slash command never leaves the browser at all. Registering `/bot` and routing it over
  the hidden channel is what makes it work while silenced.
- **Suggestion refusals were silent to the hypnotist (v0.54.0).** A suggestion refused for
  insufficient depth simply did nothing; the hypnotist watched their words land and saw no result.
  Trigger refusals already reported. Now suggestions do too — *depth too shallow — needs Entranced
  (currently Drifting)*, or *arousal does not count for this one*.
- **The OOC scenario was not falsifiable (v0.54.1).** It sent `(ooc: Missy you cannot move)` and
  asserted she was not frozen — but the trance had already frozen her, so the assertion could not
  fail. Rewritten to test a **release**: a parenthesised release must *not* free her, and the same
  words unparenthesised must. DW's report that it "froze me even from OOC" was the symptom that
  exposed it, and the freeze was the trance baseline doing its job.
- **Freeze blocked undressing and blamed a lock that did not exist (v0.55.0).** See **Known Bug
  #2** — the root cause is not what it first looked like. There was no early freeze check; BC's own
  `IsRestrained()` includes `Freeze`, `CanChangeClothesOn()` is built on it, and our guard reported
  every failure of that call as `"locked"`. Freeze now has its own refusal and its own flavor line.
- **Run 7 was undiagnosable (v0.56.0).** The bot dropped emotes from its log, dumped 4KB of
  unparseable appearance data instead of a readable summary, and had no way at all to say "the
  suggestion ran but did not land". All three fixed; the next run was legible.
- **The harness was poisoning its own test (v0.57.0).** With the richer log the real fault showed:
  the bot was speaking its step guidance into the room, where the subject's trigger matching — which
  runs *before* the name gate and the session check — parsed it and fired a stored trigger twice.
  Guidance moved to the hidden channel as `test-note`. (An earlier note in this document claimed the
  fix was "narrowing the suggestion hook to non-bot senders". That was never built, and would have
  been the wrong fix: it would have made the harness a special case instead of fixing the ordering
  that let any speaker's words fire a trigger before the checks.)

**Bug #1 confirmed closed.** Fresh load → start session → `/hypno effects` before any suggestion:
all three awareness lines off. The v0.44.0–v0.44.1 fixes were the right ones.

### Added 2026-09-02 (v0.50.0) — the depth system

Feature access moved off trust percentage and onto trance depth. Trust is still the primary
driver; what changed is where it is read. Each feature now asks one question — *are you at
least this deep?* — instead of carrying its own trust number.

**`depth.ts`** holds the tiers, the per-feature requirements, the current depths and the
chemical scope. It imports only storage, which is deliberate: `session.ts` already imports
`carry.ts` and `triggers.ts`, and both of those need to know how deep the subject is, so
having them import `session.ts` back would close a loop. Same trap `timers.ts` exists for and
the same fix — the leaf module holds the state and the owner pushes into it. `session.ts`
resolves the roll and calls `setCurrentDepths()`; everyone else asks `depth.ts`.

**Two depths, resolved from one roll.** `chance` is computed twice — once with the chemical
floor and once without — and the *same* roll subtracted from each, so the two differ by
exactly the chemical contribution and `depthEarned` can never exceed `depth`. Rolling twice
would let a subject be deeper in the earned sense than in reality.

**Relationship floors are now DEPTH floors** (friend none, lover Entranced, owner Deep),
forfeited by Fight, exactly as settled on 2026-08-31.

**Three deviations from the written spec, all deliberate:**

- **Chemical default is *Arousal only*, not *Neither*.** The doc says wizard-skippers get
  Neither; there is no wizard, so shipping that would silently switch off the arousal floor
  that has worked since v0.18.0 — a regression dressed as a default.
- **One global chemical scope rather than per-feature.** Thirteen tier controls plus thirteen
  scope controls is not a usable canvas screen, and drugs do not exist yet so the control has
  one meaningful axis today. The per-feature shape is stored, so adding the UI later needs no
  migration.
- **The RP bonus counts toward both depths.** The doc lists it beside the chemical modifiers,
  but it is not one: it reads the hypnotist's effort, not the subject's bloodstream, and
  nothing about roleplaying well should be barred from writing something lasting. **Worth a
  second look** — it is the one place the implementation reads the design rather than
  following it.

**The bug this nearly shipped with.** `fireTrigger` re-checks each action at firing time, and
that check went through the same function the depth gate was added to — so every trigger
would have been permanently disarmed, because a trigger fires *outside* a trance where depth
is zero by definition. Permission and depth are now separate checks: depth belongs to the
induction that planted the trigger and is asked once, then; permission is re-asked every time
it fires, so revoking one still disarms that action of every trigger already out there.

**The settings screen** gained a **Depth** tab: one row per gated feature with a
click-to-cycle tier button, the earned-only three marked as such, a chemical-scope button and
a reset-to-defaults. Click-to-cycle rather than dropdowns because DOM controls have to be
created, positioned in canvas coordinates and explicitly removed, and thirteen of them over a
paging screen is a maintenance problem out of proportion to a five-value ordered choice.

Only overrides are stored, so retuning a default still moves everyone who has not chosen.

---

## Needs Testing — as of v0.64.0

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

**Eight of nine topics confirmed; one open, above.** Next bugs or regressions go in Known Bugs.

---


## Pre-Release Checklist — Early Tester Build

Items required before handing the add-on to external testers. Ordered: hard blockers first, then things that make it survivable, then what makes it actually feel right. Check off as done.

### Hard blockers (ship nothing without these)

- [ ] **Flip `TESTING_MODE` to `false` in `src/log.ts`** — currently `true`. It gates `/hypno triggers full`, `/hypno trance`, `/hypno depth`, `/hypno agetrigger` and `/bot`, and removes the "TESTING MODE is ON" log line on load. One-line change, still open as of v0.63.0. **Do it last:** flipping it disables the test harness, so every other item on this list has to be finished and verified first.

  - **`test/revoke.mjs` does not survive the flip, and the loud half is not the problem.** Its
    checks stand their trance up with `forceTrance`, which correctly refuses in a release build, so
    some fail outright — and more go on **passing while testing nothing**, because there was never
    a trance for the revoke to take down. Rule 6 exactly: a check that cannot fail is not checking
    anything, and these read green while the release build is the one build nobody has ever
    verified revocation on. Confirmed against a flipped build, not inferred, and independently
    reproduced. **Open decision, DW's:** the fix belongs in `build-test.mjs` — pin `TESTING_MODE`
    true when bundling the harness, or stand a trance up some other way on a release build — so it
    is not a rewrite to start blind.
- [ ] **Install and usage documentation** — testers need: how to install the userscript, what to enable first, what commands exist, what the other person needs. A short README or wiki page. The help screen (`?` button) covers in-game commands but not setup.

### Strongly recommended (testers can survive without, but experience is rough)

- [x] ~~**Per-feature depth selectors in the settings UI**~~ — **done in v0.50.0 after all.** The **Depth** tab carries one row per gated feature with a click-to-cycle tier button, the earned-only three marked as such, a chemical-scope control and a reset-to-defaults. This item was written from the deviation note ("per-feature UI selectors can follow in a later pass"), which referred to the *chemical scope* dropdown below, not the tier selectors.
- [ ] **Chemical floor per-feature dropdown** — currently one global control (deferred from v0.50.0 spec). The design calls for Both/Arousal/Drugs/Neither per feature; right now it's one setting for everything.
- [ ] **First-launch guidance** — full wizard can wait, but new users need some indication of what to enable and in what order. Even a simple "start here" note on the Permissions tab would help.

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

## Priority Work Session — 2026-09-01

The following items are the current implementation priority, in order. Pick up from the top and work down.

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
