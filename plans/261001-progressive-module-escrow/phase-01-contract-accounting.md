# Phase 1 — Contract and Accounting

Priority: critical
Status: planned

## Requirements

- Organizer configures 2–20 modules before curriculum lock; unset defaults to legacy mode.
- Organizer submits immutable evidence for the next module only.
- Student accepts or disputes within a bounded review window.
- Disputed checkpoints receive a digest-verified comparative jury ruling.
- Accepted checkpoints pay one tranche immediately and unlock the next module.
- Rejected checkpoints enter the existing appeal-capable ruling path.
- Unavailable/inconsistent evidence enters recovery with a reachable rolling deadline.

## Storage and API

Modify `contracts/SyllabusBond.py`:

- Offering: module count.
- Enrollment: next module, released amount, remaining amount, rolling recovery deadline.
- Checkpoint: URL, digest, dispute URL/digest, status, decision, reason, review deadline.
- Writes: configure modules, submit checkpoint, accept, dispute, adjudicate.
- Views: module progress and checkpoint detail.

Use flat string keys for checkpoint maps. Avoid arrays, nested maps, unbounded scans, and signatures over six arguments.

## Accounting

```text
cumulative_target = fee * (module_index + 1) // module_count
tranche = cumulative_target - released_amount
released_amount + remaining_amount = fee
```

- Decrement `total_held` and remaining amount before emitting transfer.
- Add to enrollment organizer/refund totals; never overwrite prior transfers.
- Convert settle, cancel, appeal, and recovery to remaining-only accounting.
- Count appeal stake separately and exactly once.
- Last accepted module sets `SETTLED / DELIVERED` with remaining amount zero.

## Security and failure modes

- Enforce role, range, sequence, status, deadline, digest validity, and global replay guards.
- Perform SHA-256 verification before decoding bounded text.
- Keep status sentinels separate from untrusted evidence content.
- Exact consensus bands: accepted, rejected, unavailable; never economically equivalent.
- On any fetch/parse/consensus failure, persist recovery state before returning.
- Rolled-back checkpoint writes must leave prior state recoverable after the rolling deadline.

## Tests

Modify all three Python suites. Cover three-module release, odd-fee remainder, authorization, out-of-order submission, replay, double release, accept/dispute/ruling branches, recovery after partial payout, appeal after partial payout, terminal invariants, and full legacy regression.

## Definition of done

- Full contract suite passes fresh.
- No path pays more than fee plus an attached appeal stake.
- Direct production harness proves conservation after each checkpoint transition.
