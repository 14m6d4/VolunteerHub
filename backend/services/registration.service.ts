import { RegistrationModel, RegistrationStatus } from "../models/Registration.model.ts";
import { EventModel } from "../models/Event.model.ts";
import createHttpError from "http-errors";
import { Types } from "mongoose";

export const RegistrationService = {
    async register(eventId: string, volunteerId: Types.ObjectId) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.status !== "approved") throw createHttpError(400, "Event is not open for registration");
        const now = new Date();
        if (event.startAt <= now) throw createHttpError(400, "Event already started or past registration deadline");
        if (event.maxMembers && event.currentMembers >= event.maxMembers) throw createHttpError(400, "Event is full");

        try {
            const reg = await RegistrationModel.create({
                eventId,
                volunteerId,
                status: RegistrationStatus.PENDING
            });
            return reg;
        } catch (err: any) {
            if (err.code === 11000) throw createHttpError(400, "You already registered for this event");
            throw err;
        }
    },

    async cancelRegistration(eventId: string, volunteerId: Types.ObjectId) {
        const reg = await RegistrationModel.findOne({ eventId, volunteerId });
        if (!reg) throw createHttpError(404, "Registration not found");

        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        if (new Date() >= event.startAt) throw createHttpError(400, "Cannot cancel after event start");

        if (reg.status === RegistrationStatus.APPROVED) {
            event.currentMembers = Math.max(0, event.currentMembers - 1);
            await event.save();
        }
        await RegistrationModel.deleteOne({ _id: reg._id });

        return { message: "Registration cancelled successfully" };
    },


    async approveRegistration(regId: string, managerId: Types.ObjectId) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        const event = await EventModel.findById(reg.eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.maxMembers && event.currentMembers >= event.maxMembers) throw createHttpError(400, "Event is full");
        reg.status = RegistrationStatus.APPROVED;
        await reg.save();
        event.currentMembers += 1;
        await event.save();
        return reg;
    },

    async rejectRegistration(regId: string, managerId: Types.ObjectId) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        reg.status = RegistrationStatus.REJECTED;
        await reg.save();
        // await RegistrationModel.deleteOne({ _id: regId });
        return { message: "Registration rejected and removed" };
    },

    async markCompleted(regId: string) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        reg.status = RegistrationStatus.COMPLETED;
        reg.completedAt = new Date();
        await reg.save();
        return reg;
    },

    async getRegistrationsForEvent(eventId: string, filters: any = {}) {
        const query: any = { eventId };
        if (filters.status) query.status = filters.status;
        const items = await RegistrationModel.find(query).populate("volunteerId", "name email");
        console.log("Fetched registrations for event", eventId, "Count:", items.length);
        return items;
    },

    async getUserRegistrations(userId: Types.ObjectId) {
        return RegistrationModel.find({ volunteerId: userId }).populate("eventId");
    }
};
