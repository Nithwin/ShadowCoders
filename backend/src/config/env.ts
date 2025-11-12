import dotenv from 'dotenv';


dotenv.config();

export const env = {
    PORT:process.env.PORT!,
    NODE_ENV:process.env.NODE_ENV!,
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    GOOGLE_API_KEY:process.env.GOOGLE_API_KEY!,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    // Comma-separated list of allowed origins (e.g., "https://app.vercel.app,https://app2.vercel.app")
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    // Allow ngrok URLs dynamically (default: true for development)
    ALLOW_NGROK: process.env.ALLOW_NGROK !== 'false',
    JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://ce.judge0.com',
    JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || '', // Optional: for RapidAPI Judge0 or custom Judge0 instance
    JUDGE0_RAPIDAPI_HOST: process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com',
    // Code execution provider: 'judge0' or 'local'
    CODE_EXECUTION_PROVIDER: process.env.CODE_EXECUTION_PROVIDER || 'judge0',
    // Maximum concurrent code executions (default: 5, recommended: 5-10 for moderate systems, 10-20 for powerful systems)
    MAX_CONCURRENT_EXECUTIONS: process.env.MAX_CONCURRENT_EXECUTIONS || '5',
}