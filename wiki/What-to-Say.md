# What to Say

> 🛡️ **EMERGENCY EXIT — ANY TIME, ANY STATE**  
> If you need to stop or end the scene immediately: **Type `/echs safeword`**.  
> Works 100% of the time, even while completely silenced. It instantly breaks active trances and releases all holding effects.

> **Alpha Notice**  
> ECHS is in active alpha development. Command parsers and speech triggers are actively being refined. If a phrase fails to trigger, double-check that your partner’s name is included, the required permission is ticked on their client, and their trance depth is sufficient.

**This is the page to keep open while you play.** Almost nothing here is a slash command — you **speak** in ordinary chat, and the subject's local client decides whether anything takes hold.

For a worked example of these phrases used in a live scene, see [A Sample Session](Sample-Session).

---

## Quick Jump

* **[The Three Rules](#the-three-rules)**
* **[Induction and Deepening](#induction-and-deepening--say-anything-you-like)**
* **[Going Deeper Mid-Trance](#going-deeper-mid-trance)**
* **[Ending a Trance](#ending-a-trance--never-gated)**
* **[Movement and Posture](#movement-and-posture)**
* **[Speech](#speech)**
* **[Hearing](#hearing--hearing--entranced-40)**
* **[Sight](#sight--sight--entranced-40)**
* **[Clothing](#clothing)**
* **[Arousal and Orgasm](#arousal-and-orgasm--all-require-arousal--orgasm--entranced-40)**
* **[Suppressed Awareness](#suppressed-awareness)**
* **[The Clothing Illusion](#the-clothing-illusion--clothing-illusion--deep-60-earned-only)**
* **[Blocking Self-Touch](#blocking-self-touch--self-touch-control--yielding-20)**
* **[Making Them Act](#making-them-act)**
* **[Making It Last](#making-it-last)**

---

## The Three Rules

**1. Say their name, or whisper.** Every suggestion said out loud needs the subject's name (or recognized nickname) somewhere in the sentence. Without it, the client ignores the line completely — this keeps ordinary conversation completely inert. **A whisper to them needs no name** (since v0.100.3): a whisper is already addressed to them, so *"kneel"* whispered works like *"Missy, kneel"*. Text in (parentheses) is still out of character and never a command.

**2. Contractions and punctuation do not matter.** *"You can't move"*, *"you cannot move"*, and *"Missy — you CAN'T move!"* are evaluated identically by the parser. A stutter from high arousal doesn't break a line either: *"M-Missy, y-you c-cannot move"* works like the plain version.

**3. Talking about yourself is ignored.** Any line starting with "I" or "we" without a "you" never fires an effect. For example, *"I kneel beside you"* will never force anyone to kneel.

**Several people in one line.** *"Missy, kneel. Ella, stand."* gives each of them only their own part. A comma, full stop, *"and"*, *"then"* or a new line separates the parts, so *"Missy kneel and Ella stand"* works too. Each subject's client works out which part names them, from the room's own list of who is there.

**Not sure whether a phrase matches?** Running `/echs match <phrase>` will test the sentence and report whether the wording and the name gate pass.

---

## Induction and Deepening — Say Anything You Like

**Nothing you say during the induction window has to match a rigid pattern.** The 60-second window following an induction attempt is dedicated to roleplay, and *every line you speak improves the roll outcome*, regardless of the exact words used. Set the scene, describe a swinging pendulum, count backwards — it all counts toward depth.

The pattern library below is strictly for triggering **effects**, not for building atmosphere. You do not need specific phrasing just to speak hypnotically.

> ⚠️ **Caution (Parser Collision):** Because `feel` is currently recognized as a touch-command verb, a deepening line like *"Missy, your arms feel heavy"* can inadvertently be parsed as a command to caress arms if *Made to Act* is granted. Stick to words like *heavy*, *limp*, or *relaxed*, and avoid using `"feel"` while *Made to Act* is active. See [Troubleshooting](Troubleshooting) for details.

---

## Going Deeper Mid-Trance

Once she is under with you, you can take her deeper:

| Say | Effect | Limits |
|---|---|---|
| *"Missy, sink deeper"* · *"go deeper"* · *"drop deeper"* · *"fall deeper"* · *"sleep deeper"* · *"relax deeper"* · *"let go deeper"* · *"deeper and deeper"* · *"drift deeper into trance"* | Takes her deeper, if the roll succeeds. | • Name required (or whisper to her).<br>• At least 1 minute between tries.<br>• Needs another suggestion to land in between.<br>• Capped by her *"Sink deeper" stops at* setting.<br>• *Never unlocks earned-only features (triggers, carry-over, illusions).* |

* **Quick Rules:** Each success takes her a noticeable step down when shallow, but only nudges her once she is deep. A miss does nothing unless she is actively fighting, which can bring her back up.
* *For the full math, formulas, and fighting chances, see **[How an Induction Works](How-Inductions-Work#5-going-deeper-once-under)**.*

---

## Ending a Trance — Never Gated

These phrases require no permissions and no minimum depth. They always succeed.

| Say | Effect | Notes |
|---|---|---|
| *"wake up"* · *"you are awake"* · *"come back to me"* | Ends the trance completely | Wakes the subject instantly; all session restrictions drop. |
| *"walk with me"* | **Walking trance** | Subject can move; visual screen veil thins. |
| *"be still"* | Returns to stillness | Restores hypnotic immobility. |

---

## The Suggestions

Each suggestion requires its specific **permission** enabled on the subject's client, and most require a minimum **depth**. *Releases are shown in italics* — releases skip permission checks, because clearing an effect should never be harder than applying one.

### Movement and Posture

**"You cannot move" holds her still.** She stays in the pose and the place she is in: her own pose changes are refused (arms too), she cannot leave the room, and on a map room she cannot walk. Your spoken pose commands (*"Missy, kneel"*) still move her; nobody else can change her pose. Items can still be put on her. Her safeword always ends it.

> ⚠️ **Caution (Patter Collision):** *"Surrender"* and *"relax your arms"* are active pose commands. With Posture Control ticked, *"Missy, surrender to my voice"* raises her arms over her head, and *"Missy, relax your arms and legs"* drops any arm pose she is holding.

| Say | Needs (Default Depth) |
|---|---|
| *"you cannot move"* · *"stay still"* · *"you are frozen"* · *"you will be frozen"* · *"you'll be stuck"* | Movement Restriction · **Yielding (20)** — holds her in her pose and place |
| *"kneel"* · *"on your knees"* | Posture Control · **Yielding (20)** |
| *"kneel spread"* · *"spread your knees"* | Posture Control · **Yielding (20)** |
| *"spread your legs"* · *"stand with your legs apart"* | Posture Control · **Yielding (20)** |
| *"legs closed"* · *"feet together"* | Posture Control · **Yielding (20)** |
| *"on all fours"* · *"get on your hands and knees"* | Posture Control · **Yielding (20)** |
| *"lie down"* · *"down on your stomach"* | Posture Control · **Yielding (20)** |
| *"stand"* · *"get up"* · *"on your feet"* | — *release* (legs only; arms stay where they are) |
| *"hands behind your back"* | Posture Control · **Yielding (20)** |
| *"arms behind your back"* · *"box your arms"* | Posture Control · **Yielding (20)** |
| *"elbows behind your back"* | Posture Control · **Yielding (20)** |
| *"put your hands up"* · *"raise your arms"* · *"hands above your head"* · *"surrender"* · *"hands where I can see them"* | Posture Control · **Yielding (20)** |
| *"hold your arms out"* · *"yoke your arms"* | Posture Control · **Yielding (20)** |
| *"relax your arms"* · *"arms at your sides"* | — *release* (arms only) |
| *“you can move again”* · *“your body is your own”* | — *release* |
| *"follow me"* · *"stay close"* · *"heel"* | Follow / Leash · **Entranced (40)** |
| *“you can leave”* · *“you don't have to follow me”* · *“you are free to go”* | — *release* |

**Poses come in two groups, legs and arms,** and one never undoes the other: *"kneel"* then *"hands behind your back"* leaves the subject kneeling with hands clasped. A pose that bondage prevents does not happen, and the room sees the subject try and fail rather than a line claiming it worked. *"On all fours"* and *"lie down"* are whole-body poses, so they take the arms with them. Bondage Club has no sitting or crossed-arms pose, so *"sit"* and *"cross your arms"* do nothing.

**Follow / Leash** hooks into Bondage Club's native leash system. The phrase makes the subject leashable on command; the hypnotist then takes the leash using the standard **Hold Leash** button. The game handles room transitions automatically, and the subject cannot walk away while held. This requires the subject's native BC leashing settings to allow it, and only the active hypnotist can hold the leash while under trance.

---

### Speech

| Say | Needs (Default Depth) |
|---|---|
| *"you cannot speak"* · *"stay silent"* · *"not a word"* | Speech Restriction · **Yielding (20)** |
| *“you can speak again”* · *“your voice is back”* | — *release* |

This blocks regular public room chat. It cannot touch slash commands, so emergency releases remain available. **Out-of-character (OOC) text enclosed in parentheses passes through by default** — a silenced player can always type *"(brb)"* or *"((brb))"*. OOC speech is only suppressed if the subject explicitly toggled **Silence OOC too** under their Trance Defaults tab.

#### Making Them Say Words — Made to Speak · planted as a trigger

**There is no "say this now" command.** Making the subject speak is done with a **trigger**: you plant the words, and they say them aloud in the room every time the trigger word is spoken afterwards. It needs the **Made to Speak** permission (off by default) and, like every trigger, a trance deep enough to plant one (**Deep (60)** on earned depth by default).

In one line, then saved:

> *"Missy, when you hear ember glow, you will say 'I obey'"*  
> *"Missy, remember trigger"*

Or step by step:

> *"Missy, your trigger word is ember glow"*  
> *"Missy, you will say 'I obey' three times"*  
> *"Missy, remember trigger"*

Now anyone allowed to use it saying *"ember glow"* in the room makes Missy say *"I obey"* (three times, a second or two apart, in the second example; up to five). The words go in quotes. See [Words to Say](Triggers-and-Lasting-Effects#words-to-say) for the details and limits.

---

### Hearing — Hearing · Entranced (40)

| Say | What she hears |
|---|---|
| *"you hear only my voice"* · *"you will only hear me"* · *"my voice is the only one you can hear"* | Everything **you** say, named or not. Nobody else. |
| *"you only hear what is said to you"* · *"you only hear your name"* | Only lines that use **her name**, and whispers to her, from anyone. |
| *"you can hear everyone again"* · *"your hearing comes back"* | — *release* |

**What she still gets:** everything she can *see* — emotes, activities, items going on, people coming and going — and her own lines. **Out-of-character text in (parentheses) always gets through**, in chat or whispers, from anyone: a friend can still ask *"(are you ok?)"*. Everything else said in the room is hidden, and now and then (at most once a minute) she is told that other voices are there and don't matter.

**What she can't hear can't reach her.** While it is on, other people's commands and trigger words do nothing to her. In the "her name" version, a line that names her is heard, so it works as normal.

**Spoken, it lasts until the trance ends** (or the release, or her safeword). It is not carried by *"that will stay with you"*. **As a trigger**, "my voice" means **whoever says the trigger word**, and it lasts as long as her trigger effects do. Her safeword always ends it.

### Sight — Sight · Entranced (40)

| Say | What she sees |
|---|---|
| *"your vision is dimming"* · *"the room grows dim"* | Dim: her screen at about a third of its brightness (BC's light blindness) |
| *"you can barely see"* · *"everything is going dark"* | Very dark (BC's normal blindness) |
| *"you cannot see"* · *"you are blind"* · *"everything is fading to black"* | Black (BC's heavy blindness) |
| *"you can see again"* · *"your vision clears"* | — *release* |

**This is Bondage Club's own blindness**, so her own BC settings decide how far it goes and what comes with it. With her *Sensory Deprivation* setting on **Light**, BC never goes past "very dark", whatever you say (you are told when that happens). Her *Blind Adjacent*, *Blind Disable Examine* and name-hiding settings apply exactly as they do under a blindfold, and a real blindfold adds to it. Nobody else sees any change.

It ends with the trance, the release, or her safeword, and *"that will stay with you"* can carry it past the wake. It can be planted in a trigger.

---

### Clothing

| Say | Needs (Default Depth) |
|---|---|
| *"you cannot change your clothes"* · *"leave your clothes alone"* | Clothing Restriction · **Yielding (20)** |
| *"take something off"* · *"undress"* | Undressing · **Entranced (40)** |
| *"take everything off"* · *"strip"* | Undressing · **Entranced (40)** |
| *“you can change your clothes”* · *“your clothes are yours again”* | — *release* |

---

### Arousal and Orgasm — All Require Arousal & Orgasm · Entranced (40)

| Say | Effect |
|---|---|
| *"you are not aroused"* · *"your arousal fades"* · *"you feel no desire"* | Drops arousal to zero |
| *"you are lightly aroused"* · *"you feel a little warm"* | Sets arousal to light |
| *"you are very aroused"* · *"you are desperate"* · *"you need it badly"* | Sets arousal to high |
| *"you are right on the edge"* · *"you are so close"* | Edges near the maximum |
| *"you cannot come"* / *"you cannot cum"* · *"you must not cum"* · *"you are not permitted to cum"* · *"you're forbidden from cumming"* · *"don't you dare cum"* | Enables orgasm denial |
| *"you cannot cum until I allow you to"* | Also a denial. Holds until the hypnotist explicitly lifts it. |
| *"you may come now"* / *"you may cum now"* · *"you are allowed to orgasm"* | Disables orgasm denial |
| *"come for me"* / *"cum for me"* · *"you will come now"* | Triggers forced climax |
| *"you cannot feel my touch"* · *"you feel nothing when I touch you"* | Sexual numbness |
| *“you can feel my touch again”* · *“you can feel again”* | — *release* |

Native chastity items or locked edging crafts will still prevent forced climaxes. ECHS queries game state rather than overriding native mechanics.

**Numbness vs. Suppression:** Numbness prevents arousal from registering at all. Suppression allows arousal to increase normally, but conceals the feedback from the subject's view.

---

### Suppressed Awareness

Awareness hides the **chat messages** about what is done to you. It does not change what you see of your own body: that is the clothing illusion, below. They are separate permissions with separate lines, and a subject who should neither read about a change nor see it needs both.

| Say | Needs (Default Depth) |
|---|---|
| *"you will not notice being undressed"* · *"you will not notice when I strip you"* | Clothing Changes · **Drifting (0)** |
| *"you notice being undressed again"* · *"clothing changes register again"* | — *release* |
| *"you will not notice the ropes"* · *"you do not notice being tied"* | Bondage Changes · **Drifting (0)** |
| *"you notice the ropes again"* | — *release* |
| *"you will ignore my touches"* | Touches / Activities · **Drifting (0)** |
| *"you notice my touches again"* · *"you register my touch"* | — *release* |
| *"you notice nothing"* · *"you are unaware"* | Enables all three simultaneously (Drifting / 0) |
| *“you notice everything again”* · *“you can notice again”* | — *releases all three, plus clothing illusions* |

"You may notice…" on its own is ordinary patter and releases nothing. Say what comes back: *"you can notice everything"*.

---

### The Clothing Illusion — Clothing Illusion · Deep (60), Earned Only

| Say | Effect |
|---|---|
| *"you cannot tell what you are wearing"* · *"your clothes look the same to you"* | Freezes the subject's local rendering on their starting outfit |
| *“look at yourself”* · *“you notice your clothes”* · *“you can see yourself again”* | — *release* |

The rest of the room sees actual wardrobe changes in real-time. Only the subject's local screen remains locked on the illusion. It changes **what the subject sees**, not what they read: the chat messages about a clothing change still appear unless Clothing Changes awareness (above) is on as well.

---

### Blocking Self-Touch — Self-Touch Control · Yielding (20)

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
| *"touch your breasts three times"* | A touch, repeated (up to five; one action slot). |
| *"five minutes after you wake, …"* · *"when Rei comes in, …"* · *"when Rei speaks, …"* | A compulsion: no word, waits for that instead. |

Every trigger, including a compulsion or one named and filled on a single line (*"Missy, when you hear ember glow, kneel"*), is saved only by *"Missy, remember trigger"*. *"Missy, forget the trigger"* cancels it.

**Carrying a suggestion past waking** (needs **Deep (60)** earned depth, like planting):

| Say | What It Does |
|---|---|
| *"Missy, that will stay with you"* | Keeps the most recent suggestion after she wakes. |
| *"Missy, all of this stays with you"* | Keeps everything active. |
| *"Missy, forget what I said"* | Takes it back. |

The automatic trance defaults (Cannot Move, Cannot Speak, Screen Fade) never carry, so she always wakes with her movement and voice back. Hearing is not carried either.

---

## If a Phrase Is Not Listed Here

The in-game **What to Say** reference (available via the **`?`** icon in settings or `/echs help`) is **generated directly from the internal pattern library**, ensuring it matches the installed code build. This wiki page covers standard, practical phrasing; if a variation doesn't trigger, verify it against the in-game list.