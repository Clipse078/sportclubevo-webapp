# SCE-COMM — Programme roadmap (post COMM-01)

Reviewed against repository baseline STAGE @ `23c1ebab`. Adjust sequencing when dependencies land.

| Pkg | Title | Depends on | Notes |
|-----|-------|------------|-------|
| **COMM-01** | Canonical Communication & Zielgruppen Architecture | STAGE | **This package** — docs + `lib/communication/platform` |
| **COMM-02** | Zielgruppen Management Foundation | COMM-01 | UI/CRUD on existing `TargetGroup`; reuse `validateRuleJson` |
| **COMM-03** | Dynamic Zielgruppen / Recipient Resolution Engine | COMM-01, COMM-02 | Implement `AudienceCandidateResolutionPort` + snapshots |
| **COMM-04** | Team Communication Foundation | COMM-03 | Default team audience seam, permissions |
| **COMM-05** | Team Chat / Threads / Reactions | COMM-04 | Align with `TeamConversationAnchor`; migrate from ad-hoc patterns |
| **COMM-06** | Announcements, Alerts & Acknowledgements | COMM-04 | Engagement states persistence |
| **COMM-07** | Polls & Date Polls | COMM-04 | Poll-specific schema (justified) |
| **COMM-08** | Requests / Helfereinsätze | COMM-04 | Optional Aufgabe bridge |
| **COMM-09** | Push Notification Infrastructure | COMM-01 | Device tokens on User; no team ownership |
| **COMM-10** | Event-context Communication & Smart Reminders | COMM-03, participation | Event presets → participation queries |
| **COMM-11** | Club Communication | COMM-03, COMM-06 | Org/org-unit sends |
| **COMM-12** | Campaign Composer | COMM-03, COMM-06 | Multi-component audiences |
| **COMM-13** | Email Delivery | COMM-03, COMM-01A email stack | Bulk email worker |
| **COMM-14** | Sponsor Campaign Integration | COMM-12, sponsor module | `sponsorCampaignContext` only in COMM-01 |
| **COMM-15** | Communication Center / Inbox | COMM-04, IN_APP channel | |
| **COMM-16** | Templates & Scheduling | COMM-12 | `CommunicationTemplate` exists — wire to platform |
| **COMM-17** | Preferences / Consent | COMM-01 categories | Extend beyond `UserNotificationPreference` |
| **COMM-18** | Guardian & Youth Safeguarding | COMM-03, guardian model | Tenant policy storage |
| **COMM-19** | Delivery History & Analytics | COMM-03 snapshots | |
| **COMM-20** | Governance / Scale / Release Hardening | COMM-19 | Queue provider, idempotency |

### Recommended splits / merges

- **COMM-01A/B/C** (already on STAGE) remain the **collaboration/email thread** track; do not rename retroactively.
- Merge **COMM-13** with existing Resend outbound path where possible instead of a second mail stack.
- **COMM-09** before club-wide push campaigns (COMM-11/12).

### Immutable contracts for COMM-02+

1. Zielgruppe ownership and authorization separation (see architecture doc).
2. `TargetGroupClause` schema for dynamic rules (extend only via versioned schema migration).
3. Recipient snapshot requirement for any “sent” communication.
4. `CommunicationContextRef` shape for sponsor/team/event origins.
5. No sponsor-owned or team-owned audience/delivery engines.
