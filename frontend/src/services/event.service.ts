import apiFetch from "./api";

export async function getEvents(filters?: {
    status?: string;
    tag?: string;
    q?: string;
    startFrom?: string;
    page?: number;
    limit?: number;
}) {
    return apiFetch("/events", {
        query: filters,
    });
}

export async function getEventsByManager(id: string, filters?: { status?: string }) {
    return apiFetch("/events", {
        query: { managerId: id, ...filters },
    });
}

export async function createEvent(data: any) {
    return apiFetch("/events", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function registerEvent(eventId: string) {
    return apiFetch(`/register/${eventId}`, {
        method: "POST",
    });
}

export async function unregisterEvent(eventId: string) {
    return apiFetch(`/register/${eventId}`, {
        method: "DELETE",
    });
}

export async function getEventRegistrations(eventId: string) {
    return apiFetch(`/register/${eventId}/`, {
        method: "GET",
    });
}

export async function approveRegistration(registrationId: string) {
    return apiFetch(`/register/${registrationId}/approve`, {
        method: "PATCH",
    });
}

export async function getMyRegistrations() {
    return apiFetch(`/register/me`, {
        method: "GET",
    });
}