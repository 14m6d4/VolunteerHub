import apiFetch from './api';

export interface ReportData {
    reason: string;
    description?: string;
}

export async function reportEvent(eventId: string, data: ReportData) {
    return apiFetch('/report/event', {
        method: 'POST',
        body: JSON.stringify({ eventId, ...data }),
        headers: { "Content-Type": "application/json" }
    });
}

export async function reportUser(userId: string, data: ReportData) {
    return apiFetch('/report/user', {
        method: 'POST',
        body: JSON.stringify({ targetId: userId, ...data }),
        headers: { "Content-Type": "application/json" }
    });
}

export async function reportPost(postId: string, data: ReportData) {
    return apiFetch('/report/post', {
        method: 'POST',
        body: JSON.stringify({ postId, ...data }),
        headers: { "Content-Type": "application/json" }
    });
}
