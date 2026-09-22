/**
 * Canonical subject Person → authorised responder User ids (self + guardians).
 * Shared by participation responses, Requirements, and notifications.
 *
 * Future CHILD-PRIVACY-01 verified/active guardian filtering should apply here centrally.
 */

export type SubjectPersonResponderFields = {
  userId: string | null;
  guardianRelationshipsAsChild: ReadonlyArray<{
    guardianPerson: { userId: string | null };
  }>;
};

export function collectUserIdsAuthorizedToRespondForSubjectPerson(
  person: SubjectPersonResponderFields,
): string[] {
  const userIds = new Set<string>();
  if (person.userId) {
    userIds.add(person.userId);
  }
  for (const link of person.guardianRelationshipsAsChild) {
    const guardianUserId = link.guardianPerson.userId;
    if (guardianUserId) {
      userIds.add(guardianUserId);
    }
  }
  return [...userIds];
}

export function isGuardianResponderUser(
  responderUserId: string,
  subjectSelfUserId: string | null,
): boolean {
  return responderUserId !== subjectSelfUserId;
}
