# WORKSPACE-09-04 — Access + inheritance UX

**Branch:** `cursor/workspace-09-product-completion-ux`  
**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**Authorization algebra:** unchanged (W01/W02/W03)

---

## Access information architecture

| Surface | Actor | Purpose |
|---------|-------|---------|
| Inspector **Zugriff** tab / folder details | VIEW+ on resource | Understand who has access, effective level, why, inheritance mode |
| **Zugriff verwalten** dialog | MANAGE on resource | Add/remove/change explicit grants; restrict child (`EXPLICIT`) |
| Audiences search API | MANAGE flows | Tenant-scoped entity picker |

Primary list is **audience-oriented** (Organisation, Org Unit, Team, Role, Person) — not a flattened member matrix.

---

## Audience model (UI)

| Kind | Label pattern | Dynamic membership |
|------|---------------|-------------------|
| Organisation | Tenant/club name | All members with Workspace access |
| Org Unit | Unit name | Membership changes apply via resolver |
| Team | Team name | «Über Team · …» — no static member list in primary UI |
| Role | Function key label | Scoped role shown in audience label where applicable |
| Person | Display name | Direct grant — no Person.id in UI |

---

## Inheritance presentation

- **INHERIT:** headline `Geerbt von: {parent}` + description that access is taken from parent folder.
- **EXPLICIT:** `Eigene Zugriffseinstellungen` + resource-specific copy (folder/document).
- Inherited effective rows carry a **Geerbt** badge; no edit/delete on inherited rows in summary.
- Editor: **Hier einschränken** seeds from nearest explicit ancestor (no broadening).

---

## Effective vs configured

When child grant level exceeds ancestor cap, UI shows:

- Effective level (authoritative)
- Configured level when higher
- Cap explanation (`Durch übergeordneten Ordner auf … begrenzt`)

Example: parent Team A VIEW + child Team A MANAGE → effective **Ansehen**, configured **Verwalten**.

---

## Provenance («Warum?»)

Each effective row includes `whyLabel`:

- Organisation → «Alle Mitglieder mit Workspace-Zugang»
- Team → «Über Team · {name}»
- Role → «Über Rolle · {name}»
- Person (direct) → «Direkter Zugriff»
- Inherited segment → «Geerbt von {ancestor name}»

Multiple resolver paths: `pathCount > 1` → «Zugriff über N Wege».

---

## Mutation UX

- Canonical `PUT …/access` + audited services (unchanged).
- Add flow: audience type → search/select → Ansehen/Bearbeiten/Verwalten.
- Self-lockout: server may allow; client shows `manageAccessLost` after 403 on save/load.
- Dangerous removes: existing explicit grant remove persists immediately (W09-06 may add confirm polish).

---

## Club Admin vs configured access (W09-04A)

| Concept | Meaning |
|---------|---------|
| **Ihre Berechtigung** | Current actor authority from server (`getWorkspaceEffectiveAccessLevel`) |
| **Konfigurierter Zugriff** | Resource ACL rows (Organisation / Org Unit / Team / Role / Person) — unchanged by Club Admin |

Canonical **tenant Club Admin** (`club_admin__{tenantKey}` + active membership) receives **MANAGE** on all tenant-owned Workspace resources dynamically — no persisted Workspace ACL grant.

Club Admin UI example when Organisation ACL is **Ansehen**:

- Ihre Berechtigung: **Verwalten · Club-Administrator**
- Konfigurierter Zugriff: Organisation · {club} · **Ansehen**

Normal users remain fully ACL-driven (VIEW &lt; EDIT &lt; MANAGE). Creator is provenance only — no bypass.

---

## Security invariants (preserved)

- Zero disclosure: summary `null` → 404 for unauthorized actors.
- No client-side authority; DTOs reflect server authorization only.
- No Person.id/email in client DTOs for display lists.
- Restrictive inheritance + no descendant widening for **resource ACL** (W02/W03 algebra).
- Club Admin MANAGE does **not** widen configured ACL rows or descendant inheritance for normal users.
- Tenant isolation: Club Admin authority is scoped to the active tenant only.

---

## Benchmark decisions (access panel)

| Pattern | Dropbox / SharePoint | SCE W09-04 |
|---------|---------------------|------------|
| Sharing panel with people list | ADOPT (concept) | **ADAPT** — audience groups, not member dump |
| Inherited permissions read-only | ADOPT | **ADOPT** — badge + no edit on inherited rows |
| Direct vs effective columns | ADOPT | **ADOPT** — configured vs effective when capped |
| «Anyone with the link» | REJECT | **REJECT** — no anonymous sharing |
| Club org/team/role grants | N/A | **DIFFERENTIATE** — primary model |

---

## Tests

- `lib/workspace/access/__tests__/w09-04-access-summary.test.ts`
- `lib/workspace/access/__tests__/access-provenance-labels.test.ts`
- `components/admin/workspace/__tests__/WorkspaceAccessSummaryPanel.test.tsx`
- W03/W02 sentinels (regression)

---

## Deferred

- W09-05 rename/move/lifecycle UI
- W09-06 responsive/resizable inspector hardening
- W09-07 mobile DTO package
