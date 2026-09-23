# DASHBOARD-D — Benötigt meine Aufmerksamkeit Spec

## Principle

Not a notification center. Not “everything wrong in the club.” Only **personal or clearly assigned** actionable items the user can inspect and resolve.

## Current sources (`buildAttentionItems`)

| Key | Trigger | Personal? | Actionable? |
|-----|---------|-----------|-------------|
| news-review | `newsInReviewCount > 0` | No — any news editor | Yes, if user manages news |
| registrations | `openRegistrationCount > 0` | No — tenant-wide NEW/REVIEWING | Yes with registration perm |
| scheduled-news | scheduled count | No | Editorial |
| overdue-actions | meeting overdue action count | Partial — tenant meetings scope | Yes with meetings perm |

**Verdict:** Current block is **permission-gated but not relationship-gated**. Must be rebuilt.

## What qualifies as attention

| Qualifies | Does not qualify |
|-----------|------------------|
| Assigned task overdue / due soon | Total open tasks in club |
| Participation RSVP overdue | Generic “events today” count |
| Personal requirement pending | All registrations in tenant |
| Registration assigned to user (when modeled) | News in review unless user is reviewer |
| Meeting action assigned to user | All overdue meeting actions in tenant |
| Planning conflict on user’s team/facility responsibility | Global KPI duplicates |

## Personal relevance rules (target)

Each item requires:

1. **Relationship** — assignee, participant, responsible user, team staff, org function.  
2. **Authorization** — user can open target resource.  
3. **Actionability** — at least one primary action (open, approve, complete, RSVP).

## Priority levels

| Level | Examples |
|-------|------------|
| urgent | Overdue task, overdue RSVP, registration SLA breach assigned to user |
| normal | Due within 48h, review queue item owned by user |
| low | Informational follow-ups |

## Counts

- Show count in section header **for visible items only** (after auth filter).  
- Do not show aggregate tenant counts in header KPI strip.

## Deduplication

- Same underlying entity → one attention card (e.g. task appearing in programme overdue + attention — pick attention OR programme, not both; prefer programme for schedule, attention for pure actions).

## Deep links

Must match canonical module routes (aufgaben, registrations, meetings, wochenplan, etc.).

## Permissions

Reuse domain permissions only. No `dashboard.attention.view`.

## Zero disclosure

- Building attention list must run **authorized queries** (e.g. `listMyTasks`, personal-actions adapters, assigned registrations filter).  
- Never compute count from tenant-wide prisma.count then hide UI — count leaks via side channels if API added later.

## Ready sources (implementation)

| Source | Module | Phase |
|--------|--------|-------|
| Tasks | `taskPersonalActionSource` | DASHBOARD-05 |
| Participation | `attendancePersonalActionSource` | DASHBOARD-05 |
| Requirements | `requirementPersonalActionSource` | DASHBOARD-05 |
| Meeting actions | needs assignee filter on meeting actions | DASHBOARD-05+ |
| Registrations | needs `assignedUserId` or workflow ownership query | DASHBOARD-05 |
| News review | needs reviewer assignment field | Deferred |
| Planning conflicts | wochenplan personal scope | DASHBOARD-05+ |
| Helper gaps | helfereinsätze personal assignment | Deferred |
| Facility conflicts | facilities responsibility map | Deferred |
| Incidents/disciplinary | role-gated, not personal inbox | Defer unless assignee model exists |

## Relationship to Meine Aufgaben

- **Meine Aufgaben:** canonical execution inbox (personal-actions).  
- **Attention:** higher-signal subset emphasizing urgency + non-task obligations (registrations, approvals).  
- Overlap allowed but dedupe rules apply.
