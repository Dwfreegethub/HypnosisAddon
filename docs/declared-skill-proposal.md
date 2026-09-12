# Hypnotist Skill — Declared and Visible

*Proposal, 2026-09-09. Written for review, not yet merged into `design.md`. Everything here is a
**proposal** unless marked **settled**, which means it is already recorded as a decision in
`design.md`, already true in code, or decided by DW on 2026-09-09 (marked **DW**).*

---

## Conventions for this document

**Explain everything as cause and effect between two people.** This is the shape DW reads most
easily and the house style for this document: *one person does something, and here is what happens
to the other person.* Concrete actor, concrete action, concrete consequence. Start from either
side — the hypnotist acting on the subject, or the subject and what reaches her — but never write
the mechanism as free-floating state.

> ❌ *"The value is scaled by the honour rung and a descriptor band is selected."*
>
> ✅ *"He starts an induction. His client sends a number along with it. Her client decides how much
> of that number to believe, based on a setting she chose. What she actually sees is a line about
> her own instinct — never a claim about him."*

Same information, told as a sequence of things two people do to each other. **This applies to the
explanatory prose only** — the `*Technical:*` notes stay precise and terse, and are exempt.

**A mechanic that resists this shape is worth a second look.** If something cannot be told as "one
person does X and the other experiences Y", that may be a sign the mechanic is abstract in a way
that will also be hard to play.

**What resisted, from the 2026-09-10 pass.** Three things, and only one of them worries me:

- **The practice cap** (§5) has no second party at the moment it fires. He attempts, nothing is
  credited, he is told privately. Nothing reaches her at all — it is a rule about his own
  bookkeeping. Told as cause and effect it has to reach forward in time: *he grinds today so that a
  stranger's client believes him next week.* That works, but it is the one mechanic here whose
  consequence lands on a person who is not in the room yet. **Not a problem, but worth knowing it
  is a different shape from everything else.**
- **`depthEarned` versus `depthFull`** (§4) is genuinely two numbers resolved from one roll, and
  saying so plainly is clearer than any story about two people. It survives as an abstraction
  because it is a *rule about what may reach her*, not an event. Left as-is deliberately.
- **The Fight/Ignore invariant** (§10 A1) is the one that resisted hardest, and I think that is
  informative rather than fine. It states itself easily — *fighting must never help him more than
  doing nothing* — but the reason it is currently violated cannot be told as a story at all; it is
  an artefact of two clamps interacting. **That is precisely why it survived two review passes
  unnoticed.** A rule that can only be seen in the arithmetic needs a test that sweeps the
  arithmetic, which is why A1 ships with one.

**Lead with play, anchor to code.** An earlier pass rewrote the open questions purely in terms of
what happens at the table, and overcorrected — the questions read well but you could no longer tell
which part of the codebase any of them touched. The target is the middle: **say what happens in
play first, then name the actual file, function, constant or setting it lives in.** Not a code dump
— just enough that DW and an implementing bot can both find it.

> "Her client applies her honour rung (`skillHonour` in `HypnoAddonSettings`, `src/storage.ts`;
> consumed in `inductionChance()`, `src/session.ts`)."

**A note on names that do not exist yet.** Where this document names something unbuilt —
`skillHonour`, the practice cap, the AFK flag — the anchor is *where it would go*, not where it is.
Those are marked **proposed** at first use. There is no `induction.ts` in this repo; the induction
roll lives in `src/session.ts`.

---

## The problem this closes

**Settled (design.md, Induction Success Formula):** the roll is

```
chance = clamp(trust + choiceModifier + skillBonus + rpBonus, 5, 95)
```

and `skillBonus` has never been built. Here is why, told as what actually happens between the two of
them.

He clicks *Attempt Hypnosis* on her Information Sheet. His client sends her a request — and that is
all it sends. From there **everything is decided on her machine.** How much she trusts him: her
client has been counting their conversations. Whether she agreed, ignored or fought: she answered
that herself, on her own screen. Whether he roleplayed the induction: her client read his lines as
they arrived in the room. Each of those is something she witnessed or chose.

His *skill* is the one thing she has no way to witness. It lives on his machine, in his own
`ExtensionSettings`, inside a userscript he can open in a text editor. For it to affect the roll, her
client has to take a number he handed it and act on it — which is exactly what rule #1 forbids.

**Narrower than it looks.** How well he knows *her* is already hers: it is the interaction count her
client has been keeping all along, and it already works. The only unreachable thing is his practice
with everyone else.

**Settled (design.md):** the design constraint that motivates it is *a new player should have
little chance of resisting a very experienced hypnotist* — and design.md already records that the
current formula does not achieve it.

**Settled (DW, 2026-09-09):** that scenario **is** wanted, because consensual-non-consent is a
large part of how BC is played — but only for subjects who opted into it ahead of time, in their
own settings. That opt-in is what makes the whole thing tractable: the subject's client still
decides, so subject-authority holds *literally*, not by exception.

---

## 1. The honour setting

**The move that makes this work:** he tells her client how good he is, and **her client decides how
much of that to believe.** He is never trusted — he is *listened to*, by a setting she chose in
advance. Subject-authority holds literally rather than by exception, because the deciding still
happens entirely on her machine.

**Proposal.** One global setting, a four-rung ladder, on the Depth tab beside the chemical-scope
control. Stored as a string in `HypnoAddonSettings` (`src/storage.ts`), same shape as
`chemicalScope`.

| Rung | What happens when he attempts an induction on her |
|---|---|
| **Ignore** | She does not listen. His practice counts for nothing against her, exactly as today |
| **Only from people I trust** | She listens in proportion to how well she already knows him. A stranger says it and she hears nothing; someone she has been under with many times, she believes almost entirely (`trust/100`) |
| **Honour, capped** | She listens to anyone, up to a point — no more of him reaches her than a value of **30**, however good he says he is. See §2b |
| **Skill can beat my resistance** | She takes him at his word, whoever he is. **This is the CNC rung** |

**Rung 4's label — SETTLED, DW 2026-09-09: "Skill can beat my resistance."** The rung is *"an expert
usually wins"*, not *"an expert always wins"*, and the wording must not promise a certainty the
numbers do not deliver. "Honour fully" read like a switch that hands the other player the outcome.
The chosen label states a **capability** — *can* does the work — and *my resistance* makes clear it
is the Fight this defeats, not the consent.

**Fresh installs may select rung 4 — DW, settled.** No gate on prior sessions or trust. The
reasoning is that the safeword still exists, which is sound as long as that stays true (see §8,
where it is precisely what is in question).

**Granularity — recommendation: global only, no per-hypnotist override.** The "trusted hypnotists
honoured fully, strangers capped" shape DW asked about is worth having, but it does not need a
whitelist: rung 2 *is* that shape, expressed continuously through a number the subject's client
already stores. A per-hypnotist override would need a new UI surface (the Stats tab is read-only
and there is no per-hypnotist editor anywhere in `menu.ts`), and it would let a subject hand one
person a permanent advantage that trust is supposed to represent. Rung 2 gives the same outcome and
stays honest about where the advantage comes from.

If a per-hypnotist override is wanted later it should be an *exception list* on top of the global
rung — "always ignore skill from these people" — which is the direction that adds safety rather
than access.

---

## 2. Default for a new install

**SETTLED, DW 2026-09-09: rung 2, "Only from people I trust", stored sparsely** — that is, the
setting is written to storage *only* when the player changes it, with the default living in code, the
same pattern and for the same reason as `depthGates`. This is what makes the default cheaply
reversible; see *Reversibility* below. The argument that led there is kept:

The argument, taking DW's framing seriously in both directions:

- **"Ignore" makes the feature invisible.** Nobody who does not go looking in settings will ever see
  skill do anything, which means the progression the doc has wanted since the beginning never
  surfaces in play. A feature that is off for everyone by default is a feature that gets built
  twice.
- **"Honour fully" opts people into CNC unasked.** That rung exists so a stranger can push through a
  Fight. Nobody should arrive there by not reading a settings screen.
- **Rung 2 is discoverable without being exposing.** In an established pair, skill visibly works, so
  the mechanic is found in normal play. To a stranger — the case where consent is thinnest — it
  contributes exactly zero. It is also *strictly weaker* than what an established hypnotist already
  gets from trust itself, so it grants no category of access that trust was not already granting.

**The honest counter-argument.** Every other default in this codebase is off: `hypnoEnabled: false`,
every permission false, both decay rates `never`, `tranceClothingFreeze` false. House style says
Ignore. I think skill is a different kind of thing — a modifier on a roll the subject already
consented to by having hypnosis on and answering a prompt, not a permission to do something new to
them — but the full argument is below, because DW asked for the whole picture before deciding.

### 2a. The default rung, laid out properly

**What each rung actually does in play**

| Rung | The lived experience |
|---|---|
| **Ignore** | Nothing changes, ever. The hypnotist's progression stat exists and affects nobody. No descriptor ever appears at the prompt |
| **Only from people I trust** | Strangers get nothing. Your regular hypnotist's sessions land more often and go deeper as they get better. The descriptor appears at the prompt once someone is established |
| **Honour, capped** | Everyone, stranger included, gets a real but bounded lift. A fighting newcomer's per-session odds against an expert stranger go from 14% to ~28% |
| **Skill can overpower me** | The CNC rung. 58–70% across a session, per §4 |

> **A correction to §4 that matters here.** The cap on rung 3 must be a cap on the **honoured
> value**, not on the additive bonus — because skill feeds *two* terms (the sum and the Fight
> floor), and capping only the first would let rung 3 back-door most of rung 4 through the floor.
> One cap, flowing through both terms. **Settled at 30; the trace is immediately below, and it
> turned up a formula flaw worth reading before anything is built.**

### 2b. What the value cap actually changes

DW asked whether swapping "+15 bonus cap" for "value cap 40" affects anything else. **Mostly it is
contained — but not entirely, and the part that is not contained is the majority of rung 3's
effect.** Traced honestly:

**Three things read the honoured value.** The additive term, the Fight floor, and the descriptor
band shown at induction (§3). The old framing capped only the first of those.

**1. The additive term: no meaningful change.** +15 before, +14 after (40 × 0.35). Within rounding.
Anything computed off Agree or Ignore is untouched.

**2. The Fight floor: this is where the whole change lives.** New subject (trust 0, experience 0),
expert hypnotist (real skill 80), subject on rung 3:

| | Fight, per attempt | across 3 attempts | Ignore, per attempt |
|---|---|---|---|
| **Old** (+15 additive, floor untouched at 5) | raw −10 → clamped to **5%** | **14%** | **15%** |
| **New** (value 30 → +10.5 additive, floor 12.5, invariant applied) | **~11%** | **28%** | ~11% |

