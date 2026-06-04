import crypto from 'node:crypto';
import { useLibsql } from '../utils/db';

// Assumed average households per municipality — replace with a lookup table for accuracy
const ASSUMED_CUSTOMERS = 50_000;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = useLibsql();

  // Validate secret
  const localSecret = process.env.INGEST_SECRET || 'local_secret';
  if (!body.secret || body.secret !== localSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Pull all events
  const result = await client.execute(
    `SELECT municipality, durationHours FROM OutageEvent`
  );

  const mStats: Record<string, { outageCount: number; totalHours: number }> = {};

  for (const row of result.rows) {
    const muniStr = (row.municipality as string) || '';
    const duration = Number(row.durationHours) || 0;
    const munis = muniStr.split(',').map(m => m.trim()).filter(Boolean);
    for (const m of munis) {
      if (!mStats[m]) {
        mStats[m] = { outageCount: 0, totalHours: 0 };
      }
      mStats[m].outageCount += 1;
      mStats[m].totalHours += duration;
    }
  }

  const updates = Object.entries(mStats).map(async ([municipality, stats]) => {
    const saifi = stats.outageCount / ASSUMED_CUSTOMERS;
    const saidi = stats.totalHours / ASSUMED_CUSTOMERS;

    // Score: 100 − weighted penalty. Tune coefficients to your benchmarks.
    const reliabilityScore = Math.max(0, 100 - (saifi * 10) - (saidi * 2));

    await client.execute({
      sql: `INSERT INTO MunicipalMetric
              (id, municipality, reliabilityScore, saifiCount, saidiHours)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(municipality) DO UPDATE SET
              reliabilityScore = excluded.reliabilityScore,
              saifiCount       = excluded.saifiCount,
              saidiHours       = excluded.saidiHours,
              lastUpdated      = CURRENT_TIMESTAMP`,
      args: [crypto.randomUUID(), municipality, reliabilityScore, saifi, saidi],
    });
  });

  await Promise.all(updates);
  return { success: true, updated: Object.keys(mStats).length };
});
