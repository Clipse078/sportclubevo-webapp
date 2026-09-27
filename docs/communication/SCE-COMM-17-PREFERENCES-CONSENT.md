# SCE-COMM-17 — Communication Preferences & Consent

## Principle

**Zielgruppenmitgliedschaft ist keine Einwilligung.**  
(Audience membership is not consent.)

Effective deliverable recipients:

`selected target ∩ sender scope ∩ recipient eligibility ∩ communication preferences`

Preferences are separate from:

- Zielgruppe membership (never remove members because of opt-out)
- Sender authorization (preferences never grant send permission)
- Channel capability (email address, linked user, push device)

## Categories

| Category | Purpose |
|----------|---------|
| `TEAM_OPERATIONAL` | Training/match logistics, team duties |
| `CLUB_OPERATIONAL` | Club alerts / required operational traffic |
| `CLUB_INFORMATION` | Optional club news |
| `SPONSOR_COMMERCIAL` | Sponsor/partner promotional campaigns |

## Channels

`IN_APP`, `PUSH`, `EMAIL` (SMS out of scope).

Category and channel are independent dimensions.

## Defaults (product)

| Category | Default behaviour |
|----------|-------------------|
| Operational (`TEAM_*`, `CLUB_OPERATIONAL`) | Required — non-disableable in self-service UX |
| `CLUB_INFORMATION` | Allowed on all applicable channels unless explicitly disabled |
| `SPONSOR_COMMERCIAL` | E-mail requires explicit opt-in (`CONSENT_REQUIRED` without row); in-app/push follow category matrix |

## Evaluation timing

- **Audience / snapshots:** frozen at publish (COMM-03 / COMM-16).
- **Preferences:** evaluated at delivery execution (email processor, push processor, notification emit).
- Historical delivery attempts are never rewritten when preferences change.

## Identity

- Authenticated users: `UserCommunicationPreference` keyed by `tenantId + userId`.
- External sponsor contacts: `SponsorContactCommunicationPreference` (no fake User).
- Guardian delivery (COMM-03): preferences evaluate on `deliveryUserId` / guardian user at delivery boundary. Full youth policy → COMM-18.

## Unsubscribe / public tokens

Deferred: signed, tenant-scoped, rotatable preference tokens and `List-Unsubscribe` headers.  
Commercial e-mail is suppressed when consent is missing — no placeholder unsubscribe URLs.

## Related packages

- COMM-14: email attempts record `SKIPPED` + machine-readable reason (not provider failure).
- COMM-09: push respects communication category after notification-type prefs.
- COMM-15: inbound mailbox unrelated to outbound preferences.
