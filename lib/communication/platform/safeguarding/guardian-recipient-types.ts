/**
 * SCE-COMM-18 — guardian recipient structures for safeguarding resolution.
 */

export type SafeguardingGuardianRecipient = {
  guardianPersonId: string;
  guardianUserId: string | null;
  relationshipId: string;
  isPrimary: boolean;
};

export type SubjectSafeguardingPersonContext = {
  subjectPersonId: string;
  dateOfBirth: Date | null;
  selfUserId: string | null;
  guardianRecipients: SafeguardingGuardianRecipient[];
};
