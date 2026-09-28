/**
 * SCE-COMM-EVO-06 — server-owned Communication Personalisation Field Registry.
 */

import type {
  PersonalisationFieldCategory,
  PersonalisationFieldDefinition,
  PersonalisationMissingPolicyMode,
} from "@/lib/communication/personalisation/types";

function def(
  partial: Omit<PersonalisationFieldDefinition, "allowedMissingPolicies" | "defaultMissingPolicy"> & {
    allowedMissingPolicies?: readonly PersonalisationMissingPolicyMode[];
    defaultMissingPolicy?: PersonalisationMissingPolicyMode;
  },
): PersonalisationFieldDefinition {
  return {
    allowedMissingPolicies: partial.allowedMissingPolicies ?? ["BLANK", "REPLACEMENT"],
    defaultMissingPolicy: partial.defaultMissingPolicy ?? "BLANK",
    ...partial,
  };
}

const RECIPIENT: PersonalisationFieldCategory = "RECIPIENT";
const PLAYER: PersonalisationFieldCategory = "PLAYER_PARENT";
const TEAM: PersonalisationFieldCategory = "TEAM";
const ORG: PersonalisationFieldCategory = "ORGANISATION";
const SEASON: PersonalisationFieldCategory = "SEASON";
const EVENT: PersonalisationFieldCategory = "EVENT";
const LOC: PersonalisationFieldCategory = "LOCATION";
const TRAINING: PersonalisationFieldCategory = "TRAINING";
const MATCH: PersonalisationFieldCategory = "MATCH";
const TOURNAMENT: PersonalisationFieldCategory = "TOURNAMENT";
const PART: PersonalisationFieldCategory = "PARTICIPATION";
const SENDER: PersonalisationFieldCategory = "SENDER";
const DATE: PersonalisationFieldCategory = "DATE";
const LINKS: PersonalisationFieldCategory = "LINKS";

