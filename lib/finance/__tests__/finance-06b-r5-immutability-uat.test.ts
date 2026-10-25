import { describe, expect, it } from "vitest";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import { defaultManagementPnlPublicationScope } from "@/lib/finance/publishing/finance-publication-scope";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsEqual,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";

const yearId = "fy-2026";

describe("FIN-06B-R5 immutability UAT metrics", () => {
  it("extracts PO Version 1 baseline from live and snapshot representations", () => {
    const model = buildPoBaselineManagementPnlReadModel();
    const liveMetrics = metricsFromLivePnl(model);
    expect(metricsEqual(liveMetrics, R5_V1_BASELINE)).toBe(true);

    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-1",
      publicationVersion: 1,
      title: "FY 2026",
      reportingScope: defaultManagementPnlPublicationScope(yearId),
      audienceClass: "INTERNAL_AUTHENTICATED",
      publisherUserId: "user-1",
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      pnlReadModel: model,
    });
    const snapshotMetrics = metricsFromStoredSnapshot(snapshot);
    expect(metricsEqual(snapshotMetrics, R5_V1_BASELINE)).toBe(true);
    expect(snapshotPayloadDigest(snapshot)).toHaveLength(64);
  });

  it("detects live checkpoint B after forecast mutation while snapshot stays on A", () => {
    const modelA = buildPoBaselineManagementPnlReadModel();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-1",
      publicationVersion: 1,
      title: "FY 2026",
      reportingScope: defaultManagementPnlPublicationScope(yearId),
      audienceClass: "INTERNAL_AUTHENTICATED",
      publisherUserId: "user-1",
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      pnlReadModel: modelA,
    });
    const modelB = buildPoBaselineManagementPnlReadModel({
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
    });
    const liveB = metricsFromLivePnl(modelB);
    expect(metricsEqual(liveB, R5_LIVE_AFTER_MUTATION)).toBe(true);
    expect(metricsEqual(metricsFromStoredSnapshot(snapshot), R5_V1_BASELINE)).toBe(true);
    expect(liveB.forecastResultMinor).not.toBe(
      metricsFromStoredSnapshot(snapshot).forecastResultMinor,
    );
  });
});
