# SCE-FINANCE-04C-05 — Rolling Forecast Workspace UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-05 workspace integration |
| **Status** | **04C-05R5** layout consolidation ready for final PO UAT (Michael); R4 lifecycle preserved |
| **Route** | `/dashboard/finance/forecast` |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |

## Workspace hierarchy

1. **Context strip** — Finanzjahr, Währung, Speicherstatus der Kontenbearbeitung  
2. **Aktuelle Prognose** — Metadaten, integrierte Summen (Ganzzahl-Währung), **Neue Prognose festhalten** (nur `finance.forecast.manage`)  
3. **Prognoseentwicklung** — Revisionsverlauf-Chart + kompakte Revisionsübersicht (FIN-04C-05R2)  
4. **Veränderung seit letzter Prognose** — Bewegung + Treiber (FIN-04C-05R2)  
5. **Gegen genehmigtes Budget** — Baseline-Vergleich + Treiber (FIN-04C-05R2)  
6. **Kontenbearbeitung** — bestehende FIN-04A-Tabelle (weiter editierbar nach Formalisierung)  
7. **Automatische Prognose** — FIN-04B (Aktualisieren / Übernehmen), visuell getrennt von Formalisierung  

Details: `docs/finance/SCE-FINANCE-04C-05R2-VISUAL-INTELLIGENCE.md`

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

## FIN-04C-05R4 — Formalization preview state fix

| Field | Value |
| --- | --- |
| **Symptom (PO UAT)** | Vorschau-Inhalt erscheint korrekt, aber **Vorschau wird geladen …** bleibt sichtbar und **Prognose festhalten** bleibt deaktiviert. |
| **Root cause** | `useTransition`-Pending für die Vorschau wurde über ein `useEffect` getriggert, dessen `loadPreview`-Callback bei **jeder Bezeichnung-Eingabe** und bei instabilem `t` neu erzeugt wurde → dauernd neue Preview-Requests, `previewPending` praktisch nie `false` trotz bereits gerenderter Vorschau. |
| **Lifecycle** | Explizit: `idle` → `loading_preview` → `preview_ready` \| `preview_error` → `submitting` (`formal-reforecast-preview-lifecycle.ts`). |
| **Stale requests** | Monoton steigende Request-Seq + `pendingInputKey` im Reducer; späte Antworten überschreiben neuere Eingaben nicht. |
| **CTA** | **Prognose festhalten** nur bei `preview_ready`, passendem `loadedInputKey`, ohne Preview-Fehler, nicht während Submit. |
| **Errors** | Preview-Fehler: **Die Vorschau konnte nicht geladen werden.** + **Erneut versuchen**; kein endloses Loading. |
| **Tests** | `finance-04c-05r4-formal-reforecast-preview-lifecycle.test.ts`, `FinanceFormalReforecastDialog.preview-state.test.tsx`. |

## FIN-04C-05R5 — Workspace layout consolidation (PO feedback)

| Area | Change |
| --- | --- |
| **PO UAT (R4)** | Formalization preview lifecycle **PASS** — amounts, CTA, submit unchanged. |
| **Workspace** | Current forecast, revision intelligence, change vs previous, and budget comparison share **one** rolling-forecast surface with subsection rhythm (typography + dividers), not stacked independent cards. |
| **Revision density** | Prognoseentwicklung + Revisionsübersicht remain one integrated block with compact timeline and list. |
| **Zero change** | When headline income/expense/result deltas are all zero, show quiet copy and **no** empty “Grösste Veränderungen” driver block. |
| **Budget comparison** | Same analytical rhythm; reduced padding; no nested dark title bars. |
| **Automatic forecast** | Compact primary/secondary metadata lines; summary + 2-column visual grid; account detail embedded in the same section. |
| **Formal reforecast dialog** | Compact body; desktop fits without forced inner scroll at normal viewport; `max-md` overflow fallback retained. |
| **R4 lifecycle** | Preview reducer, stale seq, blur-only label refresh, submit guard — **unchanged** (see R4 section). |

Tests: `finance-04c-05r5-workspace-layout-consolidation.test.ts`, existing FIN-04C / R4 suites.

## PO UAT prerequisites

1. Guarded STAGE migration applied and verified.  
2. Bestehende FIN-04B UAT-Daten unverändert.  
3. Michael löst **Neue Prognose festhalten** manuell aus (kein Auto-v3 in Migration/Cursor).
