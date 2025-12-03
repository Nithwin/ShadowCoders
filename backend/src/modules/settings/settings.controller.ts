import { RequestHandler } from "express";
import * as settingsService from './settings.service';

export const getSettingsHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const settings = await settingsService.getSettings(userId);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettingsHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const updatedUser = await settingsService.updateSettings(userId, req.body);
    res.json(updatedUser.settings);
  } catch (error) {
    next(error);
  }
};
