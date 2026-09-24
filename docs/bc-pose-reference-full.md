# BC Pose Reference

Lookup table for writing pose code against Bondage Club. Verified 2026-09-23 against BC master.

**Every claim below is tagged with what it rests on:**

| Tag | Meaning |
|---|---|
| **[TYPEDEF]** | Upstream `BondageClub/Scripts/Typedef.d.ts`, fetched from master. Authoritative |
| **[ADDON]** | This repository's shipped, tested code |
| **[BOTS]** | Production bots in `D:\Games\BC-Bot\bondage-club-bot-hub-master` — empirically working against the live server |
| **[INFERENCE]** | Reasoned from the above. **Not** independently confirmed |

---

## 1. The complete catalogue — 15 poses

**[TYPEDEF]** `AssetPoseMap`, verbatim:

```ts
interface AssetPoseMap {
	BodyHands: 'TapedHands',
	BodyUpper: 'BaseUpper' | 'BackBoxTie' | 'BackCuffs' | 'BackElbowTouch' | 'OverTheHead' | 'Yoked',
	BodyLower: 'BaseLower' | 'Kneel' | 'KneelingSpread' | 'LegsClosed' | 'Spread',
	BodyFull:  'Hogtied' | 'AllFours',
	BodyAddon: 'Suspension',
}
```

| Category | Poses |
|---|---|
| `BodyHands` | `TapedHands` |
| `BodyUpper` | `BaseUpper` · `BackBoxTie` · `BackCuffs` · `BackElbowTouch` · `OverTheHead` · `Yoked` |
| `BodyLower` | `BaseLower` · `Kneel` · `KneelingSpread` · `LegsClosed` · `Spread` |
| `BodyFull` | `Hogtied` · `AllFours` |
| `BodyAddon` | `Suspension` |

> **This is the entire set. If a string is not in this table, it is not a pose.** Do not invent
> names, do not guess at plausible variants, and do not pass anything else to a pose API.

`AssetPoseName` is the union of all 15; `AssetPoseCategory` is the five category keys. **[TYPEDEF]**

---

## 2. Corrections — names that look right and are not

| Wrong | Correct | Note |
|---|---|---|
| `OverHead` | **`OverTheHead`** | `BodyUpper`. **[BOTS]** three files call `SetActivePose(["OverTheHead", "Kneel"])` |
| `HandsBehindBack` | **`BackCuffs`** | No pose named `HandsBehindBack` exists. `BackCuffs` is the hands-behind-back pose |
| `Yoke` | **`Yoked`** | `BodyUpper`. **[BOTS]** four files call `SetActivePose(["Yoked"])` |
| `ArmsCrossed` / `CrossedArms` / `Crossed` | *(nothing)* | **BC has no crossed-arms pose at all.** Not a naming problem — the pose does not exist |
| `Sit` / `SitClosed` | *(nothing)* | **Sitting is not a pose.** It is furniture- and item-driven |
| `Surrender` | *(nothing)* | No such pose. Closest in intent is `OverTheHead` |

### Why `Sit` is confusing

**[TYPEDEF]** `"Sit"` *does* exist in BC — as a member of `ActivityNameBasic`, the **activity** list,
alongside `Kiss`, `Spank`, `Caress` and so on. It is not in `AssetPoseMap`. If code searches BC for
`"Sit"` and finds a hit, that hit is an activity, not a pose.

---

## 3. Neutral and reset

**[TYPEDEF]** `type NullPoseType = null | ""` — *"XXX: we're not always consistent there"* is
upstream's own comment on that line, so **accept both when reading and prefer `null` when writing.**

Two explicit neutral poses also exist and are named:

- **`BaseUpper`** — neutral arms
- **`BaseLower`** — neutral stand

**[BOTS]** `SetActivePose([])` (empty array) is the bot-library reset. **[BOTS]** `SetActivePose(["BaseUpper"])`
is used to reset only the upper body while leaving the lower body alone.

**[ADDON]** `setSuggestedPose(null)` is this repository's reset — see §6.

---

## 4. Standalone versus item-locked

**[TYPEDEF]** The `Pose` object carries the flags that answer this:

```ts
interface Pose {
	Name: AssetPoseName;
	Category: AssetPoseCategory;
	AllowMenu?: true;            // player may select it freely
	AllowMenuTransient?: true;   // only offered when a worn asset supports it
	OverrideHeight?: AssetOverrideHeight;
	MovePosition?: { Group: AssetGroupName; X: number; Y: number; }[];
}
```

- **`AllowMenu`** → freely settable.
- **`AllowMenuTransient`** → item must permit it.

**Read these flags rather than hard-coding assumptions about which poses are free.**

### The live check — prefer this over any static list

**[TYPEDEF]** `Character.CanChangeToPose(pose: AssetPoseName) => boolean`

This is the runtime answer for "can this character take this pose right now", accounting for worn
items. Use it before setting a pose that might be blocked.

### Item-driven pose application

**[TYPEDEF]** Assets and item properties can force poses:

- `AssetGroup.SetPose?: readonly AssetPoseName[]`
- `Property.SetPose` — per-application override, takes priority over the asset default
- `PosePrerequisite = \`Can${AssetPoseName}\`` — items declare prerequisites like `CanKneel`,
  `CanLegsClosed`, `CanHogtied`

**[BOTS]** Corroborating example from `MapGame`: `Pole: { SetPose: ["BackElbowTouch"] }`.
**[ADDON-ADJACENT]** `D:\Games\BC-Bot\bc_items_meta.json` carries `CanLegsClosed` among item
prerequisites, confirming the `Can<PoseName>` pattern in live data.

### ⚠ Hogtied — circumstantial only, NOT proven

