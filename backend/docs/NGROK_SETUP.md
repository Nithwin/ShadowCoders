# ngrok Setup Guide for Backend

This guide will help you set up ngrok to expose your local backend server so it can be accessed by your Vercel-hosted frontend.

## Prerequisites

1. A ngrok account (free tier works fine)
2. ngrok installed on your local machine
3. Your backend running locally
4. Your frontend deployed on Vercel

## Step 1: Install ngrok

### Windows
1. Download ngrok from https://ngrok.com/download
2. Extract the ngrok.exe file to a folder (e.g., `C:\ngrok`)
3. Add ngrok to your PATH environment variable, or use the full path

### Alternative: Using Chocolatey
```powershell
choco install ngrok
```

### Alternative: Using npm (global)
```bash
npm install -g ngrok
```

## Step 2: Get Your ngrok Auth Token

1. Sign up at https://dashboard.ngrok.com/signup (if you don't have an account)
2. Go to https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your auth token
4. Authenticate ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

## Step 3: Start Your Backend Locally

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Make sure your `.env` file is configured with:
   ```env
   PORT=4000
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   GOOGLE_API_KEY=your_google_api_key
   FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
   ```

3. Start the backend:
   ```bash
   npm run dev
   ```

   Your backend should be running on `http://localhost:4000`

## Step 4: Start ngrok Tunnel

Open a new terminal window and run:

```bash
ngrok http 4000
```

This will create a tunnel to your local backend. You'll see output like:

```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:4000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`). This is your ngrok URL.

### Important Notes:
- **Free ngrok URLs change every time you restart ngrok**. If you need a stable URL, consider upgrading to a paid plan with a static domain.
- Keep this terminal window open while ngrok is running.

### Using a Static Domain (Paid Plan - Optional)

If you have a paid ngrok plan, you can use a static domain:

```bash
ngrok http 4000 --domain=your-static-domain.ngrok.app
```

## Step 5: Configure Backend CORS

Update your backend `.env` file to include your Vercel frontend URL:

```env
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
```

The backend CORS is already configured to accept this origin (see `backend/src/app.ts`).

**Note:** The backend will also need to accept the ngrok URL if you want to test locally. You may need to update the CORS configuration to accept multiple origins.

## Step 6: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** `https://your-ngrok-url.ngrok-free.app/api`
   - **Environment:** Production, Preview, and Development (select all)

4. **Redeploy your Vercel application** for the changes to take effect.

## Step 7: Update Backend CORS for ngrok (Optional)

If you want to test the frontend locally with ngrok, update the backend CORS to accept the ngrok URL as well. The current implementation in `app.ts` uses an environment variable, but you can add the ngrok URL dynamically.

For production use, you typically only need the Vercel URL in CORS.

## Step 8: Verify the Setup

1. Make sure your backend is running locally
2. Make sure ngrok is running and forwarding to port 4000
3. Check that your Vercel app has the `NEXT_PUBLIC_API_BASE_URL` environment variable set
4. Visit your Vercel app and test API calls

### Test the ngrok URL directly:

Visit `https://your-ngrok-url.ngrok-free.app/api/healthz` in your browser. You should see a health check response.

## Troubleshooting

### Issue: CORS errors in browser
**Solution:** Make sure `FRONTEND_ORIGIN` in your backend `.env` matches your Vercel URL exactly (including `https://`).

### Issue: ngrok URL keeps changing
**Solution:** This is normal for the free tier. You'll need to update the Vercel environment variable each time. Consider:
- Using a paid ngrok plan with a static domain
- Using a script to automatically update Vercel env variables
- Using a service like Cloudflare Tunnel (free with static URLs)

### Issue: "ngrok is not recognized"
**Solution:** Make sure ngrok is installed and added to your PATH, or use the full path to ngrok.exe.

### Issue: Backend not accessible through ngrok
**Solution:** 
1. Verify your backend is running on the correct port (default: 4000)
2. Check that ngrok is forwarding to the correct port
3. Check your firewall settings
4. Verify the ngrok tunnel is active (check the ngrok dashboard)

### Issue: Cookies not working
**Solution:** Make sure:
- Backend CORS has `credentials: true`
- Frontend axios has `withCredentials: true` (already configured)
- Cookie domain settings are correct
- Using HTTPS (ngrok provides this automatically)

## Alternative: Using ngrok with a Config File

You can create an `ngrok.yml` config file for easier management:

1. Create `ngrok.yml` in your project root or home directory:
   ```yaml
   version: "2"
   authtoken: YOUR_AUTH_TOKEN
   tunnels:
     backend:
       proto: http
       addr: 4000
   ```

2. Start ngrok with:
   ```bash
   ngrok start backend
   ```

## Keeping ngrok Running

Since ngrok needs to run continuously while your backend is running, you have a few options:

1. **Keep the terminal open** - Simple but requires manual management
2. **Use a process manager** - Use PM2 or similar to keep both backend and ngrok running
3. **Create a startup script** - Create a script that starts both backend and ngrok

### Example: Starting Both with a Script (Windows PowerShell)

Create `start-backend-ngrok.ps1`:
```powershell
# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Start ngrok
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 4000"
```

## Security Considerations

1. **Keep your ngrok URL private** - Don't share it publicly
2. **Use ngrok's IP restrictions** - Configure allowed IPs in ngrok dashboard (paid feature)
3. **Monitor ngrok traffic** - Check the ngrok dashboard for unusual activity
4. **Rotate tokens** - Regularly rotate your ngrok auth token
5. **Use ngrok's web interface inspection** - Be cautious, as it can log requests (disable in production)

## Next Steps

- Consider setting up automatic deployments
- Set up monitoring for your ngrok tunnel
- Consider migrating to a cloud backend (AWS, Railway, Render, etc.) for production
- Set up SSL certificates for your backend if needed

