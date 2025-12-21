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
            navigate('/u?tab=requests');
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
        const { type, data, title } = notification;

        let entityName = '';

        // Event-related notifications
        if (type.includes('event') && !type.includes('report')) {
            entityName = data?.eventName || data?.eventTitle || '';
        }
        // Friend/User-related notifications
        else if (type.includes('friend') || type.includes('user')) {
            entityName = data?.senderName || data?.userName || data?.actorName || '';
        }
        // Post-related notifications
        else if (type.includes('post')) {
            entityName = data?.actorName || data?.senderName || '';
        }
        // Report notifications
        else if (type.includes('report')) {
            entityName = data?.reporterName || data?.senderName || data?.actorName || '';
        }

        // If no entity name found, return plain title
        if (!entityName) {
            return <div className="text-sm font-medium leading-none">{title}</div>;
        }

        // Split title by entity name and apply bold+underline
        const parts = title.split(entityName);

        return (
            <div className="text-sm font-medium leading-none">
                {parts.map((part, index) => (
                    <span key={index}>
                        {part}
                        {index < parts.length - 1 && (
                            <span className="font-bold underline">{entityName}</span>
                        )}
                    </span>
                ))}
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
