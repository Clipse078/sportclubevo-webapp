# SCE-HOTFIX-LOGIN-01 — STAGE post-auth dashboard SSR blocker

## Incident reclassification (2026-10-01)

Authentication and session establishment succeed. The authenticated **document** request to `/dashboard` does not complete within 20+ seconds (Chrome Network: status **pending**; no final HTTP status observed).

| Boundary | Observation |
| --- | --- |
| credentials | HTTP **200** |
| session/auth | HTTP **200** |
| GET `/dashboard` | **starts** (document navigation) |
| `/dashboard` response | **does not complete** (>20s pending) |
| LoginForm 20s recovery | **fires**; user remains on `/login` |
| React #418 | still in console — **not treated as primary root cause** |

## Manual UAT notes (2026-10-01)

- credentials request returns **200**
- session/auth requests return **200**
- GET `/dashboard` starts as a **document** request
- Network tab: `/dashboard` stays **(pending)** for **>20 seconds**
- LoginForm stall recovery runs; browser stays on `/login`
- dashboard UI **never paints**
- Do **not** infer a final status code for `/dashboard` — none completed

## Diagnosis hypothesis (PR #790)

Post-#789 operational attention sources evaluated up to 40 entities each with **sequential** per-entity participation resolution (`resolveEventParticipationAnchor` + `listParticipationSubjectPersonIds`), producing pathological query volume during dashboard SSR.

## Preview trace (Vercel)

When `VERCEL_ENV=preview` (or `SCE_HOTFIX_LOGIN_01_TRACE=1`), server logs emit:

`[SCE-HOTFIX-LOGIN-01] cid=… step=… elapsedMs=…`

Checkpoints (R3 gap instrumentation):

- Page: `dashboard`, `auth`, `search-params`
- `ClubDashboardView`: `i18n-secondary`, `tenant`, `actor-context` (`actor-membership`, `actor-permissions`, `actor-org-scope`), `person-first-name`, `command-center-data`, `quick-access`, `hero-state`, `dashboard` (done)
- `getPersonalCommandCenterData`: `command-center-prep`, `command-center`, `programme`, `personal-work`, `secondary-snapshot`, nested `personal-actions`, `operational-attention`, `spielbetrieb`, `training`, `events`

Find the first `phase=start` without a matching `phase=done` for the same `step` and `cid`.

Isolation (preview only): `SCE_HOTFIX_LOGIN_01_SKIP_OPERATIONAL=1` skips operational attention aggregation for A/B.

## Hydration change gate

`PersonalAttention.tsx` / `PersonalAttentionRow.tsx` split was **reverted** — no proven deterministic hydration defect or failing regression test.
