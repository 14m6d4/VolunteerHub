import apiFetch from "./api";

// post
export async function getPosts(groupId: string) {
    return apiFetch(`/groups/${groupId}/posts`, {
        method: "GET",
    });
}

export async function createPost(groupId: string, data: any) {
    return apiFetch(`/groups/${groupId}/posts`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function likePost(postId: string) {
    return apiFetch(`/groups/posts/${postId}/like`, {
        method: "POST",
    });
}

export async function deletePost(postId: string) {
    return apiFetch(`/groups/posts/${postId}`, {
        method: "DELETE",
    });
}

// comment
export async function createComment(postId: string, data: any) {
    return apiFetch(`/groups/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getComments(postId: string) {
    return apiFetch(`/groups/${postId}/comments/post/${postId}`, {
        method: "GET",
    });
}

export async function likeComment(postId: string, commentId: string) {
    return apiFetch(`/groups/${postId}/comments/like/${commentId}`, {
        method: "POST",
    });
}

export async function deleteComment(postId: string, commentId: string) {
    return apiFetch(`/groups/${postId}/comments/${commentId}`, {
        method: "DELETE",
    });
}
