-- Create referrers table
CREATE TABLE IF NOT EXISTS referrers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create referral_events table to track downloads
CREATE TABLE IF NOT EXISTS referral_events (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  device_id VARCHAR(255), -- Optional: to help prevent duplicate counts from same device
  platform VARCHAR(50),  -- e.g., 'ios', 'android'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrers_code ON referrers(code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer_id ON referral_events(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_created_at ON referral_events(created_at);
