# Landing page copy audit

Audited `site/index.html` on 2026-09-05. Word counts exclude navigation labels, code, hash values, and receipt field values.

| Text | Words | Result |
| --- | ---: | --- |
| Open-source TypeScript library | 3 | Pass |
| Record every consequential agent action | 5 | Pass |
| For teams giving agents real tool access, it records signed evidence before and after each action. | 15 | Pass |
| Try it with sample data | 6 | Pass |
| See a prepared record and its linked outcome. | 8 | Pass |
| Install the library | 3 | Pass |
| Free under the MIT License. | 5 | Pass |
| Runs without a hosted service. | 5 | Pass |
| Raw arguments and results stay out of receipts. | 8 | Pass |
| Prepared and final records stay linked. | 6 | Pass |
| Sample evidence | 2 | Pass |
| See what an incident review receives | 7 | Pass |
| A normal action produces a prepared receipt and a signed outcome receipt. | 12 | Pass |
| Open the sample receipt | 4 | Pass |
| How it works | 3 | Pass |
| Write evidence around the tool call | 6 | Pass |
| Prepare the action | 3 | Pass |
| Hash the authority and arguments before the tool can change real state. | 12 | Pass |
| Run the tool | 3 | Pass |
| Call existing tool code while the ledger keeps one action order. | 11 | Pass |
| Record the outcome | 3 | Pass |
| Append a signed result or save explicit unresolved evidence for recovery. | 11 | Pass |
| Failure recovery | 2 | Pass |
| Keep post-action failures visible | 4 | Pass |
| The ledger signs an unresolved fallback before execution. | 8 | Pass |
| It can still record the action if later hashing or signing fails. | 12 | Pass |
| Prepared receipt | 2 | Pass |
| Tool call | 2 | Pass |
| Final receipt or outbox | 4 | Pass |
| Install | 1 | Pass |
| Add receipts to a TypeScript agent | 6 | Pass |
| Supply an Ed25519 signer and a durable receipt store for restart recovery. | 12 | Pass |
| Limits and privacy | 3 | Pass |
| Know what the receipt proves | 5 | Pass |
| One ledger has one order. | 6 | Pass |
| Separate processes do not gain a shared global order. | 9 | Pass |
| Remote actions are not exactly once. | 6 | Pass |
| Tool state and receipt storage remain separate systems. | 8 | Pass |
| The signing key makes the claim. | 6 | Pass |
| Add an external witness when independent evidence is required. | 9 | Pass |
| You control storage. | 3 | Pass |
| The package has no hosted account, telemetry, or private-key store. | 10 | Pass |
| Signed action receipts for teams running agents with real tool access. | 11 | Pass |

No sentence exceeds 22 words. No banned word appears.

## Terminology

| Concept | Term used |
| --- | --- |
| One signed protocol record | receipt |
| Record written before the tool runs | prepared receipt |
| Record written after the tool runs | final receipt |
| Durable pending recovery record | outbox item |
| Ordered receipt collection | receipt chain |
| External corroborating reference | witness |
| The wrapped operation | tool call |
