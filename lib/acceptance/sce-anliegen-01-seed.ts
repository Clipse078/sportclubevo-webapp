/**
 * SCE-ANLIEGEN-01 — synthetic Meldungen fixtures for isolated Acceptance only.
 *
 * Creates PO personas, role grants, and labelled sample cases. Idempotent:
 * existing fixture rows are not overwritten.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import {
  ACCEPTANCE_EMAIL_DOMAIN,
  ACCEPTANCE_FIXTURE,
  assertAcceptanceDatabaseTarget,
} from "@/lib/acceptance/bootstrap";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileMeldungPermissions } from "@/lib/permissions/meldung-permission-reconciliation";

export const SCE_ANLIEGEN_ACCEPTANCE_OPERATION_AUTHORIZATION =
  "sce-anliegen-01-acceptance-seed:acceptance";

const FIXTURE = "sce-acceptance-anliegen-" as const;

export const SCE_ANLIEGEN_ACCEPTANCE_PERSONAS = {
  reporter: {
    id: `${FIXTURE}user-reporter`,
    roleId: `${FIXTURE}role-reporter`,
    email: `meldungen-reporter@${ACCEPTANCE_EMAIL_DOMAIN}`,
    passwordEnv: "ACCEPTANCE_MELDUNGEN_REPORTER_PASSWORD",
    roleKey: `${FIXTURE}role-reporter`,
    permissions: [PERMISSIONS.MELDUNGEN_SUBMIT] as const,
  },
  handler: {
    id: `${FIXTURE}user-handler`,
    roleId: `${FIXTURE}role-handler`,
    email: `meldungen-handler@${ACCEPTANCE_EMAIL_DOMAIN}`,
    passwordEnv: "ACCEPTANCE_MELDUNGEN_HANDLER_PASSWORD",
    roleKey: `${FIXTURE}role-handler`,
    permissions: [PERMISSIONS.MELDUNGEN_HANDLE] as const,
  },
  observer: {
    id: `${FIXTURE}user-observer`,
    roleId: `${FIXTURE}role-observer`,
    email: `meldungen-observer@${ACCEPTANCE_EMAIL_DOMAIN}`,
    passwordEnv: "ACCEPTANCE_MELDUNGEN_OBSERVER_PASSWORD",
    roleKey: `${FIXTURE}role-observer`,
    permissions: [PERMISSIONS.MELDUNGEN_VIEW_ALL] as const,
  },
  operator: {
    id: `${FIXTURE}user-operator`,
    roleId: `${FIXTURE}role-operator`,
    email: `meldungen-operator@${ACCEPTANCE_EMAIL_DOMAIN}`,
    passwordEnv: "ACCEPTANCE_MELDUNGEN_OPERATOR_PASSWORD",
    roleKey: `${FIXTURE}role-operator`,
    permissions: [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.MELDUNGEN_VIEW_ALL] as const,
  },
} as const;

export type SceAnliegenAcceptancePasswordEnv =
  (typeof SCE_ANLIEGEN_ACCEPTANCE_PERSONAS)[keyof typeof SCE_ANLIEGEN_ACCEPTANCE_PERSONAS]["passwordEnv"];

export type SceAnliegenAcceptancePasswords = Record<SceAnliegenAcceptancePasswordEnv, string>;

export const SCE_ANLIEGEN_ACCEPTANCE_CASE_IDS = {
  waterDamage: `${FIXTURE}meldung-water-damage`,
  assigned: `${FIXTURE}meldung-assigned`,
  waiting: `${FIXTURE}meldung-waiting`,
  resolved: `${FIXTURE}meldung-resolved`,
} as const;

export function readSceAnliegenAcceptancePasswords(
  env: NodeJS.ProcessEnv,
): SceAnliegenAcceptancePasswords {
  const result = {} as SceAnliegenAcceptancePasswords;
  for (const persona of Object.values(SCE_ANLIEGEN_ACCEPTANCE_PERSONAS)) {
    const password = env[persona.passwordEnv]?.trim() ?? "";
    if (password.length < 12) {
      throw new Error(`${persona.passwordEnv} must be set (min 12 characters).`);
    }
    result[persona.passwordEnv] = password;
  }
  return result;
}

export function assertSceAnliegenAcceptanceSeedEnvironment(
  env: NodeJS.ProcessEnv,
): { databaseUrl: string } {
  if (env.SCE_OPERATION_AUTHORIZATION !== SCE_ANLIEGEN_ACCEPTANCE_OPERATION_AUTHORIZATION) {
    throw new Error("Missing SCE_OPERATION_AUTHORIZATION for Anliegen acceptance seed.");
  }
  if (
    env.APP_ENV?.trim().toLowerCase() !== "acceptance" ||
    env.VERCEL_TARGET_ENV?.trim().toLowerCase() !== "acceptance" ||
    env.NODE_ENV !== "production"
  ) {
    throw new Error(
      "Anliegen acceptance seed requires APP_ENV=acceptance, VERCEL_TARGET_ENV=acceptance, NODE_ENV=production.",
    );
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  const expectedHost = env.ACCEPTANCE_DATABASE_HOST?.trim().toLowerCase();
  if (!databaseUrl || !expectedHost) {
    throw new Error("DATABASE_URL and ACCEPTANCE_DATABASE_HOST are required.");
  }
  assertAcceptanceDatabaseTarget(databaseUrl, [expectedHost]);
  return { databaseUrl };
}

async function ensurePermissionId(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<string> {
  const row = await tx.permission.findUnique({ where: { key }, select: { id: true } });
  if (!row) {
    throw new Error(`Permission ${key} is missing; run sync-meldung-permissions first.`);
  }
  return row.id;
}

async function ensureRole(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    key: string;
    name: string;
    tenantId: string;
    permissionKeys: readonly string[];
  },
): Promise<string> {
  const role =
    (await tx.role.findUnique({ where: { id: input.id } })) ??
    (await tx.role.create({
      data: {
        id: input.id,
        key: input.key,
        name: input.name,
        scope: "TENANT",
        tenantId: input.tenantId,
        isSystem: false,
        isArchived: false,
      },
    }));

  for (const permissionKey of input.permissionKeys) {
    const permissionId = await ensurePermissionId(tx, permissionKey);
    await tx.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId } },
      update: {},
      create: { roleId: role.id, permissionId },
    });
  }
  return role.id;
}

async function ensureUser(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    password: string;
    roleId: string;
  },
): Promise<void> {
  const passwordHash = await hashPassword(input.password);
  const existing = await tx.user.findUnique({ where: { id: input.id } });
  if (!existing) {
    await tx.user.create({
      data: {
        id: input.id,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        isActive: true,
        tenantId: input.tenantId,
      },
    });
  }

  await tx.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: input.tenantId, userId: input.id } },
    update: { isActive: true },
    create: { tenantId: input.tenantId, userId: input.id, isActive: true },
  });

  const existingUserRole = await tx.userRole.findFirst({
    where: {
      userId: input.id,
      roleId: input.roleId,
      tenantId: input.tenantId,
      orgUnitId: null,
    },
  });
  if (!existingUserRole) {
    await tx.userRole.create({
      data: {
        userId: input.id,
        roleId: input.roleId,
        tenantId: input.tenantId,
      },
    });
  }
}

async function ensureCase(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    tenantId: string;
    caseNumber: string;
    reporterUserId: string;
    accountableUserId: string | null;
    subject: string;
    description: string;
    status: "RECEIVED" | "IN_PROGRESS" | "WAITING" | "DONE";
    urgent?: boolean;
    resolutionSummary?: string | null;
    waitReason?: string | null;
    attachment?: {
      id: string;
      storageKey: string;
      uploadedByUserId: string;
    };
  },
): Promise<void> {
  const existing = await tx.clubMeldung.findUnique({ where: { id: input.id } });
  if (existing) {
    return;
  }

  await tx.clubMeldungNumberSequence.upsert({
    where: { tenantId: input.tenantId },
    update: {},
    create: { tenantId: input.tenantId, nextNumber: 10 },
  });

  await tx.clubMeldung.create({
    data: {
      id: input.id,
      tenantId: input.tenantId,
      caseNumber: input.caseNumber,
      subject: input.subject,
      description: input.description,
      category: "DAMAGE_OR_PROBLEM",
      status: input.status,
      urgent: input.urgent ?? false,
      reporterUserId: input.reporterUserId,
      accountableUserId: input.accountableUserId,
      locationHint: "[ACCEPTANCE-SYNTHETIC] Umkleide Bereich A",
      resolutionSummary: input.resolutionSummary ?? null,
      waitReason: input.waitReason ?? null,
      resolvedAt: input.status === "DONE" ? new Date("2026-11-01T12:00:00.000Z") : null,
    },
  });

  if (input.attachment) {
    const communicationAttachment =
      (await tx.communicationAttachment.findUnique({
        where: { id: input.attachment.id },
      })) ??
      (await tx.communicationAttachment.create({
        data: {
          id: input.attachment.id,
          tenantId: input.tenantId,
          storageKey: input.attachment.storageKey,
          originalFilename: "acceptance-synthetic-leak-photo.txt",
          sanitizedFilename: "acceptance-synthetic-leak-photo.txt",
          contentType: "text/plain",
          sizeBytes: 48,
          checksumSha256: "0".repeat(64),
          sourceType: "UPLOAD",
          lifecycleStatus: "READY",
          scanStatus: "CLEAN",
          createdByUserId: input.attachment.uploadedByUserId,
        },
      }));

    await tx.clubMeldungAttachment.create({
      data: {
        id: `${input.id}-attachment`,
        tenantId: input.tenantId,
        meldungId: input.id,
        communicationAttachmentId: communicationAttachment.id,
        uploadedByUserId: input.attachment.uploadedByUserId,
      },
    });
  }
}

export async function seedSceAnliegenAcceptanceFixtures(
  prisma: PrismaClient,
  passwords: SceAnliegenAcceptancePasswords,
): Promise<void> {
  await reconcileMeldungPermissions(prisma, false);

  const alphaTenant = await prisma.tenant.findUnique({
    where: { id: ACCEPTANCE_FIXTURE.tenants.alpha.id },
    select: { id: true },
  });
  if (!alphaTenant) {
    throw new Error(
      "Acceptance Club Alpha is missing; run db:bootstrap-acceptance:safe first.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const roleIds: Record<keyof typeof SCE_ANLIEGEN_ACCEPTANCE_PERSONAS, string> = {
      reporter: await ensureRole(tx, {
        id: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.reporter.roleId,
        key: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.reporter.roleKey,
        name: "Acceptance Meldungen Reporter",
        tenantId: alphaTenant.id,
        permissionKeys: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.reporter.permissions,
      }),
      handler: await ensureRole(tx, {
        id: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.handler.roleId,
        key: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.handler.roleKey,
        name: "Acceptance Meldungen Handler",
        tenantId: alphaTenant.id,
        permissionKeys: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.handler.permissions,
      }),
      observer: await ensureRole(tx, {
        id: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.observer.roleId,
        key: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.observer.roleKey,
        name: "Acceptance Meldungen Observer",
        tenantId: alphaTenant.id,
        permissionKeys: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.observer.permissions,
      }),
      operator: await ensureRole(tx, {
        id: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.operator.roleId,
        key: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.operator.roleKey,
        name: "Acceptance Meldungen Operator",
        tenantId: alphaTenant.id,
        permissionKeys: SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.operator.permissions,
      }),
    };

    for (const [personaKey, persona] of Object.entries(SCE_ANLIEGEN_ACCEPTANCE_PERSONAS)) {
      const key = personaKey as keyof typeof SCE_ANLIEGEN_ACCEPTANCE_PERSONAS;
      await ensureUser(tx, {
        id: persona.id,
        email: persona.email,
        firstName: "Acceptance",
        lastName: key.charAt(0).toUpperCase() + key.slice(1),
        tenantId: alphaTenant.id,
        password: passwords[persona.passwordEnv],
        roleId: roleIds[key],
      });
    }

    const reporterId = SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.reporter.id;
    const handlerId = SCE_ANLIEGEN_ACCEPTANCE_PERSONAS.handler.id;

    await ensureCase(tx, {
      id: SCE_ANLIEGEN_ACCEPTANCE_CASE_IDS.waterDamage,
      tenantId: alphaTenant.id,
      caseNumber: "000701",
      reporterUserId: reporterId,
      accountableUserId: null,
      subject: "[ACCEPTANCE] Wasserschaden Umkleide",
      description:
        "Synthetischer PO-Fall: tropfende Decke nach Training, kein echtes Foto.",
      status: "RECEIVED",
      urgent: true,
      attachment: {
        id: `${FIXTURE}attachment-water`,
        storageKey: `${FIXTURE}blob/water-damage.txt`,
        uploadedByUserId: reporterId,
      },
    });

    await ensureCase(tx, {
      id: SCE_ANLIEGEN_ACCEPTANCE_CASE_IDS.assigned,
      tenantId: alphaTenant.id,
      caseNumber: "000702",
      reporterUserId: reporterId,
      accountableUserId: handlerId,
      subject: "[ACCEPTANCE] Zugewiesenes Anliegen",
      description: "Handler ist verantwortlich.",
      status: "IN_PROGRESS",
    });

    await ensureCase(tx, {
      id: SCE_ANLIEGEN_ACCEPTANCE_CASE_IDS.waiting,
      tenantId: alphaTenant.id,
      caseNumber: "000703",
      reporterUserId: reporterId,
      accountableUserId: handlerId,
      subject: "[ACCEPTANCE] Wartet auf Dritte",
      description: "Synthetischer Wartestatus für PO.",
      status: "WAITING",
      waitReason: "Wartet auf externe Sanitärfirma (synthetisch).",
    });

    await ensureCase(tx, {
      id: SCE_ANLIEGEN_ACCEPTANCE_CASE_IDS.resolved,
      tenantId: alphaTenant.id,
      caseNumber: "000704",
      reporterUserId: reporterId,
      accountableUserId: handlerId,
      subject: "[ACCEPTANCE] Erledigtes Anliegen",
      description: "Bereits abgeschlossen; kann zum Test von Reopen genutzt werden.",
      status: "DONE",
      resolutionSummary: "Synthetisch behoben — undichtes Ventil ersetzt.",
    });
  });
}