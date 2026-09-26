# Version History

Dated notes on what shipped and, more usefully, *why* — the reasoning that did not fit in a commit
message. [`../README.md`](../README.md) carries the same versions from the engineering side (hooks,
BC API traps, what broke); this is the design half. [`design.md`](design.md) is what the add-on is
meant to be and why; this file is what it has actually been.

**Players read [`../CHANGELOG.md`](../CHANGELOG.md), not this file.** That one is the plain-language
list linked from the README. A release gets an entry in both: the player-facing line there, the
reasoning here.

**Newest first.** These entries lived in three separate places in `design.md` until 2026-09-18 — one
run under *Development Stages*, one in an *Appendix* at the end, and one stranded under *Test
Harness* where nothing pointed at it — in two different chronological directions. They are collected
here in one order, unedited apart from a single wrong "see below" noted in the v0.72.0 entry.
Nothing was dropped in the move.

**Adding an entry:** newest at the top, `### <Added|Fixed|Changed|Decided> <date> (<version>) — <what>`.
The version comes from `package.json`, which is the single source of truth.

---

### Fixed 2026-09-26 (v0.92.4) — "after you wake" compulsions woke her instead

DW, live: "Any of the after you wake commands do not seem to work. They seem to wake me up." A
wording sweep through the whole planting path found the wake clause only accepted
`when|as soon as|the moment|once` + `you wake`/`you open your eyes`/`you come out of …`, or a timed
"N minutes after …". So "after you wake up, …", "when you awaken", "when you are awake", "upon
waking", "after waking" were not conditions. The ones containing the word "wake" then reached the
wake handler and woke her. The ones that didn't ("upon waking") did nothing, silently.

Two changes. The clause now also takes `after` (with `right`/`just`/`soon`/`straight`), `upon`,
and the verbs `awaken`, `awake`, `are (wide) awake (again)`, `awakening`, `come out of the trance`.
"On waking" was left out on purpose: "come on, you, wake up" would read as a condition.

**Decided (re-decides Build 6's "old meaning kept"):** a wake clause whose rest cannot be recorded
used to fall through and wake her, "as that line always did". It now keeps her under and tells the
hypnotist so, since losing the trance to a misheard suggestion is the worse failure, and a
hypnotist can always just say "wake up". The exception is a line whose rest itself says to wake up
("…you will feel refreshed. Wake up now"), which still wakes her and plants nothing. Person clauses
("when Rei comes in") are unchanged. Covered in `test/compulsion.mjs`, 12 of whose new checks fail
on v0.92.3.

The suggestion "wake with something other than wake" was not needed: every wording now plants, and
"when you open your eyes" / "when you come out of trance" already worked as alternatives.

### Fixed 2026-09-26 (v0.92.3) — the hypnotist's pose commands refused while held

DW, live: once frozen, the hypnotist's spoken pose commands stopped working. Our own path was fine:
`setSuggestedPose` marks its calls (`ownPoseChange`), and both the `PoseSetActive` hold and the
`PoseCanChangeUnaidedStatus` hook let them through. But WCE and LSCG hook `PoseSetActive` below
our priority 1000, and one of them applies the pose itself. Since v0.90.2 made our `Freeze`
actually stick, that add-on sees a frozen character and refuses: BC's own rule for `Freeze` is
"only with a struggle". Before v0.90.2 our Freeze never survived on DW's client, so this never
showed.

**The fix follows DW's rule that the command wins over our own freeze** (as `applyUndress` already
does). For the duration of one of our own pose changes:
- `setSuggestedPose` rebuilds BC's effect cache.
- The `CharacterGetEffects` hook leaves OUR `Freeze` (and so `MapImmobile`) out.
- It keeps a `Freeze` from any other item, because that's a real restraint.
- The cache is rebuilt again in `finally`.

It's local only; nothing is synced. The `PoseCanChangeUnaidedStatus` hook already passed during our
changes, so BC now answers as it would without our freeze.

`test/held-still.mjs`: the stand-in competing hook now also refuses frozen characters, the
behaviour inferred from DW's report. Against v0.92.2's code the hypnotist's "stand" fails (3
checks). New checks: the hold is restored straight after, and a real restraint's freeze still
stops the command. 34 checks.

### Added 2026-09-26 (v0.92.2) — the bookmark loader

DW asked for one "with what we have". A `javascript:` bookmark runs in the page when clicked, as
the installed loader does, and the add-on needs nothing a userscript manager provides: the loader is
`@grant none`, and the bundle has no `GM_` or `unsafeWindow`. So it is the loader's logic in one
line: GitHub first (fetched, run inline), then jsDelivr as a script tag with `?t=`, then an
`alert()`, since there is no page of ours to draw a notice on.

**Built from the loader's own addresses, never retyped.** `src/bookmarklet.ts` imports `CDN_URL`
and `GITHUB_URL` from `loader.ts`. `build.mjs` bundles it as a throwaway ESM module, imports it, and
writes `dist/bookmarklet.txt`; `release.mjs` copies that to the committed `bookmarklet.txt`, which
the wiki links raw.

**A bookmark is clicked by hand, often twice, and after login.** It asks the mod SDK
(`bcModSdk.getModsInfo()`) whether "ECHS" is already registered, and says so instead of loading
again. That covers a second click, and the userscript having already loaded it. The mod SDK would
otherwise throw on the duplicate registration. A load after login is expected to work: storage is
read lazily from `Player`, and commands, menus and hooks all register at any time. This is not yet
verified live.

`test/bookmarklet.mjs`, 21 checks, builds the source as `build.mjs` does and runs the line against
a stub page:
- GitHub ok
- three GitHub failures, each falling to jsDelivr
- both failing, with an alert
- already loaded
- other add-ons loaded but not ECHS
- the committed copy is current

Removing the guard, or asking jsDelivr alongside GitHub, fails 2 checks each.

### Fixed 2026-09-26 (v0.92.1) — the loader goes to GitHub first

From v0.91.3, jsDelivr went on serving v0.91.2. Every purge came back accepted, `throttled: false`,
on both of its networks (CF and FY). Its own resolver for `@main`
(`data.jsdelivr.com/v1/packages/gh/…/resolved?specifier=main`) answered 502 "Couldn't fetch
versions", then `"version": null`. So it was their lookup of the branch, not our file, our URL or
our purges:
- `raw.githubusercontent.com` served the current bundle throughout.
- v0.91.2 had gone out normally after the loader's `?t=` change, and jsDelivr ignores the query.

The loader treated jsDelivr as primary and GitHub only as an *error* fallback. A stale copy is not
an error, so every player stayed on the old build.
- **`runLoader` order:** GitHub first (`GITHUB_URL`, formerly `FALLBACK_URL`: fetched with
  `cache: "no-cache"` and run inline, as the fallback always was), then jsDelivr as a script tag,
  then the on-screen failure notice. GitHub's cache is about five minutes, so that is now the
  release lag.
- **No double load:** the second source is still only tried after the first has failed, with no
  timeout.
- **Outcomes** are now `"github" | "cdn" | "failed"`.
- **`test/loader.mjs`** was rewritten for the new order: GitHub ok; each of three GitHub failures
  falling to jsDelivr; and all three with both failing. Putting jsDelivr first again fails 11
  checks.

**Also fixed:** `decf02b` (the self-checking purge workflow) had put `${GITHUB_REPOSITORY}` in the
purge URL. `test/loader.mjs`'s "the cache purge clears the same URL the loader loads" caught it; I
had not run the suite after that CI-only commit. The literal URL is back.

### Added 2026-09-26 (v0.92.0) — repeated touches, and any action on the start line

DW, live: "I tried to make Missy touch herself 3 times… that does not work." Two findings:
- **No repeat for touches.** "Three times" was only understood by `parseSayClause`, so a commanded
  touch ran once and ignored the count.
- **A start-line trap.** `TRIGGER_START` captures to the end of the line, and only drop and say
  clauses were split off it. So "when you hear ember glow, touch your breasts three times" planted
  "ember glow touch your breasts three times" as the word.

DW's calls: repeats for touching and words only, and not at a slot per touch.

- **The count lives in the action.** `ActivityCommand.times`, from `repeatCount()` on the RAW
  line, because `normalize()` strips digits. It is capped at `MAX_TOUCH_TIMES` (5) and set only
  when above 1, so the old shape is unchanged. The count travels in the action id, like `say:<n>:`:
  `act:Caress:breasts*3`, `act:vague*2`. `parseActId()` reads it, and ids without `*N` read as
  once. One slot per repeat was rejected; so was raising the 8-action cap.
- **Live repeats.** The first touch runs at once, and the rest go through `repeatTouch()` on the
  trigger pacing (1.2–2 s). Each tick re-checks the session, "Made to act" and a real restraint's
  freeze. A safeword clears the pending ticks with every timer.
- **Trigger repeats.** `fireTrigger` pushes one paced, re-validated step per repeat.
- **The start line.** `splitStartAtAction()` reruns the matched `TRIGGER_START` pattern on the raw
  lower-cased line, so punctuation survives, and looks for a PAUSE (`,;:.!?`, a dash, or
  "and"/"then"). It splits at the first pause followed by something `isRecordableAction()`
  accepts: a commanded activity, a suggestion or a body-part block. The rest is re-read through
  `handleSpokenLine` with the subject's name. That pass has firing suppressed (`rereadingRest`),
  because a trigger word inside the rest must not go off while another trigger is being planted.
  Requiring a pause is what keeps "your trigger word is time to kneel" whole.

`test/repeat-touch.mjs`, 23 checks. Verified by mutation: removing the re-read guard, the split, or
the trigger's repeat each fails its own checks. The guard check uses another installer's
scope-everyone trigger, so nothing else could stop it.

### Fixed 2026-09-26 (v0.91.3) — the held-still kneel button, and the repeating line

DW, live on v0.91.2: the pose menu was held, but the kneel/stand button still ran its mini-game.
BC's success path posts "StandUp" to the room before calling `PoseSetActive`, so the room was told
she stood while our refusal kept her kneeling. The refusal line also repeated "over and over". DW
compared it with frog-tie metal cuffs, which grey the button out completely.

**How BC does it (R132).** The button's state comes from `PoseCanChangeUnaidedStatus(Player, pose)`
across every stand (or kneel) pose:
- `NEVER` draws it "Blocked", and `ChatRoomToggleKneel` has no case for it, so nothing happens.
  Items that restrict `AllowedActivePoseMapping` produce this, which is how the cuffs work.
- BC's own `Freeze` only produces `ALWAYS_WITH_STRUGGLE`, the "Limited" (yellow) button and the
  mini-game.

We now hook `PoseCanChangeUnaidedStatus` at `HOLD_PRIORITY`. While held, any pose she is not
already in answers `NEVER`, and our own changes pass. BC's `CanKneel` reads the same function, so
everything asking "can she kneel" agrees.

**The repeat.** `PoseSetActive` is called with the pose she is *already in* (by BC or another
add-on), and each call counted as an attempt. `poseWouldChange()` now lets calls that change
nothing through silently, and the notice gap went from 5 to 30 seconds.

`test/held-still.mjs`: 32 checks, up from 26. Dropping the button block fails 2 and dropping the
no-op pass fails 1.

### Fixed 2026-09-26 (v0.91.2) — the pose hold lost to WCE and LSCG's hooks

DW, live on v0.91.0 (confirmed on 0.91.0 after a hard refresh): held still, the pose menu and the
kneel button (after the struggle) still changed Missy's pose. The chat-echo hold check read:
- `hookedBy: ["WCE","ECHS","LSCG"]`
- `overwritten: false`
- `freeze: true`, `mapImmobile: true`

So our hook was installed and ECHS knew she was held. The mod SDK runs hooks highest priority
first. Ours was at 5, and a higher-priority `PoseSetActive` hook from one of the other two applied
the pose itself without calling `next`, so our refusal never ran. The fix:
- **Priority:** the three hold hooks (`PoseSetActive`, `ChatRoomSyncCharacter`,
  `ChatRoomSyncPose`) now register at `HOLD_PRIORITY` 1000, so the hold decides first.
- **A safety net on `ServerSend("ChatRoomCharacterPoseUpdate")`,** which every self pose change
  ends in (R132 `_ClickButton`, `ChatRoomToggleKneel`). ECHS remembers the held pose (`heldPose`,
  set when `Freeze` starts or ends, and after each of our own pose changes). Anything about to be
  sent that differs is put back first, so an add-on that sets the pose round every hook still
  cannot make it stick.

`test/held-still.mjs`: the SDK stand-in now honours priority, which the old one did not and so
could not see this. A competing hook at priority 50 that applies the pose itself now fails four
checks with our old priority 5, and all 26 pass at 1000. There are three new safety-net checks,
which fail without it.

### Fixed 2026-09-26 (v0.91.1) — the loader could run a week-old bundle

Found while chasing DW's "the pose hold does nothing" report. `curl -I` on the jsDelivr URL showed
`Cache-Control: public, max-age=604800, s-maxage=43200`. The loader inserted a plain `<script
src=CDN_URL>`, so a browser could answer from its own cache for up to seven days. The purge
workflow clears jsDelivr's edge, not players' browsers, so the loader's own promise ("fetched
fresh on every page load") was not true. `loadFromCdn` now uses `cdnUrlForThisLoad()`, which is the
same URL plus `?t=<Date.now()>`. jsDelivr ignores the query string: requests with different `?t=`
got the same `Age` (754–755s), so its purged edge copy is still what is served, and GitHub is not
hit per load. Only the browser cache is defeated.

This change is in the **installed loader** (`HypnosisAddon.user.js`), so it reaches players when
their userscript manager next updates it. `test/loader.mjs`: +1 check (the timestamp).

### Added 2026-09-26 (v0.91.0) — "you cannot move" holds the pose and the place

DW asked for this after v0.90.2 made the freeze actually land. BC's own `Freeze` (R132):
- `CanWalk()` is false, so `ChatRoomCanLeave()` refuses.
- `PoseCanChangeUnaidedStatus` makes standing↔kneeling a struggle.
- Nothing else: arm poses and same-category changes are free.
- On a map, `ChatRoomMapViewCanEnterTile` only multiplies the time by 6.

DW's answers the same day: the hypnotist's spoken pose commands still move a frozen subject (yes);
other players may not change her pose (no); the trance's own *Cannot Move* default gets the same
hold (yes). While OUR `Freeze` is on (`isHeldStill()`, `effects.ts`):
- **Her own pose changes are refused.** A hook on `PoseSetActive` catches them: every path (the
  pose menu, the kneel/stand button, the struggle mini-game) ends there. Our own calls pass through
  an `ownPoseChange` counter in `setSuggestedPose`. She is told, at most every 5 seconds.
- **Another player's change is undone.** Their assist sets it on their client and syncs her whole
  character (`ChatRoomKneelStandAssist` → `ChatRoomCharacterUpdate`). That reaches her as a
  `ChatRoomSyncCharacter` of herself, from another source. Her held pose is put back and re-sent
  with `ChatRoomCharacterPoseUpdate`; the rest of that sync (her items) stands. A bare
  `ChatRoomSyncPose` about her is refused the same way.
- **On a map she can't walk.** The `CharacterGetEffects` hook adds BC's own `MapImmobile` beside
  our `Freeze`, so `ChatRoomMapViewCanEnterTile` returns 0 and even forced moves stop. It's local
  only; nobody else needs it.
- **The trance default is covered for free.** Walking trance removes our `Freeze`, so it releases
  the hold; the safeword clears it like everything else.

