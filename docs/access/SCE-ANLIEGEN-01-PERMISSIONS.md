# SCE-ANLIEGEN-01 — Permission configuration

After deploying migration `20261120120000_sce_anliegen_01_foundation` and running
`npx tsx scripts/sync-meldung-permissions.ts` with `APPLY_PERMISSION_SYNC=true` in a
**non-production** environment, club administrators assign capabilities explicitly:

| Capability | Typical grantees |
|------------|------------------|
| `meldungen.submit` | Members who may report concerns (reporter portal `/anliegen`) |
| `meldungen.handle` | Operational coordinators with assigned responsibility |
| `meldungen.view_all` | Service desk leads / operations managers |
| `meldungen.manage` | Routing configuration (future; reserved in catalog) |

No automatic Club-Admin backfill is included in this package — STAGE role rows are unchanged.

**Visibility:** Cases are not visible by case number guessing; server routes require authenticated membership and capability checks. Internal notes are excluded from reporter APIs and timelines.

**Authorization matrix:**

| Capability | Read scope | Mutate scope |
|------------|------------|--------------|
| `meldungen.submit` | Own reporter cases only | Create own cases; reporter replies on own cases |
| `meldungen.handle` | Assigned/collaborator cases + unassigned triage queue | Same scope: claim unassigned, assign, status, internal notes on visible cases |
| `meldungen.view_all` | All cases in tenant | **No mutation by itself** — pairing with `meldungen.handle` allows full-desk mutations |
| `meldungen.manage` | (reserved) | (reserved) |

Collaborators see only cases where they are listed; `meldungen.handle` does **not** grant read access to unrelated assigned cases. Attachment download uses case ACL — a known attachment ID cannot bypass visibility.

**Email:** Outbound/inbound adapters are implemented with fixtures only; live mail requires Communication Center mailbox setup and DNS (see `lib/club-meldungen/email-adapter.ts`).