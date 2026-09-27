# Product captures

Captured September 27, 2026 from the running local Interleave application at a desktop breakpoint of 1440 × 1050. These are browser screenshots, not illustrations. Source PNGs were encoded as WebP for delivery without changing their content.

- `lost-update.webp`: Step A, B, A, B, A, B; both workers finish; shared counter is 1. Replay: `/lab#v=1&lab=lost-update&mode=buggy&trace=ABABAB`.
- `atomic-fix.webp`: Switch to With the fix; step A, B; counter is 2. Both terminal schedules pass. Replay: `/lab#v=1&lab=lost-update&mode=fixed&trace=AB`.
- `deadlock.webp`: Select Deadlock; step A, B; A holds users and B holds orders. Both workers block. Replay: `/lab#v=1&lab=deadlock&mode=buggy&trace=AB`.

No private workspace notes, account identifiers, or AI-generated outputs appear in these images.
