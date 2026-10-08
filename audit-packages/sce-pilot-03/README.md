# SCE-PILOT-03 — Scoped pilot access (implementation)

Implements allocation-only and read-only CMS permissions from SCE-PILOT-02 audit (PR #774).

## Permission catalog sync (not executed on STAGE by this PR)

```bash
npx tsx scripts/sync-sce-pilot-03-permissions.ts
APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-sce-pilot-03-permissions.ts
```

## Role templates (unassigned)

See `lib/roles/pilot-fc-allschwil-role-definitions.ts`.

## Communication scope

`communication.inbox.view` is **not** assigned — shared EMAIL channel would expose tenant mailbox. Pilots use `communication.club.view` (Mitteilungen) only.

## Limitations

- Spielbetrieb Koordinator: `planning.allocations.manage` + `trainings.view` + `events.view` (see `lib/roles/pilot-fc-allschwil-role-definitions.ts`). FCA role sync: `scripts/sync-fca-spielbetrieb-koordinator-role.ts`.
- Präsident (Pilot): Sandra operational baseline + `workspace.view`, `registrations.view`/`registrations.edit`, preserved president supplements (`org.view`, Zielgruppen, `news.manage`). FCA role sync: `scripts/sync-fca-praesident-pilot-role.ts`.
- Authenticated STAGE UAT requires role assignment after catalog sync.
