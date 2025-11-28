-- Add push_tokens column to users table for storing Expo push tokens
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_tokens TEXT;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN users.push_tokens IS 'Comma-separated list of Expo push tokens for this user';