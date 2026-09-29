# SCE Selector Inventory (SCE-SELECTOR-02)

Reference inventory for canonical SCE List Selector rollout. Status as of SCE-SELECTOR-02.

| Surface | Route / area | Entity | Previous implementation | Classification | New source / adapter | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Communication recipients | `/dashboard/communication/*` | Multi-entity audience | `CommunicationAudienceSelector` + discover API | A | Communication adapter + `SceListSelectorPanel` | CANONICAL_ALREADY |
| Zielgruppen builder | `/dashboard/communication/zielgruppen/*` | OrgUnit, Team, Role, Person, External | `ZielgruppeDefinitionEditor` + discover | A | TARGET_GROUP_MANAGEMENT context | CANONICAL_ALREADY |
| Aufgaben assignees | Aufgaben create / workspace | User (linked Person) | `TaskPeopleMultiPicker` inline search | A | `USER` + `TASK_ASSIGNMENT` + `SceChipMultiSelectorField` | MIGRATED |
| Aufgaben org visibility | Aufgaben forms | OrgUnit (auth-filtered) | `TaskOrgUnitMultiPicker` popover filter | A | `ORG_UNIT` task adapter + `TASK_ASSIGNMENT` | MIGRATED |
| Requirements audience persons | Requirements builder | Person | `RequirementPersonMultiPicker` inline search | A | `PERSON` + `REQUIREMENT_AUDIENCE` | MIGRATED |
| Workspace access grants | Workspace folder/document ACL | Person, Team, OrgUnit | `/api/workspace/access/audiences` manual search | A | `WORKSPACE_ACCESS` + `WorkspaceAccessAudienceScePicker` | MIGRATED |
| Workspace access grants | Same | Role (function key) | Static `PERSON_FUNCTION_OPTIONS` search | C | Domain function keys ≠ tenant Role rows | KEEP_DOMAIN_SPECIFIC |
| Workspace access grants | Same | Organisation | Fixed tenant row | C | Not a browse entity | KEEP_DOMAIN_SPECIFIC |
| People picker (generic) | News, pages, org membership, teams | Person | `PeoplePicker` `/api/people/search` | A | `CLUB_REFERENCE` + `SceInlineSinglePersonPicker` when `mode=any` | MIGRATED |
| People picker (team context) | Team squad / trainer cards | Person (player/trainer) | `PeoplePicker` + `teamSeasonId` | B | Needs team-season scoped adapter | DEFERRED |
| People & Access wizard | `/dashboard/admin/people-access` | Person / email lookup | Email lookup + wizard steps | C | Invitation semantics, not list browse | KEEP_DOMAIN_SPECIFIC |
| People & Access wizard | Same | Role / OrgUnit assignment | Server-provided checkbox lists | C | Assignment wizard, not discover browse | KEEP_DOMAIN_SPECIFIC |
| Team admin pickers | Tournaments, training create | Team / TeamSeason | `TeamSearchablePicker`, `TeamSeasonSearchablePicker` | B | Preloaded options + season coupling | DEFERRED |
| Facility / resource | Planning / training | Facility resource | `FacilityResourceSearchableSelector` | C | Client flat list + availability annotations | KEEP_DOMAIN_SPECIFIC |
| Planning visual pickers | Wochenplaner / training | Resource occupancy | `VisualResourceAvailabilityPicker` | C | Calendar/availability semantics | KEEP_DOMAIN_SPECIFIC |
| Season context | Admin modules | Season | `SeasonContextSelector` link pills | C | Navigation context, not entity pick | KEEP_DOMAIN_SPECIFIC |
| Tenant / club switch | Session / layout | Tenant | Active tenant from membership (no browse-all) | E | Needs membership-scoped TENANT source | DEFERRED |
| Sponsor audience | Communication templates | Sponsor org/contact/category | `SponsorAudienceSelectors` spec fields | E | Sponsor domain; no generic browse UI yet | DEFERRED |
| Probetraining | Probetraining surfaces | Various | Local forms | E | PROBETRAINING-COMM out of scope | DEFERRED |
| Event / match / training pick | Planning hubs | Event types | Domain-specific forms | C | Date/status-heavy | KEEP_DOMAIN_SPECIFIC |
| External club | Tournament | External club | `ExternalClubPicker` | C | Cross-club registry semantics | KEEP_DOMAIN_SPECIFIC |
| Media / attachments | Communication | Blob/media | `MediaPickerDialog`, attachment pickers | D | Not entity selector | NOT_SELECTOR |
| Native `<select>` | Forms (access level, etc.) | Enum / static | HTML select | D | Static enums | NOT_SELECTOR |

## Classification key

- **A — MIGRATE NOW**: Migrated in SCE-SELECTOR-02 or already on SCE engine.
- **B — ADAPTER REQUIRED**: Should use SCE after a dedicated source/adapter.
- **C — KEEP DOMAIN-SPECIFIC**: Different UX or authorization semantics.
- **D — NOT A SELECTOR**: False positive.
- **E — DEFER**: Valid later; out of scope for this package.

## DATA HYGIENE observations

Duplicate-looking Club Admin role labels may appear in Role browse (same label, distinct IDs). No data mutation in this package — track under Data Hygiene programme.
