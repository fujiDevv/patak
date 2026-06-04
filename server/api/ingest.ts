import crypto from 'node:crypto';
import { useLibsql } from '../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = useLibsql();

  // Validate secret
  const localSecret = process.env.INGEST_SECRET || 'local_secret';
  if (!body.secret || body.secret !== localSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const p = body.parsed;
  const start = new Date(p.startTimeISO);
  const end = new Date(p.endTimeISO);
  const duration = Math.abs(end.getTime() - start.getTime()) / 3_600_000;
  const outageId = crypto.randomUUID();

  // Handle multi-municipality advisories (parser may return comma-joined string)
  const municipalities: string[] = p.municipality
    .split(',')
    .map((m: string) => m.trim())
    .filter(Boolean);

  try {
    await client.batch([
      {
        sql: `INSERT INTO OutageEvent
                 (id, providerSlug, status, rawText, reasonCategory,
                  startTime, endTime, durationHours, region, province, municipality)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          outageId,
          body.providerSlug,
          p.status,
          body.rawText,
          p.reasonCategory,
          start.getTime(),
          end.getTime(),
          duration,
          p.region || 'NCR',
          p.province || 'Metro Manila',
          municipalities.join(', '),
        ],
      },
      ...p.affectedBreakdown.map((area: { barangay: string; streetsRaw: string }) => ({
        sql: `INSERT INTO OutageArea (id, outageId, barangay, streetsRaw)
               VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), outageId, area.barangay, area.streetsRaw],
      })),
    ], 'write');

    return { success: true, registeredId: outageId };
  } catch (err: any) {
    console.error('Ingestion error:', err);
    throw createError({ statusCode: 500, message: err.message });
  }
});
