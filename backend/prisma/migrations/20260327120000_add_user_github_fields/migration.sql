-- Add dedicated GitHub profile and stats fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "githubUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "githubStats" JSONB,
  ADD COLUMN IF NOT EXISTS "githubStatsUpdatedAt" TIMESTAMP(3);
