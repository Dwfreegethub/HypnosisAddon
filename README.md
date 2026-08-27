# BC Hypnosis Add-on

*Planning session notes — work in progress*

---

## Philosophy

Real hypnosis is based on **trust, rapport, and accumulated experience** — not instant control.
This add-on takes that seriously. Depth of access grows over time through genuine relationship-building, not through force or a single command.

Drugs and arousal can influence the process but cannot substitute for real trust. Hard limits are absolute.

---

## Core Mechanic: Trust as a Depth Gate

**Trust** is the primary variable. It is:
- Per-hypnotist (tracked separately for each person, 0–100%)
- Stored on the **subject's** side ("how much do I trust person X")
- Built over time, not granted instantly

Rather than fixed tiers, trust is a percentage. Each feature has a **player-adjustable threshold** — the trust % required for that feature to become accessible. In the zone near the threshold, outcomes are probabilistic (resistance mechanic applies). Well above the threshold, effects are near-certain.

---

## What Builds Trust

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
- BC arousal level acts as a temporary multiplier on effective trust
- Higher arousal = lower inhibitions = hypnotist can go slightly deeper than base trust would allow
- Effect is temporary and session-only; does not permanently increase trust

### 4. Drugs (temporary blunt instrument)
- Can shift effective trust **up or down** temporarily
- Player-adjustable: character can be set as "drugs relax my guard" or "drugs make me paranoid"
- **Hard rule:** drugs cannot be used to plant triggers or lasting suggestions
- Drugs open or close the door temporarily; they cannot write anything permanent

---

## What Lowers Trust

- Violation of hard limits
- Suggestions that fail (subject resists)
- Time apart — **decay rate is a player setting** (some characters: "once trust is built it stays"; others: "out of sight, out of mind")
- RP trust break: subject can invoke a "that broke my trust" response after a violation, which explicitly docks trust with that person
- Direct menu adjustment (OOC, explicit)
- **Trust-withdrawal command** — freely available, easy to use; naturally inaccessible when the subject is bound/gagged (BC bondage is the lock, not an artificial system setting)

---

## Control & Reset

**Three layers:**

**Hard floor — always yours.** Panic/safeword equivalent. Always works regardless of trance state or bondage. Clears active trance, suspends all effects, restores full menu access. Cannot be taken away.

**RP layer — feels locked, isn't literally.** A hypnotist can plant a suggestion like "you won't try to remove your triggers." If the subject has OOC-consented to that depth, the UI shows resistance flavor text when editing — but the underlying data is still editable. Experience of being locked without removing the safety valve.

**Full lock (opt-in).** Some players want to be genuinely locked out of changes. Available as an explicit setting. Still subject to the hard floor override.

**Reset:**
- Hard reset (LSCG-style) always available — restores factory defaults
- **Named save states** — reset to a specific saved configuration rather than factory defaults (e.g., "reset to how my owner set me up")

**Architect role — the owner model:**
- One designated person has highest access to the subject's hypnosis profile
- Sets base configuration: features enabled, triggers, thresholds
- Other people can use installed triggers (within their scope) but cannot add/remove or change core settings
- Subject can explicitly grant architect status, or trust can automatically elevate someone above a high threshold
- Subject can always revoke via hard floor override

---

## The Hypnotist's Side: Skill

Two dimensions:

**Global skill** — grows through practice across all subjects. Affects induction success rate and suggestion precision.

**Per-subject familiarity** — grows through sessions with a specific person. Determines depth ceiling with that individual.

A skilled hypnotist needs less time to build trust; their suggestions land more reliably.

---

## Trust Percentage & Feature Thresholds

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
| Clothing illusion | 70% |
| Bondage illusion | 75% |

**In the zone (near threshold):** outcome is probabilistic, resistance mechanic applies.
**Well above threshold:** near-certain success.
**Below threshold:** blocked entirely.

---

## Triggers

- Planted during induction sessions by the hypnotist
- Fire when the trigger word/phrase appears in chat
- **Scope:** per-person (only fires when a specific person says it), per-list, trust-threshold, or anyone
- **Fade over time** if not reinforced — untriggered or un-refreshed suggestions weaken
- Hypnotist must periodically reinforce triggers (brief re-induction) to maintain them
- Creates ongoing relationship mechanic rather than "plant and forget"

