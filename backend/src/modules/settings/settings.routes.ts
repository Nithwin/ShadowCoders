import { Express } from "express";
import * as settingsController from './settings.controller';
import { verifyAccess } from "../../middleware/auth";

export const registerSettingsRoutes = (app: Express) => {
    app.get('/api/settings', verifyAccess, settingsController.getSettingsHandler);
    app.put('/api/settings', verifyAccess, settingsController.updateSettingsHandler);
}
