# CLAUDE.md

Read `README.md` first ("For maintainers"). The site is the generated HTML in `docs/`, served by
GitHub Pages; preview it with `node serve.mjs` (http://localhost:4599).

- Target device: Samsung Galaxy Z Fold 7 (cover screen ~360-390 CSS px, unfolded a near-square
  ~840px). Every page must look right, with no horizontal page scroll, at 360px (not just
  375/390), ~840px and desktop, in light and dark, with 44px touch targets. Check in a browser
  at those widths before calling UI work done.
- Every page must be reachable on the phone through a visible UI element (bottom bar, More
  sheet, menu, or a link on another page), never only by typing its URL: no desktop-only nav
  entries, and no page that tells a phone user to open it on a desktop.

## Autonomy

Nish (2026-10-26): "you have full autonomy to merge and deploy. Just make sure everything is always
live when you're done… Do not hold up development waiting for an answer from me unless absolutely
100% critically necessary."

- Claude sessions build, commit, push, open and merge PRs, release and deploy on their own judgment,
  without asking Nish. Work is done only when it is on `master`, the GitHub Pages build is green and
  the live site serves the new `docs/`.
- Pick sensible defaults instead of asking. Stop for Nish only when critically necessary:
  credentials or account signups, or anything destructive to production data.
