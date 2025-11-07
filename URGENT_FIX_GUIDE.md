# 🔧 URGENT FIX GUIDE - Google OAuth & Database Issues

## Issue 1: Database Connection Error ❌

### Error:
```
Error querying the database: FATAL: Tenant or user not found
```

### Solution:
Your Supabase database credentials appear to be invalid or expired.

1. **Go to Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Select your project: `wvkzbtmofbrftmgqpzwd`

2. **Get New Database Credentials:**
   - Go to **Settings** → **Database**
   - Copy the **Connection String** (with pooling)
   - Copy the **Direct Connection String** (without pooling)

3. **Update backend/.env:**
   ```env
   DATABASE_URL="your-new-pooler-connection-string"
   DIRECT_URL="your-new-direct-connection-string"
   ```

4. **Test Connection:**
   ```bash
   cd backend
   npx prisma db push
   ```

---

## Issue 2: Google OAuth Origin Error ❌

### Error:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID
```

### Solution:
You need to add `http://localhost:3000` to authorized origins in Google Console.

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Select your project

2. **Update OAuth Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID: `63548919267-4u149v26e796g31a5sam1ofl6i59l9qc`

3. **Add Authorized JavaScript Origins:**
   - Click **Edit OAuth client**
   - Under "Authorized JavaScript origins", add:
     ```
     http://localhost:3000
     http://localhost:4000
     ```

4. **Add Authorized Redirect URIs:**
   - Add these URIs:
     ```
     http://localhost:3000
     http://localhost:3000/login
     http://localhost:3000/student/dashboard
     ```

5. **Save Changes**

---

## Issue 3: Multiple 401 Errors ✅ FIXED

### What was happening:
Frontend was continuously calling `/me` endpoint without auth token.

### What I fixed:
- Updated error handling to suppress 401 logs
- These errors are expected when user is not logged in
- Now handled silently

---

## Issue 4: 500 Error on Google Login

### Cause:
Database connection issue + user might not exist in database

### Solution:

**Option A: Auto-create users (Recommended)**

Update `backend/src/modules/auth/auth.repo.ts`:

```typescript
export const findUserByEmailAndLinkGoogle = async ({email, name, pictureUrl, googleId}: GoogleProfile) => {
    try {
        const dataToUpdate: Prisma.UserUpdateInput = {
            googleId: googleId,
        }
        if (name !== undefined) {
            dataToUpdate.name = name;
        }
        if (pictureUrl !== undefined) {
            dataToUpdate.pictureUrl = pictureUrl;
        }
        
        // Try to update existing user
        const user = await prisma.user.update({
            where: { email: email },
            data: dataToUpdate,
        })
        return user;
        
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
            // User not found, create new user
            try {
                const newUser = await prisma.user.create({
                    data: {
                        email: email,
                        name: name || null,
                        pictureUrl: pictureUrl || null,
                        googleId: googleId,
                        role: 'STUDENT', // Default role
                    }
                });
                return newUser;
            } catch (createError) {
                console.error('Failed to create user:', createError);
                return null;
            }
        }
        throw error;
    }
}
```

**Option B: Manually add user to database**

1. Create a user in your database with the Google email
2. Then try Google login again

---

## Quick Test Steps:

1. **Fix Database:**
   ```bash
   # Update .env with correct credentials
   cd backend
   npx prisma db push
   npm run dev
   ```

2. **Fix Google Console:**
   - Add `http://localhost:3000` to authorized origins
   - Wait 5-10 minutes for changes to propagate

3. **Test Login:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Visit http://localhost:3000/login
   - Try email login first (should work)
   - Then try Google login

---

## Current Status:

✅ Frontend code - FIXED
✅ Error handling - FIXED  
❌ Database connection - NEEDS YOUR ACTION
❌ Google authorized origins - NEEDS YOUR ACTION
❌ User auto-creation - OPTIONAL (see Option A above)

---

## Need Help?

1. **Database issues:** Check Supabase dashboard for project status
2. **Google issues:** Wait 5-10 mins after updating Google Console
3. **Still errors:** Share the exact error message

