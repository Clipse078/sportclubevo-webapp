# SCE-CD-03R4 — Decision rationale & Massnahme documentation

**Status:** Implemented (schema migration prepared; deploy requires authorized `db:migrate:deploy`).  
**Depends on:** SCE-CD-02 / SCE-CD-03 workspace (STAGE post SCE-MTG-UX-01).  
**Related proposal:** PR #967 (assessment only — superseded by this package).  
**Independent sprint PRs (not merged into this branch):** #965–#966, #968–#971.

## Delivered persistence

| Entity | Field | Purpose |
|--------|-------|---------|
| `MeetingDecision` | `rationale` | Optional Begründung (separate from `description` / Beschlusswortlaut) |
| `MeetingAction` | `description` | Optional Massnahme detail (not canonical `Task`) |
| `MeetingAction` | `expectedOutcome` | Optional Ziel / erwartetes Ergebnis |

**`MeetingAction.contentRevision`:** intentionally **not** added — Massnahmen have no Beschluss-style approval fingerprint; protocol approval hashes meeting title, description, agenda and decision **titles** only (`hashMeetingProtocolContent`), so a revision column would not participate in invalidation today.

## Compatibility

- Additive nullable columns only; existing rows remain valid with `NULL`.
- Approval hashes for Beschlüsse now include `rationale`; after migration, the first material edit to an already-approved Beschluss may reset approval when rationale/description/title diverges from `approvedContentHash` (expected).

## Deployment runbook

1. Merge implementation branch to STAGE (no remote migration until authorized).
2. On the target database (STAGE Neon or disposable verify DB):

   ```bash
   APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled
   ```

   Migration id: `20261113120000_sce_cd_03r4_decision_action_documentation`.

3. Redeploy application so Prisma client matches schema.
4. **Preview / STAGE UI:** new fields are unreadable until step 2 completes (Prisma queries will fail against unmigrated DB).

## PO UAT checklist (consolidated)

Manual UX, visual and responsive checks are PO-only.

- [ ] Beschluss: Beschlusswortlaut and Begründung can be created, read, and edited inline in the workspace.
- [ ] Beschluss: material edit to Begründung or Beschlusswortlaut resets approval when Freigabe was granted (same as title change).
- [ ] Massnahme: Beschreibung and Erwartetes Ergebnis visible in workspace expandable panels and create form.
- [ ] Massnahme: fields appear in protocol print view when populated.
- [ ] Massnahme remains distinct from contextual Aufgabe (task panel unchanged; no Task model merge).
- [ ] Schreibgeschützte Sitzungen block Massnahme documentation edits (403).
