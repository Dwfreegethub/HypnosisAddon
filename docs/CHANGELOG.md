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

### Fixed 2026-11-26 (v1.23.1) — "feel real" takes Freeze and BlockWardrobe from items

DW, live: "Missy, you see Floor Shackles on you", "they feel real" → "Nothing they see can hold anyone".
R134 FloorShackles carry Freeze, BlockWardrobe, MapImmobile (SetPose Spread), and v1.22.0 left the first
two out on purpose (ECHS holds them for other things). real-effects.ts SHARED_REAL_EFFECTS (Freeze →
movementRestriction, BlockWardrobe → clothingRestriction); MapImmobile joins the exclusive list.
feel-real.ts applies a shared one only when not already held (ownedShared) and on letting go removes only
those, unless voice.ts's setSharedHeldElsewhere says they are still wanted: isHypnotized(), or
movement-block / movement-lock / clothing-block said or carried. recovery saves seeRealOwned so a reload
keeps the ownership. test/feel-real.mjs 30 (three mutations caught).

### Added 2026-11-26 (v1.23.0) — the bondage picker (any item, any option)

DW: "Now we have to figure out how to build all the bondage and options. Most items have several options
in them"; delivery chosen: "Sent to her ECHS + a line in chat". src/popup-items.ts reads the hypnotist's
own BC tables (live R134): Asset (Group.Category "Item", Family, Visible; not ItemScript/ItemHidden),
TypedItemDataLookup[key].options and ModularItemDataLookup[key].modules (one-option modules left out),
each option's Property.TypeRecord combined into the see: id's ~record. popup.ts itemPicker (Clothes
group): slot select, search + item select (the search refills the list without redrawing), one select per
choice, "type it" types "Name, you see a X on you" (no other suggestion reads that) and sets a pending
pick. main.ts hooks ServerSend: when a Chat/Whisper going out contains that line (5 min, once), a
"see-item" hidden message follows it to her. voice.ts handlePickedItem: one ghost, an Item group, an asset
her client knows (else the hypnotist is told), a session; then landSee, the spoken illusion's path
(permission, recordAction, depth, showSee, reminder / feel real). describeSee names picked items by BC's
Description. Vibrator modes aren't offered (drawn in the first). Not yet: a picked item inside a "when
anyone …" line. test/item-picker.mjs (27, four mutations caught); the popup UI itself needs the live check
(script_test.md Z15): the UI lab has no BC item tables.

### Fixed 2026-11-26 (v1.22.1) — naked + tied together; carry keeps the newest

DW, live: "Missy, you see yourself naked", "your wrists are bound in rope", "the ropes feel real", "all of
this will stay with you", wake: "The rope did, I cannot move my arm, but my clothing reappeared". The
cause was v1.21.0's one-at-a-time rule: the bind replaced the strip at once (the hypnotist was told
"It replaces the illusion they had"), and the wake re-applied both in order, the bind replacing again.
illusion.ts now keeps stripSlots and bindGhosts side by side (currentSee(kind), currentSees(), clearSee
(kind)); only the freeze replaces, and is replaced. see.ts matchSeeRelease + voice handleSeeRelease end one
kind ("the ropes are gone" / "you see yourself dressed"), before the table, and only when that kind is
showing (else the table's freeze release still gets "you see you are dressed"). trackSee keeps one
applied id per kind, so steps don't fill the carry list. Also found on the way: carryThese silently
dropped the NEWEST past MAX_CARRIED (8), which a long trance makes the illusions; now 12, the oldest left
out, and the hypnotist is told which (rule 5). Recovery saves `sees` (reads the old `see`).
test/see-illusion.mjs 56 (DW's sequence through a wake; three mutations caught).

### Added 2026-11-26 (v1.22.0) — "the ropes feel real"

DW: "Can we look at the restrictions that the item applies and have a command something like they feel
real to you", then "build they feel real and make that as the default message to remind the hypnotist
that the bindings dont work by default". src/feel-real.ts: makeReal reads ghostEffects() (illusion.ts:
the ghost items' Asset.Effect + option Property.Effect) and puts each effect listed in real-effects.ts
(Block, Prone, Slow, Cuffed*, BlockMouth, Gag*, Blind*) on the Emoticon through effects.applyEffect,
gated by kind: movementRestriction / speechRestriction / sightControl at that gate's depth (a trigger:
its strength). Freeze and BlockWardrobe are never taken from items, since ECHS holds them for other
suggestions, so every REAL effect is feel-real's alone and letting go removes them all. Ends on
illusion.ts onSeeingDropped (released, replaced, safeword via clearIllusion), "…not real", trigger undo;
recovery saves seeReal and re-makes it with the picture, and counts leftover REAL effects as orphans
(releaseOurEffects takes them off). The allow-list (MANAGED_EFFECTS) gains them. Wording: "the ropes /
cuffs / gag feel(s) real", "they feel real" (a bare one only while bindings are shown or planting), "you
feel the ropes"; "…not real", "they don't feel real". Action id `see:real`. bindReminder(name) replaces
the v1.21.0 reminder; a bind illusion added while real is made real too. Tested in test/feel-real.mjs
(23, three mutations caught).

### Added 2026-11-26 (v1.21.0) — seeing illusions (ideas doc #7, picture half)

DW: "Lets try Illusions"; on the open question, "Picture, Hypnotist can add hold and remind the tist that
the illusion does not restrict movement". src/see.ts parses (strip: naked/topless/bottomless/underwear/
without your X, by undress.ts slots; bind: tied up / cuffed / chained / taped / gagged / blindfolded,
"your wrists are bound in rope", "you see rope on your ankles", "you are tied up in rope" — the last only
with a material, so "you are bound to obey" stays) into an action id `see:naked`, `see:off:Bra+Panties`,
`see:bound:ItemArms/HempRope~typed=2+…` (the ~TypeRecord is for a future popup picker of any item and
option; DW asked whether all items could be covered). illusion.ts gains a seeing mode beside the freeze:
the shadow draws her live appearance minus the stripped slots, or plus ghost items built on the shadow
(AssetGet + ExtendedItemInit(shadow, item, false, false) + ExtendedItemSetOptionByRecord, never pushed);
a real item in a group wins. One illusion at a time (a new kind replaces, the hypnotist is told).
suppression.ts hides clothing messages under strip and bondage messages under bind (illusionHides). Voice:
handleSeeIllusion before phantom (Illusions permission, its earned depth, recordable, BIND_REMINDER to the
hypnotist); triggers hold it (holding, undo clears); carry and wake keep it (session.ts checks carried
see: ids); illusion-release / awareness-release end it and drop carried see: ids; recovery saves `see`.
Assets checked in live R134 Female3DCG(.Extended).js. Permission label "Clothing Illusion" → "Illusions"
(key unchanged). Next (DW chose): "they feel real", applying the ghost items' BC effects (Block,
GagMedium, BlindNormal, option effects) through effects.ts under the matching permissions. Tested in
test/see-illusion.mjs (50, mutations caught); the UI lab mock can't render items, so the picture itself
needs the live check (script_test.md Z13).

### Added 2026-11-26 (v1.20.0) — report playing without ECHS to her owner / full keyholders

DW: "leave everything off by default and have an option somewhere to report you logging in without
ECHS to your BC owner or BC full keyholders", then "We can beep the person if they are online and then
again when you see them in person". src/without-echs.ts. ECHS can't see a session it isn't in, so it
keeps a record on her account under its own ExtensionSettings key (`HypnosisAddonSeen`, plain JSON,
written only when it changes, refreshed every 10 min, and on pagehide): time, LastChatRoom name, Item*
groups as asset/lock (+ timer-lock RemoveTimer), a hash of Clothing groups. It is compared straight
after LoginResponse (R134 Login.js: LoginSetupPlayer sets everything before LoginDone; ServerHandleRelog
returns early). Checked in R134 ChatRoom.js: Leave and leaving the search set LastChatRoom null; a
rejoin saves nothing new. So a quiet "rejoin, close tab" is not seen; an offline gap is never reported;
an expired timer lock is skipped. Delivery: AccountBeep, IsSecret (server app.js: lands only if the
recipient has her as a friend). Online = listed in the server's OnlineFriends answer (mutual friends),
so it is known to land; in person = in ChatRoomCharacter (no second beep within 2 min of the online
one). 7 days then dropped, she's told. Setting `reportWithout` off/owner/full/both (General tab
dropdown, lockable; a full-keys remote choice). Owner = fully owned (Stage 1), not a trial. Off clears
the record. Not done: other players' ECHS noticing her in a room without ECHS (the live sighting).
Tested in test/without-echs.mjs (29, three mutations).

### Added 2026-11-26 (v1.19.8) — a pose compulsion that holds while she stays in the pose

DW: "Yes, add holds while you kneel". The whileWorn machinery with a pose: `wornHold.pose` is the state
the event named (`pose:kneel`), group and asset "" (so heldOnBy never matches it), and wornStillOn reads
currentPoseStates() from the new pure pose-states.ts (moved out of pose-watch.ts so voice.ts can read it
without an import loop). pose-watch.ts runs checkWornHolds after every look, adopted ones included, so it
lets go at once rather than at the 5 s poll, and ECHS moving her out of the pose ends it too. The option
wording (whileWorn) gains "while you kneel / stay like that / are on your knees / keep your arms up",
"until you stand up / move". Refused, with a reason, on "you move" (no state to stay in). Repeats as for
any worn hold.

### Added 2026-11-26 (v1.19.7) — pose compulsions

