# Deployment Guide for ShadowCoders Backend

This guide covers deploying the ShadowCoders backend with code execution capabilities, including the execution queue system.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Code Execution Configuration](#code-execution-configuration)
5. [Deployment Options](#deployment-options)
6. [System Requirements](#system-requirements)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or compatible)
- Required system dependencies for code execution:
  - **JavaScript**: Node.js
  - **Python**: Python 3.x
  - **Java**: JDK 11+
  - **C/C++**: GCC/G++ compiler
  - **C#**: .NET SDK (if supporting C#)

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend
FRONTEND_ORIGIN=https://your-frontend-domain.com

# Google AI (for question generation)
GOOGLE_API_KEY=your-google-api-key

# Code Execution Configuration
CODE_EXECUTION_PROVIDER=local  # or 'judge0'
MAX_CONCURRENT_EXECUTIONS=5    # Adjust based on your system (5-10 recommended)

# Judge0 Configuration (if using Judge0 instead of local)
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=your-judge0-api-key  # Optional
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com  # If using RapidAPI
```

### MAX_CONCURRENT_EXECUTIONS Guidelines

- **Small VPS (1-2 CPU cores, 2GB RAM)**: 3-5
- **Medium VPS (2-4 CPU cores, 4-8GB RAM)**: 5-10
- **Large VPS (4+ CPU cores, 8GB+ RAM)**: 10-15
- **Dedicated Server (8+ CPU cores, 16GB+ RAM)**: 15-20

**Note**: Start conservative and monitor system resources. Adjust based on actual usage.

## Database Setup

1. **Run migrations**:
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

2. **Verify database connection**:
   ```bash
   npm run prisma:studio
   ```

## Code Execution Configuration

### Option 1: Local Execution (Recommended for Production)

Local execution runs code directly on your server. This gives you full control but requires proper security measures.

**Advantages**:
- No external API dependencies
- Faster execution
- No API rate limits
- Full control over resources

**Security Considerations**:
- Code runs in temporary directories that are cleaned up
- Timeout limits prevent infinite loops
- Consider using Docker containers for better isolation (future enhancement)

**System Requirements**:
- Install required language runtimes (Node.js, Python, Java, GCC, etc.)
- Ensure sufficient disk space for temporary files
- Monitor CPU and memory usage

### Option 2: Judge0 (Cloud-based)

Judge0 is a cloud-based code execution service. Good for when you don't want to manage language runtimes.

**Setup**:
1. Sign up for Judge0 (free tier available)
2. Get API key from RapidAPI or self-host Judge0
3. Set `CODE_EXECUTION_PROVIDER=judge0` in `.env`

**Advantages**:
- No need to install language runtimes
- Better isolation (runs in cloud)
- Handles resource limits automatically

**Disadvantages**:
- API rate limits (free tier)
- Network latency
- Potential costs at scale

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2, etc.)

1. **Install dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install language runtimes
   sudo apt install -y python3 python3-pip
   sudo apt install -y default-jdk
   sudo apt install -y gcc g++

   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   ```

2. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd ShadowCoders/backend
   npm install
   npm run build
   ```

3. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run database migrations**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start with PM2** (recommended for production):
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name shadowcoders-backend
   pm2 save
   pm2 startup  # Setup auto-start on reboot
   ```

6. **Setup Nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install system dependencies for code execution
RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk11 \
    gcc \
    g++ \
    make

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/shadowcoders
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
      - MAX_CONCURRENT_EXECUTIONS=5
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=shadowcoders
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Option 3: Platform-as-a-Service (PaaS)

#### Heroku

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: npm start
   release: npm run prisma:migrate
   ```
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql
   heroku config:set NODE_ENV=production
   heroku config:set MAX_CONCURRENT_EXECUTIONS=5
   git push heroku main
   ```

#### Railway

1. Connect your GitHub repo
2. Set environment variables in Railway dashboard
3. Railway automatically detects and deploys

#### Render

1. Connect GitHub repo
2. Create new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add PostgreSQL database
6. Configure environment variables

## System Requirements

### Minimum (for testing/small scale)
- **CPU**: 2 cores
- **RAM**: 2GB
- **Storage**: 10GB
- **MAX_CONCURRENT_EXECUTIONS**: 3

### Recommended (for production)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **MAX_CONCURRENT_EXECUTIONS**: 5-10

### High Performance (for large scale)
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Storage**: 100GB+ SSD
- **MAX_CONCURRENT_EXECUTIONS**: 10-20

## Monitoring & Maintenance

### Health Check Endpoint

The queue status endpoint can be used for health checks:
```bash
curl http://localhost:3000/api/queue/status
```

### Monitoring Queue Performance

Check queue stats:
```bash
# Via API
curl http://localhost:3000/api/queue/status

# Response:
{
  "total": 150,
  "running": 5,
  "queued": 12,
  "completed": 130,
  "failed": 3,
  "estimatedWaitTimeMs": 4800
}
```

### Logs

Monitor application logs:
```bash
# PM2
pm2 logs shadowcoders-backend

# Docker
docker logs <container-name>

# Systemd
journalctl -u shadowcoders-backend -f
```

### Performance Tuning

1. **Monitor system resources**:
   ```bash
   htop  # CPU and memory
   iotop # Disk I/O
   ```

2. **Adjust queue concurrency**:
   - If CPU usage is consistently high, reduce `MAX_CONCURRENT_EXECUTIONS`
   - If queue is backing up, increase (if resources allow)
   - Monitor average execution time and adjust accordingly

3. **Database optimization**:
   - Ensure proper indexes on frequently queried columns
   - Regular VACUUM and ANALYZE for PostgreSQL
   - Consider connection pooling (PgBouncer)

### Security Best Practices

1. **Firewall**: Only expose necessary ports (80, 443)
2. **SSL/TLS**: Use Let's Encrypt for free SSL certificates
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: All inputs are validated via Zod schemas
5. **Code Execution**: 
   - Timeouts prevent infinite loops
   - Temporary files are cleaned up
   - Consider Docker sandboxing for better isolation (future)

### Backup Strategy

1. **Database backups**:
   ```bash
   # Daily backup script
   pg_dump -U user -d shadowcoders > backup_$(date +%Y%m%d).sql
   ```

2. **Automated backups**: Use cron jobs or cloud backup services

## Troubleshooting

### Queue Backing Up

- Check system resources (CPU, memory)
- Reduce `MAX_CONCURRENT_EXECUTIONS`
- Check for stuck jobs
- Verify database performance

### Code Execution Failing

- Verify language runtimes are installed
- Check disk space for temporary files
- Review execution logs
- Test with simple code first

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Verify network connectivity
- Check connection pool limits

## Support

For issues or questions:
1. Check logs first
2. Review this documentation
3. Check GitHub issues
4. Contact support

---

**Last Updated**: 2025-01-11

