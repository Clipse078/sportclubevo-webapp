/** Client-safe member search for Meldung assignee pickers. */

import type { ClubMeldungAssignMemberOption } from "./assign-lookup";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesClubMeldungAssignMemberSearch(
  member: ClubMeldungAssignMemberOption,
  query: string,
): boolean {
  const q = normalize(query);
  if (q.length < 2) return false;

  const firstName = normalize(member.firstName);
  const lastName = normalize(member.lastName);
  const fullName = `${firstName} ${lastName}`.trim();

  const fields = [firstName, lastName, fullName];
  return fields.some((field) => field.length > 0 && field.startsWith(q));
}

export function filterClubMeldungAssignMembersBySearch(
  members: ClubMeldungAssignMemberOption[],
  query: string,
  limit = 12,
): ClubMeldungAssignMemberOption[] {
  const q = query.trim();
  if (q.length < 2) return [];
  return members.filter((member) => matchesClubMeldungAssignMemberSearch(member, q)).slice(0, limit);
}