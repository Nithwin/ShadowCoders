# ShadowCoders — Backend Documentation

This document summarizes the backend modules present under `backend/src/modules`. It lists the HTTP APIs exposed by the routes, describes each endpoint (method, path, auth requirements, inputs and outputs), and gives a short description of each module file and the functions they export.

NOTE: Assumptions
- "Unwanted commands" were treated as debug console calls (`console.log`, `console.error`, `console.warn`) and were removed from module files.
- Where behavior was dependent on those logs, they were removed without changing logic or thrown errors.

---

## API Reference (routes)

Each entry: Method — Path — Auth — Short description — Input — Output

### Auth
- POST /api/auth/google/callback/
  - Auth: public
  - Description: Google OAuth callback / login. Expects Google profile payload in body. Returns accessToken and sets refreshToken cookie.
  - Body: Google profile (email, name, pictureUrl, googleId)
  - Response: { accessToken }

- POST /api/auth/login
  - Auth: public
  - Description: Email + password login. Returns accessToken and sets refreshToken cookie.
  - Body: { email, password }
  - Response: { accessToken }

- GET /api/me
  - Auth: Bearer (verifyAccess)
  - Description: Returns the logged-in user's public profile.
  - Response: user object

- POST /api/auth/refresh
  - Auth: Cookie-based refresh token required
  - Description: Exchange refresh token cookie for a new access token
  - Body: none (cookie)
  - Response: { accessToken }

- POST /api/auth/logout
  - Auth: Cookie if present
  - Description: Deletes refresh token in DB and clears cookie
  - Response: { message }

### Exams
- POST /api/admin/exams
  - Auth: verifyAccess + requireRole('STAFF')
  - Description: Create a new exam
  - Body: createExamSchema
  - Response: new exam object

- POST /api/admin/exams/:examId/assign
  - Auth: STAFF
  - Description: Assign an exam to students / cohorts
  - Body: assignExamSchema
  - Response: assignment object

- POST /api/admin/exams/:examId/publish
  - Auth: STAFF
  - Description: Publish a DRAFT exam
  - Response: updated exam object

- GET /api/admin/exams
  - Auth: STAFF
  - Description: List exams (admin view, paginated)
  - Query: page, pageSize, status, q
  - Response: { data: exams[], meta }

- GET /api/student/exams
  - Auth: verifyAccess (student)
  - Description: List exams available to the student (UPCOMING/LIVE/COMPLETED filter)
  - Query: page, pageSize, filter, q
  - Response: { data: exams[], meta }

- PUT /api/admin/exams/:examId
  - Auth: STAFF
  - Description: Update exam metadata
  - Body: updateExamSchema
  - Response: updated exam

- DELETE /api/admin/exams/:examId
  - Auth: STAFF
  - Description: Delete an exam (only if no attempts exist)
  - Response: { message }

### Sections
- POST /api/admin/exams/:examId/sections
  - Auth: STAFF
  - Description: Create a section within an exam
  - Body: createSectionSchema
  - Response: created section

- POST /api/admin/sections/:sectionId/questions
  - Auth: STAFF
  - Description: Add questions to a section (bulk)
  - Body: { questions: [...] }
  - Response: { message }

- PUT /api/admin/sections/:sectionId
  - Auth: STAFF
  - Description: Update section
  - Body: updateSectionSchema
  - Response: updated section

- DELETE /api/admin/sections/:sectionId
  - Auth: STAFF
  - Description: Delete section (only if no attempt progress exists)
  - Response: { message }

- DELETE /api/admin/sections/:sectionId/questions/:questionId
  - Auth: STAFF
  - Description: Remove a question from a section
  - Response: { message }

### Questions
- POST /api/admin/exams/:examId/questions
  - Auth: STAFF
  - Description: Add multiple questions to an exam
  - Body: addQuestionsSchema
  - Response: success (201)

- GET /api/student/attempts/:attemptId/question/:questionId
  - Auth: verifyAccess
  - Description: Get a single question for a student in an attempt (scrubbed of answers)
  - Response: question object without correct answers and only public testcases for coding

- PUT /api/admin/questions/:questionId
  - Auth: STAFF
  - Description: Update question fields
  - Body: updateQuestionSchema
  - Response: updated question

- DELETE /api/admin/questions/:questionId
  - Auth: STAFF
  - Description: Delete a question if no responses exist
  - Response: { message }

### Attempts (student)
- POST /api/student/exams/:examId/start
  - Auth: verifyAccess (student)
  - Description: Start an attempt for the logged-in student (checks assignment, timing, published status)
  - Response: created attempt record

- POST /api/student/attempts/:attemptId/responses
  - Auth: verifyAccess
  - Description: Submit or upsert a student's answer to a question
  - Body: submitAnswerSchema
  - Response: saved response

- POST /api/student/attempts/:attemptId/submit
  - Auth: verifyAccess
  - Description: Submit attempt for grading (auto-grade MCQs, queue or leave manual types)
  - Response: updated attempt (status/submitted, score)

- GET /api/student/attempts/:attemptId
  - Auth: verifyAccess
  - Description: Get attempt details (questions structure, progress)
  - Response: attempt details

