"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemResourcesHandler = getSystemResourcesHandler;
const system_service_1 = require("./system.service");
async function getSystemResourcesHandler(req, res) {
    try {
        const resources = await (0, system_service_1.getSystemResources)();
        res.json(resources);
    }
    catch (error) {
        console.error('Error in getSystemResourcesHandler:', error);
        res.status(500).json({
            error: 'Failed to fetch system resources',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
//# sourceMappingURL=system.controller.js.map