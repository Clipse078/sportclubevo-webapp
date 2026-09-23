# DASHBOARD-D — Contract Map

Maps canonical domain contracts to dashboard relevance. **No new services implemented in DASHBOARD-D.**

## Identity & tenancy

| Area | MODEL | SERVICE / API | AUTHORIZATION | PUBLIC DTO | DASHBOARD RELEVANCE | GAPS |
|------|-------|---------------|---------------|------------|---------------------|------|
| User | `User` | `auth()`, session | Session + active tenant | Session user | Greeting name, hero prefs | — |
| Person link | `Person.userId` | `getPersonFirstNameByUserId`, `prisma.person` | Tenant-scoped FK | Person display fields | Root of personal sporting/org context | Users without linked Person limited |
| Tenant membership | `TenantMembership` | `getActorContext` | Active membership gate | — | Tenant boundary for all dashboard data | No dashboard prefs on membership |
| Effective permissions | `UserRole` + resolver | `getRequestEffectivePermissions`, `getActorContext` | RPERM keys | `permissionKeys[]` | Quick access, module visibility | Not a relevance substitute |

## Team & org relationships

| Area | MODEL | SERVICE | AUTHORIZATION | DASHBOARD RELEVANCE | GAPS |
|------|-------|---------|---------------|---------------------|------|
| Player | `PlayerSquadMember` | `resolvePersonalTeamIds` | Implicit via team tenant | Team events in programme | No per-event visibility check |
| Trainer | `TrainerTeamMember` | `resolvePersonalTeamIds` | Same | Context label “{Team} · Trainer” | Staff/coach variants not distinguished in resolver |
| Org unit | `OrgUnitMembership` | `loadOrgUnitIds` in actor | RPERM org scope | Future: org-scoped events/requirements | Not used in personal agenda today |
| Function | `PersonAssignment` | `getPersonAssignments` | Org label only | Context labels (“Vorstand · Vizepräsident”) | **Not wired** into `personal-agenda` |
| Guardian / child | `guardianRelationship` | `getAuthorizedPersonIdsForUser` | Participation auth | Child participation actions/deadlines | Dashboard must not broaden child data beyond participation contracts |

## Programme sources

| Area | MODEL | SERVICE | API / ROUTE | DATE FIELDS | RELATIONSHIPS | AUTH | DTO | GAPS |
|------|-------|---------|-------------|-------------|---------------|------|-----|------|
| Training | `Event` type TRAINING | Planner / events | `/dashboard/planner/edit/[id]` | `startAt`, `endAt` | `teamId` | `EVENTS_VIEW` + visibility? | `PersonalCalendarItem` | Team membership only; no training-specific auth on projection |
| Match | `Event` MATCH | Matchcenter | same | same | `teamId` | Match permissions in module | same | Same visibility gap |
| Tournament | `Event` TOURNAMENT | Tournamentcenter | same | same | team / participants | Module auth | same | Same |
| Veranstaltung | `Event` OTHER | Veranstaltungen | same | same | team optional | Module auth | same | Org/audience events not in personal scope |
| Meeting | `Meeting`, `MeetingParticipant` | Vereinsleitung | `/vereinsleitung/meetings/[slug]` | `meetingDate` | `participants.userId` | `MEETINGS_VIEW` | `PersonalCalendarItem` | Participant-only; correct pattern |
| Task deadline | `Task`, assignees | `loadTaskDeadlineProjections` | `taskWorkspaceHref` | `dueAt` | assignee `userId` | `TASKS_VIEW`, assignee scope | agenda item | OK |
| Participation deadline | attendance obligations | `loadParticipationDeadlineProjections` | `/dashboard/aufgaben` | `participationResponseDueAt` | person + team | participation auth | agenda item | OK |
| Requirement | personal-actions | `requirementPersonalActionSource` | aufgaben deep links | due dates | recipient person | requirement module | `PersonalAction` | Attention/programme, not calendar entries yet |

## Attention & operations (current)

| Source | SERVICE | PERSONAL TODAY? | GAP |
|--------|---------|-----------------|-----|
| News in review | `buildAttentionItems` | No — permission-based | Needs editor assignment or queue ownership |
| Open registrations | count `Registration` NEW/REVIEWING | No — tenant-wide | Use `assignedUser` / workflow when personal |
| Scheduled news | count | No | Editorial role context |
| Overdue meeting actions | `getOperativeStrategicCounts` | Partial — all overdue in tenant if meetings.view | Needs assignee/responsible person |

## Tasks

| Area | SERVICE | NOTES |
|------|---------|-------|
| Canonical inbox | `lib/personal-actions` | Tasks + attendance + requirements |
| Dashboard widget | `loadDashboardPersonalTasks` | Uses `personalInbox` capability |
| Zero tasks on dashboard | User lacks `personalInbox` or no assignee tasks | Participation/requirements may still exist in aufgaben but not shown if capability false |

## Navigation & quick actions

| Registry | LOCATION | PERMISSION-AWARE |
|----------|----------|------------------|
| Sidebar | `lib/nav/nav-config.ts` `NAV_SECTIONS` | Yes via `getVisibleNavSections` |
| Dashboard quick actions | `lib/dashboard/quick-actions.ts` `QUICK_ACTION_CATALOG` | Yes, separate duplicate catalog |
| Creation routes | Nav + event create routes | Partial overlap |

## Preferences

| Feature | STORAGE | SCOPE |
|---------|---------|-------|
| Hero background | `User.dashboardHeroImage*` | User-global (not per-tenant) |
| Notification prefs | `UserNotificationPreference` | Per user per tenant |
| Quick access pins | **None** | Gap — recommend per user per tenant |

