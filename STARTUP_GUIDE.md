# 🚀 ShadowCoders — Quick Startup Guide

This guide provides the minimal commands needed to start the platform on **Windows** and **Linux (Ubuntu)**.

---

## 🐧 Linux (Ubuntu) — Unified Setup
The easiest way to start on Ubuntu using the unified script.

### 1-Time Setup & Start
Run this from the project root:
```bash
sudo bash deploy-ubuntu.sh
```

### Manual Control (Ubuntu)
- **Check Status**: `pm2 status`
- **Stop Server**: `pm2 stop sc-api sc-frontend sc-worker`
- **Start Server**: `pm2 start infra/pm2/unified.config.js`
- **View Logs**: `pm2 logs`

---

## 🪟 Windows — Manual Startup
For Windows, you need to run the components in separate terminals.

### 1. Prerequisites (Must be Running)
- **Redis**: `docker run -d --name sc-redis -p 6379:6379 redis` (Or use the Windows MSI installer)
- **Docker Desktop**: Must be "Green" (Engine Running)

### 2. Start Application
Open two terminals in the root folder:

**Terminal 1 (API & Frontend)**:
```powershell
npm run dev
```

**Terminal 2 (Code Execution Worker)**:
```powershell
cd worker
npm run dev
```

---

## 📊 Summary Table

| OS | Main Startup Command | Intelligent Layers | Persistence |
| :--- | :--- | :--- | :--- |
| **Ubuntu** | `sudo bash deploy-ubuntu.sh` | **Auto-Started** | Explicit Start |
| **Windows** | `npm run dev` (+ Worker) | **Manual Start** | Manual Start |

---

## 🚩 Troubleshooting
- **Redis Error**: Ensure Redis is running on port `6379`.
- **Java/Docker Error**: Ensure Docker Desktop is running and WSL is updated (`wsl --update`).
- **Stable Version**: Currently running **v3-stable** for maximum reliability during exams.
