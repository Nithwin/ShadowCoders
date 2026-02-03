@echo off
echo ================================
echo Fixing ShadowCoders Backend
echo ================================
echo.

echo Step 1: Checking PostgreSQL...
pg_isready -h localhost -p 5432 -U postgres
if errorlevel 1 (
    echo [ERROR] PostgreSQL is not responding!
    echo Please ensure PostgreSQL is running.
    pause
    exit /b 1
)
echo [OK] PostgreSQL is running
echo.

echo Step 2: Creating database if not exists...
psql -U postgres -h localhost -c "CREATE DATABASE shadowcoders;" 2>nul
if errorlevel 1 (
    echo [INFO] Database may already exist, continuing...
) else (
    echo [OK] Database created successfully
)
echo.

echo Step 3: Setting user password...
psql -U postgres -h localhost -c "ALTER USER postgres WITH PASSWORD 'shadowcoders';"
echo [OK] Password set
echo.

echo Step 4: Generating Prisma Client...
cd backend
call npx prisma generate
echo.

echo Step 5: Pushing schema to database...
call npx prisma db push
echo.

echo ================================
echo Setup Complete!
echo ================================
echo You can now run: npm run dev
pause
