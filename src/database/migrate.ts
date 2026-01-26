import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import pool from '../config/database';

async function migrate() {
  try {
    console.log('Running database migrations...');

    // When compiled, this file lives in dist/database/, but schema.sql is a non-TS asset.
    // Prefer dist/database/schema.sql (production) and fall back to src/database/schema.sql (dev).
    const distSchemaPath = join(__dirname, 'schema.sql');
    const srcSchemaPath = resolve(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaPath = existsSync(distSchemaPath) ? distSchemaPath : srcSchemaPath;

    const schema = readFileSync(schemaPath, 'utf-8');

    await pool.query(schema);

    console.log('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
