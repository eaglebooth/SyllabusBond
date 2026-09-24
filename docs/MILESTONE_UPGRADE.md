# Milestone Upgrade — Stake-Backed Appeals and Evidence Integrity

## Release identity

- **Project:** SyllabusBond — AI-Adjudicated Course Delivery Escrow
- **Release:** v0.2.17
- **Network:** GenLayer Studionet (chain 61999)
- **Contract:** [`0x681B80032A0BAfB263062418a462E39951e32532`](https://explorer-studio.genlayer.com/address/0x681B80032A0BAfB263062418a462E39951e32532)
- **Application:** [https://frontend-five-eta-88.vercel.app](https://frontend-five-eta-88.vercel.app)
- **Source SHA-256:** `6fea96465a82fa00bf026a089bc818ec822aad140dcd5cdf489b2dfef5277bd3`

## Why this is a material upgrade

The original release supported immutable course commitments, delivery evidence,
one GenLayer jury decision, settlement, and bounded recovery. This milestone adds
an economically accountable second review layer and a user-facing evidence
verification workflow. It also closes a trapped-funds edge case discovered by
running real funded transactions on Studionet.

| Area | Previous release | Milestone upgrade |
|---|---|---|
| Dispute finality | One AI jury round | A party may open a second, stake-backed appeal |
| Appeal economics | No appeal stake | Exact 10% tuition stake, rounded up to the smallest GEN unit |
| Appeal consensus | Not available | Second `prompt_comparative` round over the complete verified record |
| Stake outcome | Not applicable | Deterministic routing for `UPHELD` and `OVERTURNED` outcomes |
| Evidence review | Contract data shown as text | Browser SHA-256 verification with expected/actual digest status |
| Replay defense | Core evidence protection | Terms, curriculum, delivery, dispute, and appeal commitments registered against reuse |
| Recovery coverage | Jury failure recovery | Also recovers pre-review escrow after rolled-back evidence and elapsed deadline |
| User guidance | Basic lifecycle actions | Countdown timers, action gating, custody totals, and Explorer receipts |
| Verification | Initial contract suite | 25 contract tests, 4 UI tests, build, lint, and funded Studionet proof |

## Contract improvements

### Stake-backed appeals

`open_appeal(enrollment_id, appeal_url, appeal_digest)` is payable and restricted
to the organizer or enrolled student. The caller must attach exactly 10% of the
locked tuition, rounded up. The appeal packet must use immutable IPFS or Arweave
content with a valid SHA-256 commitment, and its digest cannot be replayed.

### Independent second consensus round

`adjudicate_appeal(enrollment_id)` verifies the locked terms, delivery evidence,
optional dispute evidence, and new appeal packet. GenLayer validators compare
structured outcomes using `prompt_comparative`. The parser rejects malformed or
economically contradictory results, including `UPHELD` with a changed decision
or `OVERTURNED` with an unchanged decision.

### Deterministic economic settlement

The contract records the pre-appeal decision, appellant, stake, result, and
recovery deadline. An overturned appeal returns the stake to the successful
appellant; an upheld appeal awards it to the counterparty. Settlement and
recovery include tuition plus appeal stake while enforcing:

```text
total_received = total_held + total_paid_to_organizers + total_refunded_to_students
```

### Recovery hardening discovered on Studionet

Funded testing exposed a real edge case: if delivery evidence was rejected before
the state advanced, an enrollment could remain `FUNDED` while `claim_recovery`
accepted only explicit recovery states. v0.2.17 permits recovery from `FUNDED`,
`CHALLENGE_WINDOW`, and `READY_FOR_REVIEW` only after the stored deadline and
only when authoritative chain time is available. A regression test covers this
exact path.

### Fail-closed nondeterministic execution

If evidence is unavailable, its digest differs, the structured result is invalid,
or exact comparative consensus cannot be formed, the contract does not guess or
pay one party unilaterally. It enters bounded recovery and provides a deterministic
post-deadline exit.

## Frontend improvements

- Added an **Evidence Integrity Console** for terms, delivery, dispute, and appeal packets.
- Recalculates SHA-256 in the browser and displays expected and actual digests.
- Displays delivery, challenge, appeal, and recovery deadlines from contract state.
- Adds appeal opening and appeal adjudication flows with the required stake shown before signing.
- Shows custody totals and clickable GenLayer Explorer transaction links.
- Prevents actions that are invalid for the current role, state, or deadline.
- Points production navigation and configuration to the v0.2.17 contract.

## Verification results

| Verification | Result |
|---|---|
| Python contract tests | **25/25 passed** |
| Frontend logic tests | **4/4 passed** |
| ESLint | **Passed** |
| Next.js production build | **Passed; 9/9 static pages generated** |
| Initial deployment state | **Zero offerings, enrollments, custody totals, and balance** |
| Funded two-wallet lifecycle | **Executed on Studionet** |
| Fail-closed jury behavior | **Verified on Studionet** |
| Deadline recovery | **Verified on Studionet** |
| Final `total_held` | **0** |
| Final contract balance | **0** |
| Conservation invariant | **Passed** |

## On-chain evidence

| Step | Transaction |
|---|---|
| Create offering | [`0x2310167c…44c8f`](https://explorer-studio.genlayer.com/transactions/0x2310167ca50db6e427022c45c6c6415e2dc94fd876622fb1b72ce0149ae44c8f) |
| Lock curriculum | [`0xc0b78f6f…79008`](https://explorer-studio.genlayer.com/transactions/0xc0b78f6ff0aa521981dd94211ff70b3101ae13a41f66025fde4a5c6a7da79008) |
| Fund enrollment | [`0xc0695611…b5d3e`](https://explorer-studio.genlayer.com/transactions/0xc0695611ac71d50715e70213010322c99854fc65f9264751c1102de183bb5d3e) |
| Submit delivery | [`0x16663d32…a362`](https://explorer-studio.genlayer.com/transactions/0x16663d32aa67ce9d20588a568f1b2d52b7030f24617e488753bae2ff668ea362) |
| Ready for review | [`0x8eb6e3c6…1220d`](https://explorer-studio.genlayer.com/transactions/0x8eb6e3c645fd7d7af73e3f72b424772e816b739999f31b8f99c49a60c3c1220d) |
| AI adjudication | [`0xfa8b1a8c…8641e`](https://explorer-studio.genlayer.com/transactions/0xfa8b1a8c66e64ec2347858095abf692d1cd539900a0ca9e50e7c91fe9af8641e) |
| Deadline recovery | [`0x002952bf…c672`](https://explorer-studio.genlayer.com/transactions/0x002952bf65a973e86d00f935776873f7cbcc9f2e2d717a687352121e1c38c672) |

The deployed jury safely returned `EVIDENCE_UNAVAILABLE` when exact comparative
consensus was not formed. Recovery then split the 0.01 GEN case value equally,
returned `total_held` and contract balance to zero, and preserved conservation.
A successful appeal outcome is covered by the production-contract harness but is
not claimed as a successful deployed appeal transaction in this milestone.

## Review links

- [Live application](https://frontend-five-eta-88.vercel.app)
- [Studionet contract](https://explorer-studio.genlayer.com/address/0x681B80032A0BAfB263062418a462E39951e32532)
- [Detailed release evidence](./release-evidence.md)
- [Deployment handoff](../deployment/APPEAL_V2_DEPLOYMENT.md)
- [Public source repository](https://github.com/eaglebooth/SyllabusBond)
