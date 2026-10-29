import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import type { UpdateProfileData, IUser } from '../types/user.ts';
import { UserRole } from '../types/user.ts';
import AppError from '../utils/appError.ts';
import { db } from '../db/client.ts';
import { events, posts, registrations, users } from '../db/schema.ts';
import { EventStatus } from '../types/event.ts';
import { RegistrationStatus } from '../types/registration.ts';
import { comparePassword, hashPassword } from '../utils/password.util.ts';
import { isUniqueViolation, isUuid, normalizeEmail, toLean, toUser } from '../utils/user.util.ts';
import { containsPattern } from '../utils/sql.util.ts';
import { isDemoAccount } from '../utils/demo.util.ts';
import { countFriends, listFriends } from './friendship.service.ts';
import { imagesDeletedWithEvents } from '../utils/event.util.ts';
import { deleteImages, saveImage } from './image.service.ts';

const getRow = async (id: string) => {
  if (!isUuid(id)) return undefined;
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  const row = await getRow(id);
  return row ? toUser(row) : null;
};

export async function updateProfileWithPasswordCheck(
  userId: string,
  currentPassword: string | undefined,
  updateData: UpdateProfileData,
  // A new Profile picture as raw bytes; stored only after every check passed.
  picture?: Buffer
): Promise<IUser> {

  const user = await getRow(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isChangingPassword = !!(updateData as any).password;

  // Demo accounts are shared: a new password or username would spoil them for the next visitor.
  if (isDemoAccount(user.email)) {
    if (isChangingPassword) throw new AppError("Demo accounts can't change their password", 403);
    if (updateData.username && updateData.username !== user.username) {
      throw new AppError("Demo accounts can't change their username", 403);
    }
  }

  if (isChangingPassword && user.authProvider === 'local') {
    if (!currentPassword) {
      throw new AppError('Current password is required to change password', 400);
    }
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw new AppError('Incorrect current password', 401);
    }
  }

  if (Object.keys(updateData).length === 0 && !picture) {
    throw new AppError('No update fields provided', 400); // Bad Request
  }

  if (updateData.username && updateData.username !== user.username) {
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, updateData.username));
    if (existingUser) {
      throw new AppError('Username already taken', 400);
    }
  }

  const input: any = updateData;
  const changes: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

  if (input.username !== undefined) changes.username = input.username;
  if (input.name !== undefined) changes.name = input.name;
  if (input.notificationsEnabled !== undefined) changes.notificationsEnabled = input.notificationsEnabled;
  if (input.notifyOnMention !== undefined) changes.notifyOnMention = input.notifyOnMention;
  if (input.notifyOnEventUpdate !== undefined) changes.notifyOnEventUpdate = input.notifyOnEventUpdate;

  if (input.birthdate) {
    const d = new Date(input.birthdate);
    if (isNaN(d.getTime())) {
      throw new AppError('Invalid birthdate format', 400);
    }
    changes.birthdate = d;
  }

  if (input.profilePicture !== undefined) {
    changes.profilePicture = input.profilePicture === '' ? null : input.profilePicture;
  }

  if (input.password) {
    changes.passwordHash = await hashPassword(input.password);
  }

  if (picture) changes.profilePicture = await saveImage(picture);

  let updated;
  try {
    // ponytail: two concurrent replacements both read the same old picture, so the loser's new file is orphaned;
    // read the old picture in the same statement as the update, or sweep for unreferenced files.
    [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning();

    if (!updated) {
      throw new AppError('User not found after update', 500);
    }
  } catch (error) {
    if (picture) await deleteImages(changes.profilePicture);
    if (error instanceof AppError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new AppError('Username already taken', 400);
    }
    console.error('Database error during secure profile update:', error);
    throw new AppError('Failed to update profile due to invalid data or server error', 500);
  }

  // After the try: a failure here must never delete the new file the row now references.
  if (updated.profilePicture !== user.profilePicture) await deleteImages(user.profilePicture);

  const { authProvider, ...profile } = toUser(updated);
  return profile as IUser;
}

const DEFAULT_BIRTHDATE = new Date('2000-01-01');

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let isUnique = false;
  let attempts = 0;


  while (!isUnique && attempts < 5) {
    const [userExists] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));

    if (!userExists) {
      isUnique = true;
    } else {
      const randomNumber = Math.floor(100 + Math.random() * 900);
      username = `${baseUsername}${randomNumber}`;
      attempts++;
    }
  }

  if (!isUnique) {
    throw new AppError('Failed to generate a unique username', 500);
  }

  return username;
}

export const searchUsersService = async (query: string, limit: number = 10) => {
  const pattern = containsPattern(query);
  const rows = await db.select({
    id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture, role: users.role,
  }).from(users)
    .where(and(
      or(ilike(users.username, pattern), ilike(users.name, pattern)),
      eq(users.isActive, true),
      eq(users.isBanned, false),
    ))
    .limit(limit);
  return rows.map(toLean);
};

