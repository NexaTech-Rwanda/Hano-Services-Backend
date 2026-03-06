# Database Migrations

This directory contains database migration files. The migration system supports:
- Automatic migration tracking
- Rollback support
- Migration status checking

## Migration File Naming

Migrations should be named with a version number prefix:
- `001_add_username_to_users.sql` - The migration file
- `001_add_username_to_users.rollback.sql` - The rollback file (optional but recommended)

## Running Migrations

### Apply all pending migrations
```bash
npm run db:migrate
```

### Rollback the last migration
```bash
npm run db:migrate:rollback
```

### Rollback all migrations
```bash
npm run db:migrate:rollback-all
```

### Check migration status
```bash
npm run db:migrate:status
```

## Creating a New Migration

1. Create a new SQL file with version prefix: `002_your_migration_name.sql`
2. Write your migration SQL in the file
3. Create a rollback file: `002_your_migration_name.rollback.sql`
4. Write the rollback SQL that reverses your migration

### Example Migration

**002_add_email_verification.sql:**
```sql
-- Migration: Add email verification to users table
-- Version: 002

ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
```

**002_add_email_verification.rollback.sql:**
```sql
-- Rollback: Remove email verification from users table
-- Version: 002

DROP INDEX IF EXISTS idx_users_email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
```

## Migration Tracking

The system automatically tracks applied migrations in the `schema_migrations` table:
- `version` - The migration version number
- `name` - The migration name
- `applied_at` - Timestamp when the migration was applied

## Best Practices

1. **Always create rollback files** - This allows you to safely revert changes
2. **Use transactions** - The migration system wraps each migration in a transaction
3. **Test migrations** - Test both up and down migrations before deploying
4. **Version numbering** - Use sequential numbers (001, 002, 003, etc.)
5. **Idempotent migrations** - Use `IF NOT EXISTS` and `IF EXISTS` checks where possible
