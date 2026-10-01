# Milestone Phase 2 — Progressive Module Escrow

## Release boundary

- Source version: `v0.3.0`
- Baseline: deployed `v0.2.17` at `0x681B80032A0BAfB263062418a462E39951e32532`
- Network: GenLayer Studionet
- Deployed v0.3.0: `0xf8771bcFe84b62dB407C31F3bC54DF8E4a08b9e4`
- Deployment status: funded progressive lifecycle verified on Studionet

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
- Production build: passing.
- Funded Studionet lifecycle: offering `#0`, enrollment `#0`, first of three modules released with both conservation invariants verified.

## On-chain evidence

- Live application: https://frontend-five-eta-88.vercel.app
- Vercel production deployment: https://syllabusbond-3p8b37e1q-eaglebooth197-5212s-projects.vercel.app
- Contract: https://explorer-studio.genlayer.com/address/0xf8771bcFe84b62dB407C31F3bC54DF8E4a08b9e4
- Create offering: https://explorer-studio.genlayer.com/transactions/0x626858c5ee9595d4eea68ea20773b67ded169a443dddef79deed0aa9edb1e30c
- Configure modules: https://explorer-studio.genlayer.com/transactions/0x1aed2b3f43f85ed3e232ed7153276baa805fc1970ddc0126c3a23a4154daa913
- Enroll: https://explorer-studio.genlayer.com/transactions/0xd7a6e9a5492fe77bfe1c3c9ad4e34bb7a12cb317b21bd4af89927aee70319065
- Submit checkpoint: https://explorer-studio.genlayer.com/transactions/0x84a72fa6dd9062072513ccb8a63c3cc3bbd300c4be13fd16aba604dabfef2554
- Accept and release: https://explorer-studio.genlayer.com/transactions/0xf63001b6d8ee91d4c25be7a9595988565a4200e54adec24249f113c41fccf142

## Deployment checklist

1. Deploy `contracts/SyllabusBond.py` with no constructor arguments.
2. Verify `get_counts`, `get_totals`, and a three-module offering.
3. Execute a funded two-wallet checkpoint lifecycle.
4. `NEXT_PUBLIC_CONTRACT_ADDRESS` updated to the verified v0.3.0 address.
5. Vercel production deployment completed and smoke-tested with HTTP 200.