Under the old framing rung 3 did **nothing whatsoever** for a fighting subject — the −25 swallowed
the bonus and the clamp finished the job, landing exactly on today's baseline. Under the new one it
doubles the session odds. So this is not a tidy-up; it is the change that gives rung 3 a reason to
exist as a distinct rung at all.

**3. The descriptor gains a ceiling — a real consequence, and possibly a good one.** §3 reads the
descriptor off the honoured value *after* the rung is applied. Under a value cap of 40, a rung-3
subject facing a genuine expert sees "practised" and can **never** see the top two bands, however
skilled the other player actually is. Under a bonus cap the value was uncapped, so they would have
seen "unmistakably an expert" while feeling only a clipped version of it.

I think the new behaviour is the better one — the descriptor now describes *what reaches you* rather
than what the other person claims, which is more honest about a number that is self-reported anyway.
But it is a genuine change in what the subject is shown, and it raises a question §3 does not
currently answer: **should the descriptor read the claimed value or the honoured one?** Flagging it
rather than deciding it, since §3's wording is parked.

**What does NOT change:**

- **No depth gate outcome moves.** Skill counts toward `depthFull` only, and the three `earnedOnly`
  features are out of its reach entirely under §4. Raising `chance` raises the depth ceiling, but
  rung 3's ceiling contribution is +14 rather than +15 — a point, which crosses no tier boundary
  anywhere in `DEPTH_GATES`.
- **No table in §4 needs recomputing.** Every worked example there is rung 4 at full weight (skill
  80 → +28, floor 25). The rung 3 cap does not appear in any of them.
- **Nothing else reads the number.** The practice cap, the AFK backstop, trust, decay and
  reinforcement are all untouched. `/hypno chance` would display it, which is cosmetic.

### The cap is 30 — SETTLED, DW 2026-09-09

40 inherited an anchor that no longer applied. It was reverse-engineered to reproduce the old +15
bonus, and that +15 was itself chosen only because it matched the RP cap — symmetry, not an argument
about strangers. Once the number also drove the Fight floor it was doing far more work than the
thing it was copied from.

**30 is the number, and the reason is that the codebase already holds this opinion.**
`STRANGER_CEILING` is 30 — the settled statement of how far someone gets with a subject who has not
earned it. Rung 3 *is* a stranger-ceiling question wearing different clothes, so the two should
agree. That gives the constant a real argument behind it instead of a borrowed one. Spacing supports
it independently: the ladder now roughly doubles at each step rather than crowding rung 4.

### ⚠ Tracing the cap surfaced a flaw in the formula — Fight could beat Ignore

Working the numbers at 30 exposed something that is **also wrong at 40**, and was wrong in the
original §4 tables. It needs fixing before any of this is built.

At zero trust, with no RP, the two relevant chances are `Ignore = max(5, 0.35v)` and
`Fight = max(5 + 0.25v, 0.35v − 25)`. Fight exceeds Ignore whenever `5 + 0.25v > 0.35v` — that is,
**for any honoured value below 50**. Worked: at v=30, Ignore lands at 10.5% and Fight at 12.5%. At
v=40 it is 14% versus 15%. At rung 4 against a *novice* (v=20) it is 7% versus 10%.

Which means: **choosing to fight would make the induction more likely to succeed than doing
nothing.** Nonsense on its face, and the kind of thing a player finds in one evening.

**Proposed fix — state it as an invariant rather than patching the arithmetic:**

> **Fighting must never give the hypnotist a better chance than not fighting.** Compute Ignore's
> chance first and use it as a hard upper bound on Fight's.

That is one `Math.min`, and more importantly it is a rule that stays true if any weight is retuned
later. **It should be a test assertion, not just a line of code** — swept across the full range of
trust, skill, rung and experience, since the failure is invisible at the values anyone would spot-
check by hand. Below v=50 the effect is that Fight ties Ignore rather than beating it, which is
acceptable: the base clamp of 5 already flattens the two at zero trust today, so the flattening is
pre-existing and the invariant only stops it inverting.

### Ladder spacing, with the cap at 30 and the invariant applied

New subject (trust 0, experience 0), no RP, facing an expert (real skill 80):

| Rung | Fight, per attempt | Across a session |
|---|---|---|
| **Ignore** | 5% | 14% |
| **Only from people I trust** (stranger — nothing honoured) | 5% | 14% |
| **Honour, capped** (value 30) | ~11% | **28%** |
| **Skill can beat my resistance** | 25% | **58%** |

Roughly doubling at each meaningful step, with the two "safe" rungs identical against a stranger,
which is the point of them.

**Who each default serves, and who it fails**

- **Ignore** serves the cautious and anyone who never opens settings. It fails every hypnotist in the
  playerbase — their stat does nothing to anyone by default — and it fails discoverability outright.
  A feature nobody encounters is a feature that gets designed twice.
- **Rung 2** serves established pairs, which is where essentially all of this add-on's actual play
  happens; the entire trust engine exists to model exactly that relationship. It fails nobody on
  consent grounds, because a stranger's claim is worth precisely zero. Its one real failure mode is
  quiet: a player whose first hypnotist is a stranger sees nothing different from today. Which is
  arguably correct.
- **Rung 3** exposes strangers to a genuine lift with nobody having chosen it. Not defensible as a
  default.
- **Rung 4** as a default is not on the table.

**First-run experience under each**

Under **Ignore**: install, enable hypnosis, get hypnotised. Skill is never mentioned, no descriptor
ever appears, and the only route to the feature is reading a settings screen looking for something
you do not know exists.

Under **rung 2**: install, and the first sessions — which are with strangers or near-strangers — are
identical to Ignore. Then, once trust with someone has built, the descriptor starts appearing in the
prompt: *"They carry themselves like someone who has done this many times."* **The feature
introduces itself, on a delay, to a player who by then has the context to understand it.** That is a
better onboarding than any wizard question, and it is the single strongest argument in this section.

**How the wizard changes the calculus — and the fact it does not exist**

The setup wizard (design.md, *Setup Wizard*; CLAUDE.md medium priority) would ask this directly, at
which point the default only governs people who skip it. That is the world in which this question is
cheap.

We are not in it. And there is a precedent in-repo for exactly this situation: `chemicalScope` ships
as `"arousal"` rather than the doc's specified `"Neither"`, and `storage.ts` says why — *"The doc
says wizard-skippers get 'Neither'. There is no wizard yet, and shipping that default would silently
switch off the arousal floor that has worked since v0.18.0 — a regression dressed as a default."*
The established pattern is to pick the pragmatic default now and let the wizard set it properly
later.

**Reversibility if the default turns out wrong**

This is the part that should lower the stakes. `depthGates` already establishes the right storage
pattern — store **only** where the player has changed something, keep defaults in code — with the
reasoning spelled out in `storage.ts`: *"A stored copy of every default would freeze the design at
whatever it was the day somebody first opened the screen."*

If `skillHonour` follows that pattern, **changing the default later moves everyone who never chose**,
including installs already in the wild. The cost of getting it wrong is one constant and a version
bump.

With one asymmetry worth naming: reversal fixes the *setting*, not any session that already happened
under it. That argues against a permissive default in general — and is precisely why rung 2 is the
right risk, since it grants a stranger nothing at all, so the "session that already happened" cannot
be one the subject would not have consented to.

**Recommendation: rung 2, stored sparsely.** It is the only rung that is simultaneously
discoverable, harmless to a stranger, aligned with what the rest of the system already models, and
cheap to reverse.

---

## 3. What the subject sees

**Constraint (settled by the existing UI):** the prompt is a clean three-way Agree / Ignore / Fight
box (`prompt.ts`) plus one notify line. It should not grow a stat block.

### ✅ DECIDED 2026-09-10 — and the two halves are JOINED

> **Do not revert one without the other.** These were decided together and only work together:
>
> 1. **The descriptor reads the HONOURED value**, not the claimed one (A3).
> 2. **The wording describes HER INSTINCT, not him** (A3a).
>
> The reasoning is in §10 A3a. In short: the honoured value is filtered through her own setting, so
> two subjects looking at the same man would read him differently — which is incoherent as a claim
> *about him* and perfectly coherent as a claim *about her*. Switch to the claimed value and the
> wording must go back to being about him; keep the wording about her and the input must stay
> honoured. **Half of this decision on its own is worse than neither half.**

**What happens, in order.** He starts an induction on her. His client sends a number along with the
request — how much practice he has, on a 0–100 scale — riding beside `hypnotistName` on the
`session-attempt` message (`src/session.ts`). Her client decides how much of that to believe, using
the rung she set (**proposed** `skillHonour`, `src/storage.ts`). Then the prompt box appears on her
screen, and appended to its one line of text is a single clause — **about her, not about him.**

It reaches her through `showPrompt()` → `tellPlayer()` (`src/notify.ts`) → `ChatRoomSendLocal`, so it
is bracketed and private. The room does not see it. **He does not see it either**, and never learns
whether she listened.

**Shape:**

- **A descriptor, never a number, and only in the existing notify line.** The line already reads
  *"<Name> is attempting to hypnotize you…"*; one clause is appended.
- **Nothing at all when the honoured value rounds to zero** — which is the rung 2 default against a
  stranger. As a statement about him that would be a gap; as a statement about her it reads exactly
  right: *she has no instinct about this person yet.*
- **Numbers live in `/hypno chance`** (`src/commands.ts`), which already exposes the roll's inputs.
  Add the skill term there. That is where someone who wants arithmetic goes; the prompt is where
  someone who wants atmosphere is.

**Descriptor bands — ⚠ PLACEHOLDER PROSE.** Three bands, per the recommendation in §10 B1; the
register is settled (her instinct, behavioural, never evaluative) but **the exact wording is still
cosmetic and open.** Read off the honoured value:

| Honoured value | Placeholder wording |
|---|---|
| < 20 | *(nothing shown — she has no read on him)* |
| 20–49 | Something about how he says your name makes you want to listen. |
| 50–79 | Something in his voice puts you off balance, and you are not sure why. |
| 80+ | Something in the way he speaks to you makes you want to sit down before he asks. |

Note what these do **not** say: nothing about his history, his experience, or how many people he
has done this to. Each is a sentence about what she notices in herself. That is the register to
keep when the prose is finalised.

**The hypnotist is never told whether their claim was honoured.** Same principle, and the same
construction, as never being told which of Agree / Ignore / Fight was chosen. Telling them would
turn the setting into something to be probed for.

---

## 4. How skill enters the roll — and the floor problem

### The floor problem, stated precisely

