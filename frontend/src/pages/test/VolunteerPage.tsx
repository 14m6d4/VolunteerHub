import React, { useEffect, useState } from "react";
import axios from "axios";

export default function VolunteerPage() {
    const [events, setEvents] = useState<any[]>([]);

    const fetchEvents = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/events?status=approved");
            console.log("API response:", res.data);

            // Trường hợp API trả { data: [...] }
            if (Array.isArray(res.data?.data)) {
                setEvents(res.data.data);
            }
            // Trường hợp API trả trực tiếp [...]
            else if (Array.isArray(res.data)) {
                setEvents(res.data);
            }
            else {
                console.error("API không trả về array!");
                setEvents([]); // đảm bảo luôn là array
            }
        } catch (err) {
            console.error("Lỗi fetch:", err);
            setEvents([]);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Volunteer – Sự kiện đã thông qua</h2>

            {events.map((e: any) => (
                <div key={e._id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}>
                    <b>{e.title}</b>
                    <div>Trạng thái: {e.status}</div>
                </div>
            ))}
        </div>
    );
}
