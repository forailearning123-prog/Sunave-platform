import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(pool) {
  const migrationFile = path.join(__dirname, 'migrations', '001_auth.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  await pool.query(sql);
}
