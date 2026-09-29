# SCE Selector Inventory (SCE-SELECTOR-02 / 02R2)

Reference inventory for canonical SCE List Selector rollout. Status as of SCE-SELECTOR-02R2.

| Surface | Route / area | Entity | Previous implementation | Classification | New source / adapter | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Communication recipients | `/dashboard/communication/*` | Multi-entity audience | `CommunicationAudienceSelector` + discover API | A | Communication adapter + `SceListSelectorPanel` | CANONICAL_ALREADY |
| Zielgruppen builder | `/dashboard/communication/zielgruppen/*` | OrgUnit, Team, Role, Person, External | `ZielgruppeDefinitionEditor` + discover | A | TARGET_GROUP_MANAGEMENT context | CANONICAL_ALREADY |
| Aufgaben assignees | Aufgaben create / workspace | Person (linked User persisted) | `TaskPeopleMultiPicker` + discover API | A | `PERSON` + `TASK_ASSIGNMENT` + `SceChipMultiSelectorField` | CANONICAL_ENGINE |
| Aufgaben org visibility | Aufgaben forms | OrgUnit (auth-filtered) | `TaskOrgUnitMultiPicker` popover filter | A | `ORG_UNIT` task adapter + `TASK_ASSIGNMENT` | MIGRATED |
| Requirements audience | Requirements builder | Person + structural expansion sources | `RequirementAudienceBuilder` + `SceRecipientSelector` | A | `REQUIREMENT_AUDIENCE` (Person/Team/Org/Role/TargetGroup) | CANONICAL_ADAPTER |
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

## Classification key (02R2)

- **CANONICAL_ENGINE** — `SceListSelectorPanel` + `useSceListSelectorQuery` + discover API + source registry.
- **CANONICAL_ADAPTER** — Thin domain wrapper (`SceRecipientSelector`, `TaskPeopleMultiPicker`, `CommunicationAudienceSelector`, …).
- **DOMAIN_SPECIFIC_VALID** — Correct bespoke control (season, facility availability, enum select, invitation wizard).
- **LEGACY_DUPLICATE** — Parallel browse/search lifecycle to be removed later.
- **MIGRATE_LATER** — Valid entity selector deferred (team-season scoped people, sponsor audience, tenant switch).

Legacy shorthand (02): A≈CANONICAL*, B≈MIGRATE_LATER, C≈DOMAIN_SPECIFIC_VALID, D/E unchanged.

## R2 notes

- Task assignee discovery uses canonical `person-user-identity` eligibility (Person.userId + active TenantMembership); UI selects Person, persistence stores User id via `linkedUserId` metadata.
- Requirement structural picks (Team/Org/Role/TargetGroup) are expansion sources only; activation snapshot resolves to Person recipients (`requirement-audience.ts`).

## DATA HYGIENE observations

Duplicate-looking Club Admin role labels may appear in Role browse (same label, distinct IDs). No data mutation in this package — track under Data Hygiene programme.
