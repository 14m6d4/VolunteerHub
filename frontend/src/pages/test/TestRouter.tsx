import { useEffect, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { getEvents, createEvent, approveEvent, deleteEvent } from "@/services/event.service";

export default function EventsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [pendingEvents, setPendingEvents] = useState<any[]>([]);
    const [approvedEvents, setApprovedEvents] = useState<any[]>([]);

    useEffect(() => {
        loadEvents();
    }, [user]);

    async function loadEvents() {
        if (!user) return;
        setLoading(true);

        try {
            if (user.role === "admin") {
                const pendingRes = await getEvents({ status: "pending" });
                const approvedRes = await getEvents({ status: "approved" });
                setPendingEvents(pendingRes.items ?? []);
                setApprovedEvents(approvedRes.items ?? []);
            } else if (user.role === "manager") {
                const res = await getEvents({}); // backend tự lọc managerId = user._id
                setApprovedEvents(res.items ?? []);
            } else {
                const res = await getEvents({ status: "approved" });
                setApprovedEvents(res.items ?? []);
            }
        } catch (err) {
            console.error("Failed to load events:", err);
            setPendingEvents([]);
            setApprovedEvents([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (user?.role !== "manager") return;
        const title = prompt("Enter event title:");
        if (!title) return;
        await createEvent({ title, createdBy: user._id });
        loadEvents();
    }

    async function handleApprove(id: string) {
        if (user?.role !== "admin") return;
        await approveEvent(id);
        loadEvents();
    }

    async function handleDelete(id: string) {
        if (!["admin", "manager"].includes(user?.role)) return;
        if (!confirm("Are you sure you want to delete this event?")) return;
        await deleteEvent(id);
        loadEvents();
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Events</h1>
            <p className="mb-4">
                Logged in as: <b>{user?.username || user?.email}</b> ({user?.role})
            </p>

            {user?.role === "manager" && (
                <button
                    onClick={handleCreate}
                    className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Create Event
                </button>
            )}

            {loading && <p>Loading events...</p>}

            {/* ADMIN: Pending Events */}
            {user?.role === "admin" && pendingEvents.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Pending Events</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingEvents.map(e => (
                            <EventCard
                                key={e._id}
                                event={e}
                                user={user}
                                onApprove={handleApprove}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Approved Events */}
            <section>
                <h2 className="text-xl font-semibold mb-2">
                    {user?.role === "admin" ? "Approved Events" : "Events"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvedEvents.map(e => (
                        <EventCard
                            key={e._id}
                            event={e}
                            user={user}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

// Component EventCard tái sử dụng
function EventCard({ event, user, onApprove, onDelete }: any) {
    return (
        <div className="border p-4 rounded shadow hover:shadow-md transition">
            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
            <p className="text-sm mb-2">
                Status:{" "}
                {event.status === "approved" ? (
                    <span className="text-green-600 font-semibold">Approved</span>
                ) : (
                    <span className="text-yellow-600 font-semibold">Pending</span>
                )}
            </p>
            <p className="text-xs text-gray-500 mb-2">
                Created by: {event.createdBy || "Unknown"}
            </p>

            <div className="flex gap-2 mt-2">
                {user?.role === "admin" && event.status !== "approved" && (
                    <button
                        onClick={() => onApprove(event._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                        Approve
                    </button>
                )}
                {["admin", "manager"].includes(user?.role) && (
                    <button
                        onClick={() => onDelete(event._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}
