import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NativeBillingLegalEntitiesTable, {
  nativeBillingLegalEntityDetailHref,
} from "../NativeBillingLegalEntitiesTable";

const sampleRow = {
  key: "sportclubevo-by-tulip-digital",
  displayName: "SportClubEvo by Tulip Digital",
  legalName: "Tulip Digital - Duijster",
  entityType: "COMPANY",
  status: "ACTIVE" as const,
  city: "Allschwil",
  countryCode: "CH",
};

describe("NativeBillingLegalEntitiesTable", () => {
  it("links each row to the legal entity detail page", () => {
    const detailHref = nativeBillingLegalEntityDetailHref(sampleRow.key);
    expect(detailHref).toBe(
      "/dashboard/admin/commercial/billing/settings/legal-entities/sportclubevo-by-tulip-digital",
    );

    const html = renderToStaticMarkup(
      <NativeBillingLegalEntitiesTable rows={[sampleRow]} canManage={false} />,
    );

    expect(html).toContain(`href="${detailHref}"`);
    expect(html).toContain("SportClubEvo by Tulip Digital");
    expect(html).toContain("SportClubEvo by Tulip Digital verwalten");
    expect(html).not.toContain("Rechtsträger löschen");
  });

  it("encodes entity keys in detail links", () => {
    const encodedHref = nativeBillingLegalEntityDetailHref("key/with space");
    expect(encodedHref).toContain("key%2Fwith%20space");
  });
});
