# Security Audit Handoff — SyllabusBond v0.3.1

## Scope

- `contracts/SyllabusBond.py`
- Progressive module accounting and custody conservation
- Evidence digest/replay controls
- Comparative consensus economic bands
- Module timeout, appeal, settlement, cancellation, and recovery transitions
- Frontend role/deadline gating and authoritative read-back

## Required auditor assertions

1. No transition pays more than tuition plus an attached appeal stake.
2. Previously released tranches cannot be released, refunded, or recovered twice.
3. `total_received = total_held + total_paid_to_organizers + total_refunded_to_students` after every terminal transfer.
4. Every funded state has a bounded terminal path.
5. Nondeterministic callbacks cannot transfer funds.
6. Digest mismatch, unavailable content, malformed output, and consensus failure fail closed.
7. Exact economic labels cannot be treated as equivalent.
8. Role, sequence, replay, range, and deadline guards cannot be bypassed.

## Reproduction commands

```powershell
python -m unittest discover -s tests -v
cd frontend
npm run test:ui
npm run lint
npm run build
```

Use the scripts in `scripts/lifecycle/` for funded Studionet reproduction. Supply signers only through environment variables. Never commit signer material.

## Known limitation

The live v0.3.0 deployment demonstrated that a 60-second appeal window was too short under Studionet finalization latency. Source v0.3.1 increases it to 300 seconds and increases appeal recovery to 600 seconds. This source change must be redeployed and the appeal-after-partial lifecycle repeated.

This document is an audit input, not an audit opinion or formal proof.
