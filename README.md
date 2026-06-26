# Storytelling Practice

A rep-driven web app for practicing the Content Storytelling Curriculum. Every module is a set of
interactive drills; your work gets read and coached by Claude through the local CLI.

## Run it

Double-click **`start.cmd`** (or run `node server.js`), then open:

> http://localhost:4317

Stop with `Ctrl+C` in the window.

> ⚠️ **Coaching needs the server.** Opening `public/index.html` directly works for writing and
> saving, but the "Coach me" buttons call `/api/coach`, which only exists while `node server.js`
> is running. Coaching rides on your existing Claude CLI auth — no API key needed.

## What's built

- **Dashboard** — all 11 modules + the capstone, progress tracking.
- **Swipe File** & **Story Bank** — the two always-on artifacts, with structured dissection.
- **Every drill has a "Show an example" toggle** — a worked answer-key right where you practice.
- **All 11 modules — fully playable, AI-coached:**
  - **Phase 1 — Foundations:** M1 Cause-not-Sequence (connector highlighter + story spine), M2 Open Loop (5 first lines + open/close loop), M3 Specificity (abstraction highlighter + show-vs-tell).
  - **Phase 2 — The Hook:** M4 Hook Anatomy (10-hook pad with counter + 5-archetype rotation), M5 Hook–Payoff (promise/payoff pairs + arrive-at-the-reframe).
  - **Phase 3 — Structure & Voice:** M6 Architecture (skeleton-first + rebuild), M7 Voice & Edit (compression ladder + read-aloud rhythm highlighter & timer + 20% cut counter), M8 Human Insight (one-truth + reader-as-protagonist).
  - **Phase 4 — Format & Systems:** M9 Format-Specific (one story / three containers + teardown's one turn), M10 Hijacking & Signatures, M11 Sustaining System (weekly teardown + drop-off diagnosis).
- **Capstone — The Narrative Teardown:** a 9-step guided run, each step coached, threading every module end to end.

### Drill engine

Most drills are declared as `type:"generic"` with a `fields` spec (plus optional live `widget`s —
connector/abstraction/sentence highlighters, word counts — and computed `counters`). Adding a drill
is data, not code: define its fields and a coaching `task` rubric.

## How it works

- Static frontend in `public/` (vanilla JS, no build step). All your writing is saved in the
  browser's `localStorage`.
- `server.js` is a tiny zero-dependency Node bridge: it serves the app and exposes one endpoint,
  `POST /api/coach`, which pipes your submission to `claude -p --output-format json` and returns
  structured feedback (verdict, score, strengths, fixes, a sharper rewrite).

## Notes

- Each "Coach me" call spawns the Claude CLI and takes ~5–15s.
- Override the CLI path with `CLAUDE_BIN`, or the port with `PORT`.
