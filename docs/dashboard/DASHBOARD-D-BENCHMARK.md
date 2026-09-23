# DASHBOARD-D — World-Class Benchmark

Interaction and information-architecture benchmark (not visual cloning). Reference products observed from public UX patterns and SCE codebase alignment.

| PATTERN | REFERENCE PRODUCT | WHY IT WORKS | ADOPT / ADAPT / REJECT | SCE IMPLEMENTATION PRINCIPLE |
|---------|-------------------|--------------|------------------------|------------------------------|
| Compact command header | Linear | Greeting + context in one row; work starts immediately | **ADOPT** | Replace `DashboardHeroSection` decorative hero with ~1-row `DashboardCommandHeader`-style strip: greeting, date, tenant, season |
| Personal “My work” inbox | Linear / Microsoft To Do | User sees only assigned/actionable items with clear why | **ADOPT** | Meine Aufgaben + attention feed sourced from `personal-actions`, not tenant aggregates |
| Side-by-side schedule + calendar | Microsoft 365 / Outlook | Chronological list + month picker share one dataset | **ADAPT** | Mein Programm + Mein Kalender both consume `PersonalCalendarItem[]`; calendar is filter/control, not second query |
| Activity dots on month grid | Google Calendar / Matchcenter | Scan month density without reading every title | **ADAPT** | Reuse Matchcenter month grid mechanics; dots encode source type (training/match/meeting/task) |
| Command palette / pinned shortcuts | Linear / Stripe Dashboard | Frequent destinations without sidebar hunting | **ADAPT** | Schnellzugriff: derive defaults from `getVisibleNavSections` + creation actions from permission catalog |
| Permission-aware nav | Stripe Dashboard | Links never appear without entitlement | **ADOPT** | Never duplicate sidebar ACL; filter shortcuts through same permission keys as destinations |
| Contextual “why” labels | Microsoft Teams | “Organizer”, “Assigned to you” reduces confusion | **ADOPT** | `contextLabel` on every programme/attention row from relationship resolver (team + function, assignee, participant) |
| Progressive disclosure | Dropbox / Linear | Primary work visible; history secondary | **ADOPT** | News + activity demoted below fold; collapsible on narrow |
| Dense but legible typography | Stripe Dashboard | 13–14px body, generous tap targets, tight vertical rhythm | **ADAPT** | Increase interactive targets; reduce empty padding in `DashboardSection` cards; keep SCE dark + orange |
| Empty states with next step | Linear | No fake filler content | **ADOPT** | Empty programme → link to Kalender / team assignment docs; never inject club-wide events |
| Responsive column collapse | Microsoft 365 | Tablet stacks; mobile single column | **ADOPT** | Use existing Tailwind `lg:` / `xl:` breakpoints from `DashboardOperationalGrid` |
| Zero-leak aggregation | Enterprise SaaS baseline | Aggregator must not reveal hidden resources | **ADOPT** | Authorize before DTO assembly; fail closed per item |
| KPI strip at top | Legacy admin dashboards | Counts duplicate detailed sections | **REJECT** | Remove prime KPI strip; counts live inside attention/tasks/programme |
| Club-wide “today” feed | Generic intranet | Wrong mental model for personal workspace | **REJECT** | Replace with Mein Programm; optional secondary “Verein heute” for admins only if justified |
| Role-based widget swapping | Old SCE hypothesis | Breaks multi-role users | **REJECT** | Generic relevance graph: user → person → relationships → entities |

## Benchmark gate conclusion

SCE should **adopt** personal inbox + compact header + shared programme/calendar dataset patterns, **adapt** Matchcenter calendar grid and nav registry, and **reject** KPI-first club dashboard composition.
