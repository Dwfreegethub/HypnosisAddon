# What to Say

> 🛡️ **EMERGENCY EXIT — ANY TIME, ANY STATE**  
> If you need to stop or end the scene immediately: **Type `/echs safeword`**.  
> Works 100% of the time, even while completely silenced. It instantly breaks active trances and releases all holding effects.

**This is the page to keep open while you play.** Almost nothing here is a slash command — you **speak** in ordinary chat, and the subject's local client decides whether anything takes hold. A command lands after a beat of 2 to 5 seconds, in the order you said them. Say several together and each gets its own beat after the one before lands, so they take hold one at a time. Waking and releasing never wait.

For a worked example of these phrases used in a live scene, see [A Sample Session](Sample-Session).

---

## Quick Jump

* **[The Three Rules](#the-three-rules)**
* **[Induction and Deepening](#induction-and-deepening--say-anything-you-like)**
* **[Going Deeper Mid-Trance](#going-deeper-mid-trance)**
* **[Ending a Trance](#ending-a-trance--never-gated)**
* **[Movement and Posture](#movement-and-posture)**
* **[Face](#face--posture-control--yielding-20)**
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

**Nothing you say during the induction window has to match a rigid pattern.** The window following an induction attempt (60 seconds, unless the subject has set it shorter; your countdown shows it) is dedicated to roleplay, and *every line you speak improves the roll outcome*, regardless of the exact words used. Set the scene, describe a swinging pendulum, count backwards — it all counts toward depth.

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

#### Holding Still

**"You cannot move" holds her still.** She stays in the pose and the place she is in: her own pose changes are refused (arms too), she cannot leave the room, and on a map room she cannot walk. If she tries, she sees *"You try to shift, and your body does not answer."* Your spoken pose commands (*"Missy, kneel"*) still move her, and so can anyone else who adjusts her pose. Items can still be put on her. Her safeword always ends it.

**"No one can move you" holds her harder.** The same stillness, and now nobody else can change her pose either: anyone who tries finds her back where she was, and she sees *"Someone tries to move you, and your body will not be moved."* The room is told *"Missy does not budge: her body stays exactly where it was."*, since the mover's own add-on may already have announced the move. Your spoken pose commands still move her. Her own message shows at most once every 30 seconds, and the same pose tried again within a minute is stopped without another room line (*Others See Your Reactions*, on her Trance Defaults tab, silences the room line). Saying *"you cannot move"* afterwards eases it back to the ordinary hold, and *"you can move again"* ends either one.

The trance can hold her either way on its own: **Cannot Move** and **...and no one else can move you either** on her Trance Defaults tab.

#### Poses

> ⚠️ **Caution (Patter Collision):** *"Surrender"* and *"relax your arms"* are active pose commands. With Posture Control ticked, *"Missy, surrender to my voice"* raises her arms over her head, and *"Missy, relax your arms and legs"* drops any arm pose she is holding.

| Say | Needs (Default Depth) |
|---|---|
| *"you cannot move"* · *"stay still"* · *"you are frozen"* · *"you will be frozen"* · *"you'll be stuck"* | Movement Restriction · **Yielding (20)** — holds her in her pose and place; others may still adjust her |
| *"no one can move you"* · *"nobody can move you"* · *"you cannot be moved"* · *"you are frozen solid"* · *"you are a statue"* | Movement Restriction · **Yielding (20)** — the same, and no one else can change her pose either |
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
| *“you can leave”* · *“stop following me”* · *“don't follow me”* · *“you don't have to follow me”* · *“you are free to go”* | — *release* |

**Poses come in two groups, legs and arms,** and one never undoes the other: *"kneel"* then *"hands behind your back"* leaves the subject kneeling with hands clasped. A pose that bondage prevents does not happen, and the room sees the subject try and fail rather than a line claiming it worked. *"On all fours"* and *"lie down"* are whole-body poses, so they take the arms with them. Bondage Club has no sitting or crossed-arms pose, so *"sit"* and *"cross your arms"* do nothing.

**Follow / Leash** uses Bondage Club's own leash, with no leash or collar needed and nothing to click. Once the phrase lands, the hypnotist is told the subject will follow. When the hypnotist leaves the room, the game brings the subject along, and the subject cannot walk out on their own while the hypnotist is in the room. *"You can leave"*, waking, or the safeword ends it.

It needs three things. **Both players must run ECHS:** without it on the hypnotist's side, the subject feels the pull but nothing can take them to another room, and the subject is told so. **The subject's own Bondage Club setting that lets others leash them must be on** (Preferences, Immersion). **The room must not block leashing.** If either setting stops it, the phrase does not land and the hypnotist is told why. Being tied to furniture or shut in a cage also stops it, as it does a real leash. Only the person who said the phrase can lead the subject.

---

### Face — Posture Control · Yielding (20)

The subject's face changes the way they are told, and everyone in the room sees it.

| Say | What it does |
|---|---|
| *"close your eyes"* · *"your eyes close"* · *"you cannot open your eyes"* | Eyes closed |
| *"eyes wide"* · *"widen your eyes"* | Eyes wide, surprised |
| *"your eyes glaze over"* · *"your eyes go blank"* | Dazed eyes |
| *"hearts in your eyes"* | Heart eyes |
| *"open your eyes"* · *"eyes open"* | — *release* (eyes only) |
| *"open your mouth"* · *"mouth open"* · *"open wide"* | Mouth open |
| *"part your lips"* · *"your lips part"* | Lips parted |
| *"stick out your tongue"* · *"tongue out"* · *"show me your tongue"* | The tip of the tongue out |
| *"let your tongue hang out"* · *"tongue all the way out"* | Tongue all the way out, eyes rolled back |
| *"bite your lip"* | Biting the lower lip |
| *"smile"* · *"grin"* · *"smirk"* · *"pout"* · *"moan for me"* | That expression |
| *"frown"* · *"look sad"* · *"wince"* | That expression (since v1.16.5) |
| *"close your mouth"* · *"tongue back in"* | — *release* (mouth only) |
| *"blush"* · *"your cheeks burn"* | A deep blush |
| *"raise your eyebrows"* · *"raise an eyebrow"* · *"furrow your brow"* | Both eyebrows up, one up, or furrowed (since v1.16.5) |
| *"drool"* · *"drool for me"* | Drool (since v1.16.5) |
| *"cry"* · *"cry for me"* · *"tears roll down your cheeks"* | Tears (since v1.16.5). Not *"cry out"*. |
| *"dry your eyes"* · *"wipe your mouth"* | — *release* (drool and tears) |
| *"relax your face"* · *"your face relaxes"* | — *release* (the whole face) |

**A face lasts until it is let go or the subject wakes.** Waking, the safeword, or turning hypnosis off puts the face back as it was before, and *"that will stay with you"* does not carry it past the wake. If the subject has spiral eyes on (Trance Defaults), *"close your eyes"* closes them and *"open your eyes"* brings the spirals back. A face the subject changes themselves in the meantime is theirs, and is left alone. A face can also be a trigger's action, like any other suggestion.

> ⚠️ **Caution (Patter Collision):** *"Close your eyes"* is common deepening patter. With Posture Control ticked and the subject under, it now closes their eyes. Plain words like *"smile"* and *"blush"* work on their own too, though not in lines such as *"you make me smile"* or *"I love your smile"*.

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

**Words that slip past her** (since v1.24.0, same permission):

| Say | What she sees |
|---|---|
| *"my words slip past you"* · *"you will obey without knowing what I said"* · *"my words are a murmur to you"* | From then on, what **you** say to her (her name, or a whisper) still lands, but her screen shows only *"[Your name] murmurs something you can't quite catch."* The room sees your real words. Her own reaction lines still show, so she feels it land without knowing why. |
| *"you can understand my words again"* · *"my words are clear to you again"* · *"you can hear everyone again"* | — *release* |

It ends when she wakes, and with the safeword; it isn't carried past waking. Out-of-character text stays readable.

**Out-of-character text in (parentheses) always gets through**, and so does everything she can see. While it is on, other people's commands and trigger words don't reach her. It lasts until the trance ends; as a trigger, "my voice" means whoever says the trigger word. What else gets through, and how long it lasts: **[Sensory Modulation](Sensory-Modulation#hearing-only-one-voice)**.

### Sight — Sight · Entranced (40)

| Say | What she sees |
|---|---|
| *"your vision is dimming"* · *"the room grows dim"* | Dim: her screen at about a third of its brightness (BC's light blindness) |
| *"you can barely see"* · *"everything is going dark"* | Very dark (BC's normal blindness) |
| *"you cannot see"* · *"you are blind"* · *"everything is fading to black"* | Black (BC's heavy blindness) |
| *"you can see again"* · *"your vision clears"* | — *release* |

**This is Bondage Club's own blindness**, so her own BC settings cap it: on *Light* Sensory Deprivation it stops at very dark, and you are told. Nobody else sees a change. *"That will stay with you"* can carry it past the wake, and it can be planted in a trigger. More: **[Sensory Modulation](Sensory-Modulation#sight)**.

---

### Clothing

| Say | Needs (Default Depth) |
|---|---|
| *"you cannot change your clothes"* · *"leave your clothes alone"* | Clothing Restriction · **Yielding (20)** |
| *"take something off"* · *"undress"* | Undressing · **Entranced (40)** |
| *"take everything off"* · *"strip"* | Undressing · **Entranced (40)** |
| *“you can change your clothes”* · *“your clothes are yours again”* | — *release* |

Undressing takes clothes off from the outside in: jacket, top, accessories, skirt, undershirt, leggings, corset, bra, panties, garters, shoes, socks, gloves. It also removes the extra clothing slots added by the Echo clothing add-on (*Cloth 2*, *Bottom 2*, long sleeves and so on). Hats, glasses, masks, jewellery, wings and tails stay on.

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
| *"you feel a hand on your thigh"* · *"you feel lips on your neck"* · *"you feel hands all over you"* · *"you feel a hand squeeze your breasts"* | Phantom touch (since v1.19.0) |

**Phantom touch:** she feels a touch nobody is giving her. Only she sees the line. It does what a real touch would: the game's own arousal for that kind of touch on that spot, by her own likes and dislikes, and her face may react as it would. The room sees nothing in the chat most of the time; now and then a short reaction such as *"Missy shivers, though nobody is touching her"*, never saying where, and only with *Others see your reactions* on. What touches her comes from the words: a hand, fingers or a touch is a caress, unless it squeezes (grope), pinches, spanks, slaps, tickles, scratches or tugs her hair; lips are a kiss, a tongue a lick, teeth a bite. Name a part with *your …* (around 40 words, plus *your back*), *between your legs*, or *all over you*. Numbness stops it, as it stops real touches. It can go in a trigger, and a compulsion held while worn brings it back with the arousal.

**Held at the edge:** while denied, reaching the top is said to you and the room the first time. If it keeps happening (a toy, say), only you are told again, less and less often: after 2 minutes, then 4, 8, and at most every 15 minutes. Five minutes without reaching the top starts it over.

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

**Seeing yourself otherwise** (since v1.21.0, same permission, now called **Illusions**). Her own screen shows her differently from how she is; everyone else sees her as she really is.

| Say | She sees |
|---|---|
| *"you see yourself naked"* · *"…nude"* · *"you look naked to yourself"* | no clothes at all (makeup, body and restraints stay) |
| *"you see yourself topless"* · *"…bottomless"* · *"…in your underwear"* | those clothes gone |
| *"you see yourself without your bra"* (*panties, top, skirt, shoes, socks, gloves…*, several with *and*) | those gone; say another and it adds to it |
| *"you see yourself tied up"* · *"you are tied up in rope"* | rope on her arms, legs and ankles |
| *"your wrists are bound in rope"* · *"your ankles are cuffed"* · *"your arms and legs are chained"* · *"you see tape on your wrists"* | that, there (rope, cuffs, chains, tape) |
| *"you see yourself gagged"* (*with tape*, *with cloth*) · *"you see yourself blindfolded"* · *"you see yourself cuffed and gagged"* | a gag or blindfold |
| *"the ropes are gone"* · *"you see yourself untied"* | — *release* (the bindings only) |
| *"you see yourself dressed"* · *"your clothes are back"* | — *release* (the undressing only) |
| *"you can see yourself again"* · *"look at yourself"* | — *release* (everything she sees) |

* **On its own it doesn't hold her.** The rope is a picture; she can still move and use her hands, and the room sees her free. The hypnotist is told so, and how to make it hold.
* **"The ropes feel real"** (since v1.22.0; also *"they feel real"*, *"the cuffs / gag / blindfold feel real"*). The imagined items' own Bondage Club restrictions then hold her, as the real item would: arm rope, cuffs, chains or tape stop her using her hands; a gag garbles her speech; a blindfold blinds her (as far as her own sensory settings allow); some leg and ankle ties slow her; floor shackles and the like freeze her where she stands (since v1.23.1). Each kind needs her permission for it: **Movement Restriction** for her body, **Speech Restriction** for a gag, **Sight** for a blindfold, **Clothing Restriction** for an item that keeps her out of her wardrobe, at that permission's depth. What she hasn't allowed is left out and the hypnotist is told. Anything added to the picture while it is real holds too. *"The ropes are not real"* (*"they don't feel real"*) makes it a picture again; *"the ropes are gone"*, any release of the illusion and the safeword end both. It never takes away a *"you cannot move"* that was given separately.
* Something she really wears in a spot wins over what she imagines there.
* While she sees herself naked, chat messages about her clothes being changed are hidden from her; while she sees rope, messages about her restraints are. So her log doesn't contradict what she sees.
* **Any item, any option: the bondage picker** (since v1.23.0). In the [popup](The-ECHS-Popup)'s Suggestions tab, under **Clothes**: pick a **slot** (arms, legs, mouth, head…), an **item** (with a search box) and its **options** (one list for a simple item, one per part for items like the straitjacket), then **type it**. It types *"Missy, you see a Leather Armbinder on you"*; when you press Enter, her ECHS is sent the exact item and options privately, so it works even if you play Bondage Club in different languages. It is a bondage illusion like the spoken ones: only she sees it, *"the ropes feel real"* makes its own restrictions hold (including what its options add), *"the ropes are gone"* ends it, and it can be planted into a trigger (*"your trigger word is …"*, the picker, *"remember trigger"*). It can't go into a *"when anyone …"* line yet.
* **Naked and tied together** (since v1.22.1): seeing herself undressed and seeing herself tied run side by side, and each is ended by its own release above. The frozen-outfit illusion is the one that doesn't mix: starting it ends both, and starting either of these ends it (the hypnotist is told).
* *"All of this will stay with you"* keeps up to 12 suggestions; past that the oldest are left out and the hypnotist is told which.
* Works in triggers (*"Missy, your trigger word is ribbon"*, *"you see yourself tied up"*, *"remember trigger"*) and can stay after waking (*"that will stay with you"*). The safeword ends it.

---

### Blocking Self-Touch — Self-Touch Control · Yielding (20)

| Say | Effect |
|---|---|
| *"you cannot touch your breasts"* | Blocks interaction with that specific zone (recognizes ~40 body terms) |
| *"you cannot touch yourself"* | Blocks self-touch across all zones |
| *"you can touch your breasts"* · *"your breasts are yours again"* | — *release* (that zone) |
| *"you can touch yourself"* | — *release* (every zone) |

This **prevents** the subject from touching themselves. Commanding autonomous touch is a separate system covered on its own page.

---

## Making Them Act

Commands such as *"Missy, touch your breasts"* make the subject's character physically execute the activity in-game. This relies on a dedicated permission (**Made to Act**) with its own structured syntax. The same verbs can be aimed at the hypnotist (*"Missy, kiss me"*) or, with **Made to Touch Others** also ticked, at someone else in the room by name (*"Missy, kiss Rei"*). Since v1.16.5 there are movements too: *"wiggle your hips"*, *"shake your breasts"*, *"nod"*, *"struggle"* while tied, and sounds through a gag (*"moan"*, *"whimper"*); and on someone else *"hug Rei"*, *"kick Rei"*, *"grab Rei by the collar"*, *"cover my mouth"*. Full verb mappings, targeting rules, and restrictions are detailed in [Commanded Activities](Commanded-Activities).

---

## Making It Last

To configure subconscious triggers that activate days later or suggestions that persist through waking, see [Triggers and Lasting Effects](Triggers-and-Lasting-Effects). While planting a trigger, these lines shape it:

| Say | What It Does |
|---|---|
| *"this trigger works only once"* · *"it works every time"* | Once, or until it fades. |
| *"it lasts 2 hours"* · *"it lasts forever"* | A time limit, or none. |
| *"anyone can use it"* · *"your owner can use it too"* · *"your lovers can use it"* · *"your friends can use it"* · *"only I can use it"* | Who may fire it, within the subject's own setting. |
| *"only when you hear it exactly"* | Whole words only. |
| *"you will drop into trance"* | An instant drop (needs **Drop triggers**). |
| *"you will say 'I obey' three times"* | Words said aloud (needs **Made to Speak**). |
| *"touch your breasts three times"* | A touch, repeated (up to five; one action slot). |
| *"take a sip"* · *"drink up"* | She sips the drink in her hand ([Taking a Sip](Commanded-Activities#taking-a-sip)). |
| *"five minutes after you wake, …"* · *"when Rei comes in, …"* · *"when Rei speaks, …"* · *"when anyone kisses you, …"* | A compulsion: no word, waits for that instead. [What *anyone* can do](Triggers-and-Lasting-Effects#5-compulsions-waiting-for-something-not-a-word). |

Every trigger, including a compulsion or one named and filled on a single line (*"Missy, when you hear ember glow, kneel"*), is saved only by *"Missy, remember trigger"*. *"Missy, forget the trigger"* cancels it.

**Carrying a suggestion past waking** (needs **Deep (60)** earned depth, like planting):

| Say | What It Does |
|---|---|
| *"Missy, that will stay with you"* | Keeps the most recent suggestion after she wakes. |
| *"Missy, all of this stays with you"* | Keeps everything active. |
| *"Missy, forget what I said"* | Takes it back. |

The automatic trance defaults (Cannot Move, Cannot Speak, the screen effect) never carry, so she always wakes with her movement and voice back. Hearing is not carried either.

---

## If a Phrase Is Not Listed Here

The in-game **What to Say** reference (available via the **`?`** icon in settings or `/echs help`) is **generated directly from the internal pattern library**, ensuring it matches the installed code build. This wiki page covers standard, practical phrasing; if a variation doesn't trigger, verify it against the in-game list.