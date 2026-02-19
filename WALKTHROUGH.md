# ShadowCoders — Complete Walkthrough Guide

A beginner-friendly guide explaining what was added, why it was needed, how it all works together, and step-by-step setup instructions for Docker, Redis, and the full system.

---

## Table of Contents

1. [The Problem We Solved](#1-the-problem-we-solved)
2. [What Changed (Before vs After)](#2-what-changed-before-vs-after)
3. [Understanding Redis](#3-understanding-redis)
4. [Understanding Docker](#4-understanding-docker)
5. [Understanding BullMQ (Job Queue)](#5-understanding-bullmq-job-queue)
6. [Understanding the Worker Service](#6-understanding-the-worker-service)
7. [Understanding PM2 (Process Manager)](#7-understanding-pm2-process-manager)
8. [Understanding the Middleware Stack](#8-understanding-the-middleware-stack)
9. [How Code Execution Works End-to-End](#9-how-code-execution-works-end-to-end)
10. [Setup Guide — Local Development (Windows)](#10-setup-guide--local-development-windows)
11. [Setup Guide — Production (Linux)](#11-setup-guide--production-linux)
12. [Troubleshooting](#12-troubleshooting)
13. [File Map — What's New](#13-file-map--whats-new)

---

## 1. The Problem We Solved

### Before (Single Server, Everything Monolithic)

```
Student clicks "Run Code"
        │
        ▼
Express API receives request
        │
        ▼
Express spawns child_process directly on the host machine
(python, gcc, javac — running student code WITH FULL HOST ACCESS)
        │
        ▼
If 400 students click "Run" at once:
  - 400 child processes spawn on the same machine
  - CPU goes to 100%, server freezes
  - API can't respond to anyone
  - Exam crashes for ALL students
```

**Problems:**
- Student code ran directly on the server (could read files, access network, delete things)
- Single Express process — one slow request blocked everyone
- No queue — 400 simultaneous executions maxed out CPU instantly
- No rate limiting — a student spamming "Run" could DDoS the whole system
- Database polling every 1 second for pending jobs — wasted resources

### After (Distributed, Sandboxed, Queued)

```
Student clicks "Run Code"
        │
        ▼
Express API (behind rate limiter, circuit breaker)
        │
        ▼
Job added to Redis queue (instant, < 1ms)
        │
        ▼ (Redis pub/sub across network)
        │
Worker on Server 2 picks up job
        │
        ▼
Docker container spawns (isolated, no network, 128MB RAM max)
        │
        ▼
Result sent back via Redis pub/sub
        │
        ▼
Student gets their output
```

---

## 2. What Changed (Before vs After)

| Area | Before | After | Why It Matters |
|------|--------|-------|----------------|
| Code execution | `child_process.spawn()` on host | Docker container (isolated) | Students can't hack the server |
| Job queue | Poll PostgreSQL every 1s | BullMQ + Redis pub/sub | Zero latency, no DB load |
| Processes | 1 Express process | PM2 cluster (2 API + 2 frontend + 2 workers) | Uses all CPU cores |
| Rate limiting | None | 5 submissions/10s per user | Prevents spam |
| Overload | Server just dies | Circuit breaker rejects at CPU > 90% | Keeps existing users stable |
| Caching | Every request hits DB | Redis cache (30s leaderboard, 5m exam) | 100x faster reads |
| Shutdown | `kill` = data loss | Graceful drain (server → queue → Redis) | Zero lost jobs on deploy |
| Monitoring | Nothing | Health endpoints + queue monitor | Know when things break |

---

## 3. Understanding Redis

### What is Redis?
Redis is an **in-memory database** — it stores data in RAM instead of on disk. This makes it extremely fast (sub-millisecond reads/writes). Think of it as a super-fast dictionary/hashmap that multiple programs can share.

### Why Do We Need It?

We use Redis for **two purposes**:

#### Purpose 1: Job Queue (BullMQ)
```
API Server ──[adds job to Redis list]──> Redis ──[worker reads from list]──> Worker
                                           │
                                      Worker finishes
                                           │
                                      [publishes result to Redis channel]
                                           │
API Server <──[receives result instantly]──┘
```
BullMQ uses Redis lists and pub/sub channels internally. The API adds a job → Redis notifies the worker instantly → worker sends the result back via Redis → API gets it without polling.

#### Purpose 2: Caching
```
Request: "Show me the leaderboard"
  │
  ├─ Check Redis: is there a cached copy less than 30 seconds old?
  │   ├─ YES → return it instantly (< 1ms)
  │   └─ NO → query PostgreSQL → save result in Redis → return it
```

### Installing Redis

**Windows (for development):**
```powershell
# Option 1: Using WSL2 (recommended)
wsl --install
# Then inside WSL:
sudo apt update && sudo apt install redis-server
sudo service redis-server start

# Option 2: Using Docker (if you have Docker Desktop)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Option 3: Memurai (native Windows Redis alternative)
# Download from https://www.memurai.com/
```

**Linux (Ubuntu — production):**
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify it's running:
redis-cli ping
# Should respond: PONG
```

**macOS:**
```bash
brew install redis
brew services start redis
```

### Redis Configuration for ShadowCoders

In your `.env` file:
```bash
# If Redis is on the same machine:
REDIS_URL=redis://127.0.0.1:6379

# If Redis is on a different machine (Server 1) and worker is on Server 2:
REDIS_URL=redis://192.168.1.10:6379
```

For remote access, edit `/etc/redis/redis.conf`:
```
bind 0.0.0.0          # Listen on all interfaces (or specific IP)
protected-mode no      # Allow remote connections
# OR use a password:
# requirepass YOUR_REDIS_PASSWORD
# Then: REDIS_URL=redis://:YOUR_REDIS_PASSWORD@192.168.1.10:6379
```

### Useful Redis Commands
```bash
redis-cli ping                          # Test connection → PONG
redis-cli info memory                   # Check memory usage
redis-cli LLEN bull:code-execution:wait # See how many jobs are queued
redis-cli KEYS "leaderboard:*"         # See cached leaderboards
redis-cli FLUSHALL                      # Clear everything (careful!)
redis-cli MONITOR                       # Watch all commands in real-time
```

---

## 4. Understanding Docker

### What is Docker?
Docker runs programs inside **containers** — lightweight, isolated virtual environments. Each container has its own filesystem, network, and process space. If a student writes `rm -rf /` inside a container, it only destroys that container (which dies in 10 seconds anyway).

### Why Do We Need It?
Student code is **untrusted**. Without Docker:
- A Python script could do `import os; os.system("rm -rf /")` 
- A C program could read `/etc/passwd`
- Code could make network requests to external servers
- An infinite loop would hang the entire server

With Docker, each execution is:
- **Network-isolated** (`--network none`) — can't access the internet
- **Memory-limited** (`--memory 128m`) — can't eat all RAM
- **CPU-limited** (`--cpus 0.5`) — can't hog the processor  
- **Read-only filesystem** (`--read-only`) — can't modify the container
- **Time-limited** (10 second kill) — can't run forever
- **Process-limited** (`--pids-limit 32`) — can't fork-bomb

### Installing Docker

**Windows (for development):**
```powershell
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Make sure WSL2 backend is enabled
# After install, restart and verify:
docker --version
docker run hello-world
```

**Linux (Ubuntu — production):**
```bash
# Install Docker
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker

# Allow your user to run docker without sudo:
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker run hello-world
```

### Building the Sandbox Image

The sandbox is a custom Docker image with compilers (GCC, G++, Java, Python) but NO dangerous tools (no wget, curl, apt, ssh).

```bash
# Navigate to the sandbox directory
cd docker/sandbox

# Build the image (do this once, or after changing the Dockerfile)
docker build -f Dockerfile.sandbox -t shadowcoders-sandbox:latest .

# Verify it was built:
docker images | grep shadowcoders
# Should show: shadowcoders-sandbox   latest   ...   ~400MB
```

### What's Inside the Sandbox Image?

```
Ubuntu 22.04 (minimal)
├── gcc / g++         — C/C++ compiler
├── default-jdk       — Java compiler + runtime
├── python3           — Python 3
├── coreutils         — Basic Linux tools (cat, echo, etc.)
│
├── REMOVED: wget, curl, nc, apt, dpkg, ssh, scp, sftp
│
├── Non-root user "sandbox" (UID 1000)
├── Resource limits: 1024 files, 128MB virtual memory, 10s CPU time
└── Working directory: /sandbox
```

### How Execution Works Inside Docker

```bash
# This is what the worker does internally (simplified):
docker run \
  --rm \                              # Auto-remove container after exit
  --network none \                    # No internet
  --memory 128m \                     # 128MB RAM max
  --cpus 0.5 \                        # Half a CPU core
  --read-only \                       # Can't modify filesystem
  --pids-limit 32 \                   # Max 32 processes
  --no-new-privileges \               # Can't escalate permissions
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \  # Writable /tmp (64MB, no executables)
  -v /tmp/job-abc123:/sandbox:ro \    # Mount code file read-only
  shadowcoders-sandbox:latest \
  python3 /sandbox/solution.py < /sandbox/input.txt
```

### Testing Docker Manually

```bash
# Test Python execution:
echo 'print("Hello from Docker!")' > /tmp/test.py
docker run --rm -v /tmp/test.py:/sandbox/test.py:ro shadowcoders-sandbox python3 /sandbox/test.py
# Output: Hello from Docker!

# Test that network is blocked:
docker run --rm --network none shadowcoders-sandbox python3 -c "import urllib.request; urllib.request.urlopen('http://google.com')"
# Should fail with network error

# Test memory limit:
docker run --rm --memory 128m shadowcoders-sandbox python3 -c "x = 'a' * (200 * 1024 * 1024)"
# Should be killed (OOM)
```

---

## 5. Understanding BullMQ (Job Queue)

### What is BullMQ?
BullMQ is a **job queue library** for Node.js. It lets you:
1. **Add jobs** from one program (the API)
2. **Process jobs** in another program (the worker)
3. **Get results** back without polling

It uses Redis as its storage backend.

### Why Not Just Run Code Directly?

If 400 students click "Run" at the same time:

**Without a queue:**
```
400 requests → 400 Docker containers spawn → server dies
```

**With BullMQ:**
```
400 requests → 400 jobs added to Redis queue (instant)
Worker processes 2 at a time (PM2 x2, concurrency=1)
Students wait 5-60 seconds depending on queue position
Server stays healthy the entire time
```

### How It Works in Our Code

**Step 1 — API adds a job** (`backend/src/lib/queue.ts`):
```typescript
// This is what happens when a student clicks "Run Code"
const job = await submitCodeJob({
  jobId: 'grade-abc123',
  code: 'print("hello")',
  language: 'python',
  testCases: [{ input: '', expectedOutput: 'hello' }],
  runAllTests: true,
});
```

**Step 2 — API waits for the result** (same file):
```typescript
// This does NOT poll the database!
// It uses Redis pub/sub — the moment the worker finishes, this resolves
const result = await waitForJobResult('grade-abc123', 30000); // 30s timeout
```

**Step 3 — Worker picks up the job** (`worker/src/index.ts`):
```typescript
// The worker automatically picks up jobs from the queue
const worker = new Worker('code-execution', async (job) => {
  // job.data has the code, language, test cases, etc.
  const result = await processCodeExecution(job.data);
  return result; // This gets sent back to the API via Redis pub/sub
});
```

### Backpressure (Protecting Against Overload)

If more than 500 jobs are queued:
```
Student clicks "Run" →
  API checks: 500+ jobs waiting? →
    YES: Return HTTP 503 "Server busy, estimated wait: 60s"
    NO:  Add job to queue normally
```

### Job Priority

| Action | Priority | Why |
|--------|----------|-----|
| Final exam submission | 1 (highest) | Student is submitting — can't wait |
| "Run Code" button | 2 (lower) | Just testing — can wait longer |

---

## 6. Understanding the Worker Service

### What is It?
A **separate Node.js application** that runs independently from the API. Its only job: pick up code execution tasks from the Redis queue and run them in Docker containers.

### Why Separate It?
- If a Docker execution hangs or crashes, it doesn't affect the API
- Workers can run on a different, cheaper machine
- You can scale workers independently (add more machines later)
- PM2 auto-restarts crashed workers

### File Structure
```
worker/
├── src/
│   ├── index.ts            # Entry point — creates BullMQ Worker, handles shutdown
│   ├── processor.ts        # Receives job data, decides how to execute
│   ├── docker-executor.ts  # Spawns Docker containers, captures output
│   ├── health.ts           # HTTP server on port 3001 for monitoring
│   └── redis.ts            # Redis connection
├── .env.example            # Template environment variables
├── package.json            # Dependencies (bullmq, ioredis)
└── tsconfig.json           # TypeScript config
```

### Worker Lifecycle
```
PM2 starts worker
  → Connects to Redis
  → Creates BullMQ Worker (concurrency=1)
  → Starts health server on port 3001
  → Waits for jobs...
  
Job arrives:
  → processor.ts receives job data
  → docker-executor.ts writes code to temp file
  → Spawns Docker container with security flags
  → Waits for output (max 10s)
  → Cleans up container and temp files
  → Returns result to Redis
  
SIGTERM received (deploy/restart):
  → Worker stops accepting new jobs
  → Waits for current job to finish
  → Closes Redis connection
  → Exits cleanly
```

---

## 7. Understanding PM2 (Process Manager)

### What is PM2?
PM2 is a **process manager** for Node.js. It:
- Runs your app as a background service (like a Linux daemon)
- Restarts it automatically if it crashes
- Can run multiple instances (cluster mode) for multi-core usage
- Provides zero-downtime restarts during deployments

### Why Do We Need It?
Without PM2:
```bash
node backend/dist/index.js
# If this crashes at 3 AM, your exam platform is dead until you wake up
# Also: only uses 1 CPU core on a 4-core machine
```

With PM2:
```bash
pm2 start infra/pm2/api.config.js
# Runs 2 instances, auto-restarts on crash, uses 2 CPU cores
# Logs to /var/log/pm2/
```

### Installing PM2
```bash
npm install -g pm2
```

### Our PM2 Configs

**API** (`infra/pm2/api.config.js`) — 2 Express instances:
```
pm2 start infra/pm2/api.config.js
# Starts 2 Express processes on port 4000
# PM2 load-balances between them automatically
```

**Frontend** (`infra/pm2/frontend.config.js`) — 2 Next.js instances:
```
pm2 start infra/pm2/frontend.config.js
# Starts 2 Next.js processes on port 3000
```

**Worker** (`infra/pm2/worker.config.js`) — 2 worker instances:
```
pm2 start infra/pm2/worker.config.js
# Starts 2 BullMQ workers (each processes 1 job at a time = 2 parallel)
```

### Useful PM2 Commands
```bash
pm2 status                  # See all running processes
pm2 logs                    # See live logs from all processes
pm2 logs api --lines 100    # Last 100 lines from API
pm2 restart api             # Restart API (has brief downtime)
pm2 reload api              # Zero-downtime restart (rolling)
pm2 monit                   # Live CPU/memory dashboard
pm2 save                    # Save current process list
pm2 startup                 # Setup auto-start on server boot
```

---

## 8. Understanding the Middleware Stack

Middleware runs in order **before** your route handler. Think of it like security checkpoints at an airport.

```
Request arrives
  │
  ▼
[1] Compression — gzip the response (saves bandwidth)
  │
  ▼
[2] Circuit Breaker — is server overloaded? (CPU > 90%)
  │   └─ YES → 503 "Server busy, retry in 10s"
  │
  ▼
[3] Rate Limiter — has this user sent too many requests?
  │   └─ More than 30 req/10s → 429 "Too many requests"
  │   └─ More than 5 code submissions/10s → 429
  │
  ▼
[4] Input Validation — is the code too large? Unknown language?
  │   └─ Code > 50KB → 413 "Code too large"
  │   └─ Language not in allowlist → 400 "Unsupported language"
  │
  ▼
[5] Zod Validation — does the request body match the expected schema?
  │
  ▼
[6] JWT Auth — is the user logged in? What role do they have?
  │
  ▼
[7] Route Handler (controller → service → database)
```

---

## 9. How Code Execution Works End-to-End

Let's trace exactly what happens when a student clicks "Run Code" with a Python program:

```
STUDENT'S BROWSER
│
│ POST /api/grading/run
│ Body: { code: "print('hello')", language: "python", customInput: "" }
│
▼
NGINX (Server 1)
│ ✓ Rate limit check: < 2 code submissions/sec from this IP
│ ✓ Connection limit: < 50 connections from this IP
│
▼
EXPRESS API (Server 1, one of 2 PM2 instances)
│ ✓ Circuit breaker: CPU is 45%, memory 60% — OK
│ ✓ Throttle: student has submitted 2/5 allowed in last 10s — OK
│ ✓ Input validation: code is 28 bytes (< 50KB), language "python" ✓
│ ✓ JWT auth: valid token, user is STUDENT role
│
│ grading.controller.ts → grading.service.ts → queue.ts
│ submitCodeJob({ jobId: "job-xyz", code: "print('hello')", language: "python" })
│   → Adds job to Redis list "bull:code-execution:wait"
│ waitForJobResult("job-xyz", 30000)
│   → Subscribes to Redis channel, waits for result...
│
▼
REDIS (Server 1)
│ Stores job in list
│ Publishes notification to worker channel
│
▼
BULLMQ WORKER (Server 2, one of 2 PM2 instances)
│ Picks up job from Redis
│ processor.ts → docker-executor.ts
│
│ 1. Write code to /tmp/job-xyz/solution.py
│ 2. Write input to /tmp/job-xyz/input.txt
│ 3. Spawn Docker container:
│    docker run --rm --network none --memory 128m --cpus 0.5
│      --read-only --pids-limit 32 --no-new-privileges
│      --tmpfs /tmp:rw,noexec,nosuid,size=64m
│      -v /tmp/job-xyz:/sandbox:ro
│      shadowcoders-sandbox
│      python3 /sandbox/solution.py < /sandbox/input.txt
│ 4. Wait for container to exit (max 10s)
│ 5. Capture stdout: "hello\n"
│ 6. Remove container, delete temp files
│ 7. Return result to Redis
│
▼
REDIS (Server 1)
│ Publishes result on QueueEvents channel
│
▼
EXPRESS API (still waiting from step above)
│ waitForJobResult resolves with { stdout: "hello\n", status: { id: 3 } }
│ Sends response to student
│
▼
STUDENT'S BROWSER
│ Shows: "hello"
│
│ Total time: ~2-5 seconds (mostly Docker startup + execution)
```

---

## 10. Setup Guide — Local Development (Windows)

### Prerequisites
1. **Node.js 18+** — https://nodejs.org/
2. **Redis** — via WSL2, Docker Desktop, or Memurai
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop/
4. **PostgreSQL** — https://www.postgresql.org/download/ (or use Supabase)

### Step-by-Step

```powershell
# 1. Clone and install dependencies
cd C:\Users\YourName\Desktop
git clone <your-repo-url> ShadowCoders
cd ShadowCoders

# Install backend dependencies
cd backend
npm install
copy .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, JWT_SECRET

# Run database migrations
npx prisma migrate deploy
npx prisma generate

# Install frontend dependencies
cd ..\frontend
npm install

# Install worker dependencies
cd ..\worker
npm install
copy .env.example .env
# Edit .env — set REDIS_URL=redis://127.0.0.1:6379

# 2. Build the Docker sandbox image
cd ..\docker\sandbox
docker build -f Dockerfile.sandbox -t shadowcoders-sandbox:latest .

# 3. Start Redis (choose one method)
# Method A: Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Method B: WSL
wsl -e sudo service redis-server start

# 4. Start everything (3 separate terminals)

# Terminal 1 — Backend API
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev

# Terminal 3 — Worker
cd worker
npm run dev
```

### Verify Everything Works
```powershell
# Check API health
curl http://localhost:4000/healthz
# Should return: { "status": "ok", "db": true, "redis": true, ... }

# Check worker health
curl http://localhost:9100/health
# Should return: { "status": "ok", "uptime": ..., "jobsProcessed": 0 }

# Check Redis
redis-cli ping
# Should return: PONG

# Check Docker
docker images | findstr shadowcoders
# Should show: shadowcoders-sandbox   latest   ...
```

---

## 11. Setup Guide — Production (Linux)

### Two-Server Architecture

| Server | Role | Minimum Specs | Monthly Cost |
|--------|------|--------------|-------------|
| Server 1 | API + Frontend + PostgreSQL + Redis | 2 vCPU, 4GB RAM, 40GB SSD | ₹1,500-2,000 |
| Server 2 | Workers + Docker | 2 vCPU, 2GB RAM, 20GB SSD | ₹500-1,000 |

### Server 1 Setup

```bash
# Run the automated setup script
bash infra/scripts/setup-server1.sh

# Configure environment
cp backend/.env.example backend/.env
nano backend/.env
# Set:
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/shadowcoders
#   REDIS_URL=redis://127.0.0.1:6379
#   JWT_SECRET=<random 64 character string>
#   NODE_ENV=production
#   EXECUTION_OS=linux
#   FRONTEND_ORIGIN=https://yourdomain.com

# Build backend
cd backend
npm install
npx prisma migrate deploy
npm run build

# Build frontend
cd ../frontend
npm install
npm run build

# Start with PM2
pm2 start infra/pm2/api.config.js
pm2 start infra/pm2/frontend.config.js
pm2 save
pm2 startup   # Auto-start on reboot

# Configure Nginx
sudo cp infra/nginx/shadowcoders.conf /etc/nginx/sites-available/shadowcoders
sudo ln -s /etc/nginx/sites-available/shadowcoders /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Allow Server 2 to access Redis
sudo nano /etc/redis/redis.conf
# Change: bind 0.0.0.0
# Add: requirepass YOUR_REDIS_PASSWORD
sudo systemctl restart redis-server
```

### Server 2 Setup

```bash
# Run the automated setup script
bash infra/scripts/setup-server2.sh

# Build Docker sandbox image
cd docker/sandbox
docker build -f Dockerfile.sandbox -t shadowcoders-sandbox:latest .

# Configure environment
cp worker/.env.example worker/.env
nano worker/.env
# Set:
#   REDIS_URL=redis://:YOUR_REDIS_PASSWORD@SERVER1_IP:6379
#   DOCKER_IMAGE=shadowcoders-sandbox:latest

# Build and start worker
cd ../../worker
npm install
npm run build
pm2 start infra/pm2/worker.config.js
pm2 save
pm2 startup

# Set up CPU watchdog (check every 5 minutes)
crontab -e
# Add: */5 * * * * /path/to/ShadowCoders/infra/scripts/cpu-watchdog.sh

# Set up queue monitor (check every minute)
# Add: * * * * * /path/to/ShadowCoders/infra/monitoring/queue-monitor.sh
```

### Deploy Updates (Zero Downtime)

```bash
# On both servers:
bash infra/scripts/deploy.sh
# This does: git pull → npm install → build → pm2 reload (rolling restart)
```

---

## 12. Troubleshooting

### Redis Won't Connect
```bash
# Check if Redis is running
redis-cli ping
# If "Connection refused":
sudo systemctl start redis-server   # Linux
# OR
docker start redis                   # Docker

# Check if the URL is correct in .env
# REDIS_URL=redis://127.0.0.1:6379

# For remote Redis, check firewall
sudo ufw allow 6379/tcp
```

### Docker Container Fails / "Image Not Found"
```bash
# Check if image exists
docker images | grep shadowcoders
# If nothing shows, rebuild:
cd docker/sandbox
docker build -f Dockerfile.sandbox -t shadowcoders-sandbox:latest .

# Check if Docker daemon is running
docker ps
# If "Cannot connect to Docker daemon":
sudo systemctl start docker   # Linux
# OR start Docker Desktop       # Windows
```

### Worker Not Processing Jobs
```bash
# Check worker logs
pm2 logs worker --lines 50

# Check if worker is connected to Redis
curl http://localhost:9100/health

# Check queue depth
redis-cli LLEN bull:code-execution:wait
# If this number keeps growing, workers aren't consuming

# Restart workers
pm2 restart worker
```

### API Returns 503 "Server Busy"
```
This means the circuit breaker tripped (CPU > 90% or memory > 85%)
OR the queue has > 500 jobs waiting.

Solutions:
1. Wait for the queue to drain
2. Add more worker instances: pm2 scale worker +2
3. Check for runaway jobs: pm2 logs worker
```

### API Returns 429 "Too Many Requests"
```
The per-user rate limiter kicked in.
- Code submissions: max 5 per 10 seconds
- API requests: max 30 per 10 seconds

This is by design — wait a few seconds and retry.
```

### Compilation Errors After Code Changes
```bash
# Backend
cd backend && npx tsc --noEmit

# Worker
cd worker && npx tsc --noEmit

# If errors appear, check the output for file:line references
```

---

## 13. File Map — What's New

All files added or significantly modified during the production transformation:

### New Files

| File | Purpose |
|------|---------|
| `backend/src/lib/redis.ts` | Redis connection with reconnect strategy |
| `backend/src/lib/queue.ts` | BullMQ producer — submitCodeJob, waitForJobResult |
| `backend/src/lib/cache.ts` | Redis caching for leaderboard/exam/questions |
| `backend/src/middleware/circuit-breaker.ts` | Rejects traffic when CPU > 90% |
| `backend/src/middleware/throttle.ts` | Per-user rate limiting |
| `backend/src/middleware/input-validation.ts` | Code size & language validation |
| `worker/src/index.ts` | BullMQ Worker with graceful shutdown |
| `worker/src/processor.ts` | Job processing logic |
| `worker/src/docker-executor.ts` | Docker container management |
| `worker/src/health.ts` | Health check HTTP server |
| `worker/src/redis.ts` | Worker Redis connection |
| `infra/pm2/api.config.js` | PM2 config for Express API |
| `infra/pm2/frontend.config.js` | PM2 config for Next.js |
| `infra/pm2/worker.config.js` | PM2 config for workers |
| `infra/nginx/shadowcoders.conf` | Nginx with rate limiting & gzip |
| `infra/scripts/setup-server1.sh` | Server 1 provisioning |
| `infra/scripts/setup-server2.sh` | Server 2 provisioning |
| `infra/scripts/deploy.sh` | Zero-downtime deployment |
| `infra/scripts/cpu-watchdog.sh` | CPU monitoring cron |
| `infra/monitoring/queue-monitor.sh` | Queue depth monitor |
| `load-tests/autocannon-api.js` | HTTP load test |
| `load-tests/submit-flood.js` | 400-user simulation |
| `backend/.env.example` | Backend env template |
| `worker/.env.example` | Worker env template |

### Modified Files

| File | What Changed |
|------|-------------|
| `backend/src/app.ts` | Added compression, circuit breaker, enhanced healthz |
| `backend/src/index.ts` | Added graceful shutdown (queues + Redis) |
| `backend/src/modules/grading/grading.service.ts` | Code execution via BullMQ instead of direct spawn |
| `backend/src/modules/grading/grading.logic.ts` | gradeCoding via BullMQ instead of local executor |
| `backend/src/modules/grading/grading.routes.ts` | Added throttle + input validation middleware |
| `backend/src/modules/execution/execution.controller.ts` | Routes through BullMQ |
| `backend/src/modules/execution/execution.routes.ts` | Added middleware params |
| `backend/package.json` | Added bullmq, ioredis, compression deps |
| `backend/prisma/schema.prisma` | Added GradingJob indexes |
| `docker/sandbox/Dockerfile.sandbox` | Hardened security, removed dangerous binaries |
