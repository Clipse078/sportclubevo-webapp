/** Client-safe member search for Meldung assignee pickers. */

import type { ClubMeldungAssignMemberOption } from "./assign-lookup";

export const CLUB_MELDUNG_ASSIGN_MEMBER_INITIAL_LIMIT = 12;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function displayNameSortKey(member: ClubMeldungAssignMemberOption): string {
  const full = `${member.lastName} ${member.firstName}`.trim().toLowerCase();
  return full || member.id;
}

export function sortClubMeldungAssignMembers(
  members: ClubMeldungAssignMemberOption[],
): ClubMeldungAssignMemberOption[] {
  return [...members].sort((left, right) =>
    displayNameSortKey(left).localeCompare(displayNameSortKey(right), "de"),
  );
}

export function listInitialClubMeldungAssignMembers(
  members: ClubMeldungAssignMemberOption[],
  limit = CLUB_MELDUNG_ASSIGN_MEMBER_INITIAL_LIMIT,
): ClubMeldungAssignMemberOption[] {
  return sortClubMeldungAssignMembers(members).slice(0, limit);
}

export function matchesClubMeldungAssignMemberSearch(
  member: ClubMeldungAssignMemberOption,
  query: string,
): boolean {
  const q = normalize(query);
  if (q.length === 0) return true;

  const firstName = normalize(member.firstName);
  const lastName = normalize(member.lastName);
  const fullName = `${firstName} ${lastName}`.trim();

  const fields = [firstName, lastName, fullName];
  return fields.some((field) => field.length > 0 && field.includes(q));
}

export function filterClubMeldungAssignMembersBySearch(
  members: ClubMeldungAssignMemberOption[],
  query: string,
  limit = CLUB_MELDUNG_ASSIGN_MEMBER_INITIAL_LIMIT,
): ClubMeldungAssignMemberOption[] {
  const q = query.trim();
  if (!q) {
    return listInitialClubMeldungAssignMembers(members, limit);
  }
  return sortClubMeldungAssignMembers(
    members.filter((member) => matchesClubMeldungAssignMemberSearch(member, q)),
  ).slice(0, limit);
}