# Patrick Scotton — Rechte-Vorschlag (Genehmigung)

**E-Mail:** patrick.scotton@fcallschwil.ch  
**Vorgeschlagene Rolle (neu, tenant-scoped):** **Präsident — Pilot Viewer** (Arbeitsname; noch nicht angelegt)

---

## Sichtbare Module (Zielbild)

| Domäne | Sichtbar | Zweck |
|--------|----------|-------|
| Dashboard | Ja | Überblick, persönliche Widgets |
| Planung → Wochenplaner (read) | Ja | Operativen Plan und Zuteilungs**stand** einsehen |
| Planung → Trainings/Spiele/… | Optional read-only | Keine Bearbeitung |
| Aufgaben | Ja (persönlich) | Eigene Aufgaben / Mitwirkung |
| Kommunikation | Ja (read + reply on own threads) | Kein Versand-Hub |
| Dokumente | Ja | Explizit geteilte Inhalte |
| Club → Organisation (Übersicht) | Ja (read) | Struktur, keine Personenakte |
| News / Publizieren (CMS) | **Nein** in App | Siehe Lücke |
| Infoboard | **Nur Vorschau** wenn freigegeben | Keine Board-Verwaltung |
| Administration / Vereinsleitung-Demo | **Nein** | |

---

## Erlaubte Handlungen (Read)

- Wochenplan und Planungskalender **lesen** (Konflikte/Belegung sichtbar, keine Änderungen)
- Spiele/Trainings/Termine im Planungskontext **lesen** (ohne Manage-APIs)
- Organisationseinheiten, Teams, Vereine **lesen** (`org.view`, `teams.view`) — **ohne** Personenstamm
- Mitteilungen **lesen**, wo `communication.club.view` (kein Senden)
- Posteingang **lesen** und auf **eigene** Konversationen **antworten**
- Infoboard-**Vorschau** (wenn technisch freigegeben — siehe Keys)
- Veröffentlichte Inhalte extern: `https://www.fcallschwil.ch` (öffentliche Website, nicht Admin-CMS)

---

## Persönliche Handlungen (explizit)

- Mein Konto (`/dashboard/account`)
- Meine Aufgaben / persönliche Anforderungen / Mitwirkung (personal-actions Domain)
- Benachrichtigungen
- Workspace-Dokumente mit expliziter Freigabe

---

## Verbotene Handlungen

- Jegliche **operative Planungs-Mutation** (Allocations, Reschedule, Event/Training CRUD)
- **Personen** einsehen (`people.view` nicht zuweisen)
- Registrierungen, Admin, Rollen, Einladungen, Facilities-Manage
- Kommunikation: Kampagnen, Massenversand, Zielgruppen, Absender, Inbox-Administration
- CMS: News/Seiten erstellen, bearbeiten, publizieren
- Infoboard: Boards anlegen/löschen/Konfiguration

---

## Technische Umsetzung — **bestehende** Permission-Keys (Vorschlag)

| Key | Verwendung |
|-----|------------|
| `trainings.view` | Wochenplaner + Trainings read |
| `events.view` | Spiele/Events read |
| `seasons.view` | Saisonkontext |
| `teams.view` | Teambezug |
| `org.view` | Organisation read (kein `org.manage`) |
| `facilities.view` | Ressourcenlabels in Planung |
| `communication.inbox.view` | Posteingang |
| `communication.inbox.reply` | Antworten |
| `communication.club.view` | Mitteilungen lesen (ohne `communication.club.send`) |
| `workspace.view` | Dokumente (ACL) |

**Optional / mit Vorsicht:**

| Key | Risiko |
|-----|--------|
| `events.publish_infoboard` | Öffnet Infoboard-Admin+Preview laut Nav; Metadaten „anzeigen“, technisch Publish-Familie — **nur** wenn Preview ohne Manage akzeptiert |

**Nicht zuweisen:** `events.manage`, `trainings.manage`, `wochenplan.manage`, `people.view`, `people.*`, `news.manage`, `website.manage`, `infoboard.manage`, `communication.club.send`, `users.manage_memberships`, `tasks.manage`, `tasks.view_all`, …

---

## Permission-Lücken

1. **Kein `news.view` / `website.view`** — Publizieren read-only **in der App nicht möglich** ohne Manage-Keys.
2. **Infoboard read-only** nicht sauber von `infoboard.manage` getrennt; `events.publish_infoboard` zu breit interpretierbar.
3. **`viewer`-Seed-Rolle** enthält `people.view` — **nicht** für Patrick übernehmen.
4. **Vereinsleitung-Navigation** (Meetings, Finanzen, Material) ohne Permission-Filter → **jeder** eingeloggte Club-User sieht Nav; Finanzen/Material sind **Demo-MOCK** — direkte URL erreichbar.

---

## Feature-Ausschlüsse

- Alle `FutureModuleShell`-Module (Mitglieder, Helfereinsätze, …)
- Demo-Seiten `/vereinsleitung/finanzen`, `/material`, `/prozesse` (MOCK)
- Website-CMS komplett
- Kampagnen & Zielgruppen

---

## Vorgeschlagene **neue** Keys (noch nicht implementiert)

| Key (Vorschlag) | Zweck |
|-----------------|-------|
| `news.view` | Veröffentlichte News/Preview read-only |
| `website.view` | Seiten/Preview read-only |
| `infoboard.view` | Preview ohne Manage/Publish |
| `planning.allocations.view` | Planung read ohne Manage-Fallbacks |
