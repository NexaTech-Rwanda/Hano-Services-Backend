-- Migration: Add username column to users table
-- Run this migration if your users table already exists without the username column

-- Add username column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(30);
        
        -- Generate temporary usernames for existing users (format: user_<id>)
        UPDATE users 
        SET username = 'user_' || SUBSTRING(id::text, 1, 8)
        WHERE username IS NULL;
        
        -- Make username NOT NULL and UNIQUE
        ALTER TABLE users 
        ALTER COLUMN username SET NOT NULL,
        ADD CONSTRAINT users_username_unique UNIQUE (username);
        
        -- Create index for username
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    END IF;
END $$;