**Items are deliberately not blocked** (DW confirmed 2026-09-26: don't block items). A pose-forcing item is applied by BC's
item system under her own item permissions. Refusing it would mean refusing other players' items,
and nobody could restrain a held-still subject.

`test/held-still.mjs`, 23 checks, against R132 transcriptions of `PoseSetActive`, the effect
functions and the two sync handlers. Verified by mutation: dropping her own hold, the pass for our
commands, the undo of others, `MapImmobile`, or the bare-pose refusal each turned its own checks
red.

### Fixed 2026-09-25 (v0.90.2) — a used-up one-shot lingered after a safeword or a wake

Found by DW on the first live run of the test script (section 1). A one-shot that has fired is
kept, marked `spent`, while it holds the subject, and `undoTrigger` removes it when it lets go. A
release by name goes through `undoTrigger`. A safeword or an ordinary wake instead lets go of
every hold at once through `clearAllTimers()`, which bypasses it. The spent record then stayed
stored until something next read the list. So after a safeword the trigger was still listed, and
its word was still masked in chat, while the same trigger released by name was gone and its word
showed. The fix is in two parts:
- `onTeardown` in `triggers.ts` now removes every spent trigger. It runs after `clearAllTimers()`
  in both `endSession` and `totalStop`, so nothing is holding by then.
- `conceal.ts` masks only live triggers, via a new `triggerIsGone()` shared with
  `pruneFadedTriggers`. A word whose trigger is used up, expired or faded, and not holding, shows
  as typed, even before a prune has run.

That second part is DW's decision the same day (option A over B): only live trigger words are
hidden. Keeping a memory of old words, and masking them forever, was rejected, because a phrase
once used as a trigger would be eaten in every room indefinitely.

`test/conceal.mjs`, +9 checks replaying the report, covering release, safeword, wake and
expired. Five of them fail on v0.90.1.

**Also in v0.90.2 — our effects no longer depend on the Emoticon item surviving.** DW, live,
2026-09-26: "you cannot move" printed its flavour and did nothing. `/echs effects` showed `-
frozen`, and the console read `Player.HasEffect("Freeze") === false`, `CanWalk() === true`,
`ChatRoomCanLeave() === true`. The diagnostic showed Missy's Emoticon item as `Property: {}`
seconds after our write. Our `AllowEffect` patch was verified in place, and about 20 other add-ons
were loaded (LSCG, BCX, WCE, BCOM, Liko's among them). BC's validator filters an `Effect` array, it
does not empty the whole Property, so another add-on is replacing the item's properties. Everything
we carry on that item (`Freeze`, `BlockWardrobe`, `DenialMode`, `Leash`) was exposed to it.

The fix (`effects.ts`):
- **Our own record:** an `OWN_EFFECTS` set is the source of truth for this client.
- **A hook on `CharacterGetEffects`** (R132 Character.js; `CharacterLoadEffect` caches its result
  as `C.Effect`) adds our effects for the player. `HasEffect`, `CanWalk` and `ChatRoomCanLeave`
  then honour them whatever happens to the item. It is scoped: a group-filtered question about
  another slot does not see them.
- **A hook on `ChatRoomCharacterUpdate`** writes them back onto the item before any appearance of
  ours is sent, whoever sent it. Other clients, which can only see an effect through the item,
  stay in step.
- **`hasOwnEffect` is our record or the item.** After a reload the record is empty, and recovery
  must still see a `Freeze` the server hands back.
- **`itemCarriesEffect` is new, and asks about the item alone.** The denial repair
  (`denialCarrierLost`) needs it.
- **Rule 5:** `applyEffect` now checks with BC that the effect landed. If not, it takes it back off
  everywhere and returns false. `movement-block` and `clothing-block` then return `effect-failed`,
  so the hypnotist is told it did not land, and the subject gets a private line. The room is not
  told of a stillness that is not there. Before this, the flavour and the room emote played either
  way.

This may be what was behind Known Bug #10 (spoken orgasm denial reported not holding), which rides
the same item. It needs a live re-test on v0.90.2. `test/effect-wipe.mjs`, 21 checks, runs BC's
effect functions transcribed from R132 and wipes the item two ways. Ten fail on the old effects
code. `activity.mjs` and `touch-others.mjs` now take our own freeze off through the API before
simulating a real restraint's.

**Also in v0.90.2 — names with spaces in commands.** DW, the same day: `/hypno trance Missys
Helper 80` put the subject under at depth **0**. Every command taking a name read the first word as
the name, so "Helper" became the depth (`Number("Helper") || 0`). An old bug: `trance`, `settrust`,
`relate` and `bumptrust` read the value from the second word. The name-only commands (`induce`,
`chance`, `ping`) used the first word and worked only while it was a unique prefix. `forgettrust`
compares whole names, so it could never match a two-word name. Now `splitNameAndTail` reads values
from the END: up to N trailing words that look like a value. The rest of the line is the name, and
the name-only commands take the whole line. Member numbers still work:
- `trance` counts only 0–100 as a depth, so `/hypno trance 12345 80` still reads 12345 as who.

New `test/command-names.mjs`, 13 checks. Ten fail on v0.90.1.

### Changed 2026-09-25 (v0.90.1) — the bare `/echs` menu names `induce`

DW: the command to start an induction "keeps not making it in the wiki or is not clear". It had
been a `Session` command since the command layer was built, but it was listed only in
`/hypno commands` and never in the bare `/hypno` menu. That menu is the signpost a new player
actually reads, and `induce` is the first thing a new hypnotist needs, so it now carries one line
for `induce <name>` and `retry`. The wiki gained the same (docs commit on the same stack).
`test/alias.mjs` asserts the menu names it, and that both subcommands exist. The first assertion
fails on v0.90.0.

### Added 2026-09-25 (v0.90.0, Build 6, no bump) — delayed compulsions

Build 6, the last of the *Trigger Overhaul*, shipped inside v0.90.0 per DW.

**Phrase-less triggers, on the existing record.** A compulsion is a `Trigger` with `phrase: ""`, a
synthetic `key` (`<fireOn>:<installer>:<installedAt>`), and `fireOn` = `wake` / `arrive` /
`speak`, plus `delayMs` / `dueAt` or `watchName` / `watchMember`. It is the `key` field that Build 1
added "so phrase-less triggers can exist later", used as intended. Scope, strength, decay, expiry,
options, one-shot, the list, the detail and Purge all apply unchanged. `timerKey` and the drain key
moved from `phrase` to `key`: identical strings for every phrase trigger, and distinct for two
compulsions by the same installer. `normalise` drops invalid condition fields.

**Planting.** `parseCondition` (`voice.ts`) reads the start line on the digit-keeping
normalisation, before `TRIGGER_START`, so "when you hear Rei's voice" is a condition and not a
trigger word:
- "N minutes after you wake"
- "when you wake"
- "when X comes in"
- "when X speaks" / "when you hear X's voice"

X is resolved at planting (`resolveWatch`): a room member by number, an absent name kept by name,
"I" as the installer, "anyone" as `*`. Pronouns are refused. Whatever follows the clause is
recorded by re-reading it, with the subject's name, through the ordinary handlers (words to say and
drops taken directly), with firing suppressed for that pass. **Two traps found and fixed on the
way:**
- A line naming a room member ("when Rei comes in") was cut to "Missy, when" by addressee scoping.
  A person-watching condition line is now read whole, behind the same trance-and-name gate.
- "Missy, when you wake up you will feel refreshed" has always *woken* her (bare "wake"). If
  nothing recordable follows a clause, the recording is dropped and the line falls through, so it
  keeps that meaning.

**Firing.**
- **Wake** arms in a new `onWake` hook: `teardown.ts`, run by `endSession` on an ordinary end of a
  *trance*, never an attempt. Only the installer's trance arms their compulsion. Arming stores
  `dueAt`; a 5-second `setInterval` (`installCompulsions`, deliberately outside `timers.ts`, which
  `clearAllTimers()` empties at every trance end) fires what is due. A stored time outlives reloads,
  and the clock keeps running offline (DW, 2026-09-25).
- **Arrival** comes from BC's own entry notice. It is an `Action` message with
  `Content: "ServerEnter"`, sent by the arriving member after `ChatRoomSyncMemberJoin` (checked
  against R132). We read it in our hook after `next()`, so "Rei entered." prints first.
- **Speech** is any chat line from the watched person (`handleTriggerFiring`).

None fire while she is hypnotised. A compulsion fires *as its installer* (scope is not asked,
because nobody said anything to fire it), so a drop in one makes the installer the hypnotist, and
needs them present. One-time by default, as the spec asks; "it works every time" keeps it, and a
wake compulsion then goes back to waiting for the next wake. `onTotalStop` (safeword, hard floor)
discards every wake compulsion, armed or not (rule 2). Arrival and speech compulsions persist
through a safeword, as planted phrase triggers always have.

`test/compulsion.mjs`, 57 checks. Verified by mutation: dropping each of these turned its own
checks red or crashed the suite:
- arming on wake
- the safeword discard
- the installer-only arming
- the not-while-under guard (on both the due and the event paths)
- the one-time default
- the scoping bypass
- the fall-through for an empty rest
- the speech hook

Live steps: *Needs Testing* item 24.

### Added 2026-09-25 (v0.90.0, Build 5, no bump) — spoken and mantra triggers

Build 5 of the *Trigger Overhaul*. DW asked for no version bump until the overhaul is done, so
this ships inside v0.90.0: a deliberate exception to rule 9, recorded in `design.md`.

**The action.** It is stored as `say:<times>:<text>` (`sayActionId`/`parseSayAction`,
`triggers.ts`). The text is verbatim, and it is everything after the second colon, so colons in
the words survive. Times is capped at 5 and the text at 200 characters. It is recorded by
`parseSayClause` (`voice.ts`), which reads the RAW line because the words are spoken back exactly
as typed:
- quotes stripped
- a trailing vocative name dropped
- "N times", "twice" and similar taken as the count
- silence objects rejected ("say nothing", "not a word"), so those stay speech-block
- "answer/reply/respond" counted only with "with"
- it works on the start line too ("when you hear X, you will say Y")

**The permission.** `forcedSpeech` (*Made to Speak*), off by default, with a depth gate at
Entranced (session-scoped, not earned-only). It is checked at record, the way a spoken suggestion
is checked before recording, and at fire, twice: in `fireTrigger` and again on the paced tick in
`speakForSubject`. The wizard never grants it; only Extreme does, the same as `compelTouchOthers`.
It is in `PERMISSION_KEYS`, so granting it counts as "configured" for the first-run notice.

**The send, verified against R132.** `ChatRoomSendChatMessage` applies the owner's BlockTalk rule
and the forbidden-word check. It then builds the message through
`ChatRoomGenerateChatRoomChatMessage`, which runs `SpeechTransformProcess` (gag, stutter) and
attaches the ungarbled original. So the spec's "route through the native garbler" is simply BC's
send. A `false` return means BC refused, and the subject is told. Our own speech-block hook is on
the same function; it lets a forced line through via `withForcedSpeech` (`effects.ts`). That call
is flagged for DW in `design.md`.

**Loops.** A forced line's normalised text is queued in `FORCED_ECHOES` and consumed when the
server echoes it back to us, so it never fires our own triggers. Without that, a trigger that says
its own word, with self-firing on, would loop forever. Across the room, where one subject's words
fire another's triggers, there is a hard cap of six forced lines per minute. The subject is told
once per window when a line is held back. Lines BC refused don't count toward the cap.

A mantra is one paced step per repetition, on the existing trigger drain (1.2–2s). A say action
is not "holding": it is a one-off event, like a compel.

`test/say.mjs`, 39 checks. Verified by mutation: dropping the planting permission check, the
planting depth check, the bypass flag, the echo guard, the cap, the repetition, or the silence
exclusion each turned its own checks red. Dropping the firing-time permission check in
`fireTrigger` alone did not, because `speakForSubject` checks it again on its own tick. The
behaviour is covered, but not that one line. Live steps: *Needs Testing* item 23.

### Added 2026-09-25 (v0.90.0) — instant drop triggers

Build 4 of the *Trigger Overhaul* (decision 10). This reverses the old "no LSCG-style auto-drop"
note in *Open Questions*, as recorded in Build 0.

**The action.** `DROP_ACTION` (`"trance-drop"`, `triggers.ts`) is recorded into a trigger, not run
live: the subject is already under while it is planted. It is not in `SUGGESTIONS` for the same
reason. It is recorded by `TRIGGER_DROP` (`voice.ts`), or by a drop clause on the start line
itself: "when you hear X, you will drop into trance". `TRIGGER_START` captures to the end of the
line, so `parseTriggerControl` splits the clause off, and a trailing "and"/"then", and records
both. Every drop form ends in "into trance" or a bare "under": "drop on your knees" is kneel, and
"under the table" is a place.

**The setting.** `dropTriggers`: `off` (default) / `once` / `unlimited`, cycled by a button that
scrolls in after the Triggers tab's rows, like the attempt control on Permissions. It is read
three times:
- at record (refused when off, and the hypnotist told)
- at commit: one-time unless the installer said "every time" *and* the subject allows unlimited.
  The recording's `oneShot` became tri-state for this: unsaid is not "every time".
- at fire: off refuses, and once marks the trigger one-shot, so lowering the setting disarms
  existing unlimited drops after their next use.

**Who may drop her.** `dropIntoTrance()` (`session.ts`) re-uses the `session-attempt` handler's
gates exactly, per DW ("follows who can hypnotise you"):
- *Hypnosis Enabled*
- the speaker is on the roster
- no cooldown with that speaker
- not already hypnotised
- nobody else's session in progress, which includes another hypnotist's cooldown

I first wrote a cooldown exception and removed it, because the attempt handler has none. A drop
by her own voice is refused. The trigger's own scope was already checked before firing. On
success it runs the success path's tail:
- depths, then the 30-minute timeout
- `applyTranceState()` (the trance defaults)
- the presence watch
- `announceTranceEnter()`
- `pushUpdate()`, so the speaker's panel sees the session
- `persistState()`

It is not counted as practice or trust, because nothing was attempted.

**Depth.** Both halves are the trigger's strength, except that a chemically seeded trigger gets
earned 0 (rule 4). Earned depth gates planting, carrying and the illusion, so a drop from a
trigger bought with arousal must not hand back earned depth.

**Order.** The drop runs synchronously before the paced actions, so the rest of the trigger lands
on someone already under. It is not "holding": the trance is session state, ended by wake,
timeout or safeword. Every refusal is told to the speaker over the hidden channel (rule 5). When
drops are off, the subject also gets a line, since something did happen to them.

`test/drop.mjs`, 50 checks, plus 3 in `menu-layout.mjs` for the control. Verified by mutation:
removing the off check at firing, the chemical rule, once-at-firing, the default one-time, the
off check at planting, or any of the room, already-under and self gates each turned its own checks
red. Live steps: *Needs Testing* item 22.

### Added 2026-09-25 (v0.89.0) — trigger words shown as "..." in the subject's chat

Build 3 of the *Trigger Overhaul* (decision 6). New module `conceal.ts`. DW pointed at LSCG, which
does the same for its own trigger word. It was used as a technique reference only (rule 7); no LSCG
code is involved.

**Where, verified against R132 `ChatRoom.js`.** `ChatRoomMessageRunHandlers` runs "post" handlers
(Priority ≥ 0) in order, and a handler that returns `{ msg }` changes the text every later handler
sees, including "Push message to the chat" at 500, which draws it. We register at **50**. That is
after "Emote messages formatting" (0), which prepends the sender's name, and before
"Sensory-deprivation processing" (100). The deafness garbling at 100 would otherwise leave a
half-scrambled word we could not match. The notification at 500 reads the same `msg`, so desktop
notifications are masked too. BC attaches a gagged sender's ungarbled text as
`metadata.OriginalMsg` and draws it in brackets when the viewer has *Show ungarbled messages* on.
That copy is masked as well.

**What it does not touch.** `data.Content` is never changed. Our own `ChatRoomMessage` hook reads it
to fire triggers, and BC's chat log (priority 110) and other add-ons read it too. Only what the
subject's screen draws changes.

**The planting line.** `main.ts` renders a line before reacting to it (cause before effect,
v0.72.x). So when "your trigger word is X" is drawn, recording has not begun and X is stored
nowhere. The handler runs the planting path's own parser, `parseTriggerControl` on the scoped,
unstuttered, OOC-stripped line, under the same gate (the sender has the subject in trance), and
conceals what it would capture. It also conceals the phrase currently being recorded, and every
stored trigger.

**Matching raw text to a normalised phrase.** Triggers are stored normalised (lower case, runs of
non-letters collapsed to one space, contractions expanded, "ur" read as "your"). `phrasePattern()`
inverts that per word:
- any case
- any run of non-letters between words
- BC's arousal stutter in front of a word (`s-s-sleepy`)
- the folded spellings: `can't`/`can not` as "cannot", `don't` as "do not" and the other pairs,
  straight and curly apostrophes
- whole-word "ur"

Substring triggers are concealed inside longer words ("...head"), because they fire there. Strict
triggers, or all triggers under the master toggle, are concealed only as whole words. Longest
phrases are masked first, so a phrase containing another disappears whole.

**Not concealed:** Action and Activity messages (they never fire a trigger), the subject's own
lines, anything while *Hypnosis Enabled* is off (the floor), and anything while *Show trigger
words* is on. Gag garbling is still never decoded (DW, 2026-09-24), so a gagged speaker's garbled
line has nothing to mask, only its ungarbled copy.

`test/conceal.mjs`, 42 checks. Verified by mutation: dropping the ungarbled copy, the planting-line
parse, the stutter allowance, strictness, the floor, or the recording phrase each turned its own
checks red. Live steps: *Needs Testing* item 21.

### Added 2026-09-25 (v0.88.0) — the trigger inspector: summary, detail, Planted tab, Clear All rules

Build 2 of the *Trigger Overhaul* (decisions 7–9 in `design.md`).

**Two levels of looking, DW's call.** `/hypno triggers` used to print every trigger with its
action ids. It now prints how many, who planted each (name and member number), and the strength
line. `/hypno triggers <n>` prints the rest: the actions in words, options, and whether it is
holding. This is concealment by effort, not secrecy: the rule that nothing happens to the subject
that they *cannot* see still holds, one step further in. The phrase follows *Show trigger words* at
both levels, and `full` still works in the testing room.

**Actions in words.** `describeAction()` renders a suggestion as its first help example ("you
cannot move"). That text is test-checked to match its own suggestion, so it cannot describe
something the trigger does not do. Body-part and compel ids get their own wording.

**One rule, two surfaces.** `clearAllRefusal()` (`voice.ts`) is what both `forgettrigger all` and
the settings screen's Clear All ask, so they refuse on the same terms: a live session in any phase
(`isSessionLive`, the settings lock's definition), or any trigger holding. The old
`forgettrigger all` kept the held ones and deleted the rest. It now refuses outright, per DW:
clear what holds you first. Both ask once: the command wants `all confirm`, and the button arms for
5 seconds, as Reset does. The warning names triggers "you cannot see", ahead of Build 3.

**The Planted tab** is a render tab with its own click handler, and that handler consumes
**every** click. A self-drawing tab that returned false would fall through to the Stats tab's
inline handling, whose Export/Import/Reset buttons sit at those coordinates. `menu-layout.mjs`
clicks there to check. Purge and Clear All are deliberately **not** under the settings lock:
`forgettrigger` has always been "never gated", and what protects a scene is the refusal while a
trigger holds, which applies in full. Detail view uses the same summary and detail functions as
chat (`triggerSummary`, `describeTriggerDetail`), so the two cannot drift.

**Also:** the `menu-layout` check "Triggers: all four still show" had been passing by accident
since v0.87.0 added a fifth checkbox. Four fit, and the fifth is reached by scrolling. The check
now says so and asserts the scroll bar.

`test/trigger-inspector.mjs`, 49 checks; 19 new in `menu-layout.mjs`; `triggers.mjs` updated for
the two-level list. Verified by mutation: dropping the session refusal, the holding refusal, Purge's
holding check, the arm step, or the command's confirm each turned its own checks red. So did
putting actions back in the summary. Live steps: *Needs Testing* item 20.

### Added 2026-09-25 (v0.87.0) — trigger options: one-shot, expiry, lifespan ceiling, whole words, per-trigger scope

Build 1 of the *Trigger Overhaul* in `design.md` (DW's outside spec, `job.md`, reconciled against the
settled design the same day). The record gains `key` (back-filled from `phrase`, and now what
`saveTrigger`/`forgetTrigger` match on) and five optional fields: `scope`, `expiresAt`, `oneShot`,
`spent`, `strict`. Absent is exactly the old behaviour, so nothing needed migrating: `normalise`
back-fills `key` and deletes any invalid option value, per the `skillHonour` rule.

**Why not the spec's timers.** The spec asked for a runtime timer per trigger, re-armed by a sweep
on load. Strength has been derived from timestamps since v0.60.0 because there is no moment the
add-on is guaranteed to be running, and expiry follows the same pattern: `isExpired()` is checked on
read, and an expired trigger reads as strength 0, so the existing prune (which already spares
anything holding the subject) handles it with no second path.

**One-shot does not delete on fire.** The spec said to delete immediately after firing. That
strands the effects of a trigger that is still holding her, the bug fixed twice before. So firing
sets `spent` (it can never fire again) and the record is removed by `undoTrigger` when it lets go,
by the prune once nothing holds it, or at once when it held nothing. `markSpent` runs whether or not
any action landed: "once" is about being said, not about succeeding. It sits after
`noteTriggerFired`.

**Scope** resolves *Trigger Storage* item 2 as option 2: `effectiveScope()` is the narrower of the
installer's ask and her global setting. `TRIGGER_SCOPE_KEYS` in `storage.ts` duplicates the order
of `TRIGGER_SCOPES` so `normalise` can validate without a circular import. The new suite asserts
the two agree.

**Spoken options** (`OPTION_PATTERNS`, `voice.ts`) are matched on a light normalisation that keeps
digits, because `normalize()` strips them ("lasts 2 hours" arrives as "lasts hours"). Every pattern
is anchored on the trigger ("this trigger", "it", "the word") or on who says it, never on a bare
time or a bare "once". A line that is not an option while recording is *recorded as a suggestion*,
so "for the next hour you cannot move" must stay a suggestion. They are checked before
`TRIGGER_START`, whose `when (i say|you hear) (.+)` would otherwise read "only when I say it exactly"
as a new trigger called "it exactly". An option heard with no recording open falls through
untouched.

**Whole words.** `phraseMatches()` pads both sides with spaces, which is a correct word boundary
because both strings are already normalised to single-space-separated words. The planting overlap
check is unchanged (raw containment). It is stricter than strict matching needs, which errs toward
refusing a plant rather than allowing one that double-fires.

**The lifespan ceiling** (`triggerLifespanMinutes`, 0 = none) applies at commit only, and to every
trigger planted while it is set, whether or not the installer asked for a lifespan. The installer is
told whenever her settings changed what he asked for (ceiling, scope, forced whole words). Rule 5:
the trigger works, just not as asked, and he cannot see her settings screen.

`test/trigger-options.mjs`, 99 checks. Verified by mutation: disabling each mechanism in turn turned
2–5 of its own checks red. Live steps: *Needs Testing* item 19.

### Fixed 2026-09-25 (v0.86.1) — ECHS took BC's `/bot` from every player

Bella reported it twice, on 0.84.1 (#223446 and #254192): with ECHS loaded, `/bot` to a room's own
bot answered "Not available — join the Hypno Testing room to use the test bot." Our bug, and not a
new one. `installBotCommand` has registered a top-level `/bot` since the test harness was built. Its
comment said an unregistered `/bot` "never leaves the browser". That was never checked against
BC's own command list. R132 `CommandsDefault.js` does define `bot`: it sends
`"ChatRoomBot " + text` as a hidden message to every other character in the room, which is how
players address room bots. `CommandCombine` (R132 `Commands.js`) filters out any existing command
with the same tag before adding, so ours **replaced** BC's rather than being shadowed by it. The old
design note had this backwards: it worried that another add-on might shadow ours, when ours was
the one doing the replacing. Once the testing gate became room-based, the replacement refused
outside the Hypno Testing room, which is the message Bella saw.

The fix:
- **`/bot` is gone from ECHS.** `installCommands` registers `/hypno` and `/echs` and nothing
  else; the test channel is `/hypno bot <text>`, as it already was.
- **`/bot next` still drives the test bot,** through BC's native command. `testbot/bot.mjs` now
  reads a hidden `ChatRoomBot <text>` from anyone but itself as the same command. It survives
  silence for the same reason ours did: it's a command, parsed before the speech block.
  Nothing about the test workflow changes, except that the test bot needs restarting to pick
  this up.

`test/command-namespace.mjs` (5 checks) runs BC's own `CommandCombine`, transcribed from R132, with
BC's defaults (including its `bot`) registered first, then installs ECHS. It asserts ECHS adds
exactly `hypno` and `echs`, BC's `/bot` is still BC's object, and no BC command was replaced.
Against the old `commands.ts` it fails two: "BC's /bot is still BC's" and "no BC command was
replaced".

A player who already has the old version needs only the update and a page refresh. The
replacement lived only in the page, so nothing lingers.

### Changed 2026-09-24 (v0.86.0) — checkbox lists scroll

DW, on v0.85.4's "the tab is now full, page it next time": *"one way or another we are going to
need them."* Right, and building it once beats re-laying out a tab each time a setting is added.
So every checkbox tab is now one full-width column in a scroll area, and the two-column split
(`rowPosition`, `MAX_ROWS_PER_COLUMN`) is gone. Minor bump: a player has to learn that the list
scrolls.

**The scroll area lives in `panel.ts`**, not `menu.ts`, so the help screen or the remote panel
can use it later. On canvas, three pieces have to agree:

- **Drawing.** The content is drawn shifted by the offset and clipped to the area
  (`MainCanvas.clip`). Rows wholly outside it are not drawn at all, so a hidden button cannot raise
  a hover tooltip.
- **Clicking.** A click is accepted only inside the area, and hit-tested at the same shifted
  position the row was drawn at. Without that area check, the clipped-off half of a partly
  visible row would still toggle it, which is the v0.85.4 fault again.
- **The bar.** Arrows at each end move one row; the track pages. There is no drag, because BC's
  canvas delivers clicks, not drags, and click-only also works on touch screens.

**The wheel is wired by hand.** BC's extension-settings hooks don't forward the wheel. Checked
against the R132 `Extensions.js`: there is no wheel member, although `Game.js` listens on the
canvas for its own screens. So the settings screen adds its own `wheel` listener to
`MainCanvas.canvas` on `load` and removes it on `exit` and `unload`. The listener also acts only
while the rows were drawn in the last half-second, so a listener left behind by a missed unload,
or a wheel turned over the help page or the Depth tab, moves nothing. One row per notch,
whatever the device's delta.

**Where things landed:**
- The Permissions list scrolls, with the attempt control as its last item and its caption back on
  one line.
- Trance Defaults (seven rows, previously two columns) and Awareness fit without a bar.
- Triggers' rows stop at y 610, because its dropdowns are DOM elements from 630 down, and DOM
  cannot be clipped to a canvas area.
- The scroll offset resets on every visit and tab change.
- Scrolling works under the session lock; it changes no setting.

**Not moved to the scroll area:** the Depth and Stats tabs page with Prev/Next, and so does help.
They work, and their controls sit at fixed positions under the list. Moving them over is a
separate change if it's wanted.

`test/menu-layout.mjs`, rewritten for this, has 37 checks. It drives the real screen through
stubbed drawing, recording the clip each item was drawn under, and checks:
- the clip sits inside the panel, 20px above the floor, in one column, with nothing overlapping;
- each of the 13 rows, reached by the ▼ arrow, toggles only itself;
- the clipped half of a cut-off row is inert;
- the attempt control sits whole at the end;
- ▲ and the wheel move the list; a wheel with the pointer outside the list does nothing, and
  neither does one turned over the help page;
- Awareness has no bar, Trance Defaults is one column, and Triggers stops above 630;
- exit and unload both remove the listener.

Six mutations were each caught:
- click ignores the area;
- click ignores the offset;
- exit leaves the listener;
- the listener is not gated on the rows being drawn (the help-page check);
- no clip;
- the bar is clicked after the rows.

### Fixed 2026-09-24 (v0.85.4) — Self-Touch Control hidden under the attempt button

DW's screenshot of the Permissions tab showed the *Attempts before they must wait* button drawn over
the Speech Restriction row and its caption running past the panel floor. What it actually hid was
worse than an overlap: a tick mark peeking out from under the button was **Self-Touch Control**, the
seventh row of the left column. The button sat at a fixed y 740, placed when the rows stopped at 662;
the thirteenth permission (Made to Touch Others, v0.84.0) made `rowPosition` split the tab seven and
six, putting that row's checkbox at 748 — under the button, whose click handler runs first. A
permission nobody could see or change, and nothing said so (rule 5).

The fix is the brief's option B, not its scrollbar: the button moves to the first free row slot, which
is the bottom of the right-hand column, taken from `rowPosition(rows.length, …)` so it follows the
rows rather than a pixel constant. The caption wraps (`drawLeftTextWrap`) in that half-width column
and its band stops 20px above the floor. A scrollbar was not built: it is a lot of canvas machinery,
and the tab has room for the settings it has. **It is now full.** A fourteenth row makes both columns
seven deep and leaves no slot for the button; `test/menu-layout.mjs` fails on that (and on any
overlap), and the answer then is paging, the way the Depth tab does it.

`test/menu-layout.mjs` (14 checks) drives the real screen through `installMenu` with stubbed drawing
primitives and records every checkbox, button and line of text. It asserts no two overlap, all sit in
the panel, the caption is whole and 20px clear of the floor, and each checkbox and the button change
their own setting when clicked where drawn. Against the old `menu.ts` it fails two: the overlap
check (checkbox 6 × button, × caption, and its label × button) and "selfTouchControl did not toggle".

### Changed 2026-09-24 (v0.85.3) — routine console lines off by default, `/hypno debug`

Fina's feedback, relayed by DW as a brief (`console_cleanup.md`): ECHS floods devtools. **Most of the
brief was already done in v0.82.3**, which moved every routine line from `console.log` to
`console.debug` behind the `log()`/`warn()`/`info()` split in `log.ts`. What it did not cover is
the reader the complaint actually came from: another mod developer keeps the console at
*Verbose* for their own work, and there `console.debug` shows, including one line per chat message
(`main.ts`'s `ChatRoomMessage` hook).

So `log()` is now gated: silent unless `/hypno debug` is on (stored in `localStorage` under
`ECHS_DEBUG`, per browser) **or** the player is in the Hypno Testing room. The room turns it on by
itself so a tester never loses diagnostics by forgetting a switch — Known Bug #11's next step reads
exactly that per-message line. `warn()` and `info()` are not gated (rule 5, and the troubleshooting
page's "script loaded" line).

**Departures from the brief, deliberately:** the tag stays `[HypnosisAddon]` rather than `[ECHS]`,
since the docs name it as a fixed identifier and a rename breaks anyone filtering on it; no fourth
`error` level, because caught exceptions already go to `warn()`, which always shows; no `Log` object
rename across 24 importers; no blanket try/catch pass, since every hook is already inside
`safely()` or its own try/catch.

**The gate reads the room, not `isTestingMode()`.** The harness pins `isTestingMode()` on for every
suite, so a gate built on it could never be seen switched off in a test, and the suite would pass
for the wrong reason. `isTestingMode()` is now `FORCE_TESTING || inTestingRoom()`, and the gate uses
`inTestingRoom()`.

`/hypno debug [on|off]` sits under Diagnostics, not Testing: a player outside the room may be asked
to turn it on for a report. Its answer goes to chat. `test/console.mjs` grew from 7 to 32 checks:
off, on, the room, reload persistence (a fresh module instance over the same storage), blocked
storage, and the registered command. Checked to fail against three broken variants: gate removed
(2 fail), gate on `isTestingMode()` (4 fail), `warn()` gated too (1 fail).

---

### Fixed 2026-09-24 (v0.85.2) — a stuttering hypnotist's commands missed

DW's request: spoken commands should survive stuttering and muffled speech. **What was actually
broken is narrower than it looked, and worse.** BC stutters on the *sender's* client
(`SpeechTransformStutter`, `Speech.js`, verified R132): at the start of a word it inserts the
word's own first letter and a dash, at most once per word, and the first word always. `normalize()`
turned the dash into a space and left a stray letter, so `k-kneel` became "k kneel". A lone word
still matched, since `kneel` finds it, which is why the obvious test passes. **A phrase did
not:** the stray letter lands between its words. Swept over every What to Say example at BC
intensities 0–10, **1,284 of 2,068 stuttered lines missed**, and `k-kneel s-spread` was read as a
plain kneel.

**Fix:** `unstutter()` in `voice.ts`, applied at the one chokepoint in `main.ts` before
`stripOOC`, so suggestions, triggers, the name gate, induction RP and trust all read the typed
words. The transform only adds, so removing `X-` before a word that starts with X is exact.
Repeated typed stutters (`k-k-kneel`) are taken too; hyphens inside words (`re-read`, `T-shirt`)
are not.

**Decided 2026-09-24 (DW): a gag still works as a gag.** Gag garbling destroys the words. The only
way through is the ungarbled copy some senders attach (BC's own `Original` entry when the sender
has *Don't garble online chat and whispers when gagged* on, or BCX's `BCX_ORIGINAL_MESSAGE` tag,
which `shared/decodeMessage.ts` in the other bots reads). Offered with a recommendation to honour
it when the subject can see it; **DW chose never**. No mod-specific "drunk" speech exists in DW's
rooms, so none is handled.

New suite `test/stutter.mjs`, 111 checks, including BC's own stutter routine transcribed so the
cases stutter as the game does, and the full catalogue sweep. **86 fail with `unstutter` reduced to a
passthrough.** **Not run live.**

### Added 2026-09-23 (v0.85.1) — Cancel in the setup wizard

DW's request: an explicit way to abort the first-time setup. The welcome page already had
*Skip — I'll set it up myself*, but once a player chose *Answer a few questions* the only ways out
were **Apply** or BC's exit icon, and the exit icon only left the screen: the half-answered wizard
(module state in `wizard.ts`) was waiting on the same question next time. Every question page and
the summary now carry **Cancel**, placed beside the forward button rather than at the far left where
Back is.

`cancelWizard()` throws the answers away and writes no setting. **On a first run it marks setup done,
exactly as Skip does**: leaving `starterState` at "new" would keep `shouldShowWizard()` true, and
Cancel would land the player straight back on the welcome page, which is not an exit. A re-run from
the Setup button leaves `starterState` alone. Taken as the default, since it is what Skip already
means; say if a cancelled first run should instead offer the wizard again next time.

`test/wizard.mjs` +17 checks, driven through the real click routing (every `DrawButton` recorded,
`MouseIn` hitting one rectangle). The suite stops at the first missing Cancel on v0.85.0; removing
the answer-clearing fails the "ticks do not resurface" check, and removing the first-run `done`
fails three. **Not run live.** The exit icon's resume-where-you-left-off behaviour is unchanged.

### Added 2026-09-23 (v0.85.0) — the pose library

DW's brief of 2026-09-23: the whole BC stance and arm catalogue, not only kneel and stand. Five leg
poses (kneel spread, legs spread, legs closed, all fours, lie down) and five arm poses (hands behind
the back, arms behind the back, elbows behind, arms up, arms out), plus *"relax your arms"* to clear
the arms. The phrases are in the What to Say tab and the wiki.

**The names are BC's real ones, from DW's reference** (`docs/bc-pose-reference.md`, verified against
upstream `Typedef.d.ts`). The brief's own list was wrong in six places: `HandsBehindBack`, `OverHead`
and `Yoke` are `BackCuffs`, `OverTheHead` and `Yoked`; `Sit`, `CrossedArms` and `Surrender` do not
exist. So *"sit"* and *"cross your arms"* are not offered at all (sitting in BC is furniture), and
*"surrender"* raises the arms over the head, the closest pose. `AllFours` and `Hogtied` are BodyFull,
so they displace an arm pose; that is expected and not logged as a loss.

**DW's calls, 2026-09-23:** one tick for all of it, renamed **Posture Control** on the Depth tab
(it was "Posture (kneel / stand)"), at the same Yielding default; self only, not aimed at other
people; keep *"relax your arms"* and *"surrender"* despite both being ordinary induction patter, with
the clash noted in the wiki rather than guarded in code.

**Two groups.** BC keeps legs and arms in the one `ActivePose` array. The brief's mutually exclusive
buckets are kept: `POSE_GROUPS` in `effects.ts`, and `setSuggestedPose(pose, group)` changes one
group and leaves the other. **This changes "stand":** it used to reset the whole pose, arms
included, and now clears the legs only. Setting a pose goes through BC's own
`CharacterSetActivePose` and the pose-only `ChatRoomCharacterPoseUpdate`, as kneel always did. The
brief's sample called `ChatRoomCharacterUpdate`, which resends the whole appearance to set a pose;
not used.

**Rule 5, and a fix to kneel.** Before this, a kneel that bondage prevented was still announced as
done. Every pose is now read back off `ActivePose` after it is set; one that did not take reports
`pose-blocked` to the hypnotist and has the room see her try and fail. This stands in for the brief's
`CanKneel()` pre-check, and needs no knowledge of which BC call refuses.

**Teardown undoes only ours, per group.** A session ending clears a group only while the pose in it
is still the one a suggestion set, so a pose she chose herself, or changed into since, stays. A
trigger's undo takes back only its own pose (`clearSuggestedPose(group, pose)`), so undoing a kneel
trigger does not also stand up a *"spread your legs"* said afterwards. The reconnect save is now a list of our
poses; a single string from an older save still restores. `stand` and `arms-relax` release every
pose in their group, so the carrier can let go of any carried leg pose with *"stand"*.

**Not verified: BC's per-category behaviour.** The setter's body was not read, so that setting one
category leaves the other alone is inferred from the categories, not seen. Nor which poses are
`AllowMenuTransient` (item-only); `Hogtied` is the likeliest. Either shows up honestly as
`pose-blocked` rather than a false announce. *Needs Testing* item 17. `test/poses.mjs`, 81 checks.

### Fixed 2026-09-23 (v0.84.3) — Import got round the settings lock

"Lock settings while a session is on you" greyed and refused every checkbox and the attempt limit,
but the Data tab's Export/Import/Reset branch in `menu.ts` handled its click and returned *before*
the `settingsLocked()` check, none of the three greyed at draw time, and `/hypno import` never read
the lock at all. Import replaces every toggle in one go without ending anything, so a subject
mid-session could paste a blob and rewrite every permission the lock was holding still, the lock
included. Found by inspection (first noted 2026-09-17), not reported from play.

**Fix:** Import alone now respects the lock. The button greys out and, if clicked, says
*"Import refused: your settings are locked until this session ends."* before the clipboard is read,
so no browser clipboard prompt appears for nothing. The lock is read again when the clipboard
answers, because that read is async and a session can start while the browser is still asking.
`/hypno import` refuses with the same line (one exported constant, so the two cannot drift), since
otherwise it is the way round the lock and the button's own clipboard-failure message points at it.

**Decided, not re-decided:** Export and Reset stay open. Export only reads. Reset ends the session
through the safeword's teardown before it wipes (Known Bug #4, v0.63.1), so it is a way out, not a
way round, and refusing it was already rejected there.

`test/import-lock.mjs`, 24 checks: the command and the button refused under the lock, the async
race, Export and Reset still open, and controls (lock ticked with no session; session with the lock
unticked) where Import must still work. **8 verified failing** against v0.84.1. **Not run live** —
the greyed button has not been seen in a real BC client.

---

### Fixed 2026-09-23 (v0.84.2) — the first-run notice never fired on an ordinary login

Found reading the code for v0.81.0's startup banner, not reported by a tester. `maybeShowFirstRunNotice()`
rode `startRecovery()`'s identity-and-room branch. That poll gives up on a room after
`NO_ROOM_FALLBACK_MS` (20 s), runs recovery on identity alone, and clears itself for good. Logging
in and then browsing the room list takes longer than 20 s, so the notice only ever got its chance on
a refresh while already in a room, where BC rejoins quickly. The discovery gap v0.74.3 built it to
close was still open for the people it was built for.

The notice now rides `startStartupBanner()`'s poll in `welcome.ts`, which already existed for the
same reason (it waits on `ServerPlayerIsInChatRoom()` for up to ten minutes) and prints right after
the banner. So there is still exactly one poll serving the chat-log lines, and `recovery.ts` keeps
its own no-room fallback unchanged. The banner's gate now also requires a known member number: the
banner reads no settings but the notice does, and reading them before login is the v0.17.0 trap.
Being in a room should already imply login, so this is a guard rather than a behaviour change. If a
page sits in the lobby past the ten-minute give-up, nothing is marked shown and the notice waits for
the next load.

`test/first-run-login.mjs`, 13 checks, walks the ordinary arrival (load, log in, 25 s in the lobby,
join at 55 s) through both real polls: 3 fail with the notice call taken back out of the banner
poll, and 2 fail with the member-number gate removed. `test/banner.mjs` now marks its player welcomed
first, since a fresh install there would print the notice after the banner too. **Not run live**:
*Needs Testing* item 16.

### Fixed 2026-09-23 (v0.84.1) — two ways an orgasm still got past spoken denial

A code review against BC's live `Timer.js` and `Activity.js` (read 2026-09-23), with LSCG, BCX and
WCE's orgasm handling alongside, found two routes past v0.83.2's hooks. Neither needs any luck, and
together they explain the "still not working" report without a mod bypassing us. BC's own denial
has no random element: with DenialMode present, `ActivityOrgasmPrepare` pins Progress at 99 and
returns every time. So the target is zero leaks, not fewer.

**1. A swallowed orgasm stayed queued.** Timer.js calls `ActivityOrgasmStart` once `OrgasmTimer`
runs out while `OrgasmStage <= 1`. v0.83.2 swallowed that Start but left the timer set. BC retried
Start every second, the chat room kept drawing the orgasm overlay (it draws whenever
`OrgasmTimer > 0`), and **the first tick after our denial lifted gave her a full orgasm**. That
could be waking, "you may cum now" or the session ending. The way in is a denial landing inside
BC's 5-second window after Prepare, which is exactly the moment a hypnotist would say it. **Fix:**
a hold now cancels any pending orgasm (stage 0 window or stage 1 resist game) as
`ActivityOrgasmStop` does, setting timer and stage to 0, but without its arousal drop, and keeps
her at 99. It syncs the room only when it actually cancelled something. An orgasm already
**happening** (stage 2) is left alone, since one only gets there while our denial was off (a
commanded "cum for me").

LSCG's `DeniedState` closes the same gap differently: it hooks Start at priority 100 and forces
`ActivityOrgasmRuined`, so BC's own ruined branch clears the state. DW chose holding at the edge
over a ruined orgasm and its drop to 65-85. Technique reference only (rule 7).

**2. The carrier was the only record.** The hook read `hasOwnEffect("DenialMode")` and nothing
else. Anything that rebuilt the Emoticon item removed the denial silently: an outfit load, or
another mod restoring appearance. The hook then stood aside. **Fix:** `arousal.ts` keeps an
in-memory flag, set by `setOrgasmDenied` and cleared by `clearOrgasmDenial`, which every release
path already goes through. The hook trusts the flag, and puts the carrier back (with a warning) if
it finds it gone, so BC's own 99 pin and the room agree again. The forced-orgasm pierce in
`voice.ts` now lifts and restores through `setOrgasmDenied` too. A bare `removeEffect` there
would have left the flag up and blocked the very orgasm being commanded. After a page reload the
flag starts false, and `orgasmDeniedByUs()` still honours a carrier that a restored session left
denied.

**Not changed, flagged for DW:** denial still ends with the trance. `clearOrgasmDenial()` runs on
every session exit unless the suggestion is carried forward. Before fix 1 a queued orgasm fired
the moment she woke, which made this look like a leak. Whether denial should outlast waking is a
design decision. **Also noted:** with WCE's alternate arousal on, its private meter
(`BCEArousalProgress`) is written over Progress on every tick, so a held subject sits effectively
at 100 and finishes the instant denial lifts. That is expected, not a leak.

**Checked:** `test/denial.mjs` grows from 20 to 34 checks. With fix 1 disabled, 4 of the new
checks fail. With fix 2 disabled (the hook reading the carrier alone), 3 fail. The `loader` suite
fails 3 checks on a Windows checkout only: `core.autocrlf` gives `meta.txt` CRLF endings, which
the header parser splits on `\n`. That predates this change.

### Added 2026-09-23 (v0.84.0) — commanded activities aimed at someone else

DW's ask, 2026-09-23: *"Missy Kiss Rei"* (lips assumed), *"Missy Kiss Rei's Nipples"*, *"Missy
Kiss me"* where me is the hypnotist, for every verb the self grammar already knows, leaning on BC's
own systems *"to make sure any limitations will stop me"*. This builds the named-target half of
design.md's *Phase 2: acting on others* (spec'd 2026-09-16). The random bystander, zone tiers by depth
and targets inside triggers are still unbuilt.

**DW's six calls, 2026-09-23, all as recommended:**
1. **Names are exact:** a room member's Name or Nickname, whole. No prefix and no fuzzy match. This
   is the 2026-09-16 recommendation made a decision. Two people sharing the name is refused, with
   the reason given.
2. **No part named:** a per-verb default only where there is one obvious spot. Kiss goes to the
   lips, spank to the bottom, pet to the head. Every other verb asks for a part. A part word that
   is not in `BODY_PARTS` ("Rei's cheek") is refused rather than read as no part, which would have
   sent the default somewhere else.
3. **Consent, subject side:** aiming at the hypnotist rides on *Made to act*. Anyone else also needs
   the new `compelTouchOthers` ("Made to Touch Others"), off by default. Only the Extreme wizard
   preset grants it; every other wizard answer turns it off.
4. **Refusals:** for the hypnotist's own body, say which of *their own* settings refused where one is
   positively identified (item permission, arousal Inactive, the zone set to no). Otherwise say where
   to look. A third party's refusal is only *"didn't land"*, with no reason, so the command cannot
   read a stranger's configuration (the 2026-09-16 spec's rule).
5. **Depth:** the same `compelActivity` gate as the self grammar. Its label is now "Made to act (on
   yourself or others)".
6. **Triggers:** later. A targeted command said while a trigger records is refused out loud, not
   recorded and not performed.

**How BC decides, and what we add.** `runCommandedActivity()` now takes a target.
`ActivityAllowedForGroup(target, group)` is asked about *their* zone, so BC reads their synced
arousal settings together with the subject's own reach, hands and mouth. `ActivityRun(Player,
target, …)` then renders it exactly like a click. On top of that we honour BC's **item
permission** (`ServerChatRoomGetAllowItem(Player, target)`, falling back to the synced `AllowItem`).
Only an explicit `false` refuses. **Unverified against BC source**, which is unreachable from the
workspace: that the function exists with that shape, and whether BC itself gates *activities* on item
permission. Honouring it can only refuse more, which is the side DW asked for. The target needs no
add-on.

**The addressee-scoping bug this exposed.** `splitSegments()` read a name after any verb as the start
of a new address (v0.79.1's "Natalia, stand Missy cum for me" rule), so "Missy, kiss Rei" reached
Missy's matchers as "Missy, kiss". `OBJECT_VERBS` now keeps a name after an activity verb as the
object. A test asserts the set covers every single-word verb in `ACTIVITY_VERBS`. On Rei's own
client, the same line is now correctly not hers. Before, it was an ambiguity refusal if she was in a
session.

**"feel" does not aim.** "Feel my voice" and "feel my hands on you" are ordinary patter, and a
targeted match pre-empts every suggestion after it, so `feel` stays a self-only verb. For the same
reason, "my <word>" is claimed only when the word is a known part ("rub my back" falls through
untouched).

`test/touch-others.mjs`, 60 checks. Each safeguard was removed in turn and the suite went red:
scoping fix (16 failures), acting on self (9), the new tick's gate (2), item permission (3), a reason
leaking for a third party (2), the feel exclusion (1), ambiguity refusal (1). **Not run live.**
*Needs Testing* item 15.

### Fixed 2026-09-23 (v0.83.2) — denial now stops the orgasm itself

v0.83.1 failed its first live run the same night. The subject on v0.83.1 was told "you cannot
cum" and got the denial line. A toy at maximum then held her meter still, which is BC's own denial
at work. Her own masturbation finished her anyway, with nobody saying "cum for me".

**BC's source, finally read.** DW pulled the unhooked originals from the live client with
`bcModSdk.getPatchingInfo().get(name).original`, which is the way past other mods' wrappers.
`String(ActivityOrgasmPrepare)` alone printed only bcModSdk's entry stub. `ActivityTimerProgress`
calls `ActivityOrgasmPrepare(C)` when Progress reaches exactly 100. Prepare checks `C.Effect` (the
cache, so v0.83.1's fix was needed), sets Progress 99 and returns, **unless** `Bypass` is passed or
`RuinOrgasms` is on. In the room, BCX hooked Prepare and WCE hooked TimerProgress. The subject's
own mod list is not known, so which route got past BC's check is **not established**.

**Fix:** `src/denial.ts` hooks `ActivityOrgasmPrepare` and `ActivityOrgasmStart` at priority 10.
While OUR carrier holds DenialMode (`hasOwnEffect`, not the cache) and *Hypnosis Enabled* is on, the
call is swallowed and Progress is set to 99, as BC's own branch does. Direct write, not
`ActivitySetArousal`, so a toy at full power does not send a room sync every climb. A new
`orgasm-held` flavor tells the subject and the room, at most once a minute (rule 5). A real chastity
item's DenialMode alone passes through to BC. "Cum for me" lifts ours before it calls in, so the
command still wins. A throw in the check falls through to BC.

**Not handled:** a mod that writes OrgasmTimer or OrgasmStage itself without calling either
function. **Checked:** `test/denial.mjs`, 20 checks, 8 of which fail with the hook disabled.

### Fixed 2026-09-23 (v0.83.1) — spoken orgasm denial did not stop orgasms

DW's tracker: *"Spoken orgasm denial suggestions fail to hook and prevent orgasm events."* DW
expected it already worked, and the pieces were all there (v0.27.0): a pattern entry, BC's own
`DenialMode` on the Emoticon carrier, release on every exit. Two faults between them.

**1. BC never looked where we wrote.** BC asks "is this player denied" of the cached
`Player.Effect` array, which `CharacterLoadEffect` rebuilds from appearance. `applyEffect()` wrote
`Property.Effect` and called `ChatRoomCharacterUpdate`, which only sends the appearance to the room.
So denial sat on the carrier, the hypnotist was told it landed, and an orgasm BC started on its own
went straight through until some unrelated refresh (a dialog, a clothing change) rebuilt the cache.
v0.74.0 found exactly this for the forced-orgasm pierce, and fixed it only in `applyForcedOrgasm()`.
**Fix:** `applyEffect()` and `removeEffect()` rebuild the player's cache every time. The explicit
calls in `voice.ts` are now redundant and harmless, and were left alone. Side effect, intended: our
Freeze, BlockWardrobe and Leash also take hold the moment they are set, and the `HasEffect("Freeze")
&& !hasOwnEffect("Freeze")` "real restraint" test can no longer read a stale Freeze of ours as
someone else's.

**2. The words.** Seven ordinary phrasings matched nothing (*must not*, *mustn't*, *are not to*, *not
permitted to*, *forbidden from cumming*, *don't you dare*, *don't dare*). Worse, a denial that names
its own end — *"you cannot cum until I allow you to cum"*, *"…until I say you may come now"* —
matched `orgasm-allow`, which is listed first, and **lifted** denial. `orgasm-allow` now carries an
`unless` veto (`ORGASM_DENIED_UNTIL`): a negated orgasm followed by *until/unless/till/before*.
`normalize()` expands *mustn't*.

**Unchanged by design:** "cum for me" still pierces our denial and puts it back (DW, 2026-09-12),
and every trance ending lifts it (`endSession`, safeword).

**Checked:** `test/activity.mjs` +7, `test/arousal.mjs` +12; 3 and 10 of them fail on v0.82.3. The
activity checks call no `CharacterLoadEffect` by hand. **Unverified:** BC source is unreachable from
the workspace, so that `ActivityOrgasmPrepare` reads the cache rests on the v0.74.0 note and
`DEVELOPMENT.md`. `design.md` Known Bug #10, *Needs Testing* item 14.

### Changed 2026-09-23 (v0.83.0) — the install becomes a loader; the add-on comes from jsDelivr

DW's tracker item "jsDelivr CDN loader", group D (distribution). DW picked the recommended option on
all three calls. The full design, and how existing installs move over, is in
[`DEVELOPMENT.md`](DEVELOPMENT.md) → *Publishing and the install story*.

**What changed.** The root `HypnosisAddon.user.js` is now a ~5 KB loader (`src/loader.ts`). On every
page load it adds the add-on from jsDelivr following `main`; if that load errors it fetches the raw
GitHub copy and runs it inline; if that fails too it puts a red note on screen that stays until
clicked. The add-on itself is committed at `cdn/HypnosisAddon.js`. `npm run release` now writes both
files. A GitHub Action purges jsDelivr's cached copy on every push to `main` that changes the bundle.

**Why.** Up to v0.82.3 a fix reached a tester only when their manager next checked for updates. Now
it reaches them on their next refresh. It is also the shape FUSAM listing will want: a stable,
fetchable bundle URL.

**The three calls (DW, 2026-09-23):**
- **Main, not tags.** No tag to push per release. The cost is jsDelivr's branch cache, up to 12 hours
  by its own documentation, which the purge Action exists to clear.
- **Fallback, then notice.** A second source for players who can reach GitHub but not jsDelivr. There
  is deliberately no timeout: only a load that errors falls through, so a slow CDN answer can never
  load the add-on a second time.
- **The loader's version tracks `package.json`.** One version source, as before; a manager shows the
  same number as the startup chat line.

**Not in this release: the `ExtensionSettings` key migration**, group D's other item. The loader runs
the same code under the same key, so it needs no migration.

**Not verified, and why.** jsDelivr (the CDN and the purge endpoint) is unreachable from the build
workspace (403 at the proxy), so the 12-hour figure and the purge URL are from jsDelivr's documentation
as remembered, and the Action's first run is its first real test. Nothing here has confirmed that BC's
page accepts a script tag from `cdn.jsdelivr.net`; other BC add-ons are believed to load this way. Both
are item 13 under *Needs Testing* in `design.md`. What *was* checked from here: raw GitHub serves
`text/plain` with `nosniff` (so a script tag there is refused, which is why the fallback fetches),
`access-control-allow-origin: *`, and `max-age=300`.

`test/loader.mjs`, new: the three load outcomes against a stub DOM, the loader's header against
`meta.txt` (one version line, unchanged update URLs, name, namespace and every `@match`), and the shape
of the two committed files. Each of six planted regressions was seen to fail before the suite was kept:
no notice, no early return after a CDN load, a changed update URL, a second version line, a dropped
host, and the full add-on copied back to the root. The loader logs through `log.ts`, so
`test/console.mjs`'s "nothing reaches console directly" rule holds for it too.

### Fixed 2026-09-22 (v0.82.3) — tracker group C, small visible fixes

DW's tracker group C, six items in one PR. Five shipped; the induction asterisk did not, see the
end. v0.82.2 is the silent trance expiry, in flight alongside this.

**1. `((ooc))` read as speech.** `stripOOC()` removed asides with a flat `\([^)]*\)`, which stops
at the first `)`. A doubled `((brb))` matched `((brb)` and left the second `)` behind, so the
result was `")"` rather than `null`. The speech gate in `main.ts` lets a silenced player through
only when `stripOOC()` returns `null`, so the lifeline was refused. Nested asides `(brb (dog))` had
the same leftover. **Fix:** a depth-counting scan. An unclosed `(` still swallows the rest of the
line, as before; a `)` with nothing to close stays as text, so `:)` is still speech and still
blocked while silenced. `test/ooc.mjs` → 39; 10 of the 16 new checks fail on v0.82.1.

**2. The veil covered the game's own UI.** It painted after `DrawProcess`, BC's whole frame, over
`0, 0, MainCanvasWidth, MainCanvasHeight`: every menu, settings screen, wardrobe and dialog. The
design only ever asked for a veil over the scene. **Fix:** `drawTranceVeil()` in `effects.ts`,
called from a `ChatRoomRun` hook after `next()`, over x 0–1003, the rect `prompt.ts` already
verified against `ChatRoom.js` as the character half. Priority 9, below the prompt's 10, because the
mod SDK calls higher priorities first: the veil draws inside the prompt's hook, so the Agree /
Ignore / Fight box paints on top of it. Only the chat room is veiled now; the wardrobe and other
screens are not. **Not verified:** whether BC runs `ChatRoomRun` while a character dialog is open.
If not, the veil lifts while a dialog is up. New suite `test/veil.mjs` (14 checks), 7 of which fail
on v0.82.1.

**4. Preset blurbs cut off.** Reproduced, and it is not really font-dependent: measured in Chromium
with Liberation Sans (metric-compatible with Arial), Balanced is 1404px and Extreme 1332px at
`drawLeftTextFit`'s 22px floor, against a 1000px column. So those two were clipped with "…" for
everyone, and a wider font preference (monospace, DejaVu/Verdana-like) clipped all four.
**Fix:** `drawLeftTextWrap()` in `panel.ts` word-wraps before shrinking, taking the largest size
from 32 to 18 whose lines fit 84px of the 90px row. It clips only if even 18px cannot hold it.
`test/wizard.mjs` → 43; 8 of the new checks fail on v0.82.1.

**5. Console noise.** `log()` wrote everything to `console.log`, including one line per chat
message. It now writes `console.debug` (hidden at Chrome's default level). A new `warn()` carries
the 33 calls that report a genuine fault: a caught exception, a missing BC piece, a failed hook
install. Those stay visible, per rule 5. A gate *refusing* on purpose stays in `log()`. The
"script loaded" line is `info()`, visible by default, because the wiki's troubleshooting page tells
players to look for it. New suite `test/console.mjs` (7 checks), which also fails if any module
calls `console` directly.

**6. The loaded watermark.** It was a permanent DOM element. It is now `showLoadedToast()` in
`welcome.ts`: it holds 5 s, fades over 1.5 s, and removes itself on a plain timer, so a background
tab that never runs the transition still loses it. It reads `__VERSION__` like the other version
surfaces, and `test/banner.mjs` now checks it in `welcome.ts`. The startup chat line (v0.81.0) is
what answers "which build"; the toast only says the script ran. Taken as a **patch**: a player has
nothing to learn from it. New suite `test/toast.mjs` (15 checks).

**3. The induction asterisk: not fixed.** Every room line, the induction one included, goes through
`tellRoom()` as a `**`-emote (the v0.72.7 fix for the doubled name). No code path puts a `*` in
front of the induction line and not the others. So a stray asterisk would have to come from how BC
displays a `**`-emote, and `test/notify.mjs` models that display step without proving it. The BC
source is unreachable from these sessions. A guess here risks bringing back Known Bug #5. What
would settle it is the raw chat line as DW's screen shows it.

---

### Fixed 2026-09-22 (v0.82.2) — a trance that times out says so, on all three screens

DW's tracker: *"Silent Trance Expirations — When a 30-minute trance naturally times out, neither the
hypnotist nor the subject receives notification or feedback."* Known Bug #9.

**Half right as written.** The subject was told: `endSession("session timed out")` printed
*"[You come out of trance. (session timed out)]"*, which has been in the code since at least
v0.73.2. It reads as a status code, not as the trance ending, which is probably why it did not
register. The rest was true: **the hypnotist got nothing in chat**, only the subject's panel quietly
flipping to idle, and **the room never saw the subject come back** after watching them go under.

**Fix, on v0.76.0's three-screen pattern for a missed induction:**

- **Subject:** a line from a new `tranceExpiryLine()` pool, then the reason in plain words: *"(The
  trance ran its full 30 minutes.)"*.
- **Room:** `announceTranceExpiry()`, gated by *Others see your reactions* through `tellRoom` like
  every public line.
- **Hypnotist:** the subject's final `session-update` now carries `ended: "timeout"`, and the
  hypnotist's client prints `hypnotistExpiryFlavor()` plus *"The trance reached its 30-minute limit
  and has ended."* Keyed on that marker rather than on a Hypnotized → Idle transition, because every
  ending makes that transition and most are not ours to narrate (a self-wake is the subject's own;
  the safeword already speaks for itself). **Additive on the wire**: an older hypnotist client
  ignores the field, and an older subject client never sends it, so a mixed pair behaves as before.

**Choice-agnostic.** The timeout is thirty minutes whichever way the subject chose, so the only
risk is prose that narrates a choice. `test/expiry.mjs` holds all three pools to the same word list
`test/miss.mjs` uses, and checks the update that reaches the hypnotist is **byte-identical** across
agree, ignore and fight, driven through the real roll each time.

**A second bug on the same path.** A trance whose timeout passed while the subject was logged out,
but who came back inside recovery's five-minute window with the hypnotist present, went through
`waitForHypnotist()`'s resume: `restoreSavedSession()` ended it as expired, and `resume()` then
printed *"You are still under, and it is as though you never left."* straight after. The restore
handler now returns `false` when it ended the trance, and the resume line is skipped. That path
says *"(The trance ran out while you were away.)"*, tells the hypnotist, and sends the room nothing,
since nothing happened in front of it.

**Decided by default, open for DW:** the hypnotist is told. The timeout reveals that the trance
ended, which the panel already showed, and nothing about the choice or the depth.

`test/expiry.mjs`, 48 checks. It crashes outright on v0.82.1 (the pools do not exist), and with
only the `recovery.ts` half reverted its "not that they are still under" check fails. **Not run
live.**

---

### Fixed 2026-09-22 (v0.82.1) — a fired trigger survives a relog

DW's tracker: *"Active trigger effects and durations are cleared entirely upon logging out or
reconnecting, rather than persisting across their remaining timers."* Known Bug #8.

**The design was already there and half of it worked.** `recovery.ts` has restored fired triggers
on their remaining time since v0.44.0, and `test/recovery.mjs` proved it, but only from a saved
copy written by hand. Nothing checked that the copy was ever written, and for a trigger it never
was. `persistState()` runs on session transitions, and its heartbeat is armed only by one. A
trigger normally fires with no trance running, so it lived in memory only. The reload found
nothing saved, read the trigger's Freeze on the Emoticon item as a crash orphan, and released it.

**Fix:** `saveForReconnect()` (exported from `session.ts`, since `voice.ts` cannot reach
`persistState()` otherwise without a cycle) runs when a trigger fires, when it lets go, and when
recovery restores one. The last one re-arms the heartbeat, so a second reload after the trigger
lets go does not put it back from a stale copy.

**What saving exposed.** Once a copy exists, the orphan check never runs, so a trigger whose clock
ran out while the subject was away would have come back as a stranded Freeze with nothing to
release it. The durable-only branch of `attemptRecovery()` now takes our BC effects off first and
lets the restore put back only what still has time. If nothing comes back it says
*"Whatever was holding you ran its course while you were away."* and returns `expired`, rather than
releasing silently. **Carried suggestions had the same flaw:** `restoreCarried()` reads a spent
remainder as "no clock" and held forever, so `restoreDurable()` now skips an expired carry the way
`restoreTriggers()` already skipped an expired trigger.

**Offline time counts** (clocks are wall time), unchanged from the existing design. **Decided by DW
2026-09-22: keep ticking**, not pause. A pause would let a short trigger hold someone who comes back
the next day.

`test/relog.mjs` (38 checks) runs plant → wake → fire → reload with no hand-written state. The
reload imports a second copy of the bundle under a query string, so every timer and marker is
genuinely gone and only localStorage and the Emoticon item carry across, as in BC. 20 of its checks
fail on v0.82.0; four new ones in `test/recovery.mjs` plus two for the carry fail there too.

**Not run live.** Unverified: whether BC's in-page relog screen (a dropped socket, not a page
reload) keeps module state. If it does, that path never lost anything and this fix is about
refreshes and fresh logins.

---

### Fixed 2026-09-22 (v0.82.0) — awareness leaks: four causes behind six reports

DW's tracker listed six awareness and illusion symptoms. They came down to four causes and a
wording problem. Every new check was run against the old code first and seen to fail.

**1. "You may notice…" switched awareness off.** `awareness-release` carried a bare
`/you (can|may) notice/`. Hypnotic patter starts that way constantly, so "Missy, you may notice a
warmth spreading" matched it and silently lifted clothing, bondage and touch hiding, **the
illusion** and numbness, mid-scene, with nothing said to the hypnotist. That one pattern was both
"inconsistent suppression" and "awareness cancels the illusion". It now needs an object that means
awareness coming back (`again`, `everything`, `things`, `it all`, `what happens to you`). "You can
notice my touch", which the bare pattern used to take, now goes to `touch-release`, which it was
always worded as. That re-pins a case `test/sup.mjs` had pinned as deliberately shadowed; the
reason for the old pin was the bare pattern, not a design choice.

**2. The strip command read awareness lines.** `undress-all` and `undress` sit before every
awareness entry, and their bare `/strip/` and `/undress/` read the whole line. So "you won't notice
when I strip you" stripped her and never set awareness, and "…when I undress you" took a garment
off. That was "strip wipes awareness". A new optional `unless` on a table entry vetoes it on a
matching line and lets the line carry on down the table; the undress pair vetoes on "notice" and
"unnoticed". `clothing-awareness-block` learned "when I strip you", "being stripped" and
"anyone stripping you", so those land as the clothing line and not the broad one.

Still true: a line runs one suggestion. "Strip, and you won't notice a thing" now sets awareness
where it used to strip. Either way one half is dropped.

**3. Gags, collars, toys and locks counted as clothing.** `suppression.ts` sorted an asset by
`Asset.IsRestraint` alone. That flag means "restrains you", so an Item-slot asset can lack it, and
those messages leaked under "you do not notice being tied" and were hidden under the clothing line
instead. The asset-less branch already asked the group's `Category === "Item"`, so the same gag was
bondage or clothing depending on which message BC sent. Both branches now ask the category first,
the same split `illusion.ts`'s `isWornGroup` draws. **Consequence worth knowing:** lock messages on
the subject are now hidden under bondage awareness too. **Not verified against BC's source**, which
is unreachable from these sessions: which Item assets lack `IsRestraint` is from memory. The
inconsistency between the two branches is in our code and is not in doubt.

**4. The illusion hid the nametag.** The hook hands `DrawCharacter` a SIMPLE shadow character,
created with no name. The name is evidently drawn inside `DrawCharacter` from the character it is
given, contrary to the header comment in `illusion.ts`, which said the name was a separate call.
The shadow now borrows `Name`, `Nickname` and `LabelColor` for the one draw, and hands them back, so
no second named character is left in BC's `Character` array. **Inferred from the symptom**, not
from BC's source.

**5. Wording.** The Awareness tab blurb, the Clothing Illusion row and the wiki now say the two
apart: awareness hides the **chat messages**, the illusion changes **what you see of your own
body**, and a subject who should neither read about nor see a change needs both.

---
### Fixed 2026-09-22 (v0.81.1) — a real restraint no longer locks self-touch after the session ends

**Why:** the top item on DW's tracker, because it left a real person stuck after the session was
over. After "don't touch yourself" and then bondage gear, self-touch stayed blocked through the
safeword, through unticking movement, and through switching the add-on off. Only taking the item
off cleared it. The safeword is the floor (rule 2); anything that survives it is a bug.

**The cause was one line, and it was not where the report pointed.** The `ActivityRun` hook in
`selftouch.ts` refuses self-touch while frozen, and it asked `Player.HasEffect("Freeze")`. That is
true for *any* Freeze: ours, carried on the Emoticon item, or a real device that freezes. Every exit
path already cleared our block and our Freeze correctly. The hook then went on tripping over the
item's Freeze with no session, no permission and no add-on switched on behind it, and told the room
"{name} twitches towards {themselves}, and nothing moves" as if it were hypnosis. The "don't touch
yourself" order in the report was incidental: the gear alone was enough, even for a player who had
never switched the add-on on.

**What changed:**
- The frozen check reads `hasOwnEffect("Freeze")`. A real restraint is BC's to judge, through
  `ActivityAllowedForGroup` and whatever else BC applies. This is the same our-versus-real split
  `voice.ts` already drew for commanded touch.
- The hook stands aside completely while *Hypnosis Enabled* is off. `hardFloorStop()` already
  clears everything the hook reads, so this changes nothing today; it is there so the next piece of
  state someone adds cannot reach past the master switch.

What still blocks, deliberately: our own Freeze, the blanket "you cannot touch yourself" block and
the per-part blocks, while the add-on is on. The subject still sees a line when blocked (rule 5).

**Tested:** `test/selftouch.mjs`, 25 checks, drives the hook directly with a real-item Freeze kept
apart from ours. 10 failed against v0.81.0. Each half of the fix was then reverted on its own and
seen to fail its own checks. **Not run live.** **Not verified against BC source:** whether BC itself
stops a frozen player touching themselves. If it does, gear will still block, but BC will be the one
doing it and the add-on will no longer narrate it.

**Also in this build: Europe under both spellings.** DW asked (2026-09-22) that `bondage-europe.com`
and `bondageeurope.com` both be allowed. The hyphenated host was already matched. The unhyphenated
one was not, so on it the add-on was simply never injected, with no error anywhere. `meta.txt`
gains `*://*.bondageeurope.com/*` and `*://bondageeurope.com/*`, for eight `@match` lines in all.
**Not verified from here** that `bondageeurope.com` serves the game; an extra `@match` on a host that
does not costs nothing.

