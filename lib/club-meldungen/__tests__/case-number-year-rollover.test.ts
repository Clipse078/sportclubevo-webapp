/**
 * SCE-ANLIEGEN-01 — Meldungsnummer year prefix + monotonic sequence across New Year.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  calendarYearInTenantTimezone,
  calendarYearInTimeZone,
} from "@/lib/events/tenant-local-datetime";
import {
  allocateClubMeldungCaseNumber,
  formatClubMeldungCaseNumber,
} from "@/lib/club-meldungen/case-number";
import { createClubMeldung } from "@/lib/club-meldungen/meldung-service";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { prisma } from "@/lib/db/prisma";

const ZURICH = "Europe/Zurich";
const NEW_YORK = "America/New_York";

/** 2026-12-31 23:59:59.999 in Europe/Zurich (UTC+1) */
const ZURICH_LAST_SECOND_2026 = new Date("2026-12-31T22:59:59.999Z");
/** 2027-01-01 00:00:00.000 in Europe/Zurich */
const ZURICH_FIRST_INSTANT_2027 = new Date("2026-12-31T23:00:00.000Z");

/** 2026-12-31 23:59 in America/New_York (UTC-5) */
const NY_LAST_MINUTE_2026 = new Date("2027-01-01T04:59:59.999Z");
/** 2027-01-01 00:00 in America/New_York */
const NY_FIRST_INSTANT_2027 = new Date("2027-01-01T05:00:00.000Z");

describe("Meldungsnummer calendar year (tenant timezone)", () => {
  it("uses Europe/Zurich local year at New Year boundary", () => {
    expect(calendarYearInTimeZone(ZURICH_LAST_SECOND_2026, ZURICH)).toBe(2026);
    expect(calendarYearInTimeZone(ZURICH_FIRST_INSTANT_2027, ZURICH)).toBe(2027);
  });

  it("differs from UTC when zones diverge on the same instant", () => {
    const instant = new Date("2027-01-01T02:00:00.000Z");
    expect(calendarYearInTimeZone(instant, ZURICH)).toBe(2027);
    expect(calendarYearInTimeZone(instant, NEW_YORK)).toBe(2026);
    expect(instant.getUTCFullYear()).toBe(2027);
  });

  it("uses America/New_York local year at its own midnight", () => {
    expect(calendarYearInTimeZone(NY_LAST_MINUTE_2026, NEW_YORK)).toBe(2026);
    expect(calendarYearInTimeZone(NY_FIRST_INSTANT_2027, NEW_YORK)).toBe(2027);
  });

  it("defaults unset tenant timezone to Europe/Zurich", () => {
    expect(calendarYearInTenantTimezone(ZURICH_LAST_SECOND_2026, null)).toBe(2026);
    expect(calendarYearInTenantTimezone(ZURICH_FIRST_INSTANT_2027, undefined)).toBe(2027);
  });
});

describe("formatClubMeldungCaseNumber", () => {
  it("keeps six-digit padding and does not reset sequence digits across years", () => {
    expect(formatClubMeldungCaseNumber(2026, 1)).toBe("M-2026-000001");
    expect(formatClubMeldungCaseNumber(2027, 2)).toBe("M-2027-000002");
  });
});

const canRunDbTests = Boolean(process.env.TEST_DATABASE_URL?.trim());

