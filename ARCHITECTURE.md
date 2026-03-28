# ShadowCoders - System Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Distributed Deployment](#distributed-deployment)
5. [Backend Architecture](#backend-architecture)
6. [Worker Service](#worker-service)
7. [Frontend Architecture](#frontend-architecture)
8. [Database Schema](#database-schema)
9. [Queue & Cache Layer (Redis)](#queue--cache-layer-redis)
10. [Security & Stability](#security--stability)
11. [Monitoring & Ops](#monitoring--ops)
12. [Linux Deployment](#linux-deployment)

---

## Overview

ShadowCoders is a production-grade online examination platform built to handle **400+ concurrent students** on a 2-server infrastructure (budget: ₹2-3K/month). It supports multiple question types (MCQ, Coding, SQL, Essay, Speaking, Listening, Reading, Fill-in-the-blank) with automated grading, AI-powered question generation, real-time proctoring, and Docker-sandboxed code execution.

### Key Capabilities
- **Multi-question Type Support**: MCQ, Coding, SQL, Essay, Speaking, Listening, Reading, Fill-in-the-blank
- **Docker-Sandboxed Code Execution**: All student code runs in isolated Docker containers (no host access)
- **BullMQ Job Queue**: Redis-backed queue replacing database polling — zero-latency job dispatch
- **PM2 Cluster Mode**: Multi-process deployment for both API and frontend
- **Real-time Monitoring**: Socket.IO for live exam proctoring and admin dashboards
- **Anti-cheating**: Fullscreen enforcement, tab-switch detection, copy/paste prevention, webcam proctoring
- **AI Integration**: Gemini AI for question generation and plagiarism detection
- **Partial Grading**: Proportional scoring based on test cases passed

---

## System Architecture

### High-Level Architecture (2-Server)

```
                    ┌─────────────────────────────────┐
                    │         Client Browsers          │
                    │  (Students / Admins / Landing)   │
                    └───────────────┬─────────────────┘
                                    │ HTTPS / WSS
                    ┌───────────────▼─────────────────┐
                    │          Nginx Reverse Proxy     │
                    │  - Rate limiting (10 req/s)      │
                    │  - Connection limits (50/IP)     │
                    │  - Gzip compression              │
                    │  - WebSocket upgrade             │
                    └───────────────┬─────────────────┘
                                    │
      ┌─────────────────────────────┼─────────────────────────────┐
      │                    SERVER 1 (API + DB)                    │
      │                                                           │
      │  ┌─────────────────┐   ┌─────────────────┐              │
      │  │  Next.js 16     │   │  Express 5 API  │              │
      │  │  (PM2 x2)       │   │  (PM2 x2)       │              │
      │  │  Port 3000      │   │  Port 4000       │              │
      │  └─────────────────┘   └────────┬─────────┘              │
      │                                 │                         │
      │       ┌────────────┬────────────┼─────────┐              │
      │       │            │            │         │              │
      │  ┌────▼───┐  ┌─────▼────┐  ┌───▼───┐  ┌──▼──┐          │
      │  │PostgreSQL│ │  Redis   │  │Socket │  │ AI  │          │
      │  │(Prisma) │ │(BullMQ + │  │  .IO  │  │Gemini│         │
      │  │         │ │ Cache)   │  │       │  │     │          │
      │  └─────────┘ └─────┬────┘  └───────┘  └─────┘          │
      └─────────────────────┼─────────────────────────────────────┘
                            │ Redis pub/sub (job dispatch)
      ┌─────────────────────┼─────────────────────────────────────┐
      │                    SERVER 2 (Workers)                      │
      │                                                           │
      │  ┌──────────────────────────────────────────────┐        │
      │  │     BullMQ Worker (PM2 x2, concurrency=1)    │        │
      │  │  - Picks jobs from Redis queue                │        │
      │  │  - Spawns Docker containers per execution     │        │
      │  │  - Returns results via Redis pub/sub          │        │
      │  └──────────────────────┬───────────────────────┘        │
      │                         │                                 │
      │  ┌──────────────────────▼───────────────────────┐        │
      │  │          Docker Sandbox Containers            │        │
      │  │  - --network none (no internet)              │        │
      │  │  - --memory 128m                              │        │
      │  │  - --cpus 0.5                                 │        │
      │  │  - --read-only (immutable FS)                 │        │
      │  │  - --pids-limit 32                            │        │
      │  │  - --no-new-privileges                        │        │
      │  │  - 10s hard timeout                           │        │
      │  └──────────────────────────────────────────────┘        │
      └───────────────────────────────────────────────────────────┘
```

### Request Flow — Code Execution

```
1. Student submits code → Express API
2. Middleware: throttle (5/10s) → validate (50KB limit) → circuit breaker (CPU<90%)
3. API submits job to BullMQ Redis queue → returns job ID
4. API waits for result via Redis QueueEvents pub/sub (30s timeout)
5. Worker picks job → spawns Docker container → runs code → returns result
6. Result flows back to API → responds to student
```

### Request Flow — Exam Submission Auto-Grading

```
1. Student submits exam → Express API
2. For each CODING/SQL question:
   a. Submit inline grading job to BullMQ
   b. Wait for Docker execution result (60s timeout)
   c. Calculate partial score (passed/total * points)
3. For MCQ: instant local grading (no queue needed)
4. Store scores in PostgreSQL → return results
```

---

## Technology Stack

### Backend (Server 1)
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Language | TypeScript | 5.x |
| Framework | Express.js | 5.x |
| Database | PostgreSQL | 15+ |
| ORM | Prisma | 6.17+ |
| Queue | BullMQ | 5.x |
| Cache/Pub-Sub | Redis (ioredis) | 5.x |
| Validation | Zod | 4.x |
| Auth | JWT + bcrypt | — |
| WebSocket | Socket.IO | 4.x |
| AI | Google Gemini AI | — |
| Process Manager | PM2 | 5.x |
| Reverse Proxy | Nginx | 1.18+ |

### Worker (Server 2)
| Component | Technology |
|-----------|-----------|
| Queue Consumer | BullMQ Worker |
| Sandboxing | Docker (custom image) |
| Languages | JavaScript, Python, C, C++, Java, SQL |
| Process Manager | PM2 |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.x |
| UI Library | React | 18.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | Radix UI | — |
| Code Editor | Monaco Editor | — |
| Charts | Recharts | 3.x |
| Animations | GSAP + Lenis | — |
| State | React Context + Hooks | — |
| HTTP | Axios | — |

---

## Distributed Deployment

### Server 1 — API + Frontend + DB + Redis
- **PM2 Cluster**: 2 Express instances (port 4000), 2 Next.js instances (port 3000)
- **PostgreSQL**: Primary database (via Supabase or local install)
- **Redis**: BullMQ queue backend + response cache (leaderboard 30s, exams 5m, questions 10m)
- **Nginx**: Reverse proxy with rate limiting, gzip, WebSocket upgrade

### Server 2 — Workers + Docker
- **PM2 Cluster**: 2 BullMQ worker instances (concurrency=1 each = 2 parallel executions)
- **Docker**: Custom sandbox image with dangerous binaries removed
- **Health Server**: HTTP health endpoint on port 3001 for monitoring
- **CPU Watchdog**: Auto-restart workers if CPU > 90% for 5 min

### PM2 Config Files
- `infra/pm2/api.config.js` — Express API (cluster x2)
- `infra/pm2/frontend.config.js` — Next.js (cluster x2)
- `infra/pm2/worker.config.js` — BullMQ workers (cluster x2)

---

## Backend Architecture

### Directory Structure

```
backend/src/
├── modules/                    # Feature modules (MVC pattern)
│   ├── auth/                   # Authentication & authorization
│   ├── exams/                  # Exam CRUD & management
│   ├── questions/              # Question CRUD & pools
│   ├── attempts/               # Exam attempts & submissions
│   ├── grading/                # Code execution & grading (BullMQ)
│   ├── evaluations/            # Manual evaluation workflows
│   ├── rubrics/                # Rubric-based grading
│   ├── sections/               # Exam sections
│   ├── assets/                 # Media asset management
│   ├── ai/                     # AI question generation
│   ├── adaptive/               # Adaptive difficulty engine
│   ├── proctoring/             # Webcam/screen proctoring
│   ├── analytics/              # Exam analytics & reports
│   ├── reports/                # Result export
│   └── redemption/             # Points redemption system
│
├── middleware/                 # Express middleware
│   ├── auth.ts                 # JWT verification
│   ├── error.ts                # Central error handler
│   ├── validate.ts             # Zod request validation
│   ├── circuit-breaker.ts      # CPU/memory overload protection
│   ├── throttle.ts             # Per-user rate limiting
│   └── input-validation.ts     # Code size + language allowlist
│
├── lib/                        # Shared utilities
│   ├── prisma.ts               # Prisma client singleton
│   ├── redis.ts                # Redis connection (ioredis)
│   ├── queue.ts                # BullMQ producer (submitCodeJob, waitForJobResult)
│   ├── cache.ts                # Redis caching (leaderboard, exams, questions)
│   ├── local-executor.ts       # Legacy local executor (fallback for dev)
│   ├── gemini.ts               # Gemini AI client
│   ├── socket.ts               # Socket.IO setup
│   ├── cookie-utils.ts         # Cookie helpers
│   ├── db-health.ts            # Database health check
│   └── utils.ts                # General utilities
│
├── socket/                     # WebSocket event handlers
├── cron/                       # Scheduled tasks
├── config/                     # Configuration (env, cors)
├── types/                      # TypeScript type definitions
├── app.ts                      # Express app setup (compression, circuit breaker, healthz)
└── index.ts                    # Server entry + graceful shutdown
```

### Module Pattern (MVC)

Each module follows:
```
module/
├── module.controller.ts    # HTTP handlers (thin — delegates to service)
├── module.service.ts       # Business logic
├── module.repo.ts          # Data access (Prisma queries)
├── module.routes.ts        # Route definitions + middleware wiring
└── module.zod.ts           # Zod validation schemas
```

### Key Services

**Grading Service** (`grading.service.ts`)
- `runCode()` → Submits code to BullMQ → waits for Docker execution result
- `getQueueStats()` → Returns waiting/active/completed/failed job counts
- Used for real-time "Run Code" in the exam UI

**Grading Logic** (`grading.logic.ts`)
- `gradeCoding()` → Submits inline grading job to BullMQ → calculates partial score
- `gradeMCQ()` → Instant local MCQ grading with partial credit
- Used during exam submission auto-grading and admin re-evaluation

**Attempt Service** (`attempt.service.ts`)
- `startAttempt()` → Creates attempt with shuffled questions
- `submitAnswer()` → Saves individual question answers
- `submitAttempt()` → Triggers auto-grading for all coding/SQL questions
- `reevaluateAttempt()` → Admin re-evaluation of all responses

---

## Worker Service

### Directory Structure

```
worker/src/
├── index.ts              # BullMQ Worker setup (concurrency=1, rate limit, graceful shutdown)
├── processor.ts          # Job dispatcher — routes to Docker executor
├── docker-executor.ts    # Docker container management (spawn, security flags, cleanup)
├── health.ts             # HTTP health check server (port 3001)
└── redis.ts              # Redis connection for worker
```

### Docker Sandbox Security

Every code execution runs in a fresh Docker container with:

| Security Flag | Purpose |
|--------------|---------|
| `--network none` | No internet access |
| `--memory 128m` | Memory limit |
| `--cpus 0.5` | CPU limit |
| `--read-only` | Immutable filesystem |
| `--pids-limit 32` | Fork bomb protection |
| `--no-new-privileges` | Privilege escalation blocked |
| `--security-opt no-new-privileges` | Extra privilege guard |
| `--tmpfs /tmp:rw,noexec,nosuid,size=64m` | Writable temp only |
| `10s hard timeout` | Kill after timeout |

### Supported Languages
- JavaScript (Node.js)
- Python 3
- C (GCC)
- C++ (G++)
- Java (OpenJDK)
- SQL (SQLite)

---

## Database Schema

### Core Models (Prisma)

- **User** — Students and staff (role-based)
- **Exam** — Exam definitions with settings, scheduling, sections
- **Question** — Supports MCQ, Coding, SQL, Essay, Speaking, Listening, Reading, FillBlank
- **Attempt** — Student exam attempt with status tracking
- **Response** — Individual question answers within an attempt
- **GradingJob** — Queue tracking with `@@index([status, createdAt])` for efficient polling
- **Evaluation** — Manual grading records
- **Rubric** — Grading criteria definitions

### Key Indexes (Performance)
```prisma
model GradingJob {
  @@index([status, createdAt])  // Efficient pending job lookup
  @@index([status])             // Quick status filtering
}
```

---

## Queue & Cache Layer (Redis)

### BullMQ Queue (`backend/src/lib/queue.ts`)

```
Producer (API) ──[Redis]──> Consumer (Worker)
                               │
                          Docker Sandbox
                               │
Result ◄──[Redis pub/sub]──────┘
```

- **Queue Name**: `code-execution`
- **Backpressure**: Rejects at 500 queued jobs (HTTP 503 with estimated wait time)
- **Job Priority**: Final submissions = 1 (high), Run code = 2 (lower)
- **Result Delivery**: QueueEvents pub/sub (zero polling)
- **TTL**: Completed jobs removed after 1 hour, failed after 2 hours

### Redis Cache (`backend/src/lib/cache.ts`)

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `leaderboard:{examId}` | 30 seconds | Exam leaderboard |
| `exam:{examId}` | 5 minutes | Exam metadata |
| `questions:{examId}` | 10 minutes | Exam questions |

---

## Security & Stability

### Middleware Stack (Applied in Order)

1. **Compression** — gzip for responses > 1KB
2. **Circuit Breaker** — Rejects all requests when CPU > 90% or memory > 85%
3. **Per-User Throttle** — 5 code submissions per 10s, 30 API requests per 10s
4. **Input Validation** — Code max 50KB, stdin max 10KB, language allowlist
5. **Zod Schema Validation** — Request body/params/query validation
6. **JWT Authentication** — Token verification + role-based access

### Graceful Shutdown (`backend/src/index.ts`)

```
SIGTERM/SIGINT received
  → Stop accepting new connections (server.close)
  → Drain BullMQ queues (closeQueues)
  → Close Redis connections (closeRedis)
  → 10-second force-kill timeout
```

### Nginx Rate Limiting (`infra/nginx/shadowcoders.conf`)

- **API Zone**: 10 requests/second per IP (burst 20)
- **Code Submission Zone**: 2 requests/second per IP (burst 5)
- **Connection Limit**: 50 simultaneous per IP
- **Keepalive**: 64 upstream connections

---

## Monitoring & Ops

### Infrastructure Scripts (`infra/scripts/`)

| Script | Purpose |
|--------|---------|
| `setup-server1.sh` | Provision Server 1 (Node, Postgres, Redis, Nginx, PM2) |
| `setup-server2.sh` | Provision Server 2 (Node, Docker, PM2) |
| `deploy.sh` | Zero-downtime deployment (git pull → build → PM2 reload) |
| `cpu-watchdog.sh` | Cron job: restart workers if CPU > 90% for 5 min |

### Queue Monitor (`infra/monitoring/queue-monitor.sh`)
- Checks queue depth every 60 seconds
- Alerts if > 100 jobs queued
- Auto-restarts workers if queue stalls

### Health Endpoints

| Endpoint | Port | Returns |
|----------|------|---------|
| `GET /healthz` (API) | 4000 | `{ status, db, redis, queue, uptime, memory }` |
| `GET /health` (Worker) | 3001 | `{ status, uptime, jobsProcessed }` |

### Load Testing (`load-tests/`)
- `autocannon-api.js` — HTTP throughput benchmark
- `submit-flood.js` — Simulates 400 concurrent code submissions

---

## Linux Deployment

### Environment Changes Required

All code is **Linux-compatible out of the box**. Only environment variable changes needed:

```bash
# .env (Server 1)
DATABASE_URL=postgresql://user:pass@localhost:5432/shadowcoders
REDIS_URL=redis://localhost:6379
EXECUTION_OS=linux       # Changes Python command from 'python' to 'python3'

# .env (Server 2 - Worker)
REDIS_URL=redis://server1-ip:6379
DOCKER_IMAGE=shadowcoders-sandbox
```

### Deployment Steps

```bash
# Server 1
bash infra/scripts/setup-server1.sh
cp backend/.env.example backend/.env   # Edit with real values
cd backend && npm install && npx prisma migrate deploy && npm run build
cd ../frontend && npm install && npm run build
pm2 start infra/pm2/api.config.js
pm2 start infra/pm2/frontend.config.js

# Server 2
bash infra/scripts/setup-server2.sh
cd docker/sandbox && docker build -f Dockerfile.sandbox -t shadowcoders-sandbox .
cp worker/.env.example worker/.env     # Edit with Redis URL pointing to Server 1
cd ../../worker && npm install && npm run build
pm2 start infra/pm2/worker.config.js
```

### Required Software (Linux)
- Node.js 18+ (via nvm)
- PostgreSQL 15+
- Redis 7+
- Docker 24+
- Nginx 1.18+
- PM2 5+ (`npm install -g pm2`)
