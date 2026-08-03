// ManagerPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { getEventRegistrations, approveRegistration, rejectRegistration } from "@/services/event.service";

interface ManagedEvent {
    _id: string;
    title: string;
}

interface Registration {
    _id: string;
    status: string;
    volunteerId?: { email?: string };
}

export default function ManagerPage() {
    const [approved, setApproved] = useState<ManagedEvent[]>([]);
    const [pending, setPending] = useState<ManagedEvent[]>([]);
    const [newEvent, setNewEvent] = useState("");
    const [registrations, setRegistrations] = useState<Record<string, Registration[]>>({});
    const [showRegistrationsForEvent, setShowRegistrationsForEvent] = useState<string | null>(null); // Track event to show registrations

    const loadUser = async () => {
        const token = localStorage.getItem("accessToken");
        if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        await axios.get("http://localhost:5000/api/auth/me");
    };

    const fetchMyEvents = async () => {
        const resApproved = await axios.get("http://localhost:5000/api/events/my?status=approved");
        const resPending = await axios.get("http://localhost:5000/api/events/my?status=pending");

        setApproved(resApproved.data.data || []);
        setPending(resPending.data.data || []);
    };

    const fetchRegistrationsForEvent = async (eventId: string) => {
        const res = await getEventRegistrations(eventId); // Gọi API để lấy danh sách đăng ký
        setRegistrations((prev) => ({
            ...prev,
            [eventId]: res.data.data || []
        }));
        setShowRegistrationsForEvent(eventId); // Hiển thị đăng ký cho sự kiện đã chọn
    };

    const handleApproveVolunteer = async (eventId: string, regId: string) => {
        await approveRegistration(regId); // Chấp nhận đơn đăng ký
        fetchRegistrationsForEvent(eventId); // Cập nhật lại danh sách đăng ký
    };

    const handleRejectVolunteer = async (eventId: string, regId: string) => {
        await rejectRegistration(regId); // Từ chối đơn đăng ký
        fetchRegistrationsForEvent(eventId); // Cập nhật lại danh sách đăng ký
    };

    const createEvent = async () => {
        await axios.post("http://localhost:5000/api/events", {
            title: newEvent,
            status: "pending"
        });
        setNewEvent("");
        fetchMyEvents();
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
        loadUser().then(fetchMyEvents);
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Manager – Sự kiện của bạn</h2>

            <h3>Đã duyệt</h3>
            {approved.map((e) => (
                <div key={e._id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}>
                    <b>{e.title}</b>

                    <button
                        onClick={() => fetchRegistrationsForEvent(e._id)} // Nhấn vào để xem đăng ký
                        style={{ marginLeft: 10 }}
                    >
                        Xem đăng ký
                    </button>

                    {/* Hiển thị danh sách đăng ký nếu có */}
                    {showRegistrationsForEvent === e._id && registrations[e._id] && (
                        <div style={{ marginTop: 10, paddingLeft: 20 }}>
                            <h4>Volunteer chờ duyệt</h4>

                            {registrations[e._id]
                                .filter((r) => r.status === "pending")
                                .map((r) => (
                                    <div key={r._id} style={{ marginTop: 8 }}>
                                        {r.volunteerId?.email}
                                        <button
                                            onClick={() => handleApproveVolunteer(e._id, r._id)}
                                            style={{ marginLeft: 10, background: "green", color: "white" }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectVolunteer(e._id, r._id)}
                                            style={{ marginLeft: 10, background: "red", color: "white" }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            ))}

            <h3 style={{ marginTop: 20 }}>Đang chờ duyệt</h3>
            {pending.map((e) => (
                <div key={e._id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}>
                    <b>{e.title}</b>
                </div>
            ))}

            <h3 style={{ marginTop: 30 }}>Tạo sự kiện</h3>
            <input
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                placeholder="Tên sự kiện"
                style={{ padding: 8 }}
            />
            <button onClick={createEvent} style={{ marginLeft: 10, padding: "8px 16px" }}>
                Tạo
            </button>
        </div>
    );
}
