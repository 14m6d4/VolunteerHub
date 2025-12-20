import { apiFetch } from './api';

export const ReportService = {
    async reportPost(reporterId: string, postId: string, reason: string, eventId?: string, description?: string) {
        return apiFetch('/report/post', {
            method: 'POST',
            body: JSON.stringify({
                reporterId,
                postId,
                reason,
                eventId,
                description,
            }),
        });
    },
};
