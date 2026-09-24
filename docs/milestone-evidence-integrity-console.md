# Milestone — Stake-Backed Appeals & Evidence Integrity v2

## Before

- Evidence URLs and digests disappeared from the UI after submission.
- Users could not independently compare immutable bytes with on-chain commitments.
- Delivery, challenge, and recovery deadlines were not visible.
- Time-sensitive actions remained clickable when contract rules guaranteed a revert.
- Transaction hashes were shown as plain text.

## After

- Either party can open one payable appeal with an exact 10% tuition stake.
- A second semantic consensus round considers immutable appeal evidence.
- Appeal results can uphold or overturn the initial ruling.
- Deterministic settlement returns or awards the stake while conserving all custody.
- Three evidence sources shown per enrollment: terms, delivery, and dispute.
- Browser recomputes SHA-256 and renders verified, mismatch, unavailable, or not-provided state.
- Three authoritative contract deadlines render as live countdowns.
- Four time-sensitive action paths are gated by their exact contract boundary.
- Accepted writes provide direct Explorer receipt links.
- Four automated frontend logic tests cover digest formatting and deadline boundaries.

## Deployment impact

Contract storage and public methods changed. Address `0x85F77d08727Ca798875387E57736077258Be255D` remains v1 evidence only. Recovery-hardened stake-backed appeals v2 is deployed at `0x681B80032A0BAfB263062418a462E39951e32532`; runtime appeal evidence is the remaining release gate.
