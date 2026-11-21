# Tenant Documentation — two-user PO checklist (STAGE UAT)

PO owns login, screenshots, and manual UAT on STAGE. No shared STAGE writes without separate approval.

## Two editors + one reader

1. Open **Dokumentation** (`/dashboard/dokumentation`) as Editor A with `tenant_documentation.edit`.
2. Open the same page in a second browser as Editor B.
3. Confirm **Entwurf** bar shows two presences and **Alle Änderungen gespeichert** after idle sync.
4. Type `@` and verify keyboard-accessible people picker (first name, surname, full name).
5. Insert a mention; confirm stable display name and that both editors see the mark after sync.
6. As **Reader** (view only, no edit), open the page and confirm **Veröffentlichte** reading view **without** unpublished draft mentions.
7. As **Publisher**, click **Veröffentlichen**; reader now sees mention in published body.
8. Confirm mentioned person receives in-app notification (if they have read access); no notification on autosave-only edits.
9. Republish without new mentions — no duplicate notifications.
10. Cross-tenant URL must 404 / deny (other club).