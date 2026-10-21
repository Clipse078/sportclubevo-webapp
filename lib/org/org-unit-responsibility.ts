/**
 * Authoritative OrgUnit responsibility derivation for Organisation Builder previews.
 *
 * Source of truth: OrgUnitMembership with isPrimary — the same semantics as
 * „Primäres Mitglied“ in OrgMembershipManagementCard. We do not infer responsibility
 * from PersonAssignment, generic membership, or team rosters.
 */

export type OrgUnitMembershipResponsibleInput = {
  id: string;
  isPrimary: boolean;
  roleKey: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
  } | null;
};

export type OrgUnitResponsiblePerson = {
  membershipId: string;
  displayName: string;
  email: string | null;
  roleKey: string | null;
  avatarUserId: string | null;
  avatarPersonId: string | null;
};

export type OrgUnitResponsibilityDerivation = {
  /** Primary memberships only — never inferred from non-primary rows. */
  responsiblePersons: OrgUnitResponsiblePerson[];
  primary: OrgUnitResponsiblePerson | null;
  additionalPrimaryCount: number;
  hasExplicitResponsible: boolean;
};

export function membershipDisplayName(m: OrgUnitMembershipResponsibleInput): string | null {
  if (m.user) return `${m.user.firstName} ${m.user.lastName}`.trim();
  if (m.person) {
    const dn = m.person.displayName?.trim();
    if (dn) return dn;
    return `${m.person.firstName} ${m.person.lastName}`.trim();
  }
  return null;
}

export function membershipContactEmail(m: OrgUnitMembershipResponsibleInput): string | null {
  return m.user?.email ?? m.person?.email ?? null;
}

/**
 * Derives responsible persons from active primary memberships only.
 * Pass memberships that are already filtered to ACTIVE + non-expired.
 */
export function deriveOrgUnitResponsibility(
  memberships: OrgUnitMembershipResponsibleInput[],
): OrgUnitResponsibilityDerivation {
  const primaries = memberships.filter((m) => m.isPrimary);
  const responsiblePersons: OrgUnitResponsiblePerson[] = [];

  for (const m of primaries) {
    const displayName = membershipDisplayName(m);
    if (!displayName) continue;
    responsiblePersons.push({
      membershipId: m.id,
      displayName,
      email: membershipContactEmail(m),
      roleKey: m.roleKey,
      avatarUserId: m.user?.id ?? null,
      avatarPersonId: m.person?.id ?? null,
    });
  }

  const primary = responsiblePersons[0] ?? null;
  const additionalPrimaryCount = Math.max(0, responsiblePersons.length - 1);

  return {
    responsiblePersons,
    primary,
    additionalPrimaryCount,
    hasExplicitResponsible: responsiblePersons.length > 0,
  };
}

export const ORG_UNIT_NO_RESPONSIBLE_LABEL = "Keine verantwortliche Person zugewiesen" as const;
