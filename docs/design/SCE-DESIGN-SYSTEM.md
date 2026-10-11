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
| Binary on/off settings | `SwitchToggle`, `SwitchThumb` (`components/ui/SwitchToggle.tsx`) | **SCE Control Standard — Toggle First** (this document) |
| Activity tab registries | `lib/activity-navigation/configs.ts` | Activity keys on generic contract |
| Workspace surface | `SceWorkspaceSurface` | [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md) |
| Activity presentation (planned) | `lib/sporting-activity-presentation` | [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md) — **01C** |

---

## Controls — binary state (Toggle First)

**SCE Control Standard — Toggle First** (established with SCE-UI-ROLLOUT-01B closure, 2026-10-11):

SCE must **not** introduce **checkboxes** for binary on/off **settings** or persistent boolean **application state**.

Binary state and boolean settings must use the canonical SCE **Toggle/Switch** pattern (`SwitchToggle` / `SwitchThumb`).

### Requirements

1. **Toggle/Switch** is the SCE canonical binary-state control.
2. **New binary checkboxes are prohibited** for settings (see compliance gate below).
3. A toggle must communicate the **current state** clearly (on/off), not only the action.
4. Labels must describe the **setting or state** (e.g. “Website sichtbar”), not merely “Yes/No”.
5. State must remain understandable **without relying on colour alone** (label + switch position / `aria-checked`).
6. **Keyboard accessibility** is required (Space/Enter toggles; label association via `htmlFor` where used).
7. **Visible focus** is required on the switch control.
8. **Disabled** state must be visually and semantically distinguishable.
9. **Touch targets** must remain usable on mobile (minimum interactive size per workspace standards).
10. **Immediate effect** vs **save-required** effect must be behaviourally clear (copy, section context, or explicit save affordance — do not imply instant persistence when a form still requires “Speichern”).
11. **Do not use toggles for navigation** (use routes, links, or context tabs).
12. **Do not use toggles for tab / filter / view switching** (use context tabs, filters, or segmented controls).
13. **Do not use toggles as a substitute for multi-selection** (see below).

### Good uses (toggle)

- Website / Infoboard enabled or disabled
- Public / private visibility
- Notifications enabled / disabled
- Feature enabled / disabled
- “Person ist aktiv”, captain flags, and similar **on/off** settings

### Do not use a checkbox for these

### Multi-selection (not toggle)

When the interaction is **selecting multiple independent items** (bulk table rows, choosing several recipients, pick-N lists), use the appropriate SCE **multi-selection** pattern (table selection checkboxes, picker lists, etc.).

**Do not** misrepresent multi-selection as a single toggle.

### Control choice matrix

| Problem | Canonical pattern |
|---------|-------------------|
| **Binary state** (setting on/off) | **Toggle/Switch** |
| **Context navigation** (detail sections) | **Context tabs** |
| **Filter / view mode** | Filter rail, segmented control, or domain-appropriate filter |
| **Single choice** (one of N) | Radio group, select, or menu |
| **Multi-selection** | Checkbox lists / table selection where multi-select is the model |
| **Action** | Button or menu action |

### Legacy binary checkboxes

Existing binary-setting checkboxes in the product are **legacy UI**. They should migrate to `SwitchToggle` during the relevant SCE-UI-ROLLOUT adoption package or **01N** cleanup — **not** as part of unrelated packages.

Inventory and migration tracking for control-level legacy lives in [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) (**control backlog** — separate from the 01A register totals).

Row-selection and bulk-operation checkboxes are **out of scope** for Toggle First migration.

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
| **`BINARY_CONTROL_COMPLIANCE`** | **PASS** / **FAIL** |
| **`NEW_BINARY_CHECKBOXES`** | Count; must be **0** unless an approved design-system exception exists |
| **`CANONICAL_TOGGLES_USED`** | **YES** / **NO** / **NOT_APPLICABLE** (when package introduces no binary settings) |
| **`MULTI_SELECTION_PATTERN`** | **canonical** / **not_applicable** / **exception_documented** |

**Target gate:** `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`

Any introduction of a **new binary checkbox** for settings must fail **`BINARY_CONTROL_COMPLIANCE`** unless an explicit architecture / design-system exception is approved and recorded (ADR or package closure exception).

Automated guardrails (01B):

- Context tabs: `lib/context-tabs/__tests__/context-tabs-architecture.test.ts`
- Binary control standard (doc + canonical primitive): `lib/design-system/__tests__/sce-binary-control-standard.test.ts`

Product-wide static enforcement of “no new setting checkboxes” is deferred to a future UI rollout / design-system hardening package if AST-based rules are required; the compliance contract and Toggle First rule are authoritative from 01B closure onward.

---

## Related documents

- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)