Picture it happening. A very experienced hypnotist walks up to someone who installed the add-on
yesterday and has never met him. He attempts an induction. She fights it.

Her client adds up what it knows: no trust with him, so nothing there; she fought, so −25; no
experience of her own yet; he has not roleplayed anything. That is −25, and the floor lifts it to
**5%** — the sliver the design says a determined stranger always keeps. Now give him skill. He has
to buy back thirty points before he buys a single percentage point, because the floor already
absorbed everything below it. He can be the most practised hypnotist in the game and she still
refuses him 95 times in a hundred. That is the constraint design.md records as unmet, and this is
the shape of why (`inductionChance()`, `src/session.ts`).

The same clamp does something else worth seeing: against a stranger, **fighting and doing nothing
already produce the identical 5%.** Her choice has been flattened by the floor before skill is
involved at all. Adding skill naively makes that flattening bigger and more visible.

### Proposal: skill adds to the sum, and *also* raises the floor when the subject fights

```
skillTerm = honouredSkill × 0.35            // proposal: max +35 at skill 100
fightFloor = 5 + (choice === "fight" ? honouredSkill × 0.25 : 0)

raw    = trust + choiceModifier + experienceEffect + rpBonus + skillTerm
chance = clamp(raw, fightFloor, 95)
```

Two things are doing two different jobs, and this is the reason for the second term rather than a
single bigger weight:

- **The additive term** is skill as ordinary pressure. It behaves like every other modifier and needs
  no special case.
- **The skill-scaled floor applies only to Fight**, which is exactly the case design.md names.
  Conceptually it is right: design.md **settled** that Fight is *contested* — "probabilistic,
  weighed against trust and skill" — while the AFK-block and OOC refusal are *absolute*. A floor
  that skill can raise is the literal statement of "resisting this person leaves a wider gap than
  resisting a novice". It also cannot touch the absolute column, because that column refuses the
  attempt before any roll happens.

`0.35` is chosen so skill outweighs subject experience, which design.md **settled** should be the
case (`EXPERIENCE_WEIGHT` is 0.25, ±25 at experience 100).

### Worked numbers

Assume the subject is on **Honour fully** unless stated. Skill 80 = "expert" (≈100 completed
inductions through the curve below); skill 20 = "novice" (≈6).

| Case | raw | floor | **chance/attempt** | across 3 attempts |
|---|---|---|---|---|
| New subject (trust 0, exp 0), **Fight**, expert (+28) | 3 | 25 | **25%** | 58% |
| Same, expert, **with full RP** (+15) | 18 | 25 | **25%** | 58% |
| New subject, **Fight**, novice (+7) | −18 | 10 | **10%** | 27% |
| New subject, **Ignore**, expert | 28 | 5 | **28%** | 63% |
| New subject, **Agree**, expert | 53 | 5 | **53%** | 90% |
| New subject, **Fight**, expert — subject on **rung 2, no relationship** | −25 | 5 | **5%** | 14% *(unchanged from today)* |
| Trusted pair (trust 70), **Ignore**, mid-skill (+18) | 88 | 5 | **88%** | ~100% |
| Trusted pair (trust 70), **Fight**, mid-skill (+18) | 63 | 18 | **63%** | 95% |
| Owner (trust 65), **Agree**, mid-skill | 108 → clamped | 5 | **95%** | — |

The constraint is met: an expert stranger beats a fighting newcomer 58% of the time across a
session, where today it is 14%. A novice gets 27%, so skill is doing visible work rather than being
noise. And a subject who has not opted in sees the row that is identical to today's behaviour.

**Note the RP row.** At this end of the scale the RP bonus is invisible, because `raw` is still
below the skill-raised floor. That is not a bug — RP was built to lift a *friend* over a tier line,
and design.md says so — but it is worth knowing that RP and Fight-at-zero-trust do not interact.

### "Usually wins" — where the *usually* actually comes from

**DW:** rung 4 means an expert *usually* wins, not always, because a failed roll is not a dead end —
the hypnotist still has chemicals, and can wear the subject down across repeated attempts.

**The chemical half of that is already in the code and is worth seeing on the table.** `effectiveAccess()`
takes `max(trust, chemicalFloor())`, and the chemical floor is capped by `STRANGER_CEILING = 30`.
So an aroused stranger does not start from trust 0 — they start from up to 30:

| Case (rung 4, expert +28) | raw | floor | chance/attempt | across 3 attempts |
|---|---|---|---|---|
| New subject, **Fight**, expert, subject not aroused | 3 | 25 | 25% | **58%** |
| New subject, **Fight**, expert, subject at the arousal ceiling | 33 | 25 | 33% | **70%** |
| Same, plus a second session after the 10-minute cooldown | — | — | — | **~91%** |

That is the right shape for "usually": no single roll is close to certain, one session is a coin
weighted to the hypnotist, and persistence across a sitting gets there. The per-attempt number stays
modest, which is what keeps a Fight worth choosing and keeps the outcome legible as a roll rather
than a foregone conclusion. **Recommendation: keep the 0.35 / 0.25 weights.** The "usually" is
bought at the session and chemical level, where it already exists, rather than by inflating the
per-attempt number.

### ⚠ The wearing-down half does not exist

**DW's stated belief:** the subject's resistance fades faster than the hypnotist's across a session.
**Checked against the code — this is not true today, and it is worth being precise about how it is
untrue, because it cuts the opposite way from the assumption.**

1. **Dual fatigue is unbuilt.** `grep -ri fatigue src/` returns nothing. Neither resistance fatigue
   nor hypnotist fatigue exists in any form. Design.md describes both in *Dual Fatigue System*; no
   code has ever been written against it.
2. **Nothing else fades a subject's resistance within a session.** The choice modifier is a flat
   −25 every attempt. Trust does not move on a failed attempt (`noteInductionAttempt()` deliberately
   grants no trust — "an attempt that failed is not a relationship milestone, it's just practice").
   Attempt 3 is arithmetically identical to attempt 1.
3. **The one thing that does change moves the wrong way.** Subject experience accrues on *every*
   attempt, win or lose (`ATTEMPT_EXPERIENCE = 0.25`), and under the single-pool model
   `experienceEffect` is **negative when the choice is Fight**. So each failed attempt makes the
   subject fractionally *better* at resisting, not worse.

   In practice the magnitude is a rounding error — three fought attempts add 0.75 to the count,
   which through `H_EXPERIENCE = 25` is ~2.9 experience, worth ~0.7 on the roll. Call it flat. But
   the *sign* is the opposite of the assumption, and if fatigue is built later it will be fighting
   this term rather than joining it.

**What this implies for ordering.** Rung 4's softness is currently carried entirely by the chemical
floor and by repeat attempts across the cooldown — both real, both in the table above. It is *not*
carried by wearing the subject down, because that mechanic does not exist. Two readings:

- **Rung 4 can ship without fatigue.** 58–70% across a session is already "usually", and the numbers
  in the table are honest as they stand. This is the recommendation.
- **But the feel DW is describing needs fatigue.** "The fourth attempt lands because she is tired of
  fighting" is a specific and good scene, and nothing in the current model produces it. If that is
  the experience rung 4 is meant to deliver, **dual fatigue should be built before rung 4 is
  offered**, or rung 4 will be doing its job through a mechanic DW is not thinking of (chemicals)
  and not through the one he is (attrition).

**DW, settled 2026-09-09: build fatigue first, then rung 4.** Recorded as a dependency in
design.md's Todo and promoted in CLAUDE.md's high-priority list. **Rungs 1–3 do not depend on
fatigue and may ship first** — they change no outcome that a Fight was protecting.

### Depth, and the one place skill must not reach

**Proposal: `skillTerm` counts toward `depthFull` only, never `depthEarned`.**

Depth is `chance − roll`, so skill raises how deep the hypnotist can take someone. Mostly that is
desirable and it is how every other modifier behaves. But `depthEarned` is what gates the three
features that **outlive the session or lie to the subject about their own body** — persistent
triggers, the clothing illusion, carry-forward. Letting an expert stranger reach those on a first
meeting, against a Fight, is a different order of thing from winning a roll: the roll ends, a
planted trigger does not.

This also composes cleanly with work already queued. A subject who wants the full CNC version can
set **Honour fully** *and* turn off `earnedOnly` for triggers (the per-feature toggle, decided
2026-09-08 and now unblocked) — at which point the existing fast-decay safeguard applies to
anything seeded that way. Two independent opt-ins, each with its own tradeoff, rather than one
setting that quietly does both.

Worth noting what falls out of the numbers above: an overpowered newcomer lands at chance 25, and
depth is `chance − roll` with the relationship floor forfeited by fighting, so they land somewhere
in **0–25 — Drifting or Yielding**. Shallow. The deep features stay out of reach on the arithmetic
alone, before any gate is consulted.

---

## 5. What the hypnotist claims, and why self-reporting is acceptable here

**Proposal: derived, not self-set.** The hypnotist's client counts its own completed inductions and
runs them through the curve already in `curve.ts` — `100n/(n+25)` — giving 0–100. n=25 → 50; n=100
→ 80; n=225 → 90. No new math, no new storage shape, and it makes skill an actual progression,
which is what design.md asks for ("grows through practice across all subjects").

**DW, settled: everything counts, successes count more.** That is exactly the rule already used for
the subject's own experience pool, and the cleanest version of this is to reuse the constants rather
than invent new ones:

| Event | Skill counts | Mirrors |
|---|---|---|
| Any induction attempt, win or lose | **+0.25** | `ATTEMPT_EXPERIENCE` |
| Additional, on success | **+1** | `INDUCTION_EXPERIENCE` |

So a first-attempt success is worth 1.25 and three failures are worth 0.75 — the same ratio the
subject side has already been played against. Through `100n/(n+25)`: ~25 successes ≈ skill 55,
~80 successes ≈ skill 80 ("expert"). Reuses `curve.ts` untouched.

### Rate limit — DW, settled in principle; numbers proposed

**The problem, played out.** He wants to be able to walk into a room and have strangers' clients
believe he is an expert. So he asks a cooperative friend to sit still for an hour and he attempts an
induction on her over and over. She agrees every time; nothing interesting happens to either of
them. At the end of it his number says *expert*, and the next stranger who has rung 3 or 4 set feels
it — from practice that was never practice.

**What already exists and does *not* need re-solving:** the attempt limit (a player setting as of
v0.65.0, default 2) then `COOLDOWN_MS = 10
minutes` already blocks rapid re-attempts *at the same subject*. The gap the cap needs to close is
grinding **across many subjects or rooms**, which nothing currently touches.

**Proposal: a rolling-hour cap on skill counts earned, not on attempts made.**

