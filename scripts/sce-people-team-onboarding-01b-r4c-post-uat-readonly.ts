/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C — read-only post Human UAT verification (no mutations).
 */
import "dotenv/config";
import pg from "pg";

const PERSON_ID = "cmsnqz0qz000004l8g2efoyhw";
const TEAM_ID = "cmrkh1j0v000004juw4tsumks";
const TEAM_SEASON_ID = "cmsod03tv000h04juo7wyen7w";

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
    const person = await client.query(
      `SELECT id, "tenantId", "firstName", "lastName", "isActive", "isPlayer", "isTrainer", "dateOfBirth", "userId", email FROM "Person" WHERE id = $1`,
      [PERSON_ID],
    );

    const dupPerson = await client.query(
      `SELECT COUNT(*)::int AS c FROM "Person" WHERE "tenantId" = $1 AND LOWER("firstName") = LOWER($2) AND LOWER("lastName") = LOWER($3)`,
      [
        person.rows[0]?.tenantId,
        person.rows[0]?.firstName,
        person.rows[0]?.lastName,
      ],
    );

    const assignments = await client.query(
      `
      SELECT pa.id, pa."personId", pa."teamId", pa."seasonId", pa."functionKey", pa.status, pa."tenantId",
             t.name AS team_name, s.key AS season_key, s.name AS season_name, pa."createdAt", pa."updatedAt"
      FROM "PersonAssignment" pa
      LEFT JOIN "Team" t ON t.id = pa."teamId"
      LEFT JOIN "Season" s ON s.id = pa."seasonId"
      WHERE pa."personId" = $1 AND pa."teamId" = $2
      ORDER BY pa."createdAt" DESC
    `,
      [PERSON_ID, TEAM_ID],
    );

    const dupAssignments = await client.query(
      `
      SELECT "functionKey", status, COUNT(*)::int AS c
      FROM "PersonAssignment"
      WHERE "personId"=$1 AND "teamId"=$2 AND status='ACTIVE'
      GROUP BY "functionKey", status
    `,
      [PERSON_ID, TEAM_ID],
    );

    const psmAll = await client.query(
      `
      SELECT psm.id, psm.status, psm."personId", psm."teamSeasonId", psm."createdAt", psm."updatedAt",
             ts."teamId", ts.status AS ts_status, s.key AS season_key
      FROM "PlayerSquadMember" psm
      JOIN "TeamSeason" ts ON ts.id = psm."teamSeasonId"
      JOIN "Season" s ON s.id = ts."seasonId"
      WHERE psm."personId" = $1
      ORDER BY psm."createdAt" DESC
    `,
      [PERSON_ID],
    );

    const psmTarget = await client.query(
      `
      SELECT psm.id, psm.status, psm."personId", psm."teamSeasonId", psm."createdAt", psm."updatedAt"
      FROM "PlayerSquadMember" psm
      WHERE psm."personId" = $1 AND psm."teamSeasonId" = $2
    `,
      [PERSON_ID, TEAM_SEASON_ID],
    );

    const activePsmDup = await client.query(
      `
      SELECT COUNT(*)::int AS c FROM "PlayerSquadMember"
      WHERE "personId"=$1 AND "teamSeasonId"=$2 AND status='ACTIVE'
    `,
      [PERSON_ID, TEAM_SEASON_ID],
    );

    const teamSeason = await client.query(
      `
      SELECT ts.id, ts.status, ts."teamId", t.name AS team_name, t."tenantId", t."isActive" AS team_active,
             s.id AS season_id, s.key, s.name, s."isActive" AS season_active
      FROM "TeamSeason" ts
      JOIN "Team" t ON t.id = ts."teamId"
      JOIN "Season" s ON s.id = ts."seasonId"
      WHERE ts.id = $1
    `,
      [TEAM_SEASON_ID],
    );

    const kaderCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM "PlayerSquadMember" WHERE "teamSeasonId"=$1 AND status='ACTIVE'`,
      [TEAM_SEASON_ID],
    );

    const userId = person.rows[0]?.userId as string | null;
    const tenantId = person.rows[0]?.tenantId as string;

    const user = userId
      ? await client.query(`SELECT id, email, "isActive" FROM "User" WHERE id=$1`, [userId])
      : { rows: [] };

    const tm = userId
      ? await client.query(
          `SELECT id, "isActive", "tenantId" FROM "TenantMembership" WHERE "userId"=$1 AND "tenantId"=$2`,
          [userId, tenantId],
        )
      : { rows: [] };

    const structuralComm = await client.query(
      `
      SELECT DISTINCT p.id AS person_id
      FROM "TeamSeason" ts
      JOIN "PlayerSquadMember" psm ON psm."teamSeasonId" = ts.id AND psm.status = 'ACTIVE'
      JOIN "Person" p ON p.id = psm."personId" AND p."isActive" = true AND p."tenantId" = $1
      WHERE ts.id = $2 AND ts.status = 'ACTIVE'
    `,
      [tenantId, TEAM_SEASON_ID],
    );

    const deliverability = userId
      ? await client.query(
          `
        SELECT
          u.id AS user_id,
          u."isActive" AS user_active,
          u.email AS user_email,
          tm.id AS membership_id,
          tm."isActive" AS membership_active,
          p.email AS person_email
        FROM "User" u
        LEFT JOIN "TenantMembership" tm ON tm."userId" = u.id AND tm."tenantId" = $1
        LEFT JOIN "Person" p ON p.id = $2
        WHERE u.id = $3
      `,
          [tenantId, PERSON_ID, userId],
        )
      : { rows: [] };

    console.log(
      JSON.stringify(
        {
          person: person.rows,
          duplicatePersonNameCount: dupPerson.rows[0],
          personAssignments: assignments.rows,
          duplicateActiveAssignments: dupAssignments.rows,
          playerSquadMembersForPerson: psmAll.rows,
          playerSquadMemberTarget: psmTarget.rows,
          activeMembershipCountTarget: activePsmDup.rows[0],
          teamSeason: teamSeason.rows,
          kaderActiveCount: kaderCount.rows[0],
          user: user.rows,
          tenantMembership: tm.rows,
          comm03StructuralCandidatesForTeamSeason: structuralComm.rows,
          commDeliverabilityHints: deliverability.rows,
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
