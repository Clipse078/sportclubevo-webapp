# SCE-COMM-03 — Dynamic Audience & Recipient Resolution Engine

## Invariants

- **Effective recipients = selected target ∩ sender communication scope ∩ recipient eligibility.**
- **Zielgruppe membership does not grant authorization to communicate.**
- **Preview results are current-state resolution results and are not historical recipient records.**
- **Historical recipients of sent communication must be represented by dispatch-time recipient snapshots.**

## Entry point

`resolveCommunicationRecipients()` in `lib/communication/platform/recipient-resolution/resolve-recipients.ts` is the canonical server entry point for preview and dispatch resolution. Application code must not call `lib/org/target-group-resolver.ts` directly for Communication sends.

Modes: `PREVIEW`, `DISPATCH`.

## Pipeline stages

1. **Audience resolution** — structural selectors, saved Zielgruppen (v2 envelope + legacy clauses), boolean composition, explicit include/exclude.
2. **Sender scope** — `resolveSenderCommunicationScope()` intersects candidates with `allowedSubjectPersonIds` (fail-closed adapter over effective permissions).
3. **Safeguarding / guardian** — `guardian-policy-seam.ts` + guardian relationship expansion port.
4. **Recipient eligibility** — active tenant person, safeguarding outcome, preference seam, channel reachability.
5. **Preferences seam** — deferred to COMM-17 (`DEFERRED_DEFAULT_ALLOW` until persistence exists).
6. **Channel eligibility** — `IN_APP`, `PUSH`, `EMAIL` reachability checks (no delivery).
7. **Result + explanation** — typed reason codes, summary counts, audience fingerprint.

## Structural selectors

| Selector | Source |
|----------|--------|
| Whole organisation | Active tenant `Person` rows |
| OrgUnit | `requirement-audience-resolvers` / org unit memberships |
| Team | Active `TeamSeason` squad + trainers |
| Role / role key | Tenant roles + active memberships |
| Explicit person | Tenant-scoped active persons |
| Explicit exclusion | Set subtraction (wins over inclusion) |

Saved Zielgruppen resolve v2 `{ audience, resolverClause, structuralExclusion }` with cycle detection and depth bounds.

## Composition semantics

- **UNION (ODER)** — union of selector sets.
- **INTERSECTION (UND)** — intersection via `dynamicRule.type = intersection` or multi-component `composition: INTERSECTION`.
- **NOT** — explicit person exclusions + optional `structuralExclusion` on v2 rule documents.

## Sender scope

Implemented in `sender-communication-scope.ts`:

- `communication.zielgruppen.manage` → organisation-wide active persons (preview not scope-limited).
- Otherwise → fail-closed membership/trainer-derived scope (preview shows scope notice).

## Tenant isolation

All selector IDs are validated against the requesting tenant. Cross-tenant IDs resolve to empty sets or validation errors (`CROSS_TENANT` reason codes on explicit IDs).

## Safeguarding seam

Policy interface in `safeguarding/guardian-policy-seam.ts`. Tenant policy persistence and administration UI remain **COMM-18**. COMM-03 evaluates supplied/default policy deterministically.

## Reason codes

`OUTSIDE_SENDER_SCOPE`, `CROSS_TENANT`, `INACTIVE`, `EXPLICITLY_EXCLUDED`, `SAFEGUARDING_POLICY`, `PREFERENCE_BLOCKED`, `CHANNEL_UNAVAILABLE`, `COMPOSITION_CYCLE`, `COMPOSITION_DEPTH_EXCEEDED`.

## Fingerprint & snapshots

- `computeAudienceFingerprint()` — SHA-256 of stable-serialized audience spec.
- `buildDispatchRecipientSnapshots()` — immutable dispatch row contract for future communication persistence (COMM-04+).

## Preview (Zielgruppen management)

`previewZielgruppeRecipients()` + UI action **Empfänger anzeigen** call the canonical resolver with preview context `{ kind: ORGANISATION }` and the current actor. Shows candidate / excluded / effective counts without exposing internal permission implementation details.

## Performance model

- Batched Prisma queries per selector type.
- Per-request resolution context for saved group expansion.
- Bounded nesting depth (`MAX_SAVED_TARGET_GROUP_NESTING_DEPTH`).
- Deterministic sorted person-id outputs.

## COMM-04 readiness

Team/event/club composers should call `resolveCommunicationRecipients()` with their `CommunicationContextRef`, sender actor, channel, and category — not TargetGroup internals.
