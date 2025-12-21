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

export async function getPostById(postId: string) {
    return apiFetch(`/posts/${postId}`, {
        method: "GET",
    });
}

// comment
// comment
export async function createComment(postId: string, data: any) {
    // Backend: router.post("/post/:postId", ...)
    return apiFetch(`/comments/post/${postId}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
    });
}

export async function getComments(postId: string) {
    // Backend: router.get("/post/:postId", ...)
    return apiFetch(`/comments/post/${postId}`, {
        method: "GET",
    });
}

export async function likeComment(commentId: string) {
    // Backend: router.post("/like/:commentId", ...)
    return apiFetch(`/comments/like/${commentId}`, {
        method: "POST",
    });
}

export async function deleteComment(commentId: string) {
    // Backend: router.delete("/:commentId", ...)
    return apiFetch(`/comments/${commentId}`, {
        method: "DELETE",
    });
}
