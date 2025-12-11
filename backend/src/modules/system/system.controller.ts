import { Request, Response } from 'express';
import { getSystemResources } from './system.service';

export async function getSystemResourcesHandler(req: Request, res: Response) {
    try {
        const resources = await getSystemResources();
        res.json(resources);
    } catch (error) {
        console.error('Error in getSystemResourcesHandler:', error);
        res.status(500).json({
            error: 'Failed to fetch system resources',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

