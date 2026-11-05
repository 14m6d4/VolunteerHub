import apiFetch, { apiDownload } from "./api";
import { filenameFromDisposition, saveFile } from "@/utils/download";

export async function getEvents(filters?: {
    status?: string;
    tag?: string;
    q?: string;
    startFrom?: string;
    page?: number;
    limit?: number;
    managerId?: string;
}) {
    return apiFetch("/events", {
        query: filters,
    });
}

export async function createEvent(data: FormData | Record<string, unknown>) {
    const isFormData = data instanceof FormData;
    return apiFetch("/events", {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
        headers: isFormData ? {} : { "Content-Type": "application/json" },
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
        method: "POST",
    });
}

export async function rejectRegistration(registrationId: string) {
    return apiFetch(`/register/${registrationId}/reject`, {
        method: "POST",
    });
}

export async function kickMember(registrationId: string) {
    return apiFetch(`/register/${registrationId}/kick`, {
        method: "POST",
    });
}

export async function getMyRegistrations() {
    return apiFetch(`/register/me`, {
        method: "GET",
    });
}

export async function updateEvent(eventId: string, data: FormData | Record<string, unknown>) {
    const isFormData = data instanceof FormData;
    return apiFetch(`/events/${eventId}`, {
        method: "PUT",
        body: isFormData ? data : JSON.stringify(data),
        headers: isFormData ? {} : { "Content-Type": "application/json" },
    });
}

export async function deleteEvent(eventId: string) {
    return apiFetch(`/events/${eventId}`, {
        method: "DELETE",
    });
}

export async function getEventById(eventId: string) {
    return apiFetch(`/events/${eventId}`);
}

export async function getEventPosts(eventId: string) {
    return apiFetch(`/events/${eventId}/posts`);
}

export async function completeEvent(eventId: string) {
    return apiFetch(`/events/${eventId}/complete`, {
        method: "PATCH",
    });
}

async function downloadCalendar(path: string, fallback: string) {
    const { blob, disposition } = await apiDownload(path);
    saveFile(blob, filenameFromDisposition(disposition, fallback));
}

/** Downloads the .ics of one event you are approved for. */
export async function downloadEventCalendar(eventId: string) {
    return downloadCalendar(`/events/${eventId}/calendar.ics`, "event.ics");
}

/** Downloads one .ics of every approved event of yours that has not ended. */
export async function downloadMyCalendar() {
    return downloadCalendar("/register/me/calendar.ics", "volunteerhub-events.ics");
}