### Added 2026-09-22 (v0.81.0) — the build says its own version, in chat and in the settings title

**Why:** DW asked for it, and named it a small UI thing that may well change or go away later, so
it is deliberately one line and no settings. The useful side effect is bigger than the ask: which
build a tester is actually running has been an open question here since v0.75.0, when a second
`@version` line hidden in prose inside the `==UserScript==` block would have stopped the userscript
managers updating — silently, with nothing on any screen admitting it. "What does the first line of
your chat say?" now answers it in one message.

The bottom-right watermark already showed the version and does not solve this. It is a DOM element
a player stops seeing within a day, it is off-screen in a screenshot of the chat, and it cannot be
quoted back into a bug report. A chat line can.

**What it says**, local to that player's own chat log and to nobody else:

```
[Erotic Chat Hypnosis Suite (ECHS) · v0.81.0 · /hypno help]
```

The number comes from the `__VERSION__` build define, which `build.mjs` fills from `package.json`
— the same single source the watermark and the `@version` header already use. Nothing here is
hand-maintained, so it cannot drift from the build the way a typed literal would.

**Where it is printed from, and why not the obvious place.** `startRecovery()`'s identity-and-room
branch looks like the host — it is where the first-run notice rides, for the same reason (identity
known, a chat log to print into). It is the wrong one. That poll stops for good at its no-room
fallback twenty seconds after load, and logging in and then browsing the room list for half a
minute is the *ordinary* way to arrive, so the banner would simply never print for most sessions.
`startStartupBanner()` in `welcome.ts` runs its own one-shot poll instead, waits for
`ServerPlayerIsInChatRoom()`, prints once and stops. It gives up after ten minutes: a player who
has not entered a room by then is not starting up any more, and the line should not surface in the
middle of somebody's evening.

