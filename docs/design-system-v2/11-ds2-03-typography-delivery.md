# SCE-DS2-03 — Sporting typography & team names

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-03` |
| **Audit roadmap label** | Originally DS2-02 in `07-migration-roadmap.md` — renumbered after navigation package took DS2-02 |
| **Scope** | Display typography roles, `SceTeamName`, activity-card team lines, workspace page titles, secondary nav labels |
| **Dependencies** | `SCE-DS2-01`, `SCE-DS2-02` (primary nav unchanged) |
| **Exclusions** | Activity card white surfaces (DS2-04), infoboard/CMS/email, stored string mutation |

## Typography roles

| Role | Implementation |
| --- | --- |
| Page title | `.sce-type-page-title` + `PageHeader` |
| Section title | `.sce-type-section-title` (+ `--display` italic variant) |
| Primary header nav | DS2-02 — unchanged |
| Secondary nav | `.sce-ds2-secondary-nav-label`, `.sce-nav-child`, context tabs |
| Team names | `SceTeamName` + `.sce-team-name--*` density modifiers |
| Body / data | `.sce-type-body*` (Inter, no global uppercase) |

## Team name surfaces (initial rollout)

- `SceMatchCard`, `SceMatchStackedFixtureIdentity`, `SceTrainingCard`, `SceTournamentCard`
- List-row org context (`SceActivityListRowOrganizationalContext`)
- `ClubIdentityDisplay`, `TeamSeasonSearchablePicker`, `TeamsOverviewGrid`
- Canonical density scales in `match-card-rich-density.ts` / `activity-card-list-row-scale.ts`

## Fonts

- `app/layout.tsx` — Barlow Condensed weights 400–800, normal + italic
- Body remains Inter via `--font-inter`

## Automated coverage

- `lib/design-system/__tests__/sce-ds2-03-typography.test.ts`
- `components/design-system/typography/__tests__/SceTeamName.test.tsx`
- Existing DS2-02 navigation + sporting-activity card suites (regression)

## Theme

- Roles respect `:root` and `[data-sce-theme="white"]` semantic text tokens — no new colour literals.
