# Project Explorer readiness

## Confirmed identity

- Project: SyllabusBond
- Status: Preview
- Primary category: Education
- Category tag 1: Tuition Escrow
- Category tag 2: Evidence Adjudication
- Website: https://frontend-five-eta-88.vercel.app/
- GitHub: https://github.com/eaglebooth/SyllabusBond
- Contract: https://explorer-studio.genlayer.com/address/0x85F77d08727Ca798875387E57736077258Be255D
- Network: studionet
- Logo: `frontend/public/syllabusbond-logo.png` (square PNG, under 2 MB)

## Deployed proof

The current contract exposes one settled enrollment. Enrollment `#0` is `SETTLED`, with jury result `DELIVERED / FULL / MATCH`, `1 GEN` paid to the organizer, `0 GEN` refunded, and `0 GEN` held. Release evidence also records an earlier two-wallet recovery transaction and an evidence-unavailable path.

## Contract-change warning

Do not redeploy for this frontend release. The current deployed contract is readable and has successful jury and custody evidence. If contract source changes, reconcile it with the latest workspace rules first: the present source uses `hashlib` and `@gl.public.write.payable`, which are outside the newly supplied restricted import/decorator profile.