- **Cap: 2.5 skill-counts per rolling 60 minutes** — two successful inductions, or ten attempts, or
  a mix. Above that, further attempts earn nothing toward skill.
- **It does not block the attempt — DW, settled.** A deliberate departure from the original
  "too fatigued to try again" phrasing. Three reasons: the anti-spam job is already done by
  the attempt limit + cooldown; blocking would stop two consenting players mid-scene for a reason that
  is purely about a stat; and a blocked attempt is a thing the *subject* would notice, which leaks
  the hypnotist's grind state into someone else's client. Only the earning stops.
- **The message is private to the hypnotist**, in-fiction, once per cap period rather than per
  attempt.

**⚠ Naming — do not call this fatigue.** Design.md already has a *Dual Fatigue System*, and it is a
different mechanic in every dimension:

| | This cap | Design.md's dual fatigue |
|---|---|---|
| Affects | The skill **stat's growth rate** | The **roll**, directly |
| Scope | Across sessions, rolling hour | Within a session |
| Whom | Hypnotist only | Both sides |
| Purpose | Anti-grind on a progression stat | Attrition as a play mechanic |
| Status | Proposed here | Designed, unbuilt |

Calling both "fatigue" will get them conflated in exactly the way this document exists to prevent.

**Name shortlist, DW to pick:**

| Name | Note |
|---|---|
| **Skill plateau** | My pick. In-fiction and mechanical at once, and *plateau* says the right thing: you have not lost anything, you have stopped gaining |
| **Practice cap** | Plainest. Reads as a developer term rather than a game one |
| **Diminishing returns** | Accurate, and already a familiar idea to players. Slightly misleading — the gain does not diminish, it stops |
| **Learning cap** | Ties to what the stat measures rather than to the act |

The in-fiction message should avoid fatigue words too —
something like *"You have been at this a while; nothing new is sinking in just now"* rather than
*"you are too tired to try again"*, which would also be a lie, since the attempt still proceeds.

**Transmit the derived 0–100 value, never a bonus.** The subject's client applies its own weight,
its own cap and its own honour rung. A sender who is trusted to supply the final number is trusted
to supply anything.

The attempt message already carries `hypnotistName` (`session-attempt` in `session.ts`), so this is
one more field on an existing payload.

**He can lie about it, and that is fine here.** The number is computed on his machine from his own
storage, and both are editable by anyone willing to open a text editor. The model is **declared and
visible**, not verified. What protects her is not that he told the truth — it is that:

1. the subject's client alone decides whether to use it, so rule #1 is satisfied literally;
2. the subject was *shown* the claim before answering the prompt, so an inflated claim is a lie told
   to someone's face rather than a hidden edge; and
3. the rung that lets a stranger's claim matter at all is one the subject had to go and select.

Inflating it is possible and always will be. In a two-player consent tool the answer to that is
social, and the design should say so plainly rather than pretending otherwise.

---

## 5a. Seeing your own numbers

**DW, settled:** both sides can see their own real number, but it must be **sought out** — a command
or a "detailed stats" screen, never the main UI. Same treatment for the subject's own view of their
trust and experience.

**Proposal:**

- `/hypno skill` — the hypnotist's own claimed value, the count behind it, and what the practice cap
  is currently doing. Nobody else's, ever.
- `/hypno chance` already exposes the subject's own trust and experience mid-attempt; that stays.
- **The existing Stats tab moves behind an Advanced / Detailed stats button — DW, settled.** It is
  currently a top-level tab on the settings screen listing every hypnotist with trust values and
  interaction counts plus the player's own experience. Its original purpose was DW's own debugging
  visibility, so demoting it costs nothing it was built for. Practical note: the vertical-tab
  rework (v0.61.x) lifted the tab ceiling from six to nine, so this frees a slot rather than
  solving a crowding problem — the reason to do it is the opacity, not the space.

Never shown: anyone else's real number. The descriptor at induction time is the only cross-player
view, and it is deliberately vague.

---

## 6. CNC: what stays unconditional

The point of this feature is that a subject can pre-consent to *losing*. Opting into losing the roll
must never mean opting out of the exits. Verified against the code, not assumed:

| Escape hatch | Status | Where |
|---|---|---|
| `/hypno safeword` — any state, no checks, no feature may condition it | **Unconditional** | `safeword()` → `totalStop()`, `session.ts` |
| Unticking *Hypnosis Enabled* — ends the session, not just its effects | **Unconditional** | `hardFloorStop()`, shares `totalStop()`; wired at `menu.ts` |
| An attempt is refused outright when `hypnoEnabled` is off | **Unconditional** | `session-attempt` handler, first check |
| 30-minute session timeout, armed whenever a trance starts | **Always armed** | `SESSION_TIMEOUT_MS` |
| Self-wake up to depth 40, and above it a message naming the safeword | **Depth-gated by design** | `SELF_WAKE_MAX_DEPTH` |
| The attempt limit, then a 10-minute cooldown — no grinding in one sitting | **Always** | `maxAttempts` (player setting, default 2), `COOLDOWN_MS` |
| A silenced subject keeps `/hypno`, emotes and whispers | **Structural** | speech block hooks `ChatRoomSendChatMessage`, after command parsing |
| Feature permissions are booleans checked separately from depth — skill cannot switch one on | **Structural** | `depth.ts` gates are consulted *in addition to* the permission |
| The three `earnedOnly` features stay out of skill's reach | **Proposed above** | §4 |

None of these are touched by anything in this proposal.

### The AFK backstop — DW, settled in shape; details proposed

**The gap.** `design.md` describes an **AFK-block** and an OOC **"Genuine resistance"** setting and
puts them in the absolute column — consent statements the fiction has no business overruling, the
ones skill must never beat. **Neither exists in code.** The only absolute refusal implemented is
`hypnoEnabled` being off, which is all-or-nothing and is not something you leave on while stepping
away from the keyboard. That was tolerable while skill was unbuilt, because nothing could push
through a Fight. Rung 4 is precisely the thing that makes a Fight losable.

**DW's decision: two paths to AFK, either of which stops the attempt.**

| Path | Trigger |
|---|---|
| **Explicit** | The subject sets an AFK flag themselves |
| **Implicit** | They do not answer the induction prompt within its window |

Either way **the attempt does not proceed** — it is refused, not rolled.

**This changes what happens today, and the change matters.** Right now he attempts an induction, the
prompt appears on her screen, and she is not at her desk. Sixty seconds pass. Her client answers
*Ignore* on her behalf and **the induction goes ahead and rolls** (`showPrompt()`'s timer,
`src/session.ts`, whose comment reasons that "silence is neutral, not refusal"). She comes back to
find she went under while she was in the kitchen.

That reasoning was right when nothing could beat a Fight — an absent subject and a passive one
landed in the same place. It is wrong now. Silence is the one state where she cannot make the choice
the roll is about to use against her, and rung 4 is precisely the thing that makes that choice worth
something.

And when the subject *was* flagged AFK, they are told on return that so-and-so tried — deliberately,
so that someone who forgot to clear the flag discovers they are still marked away.

### The details DW asked to have worked out

**1. Does the no-answer path also *set* the flag, or just abort this attempt?**

**Proposal: one timeout aborts only; two consecutive timeouts set the flag.** One missed prompt is a
phone call or a lag spike; two in a row is genuinely away. Setting the flag on a single miss would
mark people away who are merely slow, and the flag has a real cost — it refuses everything until
cleared. The counter is on consecutive misses and resets on any answered prompt.

**2. What does the hypnotist see?**

**Proposal: honest — "They're away from the keyboard."** Three reasons, and I think this one is
clear rather than balanced:

- **There is direct precedent.** The `session-attempt` handler already answers `hypnoEnabled` off
  with the plain *"They aren't open to hypnosis."* It has never pretended that refusal was a failed
  roll, and AFK is the same class of fact.
- **It is one of the project's stated rules.** Design.md rule #5: *a silent success is
  indistinguishable from a silent failure* — anything that refuses must say so. Disguising a refusal
  as a failure is the exact anti-pattern that cost v0.54.0–v0.59.0 several sessions.
- **Kindness is the practical outcome.** A hypnotist who reads "failed roll" tries again twice more
  and then waits out a ten-minute cooldown for a person who is not there. Telling them costs
  nothing and is what a considerate player would want to know.

The thing being disclosed is an OOC availability status, not an in-fiction weakness, so it leaks
nothing about the subject's settings, trust, or choices.

**3. Does the notice queue if several people try?**

**Proposal: collapse, do not queue.** Store name plus a count and deliver **one** line on return:
*"While you were away: Hoshi tried twice, Mira once."* A queue means someone who was away for an
hour comes back to a wall of identical lines, which trains people to ignore it. Cap the named list
at five with "and 3 others"; keep only names, counts, and the time of the most recent attempt.

**4. Does the flag auto-clear on player action?**

This is the one where the two halves of DW's decision pull against each other: auto-clearing on
activity is convenient, but the whole point of the return notice is that *someone who forgot to
clear the flag finds out*. If it cleared itself, there would be nothing to find out.

**Proposal: split by provenance.**

- The **explicit** flag never auto-clears. It is a consent statement the subject made deliberately,
  and clearing it because they typed a message would silently withdraw a protection they set.
- The **implicit** flag (set by two consecutive timeouts) clears on the subject's next sent chat
  line. It was inferred, so it should be revocable by the same kind of evidence that produced it.

That preserves the "you're still marked away" moment for exactly the case DW described — the person
who set it and forgot — while not trapping someone whose connection dropped during a prompt.

**5. What else the flag covers — DW, settled: a player setting.** The subject chooses whether AFK
blocks only induction attempts, or triggers and spoken suggestions as well.

**The asymmetry that makes this worth a setting rather than a constant.** The two cases fail in
opposite directions and neither answer is safe in general:

- **Blocking too much costs a missed beat.** A trigger that does not fire is a scene that does not
  happen. Nothing is left behind; the hypnotist tries again later. It is a disappointment, not a
  problem.
- **Blocking too little leaves an effect running with nobody to release it.** A trigger firing at an
  empty keyboard applies a real state — a freeze, a speech block, a denial lock — to a player who is
  not there to respond, react, or use any of the exits. Design.md already records the worst version
  of this as a deliberate call: a fired trigger with duration **0** has the safeword as its only
  self-serve exit. Fired at an AFK subject, that is a person returning to an effect with no clock on
  it and no memory of it starting.

