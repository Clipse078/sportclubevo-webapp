/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01 — read-only FC Allschwil STAGE diagnosis (no mutations).
 */
import "dotenv/config";
import pg from "pg";

const TENANT_KEY = "fc-allschwil";

async function teamChain(
  client: pg.Client,
  tenantId: string,
  namePattern: string,
) {
  const teams = await client.query(
    `
    SELECT t.id, t.name, t."isActive" FROM "Team" t
    WHERE t."tenantId" = $1 AND (
      t.name ILIKE $2 OR t."alternativeName" ILIKE $2 OR t."shortName" ILIKE $2
    )
    ORDER BY t.name LIMIT 8
  `,
    [tenantId, namePattern],
  );
  const out = [];
  for (const team of teams.rows) {
    const tss = await client.query(
      `
      SELECT ts.id, ts.status, s.key AS season_key, s."isActive" AS season_active
      FROM "TeamSeason" ts JOIN "Season" s ON s.id = ts."seasonId"
      WHERE ts."teamId" = $1 ORDER BY s."startDate" DESC LIMIT 3
    `,
      [team.id],
    );
    const activeTs = tss.rows.filter((r) => r.status === "ACTIVE");
    let squad = 0;
    let trainer = 0;
    let squadWithUser = 0;
    let trainerWithUser = 0;
    let squadWithEmail = 0;
    let guardianLinksForSquad = 0;
    for (const ts of activeTs) {
      const sq = await client.query(
        `SELECT COUNT(*)::int AS c FROM "PlayerSquadMember" WHERE "teamSeasonId"=$1 AND status='ACTIVE'`,
        [ts.id],
      );
      const tr = await client.query(
        `SELECT COUNT(*)::int AS c FROM "TrainerTeamMember" WHERE "teamSeasonId"=$1 AND status='ACTIVE'`,
        [ts.id],
      );
      squad += sq.rows[0].c;
      trainer += tr.rows[0].c;
      const sqU = await client.query(
        `
        SELECT COUNT(*)::int AS c FROM "PlayerSquadMember" psm JOIN "Person" p ON p.id=psm."personId"
        WHERE psm."teamSeasonId"=$1 AND psm.status='ACTIVE' AND p."userId" IS NOT NULL`,
        [ts.id],
      );
      const trU = await client.query(
        `
        SELECT COUNT(*)::int AS c FROM "TrainerTeamMember" ttm JOIN "Person" p ON p.id=ttm."personId"
        WHERE ttm."teamSeasonId"=$1 AND ttm.status='ACTIVE' AND p."userId" IS NOT NULL`,
        [ts.id],
      );
      const sqE = await client.query(
        `
        SELECT COUNT(*)::int AS c FROM "PlayerSquadMember" psm JOIN "Person" p ON p.id=psm."personId"
        WHERE psm."teamSeasonId"=$1 AND psm.status='ACTIVE' AND NULLIF(trim(p.email),'') IS NOT NULL`,
        [ts.id],
      );
      const gr = await client.query(
        `
        SELECT COUNT(DISTINCT gr.id)::int AS c
        FROM "PlayerSquadMember" psm
        JOIN "GuardianRelationship" gr ON gr."childPersonId" = psm."personId" AND gr."tenantId" = $2
        WHERE psm."teamSeasonId"=$1 AND psm.status='ACTIVE'`,
        [ts.id, tenantId],
      );
      squadWithUser += sqU.rows[0].c;
      trainerWithUser += trU.rows[0].c;
      squadWithEmail += sqE.rows[0].c;
      guardianLinksForSquad += gr.rows[0].c;
    }
    out.push({
      teamId: team.id,
      teamName: team.name,
      teamActive: team.isActive,
      teamSeasons: tss.rows.map((r) => ({
        id: r.id,
        status: r.status,
        seasonKey: r.season_key,
        seasonActive: r.season_active,
      })),
      activeTeamSeasonCount: activeTs.length,
      activeSquadMembers: squad,
      activeTrainerMembers: trainer,
      squadWithLinkedUser: squadWithUser,
      trainerWithLinkedUser: trainerWithUser,
      squadWithPersonEmail: squadWithEmail,
      guardianRelationshipsForSquadPlayers: guardianLinksForSquad,
    });
  }
  return out;
}

