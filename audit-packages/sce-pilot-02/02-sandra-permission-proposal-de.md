# Sandra Fischer — Rechte-Vorschlag (Genehmigung)

**E-Mail:** spielbetrieb@fcallschwil.ch  
**Vorgeschlagene Rolle (neu, tenant-scoped):** **Spielbetrieb Koordinatorin** (Arbeitsname; noch nicht angelegt)

---

## Sichtbare Module (Zielbild)

| Domäne | Sichtbar | Zweck |
|--------|----------|-------|
| Dashboard | Ja | Operativer Einstieg, persönliche Widgets |
| Planung → **Wochenplaner** | Ja | Platz-/Garderoben-Zuteilungen, Konflikte, Verfügbarkeit |
| Planung → Trainings / Spiele / Turniere / Veranstaltungen | **Nein** (Navigation) | Nur Wochenplaner; andere Planungs-Center ausblenden |
| Aufgaben | Ja (persönlich) | Eigene Aufgaben & Mitwirkung |
| Kommunikation → Posteingang | Ja | Empfangene/addressierte Kommunikation |
| Dokumente (Workspace) | Ja | Geteilte Dokumente (kein Mandanten-Management) |
| Club → Organisation (read) | Optional eingeschränkt | Team-/Strukturkontext für Planung |
| News / Publizieren / Infoboard CMS | **Nein** | Kein Redaktions-/Publish-Zugang |
| Administration | **Nein** | |

---

## Erlaubte Handlungen

### Spielbetrieb / Zuteilungen
- Wochenplan einsehen (Kalenderwoche, Teams, Ressourcen, **Konfliktanzeige**)
- **Platz-/Halle-Zuteilungen** für Training, Spiel, Turnier setzen, ändern, entfernen (Weekplanner-Overrides)
- **Garderoben-Zuteilungen** (Heim/Auswärts/participant) setzen, ändern, entfernen
- Verfügbarkeit und Belegung für Planungsfenster abfragen (inkl. occupancy buffers)
- Bestehende Konflikt-/Sicherheitsregeln der Planungs-APIs bleiben aktiv (Server validiert)

### Persönlich (explizit)
- **Mein Konto** verwalten (`/dashboard/account`)
- **Meine Aufgaben** / persönliche Mitwirkung (ohne club-weites Aufgabenmanagement)
- **Eigene Anforderungen** beantworten, sofern als Empfängerin verknüpft
- **Posteingang:** Konversationen lesen und **antworten** (kein Bulk, keine Mailbox-Administration)
- **Benachrichtigungen** gemäss Kontoeinstellungen
- **Dokumente**, die explizit freigegeben sind (Workspace-ACL, nicht mandantenweit)

---

## Verbotene Handlungen

- Events/Spiele/Turniere/Veranstaltungen **anlegen, löschen, verschieben, Teams/Inhalte bearbeiten**
- Trainings **serienweise verwalten** (Erstellen, Umplanen, Freigabe-Workflows)
- **Wochenplan veröffentlichen** / Sichtbarkeit von Spielen auf Website/Infoboard steuern (Publication)
- **Stammdaten** Anlagen/Ressourcen (`facilities.manage`)
- **Personen**, Finanzen, Gesundheit, Entwicklung, Admin, Rollen, Einladungen
- Kommunikation: **Kampagnen**, Massenversand, Zielgruppen, Absender-Konfiguration
- News/Website/Infoboard **redigieren oder publizieren**

---

## Daten-/Record-Scope

- Mandant: **FC Allschwil** (`tenantKey`: `fc-allschwil`)
- Planung: tenant-weite **Lese**-Sicht wo durch `events.view` / `trainings.view` vorgesehen; **Schreiben** nur für Zuteilungs-Endpunkte (siehe Lücken)
- Aufgaben: nur **eigene/zugewiesene** bzw. participation — nicht `tasks.view_all`
- Personen: **kein** `people.view`
- Dokumente: effektiver Zugriff nur über **Freigaben** trotz `workspace.view`

---

## Technische Umsetzung — **bestehende** Permission-Keys (Vorschlag)

| Key | Verwendung |
|-----|------------|
| `trainings.view` | Wochenplaner lesen, Verfügbarkeit |
| `trainings.manage` | **Problem:** authorisiert auch TrainingCenter-Schreiben (siehe Lücken) |
| `events.view` | Spiele im Planungskontext lesen |
| `wochenplan.manage` | Legacy-Spiel-Zuteilung `PATCH /api/wochenplan/[eventId]/allocation`; **Problem:** auch `/api/wochenplan/publish` |
| `facilities.view` | Ressourcenlisten für Selector |
| `seasons.view` | Saisonkontext in Planung |
| `teams.view` | Teamfilter |
| `communication.inbox.view` | Posteingang lesen |
| `communication.inbox.reply` | Antworten |
| `workspace.view` | Dokumente-Hub (ACL-gestützt) |

**Nicht zuweisen:** `events.manage`, `facilities.manage`, `tasks.manage`, `tasks.view_all`, `news.manage`, `website.manage`, `infoboard.manage`, `users.manage_memberships`, `communication.club.send`, …

---

## Permission-Lücken (keine Substitution durch breitere Rolle)

1. **`trainings.manage` ist nicht allocation-only** — erlaubt u.a. `/api/training-sessions/*/reschedule`, Serien-Submit, TrainingCenter-UI (`TRAININGS_MANAGE` auf zahlreichen APIs).
2. **`wochenplan.manage` ist nicht allocation-only** — erlaubt Bulk-`wochenplanVisible` via `POST /api/wochenplan/publish`.
3. **Spiele-Detail-Zuteilung** erfordert `events.manage` in UI (`canManageMappings`); Sandra soll ohne `events.manage` im **Wochenplaner** arbeiten.
4. **Kein dedizierter `planning.allocations.*` Key** in `lib/permissions/permissions.ts` / DB-Seed.

**Empfehlung bis Implementierung:** Rolle **noch nicht** mit `trainings.manage` + `wochenplan.manage` produktiv zuweisen, wenn die Genehmigung strikt allocation-only ist — erst nach Key-Split oder serverseitiger Policy-Ergänzung.

---

## Feature-Ausschlüsse (Navigation/Widgets)

- Ausblenden via fehlende Permissions: Admin, CMS, Kampagnen, Zielgruppen, Mitglieder-Shells, Demo-Vereinsleitung-Finanzen/Material
- Planung-Nav: nur Wochenplaner-Zeile sichtbar lassen → erfordert **nicht** `events.manage`; TrainingCenter/Spiele ausblenden wenn Keys fehlen **oder** nach Key-Split
- Dashboard-Quick-Actions: nur Einträge mit passenden `permissionKeys` (bestehender Katalog)

---

## Vorgeschlagene **neue** Keys (noch nicht implementiert)

| Key (Vorschlag) | Zweck |
|-----------------|-------|
| `planning.allocations.view` | Planung lesen ohne Event-/Training-Manage |
| `planning.allocations.manage` | POST/PATCH/DELETE Allocations ohne Serien/Event-Manage |
| `wochenplan.publication.manage` | Optional: Publish-Bar von Allocation trennen |
