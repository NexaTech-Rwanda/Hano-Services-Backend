-- Rollback: Remove username column from users table
-- Version: 001
-- Description: Removes username column and related constraints/indexes

DO $$ 
BEGIN
    -- Drop index if it exists
    DROP INDEX IF EXISTS idx_users_username;
    
    -- Drop unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_username_unique' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_username_unique;
    END IF;
    
    -- Remove NOT NULL constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
    END IF;
    
    -- Drop the column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users DROP COLUMN username;
    END IF;
END $$;