**Proposed default: block everything — attempts, triggers and suggestions.** Two reasons. The
failure modes are not symmetrical in cost, so the default should sit on the side whose failure is
recoverable, and a missed trigger is recoverable in a way that an unattended effect is not. And it
matches what the flag *means*: "I am not here" is a claim about the whole player, not about one
message type. A setting that said "I am away, but you may still put things on me" is a stranger
thing to be the default than the reverse.

**The narrower option stays available** — a subject who plays with long-running triggers as ambient
texture, and wants them to keep working while they make coffee, can choose attempts-only. That is a
coherent preference; it is just not the one to hand someone who never opened the screen.

**She steps away with something already holding her. Does going AFK let it go? — SETTLED, DW: no.**
The flag stops new things arriving; it does not undo what is already in force. Otherwise "I'm away"
becomes a second safeword, and one that can be used mid-scene without ever admitting to using one.

---

## 7. Interactions and breakage

- **`/hypno chance`** must report the skill term, and whether it was honoured, or the diagnostic
  becomes actively misleading for the subject who reads it.
- **The failure band shown to the hypnotist** (*"slightly relaxed"*, *"almost under"*) is derived
  from `chance`, which now includes their own skill. Their read of how close they got is inflated
  by their own claim. Harmless, mildly funny, worth a comment in the code.
- **Established pairs get more reliable**, since skill pushes high-trust rolls toward the 95 ceiling.
  Blank for an owner + Agree moves from ~11% to ~16% — the same magnitude the RP bonus already
  produces. A tuning risk to watch in play, not a reason to add machinery.
- **Test suites**: anything asserting specific chance values (`rp.mjs`, parts of `relation.mjs`) will
  need updating; the honour rung defaulting to something non-zero means the *existing* expectations
  change for relationship cases even with no skill sent.
- **Recovery**: nothing to do. Skill is per-attempt and session-scoped, like the RP bonus — nothing
  persistent to restore.
- **Trust decay, trigger decay, reinforcement**: no interaction, given skill stays out of
  `depthEarned`.
- **Remote panel / state sync**: no new state to push, and deliberately so — see §3 on not telling
  the hypnotist whether they were honoured.

---

## 8. Extreme mode — PARKED

> ## ⛔ DO NOT BUILD THIS YET
>
> **DW, 2026-09-09: extreme mode is deferred until most existing features are working properly.**
> It is not next, it is not soon, and no part of it should be started as a side-effect of other
> work. The pre-release blockers, the decay live-run, and the high-priority list in CLAUDE.md all
> come first. This section exists so the thinking is not lost, not so it can be picked up.
>
> **The design goal, in one line — DW: extreme should feel more like real life.**

**Status: early notes. This is not a spec and must not be read as one.** It is the questions, the
interactions with what is already decided, and the places where the answer is not actually open.

### What it plausibly is

Design.md already carries the seed, as *Extreme subject level*: an opt-in lock where trigger removal
requires Blank or an architect, settings are gated, decay is disabled, visibility defaults to
Restricted, and a time gate prevents downgrading for a configured period. **DW adds two intentions**
(2026-09-09): extreme players lose access to the advanced stats view, and the safeword *may* be
restricted.

The through-line those share is **opacity and commitment**. Ordinary mode tells the subject
everything — their trust with each person, their depth, what is holding them, how long it has left.
Extreme mode deliberately takes the instrument panel away, so the subject experiences the state
rather than reading it. The time gate is what stops that being a decision you can take back the
moment it stops being fun, which is arguably the point and is also the thing that makes it
dangerous.

### How it interacts with what is already decided

- **The honour ladder.** Extreme mode plausibly implies rung 4, and might well set it. Worth being
  deliberate: does extreme *force* rung 4, or merely default to it? Forcing it means one switch
  changes the roll's behaviour, which is the kind of hidden coupling that this project's
  subject-authority rule exists to avoid. **Proposal: default, not force.**
- **`earnedOnly` off + decay disabled = permanent chemically-seeded triggers. ALLOWED — DW, settled
  2026-09-09.** Reasoning: *people would not have set that combination if they did not want it.*
  Recording it as a deliberate decision rather than an emergent one is the point — it means the
  fast-decay safeguard is understood to be *waived* in extreme mode, not accidentally bypassed. Any
  future change to either feature must not silently re-impose it.
- **Depth gates.** No conflict. They are per-feature consent settings and extreme mode gating the
  *screen* does not change the stored values. But if settings are locked, a subject cannot raise a
  tier back up mid-scene — which is the intended effect and worth stating plainly.
- **The AFK backstop.** No reason for extreme mode to touch it, and a strong reason not to: AFK is a
  statement about the *player*, not the character, and extreme mode is a fiction setting. **Proposal:
  the AFK flag survives extreme mode unchanged.**
- **Advanced stats.** Straightforward now that stats are moving behind a button (§5a) — extreme mode
  hides the button. Note the knock-on: `/hypno chance` and `/hypno skill` are the *command* routes to
  the same numbers, so hiding the screen alone does not achieve opacity. Those would need gating too.

### Gating on BC's own difficulty setting — DW's pattern, verified in the SSS bot

**DW's proposal:** gate extreme mode on the player's difficulty setting in the *base game*, the way
the slave-parking bot does. **I read the bot's source. The mechanism is real and the pattern is
available to us — but the bot does something importantly different from what "extreme mode" here is
being asked to do, and that difference is the whole safeword argument.**

**The mechanism**, from `D:\Games\BC-Bot\SlaveParking\src\parking.ts`:

```
const HARDCORE_DIFFICULTY = 2;   // BC Difficulty.Level >= this = Hardcore

private slaveDifficultyLevel(memberNumber: number): number {
    const d = this.roomCharacters.get(memberNumber)?.Difficulty;
    return (d && typeof d.Level === "number") ? d.Level : 0;
}
```

It reads `Character.Difficulty.Level` straight off the room character, and treats `>= 2` as
hardcore. A player already at that level is **told, not asked** — the bot's comment says so
directly: *"A slave already playing on BC's Hardcore difficulty isn't offered a choice about it —
the room just follows the rules they've already set for themselves."* Players below it get an opt-in
question instead.

**Is the same approach available to this add-on? Yes, and more easily.** The bot reads it over the
wire from room character data; we run *inside* the client, so `Player.Difficulty.Level` is directly
available for the subject's own setting, and `ChatRoomCharacter[i].Difficulty.Level` for anyone else
in the room. Two caveats worth stating rather than assuming:

- **I have not verified the level numbering against BC's own source**, only against what the bot's
  code asserts (`>= 2` = Hardcore). Whether 3 is "Extreme" and how the labels map is exactly the
  kind of thing project rule #8 exists for — check the live client before writing against it.
- BC imposes its own delay on *lowering* difficulty. If that holds, it gives the "time gate prevents
  downgrading" already in design.md's *Extreme subject level* bullet **for free**, enforced by the
  base game rather than by us. Worth confirming; it would be the single best argument for this
  gating.

**⚠ But the bot is not precedent for restricting the real safeword — it is precedent for the
opposite.** What the bot delays is its *own* `!safeword` command, the in-fiction room one. Every
message it sends says so explicitly:

> *"…the room safeword is delayed (whisper !safeword, wait 5 minutes, then whisper it again). Your
> normal Bondage Club safeword still works instantly, always."*

and again in the parked-status line: *"(Your real Bondage Club safeword always works instantly.)"*

So the bot's hardcore mode has exactly the shape recommended below: **a delayed in-fiction exit
layered on top of an untouched real one.** `SAFEWORD_DELAY_MS = 5 * 60 * 1000`, and the flow is
whisper once, wait, whisper again — which is very close to the cooldown DW says he is leaning
toward, already built and already in play.

### The safeword question

**What today's exits actually are** — checked against the code, because the answer turns on it:

| Exit | Today |
|---|---|
| `/hypno safeword` | Unconditional, from any state. `safeword()` → `totalStop()` |
| Untick *Hypnosis Enabled* | `hardFloorStop()`, same teardown — **but see the lock below** |
| 30-minute session timeout | Always armed. Survives a disconnect **with its remaining time, not a fresh 30** (`restoreSavedSession` in `session.ts`) — reconnecting cannot extend a trance |
| Self-wake | Only below depth 40 |
| Hypnotist leaves the room | Nothing handles it. The subject stays under until the timeout |
| Subject disconnects | Local state dies with the page; `Freeze` / `BlockWardrobe` / `DenialMode` ride a server-side item and **come back on reload**, cleared by `hasOrphanedEffects()` on next load. So logging out ends the *session*; logging back in is what clears the *effects* |
| Never returning | Nothing runs. The effects sit on the character until the next load |

**The finding that decides this for me.** `lockedWhileHypnotized` already exists and already locks
the settings screen while under. The code comment on `settingsLocked()` states the consequence
outright: *"`/hypno safeword` remains the way out in every case, and being a chat command it's
untouched by any of this."* The safeword is **load-bearing** for a feature that already ships. A
subject who has locked their settings and is holding a duration-0 trigger has the safeword and
nothing else — design.md flags that combination as DW's deliberate call, and it is only defensible
*because* the safeword is there.

Restrict the safeword on top of that, and the remaining self-serve exit is: wait out a timer you
cannot see, or log out. For a player who is frozen, silenced, at 30% screen fade and cannot open
settings.

### The two exits DW considers sufficient — checked, and one of them does not work

**DW's position:** in extreme mode, resetting the add-on and logging in with it disabled are enough
of an exit. **I checked both. One is solid, one is not, and one is solid only by accident.**

**1. "Log in with it disabled" — depends entirely on which "disabled" is meant.**

- *Add-on on, `hypnoEnabled` unticked:* **works.** `attemptRecovery()` runs on every load and does
  **not** check `hypnoEnabled` before clearing orphans, which is correct and deliberate — the
  no-saved-state branch releases anything hanging off the character with the message *"Something was
  still holding you from before. It has let go."*
- *Userscript disabled in Tampermonkey:* **does not work, and fails in the worst direction.**
  `Freeze`, `BlockWardrobe` and `DenialMode` ride the Emoticon item in `Player.Appearance`, which is
  **server-side and comes back on reload**. `startRecovery()` is what takes them off — and a
  disabled userscript never runs it. So the player logs in still frozen and still wardrobe-blocked,
  with no add-on present to release them. This is the exact failure v0.44.0 was written to fix,
  reachable again by turning the script off instead of reconnecting.

  Turning the add-on back on and reloading *does* clear it. But "disable the add-on" as an escape
  route produces the trapped state rather than curing it, which is the opposite of what it is being
  relied on to do.

