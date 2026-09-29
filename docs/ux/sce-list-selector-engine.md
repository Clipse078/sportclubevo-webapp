# SCE List Selector Engine (SCE-SELECTOR-01)

## Architecture

Three layers:

1. **Engine** — `components/sce/list-selector/SceListSelectorPanel.tsx` + `lib/sce/list-selector/use-sce-list-selector-query.ts`
2. **Sources** — `lib/sce/list-selector/sources/*` (tenant-scoped browse/search + normalization)
3. **Feature adapter** — e.g. `lib/communication/audience/communication-audience-discover-client.ts`

The engine is domain-agnostic. Communication audience semantics stay in Communication adapters.

## Selector modes

- `single` — row activates pick; optional immediate close
- `multiple` — pending selection + footer confirm

## Source provider contract

Each source implements:

- `browse*SelectorItems({ tenantId, limit, … })` for empty query
- `search*SelectorItems({ tenantId, query, limit, … })` when `query.trim().length >= 2`

Orchestration: `discoverSceSelectorItems()` in `lib/sce/list-selector/discover-selector-items.ts`.

## Item contract

`SceSelectorItem` (`lib/sce/list-selector/types.ts`):

- `id`, `type`, `label`, optional `description`, `disabled`, `metadata`

Presentation labels/icons: `lib/sce/list-selector/entity-presentation.ts`.

## Search

- Debounce ~250ms when query length ≥ 2
- Empty query = **browse** (initial page per source)
- Latest request wins; stale responses ignored (`use-sce-list-selector-query`)

## Pagination

Initial browse limits per group (see `SCE_SELECTOR_ALL_CATEGORY_BROWSE_LIMITS`). Extend sources with cursor/`hasMore` when wiring load-more.

## Selection state

Stable key: `` `${type}:${id}` `` via `sceSelectorPickKey()`.

## Accessibility

- `role=listbox`, `role=option`, `aria-multiselectable` for multi-select
- Arrow/Home/End/Space/Enter on result list container
- Live region for result counts / empty states

## Authorization

Generic endpoint `/api/sce/selector/discover` requires auth, active tenant, and a **closed** `authContext` enum (see `SceSelectorAuthorizationContext`). Clients must never send permission keys.

Communication uses `/api/communication/audience/discover` with capability checks + optional `sources=` filter aligned with feature adapters.

### Authorization contexts (SCE-SELECTOR-02)

| Context | Typical surfaces | Allowed sources |
| --- | --- | --- |
| `COMMUNICATION_SEND` | Club send, campaigns | Person, Team, OrgUnit, Role, TargetGroup, External |
| `TARGET_GROUP_MANAGEMENT` | Zielgruppen builder | Person, Team, OrgUnit, Role, External (no TargetGroup) |
| `TASK_ASSIGNMENT` | Aufgaben assignees / org visibility | User, OrgUnit (task-auth adapter) |
| `REQUIREMENT_AUDIENCE` | Requirements audience rules → Person recipients | Person, Team, OrgUnit, Role, TargetGroup |
| `WORKSPACE_ACCESS` | Workspace ACL grants | Person, Team, OrgUnit, Role |
| `PEOPLE_ACCESS_ADMIN` | Admin people flows (future) | Person, Team, OrgUnit, Role |
| `CLUB_REFERENCE` | Generic in-club person pick | Person |

Entity source ≠ authorization context: the same `PERSON` source applies different filters depending on `authContext` / communication hints.

## Source registry

Implemented source types (`SceSelectorSourceType`):

- `PERSON`, `USER`, `TEAM`, `ORG_UNIT`, `ROLE`, `TARGET_GROUP`, `EXTERNAL_CONTACT`

Adapters:

- `USER` — eligible task assignees (User IDs, Person-backed)
- Task `ORG_UNIT` — `task-org-unit-selector-source` (visibility-aware org units)
- Communication bridge — audience discover mapping (no `USER`)

## Canonical usage

### Generic client adapter

`sceGenericDiscoverFetch({ authContext, sourceTypes })` → use with `SceListSelectorPanel` or wrappers:

- `SceChipMultiSelectorField` — chip field + multi-select sheet
- `SceInlineSinglePersonPicker` — single person (club reference)
- `WorkspaceAccessAudienceScePicker` — workspace ACL

### Do

- Pass closed `authContext` values only
- Map picks to domain IDs in the feature layer
- Keep browse-first UX (empty query loads first page)

### Don't

- Add parallel `PersonPicker` / `TeamPicker` components (see duplication guard test)
- Accept client-supplied permission keys
- Collapse Person and User semantics (`USER` is explicit for assignees)

## Entity presentation

- Person/User rows: label + email secondary line
- Team: name + shortName metadata
- OrgUnit / Role: human-readable label; technical keys in `searchText` only
- OrgUnit hierarchy (tasks): indentation via metadata level in task adapter

## Single vs multi select

Engine `mode`: `single` (immediate or dismiss-on-pick) vs `multiple` (pending map + „N übernehmen“ footer).

## Browse / search behavior

Min search length: 2 characters. Debounce: 250ms. Category tabs hidden when only one source type is enabled.

## Pagination

Per-group cursors via `cursors` JSON on discover APIs; UI load-more in `SceListSelectorPanel`.

## Adapter pattern

Feature UI → `fetchResults` closure → `/api/sce/selector/discover` or domain discover route → `discoverSceSelectorItems` → source modules.

## Domain-specific exceptions

See `docs/ux/sce-selector-inventory.md` for Workspace role function keys, FacilityResourceSearchableSelector, TeamSeason pickers, Probetraining, and tenant switching.

## Migration guide

1. Pick `authContext` + `sourceTypes`.
2. Replace inline search popovers with `SceChipMultiSelectorField` or `SceListSelectorPanel`.
3. Add/extend a source adapter only if multiple consumers need the same semantics.
4. Record surface in the inventory doc.

## Error handling

User-facing copy only (e.g. „Auswahl konnte nicht geladen werden.“) + retry.

## Examples

### Person / team / role / org unit (generic API)

```
GET /api/sce/selector/discover?sources=TEAM,ROLE&category=all&q=
```

### Communication recipient selector

`CommunicationAudienceDiscoverPanel` → `communicationAudienceDiscoverFetch()` → communication discover API.

### Zielgruppen automatic rules

Sources: `ORG_UNIT`, `TEAM`, `ROLE` via `DiscoverAddButton` feature flags.

## Adoption checklist

1. Define enabled `SceSelectorSourceType[]` for your feature.
2. Provide `fetchResults` (or use generic API with server-side authorization wrapper).
3. Map picks into your domain state in `onPick` / `onConfirm`.
4. Do not embed domain resolver/spec logic in the engine.
