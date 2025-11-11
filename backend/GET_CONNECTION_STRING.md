# How to Get Correct Supabase Connection Strings

## Quick Steps

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Select your project: **wvkzbtmofbrftmgqpzwd**

### 2. Check Project Status
- Make sure project shows **"Active"** (not "Paused")
- If paused, click **"Resume"** and wait 1-2 minutes

### 3. Get Connection Strings
1. Go to **Settings** → **Database**
2. Scroll to **"Connection string"** section
3. You'll see different connection modes

### 4. For DATABASE_URL (Application Use)
- Select **"URI"** format
- Select **"Connection pooling"** mode
- Copy the connection string
- It will look like:
  ```
  postgresql://postgres.wvkzbtmofbrftmgqpzwd:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

### 5. For DIRECT_URL (Migrations)
- Select **"URI"** format  
- Select **"Direct connection"** mode
- Copy the connection string
- It will look like:
  ```
  postgresql://postgres.wvkzbtmofbrftmgqpzwd:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
  ```

### 6. Get Your Database Password
1. In the same page (Settings → Database)
2. Scroll to **"Database password"** section
3. If you don't remember it, click **"Reset database password"**
4. **Copy the password immediately** (you'll only see it once!)

### 7. Replace [YOUR-PASSWORD]
In both connection strings, replace `[YOUR-PASSWORD]` with your actual password.

**Example:**
```env
# Before
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# After (with actual password)
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:MyActualPassword123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 8. Update .env File
Open `backend/.env` and update both URLs:

```env
DATABASE_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:YOUR_ACTUAL_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.wvkzbtmofbrftmgqpzwd:YOUR_ACTUAL_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 9. Test Connection
```bash
npm run test:db
```

## Automated Setup

You can also use the interactive script:

```bash
npm run verify:supabase
```

This will guide you through the process step by step.

## Common Issues

### Issue: Password has special characters
If your password contains `@`, `#`, `%`, etc., they need to be URL-encoded:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

Or use the setup script which auto-encodes:
```bash
npm run setup:env
```

### Issue: Connection string format looks wrong
Make sure:
- ✅ It starts with `postgresql://`
- ✅ Has your project ref: `postgres.wvkzbtmofbrftmgqpzwd`
- ✅ Has password (not `[YOUR-PASSWORD]`)
- ✅ Has correct hostname: `aws-1-ap-south-1.pooler.supabase.com`
- ✅ Pooler uses port `6543` with `?pgbouncer=true`
- ✅ Direct uses port `5432` without `?pgbouncer=true`

### Issue: Still can't connect after updating
1. **Verify project is Active** (not paused)
2. **Double-check password** is correct (no extra spaces)
3. **Try Supabase SQL Editor** - if that works, issue is with connection string
4. **Check Supabase Status**: https://status.supabase.com/

## Still Need Help?

1. Run diagnostic: `npm run diagnose:db`
2. Check project status in Supabase Dashboard
3. Contact Supabase Support with project ID: `wvkzbtmofbrftmgqpzwd`

