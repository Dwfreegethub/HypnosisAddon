# What to Say

> **Alpha Notice**  
> ECHS is in active alpha development. Command parsers and speech triggers are actively being refined. If a phrase fails to trigger, double-check that your partner’s name is included, the required permission is ticked on their client, and their trance depth is sufficient.

**This is the page to keep open while you play.** Almost nothing here is a slash command — you **speak** in ordinary chat, and the subject's local client decides whether anything takes hold.

For a worked example of these phrases used in a live scene, see [A Sample Session](Sample-Session).

---

## The Three Rules

**1. Say their name.** Every suggestion requires the subject's name (or recognized nickname) somewhere in the sentence. Without it, the client ignores the line completely — this keeps ordinary conversation completely inert.

**2. Contractions and punctuation do not matter.** *"You can't move"*, *"you cannot move"*, and *"Missy — you CAN'T move!"* are evaluated identically by the parser.

**3. Talking about yourself is ignored.** Any line starting with "I" or "we" without a "you" never fires an effect. For example, *"I kneel beside you"* will never force anyone to kneel.

**Not sure whether a phrase matches?** Running `/echs match <phrase>` (or `/hypno match <phrase>`) will test the sentence and report whether the wording and the name gate pass.

---

## Induction and Deepening — Say Anything You Like

**Nothing you say during the induction window has to match a rigid pattern.** The 60-second window following an induction attempt is dedicated to roleplay, and *every line you speak improves the roll outcome*, regardless of the exact words used. Set the scene, describe a swinging pendulum, count backwards — it all counts toward depth.

The pattern library below is strictly for triggering **effects**, not for building atmosphere. You do not need specific phrasing just to speak hypnotically.

> ⚠️ **Known Parser Quirk:** Because `feel` is currently recognized as a touch-command verb, a deepening line like *"Missy, your arms feel heavy"* can inadvertently be parsed as a command to caress arms if *Made to Act* is granted. See [Troubleshooting](Troubleshooting) for workarounds.

---

## Ending a Trance — Never Gated

These phrases require no permissions and no minimum depth. They always succeed.

| Say | Effect |
|---|---|
| *"wake up"* · *"you are awake"* · *"come back to me"* | Ends the trance completely |
| *"walk with me"* | **Walking trance** — remains under and suggestible, but upright with sensory veils relaxed |
| *"be still"* | Returns the subject to stillness |

---

## The Suggestions

Each suggestion requires its specific **permission** enabled on the subject's client, and most require a minimum **depth**. *Releases are shown in italics* — releases skip permission checks, because clearing an effect should never be harder than applying one.

### Movement and Posture

| Say | Needs |
|---|---|
| *"you cannot move"* · *"stay still"* · *"you are frozen"* | Movement Restriction · **Yielding** |
| *"kneel"* · *"on your knees"* | Posture Control · **Yielding** |
| *"kneel spread"* · *"spread your knees"* | Posture Control · **Yielding** |
| *"spread your legs"* · *"stand with your legs apart"* | Posture Control · **Yielding** |
| *"legs closed"* · *"feet together"* | Posture Control · **Yielding** |
| *"on all fours"* · *"get on your hands and knees"* | Posture Control · **Yielding** |
| *"lie down"* · *"down on your stomach"* | Posture Control · **Yielding** |
| *"stand"* · *"get up"* · *"on your feet"* | — *release* (legs only; arms stay where they are) |
| *"hands behind your back"* | Posture Control · **Yielding** |
| *"arms behind your back"* · *"box your arms"* | Posture Control · **Yielding** |
| *"elbows behind your back"* | Posture Control · **Yielding** |
| *"put your hands up"* · *"raise your arms"* · *"hands above your head"* · *"surrender"* · *"hands where I can see them"* | Posture Control · **Yielding** |
| *"hold your arms out"* · *"yoke your arms"* | Posture Control · **Yielding** |
| *"relax your arms"* · *"arms at your sides"* | — *release* (arms only) |
| *“you can move again”* · *“your body is your own”* | — *release* |
| *"follow me"* · *"stay close"* · *"heel"* | Follow / Leash · **Entranced** |
| *“you can leave”* · *“you don't have to follow me”* · *“you are free to go”* | — *release* |

