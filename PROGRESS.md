# Safari Rally Racer progress

## 2026-09-25 — Chase camera and AI lap rivals
- Approved: behind-car perspective view, three visible AI rivals, lap leaderboard, and local verification.
- Done: perspective road/scenery/car rendering with near-plane clipping; chase camera follows steering; minimap retained.
- Done: Kifaru, Simba, and Chui follow the circuit at different paces, slow for bends, and complete three timed laps. Non-contact time-trial opponents.
- Qualifying targets are produced by running the actual rival controller before the race, marked Q, and replaced by live best laps. Player session best and gap appear in the leaderboard; finish screen includes rankings.
- Corrected player lap completion to require forward start-line crossing after ordered checkpoints. Existing saved records retained, though older records may reflect the previous early finish threshold.
- Verified: `node game.test.cjs` runs the actual inline game script in a mocked DOM/canvas environment. Covers qualifying order, track wrap, countdown, acceleration, steering, pause/resume, all rival race completions, live/qualifying agreement, player finish/checkpoint requirements, ghost recording, restart, and rendering at desktop/portrait/landscape dimensions.
- Browser checks: 1280x720 chase view and four-car grid visually inspected; observed live AI lap entries, pause overlay, and restart resetting targets/timers. Full manual player-driven three-lap race and actual mobile-device rendering remain unverified.
- No package manager, build system, TypeScript, or lint configuration exists; single standalone HTML application. Node parses and executes the inline JavaScript during tests.
- Preview: http://127.0.0.1:8765 (Python server bound only to loopback). Can also open index.html directly.
- Files: index.html, game.test.cjs, PROGRESS.md.
- API reference checked: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
- No repository metadata present in this folder; no commit or publishing performed.
- Next milestone: Jeremy playtest of camera feel and AI difficulty; release remains unapproved.

## 2026-09-25 — Review fixes (Claude)
- Fixed: laps and checkpoints no longer require the car to be on the murram. Crossing the line on the verge used to silently void the lap while the timer kept running (reproduced twice with a bot running 88px off centre). Now only forward direction is required. A lap with a missed checkpoint is discarded with a "Missed checkpoint" toast and a fresh lap starts.
- Restored in 3D: skid marks (world-space ground quads, capped at 600, laid every 3rd physics step), dust puffs (depth-sorted, faded near the lens) and collision screen-shake. Removed the unused 2D ground canvas and paintWorld (~85 lines, ~9,000 startup draws).
- Restored the Kenya-flag livery on the player car (bonnet, roof, boot, sides, tail, door number panels). Paint details are drawn as decals sorted right after their parent panel. Tail lights and number plate use the same approach, which fixed a tail light disappearing on some frames.
- Tests: game.test.cjs gained off-verge finish, missed-checkpoint reset and skid-mark tests; all pass. Browser bot run at 1366x768: 3/3 laps counted with the car off-track at every crossing; render median 8.1ms, p95 11.9ms, max 20.6ms.
- Backup of the original top-down version: index-v1-backup.html.

## 2026-09-25 — AI modes (Claude)
- Added Easy / Medium / Hard / God. One speed multiplier (0.80 / 0.92 / 1.00 / 1.18) scales all three rivals, so Kifaru < Simba < Chui holds in every mode. Rival speed is capped at 99% of the player's top speed: God wins on cornering, not straight-line speed.
- Simulated fastest-rival (Chui) best laps: Easy 25.69s, Medium 22.39s, Hard 20.63s (unchanged), God 17.60s. Planned targets were ~26 / ~22.5 / ~20.6 / ~17.5s; all within 0.5s, no tuning needed.
- Picker on the start and finish screens (keys 1–4), each button showing its time to beat. Saved in localStorage key `safariRally.difficulty`. The leaderboard header shows the mode (gold in God). Mode changes are locked during a race.
- Tests: mode ordering, rival order per mode, God < 19.1s, Hard unchanged, mid-race lock, live God laps matching qualifying. All pass. Browser: click and keys switch mode, the mode persists after reload, the lock toast shows mid-race, 0 console errors.
- Known, not fixed: trees right beside the road can fill the screen as you pass (billboard canopy scale near the camera); AI rivals are still non-contact.

## 2026-09-25 — New maps + Legend mode (Claude)
- Added three maps next to the original: **Hell's Gate Gorge** (110-wide, technical switchbacks, red cliffs, 110 boulders that collide like trees), **Meru Highlands** (120-wide, stacked hairpins, tea-green hills, tall trees, Mt Kenya on the horizon) and **Amboseli Flats** (170-wide, long straights, Kilimanjaro on the horizon). The original is now **Naivasha Classic**; it keeps storage key `safariRally.v1`, seed and layout, so old records/ghost still apply (scenery verified tree-for-tree identical to the pre-maps algorithm).
- Refactor: track, tangents, checkpoints, arc lengths, scenery, minimap transform and AI qualifying are rebuilt by `loadMap(id)` from the `MAPS` table (points, width, palette, horizon style, scenery counts). Samples per map are held at ~660–672 so render/nearest() cost is level. Road, verge, ruts, posts, start line, rival lanes and the player grid slot all scale with road width.
- Records and ghost are per map (`safariRally.v1.<mapId>`); last map in `safariRally.map`. Map picker (buttons + T) on start and finish screens, showing your best lap per map; locked mid-race like AI mode. M stays sound.
- **Legend** mode (key 5): multiplier 1.30 on the same 99% top-speed cap, so it only gains in corners. ~8% faster than God on Naivasha (16.11 vs 17.60).
- Per-map fastest AI, Hard / God / Legend: Naivasha 20.63 / 17.60 / 16.11 · Hell's Gate 20.54 / 17.51 / 16.01 · Meru 22.92 / 19.53 / 18.48 · Amboseli 17.61 / 15.07 / 14.18.
- Corner tuning: new maps have no corner tighter than the road half-width (inside edge would fold) and road stretches never come within 2 road widths of each other. Hell's Gate's tightest is 65px radius, Amboseli 93, Meru 108.
- Tests (`node game.test.cjs`, ~16s): per map, geometry, scenery off-road, 5-mode AI ordering, Legend < 0.96×God, a careful bot finishing a real 3-lap race, an expert bot beating Legend (Naivasha 15.07, Hell's Gate 15.61, Meru 18.10, Amboseli 13.48), render at 3 sizes; plus Legend live/qualifying agreement, map lock, per-map records, map persistence, Naivasha Hard unchanged. Fixed a harness bug: `qualifyingByMode` was exported by value.
- Browser (127.0.0.1:8765): all four maps viewed at 1280x720 from the start grid, Legend styling, map/mode keys, mobile 375px menu (no horizontal scroll, 5 mode buttons at 56px), 0 console errors. Found and fixed Chui overlapping the player on the narrow Hell's Gate grid.
- Not verified: a human-driven race on the new maps; Legend margins on Meru (0.38s) and Hell's Gate (0.40s) are thin even for a perfect-reflex bot.

## 2026-10-05 — Shareable link (Claude)
- Published the game as a claude.ai Artifact: https://claude.ai/artifact/ApW2TXpypbuYkSKjbqZ82s (private until shared from the page's Share menu).
- Publish copy lives in the session scratchpad: index.html minus the doctype/html/head/body wrapper tags (the Artifact host adds its own), plus `color-scheme: dark` on :root. Game code unchanged. To update the link later, republish to the same URL with the Artifact tool's `url`.
- Known gap: keyboard-only controls, so it can't be played on a phone.
