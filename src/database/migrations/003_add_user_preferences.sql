-- Migration 003: Add user preferences and last login
-- Up migration

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN users.last_login IS 'Timestamp of the user''s most recent successful login';
COMMENT ON COLUMN users.email_notifications IS 'Toggle for receiving email notifications';
COMMENT ON COLUMN users.sms_notifications IS 'Toggle for receiving SMS notifications';
COMMENT ON COLUMN users.push_notifications IS 'Toggle for receiving push notifications from Expo';
