# Changelog

## 0.1.2

- Pre-sign an unresolved fallback before execution so post-effect result hashing or signing failures remain explicit and verifiable.
- Run argument redaction before execution and surface result-redaction failures without losing the signed final receipt.

## 0.1.1

- Serialize complete ledger actions to preserve a verifiable receipt order under concurrent `execute()` calls.
- Add a durable outbox store contract plus restart recovery through `ReceiptLedger.restore()`.
- Fingerprint documentation assets, add static response policies, and enlarge the copy control to a 44px touch target.

## 0.1.0

- Initial signed action receipt ledger, verifier, outbox, and redacted bundle export.
