export default defineEventHandler((event) => {
  return {
    TURSO_DATABASE_URL_DEFINED: !!process.env.TURSO_DATABASE_URL,
    TURSO_DATABASE_URL_PREFIX: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.substring(0, 15) : 'none',
    TURSO_AUTH_TOKEN_DEFINED: !!process.env.TURSO_AUTH_TOKEN,
    INGEST_SECRET_DEFINED: !!process.env.INGEST_SECRET,
    INGEST_SECRET_LENGTH: process.env.INGEST_SECRET ? process.env.INGEST_SECRET.length : 0,
    NODE_ENV: process.env.NODE_ENV
  };
});
