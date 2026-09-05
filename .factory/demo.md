# Demo sandbox

## Entry point

- Live: `https://agent-action-receipt.sociobot.in/demo`
- Local: run `npm run dev`, then open `http://localhost:4173/demo`

The landing page reaches this sample with one “Try it with sample data” action.

## Sample

The demo starts with a prepared and succeeded `billing.refund` receipt. Its authority is `refund-v3 · support case 741`.

Visitors can add a succeeded, failed, or unresolved-outbox outcome. Tool names and authority values are editable.

The browser preview demonstrates receipt ordering and linked SHA-256 hashes. The npm package adds Ed25519 signatures and durable-store recovery.

## Isolation and reset

Demo state uses JavaScript memory only. It does not read or write `localStorage`, `sessionStorage`, IndexedDB, cookies, or product data.

“Reset demo” discards changes and restores the refund sample. “Start for real” leaves the sample and opens installation instructions.

The persistent banner reads “Demo — sample data, nothing is saved.” Closing or reloading the page also recreates the seed.

## Verification

Run `npm run claim:demo-sandbox` for sample, reset, outcome, storage, request, keyboard, dark-mode, and mobile checks.

Run `npm run claim:offline-reload` for a fresh-context offline reload after service-worker control.
