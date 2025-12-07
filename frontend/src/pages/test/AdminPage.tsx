import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPage() {
    const [events, setEvents] = useState([]);

    const fetchEvents = async () => {
        const res = await axios.get("http://localhost:5000/api/events/all");
        setEvents(res.data.data || res.data);
    };

    const approveEvent = async (id: string) => {
        await axios.put(`http://localhost:5000/api/events/${id}/approve`);
        fetchEvents();
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Admin – Tất cả sự kiện</h2>

            {events.map((e: any) => (
                <div key={e._id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}>
                    <b>{e.title}</b>
                    <div>Trạng thái: {e.status}</div>

                    {e.status === "pending" && (
                        <button
                            style={{ marginTop: 8, padding: "6px 12px" }}
                            onClick={() => approveEvent(e._id)}
                        >
                            Duyệt
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
