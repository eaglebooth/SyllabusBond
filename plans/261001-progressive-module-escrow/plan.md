# Phase 2 Plan — Progressive Module Escrow

Status: implemented locally; deployment pending
Target: SyllabusBond v0.3, new Studionet deployment required

## Objective

Replace all-or-nothing course settlement with sequential module checkpoints. Each verified module releases only its earned tuition tranche; undelivered escrow remains recoverable.

## Design decisions

- Preserve the legacy single-delivery path with `module_count = 1`.
- Enable explicit module mode with 2–20 equal tranches.
- Store checkpoint records in flat `TreeMap` keys: `enrollmentId_moduleIndex`.
- Require strictly sequential checkpoints; no skipping or parallel reviews.
- Calculate tranche by cumulative target to eliminate rounding dust.
- Use rolling enrollment-level recovery deadlines.
- Keep `prompt_comparative`; exact economic outcomes are `ACCEPTED`, `REJECTED`, or `UNAVAILABLE`.
- Never transfer from a nondeterministic callback.

## Phases

1. [Contract and accounting](./phase-01-contract-accounting.md)
2. [Frontend experience](./phase-02-frontend-experience.md)
3. [Verification and deployment](./phase-03-verification-deployment.md)

## Global success criteria

- Every accepted checkpoint releases exactly one deterministic tranche.
- Final checkpoint absorbs integer remainder and leaves zero tuition escrow.
- Prior releases cannot be paid twice by settle, cancel, appeal, or recovery.
- `received = held + organizer_paid + student_refunded` after every transfer.
- Fetch, digest, parse, and consensus failures always retain a bounded exit.
- Legacy v0.2.17 behavior remains covered and usable for one-module offerings.
- Contract, UI tests, lint, build, funded Studionet lifecycle, GitHub evidence, and Vercel smoke test pass.

## Deployment boundary

Storage and public methods change. The current `0x681B…2532` deployment remains historical v0.2.17 evidence. Do not switch production until the new address passes initial reads and a funded progressive-release lifecycle.

## Unresolved questions

- None blocking. Equal tranches are chosen over arbitrary weights to reduce attack surface and reviewer complexity.