**2. `/hypno reset confirm` — does not clear an in-flight trance.** `resetSettings()` replaces the
settings object and saves it. That is all it does. It does **not** call `hardFloorStop()`, does not
touch the module-level session state, does not cancel the session or window timers, does not remove
the Emoticon effects, and does not clear the recovery key — which lives in its own per-account
`localStorage` entry precisely so it is not part of `ExtensionSettings`. After a reset mid-trance
the subject is still frozen, still under, with `hypnoEnabled` now reading false.

**Both are fixable and both should be fixed regardless of extreme mode**, because they are wrong
today:

- `resetSettings()` should call `hardFloorStop()` and clear the recovery key. It is a one-line
  delegation to a function that already exists and already shares its teardown with the safeword —
  the same fix pattern as v0.58.0.
- The disabled-userscript case cannot be fixed from inside a script that is not running. The honest
  mitigation is documentation: "if you are stuck, re-enable the add-on and reload" belongs in the
  tester install guide (pre-release blocker #2).

**Worth checking separately, flagged rather than asserted:** `attemptRecovery()` does not consult
`hypnoEnabled` anywhere, and neither does the restore path. Clearing orphans regardless is right.
Whether a *session* should also be restored for someone whose master switch is off is a different
question, and I have not traced it far enough to say which it does.

**My honest view — three things must stay unconditional in every mode, and the reasons differ:**

1. **A reachable, seconds-scale exit the subject can trigger alone, without leaving the game.**
   Whether it is still called the safeword is negotiable. Its existence is not. The population that
   enables extreme mode is by construction the one that will be deepest under, most restricted, and
   least able to navigate a settings screen — which is exactly the population for whom "just log
   out" is the worst possible answer, because it converts a scene problem into leaving.
2. **The master switch (`hypnoEnabled` off).** Extreme mode gating settings is the whole idea, but
   this one control must stay reachable, or the design has built a locked room and thrown away the
   key. If settings are gated, this needs its own always-available route — a command would do.
3. **Logout/disconnect must never leave state that a reload does not clear.** Mostly true today via
   `hasOrphanedEffects()`; extreme mode must not add anything that survives it. Arguably
   `releaseOnDisconnect` should be forced on in extreme mode, though that cuts against the fiction.

**What could legitimately change, and the honest tradeoff of each:**

| Option | What it buys | What it costs |
|---|---|---|
| **Two-stage safeword** — first call gives an in-fiction struggle message, a second within ~10s stops everything | Removes the *accidental* and the *reflexive* use, which is most of what "restricted" is reaching for. The subject controls the clock | Almost nothing. This is the strongest option |
| **Quiet exit** — a second command that ends the session *without* the "They used their safeword. Stop." announcement | Lowers the social cost of leaving, which likely makes people use the exit *more*. Arguably should exist regardless of extreme mode | The hypnotist loses the OOC stop signal, so it must be a distinct command, not a replacement |
| **Short delay** — safeword takes effect after N seconds with a countdown | Preserves fiction; the trance "resists" | A wait is worst exactly when it is needed most. If used, N is seconds, not minutes |
| **Cooldown after use** | Stops the safeword being used as an in-fiction escape hatch | Punishes a second genuine need. I would not ship this |
| **Both parties must have enabled extreme** | Makes it a negotiated mode rather than a unilateral one | Only helps if the hypnotist's flag is trustworthy — and it is on their client, so it is a *declared* value with the same caveats as skill |
| **Requires an established relationship** (owner/lover, or a trust threshold) rather than a stranger | Targets the actual risk: a stranger you met ten minutes ago holding the restricted-exit switch | Rules out a scene some players specifically want. Cheap to implement — `relationshipWith()` already exists |
| **Hard time limit** — extreme sessions capped, always | A guaranteed floor under the worst case | Needs the cap to survive disconnect. It already does |

### SETTLED 2026-09-09 — the shape of extreme mode

- **Safeword: the SSS bot's delayed pattern.** Subject asks, is told they must wait, asks again after
  the period, and is released. Period **5 minutes**, matching the bot. I have no argument for 10 —
  see below.
- **Extreme does not vary by partner.** Same rules with everyone. The established-relationship
  requirement is dropped.
- **The hypnotist must be running the add-on, but need not be in extreme themselves.**
- **Extreme does not change depth**, or how deep a trance goes. It affects session length and trigger
  decay instead.
- **The stats *command* is disabled too**, not only the screen — `/hypno skill` and any equivalent are
  unavailable in extreme.
- **A room announcement when the safeword is first requested** — DW's addition, not in the bot.

### The release: second call, or automatic at expiry?

DW asked for confirmation that the **second call** is what releases. In the bot, yes — the flow is
whisper, wait, whisper again. **I think we should invert it here, and the reason is a difference
between the two situations rather than a disagreement with the bot.**

The bot's delayed safeword sits *on top of* BC's real safeword, which still works instantly — every
message it sends says so four separate ways. A subject in that room who asks once and then goes
quiet still has an instant out. In our extreme mode, the delayed safeword *is* the safeword. A
subject who asks once and then walks away, disconnects, gets distracted, or is simply too far under
to remember, **stays under** — and the thing they asked to end does not end.

The principle: **the default outcome should be the safe one, and the action should be required from
the person who is fine, not from the person who is not.** Someone who has just used a safeword is by
definition in a state where "remember to do a second thing in five minutes" is a poor thing to rely
on.

**Proposal: the request releases automatically at the end of the period, and the subject may cancel
it during the window** — `/hypno safeword cancel`, or any equivalent — if the visibility fixed
whatever was wrong and they want to carry on. A second safeword call during the window releases
immediately rather than restarting anything, since asking twice can only mean more certainty, not
less.

That keeps everything DW wants: the wait is real, the scene has five minutes to repair itself, and
"we sorted it out and continued" remains available — but it is a positive act by someone who is now
okay, rather than the price of not acting while distressed.

### The room announcement — DW's addition

**The intent, and I think it is the best idea in this section.** She asks to stop. Before the timer
has done anything, the room reads that she asked — and in most cases somebody stops, or asks if she
is alright, or the hypnotist backs off on his own. The thing she needed was for someone to notice.
The announcement gives the five minutes a job to do rather than making her sit through them.

**Channel — verified in code.** It must come from the add-on, not from the subject's own speech, and
`notify.ts`'s `tellRoom()` is the right vehicle. It uses `ChatRoomSendEmote`, and our speech block
hooks `ChatRoomSendChatMessage`, which per `main.ts` "runs AFTER command parsing and after the emote
and whisper branches". **So a silenced or entranced subject can still emit this.** Confirmed, not
assumed.

**Two gaps that must be closed or the announcement silently does not happen:**

1. **`tellRoom()` is gated on `roomSeesReactions`** ("Others See Your Reactions", on by default but
   a real setting people turn off). The safeword announcement **must bypass that gate.** It is not a
   reaction; it is a request for help.
2. **`ChatRoomSendEmote` honours BC's owner rule that can block emotes** — deliberately, per the
   comment in `notify.ts`, because that is somebody's consent setting. Which means **an owner can
   suppress the announcement.** There is no guaranteed room-visible channel for us if emotes are
   blocked.

   Consequence, and it must be written into the design rather than discovered: **the announcement is
   best-effort and must never be load-bearing.** The actual exit is the timer. If the announcement is
   ever treated as the safety mechanism, an owner rule quietly removes it. Fallback when the emote
   fails: tell the subject it could not be posted, and whisper the hypnotist directly.

**Proposed wording.** Plain, OOC in register, and unmistakably not part of the fiction — this is the
one message that must not read as flavour:

> *"Missy has asked to stop. Release in 5 minutes."*

and at release:

> *"Missy's request has taken effect. Everything has been released."*

**Does it name the hypnotist?** **Proposal: no.** Naming them turns a request for help into an
accusation in front of an audience, which raises the social cost of using it — the exact opposite of
the intent. The room can see who she is with. The hypnotist should be told directly and privately,
which they will be anyway through the session state push.

**Does it repeat or escalate? Proposal: no repeat, no escalation.** One announcement at request, one
at release. A countdown that nags turns a serious message into wallpaper, and escalation would make
using the safeword progressively more embarrassing.

**Does the second call announce?** Under the inverted model above there may be no second call. A
cancel should announce — *"Missy has withdrawn her request."* — because the room was told something
was wrong and is owed the resolution. An early release announces as the release line.

**How this could be gamed or could hurt someone:**

- **Outing.** The announcement makes a private difficulty public. Mitigated by not naming the
  hypnotist and by keeping the wording flat, but not eliminated — someone in a busy room gets an
  audience for their worst moment. **Worth a setting to suppress the announcement while keeping the
  delayed safeword**, accepting that it then loses the repair window.
- **Suppression by an owner rule** — above. The person with the most power in the scene is the one
  who can turn off the visibility.
- **Weaponised requesting.** A subject could request-and-cancel repeatedly to spam the room or to
  make a hypnotist look bad. Low harm, but a rate limit — one announcement per N minutes — costs
  nothing.
- **Reading it as fiction.** If the wording is atmospheric at all, a hypnotist may treat it as part
  of the scene and escalate. Hence flat, OOC phrasing, and hence not naming it "safeword" in a way
  that sounds like a struggle.

### Availability vs participation — the way out of extreme

**DW's problem, played out, and it is a real one.** She set BC to hardcore months ago for unrelated
reasons. She installs this, and extreme switches itself on because of that old setting. She decides
she does not want it — and finds the add-on cannot turn it off, because the game setting is what
granted it. Her only route out is to disable the userscript until she can change the game setting.
And per §8's earlier finding, that is the *worst* thing she can do: a script that is not running
cannot clear the effects that come back on reload, so she logs in still frozen.

**Does an install-time opt-out undermine the commitment?** Partly, but the bigger problem is that it
is the wrong moment: at install nobody knows what they are opting out of, and the decision cannot be
revisited. It answers the question badly rather than answering it wrongly.

**Recommendation: DW's own middle option, with one addition — the time gate moves onto the add-on
setting.**

- **BC's hardcore difficulty gates *availability*.** Below it, extreme cannot be switched on at all.
  This keeps the "you have already told the game who you are" quality DW likes about the SSS pattern.
- **An add-on setting gates *participation*.** Nobody is in extreme merely because of a game setting
  they chose for unrelated reasons — they opt in here, deliberately.
- **The time gate applies to the add-on setting**: instant to turn on, and only removable after the
  configured period. That is where the commitment lives, and it no longer depends on BC's difficulty
  mechanics at all.
- **Lowering BC difficulty mid-commitment does not end participation.** Availability is checked at
  opt-in only. Otherwise the game setting becomes an instant extreme-exit and the gate means nothing.

This resolves the whole problem: the way out of extreme is a setting the add-on owns, on a clock the
add-on enforces, and at no point is "disable the userscript" the answer.

### What extreme changes instead of depth

**Depth is untouched — DW, settled.** Extreme does not make trances deeper or gates easier. What it
changes is how long things last.

**Longer sessions.** Today her trance ends after 30 minutes no matter what (`SESSION_TIMEOUT_MS`,
`src/session.ts`). Raise that and the scene changes shape: he can put her under, leave her there,
and go and do something else — talk to someone, deal with another subject, simply not come back for
a while — and she is still under when he returns. The trance outlasts the conversation that made it,
which is a good part of the appeal. **Proposed magnitude: 60–90 minutes, not unlimited.**
The timeout is one of the three exits I argued must stay unconditional, and an infinite session
deletes it.

> **⚠ Note, though this is no longer a blocker.** If he vanishes mid-trance, nothing releases her —
> **and as of 2026-09-10 that is a settled decision, not a gap**: she uses `/hypno safeword` or
> `/hypno reset`. What longer sessions change is that the timeout stops being a practical backstop,
> so in extreme the safeword is genuinely the answer rather than the fallback. Worth stating in the
> tester documentation. Reasoning in design.md, *Control & Reset > The hypnotist vanishing mid-trance*.

**Slower trigger decay.** He plants a word in her while she is in extreme. Ordinarily it starts
fading from the moment he stops reinforcing it; here it holds on longer without him having to come
back and refresh it. What he left in her outlasts his attention. **Proposed magnitude: shift the subject's chosen rate one named step slower, rather than
imposing a rate** — it respects a setting they made instead of overriding it, and it cannot make
someone's triggers *faster* than they chose.

**Does it conflict with the approved permanent-trigger combination?** **No — the two simply do not
interact.** If decay is already `never`, "one step slower" is a no-op; nothing is slower than never.
The modifier only matters for extreme players who deliberately left decay on, which is the more
moderate subset. Worth stating explicitly so nobody later reads a conflict into it.

**One thing that must be stated rather than left emergent:** the *fast-decay safeguard* for
chemically-seeded triggers. DW has already approved waiving it in extreme by allowing `earnedOnly`
off plus decay disabled. Extreme's decay modifier should be understood to apply to the safeguard too
— consistent with that decision, but it needs writing down, because a future reader would otherwise
reasonably assume the safeguard is exempt.

### The live question that remains: fully locked, or a cooldown

**Option A — fully locked safeword.** The safeword does nothing in extreme mode. Exits are the
session timeout, the add-on reset, and logging out.

*For:* it is the only version that fully delivers "no way out until it ends", which is the fantasy.
*Against:* the two exits DW is relying on are the two I just found broken or misleading (above), so
today this option's real fallback is "log out, re-enable, reload" — a three-step recovery discovered
while panicking. It also removes the exit that `lockedWhileHypnotized` is documented as depending
on. And it is *not* what the SSS bot does, despite being the precedent cited: the bot delays its own
safeword and says four separate times that the real one still works instantly.

**Option B — cooldown, then release on a second request.** `/hypno safeword` in extreme mode
acknowledges, starts a visible clock (proposed ~10 minutes, DW's figure), and a second safeword
after the clock stops everything. This is **exactly the SSS bot's shipped hardcore mode**, at
`SAFEWORD_DELAY_MS = 5 * 60 * 1000`, with the flow *whisper once, wait, whisper again* — already in
play, already understood by the players who use that room.

*For:* the fiction gets its "you cannot simply say the word" without the exit ever being unreachable.
The subject controls the clock. It has a working precedent in DW's own code, at half the proposed
duration. It composes with everything else — no interaction with `lockedWhileHypnotized`, no
dependence on the broken reset path.
*Against:* ten minutes is a long time to be in a state you have just asked to leave. The bot uses
five. **Recommendation: five minutes, matching the bot**, on the grounds that a number already
survived contact with real players.

**A refinement worth considering with B:** distinguish *"I want out of the scene"* from *"I want out
now"*. The cooldown applies to the first. A second, differently-named command — or the same one
twice in quick succession — could remain instant, on the understanding that using it is an OOC stop
rather than an in-fiction one. That is the same two-stage shape recommended below, and it is what
makes the cooldown safe rather than merely slower.

**My recommendation, if DW wants a shape to react to:** Option B at five minutes, plus a quiet exit,
plus extreme mode requiring an established relationship. That delivers "the safeword is not a reflex
you can hit by accident" — which I believe is the real goal — without ever making the exit
unreachable.

**On the precedent DW raised** (other add-ons remove the base game's safeword): that is true and
worth taking seriously as evidence about what players want. It is also not quite the same thing. BC's
safeword releases restraints; ours releases restraints *and* a mental state the subject may not be
able to reason clearly about, on a client whose entire architecture is built on the subject being the
authority. The closer precedent is our own `lockedWhileHypnotized`, which took the settings screen
away and left the safeword — and that shipped, and works.

### Answered 2026-09-09

- **`earnedOnly` off + decay disabled** — allowed, deliberately. (Above.)
- **Does the hypnotist need an indicator that the subject is in extreme mode?** **No** — if extreme
  is gated on BC's own difficulty setting, that setting is already visible to the other player, so
  the hypnotist knows by looking. **⚠ Note for the future: this answer is a consequence of the
  gating, not independent of it.** If extreme ever becomes an add-on setting rather than a
  base-game one, or if the gate is loosened to an opt-in for players below the difficulty
  threshold, an indicator becomes necessary again and this decision must be re-opened.
- **Does going AFK release what is already holding you?** **No.** Settled. The flag stops new things
  arriving; it does not undo what is already in force, which would make it a second safeword and
  invite it as a fiction-breaking escape.

### Still open

**Moved.** Every unanswered question in this document — extreme mode's included — now lives in one
place: **§10, *The list to work through*.** Nothing is tracked here any more, so there is only ever
one list to read.

---

## 9. The starter set — a first-launch "sensible defaults" button

**Not a wizard.** DW is leaving the wizard alone; this is the cheap stand-in already on CLAUDE.md's
list as *First-launch guidance*.

**The problem, played out.** Two people install this because they want to try it together. He opens
her Information Sheet and attempts an induction. Her client refuses it outright — `hypnoEnabled` is
`false`, like every other permission in `defaultFeatures()` (`src/storage.ts`) — and all he is told
is *"They aren't open to hypnosis."* She has not refused him; she has not been asked anything. She
opens the settings screen and finds nine unticked boxes with no indication which ones matter or in
what order. Neither of them can tell the difference between the add-on being off and the add-on
being broken, and the first thing it did was make her look like she had said no.

**The principle for what goes in — reused, not invented.** The line is the same one `earnedOnly`
already draws: **nothing that outlives the session, and nothing that tells the subject something
untrue about their own body.** Everything in the starter set is session-scoped, obviously
reversible, and stops the moment the trance does.

**Proposed set — five switches:**

| Setting | Why it is in |
|---|---|
| `hypnoEnabled` | Without it nothing works. This single flag is the difference between "installed" and "appears broken" |
| `movementRestriction` | The signature effect. Visible, immediate, releases cleanly |
| `speechRestriction` | The other iconic one — and safe, since `/hypno`, emotes and whispers all survive it by construction |
| `postureControl` | Kneel / stand. The mildest thing on the list; adds variety at no stakes |
| `clothingRestriction` | Wardrobe block. Reversible, obvious, and it has an attempt message so it never fails silently |

The trance defaults (`tranceCannotMove`, `tranceCannotSpeak`, `tranceScreenFade`,
`roomSeesReactions`) already ship on and need no button.

**Deliberately out, with reasons:**

- **`triggerControl` and `carryForward`** — these *outlive the trance*. Nothing that persists past
  the session should ever arrive by default.
- **`illusionControl`** — it makes the subject's own screen tell them something untrue. `storage.ts`
  already singles this one out for exactly that reason when explaining why
  `tranceClothingFreeze` ships off.
- **The three `suppress*` awareness flags** — same category: being unable to notice what is being
  done to you is not a starting position.
- **`arousalControl`** — more intimate than the rest, and historically the one with revoke bugs.
- **`undressControl`, `selfTouchControl`** — both more personal than anything above, and neither is
  needed to demonstrate what the add-on does.
- **`lockedWhileHypnotized`** — it removes an exit. Never a default.

**Two details that matter more than the list:**

1. **The button must say what it did**, listing the five it turned on, and it must be one click to
   undo. A button that silently changes consent settings is the wrong shape regardless of how
   conservative the settings are.
2. **It should be offered, not applied.** First launch shows the note and the button; it does not
   pre-tick anything. The difference between "we set this up for you" and "shall we set this up for
   you" is the whole ballgame for a consent tool.

**Also worth fixing while nearby, unrelated to the button:** ~~`MAX_ATTEMPTS` is 3 in code, but
design.md records the decision as *"default 2, with 3 available as a player setting"*. That is a
made decision that was never implemented, not a placeholder.~~ **Done in v0.65.0** — it is
`maxAttempts` in storage.ts now, defaulting to 2, with a button on the Permissions tab.

---

## 10. The list to work through

**This is the only open-questions list in this document.** §8 used to keep its own; it now points
here. Each entry leads with what happens in play, carries a technical note for whoever implements
it, and says whether anything is waiting on it.

### Everything settled so far — 2026-09-09

Recorded so nothing gets re-litigated: the **"declared and visible"** model itself · **rung 4 is
labelled "Skill can beat my resistance"** · **default is rung 2, stored sparsely** · **rung 3 caps
the honoured value at 30**, matching `STRANGER_CEILING` · fresh installs may select rung 4 · skill
counts toward `depthFull` only, never `depthEarned` · skill is derived from the hypnotist's own
induction count, transmitted as a 0–100 value, never as a bonus · the practice cap is earning-only
and non-blocking · **dual fatigue ships before rung 4**; rungs 1–3 may ship first · the hypnotist is
never told whether their claim was honoured · AFK has two paths, blocks the attempt outright, and is
a player setting defaulting to block-everything · AFK does not release what is already holding you ·
the AFK refusal is honest to the hypnotist · notices collapse rather than queue · the explicit AFK
flag never auto-clears, the inferred one clears on the next chat line · Stats tab demoted behind
Advanced.

**Extreme mode, settled but PARKED** (do not build — §8): SSS-bot delayed safeword at **5 minutes** ·
a **room announcement** on first request · extreme **does not vary by partner** · the hypnotist must
run the add-on but **need not be in extreme** · extreme **does not change depth**, it changes session
length and trigger decay · the stats **command** is disabled too, not just the screen ·
`earnedOnly`-off plus decay-disabled is **allowed** · no separate hypnotist-facing indicator, *because*
of the BC-difficulty gating.

---

### A. Blocking work — answer these before the relevant code is written

**A1. Fighting must never make it easier for him — ✅ DECIDED 2026-09-10, BUILT v0.62.1.**
Below an honoured skill of 50 the formula gave a fighting subject *worse* odds than one who did
nothing. A flaw, not a choice, and approved for fixing.
*Implementation:* in `inductionChance()` (`src/session.ts`, alongside `RESISTANCE_FLOOR` / `CHOICE_MODIFIER`),
compute Ignore's chance first and use it as a hard upper bound on Fight's,
expressed as an **invariant** so it survives any later retuning of the weights — not as a tuning
pass. **Ships with a swept test assertion** across trust, skill, rung and experience; the failure is
invisible at any value a person would check by hand, which is how it survived two passes here.
*Was blocking rungs 1–3. Done — it was the first piece of work in that tranche, and no longer
blocks them.*

*As built:* `inductionChance()` computes Ignore's chance and takes `Math.min` of it with Fight's, as
the last step, so the rule holds over whatever the terms add up to rather than over one arrangement
of them. Nothing about the live odds moves — no term in the formula carries skill yet, so the
inversion is not reachable today and the invariant is inert. It is here to be true when the ladder
lands. `test/odds.mjs` sweeps 23,936 states with the proposed §A2 terms supplied through a
test-only `skill` argument (the additive and the Fight floor, at the parked `0.35`/`0.25` weights)
across trust, experience, relationship, skill 0–100 and all four honour rungs, plus every state the
live formula can reach; it fails without the `Math.min`. The weights are still parked — the suite
models them to prove the rule and must keep passing if they move.

**A2. Is a fought induction against an expert a coin flip, or a losing battle? — ⏸ PARKED until
dual fatigue exists.**
**Do not pick this up early.** The two weights (**proposed** `0.35` additive and `0.25` on the Fight
floor, both landing in `inductionChance()`, `src/session.ts`) decide
how much of the gap between "he is skilled" and "she said no" the skill closes — and **dual fatigue
reshapes exactly this axis**, so any number chosen now would be tuned against a model that is about
to change. Deciding it early means deciding it twice.
*Standing recommendation, for when it unparks:* neither extreme — the current numbers already give a
coin flip on any single attempt (~25%) and a losing battle across a session (~58%), which puts the
drama in persistence rather than in one roll.
*Also thin as written:* it names the two weights but never shows what the alternatives would feel
like. **Before this is decided, work up the alternative weightings with worked session numbers**, so
there is something to compare against rather than one option with a caveat.
*Blocks rung 4 tuning only. Rungs 1–3 do not wait on it.*

**A3. Should her impression of him reflect what he claims, or only what she has let through? — ✅
DECIDED 2026-09-10: the honoured value, AND the wording reframed to describe her instinct rather
than him. The two halves are joined — see the boxed warning in §3.**
On the capped rung the values differ: he is genuinely an expert, but her setting only lets a third
of it reach her.
*Technical:* claimed value versus post-rung honoured value, consumed where the descriptor clause is
built for `showPrompt()` (`src/session.ts`). Only differs on rung 3.
*Why honoured:* showing her a threat her own setting neutralises is misinformation that makes her
fight nothing. And reading the claimed value would make the claim itself into currency, rewarding
inflation — reading the honoured value means lying about your skill only affects people who already
chose to listen. That is a real anti-gaming property.

#### A3a. "Where is this impression coming from?" — DW, 2026-09-10

**The mechanical trace**, with anchors:

| Step | Where |
|---|---|
| His client derives a 0–100 value from its own lifetime induction count | `valueFromCount()`, `src/curve.ts` — same curve as trust |
| The value rides on the attempt message beside `hypnotistName` | `session-attempt` hidden handler, `src/session.ts` |
| Her client applies her honour rung — rung 1 discards, rung 2 scales by `trust/100`, rung 3 clamps to 30, rung 4 passes whole | **proposed** `skillHonour` in `HypnoAddonSettings`, `src/storage.ts` |
| The honoured result picks a descriptor band | **proposed**, in the descriptor clause builder for `showPrompt()`, `src/session.ts` |
| The clause is appended to the one notify line | `showPrompt()` → `tellPlayer()`, `src/notify.ts` → `ChatRoomSendLocal` |

So it is **bracketed and private to her**. The room never sees it and neither does he.

**The fiction problem is real, and the honoured-value decision makes it sharper rather than
softer.** The number behind the string is his lifetime practice across every subject he has ever
had — something she has no in-fiction access to, especially if they have never met. Worse: because
the string is filtered through *her own setting*, two subjects standing in the same room, looking at
the same man, would read him differently. That is not perception. That is a UI preference leaking
into the fiction.

**Which means the placeholder wording is what is wrong, not the pipeline.** "He carries himself like
someone who has done this many times" is a claim *about him*, and the value cannot support a claim
about him. The same number supports a claim **about her** without strain.

**Recommended framing: her own instinct, not a fact about him.** Something like *"Something in the
way he says your name makes you want to sit down."* This needs no data the client lacks, it survives
her never having met him — instinct does not require acquaintance — and it makes the per-subject
filtering coherent, because wariness is a property of the person feeling it.

It also resolves a wrinkle the other framings cannot. Under the **rung 2 default**, a stranger's
claim is honoured at zero, so **no descriptor appears at all** — which as a statement about him would
be a gap, but as a statement about her reads exactly right: *she has no instinct about this person
yet.* The mechanic and the fiction land on the same answer without either being bent.

**Two alternatives, and why they are weaker:**

- **Ground it in what he actually does — how he speaks to her.** The client does have this
  (`noteInductionLine`, `session.rpLines`). But it measures *effort in this scene*, not skill, and it
  arrives during the induction window, which is **after** the prompt has already been shown. So it
  cannot feed this line. It could support a *second* beat later in the window, which is a genuinely
  nice idea and a separate feature.
- **Reputation — "you have heard of him."** Would need cross-player data the client does not have.
  Her client knows only her own history with him, which is *familiarity*, not global skill — and it
  is zero in precisely the stranger case where the descriptor question bites. **Not available.**

### B. Cosmetic or deferrable — nothing waits on these

**B1. The exact prose of what she feels.** *Register settled 2026-09-10 — her instinct, behavioural,
never evaluative, three bands. Only the wording is left.*
*Technical:* the placeholder table in §3, consumed by the descriptor clause builder in
`showPrompt()` (`src/session.ts`). Wording parked by DW.
*Remaining recommendation:* keep every line a sentence about what she notices in **herself** — no
line may make a claim about his history or experience, or the A3a reasoning breaks.

**B2. How fast should a hypnotist stop getting better at this?**
The ceiling exists so nobody grinds reputation by throwing attempts at a friend. What it is *called*
is the open part — anything with "fatigue" in it will fuse with the unbuilt dual-fatigue system.
*Technical:* shortlist of four in §5. The counters it caps are `ATTEMPT_EXPERIENCE` / `INDUCTION_EXPERIENCE` in `src/trust.ts`, mirrored for the hypnotist side.
*Recommendation:* **"skill plateau"**, but this is close to a coin toss and not worth much time. It
says the true thing — you have not lost anything, you have stopped gaining.

### C. Extreme mode — parked, answer whenever

Do not build any of this yet (§8). Recorded so the thinking survives.

**C1. Does the release need her to ask a second time, or does it just happen?**
*Technical:* `safeword()` and the shared `totalStop()` teardown, `src/session.ts`; the bot's constant
is `SAFEWORD_DELAY_MS` in `SlaveParking/src/parking.ts`.
*Recommendation, and the one I would push back on if overruled:* **invert the bot's pattern.** The
timer releases her by default; she may **cancel** during the window if the room fixed things; a
second call releases immediately. The bot's delayed safeword sits on top of BC's real instant one —
ours would not, so a subject who asks once and then walks away, disconnects, or is too far under to
remember simply stays under. The default outcome should be the safe one, and the action should be
required from the person who is fine, not the person who is not.

**C2. She wants out of the mode itself, not out of the scene. Two days early.**
Is there an appeal, or is it no until the period is up? And how long is the period?
*Technical:* under the availability/participation split, the gate lives on the **add-on** setting
(**proposed**, in `HypnoAddonSettings`, `src/storage.ts`) rather than on BC's `Character.Difficulty.Level`,
so the period is our constant to choose.

**C3. Does she get to keep the announcement private?**
The room message is the best idea in this area and also the one that makes a bad moment public.
*Technical:* a per-subject toggle (**proposed**). The announcement itself goes via `tellRoom()`
(`src/notify.ts`) and must bypass the `roomSeesReactions` gate wired at `src/main.ts`. Note that an
owner's emote-block rule inside `ChatRoomSendEmote` can suppress it regardless, so it can never be
relied on as a safety mechanism.

**C4. Does turning extreme on quietly change how hard she is to hypnotise?**
*Technical:* whether extreme writes the **proposed** `skillHonour` setting or merely defaults it.
*Recommendation:* extreme sets rung 4 as a **visible default she can change**, not a forced value.
One switch silently changing every roll is the hidden coupling this architecture exists to avoid.

**C5. How long should a trance run, and how much slower should triggers fade?**
*Recommendation:* **60–90 minutes, not unlimited** — the timeout is one of the exits that must stay
unconditional. Decay: **one named step slower than the rate she chose**, so it respects her setting
and can never make triggers fade faster than she picked.
*Technical:* `SESSION_TIMEOUT_MS` (`src/session.ts`) and the `triggerDecayRate` ladder (`src/storage.ts`).
Longer sessions push the timeout further away, which by the 2026-09-10 decision means the safeword is
the intended answer if he vanishes — not a gap to be closed.

---

## 11. Verification caveats

Two things in this document are **not** verified and must not be read as settled fact.

**BC's difficulty level numbering.** §8 relies on `Character.Difficulty.Level >= 2` meaning Hardcore.
That is taken from the SlaveParking bot's own assertion (`HARDCORE_DIFFICULTY = 2`), which is
presumably right since the bot works — but it has **not** been checked against BC's client source,
and neither has whether level 3 is "Extreme", how the labels map, or whether BC really imposes a
delay on *lowering* difficulty. That last one is load-bearing for the time-gate argument. Project
rule #8 exists for precisely this: verify against the live client before writing any of it.

**The test count.** Different documents have claimed 748 and 842 checks. A run of the committed
bundle in a Linux sandbox tallied 658 across nineteen suites, but suites print nested sub-totals so
that arithmetic is unreliable. **Read the number off `npm test`; do not trust any figure written
down.** All suites pass.
