import apiFetch from "./api";

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