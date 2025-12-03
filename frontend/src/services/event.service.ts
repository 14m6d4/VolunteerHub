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
    // Manager vẫn gọi /events với managerId filter
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

export async function approveEvent(id: string) {
    return apiFetch(`/events/${id}/approve`, {
        method: "PATCH",
    });
}

export async function deleteEvent(id: string) {
    return apiFetch(`/events/${id}`, {
        method: "DELETE",
    });
}
