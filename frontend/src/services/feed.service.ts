import apiFetch from "./api";

export async function getFeed(filters?: {
    tab?: string;
    page?: number;
    limit?: number;
}) {
    return apiFetch("/feed", {
        query: filters,
    });
}

export async function createPost(formData: FormData) {
    return apiFetch("/posts", {
        method: "POST",
        body: formData,
    });
}

export async function likePost(postId: string) {
    return apiFetch(`/posts/${postId}/like`, {
        method: "POST",
    });
}