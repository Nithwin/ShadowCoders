# 🚀 ShadowCoders — Ubuntu Production Guide

This guide covers everything you need to manage the platform, handle heavy student loads, and fix common issues.

---

## ⚡ Quick Management (Ubuntu)

Use these commands from the project root (`/home/cse/Desktop/ShadowCoders`):

### 🔄 Restart Everything (Apply Changes)
```bash
pm2 restart all
```

### 🛑 Stop All Services
```bash
pm2 stop all
```

### 🟢 Start All Services
```bash
pm2 start infra/pm2/unified.config.js
```

### 📋 Check Service Status
```bash
pm2 status
```

### 📜 View Live Logs
```bash
pm2 logs
```

---

## 🛠️ Infrastructure Health
The platform depends on these three services. Check them if students can't log in or code won't run.

| Service | Check Command | Status Goal |
| :--- | :--- | :--- |
| **PostgreSQL** | `systemctl status postgresql` | `active (running)` |
| **Redis** | `redis-cli ping` | `PONG` |
| **Docker** | `sudo docker ps` | `CONTAINER ID ...` |

> [!TIP]
> **If Docker/Sandbox fails:** The system will fallback to "unsafe" execution or fail. Ensure Docker is running so Java/Python code executes in a secure sandbox.

---

## 🚀 Exam Readiness (Handling 173+ Students)

You mentioned a **Java coding test (8 questions, 2 hours)**. Here is how to ensure 100% stability:

### 1. RAM Upgrade (Recommended)
Upgrading from **8GB to 16GB RAM** is a great move.
- **Why?** Each student submission spawns a Docker container. With 173 students potentially submitting at once, memory pressure will be high. 16GB provides the necessary "breathing room."

### 2. Sandbox Pre-warming
The `deploy-ubuntu.sh` already built the `sc-sandbox` image. To verify it manually:
```bash
sudo docker images | grep sc-sandbox
```

### 3. Worker Concurrency
In your `.env` (backend), ensure `WORKER_CONCURRENCY` is set appropriately. For 16GB RAM, a value of `8` or `16` is usually safe.

### 4. Client-Side Offloading (Unique Feature)
ShadowCoders can offload code execution to student machines!
- If the server gets slow, tell students to run the `local-runner.js` (found in `scripts/`).
- The UI will detect it and run code **locally on their PC**, reducing server load by 90%.

---

## 🚩 Troubleshooting
- **Frontend Permission Denied:** If you see `EACCES`, run:
  `sudo chown -R cse:cse /home/cse/Desktop/ShadowCoders/frontend`
- **Database Connection:** Ensure `DATABASE_URL` in `backend/.env` is correct.
- **Redis Error:** If the worker is crashing, restart Redis: `sudo systemctl restart redis`.

---
**Stable Version**: `v3-stable-final` (Deployed February 2026)

