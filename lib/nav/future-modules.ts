import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  HandHelping,
  ListChecks,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import type { FutureModuleCapability } from "@/components/admin/future-modules/FutureModuleShell";

export const FUTURE_MODULE_PERMISSION_KEYS_NOTE =
  "Tenant Club Admins and platform user administrators via TENANT_ADMINISTRATION_PERMISSIONS";

export const MITGLIEDER_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Interessenten & Probetraining",
    description: "Interessierte Personen und Probetraining-Anfragen strukturiert aufnehmen.",
    icon: UserPlus,
  },
  {
    title: "Mitgliedsanträge",
    description: "Anträge erfassen, prüfen und in den Freigabeprozess überführen.",
    icon: ClipboardList,
  },
  {
    title: "Aktive Mitgliedschaften",
    description: "Laufende Mitgliedschaften und Status im Verein nachverfolgen.",
    icon: UsersRound,
  },
  {
    title: "Team- & Vereinszuordnung",
    description: "Mitgliedschaften mit Teams und Vereinsstrukturen verknüpfen.",
    icon: Users,
  },
  {
    title: "Austritte / Vereinswechsel",
    description: "Austritte und Wechsel sauber dokumentieren und abschliessen.",
    icon: ArrowRightLeft,
  },
  {
    title: "Mitgliederdokumente",
    description: "Mitgliedschaftsbezogene Dokumente zentral verfügbar halten.",
    icon: FileText,
  },
];

export const AUFGABEN_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Meine Aufgaben",
    description: "Persönliche Verantwortlichkeiten und offene Punkte im Überblick.",
    icon: ListChecks,
  },
  {
    title: "Team-/Bereichsaufgaben",
    description: "Aufgaben nach Team, Funktion oder Bereich strukturieren.",
    icon: Users,
  },
  {
    title: "Fälligkeiten",
    description: "Termine und Fristen für Verantwortliche sichtbar machen.",
    icon: CalendarClock,
  },
  {
    title: "Verantwortliche",
    description: "Klare Zuordnung, wer eine Aufgabe bearbeitet oder freigibt.",
    icon: UserCheck,
  },
  {
    title: "Aufgaben aus Anmeldungen",
    description: "Follow-ups aus Anmeldungsprozessen als Aufgaben weiterführen.",
    icon: ClipboardList,
  },
  {
    title: "Aufgaben aus Planung",
    description: "Operative Punkte aus Training, Spielen und Veranstaltungen verbinden.",
    icon: CalendarClock,
  },
  {
    title: "Aufgaben aus Meetings",
    description: "Beschlüsse und Vereinbarungen aus Sitzungen in Aufgaben überführen.",
    icon: ListChecks,
  },
  {
    title: "Erledigte Aufgaben",
    description: "Abgeschlossene Aufgaben nachvollziehbar archivieren.",
    icon: ClipboardCheck,
  },
];

export const HELFEREINSAETZE_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Einsatzplanung",
    description: "Helfereinsätze für Turniere, Events und Vereinsbetrieb planen.",
    icon: CalendarClock,
  },
  {
    title: "Helferschichten",
    description: "Schichten mit Zeiten, Rollen und Verantwortlichkeiten strukturieren.",
    icon: Users,
  },
  {
    title: "Offene Einsätze",
    description: "Noch nicht besetzte Einsätze für Freiwillige sichtbar machen.",
    icon: HandHelping,
  },
  {
    title: "Zu-/Absagen",
    description: "Zusagen und Absagen einfach erfassen und nachverfolgen.",
    icon: UserCheck,
  },
  {
    title: "Erinnerungen",
    description: "Freiwillige rechtzeitig an bevorstehende Einsätze erinnern.",
    icon: CalendarClock,
  },
  {
    title: "Einsatzübersicht",
    description: "Alle Einsätze mit Status und Besetzung im Überblick halten.",
    icon: ClipboardList,
  },
];

export const TRAINER_STAFF_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Trainerprofile",
    description: "Trainer- und Staffprofile mit Rollen und Kontext im Verein führen.",
    icon: BadgeCheck,
  },
  {
    title: "Qualifikationen & Lizenzen",
    description: "Nachweise und Qualifikationen strukturiert dokumentieren.",
    icon: FileCheck2,
  },
  {
    title: "Verfügbarkeit",
    description: "Verfügbarkeiten für Planung und Einsatzplanung berücksichtigen.",
    icon: CalendarClock,
  },
  {
    title: "Teamzuordnungen",
    description: "Trainer und Staff mit Teams und Funktionen verknüpfen.",
    icon: Users,
  },
  {
    title: "Verträge / Vereinbarungen",
    description: "Vereinbarungen und Laufzeiten nachvollziehbar ablegen.",
    icon: FileText,
  },
  {
    title: "Ablaufende Nachweise",
    description: "Bald ablaufende Lizenzen und Nachweise frühzeitig erkennen.",
    icon: ClipboardCheck,
  },
];

export const FORMULARE_FREIGABEN_CAPABILITIES: FutureModuleCapability[] = [
  {
    title: "Formulare",
    description: "Anfragen, Anträge und Erklärungen zentral bereitstellen.",
    icon: ClipboardList,
  },
  {
    title: "Freigaben",
    description: "Genehmigungen und Freigaben mit klaren Zuständigkeiten steuern.",
    icon: FileCheck2,
  },
  {
    title: "Einwilligungen",
    description: "Einwilligungen und Zustimmungen nachvollziehbar erfassen.",
    icon: UserCheck,
  },
  {
    title: "Unterschriften",
    description: "Unterschriftsprozesse vorbereiten — ohne Anspruch auf rechtsgültige E-Signatur.",
    icon: ClipboardCheck,
  },
  {
    title: "Anträge",
    description: "Eingereichte Anträge mit Status und Verantwortlichen verfolgen.",
    icon: FileText,
  },
  {
    title: "Status & Verlauf",
    description: "Jeden Schritt von Einreichung bis Abschluss dokumentieren.",
    icon: ListChecks,
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
    icon: ClipboardList,
  },
  {
    title: "Massnahmen",
    description: "Vereinbarte Massnahmen und nächste Schritte festhalten.",
    icon: FileCheck2,
  },
  {
    title: "Zuständigkeiten",
    description: "Verantwortliche Personen und Gremien transparent zuordnen.",
    icon: UserCheck,
  },
  {
    title: "Dokumentation",
    description: "Sachliche Dokumentation für interne Nachverfolgung sicherstellen.",
    icon: FileText,
  },
  {
    title: "Abschluss / Verlauf",
    description: "Fälle kontrolliert abschliessen und den Verlauf nachvollziehen.",
    icon: ListChecks,
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