**Three things it deliberately does not do.** It never reaches the room — it goes through
`tellPlayer`, so it is bracketed and local, and a line announcing what add-on somebody is running
emoted into a public room is not recoverable once sent. It prints once per page load, not per room
change, because leaving and re-entering rooms is ordinary play rather than a startup. And it reads
no settings at all, so it says the same thing to every player whatever they have switched on — both
because a varying line would leak someone's configuration into a place they did not choose to show
it, and because it has to be a reliable answer to "which build are you on".

The first-run notice below it dropped its own version number in the same change. The two print next
to each other on a fresh install and both carrying "(ECHS) v0.81.0" read as a stutter; the notice
keeps the name, since it has to stand alone if it prints first, and the banner owns the number.

**The settings screen title carries it too**, in the same change and at DW's request — it was an
item on their own held list. `Erotic Chat Hypnosis Suite (ECHS) v0.81.0 — settings`. It rides the
existing title rather than taking a line of its own: the settings screen is where a player already
goes when something is not behaving, and that `DrawText` is centred on a 2000-wide canvas with room
to spare.

So three surfaces now show a version — the corner watermark, the chat banner and the settings
title — and all three read the same `__VERSION__` define. That is worth a guard rather than a
convention, because a hand-typed number in any one of them would disagree with the other two the
first time somebody bumped `package.json` without looking, and a version that lies is worse than no
version at all when the whole point is to settle which build somebody is on. The suite reads the
three source lines and fails on a literal.

