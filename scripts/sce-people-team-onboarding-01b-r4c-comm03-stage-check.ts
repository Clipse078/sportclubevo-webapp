import "dotenv/config";
import { resolveTeamAudiencePersonIds } from "@/lib/requirements/requirement-audience-resolvers";

async function main() {
  const tenantId = "cmomwboak0000tsf3zzivrs46";
  const teamId = "cmrkh1j0v000004juw4tsumks";
  const ids = await resolveTeamAudiencePersonIds(tenantId, [teamId]);
  console.log(JSON.stringify({ structuralPersonIds: ids }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
