const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🚀 Running trending_banner migration...');
    
    // Create trending_banner table
    await sql`
      CREATE TABLE IF NOT EXISTS trending_banner (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Created trending_banner table');
    
    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trending_banner_status ON trending_banner(status)
    `;
    
    console.log('✅ Created index on status column');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
