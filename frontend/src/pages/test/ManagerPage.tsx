import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ManagerPage() {
    const [approved, setApproved] = useState([]);
    const [pending, setPending] = useState([]);
    const [newEvent, setNewEvent] = useState("");
    const [user, setUser] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any>({});

    const loadUser = async () => {
        const token = localStorage.getItem("accessToken");
        if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const res = await axios.get("http://localhost:5000/api/auth/me");
        setUser(res.data.user || res.data.data);
    };

    const fetchMyEvents = async () => {
        const resApproved = await axios.get("http://localhost:5000/api/events/my?status=approved");
        const resPending = await axios.get("http://localhost:5000/api/events/my?status=pending");

        setApproved(resApproved.data.data || []);
        setPending(resPending.data.data || []);
    };

    const fetchRegistrationsForEvent = async (eventId: string) => {
        const res = await axios.get(`http://localhost:5000/api/register/${eventId}`);
        setRegistrations((prev: any) => ({
            ...prev,
            [eventId]: res.data.data || []
        }));
    };

    const approveVolunteer = async (eventId: string, regId: string) => {
        await axios.post(`http://localhost:5000/api/register/approve/${regId}`);
        fetchRegistrationsForEvent(eventId);
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
        loadUser().then(fetchMyEvents);
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Manager – Sự kiện của bạn</h2>

            <h3>Đã duyệt</h3>
            {approved.map((e: any) => (
                <div key={e._id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}>
                    <b>{e.title}</b>

                    <button
                        onClick={() => fetchRegistrationsForEvent(e._id)}
                        style={{ marginLeft: 10 }}
                    >
                        Xem đăng ký
                    </button>

                    {registrations[e._id] && (
                        <div style={{ marginTop: 10, paddingLeft: 20 }}>
                            <h4>Volunteer chờ duyệt</h4>

                            {registrations[e._id]
                                .filter((r: any) => r.status === "pending")
                                .map((r: any) => (
                                    <div key={r._id} style={{ marginTop: 8 }}>
                                        {r.volunteerId?.email}
                                        <button
                                            onClick={() => approveVolunteer(e._id, r._id)}
                                            style={{ marginLeft: 10, background: "green", color: "white" }}
                                        >
                                            Approve
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            ))}

            <h3 style={{ marginTop: 20 }}>Đang chờ duyệt</h3>
            {pending.map((e: any) => (
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
