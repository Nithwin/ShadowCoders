import { RequestHandler } from "express";
import * as authService from './auth.service';  

export const googleOAuthHandler: RequestHandler = async (req, res, next) => {
    try{
        const userProfile = req.body;
        const {accessToken, refreshToken} = await authService.handleGoogleLogin(userProfile);

        res.cookie('refreshToken', refreshToken, {
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.json({accessToken});
    } catch(error){
        next(error);
    }
}

export const emailLoginHandler: RequestHandler = async (req, res, next) => {
    try{
        const {accessToken, refreshToken} = await authService.handleEmailLogin(req.body);

        res.cookie('refreshToken', refreshToken, {
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({accessToken});
    } catch(error){
        next(error);
    }
}

export const getMeHandler: RequestHandler = async (req, res, next) => {
    try{
        const userId = req.user?.sub;
        if(!userId){
            return next({status:401, message: 'Unauthorized'});
        }

        const user = await authService.findUserById(userId);
        res.json(user);
    } catch (error){
        next(error);
    }
}