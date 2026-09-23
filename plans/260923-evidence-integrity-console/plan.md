# Stake-Backed Appeals & Evidence Integrity v2

## Goal

Add a meaningful contract-level appeal path, then make every locked source, SHA-256 commitment, deadline, action gate, and accepted transaction independently auditable.

## Baseline

- Contract already exposes offering deadlines and `get_enrollment_evidence`.
- Frontend does not read or display those fields.
- Time-sensitive actions remain clickable before/after their valid windows.
- Accepted transaction hashes are plain text rather than evidence links.
- Existing contract has no appeal path; an initial verdict proceeds directly to settlement.

## Implementation

1. Add exact-stake appeal storage and payable `open_appeal`.
2. Add `adjudicate_appeal` using a second comparative semantic consensus round.
3. Route stake deterministically for upheld/overturned outcomes and fail closed to recovery.
4. Extend frontend types with deadlines, evidence, and appeal state.
2. Add browser SHA-256 verification with explicit `verified`, `mismatch`, `unavailable`, `not-provided` states.
3. Load authoritative evidence for the selected enrollment.
4. Add a deadline console with live countdowns and state-derived action eligibility.
5. Link transaction receipts and immutable sources to their public inspectors.
8. Add contract/frontend tests, CHANGELOG entry, README evidence, and deployment handoff.

## Success criteria

- Terms, delivery, and dispute commitments are visible and independently verifiable.
- Buttons do not invite known `CHALLENGE_WINDOW_ACTIVE` or `RECOVERY_WINDOW_ACTIVE` reverts.
- Deadline state updates without a page refresh.
- Every accepted transaction exposes an Explorer link.
- Contract tests, frontend tests, lint, and production build pass.
- New source is ready for a fresh Studionet deployment and runtime appeal proof.