## Current dashboard component inventory

| COMPONENT | FILE | DATA SOURCE | SERVICE/API | AUTH | PURPOSE | PERSONALIZED? | RECOMMENDATION |
|-----------|------|-------------|-------------|------|---------|---------------|----------------|
| Club dashboard page | `app/(admin)/dashboard/page.tsx` | — | workspace routing | session | Entry | — | KEEP |
| ClubDashboardView | `components/admin/dashboard/ClubDashboardView.tsx` | `getCommandCenterData` | command-center | actor permissions | Composition | Mixed | REBUILD layout |
| DashboardHeroSection | `components/ui/dashboard/DashboardHeroSection.tsx` | hero on User | dashboard-hero-image | user | Large welcome | Name only | REPLACE compact header |
| DashboardMetricStrip | `components/ui/dashboard/DashboardMetricStrip.tsx` | kpiStrip | personal-cockpit | — | KPI counts | Partial labels | REMOVE prime strip |
| MeineAgendaWidget | `components/ui/dashboard/MeineAgendaWidget.tsx` | personalAgendaItems | loadPersonalAgenda | tasks.view, person | Personal schedule | Yes | EVOLVE → Mein Programm |
| MeineAufgabenWidget | `components/ui/dashboard/MeineAufgabenWidget.tsx` | personalTaskPreview | personal-actions | personalInbox | Task preview | Yes | KEEP integrate |
| HeuteImVereinWidget | `components/ui/dashboard/HeuteImVereinWidget.tsx` | todayItems | prisma.event tenant day | events permission implied | Club today | No | REMOVE / demote |
| DashboardAttentionList | `components/ui/dashboard/DashboardAttentionList.tsx` | attentionItems | buildAttentionItems | permission gates | Global attention | No | REBUILD personal |
| DashboardQuickActionStrip | `components/ui/dashboard/DashboardQuickActionStrip.tsx` | quick-actions catalog | getDashboardQuickActionDefs | permissions | Create only subset | No | REPLACE Schnellzugriff |
| DashboardNewsSection | `components/ui/dashboard/DashboardNewsGrid.tsx` | newsItems | prisma.news | published | News promo | No | DEMOTE secondary |
| DashboardActivityFeed | `components/ui/dashboard/DashboardActivityFeed.tsx` | activitySources | mixed tenant feeds | partial | Activity | No | DEMOTE secondary |
| DashboardOperationalGrid | `components/ui/dashboard/DashboardOperationalGrid.tsx` | — | layout | — | Layout | — | REUSE structure |
| PersonalKalenderWorkspace | `components/admin/kalender/*` | loadPersonalAgenda calendar mode | personal-agenda | same | Full page calendar | Yes | REUSE embed |
| SpieleManagementMonthCalendar | `components/admin/matchcenter/SpieleManagementMonthCalendar.tsx` | match days | matchcenter | — | Match month UI | No | EXTRACT shared primitive |
| Legacy hero/KPI | `DashboardHero`, `DashboardKpiGrid`, etc. | — | — | — | Older compositions | — | REMOVE unused from club view |

## Proposed public dashboard DTO (design only)

Server aggregate (single endpoint or RSC loader) — **authorize before mapping**.

```ts
// Conceptual — names may change in DASHBOARD-01

type DashboardContextDto = {
  greeting: { salutation: string; firstName: string; dateLabel: string; tenantName: string; seasonLabel?: string };
  viewer: { userId: string; linkedPersonId: string | null; teamIds: string[]; orgUnitIds: string[] };
};

type DashboardProgrammeItemDto = {
  id: string;
  sourceType: "TRAINING" | "MATCH" | "TOURNAMENT" | "EVENT" | "MEETING" | "TASK" | "PARTICIPATION";
  startsAt: string; // ISO
  endsAt?: string;
  title: string;
  contextLabel: string; // e.g. "F2 · Trainer", "Dir zugewiesen"
  status?: string;
  href: string;
  actions?: { key: string; label: string; href: string }[];
};

type DashboardCalendarDayDto = {
  date: string; // yyyy-MM-dd tenant TZ
  hasActivity: boolean;
  sourceTypes: DashboardProgrammeItemDto["sourceType"][];
};

type DashboardAttentionItemDto = {
  id: string;
  title: string;
  reason: string; // human why
  contextLabel: string;
  priority: "urgent" | "normal" | "low";
  href: string;
  actionable: boolean;
};

type DashboardQuickAccessItemDto = {
  key: string;
  kind: "navigate" | "create";
  label: string;
  href: string;
  iconKey: string;
};

type DashboardTaskItemDto = {
  id: string;
  title: string;
  metaLine?: string;
  contextLabel: string;
  href: string;
  emphasis: "calm" | "attention" | "urgent";
};
```

**Excluded from DTO:** permission keys, functionKey raw values, internal IDs except stable public ids/slugs, ACL structures.

## Context label presentation model

| Relationship source | Resolver input | Display template |
|--------------------|----------------|------------------|
| TrainerTeamMember | team.shortName + role | `{Team} · Trainer` |
| PlayerSquadMember | team | `{Team} · Spieler` |
| PersonAssignment | orgUnit.name + PERSON_FUNCTION_LABELS | `{OrgUnit} · {FunctionLabel}` |
| Task assignee | — | `Dir zugewiesen` |
| Meeting participant | — | `Meeting · Teilnehmer` |
| Participation (guardian) | subject person | `Für {ChildName} · {Team}` |

Use `lib/people/functions.ts` `PERSON_FUNCTION_LABELS` — never expose `functionKey` string to UI.
