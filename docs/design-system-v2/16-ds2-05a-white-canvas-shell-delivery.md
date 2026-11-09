# SCE-DS2-05A — Global white canvas & authenticated shell

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-05A` |
| **Predecessor** | `SCE-DS2-04R6` (PR #941) |
| **Successor** | `SCE-DS2-05B` — dense forms/tables/dialog primitives |
| **Runtime gate** | `SCE_WHITE_EDITION=1` (default **off**) |
| **Theme hook** | `[data-sce-theme="white"]` on authenticated shell |

## Delivered surfaces

- Application canvas `#ffffff` — no tactical PNG when the flag is on (`authenticated-shell.css`, `app/globals.css` tokens).
- Global header, sticky safety stack, mobile bottom navigation — semantic chrome on white.
- Domain + contextual navigation flyouts — light panels (no `#0b1220` tactical mix).
- Application explorer drawer — solid white panel; restrained modal backdrop token.
- Shared workspace primitives — `sce-workspace-surface`, `sce-workspace-feature-card` without dark-era blur.

## STAGE pilot (operator activation)

Activation is **not** automatic in application code. On the Vercel **STAGE** custom environment:

1. Confirm `APP_ENV=stage` (authoritative stage discriminator — not `NODE_ENV` alone).
2. Set `SCE_WHITE_EDITION=1` when Product Owner approves the pilot.
3. Redeploy STAGE and verify `data-sce-theme="white"` on the authenticated shell root.

Production / `main` must keep `SCE_WHITE_EDITION` unset so v1.0 dark `:root` remains default.

## Exclusions

- DS2-05B dense UI sweep (forms, tables, dialogs).
- DS2-06 per-module migrations.
- Infoboard / CMS / email boundaries unchanged from DS2-01.

## Automated coverage

- `lib/design-system/__tests__/sce-ds2-05a-white-canvas-shell.test.ts`
- Existing DS2-01 … DS2-02 navigation suites
