# 🚀 Quick Setup Guide - Local PostgreSQL

## Your .env is now configured for local PostgreSQL! ✅

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/shadowcoders"
```

## Next Steps:

### Step 1: Create the Database

**Option A: Using SQL Shell (psql)**
1. Open **SQL Shell (psql)** from your Start Menu
2. Press Enter for all prompts (Server, Database, Port, Username)
3. Enter your PostgreSQL password when prompted
4. Run this command:
   ```sql
   CREATE DATABASE shadowcoders;
   ```
5. Verify with: `\l` (should see shadowcoders in the list)

**Option B: Using pgAdmin**
1. Open **pgAdmin**
2. Right-click on **Databases**
3. Select **Create → Database**
4. Database name: `shadowcoders`
5. Click **Save**

### Step 2: Update the Password in .env

If your PostgreSQL password is NOT "postgres", update it in `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/shadowcoders"
```

### Step 3: Run Migrations

This will create all the tables in your database:

```powershell
npx prisma migrate dev
```

### Step 4: Test the Connection

```powershell
npm run test:db
```

You should see: ✅ Successfully connected to database

### Step 5: Start Your Server

```powershell
npm run dev
```

## 🎉 That's it! 

Your app is now using your local PostgreSQL database instead of Supabase.

## Common Issues

### "password authentication failed"
- Update the password in your `.env` file to match your PostgreSQL password
- Or reset your PostgreSQL password

### "database does not exist"
- Make sure you created the database using pgAdmin or SQL Shell
- Database name must be exactly: `shadowcoders`

### Still having issues?
Run the diagnostic:
```powershell
npm run test:db
```

This will show you the exact connection details and any errors.
