# Phase 2 — Frontend Experience

Priority: high
Status: planned

## Architecture

- Add checkpoint and progress types in `frontend/src/lib/types.ts`.
- Add pure checkpoint math/action helpers with Node tests.
- Add `ModuleCheckpointPanel.tsx` inside the current authoritative enrollment workspace.
- Extend `/workspace/page.tsx` reads with progress and per-module details.
- Extend `/create/page.tsx` with module count; leave the unused modal untouched unless reused.
- Extend the evidence console to verify current checkpoint and dispute packets.

## User experience

- Show module progress, earned tuition, remaining escrow, next actor, and countdown.
- Organizer: submit next checkpoint evidence.
- Student: accept or attach immutable dispute evidence.
- Either party: trigger jury after dispute/timeout and recover after deadline.
- Show each accepted partial payout with an Explorer receipt.
- Prevent actions for the wrong role, index, status, or deadline.
- Keep legacy offerings on the current single-delivery workspace.

## Tests

- Tranche/remainder calculations.
- Next actionable module derivation.
- Role/state/deadline gating.
- Conservation display after partial releases.
- Integrity states for checkpoint evidence.
- Fresh UI tests, lint, and production build.

## Definition of done

- A reviewer can follow organizer submit → student accept → partial payout → next module without reading contract code.
- Refreshing the page reconstructs all progress solely from contract reads.
- Mobile and desktop layouts remain usable.