- GET /api/student/attempts/:attemptId/results
  - Auth: verifyAccess
  - Description: Get final results for a submitted attempt
  - Response: attempt results (score, responses, evaluations)

### Attempts (admin)
- GET /api/admin/attempts/exam/:examId
  - Auth: STAFF
  - Description: List attempts for an exam (paginated)
  - Query: page, pageSize
  - Response: { data: attempts[], meta }

- GET /api/admin/attempts/:attemptId
  - Auth: STAFF
  - Description: Get full attempt for admin review (responses, evaluations, student info)
  - Response: full attempt object

### Grading / Run Code
- POST /api/student/attempts/:attemptId/run-code
  - Auth: verifyAccess
  - Description: Send student's code to a judge (mocked in code). Returns job result.
  - Body: runCodeSchema { questionId, code, language }
  - Response: grading job result

### Evaluations
- POST /api/admin/responses/:responseId/evaluate
  - Auth: STAFF
  - Description: Create a manual evaluation for a response (update response, attempt totals)
  - Body: createEvaluationSchema
  - Response: created evaluation

### Rubrics
- POST /api/admin/rubrics
  - Auth: STAFF
  - Description: Create a rubric (criteria JSON)
  - Body: createRubricSchema
  - Response: rubric object

### Assets
- POST /api/admin/assets
  - Auth: STAFF
  - Description: Upload asset file (Multer memory upload, then service saves to cloud mock and DB)
  - Form: multipart/form-data, field `assetFile`, body includes `kind`
  - Response: saved asset

---

## Per-file module summary

Below are brief descriptions of each file under `backend/src/modules`. Each entry lists the exported functions and their responsibilities.

Note: Only module files are listed (not shared libs, middleware, etc.).

### Module: auth
- `auth.controller.ts`
  - googleOAuthHandler(req, res, next): handle Google callback payload and issue tokens
  - emailLoginHandler(req, res, next): email/password login, issues tokens
  - getMeHandler(req, res, next): return current user's profile
  - refreshAccessTokenHandler(req, res, next): issue a new access token using refresh cookie
  - logoutHandler(req, res, next): logout and clear cookie

- `auth.service.ts`
  - handleGoogleLogin(profile): find user by email and link googleId; return tokens
  - handleEmailLogin(input): validate password and return tokens
  - findUserById(id): lookup user
  - handleRefreshToken(rawRefreshToken): verify refresh token and return new access token
  - handleLogout(rawRefreshToken): remove refresh token from DB

- `auth.routes.ts`
  - registerAuthRoutes(app): registers all auth-related endpoints (see API Reference)

- `auth.repo.ts`
  - findUserByEmailAndLinkGoogle(profile): update user to attach googleId and return user
  - findUserByEmail(email): return user by email
  - findUserById(id): return user by id
  - findStudentWithCohortInfo(id): return id, year, department, section for cohort checks
  - saveRefreshToken(userId, tokenHash, expiresAt): store hashed refresh token
  - findRefreshToken(tokenHash): find refresh token by hash
  - deleteRefreshToken(tokenHash): delete refresh token

- `token.service.ts`
  - generateAccessToken(payload): return JWT access token (short lived)
  - generateAndSaveRefreshToken(userId): create raw refresh token, hash it, save hash to DB, return raw token
  - verifyAndFindUser(rawToken): verify raw token, compare with DB hashed tokens and return user
  - findAndRemoveRefreshToken(rawToken): remove matching refresh token from DB

Notes: Token lifecycle uses hashed refresh tokens stored in DB. Access tokens are short-lived JWTs.

---

### Module: exams
- `exam.zod.ts` — Zod schemas validating create, assign, list, update operations for exams.
- `exam.service.ts`
  - createExam(input): validate start/end, prepare fields, call repo
  - assignExam(examId, input): create assignment for an exam
  - pubishExam(examId): set exam status to PUBLISHED
  - listExams(query): admin listing with pagination and filters
  - listExamsForStudent(studentId, query): list exams visible to a student
  - updateExam(examId, input): update exam fields
  - deleteExam(examId): delete exam if safe (no attempts)

- `exam.routes.ts` — register admin and student exam endpoints
- `exam.repo.ts` — DB functions: createExam, createExamAssignment, updateExamStatus, findExamById, listExams, listExamsForStudent, updateExam, deleteExamAndChildren

Notes: Exam assignment supports assignToAll, cohort-based assignment, and explicit student IDs. Deletion of exams enforces that attempts do not exist.

---

### Module: sections
- `section.zod.ts` — schemas for creating, updating sections and adding questions
- `section.service.ts`
  - createSection(examId, input): ensure exam exists and create section
  - addQuestionsToSection(sectionId, questions): validate questions belong to exam and add links
  - updateSection(sectionId, input): update fields
  - deleteSection(sectionId): safety checks and deletion transaction
  - removeQuestionFromSection(sectionId, questionId): delete link

- `section.routes.ts` — registers section admin endpoints
- `section.repo.ts` — DB operations for sections and section-question links
- `section.controller.ts` — Express handlers that call service functions and send responses

