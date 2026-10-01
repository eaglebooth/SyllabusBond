# Changelog

## 2026-10-01 — Progressive Module Escrow v0.3

- Added organizer-configured 2–20 module offerings while preserving the one-module legacy path.
- Added sequential checkpoint evidence, student acceptance/dispute, and comparative jury adjudication.
- Added cumulative tranche accounting so odd fees settle exactly with no rounding dust.
- Made cancellation, settlement, appeals, and recovery operate only on escrow remaining after partial payouts.
- Added module progress/checkpoint views and a role-aware progressive escrow workspace.
- Expanded verification to 30 contract tests and 6 frontend tests.

## 2026-09-23 — Stake-Backed Appeals & Evidence Integrity v2

- Added payable, party-only appeals requiring a 10% tuition stake rounded up to the smallest GEN unit.
- Added a second GenLayer `prompt_comparative` consensus round over the complete record plus new appeal evidence.
- Added deterministic uphold/overturn stake routing and appeal-aware value conservation.
- Added fail-closed recovery for unavailable or internally inconsistent appeal consensus.
- Added browser-side SHA-256 verification for locked terms, delivery evidence, and dispute packets.
- Exposed immutable evidence URLs and expected/actual digest status in the enrollment workspace.
- Added live delivery, challenge, and recovery countdowns from authoritative contract deadlines.
- Added deadline-aware action gating to prevent predictable lifecycle reverts.
- Added clickable GenLayer Explorer receipts after writes and four frontend logic tests.
- Added appeal lifecycle fields to enrollment/evidence read APIs and frontend flows.
- Added post-deadline recovery for funded/pre-review escrow when an evidence write rolls back, closing a trapped-funds edge case found during Studionet lifecycle testing.
- Requires a new Studionet contract deployment because storage and write methods changed.

## 2026-08-29

- Corrected the frontend GEN unit model to match the deployed contract (`1` equals `1 GEN`).
- Replaced floating-point tuition conversion with validated whole-GEN `BigInt` inputs.
- Added studionet wallet switching and authoritative read-back after lifecycle writes.
- Added a wallet-free live settlement proof and exact value-conservation display.
- Added a dedicated SyllabusBond logo for the application, favicon, and Project Explorer.
- Replaced misleading `LOCAL_ONLY` labels with the live studionet deployment status.