**[INFERENCE]** Across all four production bots, `Hogtied` **never** appears as a `SetActivePose`
argument. It appears only as a rope item type:

```ts
rope?.Extended?.SetType("Hogtied");
["ItemArms", "HempRope", "Hogtied"]
```

Meanwhile `Yoked`, `OverTheHead`, `Kneel` and `BaseUpper` *are* set directly. That pattern suggests
`Hogtied` is applied through an item rather than set freely — **but this is an absence of evidence,
not evidence of absence.** Do not code against it as fact.

**To settle it:** read `AllowMenu` on the live `Hogtied` pose object, or call
`Player.CanChangeToPose("Hogtied")` with and without arm restraints. The same applies to `AllFours`
and `Suspension`.

---

## 5. ⚠ The one unconfirmed item — the catalogue global

**The runtime identifier of the pose-catalogue array is NOT verified.**

**[INFERENCE]** It is expected to be **`PoseFemale3DCG`**. That name appears in a sourced comment in
`D:\Games\BC-Bot\MapGame\src\index.ts:1292`, which cites BC's `Inventory.js`:

> *"'BackElbowTouch' (elbows bound behind the back) is a real entry in BC's own pose catalog
> (PoseFemale3DCG)."*

It could not be confirmed directly: the definition lives in `Assets/Female3DCG/Female3DCG.js`, which
is too large to fetch. `Typedef.d.ts` declares the `Pose` **interface** but no global of that name —
so **`Pose` on its own is a type, not a runtime array.** The per-character array is
`Character.Pose` **[BOTS]**:

```ts
character.Pose.some(P => ["BackCuffs", "BackElbowTouch", "BackBoxTie"].includes(P.Name))
```

**Do not write `PoseFemale3DCG` into shipped code until it has been confirmed in a live console.**
§7 has the discovery one-liner.

---

## 6. API shapes — the distinction that bites

Two different functions with different signatures. **Using the wrong one silently does nothing.**

| Context | Call | Argument | Reset |
|---|---|---|---|
| **Client / this add-on** | `CharacterSetActivePose(Player, "Kneel")` | **single name** | `null` |
| **Bot library** | `Player.SetActivePose(["OverTheHead", "Kneel"])` | **array** | `[]` |

**[ADDON]** `src/bc-globals.d.ts:81`:
```ts
declare function CharacterSetActivePose(character: any, poseName: string | null, forceChange?: boolean): void;
```

### ⚠ Setting a pose is LOCAL ONLY — the room must be told separately

**[ADDON]** `CharacterSetActivePose` changes the pose on this client and nothing else. The room is
informed by a separate send, following BC's own kneel/stand sequence in `ChatRoom.js`:

```ts
ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
```

**Omit this and the pose appears correct locally and never reaches anyone else.** This is already
handled centrally — see below. New pose code must go through the existing helper, not call
`CharacterSetActivePose` directly.

---

## 7. Where this add-on already sets poses

**Do not write a parallel path. Everything goes through `src/effects.ts`.**

| Anchor | Purpose |
|---|---|
| `effects.ts:86` — `setSuggestedPose(pose: string \| null)` | **The only place `CharacterSetActivePose` is called.** Sets the pose, sends `ChatRoomCharacterPoseUpdate` when in a room, and records that *we* set it |
| `effects.ts:97` — `suggestedPose(): string \| null` | The pose a suggestion applied, or `null` if it is the player's own. Survives a reconnect |
| `effects.ts:103` — `clearSuggestedPose()` | Undoes a pose *we* set. Deliberately leaves a self-chosen pose alone |

Call sites, all via those three:

| Anchor | Context |
|---|---|
| `voice.ts:964` / `:965` | The spoken `kneel` suggestion and its undo |
| `voice.ts:949` | The spoken `stand` suggestion |
| `remote.ts:134` / `:135` | Remote panel Kneel / Stand buttons |
| `commands.ts:467` / `:479` | `/echs kneel` and `/echs stand` diagnostics |
| `session.ts:511`, `:1342` | Session teardown |
| `menu.ts:1109` | Master switch off |
| `recovery.ts:208`, `:226`, `:421` | Snapshot, clear, restore across reconnect |

**[ADDON]** `remote.ts:131-133` — read kneeling state with `IsKneeling()`, **not** `HasEffect`:

> *"Not HasEffect — `IsKneeling()` reads `PoseMapping.BodyLower`, which is derived from the synced
> `ActivePose`, so it's readable for anyone we can see."*

**Only `"Kneel"` is currently used.** All 15 names above are available; none of the others has been
exercised in play.

---

## 8. Console one-liners

**Discovery — find the catalogue global (run this first):**

```js
Object.keys(window).filter(k => /^Pose|Pose$/.test(k) && Array.isArray(window[k]))
  .map(k => ({ global: k, len: window[k].length, sample: window[k][0] }))
```

**Dump the catalogue once the name is confirmed (expected `PoseFemale3DCG`):**

```js
PoseFemale3DCG.map(p => ({
  name: p.Name,
  category: p.Category,
  freelySettable: !!p.AllowMenu,
  needsItem: !!p.AllowMenuTransient
}))
```

**Test one pose against the live character:**

```js
Player.CanChangeToPose("AllFours")
```

**What this character is wearing, pose-wise:**

```js
Player.Pose.map(p => p.Name)
```

---

*Sources: upstream `BondageClub/Scripts/Typedef.d.ts` (master, fetched 2026-09-23); this
repository's `src/`; `D:\Games\BC-Bot\bondage-club-bot-hub-master`; `D:\Games\BC-Bot\MapGame`;
`D:\Games\BC-Bot\bc_items_meta.json`. No BC client source is checked out locally — a local clone
would let the catalogue global and the `AllowMenu` flags be confirmed without a live console.*
