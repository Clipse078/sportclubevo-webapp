import { redirect } from "next/navigation";
import { buildVereinsentwicklungZielNeuHref } from "@/lib/club-development/vereinsentwicklung-create-routing";

type Props = {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
};

/** Legacy alias → connected workspace full-page create. */
export default async function NewTargetPage({ searchParams }: Props) {
  const query = (await searchParams) ?? {};
  const href = buildVereinsentwicklungZielNeuHref({
    orgUnitId: query.orgEinheit ?? query.orgUnitId,
    returnTo: query.returnTo,
    clubStrategyId: query.clubStrategyId ?? query.strategyId,
    linkFocus: query.linkFocus === "1",
  });
  redirect(href);
}
