# Commands

> **Alpha Notice**  
> ECHS is in active alpha development. Command syntax, debug outputs, and diagnostic helpers are evolving. Both `/echs` and `/hypno` are fully recognized prefixes.

---

Most features are **spoken**, not typed — see [What to Say](What-to-Say). These slash commands are the utility exceptions for managing sessions, inspecting client states, and handling emergency exits.

* `/echs` (or `/hypno`) on its own prints a short in-game command menu.
* `/echs help` (or `/hypno help`) opens the built-in guide.
* `/echs commands` (or `/hypno commands`) lists every registered command.

**`/echs` is the primary prefix, and `/hypno` remains fully supported.** Both prefixes point to the exact same handlers throughout the add-on. You can use whichever prefix you prefer; `/echs` is shown below as the standard.

---

## Session — Usable From Any State

| Command | What It Does | When You Would Use It |
|---|---|---|
| `/echs agree` | Accept an attempt — cooperative, improves their induction roll. | Answering an induction prompt without clicking, e.g. while in the wardrobe. |
| `/echs ignore` | Neither help nor resist. | Passive response. Letting the prompt time out in silence counts as this. |
| `/echs fight` | Resist — significantly lowers their roll. | Actively struggling against the induction without clicking. |
| `/echs wake` | Wake yourself, if the trance is shallow enough. | Attempting to shake off a light trance. A deep trance will refuse and inform you. |
| **`/echs safeword`** | **Hard stop. Clears the active trance and every lingering effect. Always works.** | Any time, under any condition, from any state. |
| `/echs effects` | Lists everything currently affecting you, and what would survive a reconnect. | Checking *"Why can't I do that?"* or diagnosing persistent states. |
| `/echs session` | Displays your active session state and which permissions are granted. | Checking *"Why didn't that suggestion land?"* |

**`effects` and `session` answer different questions:**
* `session` tells you what phase you are in and what permissions you have granted to the hypnotist.
* `effects` tells you what restrictions and states are actually active *on* your character right now. After reconnecting or reloading, `effects` is the command to check.

**`/echs safeword` (or `/hypno safeword`) is the baseline safety floor.** No feature, trigger, depth level, or lock can disable or override it. Because Bondage Club parses client slash commands before speech-restriction hooks ever see them, **the safeword works 100% of the time, even while your character is completely silenced.**

---

## Diagnostics — Inspect Without Changing Anything

| Command | What It Does | When You Would Use It |
|---|---|---|
| `/echs match <phrase>` | Reports what that phrase would trigger, or why it failed. | Quickly diagnosing whether phrasing was invalid or a permission/depth gate blocked it. Reports the name gate separately. |
| `/echs chance [name]` | Displays the calculated induction probability for each response against a target. | Deciding whether an attempt is mathematically viable or tuning trust. |
| `/echs gates` | Lists every depth gate, its threshold, and whether you are deep enough right now. | Checking *"How deep do I need to be for this to work?"* |
| `/echs triggers` | Displays all triggers planted in you, and flags any currently holding you. | Shows trigger strength and accessible tiers. (Displaying the actual phrase depends on your privacy settings). |
| `/echs carry [drop]` | Shows suggestions configured to survive the trance, or drops them immediately. | Reviewing or clearing lingering suggestions before waking. |
| `/echs skill` | Displays your own hypnotist skill rating and how the client calculates it. | Reviewing your induction experience and progression. |
| `/echs storage` | Reports where settings loaded from and what each data source holds. | Troubleshooting settings persistence or storage migration issues. |
| `/echs debug [on|off]` | Switches the add-on's routine browser-console lines on or off, for this browser only. Off by default; always on in the Hypno Testing room. With nothing after it, it flips the setting. | When you've been asked for console output with a bug report. The lines are filed under the console's *Verbose* (Chrome) or *Debug* (Firefox) level. |
| `/echs kneel` · `/echs stand` | Directly poses your character, bypassing matching, permissions, and sessions. `stand` resets the legs only, the same as the spoken command. | Verifying that BC's native posture API is responding correctly. |

---

## Data Management

| Command | What It Does |
|---|---|
| `/echs export` | Exports your saved settings as an encoded text blob to copy and backup. |
| `/echs import <blob>` | Restores your settings from a previously exported text blob. |
| `/echs reset` | Wipes all settings and progression back to defaults (requests confirmation, and clears any active trance first). |
| `/echs triggerdecay [rate]` | Views or adjusts how quickly planted trigger words fade over time *(separate from trust decay)*. |
| `/echs forgettrigger <number\|all>` | Deletes a planted trigger by its index from `/echs triggers`. **Refuses if that trigger is actively holding you.** |
| `/echs forgettrust <name\|number>` | Permanently deletes a saved player trust record from your history. |

---

## Testing Commands

There is a dedicated **Testing** suite — containing state forcing, simulated trigger aging, and automated test hooks — that is active **only** while inside a chat room named *Hypno testing*. 

Outside of that specific room, testing commands do not appear in `/echs help`, cannot be listed, and will refuse execution if typed.
