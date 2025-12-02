import React from "react";

interface EventCardProps {
    event: any;
    onSelect: (event: any) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
    return (
        <div
            className="border p-4 rounded shadow hover:shadow-lg cursor-pointer"
            onClick={() => onSelect(event)}
        >
            <h2 className="font-bold text-lg">{event.title}</h2>
            <p className="text-sm text-gray-600">{event.description}</p>
            <p className="text-xs text-gray-500">
                Start: {new Date(event.startAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
                Status: {event.status}
            </p>
        </div>
    );
};

export default EventCard;
