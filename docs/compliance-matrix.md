# SyllabusBond — Compliance Matrix

This matrix maps every quality standard and rule from `rules.md` and `ruleschat.md` to specific implementation locations and test coverage.

| Rule / Requirement | Contract Implementation | Frontend Surface | Local Test Proof | Deployed Proof (Future) |
|---|---|---|---|---|
| **File Header & Pinning** | `contracts/SyllabusBond.py:L1-3` (`# v0.2.16`, Depends pinned) | N/A | `test_contract_static.py::test_runner_header_and_syntax` | `BLOCKED` (Requires network deployment) |
| **Storage Types & Maps** | `contracts/SyllabusBond.py` (`TreeMap`, `u256`, `str`) | N/A | `test_contract_static.py::test_storage_types` | `BLOCKED` |
| **No Unbounded Scan** | `student_offering_index`, `digest_claim_index` direct index lookups | N/A | `test_contract_static.py::test_no_unbounded_history_scans` | `BLOCKED` |
| **Sender Authentication** | `gl.message.sender_address.as_hex.lower()` checks across all write methods | Displays active connected address & permitted actions | `test_production_contract_paths.py::test_sender_authorization` | `BLOCKED` |
| **Real Value Custody** | `@gl.public.write.payable` in `enroll()` checking `gl.message.value == offering_fee` | Sends exact `value: BigInt(fee)` | `test_production_contract_paths.py::test_exact_fee_enforcement` | `BLOCKED` |
| **Real EVM Transfers** | `@gl.evm.contract_interface class _Recipient` with `emit_transfer` in `settle()` and `claim_recovery()` | Shows recipient wallet & Explorer transaction links | `test_contract_static.py::test_transfer_emissions` | `BLOCKED` |
| **Consensus Principle** | `gl.eq_principle.prompt_comparative` comparing closed semantic outcome bands | N/A | `test_contract_static.py::test_semantic_consensus` | `BLOCKED` |
| **Verdict Cross-Validation** | `_consistent_verdict()` rejects contradictory combinations | Displays normalized verdict tuple & reasoning | `test_contract_static.py::test_verdict_parser_consistency` | `BLOCKED` |
| **Evidence Digest Verification** | Fetches raw bytes, recomputes SHA-256, compares with locked digest | Displays source URL, commitment digest, and match status | `test_production_contract_paths.py::test_digest_verification` | `BLOCKED` |
| **Anti-Digest Reuse** | `digest_claim_index` tracking | Shows reusable/consumed warnings | `test_production_contract_paths.py::test_anti_reuse_protection` | `BLOCKED` |
| **Deterministic 50/50 Remainder** | `organizer_amount = fee // 2`, `student_amount = fee - organizer_amount` | Explains whole-GEN remainder allocation in UI | `test_production_contract_paths.py::test_materially_reduced_remainder` | `BLOCKED` |
| **Bounded Non-Vetoable Recovery** | `claim_recovery()` after `recovery_deadline` | Recovery countdown & one-click trigger | `test_lifecycle_behavior.py::test_recovery_lifecycle` | `BLOCKED` |
| **Adjudication vs Timeout Race** | Mutually exclusive states (`ADJUDICATED` vs `RECOVERY_WAIT` vs `RECOVERED`) | Prevents double actions | `test_lifecycle_behavior.py::test_race_condition_prevention` | `BLOCKED` |
| **GenLayerJS Integration** | `genlayer-js` client connected to Studionet | `frontend/src/lib/genlayerClient.ts` | `frontend/` build & typecheck | `BLOCKED` |
| **Runtime Address Resolver** | `localStorage` override with fallback to default | Address override input & Explorer links | UI Component tests | `BLOCKED` |
| **No Fake Production Data** | Reads live state via view methods | Clean empty states when no records exist | Frontend build | `BLOCKED` |
| **Single Document Scrollbar** | Pure CSS document scrollbar, no nested overflow | `frontend/src/index.css` | Frontend layout check | `BLOCKED` |
