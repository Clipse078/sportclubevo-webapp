# SCE-DS2-01 — White foundation delivery notes

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-01` |
| **Runtime gate** | `SCE_WHITE_EDITION=1` (default off) |
| **Theme hook** | `[data-sce-theme="white"]` on authenticated shell + `app/sce-preview` layout |
| **Token source** | `app/globals.css` |
| **Typed contract** | `lib/design-system/sce-foundation-contract.ts` |

## Enabled surfaces

- Authenticated admin shell (`app/(admin)/layout.tsx`)
- SCE preview galleries (`app/sce-preview/layout.tsx`)

## Explicit exclusions (unchanged)

- Infoboard / venue display CSS modules
- CMS public site (`lib/cms/design-system.ts`)
- Email HTML templates

## Legacy dependencies for downstream packages

| Item | Owner package |
| --- | --- |
| `SCE_WORKSPACE_SURFACE_CLASS` backdrop-blur on white | DS2-05A |
| `fca-*` classes in admin modules | DS2-06 |
| Match card pitch / result typography on white | DS2-04 |
| `SceTeamName` + team line uppercase italic | DS2-03 |
| Header L1 uppercase icon-free nav | DS2-02 |
| Sidebar / tab secondary nav uppercase | DS2-03 |

## Rollback

Unset `SCE_WHITE_EDITION` or set to `0` — shell reverts to v1.0 `:root` dark tokens with no schema changes.
