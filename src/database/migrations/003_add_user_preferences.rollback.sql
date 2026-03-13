-- Migration 003: Add user preferences and last login
-- Down migration (Rollback)

ALTER TABLE users 
DROP COLUMN IF EXISTS last_login,
DROP COLUMN IF EXISTS email_notifications,
DROP COLUMN IF EXISTS sms_notifications,
DROP COLUMN IF EXISTS push_notifications;
