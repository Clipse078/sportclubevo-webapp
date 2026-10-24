# SCE-FINANCE-04C-05 — Rolling Forecast Workspace UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-05 workspace integration |
| **Status** | **COMPLETE** (code); PO UAT depends on STAGE migration `20261024120000_sce_finance_04c_02_forecast_revision_lifecycle` |
| **Route** | `/dashboard/finance/forecast` |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |

## Workspace hierarchy

1. **Context strip** — Finanzjahr, Währung, Speicherstatus der Kontenbearbeitung  
2. **Aktuelle Prognose** — Titel, Datenstand, Bezeichnung, Version (sekundär), **Neue Prognose festhalten** (nur `finance.forecast.manage`)  
3. **Summen** — Prognose-Einnahmen, Prognose-Ausgaben, Prognose-Ergebnis  
4. **Vergleiche** — Aktuelle vs. vorherige Prognose, Grösste Veränderungen, Budget-Kontext (nur genehmigtes Budget)  
5. **Prognoseverlauf** — kompakte Revisionsliste (kein Audit-Log)  
6. **Kontenbearbeitung** — bestehende FIN-04A-Tabelle (weiter editierbar nach Formalisierung)  
7. **Automatische Prognose** — FIN-04B (Aktualisieren / Übernehmen), visuell getrennt von Formalisierung  

## Formalisierung

- Dialog: canonical `Dialog`, Felder **Datenstand** (Pflicht) und **Bezeichnung** (optional).  
- **Kein** separates Actuals-Stichtag-Feld in 04C-05: Server setzt `actualsThroughDate = asOfDate`, wenn nicht explizit übergeben (FIN-04C-03).  
- Vorschau über `previewFormalReforecastAction` — Beträge ändern sich nicht.  
- Erfolg: Dialog schliesst, `router.refresh()`, neuer `currentVersionId` via Page-`key={snapshot?.versionId}`.  
- `STALE_CURRENT`: verständliche Meldung + Refresh, kein Retry.  

## Berechtigungen

| Permission | Verhalten |
| --- | --- |
| `finance.forecast.view` | Prognose, Verlauf, Vergleiche, Automatische Prognose (Lesen) |
| `finance.forecast.manage` | Konten editieren, Formalisieren, Automatische Prognose steuern |

Management-Aktionen werden für View-only nicht als deaktivierte Buttons gezeigt.

## Leere / Fehlerzustände

- Keine frühere Prognose: kompakter Hinweis, kein leeres Panel.  
- Kein genehmigtes Budget: kein Draft, keine Null-Budget-Zeile.  
- Legacy-Revisionen ohne Metadaten: neutrale Titel („Frühere Prognose“, Version), kein erfundener Datenstand.  

## Responsive & Design

- Dark Finance surfaces, Design-System-Dialog, keine Binary-Checkbox-Bestätigung.  
- Tabellen: `min-w-0 overflow-x-auto` wo nötig.  

## 04C-06 boundary

Erweiterte Cutoff-/Reason-UX, revision detail URLs, und feinere Actuals-Exposition bleiben **04C-06**. 04C-05 ist end-to-end nutzbar nach STAGE-Migration.

## PO UAT prerequisites

1. Guarded STAGE migration applied and verified.  
2. Bestehende FIN-04B UAT-Daten unverändert.  
3. Michael löst **Neue Prognose festhalten** manuell aus (kein Auto-v3 in Migration/Cursor).
