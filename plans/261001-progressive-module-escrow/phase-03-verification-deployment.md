# Phase 3 — Verification and Deployment

Priority: critical
Status: planned

## Local gates

- Run complete Python suite, UI tests, lint, and production build.
- Perform security review focused on double payout, trapped funds, replay, deadlines, and nondeterministic boundaries.
- Record source SHA-256 and exact test counts.

## Studionet gates

1. User deploys the reviewed contract with no constructor arguments.
2. Verify zero counts, totals, and balance.
3. Run two-wallet, three-module lifecycle:
   - create/configure/lock/enroll;
   - accept module 1 and confirm partial payout;
   - dispute module 2 and run consensus;
   - finish or recover remaining escrow;
   - confirm terminal balance and conservation.
4. Record every transaction and authoritative readback.
5. Only then update frontend env, address links, and Vercel production.

## Evidence package

- New `docs/MILESTONE_PHASE_2_PROGRESSIVE_ESCROW.md` with before/after table.
- New deployment handoff and runtime transaction bundle.
- Immutable GitHub compare link from v0.2.17 final commit to phase-2 final commit.
- English submission title, under-1000-character changes summary, and essential evidence links.

## Definition of done

- New contract address is live and frontend bundle contains it.
- Public URL passes smoke test.
- GitHub main is clean and pushed.
- Old deployment is clearly labelled historical, not overwritten as evidence.
