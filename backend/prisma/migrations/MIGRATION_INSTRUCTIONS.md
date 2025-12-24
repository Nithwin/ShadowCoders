# How to Apply the Clash Tables Migration (Without Data Loss)

## Option 1: Using psql Command Line

1. Open your terminal/command prompt
2. Navigate to the migrations folder:
   ```bash
   cd c:\Users\vmnit\Desktop\ShadowCoders\backend\prisma\migrations
   ```

3. Run the SQL script:
   ```bash
   psql -U your_username -d shadowcoders -f manual_add_clash_tables.sql
   ```
   
   Replace `your_username` with your PostgreSQL username.

## Option 2: Using pgAdmin or Database GUI

1. Open pgAdmin or your preferred PostgreSQL GUI tool
2. Connect to the `shadowcoders` database
3. Open the SQL query tool
4. Copy and paste the contents of `manual_add_clash_tables.sql`
5. Execute the script

## Option 3: Using Node.js Script

Run this command from the backend directory:

```bash
node -e "const { Client } = require('pg'); const fs = require('fs'); const client = new Client({ connectionString: process.env.DATABASE_URL }); client.connect().then(() => { const sql = fs.readFileSync('./prisma/migrations/manual_add_clash_tables.sql', 'utf8'); return client.query(sql); }).then(() => { console.log('✅ Migration successful!'); client.end(); }).catch(err => { console.error('❌ Migration failed:', err); client.end(); });"
```

## Verification

After running the migration, verify the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'Clash%';
```

You should see:
- ClashQuestion
- ClashRoom
- ClashParticipant
- ClashSubmission

## What This Does

✅ Adds 3 new enums (ClashMode, ClashRoomStatus, ClashDifficulty)
✅ Creates 4 new tables (ClashQuestion, ClashRoom, ClashParticipant, ClashSubmission)
✅ Adds all necessary indexes for performance
✅ Sets up foreign key relationships
✅ **Preserves all your existing data**

## Next Steps

After the migration is successful:
1. Restart your backend server (if running)
2. The Clash API endpoints will be available
3. You can proceed with creating the question seeding script and frontend
