import apiFetch from "./api";

/* ------------------------- POSTS ------------------------- */

/**
 * Lấy danh sách post trong một discussion
 */
export async function getPosts(discussionId: string) {
    return apiFetch(`/discussions/${discussionId}/posts`, {
        method: "GET",
    });
}

/**
 * Tạo post mới
 */
export async function createPost(discussionId: string, data: any) {
    return apiFetch(`/discussions/${discussionId}/posts`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * Like post
 */
export async function likePost(postId: string) {
    return apiFetch(`/discussions/posts/${postId}/like`, {
        method: "POST",
    });
}

/**
 * Xóa post
 */
export async function deletePost(postId: string) {
    return apiFetch(`/discussions/posts/${postId}`, {
        method: "DELETE",
    });
}

/* ------------------------- COMMENTS ------------------------- */

/**
 * Tạo comment mới
 */
export async function createComment(postId: string, data: any) {
    return apiFetch(`/discussions/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * Lấy comments của một post
 * Backend: GET /:postId/comments/post/:postId
 */
export async function getComments(postId: string) {
    return apiFetch(`/discussions/${postId}/comments/post/${postId}`, {
        method: "GET",
    });
}

/**
 * Like comment
 */
export async function likeComment(postId: string, commentId: string) {
    return apiFetch(`/discussions/${postId}/comments/like/${commentId}`, {
        method: "POST",
    });
}

/**
 * Xóa comment
 */
export async function deleteComment(postId: string, commentId: string) {
    return apiFetch(`/discussions/${postId}/comments/${commentId}`, {
        method: "DELETE",
    });
}
