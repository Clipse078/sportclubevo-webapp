# DASHBOARD-08 — ClubDevelopmentOverview visual alignment

**Branch:** `cursor/dashboard-ux-overhaul` (depends on PR #985 / Vorhaben inline create until merged to STAGE).

## Capability mapping (old → new)

| Capability | Previous surface | New layout |
|------------|------------------|------------|
| Compact greeting + date/tenant | `PersonalDashboardCockpitGreeting` | Unchanged; added welcome subtitle (`PersonalDashboard.welcome.subtitle`) |
| Benötigt meine Aufmerksamkeit | `DashboardCockpitCard` in 2×2 grid | Full-width `SceWorkspaceSectionShell` (first primary section) |
| Heute & als Nächstes (Mein Programm) | Cockpit card col-span-2 | `SceWorkspaceSectionShell` + link to `/dashboard/kalender` |
| Meine Aufgaben (preview) | Adjacent cockpit card | Paired `SceWorkspaceSectionShell` (`xl:grid-cols-2`) |
| Schnellzugriff | Horizontal chip strip | **Meine Bereiche** — permission-aware record shortcuts in SCE grid |
| Erstellen strip | Inline with Schnellzugriff | Preserved below area shortcuts (`SceActivityCreateMenu`) |
| News & Aktivitäten (secondary) | Collapsible border card | Collapsible shell using `SCE_WORKSPACE_SECTION_SHELL_CLASS` |
| Personal data loaders | `getPersonalCommandCenterData` | **Unchanged** — no new services |
| `monat` query on `/dashboard` | Passed to programme loader | **Unchanged** |
| Hero photograph | Removed earlier (DS2-05B) | Still absent |

## Deferred / unchanged

- Embedded month calendar on `/dashboard` (still links out to Mein Kalender).
- Dashboard customize / hero controls (still off greeting).
- Infoboard and all non-`/dashboard` surfaces.
- Tenant-wide KPI strips and module tile walls (not introduced).

## Shared primitives generalized

- `components/sce/workspace/SceWorkspaceSectionShell.tsx` — re-export of `SceClubDevelopmentSectionShell`.
- `lib/sce/sce-workspace-surface-styles.ts` — aliases for CD surface tokens (`SCE_WORKSPACE_*`).

Existing Vereinsentwicklung consumers keep importing club-development paths; behaviour unchanged.