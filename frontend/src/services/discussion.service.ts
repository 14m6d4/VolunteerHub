import apiFetch from "./api";

export async function getPosts(discussionId: string) {
    return apiFetch(`/discussions/${discussionId}/posts`, {
        method: "GET",
    });
}
