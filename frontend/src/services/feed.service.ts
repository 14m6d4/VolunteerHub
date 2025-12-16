import apiFetch from "./api";

export async function getFeed(filters?: {
    tab?: string;
}) {
    return apiFetch("/feed", {
        query: filters,
    });
}