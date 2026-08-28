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
```

To test against the live client: install the script in Tampermonkey from a `file://` URL pointing at `dist/HypnosisAddon.user.js` (enable "Allow access to file URLs" for the extension), then just refresh the BC tab after each rebuild to pick up changes. `@match` targets `*://*.bondageprojects.elementfx.com/*` — update it if the hosting domain changes.

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

**Settings (Preferences → Extensions → "Hypnosis Add-on")**, via `PreferenceRegisterExtensionSetting`. Four checkboxes, all off by default, persisted the same way as trust data — these are **permission** settings ("do I allow this to be done to me"), not self-triggers; checking one never applies an effect to yourself:
- **Hypnosis Enabled** — master switch/hard floor. Turning it off immediately releases Movement/Clothing Restriction if either is currently active (matches the design doc's "clears active trance, suspends all effects"); turning it back on doesn't auto-reapply anything.
- **Movement Restriction** — permission for a remote request to apply Freeze. Unchecking it releases Freeze immediately if it's currently active.
- **Clothing Restriction** — permission for a remote request to apply BlockWardrobe, *and* gates clothing-message suppression (grouped to match the design doc's "Clothing Confusion" feature) — the `ChatRoomMessage` hook reads this flag directly, in addition to (not instead of) the one-shot `/hypno suppress` test command.
- **Hidden Activities** — gates the Hidden-message cross-client channel (`messaging.ts`) for both sending and receiving.

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

*Last updated: 2026-08-27 (v0.9.1)*
