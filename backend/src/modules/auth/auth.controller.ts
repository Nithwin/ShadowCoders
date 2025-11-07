import { RequestHandler } from "express";
import * as authService from './auth.service';  

export const googleOAuthHandler: RequestHandler = async (req, res, next) => {
    try{
        const userProfile = req.body;
        const {accessToken, refreshToken} = await authService.handleGoogleLogin(userProfile);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

        res.json({accessToken});
    } catch(error){
        next(error);
    }
}

export const emailLoginHandler: RequestHandler = async (req, res, next) => {
    try{
        const {accessToken, refreshToken} = await authService.handleEmailLogin(req.body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
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

export const refreshAccessTokenHandler: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return next({ status: 401, message: 'Refresh token not found' });
    }

    const newAccessToken = await authService.handleRefreshToken(refreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // 1. Tell the service to delete the token from the database
      await authService.handleLogout(refreshToken);
    }

    // 2. Clear the httpOnly cookie from the browser
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // 3. Send a success response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};