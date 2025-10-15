import { RequestHandler } from "express";
import jwt from 'jsonwebtoken';
import { env } from "../config/env";
import { Role } from "@prisma/client";

export const verifyAccess: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return next({status: 401, message: 'Unauthorized'});
    }

    const token = authHeader.split(' ')[1];
    if(!token){
        return next({status:401, message: 'Unauthorized'});
    }
    try{
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if(typeof decoded === 'object' && decoded.sub && decoded.role){
            req.user = {
                sub:decoded.sub,
                role:String(decoded.role),
            };
            next();
        } else {
            throw new Error("invalid token payload");
        }

    } catch(error){
        return next({status:401, message:'Unauthorized'});
    }
}

export const requireRole = (role:Role): RequestHandler => {
    return (req, res, next) => {
        const user = req.user;
        if(!user || user.role != role){
            return next({status:403, message:'Forbidden'});
        }

        next();
    };
};