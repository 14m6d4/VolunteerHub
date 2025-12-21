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
                navigate(`/manage-event/${data.eventId}?tab=reports`);
            }
            return;
        }

        if (type === 'report_resolved' || type === 'report_rejected') {
            if (data?.postId && data?.eventId) {
                navigate(`/events/${data.eventId}/posts/${data.postId}`);
            }
            return;
        }

        if (type === 'friend_request_received') {
            navigate('/users?tab=requests');
            return;
        }

        if (type === 'friend_request_accepted' && data?.username) {
            navigate(`/u/${data.username}`);
            return;
        }

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

        const chunks: { text: string; strong?: boolean; italic?: boolean }[] = [];

        const pushText = (text: string, strong = false, italic = false) => {
            if (text) chunks.push({ text, strong, italic });
        };

        let remainingTitle = title;

        if (actor?.name && remainingTitle.includes(actor.name)) {
            const index = remainingTitle.indexOf(actor.name);
            if (index >= 0) {
                pushText(remainingTitle.substring(0, index));
                chunks.push({ text: actor.name, strong: true });
                remainingTitle = remainingTitle.substring(index + actor.name.length);
            }
        }

        const quoteRegex = /"([^"]+)"/;
        const match = remainingTitle.match(quoteRegex);

        if (match) {
            const fullMatch = match[0]; // "Title"
            const content = match[1];   // Title
            const index = remainingTitle.indexOf(fullMatch);

            if (index >= 0) {
                if (chunks.length > 0) {
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


        const finalNodes: React.ReactNode[] = [];
        let currentText = title;

        const parts1 = actor?.name ? currentText.split(actor.name) : [currentText];

        parts1.forEach((part, i) => {
            const quoteParts = part.split(/"([^"]+)"/);

            quoteParts.forEach((qp, j) => {
                if (j % 2 === 1) {
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