`test/banner.mjs`, 23 checks, verified to fail on each regression that matters before being kept:
printing from the lobby (where BC swallows the line with no error, so the banner would never appear
and nothing would say so — rule 5), printing twice, and a hand-typed version in any of the three
surfaces.

**Not run live.**

---

### Fixed 2026-09-21 (v0.80.0) — a hypnotist has to still be in the room

**Why:** DW reported it as a security bug, and it was one. A hypnotist could request an induction,
walk out of the room, and the subject would still drop into a trance — frozen, silenced, veiled,
with nobody there — and stay that way for the full thirty-minute session timeout. Nothing along
that path ever asked whether the person who started it was still present. The attempt opened a
sixty-second window, the window fired the roll on a bare `setTimeout`, and the timer did not care.

The gap is *between* the request and the resolution, which is why checking presence when the
attempt arrives closes nothing: those sixty seconds are an unattended timer, and the whole bug
lives inside them.

**What changed.** Two hard gates and one watcher, all reading `ChatRoomCharacter` on the
**subject's** own client. Presence is never claimed by the hypnotist's client and never believed
from it — a presence flag in a hidden message is exactly what a modified client would forge
(rule 1).

- **At the roll.** `runInductionRoll()` refuses to resolve if the hypnotist is not on the roster.
  Checked *before* the attempt is counted and before `noteInductionAttempt()`, so an abandoned
  induction is not practice for anyone and does not spend one of the subject's tries.
- **At the window.** `beginInductionWindow()` will not start a minute that ends in a roll for
  somebody who has already gone.
- **While it runs.** A watcher covers the three phases with something live and unattended: a
  consent prompt on screen, a window counting down, and a trance actually applied.

**The grace is five minutes for a trance, and it is `RECOVERY_WINDOW_MS` on purpose.**
`recovery.ts` already settled the mirror-image question — when the *subject* drops out and comes
back, a hypnotist still in the room inside five minutes means the scene continues. The hypnotist
stepping out is that same question with the players swapped, and answering it with a different
number would make "did the scene survive" depend on which of the two vanished. An induction gets
thirty seconds instead: nothing is applied yet, nothing is spent by ending it, and a consent prompt
naming an empty chair is worse than making them ask again.

**The trap a careless fix walks into,** and the reason the lapse is not just `endSession()`:
`endSession()` resets to a fresh session, which zeroes `attempts`. A hypnotist who missed once
could then step out, step back in, and have two fresh tries — the fix would have been a cooldown
bypass. So a lapsed induction puts the subject back exactly where the last completed roll left
them, count and cooldown intact, and `AttemptFailed`/`CooldownRequired` are deliberately left
alone by the watcher for the same reason. Presence is enforced on those two where it belongs
instead: `session-continue` from outside the room is refused.

**`session-wake` is deliberately NOT gated.** It releases. Gating it would mean the one message
that ends a trance is the one that stops working the moment the hypnotist is gone — the exact trap
the safeword exists to rule out. Nothing in `session.ts` that lets go is gated on anything.

**An empty roster is not a departure.** `ChatRoomCharacter` is empty when the *subject* is the one
out of a room, and at load before the first sync. `memberInRoom()` returns three states rather than
two — true, false, and `null` for "cannot tell" — and the watcher holds its clock on `null` rather
than starting one. Collapsing that into `false` would end a trance every time the subject stepped
out, which is a worse bug than the one being fixed.

**What the room sees:** the existing *miss* pool, not a pool of its own. Onlookers must not be able
to tell a lapse from an ordinary miss — a line naming the departure would announce, out loud and in
front of everyone, which of the two ended it. An unanswered prompt was never announced to the room
in the first place, so closing one says nothing there either.

**New suite `test/departure.mjs`, 51 checks**, built around the four ways this goes wrong rather
than around the happy path: request-time-only checking, the cooldown bypass, gating the release,
and reading an empty roster as a departure. Verified to fail on the pre-fix code — the subject went
under, frozen, with an attempt spent — and to pass after. The controls matter as much as the
failures here (rule 6): the same rigged roll is shown landing with the hypnotist present, so the
headline check cannot pass on a suite where nothing ever succeeds.

**Two calls settled by DW, 2026-09-21**, both confirming what was built rather than changing it:
an induction abandoned because the hypnotist left **does not count as an attempt** — no try spent,
no cooldown — and the trance grace **stays at five minutes**. Do not re-decide either without
flagging it.

**Not run live.** No two-client session has exercised this.

### Fixed 2026-09-21 (v0.79.1) — a line break between two subjects' orders

**Why:** v0.79.0 added addressee scoping and DW tested it in play the same night. It still failed,
on both lines they tried, and the transcript is worth keeping:

```
Nova: Missy, kneel
Natalia, cum for me
(Missy screams silently and rocks her hips, getting a wonderful orgasm.)

Nova: Natalia, stand
Missy cum for me
(Natalia closes her eyes and lets herself go, getting a lovely orgasm.)
```

Each of those is **one chat message with a newline in it** — one subject per line, which is the
obvious way to type a combo command and not a shape v0.79.0's suite ever tried. `CLAUSE_SPLIT` knew
about commas, full stops and "and", but not about `\n`. So "kneel" and "Natalia" stayed welded into
a single clause, the second name never landed in a vocative position, `namedOther` came back false,
and the line fell through **unscoped** — straight back to the whole-line match, where `orgasm-force`
at table index 7 beats `kneel` at 31 and `stand` at 30. Both transcripts reproduce exactly against
v0.79.0 and are now pinned in `test/addressee.mjs` verbatim.

Note what the outcomes prove: only *one* subject reacted each time. Under v0.78.1 both would have.
So the v0.79.0 scoping was working on the client that was named second — the fix was real, just
half-blind.

**What changed, two things:**

- **`\n` and `\r` are clause boundaries.** This alone fixes both of DW's lines.
- **A name inside a clause can start a new address**, not only a name at its head. DW's second
  line written out flat — "Natalia, stand Missy cum for me" — has no punctuation at all between the
  two orders, so the split has to come off the name itself.

That second one is the risky half, because it is also what could cut a one-subject line in two. The
guard is `OBJECT_MARKERS`: a name preceded by a preposition or a comparative is being talked *about*,
not addressed. "Missy, look at Ella and you cannot move" and "Missy, you are prettier than Ella, you
cannot move" both stay one order for Missy; "Missy, kneel Ella, stand" is two. Nothing here
understands either sentence — the whole decision is the word in front of the name.

**Verified:** `tsc --noEmit` clean, all suites green, `test/addressee.mjs` up from 30 checks to 47.
The four guard cases were confirmed to fail with `OBJECT_MARKERS` emptied before being kept, per the
rule that a step which cannot fail is not testing anything. Still not run live.

### Fixed 2026-09-21 (v0.79.0) — two subjects in one line no longer collide

**Why:** DW reported that giving commands to two subjects in one line — "Missy, cum. Ella, kneel."
— made one command overwrite the other, or made both subjects do the same thing. It did, and the
cause was structural rather than a bad pattern. The name gate asked only *"is my name anywhere in
this line"*, and `matchSuggestion()` then read the **whole line**. So both clients passed the gate,
both handed the entire line to the matcher, and the matcher returned whichever entry sits earlier
in `SUGGESTIONS` — for that example, `orgasm-force` at index 7 beats `kneel` at index 31, so both
subjects came for the hypnotist and the kneel was never seen by anyone. Reproduced directly against
`voice.ts`: for `"Missy, you cannot move. Ella, you cannot speak."` both clients returned
`movement-block`.

**What changed:** `scopeToAddressee()` in `voice.ts` cuts the line down to the clauses addressed to
*this* subject before any matcher reads it, and `handleSpokenLine()` hands every downstream handler
that scoped text instead of the raw line. The subject's own name is put back on the front of it, so
all eight existing name gates keep working untouched.

The vocative names come from `ChatRoomCharacter` — BC's own room roster, read on the **subject's**
client. Nothing about who the hypnotist meant is taken from the hypnotist's client, so rule 1 holds.

Deliberately conservative in three ways, because a misdirected "cum" is not a small error:

- **Scoping only engages when the line names someone else in the room in vocative position.** A
  one-subject line is handed back byte-for-byte, so every existing phrasing behaves exactly as it
  did. The suite checks this on string identity, not on the matched id.
- **A name in the middle of a clause is not an address.** "Missy, look at Ella and you cannot move"
  is one command for Missy. Only a name at the head of a clause, or a clause that is nothing but
  names, counts — which is how people actually type a vocative.
- **Ambiguity is refused out loud, never guessed.** A clause that cannot be pinned to anybody while
  several people are named, or a line that names us and leaves us nothing, produces no effect and
  one line to the hypnotist saying to give each subject their own line (rule 5). That is what keeps
  a room-mate whose name is an ordinary word — May, Rose, Grace — from silently eating a command:
  the worst case is a refusal that can be read and retyped, not a command landing on the wrong
  person.

**Left alone on purpose:** trigger *firing* still reads the whole line. A trigger phrase is a
keyword — it has never had a name gate, it fires from anyone the scope setting allows, and it works
in ordinary conversation — so scoping it would quietly add a name requirement that was never part
of the contract. Whether a shared phrase should still fire for a subject the line did not address
is a real question, and a separate one.

**Also still true:** a line can still only run **one** suggestion, for one subject or two. "Missy,
kneel and do not speak" runs the kneel and drops the rest, exactly as before — `handleSpokenLine()`
returns after the first handler that matches. Scoping makes per-subject multi-command possible but
does not take it; that is a change to the pipeline's shape, not to the addressing.

**Verified:** `tsc --noEmit` clean, all suites green, new `test/addressee.mjs` at 30 checks. Every
case in it asserts what Missy gets **and** what Ella gets from the same line, because "they both got
the same thing" is precisely the bug and a one-sided check cannot see it. Not run live — no
two-client, two-subject session yet.

### Fixed 2026-09-19 (v0.78.1) — the add-on never loaded on the Asia server

**Why:** DW reported that players coming in from the Asia server got nothing at all — no spiral
icon, no loaded banner, no console line. That is the exact signature the trap index already
records for this one cause: BC is served from several hosts, the `==UserScript==` block's `@match`
list named only two of them, and a userscript whose `@match` does not match **fails completely
silently**. There is no error to find because the script is never injected. For those players the
add-on was not broken, it was absent.

**What changed:** two lines in `meta.txt`, `*://*.bondage-asia.com/*` and
`*://bondage-asia.com/*`, alongside the elementfx and Europe entries.

That is the entire fix. It was worth checking that it *was* the entire fix, so every other place
the code could have made a host assumption was searched: there is no runtime hostname or origin
check anywhere in `src/` — the v0.73.0 testing gate keys on the chat **room** name, not the host —
and no absolute BC URL is built anywhere. The host appears in exactly one place that decides
anything, which is the metadata block.

**One consequence worth knowing, and it is already handled.** `localStorage` is per-origin, so the
Asia mirror is a third separate origin: a player whose settings were saved on elementfx has no
local backup copy when they arrive from Asia. Their settings still come back, because the account
blob in `Player.ExtensionSettings` is the authoritative store and `localStorage` is only its
offline mirror — and `loadSettings()` in `src/storage.ts` already re-reads once the real `Player`
lands after login, specifically so an early read of an empty `localStorage` cannot be cached and
then written back over good account data. That path was written for "a different browser or
cleared site data"; a different BC host is the same case, and the comment there now says so.

**Not verified from here:** that `bondage-asia.com` is the hostname those players are actually on.
The domain resolves and serves, and its root is the same placeholder page `bondage-europe.com`
serves, which is good evidence it is the same kind of mirror — but this session cannot reach the
deployed BC client to confirm the game is served from it, and DW's report named the host without a
suffix. If players still see nothing after this, the hostname is the first thing to re-check.

---

### Changed 2026-09-18 (v0.78.0) — Renamed to Erotic Chat Hypnosis Suite (ECHS)

**Why:** players were confusing this add-on with an unrelated hypnosis project abbreviated HSC
(Hypnotics Slave Club). DW's call, 2026-09-18, along with the name itself: full name where there is
room for it, `ECHS` where there is not.

**What changed is only what a person reads.** Every name string shown on screen, plus the
`==UserScript==` block's name key, which is what the userscript manager lists:

| Where | Now reads |
|---|---|
| Userscript manager's list | Erotic Chat Hypnosis Suite (ECHS) |
| Loaded badge, bottom-right | `ECHS v0.78.0 loaded` |
| Preferences > Extensions entry | ECHS Hypnosis |
| Settings, help, setup and remote-help titles | Erotic Chat Hypnosis Suite (ECHS) — … |
| First-run chat notice | Erotic Chat Hypnosis Suite (ECHS) v0.78.0 — … |
| Remote panel, subject not running it | *"… doesn't appear to be running ECHS."* |
| Spiral-icon tooltip on a profile | ECHS Hypnosis Remote |
| `/hypno` header and `/hypno commands` | Erotic Chat Hypnosis Suite (ECHS) |

Two of those take the abbreviation for a reason worth recording, because the obvious "use the full
name everywhere" would have broken both. The **Preferences > Extensions** label goes into a
fixed-width list button and the text it replaced was 15 characters against the full name's 26, so it
is `ECHS Hypnosis`; it now lives in one exported constant (`EXTENSION_BUTTON_TEXT` in `menu.ts`) that
`commands.ts` *builds* its "the guide is under…" pointer from, since those two strings naming
different labels would send a player looking for an entry that is not there and nothing at runtime
would notice. The **"not running ECHS"** line is canvas `DrawText`, which does not wrap, with the
subject's name already prepended.

**`/echs` now works, and `/hypno` is untouched.** Both tags are registered from one definition
through a factory, not one object handed to `CommandCombine` twice — BC keeps what it is given in its
own `Commands` array, so two entries sharing an object would let anything BC writes onto one appear
on the other. `metaCommands` is shallow-copied per registration for the same reason. The bare menu
now ends with a line saying the two are the same command. `/hypno` stays first everywhere: every wiki
page, help line and habit already says it, and 427 occurrences of it across the repo are not worth
rewriting to rename a command that still works.

**A new 12-check suite (`test/alias.mjs`)** captures what BC's registry is actually handed and
asserts on that, because a registration that silently did not happen looks identical from inside
`installCommands()`. It checks both tags arrive, that the alias carries the same subcommands and runs
a real one (a registered-but-hollow alias is the third failure mode), and — by writing a field onto
BC's copy of one entry and reading the other — that nothing mutable is shared. Verified to fail on
both regressions before being kept: dropping the alias fails 7 checks, reverting the factory to a
shared object fails 3 while everything else still passes.

**Deliberately NOT changed**, all of it invisible to players and all of it load-bearing:

- `ExtensionSettings["HypnosisAddon"]` — server-synced; renaming the key orphans every tester's
  settings, trust, stats and planted triggers. The `localStorage` backup and disconnect-recovery
  keys derive from it.
- `HIDDEN_TAG = "HypnoMsg"` — the room wire protocol. Two clients on different values go silently
  invisible to each other, and it has to stay distinct from BCX's and LSCG's tags.
- The repository name and the raw install URL, which is the `@updateURL`. GitHub redirects renamed
  repositories, but whether `raw.githubusercontent.com` follows that redirect — and whether the
  userscript managers follow it on an update check — was not established, and the failure mode is a
  tester silently never updating again. DW's call to leave it.
- The `[HypnosisAddon]` console tag and the `Hypno Testing` room name.

**Unverified:** whether changing the userscript name key on an already-installed script keeps the
update chain. It should — the namespace key is unchanged, and `@grant none` means there is no stored
data to lose — but it was not testable from a dev session and the failure would be silent, the same
shape as the v0.75.0 second-version-line bug. Worth one tester confirming their manager shows the new
name and v0.78.0.

---

### Changed 2026-09-17 (v0.77.0) — Follow / leash, the first of the Feature-List rows that had no code

**The row existed in the design and nowhere else.** *Follow / leash* sat in three body tables — the
Feature Depth Requirements table (Entranced), the trust-threshold table (55%), and the Tier-1 Feature
List ("compulsion to follow — including across room transitions") — and the note under the depth
table named it among the features that "do not exist yet." This builds it.

**The mechanism, verified against the live client (`ChatRoom.js` / `Inventory.js`, R-master) per
rule 8 — not from memory.** The cross-room follow is BC's OWN leash, so it works with a hypnotist
who has no add-on (the Tier-1 promise):

- Whoever *holds* a leash pings and `AccountBeep`s their leashed targets on every room change
  (`ChatRoomPingLeashedPlayers`), and that beep carries the destination and pulls the target along.
  This is vanilla BC and needs nothing of ours on the holder's side.
- You are leashable (`ChatRoomCanBeLeashedBy`) only if you wear an appearance item carrying the
  `"Leash"` effect and the room does not block `"Leashing"`. `InventoryItemHasEffect(item, "Leash",
  true)` reads `Property.Effect`, so the **same Emoticon-carrier trick that powers Freeze** injects
  `"Leash"` and makes the subject leashable *on command*, with no collar required.
- While `ChatRoomLeashPlayer` is set, `ChatRoomCanLeave()` is false — that is what stops the subject
  walking away between rooms.

**Subject-authoritative (Rule 1).** The add-on never reaches into the hypnotist's client to grab a
leash; it only makes the subject's own body leashable and lets BC lead. And it *scopes* that: while
the compulsion is on, a hook on `ChatRoomDoHoldLeash` lets **only the active hypnotist** actually
take the leash (an off-target grab is refused with the same `RemoveLeash` reply BC uses for an
unleashable target), so "leashable" does not become "anyone in the room may pick you up."

**What was built.** New `followControl` permission (own toggle, off by default, on the Permissions
tab and the first-run permission set) — its own gate rather than a corner of Movement Restriction,
because rooting someone and dragging someone are opposite restrictions. `DEPTH_GATES` entry at
**Entranced**, session-only (`earnedOnly: false`). A new leaf-ish module `follow.ts`
(`applyFollow`/`releaseFollow`/`clearFollow`/`installFollow`) importing only `effects` + `log`, so
`session.ts` imports *it* for teardown without a cycle. Spoken suggestions `follow-block` /
`follow-release` in `voice.ts` (release listed first, as always; deliberately no "come with me",
which the orgasm "come" family would swallow), with public + private flavor in `flavor.ts` — follow
is observable, so it carries room lines like movement and posture do. Teardown wired into
`endSession()`, `totalStop()` (safeword / reset), and `recovery.releaseEverything()`; `"Leash"` added
to `recovery.OUR_EFFECTS`, the orphan check and the `/hypno effects` readout. `installFollow` hooked
in `main.ts`.

**Reconnect.** A page reload keeps the injected `"Leash"` on the server-side Emoticon but loses the
in-memory scope state, so `restoreLocalState` re-arms the compulsion **unscoped** (the leader is not
saved) — the honest cost of a reload; a *room change* keeps module state and never hits this. An
orphaned `"Leash"` from a crash is released like the other effects.

**Tests.** `test/voicetest.mjs` gains 20 follow cases (block, release, and cross-checks that follow
does not swallow the movement family); `test/notify.mjs` asserts the follow room-lines are visible,
name the subject, and leave no tokens unfilled; the `depth.mjs` gate loop now covers `followControl`.
Full suite **1140/1140**, typecheck clean, build 341.8 kb.

**Still open (flagged, not done here):**
- **Body tables owe an update** — the design body is not mine to edit. The Feature Depth Requirements
  note (`~line 605`) should drop "Follow / leash" from its "do not exist yet" list and the row gets
  its `DEPTH_GATES` reality; the Tier-1 Feature List row can lose its unbuilt status. Left for the
  design owner.
- **No button / remote-panel control yet** — follow is spoken-only for now; button parity (the remote
  panel, a `/hypno` command) is a later pass.
- **Two live-only dependencies to confirm in play:** the subject must have BC's own leashing allowed
  (`OnlineSharedSettings.AllowPlayerLeashing !== false`) for the hypnotist to see "Hold Leash", and a
  room that blocks the `"Leashing"` category will stop the mechanical leash even though the compulsion
  is felt. Both are inherent to using BC-native leash and want a two-account run to confirm behaviour
  and that injecting `"Leash"` on the Emoticon renders acceptably (leash-line anchor).

