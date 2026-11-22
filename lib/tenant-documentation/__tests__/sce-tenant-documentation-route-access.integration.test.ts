/**
 * PR #1025 — Dokumentation route + nav access on disposable Postgres (additive UserRole).
 */

import { PermissionModule } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { buildAppNavigationModelForUser } from "@/lib/nav/app-navigation-model";
import {
  buildNavigationDomainsFromSections,
  CLUB_NAV_ITEM_TO_DOMAIN,
} from "@/lib/nav/app-navigation-domains";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import {
  tenantDocumentationNavVisible,
  TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS,
} from "@/lib/tenant-documentation/tenant-documentation-route-permissions";

const RUN = `tdoc-ra-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const TENANT_ID = `tdoc-route-access-${RUN}`;

const dbReady = Boolean(process.env.TEST_DATABASE_URL);

async function ensurePermissionCatalog() {
  const defs = [...TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS] as const;
  for (const key of defs) {
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        name: key,
        module: PermissionModule.TENANT_DOCUMENTATION,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: { module: PermissionModule.TENANT_DOCUMENTATION },
    });
  }
}

async function createUserWithAdditiveRole(input: {
  label: string;
  permissionKeys: readonly (typeof TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS)[number][];
}) {
  const email = `${input.label}-${RUN}@fixture.local`;
  const user = await prisma.user.create({
    data: {
      email,
      firstName: "Route",
      lastName: input.label,
      passwordHash: "fixture",
      isActive: true,
    },
    select: { id: true, email: true },
  });
  await prisma.tenantMembership.create({
    data: { tenantId: TENANT_ID, userId: user.id, isActive: true },
  });

  const role = await prisma.role.create({
    data: {
      tenantId: TENANT_ID,
      scope: "TENANT",
      key: `pilot_doc_${RUN}_${input.label}`,
      name: `Doc pilot ${input.label}`,
    },
    select: { id: true },
  });

  for (const key of input.permissionKeys) {
    const permission = await prisma.permission.findUnique({ where: { key } });
    if (!permission) throw new Error(`missing ${key}`);
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id, tenantId: TENANT_ID },
  });

  return user;
}

function clubDestinationKeys(permissionKeys: string[]) {
  const sections = getVisibleNavSections(permissionKeys);
  const domains = buildNavigationDomainsFromSections(sections, "club");
  const club = domains.find((d) => d.id === "club");
  return club?.destinations.map((d) => d.key) ?? [];
}

describe.skipIf(!dbReady)("tenant documentation route + nav access (additive roles)", () => {
  let readerId: string;
  let editorId: string;
  let deniedId: string;

  beforeAll(async () => {
    assertSafeTestDatabase();
    await ensurePermissionCatalog();
    await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, key: `tdoc-ra-${RUN}`, name: "TDoc Route Access" },
      update: {},
    });

    const reader = await createUserWithAdditiveRole({
      label: "reader",
      permissionKeys: [PERMISSIONS.TENANT_DOCUMENTATION_VIEW],
    });
    const editor = await createUserWithAdditiveRole({
      label: "editor",
      permissionKeys: [
        PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
        PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
      ],
    });
    const denied = await prisma.user.create({
      data: {
        email: `denied-${RUN}@fixture.local`,
        firstName: "None",
        lastName: "Access",
        passwordHash: "fixture",
        isActive: true,
      },
      select: { id: true },
    });
    await prisma.tenantMembership.create({
      data: { tenantId: TENANT_ID, userId: denied.id, isActive: true },
    });

    readerId = reader.id;
    editorId = editor.id;
    deniedId = denied.id;
  });

  it("view-only additive pilot resolves tenant_documentation.view at request time", async () => {
    const resolver = createEffectivePermissionResolver(prisma);
    const { tenant } = await resolver.getEffectivePermissions({
      userId: readerId,
      tenantId: TENANT_ID,
    });
    expect(tenant).toContain(PERMISSIONS.TENANT_DOCUMENTATION_VIEW);
    expect(tenant).not.toContain(PERMISSIONS.TENANT_DOCUMENTATION_EDIT);
  });

  it("editor additive pilot resolves view + edit", async () => {
    const resolver = createEffectivePermissionResolver(prisma);
    const { tenant } = await resolver.getEffectivePermissions({
      userId: editorId,
      tenantId: TENANT_ID,
    });
    expect(tenant).toContain(PERMISSIONS.TENANT_DOCUMENTATION_VIEW);
    expect(tenant).toContain(PERMISSIONS.TENANT_DOCUMENTATION_EDIT);
  });

  it("nav visibility matches route permission contract for reader, editor, denied", async () => {
    const resolver = createEffectivePermissionResolver(prisma);
    const cases = [
      { userId: readerId, expectNav: true },
      { userId: editorId, expectNav: true },
      { userId: deniedId, expectNav: false },
    ] as const;

    for (const { userId, expectNav } of cases) {
      const { tenant } = await resolver.getEffectivePermissions({
        userId,
        tenantId: TENANT_ID,
      });
      const navVisible = tenantDocumentationNavVisible(tenant);
      const destinations = clubDestinationKeys(tenant);
      expect(navVisible, userId).toBe(expectNav);
      if (expectNav) {
        expect(destinations).toContain("tenant-documentation");
        expect(CLUB_NAV_ITEM_TO_DOMAIN["tenant-documentation"]).toBe("club");
        const model = buildAppNavigationModelForUser(tenant, "club");
        const active = model.domains
          .find((d) => d.id === "club")
          ?.destinations.find((d) => d.key === "tenant-documentation");
        expect(active?.href).toBe("/dashboard/dokumentation");
      } else {
        expect(destinations).not.toContain("tenant-documentation");
      }
    }
  });

  it("hub route access helper is granted only when live permissions include documentation", async () => {
    const resolver = createEffectivePermissionResolver(prisma);
    const readerEffective = await resolver.getEffectivePermissions({
      userId: readerId,
      tenantId: TENANT_ID,
    });
    expect(
      tenantDocumentationNavVisible([
        ...readerEffective.platform,
        ...readerEffective.tenant,
      ]),
    ).toBe(true);

    const deniedEffective = await resolver.getEffectivePermissions({
      userId: deniedId,
      tenantId: TENANT_ID,
    });
    expect(
      tenantDocumentationNavVisible([
        ...deniedEffective.platform,
        ...deniedEffective.tenant,
      ]),
    ).toBe(false);
  });
});