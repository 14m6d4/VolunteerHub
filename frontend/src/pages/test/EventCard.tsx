import React from "react";

interface Props {
    event: any;
    onSelect: (event: any) => void;
    onApprove?: (id: string) => void;
    isAdmin?: boolean;
}

const EventCard: React.FC<Props> = ({ event, onSelect, onApprove, isAdmin }) => {
    return (
        <div className="border rounded p-3 shadow cursor-pointer">
            <h3 className="font-bold text-lg">{event.title}</h3>
            <p className="text-sm text-gray-500">{event.description}</p>

            <p className="mt-2">
                <span className="text-xs px-2 py-1 rounded bg-gray-200">
                    Status: {event.status}
                </span>
            </p>

            <div className="flex gap-2 mt-3">
                <button
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                    onClick={() => onSelect(event)}
                >
                    View
                </button>

                {isAdmin && event.status === "pending" && (
                    <button
                        className="px-3 py-1 bg-green-600 text-white rounded"
                        onClick={() => onApprove?.(event._id)}
                    >
                        Approve
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventCard;
