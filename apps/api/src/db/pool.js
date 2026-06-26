import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export function createPool(connectionString = config.databaseUrl) {
  return new Pool({
    connectionString,
    ssl: config.isProduction ? { rejectUnauthorized: false } : undefined
  });
}
