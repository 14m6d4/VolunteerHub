// EventsPage.tsx
import { useEffect, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { getEvents, getEventRegistrations, registerEvent, unregisterEvent, getMyRegistrations } from "@/services/event.service";
import { approveEvent, deleteEvent } from "@/services/admin.service";
import EventCard from "@/pages/test/EventCard"; // Đảm bảo đúng đường dẫn

export default function EventsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [approvedEvents, setApprovedEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [eventRegistrations, setEventRegistrations] = useState<any>(null); // Lưu trữ đăng ký sự kiện
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null); // Để track sự kiện đang xem đăng ký

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
                const res = await getEvents({});
                setApprovedEvents(res.items ?? []);
            } else if (user.role === "volunteer") {
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

    // Hàm để gọi API lấy danh sách đơn đăng ký của sự kiện
    // EventsPage.tsx
    const handleViewRegistrations = async (eventId: string) => {
        try {
            setSelectedEventId(eventId); // Đánh dấu sự kiện hiện tại
            const res = await getEventRegistrations(eventId); // Gọi API lấy đơn đăng ký
            console.log("Registrations data:", res.data.data); // Kiểm tra dữ liệu API trả về
            // Kiểm tra xem dữ liệu có phải là mảng không trước khi cập nhật
            if (Array.isArray(res.data.data)) {
                setEventRegistrations(res.data.data); // Lưu đăng ký vào state
            } else {
                setEventRegistrations([]); // Nếu không phải mảng, trả về mảng rỗng
            }
        } catch (err) {
            console.error("Error fetching registrations:", err);
        }
    };


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
                                onViewRegistrations={handleViewRegistrations} // Truyền hàm vào
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
                            onApprove={handleApprove}
                            onViewRegistrations={handleViewRegistrations} // Truyền hàm vào
                        />
                    ))}
                </div>
            </section>

            {/* Hiển thị danh sách đăng ký khi có dữ liệu */}
            {eventRegistrations && selectedEventId && (
                <section className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">Registrations for Event {selectedEventId}</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {eventRegistrations.length > 0 ? (
                            eventRegistrations.map((reg: any) => (
                                <div key={reg._id} className="border p-4 rounded shadow">
                                    <p>Email: {reg.volunteerId?.email}</p>
                                    <p>Status: {reg.status}</p>
                                    {/* Hiển thị thông tin đơn đăng ký */}
                                </div>
                            ))
                        ) : (
                            <p>No registrations found for this event.</p>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
