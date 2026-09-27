import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireCampaignSend } from "@/lib/communication/campaign/campaign-authorization";
import { requireSponsorAudienceSelect } from "@/lib/sponsoring/sponsor-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await requireCampaignSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
    await requireSponsorAudienceSelect({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const [organisations, categories] = await Promise.all([
    prisma.sponsorOrganisation.findMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        categoryId: true,
        contacts: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isPrimary: true,
            personId: true,
          },
          orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
        },
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.sponsorCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    organisations: organisations.map((org) => ({
      id: org.id,
      name: org.name,
      categoryId: org.categoryId,
      contacts: org.contacts.map((c) => ({
        id: c.id,
        displayName: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        isPrimary: c.isPrimary,
        hasLinkedPerson: Boolean(c.personId),
      })),
    })),
    categories,
  });
}
