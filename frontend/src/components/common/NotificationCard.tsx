import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface NotificationCardProps {
    notification: {
        _id: string;
        type: string;
        title: string;
        body?: string;
        data?: Record<string, any>;
        isRead: boolean;
        createdAt: string;
        actor?: {
            _id: string;
            name: string;
            username: string;
            profilePicture?: string;
        };
    };
    onMarkRead?: (id: string) => void;
    userRole?: string;
}

export function NotificationCard({ notification, onMarkRead, userRole }: NotificationCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        onMarkRead?.(notification._id);

        const { type, data } = notification;

        // Post-related notifications - redirect to post
        if (type === 'post_liked' || type === 'post_commented') {
            if (data?.postId && data?.eventId) {
                navigate(`/events/${data.eventId}/posts/${data.postId}`);
            }
            return;
        }

        // Report notifications
        if (type === 'event_report' || type === 'user_report' || type === 'post_report') {
            if (userRole === 'admin') {
                navigate('/manage/reports');
            } else if (data?.eventId) {
                // Manager - redirect to event's report page
                navigate(`/manage-event/${data.eventId}?tab=reports`);
            }
            return;
        }

        // Report resolution notifications - redirect to post
        if (type === 'report_resolved' || type === 'report_rejected') {
            if (data?.postId && data?.eventId) {
                navigate(`/events/${data.eventId}/posts/${data.postId}`);
            }
            return;
        }

        // Friend request notifications
        if (type === 'friend_request_received') {
            navigate('/users?tab=requests');
            return;
        }

        if (type === 'friend_request_accepted' && data?.username) {
            navigate(`/u/${data.username}`);
            return;
        }

        // Event-related notifications
        if (data?.eventId) {
            navigate(`/events/${data.eventId}`);
            return;
        }

        // Fallback
        if (data?.url) {
            navigate(data.url);
        }
    };

    const formatNotificationText = () => {
        const { title, actor } = notification;

        // 1. Identify text chunks to highlight
        const chunks: { text: string; strong?: boolean; italic?: boolean }[] = [];

        // Helper to push text if not empty
        const pushText = (text: string, strong = false, italic = false) => {
            if (text) chunks.push({ text, strong, italic });
        };

        let remainingTitle = title;

        // A. Highlight Actor Name
        if (actor?.name && remainingTitle.includes(actor.name)) {
            // Assuming actor name appears once for simplicity, or we reconstruct split
            // But simple split is dangerous if name appears twice.
            // Let's use indexOf to be safer and process linearly.
            const index = remainingTitle.indexOf(actor.name);
            if (index >= 0) {
                pushText(remainingTitle.substring(0, index));
                chunks.push({ text: actor.name, strong: true });
                remainingTitle = remainingTitle.substring(index + actor.name.length);
            }
        }

        // B. Highlight Quoted Text (Event Titles)
        // Regex to find "Text Inside Quotes"
        const quoteRegex = /"([^"]+)"/;
        const match = remainingTitle.match(quoteRegex);

        if (match) {
            const fullMatch = match[0]; // "Title"
            const content = match[1];   // Title
            const index = remainingTitle.indexOf(fullMatch);

            if (index >= 0) {
                // Determine if we already have chunks from Actor step
                // If we do, 'remainingTitle' is the remainder. 
                // We just append to chunks list.

                // Wait, if I just push to chunks, I need to make sure I'm handling the text BEFORE the quote
                if (chunks.length > 0) {
                    // We already partially processed the string (removed actor name).
                    // The 'remainingTitle' now contains the quote.
                    pushText(remainingTitle.substring(0, index));
                    chunks.push({ text: `"${content}"`, strong: true, italic: true });
                    pushText(remainingTitle.substring(index + fullMatch.length));
                } else {
                    // Actor name wasn't found or processed
                    pushText(remainingTitle.substring(0, index));
                    chunks.push({ text: `"${content}"`, strong: true, italic: true });
                    pushText(remainingTitle.substring(index + fullMatch.length));
                }
            } else {
                if (chunks.length > 0) pushText(remainingTitle);
                else pushText(title); // Fallback
            }
        } else {
            // No quotes found
            if (chunks.length > 0) {
                pushText(remainingTitle);
            } else {
                // No actor, no quotes -> return plain title
                return <div className="text-sm font-medium leading-none">{title}</div>;
            }
        }

        // 3. Render
        // If we messed up the logic (e.g. overlaps), fallback to parsed chunks
        // Simplified Logic: 
        // Just Regex replace keys with tokens, then map?
        // Let's try a simpler approach: 
        // 1. Highlight Actor Name -> Wrap in <b>
        // 2. Highlight "..." -> Wrap in <b><i>

        // We can do this with a single splitting pass if we carefully manage the parts

        const finalNodes: React.ReactNode[] = [];
        let currentText = title;

        // We will process hierarchically: First highlight Actor, then looking inside the remaining parts for Quotes?
        // Actually, let's just use a safe splitting function.

        const parts1 = actor?.name ? currentText.split(actor.name) : [currentText];

        parts1.forEach((part, i) => {
            // Process quotes inside this part
            const quoteParts = part.split(/"([^"]+)"/);

            quoteParts.forEach((qp, j) => {
                // Even indices are normal text, Odd indices are captured quotes (without the quote marks because split captures group)
                // Wait, split by regex with capturing group returns [text, captured, text, captured...]

                if (j % 2 === 1) {
                    // This is the quoted text (without quotes)
                    finalNodes.push(<span key={`${i}-${j}`} className="font-bold italic">"{qp}"</span>);
                } else {
                    finalNodes.push(qp);
                }
            });

            // Add Actor Name separator if not last
            if (i < parts1.length - 1) {
                finalNodes.push(<span key={`actor-${i}`} className="font-bold">{actor?.name}</span>);
            }
        });

        return (
            <div className="text-sm font-medium leading-none">
                {finalNodes}
            </div>
        );
    };

    return (
        <div
            className={cn(
                "flex-1 space-y-1 cursor-pointer",
                !notification.isRead && "font-semibold"
            )}
            onClick={handleClick}
        >
            {formatNotificationText()}
            {notification.body && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                    {notification.body}
                </div>
            )}
            {notification.createdAt && (
                <div className="text-[11px] text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                </div>
            )}
        </div>
    );
}
