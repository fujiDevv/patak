import { useLibsql } from '../utils/db';

export default cachedEventHandler(async (event) => {
  const query = getQuery(event);
  const m = query.municipality ? String(query.municipality) : null;
  const client = useLibsql();

  const sql = m
    ? 'SELECT * FROM OutageEvent WHERE municipality LIKE ? ORDER BY startTime DESC LIMIT 50'
    : 'SELECT * FROM OutageEvent ORDER BY startTime DESC LIMIT 50';
  const args = m ? [`%${m}%`] : [];

  const records = await client.execute({ sql, args });
  const events = records.rows;

  if (events.length === 0) {
    return [];
  }

  // Fetch associated OutageAreas in a single batch query
  const outageIds = events.map(e => e.id as string);
  const placeholders = outageIds.map(() => '?').join(',');
  
  const areasRecord = await client.execute({
    sql: `SELECT * FROM OutageArea WHERE outageId IN (${placeholders})`,
    args: outageIds,
  });

  const areasByOutageId: Record<string, any[]> = {};
  for (const area of areasRecord.rows) {
    const oid = area.outageId as string;
    if (!areasByOutageId[oid]) {
      areasByOutageId[oid] = [];
    }
    areasByOutageId[oid].push({
      barangay: area.barangay,
      streetsRaw: area.streetsRaw,
      latitude: area.latitude,
      longitude: area.longitude,
    });
  }

  return events.map(e => ({
    id: e.id,
    providerSlug: e.providerSlug,
    status: e.status,
    rawText: e.rawText,
    reasonCategory: e.reasonCategory,
    startTime: Number(e.startTime),
    endTime: Number(e.endTime),
    durationHours: Number(e.durationHours),
    region: e.region,
    province: e.province,
    municipality: e.municipality,
    createdAt: e.createdAt,
    affectedAreas: areasByOutageId[e.id as string] || [],
  }));
}, {
  maxAge: 60 * 5, // Cache on Vercel Edge CDN for 5 minutes
  name: 'publicOutageCache',
  getKey: (event) => {
    const query = getQuery(event);
    return query.municipality ? String(query.municipality) : 'all';
  }
});
