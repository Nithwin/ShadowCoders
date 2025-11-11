# 🚀 Setup Local PostgreSQL Database

## Step 1: Create the Database

Open **SQL Shell (psql)** or **pgAdmin** and run:

```sql
-- Create the database
CREATE DATABASE shadowcoders;

-- Verify it was created
\l
```

## Step 2: Create a User (Optional but Recommended)

```sql
-- Create a user for the application
CREATE USER shadowcoders_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE shadowcoders TO shadowcoders_user;

-- Connect to the database
\c shadowcoders

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO shadowcoders_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shadowcoders_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shadowcoders_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shadowcoders_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shadowcoders_user;
```

## Step 3: Update Your .env File

Choose one of these options:

### Option A: Using postgres superuser (simpler for development)
```env
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://postgres:your_postgres_password@localhost:5432/shadowcoders"
```

### Option B: Using dedicated user (more secure)
```env
DATABASE_URL="postgresql://shadowcoders_user:your_secure_password@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://shadowcoders_user:your_secure_password@localhost:5432/shadowcoders"
```

## Step 4: Run Migrations

```powershell
cd backend
npx prisma migrate dev
```

This will:
- Create all tables from your Prisma schema
- Apply all existing migrations
- Generate Prisma Client

## Step 5: Test the Connection

```powershell
npm run test:db
```

You should see: ✅ Successfully connected to database

## Step 6: Start Your Server

```powershell
npm run dev
```

## Quick Setup (If you know your postgres password)

Just update these two lines in `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shadowcoders"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shadowcoders"
```

Then run:
```powershell
# Create the database using psql
psql -U postgres -c "CREATE DATABASE shadowcoders;"

# Run migrations
npx prisma migrate dev

# Test connection
npm run test:db

# Start server
npm run dev
```

## Troubleshooting

### Can't connect to PostgreSQL?
Make sure PostgreSQL service is running:
```powershell
# Check service status
Get-Service -Name postgresql*

# Start the service if stopped
Start-Service postgresql-x64-17
```

### Forgot postgres password?
You may need to reset it or use Windows authentication if available.

### Port 5432 already in use?
Check if another PostgreSQL instance is running or use a different port.
