# SCE-CD-03R4 — Decision rationale & Massnahme documentation (proposal)

**Status:** Assessment complete — **persistence approval required** before schema migrate.  
**Base:** STAGE post–SCE-MTG-UX-01 (`5759caf74a27da1cb9983d29eb30a9616cfb436b`).

## Current state (merged meeting workspace)

| Entity | Structured text today | Approval / audit |
|--------|----------------------|------------------|
| **MeetingDecision** | `description` (editable in workspace; preview line in summary) | `approvalRequired`, `approvalContentRevision`, `approvedContentHash`, vote rows |
| **MeetingAction** (Massnahme) | Title + owner + due only — **no description / expected outcome** | Status only — no approval revision |
| **Task** (Aufgaben) | Full task model; meeting panel links via context | Separate from Massnahme |

Decision description support in UI: `MeetingWorkspaceSections` → `DecisionRow` with approval-safe edit flow when `documentationEditable`.

## Gaps

1. **Massnahme documentation** — No field for *what* / *expected outcome*; auditors cannot distinguish operational follow-up text from Beschluss text.
2. **Decision rationale** — `description` mixes “was beschlossen” with implicit rationale; no separate *Begründung* vs *Beschlusswortlaut* for approval diffs.
3. **Action audit** — Material edits to Massnahmen do not bump a content revision; no parity with decision `approvalContentRevision`.
4. **Validation** — HTTPS / length / empty-submit rules exist for tasks; Massnahme create/update lacks rich text validation.
5. **Approval-safe editing** — Decisions reset approval on material edit (service layer); Massnahmen have no equivalent hook.

## Recommended persistence (migration — not applied in this package)

```prisma
model MeetingDecision {
  // existing description → rename semantically to resolutionText (optional migration alias)
  rationale     String?  // Begründung (why)
  description   String?  // Beschluss / resolution text (keep column)
}

model MeetingAction {
  description       String?  // operational detail
  expectedOutcome   String?  // measurable / reviewable outcome
  contentRevision   Int      @default(1)  // bump on material edit when linked to approved protocol
}
```

**Indexes:** none beyond existing `meetingId` scopes.

## Application work (post-migration)

1. Reuse decision description UX patterns (`workspaceInputClass`, expandable panels, `documentationEditable` gate).
2. Extend `meetingWorkspaceApi.actions.update` + Zod schemas mirroring decision update.
3. Approval integration: optional rule “Massnahmen in approved meetings require reopen or contentRevision bump”.
4. Display in protocol print view and PDF export blocks.

## Independent work completed without migration

- This assessment document and test inventory hooks for PO prioritization.
- No Prisma schema or SQL migration in branch `cursor/sce-cd-03r4-documentation-proposal-df59`.

## PO UAT (after migration package)

- [ ] Beschluss: separate rationale vs resolution; approval invalidates on material rationale edit.
- [ ] Massnahme: description + expected outcome visible in workspace and print view.
- [ ] Massnahme distinct from contextual Aufgabe (no duplicate task model).
