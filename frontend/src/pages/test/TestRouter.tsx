import { useEffect, useState } from "react";
import useAuth from "@/hooks/useAuth";
import {
    getEvents,
    createEvent,
    registerEvent,
    unregisterEvent,
    getMyRegistrations
} from "@/services/event.service";
import { approveEvent, deleteEvent } from "@/services/admin.service";

export default function EventsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [approvedEvents, setApprovedEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);

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
            }
            else if (user.role === "manager") {
                const res = await getEvents({});
                setApprovedEvents(res.items ?? []);
            }
            else if (user.role === "volunteer") {
                const eventsRes = await getEvents({ status: "approved" });
                setApprovedEvents(eventsRes.items ?? []);

                const regRes = await getMyRegistrations();
                setMyRegistrations(regRes.data ?? regRes.items ?? []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(eventId: string) {
        await registerEvent(eventId);
        loadEvents();
    }

    async function handleUnregister(eventId: string) {
        await unregisterEvent(eventId);
        loadEvents();
    }

    async function handleDelete(eventId: string) {
        await deleteEvent(eventId);
        loadEvents();
    }

    async function handleApprove(eventId: string) {
        await approveEvent(eventId);
        loadEvents();
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Events</h1>
            <p className="mb-4">
                Logged in as: <b>{user?.email || user?.username}</b> ({user?.role})
            </p>

            {loading && <p>Loading...</p>}

            {user?.role === "admin" && pendingEvents.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Pending Events</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingEvents.map((e: any) => (
                            <EventCard
                                key={e._id}
                                event={e}
                                user={user}
                                onApprove={handleApprove}
                                onDelete={handleDelete}
                                myRegs={myRegistrations}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-xl font-semibold mb-2">Events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvedEvents.map((e: any) => (
                        <EventCard
                            key={e._id}
                            event={e}
                            user={user}
                            onRegister={handleRegister}
                            onUnregister={handleUnregister}
                            onDelete={handleDelete}
                            myRegs={myRegistrations}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

function EventCard({
    event,
    user,
    onRegister,
    onUnregister,
    onApprove,
    onDelete,
    myRegs
}: any) {

    const reg = myRegs?.find((r: any) => r.eventId?._id === event._id);

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
                        onClick={() => onApprove(event._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                        Approve
                    </button>
                )}

                {["admin", "manager"].includes(user?.role) && (
                    <button
                        onClick={() => onDelete(event._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                        Delete
                    </button>
                )}

                {user?.role === "volunteer" && event.status === "approved" && (
                    !reg ? (
                        <button
                            onClick={() => onRegister(event._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                            Register
                        </button>
                    ) : (
                        <button
                            onClick={() => onUnregister(event._id)}
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
