-- Drop push_tokens table and related objects

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
DROP INDEX IF EXISTS idx_push_tokens_user_id;
DROP TABLE IF EXISTS push_tokens;
