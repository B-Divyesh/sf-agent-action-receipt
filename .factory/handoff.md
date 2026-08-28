# Handoff — Agent Action Receipt repair

## Release status: repaired and deployed

This repair resolves every finding in the independent verification of candidate
`b7af11cd9e480119a82b5388b5dc435be6f3dd14`. Product changes are in
`c98f50e`; Azure Static Web Apps response-policy configuration is in
`1599e84524e5078b9244064f158f2de6f769b545`. Both commits are on `main` and
pushed to `origin`.

The static site was deployed with the factory static deployer to
https://agent-action-receipt.sociobot.in/ (Azure deployment
`098d5974-2fc2-471d-ba07-362565b0aa07`). The live landing page and every
public asset below byte-match the final local `dist/site` build:

| Asset | SHA-256 |
| --- | --- |
| `index.html` | `a0f5e9d9b862d0812c56370fa7a7e14b4b31434b6ef0fb165ed08ff2d1ce3770` |
| `sw.js` | `ab9dd0552a72b656ecda342c3e192771d4601e39ddb93da7cc991a97d2c7d031` |
| `privacy.html` | `4daae97769749800b5285290612f67e9af4e2a9845e1a1091bd04ea6689e037e` |
| `terms.html` | `f15416f37028bc2294a8e5268fd2d6b9c694b996dceb4da1c39e00b98815c70d` |
| `assets/app.33df622604a9.js` | `33df622604a97e38c3b3d2c5ead4ab2906e94337c0b22a79f9a5ac09ebb75247` |
| `assets/styles.c30994913d51.css` | `c30994913d51b6a78d5f59eabfa14ad04111b178bc07e35ed1f83c5ac49dbd99` |
| `assets/receipt-diorama.79d8d1721986.webp` | `79d8d1721986cce9a883888ec4f73b29ba5a6dcf72732445dc854eb7ee9f99e7` |

## What changed

- `ReceiptLedger.execute()` now serializes the complete logical action,
  including the tool run, so concurrent calls produce a contiguous signed
  chain.
- Durable stores now implement `append`, `saveOutbox`, and atomic
  `resolveOutbox`; `RecoverableReceiptStore.load()` plus
  `ReceiptLedger.restore()` safely reloads and verifies unfinished work after a
  process restart.
- If both final receipt and outbox persistence fail, the API throws
  `OutboxPersistenceError` with the signed receipt instead of falsely claiming
  durable recovery.
- Documentation assets are SHA-256 fingerprinted. Azure-specific
  `staticwebapp.config.json` and portable `_headers` supply CSP,
  Permissions-Policy, nosniff, no-cache HTML/service-worker, and immutable
  asset caching. The copy button is now 44px tall.
- Added regression coverage for eight concurrent actions, crash/restart outbox
  recovery, static response policies, desktop and 390px browser behavior,
  keyboard validation, reduced motion, offline reload, and axe.

## Verify

```sh
npm ci
npm test
npm run check
npm run lint
npm run build
npm run test:browser
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

Final clean-run evidence:

- `npm test`: 5/5 pass, including the concurrent-chain and restart/recovery
  fault-injection regressions.
- `npm run check` and `npm run lint`: pass.
- `npm run build`: produces `dist/esm`, `dist/cjs`, and `dist/site`.
- `npm run test:browser`: pass. It covers desktop and 390px layout, required
  form recovery, success/failure/outbox demo paths, keyboard skip-link focus,
  44px copy control, reduced motion, service-worker offline reload, response
  headers, and axe (0 violations on both viewports).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm pack --dry-run`: pass; 58.3 kB tarball / 98.1 kB unpacked.
- A freshly packed tarball was installed into an empty temporary consumer:
  documented ESM and CommonJS imports each created and verified a receipt.
- Factory live-URL verification passed: HTTPS 200, title, `lang`, one h1,
  main landmark, image alt text, no browser errors, and 390px axe returned 0
  violations. Live `app.33df622604a9.js` returns
  `Cache-Control: public, max-age=31536000, immutable`; HTML returns
  `no-cache`, CSP, and Permissions-Policy.
- Lighthouse 12.8 mobile against the local static server scored Performance
  100, Accessibility 100, Best Practices 96 (local HTTP), and SEO 100; LCP
  1.2 s and CLS 0. The report recorded a Chromium full-page-screenshot target
  crash after scoring, so the Playwright/axe run above is the authoritative
  browser regression evidence.

## Known limits

- The protocol cannot make an arbitrary remote side effect and a receipt store
  atomic; it does not claim exactly-once execution or ordering across separate
  ledger instances.
- Durable recovery depends on the caller implementing `resolveOutbox` as an
  atomic/idempotent store operation and retaining the signing key in an
  appropriate KMS, HSM, or OS keychain.
- Do not publish from this worker. The package is ready for factory publishing:
  `npm pack`.
