import apiFetch from './api';

export interface ReportData {
    reason: string;
    description?: string;
}

export async function reportEvent(eventId: string, data: ReportData) {
    return apiFetch('/report/event', {
        method: 'POST',
        body: { eventId, ...data }
    });
}

export async function reportUser(userId: string, data: ReportData) {
    return apiFetch('/report/user', {
        method: 'POST',
        body: { targetId: userId, ...data }
    });
}

export async function reportPost(postId: string, data: ReportData) {
    return apiFetch('/report/post', {
        method: 'POST',
        body: { postId, ...data }
    });
}
