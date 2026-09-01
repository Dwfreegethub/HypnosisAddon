# BC Hypnosis Add-on — Design Document
*Design notes and decision log — work in progress. Code at v0.41.0.*

**Companion documents.** [`../README.md`](../README.md) is the engineering record: how to build and
test, the stage-by-stage implementation notes, and the BC API traps worth knowing. This file is the
design half — what the thing is meant to be and why. [`feature-summary.md`](feature-summary.md) is
the short player-facing list of what exists.

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
| **What works now** | Current Implementation Status |
| **How trust is earned** | Philosophy · Core Mechanic · What Builds Trust · What Lowers Trust · Gain Curve · Hypnotist's Side |
| **How an induction resolves** | Induction Success Formula · Session Flow |
| **How features are gated** | Trust Percentage & Feature Thresholds *(superseded)* · **Trance Depth as the Feature Gate** |
| **Safety and consent** | Control & Reset · Hard Limits · Meta-Consent Layer · Gamification · Clothing & Bondage Consent |
| **The features themselves** | Feature List · Triggers · Carry-Forward · Perception / Illusion |
| **Building it** | Technical Architecture · Prior Art · Development Stages · Player Settings |
| **Undecided** | Open Questions |
| **History** | Appendix: Version History |

---

## Current Implementation Status

*(as of 2026-08-31, v0.41.0 — full technical detail, version history, and code: github.com/Dwfreegethub/HypnosisAddon)*

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