### Changed 2026-09-17 (v0.76.0) — a missed induction is no longer silent, and `/hypno induce`

**A failed attempt produced one line, on one of the three screens that wanted one.** The subject
got *"The attempt doesn't quite land."* The room, which watches an induction begin and watches it
land, saw nothing whatever in between. The hypnotist saw it only on the subject's Information Sheet
panel — the *"Continue Trying (1/2)"* button and its four-band status line in `remote.ts` — and with
that panel closed, which is most of the time, **an attempt produced no output at all on their
screen**. A userscript that produces nothing is indistinguishable from a userscript that is broken,
which is rule 5 one screen removed from where it is usually applied. DW, 2026-09-17: make it clear
the add-on worked and the induction didn't, *without saying why*.

**Three pools, in `flavor.ts`.** `inductionMissLine()` for the subject; `inductionSpentLine()` for
the subject when the last attempt is spent, because *"not yet"* and *"not again for a while"* are
different facts about their own state; `announceInductionMiss()` for the room; and
`hypnotistMissFlavor(subject)` for the hypnotist's own chat log.

**All of them are choice-agnostic, and that is the hard part.** Agree, ignore and fight are private
to the subject's client, and a miss is exactly where that leaks, because the natural flavour for a
failed induction *is* resistance flavour — "you fought it off" tells the hypnotist what they chose,
and so does "you let it in and it slipped away" in the other direction. Every line describes the
visible non-event and nothing else. The **ordinary miss and the spent last attempt share one room
pool** on purpose, so onlookers cannot tell them apart and count the hypnotist's tries either.

**The hypnotist's line carries the attempt count and not the band.** *"Attempt 1 of 2. You can try
again."* is the half that answers "did the add-on do anything"; how close it came is *why*, and the
band stays on the panel where it already lives. It fires on the **transition** into a miss —
`pushUpdate` re-sends the same phase for a re-query, a permission change or a refusal aimed at us,
and keying on phase alone would reprint the line every time one arrived. A refusal is never a miss:
`refuse()` carries our real phase, so a refusal arriving while already in `AttemptFailed` would
otherwise read as a fresh failed roll. Walking up to someone already in someone else's cooldown is
not an attempt of ours either, which is what `attempts <= 0` excludes.

**`hypnotistMissFlavor` takes the name and fills no tokens, deliberately.** `fillTokens` fills from
`Player`, and on the hypnotist's client `Player` is the hypnotist — a `{name}` there would print
their own name where the subject's belongs. The suite pins that the pool contains no `{...}` at all.

**`/hypno induce [name|number]` and `/hypno retry`**, both group *Session*. `induce` resolves a name
the same way every other targeted command does (exact, then unique prefix, then the only other
person in the room). `retry` needs no name and re-checks presence, so retrying at someone who has
left says so rather than sending into the void. Both confirm in the log, because a request is
one-way and without a line there, typing the command and typing it wrong look identical.

**New `requestInduction()` in `session.ts` closes a trap the commands would otherwise have walked
into.** A fresh attempt is `session-attempt`; one following a miss is `session-continue`, and
sending the wrong one desyncs the two clients. The panel button picked between them inline; the
command would have been a second place to get it wrong. Both now route through one helper that
reads our local view — which may be stale, so an attempt is the safe default: the subject's client
re-checks its own phase and refuses anything that does not fit, so being wrong costs a refusal and
never a bypass.

**Subject authority is untouched.** Everything added here is output. The commands send the same two
messages the button already sent, and the subject's client decides exactly as before.

New suite `test/miss.mjs`, 46 checks, covering all three audiences, the consent gate on the room
half, the transition and refusal guards, and both commands on the wire. Every group was verified
*failing* against a deliberately wrong implementation (rule 6): dropping the room announce fails
four, dropping the hypnotist report fails six, always sending `session-attempt` fails three,
dropping the transition guard or the refusal guard fails one each, a resistance word in the room
pool fails one, and a `{name}` token in the hypnotist pool fails two. `test/notify.mjs` 84 → 88: the
room-only audience loop now covers the miss line alongside induction-begin and going-under.

**Still open, and worth knowing.** The room half rides the *"Others see your reactions"* setting
like every other public line, so a subject who has it off is still invisible to onlookers on a miss
— correct, but it means the room-side fix does nothing for that player. And none of this has had a
live two-client run yet.

### Changed 2026-09-17 (v0.75.0) — a hypnotist's skill now counts for strangers by default

**The ladder was invisible on a first meeting, and a first meeting is where it matters most.**
`DEFAULT_SKILL_HONOUR` was rung 2, `"trusted"`, which honours a claimed skill *in proportion to
existing trust* — so a new pair has none and a practised hypnotist read as a complete novice.
Everything the declared-skill work built was, by default, dead until the pair already knew each
other. DW, 2026-09-17: make skill count, and **make sure little or no skill never lowers the
chance**.

**The obvious fix is wrong, which is the whole reason this entry exists.** Simply defaulting to
rung 3, `"capped"`, helps the stranger but *cuts* an established pair: `min(v, 30)` is below
`v × trust/100` for any trust above the ceiling, so a trusted expert would have gone from +35 on
the roll to +10.5. That is exactly the regression DW asked to avoid, and it is invisible unless you
compare the two rungs above trust 30.

**So the new default is `max(trusted, capped)`** — a fifth rung, key `"floored"`, labelled *"Full
from people I trust, capped otherwise"*. Full weight once she knows someone; the stranger ceiling
as a **floor** under it before she does. Taking the larger of the two can only ever raise the
honoured value relative to either rung it is built from, so the second requirement holds *by
construction* rather than by a clamp somewhere downstream.

**This is deliberately the same shape as `effectiveAccess()`, for the same settled reason.** That
function makes the chemical contribution a floor rather than a multiplier because *a multiplier on
zero trust is still zero, and the stranger is the case the mechanic exists to serve*. Skill had the
identical bug and the identical fix was already sitting in the codebase.

**Rung 2 is kept and still offered.** Someone who chose *"Only from people I trust"* meant strangers
get nothing, and quietly loosening a consent setting a player picked on purpose is not ours to do.
The setting is stored sparsely — written only when changed — so only the default moves and every
explicit choice survives untouched. `SKILL_HONOUR_OFFERED` now covers four rungs; the CNC rung
`"full"` is still not offered and still waits on dual fatigue.

**What it buys** — zero trust, zero experience, no relationship, no arousal; an expert claiming 80,
honoured at the ceiling 30, worth `30 × SKILL_ADDITIVE_WEIGHT = 10.5` on the roll:

| | before | after |
|---|---|---|
| Agree, per attempt | 25% | **35.5%** |
| Agree, per session (2 attempts) | 43.8% | **58.4%** |
| Agree + three roleplay lines (+15), per session | 64% | **75.5%** |
| An **unskilled** hypnotist, any choice | unchanged | unchanged |

The per-attempt figures are read off the live formula by `test/skill.mjs`; the per-session and
roleplay rows are `1 − (1 − p)^attempts` over those, the same arithmetic `describeChances()` prints.

**Rule 4 is untouched.** `currentSkillTerms(earnedOnly)` still returns `NO_SKILL` for the earned
roll, so skill reaches `depthFull` and never `depthEarned`. A stranger who wins on declared skill
goes deeper in the moment and still cannot plant a trigger, raise the illusion or carry anything
past the session. That was worth re-checking rather than assuming, and `test/skill.mjs` now pins it.

`test/skill.mjs` 38 → 55 checks, including a sweep asserting `"floored"` is never below either rung
it is built from and never above the claim. Both halves were verified *failing* against deliberately
wrong implementations (rule 6): a plain `capped` default fails three checks, a missing rung fails
eight. `test/odds.mjs` sweeps the Fight invariant across the new rung too.

**Three stale comments corrected in passing.** `session.ts` still said *"THE LADDER IS NOT BUILT"*,
that skill was *"deliberately absent"* from the roll, and that the Fight invariant was *"inert
today"*. All three had been false since v0.66.0 built the ladder — the same doc-drift CLAUDE.md
exists to prevent, sitting inside the code rather than beside it.

### Changed 2026-09-17 (v0.74.7) — trigger phrase floor lowered 6 → 5

DW found six characters too restrictive in play. Lowered `MIN_PHRASE_LENGTH` to 5 to see how it
wears. Nothing else changes: still enforced only on the plant path, still grandfathers stored short
phrases, and the refusal strings interpolate the constant so they moved on their own. Five still
clears the shortest fixture ("sleepy", 6), so suites and bot scenarios are unaffected; `test/triggers.mjs`
gains a positive boundary check (5 accepted) beside the existing under-floor refusal. The wiki's
Triggers and Sample Session pages updated to "at least 5".

**If five still catches too much ordinary speech, the next move is smarter overlap detection, not a
higher floor** — matching containment on WORD boundaries rather than raw substring, so "spell" would
stop mirroring inside "misspelled" while still blocking a real "spell" collision. Noted in the
constant's comment as the intended direction.

### Changed 2026-09-16 (v0.74.6) — OOC asides are no longer silenced by default

DW's oversight, caught before alpha: being silenced (the `speechRestriction` permission, or the
`tranceCannotSpeak` default) also gagged out-of-character asides — text in parentheses, BC's own OOC
convention. Stepping out of a scene to say "(brb, dog needs out)" got you nothing back but the
blocked-attempt line, stranding people mid-scene with no lifeline short of the safeword.

- New `blockOOC` preference (`FeatureToggles`, **off by default**), surfaced in **Trance Defaults**
  as *"Silence OOC too (text in parentheses)"*. Off, an entirely-OOC line goes through while
  silenced; on, everything is silenced as before.
- The speech-block hook in `main.ts` now passes a message when `!blockOOC && stripOOC(msg) === null`
  — i.e. only when *nothing in-character remains* after the asides are stripped. A line with any IC
  content left ("let me go (sorry)") is still blocked, so this can't be used to smuggle real speech
  past the block. Reuses the same `stripOOC()` that already filters incoming OOC, so the two halves
  of the OOC story share one definition of "what counts as an aside".
- `test/ooc.mjs` +4 (now 23) documenting the pass-through predicate.

### Added 2026-09-16 (v0.74.5) — the install file auto-updates, and a release step to keep it current

DW had uploaded a built `HypnosisAddon.user.js` at the repo root and pointed the README's Install
section at it (raw-on-`main`), but it carried no `@updateURL`, so an installed tester would never see
a new version, and it was already a version behind the source. DW's call: wire auto-update (option B
of the earlier choice) and keep the committed build current with every release.

- `meta.txt` now carries `@downloadURL` and `@updateURL`, both the raw-on-`main` root URL the README
  installs from — so Tampermonkey checks that file's `@version` and pulls it when it climbs. `build.mjs`
  already stamps `@version` from `package.json`, so the banner can't drift.
- The committed root file is a build artifact and goes stale on every bump, so `npm run release`
  (`release.mjs`) makes it one step: build, then copy `dist/HypnosisAddon.user.js` over the root file.
  `npm run build` deliberately does not touch the root file, so the dev loop never churns it — the
  root build changes only on a deliberate release. `docs/DEVELOPMENT.md` Publishing section rewritten
  to match (it had said no build was committed).
- This is the "commit the build" shape (A). The loader shape (B in DEVELOPMENT.md) and FUSAM listing
  remain the better end state for wider release; auto-update via raw-on-main is enough for alpha.

### Fixed 2026-09-16 (v0.74.4) — a safeword taken mid-plant left the trigger recording standing

DW recalled "an issue with `/hypno safeword` during a trigger." Traced two paths; one was already
safe, the other was a real gap.

- **A FIRED trigger, safeworded mid-drain: already clean.** A multi-action trigger applies its
  effects over paced ticks (`drainTriggerSteps`, v0.72.5), and `totalStop`'s `clearAllTimers()`
  cancels the pending drain and the auto-release together, then clears every applied effect. A probe
  (fire a two-action holding trigger, safeword between ticks, advance timers) confirmed no step
  re-applies afterwards and no `activeKey` is left standing.
- **An IN-PROGRESS recording, safeworded mid-plant: the actual bug.** `session.ts`'s teardown
  (`endSession`/`totalStop`) cleared effects, timers, suppression, carry and the session, but never
  the trigger **recording** state in `triggers.ts` — only voice's "forget the trigger" did. So a
  subject who safeworded while a hypnotist was part-way through planting was left with `isRecording()`
  still true; the body-part and activity-command paths record *before* the session gate, so the
  half-built trigger could still take lines. "Everything is cleared" quietly wasn't (rule 2).

Fix follows the `timers.ts` precedent, because the direct import is a cycle — `triggers.ts` imports
`session.ts`, so `session.ts` cannot import it back. New leaf `teardown.ts` (imports nothing) holds a
tiny registry: `triggers.ts` registers a cleanup at load that abandons any recording, and
`endSession`/`totalStop` call `runTeardown()` after `clearAllTimers()`. Guarded so a throwing cleanup
can never stop the safeword finishing. `test/triggers.mjs` +3 checks (162 → 165): a recording in
progress, safeword, `isRecording()` false and nothing left to commit.

### Added 2026-09-16 (v0.74.3) — the first-run notice

Built the approved *first-run notice* (spec in the Todo body). The gap it closes: every permission,
including `hypnoEnabled`, defaults off and the wizard/starter only appear if you open settings, so a
fresh install is silent and looks broken. New leaf module `welcome.ts` prints a **two-line, once-per-
install, local-only** notice into the chat log:

> `[Hypnosis Add-on v<__VERSION__> — nothing is switched on yet. Click the spiral to set up.]`
> `[Your reactions are visible to the room by default; Trance Defaults turns that off.]`

- **Fires when the add-on is SILENT** — no hypnotist-actionable permission granted — which covers both
  a fresh install and "hypnoEnabled on but nothing else", the same silence for a different reason. A
  user who *has* granted a permission is marked shown **without** a notice, so they are never nagged.
  `hasAnyPermissionGranted()` (storage.ts) reads a curated `PERMISSION_KEYS` set: the Permissions/
  Lasting-tab grants, excluding the master switch, the settings-lock, and all preference/awareness
  toggles.
- **Once per install:** a new sparse `welcomeShown` flag, set the first time it evaluates. `normalise()`
  back-fills it `true` for anyone whose `starterState` shows they finished setup — so an upgrade never
  greets an existing user (and "Hypnotist only", enabled-off-on-purpose, is covered by that back-fill).
- **Hooks the existing `startRecovery()` poll** (`recovery.ts`), on the branch that already waits for
  identity *and* a room before acting — the one place settings are safe to read (the v0.17.0 early-read
  trap) and a chat log exists to print into. No second poll; not fired from the no-room fallback.
- **Never** auto-enables, pre-ticks, reaches the room, or re-fires per-version (alpha bumps often).
- `build-test.mjs` now defines `__VERSION__` for the suites (welcome.ts uses it). `test/welcome.mjs`,
  14 checks: the back-fill quiet-upgrade, the fresh-install greeting and its two lines, local-only,
  once-only, enabled-but-empty still fires, a configured user gets nothing but is marked shown.

### Fixed 2026-09-16 (v0.74.2) — the icon now sits INSIDE its button (the other half of Known Bug #6)

The v0.74.1 note below called Bug #6 "purely artwork." The second screenshot proved that half-wrong:
the new spiral looked great but rendered **at ~120px, spilling out of the 60px button** toward the
bottom-right. **The design-doc inference about `DrawButton` was the error.** Bug #6's investigation
note (and v0.74.1) assumed `DrawButton` runs `RectFitIntoRect` to fit an Image into the button. It
does not. Verified against R131 `Drawing.js`: `DrawButton(...Image)` calls `DrawImage(Image, Left+2,
Top+2)` → `DrawImageEx` with **no Width/Height**, i.e. the image is drawn at its **natural size,
anchored top-left, unscaled**. So the SVG's own `width="120"` was literally 120 px on the canvas.

Fix: `remote.ts` now draws the button **chrome** with `DrawButton` (no Image), then places the icon
itself with **`DrawImageResize(SPIRAL_ICON, Left+INSET, Top+INSET, SIZE−2·INSET, SIZE−2·INSET)`**,
which *does* scale. `ICON_INSET = 8` centres a 44×44 spiral in the 60×60 box with even padding, so it
matches the lighter footprint of LSCG's remote above it; one constant resizes it. New BC global
`DrawImageResize` declared. `icon.ts` is unchanged — its 120-px intrinsic size is now just a hi-res
source that `DrawImageResize` scales down. The Preferences > Extensions entry was never affected: it
renders the same URI as an HTML `<img>`, which CSS sizes.

### Fixed 2026-09-16 (v0.74.1) — the profile/settings icon is a stroked spiral, not a navy blob (Known Bug #6)

DW's in-game screenshot settled Known Bug #6. It showed LSCG's remote and our button with a **clear
gap — no overlap** — so nothing had moved; the "revealed, not caused" reading in the investigation
note was right, and there was no collision to fix. The whole of "bigger and heavier" was the
**artwork**: the v0.72.8 filled two-arm spiral (thick arms, 3.1 turns, `wOuter 15`) merged into a
solid navy disc once `DrawButton` scaled it into the 56×56 button.

Rebuilt `icon.ts` as a **single stroked Archimedean spiral** (3.0 turns, `R_MAX 44`, stroke 4.5, a
small centre dot) — "option 5" of six rendered for DW at real button size, his pick. A stroke keeps
even gaps between the turns at any scale, so it reads as a spiral rather than a shape, and its light
weight matches the line-drawing remote it sits beneath. **No coordinate changed** — so the open
FUSAM-convention question in the Bug #6 note does not arise. One source (`SPIRAL_ICON`) still feeds
both the profile button (`remote.ts`) and the Preferences > Extensions entry (`menu.ts`), so both
moved together. `width`/`height` kept explicit on the SVG, still load-bearing for `DrawButton`.

### Added 2026-09-16 (v0.74.0) — trigger phrases are unique per subject, with override

