# SCE-DOMAIN-AUDIENCE-01 — Canonical Domain Audience Registry

## Purpose

DOMAIN-AUDIENCE-01 extends **SCE-ZIELGRUPPEN-02** with a registry/adapter layer so SCE product domains can expose **domain-owned audiences** through the existing hybrid audience architecture (`CommunicationAudienceSpec`, COMM-03 recipient resolution, COMM-17/COMM-18).

This package does **not** implement Probetraining, events, tasks, or other domain audiences. It establishes infrastructure only.

```
DOMAIN / FEATURE MODULE
        ↓ registerDomainAudienceSource()
Domain Audience Registry (in-process)
        ↓ materializeDomainAudiencesInSpec()
CommunicationAudienceSpec (canonical components)
        ↓ COMM-03 resolveCommunicationRecipients
preferences / safeguarding / eligibility
        ↓
resolved recipients
```

Domain providers **describe/select** audiences. They must **not** send communication independently or implement parallel recipient engines (`ProbetrainingRecipientResolver`, etc.).

## Registry contract

| Artifact | Location |
|----------|----------|
| Provider types | `lib/communication/platform/audience/domain-audience-source.ts` |
| Singleton registry | `lib/communication/platform/audience/domain-audience-registry.ts` |
| Auth-aware discovery | `lib/communication/platform/audience/domain-audience-discovery.ts` |
| Spec materialization | `lib/communication/platform/audience/domain-audience-expansion.ts` |
| Persisted reference | `DomainAudienceReference` on `ZielgruppeAudienceComponent` |

### Stable identifiers

- **domainKey** — lowercase slug (`probetraining`, `events`, …)
- **sourceKey** — lowercase slug within domain (`open-registrations`, …)
- **key** — composite `{domainKey}.{sourceKey}` (machine id; not user-facing)
- **candidateId** — domain-scoped instance id returned from `searchCandidates`

German **label** / **description** fields are for UI and provenance only.

### Registration

Domain packages call `registerDomainAudienceSource()` at module startup (same pattern as provider-mapping adapters). Duplicate keys throw. Tests use `_clearDomainAudienceRegistryForTests()`.

Production STAGE ships with **zero** registered domain sources until domain packages land.

## Authorization & tenant isolation

- Discovery: `listAuthorizedDomainAudienceSources()` / `getAuthorizedDomainAudienceSource()`
- Each source declares `requiredPermissions` (any-of). **Communication send permission alone does not grant domain visibility.**
- Optional `canDiscover()` override for feature flags / domain state.
- Materialization requires tenant id + sender user id + effective permission set.
- Cross-tenant data access remains the domain module's responsibility inside `searchCandidates` / `resolveAudienceComponent`.

## Canonical adaptation

Persisted saved Zielgruppen store:

```json
{
  "domainAudience": {
    "sourceKey": "probetraining.open-registrations",
    "candidateId": "<domain-scoped-id>",
    "displayLabel": "Probetraining – Offene Anmeldungen"
  }
}
```

At preview/send, `materializeDomainAudiencesInSpec()` expands references into canonical components (structural / explicit / external / …) via:

- `resolveAudienceComponent()` when dynamic domain state is required, else
- `toAudienceComponent()` for static mappings.

Nested `domainAudience` references in expanded output are rejected (fail closed).

## Preview & provenance

- COMM-03 preview paths pass `senderUserId` so domain refs materialize before candidate resolution.
- `buildZielgruppePreviewProvenance()` adds `DOMAIN_AUDIENCE` inclusion paths using `provenanceLabel()` (German, human-readable).
- Unauthorized callers must not receive restricted domain metadata via discovery APIs.

## Failure behavior

| Condition | Behavior |
|-----------|----------|
| Source not registered | `DomainAudienceError` (`SOURCE_NOT_REGISTERED`) |
| Caller lacks permissions | Hidden in discovery; materialization → `SOURCE_UNAUTHORIZED` |
| Provider throws | `CANDIDATE_RESOLUTION_FAILED` |
| Invalid persisted reference | Validation error on save / `INVALID_REFERENCE` at materialization |

Audiences are **never silently broadened** when a domain source is missing or unauthorized.

## Universal selector / composer (COMM-EVO-03)

**Deferred in DOMAIN-AUDIENCE-01.** The registry and discovery APIs are ready for a future EVO-03 category; no composer UI changes in this package.

## PROBETRAINING-COMM-01 integration seam (not implemented)

Expected first consumer workflow:

1. Probetraining module registers sources, e.g. `probetraining.open-registrations`, with Probetraining-specific permissions.
2. Composer or Zielgruppe editor searches via `searchCandidates()` (future UI) and persists `DomainAudienceReference`.
3. Communication publish/preview materializes to explicit/structural components; COMM-03 resolves persons; COMM-17/18 apply unchanged.
4. **No** new recipient engine in Probetraining.

## Explicitly deferred

- Probetraining / Spielbetrieb / events / tasks / membership audience definitions
- PROBETRAINING-COMM-01 communication flows
- COMM-EVO-03 universal selector UI for domain categories
- Production migration (registry is code/configuration based; `DomainAudienceReference` lives in existing `TargetGroup.ruleJson` JSON)

## Related documents

- `docs/communication/SCE-ZIELGRUPPEN-02-HYBRID-AUDIENCES.md`
- `docs/communication/SCE-COMM-EVO-03-UNIVERSAL-AUDIENCE-COMPOSER.md`
