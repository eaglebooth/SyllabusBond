# SyllabusBond — Decentralized Syllabus Delivery & Tuition Escrow

> **Deployed Contract Target**: `0xa003280c245Dc51043d1E909B9a897C955099fCf` (GenLayer Studionet, Chain 61999)  
> **Explorer**: [https://studio.genlayer.com/explorer/address/0xa003280c245Dc51043d1E909B9a897C955099fCf](https://studio.genlayer.com/explorer/address/0xa003280c245Dc51043d1E909B9a897C955099fCf)

---

## 1. Overview & GenLayer Fit

**SyllabusBond** is an autonomous pedagogical delivery escrow protocol built natively on GenLayer. Online education, cohort bootcamps, and masterclasses suffer from an acute trust deficit: students pay full tuition upfront with no assurance that advertised celebrity instructors, committed durations, or core syllabus modules will be delivered as promised.

Traditional payment platforms force students into slow, adversarial chargeback disputes or leave them without recourse. SyllabusBond solves this with Intelligent Contracts:
1. **Verifiable Commitment**: Organizers commit to syllabus topics, duration, instructor identity, and terms, locking their cryptographic digests on-chain.
2. **Escrow Custody**: Students enroll by locking the exact tuition in the contract.
3. **Decentralized AI Jury**: Following delivery, GenLayer's AI consensus engine compares locked commitments against verifiable delivery and dispute packets to evaluate curriculum and instructor fidelity.
4. **Deterministic Settlement**: Contract deterministically executes real payouts or refunds based on closed-band verdicts without centralized intermediaries.

---

## 2. Payout & Decision Model

AI Jury issues a closed-band verdict:
- `DELIVERED`: Full delivery conforming to commitments -> Organizer 100%, Student 0%.
- `MATERIALLY_REDUCED`: Course delivered with significant omissions or unauthorized substitutions -> Organizer 50%, Student 50% (with any odd wei remainder deterministically refunded to the Student).
- `NOT_DELIVERED`: Cancellation or total failure to deliver -> Organizer 0%, Student 100%.
- `EVIDENCE_UNAVAILABLE`: Missing or corrupted sources -> Transitions to `RECOVERY_WAIT` with a role-balanced, non-vetoable fallback exit.

---

## 3. Architecture & Security

- **Sender-Based Authentication**: Privileged actions derive identity strictly from `gl.message.sender_address`, never from untrusted parameters.
- **Payable Exact-Fee Enforcement**: `@gl.public.write.payable` ensures attached value matches `offering_fee` exactly.
- **Evidence Integrity & Single-Use**: Contract fetches raw source bytes, re-computes `sha256:digest`, verifies with locked commitments, and indexes used digests to prevent cross-enrollment reuse.
- **Value Conservation**:
  $$\text{total\_received} = \text{total\_held} + \text{total\_paid\_to\_organizers} + \text{total\_refunded\_to\_students}$$
- **Equivalence Principle**: Uses `gl.eq_principle.prompt_comparative` comparing substantive outcomes; avoids `strict_eq` on rich text/reasoning.

---

## 4. Project Structure

```text
SyllabusBond/
├── contracts/
│   └── SyllabusBond.py          # Production Intelligent Contract
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router (Editorial Learning Ledger)
│   │   ├── components/          # State-driven UI & Timeline Workspace
│   │   └── lib/                 # genlayer-js Client & Types
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── tests/
│   ├── test_contract_static.py            # Static AST, imports, and consensus checks
│   ├── test_production_contract_paths.py  # Production method unit tests
│   └── test_lifecycle_behavior.py         # Full two-wallet lifecycle tests
├── scripts/
│   └── lifecycle/
│       └── deployed_lifecycle_skeleton.mjs
├── docs/
│   ├── independence.md          # Domain independence analysis
│   ├── proof-plan.md            # Comprehensive proof plan
│   ├── compliance-matrix.md     # Quality gate mapping
│   ├── release-evidence.md      # Honest release verification
│   └── live-evidence/           # Deployed verification logs
└── README.md
```

---

## 5. Local Setup & Verification

### Running Contract Tests

```powershell
# Verify Python AST syntax
python -c "import ast; ast.parse(open('contracts/SyllabusBond.py', encoding='utf-8').read()); print('AST OK')"

# Run test suite
python -m pytest tests/ -v
```

### Running Frontend Locally

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to interact with the dashboard.
