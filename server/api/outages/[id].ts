import { useLibsql } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Outage ID is required',
    });
  }

  const client = useLibsql();

  const records = await client.execute({
    sql: 'SELECT * FROM OutageEvent WHERE id = ? LIMIT 1',
    args: [id],
  });

  const eventRecord = records.rows[0];
  if (!eventRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Outage not found',
    });
  }

  // Fetch associated OutageAreas
  const areasRecord = await client.execute({
    sql: 'SELECT * FROM OutageArea WHERE outageId = ?',
    args: [id],
  });

  const affectedAreas = areasRecord.rows.map(area => ({
    barangay: area.barangay ? String(area.barangay) : '',
    streetsRaw: area.streetsRaw ? String(area.streetsRaw) : '',
    latitude: area.latitude !== null ? Number(area.latitude) : null,
    longitude: area.longitude !== null ? Number(area.longitude) : null,
  }));

  return {
    id: eventRecord.id,
    providerSlug: eventRecord.providerSlug,
    status: eventRecord.status,
    rawText: eventRecord.rawText,
    reasonCategory: eventRecord.reasonCategory,
    startTime: Number(eventRecord.startTime),
    endTime: Number(eventRecord.endTime),
    durationHours: Number(eventRecord.durationHours),
    region: eventRecord.region,
    province: eventRecord.province,
    municipality: eventRecord.municipality,
    createdAt: eventRecord.createdAt,
    affectedAreas,
  };
});
