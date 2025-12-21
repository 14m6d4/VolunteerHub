import mongoose from "mongoose";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";

// Import Models
import User from "./models/User.model.ts";
import { EventModel, EventStatus, EventTags } from "./models/Event.model.ts";
import { RegistrationModel, RegistrationStatus } from "./models/Registration.model.ts";
import { PostModel } from "./models/Post.model.ts";
import { ReportModel, ReportTargetType } from "./models/Report.model.ts";
import { DiscussionModel } from "./models/Discussion.model.ts";
import FriendRequestModel from "./models/FriendRequest.model.ts";
import NotificationModel, { NotificationType } from "./models/Notification.model.ts";
import { CommentModel } from "./models/Comment.model.ts";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Please define the MONGO_URI environment variable inside .env");
    process.exit(1);
}

// Helpers
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = (arr: any[], count: number) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
const getRandomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seed = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB!");

        // Clear Database
        console.log("Clearing existing data...");
        await Promise.all([
            User.deleteMany({}),
            EventModel.deleteMany({}),
            RegistrationModel.deleteMany({}),
            PostModel.deleteMany({}),
            ReportModel.deleteMany({}),
            DiscussionModel.deleteMany({}),
            FriendRequestModel.deleteMany({}),
            NotificationModel.deleteMany({}),
            CommentModel.deleteMany({})
        ]);
        console.log("Data cleared!");

        // 1. Create Users
        console.log("Creating Users...");
        const hashedPassword = await bcryptjs.hash("password123", 12);
        const now = new Date();
        const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000); // 2 years ago for user creation start
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const twoWeeksFuture = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const adminId = new mongoose.Types.ObjectId();
        const users: any[] = [
            {
                _id: adminId,
                name: "System Admin",
                email: "admin@example.com",
                username: "admin",
                role: "admin",
                passwordHash: hashedPassword,
                birthdate: new Date("1985-01-01"),
                isVerified: true,
                isActive: true,
                authProvider: "local",
                notificationsEnabled: true,
                profilePicture: "https://ui-avatars.com/api/?name=Admin&background=random",
                createdAt: twoYearsAgo, // Admin created long ago
                updatedAt: twoYearsAgo
            }
        ];

        // Create 5 Managers
        const managerIds: mongoose.Types.ObjectId[] = [];
        for (let i = 1; i <= 5; i++) {
            const id = new mongoose.Types.ObjectId();
            managerIds.push(id);
            const createdAt = getRandomDate(twoYearsAgo, now);
            users.push({
                _id: id,
                name: `Manager ${i}`,
                email: `manager${i}@example.com`,
                username: `manager${i}`,
                role: "manager",
                passwordHash: hashedPassword,
                birthdate: getRandomDate(new Date("1970-01-01"), new Date("1995-12-31")),
                isVerified: true,
                isActive: true,
                authProvider: "local",
                notificationsEnabled: true,
                profilePicture: `https://ui-avatars.com/api/?name=Manager+${i}&background=random`,
                createdAt: createdAt,
                updatedAt: createdAt // Simplified
            });
        }

        // Create 40 Volunteers
        const volunteerIds: mongoose.Types.ObjectId[] = [];
        for (let i = 1; i <= 40; i++) {
            const id = new mongoose.Types.ObjectId();
            volunteerIds.push(id);
            const createdAt = getRandomDate(twoYearsAgo, now);

            users.push({
                _id: id,
                name: `Volunteer ${i}`,
                email: `volunteer${i}@example.com`,
                username: `volunteer${i}`,
                role: "volunteer",
                passwordHash: hashedPassword,
                birthdate: getRandomDate(new Date("1990-01-01"), new Date("2005-12-31")),
                isVerified: true,
                isActive: true,
                authProvider: "local",
                notificationsEnabled: true,
                profilePicture: `https://ui-avatars.com/api/?name=Volunteer+${i}&background=random`,
                bio: `I am Volunteer ${i}, passionate about making a difference in the community.`,
                skills: getRandomElements(["First Aid", "Teaching", "Coding", "Cooking", "Driving", "Event Planning"], getRandomInt(1, 3)),
                interests: getRandomElements(["Environment", "Education", "Health", "Animal Welfare", "Arts"], getRandomInt(1, 4)),
                createdAt: createdAt,
                updatedAt: createdAt
            });
        }

        await User.insertMany(users);
        console.log(`${users.length} Users created!`);

        // 2. Create Events (Spread over last 2 years + 1 year future)
        console.log("Creating Events...");
        // Re-calculate these date ranges or reuse logic? Reusing twoYearsAgo/oneYearFuture from earlier def is fine if consistent.

        // const eventImages = [
        //     "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=1000",
        //     "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000",
        //     "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1000",
        //     "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1000",
        //     "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1000",
        //     "https://www.ymca.org/sites/default/files/inline-images/GettyImages-2151854352.jpg",
        //     "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80&w=1000"
        // ];

        const eventImages = Array.from({ length: 100 }, (_, i) =>
            `https://picsum.photos/600/300?random=${i + 1}`
        );

        const eventTitles = [
            "Beach Cleanup", "Charity Run", "Food Drive", "Tech Workshop", "Animal Shelter Help",
            "Tree Planting", "Senior Home Visit", "Art Class for Kids", "Coding Bootcamp", "Recycling Drive",
            "Disaster Relief Training", "Fundraising Gala", "Community Garden", "Book Drive", "Mentorship Session"
        ];

        const commentPool = [
            "This event was genuinely well organized, from the registration process to the overall flow of activities. I especially appreciated how clear the instructions were and how helpful the staff was throughout the day.",

            "I joined this event without many expectations, but it turned out to be a surprisingly engaging experience. The discussions were meaningful and the atmosphere felt welcoming and inclusive.",

            "What stood out to me the most was the level of interaction between participants. It didn’t feel passive at all; everyone was encouraged to contribute and share their own perspectives.",

            "Overall, this event delivered exactly what it promised. The schedule was well planned, there were no major delays, and the content stayed relevant from start to finish.",

            "I think the organizers did a solid job creating an environment where people could both learn and connect. It felt productive without being overwhelming.",

            "Some parts of the event could still be improved, but the core idea was strong and the execution was mostly smooth. I would consider joining similar events in the future.",

            "This was a refreshing change compared to other events I have attended recently. The focus on quality over quantity really made a difference.",

            "I liked how the event balanced structured sessions with open discussions. It gave participants enough freedom while still maintaining a clear direction.",

            "From a participant’s perspective, the communication before and during the event was clear and timely. That alone made the experience much better.",

            "The event successfully brought together people with similar interests, which made networking feel natural instead of forced.",

            "I appreciated how thoughtfully the event was structured, especially the way each session flowed into the next without feeling rushed or disconnected.",

            "The speakers were clearly knowledgeable and did a good job explaining complex ideas in a way that was easy to follow, even for participants who were new to the topic.",

            "What I enjoyed most was the sense of community during the event. It didn’t feel like people were just there to consume content; there was real engagement and exchange.",

            "This event struck a nice balance between being informative and enjoyable. It managed to stay focused while still leaving room for casual interaction.",

            "I found the pacing of the event to be comfortable, with enough breaks to reflect on the content and connect with other attendees without losing momentum.",

            "The overall atmosphere felt professional yet relaxed, which made it easier to ask questions and participate without feeling pressured.",

            "Compared to similar events I have attended, this one stood out for its attention to detail and the consistency of quality across all sessions.",

            "It was clear that a lot of planning went into this event, and that effort showed in the smooth coordination and clear communication throughout the day.",

            "I left the event feeling that my time was well spent, which is not something I can say about every event I attend.",

            "While there is always room for improvement, this event delivered strong value and set a good standard for future editions."
        ];

        function getRandomComment() {
            return commentPool[Math.floor(Math.random() * commentPool.length)];
        }


        const events: any[] = [];
        const eventIds: mongoose.Types.ObjectId[] = [];

        // --- FORCE CREATE ONGOING EVENTS (Active Right Now) ---
        // Create 5 events that started yesterday and end tomorrow
        console.log("Creating 5 ONGOING events to ensure Active Volunteer Stats...");
        for (let k = 0; k < 5; k++) {
            const id = new mongoose.Types.ObjectId();
            eventIds.push(id);
            const managerId = getRandomElement(managerIds);

            events.push({
                _id: id,
                title: `${getRandomElement(eventTitles)} ${k + 1}`,
                description: "This event is currently happening! Join us.",
                location: `Active Location ${k + 1}`,
                startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Started yesterday
                endAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),   // Ends tomorrow
                managerId,
                status: EventStatus.APPROVED, // Must be approved
                currentMembers: 0,
                maxMembers: 50,
                tags: getRandomElements(EventTags, 2),
                image: getRandomElement(eventImages),
                isPublic: true,
                createdAt: twoYearsAgo,
                updatedAt: new Date()
            });
            await DiscussionModel.create({ eventId: id });
        }

        // --- FORCE CREATE FUTURE EVENTS (Visible in Discover) ---
        console.log("Creating 5 FUTURE events to ensure Discovery List is populated...");
        for (let k = 0; k < 5; k++) {
            const id = new mongoose.Types.ObjectId();
            eventIds.push(id);
            const managerId = getRandomElement(managerIds);

            events.push({
                _id: id,
                title: `${getRandomElement(eventTitles)} ${k + 1}`,
                description: "This event is coming soon! Sign up now.",
                location: `Future Location ${k + 1}`,
                startAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
                endAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),   // Ends in 8 days
                managerId,
                status: EventStatus.APPROVED, // Must be approved
                currentMembers: 0,
                maxMembers: 50,
                tags: getRandomElements(EventTags, 2),
                image: getRandomElement(eventImages),
                isPublic: true,
                createdAt: twoYearsAgo,
                updatedAt: new Date()
            });
            await DiscussionModel.create({ eventId: id });
        }

        for (let i = 0; i < 90; i++) { // Create 90 random events (Total 100)
            const id = new mongoose.Types.ObjectId();
            eventIds.push(id);
            const managerId = getRandomElement(managerIds);
            const startAt = getRandomDate(twoYearsAgo, twoWeeksFuture);
            const duration = getRandomInt(2, 48) * 60 * 60 * 1000; // 2 to 48 hours
            const endAt = new Date(startAt.getTime() + duration);

            // Determine status based on time
            let status = EventStatus.PENDING;
            if (endAt < now) {
                // Past event
                const rand = Math.random();
                if (rand > 0.1) status = EventStatus.FINISHED;
                else if (rand > 0.05) status = EventStatus.CANCELLED;
                else status = EventStatus.APPROVED; // Rare case: approved but finished without being marked finished?
            } else {
                // Future event
                const rand = Math.random();
                if (rand > 0.3) status = EventStatus.APPROVED;
                else if (rand > 0.1) status = EventStatus.PENDING;
                else if (rand > 0.05) status = EventStatus.DRAFT;
                else status = EventStatus.CANCELLED;
            }

            events.push({
                _id: id,
                title: `${getRandomElement(eventTitles)} ${getRandomInt(2023, 2026)}`,
                description: "A wonderful opportunity to give back to the community and meet like-minded individuals.",
                location: `Location ${getRandomInt(1, 20)}`,
                startAt,
                endAt,
                managerId,
                status,
                currentMembers: 0, // Will update calculate later or just mock
                maxMembers: getRandomInt(10, 50),
                tags: getRandomElements(EventTags, getRandomInt(1, 3)),
                image: getRandomElement(eventImages),
                isPublic: true,
                createdAt: getRandomDate(twoYearsAgo, new Date(Math.min(startAt.getTime(), Date.now()))),
                updatedAt: new Date(Math.min(startAt.getTime(), Date.now()))
            });

            // Discussion for each event
            await DiscussionModel.create({ eventId: id });
        }

        await EventModel.insertMany(events);
        console.log(`${events.length} Events created (including 5 ongoing)!`);

        // 3. Create Registrations
        console.log("Creating Registrations...");
        const registrations: any[] = [];

        for (const event of events) {
            if (event.status === EventStatus.DRAFT) continue;

            // Register the Manager (User Requirement 1)
            registrations.push({
                _id: new mongoose.Types.ObjectId(),
                eventId: event._id,
                volunteerId: event.managerId, // Manager is a member
                status: RegistrationStatus.APPROVED,
                note: "Event Manager (Auto-joined)",
                createdAt: event.createdAt,
                completedAt: event.status === EventStatus.FINISHED ? event.endAt : null
            });

            // Random number of volunteers to register
            const attendeesCount = getRandomInt(0, Math.min(event.maxMembers + 5, volunteerIds.length));
            const attendees = getRandomElements(volunteerIds, attendeesCount);

            let approvedCount = 0;
            for (const volunteerId of attendees) {
                const regId = new mongoose.Types.ObjectId();
                let status = RegistrationStatus.PENDING;

                if (event.status === EventStatus.FINISHED) {
                    const r = Math.random();
                    if (r > 0.2) status = RegistrationStatus.COMPLETED;
                    else status = RegistrationStatus.APPROVED; // Joined but not marked completed
                } else if (event.status === EventStatus.APPROVED) {
                    const r = Math.random();
                    if (r > 0.4) status = RegistrationStatus.APPROVED;
                    else if (r > 0.2) status = RegistrationStatus.PENDING;
                    else if (r > 0.1) status = RegistrationStatus.REJECTED;
                    else status = RegistrationStatus.CANCELLED;
                } else if (event.status === EventStatus.CANCELLED) {
                    status = RegistrationStatus.CANCELLED;
                }

                if (status === RegistrationStatus.APPROVED || status === RegistrationStatus.COMPLETED) {
                    approvedCount++;
                }

                registrations.push({
                    _id: regId,
                    eventId: event._id,
                    volunteerId: volunteerId,
                    status,
                    note: Math.random() > 0.7 ? "Excited to join!" : "",
                    createdAt: getRandomDate(event.createdAt, event.startAt),
                    completedAt: status === RegistrationStatus.COMPLETED ? event.endAt : null
                });
            }

            // Update event member count
            if (approvedCount > 0) {
                await EventModel.updateOne({ _id: event._id }, { currentMembers: approvedCount });
            }
        }

        await RegistrationModel.insertMany(registrations);
        console.log(`${registrations.length} Registrations created!`);

        // 4. Create Posts & Reports
        console.log("Creating Posts & Reports...");
        const posts: any[] = [];
        const reports: any[] = [];

        for (const event of events) {
            // Only add posts to approved/finished events
            if (event.status !== EventStatus.APPROVED && event.status !== EventStatus.FINISHED) continue;

            const postCount = getRandomInt(0, 5);
            for (let i = 0; i < postCount; i++) {
                const authorId = getRandomElement(volunteerIds); // Simplification: any volunteer could post, ideally only members
                const postId = new mongoose.Types.ObjectId();

                posts.push({
                    _id: postId,
                    eventId: event._id,
                    authorId: authorId,
                    content: getRandomComment(),
                    image: Math.random() > 0.5 ? getRandomElement(eventImages) : undefined,
                    pinned: Math.random() > 0.95,

                    createdAt: getRandomDate(
                        new Date(Math.max(event.createdAt.getTime(), oneMonthAgo.getTime())),
                        new Date(Date.now() - 3600000)
                    ), // Max(EventCreate, 1MonthAgo) -> 1 hour ago
                    updatedAt: new Date(Date.now() - 3600000)
                });

                // Randomly report some posts
                if (Math.random() > 0.85) {
                    const reportId = new mongoose.Types.ObjectId();
                    const reporterId = getRandomElement(volunteerIds);
                    reports.push({
                        _id: reportId,
                        reporter: reporterId,
                        targetId: postId,
                        targetType: ReportTargetType.Post,
                        reason: getRandomElement(["Spam", "Harassment", "Hate Speech", "False Information"]),
                        description: "Automated seed report description.",
                        status: getRandomElement(["pending", "resolved", "rejected"]),
                        createdAt: getRandomDate(new Date(Date.now() - 3600000), new Date(Date.now() - 60000)) // Report slightly after post
                    });
                }
            }
        }

        await PostModel.insertMany(posts);
        await ReportModel.insertMany(reports);
        console.log(`${posts.length} Posts & ${reports.length} Reports created!`);

        // 5. Create Friend Requests
        console.log("Creating Social Connections...");
        const friendRequests: any[] = [];

        // Random connections
        for (let i = 0; i < 200; i++) {
            const sender = getRandomElement(volunteerIds);
            const receiver = getRandomElement(volunteerIds);
            if (sender.equals(receiver)) continue;

            const status = getRandomElement(['pending', 'accepted', 'declined']);
            const reqCreatedAt = getRandomDate(twoYearsAgo, new Date()); // Random time
            const reqId = new mongoose.Types.ObjectId();

            friendRequests.push({
                _id: reqId,
                sender,
                receiver,
                status,
                createdAt: reqCreatedAt
            });

            if (status === 'accepted') {
                await User.findByIdAndUpdate(sender, { $addToSet: { friends: receiver } });
                await User.findByIdAndUpdate(receiver, { $addToSet: { friends: sender } });
            }
        }

        // De-duplicate requests for DB unique index
        const uniqueRequests = new Map();
        for (const req of friendRequests) {
            const key = `${req.sender}-${req.receiver}`;
            if (!uniqueRequests.has(key)) {
                uniqueRequests.set(key, req);
            }
        }

        await FriendRequestModel.insertMany(Array.from(uniqueRequests.values()));
        console.log(`${uniqueRequests.size} Friend Requests created!`);

        // 6. Create Comments
        console.log("Creating Comments...");
        const comments: any[] = [];
        const allPosts = await PostModel.find({});

        for (const post of allPosts) {
            const commentCount = getRandomInt(0, 5);
            for (let i = 0; i < commentCount; i++) {
                const authorId = getRandomElement(volunteerIds);
                comments.push({
                    postId: post._id,
                    authorId: authorId,
                    content: getRandomElement([
                        "Great initiative!", "Can't wait to join.", "This looks amazing.",
                        "Is there parking available?", "Count me in!", "Thanks for organizing this."
                    ]),
                    likes: [],
                    likes: [],
                    // Comment > Post (at least 1 min later) & strictly past
                    createdAt: getRandomDate(new Date(post.createdAt.getTime() + 60000), new Date(Date.now() - 60000)),
                    updatedAt: new Date(Date.now() - 60000)
                });
            }
        }
        await CommentModel.insertMany(comments);
        console.log(`${comments.length} Comments created!`);

        // 7. Create Notifications
        console.log("Creating Notifications...");
        const notifications: any[] = [];

        // Helper to get user name
        const getUserName = (id: mongoose.Types.ObjectId) => {
            const u = users.find(u => u._id.equals(id));
            return u ? u.name : "Unknown User";
        };

        // Friend Request Notifications
        for (const req of Array.from(uniqueRequests.values())) {
            const senderName = getUserName(req.sender);

            // "Sender sent request to Receiver" -> Notify Receiver
            if (req.status === 'pending') {
                notifications.push({
                    user: req.receiver,
                    actor: req.sender,
                    type: NotificationType.FRIEND_REQUEST_RECEIVED,
                    title: `New Friend Request from ${senderName}`,
                    body: `${senderName} sent you a friend request.`,
                    data: {
                        requestId: req._id
                    },
                    isRead: Math.random() > 0.7,
                    createdAt: req.createdAt,
                    updatedAt: req.createdAt
                });
            } else if (req.status === 'accepted') {
                const receiverName = getUserName(req.receiver);
                notifications.push({
                    user: req.sender,
                    actor: req.receiver, // Receiver accepted
                    type: NotificationType.FRIEND_REQUEST_ACCEPTED,
                    title: "Friend Request Accepted",
                    body: `${receiverName} accepted your friend request.`,
                    data: {
                        requestId: req._id
                    },
                    isRead: Math.random() > 0.5,
                    createdAt: new Date(req.createdAt.getTime() + 1000 * 60 * 60),
                    updatedAt: new Date(req.createdAt.getTime() + 1000 * 60 * 60)
                });
            }
        }

        // Event Join / Registration Notifications
        for (const reg of registrations) {
            const event = events.find(e => e._id.equals(reg.eventId));
            const volunteerName = getUserName(reg.volunteerId);

            if (!event) continue;

            // Notify Manager of New Registration (Pending or Approved)
            if (reg.status === RegistrationStatus.PENDING || reg.status === RegistrationStatus.APPROVED) {
                // If pending -> Request. If Approved -> Joined (auto-approve or manual)
                // We simplify: if pending, notify pending. If approved (and rand), notify joined.
                if (Math.random() > 0.5) {
                    const isPending = reg.status === RegistrationStatus.PENDING;
                    notifications.push({
                        user: event.managerId,
                        actor: reg.volunteerId,
                        type: isPending ? NotificationType.REGISTRATION_PENDING : NotificationType.EVENT_JOINED,
                        title: isPending ? "New Registration Request" : "New Event Participant",
                        body: `${volunteerName} ${isPending ? 'requested to join' : 'joined'} your event "${event.title}".`,
                        data: {
                            eventId: event._id,
                            registrationId: reg._id
                        },
                        isRead: Math.random() > 0.6,
                        createdAt: reg.createdAt,
                        updatedAt: reg.createdAt
                    });
                }
            }
        }

        // Report Resolution Notifications
        for (const report of reports) {
            if (report.status === 'resolved' || report.status === 'rejected') {
                const resolutionType = report.status === 'resolved' ? NotificationType.REPORT_RESOLVED : NotificationType.REPORT_REJECTED;
                notifications.push({
                    user: report.reporter,
                    type: resolutionType,
                    title: report.status === 'resolved' ? "Report Resolved" : "Report Rejected",
                    body: `Your report has been ${report.status}.`,
                    data: {
                        reportId: report._id,
                        targetId: report.targetId,
                        targetType: report.targetType,
                        // Add context based on target type
                        ...(report.targetType === ReportTargetType.Post ? {
                            postId: report.targetId,
                            eventId: posts.find(p => p._id.equals(report.targetId))?.eventId
                        } : {}),
                        ...(report.targetType === ReportTargetType.Event ? {
                            eventId: report.targetId
                        } : {})
                    },
                    isRead: Math.random() > 0.3,
                    createdAt: new Date(report.createdAt.getTime() + 24 * 60 * 60 * 1000), // Resolved 1 day later
                    updatedAt: new Date()
                });
            }
        }

        // Comment Notifications (Notify Post Authors)
        for (const comment of comments) {
            if (Math.random() > 0.5) {
                const post = posts.find(p => p._id.equals(comment.postId));
                if (post && !post.authorId.equals(comment.authorId)) {
                    const commenterName = getUserName(comment.authorId);
                    notifications.push({
                        user: post.authorId,
                        actor: comment.authorId,
                        type: NotificationType.POST_COMMENTED,
                        title: "New Comment on your Post",
                        body: `${commenterName} commented on your post.`,
                        data: {
                            postId: post._id,
                            eventId: post.eventId
                        },
                        isRead: Math.random() > 0.4,
                        createdAt: comment.createdAt,
                        updatedAt: comment.createdAt
                    });
                }
            }
        }

        // Event Reminders
        for (let i = 0; i < 50; i++) {
            const user = getRandomElement(volunteerIds);
            const event = getRandomElement(events);
            notifications.push({
                user: user,
                type: NotificationType.EVENT_REMINDER,
                title: `Reminder: ${event.title}`,
                body: `Don't forget about upcoming event: ${event.title}`,
                data: {
                    eventId: event._id
                },
                isRead: Math.random() > 0.8,
                createdAt: getRandomDate(twoYearsAgo, new Date()),
                updatedAt: new Date()
            });
        }
        await NotificationModel.insertMany(notifications);
        console.log(`${notifications.length} Notifications created!`);

        // 8. Additional Reports (User & Event)
        console.log("Creating User & Event Reports...");
        const extraReports: any[] = [];

        // Report Users (Impersonation, etc.)
        for (let i = 0; i < 10; i++) {
            const repId = new mongoose.Types.ObjectId();
            extraReports.push({
                _id: repId,
                reporter: getRandomElement(volunteerIds),
                targetId: getRandomElement(volunteerIds),
                targetType: ReportTargetType.User,
                reason: getRandomElement(["Impersonation", "Harassment", "Fake Profile"]),
                description: "This user seems suspicious.",
                status: getRandomElement(["pending", "resolved", "rejected"]),
                createdAt: getRandomDate(twoYearsAgo, new Date())
            });
        }

        // Report Events (Spam, Fraud)
        for (let i = 0; i < 5; i++) {
            const repId = new mongoose.Types.ObjectId();
            extraReports.push({
                _id: repId,
                reporter: getRandomElement(volunteerIds),
                targetId: getRandomElement(eventIds),
                targetType: ReportTargetType.Event,
                reason: getRandomElement(["Spam", "Fraud", "Inappropriate Content"]),
                description: "This event violates guidelines.",
                status: "pending",
                createdAt: getRandomDate(twoYearsAgo, new Date())
            });
        }
        await ReportModel.insertMany(extraReports);
        console.log(`${extraReports.length} Extra Reports created!`);

        console.log("-----------------------------------------");
        console.log("EXTENDED SEEDING COMPLETED 🚀");
        console.log("-----------------------------------------");
        console.log(`- Created ${users.length} Users (spread over 2 years)`);
        console.log(`- Created ${events.length} Events (2 years span)`);
        console.log(`- Created ${registrations.length} Registrations`);
        console.log(`- Created ${posts.length} Posts`);
        console.log(`- Created ${comments.length} Comments`);
        console.log(`- Created ${reports.length + extraReports.length} Reports`);
        console.log(`- Created ${notifications.length} Notifications`);
        console.log("-----------------------------------------");
        console.log("Credentials (Password: password123):");
        console.log("Admin: admin@example.com");
        console.log("Managers: manager1@example.com ... manager5@example.com");
        console.log("Volunteers: volunteer1@example.com ... volunteer40@example.com");

        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();
