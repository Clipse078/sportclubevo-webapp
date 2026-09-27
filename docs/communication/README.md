# SportClubEvo — Communication programme (SCE-COMM)

Canonical **Communication + Zielgruppen** architecture for team, club, event, and sponsor experiences.

| Document | Purpose |
|----------|---------|
| [SCE-COMM-01-ARCHITECTURE.md](./SCE-COMM-01-ARCHITECTURE.md) | Programme architecture, domain model, seams, integrations |
| [SCE-COMM-01-source-matrix.json](./SCE-COMM-01-source-matrix.json) | Machine-readable ownership / reuse matrix |
| [SCE-COMM-01-ROADMAP.md](./SCE-COMM-01-ROADMAP.md) | Follow-up package sequence and dependencies |
| [SCE-COMM-02-ZIELGRUPPEN-MANAGEMENT.md](./SCE-COMM-02-ZIELGRUPPEN-MANAGEMENT.md) | Zielgruppen management UX, persistence, permissions (COMM-02) |
| [SCE-COMM-03-RECIPIENT-RESOLUTION.md](./SCE-COMM-03-RECIPIENT-RESOLUTION.md) | Dynamic audience & recipient resolution engine (COMM-03) |

**Immutable programme statements (COMM-01):**

- **Zielgruppen are an organisation-wide Communication capability and are not owned by Sponsors, Teams, or individual feature modules.**
- **Authorization to send and membership of a Zielgruppe are separate concerns.**

Executable contracts: `lib/communication/platform/`.
