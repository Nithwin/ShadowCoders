# ngrok Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install ngrok

**Windows:**
```powershell
# Option 1: Download from https://ngrok.com/download
# Option 2: Using Chocolatey
choco install ngrok

# Option 3: Using npm
npm install -g ngrok
```

**Mac/Linux:**
```bash
# Download from https://ngrok.com/download
# Or using Homebrew (Mac)
brew install ngrok/ngrok/ngrok

# Or using npm
npm install -g ngrok
```

### Step 2: Authenticate ngrok

1. Sign up at https://dashboard.ngrok.com/signup
2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
3. Authenticate:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Step 3: Configure Backend .env

Create or update `backend/.env`:
```env
PORT=4000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_api_key
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
ALLOW_NGROK=true
```

### Step 4: Start Backend and ngrok

**Windows PowerShell:**
```powershell
cd backend
.\scripts\start-backend-ngrok.ps1
```

**Mac/Linux:**
```bash
cd backend
chmod +x scripts/start-backend-ngrok.sh
./scripts/start-backend-ngrok.sh
```

**Manual (if scripts don't work):**
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start ngrok
ngrok http 4000
```

### Step 5: Copy ngrok URL

After starting ngrok, you'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:4000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

### Step 6: Configure Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** `https://abc123.ngrok-free.app/api` (use your ngrok URL)
   - **Environment:** Select all (Production, Preview, Development)
3. **Redeploy** your Vercel app

### Step 7: Test

1. Visit your Vercel app
2. Test API calls - they should work!
3. Check browser console for any CORS errors

## ✅ Verification Checklist

- [ ] ngrok is installed and authenticated
- [ ] Backend is running on `http://localhost:4000`
- [ ] ngrok is running and forwarding to port 4000
- [ ] Backend `.env` has `FRONTEND_ORIGIN` set to your Vercel URL
- [ ] Backend `.env` has `ALLOW_NGROK=true` (or omitted, defaults to true)
- [ ] Vercel has `NEXT_PUBLIC_API_BASE_URL` environment variable set
- [ ] Vercel app has been redeployed

## 🔧 Troubleshooting

### CORS Errors
- Make sure `FRONTEND_ORIGIN` in backend `.env` matches your Vercel URL exactly
- Make sure `ALLOW_NGROK=true` in backend `.env`
- Check browser console for specific CORS error messages

### ngrok URL Changes
- Free ngrok URLs change every restart
- Update Vercel environment variable each time ngrok restarts
- Consider paid ngrok plan for static domain

### Backend Not Accessible
- Verify backend is running: `http://localhost:4000/api/healthz`
- Verify ngrok is forwarding: `https://your-ngrok-url.ngrok-free.app/api/healthz`
- Check firewall settings

### Cookies Not Working
- Backend CORS has `credentials: true` (already configured)
- Frontend axios has `withCredentials: true` (already configured)
- Make sure both frontend and backend use HTTPS (ngrok provides this)

## 📝 Important Notes

1. **Keep ngrok running** - The tunnel must stay active while your backend is running
2. **URL changes** - Free ngrok URLs change on restart. Update Vercel env var each time
3. **Security** - Keep your ngrok URL private. Don't share it publicly
4. **Development only** - Consider deploying backend to cloud (Railway, Render, AWS) for production

## 🎯 Next Steps

- Set up monitoring for your ngrok tunnel
- Consider migrating to a cloud backend for production
- Set up automatic deployments
- Configure SSL certificates if needed

## 📚 Full Documentation

See [NGROK_SETUP.md](./NGROK_SETUP.md) for detailed documentation.

