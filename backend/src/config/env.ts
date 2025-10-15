import dotenv from 'dotenv';


dotenv.config();

export const env = {
    PORT:process.env.PORT!,
    NODE_ENV:process.env.NODE_ENV!,
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
}