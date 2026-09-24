# DASHBOARD-D — Relevance Matrix

Formal proposed relevance contract per dashboard source. **Validate in DASHBOARD-01** against live auth services.

| SOURCE | RELATIONSHIP | RELEVANCE RULE | AUTH GATE | TIME WINDOW | CONTEXT LABEL | PRIORITY | DEEPLINK | AVAILABLE ACTION | ZERO DISCLOSURE | PHASE |
|--------|--------------|----------------|-----------|-------------|---------------|----------|----------|------------------|-----------------|-------|
| Training session | Trainer/player team membership | User's linked person active on `teamSeason` for event's team | Canonical event read for user (TBD: visibility service) | Upcoming + today; dashboard 14d default | `{Team} · Trainer/Spieler` | High | `/dashboard/planner/edit/{id}` | Open training | Drop row if auth fails | DASHBOARD-02 |
| Match | Team membership / staff | Same team scope as training | Match/event view permission + resource visibility | Upcoming 30d | `{Team} · Rolle` | High | planner edit or matchcenter | — | No opponent if unauthorized | DASHBOARD-02 |
| Tournament | Team / participant org | Team-linked or explicit participant | Tournament view | Upcoming 30d | Team or role | Medium | planner / tournamentcenter | — | Same | DASHBOARD-02 |
| Veranstaltung (OTHER) | Team, org audience, invitee (future) | Person org/team/target group intersection | Event visibility | Upcoming | Org or team | Medium | planner edit | RSVP if applicable | Strict visibility | DASHBOARD-02 |
| Meeting | `MeetingParticipant.userId` | User is invited participant | `MEETINGS_VIEW` + participant check | Upcoming 30d | `Meeting · Teilnehmer` | High | `/vereinsleitung/meetings/{slug}` | Join/details | No title if not participant | DASHBOARD-02 |
| Task | `TaskAssignee.userId` | Assigned to user | `TASKS_VIEW` + assignee scope | Open + due window | `Dir zugewiesen` | High | task workspace | Complete task | No title if not assignee | DASHBOARD-05 |
| Participation RSVP | Guardian/self person | Authorized person ids | participation auth | Until due | Team + event | High | aufgaben inline | RSVP | Child names only when guardian authorized | DASHBOARD-05 |
| Requirement | Requirement recipient person | Personal requirement obligation | requirement module | Open | Subject person | Medium | aufgaben | Submit | Same | DASHBOARD-05 |
| Registration review | Assignee/responsible user (future) | Registrations assigned to user OR in user's org scope | `REGISTRATIONS_*` | Open statuses | `Anmeldungen · Zuständig` | Urgent | `/dashboard/registrations` | Review | No PII if unauthorized | DASHBOARD-05 |
| News review | Editorial responsibility (future) | Articles in review where user is reviewer/author | `NEWS_MANAGE` | — | `Redaktion` | Normal | news admin | Approve | — | DASHBOARD-05 |
| Planning conflict | User's teams/facilities | Conflicts touching user's responsibility | planning permissions | Current week | Facility/team | Urgent | wochenplan | Resolve | — | DASHBOARD-05+ |
| Helper assignment | Personal assignment (model TBD) | Assigned helper slots | helper module | Upcoming | Team/event | Medium | helfereinsätze | Confirm | — | Deferred |
| Document | Pinned/recent (future) | Explicit user/team pin only | workspace ACL | — | — | Low | workspace | Open | Workspace zero-disclosure | Deferred |
| News feed | Tenant published | Optional secondary | public published | Recent | — | Low | news | Read | Published only | DASHBOARD-06 |
| Activity feed | Tenant audit mix | Secondary | permission filtered | 7d | — | Low | logs | — | Strip unauthorized entries | DASHBOARD-06 |

## Zero-disclosure requirements (all sources)

1. **Tenant boundary:** every query includes `tenantId` from active tenant; reject cross-tenant IDs in resolver input.
2. **Pre-DTO authorization:** domain service returns nothing → item omitted (not redacted placeholder).
3. **Team events:** must not use raw `teamId IN (...)` without confirming user may view each event (gap in current `calendar-entries.ts`).
4. **Meetings:** only participant-linked rows (current pattern is correct).
5. **Tasks:** assignee-scoped queries only (current pattern is correct).
6. **Children:** guardian scope via `getAuthorizedPersonIdsForUser` only; never list other minors.
7. **Counts:** attention counts must not include items user cannot open.

## “Why am I seeing this?” feasibility

| Label type | Reliable today? | Notes |
|------------|-----------------|-------|
| Dir zugewiesen | Yes | Task assignee |
| Meeting · Teilnehmer | Yes | Participant link |
| Team · Trainer/Spieler | Partial | From squad/trainer tables; not PersonAssignment |
| Org · Function | **No on dashboard** | Data exists on PersonAssignment; needs resolver |
| Für {Kind} | Yes | Participation presentation |

Proposed canonical field: `contextLabel: string` + optional `contextKind: enum` for i18n (never show raw keys).