Built the settled *Trigger Phrase Uniqueness and Override* spec (body of this doc), uniqueness-only
scope — `phrase` stays the identity key, no `key`/`scope?`/`expiresAt?` fields added (DW's call).

- **`saveTrigger` now de-dupes on the phrase alone**, not `(phrase, installedBy)` — the required
  fix, or a cross-installer override would leave two records on one word. Both stale comments fixed.
- **`MIN_PHRASE_LENGTH` 3 → 6**, on the plant path only. `normalise` still never reads `phrase`, so a
  stored short phrase is grandfathered — it fires, decays and releases, it just can't be re-planted.
- **`phraseAvailability()` in `triggers.ts`** implements the precedence: exact + same installer →
  override (even shallower); exact + different installer → override iff `currentDepthEarned() >` the
  stored `plantedDepth`; containment either way → always refused; a conflicting trigger that is
  holding her → refused. It is called at both `beginRecording` and `commitRecording` (the between
  window is real); a commit-time collision **holds the recording open** so the actions aren't lost.
- **Disclosure**: the default refusal names nothing (no phrase, no planter, no depth, no count); the
  one chatty branch is when the conflict is the hypnotist's **own** word. A per-session rate limit
  (`COLLISION_REFUSAL_CAP`/`COLLISION_WINDOW_MS`, tunable) sends collision refusals flat past the cap,
  so the yes/no oracle can't be bisected. Dials are placeholders — "pick them in play" per the spec.
- **Rename-in-place**: a `TRIGGER_START` while already recording now renames, keeping the recorded
  actions, instead of silently discarding them (a latent bug the commit-collision flow reuses).
- **Override = fresh record** (already how `commitRecording` builds it); the subject gets a distinct
  **displacement** line only when a *different* installer's trigger is replaced, never her own re-plant.
- `isTriggerInEffect` is passed into `beginRecording`/`commitRecording`/`renameRecording` as a
  callback rather than imported, keeping the voice→triggers dependency one-way (same pattern as
  `pruneFadedTriggers`). `test/triggers.mjs` +34 checks (128 → 162): each precedence branch, the
  holding refusals, rename-preserves-actions, MIN-6 + grandfather, the disclosure strings carry no
  phrase/number, the commit-time race, and the rate-limit fall-through to flat.

**Not done, deferred by scope choice:** `key`, `scope?`, `expiresAt?` and the touch-trigger uniqueness
extension. Touch triggers will need `gesture:<Activity>:<Group>` unique per subject with the same
override rules (exact equality suffices there — no free text, no substring problem).

### Changed 2026-09-16 (v0.73.2) — `/hypno` is a menu now, and `/hypno help` opens the on-screen guide

Modelled on how the other room bots (StripDiceBot's `!help`) do it: a short signpost that points
at the ways to go deeper, not a wall of commands. Bare `/hypno` now prints a four-line menu —
speak, don't type; `/hypno help` for the on-screen guide; `/hypno commands` for the full list;
`/hypno match`; `/hypno safeword`. The old single pipe-delimited command dump moved to the new
`/hypno commands`, one readable line per group, still generated from `COMMANDS` and now honouring
the same room gate the commands do (the Testing group is named only inside the Hypno Testing room —
the old dump leaked those names everywhere).

`/hypno help` jumps **straight into the illustrated guide** rather than telling you where to click.
`openHelpScreen()` in `menu.ts` does exactly what clicking our Extensions entry does, verified
against R131 (`Preference.js`, `Preference/Extensions.js`): `PreferenceOpenSubscreen("Extensions")`
loads Preferences and builds the list from any screen, then we enter our own entry — set
`PreferenceExtensionsCurrent`, hide BC's list DOM via `ElementWrap(PreferenceIDs.subscreen)`, run its
`load`, and `openHelp()` on top (load closes help as part of its reset, so it comes last). Every BC
global is typeof-guarded, so a renamed one degrades to the manual-path message instead of throwing.
Two new BC globals declared in `bc-globals.d.ts`; `EXTENSION_ID` now names the `"HypnosisAddon"`
identifier once, shared by the registration and the lookup. **Bundles the v0.73.1 gate below** — that
fix was verified but never committed on its own, and this change rewrote the same `installCommands`
block, so the two ship together rather than being split after the fact.

### Fixed 2026-09-16 (v0.73.1) — the rest of the Testing commands actually obey the room now

> **Bookkeeping note, recorded 2026-09-16.** There is **no v0.73.1 commit and no v0.73.1 build**:
> `package.json` went `0.73.0` → `0.73.2`, and this work was committed together with v0.73.2 in
> `38ed6bc`, which is what stamped the version. The entry is kept separate because the two changes are
> separate and each is worth finding on its own — but anyone bisecting should look in the v0.73.2
> commit, and nobody should go hunting for a 0.73.1 artifact that was never produced.

DW spotted `/hypno settrust` still working for Missy outside the testing room. Cause: it, `relate`,
and most of the **Testing** group never had a runtime gate at all — only `depth`, `trance`,
`agetrigger` and `/bot` did. Under the old always-true flag that never showed; the help screen
merely *hid* the group when the flag was off, but the commands still executed. v0.73.0 made the
gate real for the four that had one, leaving the rest running everywhere.

Fixed at the single registration point (`installCommands`): every command whose group is "Testing"
now has its Action wrapped to refuse unless `isTestingMode()`. One chokepoint covers the whole
group — settrust, relate, and anything added later — rather than trusting each Action to remember.
The four with their own internal checks keep them as harmless belt-and-braces (the hidden-handler
paths still need forceTrance's/ageTriggers' own gates). The standalone `/bot` is registered
separately and stays gated inside `sendToBot`.

### Changed 2026-09-16 (v0.73.0) — testing mode is now the room you are in, not a build flag

DW's call: replace the compile-time `TESTING_MODE` flag with a runtime check on the chat room.
While the player is in a room named **"Hypno testing"** (case-insensitive, whitespace-trimmed) the
testing affordances are live; everywhere else, and when not in a room at all, they are off. So the
shipped build is safe by default and **there is no release flip to remember** — the old rule 11
becomes "nothing to do" (CLAUDE.md rule 11 rewritten to match).

`log.ts` now exports `isTestingMode()` instead of a `TESTING_MODE` const; it reads BC's own
`ChatRoomData?.Name` (verified R131), null-safe and wrapped so a missing global can never throw
into a handler. All ~15 sites became runtime calls (`voice`, `commands`, `triggers`, `session`,
`help`, `main`). Everything currently behind it — the force-state commands (`trance`, `depth`,
`agetrigger`), `triggers full`, and the `/bot` channel — is now available only in that room; the
help screen's Testing group appears and vanishes as you enter and leave.

**What needed care:** the hidden-message handlers (`test-note`, `test-trance`, `test-age`) and the
`/bot` command used to register *inside* `if (TESTING_MODE)`, which runs at load — before you are
in any room. They now register unconditionally and gate at use (the ones that call a gated core
function refuse through it; `test-note`, which just relays text, got its own check). The unit
harness keeps forcing testing on through a new `FORCE_TESTING` seed line in `log.ts` that
`build-test.mjs` rewrites — verified `dist/` ships `FORCE_TESTING = false`, so nothing is pinned on
in the shipped build.

**Accepted trade-off (DW aware):** anyone in a room with that name gets the affordances. They only
ever act on that player's own client (force your *own* depth, age your *own* triggers, reveal your
*own* trigger words), so the sole real exposure is a curious user spoiling their own surprise —
much weaker than a compile flag, fine for an alpha. This is the same "a subject can make their own
room" objection that once ruled out gating `triggers full` on room-admin; the comment there was
updated to record that it is now accepted for the same reason it does not matter.

### Changed 2026-09-15 (v0.72.9) — flirtier flavor, and two spectator moments that were silent

DW's polish pass. Two parts.

**Flirtier flavor.** Rewrote the sensual/submission lines (`flavor.ts`) a shade warmer and more
playful while keeping the house register — the body acts, the subject notices late, control is
something that happens *to* them. Touched the arousal, orgasm, undress, kneel and self-touch
families, both the private (subject) and public (room) halves. Left the **"absence" lines**
deliberately alone — awareness, numbness, speech-block, the illusion, movement/perception — because
they are about *nothing arriving*, and flirty does not fit them. DW's call, 2026-09-15: "adjust all
in that direction."

**Two spectator moments that showed nothing.** Onlookers saw nothing when an induction *began*, and
the hypnotist had no cue the subject had *gone under* (the "you slip under" line is the subject's
alone). Added two room-only lines via new `flavor.ts` helpers, both gated by the subject's "Others
see your reactions" setting like every public line:
- `announceInductionBegin()` — fired from `beginInductionWindow` (`session.ts`). **Choice-agnostic**,
  so it never leaks the private agree/ignore/fight.
- `announceTranceEnter()` — fired from the success branch of `runInductionRoll`, **not** from
  `applyTranceState`, so a reconnect (which reuses that path) does not re-announce the drop.

**Also fixed a latent bug found in passing:** the `trigger-ghost` public line used `{they}`, which
`fillTokens` does not fill — it would have reached the room as a literal "{they}". Reworded to drop
it, and `test/notify.mjs` now guards every filled public line against an unfilled token (→ 84).

### Added 2026-09-15 (v0.72.8) — a real icon: the two-arm spiral

The add-on had no icon of its own — the remote button on another player's Information Sheet drew
a plain letter "H", and the Preferences > Extensions entry was text only. Replaced both with a
stylized **two-arm hypnotic spiral** (DW's pick, "concept C" of four shown in the design pass). New
leaf module `icon.ts` builds it as an SVG `data:` URI from pure math at load — two tapered
Archimedean arms 180° apart, thick at the rim tapering to a point at the centre — so it needs no
hosting and stays crisp at any button size. `remote.ts` and `menu.ts` both consume `SPIRAL_ICON`,
falling back to the old "H" / text-only if the build ever returns undefined.

Both render paths were verified against R131 before wiring: the Extensions list draws the entry's
`Image` as an HTML `<img>` (`Screens/Character/Preference/Extensions.js`, `ElementButton.Create`),
and the profile button draws it on the game canvas via `DrawButton` → `drawImage`, which needs the
explicit width/height the SVG carries (confirmed an SVG `data:` URI rasterises there). Deep-indigo
ink on transparent: fine on the white profile button we draw ourselves, and on BC's light theme in
the Extensions list — a **known limitation** is low contrast against BC's dark theme there, to
revisit (a lighter fill, a halo, or the self-contained-disc "concept D") if it matters.

### Fixed 2026-09-15 (v0.72.7) — the doubled name on emotes (Known Bug #5)

Resolves **Known Bug #5** — every emote rendered the character's name twice ("Missy Missy goes
very still"). DW's hypothesis was right: the add-on and BC were both prefixing the name. Traced to
the send/display split, verified against R131 (`Screens/Online/ChatRoom/ChatRoom.js`):
`ChatRoomSendEmote` strips one wrapping `*` and sends the text; the **display** side ("Emote
messages formatting" processor) then **prepends the sender's name** to any plain `*`-emote, and
only leaves the text verbatim when it still begins with `*` (a `**`-style emote). Our lines already
carry the name via `fillTokens`, so BC's prepend stacked a second copy on top.

The comment in `notify.ts` claimed "an emote has no name prefix of its own — BC renders exactly the
text it is given," which is simply false for R131 and is why the name was placed inline in the first
place. **Fix:** `tellRoom` now sends `**${message}` — a verbatim `**`-emote, so BC adds no name and
the one we placed (subject, possessive or mid-sentence — the templates use all three) stands alone.
One line, at the single emote chokepoint; the misleading comments in `notify.ts` and `flavor.ts`
were corrected to match.

`test/notify.mjs` → 70: its `ChatRoomSendEmote` stub was a passthrough that recorded the raw
argument, so it **encoded the bug** (it expected the un-prefixed text). It is now a faithful model
of R131's send-strip + display-prepend, so `room` holds what a viewer actually sees; it first
reproduces the doubling from a plain emote (rule 6 — the guard must be able to fail) and then
asserts `tellRoom` shows the name exactly once.

### Fixed 2026-09-15 (v0.72.6) — a trigger planted at Drifting is dead; three fixes

DW planted "funtime" (8 actions) and it fired nothing but the vague-pull flavour, except the very
first utterance which spanked once. The save line was the tell: **"Planted at 0 (Drifting)."** A
trigger's firing strength IS its planted depth, so a depth-0 trigger has strength 0 and is a
permanent **ghost** (below `TRIGGER_GHOST_THRESHOLD` = 10, fireTrigger fires flavour and no
actions). It planted at 0 because the `triggerControl` depth gate had been set low enough to plant
at Drifting. DW's read — *not deep enough* — was exactly right, at PLANT time.

The "spanked once, then inert" was a real bug on top of it:
1. **`triggerStrength` returned `NaN` for a depth-0 trigger on its first fire.** `lifeDays(0)` is
   `Infinity` and the first-fire firing credit is `0`, so `0 * Infinity = NaN`; `NaN < 10` is
   **false**, so the ghost guard was skipped that once, the depth-gated suggestions were dropped
   (NaN fails their depth check) but the **compels weren't depth-gated at all**, so the spank fired.
   Every later fire had credit > 0, the NaN became a clean 0, the ghost guard caught it. Fixed with
   an early `if (t.plantedDepth <= 0) return 0;`.
2. **Planting is now refused below the ghost threshold** (`beginRecording`), with a "take them
   deeper" message — a born-dead trigger can no longer be saved. Only reachable when the gate is
   lowered to Drifting; otherwise the ordinary Deep requirement already prevents it.
3. **Compel actions in a trigger are now gated by the trigger's strength** like suggestion actions
   (`depthAllows("compelActivity", strength, strength)`), not by permission alone — a faded trigger
   loses its compels along with everything else, rather than firing them from a husk. DW's call.

`test/triggers.mjs` → 128 (depth-0 reads 0 not NaN; planting below the ghost line refused, just
above it plants). `test/activity.mjs` → 32 (a strength-15 trigger skips its compel; a strength-40
one fires it).

### Decided 2026-09-13 — a compel action follows the trigger's scope (no installer clamp)

Answers the ⚠ Scope question raised in *Commanded Activities — as trigger actions*: whether a compel
action in a trigger should be clamped to the installer regardless of the trigger's scope. **DW's
call: no clamp — a compel follows the trigger's scope like any other action.** The subject chooses
the rung (default *Hypnotist only*), and nothing here bypasses a gate: `triggersArmed()` still needs
`hypnoEnabled` + `triggerControl`, the per-action re-check still needs `compelActivity`, and BC still
refuses zones/activities she disabled. So a subject who widens the scope has chosen that a compel
fires that widely. No code change — v0.72.4 already behaves this way; recorded so it is not
re-opened.

### Added 2026-09-13 (v0.72.5) — a fired trigger's actions are paced, one at a time

DW: when a trigger hits, "the character basically does them all at once" — he wants a slight delay
between each so it reads better. `fireTrigger` applied every action in one synchronous tick, so a
multi-action trigger fired as a pile-up (up to `MAX_ACTIONS = 8` at once), which is exactly the
pile-up the body's *Commanded Activities — pacing* note anticipated.

`fireTrigger` now gates each action as before (permission, strength) but defers its **application**
into an ordered step list, drained one per jittered tick: **1.2s–2.0s per step**, the first landing
immediately so the trigger still feels responsive. The drain runs through `timers.ts` under a
`trigger-drain:<installer>:<phrase>` key, so `endSession()` / `totalStop()` (both call
`clearAllTimers()`) cancel a half-drained sequence — a safeword, wake or hard floor mid-drain stops
the rest rather than firing them at a subject who is no longer under.

Two things the pacing forced, both from the pacing/trigger-actions spec:
- **Compels re-validate on their own tick.** `ActivityRun` validates nothing, and seconds pass
  between steps — a restraint, chastity belt or an untick can land mid-drain. Each compel step
  re-checks `compelActivity`, our-vs-real freeze, and (via `runCommandedActivity` →
  `ActivityAllowedForGroup`) BC's own filter before it publishes, so a belt landing between steps
  yields nothing rather than a message the room reads as her masturbating through it.
- **Compels are counted apart from `holding`.** A compel is a one-shot event; only restriction
  actions (blocks, suggestions) arm `markActive` / the auto-release. This also closes a latent
  v0.72.4 bug the spec flagged: a compel-only trigger would otherwise have marked itself
  `** HOLDING YOU NOW **` and refused `/hypno forgettrigger` while gripping nothing.

Scope: this paces actions **within a fired trigger** (DW's ask). Pacing successive **live** commands
is the separate, still-unbuilt half of *Commanded Activities — pacing*. `test/triggers.mjs` → 123
checks (a multi-action trigger lands only its first action at once, the rest on the paced clock; a
compel-only trigger is not "holding").

### Fixed 2026-09-13 (v0.72.4) — compelled activities can be recorded into a trigger

DW, in play: the new activity commands "do the reaction instead of adding to the trigger" — say
"touch your breasts" while recording a trigger and it performed the touch rather than joining the
trigger being built.

Cause: `handleActivityCommand` is dispatched in `handleSpokenLine` BEFORE the `matchSuggestion` →
`recordAction` gate that captures ordinary suggestions during recording, and it never consulted
`isRecording()` — so it always performed. The body-part block handler already had the fix
(`handleBodyPartLine` calls `recordAction` before it acts); the activity handler just hadn't grown
it yet.

- **Record, don't perform, while recording.** `handleActivityCommand` now calls
  `recordAction(activityActionId(cmd))` right after the permission check (so recording needs "Made
  to act", as firing does) and before the perform-time gates (depth, freeze) — those are about
  doing it NOW, not planting it. The action id mirrors the block ids: `act:<Activity>:<word>` (e.g.
  `act:Caress:breasts`), `act:genital`, `act:vague`.
- **Replay on fire.** `fireTrigger` gains an `act:` branch beside the `touch:` one:
  `performActivityAction(id)` re-runs the real BC activity via `runCommandedActivity`. Permission
  (`compelActivity`) is re-checked at fire time like every other trigger action; our own freeze is
  overridden (planted command) while a real restraint still stops it. It is a one-shot event, so —
  like `orgasm-force` — there is nothing for the auto-release to undo, and `undoTrigger` no-ops it.
  No local flavor line: `ActivityRun` already renders it as a visible room message.
- `isTriggerSetupLine` now also hides a compelled command during setup, so a subject with the
  Awareness toggle on does not read their own trigger's contents.

`test/activity.mjs` → 30 checks: a command is recorded (not performed) while a trigger records, then
the phrase fires the real activity out of trance. Bot scenario `compel` gains a record-and-fire
sequence.

### Fixed 2026-09-13 (v0.72.3) — a strip command overrides our freeze too

DW, in play: *"'Missy you cannot move' is still taking priority to a command to strip."* The
v0.72.1 "command always wins" rule reached the touch and orgasm commands but not undress — a
third thing our freeze was blocking — so it was still refused while frozen.

`undress()` gates only on `undressBlockedReason()`; `InventoryRemove` itself does not re-check
restraint. But our Freeze trips that reason two ways: directly (`hasOwnEffect("Freeze")` →
`"frozen"`) and via BC's `CanChangeOwnClothes()`, which is false whenever `IsRestrained()`
(`Freeze || Block || BlockWardrobe`) → `"locked"`. That boolean can't be decomposed by
inspection, so the only honest way to tell "only OUR freeze blocks" from "a real lock also
blocks" is to lift our own effect and re-read it.

So `applyUndress` now does exactly what the orgasm path does: if we own the Freeze, lift it,
rebuild the cached `C.Effect` (`CharacterLoadEffect`), run `undress()` — which re-reads
`CanChangeOwnClothes` and still refuses a REAL lock/freeze, and `CanInteract` still refuses bound
hands (`Block`) — then restore our Freeze. The command pierces our freeze for the one act; it
does not lift it. `undress()` and its "frozen" unit test are unchanged; the override is purely at
the command layer. New suite `test/undress-command.mjs` (7 checks) drives the real
`handleSpokenLine("strip")` path: our freeze pierced and restored, a real freeze refused, bound
hands refused even with our freeze also on.

### Fixed 2026-09-13 (v0.72.2) — the cooldown never ended, so the attempt button never came back

DW, in play: WinnersDice missed her allowed attempts, the cooldown counted down to zero, and the
button never re-enabled to let her try again.

`CooldownRequired` is the one phase nothing re-evaluated. A success ends on the running session
timer; a miss with tries left waits on the hypnotist's "Continue Trying"; but a *spent* attempt
just sat in `CooldownRequired` with no timer scheduled. So the phase never changed and no fresh
view was ever pushed. On the hypnotist's remote the countdown label ticked down locally (via
`countdownRemaining`, off `receivedAt`) to "Cooldown (0s)", but `sessionButton`'s `CooldownRequired`
case is unconditionally disabled and keys on the phase — which never moved. Worse, a *different*
hypnotist stayed refused with "someone else is already working on them" forever (the
phase-not-`Idle` gate), since the subject never returned to `Idle`.

Two fixes, either of which alone unsticks it; both, because the symptom was "stuck forever":

- **Subject side (root cause):** entering `CooldownRequired` now schedules `scheduleCooldownEnd()`,
  a timer that drops the subject back to `Idle` when the cooldown expires and pushes one last view
  (restoring `hypnotistId` around the push, the idiom `totalStop` already uses). Registered in
  `clearTimers()`, so every teardown cancels it, and the callback no-ops unless still in cooldown,
  so a new attempt or wake arriving first is never stomped. A new attempt *during* the cooldown was
  always accepted correctly — the handler gates on `cooldownUntil`, not the phase — this only
  covers the case where none arrives.
- **Hypnotist side (robustness):** `sessionButton`'s `CooldownRequired` case offers the attempt once
  the local countdown reaches zero, so a delayed or lost re-push can't strand the button. The
  subject re-checks the real cooldown and refuses if the click was early, so this can only ever be
  early, never a bypass.

`test/attempts.mjs` → 52 checks: the cooldown ends on its own to `Idle`, pushes a fresh view, and
both the same hypnotist and a different one can attempt again once it has passed. (The cooldown is
still not persisted across a reconnect — a reload during it returns to `Idle` immediately, which is
lenient, not unsafe; left as-is.)

### Added 2026-09-12 (v0.72.1) — a command always wins over our own restrictions

DW, testing v0.72.0: *"there is still an issue with player touch VS commanded."* The self-touch
block was correctly pierced by a command, but two other spoken restrictions were not, and the
inconsistency showed in play: **"you cannot move" made every touch command fail, and "you cannot
cum" overrode "cum for me".**

**Settled rule (revises the v0.72.0 three-layer note above).** A hypnotist's direct **command** is
involuntary — not the subject's choice — so it **overrides any restriction WE applied to her own
volition**: the self-touch block, our hypnotic **Freeze** ("you cannot move"), and our
**orgasm-denial** ("you cannot cum") alike. What still wins is **real BC physical reality** — a
restraint that binds or freezes her, a real chastity/edging item — because that is not ours to lift
and is not a choice of hers we are overriding. `ActivityAllowedForGroup` already enforces real
bondage/chastity for touches; for the two effects we inject, `hasOwnEffect()` tells our copy from a
real item's, so we pierce only our own.

- **Freeze:** `handleActivityCommand` refuses a commanded activity only for a freeze we did *not*
  apply (`HasEffect("Freeze") && !hasOwnEffect("Freeze")`). Our hypnotic freeze stands aside; the
  selftouch hook already bypasses its own Freeze check while a command is in progress.
- **Orgasm denial:** a forced "cum for me" lifts *our* `DenialMode` off the Emoticon carrier,
  rebuilds the cached `C.Effect` (`CharacterLoadEffect` — `ActivityOrgasmPrepare` reads that cache,
  not the appearance live; verified in R131), forces the orgasm normally, then puts our denial
  straight back. A real belt's `DenialMode` is a separate item, survives the rebuild, and still
  bails the orgasm — so physical denial is untouched. Bypass was rejected: it produces a *ruined*
  orgasm and would override a real belt too. The command pierces the standing restriction for one
  act; it does not repeal it.

`test/activity.mjs` grows to 27 checks (our freeze pierced vs a real freeze refused; our denial
overridden then restored vs a real belt refused). Bot scenario `compel` gains the two matching
play-test steps.

**Test-runner fix (same pass).** `test/run.mjs` graded a run by scanning every suite's output for
`/want|MISMATCH|expected/` — which the trance flavor line *"...makes you want to listen."* matched,
so `npm test` had been exiting non-zero on *every* run regardless of the checks (v0.72.0 included).
It now trusts each suite's exit code (`execFileSync` throws on non-zero) and scans only the suites'
own diagnostic lines, with the add-on's `[HypnosisAddon]` log output stripped first. The exit code
is truthful again — the check counts were always right, the pass/fail signal was not.

### Added 2026-09-12 (v0.72.0) — compelled activities (Phase 1: self, one-shot)

The subject can now be *made to act*, not just stopped. "Missy, touch your breasts" makes her
perform the real BC activity on herself — run through `ActivityRun`, so it renders in the room
identically to her clicking it, and validated with `ActivityAllowedForGroup`, so anything
impossible while bound, chaste or out of reach is simply never offered. Filtering costs us nothing;
BC already knows.

**One standardized grammar, by DW's request:** `<verb> your <part>`. The verb picks the activity,
"your <part>" picks the zone (reusing the ~40 body-words), first match wins so specific verbs sit
above the universal `Caress` (touch/rub/stroke). Learn "touch your breasts" and *"pinch your
nipples", "lick your thighs", "spank your bottom"* all follow. Curated to the bare-handed / mouth
set (Caress, Grope, Pinch, Spank, Slap, Scratch, Tickle, Pull, Choke, Massage, Nibble, Lick, Kiss,
Suck, Bite, Pet, and genital MasturbateHand); the held-toy `…Item` activities want a later
"with the <toy>" extension.

**Bare "touch yourself" wanders** — no part named, so the hands go to a random reachable zone and
the hypnotist gets a private nudge to be specific. It never no-ops, and it teaches the grammar.

**The consent boundary (DW's rule, 2026-09-12), three layers:** BC physical reality (bound/chaste/
frozen) always applies; the subject's own *self-touch block* is pierced by a command, because a
command is *involuntary* — not the subject's choice; and a **new permission, "Made to Act"**
(`compelActivity`, Yielding depth) gates whether the subject can be commanded at all. This is
exactly the old "touch yourself whenever X **and** you can't on your own" combination, now that the
block and the compel are separate layers.

> **Revised in v0.72.1 (see above).** This entry originally read "Freeze still stops everything."
> That turned out inconsistent in play: a command pierced the self-touch block but *not* our
> hypnotic freeze or our orgasm-denial. The settled rule is now **a command overrides every
> restriction WE applied** (block, our Freeze, our denial); only **real** BC restraints/chastity
> still stop it.

`selftouch.ts` gains a `beginCommandedActivity`/`endCommandedActivity` bracket the resolver wraps
its `ActivityRun` in, so the block hook stands aside for a commanded action without weakening the
physical checks. `test/activity.mjs` (22 checks) drives the whole path with BC's activity calls
stubbed — right activity on the right zone, BC's filter authoritative, the block pierced, Freeze
respected, the depth gate. Bot scenario 9 (`compel`) walks it in play.

**Phased, as agreed.** Phase 1 is **self-only, one-shot**. Kept in mind for later: *sustained*
("keep going"), *conditional* ("whenever arousal drops below X"), *others* (act on another player),
and the split of gentle vs rough into separate consents. The help's What-to-Say tab and the wizard
(new "made to act" group) already carry it; the depth ladder shows it because it is generated from
`DEPTH_GATES`.

### Added 2026-09-12 (v0.71.0) — the setup wizard

The starter button grew up into the real thing DW wanted (and the design doc always specced). On a
fresh install or a reset — while `starterState` is "new" — opening settings shows a **setup screen**
instead of the tabs; a **Setup** button in the top bar re-runs it any time. It locks nothing and
never appears mid-session, because it changes consent settings and those are locked while a trance
is on you.

**Two ways through it.** Four one-click **presets** — *Hypnotist only · Light / safe · Balanced ·
Extreme* — spanning "I only drive" to "everything on, easiest access". Or **answer a few questions**:
five single-decision screens — which feature groups others may use, how easy to reach them (one
global easy / earned / deep), whether arousal is a shortcut, how much of a hypnotist's claimed skill
you honour, and whether triggers fade — then a plain-language summary and Apply.

**Presets and the wizard converge on one `applySetup()`** (`src/wizard.ts`), which writes the
features, the depth-tier overrides, the chemical scope, the skill rung and the decay rate together —
so a preset and the matching answers can never drift into meaning different things. The composition
is the safety-critical part, and `test/wizard.mjs` pins each preset: Hypnotist-only leaves the
subject side entirely off; Light is exactly the five session basics; Balanced adds undressing,
arousal and awareness but **nothing that outlives the session**; only Extreme opens the earned-only
illusion and triggers to arousal.

**Two judgement calls, both flagged and reversible.** "Hypnotist only" turns the subject side off,
but the H-icon on your own sheet cannot be hidden — it is drawn by whoever views you, and the
anti-directory rule (design.md, the H-icon note) keeps it universal; turning your subject side off is
the functional whole of it. And "Extreme" sets skill honour to **capped** rather than full, because
rung 4 is still gated on dual fatigue — a one-line bump when that lands.

This replaces the v0.70.0 lower-right starter button, which DW did not like; its `STARTER_FEATURES`
survive as the Light preset.

### Added 2026-09-12 (v0.70.0) — the starter set

The onboarding cliff, closed. Two people install this to try it together; he attempts an
induction; her client refuses — every permission ships `false`, `hypnoEnabled` included — and all
he is told is *"They aren't open to hypnosis."* She never refused; she was never asked. Neither can
tell the add-on being off from the add-on being broken, and the first thing it did was make her
look like she said no.

A first-time subject now sees an offer in the empty lower-right of the Permissions tab: **turn on a
safe starter set** — hypnosis, movement, speech, posture, wardrobe. The five are the mildest and
most obviously reversible, all session-scoped, chosen on the same line `earnedOnly` already draws:
nothing that outlives the trance, nothing that deceives the subject about their own body. The flags
that persist (triggers, carry), deceive (illusion, the awareness suppressors) or remove an exit
(`lockedWhileHypnotized`) are deliberately out, and `test/starter.mjs` pins the set against the
earned-only gates so none can creep in.

Three properties the proposal insisted on, all held: it is **offered, not applied** — the note
pre-ticks nothing and does nothing until clicked; it **says exactly what it turned on**; and it
**undoes in one click**. Taking it or waving it off dismisses it for good (`starterState`, sparse,
so a fresh install is "new" and a reset returns to "new"). `STARTER_FEATURES` in storage.ts is the
single source the button and the test share.

### Added 2026-09-12 (v0.69.1) — the help content read-through

With the layout fixed, the words themselves. DW: organize it simple→complex and get the commands
right.

**Five tabs, reordered simple→complex:** Start Here (the loop) · What to Say (the vocabulary) ·
**Depth & Trust** (the model those words obey) · Lasting (what outlives a session) · Commands (the
typed reference). "Trust" was renamed "Depth & Trust", because depth — not a trust percentage — is
what actually gates everything now, and the tab never explained it.

**The gate model is generated, not asserted.** The old Trust tab listed "Clothing illusion — trust
65" and so on: the pre-depth-redesign framing, and wrong since v0.50.0 (those thresholds are
vestigial; `depthAllows` is the real gate). It is replaced by a **depth ladder built from
`DEPTH_TIERS` and `DEPTH_GATES`** — the five tiers with their blurbs, then which features each tier
reaches, earned-only ones marked — so it cannot drift from the gates the code checks, the same
principle the vocabulary and command tabs already followed.

**Lasting caught up with two shipped systems it never mentioned:** trigger decay and reinforcement
(triggers fade; "that trigger holds" resets the clock; the rate is on the Triggers tab), and the
earned-only toggle (arousal can be opened to the illusion and triggers at the price of fading fast).
The stale "both need trust 65" became "a Deep trance, on earned depth".

**The Commands tab was genuinely buggy, not just stale.** Commands are not contiguous by group in
the table, and the tab printed a header whenever the group changed — so Session/Diagnostics/Data/
Testing headers repeated as the list flipped between them. It now buckets by a fixed simple→complex
order, prints each group once with a one-line note, renders each command as a single wrapped line,
and hides the Testing group entirely when `TESTING_MODE` is off (those commands do not exist in a
release build).

No mechanic changed; `help examples` and `help-layout` suites still green, 1078 total.

### Added 2026-09-12 (v0.69.0) — the help reads again, and Stats moves behind Advanced

Two things, from DW's screenshots of a help screen that was mostly ellipses.

**The help is one word-wrapped column now, not two clipped ones.** The two-column layout halved
the width, so nearly every authored line overran and was cut off with "…" — and a heading that
took its lead pushed down into the body under it, so the *Lasting* tab's headings overlapped their
own text. `drawHelpLines` (`panel.ts`) was rewritten: a single ~1220px column, each line wrapped to
as many physical rows as it needs rather than clipped, and pagination by vertical budget rather than
a fixed line count (wrapping makes line heights variable). Headings get real space before them, so
groups read as groups. `test/help-layout.mjs` drives it through a stubbed canvas and holds the three
things that were wrong: nothing drawn wider than the column, nothing below the panel floor, long
content paginating instead of piling up.

**The Stats tab moved behind an "Advanced" button** (declared-skill proposal §5a). It lists every
hypnotist's trust and interaction counts and the player's own experience — DW's debugging
visibility, and noise on the main screen. The five everyday tabs are always up; an Advanced button
in the tab column reveals Stats (and with it the trust-decay control and the export/import/reset
data buttons, which live on that tab). Reachable, but sought out.

**Help content caught up part-way.** Skill now appears in the Trust tab (how it enters the roll, and
that your Depth-tab rung decides how much to believe), the earned-only toggle is noted under the
gates, and the trust-decay reference points at the Advanced view rather than a "Stats tab" that is
no longer a tab. The full five-tab rewrite is still a todo — the gate block still talks trust
thresholds rather than depth tiers, and the handler-driven phrases are still hand-maintained.

### Added 2026-09-12 (v0.68.0) — the earned-only gate becomes the subject's to lift

The three earned-only features exist because arousal must not, by default, reach anything that
outlives the session or lies to the subject about their own body. **By default** was always the
plan: DW settled on 2026-09-08 that the subject could open two of them — the clothing illusion and
trigger-planting — to chemical depth *for themselves*, and the reason it could not ship then was
that the safeguard did not exist. It does now (decay, v0.60.0), so it ships.

`gate.earnedOnly` stops being the last word and becomes a seed. `effectiveEarnedOnly()` in
`depth.ts` reads a sparse, true-only `chemicalReach` map — stored exactly like `depthGates`, the
default living in code so it stays reversible — and everything (`depthAllows`, `depthRefusal`, the
trigger-planting `plantedChemical` check) reads that instead of the constant. A per-row toggle on
the Depth tab flips it: *earned only* ↔ *arousal ok*.

**Three things hold it safe, and they are the whole point.** The default is unchanged, so a subject
who touches nothing is where they were. Only *their own* client writes the map — there is no
message handler, no cross-player path, so the old guarantee stands verbatim: nothing a hypnotist
does can let an aroused stranger plant a lasting trigger; only the subject choosing it can. And the
shortcut is priced — a trigger planted on chemical depth is `plantedChemical` and fades at the fixed
fast rate, while the illusion is session-scoped and clears on wake regardless.

**Carry-forward is deliberately left out.** It outlives the session and has no decay clock of its
own yet, so there is nothing to price its shortcut with. Its row is drawn locked, and
`effectiveEarnedOnly()` ignores any value stored against it — it stays earned-only until it has a
decay clock, which is the same sequencing rule that kept the whole toggle behind decay.

`test/chemical-reach.mjs` (22 checks) drives the real gate: default unreachable, opened reachable,
per-feature independence, the `plantedChemical` marking, carry-forward's immunity, and that turning
it back off deletes the key rather than storing a false. The `depth.ts` comment that stated the
opposite rule was rewritten in the same commit.

### Added 2026-09-12 (v0.67.0) — walking trance

*"Walk with me."* The subject stays under but comes off the freeze and onto their feet, the veil
dropping from ~30% to a ~8% hint. To the room they look awake; they know they are not. *"Be still"*
puts the stillness and the full veil back. Everything else a trance is doing — speech, suppression,
the illusion, arousal — is untouched throughout, because none of it is about stillness; the freeze
was the only thing walking suspends, which is what the design's "lighter effects continue" comes to
in practice.

**Where it lives, and why there.** A dedicated handler (`handleWalkingTrance` in `voice.ts`,
dispatched right after wake), not a row in the suggestion table. Walking trance is a change to *what
being under is like* — the same category as the trance-default freeze and fade it adjusts — so it is
governed by those defaults (`tranceCannotMove`, `tranceScreenFade`), not by the on-demand
`movementRestriction` permission a hypnotist reaches for mid-scene. That also keeps it off the
permission/depth framework the table entries carry, which would have been the wrong gate. The
enter/leave state is a leaf flag in `effects.ts` (`isWalkingTrance`), cleared by
`clearTranceStates()` so it can never outlive the trance it is a mode of.

**The one ordering subtlety.** The leave phrases — "be still", "stop", "stay still", "stay" —
overlap the movement suggestion's vocabulary. The handler only consumes them *while walking*;
otherwise it returns and lets the movement suggestion freeze the subject as before. So an ordinary
"stay still" still works, and "be still" only means "return to full trance" when there is a walking
trance to return from. Enter beats leave on a tie, so "stay with me as you move" reads as entering
rather than as the bare "stay" that leaves.

`test/walking.mjs` (25 checks) drives it through `handleSpokenLine` with a forced trance, asserting
the falsifiable core the old in-or-out model could not express: after "walk with me" the subject is
*not frozen* yet *still under and still parsing suggestions*, and after "be still" the freeze is
back. Bot scenario 9 walks it in play.

### Added 2026-09-12 (v0.66.0) — hypnotist skill, declared and visible (rungs 1–3)

The feature design.md has wanted since the beginning — *a new player should have little chance of
resisting a very experienced hypnotist* — finally wired into the roll, by the route the proposal
settled: **declared and visible**, not verified.

**What happens between the two of them.** He attempts an induction; his client sends a 0–100 skill
value derived from his own completed inductions (the same `100n/(n+25)` curve as everything else,
reusing `H_EXPERIENCE`). Her client runs that claim through the **honour rung she set** and nothing
else decides it — rule #1 holds literally, because the acting-on-a-number still happens entirely on
her machine. Rung 1 ignores it; rung 2 scales it by how well she already knows him (a stranger gets
zero); rung 3 caps it at the stranger ceiling of 30; rung 4 takes it whole. Default is rung 2.

**He can lie about the number, and that is the point, not a hole.** It is computed on his machine
from his own storage; both are editable. What protects her is that her client decides whether it
counts, that she is shown a read on it before she answers, and that the rung letting a stranger's
claim matter at all is one she had to go and choose. Inflation only reaches people who already
opted to listen.

**How it enters the roll.** Two terms, both off the *honoured* value: an additive `0.35 × v` that
behaves like any modifier, and a floor under **Fight** of `5 + 0.25 × v` — the literal statement of
"resisting this person leaves a wider gap than resisting a novice", and the one the design names. The
A1 invariant from v0.62.1 (Fight never beats Ignore) was already in place waiting for exactly this,
and `test/odds.mjs` sweeps it with the live terms now reachable. Skill counts toward **`depthFull`
only** — `currentSkillTerms()` returns nothing for the earned pass — so the arithmetic alone keeps an
overpowered newcomer shallow (a fought win lands ~0–25, Drifting or Yielding) and the `earnedOnly`
features out of reach before any gate is consulted.

**What she sees.** The induction prompt gains one private clause, on her own screen, about *her
instinct* rather than about him — read off the honoured value, so two subjects meeting the same
hypnotist read him differently, which is coherent as a feeling and incoherent as a claim (the joined
A3/A3a decision). Below honoured 20 there is no clause at all: she has no read on this person. The
prose is placeholder; the register — behavioural, never evaluative, never a number — is settled. The
hypnotist is never told whether his claim was honoured, the same construction as never learning the
Agree/Ignore/Fight choice.

**What the hypnotist sees.** `/hypno skill` — his own value and the practice behind it, sought out,
never anyone else's. Skill accrues on his client from what the subject's own `session-update`
reports back: +0.25 a roll, +1 more on a success, mirroring the subject's experience pool, credited
at one site off the attempts count so it cannot double-count.

**Deliberately not in this build.** Rung 4's *offering* waits on dual fatigue (its "usually wins"
feel is carried by attrition, which does not exist yet — §4). The rolling-hour **practice cap** that
stops skill being ground out against a cooperative friend is designed (§5) but unbuilt, and owes DW a
name first. Demoting the Stats tab behind an Advanced button (§5a) is cosmetic and separate. None of
the three changes a number in this build; they are the hardening and the CNC top, to follow.

Test bot: `!skill <n>` sets the claim it transmits (default 80, "expert"), so the rungs can be
watched in play. `test/skill.mjs`, 34 checks.

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

### Added 2026-08-29 (v0.14.0 – v0.27.1)

**The trust engine (v0.15.0–v0.18.0).** Everything Stage 6 asked for except decay and hypnotist skill. The shape that matters: **store the interaction count, derive the value**, `trust = 100n/(n+H)` with `H = 25`. Retuning `H` therefore reprices every stored relationship instead of corrupting it, which is not true of storing the score. One conversation is worth 1 interaction (rate-limited to one per 5 minutes, doubled when the line is addressed to you by name); a successful induction is worth 5. Experience is a **single pool** whose sign follows the choice — practice with hypnosis is one skill, and cooperating or resisting is what you do with it.

**The induction roll became a chance, not a threshold (v0.15.0).** `clamp(access + choiceModifier + experienceEffect, 5, 95)`, read literally as a percentage, with depth falling out of the same roll (`chance - roll`), so a comfortable success goes deep and a squeaker leaves a trance the subject can pull themselves out of. The 5/95 clamps mean nothing is ever certain in either direction.

**Arousal as a chemical floor (v0.18.0).** `access = max(trust, min(arousal, 30))`, read off the player's own `ArousalSettings.Progress` on their own client — correct *and* convenient, since the roll already runs there and nothing has to be synced or trusted. A floor rather than a multiplier, exactly as this doc argues: a multiplier on zero trust is still zero, which would give a stranger nothing, and a stranger is the one case the mechanic exists for.

**Persistent triggers (v0.20.0–v0.25.0).** Planted by speaking during a trance — "your trigger word is X", then the suggestions, then "remember trigger" — and fired afterwards, outside any session, which is the whole point. Gated on its own permission *and* trust 65, with arousal explicitly not counting toward that gate (this doc's rule that the chemical floor never reaches persistent features). Each action re-checks its own permission **at firing time**, so revoking a permission disarms that part of every trigger already planted. Also: the phrase is hidden from the subject (they can't decide not to react to a word they can read), setup lines can be hidden entirely, scope mirrors BC's own permission ladder (hypnotist / owner / lovers / whitelist / dominants / not-blacklisted / everyone), and each firing wears off after a configurable duration (default 5 min).

**Arousal & orgasm suggestions (v0.27.0).** Four levels — not / lightly / highly / fully aroused — plus forced orgasm and denied orgasm, all under one permission. The levels land on bands BC already has expressions for; "fully aroused" is 95 because that is what BC itself sets an edged character to. Forced orgasm delegates the *decision* to `ActivityOrgasmPrepare`, so a chastity item or our own denial silently wins without the add-on knowing the rules. Denial uses BC's own `DenialMode` effect, so it applies to vibrators and activities too, not just to us.

**The Agree / Ignore / Fight prompt became a box (v0.26.0).** The chat commands remain, because the box only exists on the chat room screen — a player in the wardrobe when the attempt lands sees no box, and the commands are the only thing that reaches them.

**Data (v0.16.0–v0.17.0).** A read-only Stats tab, export / import / reset — and a real data-integrity fix: `localStorage` is per-**origin**, so a single fixed backup key meant two characters on one browser shared one set of trust and stats. Keyed per account now, and saving refuses outright until the member number is known rather than writing to the wrong place.

---

### Added 2026-08-29 (v0.10.0 – v0.13.1)

**Trance state defaults.** Going under now automatically applies *cannot move*, *cannot speak* and a *screen fade*, per the doc's "Default Hypnosis State Effects" table. All three on by default and individually toggleable. Speech blocking hooks `ChatRoomSendChatMessage`, which sits after command parsing and after the emote and whisper branches — so a silenced player keeps `/hypno safeword`, emotes, and whispers as an OOC lifeline, losing only ordinary room speech. The veil hooks `DrawProcess` and paints after it, white at 30%.

**Message suppression, with arousal preserved.** "You notice nothing that happens to you" (clothing + bondage + touch) and the narrower "you will ignore my touches". The constraint that arousal must still apply is what shaped it: suppressing in our own `ChatRoomMessage` hook would have killed arousal too, so this registers into BC's own handler chain at priority 320 — after Arousal Processing (210) and BC's own hiders (300, 310), before Push-message-to-chat (500). Categories separate via `Asset.IsRestraint`, so a rope and a dress classify correctly without maintaining a group-name list.

**Self-touch restrictions.** Freeze now covers reaching for yourself, and named body parts can be blocked ("you cannot touch your breasts"), plus "you cannot touch yourself" for the lot. This hooks `ActivityRun` instead, and the difference is deliberate: `ActivityRun` applies arousal, runs the self-effect and sends the message, so not calling it means the activity genuinely never happens — the opposite of suppression, where everything happens and only the message is hidden. Scope is self-touch only, structurally: `ActivityRun` executes on the actor's own client.

**Spoken wake-up keyword** ("wake up", "you are awake", "come back to me", "awaken"). Ungated by permission — ending a trance is always allowed — and works from any live phase, so it cancels a running induction rather than being ignored.

**Tabbed settings screen.** Three tabs — Permissions (7), Trance Defaults (3), Awareness (3) — replacing three groups crammed into two columns. The previous layout is tagged `menu-checkbox-layout` in git.

**Testing discipline that's earning its keep:** the pattern library is exercised by a ~135-case suite covering phrasings, false-positive probes and cross-suggestion collisions. It has caught six real bugs before they shipped, including bare "stand" never matching at all, and `awareness-release` swallowing "you are awake again" — which would have made the wake keyword merely restore awareness while leaving the subject under.

**⚠ One thing to restore before real play:** `INDUCTION_WINDOW_MS` in `session.ts` is set to 10 seconds as a testing value. Normal is 60_000. Ten seconds is far too short to actually roleplay an induction, which is the entire point of that window. Marked in-code. *(The second item that used to sit here — the chance-based roll being proposed rather than implemented — shipped in v0.15.0.)*

---
