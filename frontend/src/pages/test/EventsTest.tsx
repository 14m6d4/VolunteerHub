import React, { useEffect, useState } from "react";
import axios from "axios";
import EventCard from "./EventCard.tsx";
import EventForm from "./EventForm.tsx";
import EventDetails from "./EventDetails.tsx";

const API_URL = "http://localhost:5000/api/events/all";

const EventsTest: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);

    // Load token and fetch user
    const loadUserFromToken = async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        // Attach token to axios globally
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        try {
            const res = await axios.get("http://localhost:5000/api/auth/me");
            setUser(res.data.user || res.data.data);
        } catch (err) {
            console.error("Invalid token or expired", err);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await axios.get(API_URL);
            const eventsArray = res.data.data || res.data.items || res.data;
            setEvents(eventsArray);
        } catch (err) {
            console.error(err);
        }
    };

    const createEvent = async (data: any) => {
        try {
            const res = await axios.post("http://localhost:5000/api/events", {
                ...data,
                tags: [],
                currentMembers: 0,
                status: "pending",
                createdBy: user?._id || null,  // attach user
            });

            setEvents((prev) => [...prev, res.data.data || res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadUserFromToken();   // first load user
        fetchEvents();         // then load events
    }, []);

    if (selectedEvent) {
        return (
            <EventDetails
                event={selectedEvent}
                onBack={() => setSelectedEvent(null)}
            />
        );
    }

    return (
        <div className="p-4 space-y-4">
            {user && (
                <p className="text-sm text-gray-500">
                    Logged in as: <strong>{user.username || user.email}</strong>
                </p>
            )}

            <EventForm onCreate={createEvent} />

            <h2 className="font-bold text-xl">Event List</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                    <EventCard
                        key={event._id || event.id}
                        event={event}
                        onSelect={setSelectedEvent}
                    />
                ))}
            </div>
        </div>
    );
};

export default EventsTest;
