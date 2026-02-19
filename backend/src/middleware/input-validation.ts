import { RequestHandler } from 'express';

/**
 * Input Validation Middleware
 * 
 * WHY NEEDED:
 * Without explicit limits, a student can submit:
 * - 100MB code string → OOM when parsing JSON
 * - Code with 10 million characters → OOM when writing to temp file
 * - Language string of 10000 chars → unexpected behavior
 * 
 * This middleware rejects obviously invalid payloads BEFORE
 * they reach the controller, preventing resource waste.
 */

const MAX_CODE_LENGTH = 50000;      // 50KB code (very generous)
const MAX_INPUT_LENGTH = 10000;     // 10KB stdin input
const MAX_LANGUAGE_LENGTH = 20;     // Language name
const ALLOWED_LANGUAGES = ['c', 'cpp', 'java', 'python', 'javascript', 'sql', 'csharp'];

/**
 * Validate code execution request body
 */
export const validateCodeInput: RequestHandler = (req, res, next) => {
  const { code, language, customInput, input } = req.body;

  // Code is required
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Code is required and must be a string' },
    });
  }

  // Code length limit
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      error: {
        code: 'CODE_TOO_LARGE',
        message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters (received ${code.length})`,
      },
    });
  }

  // Language is required and must be valid
  if (!language || typeof language !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Language is required' },
    });
  }

  if (language.length > MAX_LANGUAGE_LENGTH) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Invalid language name' },
    });
  }

  const normalizedLang = language.toLowerCase();
  if (!ALLOWED_LANGUAGES.includes(normalizedLang)) {
    return res.status(400).json({
      error: {
        code: 'UNSUPPORTED_LANGUAGE',
        message: `Language '${language}' is not supported. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
      },
    });
  }

  // Input length limit
  const inputStr = customInput || input || '';
  if (typeof inputStr === 'string' && inputStr.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({
      error: {
        code: 'INPUT_TOO_LARGE',
        message: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
      },
    });
  }

  next();
};

/**
 * Limit JSON body size at the Express level.
 * This provides defense-in-depth beyond express.json({limit}).
 */
export const MAX_JSON_BODY_SIZE = '1mb';
