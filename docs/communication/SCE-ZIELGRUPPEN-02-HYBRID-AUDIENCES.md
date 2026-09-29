# SCE-ZIELGRUPPEN-02 — Hybrid Audiences, External Contacts & Universal Recipient Management

## Architecture diagnosis (STAGE baseline)

- **Target groups** persist as `TargetGroup.ruleJson` v2 envelopes: canonical `CommunicationAudienceSpec` + derived `resolverClause` + optional `structuralExclusion`.
- **Audience spec** is the COMM-01 / EVO-03 `CommunicationAudienceSpec` (structural selectors, saved groups, explicit persons, sponsor selectors).
- **ZIELGRUPPEN-02** extends the spec with `external` explicit include/exclude lists referencing `CommunicationExternalContact`.
- **Resolution** remains COMM-03 `resolveCommunicationRecipients` for persons; external contacts resolve in parallel and snapshot at publish (like sponsor externals).
- **Selector** remains `CommunicationAudienceSelector` (HOTFIX-02 / EVO-03) with an added **Externe** category.
- **Snapshots** remain `PlatformCommunicationRecipientSnapshot` (immutable at dispatch); new kind `EXTERNAL_COMMUNICATION_CONTACT`.

## Hybrid model

```
TARGET AUDIENCE = dynamic inclusions ∪ direct inclusions − exclusions
```

Precedence: **exclusion > direct include > dynamic include**.

At send time:

```
ACTUAL RECIPIENTS = resolved audience ∩ sender scope ∩ eligibility ∩ safeguarding ∩ consent/channel rules
```

Membership ≠ authorization ≠ delivery eligibility ≠ marketing consent.

## External contacts

Model: `CommunicationExternalContact` (tenant-scoped, unique `emailNormalized`).

- No fake `User` / `Person` / `TenantMembership` for arbitrary emails.
- Identity precedence at delivery: linked Person/User > existing external contact > newly created external contact.
- Email normalization/validation reuses ADMIN-ACCESS-UX-01 (`validateInvitationEmailSyntax` / typo suggestions).

## Bulk email entry

UI: **Mehrere E-Mail-Adressen hinzufügen** in the Zielgruppe editor.

Parser accepts newline, comma, semicolon; review states:

- Bestehende Person / Bestehender externer Kontakt / Neuer externer Kontakt / Ungültige Adresse / Möglicher Tippfehler

Invalid rows block persistence.

## Live Zielgruppe vs historical snapshots

Saved groups and composer specs remain **live**. Published communications store **immutable** `PlatformCommunicationRecipientSnapshot` rows — never recomputed from today's group definition.

## Domain audience seam (future)

`lib/communication/platform/audience/domain-audience-source.ts` defines `DomainAudienceSource` registry contract for DOMAIN-AUDIENCE-01 (Probetraining, events, …). **Not implemented** in this package.

## Explicitly out of scope

Probetraining integration, newsletters, PDF/letters, Communication Studio, remote migration application, CSV import (parser seam only).

## Migration

`20260929120000_sce_zielgruppen_02_hybrid_audiences` — additive only. **Not applied** to STAGE/production by this package.
