-- Create a dedicated table for storing Expo push tokens
-- This replaces the push_tokens column in the users table

CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- Optional: link to user
  expo_token TEXT NOT NULL UNIQUE,                          -- The actual Expo token
  is_active BOOLEAN DEFAULT TRUE,                           -- Track if the token is still valid
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- When the token was registered
  last_used_at TIMESTAMP,                                   -- Last time token was used
  device_info JSONB,                                        -- Optional: device info like platform, device ID, etc.
  project_id TEXT                                           -- Optional: store the Expo project ID to prevent conflicts
);

-- Indexes for performance
CREATE INDEX idx_expo_push_tokens_user ON expo_push_tokens(user_id);
CREATE INDEX idx_expo_push_tokens_active ON expo_push_tokens(is_active);
CREATE INDEX idx_expo_push_tokens_registered ON expo_push_tokens(registered_at);

-- Optional: Create a function to clean up inactive tokens periodically
-- This can help maintain performance and remove tokens that are no longer valid