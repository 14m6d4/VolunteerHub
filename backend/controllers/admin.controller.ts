import type { Request, Response } from 'express';
import User from '../models/User.model.ts';
import { EventModel, EventStatus } from '../models/Event.model.ts';
import { RegistrationModel, RegistrationStatus } from '../models/Registration.model.ts';
import { ReportModel } from '../models/Report.model.ts';
import { PostModel } from '../models/Post.model.ts';

/**
 * Get analytics statistics for admin dashboard
 * GET /api/admin/analytics
 */
export async function getAnalytics(req: Request, res: Response) {
    try {
        const now = new Date();

        // ============ STATISTICS ============

        // Calculate Total Users
        const totalUsers = await User.countDocuments();

        // Calculate Total Events
        const totalEvents = await EventModel.countDocuments();

        // Calculate Active Volunteers
        // Active volunteers are those who have approved registrations for ongoing events
        // Ongoing events: status = "approved" AND current time is between startAt and endAt
        const ongoingEvents = await EventModel.find({
            status: EventStatus.APPROVED,
            startAt: { $lte: now },
            $or: [
                { endAt: { $gte: now } },
                { endAt: null }
            ]
        }).select('_id');

        const ongoingEventIds = ongoingEvents.map(event => event._id);

        // Count distinct volunteers with approved registrations for ongoing events
        let activeVolunteers = 0;
        if (ongoingEventIds.length > 0) {
            const distinctVolunteers = await RegistrationModel.distinct('volunteerId', {
                eventId: { $in: ongoingEventIds },
                status: RegistrationStatus.APPROVED
            });
            activeVolunteers = distinctVolunteers.length;
        }

        // Calculate Completed Events
        const completedEvents = await EventModel.countDocuments({
            status: EventStatus.FINISHED
        });

        // Calculate Pending Reports
        const pendingReports = await ReportModel.countDocuments({
            status: 'pending'
        });

        // Calculate Total Posts
        const totalPosts = await PostModel.countDocuments();

        // ============ USER GROWTH CHART ============
        // Get monthly user registrations for the last 12 months
        const userGrowth = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const count = await User.countDocuments({
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            });

            userGrowth.push({
                month: monthNames[month],
                users: count
            });
        }

        // ============ EVENTS PER MONTH CHART ============
        const eventsPerMonth = [];

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const count = await EventModel.countDocuments({
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            });

            eventsPerMonth.push({
                month: monthNames[month],
                events: count
            });
        }

        // ============ EVENTS BY STATUS CHART ============
        const activeEventsCount = await EventModel.countDocuments({ status: EventStatus.APPROVED });
        const completedEventsCount = await EventModel.countDocuments({ status: EventStatus.FINISHED });
        const pendingEventsCount = await EventModel.countDocuments({ status: EventStatus.PENDING });

        const eventsByStatus = [
            { name: 'Active', value: activeEventsCount },
            { name: 'Completed', value: completedEventsCount },
            { name: 'Pending', value: pendingEventsCount }
        ];

        // ============ VOLUNTEER PARTICIPATION CHART ============
        // Monthly count of approved registrations for the last 12 months
        const volunteerParticipation = [];

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const count = await RegistrationModel.countDocuments({
                status: RegistrationStatus.APPROVED,
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            });

            volunteerParticipation.push({
                month: monthNames[month],
                volunteers: count
            });
        }

        // ============ TOP EVENT CATEGORIES CHART ============
        const categoryAggregation = await EventModel.aggregate([
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const topEventCategories = categoryAggregation.map((item: any) => ({
            category: item._id,
            count: item.count
        }));

        // ============ REPORTS DISTRIBUTION CHART ============
        const reasonAggregation = await ReportModel.aggregate([
            { $group: { _id: '$reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const reportsDistribution = reasonAggregation.map((item: any) => ({
            type: item._id,
            count: item.count
        }));

        // ============ RESPONSE ============
        const data = {
            statistics: {
                totalUsers,
                totalEvents,
                activeVolunteers,
                completedEvents,
                pendingReports,
                totalPosts
            },
            userGrowth,
            eventsPerMonth,
            eventsByStatus,
            volunteerParticipation,
            topEventCategories,
            reportsDistribution
        };

        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error: any) {
        console.error('[Admin Analytics] Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics data',
            error: error.message
        });
    }
}
