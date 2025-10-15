/*
  Warnings:

  - A unique constraint covering the columns `[reg_no]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "QType" AS ENUM ('MCQ', 'CODING', 'ESSAY', 'SPEAKING', 'LISTENING', 'FILL', 'READING');

-- CreateEnum
CREATE TYPE "GradingMode" AS ENUM ('AUTO', 'MANUAL', 'AI', 'HYBRID');

-- CreateEnum
CREATE TYPE "EvaluationKind" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('AUDIO', 'VIDEO', 'IMAGE', 'FILE', 'TEXT');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('ACTIVE', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "TimingMode" AS ENUM ('OVERALL_ONLY', 'PER_SECTION_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "SectionLockPolicy" AS ENUM ('NONE', 'LOCK_ON_COMPLETE', 'LINEAR_NO_BACKTRACK');

-- CreateEnum
CREATE TYPE "SectionAttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "reg_no" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "year" INTEGER,
ALTER COLUMN "googleId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timingMode" "TimingMode" NOT NULL DEFAULT 'OVERALL_ONLY',
    "durationMins" INTEGER NOT NULL,
    "sectionLockPolicy" "SectionLockPolicy" NOT NULL DEFAULT 'NONE',
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "negativeMarkPerWrong" DECIMAL(5,2),
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAssignment" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "cohortYear" INTEGER,
    "cohortDepartment" TEXT,
    "cohortSection" TEXT,
    "studentIds" JSONB,

    CONSTRAINT "ExamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSection" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "durationMins" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionQuestion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QType" NOT NULL,
    "points" DECIMAL(6,2) NOT NULL,
    "prompt" TEXT,
    "options" JSONB,
    "correctOptionIds" JSONB,
    "starterCode" TEXT,
    "testcases" JSONB,
    "languageHints" JSONB,
    "wordLimit" INTEGER,
    "mediaAssetId" TEXT,
    "passageAssetId" TEXT,
    "maxDurationSec" INTEGER,
    "clozeTemplate" TEXT,
    "blanks" JSONB,
    "clozeConfig" JSONB,
    "config" JSONB,
    "rubricId" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'ACTIVE',
    "invalidationReason" TEXT,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DECIMAL(8,2),
    "maxScore" DECIMAL(8,2),
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "orderMap" JSONB,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSection" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" "SectionAttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "remainingSec" INTEGER,
    "lockReason" TEXT,

    CONSTRAINT "AttemptSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "type" "QType" NOT NULL,
    "answer" JSONB,
    "chosenOptionIds" JSONB,
    "code" TEXT,
    "language" TEXT,
    "textAnswer" TEXT,
    "audioAssetId" TEXT,
    "gradingMode" "GradingMode",
    "verdict" TEXT,
    "earnedPoints" DECIMAL(6,2),
    "manualAdjustment" DECIMAL(6,2),
    "feedback" TEXT,
    "judgeRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "kind" "EvaluationKind" NOT NULL,
    "assessorId" TEXT,
    "rubricId" TEXT,
    "score" DECIMAL(6,2),
    "breakdown" JSONB,
    "comments" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "url" TEXT NOT NULL,
    "durationSec" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseArtifact" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingJob" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_status_idx" ON "Exam"("status");

-- CreateIndex
CREATE INDEX "Exam_startAt_endAt_idx" ON "Exam"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "ExamAssignment_examId_idx" ON "ExamAssignment"("examId");

-- CreateIndex
CREATE INDEX "ExamAssignment_cohortYear_cohortDepartment_cohortSection_idx" ON "ExamAssignment"("cohortYear", "cohortDepartment", "cohortSection");

-- CreateIndex
CREATE INDEX "ExamSection_examId_idx" ON "ExamSection"("examId");

-- CreateIndex
CREATE INDEX "ExamSection_order_idx" ON "ExamSection"("order");

-- CreateIndex
CREATE INDEX "SectionQuestion_questionId_idx" ON "SectionQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionQuestion_sectionId_questionId_key" ON "SectionQuestion"("sectionId", "questionId");

-- CreateIndex
CREATE INDEX "Question_examId_idx" ON "Question"("examId");

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Attempt_examId_idx" ON "Attempt"("examId");

-- CreateIndex
CREATE INDEX "Attempt_studentId_idx" ON "Attempt"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_examId_studentId_attemptNo_key" ON "Attempt"("examId", "studentId", "attemptNo");

-- CreateIndex
CREATE INDEX "AttemptSection_attemptId_idx" ON "AttemptSection"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptSection_sectionId_idx" ON "AttemptSection"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSection_attemptId_sectionId_key" ON "AttemptSection"("attemptId", "sectionId");

-- CreateIndex
CREATE INDEX "Response_attemptId_questionId_idx" ON "Response"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Response_type_idx" ON "Response"("type");

-- CreateIndex
CREATE INDEX "Evaluation_responseId_idx" ON "Evaluation"("responseId");

-- CreateIndex
CREATE INDEX "Evaluation_kind_idx" ON "Evaluation"("kind");

-- CreateIndex
CREATE INDEX "Evaluation_assessorId_idx" ON "Evaluation"("assessorId");

-- CreateIndex
CREATE INDEX "ResponseArtifact_responseId_idx" ON "ResponseArtifact"("responseId");

-- CreateIndex
CREATE INDEX "ResponseArtifact_assetId_idx" ON "ResponseArtifact"("assetId");

-- CreateIndex
CREATE INDEX "GradingJob_responseId_idx" ON "GradingJob"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_reg_no_key" ON "User"("reg_no");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_year_department_section_idx" ON "User"("year", "department", "section");

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSection" ADD CONSTRAINT "ExamSection_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionQuestion" ADD CONSTRAINT "SectionQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionQuestion" ADD CONSTRAINT "SectionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_passageAssetId_fkey" FOREIGN KEY ("passageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSection" ADD CONSTRAINT "AttemptSection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSection" ADD CONSTRAINT "AttemptSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseArtifact" ADD CONSTRAINT "ResponseArtifact_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseArtifact" ADD CONSTRAINT "ResponseArtifact_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingJob" ADD CONSTRAINT "GradingJob_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
