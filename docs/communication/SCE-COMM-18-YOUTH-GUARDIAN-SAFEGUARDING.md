# SCE-COMM-18 — Youth / Guardian Communication Safeguarding

## Concepts (must remain distinct)

| Concept | Meaning |
|---------|---------|
| **Subject** | The child/minor Person the communication concerns |
| **Recipient** | Person selected via team, Zielgruppe, event, role, or explicit targeting |
| **Delivery identity** | User/account that may actually receive the message |
| **Guardian relationship** | Canonical `GuardianRelationship` (PERSON-UX-10) — not inferred from surname/email |
| **Visibility** | Who may see communication concerning the minor |
| **Response authority** | Who may respond on behalf of the subject (participation, polls, requests) |
| **Preference / consent** | COMM-17 rules on the **delivery identity** User |

**Guardian delivery does not change the communication subject.**

**Safeguarding expansion does not constitute commercial consent** (`SPONSOR_COMMERCIAL` still requires COMM-17 consent on the delivery identity).

## Resolution order

```text
Audience → authorization → safeguarding → delivery identity → COMM-17 preference → channel delivery
```

Entry point: `evaluateCommunicationSafeguarding()` in  
`lib/communication/platform/safeguarding/evaluate-communication-safeguarding.ts`.

Tenant policy: `TenantCommunicationSafeguardingPolicy` (per-tenant row, conservative defaults when absent).

## Tenant policy (product configuration — not legal advice)

- `safeguardingEnabled`
- `minorAgeThresholdYears` (default 18)
- `allowDirectMinorDelivery`
- `guardianVisibilityRequired`
- `guardianOnlyDeliveryRequired`
- `guardianResponseAuthorityEnabled`
- `deliverToAllActiveGuardians`

## Delivery outcomes

- **Adult / above threshold:** normal subject → self delivery identity.
- **Minor, guardian-only:** subject unchanged; delivery to eligible guardian User(s).
- **Minor, direct + guardian visibility:** optional self delivery + guardian copy (deduped delivery Users).
- **No eligible guardian:** fail closed — `GUARDIAN_REQUIRED_UNAVAILABLE`.

## Snapshots

`PlatformCommunicationRecipientSnapshot` stores frozen `safeguardingReasonCode`, `subjectMinorAtDispatch`, `guardianPersonId`, `viaGuardianSubstitution`. Historical rows are never rewritten when relationships or age thresholds change later.

## Integrations

- **COMM-03** recipient resolution and dispatch pipeline
- **COMM-05** chat mentions (`team-chat-safeguarding.ts`)
- **COMM-07** poll responses (`actorUserId`, canonical snapshot per subject)
- **Participation / events** guardian response authority via `assertActorCanRespondForPerson`
- **COMM-14** email eligibility skips minor Person email fallback when `viaGuardianSubstitution`

## Privacy

Audit and metadata use IDs and reason codes — not DOB, phone, or full guardian graphs in trainer-visible payloads.