export const COMMUNICATION_PERSONALISATION_FIELDS: PersonalisationFieldDefinition[] = [
  // Recipient (delivery identity)
  def({ key: "first_name", labelDe: "Vorname", category: RECIPIENT, descriptionDe: "Vorname des Empfängers", valueType: "TEXT", implemented: true }),
  def({ key: "last_name", labelDe: "Nachname", category: RECIPIENT, descriptionDe: "Nachname des Empfängers", valueType: "TEXT", implemented: true }),
  def({ key: "full_name", labelDe: "Vollständiger Name", category: RECIPIENT, descriptionDe: "Vollständiger Name des Empfängers", valueType: "TEXT", implemented: true }),
  def({ key: "display_name", labelDe: "Anzeigename", category: RECIPIENT, descriptionDe: "Anzeigename des Empfängers", valueType: "TEXT", implemented: true }),
  def({ key: "email", labelDe: "E-Mail", category: RECIPIENT, descriptionDe: "E-Mail des Empfängers", valueType: "EMAIL", implemented: true, requiresRecipientContactAccess: true }),
  def({ key: "phone", labelDe: "Telefon", category: RECIPIENT, descriptionDe: "Telefon des Empfängers", valueType: "PHONE", implemented: true, requiresRecipientContactAccess: true }),
  def({ key: "preferred_language", labelDe: "Bevorzugte Sprache", category: RECIPIENT, descriptionDe: "Bevorzugte Sprache (Tenant-Locale)", valueType: "TEXT", implemented: false }),

  // Subject / player / child
  def({ key: "player_first_name", labelDe: "Spieler Vorname", category: PLAYER, descriptionDe: "Vorname des Spielers (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "player_last_name", labelDe: "Spieler Nachname", category: PLAYER, descriptionDe: "Nachname des Spielers (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "player_full_name", labelDe: "Spieler Name", category: PLAYER, descriptionDe: "Name des Spielers (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "child_first_name", labelDe: "Kind Vorname", category: PLAYER, descriptionDe: "Vorname des Kindes (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "child_last_name", labelDe: "Kind Nachname", category: PLAYER, descriptionDe: "Nachname des Kindes (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "child_full_name", labelDe: "Kind Name", category: PLAYER, descriptionDe: "Name des Kindes (Betreffperson)", valueType: "TEXT", implemented: true }),
  def({ key: "child_team", labelDe: "Kind Team", category: PLAYER, descriptionDe: "Team des Kindes (nur bei eindeutigem Kontext)", valueType: "TEXT", implemented: true }),

  def({ key: "guardian_first_name", labelDe: "Erziehungsberechtigte/r Vorname", category: PLAYER, descriptionDe: "Vorname der Empfängerperson bei Guardian-Zustellung", valueType: "TEXT", implemented: true }),
  def({ key: "guardian_last_name", labelDe: "Erziehungsberechtigte/r Nachname", category: PLAYER, descriptionDe: "Nachname der Empfängerperson bei Guardian-Zustellung", valueType: "TEXT", implemented: true }),
  def({ key: "guardian_full_name", labelDe: "Erziehungsberechtigte/r Name", category: PLAYER, descriptionDe: "Name der Empfängerperson bei Guardian-Zustellung", valueType: "TEXT", implemented: true }),

  // Team
  def({ key: "context_team", labelDe: "Kontext-Team", category: TEAM, descriptionDe: "Team aus Kommunikationskontext", valueType: "TEXT", implemented: true }),
  def({ key: "team_name", labelDe: "Teamname", category: TEAM, descriptionDe: "Teamname (Kontext)", valueType: "TEXT", implemented: true }),
  def({ key: "team_short_name", labelDe: "Team Kurzname", category: TEAM, descriptionDe: "Kurzname des Kontext-Teams", valueType: "TEXT", implemented: true }),
  def({ key: "team_age_group", labelDe: "Altersklasse", category: TEAM, descriptionDe: "Altersklasse des Teams", valueType: "TEXT", implemented: true }),
  def({ key: "team_gender", labelDe: "Geschlecht", category: TEAM, descriptionDe: "Geschlechtsgruppe des Teams", valueType: "TEXT", implemented: true }),
  def({ key: "team_league", labelDe: "Liga", category: TEAM, descriptionDe: "Liga/Wettkampf (Saison)", valueType: "TEXT", implemented: false }),
  def({ key: "team_head_coach", labelDe: "Cheftrainer/in", category: TEAM, descriptionDe: "Cheftrainer/in", valueType: "TEXT", implemented: false }),
  def({ key: "team_coaches", labelDe: "Trainer/innen", category: TEAM, descriptionDe: "Trainer/innen (Liste)", valueType: "LIST", implemented: false }),
  def({ key: "team_manager", labelDe: "Team-Manager/in", category: TEAM, descriptionDe: "Team-Manager/in", valueType: "TEXT", implemented: false }),
  def({ key: "active_teams", labelDe: "Aktive Teams", category: TEAM, descriptionDe: "Liste aktiver Teams der Betreffperson", valueType: "LIST", implemented: true }),
  def({ key: "active_season_team", labelDe: "Team (aktive Saison)", category: TEAM, descriptionDe: "Nur wenn genau ein aktives Saison-Team", valueType: "TEXT", implemented: true }),

  // Season
  def({ key: "season", labelDe: "Saison", category: SEASON, descriptionDe: "Saisonbezeichnung", valueType: "TEXT", implemented: true }),
  def({ key: "season_name", labelDe: "Saisonname", category: SEASON, descriptionDe: "Saisonname", valueType: "TEXT", implemented: true }),
  def({ key: "season_start", labelDe: "Saisonbeginn", category: SEASON, descriptionDe: "Saisonbeginn", valueType: "DATE", implemented: true }),
  def({ key: "season_end", labelDe: "Saisonende", category: SEASON, descriptionDe: "Saisonende", valueType: "DATE", implemented: true }),

  // Organisation
  def({ key: "club_name", labelDe: "Vereinsname", category: ORG, descriptionDe: "Name des Vereins", valueType: "TEXT", implemented: true }),
  def({ key: "club_short_name", labelDe: "Verein Kurzname", category: ORG, descriptionDe: "Kurzname", valueType: "TEXT", implemented: false }),
  def({ key: "club_email", labelDe: "Vereins-E-Mail", category: ORG, descriptionDe: "Standard E-Mail-Absender", valueType: "EMAIL", implemented: true }),
  def({ key: "club_phone", labelDe: "Vereinstelefon", category: ORG, descriptionDe: "Telefon", valueType: "PHONE", implemented: false }),
  def({ key: "club_website", labelDe: "Vereinswebsite", category: ORG, descriptionDe: "Website", valueType: "URL", implemented: false }),
  def({ key: "club_address", labelDe: "Vereinsadresse", category: ORG, descriptionDe: "Adresse", valueType: "TEXT", implemented: false }),
  def({ key: "org_unit_name", labelDe: "Organisationseinheit", category: ORG, descriptionDe: "Org-Einheit (Kontext)", valueType: "TEXT", implemented: true, requiredContextKinds: ["ORG_UNIT"] }),
  def({ key: "org_unit_lead", labelDe: "Leitung Org-Einheit", category: ORG, descriptionDe: "Leitung", valueType: "TEXT", implemented: false, requiredContextKinds: ["ORG_UNIT"] }),

  // Generic event
  def({ key: "event_name", labelDe: "Event Titel", category: EVENT, descriptionDe: "Titel", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_type", labelDe: "Event Typ", category: EVENT, descriptionDe: "Typ", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_date", labelDe: "Event Datum", category: EVENT, descriptionDe: "Datum", valueType: "DATE", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_start_time", labelDe: "Event Startzeit", category: EVENT, descriptionDe: "Startzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_end_time", labelDe: "Event Endzeit", category: EVENT, descriptionDe: "Endzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_start", labelDe: "Event Start", category: EVENT, descriptionDe: "Start Datum/Zeit", valueType: "DATETIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_end", labelDe: "Event Ende", category: EVENT, descriptionDe: "Ende Datum/Zeit", valueType: "DATETIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_location", labelDe: "Event Ort", category: EVENT, descriptionDe: "Ort (Freitext)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_address", labelDe: "Event Adresse", category: EVENT, descriptionDe: "Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_meeting_time", labelDe: "Treffzeit", category: EVENT, descriptionDe: "Treffzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_meeting_location", labelDe: "Treffpunkt Ort", category: EVENT, descriptionDe: "Treffpunkt", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_team", labelDe: "Event Team", category: EVENT, descriptionDe: "Team des Events", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "event_opponent", labelDe: "Gegner", category: EVENT, descriptionDe: "Gegner", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),

  // Location
  def({ key: "location_name", labelDe: "Ortsname", category: LOC, descriptionDe: "Name/Ort", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_address", labelDe: "Adresse", category: LOC, descriptionDe: "Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_street", labelDe: "Strasse", category: LOC, descriptionDe: "Strasse", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_postcode", labelDe: "PLZ", category: LOC, descriptionDe: "PLZ", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_city", labelDe: "Ort", category: LOC, descriptionDe: "Ort", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_full_address", labelDe: "Vollständige Adresse", category: LOC, descriptionDe: "Formatierte Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_country", labelDe: "Land", category: LOC, descriptionDe: "Land", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "location_maps_link", labelDe: "Kartenlink", category: LOC, descriptionDe: "Google Maps Link", valueType: "URL", implemented: true, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),

  // Facility / pitch
  def({ key: "pitch_name", labelDe: "Platz", category: LOC, descriptionDe: "Ein Platz (nur bei eindeutiger Zuweisung)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "pitch_full_name", labelDe: "Platz (voll)", category: LOC, descriptionDe: "Platzbezeichnung", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "pitch_allocation", labelDe: "Platz-Zuweisung", category: LOC, descriptionDe: "Platz-Zuweisung (eindeutig)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "pitch_allocations", labelDe: "Plätze (Liste)", category: LOC, descriptionDe: "Alle Platz-Zuweisungen", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "dressing_room", labelDe: "Garderobe", category: LOC, descriptionDe: "Garderobe (eindeutig)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "dressing_rooms", labelDe: "Garderoben (Liste)", category: LOC, descriptionDe: "Garderoben", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "meeting_time", labelDe: "Treffzeit", category: EVENT, descriptionDe: "Treffzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "meeting_point", labelDe: "Treffpunkt", category: EVENT, descriptionDe: "Treffpunkt (Freitext)", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLOCK_SEND" }),

  // Training aliases
  def({ key: "training_date", labelDe: "Training Datum", category: TRAINING, descriptionDe: "Training Datum", valueType: "DATE", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_start_time", labelDe: "Training Start", category: TRAINING, descriptionDe: "Start", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_end_time", labelDe: "Training Ende", category: TRAINING, descriptionDe: "Ende", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_location", labelDe: "Training Ort", category: TRAINING, descriptionDe: "Ort", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_address", labelDe: "Training Adresse", category: TRAINING, descriptionDe: "Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_pitch", labelDe: "Training Platz", category: TRAINING, descriptionDe: "Platz", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "training_pitches", labelDe: "Training Plätze", category: TRAINING, descriptionDe: "Plätze", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_dressing_room", labelDe: "Training Garderobe", category: TRAINING, descriptionDe: "Garderobe", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_dressing_rooms", labelDe: "Training Garderoben", category: TRAINING, descriptionDe: "Garderoben", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),
  def({ key: "training_team", labelDe: "Training Team", category: TRAINING, descriptionDe: "Team", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TRAINING"] }),

  // Match aliases
  def({ key: "match_date", labelDe: "Spiel Datum", category: MATCH, descriptionDe: "Datum", valueType: "DATE", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_kickoff", labelDe: "Anpfiff", category: MATCH, descriptionDe: "Anpfiff", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_meeting_time", labelDe: "Spiel Treffzeit", category: MATCH, descriptionDe: "Treffzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_meeting_point", labelDe: "Spiel Treffpunkt", category: MATCH, descriptionDe: "Treffpunkt", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_home_team", labelDe: "Heimteam", category: MATCH, descriptionDe: "Heimteam", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_away_team", labelDe: "Auswärtsteam", category: MATCH, descriptionDe: "Auswärtsteam", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_opponent", labelDe: "Spielgegner", category: MATCH, descriptionDe: "Gegner", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_team", labelDe: "Spiel Team", category: MATCH, descriptionDe: "Eigenes Team", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_location", labelDe: "Spielort", category: MATCH, descriptionDe: "Ort", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_address", labelDe: "Spiel Adresse", category: MATCH, descriptionDe: "Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_pitch", labelDe: "Spiel Platz", category: MATCH, descriptionDe: "Heimplatz (nur Heim)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "match_pitches", labelDe: "Spiel Plätze", category: MATCH, descriptionDe: "Plätze", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_dressing_room", labelDe: "Spiel Garderobe", category: MATCH, descriptionDe: "Heim-Garderobe", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_dressing_rooms", labelDe: "Spiel Garderoben", category: MATCH, descriptionDe: "Garderoben", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_competition", labelDe: "Wettbewerb", category: MATCH, descriptionDe: "Wettbewerb", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),
  def({ key: "match_round", labelDe: "Runde", category: MATCH, descriptionDe: "Runde", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"], requiredEventTypes: ["MATCH"] }),

  // Tournament
  def({ key: "tournament_name", labelDe: "Turnier", category: TOURNAMENT, descriptionDe: "Turniername", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_date", labelDe: "Turnier Datum", category: TOURNAMENT, descriptionDe: "Datum", valueType: "DATE", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_start", labelDe: "Turnier Start", category: TOURNAMENT, descriptionDe: "Start", valueType: "DATETIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_end", labelDe: "Turnier Ende", category: TOURNAMENT, descriptionDe: "Ende", valueType: "DATETIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_location", labelDe: "Turnier Ort", category: TOURNAMENT, descriptionDe: "Ort", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_address", labelDe: "Turnier Adresse", category: TOURNAMENT, descriptionDe: "Adresse", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_pitch", labelDe: "Turnier Platz", category: TOURNAMENT, descriptionDe: "Platz (eindeutig)", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLANK" }),
  def({ key: "tournament_pitches", labelDe: "Turnier Plätze", category: TOURNAMENT, descriptionDe: "Plätze (Liste)", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_dressing_room", labelDe: "Turnier Garderobe", category: TOURNAMENT, descriptionDe: "Garderobe", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_dressing_rooms", labelDe: "Turnier Garderoben", category: TOURNAMENT, descriptionDe: "Garderoben", valueType: "LIST", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_team", labelDe: "Turnier Team", category: TOURNAMENT, descriptionDe: "Team", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_meeting_time", labelDe: "Turnier Treffzeit", category: TOURNAMENT, descriptionDe: "Treffzeit", valueType: "TIME", implemented: true, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),
  def({ key: "tournament_meeting_point", labelDe: "Turnier Treffpunkt", category: TOURNAMENT, descriptionDe: "Treffpunkt", valueType: "TEXT", implemented: false, requiredContextKinds: ["EVENT"], requiredEventTypes: ["TOURNAMENT"] }),

  // Participation
  def({ key: "attendance_status", labelDe: "Teilnahmestatus", category: PART, descriptionDe: "Teilnahme/RSVP Status", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "response_deadline", labelDe: "Antwortfrist", category: PART, descriptionDe: "Antwortfrist", valueType: "DATETIME", implemented: true, requiredContextKinds: ["EVENT"] }),
  def({ key: "registration_deadline", labelDe: "Anmeldefrist", category: PART, descriptionDe: "Anmeldefrist", valueType: "DATETIME", implemented: false, requiredContextKinds: ["EVENT"] }),
  def({ key: "participant_name", labelDe: "Teilnehmername", category: PART, descriptionDe: "Name der Betreffperson", valueType: "TEXT", implemented: true, requiredContextKinds: ["EVENT"] }),

  // Sender
  def({ key: "sender_name", labelDe: "Absendername", category: SENDER, descriptionDe: "Anzeigename des E-Mail-Absenders", valueType: "TEXT", implemented: true }),
  def({ key: "sender_email", labelDe: "Absender-E-Mail", category: SENDER, descriptionDe: "E-Mail-Adresse des Absenders", valueType: "EMAIL", implemented: true }),
  def({ key: "sender_person_name", labelDe: "Sendende Person", category: SENDER, descriptionDe: "Name der sendenden Person", valueType: "TEXT", implemented: true }),
  def({ key: "sender_first_name", labelDe: "Sendende Person Vorname", category: SENDER, descriptionDe: "Vorname der sendenden Person", valueType: "TEXT", implemented: true }),
  def({ key: "sender_last_name", labelDe: "Sendende Person Nachname", category: SENDER, descriptionDe: "Nachname der sendenden Person", valueType: "TEXT", implemented: true }),

  // System / date
  def({ key: "current_date", labelDe: "Heutiges Datum", category: DATE, descriptionDe: "Datum zum Sendezeitpunkt", valueType: "DATE", implemented: true }),
  def({ key: "current_year", labelDe: "Aktuelles Jahr", category: DATE, descriptionDe: "Jahr zum Sendezeitpunkt", valueType: "TEXT", implemented: true }),
  def({ key: "current_season", labelDe: "Aktuelle Saison", category: DATE, descriptionDe: "Aktive Saison des Tenants", valueType: "TEXT", implemented: true }),

  // Links
  def({ key: "communication_link", labelDe: "Mitteilungs-Link", category: LINKS, descriptionDe: "Link zur Mitteilung/Kampagne", valueType: "URL", implemented: true, allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLOCK_SEND" }),
  def({ key: "event_link", labelDe: "Event-Link", category: LINKS, descriptionDe: "Link zum Event", valueType: "URL", implemented: false, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLOCK_SEND" }),
  def({ key: "attendance_link", labelDe: "Teilnahme-Link", category: LINKS, descriptionDe: "Link zur Teilnahme", valueType: "URL", implemented: false, requiredContextKinds: ["EVENT"], allowedMissingPolicies: ["BLANK", "BLOCK_SEND"], defaultMissingPolicy: "BLOCK_SEND" }),
  def({ key: "profile_link", labelDe: "Profil-Link", category: LINKS, descriptionDe: "Profil-Link", valueType: "URL", implemented: false }),
  def({ key: "task_link", labelDe: "Aufgaben-Link", category: LINKS, descriptionDe: "Aufgaben-Link", valueType: "URL", implemented: false }),
];

const FIELD_BY_KEY = new Map(COMMUNICATION_PERSONALISATION_FIELDS.map((f) => [f.key, f]));

export function getPersonalisationFieldDefinition(key: string): PersonalisationFieldDefinition | undefined {
  return FIELD_BY_KEY.get(key);
}

export function listPersonalisationFieldDefinitions(): PersonalisationFieldDefinition[] {
  return COMMUNICATION_PERSONALISATION_FIELDS;
}

export function assertUniquePersonalisationFieldKeys(): void {
  const seen = new Set<string>();
  for (const field of COMMUNICATION_PERSONALISATION_FIELDS) {
    if (seen.has(field.key)) {
      throw new Error(`Duplicate personalisation field key: ${field.key}`);
    }
    seen.add(field.key);
  }
}

assertUniquePersonalisationFieldKeys();
