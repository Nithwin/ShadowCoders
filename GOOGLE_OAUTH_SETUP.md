# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Console account
- Backend server running

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure OAuth consent screen if not done:
   - User Type: External (for testing)
   - App name: ShadowCoders
   - User support email: your email
   - Add test users if needed
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: ShadowCoders Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:4000`
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - `http://localhost:3000/login`

## Step 2: Configure Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

Replace `your-client-id-here` with your actual Google Client ID from Step 1.

### Backend (.env)
```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## Step 3: Test the Integration

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Click "Continue with Google" button
5. Select your Google account
6. Login should complete and redirect to dashboard

## How It Works

1. User clicks "Continue with Google"
2. Google Sign-In popup appears
3. User selects Google account
4. Frontend receives credential token
5. Frontend extracts user profile (email, name, picture)
6. Frontend sends profile to backend `/api/auth/google/callback`
7. Backend verifies user exists in database
8. Backend returns access token and sets refresh token cookie
9. Frontend stores access token and fetches user data
10. User redirected to appropriate dashboard

## Troubleshooting

### "Google Sign-In not loading"
- Check if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- Open browser console for errors
- Ensure domain is added to authorized origins

### "User not registered" error
- User must exist in database first
- Add user with matching email in database
- Or modify backend to auto-create users

### "Invalid token" error
- Check if client ID matches between frontend and backend
- Verify token hasn't expired
- Check network requests in DevTools

## Security Notes

- Never commit `.env` files to git
- Keep client secret secure (backend only)
- Use HTTPS in production
- Set proper CORS origins
- Validate tokens on backend
