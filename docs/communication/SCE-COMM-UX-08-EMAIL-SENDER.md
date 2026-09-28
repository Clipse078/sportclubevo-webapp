# SCE-COMM-UX-08 — E-Mail-Absender Workspace

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-08-email-senders`  
**Route:** `/dashboard/communication/email-sender`  
**Architecture:** COMM-14 outbound email + `email-sender-service` + `email-readiness-service`

---

## Communication provider

Platform Communication outbound email uses **Resend** via `lib/email/mailer.ts` and `lib/email/outbound-email-transport.ts` (COMM-14). Billing invoice delivery remains on **Infomaniak SMTP** (`billing-email-transport.ts`) and is not configured on this page.

---

## Sender ownership

| Concern | Owner |
|--------|--------|
| Tenant display name + address | `Tenant.emailSenderDisplayName` / `emailSenderAddress` via `email-sender-service` |
| Effective From at send time | `resolveTenantEmailSender()` |
| Domain authorization | `getSenderDomainAuthorization()` (Resend domain list; local `VERIFIED` / `NOT_VERIFIED` / `UNKNOWN`) |
| Platform fallback | `EMAIL_FROM` when tenant sender is missing or not verified |

One sender identity per tenant (no multi-sender model).

---

## Readiness

Canonical evaluation: `evaluatePlatformEmailReadiness()` in `lib/communication/platform-email/email-readiness-service.ts`.

UI maps readiness to human states (`Bereit`, `Konfiguration unvollständig`, `Absender nicht verifiziert`, `Provider nicht konfiguriert`, `Fallback aktiv`) using **only** readiness output — saving sender settings re-fetches readiness and does not imply ready.

Checklist items mirror transport configuration, tenant sender presence, domain authorization, valid effective From, and fallback availability.

---

## Verification semantics

«Verifiziert» means the sender domain appears on the Resend domain list (`VERIFIED`). `UNKNOWN` means the provider check could not confirm authorization (credentials missing or API failure) — not a claim of external verification completion.

---

## Effective vs configured sender

When `platformFallbackActive` is true, the UI shows both **Konfigurierter Absender** (tenant fields) and **Aktiv verwendet** (resolved `activeFrom`, typically `EMAIL_FROM`).

---

## Reply-To

| Path | Reply-To behavior |
|------|-------------------|
| COMM-14 Mitteilungen / Kampagnen / direct-message email enqueue | No separate Reply-To header; clients reply to From |
| Communication Center threaded outbound (`outbound-email-service`) | Opaque `reply+<token>@EMAIL_INBOUND_DOMAIN` when inbound domain configured |
| Billing | Separate billing identity — not shown here |

Inbound mailbox/IMAP configuration remains under **Kommunikationscenter** settings (`/dashboard/communication/inbox/settings`).

---

## Direct message / «Nur informieren»

`INFORM` mode disables SCE reply APIs; product copy states recipients may still send a new email to the visible From address.

---

## Integrations

| Feature | Relationship |
|---------|----------------|
| Kampagnen (COMM-UX-05) | Uses `GET /api/communication/email/readiness` |
| Mitteilungen (COMM-UX-04) | Same readiness service at publish/enqueue |
| Vorlagen (COMM-UX-07) | Channel defaults only; no sender persistence in templates |
| Kommunikationscenter (COMM-15) | Inbound/reply routing separate from sender form |

---

## Authorization

View/manage: `TENANT_ADMINISTRATION_PERMISSIONS` (`users.manage`, `users.manage_memberships`). Server mutations on `PATCH /api/admin/communications/email-sender` enforce the same permissions. Tenant isolation via active tenant session + Prisma `tenantId` scopes.

---

## Secret security

Page props and readiness API expose only sender fields and boolean/configuration **states**. Never serialized: `RESEND_API_KEY`, SMTP/IMAP passwords, encryption keys, or full secret env values.

---

## Billing boundary

No imports from billing transport on the sender page. Help copy documents separation. Regression tests assert billing modules are not referenced from the route.

---

## Responsive & accessibility

Sections stack on small viewports; status uses text labels plus icons (not color-only). Form fields are labelled; validation errors use `role="alert"`.

---

## Deferred

- Real test-email send from UX (existing protected test delivery service not invoked from UX-08)
- Provider dashboard domain setup automation
- Open/click tracking (COMM-20 deferred)

---

## Tests

- `app/(admin)/dashboard/communication/email-sender/__tests__/comm-ux-08-email-sender.test.tsx`
- `lib/communication/__tests__/email-sender-display.test.ts`
- Updated COMM-03B workspace tests

Regression suites: COMM-14, COMM-15, COMM-UX-04/05/07, billing email separation tests.
