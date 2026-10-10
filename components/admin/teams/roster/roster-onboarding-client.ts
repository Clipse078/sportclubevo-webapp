"use client";

import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import type { RosterPersonOnboardingContext } from "@/lib/teams/roster-onboarding-queries";

export async function fetchRosterPersonContext(input: {
  teamId: string;
  teamSeasonId: string;
  personId: string;
}): Promise<RosterPersonOnboardingContext> {
  const url =
    `/api/teams/${input.teamId}/team-seasons/${input.teamSeasonId}` +
    `/roster-onboarding/person-context?personId=${encodeURIComponent(input.personId)}`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "Personenkontext konnte nicht geladen werden.");
  }

  return data as RosterPersonOnboardingContext;
}

export async function enablePersonCapacity(input: {
  personId: string;
  capacity: "player" | "trainer";
}): Promise<PersonPickerResult> {
  const getResponse = await fetch(`/api/people/${input.personId}`, { cache: "no-store" });
  const getData = await getResponse.json().catch(() => null);
  if (!getResponse.ok || !getData?.person) {
    throw new Error(getData?.error ?? "Person konnte nicht geladen werden.");
  }

  const person = getData.person as Record<string, unknown>;

  const putResponse = await fetch(`/api/people/${input.personId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName ?? "",
      email: person.email ?? "",
      phone: person.phone ?? "",
      notes: person.notes ?? "",
      dateOfBirth: person.dateOfBirth
        ? String(person.dateOfBirth).slice(0, 10)
        : "",
      isActive: person.isActive !== false,
      isPlayer: input.capacity === "player" ? true : person.isPlayer === true,
      isTrainer: input.capacity === "trainer" ? true : person.isTrainer === true,
      isFunctionary: person.isFunctionary === true,
      isVolunteer: person.isVolunteer === true,
      isReferee: person.isReferee === true,
      isSponsorContact: person.isSponsorContact === true,
      customFunctions: person.customFunctions ?? [],
    }),
  });

  const putData = await putResponse.json().catch(() => null);
  if (!putResponse.ok) {
    throw new Error(putData?.error ?? "Kapazität konnte nicht aktualisiert werden.");
  }

  const updated = putData.person as PersonPickerResult;
  return {
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    displayName: updated.displayName,
    email: updated.email,
    phone: updated.phone,
    dateOfBirth: updated.dateOfBirth,
    isPlayer: updated.isPlayer,
    isTrainer: updated.isTrainer,
  };
}
