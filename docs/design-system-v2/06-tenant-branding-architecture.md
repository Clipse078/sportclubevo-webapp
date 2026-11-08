# Tenant branding architecture (DS 2.0)

## 1. Scope

Design the **token architecture** for per-tenant colours in White Edition. **Defer** tenant-facing “Brand Color Studio” UI to a LATER package.

## 2. Current implementation (inventory)

Documented in `app/globals.css`:

- `--tenant-primary`, `--tenant-secondary` injected per tenant (admin layout)
- `--tenant-accent` **always derived**: `color-mix(in srgb, var(--tenant-primary) 10%, white)` — must not be set directly
- Widespread component usage: `var(--tenant-primary)` on buttons, rings, selection washes (e.g. `RegistrationInboxCard.tsx`)

**Risk:** Hardcoded `color-mix(…, white)` assumptions break if canvas is already white — accent derivation formula must be revisited in `SCE-DS2-01`.

## 3. Future supported branding dimensions

| Token (proposed) | Purpose |
| --- | --- |
| `--tenant-brand-primary` | Primary accent (CTA, key links) |
| `--tenant-type-page-title` | Page title colour |
| `--tenant-type-section-heading` | Section headings |
| `--tenant-type-card-title` | Card titles (non-team) |
| `--tenant-type-body` | Body text override (rare) |
| `--tenant-type-secondary` | Secondary / meta text |
| `--tenant-type-link` | Link and action accent |

**Aliases** may map to existing `--tenant-primary` during migration.

### Preserved platform semantics

Unchanged across tenants:

- `--sce-color-status-success`, `warning`, `error`, `info` (`sce-foundation-contract.ts`)
- Activity type pill colours (match/training/tournament/event)

### Prohibited

- Global hardcode of SC Cham or FC Allschwil hex values in `globals.css`
- Cross-tenant CSS leakage (tenant vars scoped to authenticated layout root only)

## 4. Contrast and accessibility safeguards

| Check | Rule |
| --- | --- |
| Primary on white | Minimum 4.5:1 for text, 3:1 for large text |
| Custom body text | Block save if below 4.5:1 against `#ffffff` |
| Link colour | Distinct from body; underline or icon on focus |

**Validation (future):** server-side contrast function on save; client preview in Brand Studio.

## 5. Persistence and application

| Layer | Mechanism |
| --- | --- |
| Storage | Existing tenant branding config (see admin branding modules) |
| SSR | Inject `<style>` or root `style` attribute on admin layout **before first paint** (extend current `generateTenantCssVars` pattern) |
| CMS public site | `lib/cms/token-resolver.ts` — separate resolver; do not couple to admin white theme |
| Fallback | Platform SportClubEvo navy/orange defaults when tenant unset |

## 6. Theme boundaries (recap)

| Surface | Tenant text overrides |
| --- | --- |
| Admin White Edition | Yes — within semantic slots |
| Infoboard | Independent signage palette |
| Email HTML | Inline styles; batch migration |
| PDF / exports | Out of scope |

## 7. Package placeholder

**`SCE-DS2-TENANT-STUDIO` (LATER)** — UI for editing branding dimensions, contrast preview, rollback, audit log.

Dependencies: `SCE-DS2-01` white foundation tokens stable.

See [07-migration-roadmap.md](./07-migration-roadmap.md).
