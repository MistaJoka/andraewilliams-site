# Site Rebuild — Decisions

Session log for the scorched-earth rebuild brainstorm. One line per approved choice.

## Decisions

- 2026-08-10 — Rebuild scope: full restart ("scorched earth"), superseding the earlier "new face, keep the engine" call — the whole website starts over (2026-08-11).
- 2026-08-10 — Old Operator's Lab identity (site-identity.md) is retired; a new identity will be chosen before any build.
- 2026-08-10 — Identity direction: choosing among 4 concepts (Mission Manual / AW-OS / Arcade / Archive) via visual companion — PENDING.
- Nothing is deleted until the new design is approved; current site stays live on Vercel meanwhile.

## Resume instructions (read after /clear)

1. Re-read this file top to bottom before touching anything.
2. The rebuild brainstorm is mid-flight: the user must pick a new site identity.
   Four concepts were mocked up in the visual companion (superpowers:brainstorming skill):
   A. Mission Manual (NASA-punk print), B. AW/OS (site as an operating system),
   C. The Arcade (projects as cartridges), D. The Archive (software as exhibition).
3. Companion server session dir: `.superpowers/brainstorm/71653-1786419446/`
   (check `state/server-info` for URL; if `state/server-stopped` exists, restart
   `start-server.sh --project-dir <repo root>` — same port, tab reconnects.
   Check `state/events` for any clicks made before the clear.)
4. After identity is picked: continue brainstorming (structure/pages), then design doc
   per the skill, then writing-plans. Do not delete any existing site code until the
   new design is approved — current site stays live on Vercel.

## Open questions

- New identity concept (on screen now).
- Same repo nuke-in-place vs fresh repo — decide at implementation, not during brainstorm.
- What, if anything, gets salvaged (dossier generator, build/verify scripts, docs history) — decide after design exists.
