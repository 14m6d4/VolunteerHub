import React, { useEffect, useState } from "react";
import axios from "axios";

export default function VolunteerPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [myRegs, setMyRegs] = useState<any[]>([]);

    const fetchEvents = async () => {
        const res = await axios.get("http://localhost:5000/api/events?status=approved");
        const list = res.data.data || res.data || [];
        setEvents(list);
    };

    const fetchMyRegistrations = async () => {
        const res = await axios.get("http://localhost:5000/api/register/me");
        setMyRegs(res.data.data || []);
    };

    const registerEvent = async (eventId: string) => {
        await axios.post(`http://localhost:5000/api/register/${eventId}`);
        fetchMyRegistrations();
    };

    const unregisterEvent = async (eventId: string) => {
        await axios.delete(`http://localhost:5000/api/register/${eventId}`);
        fetchMyRegistrations();
    };

    useEffect(() => {
        fetchEvents();
        fetchMyRegistrations();
    }, []);

    const getMyRegistration = (eventId: string) =>
        myRegs.find((r) => r.eventId?._id === eventId);

    return (
        <div style={{ padding: 20 }}>
            <h2>Volunteer – Sự kiện đã thông qua</h2>

            {events.map((e) => {
                const reg = getMyRegistration(e._id);

                return (
                    <div
                        key={e._id}
                        style={{ border: "1px solid #ccc", marginTop: 10, padding: 12 }}
                    >
                        <b>{e.title}</b>
                        <div>Trạng thái: {e.status}</div>

                        {!reg ? (
                            <button
                                onClick={() => registerEvent(e._id)}
                                style={{ marginTop: 10, padding: "6px 12px" }}
                            >
                                Đăng ký
                            </button>
                        ) : (
                            <div style={{ marginTop: 10 }}>
                                <span>
                                    Đã đăng ký –{" "}
                                    <b style={{ color: reg.status === "approved" ? "green" : "orange" }}>
                                        {reg.status}
                                    </b>
                                </span>
                                <button
                                    onClick={() => unregisterEvent(e._id)}
                                    style={{
                                        marginLeft: 10,
                                        padding: "6px 12px",
                                        background: "red",
                                        color: "white"
                                    }}
                                >
                                    Hủy đăng ký
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            <h2 style={{ marginTop: 30 }}>Sự kiện bạn đã đăng ký</h2>
            {myRegs.length === 0 && <p>Bạn chưa đăng ký sự kiện nào.</p>}

            {myRegs.map((r) => (
                <div key={r._id} style={{ border: "1px solid #aaa", marginTop: 10, padding: 12 }}>
                    <b>{r.eventId?.title}</b>
                    <div>Trạng thái đăng ký: {r.status}</div>
                </div>
            ))}
        </div>
    );
}