async function main(): Promise<void> {
  const stageUrl = process.env.STAGE_DB_URL?.trim();
  if (!stageUrl) {
    throw new Error("STAGE_DB_URL is required");
  }

  const client = new pg.Client({
    connectionString: stageUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const tenant = await client.query(
      `SELECT id, key, name FROM "Tenant" WHERE key = $1`,
      [TENANT_KEY],
    );
    if (!tenant.rows[0]) {
      console.log(JSON.stringify({ error: "tenant not found", key: TENANT_KEY }));
      return;
    }
    const tenantId = tenant.rows[0].id as string;

    const activeSeason = await client.query(
      `SELECT id, key, name, "isActive" FROM "Season" WHERE "isActive" = true LIMIT 5`,
    );
    const currentSeasonId = activeSeason.rows[0]?.id ?? null;

    const counts = await client.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM "Team" WHERE "tenantId" = $1) AS teams_total,
        (SELECT COUNT(*)::int FROM "Team" WHERE "tenantId" = $1 AND "isActive" = true) AS teams_active,
        (SELECT COUNT(*)::int FROM "TeamSeason" ts JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1) AS team_seasons_total,
        (SELECT COUNT(*)::int FROM "TeamSeason" ts JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1 AND ts.status = 'ACTIVE') AS team_seasons_active,
        (SELECT COUNT(*)::int FROM "Person" WHERE "tenantId" = $1) AS people_total,
        (SELECT COUNT(*)::int FROM "Person" WHERE "tenantId" = $1 AND "isActive" = true) AS people_active,
        (SELECT COUNT(*)::int FROM "User" u JOIN "TenantMembership" tm ON tm."userId" = u.id WHERE tm."tenantId" = $1) AS users_with_membership,
        (SELECT COUNT(*)::int FROM "TenantMembership" WHERE "tenantId" = $1 AND "isActive" = true) AS tenant_memberships_active,
        (SELECT COUNT(*)::int FROM "PlayerSquadMember" psm JOIN "TeamSeason" ts ON ts.id = psm."teamSeasonId" JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1) AS squad_members_total,
        (SELECT COUNT(*)::int FROM "PlayerSquadMember" psm JOIN "TeamSeason" ts ON ts.id = psm."teamSeasonId" JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1 AND psm.status = 'ACTIVE') AS squad_members_active,
        (SELECT COUNT(*)::int FROM "TrainerTeamMember" ttm JOIN "TeamSeason" ts ON ts.id = ttm."teamSeasonId" JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1) AS trainer_members_total,
        (SELECT COUNT(*)::int FROM "TrainerTeamMember" ttm JOIN "TeamSeason" ts ON ts.id = ttm."teamSeasonId" JOIN "Team" t ON t.id = ts."teamId" WHERE t."tenantId" = $1 AND ttm.status = 'ACTIVE') AS trainer_members_active,
        (SELECT COUNT(*)::int FROM "GuardianRelationship" WHERE "tenantId" = $1) AS guardian_relationships,
        (SELECT COUNT(*)::int FROM "PersonAssignment" WHERE "tenantId" = $1 AND status = 'ACTIVE') AS person_assignments_active
    `,
      [tenantId],
    );

    const currentTs = currentSeasonId
      ? await client.query(
          `
          SELECT COUNT(*)::int AS cnt FROM "TeamSeason" ts
          JOIN "Team" t ON t.id = ts."teamId"
          WHERE t."tenantId" = $1 AND ts."seasonId" = $2
        `,
          [tenantId, currentSeasonId],
        )
      : { rows: [{ cnt: null }] };

    const teamRecipientStats = await client.query(
      `
      WITH active_ts AS (
        SELECT ts.id AS ts_id, t.id AS team_id, t.name AS team_name
        FROM "TeamSeason" ts
        JOIN "Team" t ON t.id = ts."teamId"
        WHERE t."tenantId" = $1 AND ts.status = 'ACTIVE' AND t."isActive" = true
      ),
      members AS (
        SELECT ats.team_id, ats.team_name, p.id AS person_id
        FROM active_ts ats
        JOIN "PlayerSquadMember" psm ON psm."teamSeasonId" = ats.ts_id AND psm.status = 'ACTIVE'
        JOIN "Person" p ON p.id = psm."personId" AND p."isActive" = true AND p."tenantId" = $1
        UNION
        SELECT ats.team_id, ats.team_name, p.id
        FROM active_ts ats
        JOIN "TrainerTeamMember" ttm ON ttm."teamSeasonId" = ats.ts_id AND ttm.status = 'ACTIVE'
        JOIN "Person" p ON p.id = ttm."personId" AND p."isActive" = true AND p."tenantId" = $1
      ),
      per_team AS (
        SELECT team_id, team_name, COUNT(DISTINCT person_id)::int AS structural_candidates
        FROM members GROUP BY team_id, team_name
      )
      SELECT
        (SELECT COUNT(*)::int FROM active_ts) AS structural_teams_with_active_ts,
        (SELECT COUNT(*)::int FROM per_team WHERE structural_candidates > 0) AS teams_with_structural_candidates,
        (SELECT COUNT(*)::int FROM per_team WHERE structural_candidates = 0) AS teams_with_zero_structural_candidates
    `,
      [tenantId],
    );

    const commEligibility = await client.query(
      `
      WITH active_ts AS (
        SELECT ts.id AS ts_id, t.id AS team_id, t.name AS team_name
        FROM "TeamSeason" ts
        JOIN "Team" t ON t.id = ts."teamId"
        WHERE t."tenantId" = $1 AND ts.status = 'ACTIVE' AND t."isActive" = true
      ),
      members AS (
        SELECT DISTINCT ats.team_id, ats.team_name, p.id AS person_id, p."userId", p.email
        FROM active_ts ats
        JOIN "PlayerSquadMember" psm ON psm."teamSeasonId" = ats.ts_id AND psm.status = 'ACTIVE'
        JOIN "Person" p ON p.id = psm."personId" AND p."isActive" = true AND p."tenantId" = $1
        UNION
        SELECT DISTINCT ats.team_id, ats.team_name, p.id, p."userId", p.email
        FROM active_ts ats
        JOIN "TrainerTeamMember" ttm ON ttm."teamSeasonId" = ats.ts_id AND ttm.status = 'ACTIVE'
        JOIN "Person" p ON p.id = ttm."personId" AND p."isActive" = true AND p."tenantId" = $1
      ),
      enriched AS (
        SELECT m.*,
          CASE WHEN m."userId" IS NOT NULL AND tm.id IS NOT NULL AND u."isActive" = true THEN true ELSE false END AS has_active_user_access,
          CASE WHEN COALESCE(NULLIF(trim(p.email), ''), NULLIF(trim(u.email), '')) IS NOT NULL THEN true ELSE false END AS has_email_reachability
        FROM members m
        LEFT JOIN "User" u ON u.id = m."userId"
        LEFT JOIN "TenantMembership" tm ON tm."userId" = u.id AND tm."tenantId" = $1 AND tm."isActive" = true
        LEFT JOIN "Person" p ON p.id = m.person_id
      ),
      per_team AS (
        SELECT team_id, team_name,
          COUNT(*)::int AS structural_candidates,
          COUNT(*) FILTER (WHERE has_email_reachability OR has_active_user_access)::int AS rough_comm_capable
        FROM enriched GROUP BY team_id, team_name
      )
      SELECT
        (SELECT COUNT(*)::int FROM per_team WHERE rough_comm_capable > 0) AS teams_with_rough_eligible,
        (SELECT COUNT(*)::int FROM per_team WHERE structural_candidates > 0 AND rough_comm_capable = 0) AS teams_with_members_but_zero_rough_eligible,
        (SELECT COUNT(*)::int FROM per_team WHERE structural_candidates = 0) AS teams_zero_members
    `,
      [tenantId],
    );

    const invites = await client.query(
      `
      SELECT COUNT(*)::int AS pending_invites FROM "PasswordResetToken" prt
      JOIN "User" u ON u.id = prt."userId"
      JOIN "TenantMembership" tm ON tm."userId" = u.id AND tm."tenantId" = $1
      WHERE prt."isInvitation" = true AND prt."usedAt" IS NULL AND prt."expiresAt" > NOW()
    `,
      [tenantId],
    );

    const f2 = await teamChain(client, tenantId, "%F2%");
    const seniorinnen = await teamChain(client, tenantId, "%Seniorinnen%");

    console.log(
      JSON.stringify(
        {
          tenant: tenant.rows[0],
          activeSeason: activeSeason.rows,
          currentSeasonTeamSeasons: currentTs.rows[0],
          counts: counts.rows[0],
          teamRecipientStats: teamRecipientStats.rows[0],
          commEligibilityRough: commEligibility.rows[0],
          pendingInvitesApprox: invites.rows[0],
          f2Chain: f2,
          seniorinnenChain: seniorinnen,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
