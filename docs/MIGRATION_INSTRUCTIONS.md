# Database Migration Instructions

## Run Trending Banner Migration

Since `psql` is not available in your environment, you have two options to run the database migration:

### Option 1: Using Neon Dashboard (Recommended)

1. **Go to your Neon dashboard**: https://console.neon.tech
2. **Select your project**
3. **Click on "SQL Editor"**
4. **Copy and paste the following SQL**:

```sql
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
```

5. **Click "Run"**

### Option 2: Using Node.js Script

Create and run this script:

```javascript
// scripts/run-migration.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Running trending_banner migration...');
    
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
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trending_banner_status ON trending_banner(status)
    `;
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

Then run:
```bash
node scripts/run-migration.js
```

---

## Verify Migration

After running the migration, verify it worked:

```bash
# In Neon SQL Editor, run:
SELECT * FROM trending_banner;
```

You should see an empty table with the correct columns.

---

## Note

The banner feature will work once the migration is complete. The admin dashboard is already configured and ready to use!
