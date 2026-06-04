import { useLibsql } from '../utils/db';

export default cachedEventHandler(async () => {
  const client = useLibsql();
  const records = await client.execute(
    'SELECT * FROM MunicipalMetric ORDER BY reliabilityScore ASC LIMIT 100'
  );
  return records.rows.map(row => ({
    id: row.id,
    municipality: row.municipality,
    reliabilityScore: Number(row.reliabilityScore),
    saifiCount: Number(row.saifiCount),
    saidiHours: Number(row.saidiHours),
    lastUpdated: row.lastUpdated,
  }));
}, {
  maxAge: 60 * 60, // Cache on Vercel Edge CDN for 1 hour
  name: 'leaderboardCache',
});
