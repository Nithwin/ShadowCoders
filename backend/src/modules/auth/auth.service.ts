import { Role } from '@prisma/client';
import * as authRepo from './auth.repo';
import * as tokenService from './token.service';
import bcrypt from 'bcrypt';
interface GoogleProfile {
    email: string;
    name?: string | null;
    pictureUrl?: string | null;
    googleId: string;
}

type PublicUser = {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    pictureUrl: string | null;
    createdAt: Date;
} | null;

export const handleGoogleLogin = async(profile: GoogleProfile) => {
    const user = await authRepo.findUserByEmailAndLinkGoogle(profile);

    if(!user){
        throw{
            status: 403,
            message: 'Access denied. User is not registered in the system.'
        }
    }

    const payload = {
        sub: user.id,
        role: user.role,
    }

    const tokens = tokenService.generateTokens(payload);

    return tokens;
}

export const handleEmailLogin = async(input: any) => {
    const user = await authRepo.findUserByEmail(input.email);

    if(!user || !user.password){
        throw {
            status: 401,
            message: `Invalid email or password`
        };
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if(!isPasswordValid){
        throw {status:401, message: 'Invalid email or password'};
    }

    const payload = {
        sub:user.id,
        role:user.role
    };

    const tokens = tokenService.generateTokens(payload);

    return tokens;
}

export const findUserById = async(id: string) => {
    return authRepo.findUserById(id);
}