### Accidental collateral effect
If other players are in the room during an induction, those with high base suggestibility or existing trust with the hypnotist could be partially pulled in — opt-in setting. Enables group induction and emergent unintended side effects.

---

## Gamification: Fighting Off Suggestions

When a suggestion lands near the threshold (probabilistic zone):
- Subject gets a **resistance mechanic** — a contest, not an instant block
- Subject can also **consciously allow** a borderline suggestion
- **Arousal level** affects resistance (higher arousal = harder to resist)
- **Drug state** affects resistance (depends on type and player settings)
- Trust level determines the base difficulty

---

## Hard Limits

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

## Feature List

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

## Perception / Illusion Features (detail)

### Clothing Confusion
Targets the subject's information environment — not their actual state.

- **Suppress BC clothing messages** — subject never sees "X removes your dress" or "X puts Y on you"
- **Block wardrobe access** — intercept UI clicks; wardrobe shows nothing, scrambled info, or wrong state
- **Client-side rendering** — subject's view shows clothed when naked or vice versa
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

## Player Settings

| Setting | Description |
|---------|-------------|
| Base suggestibility | How quickly trust builds with anyone |
| Same-room-time trust | Toggle — passive trust from time alone together |
| Trust decay rate | How fast trust fades without interaction |
| Drug response | Whether drugs raise or lower effective trust |
| Hard limits | List of always-blocked actions |
| Auto-accept depth | Trust % at which induction acceptance becomes automatic |
| IC stance | RP flavor: resistant / neutral / open |
| OOC preference | Whether mechanics actually work |
| Feature thresholds | Per-feature trust % required (adjustable) |

---

## Technical Architecture Notes

### Data storage
- Subject stores: trust per hypnotist, personal settings, hard limits, active triggers, trigger strength/decay
- Hypnotist stores: global skill, per-subject familiarity, planted trigger records
- Data must persist across sessions

### Sync between players
- Communication via BC's Hidden chat message system (same pattern as BCX/LSCG)
- Trust values are subject-authoritative — subject's client is source of truth
- Hypnotist's commands are requests; subject's add-on decides whether they succeed

### Add-on loader compatibility
- Ship as standalone Tampermonkey userscript
- Structure for FUSAM compatibility

---

## Development Stages

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

### Todo (staging TBD)
- Trust accumulation engine (conversation tracking, time weighting)
- Induction flow (command → prompt → acceptance → trust gain)
- Trigger system (plant, scope, fire, decay)
- Resistance mini-game
- Clothing illusion (rendering override)
- Bondage illusion (Tier 2 mental version)
- Collateral effect system
- Arousal integration
- Drug integration
- Architect role / permission hierarchy
- Save states / named reset points
- Hard floor / panic command
- Induction script library
- FUSAM compatibility

---

## Open Questions

- Global skill vs per-subject familiarity — interaction mechanics
- Trigger reinforcement — how often, how much decay per day
- Induction script library — ship with defaults, allow user-created?
- Clothing illusion interaction with BC's existing blindfold/sensory systems
- Collateral effect range in map rooms — everyone, or distance-limited?
- Hypnotist without add-on — Tier 1 features only?

---

## Development

Stack: TypeScript, bundled with esbuild into a single `.user.js` (Tampermonkey only loads one file, so unlike the Node bots in this workspace this needs a bundler, not just `tsc`).

```bash
npm install
npm run watch     # rebuilds dist/HypnosisAddon.user.js on save
npm run typecheck # tsc --noEmit
```

To test against the live client: install the script in Tampermonkey from a `file://` URL pointing at `dist/HypnosisAddon.user.js` (enable "Allow access to file URLs" for the extension), then just refresh the BC tab after each rebuild to pick up changes. `@match` targets `*://*.bondageprojects.elementfx.com/*` — update it if the hosting domain changes.

Verified against the live R131 client source: the socket instance is the global `ServerSocket`, incoming events are consumed via `ServerSocket.on("ChatRoomMessage", ...)`, and BC already has a `Type: "Hidden"` message convention (sent through `ServerSend("ChatRoomChat", { Content, Type: "Hidden", Target })`) that's delivered but never rendered in the visible chat log — this is the channel the "Sync between players" section above is planned to use.

**Stage 1 (done):** userscript loads, logs to console, shows a small on-screen indicator, and logs every incoming `ChatRoomMessage` event.

---

*Last updated: 2026-08-26*
