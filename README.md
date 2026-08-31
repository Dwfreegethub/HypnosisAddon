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

**Two access paths, not one.** Long-term depth is always relationship-trust-gated — that part is never bypassed. But arousal and drugs open a second, bounded path: a **chemical access floor** that lets someone with *zero* relationship trust still reach shallow, session-only effects, capped by a player-set ceiling ("Stranger ceiling," see Player Settings). Effective access for a threshold check is `max(relationshipTrust, chemicalFloor)` — a floor, not a multiplier, since a multiplier on zero trust is still zero and wouldn't give a stranger anything. Deep/persistent features stay out of the chemical floor's reach entirely (see Feature Thresholds below), consistent with the existing rule that drugs/arousal can't write anything permanent.

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

**Chemical floor applies only to session-only rows** (mood suggestions, behavioral suggestions, hypnotic immobilization, follow/leash, remove clothes, both illusions) — never to persistent triggers or hypnotist-only-removable triggers, no matter how high a player sets their Stranger ceiling. Those two stay relationship-trust-only.

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
| Stranger ceiling | Max chemical access floor for someone with zero relationship trust (session-only effects only) |

---

## Technical Architecture Notes

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
- **Gotcha, confirmed against the live client:** `Player` is not stable — `CharacterCreatePlayer()` in `Scripts/Character.js` reassigns the whole global `Player` object at login (`Player = CharacterCreate(...)`), replacing a pre-login placeholder. A `hookFunction("Player.<method>", ...)` call made before that point patches the placeholder and goes silently stale the moment the real object replaces it — no error, the hook just stops firing. Don't hook methods hanging off `Player` specifically; either hook a real top-level global function (`ChatRoomMessage`, `CommandCombine` — neither gets reassigned, both confirmed working), or read/write `Player`'s current state live at call time the way the effect-injection technique already does (works regardless of reassignment since it re-reads `Player` fresh every call, never caches a reference).

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
- Open question carried forward: do we want LSCG's full-screen blur/tint resistance takeover, or something quieter?

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
- Trigger reinforcement — how often, how much decay per day (LSCG's logarithmic-every-10-minutes is a reasonable starting reference, not necessarily our final formula)
- Trigger word visibility — LSCG hides + periodically rotates the subject's own trigger word unless overridden; do we want that, or keep triggers always known to the subject?
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
npm test          # bundles the modules, then runs every suite in test/
```

**Run `npm test` after any change to `voice.ts`.** Adding a suggestion whose wording overlaps an existing one is the easiest mistake to make in this codebase and the hardest to notice by hand — the suite exists because that has happened repeatedly.

To test against the live client: install the script in Tampermonkey from a `file://` URL pointing at `dist/HypnosisAddon.user.js` (enable "Allow access to file URLs" for the extension), then just refresh the BC tab after each rebuild to pick up changes. `@match` targets both `*://*.bondageprojects.elementfx.com/*` and `*://*.bondage-europe.com/*` — BC is served from more than one host and a non-matching `@match` fails completely silently.

Verified against the live R131 client source: the socket instance is the global `ServerSocket`, incoming events are consumed via `ServerSocket.on("ChatRoomMessage", ...)`, and BC already has a `Type: "Hidden"` message convention (sent through `ServerSend("ChatRoomChat", { Content, Type: "Hidden", Target })`) that's delivered but never rendered in the visible chat log — this is the channel the "Sync between players" section above is planned to use.

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
| Trance veil | `DrawProcess` | Paint after `next()` to sit over everything, menus included |
| Hide messages, **keep arousal** | `ChatRoomRegisterMessageHandler`, priority **320** | After Arousal Processing (210) and BC's own hiders (300/310), before Push-to-chat (500) |
| Block self-touch **entirely** | `ActivityRun` | It applies arousal, runs the self-effect *and* sends the message — skipping it means nothing happened at all |

The last two are deliberate opposites. Suppression lets everything happen and hides the message; self-touch blocking stops the activity outright. Suppressing in our `ChatRoomMessage` hook would have killed arousal, since that hook runs before BC processes anything.

Self-touch is structurally self-only: `ActivityRun` executes on the *actor's* client.

**Settings screen went tabbed** (v0.13.0) — Permissions / Trance Defaults / Awareness. The seam between active tab and panel is *never drawn* rather than drawn and erased; erasing left a hairline, because canvas strokes are anti-aliased and bleed past their nominal bounds. Previous layout tagged `menu-checkbox-layout`.

**The pattern test suite has now caught a dozen real bugs pre-ship**, including bare `stand` never matching, and `awareness-release` swallowing "you are awake again" — which would have made the wake keyword restore awareness while leaving the subject under. Moved into the repo in v0.13.2; `npm test` runs it.

⚠ **`INDUCTION_WINDOW_MS` is at the 10-second testing value.** Restore to `60_000` before real play.

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

## Lessons Learned (BC API gotchas — quick reference)

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
- **A userscript with a non-matching `@match` fails completely silently.** BC is served from more than one host (`bondageprojects.elementfx.com`, `bondage-europe.com`); if the addon appears totally dead — no indicator, no console line — check the `@match` list first.
- **Overlapping hit regions need an explicit active-view check.** Tabs share coordinates across their content; without gating clicks to the visible tab, one click toggles a row in *every* tab, mostly invisibly.
- **`Player.Appearance` is what syncs — never write a lie into it.** `ServerAppearanceBundle` reads that array for every appearance sync, so a client-side illusion written there reaches the whole room, which is the inverse of the feature. Draw from a separate local-only `CharacterType.SIMPLE` character instead, and hook `DrawCharacter` (the single funnel every screen uses) to substitute it.
- **Asset groups classify themselves.** `AssetGroup.Clothing === true` plus `Category === "Item"` is exactly "everything worn"; the remainder is the body, face, hair and expressions. Reading those flags beats a hand-written group list, which goes stale the moment BC adds content.
- **BC's arousal zone names do not match anatomy.** `ItemVulvaPiercings` is **"Clitoris"**, `ItemFeet` is "Lower Legs" while `ItemBoots` is "Feet & Toes", and **there is no `ItemPenis` or `ItemGlans` group** — those names exist only in `ActivityBuildChatTag`'s message lookup. `Text_Preference.csv`'s `ArousalZoneItem*` rows are the authoritative list. A block registered against a name that is not a real zone fails *silently*.
- **`ActivitySetArousal` does not move the face.** BC only runs `ActivityExpression` from its own timer path, so setting arousal directly moves the meter and leaves the expression blank.
- **`ActivityOrgasmPrepare` refuses by doing nothing** — `DenialMode`, `IsEdged()` and an `Edging` craft each make it return with `OrgasmTimer` untouched. Read the timer back to tell "it happened" from "something declined" rather than reimplementing the rules.
- **Emote is the only message type that renders arbitrary text.** `Action` and `Activity` look their `Content` up as a translation key first and print `MISSING TEXT IN "...": <key>` for anything unknown. Emote also carries no name of its own, so any generated line must name the character itself.
- **Read pronouns, never infer them.** `Character.GetPronouns()` returns the player's chosen `SheHer` / `HeHim` / `TheyThem` / `ItIt`. Making the character's *name* the subject of a generated sentence fixes the verb as third-person singular and saves writing a second set of phrasings.
- **`ChatRoomRun` / `ChatRoomClick` are the chat room's draw and click hooks.** Draw after `next()` to paint over the room, consume before it to take a click. The character half of the screen is x 0–1003 — the exact rect `ChatRoomDrawArousalOverlay` fills.
- **BC sends one `ChangeClothes` Action for a whole wardrobe session**, carrying only a source and a destination character however many garments changed. Item-by-item changes carry their asset instead. Anything classifying clothing messages has to handle both, and the wardrobe one can only be recognised by its tag.
- **TypeScript's "return anything where `void` is expected" allowance does not extend to a union.** Widening a callback from `() => void` to `() => Key | void` breaks every arrow that returned a value incidentally.
- **`localStorage` is per-origin, not per-account.** A fixed backup key means every character on that browser shares one blob. Key it by member number, and refuse to save before that number is known.

---

- **BC's arousal zone names do not match anatomy — read the label file before mapping one.** `Screens/Character/Preference/Text_Preference.csv` has an `ArousalZoneItem*` row per zone, and it is the complete list of groups any activity can target. `ItemVulvaPiercings` is **"Clitoris"** (not a piercing slot), `ItemVulva` is "Pussy & Vagina", `ItemFeet` is "Lower Legs" while `ItemBoots` is "Feet & Toes", and `ItemPelvis` is "Pelvis & Belly". **There is no `ItemPenis` or `ItemGlans` group** — a character with a penis uses `ItemVulva`/`ItemVulvaPiercings` like everyone else, and those two names appear only in `ActivityBuildChatTag`'s message lookup. A block registered against a name that is not a real zone fails *silently*, so validate the mapping in a test rather than trusting it.
- **`ActivitySetArousal` does not touch facial expressions.** BC only runs `ActivityExpression` from `ActivityTimerProgress`, so setting arousal directly moves the meter and leaves the face blank. Call both, guarded by BC's own condition (`AffectExpression` not disabled, no orgasm running).
- **`ActivityOrgasmPrepare` is where an orgasm can be refused**, and it refuses by doing nothing — `DenialMode`, `IsEdged()` and an `Edging` craft each make it return with `OrgasmTimer` untouched. Read the timer back to tell "it happened" from "something declined", instead of reimplementing the rules. `ActivityOrgasmStart` immediately afterwards skips the five-second Resist/Surrender window; `Timer.js` then drives the rest of the lifecycle (`OrgasmStop` at expiry, arousal 20).
- **`ChatRoomRun`/`ChatRoomClick` are the chat room's draw and click hooks.** Draw *after* `next()` to paint over the room; consume *before* `next()` to take a click. The character half of the screen is x 0–1003 — the exact rect `ChatRoomDrawArousalOverlay` fills — so anything drawn there leaves the chat log and input box usable. BC's own orgasm buttons sit at y 532–600 in that same space; stay clear of them.
- **TypeScript's "return anything where `void` is expected" allowance does not extend to a union.** Widening a callback from `() => void` to `() => FlavorKey | void` breaks every arrow that returned a value incidentally (`run: () => applyEffect("Freeze")`), which is a compile error rather than a silent change — but it is a surprising one.
- **`localStorage` is per-origin, not per-account.** A fixed backup key means every character on that browser shares one blob and each login overwrites the last. Key it by member number, and refuse to save at all before the member number is known.

---

*Last updated: 2026-08-30 (v0.34.0)*
