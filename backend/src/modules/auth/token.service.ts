import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

interface UserPayLoad {
    sub: string;
    role: string;
}

export const generateTokens = (payload: UserPayLoad) => {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: '15m',
    });

    const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: '7d',
    })

    return {accessToken, refreshToken};
}
