# SCE Design System v1.0 — Master Entry Point

> **Programme:** [`SCE-UI-ROLLOUT-01+`](../roadmap/SCE-UI-ROLLOUT-01.md)  
> **Established by:** SCE-UI-ROLLOUT-01B (Context Tabs foundation)

---

## Design principle

**One SCE. One navigation language. One activity language. One visual family.**

---

## Foundational hierarchy

```text
Atmospheric background
  → Context header (identity)
  → Context navigation (tabs)
  → Workspace surface
  → Sections / cards
  → Fields / actions
```

Detailed workspace rules: [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md)

---

## Canonical primitives (01B baseline)

| Pattern | Canonical module | Standard |
|---------|------------------|----------|
| Context tabs | `lib/context-tabs`, `components/sce/context-tabs/SceContextTabs.tsx` | [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md) |
| Activity tab registries | `lib/activity-navigation/configs.ts` | Activity keys on generic contract |
| Workspace surface | `SceWorkspaceSurface` | [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md) |
| Activity presentation (planned) | `lib/sporting-activity-presentation` | [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md) — **01C** |

---

## Design system ownership

- Shared interaction and visual patterns belong in the SCE design system.
- Future modules **must consume** existing canonical patterns before introducing new ones.
- Parallel tab/card/workspace frameworks require an ADR ([`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)).

---

## Domain extension rule

A module may introduce **genuinely new domain UX**. It may **not** independently redefine an existing SCE pattern (context tabs, workspace surfaces, activity cards, status semantics, action hierarchy, forms, dialogs, responsive behaviour, accessibility behaviour) without an explicit design-system ADR.

---

## Future-module compliance contract

Every future SCE package must declare **`SCE_DESIGN_SYSTEM_COMPLIANCE`** in its closure report:

| Field | Description |
|-------|-------------|
| Canonical primitives consumed | e.g. `SceContextTabs`, `SceWorkspaceSurface` |
| Canonical navigation pattern | Context tabs / route tabs / filters (justify if not context tabs) |
| Canonical workspace pattern | Dark workspace + sections |
| New UX primitives introduced | List + justification |
| Responsive compliance | PASS / deferred with package id |
| Accessibility compliance | PASS / deferred with package id |
| Legacy / parallel pattern introduced | **YES/NO** |

**Target gate:** `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`

Automated guardrails (01B): `lib/context-tabs/__tests__/context-tabs-architecture.test.ts`

---

## Related documents

- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)
