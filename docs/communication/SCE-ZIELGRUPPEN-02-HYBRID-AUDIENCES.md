# SCE-ZIELGRUPPEN-02 — Hybrid Audiences, External Contacts & Universal Recipient Management

## Architecture diagnosis (STAGE baseline)

- **Target groups (`Zielgruppe`)** persist as `TargetGroup.ruleJson` v2 envelopes: canonical `CommunicationAudienceSpec` + derived `resolverClause` + optional `structuralExclusion`.
- **Audience spec** is the COMM-01 / EVO-03 `CommunicationAudienceSpec` (structural selectors, saved groups, explicit persons, sponsor selectors).
- **ZIELGRUPPEN-02** extends the spec with `external` explicit include/exclude lists referencing `CommunicationExternalContact`.
- **Person resolution** remains COMM-03 `resolveCommunicationRecipients` (sender scope, channel eligibility, COMM-17 preferences, COMM-18 safeguarding).
- **External resolution** runs in parallel via `resolveAudienceCandidates` → `collectCommunicationExternalSnapshotRows` at publish; externals are not Person rows and do not enter the guardian pipeline.
- **Selector** remains `CommunicationAudienceSelector` (HOTFIX-02 / EVO-03) with an added **Externe** category backed by `searchCommunicationExternalContacts`.
- **Snapshots** remain `PlatformCommunicationRecipientSnapshot` (immutable at dispatch); new kind `EXTERNAL_COMMUNICATION_CONTACT` with `communicationExternalContactId` + frozen `externalSnapshotJson`.

## Hybrid audience semantics

```
TARGET AUDIENCE = dynamic inclusions ∪ direct inclusions − exclusions
```

Precedence within the editor/spec: **exclusion > direct include > dynamic include**.

At send time for **Person** recipients:

```
ACTUAL RECIPIENTS = resolved audience ∩ sender scope ∩ eligibility ∩ safeguarding ∩ consent/channel rules
```

For **CommunicationExternalContact** recipients:

```
ACTUAL EXTERNALS = tenant-scoped active contacts from spec − explicit external excludes − email collision with resolved Person recipients
```

Membership in a Zielgruppe does **not** imply COMM-17 marketing consent, does **not** create a User/Person, and does **not** invoke COMM-18 guardian substitution.

## Dynamic vs direct recipients

| Mechanism | Person | External contact |
|-----------|--------|------------------|
| Dynamic (team/org/role/rule) | `structural`, `dynamicRule`, saved groups | Not supported (by design) |
| Direct include | `explicit.includePersonIds` | `external.includeExternalContactIds` |
| Direct exclude | `explicit.excludePersonIds` | `external.excludeExternalContactIds` |
| Structural exclusion overlay | `structuralExclusion` on rule envelope | Same envelope; persons only |

## CommunicationExternalContact

Model: `CommunicationExternalContact` (tenant-scoped, unique `(tenantId, emailNormalized)`).

- No fake `User` / `Person` / `TenantMembership` for arbitrary emails.
- Created via Zielgruppe bulk email flow or composer selector; `createdByUserId` optional audit FK (`ON DELETE SET NULL`).
- Status `ACTIVE` | `ARCHIVED`; archived rows re-activate on find-or-create with same normalized email.
- Email normalization/validation reuses ADMIN-ACCESS-UX-01 (`validateInvitationEmailSyntax` / typo suggestions).

## Identity / deduplication precedence

1. **Same normalized email — Person + external:** Person wins; external id is dropped from final external candidate list (`dedupeExternalContactsAgainstPersonEmails`).
2. **Multiple inclusion paths:** Union of ids in spec, then explicit external excludes; publish snapshots dedupe by contact id.
3. **Exclusion:** Person excludes and external excludes are applied before delivery; structural exclusion applies to persons only.
4. **Provenance (preview):** May list multiple inclusion paths; final preview counts reflect post-dedupe sets.
5. **Snapshot identity:** `externalSnapshotJson.email` + `communicationExternalContactId` frozen at publish; never recomputed from live Zielgruppe membership.

## Bulk email flow

UI: **Mehrere E-Mail-Adressen hinzufügen** in the Zielgruppe editor (`parseBulkEmailEntries` → `classifyBulkEmailEntries` → `findOrCreateCommunicationExternalContact`).

Parser accepts newline, comma, semicolon. Review states:

- Bestehende Person / Bestehender externer Kontakt / Neuer externer Kontakt / Ungültige Adresse / Möglicher Tippfehler

Invalid rows block persistence.

## Selector architecture (EVO-03 / HOTFIX-02)

- `CommunicationAudienceSelector` categories unchanged except **`external`** discover/search via `communication-audience-search-service.ts`.
- Sender scope applies to **person** search paths (`searchDirectMessageRecipients`); external search is **tenant-scoped only** (club operational contacts, not DM scope geometry).
- Capability gate: `communication-audience-capabilities.ts` exposes `externalContacts` when club send or tenant admin.

## Provenance

`buildZielgruppePreviewProvenance` / `preview-service.ts` resolves candidates and attaches human-readable inclusion/exclusion reasons for persons and external contacts (chip metadata in UI).

## Consent boundary (COMM-17)

- External contacts have **no** `USER` or `SPONSOR_CONTACT` preference identity; Zielgruppe membership does not upsert preferences.
- Email delivery eligibility for `EXTERNAL_COMMUNICATION_CONTACT` snapshots checks channel enablement + frozen delivery capability + valid email — **not** club marketing opt-in.
- Sponsor-commercial publication category is inferred only for **sponsor-only** audiences (`resolvePublicationCommunicationPreferenceCategory`); mixed sponsor + external audiences remain `CLUB_INFORMATION`.
- Sponsor externals (`EXTERNAL_SPONSOR_CONTACT`) remain on the existing sponsor consent path.

## Safeguarding boundary (COMM-18)

- External contacts are not minors, guardians, or `Person` subjects; snapshots use `subjectPersonId: null`, `viaGuardianSubstitution: false`.
- COMM-18 minor/guardian evaluation applies only to Person ids in `resolveCommunicationRecipients`.
- Arbitrary external email must not be treated as a guardian relationship (no `GuardianRelationship` rows).

## Live Zielgruppe vs immutable snapshots

Saved groups and composer specs remain **live**. Published communications store **immutable** `PlatformCommunicationRecipientSnapshot` rows — never recomputed from today's group definition.

## Migration

`20260929120000_sce_zielgruppen_02_hybrid_audiences` — additive only:

- Enum `CommunicationExternalContactStatus`
- Enum value `EXTERNAL_COMMUNICATION_CONTACT` on `PlatformCommunicationRecipientKind`
- Table `CommunicationExternalContact` + FKs to `Tenant` / `User`
- Nullable `PlatformCommunicationRecipientSnapshot.communicationExternalContactId` + FK + unique `(communicationId, communicationExternalContactId)`

Apply to STAGE via guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` after release gates (see deployment runbook).

## DomainAudienceSource seam (future)

`lib/communication/platform/audience/domain-audience-source.ts` defines `DomainAudienceSource` registry contract for DOMAIN-AUDIENCE-01 (Probetraining, events, …). **Not implemented** in this package.

## Explicitly out of scope

Probetraining integration (PROBETRAINING-COMM-01), DATA-HYGIENE-01, newsletters, PDF/letters, Communication Studio (COMM-STUDIO), CSV import (parser seam only), production mutation.

## Communication Studio compatibility

Uses the same `CommunicationAudienceSpec` and publish snapshot pipeline; external recipients appear as additional snapshot rows alongside internal Person snapshots. No Studio-specific UI in this package.
