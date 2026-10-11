# SCE Workspace Surface Standard

**Canonical key:** `SCE-UI-STANDARD-01`  
**Status:** **FOUNDATION ESTABLISHED / FIRST ADOPTION COMPLETE** (PO UAT PASS via SCE-ACTIVITY-NAV-01, PR #824 → STAGE)  
**Reference implementation:** `/dashboard/communication` (Communication hub — not a literal copy target)

## Purpose

Give every SCE activity workspace the same calm, scannable hierarchy: persistent club atmosphere, bounded surfaces, functional cards, semantic icons, and progressive disclosure — without giant opaque forms or redundant side rails.

## Persistent identity

- **BACKGROUND = atmosphere** — SCE football/technology background stays perceptible around the workspace.
- **SURFACES = information** — cards and panels use `--sce-surface-standard` / translucent surfaces.
- **ACCENT = interaction** — orange for primary actions, not every icon.

## Layered surfaces

```
Application background
  → Activity header (context)
  → Activity navigation (tabs)
  → Workspace surface / card grid
  → Functional sections
  → Fields & actions
```

## Icon-led recognition

Major **destinations** and **functional groups** use a semantic icon from `lib/sce/workspace/sce-activity-semantic-icons.ts`:

| Concept | Key |
|---------|-----|
| Übersicht | `overview` / `matchInfo` |
| Aufgebot | `squad` |
| Teilnahme | `participation` |
| Planung | `planning` |
| Spielbetrieb | `operations` |
| Kommunikation | `communication` |
| Publikation | `publication` |
| Aufgaben | `tasks` |
| Termin | `schedule` |
| Spielort | `location` |
| Ressourcen | `resources` |
| Administration / Technisch | `settings` |
| Mehr | `mehr` |

### Icon hierarchy

| Level | Use icons? |
|-------|------------|
| Page / workspace title | Yes — restrained |
| Major section / card | Yes — primary adoption |
| Navigation tabs | **No by default** (labels first; avoids noise) |
| Individual field labels | **No** |

## Implementation primitives

| Primitive | Location |
|-----------|----------|
| Layout tokens | `lib/sce/workspace/sce-workspace-layout.ts` |
| Semantic icons | `lib/sce/workspace/sce-activity-semantic-icons.ts` |
| Section header | `components/sce/workspace/SceSectionHeader.tsx` |
| Feature card | `components/sce/workspace/SceFeatureCard.tsx` |
| Workspace surface | `components/sce/workspace/SceWorkspaceSurface.tsx` |
| Activity tab scroll | `.sce-activity-nav-tablist` in `app/globals.css` |

## Background treatment

- Prefer bounded cards with spacing between them over one full-width opaque block.
- Use `/90` or `/82` surface alpha where readability allows.
- Keep gutters so background remains visible.

## Mehr / overflow

- Lower-frequency controls: publication, tasks, provider/sync metadata, admin links.
- **Exactly one** canonical editable surface per control (e.g. one Publikation editor).
- Responsive **2-column card grid** on desktop where content supports it.

## Accessibility

- No unexplained icon-only controls; `aria-label` on icon-only actions.
- Section headers remain real headings (`h2`).
- Icons are decorative when adjacent to visible text (`aria-hidden` on icon shell).

## Anti-patterns (DON'T)

- Duplicate editable publication toggles (rail + tab).
- Permanent right sidebar repeating header/overview content.
- Giant opaque wall hiding SCE background.
- Icons on every field label.
- Random icon choice per module.
- Empty placeholder cards.
- Hiding scroll artifacts with unexplained global CSS (fix root cause — see `.sce-activity-nav-tablist`).

## First adopters (NAV-01)

- Training session edit
- Match record (`SpieleMatchRecordWorkspace`)
- Tournament record
- Veranstaltung edit

## Rollout programme

**SCE-UI-STANDARD-01** = **FOUNDATION ESTABLISHED / INCORPORATED INTO SCE-UI-ROLLOUT-01+**

**SCE-UI-ROLLOUT-01+** = **NEXT COMMITTED PROGRAMME** after `MATCH_SQUAD_PLAYER_AVAILABILITY` closure — see [`docs/roadmap/SCE-UI-ROLLOUT-01.md`](../roadmap/SCE-UI-ROLLOUT-01.md). Unified workspace surfaces, universal context tabs, and universal activity presentation across the webapp.
