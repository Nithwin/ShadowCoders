import { RequestHandler } from "express";
import * as authService from './auth.service';
import { getCookieOptions } from '../../lib/cookie-utils';

export const googleOAuthHandler: RequestHandler = async (req, res, next) => {
    try{
        const userProfile = req.body;
        const {accessToken, refreshToken} = await authService.handleGoogleLogin(userProfile);

        const cookieOptions = getCookieOptions(req);
        
        // Debug: Log cookie options (only in development)
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AUTH] Setting cookie with options:', {
                httpOnly: cookieOptions.httpOnly,
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite,
                path: cookieOptions.path,
                maxAge: '7 days',
                origin: req.headers.origin,
            });
        }
        
        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({accessToken});
    } catch(error){
        next(error);
    }
}

export const emailLoginHandler: RequestHandler = async (req, res, next) => {
    try{
        const {accessToken, refreshToken} = await authService.handleEmailLogin(req.body);

        const cookieOptions = getCookieOptions(req);
        
        // Debug: Log cookie options (only in development)
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AUTH] Setting cookie with options:', {
                httpOnly: cookieOptions.httpOnly,
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite,
                path: cookieOptions.path,
                maxAge: '7 days',
                origin: req.headers.origin,
                host: req.get('host'),
            });
        }
        
        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    // Debug: Log cookie details (only in development)
    if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] Refresh token request:', {
            hasRefreshToken: !!refreshToken,
            refreshTokenLength: refreshToken?.length || 0,
            origin: req.headers.origin,
            host: req.get('host'),
            cookies: Object.keys(req.cookies),
        });
    }

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
    // Use same settings as when setting the cookie
    const cookieOptions = getCookieOptions(req);
    res.clearCookie('refreshToken', cookieOptions);

    // 3. Send a success response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateMeHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const updateData = req.body;
    const updatedUser = await authService.updateUserProfile(userId, updateData);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const changePasswordHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    await authService.changePassword(userId, req.body);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePictureHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    if (!req.file) {
      return next({ status: 400, message: 'No file uploaded' });
    }

    const pictureUrl = await authService.updateProfilePicture(userId, req.file);
    res.json({ pictureUrl });
  } catch (error) {
    next(error);
  }
};