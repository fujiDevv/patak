import { createClient } from '@libsql/client';

let initPromise: Promise<void> | null = null;

export const useLibsql = () => {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  const client = createClient({
    url,
    authToken,
  });

  const rawExecute = client.execute.bind(client);
  const rawBatch = client.batch.bind(client);

  if (url.startsWith('file:')) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          console.log('Initializing local SQLite database (local.db)...');
          await rawExecute(`
            CREATE TABLE IF NOT EXISTS UtilityProvider (
              id TEXT PRIMARY KEY,
              slug TEXT UNIQUE,
              name TEXT,
              type TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await rawExecute(`
            CREATE TABLE IF NOT EXISTS OutageEvent (
              id TEXT PRIMARY KEY,
              providerSlug TEXT,
              status TEXT,
              rawText TEXT,
              reasonCategory TEXT,
              startTime INTEGER,
              endTime INTEGER,
              durationHours REAL,
              region TEXT,
              province TEXT,
              municipality TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await rawExecute(`
            CREATE INDEX IF NOT EXISTS idx_outage_municipality_start ON OutageEvent (municipality, startTime);
          `);

          await rawExecute(`
            CREATE TABLE IF NOT EXISTS OutageArea (
              id TEXT PRIMARY KEY,
              outageId TEXT,
              barangay TEXT,
              streetsRaw TEXT,
              latitude REAL,
              longitude REAL
            );
          `);

          await rawExecute(`
            CREATE INDEX IF NOT EXISTS idx_outage_area_barangay ON OutageArea (barangay);
          `);

          await rawExecute(`
            CREATE TABLE IF NOT EXISTS MunicipalMetric (
              id TEXT PRIMARY KEY,
              municipality TEXT UNIQUE,
              reliabilityScore REAL DEFAULT 100.0,
              saifiCount REAL DEFAULT 0.0,
              saidiHours REAL DEFAULT 0.0,
              lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          const providers = await rawExecute('SELECT COUNT(*) as count FROM UtilityProvider');
          const count = Number((providers.rows[0] as any).count);

          if (count === 0) {
            console.log('Seeding initial mock data for Project Patak...');
            
            // Seed providers
            await rawExecute(`
              INSERT INTO UtilityProvider (id, slug, name, type) VALUES 
              ('p1', 'meralco', 'Meralco', 'POWER'),
              ('p2', 'maynilad', 'Maynilad', 'WATER'),
              ('p3', 'manila-water', 'Manila Water', 'WATER');
            `);

            // Seed Municipal metrics
            await rawExecute(`
              INSERT INTO MunicipalMetric (id, municipality, reliabilityScore, saifiCount, saidiHours) VALUES 
              ('m1', 'Quezon City', 96.5, 0.24, 1.8),
              ('m2', 'Manila', 98.1, 0.12, 0.9),
              ('m3', 'Pasig', 94.2, 0.38, 2.5),
              ('m4', 'Taguig', 92.0, 0.45, 3.2),
              ('m5', 'Mandaluyong', 97.4, 0.15, 1.1),
              ('m6', 'Marikina', 89.5, 0.65, 5.1),
              ('m7', 'Caloocan', 85.0, 0.82, 7.5);
            `);

            // Seed some mock OutageEvents
            const nowMs = Date.now();
            const oneHourMs = 3600 * 1000;

            await rawBatch([
              {
                sql: `INSERT INTO OutageEvent (id, providerSlug, status, rawText, reasonCategory, startTime, endTime, durationHours, region, province, municipality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  'o1',
                  'meralco',
                  'SCHEDULED',
                  'There will be maintenance work in Barangay Holy Spirit, Laura St. and Faustino Compound from 9:00 AM to 3:00 PM due to line upgrading.',
                  'MAINTENANCE',
                  nowMs - 2 * oneHourMs,
                  nowMs + 4 * oneHourMs,
                  6.0,
                  'NCR',
                  'Metro Manila',
                  'Quezon City'
                ]
              },
              {
                sql: `INSERT INTO OutageEvent (id, providerSlug, status, rawText, reasonCategory, startTime, endTime, durationHours, region, province, municipality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  'o2',
                  'maynilad',
                  'UNANNOUNCED',
                  'Emergency pipe repair along Shaw Boulevard affecting portions of Barangay Wack-Wack and Addition Hills from 1:00 PM to 6:00 PM.',
                  'EMERGENCY',
                  nowMs - oneHourMs,
                  nowMs + 4 * oneHourMs,
                  5.0,
                  'NCR',
                  'Metro Manila',
                  'Mandaluyong'
                ]
              },
              {
                sql: `INSERT INTO OutageEvent (id, providerSlug, status, rawText, reasonCategory, startTime, endTime, durationHours, region, province, municipality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  'o3',
                  'meralco',
                  'SCHEDULED',
                  'Line maintenance work affecting parts of Barangay San Antonio, along F. Ortigas Jr. Road and Sapphire Road.',
                  'MAINTENANCE',
                  nowMs + 24 * oneHourMs,
                  nowMs + 30 * oneHourMs,
                  6.0,
                  'NCR',
                  'Metro Manila',
                  'Pasig'
                ]
              }
            ], 'write');

            // Seed OutageAreas
            await rawExecute(`
              INSERT INTO OutageArea (id, outageId, barangay, streetsRaw) VALUES 
              ('a1', 'o1', 'Holy Spirit', 'Laura St., Faustino Compound'),
              ('a2', 'o2', 'Wack-Wack', 'Shaw Boulevard portions'),
              ('a3', 'o2', 'Addition Hills', 'Shaw Boulevard adjacent streets'),
              ('a4', 'o3', 'San Antonio', 'F. Ortigas Jr. Road, Sapphire Road');
            `);

            console.log('Local database seeded successfully!');
          }
        } catch (err) {
          console.error('Error during auto-initialization:', err);
        }
      })();
    }
  }

  // Wrap execute and batch to await the initialization promise transparently
  client.execute = async (stmt) => {
    if (initPromise) await initPromise;
    return rawExecute(stmt);
  };

  client.batch = async (stmts, mode) => {
    if (initPromise) await initPromise;
    return rawBatch(stmts, mode);
  };

  return client;
};
