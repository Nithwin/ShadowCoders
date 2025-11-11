# Create Admin User Guide

## Quick Setup

Create a test admin user with the following credentials:
- **Email**: `shadowadmin@gmail.com`
- **Password**: `shadowadmin`
- **Role**: `STAFF` (admin)

## Steps

### 1. Ensure Database Connection is Working

First, test your database connection:

```bash
cd backend
npm run test:db
```

If you get connection errors, see `DB_CONNECTION_FIX.md` for troubleshooting.

### 2. Create the Admin User

Run the admin user creation script:

```bash
npm run create:admin
```

Or directly:

```bash
node scripts/create-admin-user.js
```

### 3. Verify the User was Created

The script will output:
- ✅ Success message
- User ID
- Email and role
- Login credentials

### 4. Test Login

Try logging in with the admin credentials:

```bash
# Using curl
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"shadowadmin@gmail.com","password":"shadowadmin"}'

# Or use your frontend/login page
```

## What the Script Does

1. **Connects to the database** using your DATABASE_URL from .env
2. **Hashes the password** using bcrypt (10 salt rounds)
3. **Checks if user exists**:
   - If exists: Updates password and role to STAFF
   - If not exists: Creates new user with STAFF role
4. **Displays credentials** for easy reference

## Troubleshooting

### Error: Database Connection Failed (P1001)

**Solution**: Fix your database connection first
- Check `QUICK_FIX_LOGIN_ERROR.md`
- Verify DATABASE_URL in `.env` file
- Ensure Supabase project is active

### Error: User Already Exists

**Solution**: The script will automatically update the existing user
- Password will be reset to `shadowadmin`
- Role will be set to `STAFF`

### Error: Unique Constraint Violation (P2002)

**Solution**: This usually means email conflict
- Check if another user has the same email
- The script handles this automatically by updating existing user

## Manual Creation (Alternative)

If the script doesn't work, you can create the user manually:

### Option 1: Using Prisma Studio

```bash
npm run prisma:studio
```

1. Open Prisma Studio (usually http://localhost:5555)
2. Go to "User" table
3. Click "Add record"
4. Fill in:
   - email: `shadowadmin@gmail.com`
   - password: (hash it first using `node hash-password.js`)
   - name: `Shadow Admin`
   - role: `STAFF`

### Option 2: Using SQL

```sql
-- First, hash the password using: node hash-password.js
-- Then insert into database:

INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'shadowadmin@gmail.com',
  '$2b$10$YOUR_HASHED_PASSWORD_HERE',
  'Shadow Admin',
  'STAFF',
  NOW(),
  NOW()
);
```

## Security Notes

⚠️ **Important**: 
- This is a **test/admin account** - change the password in production
- The password `shadowadmin` is weak - use a stronger password for production
- Never commit credentials to git
- Use environment variables for sensitive data

## Next Steps

After creating the admin user:

1. **Test Login**: Verify you can login with the credentials
2. **Test Admin Features**: Ensure STAFF role has proper permissions
3. **Change Password**: Consider changing password for production use
4. **Create More Users**: You can modify the script to create additional test users

## Script Location

- Script: `backend/scripts/create-admin-user.js`
- Hash Password: `backend/hash-password.js`
- npm command: `npm run create:admin`

---

**Last Updated**: 2025-11-11

