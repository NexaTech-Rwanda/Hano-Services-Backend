import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import pool from '../config/database';

/**
 * Simple schema migration:
 * - Reads schema.sql and runs it idempotently (IF NOT EXISTS)
 * - No migration tracking table needed
 * - To apply: npm run db:migrate
 */
async function migrate() {
  try {
    console.log('Running database schema...\n');

    const distSchemaPath = join(__dirname, 'schema.sql');
    const srcSchemaPath = resolve(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaPath = existsSync(distSchemaPath) ? distSchemaPath : srcSchemaPath;

    if (!existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    console.log(`Applying schema from ${schemaPath}`);
    const schema = readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✓ Schema applied successfully\n');

    console.log('Database schema completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nSchema migration failed:', error);
    process.exit(1);
  }
}

// For future: if you need a migration table later, uncomment below
/*
import { MigrationManager } from './migration-manager';
async function migrateWithTracking() {
  // First run base schema if needed
  const distSchemaPath = join(__dirname, 'schema.sql');
  const srcSchemaPath = resolve(process.cwd(), 'src', 'database', 'schema.sql');
  const schemaPath = existsSync(distSchemaPath) ? distSchemaPath : srcSchemaPath;

  if (existsSync(schemaPath)) {
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    if (!checkResult.rows[0].exists) {
      console.log('Initializing database schema...');
      const schema = readFileSync(schemaPath, 'utf-8');
      await pool.query(schema);
      console.log('✓ Base schema initialized\n');
    }
  }

  // Run tracked migrations
  const migrationManager = new MigrationManager();
  await migrationManager.migrate();
}
*/

migrate();
