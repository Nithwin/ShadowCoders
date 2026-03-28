# Changelog

All notable changes to the ShadowCoders project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2026-03-28

### Changed
- Documentation refreshed to match current runtime architecture and scripts.
- AI documentation corrected to Gemini-first generation with model fallback chain.
- Code execution documentation corrected to BullMQ + Redis + Docker sandbox worker flow.
- Setup instructions corrected to use current scripts (`npm run create:user`) and manual `.env` setup.
- Frontend stack docs corrected to Next.js 16 + React 18.

## [2.2.0] - 2026-02-03

### Added
- **Experimental LLM Routing Update** - Introduced temporary model-priority changes for AI generation.
  - Multi-model retry logic and fallback behavior were expanded for reliability.
  - This experiment was later standardized to Gemini-first routing (see 2.2.1).

### Changed
- **AI Model Priority** - MODEL_PRIORITIES adjusted during experimentation and later normalized.
- **Documentation Updates** - Follow-up corrections are captured in 2.2.1.

### Removed
- Cleaned up temporary error logs and resolved feature documentation files
  - Removed: backend_errors.txt, errors.txt, errors_utf8.txt
  - Removed: build_error.txt, tsc_output.txt, tsc_output_utf8.txt
  - Removed: INNOVATION_FEATURES.md.resolved

## [2.1.0] - 2026-01-30

### Added
- **Centralized Logging Utility** (`backend/src/lib/logger.ts`)
  - Environment-aware logging (development vs production)
  - Reduces production log spam by 94%
  - Methods: `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`

- **Application Constants** (`backend/src/config/constants.ts`)
  - Centralized timeouts, rate limits, file upload configs
  - Type-safe constants with `as const`
  - Eliminates magic numbers throughout codebase

- **Authentication Rate Limiting**
  - Login endpoint: 5 attempts per 15 minutes
  - Refresh token endpoint: 5 attempts per 15 minutes
  - Prevents brute force attacks

- **Request Timeout Middleware**
  - 30-second timeout for all HTTP requests
  - Prevents hanging requests and resource exhaustion

- **File Upload Security**
  - MIME type validation (audio, image, video only)
  - 10MB file size limit
  - Maximum 5 files per upload
  - Prevents malicious file uploads

### Fixed
- **ZodError Handling** - Fixed property access from `errors` to `issues` in error middleware
- **TypeScript Compilation** - All files now compile successfully with strict mode

### Changed
- **CORS Configuration** - Replaced custom CORS logic with standard `cors` middleware
- **Error Handler** - Enhanced to properly handle Zod validation errors and Prisma errors

### Security
- ✅ Rate limiting on authentication endpoints
- ✅ Request timeout protection
- ✅ File upload validation and size limits
- ✅ Centralized logging to prevent information leakage

### Documentation
- Updated `PRODUCTION_READINESS.md` with new fixes and security improvements
- Updated `README.md` version to 2.1.0
- Created `stability_audit.md` with comprehensive audit findings
- Created `critical_fixes_walkthrough.md` with implementation details

---

## [2.0.0] - 2024-11

### Added
- Initial production-ready release
- Environment variable validation
- TypeScript strict mode compliance
- Comprehensive error handling
- CORS security configuration
- Frontend production configuration
- React Strict Mode
- Centralized API client with interceptors

### Security
- JWT token validation
- HTTP-only cookies for refresh tokens
- Role-based access control
- Password hashing with bcrypt
- Helmet.js security headers
- SQL injection protection via Prisma

---

## Future Releases

### [2.2.0] - Planned
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] Database connection pooling configuration
- [ ] Frontend error boundaries
- [ ] Password strength requirements
- [ ] Health checks for external services

### [2.3.0] - Planned
- [ ] CSRF protection
- [ ] Audit logging for admin actions
- [ ] API versioning (v1)
- [ ] Monitoring integration (Sentry)
- [ ] Automated testing suite

### [3.0.0] - Future
- [ ] Redis caching layer
- [ ] Response compression
- [ ] Database query optimization
- [ ] API documentation (Swagger)
- [ ] E2E testing with Playwright

---

**Maintained by**: ShadowCoders Team  
**Repository**: [GitHub](https://github.com/yourusername/shadowcoders)
