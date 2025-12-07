import React, { useState } from "react";

interface EventFormProps {
    onCreate: (data: any) => void;
}

const EventForm: React.FC<EventFormProps> = ({ onCreate }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startAt, setStartAt] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({ title, description, startAt: new Date(startAt).toISOString() });
        setTitle("");
        setDescription("");
        setStartAt("");
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border p-4 rounded space-y-2"
        >
            <h2 className="font-bold text-lg">Create Event</h2>
            <input
                className="border p-2 w-full"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
                className="border p-2 w-full"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            <input
                type="datetime-local"
                className="border p-2 w-full"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                Create
            </button>
        </form>
    );
};

export default EventForm;
