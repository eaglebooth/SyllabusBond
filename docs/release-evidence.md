# SyllabusBond — Release Evidence

**Current Project Status**: `STUDIONET_DEPLOYED_AND_VERIFIED`  
**Deployed Contract Target**: `0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f` (GenLayer Studionet, Chain 61999)  
**Explorer**: [https://studio.genlayer.com/explorer/address/0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f](https://studio.genlayer.com/explorer/address/0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f)

**Testnet timing profile**: delivery follows the committed duration; challenge and recovery windows are each 5 minutes for reproducible lifecycle evidence.

| Gate / Feature | Status | Evidence Summary & Proof Location |
|---|---|---|
| **Toolchain & Headers** | `PASS` | Verified header `# v0.2.16`, `Depends: py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, syntax parsed with Python AST. |
| **Contract Schema & Linter** | `PASS` | Python AST compilation exits 0, no syntax errors, flat method signatures (<= 6 args). |
| **Functions & Storage** | `PASS` | Uses `u256`, `str`, `TreeMap[u256, str]`, `TreeMap[u256, u256]`, `TreeMap[str, u256]`. No float, no unbounded loops. |
| **Runtime Writes (Local)** | `PASS` | Unit tests verify `create_offering`, `enroll`, `submit_delivery_evidence`, `submit_dispute_evidence`, `settle`, `claim_recovery`. |
| **State Proof (Local)** | `PASS` | Local behavioral test suite validates exact pre-state to post-state transitions. |
| **Failure Proof (Local)** | `PASS` | Negative test matrix passes: wrong caller (`ORGANIZER_ONLY`, `STUDENT_ONLY`), wrong attached value, digest mismatch, double settlement. |
| **Value & Conservation Proof** | `PASS` | Tested invariant: $\text{total\_received} == \text{total\_held} + \text{total\_paid} + \text{total\_refunded}$ across all settlement branches. |
| **Consensus & Equivalence** | `PASS` | `prompt_comparative` used with semantic outcome validation; `_consistent_verdict` filters contradictory outputs. |
| **Address Configuration** | `PASS` | Configured active deployment `0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f` in `.env.local`; runtime override in localStorage supported. |
| **Frontend Production Build** | `PASS` | Next.js 16 + React 19 Turbopack build compiles cleanly with zero errors/warnings; single document scrollbar enforced. |
| **Provenance & Digest Integrity** | `PASS` | Source raw byte SHA-256 calculation checked against locked commitments. |
| **Deployed Runtime Target** | `PASS` | Contract deployed to Studionet at `0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f`. |
| **Two-Wallet Custody & Recovery** | `PASS` | Student escrowed 1 GEN; evidence-unavailable recovery finalized with two 0.5 GEN child transfers, then contract balance and `total_held` returned to 0. Recovery tx: `0x5ba357c8506cb986cca617ff1e09595256c89154604e43517fb8ab4cb91c3fa8`. |
| **Two-Wallet Full Delivery Payout** | `PASS` | Jury finalized `DELIVERED / FULL / MATCH`; `settle()` emitted one 1 GEN child transfer to organizer and returned contract balance and `total_held` to 0. Settlement tx: `0xe44193b4698b05ccb3ec2fe9db85ac14031ca8e9323171696af83d072816c2db`. |
| **Material-Reduction Jury Path** | `NOT_CLAIMED` | Two testnet attempts safely resolved to `RECOVERY_WAIT` because public evidence retrieval/semantic consensus was unavailable. This branch is covered by local behavioral tests but is not claimed as a deployed jury pass. |

---

### Scope Note
The contract deployment and testnet transactions cited above were explicitly user-authorized. Frontend production hosting must be verified separately after deployment.
