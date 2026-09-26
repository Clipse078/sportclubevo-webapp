import { ShieldAlert } from "lucide-react";
import type { FutureModuleCapability } from "@/components/admin/future-modules/FutureModuleShell";

export const FUTURE_MODULE_PERMISSION_KEYS_NOTE =
  "Tenant Club Admins and platform user administrators via TENANT_ADMINISTRATION_PERMISSIONS";

export const MITGLIEDER_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Interessenten & Probetraining",
    description: "Interessierte Personen und Probetraining-Anfragen strukturiert aufnehmen.",
    sceIcon: "invitation",
  },
  {
    title: "Mitgliedsanträge",
    description: "Anträge erfassen, prüfen und in den Freigabeprozess überführen.",
    sceIcon: "invitation",
  },
  {
    title: "Aktive Mitgliedschaften",
    description: "Laufende Mitgliedschaften und Status im Verein nachverfolgen.",
    sceIcon: "member",
  },
  {
    title: "Team- & Vereinszuordnung",
    description: "Mitgliedschaften mit Teams und Vereinsstrukturen verknüpfen.",
    sceIcon: "team-management",
  },
  {
    title: "Austritte / Vereinswechsel",
    description: "Austritte und Wechsel sauber dokumentieren und abschliessen.",
    sceIcon: "member",
  },
  {
    title: "Mitgliederdokumente",
    description: "Mitgliedschaftsbezogene Dokumente zentral verfügbar halten.",
    sceIcon: "documents",
  },
];

export const AUFGABEN_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Meine Aufgaben",
    description: "Persönliche Verantwortlichkeiten und offene Punkte im Überblick.",
    sceIcon: "tasks",
  },
  {
    title: "Team-/Bereichsaufgaben",
    description: "Aufgaben nach Team, Funktion oder Bereich strukturieren.",
    sceIcon: "tasks",
  },
  {
    title: "Fälligkeiten",
    description: "Termine und Fristen für Verantwortliche sichtbar machen.",
    sceIcon: "tasks",
  },
  {
    title: "Verantwortliche",
    description: "Klare Zuordnung, wer eine Aufgabe bearbeitet oder freigibt.",
    sceIcon: "assignment",
  },
  {
    title: "Aufgaben aus Anmeldungen",
    description: "Follow-ups aus Anmeldungsprozessen als Aufgaben weiterführen.",
    sceIcon: "requirements",
  },
  {
    title: "Aufgaben aus Planung",
    description: "Operative Punkte aus Training, Spielen und Veranstaltungen verbinden.",
    sceIcon: "planning",
  },
  {
    title: "Aufgaben aus Meetings",
    description: "Beschlüsse und Vereinbarungen aus Sitzungen in Aufgaben überführen.",
    sceIcon: "committee-board",
  },
  {
    title: "Erledigte Aufgaben",
    description: "Abgeschlossene Aufgaben nachvollziehbar archivieren.",
    sceIcon: "archive",
  },
];

export const HELFEREINSAETZE_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Einsatzplanung",
    description: "Helfereinsätze für Turniere, Events und Vereinsbetrieb planen.",
    sceIcon: "volunteer",
  },
  {
    title: "Helferschichten",
    description: "Schichten mit Zeiten, Rollen und Verantwortlichkeiten strukturieren.",
    sceIcon: "volunteer",
  },
  {
    title: "Offene Einsätze",
    description: "Noch nicht besetzte Einsätze für Freiwillige sichtbar machen.",
    sceIcon: "volunteer",
  },
  {
    title: "Zu-/Absagen",
    description: "Zusagen und Absagen einfach erfassen und nachverfolgen.",
    sceIcon: "volunteer",
  },
  {
    title: "Erinnerungen",
    description: "Freiwillige rechtzeitig an bevorstehende Einsätze erinnern.",
    sceIcon: "notifications",
  },
  {
    title: "Einsatzübersicht",
    description: "Alle Einsätze mit Status und Besetzung im Überblick halten.",
    sceIcon: "volunteer",
  },
];

export const TRAINER_STAFF_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Trainerprofile",
    description: "Trainer- und Staffprofile mit Rollen und Kontext im Verein führen.",
    sceIcon: "coach",
  },
  {
    title: "Qualifikationen & Lizenzen",
    description: "Nachweise und Qualifikationen strukturiert dokumentieren.",
    sceIcon: "documents",
  },
  {
    title: "Verfügbarkeit",
    description: "Verfügbarkeiten für Planung und Einsatzplanung berücksichtigen.",
    sceIcon: "availability",
  },
  {
    title: "Teamzuordnungen",
    description: "Trainer und Staff mit Teams und Funktionen verknüpfen.",
    sceIcon: "team-management",
  },
  {
    title: "Verträge / Vereinbarungen",
    description: "Vereinbarungen und Laufzeiten nachvollziehbar ablegen.",
    sceIcon: "contract",
  },
  {
    title: "Ablaufende Nachweise",
    description: "Bald ablaufende Lizenzen und Nachweise frühzeitig erkennen.",
    sceIcon: "attention",
  },
];

export const FORMULARE_FREIGABEN_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Formulare",
    description: "Anfragen, Anträge und Erklärungen zentral bereitstellen.",
    sceIcon: "form",
  },
  {
    title: "Freigaben",
    description: "Genehmigungen und Freigaben mit klaren Zuständigkeiten steuern.",
    sceIcon: "approval",
  },
  {
    title: "Einwilligungen",
    description: "Einwilligungen und Zustimmungen nachvollziehbar erfassen.",
    sceIcon: "approval",
  },
  {
    title: "Unterschriften",
    description: "Unterschriftsprozesse vorbereiten — ohne Anspruch auf rechtsgültige E-Signatur.",
    sceIcon: "approval",
  },
  {
    title: "Anträge",
    description: "Eingereichte Anträge mit Status und Verantwortlichen verfolgen.",
    sceIcon: "form",
  },
  {
    title: "Status & Verlauf",
    description: "Jeden Schritt von Einreichung bis Abschluss dokumentieren.",
    sceIcon: "workflow",
  },
];

export const VORFAELLE_DISZIPLIN_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Vorfall erfassen",
    description: "Vorfälle strukturiert und diskret aufnehmen.",
    icon: ShieldAlert,
  },
  {
    title: "Fallübersicht",
    description: "Laufende und abgeschlossene Fälle mit klarer Zuständigkeit führen.",
    icon: ShieldAlert,
  },
  {
    title: "Massnahmen",
    description: "Vereinbarte Massnahmen und nächste Schritte festhalten.",
    sceIcon: "workflow",
  },
  {
    title: "Zuständigkeiten",
    description: "Verantwortliche Personen und Gremien transparent zuordnen.",
    sceIcon: "roles-access",
  },
  {
    title: "Dokumentation",
    description: "Sachliche Dokumentation für interne Nachverfolgung sicherstellen.",
    sceIcon: "documents",
  },
  {
    title: "Abschluss / Verlauf",
    description: "Fälle kontrolliert abschliessen und den Verlauf nachvollziehen.",
    sceIcon: "history",
  },
];

export const MITGLIEDER_LIFECYCLE_STEPS = [
  "Interessent",
  "Probetraining",
  "Antrag",
  "Freigabe",
  "Mitglied",
  "Teamzuweisung",
  "Austritt / Wechsel",
];