**Poses come in two groups, legs and arms,** and one never undoes the other: *"kneel"* then *"hands behind your back"* leaves the subject kneeling with hands clasped. A pose that bondage prevents does not happen, and the room sees the subject try and fail rather than a line claiming it worked. *"On all fours"* and *"lie down"* are whole-body poses, so they take the arms with them. Bondage Club has no sitting or crossed-arms pose, so *"sit"* and *"cross your arms"* do nothing.

> ⚠️ **Watch your patter.** *"Surrender"* and *"relax your arms"* are ordinary hypnosis words as well as pose commands. With Posture Control ticked, *"Missy, surrender to my voice"* raises her arms over her head, and *"Missy, relax your arms and legs"* drops any arm pose she is holding.

**Follow / Leash** hooks into Bondage Club's native leash system. The phrase makes the subject leashable on command; the hypnotist then takes the leash using the standard **Hold Leash** button. The game handles room transitions automatically, and the subject cannot walk away while held. This requires the subject's native BC leashing settings to allow it, and only the active hypnotist can hold the leash while under trance.

---

### Speech

| Say | Needs |
|---|---|
| *"you cannot speak"* · *"stay silent"* · *"not a word"* | Speech Restriction · **Yielding** |
| *“you can speak again”* · *“your voice is back”* | — *release* |

This blocks regular public room chat. It cannot touch slash commands, so emergency releases remain available. **Out-of-character (OOC) text enclosed in parentheses passes through by default** — a silenced player can always type *"(brb)"*. OOC speech is only suppressed if the subject explicitly toggled **Silence OOC too** under their Trance Defaults tab.

---

### Sensory Modulation *(Feature Pending / Experimental)*

> *Note: Auditory and visual modulation systems are actively in progress. These commands may be partially functional or pending integration in the current alpha build.*

| Say | Needs |
|---|---|
| *"you cannot hear clearly"* · *"voices are muffled"* | Hearing Impairment · **Drifting** |
| *"you hear nothing"* · *"the room is silent"* | Complete Deafness · **Entranced** |
| *“you can hear again”* · *“your hearing returns”* | — *release* |
| *"everything is going dark"* · *"you cannot see"* | Blindness / Darkness · **Entranced** |
| *“your vision clears”* · *“you can see again”* | — *release* |

Visual and auditory effects respect native game sensory caps and client accessibility toggles.

---

### Clothing

| Say | Needs |
|---|---|
| *"you cannot change your clothes"* · *"leave your clothes alone"* | Clothing Restriction · **Yielding** |
| *"take something off"* · *"undress"* | Undressing · **Entranced** |
| *"take everything off"* · *"strip"* | Undressing · **Entranced** |
| *“you can change your clothes”* · *“your clothes are yours again”* | — *release* |

---

### Arousal and Orgasm — All Require Arousal & Orgasm · Entranced

| Say | Effect |
|---|---|
| *"you are not aroused"* · *"your arousal fades"* | Drops arousal to zero |
| *"you are lightly aroused"* · *"you feel a little warm"* | Sets arousal to light |
| *"you are very aroused"* · *"you are desperate"* · *"you need it badly"* | Sets arousal to high |
| *"you are right on the edge"* · *"you are so close"* | Edges near the maximum |
| *"you cannot come"* / *"you cannot cum"* | Enables orgasm denial |
| *"you may come now"* / *"you may cum now"* | Disables orgasm denial |
| *"come for me"* / *"cum for me"* | Triggers forced climax |
| *"you cannot feel my touch"* · *"you feel nothing when I touch you"* | Numbness |
| *“you can feel my touch again”* | — *release* |

