import type { Request, Response } from 'express';
import * as adminService from '../services/admin.service.ts';

export async function getAnalytics(req: Request, res: Response) {
    try {
        const data = await adminService.getAnalytics();

        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error: any) {
        console.error('[Admin Analytics] Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics data',
            error: error.message
        });
    }
}
