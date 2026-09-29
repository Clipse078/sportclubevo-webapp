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

Generic endpoint `/api/sce/selector/discover` requires auth + tenant only.

Communication uses `/api/communication/audience/discover` with capability checks + optional `sources=` filter aligned with feature adapters.

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
