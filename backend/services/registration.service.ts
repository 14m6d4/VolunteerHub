import { RegistrationModel, RegistrationStatus } from "../models/Registration.model.ts";
import User from "../models/User.model.ts";
import { EventModel } from "../models/Event.model.ts";
import createHttpError from "http-errors";
import { Types } from "mongoose";
import { UserRole } from "../types/user.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";


/**
 * Moderating a registration means moderating its event, so the caller must run
 * that event. roleMiddleware only proves they are some manager, which let any
 * manager approve, reject, or kick members on anyone else's event.
 */
function assertMayManageEvent(event: { managerId: Types.ObjectId }, actorId: Types.ObjectId, actorRole: string) {
    if (actorRole === UserRole.Admin) return;
    if (!event.managerId?.equals(actorId)) {
        throw createHttpError(403, "You do not manage this event");
    }
}

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
            const volunteer = await User.findById(volunteerId);
            const volunteerName = volunteer ? (volunteer.name || volunteer.username) : "A volunteer";

            NotificationService.notify(event.managerId.toString(), {
                type: NotificationType.REGISTRATION_PENDING,
                title: "New Registration Request",
                body: `${volunteerName} has registered for event "${event.title}"`,
                data: { eventId: event._id, registrationId: reg._id, url: `/manage-events?manageMembers=${event._id}` }
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


    async approveRegistration(regId: string, managerId: Types.ObjectId, managerRole: string) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        const event = await EventModel.findById(reg.eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, managerId, managerRole);
        if (event.maxMembers && event.currentMembers >= event.maxMembers) throw createHttpError(400, "Event is full");
        reg.status = RegistrationStatus.APPROVED;
        await reg.save();
        event.currentMembers += 1;
        await event.save();
        await NotificationService.notify(reg.volunteerId.toString(), {
            type: NotificationType.EVENT_JOINED,
            title: "Registration Approved",
            body: `You have join event ${event.title}`,
            data: { eventId: event._id, url: `/events/${event._id}` }
        });
        return reg;
    },

    async rejectRegistration(regId: string, managerId: Types.ObjectId, managerRole: string) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        const event = await EventModel.findById(reg.eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, managerId, managerRole);
        reg.status = RegistrationStatus.REJECTED;
        await reg.save();
        NotificationService.notify(reg.volunteerId.toString(), {
            type: NotificationType.EVENT_KICKED,
            title: "Your registration was rejected",
            body: `Your registration for event ${event.title} was rejected`,
            data: { eventId: event._id }
        });
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

    async getRegistrationsForEvent(eventId: string, filters: any = {}, includeContactDetails = false) {
        const query: any = { eventId };
        if (filters.status) query.status = filters.status;
        // Email is only for whoever runs the event. Everyone else sees the
        // public profile fields, so the member list cannot be scraped for
        // addresses by any signed-in user.
        const volunteerFields = includeContactDetails
            ? "name email username profilePicture"
            : "name username profilePicture";
        const items = await RegistrationModel.find(query).populate("volunteerId", volunteerFields);
        console.log("Fetched registrations for event", eventId, "Count:", items.length);
        return items;
    },

    async getUserRegistrations(userId: Types.ObjectId) {
        return RegistrationModel.find({
            volunteerId: userId,
            status: { $ne: RegistrationStatus.REJECTED }
        }).populate("eventId");
    },

    async kickMember(regId: string, actorId: Types.ObjectId, actorRole: string) {
        const reg = await RegistrationModel.findById(regId);
        if (!reg) throw createHttpError(404, "Registration not found");

        const owningEvent = await EventModel.findById(reg.eventId);
        if (!owningEvent) throw createHttpError(404, "Event not found");
        assertMayManageEvent(owningEvent, actorId, actorRole);

        // Ensure we only kick approved members (or check logic if you want to kick others too)
        if (reg.status !== RegistrationStatus.APPROVED) {
            throw createHttpError(400, "Member is not approved in this event");
        }

        reg.status = RegistrationStatus.REJECTED;
        await reg.save();

        const event = await EventModel.findById(reg.eventId);
        if (event) {
            event.currentMembers = Math.max(0, event.currentMembers - 1);
            await event.save();
        }
        await NotificationService.notify(reg.volunteerId.toString(), {
            type: NotificationType.EVENT_KICKED,
            title: "You have been removed from the event",
            body: `You have been removed from event ${event?.title}`,
            data: { eventId: event?._id }
        });
        return { message: "Member kicked from event successfully" };
    }
};
