# SCE-PROBETRAINING-COMM-01 — Probetraining canonical communication audiences

## Purpose

PROBETRAINING-COMM-01 is the **first real consumer** of SCE-DOMAIN-AUDIENCE-01. Probetraining (website/club intake) exposes meaningful recipient groups through the canonical Communication stack:

```
Probetraining Registration (type PROBETRAINING)
        ↓ DomainAudienceSource (probetraining.anmeldungen)
DomainAudienceReference (saved Zielgruppe / inline spec)
        ↓ materializeDomainAudiencesInSpec()
CommunicationAudienceSpec (explicit Person + external contact components)
        ↓ COMM-03 resolveCommunicationRecipients
COMM-17 preferences · COMM-18 safeguarding
        ↓
existing club communication delivery infrastructure
```

This package does **not** introduce ProbetrainingMailer, ProbetrainingRecipientResolver, ProbetrainingCampaign, or a parallel messaging engine.

## Domain model (unchanged)

| Concern | Implementation |
|---------|----------------|
| Entity | `Registration` where `type = PROBETRAINING` |
| Tenant scope | `Registration.tenantId` |
| Applicant | `firstName`, `lastName`, `email`, `phone`, `birthDate` / `birthYear`, `payloadJson` |
| Linked Person | `Registration.personId` → `Person` (optional; workflow Goals 2/3) |
| Guardian / parent | `payloadJson.parentOrGuardian` (+ Person guardian fields when created from registration) |
| Status workflow | `RegistrationStatus` (`NEW` … `ARCHIVED`) — see `lib/registrations/status.ts` |
| Team / category | Classification via `payloadJson` / football fields (`desiredTeam`, age groups) — not duplicated here |
| Assigned staff | `assignedToUserId` (operational UI; not an audience selector in v1) |
| Consent | Website `payloadJson.consent` — domain-owned; not re-modelled for Communication |

## Domain audience provider

| Field | Value |
|-------|--------|
| `domainKey` | `probetraining` |
| `sourceKey` | `anmeldungen` |
| Registry key | `probetraining.anmeldungen` |
| Label (DE) | Probetraining-Anmeldungen |
| Permission | `registrations.view` (any-of). Communication send permission alone is **insufficient**. |

### Candidates (stable `candidateId`)

Persisted identity is `{ sourceKey, candidateId }` — not query results.

| candidateId | Label (DE) | Status filter |
|-------------|------------|---------------|
| `open-registrations` | Offene Anmeldungen | Active inbox (`NEW`, `REVIEWING`, `ASSIGNED`, `CONTACTED`) |
| `waiting-list` | Warteliste | `WAITING` |
| `archive` | Archiv | `ACCEPTED`, `REJECTED`, `ARCHIVED` |
| `status:<enum>` | Per-status label | Single `RegistrationStatus` |

Materialization re-queries **current** tenant registrations at preview/send time (no snapshot semantics).

## Recipient semantics

| Case | Materialization | COMM-18 |
|------|-----------------|---------|
| `personId` set | `explicit.includePersonIds` | Canonical Person safeguarding + guardian substitution |
| Adult, unlinked | External contact from registration email (`findOrCreateCommunicationExternalContact`) | N/A (external path) |
| Minor, unlinked | External contact **only** if guardian email exists in payload | **Never** raw child registration email |
| Minor, unlinked, no guardian email | Omitted (fail closed for that row) | Avoids bypass |

Deduplication against Persons / other externals remains owned by COMM-03 / ZIELGRUPPEN-02.

## Authorization & tenant isolation

- Discovery: `listAuthorizedDomainAudienceSources()` / `getAuthorizedDomainAudienceSource()` after lazy `ensureProbetrainingDomainAudienceRegistered()`.
- Materialization: same permission set; loss of `registrations.view` after save → `SOURCE_UNAUTHORIZED`.
- Queries always filter `tenantId` + `type: PROBETRAINING`.

## Preview & provenance

German provenance lines, e.g. `Probetraining – Offene Anmeldungen`, via `provenanceLabel()` / `domainAudienceProvenanceLabel()`.

## Saved Zielgruppen

`TargetGroup.ruleJson` v2 stores:

```json
{
  "domainAudience": {
    "sourceKey": "probetraining.anmeldungen",
    "candidateId": "open-registrations",
    "displayLabel": "Probetraining – Offene Anmeldungen"
  }
}
```

## Transactional / domain-owned messages (unchanged)

These remain **domain-owned** and are not migrated to club Zielgruppen in this package:

- Website submission intake (`public-submission.ts`) — no automatic club broadcast
- Registration-targeted COMM-01C recipient resolution (`recipient-resolver.ts` for `CommunicationTargetType.REGISTRATION`) — contextual thread/composer
- Coordinator operational workflows, audit/timeline entries

PROBETRAINING-COMM-01 enables **audience selection** for canonical club communication to Probetraining groups.

## Deferred

- COMM-EVO-03 universal selector UI for domain categories (provider contract + discovery only)
- Sponsor campaigns / generic campaigns
- Additional Probetraining sources (team/category/classification-based) until product requires them

## Code map

| Area | Path |
|------|------|
| Candidate definitions | `lib/registrations/domain-audience/probetraining-audience-candidates.ts` |
| Recipient materialization | `lib/registrations/domain-audience/probetraining-recipient-materialization.ts` |
| Provider | `lib/registrations/domain-audience/probetraining-domain-audience-source.ts` |
| Lazy registration | `lib/registrations/domain-audience/register-probetraining-domain-audience.ts` |
| Tests | `lib/registrations/domain-audience/__tests__/sce-probetraining-comm-01.test.ts` |

## Related

- `docs/communication/SCE-DOMAIN-AUDIENCE-01.md`
- `docs/communication/SCE-ZIELGRUPPEN-02-HYBRID-AUDIENCES.md`
