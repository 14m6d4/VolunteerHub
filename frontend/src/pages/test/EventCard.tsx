// EventCard.tsx
export interface EventCardEvent {
    _id: string;
    id?: string;
    title: string;
    description?: string;
    status: string;
    startAt?: string;
    endAt?: string;
    tags?: string[];
    currentMembers?: number;
    maxMembers?: number;
}

interface EventCardUser {
    role?: string;
}

interface EventCardRegistration {
    eventId?: { _id?: string };
}

interface EventCardProps {
    event: EventCardEvent;
    user?: EventCardUser;
    onRegister?: (eventId: string) => void;
    onUnregister?: (eventId: string) => void;
    onApprove?: (eventId: string) => void;
    onDelete?: (eventId: string) => void;
    onSelect?: (event: EventCardEvent) => void;
    myRegs?: EventCardRegistration[];
    onViewRegistrations?: (eventId: string) => void;
}

function EventCard({
    event,
    user,
    onRegister,
    onUnregister,
    onApprove,
    onDelete,
    myRegs,
    onViewRegistrations
}: EventCardProps) {

    const reg = myRegs?.find((r) => r.eventId?._id === event._id);

    return (
        <div className="border p-4 rounded shadow">
            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>

            <p className="text-sm mb-2">
                Status:{" "}
                {event.status === "approved" ? (
                    <span className="text-green-600 font-semibold">Approved</span>
                ) : (
                    <span className="text-yellow-600 font-semibold">Pending</span>
                )}
            </p>

            <div className="flex gap-2 mt-2">
                {user?.role === "admin" && event.status !== "approved" && (
                    <button
                        onClick={() => onApprove?.(event._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                        Approve
                    </button>
                )}

                {["admin", "manager"].includes(user?.role || '') && (
                    <button
                        onClick={() => onDelete?.(event._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                        Delete
                    </button>
                )}

                {user?.role === "manager" && event.status === "approved" && (
                    <button
                        onClick={() => onViewRegistrations?.(event._id)} // Truyền sự kiện vào
                        className="px-3 py-1 bg-yellow-600 text-white rounded"
                    >
                        View Registrations
                    </button>
                )}

                {user?.role === "volunteer" && event.status === "approved" && (
                    !reg ? (
                        <button
                            onClick={() => onRegister?.(event._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                            Register
                        </button>
                    ) : (
                        <button
                            onClick={() => onUnregister?.(event._id)}
                            className="px-3 py-1 bg-gray-600 text-white rounded"
                        >
                            Cancel
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

export default EventCard;
