# Network Access Fix for Cross-Device Login

## Problem
When trying to login from a different device on the same network (e.g., accessing `http://10.11.16.132:3000`), you were getting network errors due to:
1. CORS blocking requests from LAN IPs
2. Frontend API URL hardcoded to `localhost`
3. Cookie settings not optimized for LAN access

## Solutions Implemented

### 1. Backend CORS Configuration (`backend/src/config/cors.ts`)
- **Auto-detects LAN IP** and adds it to allowed origins in development mode
- **Automatically allows LAN IPs** (like `10.11.16.132`) on common frontend ports (3000, 3001, 3002, 3003)
- Works for any device on the same network

### 2. Frontend API URL Auto-Detection
Updated both API files to automatically detect the current hostname:
- `frontend/app/utils/api.ts` - Auto-detects API URL from `window.location.hostname`
- `frontend/lib/api.ts` - Same auto-detection logic

**How it works:**
- If accessing via `http://10.11.16.132:3000`, the API will automatically use `http://10.11.16.132:4000`
- If accessing via `http://localhost:3000`, the API will use `http://localhost:4000`
- Environment variables (`NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_BASE_URL`) take priority if set

### 3. Cookie Settings (`backend/src/lib/cookie-utils.ts`)
- Cookies work correctly for LAN IPs with `sameSite: 'lax'`
- No domain restriction needed for LAN IPs
- Works across different ports on the same IP address

## Testing

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   The server will show your LAN IP in the console:
   ```
   🌐 LAN URL:      http://10.11.16.132:4000
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access from another device:**
   - Open `http://10.11.16.132:3000` on any device on the same network
   - The frontend will automatically detect the IP and connect to `http://10.11.16.132:4000`
   - Login should work without network errors

## Environment Variables (Optional)

If you want to explicitly set the API URL, you can add to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://10.11.16.132:4000
# OR
NEXT_PUBLIC_API_BASE_URL=http://10.11.16.132:4000/api
```

But this is **not required** - the auto-detection should work automatically.

## Troubleshooting

If you still get network errors:

1. **Check backend is listening on all interfaces:**
   - The backend should show: `🌐 LAN URL: http://10.11.16.132:4000`
   - If it only shows `localhost`, check your firewall settings

2. **Check CORS logs:**
   - The backend console will show: `[CORS] Auto-allowing LAN origin: http://10.11.16.132:3000`

3. **Check browser console:**
   - Look for: `[API] Auto-detected API URL: http://10.11.16.132:4000`

4. **Firewall:**
   - Make sure port 4000 is open in your firewall for incoming connections

5. **Alternative: Use ALLOW_ALL_ORIGINS (Development Only)**
   Add to `backend/.env`:
   ```env
   ALLOW_ALL_ORIGINS=true
   ```
   ⚠️ **Warning:** Only use this in development, never in production!

