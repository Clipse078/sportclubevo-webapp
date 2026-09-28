# SCE-COMM-20 — Deferred Communication capabilities

Explicit list confirmed from repository documentation and code. **Not implemented in COMM-20** unless required for correctness.

| Item | Evidence |
|------|----------|
| SMS channel | `SCE-COMM-01-ARCHITECTURE.md`, `preference-categories` — SMS reserved |
| WhatsApp / other messengers | Not present in codebase |
| Secure public unsubscribe / signed preference tokens | `SCE-COMM-17-PREFERENCES-CONSENT.md` — deferred |
| `List-Unsubscribe` headers | COMM-17 deferred alongside public tokens |
| Email open/click tracking & marketing attribution | COMM-14 / COMM-19 — transport acceptance only; no pixels |
| Advanced provider delivery/open webhooks for Communication | COMM-19 semantics — no mailbox read confirmation for email |
| Communication email attachment streaming in transport | `SCE-COMM-14-OUTBOUND-EMAIL-DELIVERY.md` — body-only send |
| Inbound/outbound reply attachments | `SCE-COMM-15` — deferred |
| Inbound attachment malware scanning / canonical storage gate | COMM-15 — deferred |
| Native iOS/Android push token path | `SCE-COMM-09` — WEB only today |
| Installable PWA / offline shell | COMM-09 |
| In-product “Push aktivieren” settings page (beyond gesture seam) | COMM-09 |
| Broad automatic schedule management UI | COMM-10 — service/API only |
| Team chat message edit/delete (beyond archive tombstone) | COMM-05 |
| Rich chat attachment upload UX | COMM-05 — reference ID seam only |
| Sponsor module dedicated campaign UI seam | COMM-13 — audience integration only |
| Resend receiving as production inbound (IMAP is COMM-15 path) | Provider normalization exists; primary inbox is IMAP |

When implementing any deferred item, update this list and the relevant COMM package doc.
