# Activity Card System (DS 2.0)

## 1. Benchmark alignment

| Reference pattern | SCE mapping |
| --- | --- |
| SC Cham fixture line: date/time · venue · competition | Match card schedule + location + competition row |
| FC Allschwil uppercase team pairing + kickoff time | Match fixture identity + `SceTeamName` |
| Event calendar tiles | `SceClubEventCard` title + date chip |
| News card (image + date + headline) | Out of activity system — CMS module |

## 2. Current state summary

**Canonical family (keep and evolve):**

| Component | Path |
| --- | --- |
| Shell | `components/sporting-activity/SceProgrammeActivityCardShell.tsx` |
| Match | `components/sporting-activity/SceMatchCard.tsx` |
| Training | `components/sporting-activity/SceTrainingCard.tsx` |
| Tournament | `components/sporting-activity/SceTournamentCard.tsx` |
| Club event | `components/sporting-activity/SceClubEventCard.tsx` |
| Status subcomponents | `SceMatchCardStatus.tsx`, `SceTrainingCardStatus.tsx`, etc. |
| List row meta | `SceActivityListRowOperationalMeta.tsx` |

**Read-model:** `lib/sporting-activity-presentation/canonical/*` — policies, formatters, semantic token classes (`activity-card-semantic-tokens.ts`).

**Surfaces enum:** `standalone` | `detail-embed` | `list-row` on `SceMatchCard`.

**Densities:** `HERO` | `STANDARD` | `COMPACT` | `MICRO` (`match-card-rich-density.ts`).

## 3. Proposed shared architecture

```text
SceActivityCardSystem
├── SceActivityCardShell (layout, padding, border, responsive width)
├── Shared primitives
│   ├── SceActivityScheduleRow (date/time icons, tabular nums)
│   ├── SceActivityLocationRow (hierarchy formatter)
│   ├── SceActivityStatusChip (lifecycle semantic)
│   ├── ActivityTypePill (match/training/tournament/event colour)
│   ├── SceTeamName (fixture/training team lines)
│   └── ClubCrest / MatchClubPair (match-only)
└── Variants (type-specific hierarchy — do not flatten)
    ├── SceMatchCardVariant
    ├── SceTrainingCardVariant
    ├── SceTournamentCardVariant
    └── SceClubEventCardVariant
```

### Variant-specific required fields

| Variant | Title level | Secondary | Tertiary | Status |
| --- | --- | --- | --- | --- |
| **MATCH** | Home/away `SceTeamName` + crests | Kickoff schedule | Competition, venue, SR/attendance optional | Result / lifecycle |
| **TRAINING** | Team `SceTeamName` | Date/time | Venue/resource, trainer | Cancelled / moved |
| **TOURNAMENT** | Tournament title (display font) | Participating teams | Date/time, venue, format | Registration/status |
| **EVENT** | Event title | Date/time | Location, organizer | Registration when applicable |

### White Edition surface

- Shell: white background, `border-[var(--sce-color-border-standard)]`, shadow-sm optional.
- Retire dark `--sce-match-card-surface` as default; keep token alias for infoboard/signage consumers.

### Tenant-aware branding

- Type pills keep semantic activity colours (blue/red/orange/violet).
- **Do not** flood card background with tenant primary; use accent on border-top or type pill only.
- Tenant overrides via tokens in `06-tenant-branding-architecture.md`.

### Interactions

Preserve existing behaviours:

- `linkToDetail` navigation to canonical consume routes
- List-row click targets in Planning Hub and dashboard
- Preview galleries under `app/sce-preview/*`

## 4. Parallel implementations — migration map

| Legacy / parallel | Target | Notes |
| --- | --- | --- |
| `components/admin/matchcenter/MatchCard.tsx` | `SceMatchCard` | Management density |
| `Weekplanner*IdentityCard.tsx` | Variant + planner density | Wochenplaner package |
| `PlanningHubListeSceActivityCard.tsx` | List-row surface | Already partially canonical |
| `DashboardTodayEventCards.tsx` | `Sce*Card` MICRO/list-row | Dashboard package |
| `InfoboardCompactMatchIdentity.tsx` | **No auto-merge** | Signage boundary |

## 5. Responsive behaviour

- **HERO:** max-width tokens (`max-w-lg` etc.) — keep bounded width on white canvas (reference sites also constrain fixture blocks).
- **List-row:** single horizontal scan on desktop; stack crest/time on narrow viewports (existing tests in `lib/planning-hub/__tests__/sce-planner-ux-08-07-responsive.test.ts` — extend for white surfaces).

## 6. Accessibility

- Schedule rows: `time` elements or explicit `datetime` attributes where HTML allows.
- Status must not rely on colour alone (`SceMatchCardStatus` text labels).
- Crest images: `alt` from club identity adapter (`lib/sporting-activity-design/club-identity.ts`).

## 7. Regression coverage (existing)

| Test file | Coverage |
| --- | --- |
| `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx` | Match |
| `sce-ui-rollout-01e-training-card.test.tsx` | Training |
| `sce-ui-rollout-01f-tournament-card.test.tsx` | Tournament |
| `sce-ui-rollout-01g-club-event-card.test.tsx` | Event |
| `lib/design-system/__tests__/sce-design-system-10-r2-activity-card-temporal.test.tsx` | Temporal formatting |

**Add in implementation packages:** visual regression snapshots on white background; `SceTeamName` integration per variant.

## 8. Explicit non-goals (SCE-DS2-00)

- No component refactor in this audit branch.
- No change to activity colour semantics (`SCE-ACTIVITY-COLOR-01` remains separate tracker).