**Permissions (subject's Preferences screen, all off by default).** These are consent flags — "do I allow someone else to do this to me" — not self-triggers: Hypnosis Enabled (master), Movement Restriction, Clothing Restriction, Posture Control, Speech Restriction, Self-Touch Control, Arousal & Orgasm, Clothing Illusion, plus "Lock settings while in trance". Unchecking one mid-effect releases it immediately — **except `arousalControl` and `illusionControl`, which is a bug, not a design** (see the todo).

A second tab holds the **trance defaults** — cannot move / cannot speak / screen fade, all ON by default, plus *Clothes Look Unchanged* (off, deliberately: the other three are things you feel, this one makes your own screen tell you something untrue) and *Others See Your Reactions* (on). A third holds **awareness** (what you can be made not to notice), a fourth **triggers** (planting, carry-forward, firing your own, showing the words, scope, duration), and a fifth is read-only **stats**. A **"?" button on both this screen and the remote panel** opens a five-tab help screen generated from the pattern library and command list themselves, so it cannot fall behind them.

**The session loop.** *Attempt Hypnosis* → the subject gets a private prompt (Agree / Ignore / Fight — **the hypnotist is never told which**, by construction rather than by agreement; no answer in 60s counts as Ignore) → a 60-second induction window for actual roleplay → a **chance-based roll**: `clamp(access + choiceModifier + experienceEffect + rpBonus, 5, 95)` read literally as a percentage, where `access = max(trust, min(arousal, 30))` and `rpBonus` is up to +15 for actually roleplaying the induction. Success fixes the trance depth at entry; failure shows the hypnotist only a vague band ("slightly relaxed", "almost under"), never a number. Three attempts, then a 10-minute cooldown.

**Getting out**, in ascending order of authority: the hypnotist's Wake Up button; `/hypno wake`, which works only if the trance is shallow; a 30-minute session timeout; and `/hypno safeword`, which always works from any state and can't be taken away.

**Spoken suggestions.** During a session the subject's client parses the hypnotist's ordinary chat. Twenty-three entries exist — movement, clothing, posture, speech, three awareness categories, four arousal levels, forced/denied orgasm, numbness and the clothing illusion — plus parameterised self-touch blocks for 42 body words, each with restriction and release phrasings. The help screen's *What to Say* tab is generated from this same table, and the test suite asserts every example phrasing it shows actually matches. Contractions and punctuation are normalised away first, so wording is fairly free ("you can't move", "don't move", "stay still", "you're frozen" all land). **The hypnotist must address the subject by name** for anything to fire, which is what keeps ordinary conversation inert. Effects are identical whether triggered by button or by speech, flavor text included.

**Architectural spine — subject-authoritative throughout.** Every cross-player action is only ever a *request*; the receiving client alone decides, checking its own local settings. The hypnotist's client is never trusted about permissions, session state, or whether a suggestion matched. This is what the doc's own "Sync between players" section already called for, and it's worth checking future features against it.

**Relationship to the trust model above:** trust is **built** as of v0.15.0–v0.18.0. Per-hypnotist *interaction counts* are stored and the value is derived on read via `100n/(n+25)`, so retuning the curve can never corrupt saved data. Conversation accrues it (rate-limited, doubled when the line is directed at you), a successful induction is worth five conversations, and arousal supplies a floor rather than a multiplier. What is still missing from the model above: **hypnotist global skill** alone — decay landed in v0.36.0 and the RP bonus in v0.41.0. The **per-feature percentage thresholds** now have a real mechanism (`Suggestion.trustThreshold`, checked against relationship trust only) even though most permissions are still booleans — the three gates that exist today all sit at 65 — the clothing illusion, planting a trigger, and carrying a suggestion past waking — which is also the owner relationship floor, so ownership alone clears every one of them.

**Known rough edges (still true):** suggestion patterns are regex, not comprehension, so synonyms outside the library silently do nothing — which is why the pattern suite exists and why every gap found in play should become a case in it. `INDUCTION_WINDOW_MS` remains at its 10-second testing value. The flavor-text wording DW wasn't sold on has been through one real pass since (the apply/attempt split in v0.34.0) but has not been re-reviewed as a whole.

**Test suite: 598 checks across thirteen files**, `npm test`. The ones earning their keep beyond the pattern library: every help example is asserted to match its own suggestion; every body-part word is validated against BC's real arousal-zone list; the public/private split is asserted key by key; and the safeword is asserted to clear carried suggestions.



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

## ⚠ DESIGN CHANGE: Trance Depth as the Feature Gate (not yet implemented)

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

**Two depths, not one.** The structural exclusion — drugs and arousal may never write anything permanent, nor reach a feature that lies to the subject about their own state — is not a *how deep are you* rule. It is a *where did the depth come from* rule, and a single depth number cannot carry it: if arousal contributes to depth and depth gates everything, then an aroused stranger reaches persistent triggers and the clothing illusion by construction, which this doc forbids everywhere else. So depth is computed twice:

| | Inputs |
|---|---|
| **`depthEarned`** | trust + relationship floor only |
| **`depthFull`** | plus arousal, drugs, fractionation, resistance fatigue, RP bonus |

Most features check `depthFull`. Persistent triggers, hypnotist-only triggers and both illusions check `depthEarned`. **That is one boolean per feature, not four categories** — which is what replaces `AccessCategory` when the redesign lands (see the reach-matrix note in the v0.36.0 entry).

**Chemical floor rule — now player-configurable per feature:** The floor already cannot reach persistent triggers, hypnotist-only triggers, or perception-deceiving features (clothing/bondage illusion) — that's structural, and the two-depth split above is how it stays structural once depth is the gate. For all other features, what contributes to the floor is a player setting per feature via a **dropdown with four options:**

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
- Hard reset (LSCG-style) always available — restores factory defaults
- **Named save states** — reset to a specific saved configuration rather than factory defaults (e.g., "reset to how my owner set me up")

**Architect role — the owner model:**
- **One architect at a time** (multiple levels of users too complex for now)
- Sets base configuration: features enabled, triggers, thresholds
- Other people can use installed triggers (within their scope) but cannot add/remove or change core settings
- **Both players must have the add-on installed**

**How Architect is granted — two paths:**
1. **BC owner or lovers:** The wizard asks if the subject wants to designate one of them as Architect. Subject chooses; it is never automatic.
2. **No owner/lovers (or none chosen):** Once a hypnotist reaches a high trust threshold (exact value TBD; modifiers optionally included), they may *request* Architect status. Subject accepts or declines — no silent elevation.

**Control hierarchy setting:** Subject decides whether the *player* or the *Architect* holds the highest level of control over settings. This is a toggle the subject sets. Regardless of how it is set, the subject always retains the ability to do a full reset.

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

Delivery: similar to LSCG — worn items (including hypodermic injector) and offered drinks. Need to verify no conflicts with LSCG's own system before implementing.

**Two directions:** drugs that lower resistance (raise chemical floor) AND items that *boost* resistance / recharge resistance fatigue — so players can have countermeasures if desired.

Drugs raise or lower the chemical access floor temporarily — see Core Mechanic. They cannot plant persistent suggestions.

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

---

## Triggers

> **Related:** carried suggestions are the *other* kind of persistence and are easy to confuse with
> these — see *Carry-Forward* for the three-way table that separates them. Trigger word visibility
> shipped as a player setting in v0.40.0 (Appendix); the unbuilt *visibility levels* below are a
> different, larger feature.

- Planted during induction sessions by the hypnotist
- Fire when the trigger word/phrase appears in chat
- **Scope:** per-person (only fires when a specific person says it), per-list, trust-threshold, or anyone
- **Fade over time** if not reinforced — untriggered or un-refreshed suggestions weaken
- Hypnotist must periodically reinforce triggers (brief re-induction) to maintain them
- Creates ongoing relationship mechanic rather than "plant and forget"

### Accidental collateral effect
If other players are in the room during an induction, those with high base suggestibility or existing trust with the hypnotist could be partially pulled in — opt-in setting. Enables group induction and emergent unintended side effects.

---


---

### Detail — **partly built**, v0.20.0–v0.25.0


**What shipped:** verbal planting during a session; multiple effects per trigger (cap 8); scope; a flat duration timer; targeted release by name; the phrase hidden from the subject, and optionally the whole setup exchange.

**Also shipped since:** firing your **own** trigger is an explicit opt-in rather than a side effect of your chosen scope (v0.31.0), and `/hypno forgettrigger` **refuses while a trigger is holding you** and points at the safeword (v0.32.0) — deleting the thing gripping you is too quiet an escape.

**What has not:** the three *visibility levels* below (blanked word / blur / blackout) — the subject currently always sees the trigger fire, they just never see the word that planted it. Also unbuilt: reinforcement and decay, the per-trigger hypnotist panel, offline programming, and the trust-scaled blackout. Several rows in the Trigger Effects table below have no suggestion behind them yet — follow, custom text response, remove clothing item, hypnotic induction.

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
| Freeze / Full lock | **Built** — the `Freeze` effect |
| Rooted | Can't exit/move, arms still free |
| Follow | Compulsion to follow the trigger speaker |
| Remove clothing item | Gradual or immediate, per consent settings |
| Custom text response | Subject speaks a specific phrase (auto-spoken by the add-on) |
| Silence | **Built v0.10.0** — hooks `ChatRoomSendChatMessage`, so emotes, whispers and the safeword survive |
| Any other session suggestion | Triggers can call any effect a live suggestion can produce |

### Trigger Expiry
- Triggers fade naturally via the reinforcement/decay system (see Triggers section above)
- Optional: hypnotist can set a hard expiry on a trigger — fires only N times, or disappears after X hours
- This is an interesting design space; needs further research into whether it adds meaningful gameplay vs. complexity

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

### Trigger Reinforcement and Decay (not yet built)

- Each trigger has a decay clock that runs from the last time it was reinforced
- **Formal reinforcement:** a brief re-induction by the original hypnotist resets the clock fully
- **Passive reinforcement:** firing the trigger counts as *partial* reinforcement — slows decay but does not reset the clock
- Without reinforcement, the trigger weakens and eventually disappears
- Creates an ongoing relationship mechanic: hypnotists must maintain their work, not just plant and forget

Decay rate is a separate setting from trust decay. A trigger planted at Blank decays more slowly than one at Drifting (harder to plant, harder to lose).

**Weak trigger behavior:** a decayed trigger fires at *reduced effective depth* — a trigger planted at Deep that has faded may only hit Yielding when it fires, so depth-gated effects don't fully land. Far enough gone, it produces just a vague pull with no effect. If the subject has the resistance mini-game enabled, a weak trigger can invoke it — consistent with how LSCG uses mini-games for chemicals and sleep. Whether to invoke the mini-game on weak triggers is a subject setting.

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

### Bondage Illusion
Two approaches:

**Tier 1 (physical):** Apply BC Freeze effect. Real movement lock, works without subject's add-on. Visible to others — they see a frozen character. Blunt but effective.

**Tier 2 (mental — preferred):** No physical restraints applied. Subject's client:
- Suppresses inventory and wardrobe interaction
- Renders ghost restraints client-side (cuffs, rope that only they see)
- Suppresses any messages that would reveal the truth

Result: subject believes they are bound; to everyone else they look like a free person standing still. The suggestion is what holds them, not the restraints. The disconnect between the subject's experience and observable reality is a feature, not a bug.

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
- ~~Trigger system (plant, scope, fire, expiry)~~ — done in v0.20.0–v0.25.0. **Decay** (weakening with disuse, reinforcement) is still outstanding; what shipped is a flat duration timer.
- Resistance mini-game
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
- **Hypnotist global skill in the induction roll.** The formula has a slot for it and this doc calls for it to outweigh subject experience — but skill lives on the *hypnotist's* client while the roll runs on the *subject's*, and taking a self-reported number would break the subject-authoritative rule the whole architecture rests on. Needs a design answer before code.
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
- ~~**BC relationship → trust floor**~~ — done in v0.36.0 as friend 15 / lover 30 / owner 65, each with a REACH as well as a number (see the version notes). ~~**Architect status tied to ownership**~~ — **decided: not automatic.** Wizard asks owner/lovers if they want to set it up. Strangers reach it via trust threshold + request/accept flow. One architect at a time. Subject always holds reset.
- **Persona / alter ego** — "when you hear X, you become [name/personality]." Mostly RP, but add-on can nudge: if the alter ego is defined as wearing little clothing, add-on resists attempts to get fully dressed while the persona is active. Add to trigger effects.
- **Phantom sensation** — feeling touch that isn't there, or not feeling touch that is. Separate category from clothing illusion. Excellent trigger effect: warmth, numbness, phantom touch on specific body parts. Many implementation paths — explore.
- **Compelled self-touch + block combination** — "touch yourself whenever arousal drops below X" AND "you cannot touch yourself on your own." Both halves are already built separately; needs a combined trigger or conditional.
- **Fractionation** — waking and re-inducing repeatedly, each time going deeper. As a named mechanic: if re-induction follows a wake within a short window, the roll gets a bonus (subject still partway primed, rapport warm). Currently no mechanic distinguishes first from second induction.
- **Anchoring** *(maybe)* — physical gesture re-triggers trance, separate from verbal triggers. Could tie to existing induction with a trust/depth advantage for using it.
- **Resistance fatigue** — the more someone fights off inductions, the more tired they get, making future attempts easier. Currently resistance is stateless. Review when developing trust/experience further.
- **Suggestion stacking / conditionals** — "if X then Y, if Y then Z." Chains of triggers. Body part blocks already stack naturally; review for formal support.
- **Honesty / amnesia** — compulsive truth-telling and targeted forgetting. RP-prompt features only (no way to enforce mechanically), but the add-on can emit a hint visible only to the subject reminding them to RP accordingly.
- **Waking trance** — subject appears fully conscious but suggestions still active. Needs investigation: hypnotist can already issue most commands post-trance; the gap is clearing the subject's screen and whether the subject knows they're still under. Explore what "distinct mode" would add before committing to building it.
- ~~**Safe signal while silenced**~~ — resolved. Speech blocking hooks `ChatRoomSendChatMessage`, which runs *after* command parsing and after the emote and whisper branches, so a silenced subject keeps `/hypno` commands, emotes and whispers; only ordinary room speech goes. Documented in the help screen's Lasting tab (v0.32.0). The residual case is a fired trigger with the duration set to **0**, where the safeword is the only self-serve exit — DW's deliberate call.
- **Session log** — record of what was suggested, what stuck, and when. Hypnotist-side. TBD.
- **Setup wizard** — first-launch guided config (openness, relationship trust, depth thresholds for sensitive features, chemical floor scope, safeword, decay rate). Re-runnable from settings. Does not lock anything — just fills sensible defaults.
- **Depth system implementation** — implement the 5-tier depth gate (Drifting/Yielding/Entranced/Deep/Blank), per-feature depth selectors in settings UI, chemical floor per-feature dropdown (Both/Arousal/Drugs/Neither), fractionation bonus, dual fatigue counters. See design change section above.
- **Trigger discovery (probe mechanic)** — depth-gated involuntary reveal during a session. Trigger word never spoken aloud; effect and vague hints surface based on depth tier.
- **Trigger removal by another hypnotist** — depth comparison check: must match or exceed the depth at which the trigger was planted. Override (replace) requires one tier higher.
- **Trigger reinforcement and decay** — formal re-induction resets clock; firing counts as partial reinforcement only. Decay rate separate from trust decay.
- **Extreme subject level** — opt-in lock: trigger removal requires Blank or architect, settings gated, decay disabled, visibility defaults to Restricted, time gate prevents downgrading for configured period. Wizard-configured.

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

*Last updated: 2026-08-31 — trance depth as feature gate (5 named tiers), dual fatigue, fractionation. Relationship floors settled as DEPTH floors (friend none / lover Entranced / owner Deep, Fight forfeits). Two-depth rule (`depthEarned` / `depthFull`) replaces the four-way `AccessCategory` split; the reach matrix is superseded and its Arousal column is recorded as never having worked. Induction accelerator corrected to +5; RP bonus built as the separate lever it always was. Code at v0.41.0.*

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
