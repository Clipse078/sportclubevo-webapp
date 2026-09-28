# SCE-COMM-EVO-08 — Multi-Sender Identities

## Legacy architecture

Before EVO-08, a tenant owned at most one Communication sender via `Tenant.emailSenderDisplayName` / `emailSenderAddress`, resolved by `resolveTenantEmailSender()` and verified through `getSenderDomainAuthorization()`.

## Canonical owner

`TenantCommunicationSenderIdentity` is the tenant-scoped 1-N sender model. Legacy tenant columns remain as compatibility mirrors of the **default** active identity (synced on create/update/default/archive).

## Migration

Additive migration `20260928170000_sce_comm_evo_08_multi_sender_identities`:

- Creates sender identity table + enums
- Adds publish-time snapshot columns on `PlatformCommunication`
- Seeds one default identity from legacy tenant sender fields when populated

## Default resolution

1. Explicit `emailSenderIdentityId` (orchestration / API) when provided
2. Tenant default active identity when verified
3. Platform `EMAIL_FROM` fallback

Explicit but inactive/unverified/unknown senders **fail** (no silent switch to another tenant sender).

## Verification & readiness

Read-only provider truth via `getSenderDomainAuthorization()` per sender address. Product states: `VERIFIED`, `NOT_VERIFIED`, `UNKNOWN` (fail-safe). `evaluatePlatformEmailReadiness(tenantId, { senderIdentityId })` is the canonical readiness entry point.

## Authorization

- **Manage**: `TENANT_ADMINISTRATION_PERMISSIONS` (API `/api/communication/email/senders`)
- **Use**: club send, direct message send, inbox reply permissions; tenant-wide scope in EVO-08 (structural scope deferred to EVO-03/EVO-09)

Clients submit **sender identity IDs only**; server re-resolves display name, address, and verification.

## Historical snapshot

At publish, `PlatformCommunication` stores:

- `emailSenderIdentityId`
- `emailSenderDisplayNameSnapshot`
- `emailSenderAddressSnapshot`
- `emailSenderSource` (`TENANT` | `PLATFORM`)

COMM-14 delivery uses frozen snapshot From; explicit tenant senders that become unusable before scheduled send fail with `SENDER_UNUSABLE` / `SENDER_VERIFICATION_UNKNOWN`.

## From vs Reply-To

From follows resolved/snapshotted sender identity. Communication Center threaded replies retain `buildInboundReplyToAddress()` semantics; reply From prefers conversation/platform snapshot when available.

## Product surfaces

- Settings: `/dashboard/communication/email-sender` (multi-sender management + platform fallback panel)
- Shared selector: `CommunicationSenderSelector`
- Direct message, campaigns, mitteilungen (publish intent via orchestration / publish API)

## Billing isolation

Billing continues Infomaniak SMTP transport; no dependency on `TenantCommunicationSenderIdentity` or Communication Resend sender selection.

## Future

EVO-03 universal composer, EVO-06 template sender defaults, EVO-07 signatures, and structural sender scope (OrgUnit/Team/Role) are out of scope for this package.
