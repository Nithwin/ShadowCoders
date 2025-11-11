# 🔴 URGENT: Database Connection Not Working - Fix Now

## Current Status
✅ .env file exists  
✅ DATABASE_URL is configured  
✅ Network can resolve hostname  
❌ **Connection still failing to port 6543 (pooler)**

## Most Likely Cause: Wrong Password or Paused Project

### Fix Option 1: Reset Database Password (Recommended)

**Step 1: Get New Password**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **wvkzbtmofbrftmgqpzwd**
3. Click **Settings** → **Database**
4. Scroll to **Database password** section
5. Click **"Reset database password"**
6. **Copy the new password immediately** (you'll only see it once!)

**Step 2: Update .env File**
Open `backend/.env` and replace the password in both URLs:

```env
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:NEW_PASSWORD_HERE@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:NEW_PASSWORD_HERE@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**Step 3: Test Connection**
```bash
npm run test:db
```

### Fix Option 2: Check if Project is Paused

1. Go to Supabase Dashboard
2. Look at your project status
3. If it says **"Paused"**, click **"Resume"**
4. Wait 1-2 minutes for project to fully start
5. Try connecting again

### Fix Option 3: Use Direct Connection Instead

If pooler (port 6543) keeps failing, try direct connection:

**Option A: Use the fix script**
```bash
npm run fix:db
```
This will help you switch to direct connection.

**Option B: Manual switch**
Update `backend/.env`:
```env
# Temporarily use direct connection instead of pooler
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

Then test:
```bash
npm run test:db
```

## Quick Commands

```bash
# Diagnose the issue
npm run diagnose:db

# Try fixing automatically
npm run fix:db

# Test connection
npm run test:db

# Interactive setup (if you need to recreate .env)
npm run setup:env
```

## Still Not Working?

1. **Verify Supabase Project Status:**
   - Dashboard → Your Project
   - Should show "Active" (not "Paused")

2. **Check Supabase Status Page:**
   - https://status.supabase.com/
   - Look for outages in ap-south-1 region

3. **Try Supabase SQL Editor:**
   - Go to Dashboard → SQL Editor
   - Try running: `SELECT 1;`
   - If this works, the issue is with your connection string
   - If this fails, the issue is with Supabase itself

4. **Contact Support:**
   - Supabase Support: https://supabase.com/support
   - Include: Project ID `wvkzbtmofbrftmgqpzwd` and error message

## Most Common Solution

**99% of the time, it's the password.** Reset it in Supabase Dashboard and update your `.env` file.

