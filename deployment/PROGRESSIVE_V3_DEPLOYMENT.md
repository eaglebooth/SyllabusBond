# Progressive Escrow v0.3 Deployment

Status: **completed and verified**

- Contract: `0xf8771bcFe84b62dB407C31F3bC54DF8E4a08b9e4`
- Offering/enrollment proof: `#0 / #0`
- Production: https://frontend-five-eta-88.vercel.app

Deploy `contracts/SyllabusBond.py` to GenLayer Studionet with **no constructor arguments**.

Do not update production yet. Send the new address back for validation. First verify `get_counts()` and `get_totals()`, then run:

1. `create_offering(...)`
2. `configure_modules(offering_id, 3)`
3. `lock_offering_curriculum(...)`
4. `enroll(offering_id)` with the exact fee from the student wallet
5. `submit_module_checkpoint(enrollment_id, 0, url, digest)`
6. `accept_module_checkpoint(enrollment_id, 0)` from the student wallet
7. `get_module_progress(enrollment_id)`

Only after those calls succeed should Vercel receive the new `NEXT_PUBLIC_CONTRACT_ADDRESS`.
