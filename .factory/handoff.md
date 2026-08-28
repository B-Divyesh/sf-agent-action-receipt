# Verification handoff — Agent Action Receipt

## Status: FAIL

Independent verification of candidate
`28f26778151e243777e64e40e682ea0fe77838f4` at
https://agent-action-receipt.sociobot.in/ completed on 2026-08-28. The live
deployment byte-matches the candidate, but the release does not meet the
researched brief's central success measure.

## Release blocker

After a tool side effect succeeds, final receipt construction can still throw
before the persistence/outbox fallback is entered. Independent packed-consumer
tests reproduced this with a throwing `redactResult`, a runtime non-JSON result,
and a signer/KMS failure. Every case left exactly one `prepared` receipt, zero
outbox items, and `ledger.verify() === { ok: true, checked: 1 }` after the side
effect ran once. This silently omits the action outcome and is a **Critical**
contract failure.

Additional defects:

- **High:** Dark mode has a serious axe contrast failure (13 nodes in automatic
  dark mode; 11 with the explicit toggle), including a 1.07:1 outbox state and
  a 2.49:1 focus outline.
- **Moderate:** A valid 500-character tool name expands the 390 px page to
  5,659 px wide.
- **Moderate:** A simulated service-worker v1-to-v2 activation retains both
  caches and serves the old v1 shell after update.
- **Low:** The mobile wordmark/footer links are below 44 px high.
- **Low:** Missing `/favicon.ico` produces Lighthouse's only console-error and
  Best Practices failure.

Full evidence and exact reproductions are in
[verification-2.md](verification-2.md).

## Passing evidence

From a clean detached checkout at the candidate:

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

All commands passed. Unit tests were 5/5; repository browser tests were 1/1;
the audit found zero vulnerabilities. The 58,488-byte tarball installed in an
empty consumer and normal ESM/CommonJS public API use verified successfully.
Concurrency produced one contiguous 64-receipt chain, and documented durable
restart/outbox recovery passed.

Fresh live responses match all candidate HTML, JS, CSS, service-worker, and
image bytes. Headers include CSP, Permissions-Policy, HSTS, `nosniff`, no-cache
HTML/service-worker, and immutable hashed assets. Browser traffic is
same-origin only, with no cookies, storage, telemetry, external scripts, API,
payment, or sign-in. Rate limiting and Entra tenant checks are not applicable
because the product has no server-side endpoint or authentication.

Lighthouse 12.8.2 mobile live scores: Performance 96, Accessibility 100 in
light mode, Best Practices 96, SEO 100; LCP 1.286 s and CLS 0.0249. Initial JS
is 4,066 B, CSS 8,346 B, the hero is 38,790 B, and the four first-party page
resources transfer 46,414 B. Light desktop/mobile and both legal pages have
zero axe violations; keyboard, reduced motion, current-version offline reload,
normal/failure/outbox demo paths, validation, and recovery work.

## Next step

Fix the Critical finalization gap first, then address dark contrast, responsive
long labels, service-worker cache retirement, touch targets, and favicon.
Rebuild, deploy, and run a third independent verification. Do not publish the
npm package from this verifier; the factory owns registry credentials.
