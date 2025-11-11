-- ============================================
-- RLS Migration - Apply This in Supabase SQL Editor
-- ============================================
-- 
-- Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- 4. Verify with: npm run check:rls
-- ============================================

-- Enable Row Level Security (RLS) on all public tables
-- This migration addresses Supabase database linter security warnings

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Exam table
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ExamAssignment table
ALTER TABLE "ExamAssignment" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ExamSection table
ALTER TABLE "ExamSection" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on SectionQuestion table
ALTER TABLE "SectionQuestion" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Question table
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Attempt table
ALTER TABLE "Attempt" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on AttemptSection table
ALTER TABLE "AttemptSection" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Response table
ALTER TABLE "Response" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ResponseArtifact table
ALTER TABLE "ResponseArtifact" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Evaluation table
ALTER TABLE "Evaluation" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Rubric table
ALTER TABLE "Rubric" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Asset table
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on GradingJob table
ALTER TABLE "GradingJob" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on RefreshToken table (if not already enabled)
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on _prisma_migrations table (Prisma-managed migration history)
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service_role (postgres user) to bypass RLS
-- This is necessary because Prisma uses service_role credentials which should have full access

-- Policy for User table - allow service_role full access
CREATE POLICY "service_role_full_access_user" ON "User"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Exam table
CREATE POLICY "service_role_full_access_exam" ON "Exam"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for ExamAssignment table
CREATE POLICY "service_role_full_access_exam_assignment" ON "ExamAssignment"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for ExamSection table
CREATE POLICY "service_role_full_access_exam_section" ON "ExamSection"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for SectionQuestion table
CREATE POLICY "service_role_full_access_section_question" ON "SectionQuestion"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Question table
CREATE POLICY "service_role_full_access_question" ON "Question"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Attempt table
CREATE POLICY "service_role_full_access_attempt" ON "Attempt"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for AttemptSection table
CREATE POLICY "service_role_full_access_attempt_section" ON "AttemptSection"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Response table
CREATE POLICY "service_role_full_access_response" ON "Response"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for ResponseArtifact table
CREATE POLICY "service_role_full_access_response_artifact" ON "ResponseArtifact"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Evaluation table
CREATE POLICY "service_role_full_access_evaluation" ON "Evaluation"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Rubric table
CREATE POLICY "service_role_full_access_rubric" ON "Rubric"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for Asset table
CREATE POLICY "service_role_full_access_asset" ON "Asset"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for GradingJob table
CREATE POLICY "service_role_full_access_grading_job" ON "GradingJob"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for RefreshToken table
CREATE POLICY "service_role_full_access_refresh_token" ON "RefreshToken"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Policy for _prisma_migrations table
CREATE POLICY "service_role_full_access_prisma_migrations" ON "_prisma_migrations"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verification Query (optional - run separately)
-- ============================================
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('User', 'Exam', 'Question', 'Attempt', 'Response')
-- ORDER BY tablename;
-- ============================================

