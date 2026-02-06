import { sql } from '@vercel/postgres';

export { sql };

/**
 * Vercel Postgres client.
 * Connection is managed automatically by @vercel/postgres.
 */
export const client = sql;
