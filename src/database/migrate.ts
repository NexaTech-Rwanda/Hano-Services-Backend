import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import pool from '../config/database';
import { Client } from 'pg';
import { config } from '../config/config';

/**
 * Simple schema migration:
 * - Reads schema.sql and runs it idempotently (IF NOT EXISTS)
 * - No migration tracking table needed
 * - To apply: npm run db:migrate
 */
async function migrate() {
  try {
    console.log('Running database schema...\n');

    // Step 1: Ensure database exists
    const dbName = config.database.name || 'hano_db';
    console.log(`Checking if database "${dbName}" exists...`);

    const client = new Client({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: 'postgres', // Connect to default postgres DB first
    });

    try {
      await client.connect();
      const checkDb = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

      if (checkDb.rows.length === 0) {
        console.log(`Database "${dbName}" not found. Creating it...`);
        // Cannot use parameterized query for CREATE DATABASE
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log(`✓ Database "${dbName}" created successfully.`);
      } else {
        console.log(`✓ Database "${dbName}" already exists.`);
      }
    } catch (dbError) {
      console.error('Warning: Could not check/create database automatically. Ensure it exists.');
      // Proceed anyway, let the main migration handle the connection failure if it's fatal
    } finally {
      await client.end();
    }

    // Step 2: Apply schema
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

migrate();
