-- ============================================
-- Quick Fix: Enable RLS on _prisma_migrations Table
-- ============================================
-- 
-- This fixes the Supabase linter warning:
-- "Table public._prisma_migrations is public, but RLS has not been enabled"
--
-- Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================

-- Enable RLS on _prisma_migrations table
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Create policy allowing service_role (postgres) full access
-- This ensures Prisma migrations continue to work normally
CREATE POLICY "service_role_full_access_prisma_migrations" ON "_prisma_migrations"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verification (optional - run separately)
-- ============================================
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = '_prisma_migrations';
-- Should return: rowsecurity = true
-- ============================================

