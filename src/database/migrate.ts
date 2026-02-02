import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import pool from '../config/database';
import { MigrationManager } from './migration-manager';

async function migrate() {
  try {
    console.log('Running database migrations...\n');

    // First, run the base schema if it hasn't been initialized
    const distSchemaPath = join(__dirname, 'schema.sql');
    const srcSchemaPath = resolve(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaPath = existsSync(distSchemaPath) ? distSchemaPath : srcSchemaPath;

    if (existsSync(schemaPath)) {
      // Check if tables already exist (quick check for users table)
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
      } else {
        console.log('Base schema already exists, skipping...\n');
      }
    }

    // Run migrations using the migration manager
    const migrationManager = new MigrationManager();
    await migrationManager.migrate();

    console.log('\nDatabase migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

// Check command line arguments for migration commands
const command = process.argv[2];

if (command === 'rollback') {
  const migrationManager = new MigrationManager();
  migrationManager.rollback()
    .then(() => {
      console.log('\nRollback completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nRollback failed:', error);
      process.exit(1);
    });
} else if (command === 'rollback-all') {
  const migrationManager = new MigrationManager();
  migrationManager.rollbackAll()
    .then(() => {
      console.log('\nAll migrations rolled back successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nRollback failed:', error);
      process.exit(1);
    });
} else if (command === 'status') {
  const migrationManager = new MigrationManager();
  migrationManager.status()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nFailed to get status:', error);
      process.exit(1);
    });
} else {
  migrate();
}
