# DASHBOARD-D — UX Blueprint

Target hierarchy (validated against domain contracts):

1. Compact personal welcome  
2. Schnellzugriff  
3. Mein Programm  
4. Mein Kalender  
5. Benötigt meine Aufmerksamkeit  
6. Meine Aufgaben  
7. Secondary personal information (news, activity)

## Information hierarchy (desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Guten Abend, Michael · Dein Überblick · Mi, 23. Sep · FC X · Saison 26/27 │
├─────────────────────────────────────────────────────────────────────────────┤
│ SCHNELLZUGRIFF                                    [Anpassen]                │
│ [Wochenplan] [Aufgaben] [Spiele] [Mein Team] [+ Training] [+]               │
├──────────────────────────────────┬──────────────────────────────────────────┤
│ MEIN PROGRAMM                    │ MEIN KALENDER                            │
│ Heute                            │   ◀ September 2026 ▶                     │
│  15:45 Training · F2 · Trainer   │   Mo Tu We ... (dots)                    │
│ Sonntag                          │   Selected: 27 Sep — list slice          │
│  09:30 F2 – Gegner               │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│ BENÖTIGT MEINE AUFMERKSAMKEIT (actionable cards only)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ MEINE AUFGABEN (preview → link to /dashboard/aufgaben)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▼ Sekundär: News | Letzte Aktivitäten (collapsible)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Wireframes by breakpoint

Uses existing SCE Tailwind breakpoints (`sm` 640, `lg` 1024, `xl` 1280) as in `DashboardOperationalGrid`.

### Large desktop (≥1280px)

- Programme + calendar **side-by-side** (~58/42 split).  
- Schnellzugriff single row, horizontal scroll if >8 items.  
- Attention full width below programme block.

### Laptop (1024–1279px)

- Same two-column programme/calendar with slightly narrower calendar.  
- Schnellzugriff may wrap to two rows.

### Medium / tablet (640–1023px)

- Programme stack: **Programme full width**, calendar below OR collapsible accordion “Kalender anzeigen”.  
- Attention before tasks (touch-friendly cards).

### Narrow / mobile web (<640px)

- Single column.  
- Compact header (no hero image by default on narrow — optional subtle tenant logo).  
- Schnellzugriff: horizontally scrollable chips.  
- Calendar: collapsed by default; expanding loads same data (no second fetch).  
- Touch targets ≥44px for quick access and attention actions.

## Section behaviors

### Welcome

- One row: salutation + first name, subtitle “Dein Überblick”, date, tenant, active season.  
- Tenant switcher if user has multiple memberships (existing shell pattern).  
- **Remove** full-bleed hero image from default layout (keep optional personalization in settings, not prime viewport).

### Schnellzugriff

- Mix navigation + create (`kind` discriminator).  
- “Anpassen” opens reorder/pin UI (DASHBOARD-04).  
- Max ~8 visible; overflow in customize panel.

### Mein Programm

- Groups: Überfällig (if any) → Heute → Demnächst (next 7–14 days).  
- Each row: time, title, **contextLabel**, type icon.  
- Click → deep link.  
- Empty: “Keine Termine in den nächsten Tagen” + links to Kalender / Person verknüpfen.

### Mein Kalender

- Month navigation (reuse Matchcenter grid pattern).  
- Dots per day by `sourceType` color (restrained).  
- Selected day filters programme list (client-side filter on shared dataset).  
- **Not** a Wochenplan clone — no hourly grid.

### Attention

- Only items user can act on.  
- Show **reason** line (subtitle) + contextLabel.  
- No generic registration count without personal scope.

### Tasks

- Reuse `MeineAufgabenWidget` preview; link to canonical aufgaben.  
- Show participation/requirement rows when in personal-actions inbox.

### Secondary

- News + activity in collapsible section at bottom.  
- Default collapsed when programme/attention/tasks non-empty.

## Interaction hierarchy

1. Primary actions: attention items, overdue programme entries.  
2. Secondary: programme navigation, calendar day pick.  
3. Tertiary: news/activity, customize shortcuts.

## Accessibility

- Calendar: `aria-label` on month nav (already in PersonalKalenderMonthView).  
- Programme list: `ariaLabel` per item (existing on `PersonalCalendarItem`).  
- Do not rely on color alone for source types — icon + text label.  
- Focus order: header → shortcuts → programme → calendar → attention → tasks.  
- Respect `prefers-reduced-motion` for hero/animations (existing motion components).

## Empty states matrix

| Persona | Programme | Tasks | Attention | Messaging |
|---------|-----------|-------|-----------|-----------|
| New user, no Person link | Empty | Hidden if no inbox | Permission-based only | Link person account |
| Trainer, teams | Team events | Maybe | Team-scoped when built | — |
| Admin, no teams | Meetings only | Many | Registration if scoped | — |
| Player + guardian | Team + participation | RSVP items | Participation due | — |
| Org-only functionary | Org events (future) | Tasks | Org approvals (future) | — |

Never backfill with club-wide “Heute im Verein”.

## Current vs target mapping

| Current | Target |
|---------|--------|
| DashboardHeroSection + KPI strip | Compact header; remove KPI strip |
| MeineAgendaWidget (today/tomorrow) | Mein Programm (extended window) |
| HeuteImVereinWidget | Removed from primary; absorbed into personal relevance only |
| Global attention | Benötigt **meine** Aufmerksamkeit |
| Schnellaktionen (create only) | Schnellzugriff nav + create |
| `/dashboard/kalender` page | Embed calendar widget + keep full page |
