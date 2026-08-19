import React from "react";
import type { EventCardEvent } from "./EventCard.tsx";

interface EventDetailsProps {
    event: EventCardEvent;
    onBack: () => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onBack }) => {
    return (
        <div className="border p-4 rounded space-y-2">
            <button
                className="text-blue-500 underline"
                onClick={onBack}
            >
                Back
            </button>
            <h2 className="font-bold text-xl">{event.title}</h2>
            <p>{event.description}</p>
            <p>Status: {event.status}</p>
            <p>Start: {event.startAt ? new Date(event.startAt).toLocaleString() : "N/A"}</p>
            <p>End: {event.endAt ? new Date(event.endAt).toLocaleString() : "N/A"}</p>
            <p>Tags: {event.tags?.join(", ") || "None"}</p>
            <p>Current Members: {event.currentMembers}</p>
            <p>Max Members: {event.maxMembers || "Unlimited"}</p>
        </div>
    );
};

export default EventDetails;