export const banUserService = async (userId: string, reason?: string, until?: Date) => {
  const changes: Partial<typeof users.$inferInsert> = { isBanned: true, updatedAt: new Date() };
  if (reason) changes.bannedReason = reason;
  if (until) changes.bannedUntil = until;

  const [row] = isUuid(userId) ? await db.update(users).set(changes).where(eq(users.id, userId)).returning() : [];
  if (!row) throw new AppError('User not found', 404);
  return toUser(row);
};

const BANNED_LIST_COLUMNS = {
  id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture,
  role: users.role, isBanned: users.isBanned, bannedReason: users.bannedReason,
  bannedUntil: users.bannedUntil, email: users.email,
};

export const adminSearchUsers = async (filters: {
  q?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  const { q, role, status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = filters;

  const conditions = [];

  if (q) {
    const pattern = containsPattern(q);
    conditions.push(or(ilike(users.username, pattern), ilike(users.name, pattern), ilike(users.email, pattern)));
  }

  // Query-string values arrive as arbitrary shapes (?role[]=x), so only accept a
  // known role name.
  if (role && role !== 'all' && (users.role.enumValues as readonly string[]).includes(role)) {
    conditions.push(eq(users.role, role as UserRole));
  }

  if (status && status !== 'all') {
    if (status === 'banned') conditions.push(eq(users.isBanned, true));
    else if (status === 'active') conditions.push(eq(users.isBanned, false));
  }

  // Same reasoning for sortBy: it picks a column, it is never used as SQL.
  const SORTABLE = { createdAt: users.createdAt, username: users.username, name: users.name, email: users.email, role: users.role } as const;
  // The role enum sorts by declaration order; the API has always sorted alphabetically.
  const ROLE_ALPHABETICAL = sql`case ${users.role} when 'admin' then 0 when 'manager' then 1 else 2 end`;
  const sortColumn = sortBy === 'role' ? ROLE_ALPHABETICAL : SORTABLE[sortBy as keyof typeof SORTABLE] ?? users.createdAt;
  const direction = sortOrder === 'asc' ? asc : desc;

  const where = and(...conditions);

  const [rows, total] = await Promise.all([
    db.select({ ...BANNED_LIST_COLUMNS, createdAt: users.createdAt, isActive: users.isActive }).from(users)
      .where(where)
      .orderBy(direction(sortColumn), asc(users.id)) // id breaks ties so pages don't shuffle
      .offset((page - 1) * limit)
      .limit(limit),
    db.$count(users, where),
  ]);

  return { users: rows.map(toLean), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const createUserService = async (data: any) => {
  const email = normalizeEmail(data.email);

  const [exists] = await db.select({ id: users.id }).from(users)
    .where(or(eq(users.username, data.username), eq(users.email, email)));
  if (exists) throw new AppError('Username or email already exists', 400);

  try {
    const [row] = await db.insert(users).values({
      username: data.username,
      email,
      passwordHash: await hashPassword(data.password),
      name: data.name,
      role: data.role,
      birthdate: new Date(data.birthdate ?? DEFAULT_BIRTHDATE),
      isActive: true,
      isVerified: true,
    }).returning();
    return toUser(row!);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError('Username or email already exists', 400);
    throw err;
  }
}

export const deleteUserService = async (userId: string) => {
  if (!isUuid(userId)) throw new AppError('User not found', 404);
  // Their events and posts go with them (foreign keys), and so do those files.
  const [eventFiles, postFiles] = await Promise.all([
    imagesDeletedWithEvents(eq(events.managerId, userId)),
    db.select({ image: posts.image }).from(posts).where(eq(posts.authorId, userId)),
  ]);
  const [row] = await db.delete(users).where(eq(users.id, userId)).returning({ profilePicture: users.profilePicture });
  if (!row) throw new AppError('User not found', 404);
  await deleteImages(row.profilePicture, ...eventFiles, ...postFiles.map((p) => p.image));
  return { success: true };
}

export const updateUserAdminService = async (userId: string, data: any) => {
  if (!(await getRow(userId))) throw new AppError('User not found', 404);

  const email = data.email ? normalizeEmail(data.email) : undefined;

  const clashes = [];
  if (data.username) clashes.push(eq(users.username, data.username));
  if (email) clashes.push(eq(users.email, email));

  if (clashes.length > 0) {
    const [exists] = await db.select({ id: users.id }).from(users).where(and(ne(users.id, userId), or(...clashes)));
    if (exists) throw new AppError('Username or email already in use', 400);
  }

  const changes: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (data.username !== undefined) changes.username = data.username;
  if (email !== undefined) changes.email = email;
  if (data.name !== undefined) changes.name = data.name;
  if (data.role !== undefined) changes.role = data.role;
  if (data.isActive !== undefined) changes.isActive = data.isActive;
  if (data.birthdate !== undefined) changes.birthdate = new Date(data.birthdate);
  if (data.password) changes.passwordHash = await hashPassword(data.password);

  try {
    const [row] = await db.update(users).set(changes).where(eq(users.id, userId)).returning();
    if (!row) throw new AppError('User not found', 404);
    return toUser(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError('Username or email already in use', 400);
    throw err;
  }
}

export const getBannedUsers = async () => {
  const rows = await db.select(BANNED_LIST_COLUMNS).from(users)
    .where(eq(users.isBanned, true))
    .orderBy(sql`${users.bannedUntil} asc nulls first`); // Show closest unban date first
  return rows.map(toLean);
};

export const unbanUserService = async (userId: string) => {
  const [row] = isUuid(userId)
    ? await db.update(users)
      .set({ isBanned: false, bannedReason: null, bannedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    : [];
  if (!row) throw new AppError('User not found', 404);
  return toUser(row);
};


export const getPublicProfileByUsername = async (username: string) => {
  const [user] = await db.select({
    id: users.id, username: users.username, name: users.name, birthdate: users.birthdate,
    profilePicture: users.profilePicture, role: users.role, createdAt: users.createdAt,
  }).from(users).where(and(eq(users.username, username), eq(users.isActive, true)));

  if (!user) {
    throw new AppError('User not found or deactivated', 404);
  }
  return toLean(user);
};

// Profile pages are public, but admin profiles are not.
const findViewableProfileUser = async (username: string) => {
  const [user] = await db.select({ id: users.id, role: users.role }).from(users)
    .where(and(eq(users.username, username), eq(users.isActive, true)));

  if (!user) {
    throw new AppError('User not found or deactivated', 404);
  }
  if (user.role === UserRole.Admin) {
    throw new AppError('Access to admin profiles is forbidden', 403);
  }
  return user;
};

export const getUserStatsService = async (username: string) => {
  const user = await findViewableProfileUser(username);

  let stats: any = {};

  if ((user.role as UserRole) === UserRole.Volunteer) {
    // Events the volunteer has been approved into, by the event's own status.
    const countJoined = (status: EventStatus) => db.$count(
      registrations,
      and(
        eq(registrations.volunteerId, user.id),
        eq(registrations.status, RegistrationStatus.APPROVED),
        inArray(registrations.eventId, db.select({ id: events.id }).from(events).where(eq(events.status, status))),
      ),
    );
    stats = {
      activeEvents: await countJoined(EventStatus.APPROVED),
      completedEvents: await countJoined(EventStatus.FINISHED),
    };
  } else if ((user.role as UserRole) === UserRole.Manager) {
    const countManaged = (status: EventStatus) =>
      db.$count(events, and(eq(events.managerId, user.id), eq(events.status, status)));
    stats = {
      activeEvents: await countManaged(EventStatus.APPROVED),
      eventsOrganized: await countManaged(EventStatus.FINISHED),
    };
  }

  stats.friends = await countFriends(user.id);

  return { role: user.role, stats };
};

const PROFILE_EVENT_COLUMNS = {
  id: events.id, title: events.title, image: events.image, startAt: events.startAt, endAt: events.endAt,
  location: events.location, currentMembers: events.currentMembers, tags: events.tags,
  description: events.description, status: events.status,
};

export const getUserEventsService = async (username: string) => {
  const user = await findViewableProfileUser(username);

  let rows: { id: string }[] = [];

  if ((user.role as UserRole) === UserRole.Volunteer) {
    rows = await db.select(PROFILE_EVENT_COLUMNS).from(events)
      .where(inArray(events.id, db.select({ id: registrations.eventId }).from(registrations).where(and(
        eq(registrations.volunteerId, user.id),
        eq(registrations.status, RegistrationStatus.APPROVED),
      ))))
      .orderBy(asc(events.createdAt), asc(events.id));
  } else if ((user.role as UserRole) === UserRole.Manager) {
    rows = await db.select(PROFILE_EVENT_COLUMNS).from(events)
      .where(eq(events.managerId, user.id))
      .orderBy(asc(events.createdAt), asc(events.id));
  }

  return rows.map(toLean);
};

export const getUserFriendsListService = async (username: string) => {
  const user = await findViewableProfileUser(username);
  return listFriends(user.id, true);
};

// Seeds a single admin from env, and only while no admin exists yet. With the
// two vars unset (the default) it does nothing.
export const seedAdminUser = async (): Promise<void> => {
  try {
    const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

    if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
      console.log('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set. Admin seeding skipped.');
      return;
    }

    const [adminExists] = await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin)).limit(1);

    if (adminExists) {
      console.log('Admin user already exists. Seeding skipped.');
      return;
    }

    const email = normalizeEmail(SEED_ADMIN_EMAIL);

    await db.insert(users).values({
      username: await generateUniqueUsername(email.split('@')[0] || 'admin'),
      email,
      passwordHash: await hashPassword(SEED_ADMIN_PASSWORD),
      name: 'Administrator',
      birthdate: new Date('1990-01-01'),
      role: UserRole.Admin,
      isVerified: true,
      isActive: true,
      authProvider: 'local',
    });

    console.log(`Admin user seeded: ${email}`);
  } catch (error) {
    console.error('Error seeding Admin user:', error);
    throw error; // connectDB exits on this, so a failed seed fails the deploy instead of booting without an admin
  }
};
