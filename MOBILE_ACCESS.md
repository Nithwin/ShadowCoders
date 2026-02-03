# 📱 Mobile Access Guide

## Quick Start

Your local IP address is: **10.11.74.80**

### Option 1: Use the Quick Start Script (Recommended)

```powershell
# Run this in PowerShell from the project root:
.\start-mobile-dev.ps1
```

This will automatically start both backend and frontend servers.

### Option 2: Manual Start

#### 1. Start Backend Server

```powershell
cd backend
npm run dev
```

The backend will run on: `http://10.11.74.80:4000`

#### 2. Start Frontend Server

```powershell
cd frontend
npm run dev
```

The frontend will run on: `http://10.11.74.80:3000`

## 📱 Access from Mobile

### Prerequisites
- Ensure your mobile device is connected to the **same WiFi network** as your PC
- Make sure Windows Firewall allows incoming connections on ports 3000 and 4000

### Access URLs

**On your mobile browser, open:**
```
http://10.11.74.80:3000
```

## 🔥 Windows Firewall Configuration

If you can't access from mobile, allow the ports through Windows Firewall:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Node.js Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
```

Or manually:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Enter port 3000 (then repeat for 4000)
6. Allow the connection

## 🔍 Troubleshooting

### Can't access from mobile?

1. **Check if servers are running:**
   - Backend: `http://10.11.74.80:4000/api/healthz`
   - Frontend: `http://10.11.74.80:3000`

2. **Verify same WiFi network:**
   ```powershell
   # On PC, check your IP:
   ipconfig
   
   # On mobile, check your IP in WiFi settings
   # Both should be on same subnet (e.g., 10.11.74.x)
   ```

3. **Test firewall:**
   ```powershell
   # Temporarily disable Windows Firewall to test
   # (Don't forget to re-enable it!)
   ```

4. **Check if ports are listening:**
   ```powershell
   netstat -ano | findstr ":3000"
   netstat -ano | findstr ":4000"
   ```

### IP Address Changed?

If your IP address changes (e.g., after reconnecting to WiFi):

1. Get new IP:
   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "10.*"} | Select IPAddress
   ```

2. Update `.env.local` in frontend:
   ```
   NEXT_PUBLIC_API_URL=http://YOUR_NEW_IP:4000/api
   NEXT_PUBLIC_API_BASE_URL=http://YOUR_NEW_IP:4000/api
   ```

3. Update `.env` in backend:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_NEW_IP:3000
   ```

4. Restart both servers

## 📝 Notes

- The frontend is already configured to bind to `0.0.0.0` (all network interfaces)
- The backend is also configured to listen on all interfaces
- CORS is pre-configured to allow your IP address
- Both servers will show your LAN URL when they start

## 🎯 Current Configuration

- **Frontend URL:** http://10.11.74.80:3000
- **Backend API:** http://10.11.74.80:4000/api
- **Allowed Origins:** localhost:3000, 10.11.74.80:3000

Enjoy testing on your mobile device! 🚀