---

### Module: questions
- `question.zod.ts` — schemas for adding/updating questions; covers MCQ, CODING, ESSAY types
- `question.service.ts`
  - addQuestionsToExam(examId, questions): prepares bulk create payload for questions
  - getQuestionForStudent(studentId, attemptId, questionId): validates attempt and returns scrubbed question (no answers, only public testcases)
  - updateQuestion(questionId, input): type-aware updates
  - deleteQuestion(questionId): delete with related links in transaction

- `question.repo.ts` — DB helpers (createMany, getQuestionById, update, delete)
- `question.controller.ts` — request handlers for admin/student actions
- `question.routes.ts` — route registrations

Notes: Scrubbing logic removes correctOptionIds/blanks and hides hidden testcases for coding questions when sending to students.

---

### Module: attempts
- `attempt.zod.ts` — schemas: submitAnswer and list attempts
- `attempt.service.ts`
  - startAttempt(studentId, examId): validate assignment, exam time window, randomization, create attempt
  - submitAnswer(studentId, attemptId, input): upsert a response for an attempt
  - submitAttempt(studentId, attemptId): auto-grade MCQs, compute totals, update attempt status to SUBMITTED
  - getAttemptDetails(studentId, attemptId): fetch attempt with structure for student
  - getAttemptResults(studentId, attemptId): get final results for a submitted attempt
  - listAttemptsForExam(examId, query): admin listing of attempts
  - getAttemptForAdmin(attemptId): full attempt including responses and evaluations

- `attempt.repo.ts` — DB operations: createAttempt, upsertResponse, getAttemptForSubmission, updateAttemptOnSubmit, getAttemptDetails, getAttemptResults, listAttemptsForExam, getFullAttemptForAdmin
- `attempt.controller.ts` — Express handlers
- `attempt.routes.ts` — route registration for student and admin attempt endpoints

Notes: Auto-grading currently handles MCQ. Coding and essay types are left for manual/AI grading.

---

### Module: grading
- `grading.zod.ts` — run code schema (questionId, code, language)
- `grading.service.ts`
  - runCode(studentId, attemptId, input): validate attempt/question, create grading job, run (mock judge), update job, return result

- `grading.repo.ts` — createGradingJob, updateGradingJob
- `grading.controller.ts` — runCodeHandler
- `grading.routes.ts` — register route

Notes: The code judge is mocked; in production this would integrate Judge0 or a similar service.

---

### Module: evaluations
- `evaluation.zod.ts` — schema for manual evaluation
- `evaluation.service.ts`
  - createManualEvaluation(responseId, assessorId, input): create evaluation in transaction, update response and attempt totals

- `evaluation.repo.ts` — createEvaluation
- `evaluation.controller.ts` — createManualEvaluationHandler
- `evaluation.routes.ts` — register route

---

### Module: rubrics
- `rubric.zod.ts` — schema for rubric creation
- `rubric.service.ts` — createRubric(creatorId, input)
- `rubric.repo.ts` — DB helper createRubric
- `rubric.controller.ts` — createRubricHandler
- `rubric.routes.ts` — register route

---

### Module: ai
- `ai.zod.ts` — schema for generation request (topic, counts)
- `ai.service.ts` — generateQuestions(input): builds a system prompt, calls `lib/gemini` to produce JSON, parses and validates against `addQuestionsSchema` from questions module, returns questions array
- `ai.controller.ts` — generateQuestionsHandler
- `ai.routes.ts` — register route

Notes: The AI output is validated against the application's question schema — this is important to prevent malformed objects entering the DB.

---

### Module: assets
- `asset.zod.ts` — schema for asset creation (kind etc.)
- `asset.service.ts` — createAsset(input, file): mock-upload file to cloud storage (memory + mock URL), save metadata in DB via repo. (Console debug lines removed.)
- `asset.repo.ts` — createAsset(data) DB helper
- `asset.controller.ts` — createAssetHandler: handles Multer file and validated body
- `asset.routes.ts` — register asset upload route (Multer memoryStorage; field `assetFile`)

---

## Quick notes on changes made
- Removed debug console statements (`console.log`, `console.error`, `console.warn`) from module files identified during a code scan. These were in: grading.service.ts, evaluation.service.ts, attempt.service.ts, auth.service.ts, token.service.ts, asset.service.ts, ai.service.ts. The logic and thrown errors remain unchanged.

## Next steps & validation
- I can run a TypeScript build or linter to verify no syntax errors introduced. Would you like me to run `npm run build` or `pnpm build` in `backend/`? (I will run the correct command when you confirm the package manager.)
- I can also create a `BACKEND_DOCS.md` in the repo root if you prefer a different location.

---

If you want, I can now:
- Add a simple logger abstraction (e.g., tiny wrapper over console with env-based levels) and optionally replace debug calls with logger.debug() rather than removing them, or
- Run the TypeScript build and fix any TypeScript errors, or
- Produce a per-file more detailed doc (list every function signature and example payloads) — tell me how deep you want the per-file docs to be.

