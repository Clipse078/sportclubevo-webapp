# WORKSPACE-03 — External benchmark decision record

**BENCHMARK:** Dropbox Business + Microsoft SharePoint / OneDrive (2026 review).

## Adopted

- Dedicated **Manage Access** experience instead of raw ACL rows.
- Clear **effective access** visibility for administrators.
- **Direct vs inherited** permission explanation.
- **Group / inheritance-first** permission management (Organisation, OrgUnit, Team, Role).
- Desktop **drag-and-drop upload** with authorized drop targets.
- **Contextual file actions** with portal overlays (no viewport clipping).
- **Permission-aware move feedback** using W02 move-impact outcomes.
- Non-drag alternatives for all essential workflows.

## Intentional SCE differences

- Child restrictions **cannot escape** ancestor security boundary (intersection semantics).
- Native **Organisation / OrgUnit / Team / Role / Person** audiences (no generic document groups).
- **Dynamic** organisational membership (no Team → Person grant explosion).
- **No implicit tenant-admin content bypass** on restricted resources.
- **No anonymous / external sharing** in W03.
- **Move widening denied** with explicit feedback rather than silent exposure changes.

## Deferred

| Topic | Package |
|-------|---------|
| Storage / provider hardening | WORKSPACE-04 |
| Deeper version hardening | WORKSPACE-05 |
| Collaboration / external sharing | WORKSPACE-06 |
| Immutable task/requirement document references | WORKSPACE-07 |
| Google Drive migration | WORKSPACE-08 |
| Audited governance / break-glass | WORKSPACE-09 |
