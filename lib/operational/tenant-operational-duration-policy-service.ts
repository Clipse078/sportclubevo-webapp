import { prisma } from "@/lib/db/prisma";
import {
  mapTenantOperationalDurationPolicyRow,
  type TenantOperationalDurationPolicyResolved,
} from "./map-tenant-operational-duration-policy";
import { validateTenantOperationalDurationMinutes } from "./validation";

export type {
  OperationalDurationFieldResolved,
  TenantOperationalDurationPolicyResolved,
} from "./map-tenant-operational-duration-policy";

export { mapTenantOperationalDurationPolicyRow, tenantOperationalPolicyToDefaultDurationsMinutes } from "./map-tenant-operational-duration-policy";

export async function getTenantOperationalDurationPolicy(
  tenantId: string,
): Promise<TenantOperationalDurationPolicyResolved> {
  const row = await prisma.tenantMatchOperationalPolicy.findUnique({
    where: { tenantId },
    select: {
      defaultMatchDurationMinutes: true,
      defaultTrainingDurationMinutes: true,
      defaultTournamentDurationMinutes: true,
    },
  });
  return mapTenantOperationalDurationPolicyRow(row);
}

export type UpsertTenantOperationalDurationPolicyInput = {
  defaultMatchDurationMinutes: number;
  defaultTrainingDurationMinutes: number;
  defaultTournamentDurationMinutes: number;
};

export async function upsertTenantOperationalDurationPolicy(
  tenantId: string,
  input: UpsertTenantOperationalDurationPolicyInput,
): Promise<TenantOperationalDurationPolicyResolved> {
  const defaultMatchDurationMinutes = validateTenantOperationalDurationMinutes(
    input.defaultMatchDurationMinutes,
    "defaultMatchDurationMinutes",
  );
  const defaultTrainingDurationMinutes = validateTenantOperationalDurationMinutes(
    input.defaultTrainingDurationMinutes,
    "defaultTrainingDurationMinutes",
  );
  const defaultTournamentDurationMinutes = validateTenantOperationalDurationMinutes(
    input.defaultTournamentDurationMinutes,
    "defaultTournamentDurationMinutes",
  );

  const row = await prisma.tenantMatchOperationalPolicy.upsert({
    where: { tenantId },
    create: {
      tenantId,
      defaultMatchDurationMinutes,
      defaultTrainingDurationMinutes,
      defaultTournamentDurationMinutes,
    },
    update: {
      defaultMatchDurationMinutes,
      defaultTrainingDurationMinutes,
      defaultTournamentDurationMinutes,
    },
    select: {
      defaultMatchDurationMinutes: true,
      defaultTrainingDurationMinutes: true,
      defaultTournamentDurationMinutes: true,
    },
  });
  return mapTenantOperationalDurationPolicyRow(row);
}
