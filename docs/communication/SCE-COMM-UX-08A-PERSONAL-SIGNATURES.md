# SCE-COMM-UX-08A — Persönliche Signaturen

## Ownership

- **Owner:** authenticated `User` (self-service), stored per **tenant + user** (`UserCommunicationPersonalSignature`).
- **Not:** tenant email sender identity, From/Reply-To, provider, or billing transport.

## Tenant scope

Signatures are **tenant-scoped per user** (same pattern as `UserCommunicationInboxWorkspacePref` and COMM-17 preferences). A person in multiple clubs maintains separate signatures per tenant.

## Persistence

| Field | Purpose |
| --- | --- |
| `bodyText` | Plain-text signature content (nullable) |
| `useByDefault` | Default composer checkbox when signature exists |

## Content format

Plain text only. HTML tags are stripped on save. Outbound email uses existing `plainTextToSafeHtml` on the **combined** body.

## Default behaviour

- Settings: **Signatur standardmässig verwenden** (`useByDefault`, default `true`).
- Composers: checkbox **Meine Signatur verwenden**, initialised from preference.

## Application semantics

- Applied **at send/publish/reply** on the server via `applyPersonalSignatureToOutboundBody`.
- **Embedded** into `bodyText` / message storage (not dynamically rendered from profile later).
- Separator: blank line between message and signature (`\n\n`).

## Supported flows

| Flow | Supported |
| --- | --- |
| Direktnachricht (COMM-UX-04A) | Yes |
| Mitteilung kind `MESSAGE` | Yes |
| Mitteilung `ANNOUNCEMENT` / `ALERT` | No (org broadcast) |
| Kommunikationscenter reply (email + SCE) | Yes |
| Kampagnen | No |
| Shared Vorlagen | No (template apply does not capture signature) |

## Nur informieren

Signature toggle is independent of MESSAGE vs INFORM. `repliesAllowed` unchanged.

## Channels

| Channel | Behaviour |
| --- | --- |
| EMAIL | Full combined body |
| IN_APP | Full combined body in stored content |
| PUSH | Notification preview uses first 240 chars of body (signature usually not in push preview) |

## Historical freezing

Published/sent communications store the composed body. Editing or removing the profile signature does **not** rewrite past messages.

## Boundaries

- **UX-08 sender:** unchanged (`Tenant.emailSender*`, readiness, Resend).
- **Billing:** unchanged (separate pipeline).
- **COMM-18 safeguarding / COMM-17 consent:** signature is content only; no recipient or category changes.
- **Authorization:** API binds to session `userId` + active tenant; cannot set another user's signature.

## Privacy

No auto-fill from Person profile fields (phone, private email, etc.).

## UI

- Settings: `/dashboard/communication/personal-signature`
- Hub link under **Einstellungen** (personal), separate from **E-Mail-Absender** (organisation).

## Deferred

- Rich-text signatures
- Campaign/org-level signature templates
- Per-channel signature variants
