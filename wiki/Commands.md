# Commands

Most features are **spoken**, not typed — see [What to Say](What-to-Say). These are the exceptions.

`/hypno` on its own prints a short menu. `/hypno help` opens the in-game guide. `/hypno commands`
lists everything.

**`/echs` is the same command as `/hypno`** — the add-on's own name, registered alongside the
original so either works. Every command on this page can be typed with either prefix; the pages here
say `/hypno` throughout because that is the shorter one to type.

## Session — usable from any state

| Command | What it does | When you'd use it |
|---|---|---|
| `/hypno agree` | Accept an attempt — cooperative, improves their roll | Answering a prompt without clicking, e.g. from the wardrobe |
| `/hypno ignore` | Neither help nor resist | As above. Silence counts as this |
| `/hypno fight` | Resist — lowers their roll | As above |
| `/hypno wake` | Wake yourself, if the trance is shallow enough | A deep trance refuses and says so |
| **`/hypno safeword`** | **Hard stop. Clears the trance and every effect. Always works** | Any time, from any state |
| `/hypno effects` | Everything currently affecting you, and what would survive a reconnect | *"Why can't I do that?"* |
| `/hypno session` | Your session state and which permissions are granted | *"Why didn't that land?"* |

**`effects` and `session` answer different questions.** `session` says what phase you are in and what
you have permitted; `effects` says what is actually *on* you. After a reconnect, `effects` is the one
you want.

`/hypno safeword` is the floor. No feature, trigger, lock or setting can reach it, and because BC
parses commands before the speech block sees them, **it still works while you are silenced**.

## Diagnostics — look without changing anything

| Command | What it does | When you'd use it |
|---|---|---|
| `/hypno match <phrase>` | Reports what that phrase would trigger, and why not | Fastest way to tell "my wording was wrong" from "something else refused it" — it reports the name gate separately |
| `/hypno chance [name]` | The induction chance for each of the three choices against someone | Tuning, or deciding whether an attempt is worth it |
| `/hypno gates` | Every depth gate, what it needs, and whether you are deep enough now | *"How deep do I need to be for this?"* |
| `/hypno triggers` | The triggers planted in you, and which are holding you | Shows strength and the tier each still reaches. Whether phrases appear is your setting |
| `/hypno carry [drop]` | What is set to outlive the trance — or drops it | Checking before you wake |
| `/hypno skill` | Your own hypnotist skill, and how it is read | — |
| `/hypno storage` | Where settings loaded from, and what each source holds | When you suspect settings aren't persisting |
| `/hypno kneel` · `/hypno stand` | Pose yourself directly, bypassing matching, permissions and session | Checking BC's pose API works at all |

## Data

| Command | What it does |
|---|---|
| `/hypno export` | Prints your settings as a blob you can copy and keep |
| `/hypno import <blob>` | Replaces all settings with a previously exported blob |
| `/hypno reset` | Wipes all settings and stats back to defaults — asks first, and releases any trance before wiping |
| `/hypno triggerdecay [rate]` | Read or set how fast planted triggers fade *(separate from trust decay)* |
| `/hypno forgettrigger <number\|all>` | Remove a planted trigger by its number from `/hypno triggers`. **Refuses while that trigger is holding you** |
| `/hypno forgettrust <name\|number>` | Delete a stored trust entry outright |

## Testing commands

There is a **Testing** group — force-state commands, trigger aging, the test-bot channel — that is
live **only** in a chat room named *Hypno testing*, and off everywhere else and when not in a room.
Outside that room it is not listed in the help and refuses if typed.
