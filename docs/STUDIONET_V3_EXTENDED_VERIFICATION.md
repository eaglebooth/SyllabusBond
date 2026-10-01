# SyllabusBond v0.3 Extended Studionet Verification

Date: 2026-10-01
Contract tested: [`0xf8771bcFe84b62dB407C31F3bC54DF8E4a08b9e4`](https://explorer-studio.genlayer.com/address/0xf8771bcFe84b62dB407C31F3bC54DF8E4a08b9e4)

## Verified on chain

### Complete three-module settlement

Enrollment `#0` progressed through all three sequential checkpoints and reached `SETTLED`:

- Module 2 submit: [`0xa0f25a…24d59`](https://explorer-studio.genlayer.com/transactions/0xa0f25a48bce0b13b39377948f22582fd31a1549965f20fdb901dd07cc3f24d59)
- Module 2 accept: [`0x3cb6f1…229d8`](https://explorer-studio.genlayer.com/transactions/0x3cb6f1b63898f8670eda8b49e3610d23fdec2bf5f24a0e15777912ccc4f229d8)
- Module 3 submit: [`0x3ff5ba…d7b4`](https://explorer-studio.genlayer.com/transactions/0x3ff5ba23c0167c15c957357a03bfeeff127ef4791968aa014b681c2090d8d7b4)
- Module 3 accept: [`0x2d888a…c426`](https://explorer-studio.genlayer.com/transactions/0x2d888a0e741d4b00629dd8738c1f58f684b66160dfac85e72f51f89eec60c426)
- Final released amount: `1000000000000000`
- Final remaining amount: `0`

### Real review-timeout jury

Enrollment `#1` released module 1, left module 2 in review beyond its actual 30-second deadline, and then invoked the GenLayer jury:

- Module 1 accept: [`0xfa418a…658a`](https://explorer-studio.genlayer.com/transactions/0xfa418acbe9f2dddec447b27b8dfa0f1c03dd8e6deaca4446e52da8716d79658a)
- Module 2 submit: [`0x81ef58…37b4`](https://explorer-studio.genlayer.com/transactions/0x81ef589ef5c19abbb6693e72afdf0f0f142b5e7c5bdcb78d41a6228df5e037b4)
- Timeout jury: [`0x94e42b…203f`](https://explorer-studio.genlayer.com/transactions/0x94e42ba8b6310e0fec02aa9c9d5f4545b31562e4b59432dc35eb6eb56622203f)
- Jury result: `REJECTED`
- Prior release stayed `500000000000000`; future escrow stayed protected until settlement.
- Settlement transaction: [`0xcb80ec…c985`](https://explorer-studio.genlayer.com/transactions/0xcb80ec7561660c4376b95572ceede55c6a451a4d072ab597f30a76ea8264c985)

### Unavailable evidence and bounded recovery

Enrollment `#2` used unreachable immutable references, entered a real dispute, failed closed to `UNAVAILABLE`, waited through its recovery deadline, and reconciled custody:

- Dispute: [`0xa8a9bc…725e8`](https://explorer-studio.genlayer.com/transactions/0xa8a9bc7f2d0dfcf6f4d3fab6f6486a74e028d87447ef44b30ea30671fea725e8)
- Jury: [`0x338f68…c5af2`](https://explorer-studio.genlayer.com/transactions/0x338f6842e3d1564348f9e0455fd3419f90a5855281a8238603efc72187bc5af2)
- Recovery: [`0x708ce5…bd7b5`](https://explorer-studio.genlayer.com/transactions/0x708ce510d0cd9847bdbf609557b6d3a3c08184f766c6e7ace9e65ed7175bd7b5)
- Result: organizer `500000000000000`, student `500000000000000`, remaining `0`.
- Global conservation held after recovery.

## Finding discovered by live verification

The deployed v0.3.0 contract used a 60-second appeal window. Studionet consensus and transaction finalization consumed enough time that a valid post-jury appeal transaction arrived after the deadline and rolled back. No stake was retained and no funds were lost; remaining tuition could still settle according to the original verdict. However, the appeal feature was operationally unreliable.

The v0.3.1 source patch extends the appeal window to 300 seconds and appeal recovery to 600 seconds. It requires a new deployment before a live post-partial appeal can be marked verified.

## Property and RPC testing

- Contract tests: 32 passing.
- Property test: 10,000 seeded randomized module/accounting lifecycle sequences passed conservation and payout-bound assertions.
- RPC stress: 100 `get_totals` reads with concurrency 10 produced 30 successes and 70 explicit `-32029` failures.
- Measured Studionet RPC limit: approximately 30 requests per minute for this workload.
- Frontends must use bounded reads, caching, pagination, and retry/backoff rather than unbounded fan-out.

## External audit boundary

This package is suitable for an independent auditor, but it is not a third-party audit report and does not claim formal verification. An external reviewer must independently inspect the source, reproduce the evidence, and sign their own report.
