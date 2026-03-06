import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import pool from '../config/database';

interface Migration {
  name: string;
  version: string;
  up: string;
  down: string;
}

/**
 * Migration Manager
 * Handles database migrations with rollback support
 */
export class MigrationManager {
  private migrationsDir: string;
  private migrationsTable = 'schema_migrations';

  constructor() {
    // Support both compiled (dist) and source (src) directories
    const distMigrationsPath = join(__dirname, 'migrations');
    const srcMigrationsPath = resolve(process.cwd(), 'src', 'database', 'migrations');
    this.migrationsDir = existsSync(distMigrationsPath) ? distMigrationsPath : srcMigrationsPath;
  }

  /**
   * Initialize the migrations table
   */
  private async initMigrationsTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get all applied migrations
   */
  private async getAppliedMigrations(): Promise<string[]> {
    const result = await pool.query(
      `SELECT version FROM ${this.migrationsTable} ORDER BY applied_at`
    );
    return result.rows.map((row: { version: string }) => row.version);
  }

  /**
   * Mark a migration as applied
   */
  private async markMigrationApplied(version: string, name: string): Promise<void> {
    await pool.query(
      `INSERT INTO ${this.migrationsTable} (version, name) VALUES ($1, $2) 
       ON CONFLICT (version) DO NOTHING`,
      [version, name]
    );
  }

  /**
   * Mark a migration as rolled back
   */
  private async markMigrationRolledBack(version: string): Promise<void> {
    await pool.query(
      `DELETE FROM ${this.migrationsTable} WHERE version = $1`,
      [version]
    );
  }

  /**
   * Load migration files
   */
  private loadMigrations(): Migration[] {
    if (!existsSync(this.migrationsDir)) {
      console.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.endsWith('.rollback.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const baseName = basename(file, '.sql');
      const upPath = join(this.migrationsDir, file);
      const downPath = join(this.migrationsDir, `${baseName}.rollback.sql`);

      if (!existsSync(upPath)) {
        console.warn(`Migration file not found: ${upPath}`);
        continue;
      }

      const up = readFileSync(upPath, 'utf-8');
      // Extract version from filename (e.g., "001_add_username" -> "001")
      const versionMatch = baseName.match(/^(\d+)/);
      const version = versionMatch ? versionMatch[1] : baseName;

      let down = '';
      if (existsSync(downPath)) {
        down = readFileSync(downPath, 'utf-8');
      } else {
        console.warn(`Rollback file not found for ${file}, rollback will not be available`);
      }

      migrations.push({
        name: baseName,
        version,
        up,
        down,
      });
    }

    return migrations;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    try {
      console.log('Initializing migration system...');
      await this.initMigrationsTable();

      const migrations = this.loadMigrations();
      if (migrations.length === 0) {
        console.log('No migrations found.');
        return;
      }

      const applied = await this.getAppliedMigrations();
      const pending = migrations.filter(m => !applied.includes(m.version));

      if (pending.length === 0) {
        console.log('All migrations are up to date.');
        return;
      }

      console.log(`Found ${pending.length} pending migration(s)...`);

      for (const migration of pending) {
        console.log(`Running migration: ${migration.name} (version ${migration.version})...`);
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Execute the migration
          await client.query(migration.up);
          
          // Mark as applied
          await this.markMigrationApplied(migration.version, migration.name);
          
          await client.query('COMMIT');
          console.log(`✓ Migration ${migration.name} applied successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      console.log('All migrations completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    try {
      await this.initMigrationsTable();

      const migrations = this.loadMigrations();
      const applied = await this.getAppliedMigrations();

      if (applied.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      // Get the last applied migration
      const lastVersion = applied[applied.length - 1];
      const migration = migrations.find(m => m.version === lastVersion);

      if (!migration) {
        console.warn(`Migration ${lastVersion} not found in migration files.`);
        return;
      }

      if (!migration.down) {
        throw new Error(`No rollback script found for migration ${migration.name}`);
      }

      console.log(`Rolling back migration: ${migration.name} (version ${migration.version})...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the rollback
        await client.query(migration.down);
        
        // Mark as rolled back
        await this.markMigrationRolledBack(migration.version);
        
        await client.query('COMMIT');
        console.log(`✓ Migration ${migration.name} rolled back successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll(): Promise<void> {
    try {
      await this.initMigrationsTable();

      const migrations = this.loadMigrations();
      const applied = await this.getAppliedMigrations();

      if (applied.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      console.log(`Rolling back ${applied.length} migration(s)...`);

      // Rollback in reverse order
      for (let i = applied.length - 1; i >= 0; i--) {
        const version = applied[i];
        const migration = migrations.find(m => m.version === version);

        if (!migration) {
          console.warn(`Migration ${version} not found, skipping...`);
          continue;
        }

        if (!migration.down) {
          console.warn(`No rollback script for ${migration.name}, skipping...`);
          continue;
        }

        console.log(`Rolling back: ${migration.name} (version ${migration.version})...`);

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          await client.query(migration.down);
          await this.markMigrationRolledBack(migration.version);
          
          await client.query('COMMIT');
          console.log(`✓ ${migration.name} rolled back`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      console.log('All migrations rolled back successfully!');
    } catch (error) {
      console.error('Rollback all failed:', error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    try {
      await this.initMigrationsTable();

      const migrations = this.loadMigrations();
      const applied = await this.getAppliedMigrations();

      console.log('\nMigration Status:');
      console.log('==================\n');

      if (migrations.length === 0) {
        console.log('No migrations found.');
        return;
      }

      for (const migration of migrations) {
        const isApplied = applied.includes(migration.version);
        const status = isApplied ? '✓ Applied' : '○ Pending';
        const hasRollback = migration.down ? ' (has rollback)' : ' (no rollback)';
        console.log(`${status} - ${migration.name} (${migration.version})${hasRollback}`);
      }

      console.log(`\nTotal: ${migrations.length} migration(s), ${applied.length} applied, ${migrations.length - applied.length} pending\n`);
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }
}
