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
        const oneYearFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

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

        const eventImages = [
            "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1000",
            "https://www.ymca.org/sites/default/files/inline-images/GettyImages-2151854352.jpg",
            "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80&w=1000"
        ];

        const eventTitles = [
            "Beach Cleanup", "Charity Run", "Food Drive", "Tech Workshop", "Animal Shelter Help",
            "Tree Planting", "Senior Home Visit", "Art Class for Kids", "Coding Bootcamp", "Recycling Drive",
            "Disaster Relief Training", "Fundraising Gala", "Community Garden", "Book Drive", "Mentorship Session"
        ];

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
                title: `ONGOING EVENT ${k + 1}: ${getRandomElement(eventTitles)}`,
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
                title: `FUTURE EVENT ${k + 1}: ${getRandomElement(eventTitles)}`,
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
            const startAt = getRandomDate(twoYearsAgo, oneYearFuture);
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
                createdAt: getRandomDate(twoYearsAgo, startAt),
                updatedAt: new Date()
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

            // Random number of volunteers to register
            const attendeesCount = getRandomInt(0, Math.min(event.maxMembers + 5, volunteerIds.length));
            const attendees = getRandomElements(volunteerIds, attendeesCount);

            let approvedCount = 0;
            for (const volunteerId of attendees) {
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
                    content: `This is a comment about the event. Random ID: ${getRandomInt(1000, 9999)}`,
                    pinned: Math.random() > 0.95,
                    createdAt: getRandomDate(event.createdAt, new Date())
                });

                // Randomly report some posts
                if (Math.random() > 0.85) {
                    const reporterId = getRandomElement(volunteerIds);
                    reports.push({
                        reporter: reporterId,
                        targetId: postId,
                        targetType: ReportTargetType.Post,
                        reason: getRandomElement(["Spam", "Harassment", "Hate Speech", "False Information"]),
                        description: "Automated seed report description.",
                        status: getRandomElement(["pending", "resolved", "rejected"]),
                        createdAt: new Date()
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

            friendRequests.push({
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
                    createdAt: getRandomDate(post.createdAt, new Date()),
                    updatedAt: new Date()
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

        const getUserUsername = (id: mongoose.Types.ObjectId) => {
            const u = users.find(u => u._id.equals(id));
            return u ? u.username : "unknown";
        };

        // Friend Request Notifications
        for (const req of Array.from(uniqueRequests.values())) {
            const senderName = getUserName(req.sender);
            const senderUsername = getUserUsername(req.sender);
            const receiverName = getUserName(req.receiver);

            // "Sender sent request to Receiver" -> Notify Receiver
            if (req.status === 'pending') {
                notifications.push({
                    user: req.receiver,
                    actor: req.sender,
                    type: NotificationType.FRIEND_REQUEST_RECEIVED,
                    title: `New Friend Request from ${senderName}`,
                    body: `${senderName} sent you a friend request.`,
                    data: {
                        senderName,
                        username: senderUsername,
                        requestId: req._id
                    },
                    isRead: Math.random() > 0.7,
                    createdAt: req.createdAt,
                    updatedAt: req.createdAt
                });
            } else if (req.status === 'accepted') {
                notifications.push({
                    user: req.sender,
                    actor: req.receiver, // Receiver accepted
                    type: NotificationType.FRIEND_REQUEST_ACCEPTED,
                    title: "Friend Request Accepted",
                    body: `${receiverName} accepted your friend request.`,
                    data: {
                        username: getUserUsername(req.receiver),
                        actorName: receiverName
                    },
                    isRead: Math.random() > 0.5,
                    createdAt: new Date(req.createdAt.getTime() + 1000 * 60 * 60),
                    updatedAt: new Date(req.createdAt.getTime() + 1000 * 60 * 60)
                });
            }
        }

        // Event Join Notifications (Notify Managers)
        for (const reg of registrations) {
            if (reg.status === RegistrationStatus.APPROVED && Math.random() > 0.7) {
                const event = events.find(e => e._id.equals(reg.eventId));
                const volunteerName = getUserName(reg.volunteerId);

                if (event) {
                    notifications.push({
                        user: event.managerId,
                        actor: reg.volunteerId,
                        type: NotificationType.EVENT_JOINED,
                        title: "New Event Participant",
                        body: `${volunteerName} joined your event "${event.title}".`,
                        data: {
                            eventId: event._id,
                            eventName: event.title,
                            actorName: volunteerName
                        },
                        isRead: Math.random() > 0.6,
                        createdAt: reg.createdAt,
                        updatedAt: reg.createdAt
                    });
                }
            }
        }

        // Comment Notifications (Notify Post Authors)
        for (const comment of comments) {
            if (Math.random() > 0.5) {
                const post = posts.find(p => p._id.equals(comment.postId));
                if (post && !post.authorId.equals(comment.authorId)) { // Don't notify self
                    const commenterName = getUserName(comment.authorId);
                    notifications.push({
                        user: post.authorId,
                        actor: comment.authorId,
                        type: NotificationType.POST_COMMENTED,
                        title: "New Comment on your Post",
                        body: `${commenterName} commented on your post.`,
                        data: {
                            postId: post._id,
                            eventId: post.eventId,
                            actorName: commenterName
                        },
                        isRead: Math.random() > 0.4,
                        createdAt: comment.createdAt,
                        updatedAt: comment.createdAt
                    });
                }
            }
        }

        // Event Reminders (simulated)
        for (let i = 0; i < 50; i++) {
            const user = getRandomElement(volunteerIds);
            const event = getRandomElement(events);
            notifications.push({
                user: user,
                type: NotificationType.EVENT_REMINDER,
                title: `Reminder: ${event.title}`,
                body: `Don't forget about upcoming event: ${event.title}`,
                data: {
                    eventId: event._id,
                    eventName: event.title
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
            extraReports.push({
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
            extraReports.push({
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