describe.skipIf(!canRunDbTests)("allocateClubMeldungCaseNumber year rollover (disposable Postgres)", () => {
  let pool: ReturnType<typeof createSafeTestPrismaClient>["pool"];
  let tenantZurichId: string;
  let reporterId: string;

  const RUN = `meldung-year-${Date.now()}`;

  beforeAll(async () => {
    assertSafeTestDatabase();
    ({ pool } = createSafeTestPrismaClient());

    const tenant = await prisma.tenant.create({
      data: {
        key: `tz-zurich-${RUN}`,
        name: "TZ Zurich",
        timezone: ZURICH,
      },
    });
    tenantZurichId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `reporter-${RUN}@fixture.local`,
        passwordHash: "fixture",
        firstName: "R",
        lastName: "Test",
        isActive: true,
        tenantId: tenantZurichId,
      },
    });
    reporterId = user.id;
    await prisma.tenantMembership.create({
      data: { tenantId: tenantZurichId, userId: reporterId, isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.clubMeldung.deleteMany({ where: { tenantId: tenantZurichId } });
    await prisma.clubMeldungCreateIdempotency.deleteMany({ where: { tenantId: tenantZurichId } });
    await prisma.clubMeldungNumberSequence.deleteMany({ where: { tenantId: tenantZurichId } });
    await prisma.tenantMembership.deleteMany({ where: { tenantId: tenantZurichId } });
    await prisma.user.deleteMany({ where: { id: reporterId } });
    await prisma.tenant.deleteMany({ where: { id: tenantZurichId } });
    await pool?.end();
  });

  it("continues sequence across years without annual reset", async () => {
    const first = await prisma.$transaction(async (tx) =>
      allocateClubMeldungCaseNumber(tx, tenantZurichId, {
        createdAt: ZURICH_LAST_SECOND_2026,
      }),
    );
    const second = await prisma.$transaction(async (tx) =>
      allocateClubMeldungCaseNumber(tx, tenantZurichId, {
        createdAt: ZURICH_FIRST_INSTANT_2027,
      }),
    );
    expect(first).toBe("M-2026-000001");
    expect(second).toBe("M-2027-000002");
  });

  it("allocates concurrently with one shared local year and distinct sequences", async () => {
    const tenant = await prisma.tenant.create({
      data: { key: `tz-conc-${RUN}`, name: "Concurrent", timezone: ZURICH },
    });
    try {
      const instant = ZURICH_FIRST_INSTANT_2027;
      const numbers = await Promise.all(
        Array.from({ length: 4 }, () =>
          prisma.$transaction(async (tx) =>
            allocateClubMeldungCaseNumber(tx, tenant.id, { createdAt: instant }),
          ),
        ),
      );
      expect(new Set(numbers).size).toBe(4);
      for (const n of numbers) {
        expect(n.startsWith("M-2027-")).toBe(true);
      }
      expect(numbers.sort()).toEqual([
        "M-2027-000001",
        "M-2027-000002",
        "M-2027-000003",
        "M-2027-000004",
      ]);
    } finally {
      await prisma.clubMeldungNumberSequence.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  });

  it("idempotent create keeps the original number after local New Year (fake clock)", async () => {
    const tenant = await prisma.tenant.create({
      data: { key: `tz-idem-${RUN}`, name: "Idempotent", timezone: ZURICH },
    });
    const reporter = await prisma.user.create({
      data: {
        email: `idem-${RUN}@fixture.local`,
        passwordHash: "x",
        firstName: "I",
        lastName: "D",
        isActive: true,
        tenantId: tenant.id,
      },
    });
    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: reporter.id, isActive: true },
    });

    const idemKey = `year-boundary-${RUN}`;
    try {
      vi.useFakeTimers();
      vi.setSystemTime(ZURICH_LAST_SECOND_2026);

      const first = await createClubMeldung({
        tenantId: tenant.id,
        reporterUserId: reporter.id,
        subject: "NY boundary",
        description: "synthetic",
        category: "OTHER",
        idempotencyKey: idemKey,
      });
      expect(first.meldung.caseNumber).toBe("M-2026-000001");
      const expectedYear = calendarYearInTenantTimezone(
        first.meldung.createdAt,
        ZURICH,
      );
      expect(first.meldung.caseNumber).toBe(
        formatClubMeldungCaseNumber(expectedYear, 1),
      );

      vi.setSystemTime(ZURICH_FIRST_INSTANT_2027);

      const retry = await createClubMeldung({
        tenantId: tenant.id,
        reporterUserId: reporter.id,
        subject: "NY boundary",
        description: "synthetic",
        category: "OTHER",
        idempotencyKey: idemKey,
      });
      expect(retry.created).toBe(false);
      expect(retry.meldung.caseNumber).toBe("M-2026-000001");
      expect(retry.meldung.id).toBe(first.meldung.id);
      expect(retry.meldung.createdAt.toISOString()).toBe(
        first.meldung.createdAt.toISOString(),
      );
    } finally {
      vi.useRealTimers();
      await prisma.clubMeldung.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.clubMeldungCreateIdempotency.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.clubMeldungNumberSequence.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.user.delete({ where: { id: reporter.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  });
});