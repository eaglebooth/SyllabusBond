# SyllabusBond Stake-Backed Appeals v2 — deployment handoff

## Source to deploy

- File: `contracts/SyllabusBond.py`
- SHA-256: `6fea96465a82fa00bf026a089bc818ec822aad140dcd5cdf489b2dfef5277bd3`
- Network: GenLayer Studionet
- Constructor arguments: none

## Why a new deployment is required

This release adds persistent appeal state, payable appeal stakes, two public write methods, a second semantic consensus round, appeal deadlines, and appeal-aware settlement/recovery accounting. The v1 address cannot be upgraded in place.

## New public writes

- `open_appeal(enrollment_id, appeal_url, appeal_digest)` — payable; exact stake is 10% of tuition rounded up.
- `adjudicate_appeal(enrollment_id)` — re-evaluates the complete verified record with `prompt_comparative`.

## Post-deployment gate

- Superseded test address: `0x378D5cFCdDbb0614ECF7d548888B675A0Ba0019B`
- Redeploy required: Studionet testing found that a rolled-back delivery-evidence write could leave a `FUNDED` enrollment outside the recovery state set. Source v0.2.17 fixes this and adds a regression test. Do not use the superseded address as the production target.
- Active v0.2.17 address: `0x681B80032A0BAfB263062418a462E39951e32532`
- Initial read: zero offerings, zero enrollments, zero custody totals, and zero contract balance.

1. Confirm `get_counts` and `get_totals` return zeroed v2 state.
2. Update `frontend/.env.local` and Vercel `NEXT_PUBLIC_CONTRACT_ADDRESS`.
3. Run a full initial adjudication followed by an appeal.
4. Prove at least one `UPHELD` or `OVERTURNED` path and terminal settlement.
5. Confirm `total_received = total_held + total_paid_to_organizers + total_refunded_to_students`.
6. Record exact transaction hashes and update Explorer/README evidence.

Do not deploy the v2 frontend publicly before completing steps 1–2; it expects the new appeal fields returned by `get_enrollment` and `get_enrollment_evidence`.
