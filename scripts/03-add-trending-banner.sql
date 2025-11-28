-- Add trending_banner table for single banner image display

CREATE TABLE IF NOT EXISTS trending_banner (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trending_banner_status ON trending_banner(status);

-- Note: This table stores only ONE active banner at a time
-- When a new banner is uploaded, the previous one is set to inactive
