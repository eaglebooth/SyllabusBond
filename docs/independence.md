# SyllabusBond — Independence Note

## 1. Executive Summary

SyllabusBond is an autonomous educational escrow and syllabus fulfillment guarantee protocol built natively on GenLayer. It addresses the significant trust deficit in online cohort-based courses, masterclasses, and executive bootcamps by pegging tuition disbursements to verified delivery of the promised educational curriculum.

Unlike generic escrow contracts or template marketplaces, SyllabusBond binds specific educational commitments (topics, session count, duration, instructor identity, and terms) into immutable on-chain digests, allows students to lock enrollment fees in escrow, and employs GenLayer's AI consensus engine to compare public delivery evidence against locked promises.

## 2. Distinct Economic Event

- **Event**: Milestone-based tuition settlement based on pedagogical delivery fidelity.
- **Problem Solved**: Course creators and bootcamp organizers frequently cancel sessions, substitute unqualified teaching assistants for advertised celebrity instructors, truncate course duration, or drop entire promised modules without offering refunds. Traditional payment processors require lengthy chargeback processes that harm both legitimate educators and students.
- **Settlement Rule**:
  - `DELIVERED`: Full delivery of promised curriculum and instructor commitments -> 100% tuition payout to Organizer.
  - `MATERIALLY_REDUCED`: Course took place but was truncated in duration, substituted instructors without notice, or omitted promised modules -> 50% payout to Organizer, 50% refund to Student (with any odd whole-GEN remainder deterministically refunded to the Student).
  - `NOT_DELIVERED`: Course was cancelled, failed to occur, or suffered total breach -> 100% refund to Student, 0% to Organizer.
  - `EVIDENCE_UNAVAILABLE`: Source data missing or corrupted -> transitions to a bounded `RECOVERY_WAIT` state with deterministic non-vetoable fallback.

## 3. Actor Roles & Authentication

1. **Organizer**:
   - Publishes offering terms (title, fee, duration, instructor ID, curriculum topics, terms URL & digest, recovery split).
   - Provides immutable delivery evidence (session recordings, syllabus coverage logs, attendance ledger).
   - Authenticated strictly via `gl.message.sender_address`.
2. **Student**:
   - Enrolls by depositing the exact tuition fee in the contract's whole-GEN unit via payable write.
   - Holds a dedicated challenge window to submit dispute packets if commitments were breached.
   - Authenticated strictly via `gl.message.sender_address`.

## 4. Evidence Provenance & Integrity Model

- **Offering Terms Digest**: SHA-256 digest of canonical syllabus and terms locked before enrollment begins.
- **Delivery Packet**: Organizer locks an immutable URL (IPFS/Arweave/canonical gateway) and its computed SHA-256 digest.
- **Dispute Packet**: Student locks dispute documentation and SHA-256 digest during the challenge window.
- **Re-Verification at Fetch**: The contract fetches raw source bytes within the nondeterministic function and computes `sha256:hash` to strictly match the locked commitment before passing content to the LLM.
- **Single-Use Enforcement**: Delivery and dispute digests are indexed in direct lookup `TreeMap` structures to prevent cross-enrollment reuse.

## 5. Non-Vetoable Recovery Mechanism

- Every funded nonterminal state has an on-chain deadline.
- If evidence is unavailable or adjudication fails, the contract transitions to `RECOVERY_WAIT`.
- After `recovery_deadline` expires, either party can invoke `claim_recovery` to execute the pre-committed recovery split (e.g. 50/50 or custom split locked at offering creation).
- No party can veto the recovery or indefinitely lock funds in escrow.

## 6. State-Driven UX

- A linear workspace presents exactly one primary action per lifecycle phase:
  `Offering Creation -> Student Enrollment -> Delivery Submission -> Challenge Window -> AI Jury Adjudication -> Escrow Settlement -> Recovery (if applicable)`.
