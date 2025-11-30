import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export const getDbPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected database error', err);
    });
  }

  return pool;
};

export const closeDbPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

