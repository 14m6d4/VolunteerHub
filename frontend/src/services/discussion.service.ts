import apiFetch from "./api";

// post
export async function getPosts(discussionId: string) {
    return apiFetch(`/discussions/${discussionId}/posts`, {
        method: "GET",
    });
}

export async function createPost(discussionId: string, data: any) {
    return apiFetch(`/discussions/${discussionId}/posts`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function likePost(postId: string) {
    return apiFetch(`/discussions/posts/${postId}/like`, {
        method: "POST",
    });
}

export async function deletePost(postId: string) {
    return apiFetch(`/discussions/posts/${postId}`, {
        method: "DELETE",
    });
}

// comment
export async function createComment(postId: string, data: any) {
    return apiFetch(`/discussions/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getComments(postId: string) {
    return apiFetch(`/discussions/${postId}/comments/post/${postId}`, {
        method: "GET",
    });
}

export async function likeComment(postId: string, commentId: string) {
    return apiFetch(`/discussions/${postId}/comments/like/${commentId}`, {
        method: "POST",
    });
}

export async function deleteComment(postId: string, commentId: string) {
    return apiFetch(`/discussions/${postId}/comments/${commentId}`, {
        method: "DELETE",
    });
}
