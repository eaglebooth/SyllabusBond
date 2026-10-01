# Milestone Phase 2 — Progressive Module Escrow

## Release boundary

- Source version: `v0.3.0`
- Baseline: deployed `v0.2.17` at `0x681B80032A0BAfB263062418a462E39951e32532`
- Network: GenLayer Studionet
- Deployment status: source complete; new contract deployment required

## What changed

SyllabusBond no longer requires an all-or-nothing course payout. An organizer can configure 2–20 modules before the curriculum is locked. Every enrollment advances through sequential evidence checkpoints. Student acceptance releases one earned tranche immediately; a dispute routes verified evidence to a GenLayer comparative jury with exact `ACCEPTED`, `REJECTED`, or `UNAVAILABLE` economic bands.

```text
target = fee * (module_index + 1) // module_count
tranche = target - already_released
```

The final checkpoint absorbs all integer remainder. Settlement, cancellation, appeals, and recovery use only the remaining escrow, preventing previously released tuition from being paid twice.

## Reviewer path

1. Create an offering and choose three progressive escrow modules.
2. Lock the curriculum, then enroll from a different wallet with the exact fee.
3. As organizer, submit immutable evidence for module 1.
4. As student, accept it and observe a partial payout plus reduced protected escrow.
5. Repeat or dispute the next checkpoint and run the module jury.
6. Confirm `released + remaining = fee` and `received = held + paid + refunded`.

## Security properties

- Strict sequential module index; skipped and repeated checkpoints revert.
- SHA-256 commitment and global digest replay protection for both parties.
- No transfer occurs inside a nondeterministic callback.
- Exact consensus bands have distinct economic meaning.
- Rolling recovery remains reachable after evidence or consensus failure.
- Flat bounded storage keys avoid nested collections and unbounded scans.

## Verification evidence

- Contract suite: 30 passing tests.
- Frontend suite: 6 passing tests.
- Frontend lint: passing.
- Production build and funded Studionet lifecycle: required before production switch.

## Deployment checklist

1. Deploy `contracts/SyllabusBond.py` with no constructor arguments.
2. Verify `get_counts`, `get_totals`, and a three-module offering.
3. Execute a funded two-wallet checkpoint lifecycle.
4. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the verified v0.3.0 address.
5. Redeploy Vercel and attach Explorer transaction links here.
