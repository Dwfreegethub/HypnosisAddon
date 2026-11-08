# Where add-ons draw over characters in a chat room (survey, 2026-11-08)

For the ECHS-user icon (Biker 10-22 and 11-02, Lianne 11-07). Every add-on in FUSAM's manifest
(45, `fusam_manifest.json`) was downloaded as served on 2026-11-08 and searched for hooks on
`ChatRoomCharacterViewDrawOverlay`, `ChatRoomDrawCharacterStatusIcons`, `DrawCharacter` and
`DrawStatus`. Read for position only (rule 7: no code taken). 22 draw something over characters;
the rest draw nothing there.

Coordinates are in BC's character space: x 0-500 across, y 0-1000 down, all multiplied by the
room zoom. "x 228-258" means `CharX + 228*Zoom` to `CharX + 258*Zoom`.

## The top row (y about 0-50)

| x from-to | Who | What | When |
|---|---|---|---|
| 30-70 | BC | focus-mode warning | in focus mode |
| 70-110 | BC | whitelist / blacklist | |
| 110-150 | BC | friend / ghost | |
| 115-175, y 27-85 | BCT | hearts, a rainbow glyph, "Author" | BCT users |
| 140-174 | Secret Prison | infinity loop | its users |
| 150-190 | BC | owner / lover / family / birthday | |
| 177-223 | MBCHC | the other person's local hour | MBCHC users with a time zone |
| 190-226 | BC+ | its icon | BC+ users |
| **228-258** | **nobody** | | |
| 260-320 | WCE | "WCE" and its version, as text | WCE users (very common) |
| ~280-300, y 50 | TTS | a dash | TTS users |
| 310-350 | BC | bounty | rare |
| 347-377 | MoonCEBC | its icon | its users |
| 350-390 | BC | game version mismatch | |
| 375-405 | BCX | its icon | BCX users (very common) |
| 390-430 | BC | room admin / room whitelist | |
| 400-440 | LSCG | star (hover 385-435) | LSCG users (common) |
| 420-455 | Echo's clothing and activity add-ons | their icon | their users |
| 460-495 | BC Neko | cat emoji | its users |

## Below the top row

| Where | Who | What |
|---|---|---|
| x 375-425, y 50-100 | BCX, BC+ | typing / whisper / wardrobe bubbles |
| x 375-425, y 50-100 | MoonCEBC | "menu open" |
| x 330-364, y 42-76 | SlimeBeep | its icon |
| x 62-138, y 39-95 | HSC | a hypnosis orb (HSC's own hypnosis) |
| x 400-440, y 40+ | LSCG | leash / grab circles, own character only |
| x 225-275, y 920-950 | BC | status (talking, orgasm) |
| x 30-115, y 950 | BC | focus warning, whisper bubble |
| x ~255, bottom or y 70 | MBCFS | its badge |
| centre, y 900-950 | BC+ | pet stats |
| anywhere | KikiLink | own badge, placed by dragging |

AFC changes which of BC's own icons shows (lover), and CRABS, ABCL, ADCS, AEE, EmeryBC, FCM and
MPA draw glows, puddles or particles, not icons in either row.

## Free spots

1. **Top row, x 228-258** (30 wide, y 2-32): the only gap in the top row nobody uses. Neighbours
   are BC+ (ends 226) and WCE's text (starts about 260).
2. **Second row, far left, x 10-50, y 45-85:** nothing found there. HSC's orb starts at 62.
3. **Second row, middle, x 180-320, y 45-85:** nothing found except TTS's dash at about 290, 50.
