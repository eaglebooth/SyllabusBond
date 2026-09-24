# SyllabusBond v0.2.17 — Release Evidence

**Status**: `STUDIONET_DEPLOYED_AND_RECOVERY_VERIFIED`  
**Contract**: `0x681B80032A0BAfB263062418a462E39951e32532`  
**Network**: GenLayer Studionet (chain 61999)  
**Explorer**: <https://explorer-studio.genlayer.com/address/0x681B80032A0BAfB263062418a462E39951e32532>  
**Source SHA-256**: `6fea96465a82fa00bf026a089bc818ec822aad140dcd5cdf489b2dfef5277bd3`

## Verification gates

| Gate | Result | Evidence |
|---|---|---|
| Contract suite | `PASS` | 25/25 Python tests, including funded/pre-review post-deadline recovery regression. |
| Frontend suite | `PASS` | 4/4 UI tests, ESLint clean, Next.js production build generated 9/9 routes. |
| Initial state | `PASS` | Zero offerings, enrollments, custody totals, and contract balance after deployment. |
| Funded lifecycle | `PASS` | Two-wallet offering, curriculum lock, enrollment, delivery, review readiness, and nondeterministic adjudication executed on Studionet. |
| Fail-closed consensus | `PASS` | Exact comparative consensus did not form, so adjudication returned `EVIDENCE_UNAVAILABLE` and `RECOVERY_WAIT`; no unilateral payout occurred. |
| Recovery and conservation | `PASS` | Recovery split 0.01 GEN equally after the deadline; `total_held = 0`, contract balance = 0, and received = held + paid + refunded. |
| Stake-backed appeal success | `NOT_CLAIMED` | Appeal paths are covered by production-harness tests; this deployed lifecycle did not enter appeal because the first jury round failed closed. |

## Studionet transaction bundle

| Step | Transaction |
|---|---|
| Create offering | `0x2310167ca50db6e427022c45c6c6415e2dc94fd876622fb1b72ce0149ae44c8f` |
| Lock curriculum and instructor | `0xc0b78f6ff0aa521981dd94211ff70b3101ae13a41f66025fde4a5c6a7da79008` |
| Enroll with 0.01 GEN | `0xc0695611ac71d50715e70213010322c99854fc65f9264751c1102de183bb5d3e` |
| Submit immutable delivery evidence | `0x16663d32aa67ce9d20588a568f1b2d52b7030f24617e488753bae2ff668ea362` |
| Confirm ready for review | `0x8eb6e3c645fd7d7af73e3f72b424772e816b739999f31b8f99c49a60c3c1220d` |
| AI adjudication (fail-closed) | `0xfa8b1a8c66e64ec2347858095abf692d1cd539900a0ca9e50e7c91fe9af8641e` |
| Deadline recovery | `0x002952bf65a973e86d00f935776873f7cbcc9f2e2d717a687352121e1c38c672` |

Final authoritative state:

```json
{
  "status": "RECOVERED",
  "decision": "RECOVERED",
  "total_received": 10000000000000000,
  "total_held": 0,
  "total_paid_to_organizers": 5000000000000000,
  "total_refunded_to_students": 5000000000000000,
  "contract_balance": 0
}
```

The earlier addresses remain historical evidence only. The frontend and release links target the recovery-hardened v0.2.17 deployment above.