Native chastity items or locked edging crafts will still prevent forced climaxes. ECHS queries game state rather than overriding native mechanics.

**Numbness vs. Suppression:** Numbness prevents arousal from registering at all. Suppression allows arousal to increase normally, but conceals the feedback from the subject's view.

---

### Suppressed Awareness

Awareness hides the **chat messages** about what is done to you. It does not change what you see of your own body: that is the clothing illusion, below. They are separate permissions with separate lines, and a subject who should neither read about a change nor see it needs both.

| Say | Needs |
|---|---|
| *"you will not notice being undressed"* · *"you will not notice when I strip you"* | Clothing Changes · **Drifting** |
| *"you will not notice the ropes"* · *"you do not notice being tied"* | Bondage Changes · **Drifting** |
| *"you will ignore my touches"* | Touches / Activities · **Drifting** |
| *"you notice nothing"* · *"you are unaware"* | Enables all three simultaneously |
| *“you notice everything again”* · *“you can notice again”* | — *releases all three, plus clothing illusions* |

"You may notice…" on its own is ordinary patter and releases nothing. Say what comes back: *"you can notice everything"*.

---

### The Clothing Illusion — Clothing Illusion · Deep, Earned Only

| Say | Effect |
|---|---|
| *"you cannot tell what you are wearing"* · *"your clothes look the same to you"* | Freezes the subject's local rendering on their starting outfit |
| *“you notice your clothes”* · *“look at yourself”* | — *release* |

The rest of the room sees actual wardrobe changes in real-time. Only the subject's local screen remains locked on the illusion. It changes **what the subject sees**, not what they read: the chat messages about a clothing change still appear unless Clothing Changes awareness (above) is on as well.

---

### Blocking Self-Touch — Self-Touch Control · Yielding

| Say | Effect |
|---|---|
| *"you cannot touch your breasts"* | Blocks interaction with that specific zone (recognizes ~40 body terms) |
| *"you cannot touch yourself"* | Blocks self-touch across all zones |

This **prevents** the subject from touching themselves. Commanding autonomous touch is a separate system covered on its own page.

---

## Making Them Act

Commands such as *"Missy, touch your breasts"* make the subject's character physically execute the activity in-game. This relies on a dedicated permission (**Made to Act**) with its own structured syntax. The same verbs can be aimed at the hypnotist (*"Missy, kiss me"*) or, with **Made to Touch Others** also ticked, at someone else in the room by name (*"Missy, kiss Rei"*). Full verb mappings, targeting rules, and restrictions are detailed in [Commanded Activities](Commanded-Activities).

---

## Making It Last

To configure subconscious triggers that activate days later or suggestions that persist through waking, see [Triggers and Lasting Effects](Triggers-and-Lasting-Effects). While planting a trigger, these lines shape it:

| Say | What It Does |
|---|---|
| *"this trigger works only once"* · *"it works every time"* | Once, or until it fades. |
| *"it lasts 2 hours"* · *"it lasts forever"* | A time limit, or none. |
| *"anyone can use it"* · *"only I can use it"* | Who may fire it, within the subject's own setting. |
| *"only when you hear it exactly"* | Whole words only. |
| *"you will drop into trance"* | An instant drop (needs **Drop triggers**). |
| *"you will say 'I obey' three times"* | Words said aloud (needs **Made to Speak**). |
| *"five minutes after you wake, …"* · *"when Rei comes in, …"* · *"when Rei speaks, …"* | A compulsion: no word, waits for that instead. |

---

## If a Phrase Is Not Listed Here

The in-game **What to Say** reference (available via the **`?`** icon in settings or `/echs help`) is **generated directly from the internal pattern library**, ensuring it matches the installed code build. This wiki page covers standard, practical phrasing; if a variation doesn't trigger, verify it against the in-game list.
