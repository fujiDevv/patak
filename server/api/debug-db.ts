export default defineEventHandler((event) => {
  return {
    TURSO_DATABASE_URL_DEFINED: !!process.env.TURSO_DATABASE_URL,
    TURSO_DATABASE_URL_PREFIX: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.substring(0, 15) : 'none',
    TURSO_AUTH_TOKEN_DEFINED: !!process.env.TURSO_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV
  };
});