DW: "Is there any compulsion that can trigger on a motion. When you kneel for example", then "Movment
all movments. Arms. kneeling. What ever", and "I dont think a echs action should trigger it". Eleven
pose acts in compulsion-acts.ts (`pose: {states, self}`), first in the table so "pulls your arms behind
your back" is not the hair pull. pose-watch.ts reads what BC draws (Player.PoseMapping, R134 PoseRefresh,
which folds in poses items force) into states (kneel / stand / allfours / hogtied / legs-spread /
legs-closed / arms-up / arms-out / arms-back / arms-down) and sends each state newly come into as
`pose:<state>` (or `pose:changed`) to noteActivity. It looks after PoseSetActive / CharacterSetActivePose
on her (hers, or an add-on's: read as hers), ChatRoomSyncSingle / SyncCharacter / SyncItem about her (by
SourceMemberNumber / Source; ChatRoomKneelStandAssist syncs her this way), and her own
ChatRoomCharacterUpdate. The look is a microtask later, so effects.ts's hold (the outer hook) has already
put a refused change back. ECHS's own posing is setSuggestedPose only; its new `echsPoseDepth` (not
ownPoseChange, which also covers another player's change let through the hold) makes the coming look an
adopt, never an event. Self-moves pass compulsionsFor's self gate for "*" as clothing does. Not done:
"holds while you kneel" (whileWorn) for poses. Tested in test/pose-compulsion.mjs (24, two mutations)
and the UI lab mock (her own kneel fires, standing doesn't, the word trigger's kneel doesn't); the mock
has no PoseMapping or remote pose sync, so those paths are covered by the suite only.

### Added 2026-11-26 (v1.19.6) — release or forget one compulsion by its number

DW: two blindfold compulsions both went off, "and there is currently not a way to remove one without
removing them all". DW chose numbers. `compulsionsNumberedFor(hypnotist)` is the speaker's compulsions
in the order of the planted list they are sent (`plantedTriggersOf`, the planted source's own list),
and `compulsionNumbers` in planted.ts numbers the received entries the same way for the popup, the
profile page and /echs planted. Spoken as an ordinal ("forget the second compulsion") so an older
subject's ECHS, whose all-of-them pattern takes "forget compulsion …", ignores the line rather than
forgetting everything; a digit works on this version (read from the raw line, since normalize drops
digits). Both are checked before the all-of-them wording. The planter only; whoever set one off keeps
the release-all wording. A forget answers with the fresh list, since the numbers after it move up.

### Fixed 2026-11-26 (v1.19.5) — two phantom-touch wording misses

DW wanted "if a player's underwear is removed they can feel phantom touches until it is put back on".
That already works from parts that exist (an off-panties compulsion, a phantom touch as its action, "this
trigger holds while you are undressed", and the phantom repeating with the hold's arousal), but trying it
found two misses in `matchPhantomTouch`: "between your legs" read as the legs (now the crotch zone,
ItemVulva), and a later clause on the same line ("… and you cannot speak") made the whole line negated, so
the touch was dropped. The negation and the part are now read from the touch's own clause.

### Added 2026-11-26 (v1.19.4) — self-bondage counts; "you cannot take it off"

DW: "Can we make the bondage compulsions work if someone self binds themself. Maybe make a way that
they cannot remove that object." BC echoes her own ActionUse back to her, so the first part is
compulsionsFor letting her own member number through for an item act watched as "*", as v1.18.0 did
for clothing. A named watch still needs that person.

The second (DW chose "an option the hypnotist adds"): the recording option `noRemove`, spoken as "you
cannot take it off" and its kin, on an item compulsion only; it switches on whileWorn too. Every way
she takes an item off herself in R134 starts at `DialogStruggleStart` on her own client (Dialog.js:
Remove, Struggle, Dismount, Escape, UnlockAndRemove, and DialogItemClick's Swap), so `installNoRemove`
refuses those for the slot a holding no-remove compulsion watches (`heldOnBy`). Someone else's removal
runs on their client and is not ours to stop, and it ends the hold as any removal does. Only while it
holds: the release words and the safeword let it go (rule 2). Not offered for clothing: the wardrobe is
BC's whole-outfit screen, with nothing comparable to hook per garment.

### Changed 2026-11-26 (v1.19.3) — the nickname, everywhere

DW, seeing an induction line name a player by account name while the room's line used her nickname:
"Can we make sure to use the nickname all the time". BC shows the nickname
everywhere and the account name only in brackets on entering. Every name ECHS shows or sends now goes
through `displayNameOf` (moved from trust.ts into the leaf `src/names.ts`): /echs command targets and
replies and the room lists in them, the remote's title and pages, the hypnotist name sent with an
induction, trust and planted-list names, and recording/carry names. Matching still takes either name
(resolveTarget, the watch names, trust's stored account name). Names already saved keep what was saved.

### Added 2026-11-26 (v1.19.2) — the touch picker, and the carry lines in the popup

DW: "Phantom touch is not in the pop up window ... make sure ALL commands are in the popup. If you are
not sure if it makes sense ask me before you add it." The audit: the Commands tab is built from the
command list itself, so it can't miss one; every voice.ts suggestion is generated into the Suggestions
tab; the hand-listed extras covered the rest except carrying ("that will stay with you", "all of this",
"nothing stays") and touches aimed at a third person. Phantom touch was there, last under Touch (DW: "It
was my issue", leave it).

- **Carry lines** (DW: in Trance): three lines before *wake up*. Greyed when finishing a trigger, which
  already lasts. "that will stay when you wake" was not offered: it would start a wake compulsion.
- **Touch picker** (DW: "Can the hypnotist pick who from a list? I would like to get ALL the touch areas
  in the list.. Same with Phantom ... Or even just make Phantom a modifier for touch"). `popup-touch.ts`:
  who, real or phantom, 17 touches, 22 areas; the click types a line in the grammars already read
  ("kiss your neck", "kiss my neck", "kiss Rei's neck", "you feel lips on your neck"). DW's worry, a busy
  room: five people as buttons, the rest in a list. Areas are faded from BC's own table (R134
  ActivityFemale3DCG Target / TargetSelf, read with AssetGetActivity), not hidden, since her client
  decides. "suck … cock" on someone else is SuckPenetrateItem, as the grammar reads it (v1.16.31).
  `test/popup-touch.mjs` runs all 1,633 lines it can type through the matchers. Doing so found a phantom
  bug, fixed here: "a hand on your lips" read as a kiss (the part word was taken as the toucher).

### Changed 2026-11-26 (v1.19.1) — `/echs induce` says one line

DW: "During induction I do not like the new [Sent. Watch for what happens next.] Can we maybe combine
that with the message above and only give a second message if something goes wrong. To me the message
showing that the subject is listening is enough." The second line (v1.16.34, review F10) is gone; the
known-off warning joins the first line. What comes back from her client is unchanged, and still says
when something goes wrong.

### Added 2026-11-26 (v1.19.0) — phantom touch: a touch only she feels, with a real touch's effect

Idea 2 of DW's feature list. DW: "I do want the touch to have the same effect as real touch would have
and I am the only one that sees the touch." So `src/phantom.ts` calls BC's own `ActivityEffect(Player,
Player, activity, zone)`, the call R134's "Arousal processing" handler (ChatRoom.js, priority 210) makes
for a real touch aimed at her. Her activity and zone factors, fetishes, the zone's orgasm setting and the
activity's expression all apply as they would, and nothing is sent as an activity: a fake one would read
to the room as someone really touching her. Her face can change, which BC syncs, as with any touch. She
is the source, so BC's lover bonus (another random 0 to 7) never applies: nobody is there.

- **The room, DW's choice:** "A reaction, no place", plus "But room would not see it every time. Just
  some times." A reaction line one time in three, never two within 3 minutes, never naming the spot,
  through `tellRoom` (so *Others see your reactions* still decides).
- **Grammar:** "you feel <something> <place or action>". A noun picks the activity (hand / fingers /
  touch = Caress, lips = Kiss, tongue = Lick, teeth = Bite, a smack = Spank …), a hand's verb can change
  it (squeeze = Grope, pinch, spank, slap, tickle, scratch, tug + hair = Pull), and "your <part>" uses
  selftouch.ts's BODY_PARTS plus a few words nothing blocks (back, skin, cheek). It must reach her (a
  place, "all over you", or a stroke), so "you can feel my hands" stays the numbness release and "you feel
  someone watching you" is nothing. Checked before the self-touch commands in `landCommand`, or "you feel
  fingers stroke your thighs" would have her stroke her own thighs.
- **Decided, not asked:** under Arousal & Orgasm at its depth, as the doc said. Numbness wins (it is "you
  feel nothing when I touch you", and an imagined touch is still a touch). In a trigger it is a one-off
  action, `feel:<Activity>:<part>`, and a hold-while-worn compulsion repeats it with the arousal, as the
  doc's "repeating while held" asked.

### Added 2026-11-26 (v1.18.0) — clothing compulsions: garments off or on, by anyone, her included

Idea 1 of DW's feature list ("ECHS feature ideas.md", 2026-11-24). Its open question was which message
BC sends when someone else takes one garment off her. Checked against the live R134 client: **none can.**
The item menu focuses only "Item" groups (Dialog.js, `Group.IsItem()`), so other people change her
clothes only in the wardrobe (ChatRoom.js `ChatRoomAppearanceLoadCharacter`), which sends her whole
appearance and then one `ChangeClothes` line naming nobody's garment. But that appearance reaches her as
`ChatRoomSyncSingle` carrying `SourceMemberNumber`, so `outfit-watch.ts` reads her outfit just before and
after BC applies it, and compares. That turned "only the broad *undresses you* can work" into per-garment
acts. Another add-on's single-item change (`ChatRoomSyncItem`, with `Source`) is read the same way.

DW's answers:

- **Both directions** ("Both"): off and on, any garment or one of six (top, skirt, bra, panties, shoes,
  socks; undress.ts's slots, Echo's copies counting as theirs).
- **"It would not matter who took the clothing on or off me. Unless the hypnotist says something
  specific."** So, unlike every other act, her own changes count for *anyone*: `compulsionsFor` lets her
  own member number through for a clothing act watched as "*" only, and a named watch still needs that
  person. Her own changes are read from `ChatRoomCharacterUpdate(Player)` on the way out. Wordings with
  no doer ("whenever you take your top off", "whenever your bra comes off") read as anyone. She is never
  recorded as the one who set it off, so she can't release it with the release words.
- ECHS's own strip goes out the same way and counts as her taking it off. Decided rather than asked:
  it is her client doing it. In practice the commanded strip happens only while she is under, when
  compulsions don't fire; a wake compulsion that strips her does count. There is no loop: nothing in
  ECHS dresses her, and each compulsion rests 15 s after it fires.
- **The hold.** The v1.16.20 hold-while-worn option covers clothing: "while you wear it" for a garment
  put on; for one taken off, "holds while you are undressed / until you are dressed again / while it
  stays off" holds while that slot stays empty (`wornHold.off`).

Taken as they are, never as a change: a room join (`ChatRoomSync`), anything outside a room, and the
outfit before login. A swap in one slot is a garment put on, not one taken off. Single-garment acts
sit before *undresses you* / *dresses you* in the table so "dress you in a skirt" is the skirt, and
all of them before *pulls your hair*, which would otherwise claim "pulls your top off".

### Added 2026-11-26 (v1.17.0) — per-person access: Blocked / Normal / Toy, and the Access tab

"ECHS's own blacklist" from DW's feature ideas (2026-11-24), which DW widened on 2026-11-26: "can we
give the ability to choose what level each individual gets. Example I could give jax toy access to me
and turn off by default". DW's answers, one question at a time:

- **Levels: Blocked / Normal / Toy.** Normal is everyone not listed. A fourth, auto-Agree, was offered
  and not chosen.
- **The popup's Keys tab is renamed Access.** "Who can hypnotize you" sits between *Your keyholders*
  and *Ask for keys*: everyone here running ECHS (icon hidden or not, since a hidden icon can still
  hypnotize), then a folded **Not here** for listed people who left. Buttons type `/echs access`, like
  Give keys. DW also wanted it on the **Stats** tab ("Both Access and stats tab"): three canvas buttons
  per row, Blocked on two clicks as [x] is.
- **Blocked mid-trance: "Ends, and their triggers go too."** `endSessionWith()` ends it as an ordinary
  end (reason "you blocked them"), `forgetEverythingFrom()` lets go of whatever of theirs is holding her
  (`undoTrigger`) and forgets every trigger with their `installedBy` (compulsions and reactions are
  triggers too), and their carried suggestions are released.
- **Keys stay separate, but she is asked** (DW, after a side note pointed out a blocked full keyholder
  could still change her settings): blocking someone who holds her keys opens the ask.ts popup, "Take
  their keys back too?"; no answer keeps them. The keys lock and the settings-lock holder's keys are
  respected, checked again on Accept. Owner keys are offered only when the owner is in the room
  (`keyModeFor` needs them there to know they're the owner).

Decided earlier (2026-11-24) and kept: Blocked wins over every setting, toy mode and Extreme
included; the blocked person is refused with "They aren't open to hypnosis." (the hypnosis-off words),
so the list stays private; she is told they tried. Keyholders see the list (names and levels only, in
the settings snapshot, capped at 40) and never edit it. Frozen under the Extreme lock, the keyholder
lock and the session lock (`accessLockRefusal`).

**Where the gates are.** One stored list (`settings.access`, storage.ts, max 40) read through the leaf
`accessLevelOf()`, so session.ts and voice.ts import nothing new: `session-attempt` (refused before the
roster check), `toyModeFor` (Toy first, Blocked never), `handleSpokenLine` (first line: commands,
planting, trigger words, release words, "when Rei speaks"), `noteActivity` and `noteArrival` (activity,
item and arrival compulsions). Everything that changes a level goes through access.ts
`changeAccess()`, which the command, both tabs and the tests share. Keys, trust and the old remote
buttons are untouched.

**Stats layout.** The buttons left the detail column ~150px, which cut "12.0 interactions · last Nov
23". The name column gave 40px (max 400), value and detail moved left (value +420, detail +500), the
buttons are 72px, and the Experience line keeps its full width. The "value" heading is fitted to its
column. menu-layout.mjs checks the three buttons sit between the detail and the [x] and the detail is
not cut. test/access.mjs (34 checks) covers the list, every gate, mid-trance blocking (holding and not),
Toy, the locks, the keys popup both ways, the command and the snapshot; with the gates disabled it fails
4 checks. Live test: script_test.md Z8.

### Added 2026-11-26 (v1.16.44) — each player's version on the People tab, for DW's accounts only

DW wanted to see at a glance which build people run, from the popup, "just for me and Missys Helper,
not everyone". Each People row now ends with the player's version (`v1.16.43`) in 10px grey, after
the status tag. Shown only when our own member number is in `VERSION_VIEWERS` (popup.ts): Missy
(208543) and WinnersDice (252905, nicknamed Missys Helper). The version is not new information: every
ECHS client in a room already receives it in `presenceFields()` (badge.ts) and keeps it in `peerFor`;
the list only decides who is shown it, so it is not a permission and nobody else's build changes
behaviour. A player who hides their icon is still left off the list, version and all. Its class is
`echs-pop-peer-ver` because `echs-pop-ver` is the popup header's own version label. test/popup.mjs:
hidden for member 1, shown for a listed number, gone again after.

### Changed 2026-11-26 (v1.16.43) — Give keys / Request keys: three level buttons, not a cycling one

UI lab review F6 polish, the last open item of the review. The v1.16.0 button (job6.md §2, DW)
cycled minimal → moderate → full on repeat clicks; the tester clicked twice to give minimal and got
moderate typed. DW chose three buttons over the review's dropdown + one button: popup.ts
levelChips(row, title, held, tip, onPick) draws "Give keys:" / "Request keys:" and a chip per
KEY_LEVELS entry, the held level marked echs-pop-chip-on. cycleLevel / clickCycle / keyCycle and
keyholder.mjs's cycle checks are gone; popup.mjs checks the three buttons per row, that a repeat
click types the same level, and each row types its own person. Mutation (a level button
mislabelled) caught. Still typed, never sent on click.

### Changed 2026-11-26 (v1.16.42) — F11 6–8 (DW's answers): "Time to go under (after you answer)", Triggers tab order, under-trance button names

UI lab review F11 items 6–9, asked one at a time.

6. DW: both. The box's countdown reads "58s to answer. No answer counts as Ignore." and the chat
   line "(60 seconds to answer.)". The setting (Inductions dropdown and the keyholder remote
   label) is "Time to go under (after you answer)". I suggested "after you agree"; session.ts
   showPrompt / beginInductionWindow show the window opens after ANY answer, or after the
   60-second prompt times out as Ignore, and toy mode runs it too, so "answer" it is (told DW).
   Caption: "Starts once you answer: how long they have before it lands or misses." help.ts and
   the wiki (How Inductions Work, Settings Reference, Consent and Safety) follow.
7. DW: own first, fold, hide empty. renderTriggers draws "Triggers in you" first when any are
   planted (drawMine closure, the old section 3), and not at all when none (the fade-speed chips go
   with it; the setting is still on the Triggers settings tab and /echs triggerdecay). With nobody
   under you, the greyed PLANT_GROUPS sit inside one triggerGroup "plant-preview", closed by default.
8. DW: clearer names, no extra line. Under: Fight it / Let it / Drift (tips unchanged), typing
   /echs fight / agree / ignore. The induction box and the before-the-roll Me tab keep
   Agree / Ignore / Fight, where those words are the question being asked.
9. DW: leave as is (the safeword releases control, not the pose).

Tests: prompt-box.mjs checks the countdown text; menu-layout.mjs the new label; popup.mjs the
fold, no empty group, own-first order, the new names and the commands they type. Mutations: empty
group drawn, fold open, "Let it" typing ignore — all caught.

### Changed 2026-11-26 (v1.16.41) — F11 polish 1–5: induction box text, popup size, Commands order, remote planted hint, Stats headings

UI lab review F11, the five items DW approved without questions ("Do 1 - 5 and then we will come
back to the rest"). Items 6–9 (induction time vs the 60s box, the popup Triggers tab order, the Me
tab hints while under, the pose after the safeword) wait for DW's answers.

1. prompt.ts: DrawTextFit shrank the instinct line (skillDescriptor, ~75 characters) to one line,
   about a third the size of the rest. Now drawCentred draws every line at a fixed size (title 36,
   the rest 30; a line too long is squeezed by fillText's maxWidth, not shrunk), and
   descriptorLines wraps the instinct line (wrapToWidth) onto up to two lines. The panel is taller
   (top 200, height 350; the buttons did not move, still clear of BC's orgasm buttons at 532). The
   Stay-under box uses the same helper. New suite prompt-box.mjs records fillText: one size under
   the title, none shrunk, the line whole on two lines at most, lines 30px apart, the countdown
   last and clear of the buttons.
2. menu.ts Stats: no "value" / "detail" over "Nobody yet". menu-layout.mjs now records BC's
   DrawText (drawLeftText) as well, at 36px.
3. remote.ts: PLANTED_HINT under the list when there is anything on it.
4. popup.ts: WINDOW_WIDTH 340 → 440, WINDOW_HEIGHT 540 (CSS min(540px, 80vh); place() clamps to the
   view). Measured in the lab with the popup's own CSS: all six tabs on one row at 440.
5. popupGroups(testing, asSubject = subjectSide() !== null): /echs induce moved to the front of
   Session unless one is on you (asked, inducing, under), when agree/ignore/fight stay first.

Mutations: instinct line one line, a different size, Stats headings back, hint gone, induce order —
all caught.

### Changed 2026-11-25 (v1.16.40) — one verb for removing triggers ("forget"); Depth uses the Permissions names

UI lab review F9 items 1 and 2. DW chose **"forget" everywhere** over "remove" (my suggestion): the
spoken phrase and `/echs forgettrigger` already said forget, so the buttons follow them rather than
the other way round. Planted tab: Purge → Forget, Clear All → Forget All, with their tips, notes and
results ("Trigger 2 forgotten.", "Forgot 2 triggers."). Popup: the hypnotist's chips and lines
(remove → forget, "forget everything I planted"), the subject's typed status, the keyholder's
"made you forget a trigger … planted in you" and its refusals. Hypnotist notices: "They forgot
"X". It will not fire again." / "They forgot all N triggers…". Also /echs forgettrigger's help and
confirm text, the Extreme warning, the fade captions ("until they are forgotten"), help.ts. Internal
ids (remove-trigger, removeRefusal, purgePlanted) stay, so an older ECHS on either side still works.

DW chose **the Permissions names** for the Depth tab (DEPTH_GATES labels): Movement Restriction,
Speech Restriction, Clothing Restriction, Self-Touch Control, Made to Act, Follow / Leash, Made to
Speak, Hearing, Arousal & Orgasm, Clothing Illusion — the Permissions label without its bracketed
detail. The Awareness and Triggers rows on Depth keep their descriptive names (not part of the
question). chemical-reach.mjs checks every Depth row that is also a Permissions row against the
Permissions label. Trance Defaults' "Cannot Move" is a different setting and is unchanged.

Tests: popup.mjs tells the subject's own forget chips from the hypnotist's (they share the word
now). Mutations: Forget All label, popup chip, hypnotist notice, a Depth name — all caught.

### Changed 2026-11-25 (v1.16.39) — hypnotist notices in words; no "[[trigger]"; lower-case refusal reason

UI lab review F9, items 3 and 4; DW: "OK. Do 3 and 4". (Items 1, the removal verb, and 2, names
that change between tabs, wait on DW's words.)

The double bracket: every trigger notice is sent as "[trigger] …" (and two session ones as
"[trance] …"), and the hypnotist's trigger-status handler showed it through tellPlayer, which
brackets the line again. The handler now drops a leading [trigger]/[trance] tag before showing it,
so an older subject's notices read the same; senders keep the tag (it is what the suites, and an
older hypnotist build, expect).

Wording (triggers.ts): "Recording <label>: say what it does, then \"remember trigger\" (or …)";
"Recorded for <label>: <describeAction>." (was the id and a running count); "Saved <label>: <each
action described, ; joined>. Planted at <tier> depth." (was "SAVED … — n action(s): ids. Planted at
80 (Blank)"); "Renamed …; its n suggestions are kept" and "Reinforced n triggers" (no "(s)").
describeAction is voice.ts's, the words the hypnotist's own planted list already uses; triggers.ts
imports it (a module cycle, used only at call time).

session.ts reportRefusalToHypnotist lower-cases the reason's first letter after the colon (the
subject's client writes it as a sentence: "They aren't open to hypnosis."), older senders too.

Wiki: Sample-Session's notices; the Troubleshooting limitation "confirmations name actions by their
internal IDs" removed (no longer true). Tests: wording in activity, miss, planted (the shown line
starts "[Saved "), reactions, notice-once, popup-finish. Mutations: tag kept 1, capital kept 2.

### Changed 2026-11-25 (v1.16.38) — Stats list scrolls; Export / Import / Reset on General

DW: "can we do scroll bars on the stats tab. And maybe we can move the Export, import and reset to
General." (And confirmed: v1.16.37 already dropped the Advanced button; Stats is always shown.)

Stats: the trust list uses the shared rowScroll (layoutStats: 352 to 800, a 40px step; layoutRows
now resets the step to a row's 78). Rows and their [x] are drawn under its clip at statRowY(slot),
scroll applied; a click on an [x] needs the pointer in the list, and the bar is clicked first. The
wheel works because drawStats stamps rowsDrawnAt. A new search scrolls back to the top. The count
("Trust · 15 people") replaces "page 1 / 3". [x] sits left of the scroll bar now. Trust fading is a
dropdown row under the list (label 28px, as elsewhere). statPage, STAT_ROWS_PER_PAGE and
PAGE_BUTTON_TOP gone (Planted keeps its own Prev/Next).

General: "Your data:" heading, the three buttons and a caption, after the two dropdowns, inside its
scrollExtra. scrollExtra.click runs before the lock check in the click handler, so Export and Reset
stay live under the Extreme lock (Reset is its documented way out); Import still refuses itself.

Tests (menu-layout.mjs): 15 people, so the list scrolls: no page buttons, bar shown, the count, [x]
clear of the detail and the bar, wheel to the last person, the down arrow, a search from the
bottom starts at the top, an [x] on a scrolled row deletes the person beside it. Reset on General
works under the Extreme lock; Import refuses. Mutations: bar click 1, wheel 3, rows ignoring scroll
4, General data click 2, search not resetting 1.

### Changed 2026-11-25 (v1.16.37) — settings screen: General tab, dropdowns, scrolling Triggers and Depth, wrapped blurbs, row tips, help paragraphs

UI lab review F8 (cramped settings screen); DW: "That sounds good.. Ask questions to work out the
details". DW's answers: the new tab is **General**, **last** in the column; keyholders reach it with
**full keys only** (switching off included); cycle buttons become **dropdowns** (over arrows or
right-click).

Tabs (menu.ts TABS): General = releaseOnDisconnect, commandPulse, showEchsIcon + two dropdowns (icon
spot, popup on/off; `lockable: false`, as the cycles were drawn unlocked). Trance Defaults keeps the
trance rows and its dropdowns, with pulse colour now a dropdown (the hex box under it for Custom).
The Advanced button, showAdvanced, STATS_TAB/BASE_TABS are gone: nine tabs fill the column exactly
(tabTop(8) + 72 = 902, the panel floor). REMOTE_TABS gains General.

Dropdowns: DropdownRow (the v1.9.1 trance one) is the one control for every choice, laid out label
(600, all at 28px via drawLeftTextFit's new startSize) | select (520) | caption under it.
dropdownsExtra/drawDropdowns/removeDropdowns. Inductions: seven (attempts, induction time, default
stance, away stance, toy mode, toy scope, sink deeper). Triggers: scope, lifespan, [minutes box],
fading, drop, my list. Depth: chemical scope, skill (SKILL_HONOUR_OFFERED), and per earned-only row
an Earned only / Arousal ok dropdown (carry-forward's disabled). Captions are the old cycle
captions. Every select exists only while its row is wholly in the scroll area (DOM ignores the
canvas clip), as the toy-scope one did.

Triggers: no rowsBottom and no fixed DOM band; the rows and then the controls scroll together.
Depth: rows: [] + scrollExtra (rows of 56, then Reset + "You are …", then the two dropdowns);
paging and its constants gone; clicks inside the scroll area, the lock still consumes them.
DOM bookkeeping: tabDomIds(tab) lists each tab's controls; ownedControlIds/removeScopeControl/
syncTabControls read it (they were three hand-kept lists).

Keyholders: FULL_ONLY_TABS = ["General"]; keyLevelAllows(level, turnsOff, moderateOk, fullOnly)
returns false below full when fullOnly, before the off check. The subject's refusal names the
General tab; the popup fades the boxes and says so. KEY_LEVEL_WORDS and the popup hints mention it.

Blurbs: drawLeftTextWrap at 26px down to 20, two lines in 62px above the rows at 270 (they were
drawLeftTextFit, which cut "…(that is Clothing Illu…"). Row tips: Row.tip (Permissions list and the
two fixed rows, from the Settings Reference), drawn through panel.ts's new tipArea, the same wrapping
tip tipButton queues; only while the pointer is in the list.

Help: the text was hand-wrapped at ~70 characters for the old two-column layout. panel.ts
joinHelpParagraphs rejoins a line onto the one before when it continues the sentence (same style;
the previous does not end a sentence or this one starts lower case; not a numbered/bulleted item,
nor a line starting with a quote or a slash). HelpLine.keep (help.ts item()) for generated lines:
suggestions, the depth ladder, commands. paginateHelp moves a paragraph whole to the next page when
it fits one, and a heading with all of the next paragraph when that fits (else its first two
lines). Text fixes: the popup is on General; trust fading is on the Stats tab; two lines that broke
before a /echs command made one. help.ts helpLinesFor(name) for the suite.

Checked in the UI lab (uilab/sessions/f8.mjs): it showed captions shrinking to different sizes
(now all 22px; four shortened to fit one line), long options cut in 520px dropdowns (630 now, labels
520; "Who else can fire triggers planted in you:" became "Who else can fire your triggers:" on the
screen, the keyholder popup keeps the long name), and the Depth tab's Earned only boxes cut (230).

Tests: menu-layout.mjs rewritten for dropdowns (a shared dropdownTab check: reachable, labels one
size and in order, present exactly while in view, each changes only its own setting, locked = greyed
and inert except General's two), Triggers scrolling, Depth scrolling (every row reachable, boxes
only in view, +5 where drawn, locked inert, chem dropdowns), General, nine tabs, blurbs, row tips.
help-layout.mjs: joining, full width, no paragraph split across a page, no orphan heading on the
real help. keyholder.mjs: General refused to minimal/moderate (off too), works for full.
trance-spiral.mjs's source check follows tabDomIds. Mutations: General locked 1, full-only 2,
blurb 2, tips 3, keep 1, orphan 1, depth box 1.

### Fixed 2026-11-25 (v1.16.36) — Keys tab: requests answered, faded clicks explained, new keys announced

UI lab review F6; DW: "F6 it is". Seen in the lab: a faded box (moderate keys, Hearing) still sent a
set request, and the status line said "Asked Sena's ECHS to switch on…" for good; an allowed click
worked but the status also stayed "Asked…"; Mira got no word when Sena gave her keys; and "Settings
you hold keys to" sat under her own keyholders and Ask for keys.

The subject's ECHS already answers every set/choose with a settingsResult; the popup only showed it
as a hint inside the list. Now popup.ts keeps `awaiting` (whom, when) for the held-keys requests that
use keyholder.ts ask() (set, choose, remove trigger, unlock, unlock keys, end Extreme), and
renderHeld replaces the status with the result once one at or after that time arrives ("Refused: "
in front of a refusal), or with "<name>'s ECHS did not answer" once askState goes silent. keysKey
now also carries the result's text and `awaiting`, since two answers in one millisecond did not
redraw. The requests their player must accept (lock, Extreme, take someone's keys back) keep their
"They have 30 seconds to accept" line.

A faded box no longer sends: it says "Your <level> keys can't switch "<label>" on: that needs
<moderate|full> keys." Faded choice and step chips were already disabled.

announceKeysTo adds `keysChanged: true`; receiveKeyholderFields tells the player in chat when that
flag comes with a different level than they held: gave you / changed your keys to / took their keys
back. The same fields on an ordinary answer (joining a room, reading settings) say nothing. An older
subject sends no flag, so nothing is said.

Section 3 of renderKeys became renderHeld, drawn first when heldKeys() is non-empty.

Not done: the review's polish note on "Give keys (level)" cycling. DW chose the cycling button
(job6.md §2), so a level picker is DW's call.

popup.mjs: answer replaces Asked; refusal; faded sends nothing and says why; held group first; the
chat lines (given, repeat silent, unflagged silent, changed, taken back). Mutations: no status
update fails 2; faded sends fails 2; held group not drawn fails 3; no chat line fails 1; chat on
every flagged answer fails 1.

### Fixed 2026-11-25 (v1.16.35) — People tab says who is open to hypnosis

UI lab review F10; DW: "Lets do F10". A brand-new subject (hypnosis off) was listed exactly like an
available one; inducing printed "Attempting an induction" and "They decide how to respond, on their
own client" before her client's instant refusal.

badge.ts: hypnoEnabled moves into presenceFields, so it rides on the room-wide state-query as well
as every state-response (remote.ts and keyholder.ts dropped their own copy of the field, which the
spread now supplies). notePeer keeps it as Peer.open; a message without the flag keeps what was
known, so an older build or an older answer doesn't erase it. announceIfChanged re-asks the room
when showIcon OR hypnoEnabled changed since the last ask. It runs on our own character's frame (as
the icon check did) and now also on leaving the settings screen, since BC skips the icon hook while
icons are hidden.

popup.ts: personTag = personStatus (a session says more) else "open to hypnosis" / "not open to
hypnosis" / nothing for an older build. The People rows use it.

commands.ts startInduction: the second line is "Sent. Watch for what happens next." or, when the
peer is known closed, "<name> has hypnosis switched off in ECHS, so this will most likely be
refused." Still sent in that case: what we know can be a minute old, and her client's refusal
follows. Not done: the review's optional private notice to the subject; a brand-new player gets the
setup wizard anyway, and a Hypnotist-only player chose it.

Tests: popup.mjs (7 checks: tags, keeping the flag, session wins, rows, presenceFields), miss.mjs
(4: still sent, the off line, never "They decide", the on line). Mutations: notePeer ignoring the
flag fails 4; rows on personStatus fails 1; the off branch removed fails 1.

### Fixed 2026-11-25 (v1.16.34) — the wizard summary shows the whole "Allowed" list

UI lab review F7; DW: "Lets do F7 1st." The summary drew each describeConfig line with
drawLeftTextFit, which shrinks to 22px and then clips with "…". "Allowed: a; b; c; d; e; f." was
far wider than the column, so the one list of what is being consented to was the smallest text on
the screen and lost its end, while the shorter lines below stayed at 36px.

describeConfig now returns "Allowed:" and one "• Group" line per allowed group (capitalised).
drawSummary lays every line out at one size with wrapToWidth (now exported from panel.ts):
bullets indented, wrapped bullet text aligned under the text, a small gap before each non-bullet
line. It starts at 28px and steps down by 2 (floor 20) until the last row is above the nav bar.
The fullest answers (6 groups, toy mode) fit at 28px in both the Arial-like and the monospace model.

Polish from the same finding: Apply and the one-click templates now tell the player in chat that
the setup was applied ("The Balanced setup was applied. You can change any of it on the tabs.").
Extreme already said so through confirmExtreme.

wizard.mjs: a new block draws the summary for the fullest answers under both font models and
checks no "…", "Allowed:" on its own line, 6 bullets, key words present, one size >= 20px, all
above the Apply button, no overlapping rows; and the chat line for Apply and for a template.
Mutations: the old one-line "Allowed:" fails 6 checks; removing the Apply note fails 2.

### Fixed 2026-11-25 (v1.16.33) — one answer for a failed compulsion; "remember trigger" always answered

UI lab review F2's two side notes; DW: "Do A and B". Reproduced in the harness first: "Missy,
whenever anyone gags you, your arms go limp" sent six notices (RECORDING, Noted, Nothing after that
could be kept, then all three again), and "remember trigger" / the options with nothing recording
sent none.

Why twice: handleConditionStart returns false on failure so the line falls through, and
handleSpokenLine's second handleTriggerControl pass (on the addressee-scoped line) parsed the same
clause and ran it all again. Now a per-line flag (conditionFailedOnLine, reset when a line is not a
re-read) stops the second try. Why contradictory: beginRecording and applyRecordingOption tell the
hypnotist as they go, before the rest of the line is known to be keepable. triggers.ts now holds
hypnotist notices (holdHypnotistNotes / takeHeldNotes / sendHeldNotes; tellHypnotist and
tellHypnotistWithList push while held). handleConditionStart holds around the attempt and sends
everything on success, in order. On failure it drops RECORDING/Noted and sends what the re-read of
the rest said (a refusal saying why) and one closing line. With no refusal that line names the
words: '"your arms go limp" isn't something ECHS knows how to do ... Suggestions ... /echs match'.
A refused rest now ends the line (returns true): read again live it was only refused a second
time. An unknown rest still falls through, as before, for patter and deepeners. The wake form keeps
"They are still under".

B: commit with nothing recording answers "Nothing is being recorded right now" and returns true
("remember trigger" can't be anything else). An option still falls through as before, and is
answered only when the line names a trigger ("this/that/the trigger"), since OPT_SUBJ includes
"it" and "it will last ten minutes" may be patter. Once per line (toldNotRecordingOnLine). "forget
the trigger" with nothing open stays silent.

New test/notice-once.mjs (13). compulsion.mjs's wake check reads the new wording. Mutations: the
per-line guard removed, and the commit reply removed, each fail a check.

### Added 2026-11-25 (v1.16.32) — "whenever anyone sucks you"

Second of the two suck items on the 2026-11-23 list; DW said go after v1.16.31. New
COMPULSION_ACTS entry key "sucked" (label "sucks you"), activities ["Suck"], default object, so
"sucks your nipples / fingers / toes" reads as it. R134 Female3DCG: Suck targets only ItemBoots,
ItemHands, ItemNipples, so the part is not checked, as for every act. Placed after "suck"
(SuckPenetrateItem): parseCondition takes the first entry that matches, so "sucks your strap-on /
cock" stays that act. item-compulsion.mjs: the old "sucks your nipples is nothing" check now reads
"sucked", plus activity and wording checks; mutation (the two entries swapped) fails 2 checks.
The popup's act list and the help screen read the table, so both pick it up.

### Fixed 2026-11-25 (v1.16.31) — "suck my cock" lands

From the 2026-11-23 to-do list, confirmed against the live R134 Female3DCG.js: plain Suck targets only
ItemBoots/ItemHands/ItemNipples, so v1.16.18's "suck my cock stays plain Suck" never landed on
anyone. The penis (Pussy > Penis) has AllowActivity PenetrateItem, so SuckPenetrateItem (with its
TargetNeeds-PenetrateItem) reaches it exactly as it reaches a strap-on. DW: "make it like the other
one". cock/dick/penis added to SuckPenetrateItem's part list in ACTIVITY_VERBS (their ACT_PARTS
zones include ItemVulva); the compulsion object for "suck" takes them too; the popup gets "suck my
cock" as a wording. The label stays "sucks your strap-on": the popup plants the label's words, and
"or cock" made the planted line unreadable (popup suite caught it). "suck my nipples" stays plain
Suck. fuck-command.mjs: the old "still plain Suck" check flipped, plus a landing check; mutation
(the three words removed) fails 2 checks.

### Changed 2026-11-24 (v1.16.30) — trigger rows say what each one is; "My triggers list" can say less

UI lab review F5: every row in /echs triggers, Settings > Planted and the popup's "Triggers in you"
read "by Mira (#1001), full strength (80, Blank)", so three triggers were three identical lines and
telling them apart took a command each. DW chose the shape, name first ("the name of the tist
should still be 1st"): voice.ts triggerRow(), one function for all three lists, "<who>: <what sets
it off> → <what it does> · tags". The word follows Show trigger words as before ("a word
(hidden)"); a compulsion shows describeCondition; two actions then "+N more"; tags used up / works
once / holds while worn / fading / holding you now. The planter's number only when two planters in
the list share a name. Strength is in the detail view now. This replaces the v0.88.0 decision that
the plain list say nothing about what a trigger does.

Then DW: "let people choose if they want to make it harder to see what triggers you have. Even to
the point of turning off that tab". storage triggerView, TRIGGER_VIEWS full / who / hidden, default
full. who is the v0.88.0 row with the name first; hidden makes the list and the detail a count line
(triggersHiddenLine), drops the Planted tab (visibleTabs), and leaves the popup a count and "forget
all". Asked whether she can always switch it back under the Extreme lock, DW chose "Locked by
Extreme": it is read-only there like every setting, and her keyholders (a full-keys Triggers
choice in remoteChoices) can change it. The old rule "nothing may happen to the subject that they
cannot see" now holds by her own choice: she can still learn that triggers exist and how many,
the safeword clears everything, and forgettrigger all still works.

New test/trigger-rows.mjs (26): the rows, the twin-name number, no strength in rows, every mode,
the Planted tab, the keyholder choice. triggers.mjs, trigger-inspector.mjs and popup.mjs updated
from the old rows. Seen in the uilab: the three lists, and the control cycling to Hidden with the
Planted tab gone.

### Fixed 2026-11-24 (v1.16.29) — the remote's endless "Checking…", and the popup over the induction box

UI lab review F3 and F4, done together at DW's request ("They seem related"): both are the induction
as the two players see it.

F3. The remote waits for two answers: state-response (do they run ECHS) and session-update. With
the first and not the second, presenceOf said "present" and the panel drew "Checking…" with a dead
button for good; there was no timeout for that half. The reviewer blamed a holding trigger, but on
v1.16.28 the subject answered session-query in every state tried (harness: idle, under, a word
trigger fired; lab: a gag hold active), and the reviewer's trace script itself loses the reply (it
replaces window.ChatRoomMessage on the subject). So the cause on v1.16.24 is not pinned down, and the
fix makes the hang impossible from either end: remote.ts sessionLate() turns "Checking…" into "No
answer about their session yet." with Check again after PROBE_TIMEOUT_MS; the session-query handler
falls back to the bare phase (refuse) if pushUpdate throws; messaging.ts catches a throwing handler
and warns, where before it took the hook down with it and the sender got nothing.

F4. The popup folds to header + note + Safeword and moves to top 8px while getPendingPrompt or
getPendingExtend is set (className, not classList: the test DOM has none), restoring its top after;
the box has the Me tab's buttons. The Me tab's "inducing" view showed Wake, which /echs wake refuses
outside a trance; it now shows her choice and the other two (inductionStanding, new in session.ts,
never sent), or "missed (n of m)". The wiki has long said she can change her answer at any time,
but answerPrompt refused in AttemptFailed ("Nobody is attempting"), and a retry reuses the choice
without asking; it now accepts the change there for the next try. The "Typed. Press Enter…" status
resets once the chat box empties after a click typed into it.

New test/induction-view.mjs (22): fold and restore, Me lines and buttons, no Wake, change between
attempts kept by session-continue, status reset, session-query answered, a throwing handler
contained, sessionLate. Mutation-checked: without the popup/remote half 5+ fail, without the
messaging catch 1. Seen in the uilab: the folded window sits above the box; after Agree the Me tab
reads "You chose Agree. Change it: Ignore / Fight".

### Fixed 2026-11-24 (v1.16.28) — a "when …" after a suggestion no longer starts a compulsion

The parser trap noted under v1.16.27, confirmed outside a recording too (a side agent's heads-up,
tested in the harness): "Missy, you feel nothing when I touch you", the numbing's own example
wording and a popup Arousal entry, matched COND_ACTS' "when I touch you" anywhere in the line. It
started recording a compulsion, never numbed her, and the next line ("Missy, kneel") was recorded
into it; "remember trigger" then saved a real "kneel when you touch them". None of the condition
patterns (wake, arrive, speak, acts) were anchored.

DW chose the parser fix over dropping the wording. parseCondition now refuses a match when the text
before the clause would land on its own (isRecordableAction or isDeepeningLine), not merely when
anything precedes it, so the name and fillers ("Missy, listen, when anyone kisses you, …") still
start one. A side effect: "Missy, kneel when I touch you" is now a plain kneel; before, it started
an empty compulsion and lost the kneel, so it was broken either way. TRIGGER_START ("when you hear
X") is not changed: no popup wording reaches it.

test/popup-finish.mjs +10: every Suggestions wording said outside a trigger must not parse as a
condition or start, nor print RECORDING; numbing and "kneel when I touch you" are not conditions;
seven real condition lines still are. The wording now plants in a trigger as well, so it is no
longer greyed. Mutation-checked: without the guard popup-finish fails 4.

### Changed 2026-11-24 (v1.16.27) — the popup finishes a compulsion instead of replacing it

From the UI lab review (F2, its second-worst finding): the Triggers tab typed the start of a
compulsion ("Sena, when anyone kisses you, ") and said to finish it, but a click on Suggestions
replaced the line, so the popup could never supply the half that needs a phrase. DW: "Gray out any
activities that dont fit and once someone clicks on it the command it added to". Now a Triggers
line or choice that ends in ", " and has a `finish` remembers the start (`finishing`) and switches
to Suggestions. While the chat box still holds exactly that start, a banner says what is being
finished; a click appends the wording; `notInTrigger` (popup-suggest.ts) greys what a recording
refuses and the click says why without touching the line. Sending, editing the line, or "start
over" ends it, and clicks type their own lines again.

What a trigger can't hold was found, not guessed: every Suggestions wording (about 215) was planted
as a compulsion's action in the harness with every permission granted. The refusals are the trance
moves (deepen: "A trigger cannot hold a deepening"; walk, still and wake are not kept), the four
commands aimed at the hypnotist ("a trigger can't aim at a person yet"), and three single wordings:
"on your feet", a bare "moan", and "you feel nothing when I touch you", which a recording reads as
the start of a "when I touch you" compulsion of its own (a parser trap worth fixing on its own). The
new `test/popup-finish.mjs` plants them all again on every run, so the list cannot drift from
voice.ts; `test/popup.mjs` +10 for the tab behaviour. Mutation-checked: emptying the aimed-at-you
list fails popup-finish 3 checks, greying a working wording fails 2, and replacing instead of
appending fails popup 2. Numbered 1.16.27: 1.16.26 is the stable hotfix.

### Fixed 2026-11-24 (v1.16.26, stable hotfix) — "undefined days" in the Extreme warning

The fix from v1.16.25 on dev, applied to main on its own (DW: fix it on stable too, as a hotfix,
not a full release). Numbered 1.16.26 because 1.16.8 to 1.16.25 are dev builds. `EXTREME_WARNING`
was built at module load, before `storage.ts` (which `extreme.ts` imports, and which imports it
back) set `EXTREME_TRIAL_DAYS`, so it said "undefined days". `extremeWarning()` builds it when shown.
UPDATE_NOTE set for 1.16.26.

### Fixed 2026-11-24 (v1.16.25) — "undefined days" in the Extreme warning

Found by a usability pass in a local mock room running the real script (a headless browser, two
clients). `EXTREME_WARNING` was a module-level array of template strings in `extreme.ts`, built when
the module ran. `extreme.ts` and `storage.ts` import each other, and the bundle evaluated
`extreme.ts` first, so `EXTREME_TRIAL_DAYS` and `EXTREME_MONTH_DAYS` were still undefined and the
text said "read-only for undefined days" and "commit to undefined days at a time". It shipped this
way on stable as well as dev; it affected the setup wizard and the keyholder's Extreme request.
Now `extremeWarning()` builds the list when it is shown. `test/keyholder-extreme.mjs` +1: the test
bundle has the same order, so the check failed on the old array (the harness printed "undefined").

### Changed 2026-11-23 (v1.16.24) — toys before the penis when nothing is named

DW, on a male subject wearing a dildo gag: "if someone put a dildo gag on someone they want it to be
used... only use Penis if requested." With no tool named, runCommandedActivity now sorts BC's
ItemActivities by `toolRank`: dildo gag 0, strap-on 1, dildo in hand 2, anything else 3, penis 9
(stable sort, so BC's order holds within a rank). A named tool still filters exactly as in v1.16.23.
`test/fuck-command.mjs` +4, mutation-checked (taking BC's first fails 2).

### Added 2026-11-23 (v1.16.23) — "fuck me" in the popup; choosing the dildo

DW: "Where are the fuck with dildo options." The v1.16.17/18 commands were only typed; the Suggestions
tab had no entry. Added x-fuck-me (alternates hard, with your dildo / strap-on / dildo gag, my ass,
my mouth) and x-suck-strapon, both checked against the matcher in test/popup.mjs.

Live R134 Female3DCG, AllowActivity "PenetrateItem": StraponPanties (ItemPelvis), StrapOnSmooth/Studs
(ItemDevices), DoubleEndDildo (ItemVulva), LargeDildo/SmallDildo/GrilledSausage (ItemHandheld),
DildoGag (ItemMouth), Penis (Pussy), and UnicornHorn/DildocornHorn/Tentacles. BC offers one
ItemActivity per such item (Activity.js ActivityGenerateItemActivitiesFromNeed; ItemHandheld only
when her hands are usable), and runCommandedActivity took the first. Now "with your dildo / strap-on /
gag / cock" sets `tool`, which filters both the ItemActivity chosen and the no-tool refusal by item
group (TOOL_GROUPS); no tool said keeps the old first-found behaviour. A tool she lacks is refused
naming it. `test/fuck-command.mjs` +6, mutation-checked (dropping the filter uses the strap-on for
"with your dildo").

### Fixed 2026-11-23 (v1.16.22) — the item compulsions in the popup

DW: "I want to test the bondage item related triggers, but I don't see them in the window." They were
the last ten chips of the "when anyone … you" list, and with nobody under, the greyed lines did not
open at all, so they could not be read. The item acts now have their own line (`item`, "whenever
anyone puts an item on you", filtered by `items`); the activity line lists activities only. A
greyed line with a list now opens it, with greyed chips that say why they type nothing.
`test/popup.mjs` +3.

### Changed 2026-11-23 (v1.16.21) — held-while-worn repeats slow down

A review of v1.16.20 pointed out that every 2 minutes for as long as the item is worn would be
spammy, an orgasm most of all (it shows in the room). DW chose, one question at a time: arousal 2, 2,
2, 5, then every 10 minutes; orgasm 5, 10, then every 20. `WORN_REPEAT_MINUTES` holds both
schedules (the last gap repeats), `wornRepeatGapMs(kind, n)` reads them, and each held trigger keeps
a clock and count per kind, so a trigger with both runs them independently. In memory only: a reload
starts the slow-down again from the top. `test/worn-hold.mjs` +4 (the gaps, and arousal landing at
minutes 2, 4, 6, 11, 21 of a held gag).

### Added 2026-11-23 (v1.16.20) — item compulsions that hold while the item is on

DW asked whether an item compulsion could keep her in its state until the item comes off, rather
than fire once. Decided (one question at a time): an option line, not the default; instant effects
repeat every 2 minutes; only arousal levels and orgasm repeat, not undressing.

- Option `whileWorn` ("this trigger holds while you wear it", "it lasts until it comes off"), applied
  only when the recording is an item compulsion; otherwise the hypnotist is told it's ignored (rule 5).
- Firing: `fireEventCompulsions` records `wornHold` (slot, the asset now worn there, and `lock` for a
  lock compulsion) on the stored trigger, so a reload keeps it. fireTrigger then marks it active
  with NO auto-release, even when it has only instant actions, and markSpent treats it as holding.
  Kind events now carry their slot (`item:@chaste|ItemPelvis`, `eventSlot()`) so a chastity hold
  knows which slot to watch. A second event while it holds (a gag swapped) updates the watch
  instead of firing on top of itself.
- `checkWornHolds`, on the existing 5-second compulsion poll: an item no longer in the slot (or a
  different one, or the lock gone) lets go via undoTrigger and tells her; a hold released some other
  way (the words, the safeword) just drops its watch; otherwise arousal-* and orgasm-force repeat
  every WORN_REPEAT_MS, gated by her permission now and the trigger's strength, as a firing is.
  Polled rather than read from BC's removal message, so struggling out, keys and other add-ons count.
- Restore: a worn hold has no deadline, so recovery restores it with no clock and the poll resumes.

`test/worn-hold.mjs` (27), mutation-checked five ways (timer kept, never lets go, everything repeats,
no spacing, swap re-fires). Live test: script_test.md Z6.

### Added 2026-11-23 (v1.16.19) — chastity, plug and vibe compulsions

DW, item 3 of the strap-on suggestion: chastity = any chaste item; plugs and vibes separate. Live R134
Female3DCG: Chaste / BreastChaste / ButtChaste sit on belts and panties (ItemPelvis), cages and
shields (ItemVulva, ItemVulvaPiercings), bras and nipple shields (ItemBreast, ItemNipplesPiercings),
and also diapers and the vacbeds (ItemDevices), which count since DW said any. ItemVulva mixes toys
with cages and cockrings: dildos carry FillVulva, eggs and vibes UseRemote, Ben Wa balls and wands
nothing; cages Chaste (one also UseRemote), cockrings CanEdge. So a vibe is an ItemVulva item, not
chaste, that fills, is remote-run, or is named as a toy. A plug is anything in ItemButt.

`voice.itemEventsOf` now returns the slot's event plus a kind (`item:@chaste`, `item:@vibe`), each
passed to noteActivity; a kind never starts with "Item", so "ties you up" is never counted twice.
Effects are read off the asset and off the item now worn in that slot (InventoryItemHasEffect, which
sees an option's effects), since BC sends the item update before the chat line. "locks you in
chastity" sits above "lock" in the list, whose "locks you" would otherwise claim it.
`test/item-compulsion.mjs` +15, mutation-checked (dropping "not chaste" lets a remote cage read as a
vibe). Live test: script_test.md Z5.

### Added 2026-11-23 (v1.16.18) — "suck my strap-on", both ways

DW, item 2 of the strap-on suggestion, both halves, wording as offered. Live R134 Female3DCG
SuckPenetrateItem: Target ItemVulva; ZoneAccessible, UseTongue, ZoneNaked, TargetNeeds-PenetrateItem
(the one sucked wears the strap-on); dictionary "SourceCharacter sucks on TargetCharacter's
ActivityAsset". Compulsion act `suck` ("sucks your strap-on", object limited to strap-on / dildo so
"sucks your nipples" is not claimed). Command: an ACTIVITY_VERBS entry for SuckPenetrateItem with
parts strap / strapon / dildo only (added to ACT_PARTS as ItemVulva), above the plain Suck, so
"suck my cock" is still BC's Suck as before. A refusal on the hypnotist's own body says what to
check. `test/fuck-command.mjs` +5, `test/item-compulsion.mjs` +2. Live test: script_test.md Z4.

### Added 2026-11-23 (v1.16.17) — "Missy, fuck me"; "rides you" taken out

DW, the commanded half of a player's strap-on suggestion: slow by default, "hard" for fast, the
pussy by default, declined without a strap-on, and asked whether bondage stops it. Live R134
Female3DCG: PenetrateSlow/Fast need ZoneAccessible, TargetMouthOpen, VulvaEmpty, AssEmpty,
Needs-PenetrateItem and ZoneNaked, no UseHands. Activity.js ActivityGenerateItemActivitiesFromNeed
drops only ItemHandheld penetrators when the actor can't use her hands, so a worn strap-on works
while bound (DW's guess was right). A new ACTIVITY_VERBS entry (PenetrateSlow, othersOnly, parts
pussy/ass/mouth and synonyms, default pussy); matchTargetedActivityCommand swaps in PenetrateFast
when hard/rough/fast is on the line; the default-part tail now takes "with your <thing>" and more
adverbs, and "<verb> me in the <part>" is read like "on the". No strap-on (R134 Character.js
CharacterItemsForActivity(Player, "PenetrateItem") empty) is refused with the reason, for any target,
since it is her own state; a refusal on the hypnotist's own body names what to check.

Found on the way: addressee scoping cut "Missy, fuck Rei" to "Missy, fuck", because "fuck" was not
in OBJECT_VERBS (the list of verbs whose following name is an object, not a new addressee). Added
fuck/penetrate/screw/pound.

"rides you" (v1.16.16) is removed: ActivityDictionary.csv still carries ReversePenetratePussy/Ass
text, but R134 Female3DCG defines no such activity, so it could never fire (rule 5). It was on dev
for under an hour; a saved one loses its act in normalise and never fires. "Ride me" as a command
is impossible for the same reason. `test/fuck-command.mjs` (17), item-compulsion updated.

### Added 2026-11-23 (v1.16.16) — "fucks you" and "rides you"

DW chose reading (a) of a player's strap-on suggestion first: a compulsion when someone does it to
her. Two activity acts on the v1.16.9 list, checked against live R134 ActivityDictionary.csv:
`fuck` = PenetrateSlow / PenetrateFast ("SourceCharacter slowly / roughly penetrates
TargetCharacter's vagina / butt / mouth with PronounPossessive ActivityAsset"); `ride` =
ReversePenetratePussy / ReversePenetrateAss ("SourceCharacter fucks TargetCharacter's ActivityAsset
with PronounPossessive pussy / ass"), where the target is the one wearing it. The activity message
carries ActivityName and TargetMemberNumber the same way as the others (R134 Activity.js), so the
v1.16.9 handler needed nothing. The body part is not checked, as for the rest ("fucks your mouth"
waits for any penetration). Not done: SuckPenetrateItem ("sucks your strap-on"; its hyphen spoils the
generic object pattern), and the commanded "fuck me with your strap-on" (reading b).
`test/item-compulsion.mjs` +4.

### Added 2026-11-23 (v1.16.15) — compulsions that wait for an item put on her

DW, from a player's suggestion (item-based actions): "add a trigger to an item placed on you. So if
someone puts a gag on you, you get aroused", open to any bondage slot. Built on the v1.16.9 act list
rather than beside it: `CompulsionAct` gains `items` (BC group names; empty = any `Item…` group),
`lock`, and `object` (the regex after the verb, so "ties your arms" and "ties your legs" are
different acts). New keys: gag, blindfold, collar, arms, legs, bind, lock. The parser, popup picker,
help hint and condition text all read the list, so they came for free.

Seen from BC's own message, verified in live R134: `ChatRoomPublishAction` sends Type "Action",
Content "ActionUse" / "ActionSwap" / "ActionAddLock", with DestinationCharacter/TargetCharacter, the
new asset as NextAsset and the focus group; the default metadata extractor gives
`TargetMemberNumber`, `Assets.NextAsset` and `GroupName`. `voice.itemEventOf` turns that into
`item:<Group>` / `lock:<Group>` and the existing activity handler passes it to `noteActivity`, so the
15-second rest, the trance rule, reactions and "never her own" all apply unchanged. "ActionUse" is also
sent for an item only used (Dialog.js, `!ClickItem.Asset.Wear`: a feather, a remote); `Wear === false`
is left out. Item events never match activity acts ("does anything to you" stays activities), and
activities never match item acts.

Not covered: clothing (the wardrobe screen sends no such message; the item menu's clothing would, but
DW asked for bondage slots first), removals, and items put on by add-ons that skip the message.
`test/item-compulsion.mjs` (24), mutation-checked (dropping the Wear check or letting item events
reach activity acts fails 2). Live test: script_test.md section Z.

### Fixed 2026-11-23 (v1.16.14) — the Stats tab's "last interacted" date

DW: after a restart, people on the Stats tab showed "0 min" whom DW had not just interacted with.
The row read the trust entry's `lastUpdated`, which is decay's clock: `applyDecay` charges on read
and sets it to now, so opening the tab with decay on reset everyone owed at least one step. That bug
dates from trust decay itself; the v1.15.1 `lastTogether` attempt (reverted in v1.15.2) also counted
ambient room chat and fell back to the polluted `lastUpdated`.

DW decided: directed only, and blank the old dates. Trust entries gain `lastInteracted`, set by
`addInteractions(..., direct = true)`: a directed conversation line (whisper or her name) and the
induction accelerator. Ambient chat, decay, `/echs trust` adjustments and `setTrustValue` never move
it. No fallback to `lastUpdated`: entries saved before it read "last —" until the next direct
interaction. The row shows a date ("last today", "last Nov 20", "last Jan 5 2025"), not "N ago".
Keyholder lock timeouts are unaffected: they use their own `seenAt`. `test/last-interacted.mjs`
(16), mutation-checked (showing `lastUpdated` and counting ambient chat fails 4).

### Added 2026-11-22 (v1.16.13) — reactions: a word that switches compulsions on

DW: a trigger "sensitive" that, once set off, adds a reaction to groping. My first design (a
compulsion "only while you are sensitive" plus a separate word) DW called clunky; agreed instead:
the reaction is part of the word, planted in the same three steps.
- A person condition said while a WORD is recording (isRecordingWord) is a reaction, not "finish
  the one you are setting up first". Its rest is recorded through the ordinary paths and the new
  actions moved out of the word into `recording.reactions` (one line per reaction; options in it
  are dropped). Wake conditions are not reactions.
- Commit: each reaction is saved as its own compulsion (`gate` = the word's key, same installer,
  key react-<installer>-<installedAt>-<i>, expiry copied); the word carries `react:<key>` per
  reaction. That id counts as HOLDING in fireTrigger (so the word has a time to be on, the trigger
  duration, 0 = until released) and applies nothing; she is told "Something in you switches on".
- compulsionsFor takes an isOn callback: a gated compulsion fires only while its word is in effect.
  Reactions fire in trance too (DW wasn't asked twice; chosen because the word itself fires in or
  out of trance); plain compulsions still wait for her to be awake. The 15 s act rest applies.
- undoTrigger of the word undoes whatever its reactions are holding. storage: forgetTrigger and a
  replacing saveTrigger take the word's reactions with them (isReactionOf).
- Shown as "…, while "sensitive" is on" to the planter and "…, while one of your triggers is on" to
  her (her list never shows the word). Popup: a reaction line with the act pick-list in Shape it.
- test/reactions.mjs (23). Mutation-checked: no gate check (5), reactions not in trance (1), no
  cascade on forget (2) or replace (1), reaction line not a reaction (6).

### Fixed 2026-11-22 (v1.16.12) — "whenever" compulsions; options on the same line

DW's compulsion "wasn't staying": it was her own 15-minute lifespan cap, working as designed and
reported at save. Probing other wordings then found two real gaps, fixed at DW's go:
- COND_LEAD lacked "whenever / every time / each time / any time", so "Missy, whenever anyone gropes
  you, come for me" was read as a live command (she came at once, nothing planted). Added to the
  lead for every person and wake condition; those leads set `every`, applied as the once:false
  option at the start of the recording. Plain "when" stays one-time, as specified.
- "…, this trigger works every time" on the condition line: parseTriggerControl checked OPTIONS
  before CONDITIONS, so the line was an option with nothing recording, and the rest ran live. Now a
  condition is checked first; option clauses are taken out of the rest (and out of the raw line,
  so a "say" doesn't swallow them) and applied, the hypnotist told each.
- act-compulsion.mjs +13. Mutation-checked: no every lead (4), options left in the rest (4), raw
  line not cleaned (3).

### Changed 2026-11-22 (v1.16.11) — instant actions arm no expiry timer

A player's suggestion via DW: "some commands like orgasm command should be marked as instant
command and would not cause the need for a expire timer ... others would still need a timer like
you cannot move." DW: yes.
- Compels (act:) and say: were already one-off. But every SUGGESTION counted as `holding` in
  fireTrigger, including the seven with no undo at all: orgasm-force, undress, undress-all,
  arousal-none/light/high/full. A trigger of only those was marked active, armed the auto-release,
  kept a spent one-time trigger until it ran out, refused /echs forgettrigger, and said "loosens on
  its own" minutes after an orgasm.
- `instant?: boolean` on Suggestion, set on those seven. Releases (release: true) are counted as
  instant too (a release in a trigger holds nothing), but not marked in the help: obviously over.
- fireTrigger counts instant suggestions with the compels. A mixed trigger still holds and times
  out for its lasting part; undoTrigger already no-ops the instant ones.
- Shown: SuggestionHelp.instant → help gate "(…, instant)"; popup items get an "instant" tag beside
  the button (like "deeper"), made-to-act extras too. Wiki: Triggers 10b, Settings, Popup.
- test/instant.mjs (15). Mutation-checked: the old every-suggestion-holds rule (4 fail), nothing
  holds (2 fail).

### Added 2026-11-22 (v1.16.10) — releasing and removing compulsions

DW: "Is there a way to be released from compulsion like there is from a normal trigger", then
"Build 1 and 2, and 3 too" (release wording, popup buttons, remove-compulsions-only).
- Before: release-by-name was word triggers only (a compulsion has none, and v1.2.2 kept the empty
  phrase from matching). A compulsion holding her let go only by its timer, the safeword, or
  "forget every trigger I gave you", which deleted the planter's word triggers too.
- "you are released from the compulsion" / "I release you from your compulsions" / "release the
  compulsion": every compulsion the SPEAKER planted that is holding her lets go. Installer only,
  unlike the word release (which the scope opens): there is no secret word, so nothing else
  narrows who can say it. Checked before the word release, which would read "the compulsion" as a
  word and answer "Nothing called…". Counted as a release line, so it never fires anything.
- Then (DW: "for a compulsion that is say triggered when someone gropes you.. Then who can free you
  of it"): the person who SET IT OFF may release it too, that compulsion only and only while it
  holds. Recorded in memory per compulsion key when an arrival / speech / activity fires it (the
  last one to set it off wins); after a reload only the planter can. Removal stays planter-only.
  Tests: Rei releases what Rei set off; a bystander can't; Rei can't once it has let go, nor after
  someone else set it off again, nor remove it. Mutation-checked (no holding check, not recorded).
- A one-time compulsion that has gone off is used up once it lets go (undoTrigger, as for a word
  trigger); the planter is told "still planted" or "used up", so neither is a surprise.
- "forget your compulsions": removal kind "compulsions", the planter's compulsions only; their words
  stay and the message says so. Refused under the Extreme lock like every removal.
- Popup: compulsion rows in "What you planted" get release / remove chips typing those lines (DW:
  someone else clicks it, and it types the words). No "say it": nothing to say.
- act-compulsion.mjs +24, popup.mjs +5. Mutation-checked: anyone may release, removal taking words
  too, no compulsion release: each fails.

### Added 2026-11-22 (v1.16.9) — "when anyone X you" compulsions; planting lines always shown

DW: "I don't think that the Trigger compulsions are in the Window", then "can we do 'When anyone X'
and make a list that X can be".
- The compulsions WERE on the popup's Triggers tab, but only while someone was under you, inside a
  closed group. With nobody under, the planting groups now show greyed (a click types nothing and
  says why). "this trigger works every time" added to Shape and Compulsions: the hint promised it
  and no line typed it.
- New condition `fireOn: "act"` with `act` (a compulsion-acts.ts key). The list lives in one pure
  file that voice.ts (parser), help, the popup hint and the wiki read. Read on the subject's
  client from BC's activity message (ActivityName, TargetMemberNumber = her), via a
  ChatRoomRegisterMessageHandler that never stops the message, as the drinks handler does (rule 1;
  no new hidden message).
- Who: anyone, a name, or I, through resolveWatch as arrival and speech do. "you" as the doer is
  refused by the regex ("when you kiss me" is not a condition). The body part after "your" is not
  checked; said so in the wiki rather than half-supported.
- Rests 15 s after firing (in memory): an every-time "when anyone kisses you, kiss me" on two
  subjects could otherwise ping-pong between clients, and a run of clicks would fire it per click.
- Safeword keeps them, as it keeps arrival and speech compulsions.
- Popup: the "when anyone … you" line opens the list as chips (DW: "can I also get this list to
  help build it"); a chip types "Name, when anyone spanks you, " to finish. TriggerLine.choices,
  built from the same list; popup.mjs checks every choice parses as its act.
- Watched names now read capitalised ("when Rei comes in", was "when rei comes in"), all kinds.
- test/act-compulsion.mjs (34), popup.mjs (+7). Mutation-checked: no activity filter, no rest,
  handler ignoring the target, planting groups hidden again: each fails.

### Added 2026-11-22 (v1.16.8) — "using ECHS since" on the Stats tab

A player asked to track how long someone has had ECHS active (as BCX does). DW: "just the date and
just the player using it", only since a reset.
- `usingSince` in the settings: set by defaultSettings (so a reset starts it again), dropped by
  normalise if not a number or more than a day in the future. A save from before this has none;
  `getUsingSince` sets it on first read and saves it, so it doesn't move on every load. Synced with
  the account like the rest. An import keeps the imported date.
- Shown on the Experience row's detail ("… · using ECHS since 3 Nov 2026"), not a row of its own:
  the trust list's rows and the page buttons leave no room. Month names fixed, not the locale's.
- Not shown to others, not sent anywhere. The other half of the request (spotting BC started
  without ECHS) is not built.
- test/using-since.mjs (11), mutation-checked (not saved, future kept, reset keeps the date, wrong
  month: all fail).

### Changed 2026-11-22 (v1.16.7) — UPDATE_NOTE for the stable release

DW: "push everything to stable". UPDATE_NOTE (v1.15.0's still) set to 1.16.7 with a two-sentence
summary of v1.15.0–v1.16.6. The root CHANGELOG line has no bold headline on purpose, so GreeterBot's
announcement (bold headlines of the newest five versions) isn't padded with it.

### Changed 2026-11-22 (v1.16.6) — a hypnotist hypnotized mid-induction loses it

DW: "If the hypnotist is still in the process of hypnotizing someone and a hypno request comes in
for them the 1st person should fail"; otherwise leave the chain alone (a trance carries on, and the
"say" relay through a hypnotised hypnotist is left as it is, by DW's choice).
- Hypnotist side: when we TAKE UP a session-attempt (after the refusals: hypnosis off, not in room,
  away, cooldown, already under), `dropOwnInductions` sends the existing `session-wake` with
  `inductionOnly: true` to every subject our view shows in AttemptMade / InductionInProgress, and
  tells us. Taken up rather than merely arrived, so a request we refuse can't be used to break up
  someone else's induction.
- Subject side: `inductionOnly` lapses an induction (lapseInduction: no try used, no cooldown) and is
  ignored in any other phase, so a stale view can't wake someone already under. A pre-1.16.6 subject
  ignores the flag and ends the induction with endSession; only a stale view of a trance would wake
  her there.
- No new message type. test/hypnotist-interrupted.mjs (16), mutation-checked (no drop, flag ignored,
  any phase, no lapse: all fail). Not live-tested.

### Added 2026-11-22 (v1.16.5) — more movements, gagged sounds, more faces

DW asked what movement commands were missing, then "Build that group". From BC R134's activity list
(Female3DCG.js), the batch without new machinery:
- Self: `Wiggle` (TargetSelf only, most zones) for wiggle/wriggle/shake/sway/jiggle/bounce/shimmy +
  your <part>, ADJACENT only (these words are patter); bare "wiggle"/"shake it" → pelvis then butt.
  `Nod`; `StruggleArms`/`StruggleLegs` (BC gates on CantUseArms/CantUseFeet; "the more you
  struggle" and "struggle to …" excluded); the `MoanGag*` sounds (BC gates on IsGagged +
  Needs-GagItem). "moan" with no gag falls through to the moan face, so v1.11.0's "moan for me"
  keeps working.
- Aimed: `Cuddle` (no TargetSelf; arms, nose for nuzzle), `Kick`, `CollarGrab` ("collar"),
  `HandGag` (mouth only), `PoliteKiss` ("peck", "politely kiss"; hand by default).
- `ActivityVerb` gained adjacent / selfOnly / othersOnly / parts / defaultPart. A verb with its own
  parts list never claims an unknown part (so "cover Rei's eyes" falls through). A default part
  applies only when nothing follows the name ("grab me", not "grab me a drink").
- `ACT_PARTS` = BODY_PARTS + hand + collar (BODY_PARTS itself unchanged, so the self-touch block
  words are unchanged). "kiss my hand" now lands on the hand instead of falling through.
- OBJECT_VERBS gained the new verbs, so "Missy, hug Rei" isn't cut at "Rei" (touch-others caught it).
- `act:bare:<key>` trigger ids; describeAction uses activityWord (fixes "you massagehands your …").
- Face: Eyebrows (Raised, OneRaised, Lowered) and Fluids (DroolMedium, TearsMedium) added to
  FaceGroup; Mouth Frown/Sad/Pained. "face-dry" releases Fluids.
- Left out, as reported to DW: Step / Sit / RestHead (need the target kneeling), item activities,
  and things BC has no activity for (dance, twerk, bow).
- test/movements.mjs (84). Mutation-checked: no adjacency, no moan fall-through, loose default,
  self-only aimed, struggle patter, others-only on herself, only the first try (all fail). Not
  live-tested.

### Changed 2026-11-22 (v1.16.4) — any full keyholder may ask to remove another

DW, on finding the v1.16.3 option owner-only: "Any full keyholder with a popup, owner no popup".
- `remove-keyholder` now goes through `handleAskedChange` (rate limit per target); the owner skips the
  popup. Snapshot `keyholders` for any full keyholder. Not for a non-owner while the keys lock holds
  (accepting would be her taking keys back, which that lock stops; chosen here).
- Keys tab: non-owner "take their keys back" is one click (she must accept); the owner's stays two.
- keyholder-extreme 50, popup 178. Mutation-checked (nobody asked, owner asked, keys lock ignored,
  list for every level, locker removable: all fail). Not live-tested.

### Added 2026-11-22 (v1.16.3) — keyholder Extreme (job6.md stage 6) and the keys lock

DW: Extreme "Yes, with your acceptance". Keys lock: "an option for BC owner to take away your ability
to give and take keys. Owner does not need get permission ... an option for people with full
permission with pop up confirmation similar to the lock".
- `handleAskedChange` replaces the v1.16.2 lock handler; the settings lock, the keys lock and Extreme
  all use it. `handleUnlock(kind)` for both locks.
- Choices made here, not by DW: the owner skips the popup only while holding her FULL keys (an owner
  without keys can't reach her settings at all); the keys lock is lifted by any full keyholder and
  ends after 7 days without its setter, like the settings lock; extending Extreme adds 30 days to its
  current end (or from now if it has run out) as a "month" period.
- Owner manages keyholders (DW, "BC owner can remove other keyholders as well"): `remove-keyholder`,
  owner at full only, no popup; not the settings-lock holder while it holds (chosen here, so that
  lock's promise holds). Snapshot `keyholders` for the owner only.
- `test/keyholder-extreme.mjs` (45) and 10 popup checks. Owner removal mutation-checked too (any full
  keyholder managing, owner at any level, locker removable: all fail). Mutation-checked: anyone skipping the ask,
  the owner having to ask, any level, extend restarting the trial or counting from now, no late
  check, no keys re-check, list editable, request-keys allowed: all fail. Not live-tested.

### Added 2026-11-22 (v1.16.2) — the keyholder lock (job6.md stage 5)

DW: "Yes, but you must accept"; "Any Full keyholder unlocks, Ends if they're gone N days" (N = 7);
she can't remove the locking keyholder while locked; reset still works.
- `src/keylock.ts` (lazy expiry, presence noted at most once a minute); storage `keyLock`.
- `settingsLocked()` now includes it; new `ownLocked()` for the session/Extreme locks, which alone
  still hold her keyholder list and giving keys on request. Under the keyholder lock the locker
  can't be removed, lowered below full, or (if they hold full keys only as her owner) have the owner
  keys lowered.
- `fixedRowLocked()`: Hypnosis Enabled can be unticked under the keyholder lock (not under Extreme,
  as before). `/echs decay` and `/echs triggerdecay` are now refused under it.
- Actions `lock` (popup, 3 min between asks per keyholder, re-checks full keys after Accept) and
  `unlock`. Snapshot `keyLock`. Keys tab: lock (one click; she must accept), unlock (two clicks).
- `test/keylock.mjs` (38) and 6 popup checks. Mutation-checked: screen not locked, never expiring,
  presence not refreshing, moderate locking (6), moderate unlocking, locker removable, locker or
  owner lowerable, any answer locking, and the lock blocking key requests all fail. Not live-tested.

### Added 2026-11-22 (v1.16.2) — full keys see and remove planted triggers (job6.md stage 4)

DW: removal "Only if keyholder has a higher trust level than the person that added the trigger and not
under extreme at all"; her trust in keyholder > her trust in planter (strictly).
- Snapshot field `planted` for full keys only; `triggerId` hash instead of the word; word only for
  its planter or when she has *Show trigger words* on. Action `remove-trigger` (`removeRefusal`).
  Also refused while it holds her, the rule her own `/echs forgettrigger` has. The keyholder's own
  planting is removable whatever the trust (they could already take it back by saying so).
- voice.ts's planted-list entry builder is now `plantedEntryOf`, shared through planted.ts.
- Keys tab "Planted in them (n)", folded; remove is two clicks; a faded one says why.
- `test/keyholder-triggers.mjs` (27) and 5 popup checks. Mutation-checked: `>=` for trust fails 8, no
  Extreme check fails 4, self-planted removable 2, words always sent 2, any level 1, list for every
  level 1, holding ignored 4, no two-click 1. Not live-tested; the snapshot is now the biggest hidden
  message ECHS sends (30 triggers + ~45 choices), watch for it not arriving.

### Added 2026-11-22 (v1.16.2) — full keys reach Triggers choices and Depth (job6.md stage 3)

DW: Full gets "the Triggers tab dropdowns, the Depth tab".
- `menu.ts` `fullOnlyChoices()`: trigger scope, lifespan, duration, trigger decay, drop mode, trust
  decay (tab "Stats", where her own control is), each gate's depth, chemical reach (illusion and
  planting triggers only, as on her screen), chemicals count, skill honour (offered rungs: not the
  CNC rung, which her own button doesn't reach either), reset depths. No `off`, no `moderate`: full
  only, so even the most closed option needs full (DW's table has "—" for minimal and moderate).
- `RemoteChoice.range` for numbers: plain whole numbers in range only ("045", "4.5", "1e1" refused),
  so what she is told is what is saved. `labelOf` for how values read.
- Snapshot cap on the keyholder side 20 → 80 (it is ~45 now). New choices appended after the
  v1.14.1 ones, so a v1.16.1 keyholder still sees its 20.
- Keys tab: tab headings fold (Depth and Stats start shut); numbers get step buttons.
- `test/full-keys.mjs` (59) and 7 popup checks. Mutation-checked: any number accepted fails 9,
  moderate allowed fails 15, cap of 20 fails 1, all skill rungs fails 1, nothing folded fails popup.
  Not live-tested.

### Added 2026-11-22 (v1.16.1) — requesting keys (job6.md stage 2)

DW: a would-be keyholder can ask; "a pop up instead of a chat request. No answer is a decline".
- `ask.ts`: one Accept/Decline box at a time, 30 s, driven by a once-a-second tick that reads the
  clock (so a throttled background tab still times out). Stages 5 and 6 reuse it.
- Her side (`handleKeyRequest`, before the keyholder check since the asker holds no keys yet):
  refuses a bad level, under her Extreme or session lock (and tells her it came), when they already
  hold that much, within 3 min of their last ask, or while another question is open. Re-checks her
  locks after Accept. Only Accept changes anything.
- Asker's side: `requestKeys` only for peers on v1.16.1+ (badge version), 3 min between asks; the
  answer (`keyRequestResult`) is said in chat and shown under their name. Not held by the asker's
  own locks: asking for someone else's keys is not one of her settings.
- Keys tab "Ask for keys" group with a cycling **Request keys (level)** button (typed, like Give keys).
- `test/key-request.mjs` (34). Mutation-checked: no timeout fails 3, treating any answer as Accept
  fails 4. Not live-tested.

### Changed 2026-11-22 (v1.16.0) — keyholder levels (job6.md stage 1)

DW: take/grant read wrong ("make take"), and a middle level was wanted. Three levels: minimal (off
only), moderate (also shapes the trance: Trance Defaults and Awareness boxes on, and remoteChoices
marked `moderate`: screen effect, eyes, eye colour, pulse colour, attempts, induction time, sink
deeper), full (everything). Toy mode, auto-answer, when-away and who-toy-mode-is-for stay full-only.
- `keyLevelAllows(level, turnsOff, moderateOk)` decides on her side and greys on the keyholder's.
- Conversion (DW): saved take -> minimal, grant -> MODERATE (full grows in later stages, so it is
  re-given on purpose). Typed take/grant still parse (toKeyMode).
- Wire: `keyLevel` beside v1.14's `keyholder: take|grant` (minimal -> take, else grant), and
  `settings.level` beside `settings.mode`, so a v1.14 keyholder still sees her. A v1.14 subject's
  "grant" reads as full on a new keyholder's side (it meant everything there).
- Keys tab: one "Give keys (level)" button per person, cycling on repeat clicks (label = what is
  typed); "Take keys back". DW chose typed, not acting on click.
- Tests: keyholder 89 (+22), popup 152 (+4). Mutation-checked: moderate allowed everywhere fails 6;
  grant -> full fails 3. Not live-tested.

### Fixed 2026-11-22 (v1.15.3) — trigger words in OOC were concealed

DW: "the addon is putting **** in place of trigger words in OOC. I agree it should not trigger if
in OOC, but then it should not blank it out as well." Triggers read stripOOC's text (main.ts), but
the conceal handler masked the whole drawn line. `concealInCharacter` now walks the line with the
same depth rule as voice.ts stripOOC (unclosed "(" runs to the end; a stray ")" stays in character)
and conceals each in-character run on its own, for the line and BC's ungarbled copy. Known gap: a
phrase split by an aside ("sleepy (lol) time") fires but is not concealed. `test/conceal.mjs` +7,
mutation-checked (the old whole-line masking fails 4).

### Reverted 2026-11-22 (v1.15.2) — lastTogether taken back out

DW, after a refresh on dev: the Stats tab still read as time since the last reset, and many people
showed "just now" whom DW had not just interacted with. Undone at DW's word rather than chased: the
field, its setter and the row's use of it are gone; normalise() deletes any saved `lastTogether`.
Likely causes, for whoever picks it up: old entries fall back to `lastUpdated` (which decay had
just reset), and passive trust growth (conversation in the room) counts as "together". The settings
directions from v1.15.1 stay.

### Fixed 2026-11-22 (v1.15.1) — "N days ago", and where settings are

Two small offers DW took up.
- Trust entries gain `lastTogether`, set only when `addInteractions` adds (delta > 0). Decay charges
  `lastUpdated` (it is decay's clock), which reset the Stats tab's "N days ago" to "just now" (found
  during the v1.12.8 rate-limit fix). The row reads `lastTogether ?? lastUpdated`, so old entries
  show what they did before until the next interaction. `test/trust-burst.mjs` +5; mutation-checked
  (never setting it fails 4).
- The first-run notice ("Click the spiral to set up") and four wiki places (Settings Reference,
  Sample Session, Troubleshooting ×2) pointed at a spiral on your OWN profile. There is none:
  `remote.ts addSheetButton` skips the player's own sheet. They now name the popup's spiral button
  and gear, or Preferences > Extensions.

### Added 2026-11-21 (v1.15.0) — the update notice

DW: players should hear when ECHS updates, as a beep with a short description and a changelog link.
DW chose: ECHS shows it itself (BC's `ServerShowBeep`, a local toast plus the desktop notification,
not a real beep from GreeterBot); the text written into the build (`UPDATE_NOTE`), not fetched;
stable only; the beep plus a private chat line with the link.
- `update.ts`, on the startup banner's poll, after the first-run notice. `lastSeenVersion` is in the
  synced settings, so once per account. A fresh install records silently (the first-run notice owns
  that load); an account from before the feature has no `lastSeenVersion` and gets it; dev records
  silently; a downgrade says nothing; a build without a numeric version does nothing.
- BC R134 checked: `ServerShowBeep(message, duration, options{onClick}, title)` (Server.js) and
  LocalMessage content rendered as `innerHTML` (ChatRoom.js), which is what makes the link clickable.
- Release step added to CLAUDE.md: set `UPDATE_NOTE` before each dev → main.
- `test/update-notice.mjs` (24); banner suite now seeds a seen version. Mutation-checked: dev not
  silent fails 2, notifying on a downgrade fails 1. Not live-tested.

### Added 2026-11-21 (v1.14.1) — keyholders reach the Trance Defaults and Inductions choices

DW asked for the spirals and the other options on that tab, then the Inductions tab as well. They
are dropdowns and cycle buttons, not tick boxes, so v1.14.0's remote could not reach them. DW chose:
keyholders (not a popup quick switch for the player); on Trance Defaults all four (screen effect,
eyes, eye colour, pulse colour); and the whole Inductions tab.
- Off choices for "take" on Inductions: Ask me, Refuse (when away), toy mode Off, Never deeper.
  Attempts, induction time and who toy mode is for have no off, so they need grant.
- `menu.ts remoteChoices()` wraps the tab's own dropdown setters (and the pulse colour's), so the
  side effects are hers: None takes the fade off at once, her eyes are redone mid-trance.
- "take" may only set the off choice (None / Unchanged). Going from a heavy spiral to a light one
  is not counted as taking: it keeps the rule one line. The pulse colour has no off, so it needs
  grant. Custom pulse colour is unreachable (it needs a hex typed on her screen).
- New action `choose` on the same `remote-request`; the snapshot gains `choices`. A v1.14.0 subject
  sends none (the popup shows none) and answers `choose` with "did not understand".
- `test/keyholder.mjs` 54. Mutation-checked: dropping the take rule fails 3, an empty `choices`
  fails 1. Not live-tested.

### Added 2026-11-21 (v1.14.0) — keyholders: changing someone's settings for them

job5.md (local), from a player's request about people locking themselves into Extreme with nobody
able to help. DW's decisions: keyholders are her BC owner (if she allows it) plus anyone she names;
per keyholder "take" (only switch off) or "grant" (on too); works through Extreme, and a keyholder
may end the lock; reaches the Permissions, Trance Defaults, Awareness and Triggers tick boxes.
- `keyholder.ts`. Rule 1: her client checks the sender, the key (`menu.ts remoteRows`, read from the
  tabs themselves), the mode and any `needs`, then applies through `setFeature` + `onToggle`, the
  same path as her own click, so switching a permission off releases what it held and hypnosis off
  runs the hard floor. She is told who changed what (`[...]` added by tellPlayer) and it is logged
  (`remoteLog`, last 20).
- No new message type. Requests on `remote-request` (feature "settings"), which remote.ts already
  handled by ignoring; replies on `state-response`; her answer to anyone's state-query carries
  `keyholder` for that asker alone, so the keyholder's popup knows whose keys it holds without
  extra traffic. A keyholder asks for a snapshot at most every 30 s from the tab.
- Never reachable: safeword, reset, export/import, the keyholder list. Under her Extreme or session
  lock, her own edits of the list are refused, as her other settings are.
- Extreme warning, wiki (Consent and Safety, Settings Reference, Commands, the popup page), help.
- `test/keyholder.mjs` (39) and `test/popup.mjs` (148). Mutation-checked: accepting a stranger fails
  4, letting "take" switch on fails 1. Not live-tested.

### Changed 2026-11-21 (v1.13.6) — "RC" retired; dev builds show "D"

DW: stable shows just the number, dev shows it with a D. `releaseLabel` is gone from package.json
(the 1.0 "RC" ran 1.0.0 to 1.13.5).
- **Decided at load, not at build.** dev and main commit the same `cdn/HypnosisAddon.js` once dev is
  merged into main, so a D written into the file would reach stable with the next release; stamping
  it per branch would mean a conflict in the generated files at every release. Instead `log.ts` reads
  `document.currentScript.src` at load: FUSAM's dev channel loads GitHub Pages' `/dev/` copy by
  `<script src>`, so it matches; FUSAM stable, the Tampermonkey loader (jsDelivr) and the bookmark
  loader (inline) do not. `init_log()` runs on the entry's synchronous first line, before
  `init_main` is queued, so `currentScript` is still set (checked on the real bundle).
- The local `dist/HypnosisAddon.user.js` build sets `__LOCAL_BUILD__` and shows the D too.
- `test/version-label.mjs` (10): the label per address, and the real bundle run as a browser would
  (currentScript only during the first run); ignoring the address fails it. GreeterBot's announcer
  reads `## v<number>` and needs no change.

### Added 2026-11-21 (v1.13.5 RC) — "take a sip"

A player's report (feedback 2026-11-13): "take a sip" did nothing as a command under trance; there was
no spoken sip. Now a commanded activity (`matchActivityCommand` kind `sip`, `act:sip` in triggers):
BC's own `SipItem` on her own `ItemMouth`, herself as actor, through `runCommandedActivity` — so BC's
prerequisites decide (R134 Female3DCG.js: TargetCanUseTongue, Needs-SipItem, UseHands). Under Made to
Act (DW's choice over a permission of its own: her drink settings already decide whether a tagged
drink touches her hypnosis). A refusal names the likely reasons. drugs.ts already reads her own
handheld on SipItem, so an ECHS drink doses as when she sips it herself. Popup Touch list. Checked in
`test/activity.mjs` (wordings, conversation not read as one, permission, BC's refusal, the SipItem
call) and `test/popup.mjs`.

### Added 2026-11-21 (v1.13.4 RC) — a gear on the popup opens the ECHS settings

DW asked. `menu.ts` `openSettingsScreen()` shares `openHelpScreen()`'s path into Preferences >
Extensions > ECHS Hypnosis (checked again against R134: Preference.js `PreferenceOpenSubscreen`,
Extensions.js's list click), without opening the guide. The popup hides itself on that screen (it
shows only in a room) and is open again on return. A failure says the manual path (rule 5).
`test/popup.mjs`: 137 checks.

### Changed 2026-11-21 (v1.13.3 RC) — the held orgasm is said ever more rarely

A player's report, passed on by DW 2026-11-21: denied and wearing something that drives arousal, the
"held at the edge" line came every minute or two. `denial.ts` said it at most once a minute, both
privately and as a room emote, for as long as the toy ran.
- **Now an episode** (`heldAnnouncement`): the first hold is said to her and the room; repeats are
  private only, at 2, 4, 8, then 15-minute gaps (capped); five minutes with no hold ends the episode.
- `test/denial.mjs`: the schedule step by step, and through the real hook the room told once per
  episode and her twice in ten minutes of climbs; sending repeats to the room again fails 2.

### Added 2026-11-21 (v1.13.2 RC) — the popup can be resized

DW asked. The browser's own grip (CSS `resize: both`), so nothing fights BC for the mouse; a
ResizeObserver saves the size (`popupSize`) once it has stayed put 400 ms, and only when the player
set one (an inline size), so an untouched window saves nothing. Clamped to between 260×220 and the
screen when applied. Double-click on the title bar (not on its buttons) clears it. The window's
default height is now fixed (`min(460px, 70vh)`) rather than following its content, so it no
longer jumps as groups open. `test/popup.mjs`: 131 checks.

### Changed 2026-11-21 (v1.13.1 RC) — wake compulsions arm on any trance's wake

A player's report (feedback 2026-11-20, and passed on by DW 2026-11-21): a planter's "when you open
your eyes, take something off" only went off when the planter was the one who had her under. That
was Build 6's rule
(v0.90.0): `onWake` armed a wake compulsion only when the trance ending was its installer's. Players
read "when you wake" as every time, and the arrive/speak compulsions never asked who.
- **Decided (DW):** any trance's ordinary wake or timeout arms it. Considered and not chosen: the
  word triggers' "who can use it" rule (the subject's scope defaults to Hypnotist only, so the reported
  case would still not work), and keeping it with better help text.
- Unchanged: it still fires as its installer's (`fireTrigger(t, t.installedBy)`), never while she is
  under, and the safeword / hard floor still discard it (`onTotalStop`).
- `test/compulsion.mjs` now checks another hypnotist's wake arms it, it goes off, and it holds as
  the installer's; with the old rule restored, those three fail.

### Added 2026-11-21 (v1.13.0 RC) — the ECHS popup

DW, 2026-11-21 (job4.md, local): players find ECHS hard to use because the typed commands and
wordings are hard to find; newer add-ons use floating windows. Built in five stages on
`feat/echs-popup`, each committed with its own suite checks; the decisions are in design.md, *The
ECHS Popup*, and the player page is `wiki/The-ECHS-Popup.md`.
- **Typing, never sending,** was DW's choice: it teaches the wording, and lets the player edit or
  whisper. The Safeword button is the one exception (rule 2).
- **Generated lists.** Commands from `commandHelp`, suggestions from `suggestionHelp` (now carrying
  `releaseOf`, so each release is listed under what it undoes, DW), trigger wordings from the help
  screen. `test/popup.mjs` (121 checks) runs every typed phrase, name in front, through the real
  matchers and parsers. It caught "kiss me" needing the targeted matcher, and two greying bugs (a
  group of only always-allowed lines read "not allowed"; a group whose only lit lines were releases
  never did).
- **People lists ECHS players, reversing v0.35.0's "never a directory".** DW's call, made knowingly;
  the existing "Show others that I run ECHS" box opts out of both the spiral and the list.
- **Greying on the existing message.** `session-update` gains `gates` (depth.ts `gateReport`); no new
  type, because an older client prints unknown types as raw text, and an older hypnotist ignores the
  field. Re-sent from the persist heartbeat only when it changes (mutation-checked).
- **No flood.** People sends nothing (badge.ts already knows); the Triggers tab asks each person's
  planted list at most once per 30 s (mutation-checked); the subject's trigger list prunes only on a
  redraw, not per tick, after v1.12.8's lesson.
- `voice.ts` exports three pure checks for the suite (`walkingLineKind`, `isReinforceLine`, and
  `releaseOf` on `suggestionHelp`); no matching behaviour changed.
- **Not live-tested.** design.md *Needs Testing* lists it; the steps are `script_test.md` A–J.

### Changed 2026-11-19 (v1.12.9 RC) — one account sync per frame

From DW's ask after v1.12.8 to look for other places ECHS sends more to BC than it needs to. The
review found no other flood like the trust list: trust from chat is 5 min per person, the session
heartbeat and the presence poll are local only, session updates go out per transition, follow beeps
once per follower per room change. What it did find is saves in a row, each its own
`AccountUpdate` with the whole blob: a trigger firing saves twice (`noteTriggerFired`, then
`markSpent`/`forgetTrigger`); `setFace` saves on every face command, beside BC's own expression
message; `pruneFadedTriggers` saves once per dead trigger.
- **Change.** `saveSettings` still writes `Player.ExtensionSettings` and the localStorage backup at
  once, so every read in the frame is current, but the `ServerPlayerExtensionSettingsSync` call is
  shared: one `setTimeout` 0 per frame (`syncToAccountSoon`/`flushAccountSync`). BC's sync reads
  `Player.ExtensionSettings` when it runs, so it carries the last state. A throwing sync is caught
  and warned, and the next save tries again. Nothing in ECHS reloads or disconnects right after a
  save. The no-member-number guard is unchanged and still comes first.
- v1.12.8's `saveDecaySoon` stays: it also spares the per-entry compress.
- **Not done, DW's call for later:** a safeword or wake sends a full `ChatRoomCharacterUpdate` per
  held effect (Freeze, BlockWardrobe, DenialMode, Leash) plus one for the trance eyes, a pose update
  and one expression message per face part. Batching those touches the hold's safety net
  (`ChatRoomCharacterUpdate` is hooked, effects.ts), so it wants its own build and a live run.
- Test: `test/settings-sync.mjs` (11 checks; four saves in a frame → one sync carrying the last
  state, separate frames sync separately, a failed send neither throws nor sticks, nothing before
  the member number is known). Fails on v1.12.8. `test/trust-burst.mjs` updated: the [x] writes
  the local copy at once and syncs at the end of the frame.

### Fixed 2026-11-19 (v1.12.8 RC) — opening a long trust list flooded BC's send queue

Reported by Senge (11-18): "after a certain point, trying to look at the trust values will get you
infinitely rate-limited by BC", so names could not be removed or decay managed short of a reset.
- **Cause.** `applyDecay` (storage.ts) charges decay on read and wrote it back with `saveSettings()`
  on the spot, one call per entry that had lost a whole interaction. `trustStatRows` (the Stats tab)
  and `describeTrust` (`/echs logtrust`) read every entry, so a long list left a few days at any
  decay rate made one `ServerPlayerExtensionSettingsSync` per person in one frame. Each is an
  `AccountUpdate` carrying the whole compressed settings blob (which grows with the list), and each
  also recompressed it. BC's client sends 14 messages per 1.2 s and queues the rest (R134 Server.js,
  `ServerSendRateLimit`/`ServerSendRateLimitQueue`), so a couple of hundred entries held chat and
  every click behind them, including the [x] that would have shrunk the list.
- **Fix.** Decay still changes the entries in memory at once (so reads stay correct and never
  double-charge), but the write-back is one shared deferred save (`saveDecaySoon`, a `setTimeout`
  0 that runs after the frame). A lost deferred save costs nothing: the stored values and clock
  give the same charge next time. Every other save is unchanged and immediate.
- Test: `test/trust-burst.mjs` (9 checks; 200 entries, 10 days at Typical: 0 sends in the frame,
  then 1; 60 more frames send nothing; logtrust the same; `forgetTrust` still saves at once).
  Fails 4/9 on v1.12.7.
- **Not changed, noted for DW:** the Stats tab's "· N days ago" reads `lastUpdated`, which decay also
  moves to now when it charges, so after a decay save every row says "just now". It is the clock
  decay needs; showing "last seen" would need its own field.

### Fixed 2026-11-19 (v1.12.7 RC) — the profile spiral under R134

Reported by Cassidy (11-18, "since the latest update the UI isn't at its usual place") and
idkkkkk (11-19, Firefox: "the hypno menu pops up behind the main menu when you click the spiral").
One cause: **R134**, now live, rebuilt the Information Sheet as an HTML screen
(`ElementDOMScreen.getTemplate`, id `information-sheet-screen`, `ElementPositionFixed` at
50,70 1900×870) laid over the canvas, and emptied `InformationSheetClick`. Our canvas button at
90,130 sat under it, and the remote panel drew on the canvas behind it. Read from R134's
`InformationSheet.js`, `Element.js` and `Common.js`, fetched from the game site: gitgud still resets
the clone's pull, so the local clone remains R132 (rule 8).
- **Entry point.** A hook after `InformationSheetLoad` (async; it builds the page) appends our button
  to the sheet's menubar (`information-sheet-screen-menu`) through BC's own
  `InformationSheetMenuButton` → `ElementButton.Create`, with the spiral data URI as its image
  (plain `<img src>` when no `imageColor` is given). If the helper is ever renamed, a plain button
  with "H" goes in instead. Other players only, as before.
- **The panel.** Opening it sets `hidden` on the sheet's screen, the same move BC's Extensions list
  makes for an extension's page, so the canvas (still drawn with the "Sheet" background) and
  canvas clicks, which `CommonClick` still routes to `InformationSheetClick`, are ours. Every way
  out unhides it through one `closeRemote()`: our exit button, Escape (→ `CurrentScreenFunctions.Exit`
  → our existing `InformationSheetExit` hook), and a new `InformationSheetUnload` hook that drops the
  panel state if the screen is left with the panel open.
- **Fallback.** With no such screen (an older client), the canvas button draws and clicks as before.
- **Checked the rest of R134:** every other function ECHS hooks still exists; extension settings
  registration only moved file (`Scripts/Preference.js`), and `Extensions.js` is unchanged from R132.
- Test: `test/profile-button.mjs` (21 checks) drives the hooks against a stand-in for the R134 page.
  Not yet live-tested.

---

### Fixed 2026-11-15 (v1.12.6 RC) — in-game help audit

A read of every hand-written line in `src/help.ts` against the code, after the wiki pass (#137,
#138). The generated parts (vocabulary, commands, depth ladder) were already current.
- *Start Here:* "click the H icon" → the spiral icon (the icon has been a spiral since the
  2026-09-16 refresh), plus `/echs induce <name>`; a line that suggestions land 2 to 5 seconds later.
- *What to Say → Not in the table:* "(selfTouchControl)" was the storage key; now the menu's
  "Self-Touch Control", with its releases (`PART_RELEASE`/`SELF_RELEASE` in voice.ts, which no help
  or wiki line showed). "Veil lifted" → "thinned" for the walking trance (it thins, per the screen
  effect). The "three times" line moved under the grammar it belongs to.
- *Depth & Trust → The roll:* added the roleplay bonus (`rpBonusFor`, up to 15), which is in
  `chanceBeforeInvariant` but was missing from the formula shown.
- *Lasting:* the Drop-triggers line sat under compulsions; it belongs to the instant drop. Added
  the owner/lovers/friends and "only I" scope phrases.
- *Commands:* the Testing note said the group "vanishes from a release build"; it is gated by the
  Hypno Testing room (`isTestingMode`). `/echs forgettrust`'s description pointed at
  `/echs logtrust`, a testing-room command; it now names the Stats tab's [x].

### Fixed 2026-11-14 (v1.12.5 RC) — ChatRoomSyncSingle was not held; repeats are told once

DW's live run of v1.12.4: all fours and belly still got through, with **no** `held still` console
line, and after Biker stopped, ECHS kept announcing refusals every few seconds (Biker's own add-on
lines had stopped).

- **The road.** R132 `Server.js` maps the server's `ChatRoomSyncSingle` message to
  `ChatRoomSyncSingle()`, which runs `CharacterLoadOnline` on the character it carries and so sets
  her `ActivePose`. Only `ChatRoomSyncCharacter` was hooked (v0.91.0 read the kneel/stand help as
  arriving that way). A whole-character update of her from another client, which Biker's add-on
  sends for those poses, went round every hook, which is why nothing was logged. Both now share one
  hook (`holdOnSync`), labelled in the log. So v1.12.4's whole-sync net, on her own sends, was not
  the road; it stays, as it closes a real gap.
- **The repeats.** Most likely her client fighting the pose that sync had put in: something on it
  re-tried, the hold refused, and every refusal was told. `othersRefused()` now takes the pose asked
  for and tells each distinct pose once a minute (a single name and a one-pose list count as the
  same); repeats are refused and re-sent without lines. The re-send is held to one a second.
- `test/held-still.mjs` 85 (+6): all fours by `ChatRoomSyncSingle` undone, told and re-sent; the same
  pose by both roads ten seconds on, quiet; her belly, told; her own `ChatRoomSyncSingle` left alone.
  Four fail on v1.12.4.

### Fixed 2026-11-14 (v1.12.4 RC) — the safety net also watches the whole-character sync

DW, after the v1.12.2 run: belly and all fours "might go through a different function". One road
was open: R132 `ChatRoomCharacterUpdate` sends `{ ID, ActivePose, Appearance }`, and
`Player.ActivePose` has a public setter (Character.js:192) that skips `PoseSetActive`, so a pose
written there and synced with the whole character never met the hold. The `ServerSend` net watched
only `ChatRoomCharacterPoseUpdate`; it now also checks `ChatRoomCharacterUpdate` when `ID` is her
own `CharacterID` (her client also syncs others she changes), with the same decision as before and
the held pose put into `ActivePose`. **Not verified** that this is the road Biker's add-on uses:
the log line now names the send (`ChatRoomCharacterUpdate` or `ChatRoomCharacterPoseUpdate`).
A pose written straight to `ActivePose` and never sent by her client is still not seen.
`test/held-still.mjs` 79 (+3), two of which fail on v1.12.3.

### Fixed 2026-11-14 (v1.12.3 RC) — v1.12.2's quiet refusals reverted

DW's live run of v1.12.2: Biker saw Missy moved ("hhmmmm???", "uhhhhm") and the room got one
*"does not budge"* for a burst of six add-on moves. v1.12.2's premise was wrong.

- **What v1.12.2 did.** Changes that were neither her input nor inside a server message were read
  as *auto* and refused quietly: no lines and no re-send of her pose. Biker's add-on handles the
  request on her client after the message (a timer or a promise), so its changes were *auto*. Still
  refused on her client, but nothing put the mover's screen right, so they saw her moved.
- **The "stray" lines were most likely real.** In both the v1.12.1 and v1.12.2 logs the add-on's own
  room line reaches the chat after her refusal, so a "does not budge" that seemed to come before
  any attempt was the answer to one whose announcement had not arrived yet.
- **Now.** Every refusal under the full hold that is not hers is told as someone's again, with the
  re-send, as in v1.12.1; a bare `ChatRoomSyncPose` is told again too. Kept from v1.12.2: the
  three-way source and the calling code in the log, and `markOwnAction()`, now only for the log.
- `test/held-still.mjs` 76: the three quiet checks replaced by checks that a timer change and a bare
  pose update are told and re-sent; both fail on v1.12.2.

### Fixed 2026-11-14 (v1.12.2 RC) — the full hold no longer blames "someone" for her own client's add-ons

DW's live run of v1.12.1: the room read *"Missy does not budge"* six times for Biker's two add-on
moves: once straight after *"no one can move you"* before anyone acted (the v1.12.0 log had the
same *"Someone tries to move you"* there), twice with nothing between, and once just before the
hypnotist's own *"legs closed"* landed. Biker confirmed she never appeared to move on their screen.

- **Cause.** v1.12.0 read every change that was not her own input as someone else's. Changes from
  her own client also land there: another add-on reacting to our own action inside the same chat
  message's dispatch, and timers (WCE's animation engine re-applies on one).
- **Fix.** `changeSource()` in `effects.ts` now has three answers: *hers* (her click or key), *someone*
  (dispatched from a server message: WebSocket `message`, or the polling fallback's XHR `load` /
  `readystatechange`, and not the dispatch that carried one of our own actions, which
  `markOwnAction()` records when we apply the Freeze, set the level, or pose her), and *auto*
  (everything else). The full hold refuses all three but tells her and the room only for *hers* and
  *someone*. A bare `ChatRoomSyncPose` about her names no sender and may be the server echoing her
  own client, so it is undone quietly too; BC's own route for another player,
  `ChatRoomSyncCharacter`, names one and is still told. The ordinary hold is unchanged.
- **Diagnostics.** Each refusal and pass-through now logs the pose asked for, the source and six
  frames of the calling code (only when logging is on: the Hypno Testing room or `/echs debug on`),
  so the add-on behind the next stray one can be named rather than guessed.
- **Risk.** A remote request an add-on handles on a timer after the message would now read as
  *auto*: still refused under the full hold, but without the lines. The ordinary hold lets *auto*
  through as before, so it is unaffected.
- `test/held-still.mjs` 80 (+7): a timer change, a same-dispatch reaction, a bare pose update (all
  quiet), a later message and a named sync (both told). Three fail on v1.12.1.

### Fixed 2026-11-14 (v1.12.1 RC) — the room is told when the full hold refuses someone

DW's live run of v1.12.0: the full hold stopped the moves, but the room read
`(Biker draws Missy's arms behind their back, elbows almost touching.)` and two more like it. That
text is not BC's (no match in R132), so it is the mover's add-on, posted from **their** client before
the request reaches hers; it may also show her moved on their screen. Neither is ours to stop.

- Her client now answers each refusal of someone else's change (`othersRefused()` in `effects.ts`):
  a room emote, *"{name} does not budge: {their} body stays exactly where it was."*, at most once per
  5 s so a burst reads as one, through `tellRoom` so *Others See Your Reactions* governs it; and, on
  the add-on (`PoseSetActive`) path, which re-sent nothing, her held pose is sent again in a
  microtask, so one request's several calls share one `ChatRoomCharacterPoseUpdate` and every
  screen shows her real pose. The sync and `ServerSend` paths already re-send.
- `test/held-still.mjs` +4 (73): the room line, the re-send, one of each for a burst of three, and
  nothing to the room under the ordinary hold. The three new checks fail on v1.12.0.

### Decided 2026-11-14 (v1.12.0 RC) — two levels of hold; others may adjust a held subject

DW, 2026-11-14: while hypnotized, someone moving her through the BC interface "acts like you are
moving, but you don't move", and she got the line meant for her own attempt. DW chose three levels:
unfrozen; she cannot move but others can adjust her; and no one can move her. **This re-decides
v0.91.0's "no to others"** (DW, 2026-09-26), which is now only the third level.

- **Levels.** `"movement-block"` (*"you cannot move"* and its kin) is the ordinary hold: her own
  changes are refused, anyone else's land. New `"movement-lock"` (*"no one can move you"*, *"you
  cannot be moved"*, *"you will not be moved"*, *"frozen solid"*, *"a statue"*) is the full hold,
  the old behaviour. Same permission and depth (Movement Restriction). Saying the ordinary one after
  the full one eases it; `"movement-release"` ends both. The level is `holdFully` in `effects.ts`,
  cleared whenever our Freeze comes off (the commanded undress lifts and restores it, level too).
  Local only: after a reload the Freeze that rides the item is the ordinary hold.
- **Trance default.** New `tranceNoOneMoves`, *"...and no one else can move you either"*, indented
  under Cannot Move, **off by default**, so a trance's own hold now lets others adjust her. Walking
  trance and "be still" honour it.
- **Whose change is it.** Add-ons that pose her for someone else (BCX, LSCG, ...) call
  `PoseSetActive` on HER client, as her own click does; that is why the old hold refused them with
  her own line. The hold now reads `window.event` (we run in the page, `@grant none`): a change made
  while one of her clicks or key presses is being dispatched is hers, and one made in a socket
  message, a timer or an animation frame is not. Under the ordinary hold such a change goes through
  with our Freeze lifted for the call (WCE and LSCG, hooked after us, refuse to pose a frozen
  character), and becomes the pose she is held in, so the `ServerSend` net does not take it back.
  Under the full hold it is refused with *"Someone tries to move you…"*. BC's own route for another
  player (the kneel/stand help, a `ChatRoomSyncCharacter`) and a bare `ChatRoomSyncPose` follow the
  same split. BC's pose menu is self-only (R132 `_DialogPoseMenu extends _DialogSelfMenu`).
- **Known gap.** An add-on's self-pose path that runs outside her input (a chat command handled on a
  timer, say) would read as someone else's and pass under the ordinary hold. None is known.
- **Tests.** `test/held-still.mjs` (69) covers both levels by BC sync, bare pose update, add-on
  `PoseSetActive` and the `ServerSend` net, the trance default, walking, and the wordings;
  `test/held-wce.mjs` marks her own calls as clicks. **Not run live.**

### Fixed 2026-11-14 (v1.11.1 RC) — sight never reached BC's blind level

Found live by DW, 2026-11-14 (Missy in toy mode): every sight suggestion told the hypnotist
`"sight-dim" matched but did not land: effect-failed`. Toy mode was incidental; any trance did it.

- **Cause.** Our `CharacterGetEffects` hook added the sight effect only when BC asked about a named
  blind group (ItemHead, ItemHood, ItemNeck, ItemDevices), as v0.93.0 read R132. BC's
  `GetBlindLevel` now asks with `[]`, which BC's own filter treats as every group, so our effect was
  never counted, `setSight` read back 0, and `applySight` reported `effect-failed`.
- **Fix.** An explicit empty list now counts as covering the blind groups. A missing list
  (`CharacterLoadEffect` rebuilding `C.Effect`) still gets no sight, so it stays out of her general
  effect list as before. The sight branch no longer returns early, so a question that covers both
  the blind groups and the Emoticon also gets our held effects.
- **Why the suite missed it.** `test/sight.mjs` stood in for `GetBlindLevel` with the old named-group
  call. It now uses `[]`, as BC does, and also checks the named-group call and a non-blind group.
  On the old code the new stand-in fails 7 checks, the same failure DW saw.

### Added 2026-11-11 (v1.11.0 RC) — her face on command

Missy's feedback line of 2026-11-08 ("check if addon can adjust fave") was DW's own note, meaning
*face*: "open eyes, close eyes, open mouth, stick out tongue, things like that". DW's decisions
(2026-11-11): it lasts until "relax your face" or waking; with trance eyes on, closing then opening
the eyes gives the spirals back; both tongue faces; and a face can be a trigger action.

- **BC's own expressions, through BC's own setter.** `CharacterSetFacialExpression` (R132
  Character.js) sets both eyes for "Eyes", refuses an expression the group does not allow without a
  word, and for the player in a room sends the change itself. Names from R132 Female3DCG
  `AllowExpression`. There are two tongue faces: `TonguePinch` (the tip out: *"stick out your
  tongue"*) and `Ahegao` (all the way out, eyes rolled: *"let your tongue hang out"*). The local BC
  clone could not be pulled (the server reset the connection), so these are R132's lists; check
  them against the live game in the test run.
- **Posture Control, no new permission.** A face is the body doing what it is told, as a pose is,
  and the same depth gate.
- **Saved first, put back only if still ours** (`src/face.ts`), as the trance eyes are: BC saves the
  expression with her character, so a crash mid-trance is put right on the next load
  (`attemptRecovery`). What is saved is the face at the time of the FIRST command on that part, which
  is why "open your eyes" gives back her spiral eyes while she is under. On every way out the face is
  put back before `restoreTranceEyes`, so the spirals are then there to be taken off.
- **Not carried.** Face ids are left out of `noteApplied` like the hearing modes: DW wants a face to
  end on the wake.
- **Releases by part.** *"Open your eyes"* (also not a wake: wake needs "wake" or "you open your
  eyes" after a condition), *"close your mouth"*, and *"relax your face"* for all of it. A trigger's
  undo is `clearFace(part, its own expression)`, so a trigger letting go leaves a face said since.
- **Near misses guarded.** A bare "smile", "grin", "pout", "smirk" or "blush" is not taken after
  "a", "your", "me", "I" and the like ("you make me smile", "I love your smile"), nor when negated.
- Tests: `test/face.mjs`. `test/trance-eyes.mjs`'s two source-shape checks now allow the face step
  between the trance clear and `restoreTranceEyes`.

### Fixed 2026-11-11 (v1.10.2 RC) — Wings stayed on with spiral eyes

DW: "It did not clear the eye shadow - WINGS". v1.10.1 hid the shadow by `Property.Opacity = 0`, but
R133 `CommonDraw` clamps opacity to each LAYER's MinOpacity, and Wings' `Line` layer has 0.8 (R133's
comment: set "to 'turn off' opacity control for this layer"). The unit stub had no layers, so the
test passed against a shadow that does not exist in BC. Now `canFadeOut` checks every layer: a
shadow that can reach 0 is still faded (the item never leaves her); one that cannot is saved whole
(asset name, colour, Property, Craft, Difficulty) and taken off with `InventoryRemove`, then put back
with `CharacterAppearanceSetItem` plus the saved fields, as BC's own appearance loading rebuilds an
item. Only into an empty slot, so a shadow she put on mid-trance is kept. The crash path is the
same restore. `test/trance-eyes.mjs` 45 (+5), with the stub now carrying real layer minimums;
forcing the fade, dropping the empty-slot check, or dropping the craft restore each fails it.

### Changed 2026-11-11 (v1.10.1 RC) — eye choices trimmed, spirals hide the eye shadow

DW, testing v1.10.0: no Daydream, one hearts setting (Dazed, Spirals and hearts were the ones liked),
and "clear eye shadow setting for spirals and turn it back on when done". `TRANCE_EYES` is now
Unchanged, Dazed, Dizzy ("Spirals"), Heart ("Hearts"); a stored HeartPink becomes Heart and a stored
Daydream is dropped to Unchanged. With Dizzy, `applyTranceEyes` also saves the EyeShadow item's
`Property.Opacity` and sets it to 0, so the item stays on (a crafted one loses nothing) and R133's
`CommonDraw` draws it invisible (it clamps to the layer's MinOpacity, 0 for every EyeShadow asset).
`restoreTranceEyes` puts it back only while it is still 0, so a change she made mid-trance is kept,
and the same restore covers a crash. `test/trance-eyes.mjs` 40 (+10); dropping the hide or the
"still ours" check each fails it.

### Added 2026-11-08 (v1.10.0 RC) — her eyes while under

DW: "peek at how [LSCG] changes the eyes when you are hypnotized and see if we can do similar".
LSCG (read for technique only, rule 7) swaps the Eyes and Eyes2 items' asset to another eye type,
recolours them, sets Dazed eyes and lowered eyebrows, and saves the old eyes in its settings. Two
options were put to DW: BC's eye expressions alone (nothing permanent), or expressions plus a
colour (a real write to her eye items, which BC saves). DW chose expressions plus colour, off by
default.

New `src/eyes.ts`. `applyTranceEyes` runs from `applyTranceState`, after the clothing freeze's
snapshot. It saves each eye's colour and expression, and what it is about to set, to
`settings.eyesSaved` BEFORE touching anything. It sets the expression through BC's
`CharacterSetFacialExpression(Player, "Eyes", …)` (R133: that covers both eyes and refuses an
expression the group does not allow), sets the colour per colourable layer as BC does, then
refreshes and sends the appearance to the room. It does nothing if a saved copy already exists, so
a second apply cannot save the trance colour as her real one. `restoreTranceEyes` puts back only
what still matches what was set, so a mid-trance change by her or another add-on survives.

Every way out is covered: `endSession` and `totalStop` (safeword, hard floor, reset) call it next to
`clearTranceStates`; recovery's `releaseEverything` calls it; and `attemptRecovery` calls it for
every outcome except "resumed" and "waiting", which is the crash case. Changing either dropdown
mid-trance re-applies at once. The Trance Defaults dropdowns are now one generic `DropdownRow`
list (screen effect, eyes, eye colour), with shared create/remove bookkeeping.

`test/trance-eyes.mjs` (30): off by default; the choices are BC eye expressions; both on and back;
no double-save; a mid-trance change kept; expression-only and colour-only; a crash put right by
`attemptRecovery`; junk dropped on import; the wiring on every exit; and no asset swap. Dropping
the double-save guard, the "still ours" check, or the load-time restore each fails it.

### Changed 2026-11-08 (v1.9.1 RC) — the screen effect choice, three strengths, a real flash

DW, after seeing v1.9.0: "a little too dark still... Light, med and heavy"; the command's swell
should be "more sudden, more of a flash"; and since the spiral only worked with Screen Fade ticked,
"a selector box that has none, fade, and the 3 spiral options" instead of two tick boxes.

- **One choice, two stored values.** `features.tranceScreenFade` stays the switch (None is off), so
  session.ts, the wizard, recovery and every suite that reads it are untouched; the spiral is a
  sparse `spiralStrength` (absent means the grey fade). `getScreenEffect`/`setScreenEffect` are
  the only place the two meet. The `tranceSpiral` feature key is gone; `normalise` reads it from
  the stored blob before reconciling features drops it, and a ticked one becomes Medium.
- **Strengths.** `SPIRAL_ALPHAS` light 0.15, medium 0.25, heavy 0.36 (v1.9.0's only value), each
  scaled by the fade in proportion, so walking trance thins every strength the same way.
- **The flash.** Its own curve, not the glow's: linear up in 60 ms, then down as the square of what
  is left over 450 ms, so it falls fastest first. It restarts on every command, unlike the glow,
  which refuses to restart mid-swell because a drop to nothing would itself be a flash.
- **The menu.** A DOM dropdown at the top of the controls under the rows, in the toy mode
  dropdown's pattern: shown only while wholly in view, removed off its tab and on every exit. None
  takes the fade off at once (the old untick path); turning an effect on from None mid-trance
  says it starts with the next trance (rule 5), since there is no fade running to draw.

`test/trance-spiral.mjs` is 55 checks. Five mutations fail it: a slow rise, one fixed strength, no
re-flash, no migration, and None not turning the fade off. `menu-layout` drives the dropdown.

### Added 2026-11-08 (v1.9.0 RC) — the trance spiral

JAX (11-02) asked for a spiral screen overlay. DW, after LSCG's spiral got stuck on Missy's screen:
a spiral over the screen while hypnotized, with no grey fade under it, and the spiral flashing a
little when a command lands instead of the glow at the edge. Built as a way of drawing the fade
(`tranceSpiral`, off by default, needs `tranceScreenFade`) rather than a separate effect, so it
inherits everything the fade already gets right: the walking-trance thinning, recovery across a
reload, the step-aside while BC darkens her screen, and clearing on every exit path.

`drawTranceVeil` now takes her setting and colour from `main.ts` (effects.ts stays a leaf) and
returns whether the spiral drew; `drawCommandPulse` is told, and skips its glow and wash when it
did. The swell itself is one shared curve, so the spiral and the glow brighten on the same timing.
The spiral is three arms, 3.5 turns, built once per colour on a 1024 px offscreen canvas and drawn
rotated and clipped to the room half; ticking it with the fade off says why nothing shows (rule 5).
BC's VR headset spiral was looked at first: a still background, only while blind, and it hides the
room, so it was not the model. LSCG's overlay was the technique reference (rule 7), no code taken.

`test/trance-spiral.mjs` (32): off by default, no grey under it, the rect, strength, turning speed,
one build per colour, the swell with no edge glow, blind and awake, the no-canvas fallback, and
the wiring. Dropping the spiral draw, the swell, or the glow suppression each fails it.

### Added 2026-11-08 (v1.8.0 RC) — a Friends rung on the scope ladder

Lianne (11-07) asked for friends to be able to fire planted triggers; DW put the rung between
Lovers and whitelist. One ladder serves trigger scope and toy mode, so both gained it. Friendship is
BC's own (`Player.HasOnFriendlist`, R133 Character.js, through `CharacterIsOnList`), with
`Player.FriendList` as the fallback that `trust.ts` already reads. Checked after Lovers and after
the blacklist, so a blacklisted friend is refused, the same as a blacklisted whitelist member.

Because rungs are cumulative, adding friends below whitelist widens every save already on
whitelist, including the setup wizard's "Balanced" and "standard triggers" answers. DW chose to move
those saves down to the new rung rather than widen them silently: `normalise` moves a stored
`triggerScope` or `toyScope` of "whitelist" to "friends" once, and marks the save `friendsRung` so a
later deliberate whitelist is never moved again. New and reset saves carry the mark from
`defaultSettings`. An old export imported later is moved on the way in, which is right: it was made
when whitelist meant no friends. Dominants is not moved (design.md has why). v0.97's never-released
`friend` toy key now maps to the new rung instead of to whitelist.

Spoken: *"your friends can use it"* asks for the rung for one trigger, capped by her setting as
every scope phrase is. `test/scope.mjs` covers the rung on every level, the blacklisted friend, the
FriendList fallback and the move (both mutations, dropping the friend check and dropping the move,
fail it); `test/trigger-options.mjs` the phrase.

### Changed 2026-11-08 (v1.7.3 RC) — the spiral's hover label: version only, small

DW, after seeing it live: a smaller font, and no name, since the icon is already over the person.
Now `ECHS v<version>` (or `ECHS (older version)`) at a fixed 20 px, in a box sized to the text.
Drawn with `DrawText` under a saved and restored `MainCanvas.font`, because BC's `DrawTextFit`
(R133 Drawing.js:990) starts at 36 px and only shrinks to fit the width.

### Fixed 2026-11-08 (v1.7.2 RC) — /echs icons names BCT's hover setting

The cause of DW's missing spiral: BCT's "all icons only on hover" (`Player.BCT.bctSettings.
allIconOnlyShowOnHover`), which `patchFunction`s BC's `ChatRoomHideIconState == SHOW_ALL` check in
`ChatRoomCharacterViewDrawOverlay` to need the mouse over the top 70 px of a character. BC then
never calls `ChatRoomDrawCharacterStatusIcons`, so our hook never runs. BCT's own hearts are drawn
from its separate overlay hook, outside that check, which is why some icons still showed. Hypno
Helper, without that setting, saw the spirals. Decided: honour it, since it is the player's own
choice to hide every icon until hover; `/echs icons` now names it, reading BCT's setting only, and
the wiki says so. No change to drawing.

### Fixed 2026-11-08 (v1.7.1 RC) — the icon says why it isn't showing

DW's first live look at v1.7.0 (`Capture.PNG`, Missy and another player on 1.7.0): no spiral over
either, **including Missy's own**, which needs no message from anyone, so the drawing itself was not
happening. Reading found no cause: the hook and settings check out, the bundle is right, the mod SDK
allows several hooks from one mod, and the live game, **R133**, still calls
`ChatRoomDrawCharacterStatusIcons` from `ChatRoomCharacterViewDrawOverlay` with `DrawCircle`,
`DrawImageResize`, `DrawRect` and `DrawTextFit` intact (fetched from the live server: the local
clone is still R132, and `git pull` fails with a connection reset).

What did stand out is that the draw hook **swallowed every error** (rule 5), and `installBadge` put
three hooks behind one `safely()`, so a throw on the first would have left the draw hook missing
without a word on screen. Now each hook is installed and recorded on its own, the last drawing
error is kept with its time, and `/echs icons` reports: which hooks took, how many times BC asked us
to draw and how many times we drew, the last error, why a frame was skipped, both settings, BC's
icon state, the game version, and who in the room has answered. No behaviour change otherwise.

### Added 2026-11-08 (v1.7.0 RC) — the ECHS icon over players

Biker asked twice (10-22, 11-02) and Lianne once (11-07) for a sign over ECHS players. DW's worry was
landing on another add-on's icon, since each add-on picks its own spot and there is no registry.

**Where.** Every add-on in FUSAM's manifest (45) was downloaded as served and searched for what it
draws over characters; 22 draw something. The full map is `docs/addon-icon-survey.md`. The top row
is BC's own icons at 30-190 and 310-430, with BCT, Secret Prison, MBCHC and BC+ on the left and
WCE, MoonCE, BCX, LSCG, Echo and BC Neko on the right. **x 228-258 is the one slot nobody uses**,
between BC+ (to 226) and WCE's text (from about 260). The second choice, below the row on the far
left (x 10-50, y 45-85), is also empty. DW's decisions: default on; the spiral; the viewer picks the
spot (Top row / Below, on the left / Off), because a clash depends on which add-ons the viewer runs.
KikiLink, which lets its badge be dragged, is the same idea taken further.

**Who.** `state-query` and `state-response` now carry `version` and `showIcon`. On a new room this
client asks the whole room once (the same room at most once a minute); everyone answers the asker,
and the ask itself tells them about us. Someone who arrives on an older build never asks, so after
4 s unheard they are asked directly. An older build's messages carry no `showIcon` and count as
showing it. The room-wide ask comes back to the sender and is now ignored there (`remote.ts`).

**Rule 1.** "Show others that I run ECHS" is hers: off, her client still answers (the hypnotist's
panel needs to know ECHS is running) but says not to draw it, and changing it re-tells the room.
The spot is a display choice that changes nothing about her, so the Extreme lock does not grey it.

**Drawing.** After BC's `ChatRoomDrawCharacterStatusIcons`, which BC only calls while every icon is
shown, so BC's hide-icons button hides ours too. A light disc behind the spiral, 30 at room scale.

**Tests.** `test/echs-icon.mjs`, 29 checks. Three deliberate mutations of the built code (wrong
slot, ignoring `showIcon`, answering our own ask) each fail it.

### Added 2026-11-08 (v1.6.0 RC) — induction time, and toy mode takes one

DW's note on `script_test.md` B.1 (v1.5.0): in toy mode there was no pause, so the hypnotist could
tell. DW's decisions (2026-11-08): toy mode runs an induction; its length is a setting; the setting
applies to **every** induction, not only toy mode; default and maximum 60 s, minimum 10 s (not 0, so
toy mode never looks instant).

**Setting.** `inductionSeconds` in storage, sparse (absent = 60), one of 60/45/30/20/10 on a
click-to-cycle row at the top of the Inductions tab's answer-for-me rows (a typed box would have been
another DOM control to hide and show inside the scroll area). `getInductionSeconds()` clamps anything
else into 10-60, so an import with an odd value still lands somewhere sane. Read when the window
opens and fixed for that window. Locked by the Extreme lock like its neighbours; the templates
leave it at 60.

**Toy mode.** `toyInduction` now marks the session `toy` and opens the ordinary window
(`beginInductionWindow`: the presence gate, the room line, the presence watch). `runInductionRoll`
lands it via `toyLand` instead of rolling. A choice typed mid-window is answered "it takes you
whatever you do" (rule 5) rather than "you brace against it", which would have been a lie.

**Countdown.** `session-update` sent `windowRemaining: 60000` on every push during a window, so any
mid-window update restarted the hypnotist's countdown at a minute. It now sends the time really left
(`windowEndsAt`), which a shorter window needed anyway.

**Tests.** `induction.mjs` matches the window to the setting (so a window of the wrong length fails),
adds the safeword mid-window, the fight message, the steps and clamp, and the countdown at 30 s and
12 s in. `menu-layout.mjs` scrolls each of the five rows into view, since they no longer all fit.

### Fixed 2026-11-08 (v1.5.2 RC) — each command's beat follows the last; a stale "just now"

Both from DW's live run of `script_test.md` on v1.5.1.

**G.1, the beat.** `enqueueCommand` set `due = max(now + delay, lastDue + 500 ms)`, so a second command
said during the first one's beat counted its own 2 to 5 s from when it was said, and often landed
half a second after the first. DW: "it would look more natural from when the last command finished."
Now `due = max(now, lastDue) + delay`: every command gets a full beat after the one before it. Three
commands said together can take up to 15 s to land; a wake, a release or the safeword still cuts
in at once, and a control line ("that will stay with you") still flushes the queue.

**J.4, the heading.** `planted.ts` kept `askedAt` and `answered` per subject indefinitely. After one
`/echs planted Missy` while she was here, asking again once she had left skipped the ask (correctly)
and then read the old answer as current: "They answered just now." `forgetAsked` now clears both for
anyone not in the room before the list is printed, so it reads "Last known <date>". The suite asked
"not here" before "here", which is the order that hides it; it now does both.

### Fixed 2026-11-08 (v1.5.1 RC) — a pose bondage blocks is refused, not queued

DW's live run of `script_test.md` D2 (leg binder, "when I come back, you will kneel"): the room was
told Missy knelt on each arrival, she could not, and she knelt when the binder came off.

**Cause.** BC's `PoseSetActive` (R132 `Pose.js:201`) writes `ActivePose` with no check of what is
worn. What is drawn is decided afterwards by `PoseRefresh`, which filters `ActivePose` through every
item's `AllowActivePose` into `PoseMapping`. `setSuggestedPose` judged "landed" by `ActivePose`, so
every known pose landed, the success line went out, and the wish sat in `ActivePose` until the item
that blocked it was removed. The v1.4.0 refusal path (easy's report) never ran live for the same
reason; the test stub modelled BC as ignoring a blocked pose, which BC does not do.

**Fix.** Ask BC's `PoseAvailable` before writing, and judge the result by `PoseMapping`; if it is
not drawn, put `ActivePose` back before anything goes to the room. `PoseAvailable`, not
`PoseCanChangeUnaided`: the latter also refuses for Freeze and the owner's BlockChangePose rule, and
a spoken command moving a held-still subject is settled (DW, 2026-09-26). The stub in
`test/compulsion-refused.mjs` now behaves as BC does; on the old code it fails 10 of 19.

### Added 2026-11-05 (v1.5.0 RC) — trust list search and a [x] on each row

Senge and Eri asked for a search; Valerie for a button instead of typing `/echs forgettrust`.

**Search.** A trust entry stored one name: the nickname if there was one. So an account name could not
be found once they left. `accountName` is now stored beside it whenever the character can be read, and
the match also reads the live character. An older entry for someone absent has only the one name until
they are next seen. It filters as typed and works while locked, since it is reading, as paging is.

**[x].** Two clicks within 5 seconds, as Clear All, because it cannot be undone and the buttons stack
one above the other. Draw and click both read `statRowsOnPage`, so a row's button cannot act on anyone
else on a filtered or later page. Disabled by `settingsLocked`, though `/echs forgettrust` is left open
under the Extreme lock, as DW chose in v1.4.0: the screen is read-only, the command was kept. Under
that lock the rows are hidden, and the click is refused too, since an undrawn button keeps its
coordinates.

**Also repaired: garbled characters in `effects.ts`.** A throwaway test step in the v1.4.1 work rewrote
the file through PowerShell 5.1's `Get-Content -Raw`, which reads UTF-8 with no BOM as Windows-1252, so
every non-ASCII character became mojibake. It reached `dev` unnoticed in 29 lines: comments, and two
console-only log messages, so no player saw it. Repeating the step on `menu.ts` here broke the title
test, which is how it was found. Confirmed clean by diffing against the last version before it.

### Fixed 2026-11-05 (v1.4.4 RC) — "take them deeper" only where deepening helps

DW: check whether they are earned-only or allow arousal, and pick the best message. `deeperHint` reads
`effectiveEarnedOnly`, so the trigger refusal gets its advice back when opened to arousal (v1.4.3 removed
it for everyone, which was wrong there), and the carry refusal, always earned-only, never gets it.

The "too faint" refusal needs more than that setting. Opened to arousal, with earned depth clearing the
gate, a trigger still plants at earned depth, so `plantedChemical` decides: it says what a plant would
actually read. Its earned wording is new: it says going deeper will not help, and that more trust and a
new induction will.

### Fixed 2026-11-05 (v1.4.3 RC) — an earned-depth refusal shows the full depth too

DW's report: "could not get them past 44", with "sink deeper" at Blank. No ceiling or code path holds
anyone at 44, and a simulation from 44 got past it. The likely reading is this refusal: `depthRefusal`
named only the earned depth, which deepening never raises (decided v0.95.0, and DW kept it: triggers
need earned trust). So the number stayed at 44 however deep she went. Not confirmed against DW's test.

Now, when they differ: "at 90 [Blank] but only 44 [Entranced] earned". Equal, it reads as before. The
trigger refusal also loses its second sentence, "Take them deeper first; arousal does not count toward
this one", at DW's say: deepening cannot satisfy it, it repeated the arousal clause, and it is probably
what sent DW to "sink deeper". The rest of the wording is unchanged at DW's request.

### Changed 2026-11-05 (v1.4.2 RC) — a slower pulse, and her own colour for it

DW, after seeing v1.4.1 live: 1.4s was still a little fast, so 1.8s. A command landing during a pulse
gets none of its own for that much longer, which the beat's spacing makes rare but not impossible.

Custom colours in BC's hex codes. Checked against R132 `CommonIsColor`: #RGB and #RRGGBB, plus up to 8
digits with `allowAlpha`, which is what `ColorPicker.js` copies for an item with opacity. So a pasted
code works, with its alpha dropped since the pulse sets its own strength. `parsePulseHex` is the only
way in, on typing and on load, because the result goes into a canvas colour string. A refused code
says so and stays in the box to correct (rule 5). The saved colour survives picking another one.

### Fixed 2026-11-05 (v1.4.1 RC) — the pulse could not be seen

DW's first live look: the trance screen "changed color a little bit", with no pulse to see. It was
running. It was too small: a 42px ring out of a 2000px canvas, 55% only in its outer 7px, over half
strength for about 0.7s, pale through the 30% white veil, and on the far side of the screen from the
chat. Set low to avoid flashing, and too low. The suite passed because it asked whether fills
happened and how they swelled, never how big or strong they were; it now pins both.

DW chose the glow plus a tint: 120px wide with a squared falloff, peak 0.8, 1.4s, and a 0.18 wash over
the whole view at the peak. Still a sine swell. A command mid-pulse no longer restarts it: that dropped
it to nothing in one frame, a real flash, and a stronger pulse would have made it obvious.

### Added 2026-11-05 (v1.4.0 RC) — the beat, the pulse, the planted list, and holds across a wake

Four items from the feedback list, each shaped by DW's answers the same day.

**The beat (DW's "slight pauses after commands").** 2 to 5 seconds, the mean of three rolls so the
edges are rare. `handleSpokenLine` splits at `landCommand`, and the WHOLE of that runs when the beat is
up, so every gate answers for that moment: a permission revoked in the beat is refused, and no gate
had to be written twice. Wake, release and the safeword do not wait. Three traps, each with a check:
- *Order.* Two rolls could swap "kneel" and "stand", so each waits for the one before it.
- *A release overtaking what it releases.* "You cannot move" then "you can move" would otherwise end
  frozen, with nothing left to undo it. A release lands the queue first, then itself.
- *Lines that act on the last command.* "That will stay with you" must find it applied, and a queued
  command must not land inside a trigger that started recording. Those flush first (`isControlLine`).
A wake or safeword clears the queue through `onTeardown` and the timer through `clearAllTimers`.
Refusals wait too, since they come out of the same run. The suites run without the beat
(`isUnitTestBundle`); the shipped build has it, testing room included. `setCommandPacing` turns it on
for `test/command-pace.mjs`.

**The pulse (JAX, 11-02).** `commandPulse`, on by default, with a colour on the Trance Defaults tab.
A sine swell over a second, so it cannot flash. Refused commands do not pulse. It steps aside while BC
darkens her screen, as the veil does. That tab now scrolls.

**The planted list (Eri, 10-04).** `src/planted.ts`. The subject answers only about the asker's own
triggers, in words, with a band and never the number. Notes on the hypnotist's client cover anyone
not in the room, marked last known, and are only ever displayed (rule 1). No new message types:
`messaging.ts` prints an unknown type as raw text on an older build, so the list rides on `state-query`,
`state-response` and `trigger-status` as an extra field. Notes can go stale for someone who never
returns, and there is no way to clear them short of a reset; capped at 50 subjects.

**The panel (DW).** Movement, Clothing and Kneel buttons removed: testing leftovers. `remote-request`
keeps a handler that does nothing, so an older hypnotist's press is not printed on the subject's screen.

**Holds across a wake (Valerie, 10-31; DW's choice).** Reported as "tranced removes it"; what was
actually found is that a trance carries a hold and the WAKE ended it. `onWakeKeep` reads holds before
`endSession`'s total clear and restores them after, using the reconnect path (`restoreHold`), so the
clear stays total. Only a hold that started before `hypnotizedAt`. Fired during the trance ends with
it; a hold with no recorded start (after a reload) ends too, as before. A used-up one-shot is re-saved,
because the teardown sweep deletes it. Known edge: a hold whose pose the hypnotist changed during the
trance goes back on at the wake. The safeword and hard floor never ask. Not confirmed with Valerie.

### Fixed 2026-11-05 (v1.4.0 RC) — a compulsion's refused pose stops telling the room

easy (feedback, 11-01): a "when someone comes in" compulsion, every time, while tied up. `fireTrigger`
announced `pose-blocked` on each arrival, a public emote, and the safeword leaves arrival triggers
planted by design. A compulsion goes off with nobody asking, so the room has no reason to watch it
fail. `tellPoseRefused` says so privately instead, once per compulsion per page load (rule 5), and
names `/echs forgettrigger` unless the Extreme lock would refuse it. Scoped to `trigger.fireOn`: a word
said aloud was aimed at her, so its refused pose stays public, as do spoken commands. A refused pose
still counts as holding, as before, so forgettrigger waits for it to let go; the line says so.
This matters more now, since under the lock nobody can remove such a trigger.

### Changed 2026-11-05 (v1.4.0 RC) — DW's review of what Extreme does

DW asked whether Extreme was extreme enough. What changed, each DW's answer in that review:

- **Lock:** `/echs carry drop` refused. **Left open by choice:** `/echs forgettrust`, and the player
  preferences a setup leaves alone (release on disconnect, show trigger words, hide trigger setup).
- **Template:** trance clothing freeze on (replacing job2.md's "off until verbally commanded"),
  chemical scope "both", toy mode "Everyone, except
  blacklist". That last one means a stranger can put an Extreme subject straight under at Blank, so
  the template's blurb now says so; the warning screen only covers the lock.
- **Refused:** `/echs kneel` and `/echs stand`, which bypass every gate and would undo a pose a
  hypnotist set.
- **Hidden:** trust and experience on the Stats tab, `/echs chance`, `/echs skill`, `/echs gates`,
  and the depth and progress in `/echs session`, which still says she is under. The tab stays
  because it holds Export and Reset, and Reset is a documented way out. `/echs chance` is also a
  hypnotist's tool, so an Extreme player loses it when hypnotizing others too.
- **Trance length:** 60 minutes per "stay" while locked, read from the subject's own settings. The
  expiry line on the hypnotist's client no longer names a number, since that client can't know it.
- **Trigger decay stays "very slowly":** DW kept the 09-29 decision when offered "Never".

**Under the lock, triggers can only be added. Reverses part of v1.3.0, at DW's request.** v1.3.0 let the planter's spoken removal through the
lock, reasoning that the lock is about the subject escaping, not the planter withdrawing. Missy's
feedback of 11-05 reported that against the earlier rule, and DW's call is that while locked nobody
removes a trigger. `handleTriggerRemoval` refuses once it has found something of the sender's to
remove, so "I take back what I said" stays conversation and a word that isn't theirs gets the same
reply as ever, which keeps another hypnotist's word unconfirmed.

Still working under the lock, on purpose: named release (lets go, stays planted), the safeword,
and the automatic endings (fading at the very slow rate, one-shots being used up, the safeword
discarding after-waking compulsions). A deeper planter can still override a word under the usual
phrase-uniqueness rule. The Extreme warning now says it, since that is what the player is agreeing
to. Consequence accepted: a planter who regrets a trigger cannot take it back until the lock ends.

### Added 2026-11-02 (v1.3.0 RC) — the hypnotist can remove a trigger they planted

DW asked for it, installer only. Until now only the subject could delete a trigger
(`/echs forgettrigger`); release undoes the effects but leaves the trigger to fire again, and a
compulsion has no word to release by. `handleTriggerRemoval` (voice.ts), before trigger control so
its bare "forget the trigger" cancel can't swallow "forget the trigger <word>":

- **One:** "forget / remove / erase / delete the trigger <word>", "the trigger <word> is gone", and
  "I take back <word>". The last only counts when it names one of theirs, so "I take back what I
  said" stays conversation. Longest phrase first, their phrase triggers only.
- **All:** "forget every trigger I gave you" / "forget all your triggers": every trigger they
  installed, compulsions included. Never anyone else's.
- **Gates:** installer only (`installedBy === sender`), even where her scope lets others fire it:
  release is open because undoing can't hurt, deletion wipes out someone's work. Her name required.
  No trance required: removing can only help her. Not through the Extreme lock's
  forgettrigger refusal either, since the lock is about her escaping, not the planter withdrawing.
- **Holding:** undone first (`undoTrigger`, which also cancels the queued paced steps), then
  `forgetTrigger`, so nothing is stranded.
- **Said (rule 5):** the hypnotist hears removed / removed N / nothing of yours by that name. That
  last reads the same for someone else's word and for none, so no other hypnotist's word is
  confirmed. The subject is told something is gone, never the word.
- **Never fires:** a removal line is always claimed, and one not addressed to her ("Ella, forget the
  trigger frozen") returns before firing, the same guard the release got in v1.2.2.

Tests: new `test/trigger-remove.mjs`, 40 checks.

### Fixed 2026-11-02 (v1.2.2 RC) — "you are released from <trigger>" not always releasing

DW: reports that the named release "is not stopping triggers always". Four causes, all reproduced
in the new `test/trigger-release.mjs` (10/26 on the old code, 26/26 now):

1. **Compulsions matched every release.** A delayed compulsion is stored with `phrase: ""`, and
   `triggersReleasableBy` used `text.includes(t.phrase)`, which is true for `""`. With a
   compulsion earlier in the list (easy's arrival trigger is one), `[0]` was the compulsion: it was
   "released", the subject was told "lets go", and the named trigger kept holding. Now phrase
   triggers only, longest phrase first (so a pre-overlap-rule "sleep" can't shadow "sleepy time").
2. **The paced drain outlived the release.** `drainTriggerSteps` applies actions 1.2 to 2 s apart
   under `trigger-drain:<installer>:<key>`, and a mantra is one step per repetition. `undoTrigger`
   cancelled the auto-release timer but not the drain, so a quick release let the remaining steps
   land after it with nothing to undo them. `undoTrigger` now cancels the drain too.
3. **An unscoped release line fell through to firing.** When `scopeToAddressee` returned
   `text: null` (ambiguous, or addressed only to someone else), the release handler never ran and
   `handleTriggerFiring` read the whole line, so the trigger word in it FIRED. A release line now
   never fires: ambiguous ones release (releasing needs no name and can't harm), ones for someone
   else do nothing.
4. **Silent outcomes (rule 5).** No match was console-only, and "lets go" was told even when
   nothing was holding. The hypnotist now hears released / not holding / nothing by that name (the
   last only if they have planted in her or have her under). The subject hears "lets go" only when
   something did.

Found while writing the suite, same root cause as 1: `phraseAvailability` also compared against
the compulsion's `""`, so one planted compulsion refused every new trigger word ("Your own ""
already overlaps this", or the vague refusal if someone else planted it). Now phrase triggers only.

### Fixed 2026-11-02 (v1.2.1 RC) — strip misses the suit, outerwear and Echo's slots

DW asked that strip remove all Echo clothing. Checking `UNDRESS_ORDER` against the live R133
`Assets/Female3DCG.js` (32 groups with `Clothing: true`) found a worse bug first. `"SuitTop"` is not
a BC group, because the slot is `"Suit"`, so an undershirt or bodysuit was never removed. That is
Eri's 09-24/10-02 "include the upper suit" feedback. Added `ClothOuter` (BC's own outerwear
group), `ClothAccessory`, `Corset`, `Garters`, `SocksLeft` and `SocksRight`, and moved Shoes before
Socks.

Echo (`SugarChain-Studio/echo-clothing-ext`, `src/components/功能调整/复制身体区域.js`) registers
copies of BC groups through `AssetManager.addCopyGroup(mirror, source)`, always named
`<source>_<suffix>` (`Cloth_笨笨蛋Luzi`, `ClothLower_笨笨笨蛋Luzi2`, `Bra_笨笨蛋Luzi`...). `wornGarments()`
now reads `Player.Appearance` and ranks each worn group by its prefix, so any copy of a stripped
slot comes off right after BC's own, including copies Echo adds later. Copies of slots strip leaves
alone (`Necklace_`, `Hat_`, `Mask_`, `Luzi_Jewelry_0`) stay on. Echo's one new clothing group that is
not a copy, `长袖子_Luzi` (long sleeves), is mapped to Cloth by hand. Echo is being merged into
BC, so its pieces may move into BC's own groups. Either way they are covered. Tests: 8 new in
`test/undress.mjs`, which fail on the old list (22/30).

### Added 2026-11-02 (v1.2.0 RC) — "Stay under?" when the thirty minutes run out

DW asked for it. The timeout used to end a trance outright, so a scene both people were enjoying
was cut off at thirty minutes. Now `sessionTimer` calls `askToExtend()` instead of
`expireSession("here")`. The trance holds, a box like the induction prompt asks (prompt.ts), and a
60-second `extendTimer` runs. **Silence ends the trance**, exactly as the old timeout did. Staying
under is something the subject chooses (rule: consent is the subject's), never what happens because
they looked away or were AFK. A yes (`answerExtend(true)`, from the box or the new `/echs stay`)
re-arms a fresh thirty minutes through the one `armSessionTimer()` that every way into trance now
uses, and is asked again when that runs out. The hypnotist gets two `trigger-status` lines: one when
the subject is asked, one if they stay. A no only wakes them early. `clearTimers()` takes the box down
with the trance, so the safeword, a wake or the hypnotist leaving all end it.

Not asked on the away path: a trance that ran out while logged out still ends on reconnect
(`expireSession("away")`). A reload while the box is up does the same, because the saved deadline has
passed. That's acceptable, since nobody was there to answer. Tests: `test/extend.mjs` (25), and
`test/expiry.mjs` lets the question lapse before checking the ending.

### Changed 2026-11-01 (v1.1.1 RC) — "Stop following me" releases a follow

DW asked for it: the natural thing to say had no pattern. `follow-release` gains
`(stop|quit|cease) following (me)`, `(do not|don't) follow me`, `no (more|longer) following (me)`,
and `need to` beside `have to` in "you don't have to follow me". "Don't follow me" contains "follow
me", so it relies on the release being listed before `follow-block`, as every release is. "Keep
following me" matches nothing, and is tested to stay that way.

**The walking-trance clash.** While walking, `WALK_LEAVE_PATTERNS` takes any line with a bare
`stop` and returns her to full trance, consuming the line, so "stop following me" would have
left walking trance and kept the follow on. That pattern is now `stop` not followed by
"following". `test/follow.mjs` checks it, and was seen to fail with the old pattern.

### Changed 2026-11-01 (v1.1.0 RC) — Follow / leash rebuilt on LSCG's technique: no leash item, no Hold Leash

**Reported broken by a tester, 2026-11-01.** The v0.77.0 design was never given the two-account run
its own entry asked for. Read against the live R133 client (BC's leash code is unchanged from R132),
it failed in two ways:
- *"Follow me"* only injected a `"Leash"` effect onto the subject's Emoticon item, making them
  leashable. The hypnotist still had to open the subject and click BC's **Hold Leash**, and nothing
  told them to. The room line ("as though on an invisible leash") announced a leash that was not on,
  against rule 5.
- `Asset.AllowEffect` is client-local, so every client without ECHS strips the injected effect in
  `ValidationSanitizeEffects`. A hypnotist without ECHS never got the option at all. The v0.77.0
  entry's "works with a hypnotist who has no add-on" was wrong.

**The new mechanism is LSCG's** (`src/Modules/leashing.ts`, its `"compulsion"` grab type and the
arm and ear grabs), reimplemented, with no LSCG code (rule 7). BC still does the room move.
- **Subject:** while compelled, `ChatRoomCanBeLeashedBy` answers true for the leader with no leash
  item (still false when the room blocks Leashing or the subject is Tethered, Mounted or Enclosed).
  `ServerHandleLeashBeep` stands the leader in as `ChatRoomLeashPlayer` for its synchronous check,
  which runs before its first await, and puts the real value back, so a real leash someone else
  holds is untouched. `ChatRoomCanLeave` is false while the leader is in the room, and not after,
  so a failed follow (a locked or full room) cannot strand the subject. A second beep for the room
  being joined is ignored; LSCG found that one pulls the follower back out.
- **Hypnotist:** the subject's client sends `follow-on` / `follow-off`, and the hypnotist's adds a
  `"Leash"` AccountBeep to each follower on every `ChatRoomPingLeashedPlayers`. A Leash beep is not
  limited to friends. The subject re-sends `follow-on` (quietly) whenever the leader is seen in
  the room again, because a reload on the hypnotist's side forgets its followers.
- **Rule 1 holds.** A beep moves nobody unless the subject's own client has a compulsion on, from
  that sender. Nothing the hypnotist sends turns one on.
- **Rule 5.** `applyFollow` refuses when the subject's `AllowPlayerLeashing` is off (BC's beep
  handler returns at once without it) or the room blocks leashing. The suggestion then returns the
  new private key `follow-unavailable`, and the hypnotist is told the reason. With no `follow-ack`
  within 8 seconds, the subject is told the hypnotist isn't running ECHS.
- **It follows whoever said it**, which for a trigger is the trigger's speaker, as `design.md`'s
  trigger table always said. It used to follow the session's hypnotist.
- **Reload:** the follow is now saved with its leader (`SavedSession.follow`). A v1.0.1 save that
  has `"Leash"` in `effects` restores as a follow of the saved hypnotist, and the leftover effect is
  taken off. `"Leash"` stays in the managed lists only so that a leftover from an older version is
  still recognised and removed.
- **Living alongside LSCG:** both add-ons hook the same four BC functions, and each acts only for its
  own pairings and passes everything else on. This has not been tried live yet; it is in
  `script_test.md`.

`test/follow.mjs` (40 checks) covers both sides. Still owed: a live two-account run, which is
`script_test.md`.

### Changed 2026-11-01 (v1.0.1 RC) — FUSAM loads ECHS from GitHub Pages, with an icon

No add-on code changed, so no bump. The FUSAM entry drafted on 2026-10-28 used `"type": "eval"`,
because raw GitHub serves `text/plain` with `nosniff` and FUSAM's `"script"` type loads with a
`<script>` tag, which the browser then refuses. When DW posted the entry in the BC Scripting
Community Discord, it was pushed back on: `eval` is disliked there, and only 3 of the 44 listed
add-ons use it. Freya (FBM) said to deploy on GitHub Pages instead. Checked 2026-11-01: Pages serves
`.js` as `application/javascript` with `Access-Control-Allow-Origin: *`, which is how the FBM and
SlimeBeep listings load as `"script"`. A claim in the same thread that Pages serves the wrong type is
not borne out.

- New `.github/workflows/pages.yml` publishes `main`'s and `dev`'s `cdn/HypnosisAddon.js` and
  `pages/icon.png`. Pages deploys from `main` only, so a push to `dev` dispatches a run on `main`,
  which rebuilds from both branches.
- `pages/icon.png` is the `src/icon.ts` spiral, rendered at 256×256 on a pale `#ece8f7` tile. On its
  own, the navy line almost vanishes on FUSAM's dark icon background (`#353535`).
- The Tampermonkey loader already injects the bundle with a script tag, so the bundle needs no change
  to load this way.

### Fixed 2026-10-28 (v1.0.1 RC) — ECHS starts once per page, however many loaders run it

Found while preparing the FUSAM listing. FUSAM loads `cdn/HypnosisAddon.js` itself, and a player can
easily keep the Tampermonkey loader installed as well. Nothing stopped two copies starting. The
second would re-run `main.ts`, installing every hook, `ChatRoomRegisterMessageHandler` and interval
again, so a sip would be dosed twice. `registerMod`'s `allowReplace` replaces the SDK hooks only, not
BC's message handlers or our timers. The bookmark loader had the same gap.

- New entry point `src/index.ts`. It sets `window.__ECHS_LOADED__` to the version synchronously,
  then `import("./main")`, which esbuild inlines, so the bundle is still one file. A later copy that
  finds the flag set logs a console warning naming both loaders and starts nothing. `build.mjs`
  builds the dev userscript and the CDN bundle from `index.ts`.
- `main.ts` now runs one microtask after the script, instead of during it. Nothing reads ECHS
  synchronously after injecting it: the loader only waits for `onload`.
- New suite `test/load-once.mjs`. It runs the real `dist/HypnosisAddon.js` in a `vm` sandbox: twice
  in one page, then once in a page already claimed. It counts `main.ts`'s "script loaded" line.
  With the guard disabled, 3 of its 6 checks fail, so it is not vacuous (rule 6).

### Decided 2026-10-28 (v1.0.0 RC) — the 1.0 release candidate, and a `dev` branch

DW: "I want this merge to be version 1.0RC for release candidate. I also want to copy it to make a
dev branch at the same time." This merge carries the `/echs` change below; it was cut as v0.101.1
and renumbered before it shipped.

**Numbering: plain `1.0.0`, labelled "RC" on screen (DW chose this over `1.0.0-rc.1`).** The
version string is also two other things: the loader's `@version`, which userscript managers compare
to decide on an update, and the jsDelivr fallback tag (`v<version>`, `purge-cdn.yml`). Managers do
not agree on pre-release suffixes. A dot-split compare reads `1.0.0-rc.1` as having a fourth
segment, and so as *newer* than a later `1.0.0`. That would have stranded RC installs on the RC
loader and its pinned fallback tag, which is the v0.100.5 failure again. So:
- `package.json` gains `releaseLabel: "RC"`. `build.mjs` defines it as `__RELEASE_LABEL__`, and
  `log.ts` exports `RELEASE_SUFFIX` (" RC" or ""). The banner, the loaded toast and both
  settings-screen titles append it right after the version. `CDN_TAG` and `@version` never see it.
- **Going final** means deleting `releaseLabel`. If no code changes, that is still a patch bump
  (1.0.1), because the label is compiled in. Fixes during the RC are 1.0.1, 1.0.2 and so on.
- The test builds define the label as empty, `banner.mjs` checks that every version display
  carries the suffix, and `bookmarklet.mjs` (which builds on its own) got the define too. Without
  it that suite threw `ReferenceError` and `npm test` exited 1.

**`dev` branch:** a copy of `main` at this release. Ongoing work branches from and merges into
`dev`; a release is `dev` → `main`. The loader reads `main`, so nothing on `dev` reaches players.
`CLAUDE.md`'s flow says so.

### Changed 2026-10-28 (v1.0.0 RC, cut as v0.101.1) — `/echs` everywhere players look; `/hypno` stays as an alias

DW noticed the in-game help still said `/hypno` after the drug tag became `[echs:]`. The decision:
`/hypno` keeps working, and it is named in exactly one place, a note on `wiki/Commands.md`.

- Every `/hypno` in `src/` became `/echs`. That covers the help screen, the bare-command menu,
  `/echs commands`, the startup banner, and every reply and notice (141 occurrences). The menu line
  "(/echs is the same command as /hypno…)" is gone.
- `COMMAND_TAGS` is now `["echs", "hypno"]`. BC's own `/help` has no way to hide a registered
  command (R132 `CommandsHelp.ShowForPartial` lists all of `GetCommands()`), so `/hypno` is
  registered with the description "Same as /echs" rather than the full name.
- The README and the player changelog's older entries were reworded to match.
- New suite `test/echs-name.mjs`. It builds the shipped bundle, where comments are stripped, and
  fails on any `/hypno`. It also checks that the `hypno` tag is still registered. `alias.mjs`
  still proves `/hypno` runs the same command, and several suites still type `/hypno` on purpose.
- `CLAUDE.md` rule text updated to match.

### Added 2026-10-28 (v0.101.0) — crafted drinks and cigarettes: `relax` and `stimulate`

The *Drug System* from `design.md`, first two drugs. New module `src/drugs.ts`.

**What DW decided, in order:**
- Drugs give a **temporary** boost, not stored trust. Rule 4 holds as written: the level is never
  saved, decays 1/min, and the total stop clears it.
- `relax` and `stimulate` first; `sedate`, `restore`, `extend` kept on the Todo list.
- A cigarette **builds while in her mouth**, with a lower cap than a drink: drinks ±40 (15 a sip),
  cigarettes ±20 (3 a minute).
- **Opt-in kept:** the default chemical scope stays *Arousal only*.
- **Then, mid-build, the stacking rule reversed:** drugs ADD to arousal. The design doc's `max()`
  rule is marked superseded. `chemicalLevel()` in `session.ts` is now `arousalLevel() +
  countedDrugLevel()` and replaces `arousalLevel()` at its four consumers (landing access, full
  depth, deepen, surface). Earned depth still never sees it.

**How it reads the item, verified against the R132 client:** `SipItem` is published with
`ActivityName` and the target in the message metadata, and the cup is the **actor's**
`ItemHandheld`. `ServerAppearanceBundle` syncs `Craft.Name` and `Craft.Description`, so the
subject's client reads the giver's craft directly. The giver needs no add-on (rule 1). A
description may be UTF16-packed, so it is run through `CraftingDescription.Decode`. BC has **no
smoking activity**: the Cigarette is `ItemMouth`, or `ItemHandheld` with typed options In Mouth (0,
the default) / In Hand (1). So a cigarette is polled once a minute rather than caught as an event.
Technique reference: LSCG's `injector.ts` reads the actor's handheld Craft on `SipItem` the same
way. No code is taken (rule 7). LSCG matches plain words ("mind control", "hypnotizing"), so our
bracketed `[echs:…]` tags can't collide with it in either direction.

**Two things the new suite caught before shipping:**
- The total-stop hook was first registered inside `installDrugs()`, so it was missing wherever
  install had not run. `teardown.ts` asks for module-load registration; it now does that.
- A cigarette still in her mouth would have started dosing again a minute after a safeword. It is
  now "stubbed out" until removed.

**Rule 5:** an untagged drink stays silent, since it isn't ours. A tagged one with drugs not
counting says so and names the setting. A dose at the cap says it can't go further. `/echs drugs`
shows the level, and `/echs gates` and `/hypno chance` include it.

Tests: `test/drugs.mjs`, 46 checks.

### Changed 2026-10-28 (no bump) — `test/loader.mjs` tolerates CRLF checkouts (#91)

On a Windows checkout with `core.autocrlf`, `meta.txt` arrives with CRLF line endings, so the
header values kept a `\r` and three loader checks read `""`. The header is now split on `\r?\n`.
The shipped files were never affected.

### Changed 2026-10-03 (v0.100.6) — wiki audit fixes; the wiki shows only `/echs`

A second AI audited `wiki_combined.md` (DW's `echswikiAudit.txt`). Every claim was checked against the
code first. 10 of 13 were real; the two "direct conflicts" were not (the wiki's Extreme = 20 matches
`wizard.ts`, and the earned-only/arousal-ok button exists).

**Changes:**
- Documented, each confirmed in the code (and the phrases run through `matchSuggestion`):
  - the hypnotist leaving: 5 minutes in a trance (RECOVERY_WINDOW_MS), 30 seconds during an
    induction, and no try spent;
  - triggers surviving a reload (absolute `until`, so offline time counts);
  - multi-target lines (`splitSegments`);
  - unstutter;
  - "you'll be stuck";
  - the wider denial wording, and that an "until" clause does not lift a denial;
  - `((double))` OOC;
  - the 30-second held-notice gap.
- How-Inductions-Work §7 no longer says the induction controls are on Permissions.
- The player changelog's v0.99.0 entry now says what Extreme does.

**Decided (DW, 2026-10-03):** the wiki shows only `/echs`. In-game text keeps `/hypno`, and both
prefixes still work. The version bump is DW's call; no game code changed.

### Fixed 2026-10-03 (v0.100.5) — the jsDelivr fallback is pinned to the release tag

The "Purge jsDelivr cache" job failed on every release from v0.99.0 to v0.100.4: five purges a run,
and jsDelivr kept serving v0.98.4 at `@main`. Its lookup of what `main` means had stuck, the same
failure as v0.91.3 (2026-09-26). Players were unaffected while GitHub answered, since GitHub has been
first since v0.92.1. But a player whose GitHub fetch failed would have dropped silently onto v0.98.4:
an old copy loads fine, so nothing says anything is wrong.

**Changes:**
- The loader asks jsDelivr for `@v<version>`, its own release's tag (`CDN_TAG` in src/loader.ts).
  A tag names one commit, so there is no branch lookup to go stale and nothing to purge.
- purge-cdn.yml now creates that tag on the merge commit (`contents: write`), then checks jsDelivr
  serves it. An existing tag is never moved: jsDelivr caches a tag for good.
- The bookmark loader keeps `@main` (`CDN_MAIN_URL`). A bookmark is never updated, so a tag would
  freeze its fallback on one release; a stale main is the lesser fault. The workflow still purges
  `@main` for it, best effort, as a warning only.

**Decided (DW, 2026-10-03):** this reverses the 2026-09-23 "follow main, not tags" decision for the
loader. Its reason was a forgotten tag, and the workflow now pushes the tag itself. Lag: the fallback
moves when the player's manager updates the loader (usually daily), not on the next refresh. That is
acceptable for a fallback.

### Fixed 2026-10-02 (v0.100.4) — only OUR effects are narrated or acted on as ours

Lexi (#259780, 2026-09-28): bound with no session, every self-activity got "Your hand doesn't move.
Nothing of yours does." `hasOwnEffect()` is true for our own record (OWN_EFFECTS) OR any matching
effect on the Emoticon item. The item half exists for recovery (after a reload the record is empty).
But we patch the Emoticon allow-list on every client, so any add-on's "Freeze" there survives, and
the item cannot say whose it is. (Current LSCG was checked and does NOT write Freeze there; it only
writes ForceKneel. The source on Lexi's character is still unknown.)

**Changes:**
- New `heldByUs()` reads only OWN_EFFECTS.
- These callers that narrate or act on "ours" switched to it:
  - the self-touch block;
  - `isHeldStill` (the pose hold);
  - undress's frozen/locked reasons;
  - the wardrobe message;
  - applyUndress's freeze lift, which could otherwise remove a foreign Freeze;
  - the "a real restraint has them frozen" refusals;
  - `orgasmDeniedByUs`.
- Recovery's reconnect snapshot also saves only `heldByUs` effects.
- The trap fixed alongside: `restoreLocalState` re-applied saved effects only `if (!hasOwnEffect(e))`.
  The item usually still carried them after a reload, so the record was never refilled. It now always
  calls `applyEffect` (idempotent), so a resumed trance's freeze is ours again.

**Deliberately unchanged:** `hasOrphanedEffects` and the follow teardown still use `hasOwnEffect`,
because never leaving someone stuck after a crash outweighs sparing a foreign effect at login.

**Behaviour change:** during recovery's wait for the hypnotist (up to 5 min) self-touch is not
blocked, because the trance is not restored yet.

**Tests:**
- selftouch +4: a foreign Freeze passes, says nothing and isn't held; ours still blocks. Three of
  these fail on v0.100.3.
- recovery +3: a resume re-adopts the Freeze.
- undress and activity: their "ours" setups now go through `applyEffect`, plus a foreign case each.

### Changed 2026-10-02 (v0.100.3) — a whisper to the subject needs no name

Claire's feedback, 2026-09-28: "would be nice if you whisper to someone you dont have to use their
name for each command given." DW: "Any whisper not in an (OOC) should be reviewed for commands."

`asAddressed()` (voice.ts) puts her name on the front of an in-character whisper that lacks it, and
main.ts uses that line for `isTriggerSetupLine`, `handleSpokenLine` and the one-voice hearing filter.
So every downstream name gate treats the whisper as said to her without each learning about
whispers: suggestions, triggers, wake, sink deeper, body parts and commanded touch. "Whispered to
me" means a whisper whose sender is not us; BC delivers a whisper only to its target and echoes it
to its sender, which is how R132 ChatRoom.js reads the target too.

What deliberately did not change:
- Trust counting and the induction's roleplay count still see the original line.
- OOC is stripped first, so a wholly-parenthesised whisper never reaches matching.
- The hearing filter's "only your name" mode now lets whispers to her through, since a whisper is
  said to her.

New suite `test/whisper.mjs` (10). A nameless line said aloud is still ignored; a whisper still needs
the session and the permission.

### Fixed 2026-10-02 (v0.100.2) — the Depth tab's pages turn while settings are locked

Veronica's feedback of 2026-09-19, which v0.98 was believed to have answered: "While in trance with
locked settings, in the depth menu, it would be nice to still be able to change pages."
`clickDepthGates()` returned on its first line, `if (settingsLocked()) return true`, before the
Prev/Next checks, so a locked player saw page 1 only. That applied under the session lock and the
Extreme lock alike. Found by the feedback review on 2026-10-02 (`feedback_review.md`); reproduced
by driving the real screen before fixing. Paging now runs first. Turning a page only reads, the
reason the scroll bar already works while locked. `test/menu-layout.mjs` +3 (92); the paging check
fails on v0.100.1.

### Fixed 2026-10-02 (v0.100.1) — the wizard's forward button looks clickable when it is

DW: "the next button always looks like it inactive even after you select an item." The forward
button was `#dfe9df` when live and `#eee` when waiting: two pale shades that read alike. In R132,
`DrawButton`'s Disabled flag only suppresses the cyan hover; the fill colour is all a player sees.
It is now "White" when live, like every other button, and `#b8b8b8` while waiting.
`test/wizard.mjs` checks both colours (110).

### Changed 2026-10-02 (v0.100.0) — Permissions reorganized; new Inductions tab

From `job3.md` (local, untracked), decided with DW 2026-10-02. Layout only: no stored setting
changed, so nothing migrates.

**Permissions**
- `Tab.fixedRows` holds Hypnosis Enabled and the settings lock above the scroll area, side by side
  and outside its clip, so neither can be scrolled away. `rowScroll.top` is now set per tab in
  `layoutRows()`.
- `Tab.rows` takes `ListItem`s: rows or `{ heading }`. A heading takes a 50px slot, and
  `rowTop(tab, i)` sums the heights, so drawing and clicking agree.
- `Row.needs` draws Made to Touch Others indented under Made to Act, greyed and ignoring clicks while
  Made to Act is off. Its value is not changed when Made to Act is unticked; it simply does nothing,
  as before.

**Inductions** (a scrollExtra-only tab)
- The attempt control, the three answer-for-me cycles, the toy mode dropdown, and "Sink deeper"
  (`DEEPEST_CONTROL`, removed from the Depth tab).
- The toy dropdown is now owned by this tab in `syncTabControls`.
- Help text and the wiki point at the new places. The wiki's Settings Reference gains section 2 and
  renumbers the rest (the one inbound anchor was updated).

**Tests:** `test/menu-layout.mjs` rewritten for the fixed rows, headings, indent and the Inductions
tab (89).

### Added 2026-10-02 (v0.99.0) — setup wizard overhaul and the Extreme progressive lock

From `job2.md` (local, untracked); every decision is in its §5. Built on `feat/wizard-overhaul`, which
branches from `feat/numeric-depth` (job 1) because Extreme's "every gate at 20" needs numeric gates.

**Templates and questions (wizard.ts).**
- `applySetup()` now writes one full `SetupConfig`:
  - the master switch;
  - every grant in `MANAGED_FEATURES` (on if listed, otherwise off);
  - the factory trance defaults plus overrides (Light turns Cannot Speak off);
  - depth gates, either all at one number or cleared;
  - "sink deeper", auto-answer, away, toy mode and scope, trigger scope, drop mode and decay;
  - skill honour back to its default (stored as absence);
  - trigger lifespan back to 0, and chemical reach.
- The player's own preferences (trigger words, self-trigger, whole-word, release on disconnect, OOC,
  room reactions, trigger-setup hiding) are deliberately not touched.
- The old questions (access, arousal, honour, decay) are gone; `wizardConfig()` maps the five new
  ones (job2.md §5.3).
- Next is disabled until a question is answered. Cancel is on the welcome page too.
- "Hypnotist only" on Q1 goes straight to the summary.

**The lock (extreme.ts, storage).**
- New sparse fields `extremeLockUntil` / `extremeLockStage`. Only `confirmExtreme()` writes them;
  `applyPreset("extreme")` alone does not, so settings and commitment stay separate.
- DW asked that nobody who picked the old Extreme be locked. No build before this one recorded which
  preset was chosen, so absence of the field is the old state, and `test/wizard.mjs` imports a
  0.98-era Extreme profile to prove it.
- `settingsLocked()` (menu.ts) is now session lock OR Extreme lock, so everything already gated on it
  (checkboxes including Hypnosis Enabled, Depth boxes, dropdowns, Setup, Import) is covered.
- Purge, Clear All (`clearAllRefusal`), `/echs forgettrigger`, `/echs triggerdecay` and `/echs decay`
  refuse while it holds.
- A run-out period shows a renewal screen in place of the tabs, and settings stay read-only until it
  is answered; unlocking keeps every setting.
- The safeword and reset are untouched; reset clears the fields with everything else.
- This is the recorded exception to CLAUDE.md rule 2 (DW, 2026-09-29).

**Tests.**
- `test/wizard.mjs` rewritten (108).
- New `test/extreme.mjs` (40).

### Fixed 2026-10-02 (v0.98.4) — the hover-tip fix no longer throws without a real canvas

`clearTipOverlap()` (v0.98.3) called `MainCanvas.canvas.getBoundingClientRect()` unguarded. The
settings screen's stand-in canvas in `test/menu-layout.mjs` has no such method, so the suite threw
inside run()'s `finally` and exited non-zero before printing a result. It went unnoticed because
the three known CRLF loader failures already make `npm test` exit non-zero on DW's machine, and the
result was read by grepping for FAIL lines, which a crash does not print. Now guarded (no rect, no
comparison), and suites are checked by exit code, one by one. No player-visible change, so the
root CHANGELOG keeps a single entry under the new number.

### Fixed 2026-09-29 (v0.98.3) — hover tips no longer go under DOM controls

DW: the page-3 "earned only" tip on the Depth tab did not draw over the number boxes. New in v0.98.0:
the boxes are DOM inputs, and the canvas cannot paint over a DOM element, so any tip placed across
one sat beneath it. The Triggers/Stats dropdowns had the same exposure. `flushTip()` now returns the
rect it drew, and `clearTipOverlap()` (panel.ts) sets `visibility: hidden` on every control the
settings screen owns while it overlaps that rect, comparing in screen space because the canvas is
scaled. Hidden rather than removed, so a half-typed box keeps its text.

### Fixed 2026-09-29 (v0.98.2) — an emptied number box restores the latest saved value

R132's `ElementNumberInputBlur` puts `defaultValue` back when a number box is left empty, and
`defaultValue` was only ever the value the box was created with. So on the Depth tab, typing 45 and
later clearing the box saved the old number again; the trigger-duration box had the same fault. The
per-frame resync now sets `defaultValue` along with `value`. Found while writing `script_test.md`.

### Fixed 2026-09-29 (v0.98.1) — number boxes step once per wheel notch; no hover tips on -5/+5

Found in DW's first test of v0.98.0, which never reached players, so the root CHANGELOG folds both
into one v0.98.1 entry. R132's `ElementCreateInput` already attaches `ElementNumberInputWheel` to
every `type: "number"` box, so our own second listener stepped the Depth boxes, and the older
trigger-duration box, two at a time. Both extra listeners removed. DW asked for no hover text on
-5/+5 ("I dont think we need to tell people what a +5 button does").

DW also reported that v0.98.0 "zeroed out" the depths. Traced, and it was not a loss: every gate
was stored as "drifting", which is what the wizard's Easy answer and the Extreme preset write
(applySetup), and Drifting's floor is 0. A simulated 0.97.4 profile with every gate "yielding"
loads as 20 on every row. Extreme's depth gates move to 20 in job2's wizard overhaul.

### Changed 2026-09-29 (v0.98.0) — numeric depth gates, a read-only banner, trust shown by nickname

From DW's brief (`job.md`, local and untracked). Three parts, one PR on `feat/numeric-depth`.

**Depth gates are numbers 0-99.** `DepthGate.tier` became `DepthGate.depth` (defaults unchanged:
each is its old tier's floor), `requiredDepth()` reads the override or the default, and
`requiredTier()` is now derived from it via `tierOf()`. `depthGates` in storage holds numbers;
`migrateDepthGates()` in `normalise()` turns a saved tier name into its floor (drifting 0, yielding
20, entranced 40, deep 60, blank 80), rounds and clamps numbers into 0-99, and deletes anything else
so the default governs (the skillHonour rule). It runs on load and on import. The floors are spelt out
in storage.ts (`LEGACY_GATE_TIERS`) so storage stays a leaf; `test/depth.mjs` checks they match
`DEPTH_TIERS`. 99, not 100, is the ceiling a gate may ask for: 99 is still inside Blank, so every
gate stays reachable. The brief's "never: 100" mapping is not built — DW chose to convert only the
feature gates (the "Sink deeper stops at" ceiling keeps its named rungs, including *Never deeper*).
The earned-only split is untouched: `depthAllows()` still picks earned or full depth per feature
before comparing.

The Depth tab's click-to-cycle button became -5 / a number box / +5 plus the tier in brackets.
The box is a DOM input per visible row (`HypnosisAddonDepth-<key>`), made for the page showing and
removed on page change, tab change and every exit (`removeDepthInputs()`, called from
`syncTabControls` and `removeScopeControl`). It commits on blur or Enter, not per keystroke — the
trigger-duration box's rule — and re-checks `settingsLocked()` in the blur handler, because a box
focused before a session began can blur after. Refusals and `/echs gates` now say
`needs 60 [Deep], at 45 [Entranced]` (`depthLabel()`); "at" floors rather than rounds, so 39.6 reads
39 [Yielding] and is not shown as if it met a 40 gate.

**Read-only settings.** Already true since v0.65.1: the screen opens while locked, every control is
disabled and every click handler consumes without acting. What the brief found missing was that it
did not *look* locked — only the grey blurb line changed. It is now a yellow banner across the blurb
band. DW decided no on-screen safeword button: `/echs safeword` stays the way out, and the banner
says so.

**Trust names.** Entries already stored a name, but the account name, and two callers passed a
`#123456` fallback when the character was not on the roster — which `addInteractions` then wrote over
the real name, so a known partner could turn into a number. Now `displayNameOf()` (trust.ts) prefers
the nickname (read off the character, not BC's `CharacterNickname`, which returns a GGTS stand-in in
the asylum); callers pass "" when nobody is found; `isRealName()` in storage refuses to store "" or a
bare `#n`. Display goes through `trustEntryLabel()`: the live name if they are in the room, else the
stored one, as `Name (#123456)`, used by the Stats tab, `/echs logtrust`, `forgettrust` and the trust
log lines. New suite `test/trust-names.mjs` (12).

 — hover tips on the settings screen wrap instead of shrinking

DW: "The pop up text is very small on some of the helps that you just added." BC's
`DrawButtonHover` (Drawing.js, R132) is a fixed 450 x 65 box and `DrawTextFit`s the tip onto one
line, so the v0.97.0 Permissions tips and the longer Depth-tab ones shrank to a few pixels. The
settings screen's buttons now go through `tipButton()` in panel.ts, which draws the button with no
BC tip and queues ours; `flushTip()` draws it at the end of the frame (run() wraps the old body,
now `runSettings()`, in try/finally), 450 wide, 26px, wrapped onto as many lines as it needs,
over everything and outside the scroll clip. Placed beside the button as BC places its own.
`test/menu-layout.mjs` +6 (77); with BC's one-line tip restored, 4 fail. Help, wizard, prompt and
remote screens still use BC's box; their tips are short.

### Changed 2026-09-27 (v0.97.3) — toy mode's scope is the trigger-scope ladder, as a dropdown

DW, after testing: "in the Toy mode is for box I would rather it use the same format as the one used
on the triggers tab", and chose the same choices, not only a dropdown. The ladder moved from
`speakerAllowedByScope()` in triggers.ts to `allowedByLadder()` in a new leaf, `src/ladder.ts`,
because session.ts cannot import triggers.ts (triggers.ts imports session.ts). Triggers behave
exactly as before (`test/scope.mjs` and `test/triggers.mjs` unchanged and passing). `TOY_SCOPES` is
the ladder less "Hypnotist only", keyed by `TriggerScope`; default `lovers`. The v0.97.0 keys are
converted on load (lover → lovers, friend → whitelist, the nearest rung, anyone → everyone); only
branch testers ever saved them. `toyModeFor()` still reads `relationshipWith()` first so `/echs
relate` works in the testing room.

The control is a DOM `<select>` inside the Permissions tab's scroll area, which cannot clip it, so it
is placed only while wholly in view and removed otherwise, through a new `hide` hook on
`scrollExtra` for the frame where the whole band is scrolled out; also on tab change and exit.
`test/menu-layout.mjs` (71) checks it is placed, saves, goes when scrolled away and on another tab.
The scroll-away check first passed with `hide` disabled, because the frames drawn on the way up
removed it early; it now scrolls in one jump and fails without `hide`. `test/induction.mjs` +4 (63)
for the whitelist and blacklist; ignoring them fails 2.

### Merged 2026-09-27 (v0.97.2) — main's v0.96.3 into the overhaul branch

`main` into `feat/induction-overhaul`: the refusal fix below (v0.96.3), with no change of its own.
Its own number so a tester can tell from the startup line that the branch build has the fix.

### Fixed 2026-09-27 (v0.97.1) — the trust floor was not rounded

DW, live test 1B: `/hypno gates` showed "Depth 31.34328358208955 full / 31.34328358208955". The
spread was rounded in `resolveDepths()` but the floor under it, `trust × 0.5`, was not, and trust is
rarely a whole number (62.7 by then: each landed induction in 1A added some). When the floor won, it
became the depth as it stood. `depthBases()` now rounds the floor, which also fixes the "lands A–B"
line in `/hypno chance`. `test/induction.mjs` +1 (59), seen failing without the fix.

### Changed 2026-09-27 (v0.97.0) — the induction overhaul: depth from trust, auto-stance, toy mode

DW: "Right now I think the Roll makes to much of a difference." The whole reasoning, the worked
tables and every decision DW made are in `trust.md` at the repo root (§10 the first review, §11
the second, §12 the final spec); `design.md` carries the result under *Induction Success Formula*
and *Trance Depth During a Session*. Built on `feat/induction-overhaul`, not main, until DW has
run it live.

- **Depth no longer comes from the roll.** `depth = chance − roll` spread a landing evenly from 0 to
  the chance, so one roll decided both whether and how deep. Now `resolveDepths()` sums trust × 0.5,
  the relationship depth floor × 0.5, honoured skill × 0.2, arousal × 0.15 and the stance (Agree +20,
  Fight −20), adds one 2d10 − 11 and floors it at max(relationship floor, trust × 0.5) unless she
  fights; earned is the same without skill and arousal. Agree is +20, not the proposal's +15, because
  at +15 earned Deep stayed owner-only (§11c: 1% at trust 90). A landing at 0 or less slips away and
  counts as a miss.
- **Access**: arousal now adds a quarter of the meter (`effectiveAccess`), replacing the floor capped
  at 30. Experience weight 0.25 → 0.2.
- **Deepening**: chance and steps per §12; no half steps (DW: "Do we still need half steps or can the
  random rolls cover that"), base 40 to keep the pace. A hit can now move her within her ceiling tier.
  +0.5 subject experience per hit (`noteDeepenSuccess`).
- **Fighting**: softened bases and three drop bands, so no cliff at 40. Also rolls on her own
  `/hypno fight` mid-trance, one push a minute whatever sets it off (`lastStruggleAt`). A failed push
  is told to her alone, so the stance stays hidden. voice.ts reports through
  `registerStruggleReporter`, since session.ts cannot import it.
- **Auto-stance, away, toy mode**: four settings (sparse, validated on load) and `src/away.ts`.
  `answerWithoutAsking()` in the attempt handler decides before the box; toy mode skips the cooldown
  gate only. `answerPrompt` now also changes her answer during the window.
- **Deliberate changes to settled rules, flagged:** experience no longer adds depth; roleplay no
  longer adds depth; the v0.96 half steps are gone; toy mode writes EARNED depth (her own consent,
  not a chemical, so rule 4 is not in play, but it is a new way to plant triggers).
- Tests: `test/induction.mjs` (new, 58 checks; three mutations — Agree +15, the away refusal off,
  slipping off — each caught), `test/deepen.mjs` rewritten (88), `test/menu-layout.mjs` +4, and four
  suites whose "a random of 0 always lands" setup no longer held (a random of 0 is also the lowest
  spread) given enough trust to land.

### Fixed 2026-09-27 (v0.96.3) — refusals were never said in the hypnotist's chat

DW: "/hypno induce is not recognizing when Missy is already in session or if in a cooldown
period." The subject's client did refuse ("Already under.", "Not yet — try again later.", and the
other gates in the `session-attempt` and `session-continue` handlers), but `refuse()` only sends a
`session-update` carrying `refusedReason`, and on the hypnotist's side that reached `views` and the
Information Sheet's status line and nothing else. `/hypno induce` had already replied "Attempting
an induction on Missy", so with the panel closed it looked accepted and then silent. Rule 5. Probably
there since the command was added; never reported. `reportRefusalToHypnotist()` now tells the
hypnotist every non-empty refusal (each one answers a request of theirs), with the minutes left on
a cooldown; a status query's empty reason stays silent. `test/miss.mjs` +6 (52), four seen failing
without the fix; `test/miss.mjs` and `test/expiry.mjs` each had a check that a refusal prints nothing,
now that it prints only the refusal.

### Changed 2026-09-26 (v0.96.2) — her half step up, fighting

DW: "Lets give the subject a chance to move 10 points as well. I want a sub fighting to stand a
chance." The mirror of the hypnotist's half step: when she is fighting, a deepening misses outright,
and her push-back roll misses `surfaceChance` by under `DEEPEN_HALF_BAND` (20), she comes up
`DEEPEN_HALF_STEP` (10). Outcome `half-up`; private unless it crosses a tier (then the room tell). If
it would take her to 0 or below, she wakes. Net effect: at Yielding against a stranger, 55% of
clean misses now move her up at least a little, up from 35%. `test/deepen.mjs` +7 (78).

### Fixed 2026-09-26 (v0.96.1) — her stance is lost on a reload

DW asked to confirm that Fight at the prompt stays in force for every deepening. It does:
`session.choice` is set by the prompt and nothing clears it when the roll lands. But it was not in
`SavedSession`, so `restoreSavedSession` after a mid-trance reload left it null, which rolls as
Ignore and never surfaces her. Now saved as `choice` and restored (validated; older saves restore as
null). `test/recovery.mjs` checks a Fight survives a save and restore.

### Added 2026-09-26 (v0.96.0) — half steps, and fighting back up

DW, after a first live try (4 deepenings while "fighting": 3 took, 1 held): "the deeper you already
are the less chance you have of fighting upwards ... the tist experience and to a lesser extent your
trust has an effect ... Maybe there can be half jumps". Likely cause of that run: a trance forced
with `/echs trance` has no prompt answer, so it rolled as Ignore, and a high-trust test hypnotist
outweighs Fight's −25 anyway.

`tryDeepen` now has four outcomes. Full step: `max(depth + 20, next tier floor)`, capped at her
ceiling tier's top (a half step already taken now counts, which "to the next floor" threw away).
Half step: a roll within `DEEPEN_HALF_BAND` (20) above the chance, +10, capped the same; told
"It half takes", or "Only just, but it is enough" if it crosses a tier. Miss. Or, when
`session.choice === "fight"`, a second roll against `surfaceChance()` = `SURFACE_BASE[tier] −
honouredSkill × 0.2 − effectiveAccess × 0.1`, clamped 3-60; success moves her to the middle of the
tier above, or at Drifting ends the session ("you fought your way up and out"). Room tells for
coming up and waking; the half step is private. `answerPrompt` while Hypnotized now sets the stance
instead of refusing. `describeChances` shows the deepening and surfacing odds while under with them.

`test/deepen.mjs` 71 checks (+20). Mutations: no half step fails 5; surfacing without fighting 1;
never surfacing 5; depth ignored in the surface chance 2; skill ignored 1.

### Added 2026-09-26 (v0.95.0) — "sink deeper", in-session deepening (CHANGES a settled rule)

From DW's brief (job.md, not committed). **It reverses design.md's "depth is fixed at entry; to go
deeper, wake and re-induce"**, with DW's say-so, and keeps fractionation planned beside it. The full
decision list is in design.md → *Trance Depth During a Session*. Where the brief and ECHS differed,
DW chose: a new subject-side ceiling (`deepestTier`, Depth tab, default Entranced; per-hypnotist
parked on the Todo list) for the brief's nonexistent "configured maximum"; the trust gift for its
nonexistent "Automatic Hypnosis"; bands, not tier names, to the hypnotist; 60 s AND a landed
suggestion between tries (the brief said 30-45 s); the chance with the induction choice added and
the brief's unbuilt "susceptibility bias" left out.

**Full depth only.** `tryDeepen` raises `session.depth` to the next tier's floor and calls
`setCurrentDepths(full, session.depthEarned)`; earned is untouched, so the earned-only three stay
behind trust (mutation: raising earned too fails 2 checks). `deepenChance` reads `effectiveAccess`
(so the relationship, arousal and trust-gift floors all count, as at induction) + `currentSkillTerms`
+ time + `CHOICE_MODIFIER[choice]` − tier penalty. A forced or trigger-dropped trance has no choice
and counts as Ignore.

**Parsing.** `handleDeepening` sits after the walking-trance handler and before the body-part and
table matchers, so "go deeper" is never read as movement. Negation is anchored to the verb ("don't
go any deeper" refused; "don't stop, go deeper" accepted). "Let that trigger sink deeper" still
reinforces (its handler runs first). Planting: `splitStartAtAction` now also splits at a deepening
rest, so "when you hear silver bell, sink deeper" plants "silver bell" rather than swallowing the
whole line as the phrase, and the re-read tells the hypnotist a trigger cannot hold a deepening
(the instant drop can). Landing is noted by `noteSuggestionLanded` from the table path (outcome ===
id), body-part blocks and commanded activities that happened.

`test/deepen.mjs`, 51 checks: removing the ceiling fails 1, the pace 4, the planting guard 2,
raising earned depth 2. Persisted with the session (`persistState`), so a reload keeps the depth.

### Added 2026-09-26 (v0.94.0) — "I trust you, Eri"

DW: "a one time trust boost. If the subject says that they trust the hypnotist it will give them a
big boost and then it does not ask the induction question. Lasts for like 5 min." DW's answers: the
name is required (spoken, or whispered to them, or `/hypno trust <name>`); it reaches session and
arousal only; a floor of 65; used up by one induction.

**Reading of "lasts 5 minutes" + "used up by one induction" (flagged to DW):** the gift waits 5
minutes for an induction. The induction that takes it keeps it through its retries and the trance it
leads to, however long, and it ends with that encounter. The alternative, a flat 5 minutes, would
drop her mid-trance from 65 back to her real trust, which only moves the roll and depth already
rolled, so it would change nothing she could see but the `/hypno chance` line.

**Where it reaches.** Added to `effectiveAccess()` beside the arousal floor, not to `accessFor()`,
which is the earned half `chanceBeforeInvariant(…, earnedOnly)` reads. Since v0.50.0 depth is the
gate, and the category argument to `accessFor` is only ever asked for "session", so the only way to
honour "session + arousal only" is to keep the gift off earned depth: full depth rises (Entranced,
arousal), earned depth does not (Deep-tier illusion, triggers, carry-forward). A subject who has opened
those to full depth on her Depth tab will find the gift reaches them too; that is her setting.

**Mechanics.** `session.ts`: one `trustGift` at a time. `spentOn` holds the `session` object it was
spent on; `session` is replaced by `freshSession()` at every encounter end, so identity is exactly
"this induction". The `session-attempt` handler skips `showPrompt` and runs `beginInductionWindow`
with choice Agree. Said while the box is up, it answers it; said mid-window or after a miss, the
choice becomes Agree; said while already under with them, nothing is given and she is told plainly (the roll and depth are settled, so claiming she sank further would lie about her own state). `totalStop` clears it
(safeword, hypnosis off, reset). Not persisted. Her own lines are read in `main.ts` off BC's echo of
them (a whisper carries `Target`, R132 ChatRoom.js); `noticeTrustLine` refuses questions, "don't
trust", two names, a name that only prefixes someone's, and tells her why when a trust line named no
one (rule 5). `test/trust-gift.mjs`, 41 checks; with the prompt skip removed 8 fail, with the floor
leaked into earned depth 1, with a spent gift never ending 1.

### Fixed 2026-09-26 (v0.93.1) — the trance veil greyed out blindness

Found live by DW, the day sight shipped: "the black and white make the screen look gray". BC draws
its blindness darkening inside ChatRoomRun, and our 30% white veil is painted after ChatRoomRun's
`next()`, so it lay on top of BC's dark and lifted black to grey. `drawTranceVeil` now paints nothing
while `CharacterGetDarkFactor(Player) < 1` (R132 Character.js: 0.3 / 0.15 / 0 for blind levels 1-3,
1 in photo mode or for VR avatars at level 3). Asking BC rather than our own `sightLevel` means a
real blindfold gets the same treatment, and BC's own exceptions (where it does not darken) keep the
veil. It is decided per frame, so the veil returns the frame sight does. Walking trance's thin veil
follows the same rule. `test/sight.mjs` +6 checks (35), 3 failing with the line removed.

### Added 2026-09-26 (v0.93.0) — sight

In the same release as hearing (below). BC's three blindness levels as `sight-dim` / `sight-dark` /
`sight-blind`, permission `sightControl`. DW: "link into BC's blindness, do not override the BC
blindness limits". Re-verified on R132: `Player.GetBlindLevel()` sums `BlindLight`/`BlindNormal`/
`BlindHeavy` from `CharacterGetEffects(this, ["ItemHead","ItemHood","ItemNeck","ItemDevices"], true)`
and clamps to 2 under `SensDepLight`, else 3; `CharacterLoadEffect` drops its `_BlindLevel` cache.
The 2026-09-16 notes proposed hooking `CharacterGetDarkFactor` instead, and said our clamp would then
be "mandatory". That hook would have bypassed BC's clamp and covered only the screen. Adding the effect
inside the existing `CharacterGetEffects` hook, only for a query naming those groups, goes through
BC's front door. BC then applies its own clamp, and every consumer of `GetBlindLevel`/`IsBlind` (Blind
Adjacent, Blind Disable Examine, SensDep name hiding, map range, struggle difficulty) behaves as
under a blindfold. The effect is never in the unfiltered list, and never on the Emoticon item, so
nothing syncs. `setSight` refreshes the cache (`CharacterLoadEffect`) and returns what BC reports, so a
capped level is said (`sight-capped`). `test/sight.mjs`, 29 checks, 9 failing with the hook branch
disabled. Unticking Sight or Hearing now releases it at once (`menu.onToggle`), like every other
permission.

### Added 2026-09-26 (v0.93.0) — hearing only one voice

DW's request, with his answers recorded in `design.md` (*Development Stages > Todo*, "HEARING ONLY
ONE VOICE", above the sensory spec). Two modes (`hear-voice`, locked to the speaker or the trigger's
firer; `hear-name`, lines with her name from anyone), a release, and a new permission,
`hearingControl` (Entranced).

**Why not BC's deafness, which DW suggested hooking:** verified against R132. `Player.GetDeafLevel()`
feeds `SpeechTransformDeafenIntensity`, and the "Sensory-deprivation processing" handler (priority 100)
garbles the line and, at level 4, masks the sender's name. It never hides a line and cannot let one
sender through. So the display is our own handler at 90: before that garble, so the OOC we keep is
readable, and before "Save chats and whispers to the chat log" (110), so an unheard line is not
logged either. Returning `true` hides; `{ msg }` with only the `(…)` spans keeps the OOC.

**The gate** is the first thing in `handleSpokenLine`: an unheard line reaches no matcher, no trigger
and no speech compulsion. `main.ts` marks unheard lines for the display handler (a `WeakSet` on the
message object) and keeps them out of trust and the induction's RP count. `Suggestion.run` now takes
the speaker (the live path passes the sender, a trigger passes the firer) so "my voice" knows whose.
Carried re-applies pass none, so the hearing ids are kept out of carry (`noteApplied`) rather than
failing on re-apply.

`test/hearing.mjs`, 38 checks. The gate's two checks fail with the gate disabled, and the display's
six fail with the handler disabled. Two checks in the first draft could not fail: a trigger never
fires while its planter has her under, and the trance's own Cannot Move default froze her
regardless. Both were rewritten.

Also: Python string escaping turned a regex word boundary into a backspace character twice. Once
in this build's patterns (all six new help examples stopped matching, which the suite caught at
once), and once, earlier, in this file, now fixed.

### Fixed 2026-09-26 (v0.92.7) — ECHS room lines sometimes shown as "**…*"

DW saw stray stars on another subject's ECHS lines ("**Valerie rises, without seeming to decide
to.*") while not in a session herself. A watcher-side trace (ChatRoomMessage hook at 2000, each
BC message handler wrapped to log what it changed) settled where: the RAW packet from Valerie's
client was `**Valerie rises…`, both stars, and BC's "Emote messages formatting" handler then
correctly took one off and the display wrapped it in `*…*`. Her next line, through the same
`tellRoom` → `ChatRoomSendEmote("**…")`, arrived as `*…` and rendered cleanly. So something on
her client took over that one `ChatRoomSendEmote` call and sent the text without BC's
`msg.replace(/^\*/, "")` (R132 ChatRoom.js). Not ECHS, whose only room path is `tellRoom`, and
not WCE, which does not hook `ChatRoomSendEmote`. Which add-on, and why only sometimes, is not
known.

Fix without knowing: `tellRoom` still calls BC's function, so the owner's BlockEmote rule is still
honoured. It also notes the line, and a `ServerSend` hook (priority 1000,
`installRoomLineGuard`) takes the extra star off an outgoing Emote only when it is one of our
lines noted in the last 10 s, and only once. A player's own `**` emote is never edited. New suite
`test/room-line.mjs`, 5 checks; the live-fault check fails with the fix disabled. **Only the
SENDER's version matters:** Valerie's client must run v0.92.7.

### Added 2026-09-26 (v0.92.6) — "you will be frozen"

Found by the v0.92.4 wording sweep: *"you will be frozen"* matched no suggestion anywhere, so as the
rest of a wake compulsion it planted nothing. `movement-block` gains the future of its "you are
frozen" pattern, `you (will|ll) [adverb] be [adverb] frozen|paralyzed|rooted|immobile|stuck`, with a
lookahead refusing *not / never / no* ("you will not be frozen", "no longer be frozen"). "You'll" is
matched as "you ll" because `normalize` does not expand it; expanding it globally would widen every
"you will" pattern at once, which was not the ask. Added to the examples, so the in-game help table
shows it. `test/voicetest.mjs` +7 (4 positive, 3 negative).

### Fixed 2026-09-26 (v0.92.5) — held still: pose commands refused under WCE's animation engine

DW's live trace (test script section 8) put the refused pose change in `wce.js`. Reading it: with
WCE's **animation engine** setting on, WCE hooks `PoseSetActive` AND the deprecated alias
`CharacterSetActivePose` at priority 10, never calling on. It queues the pose, then applies its
queue itself: it writes `Player.ActivePose` directly and sends `ChatRoomCharacterPoseUpdate`, both
at once and again from a 250 ms timer. Its socket listener for `ChatRoomSyncPose` about her calls
`PoseSetActive(Player, p)` for each pose. So with WCE on, BC's own `PoseSetActive` never runs. That
is also why v0.92.3's "lift our Freeze for our own change" made no difference for DW.

The fault: `setSuggestedPose` → WCE applies and sends at once, inside our call → our `ServerSend`
safety net compared against `heldPose`, which is only moved AFTER the call, so it took the
hypnotist's command for her own attempt. It put the old pose back ("You try to shift…"), and the
command read as `pose-blocked`. WCE's queue still held the new pose, so every 250 ms WCE re-applied
it and the net undid it again: her pose sent about four times a second, which is the "over and
over" DW saw back in v0.91.x.

Two changes in `effects.ts`: the net passes while `ownPoseChange` is set, and the hold hook also
goes on `CharacterSetActivePose` (WCE's hook on the alias skips the `PoseSetActive` hold entirely).
New suite `test/held-wce.mjs` stands in for WCE's engine (queue, immediate apply, timer, echo),
described from reading wce.js with no WCE code. 13 of its 16 checks fail on v0.92.4, including
8 pose sends in 8 timer ticks.

Not fixed, noted: anything that gets a pose into WCE's queue by some path we do not hold would
start the same fight again. None is known now.

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
still matched, since `\bkneel\b` finds it, which is why the obvious test passes. **A phrase did
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
