import type { reports } from '../db/schema.ts';
import { toLean } from './user.util.ts';

/** Row -> the shape the API has always returned (see toUser): `reporter` is an id, or a populated user. */
export const toReport = (row: typeof reports.$inferSelect, reporter?: unknown) => {
  const { reporterId, ...rest } = row;
  return { ...toLean(rest), reporter: reporter ?? reporterId } as { _id: string; reporter: unknown } & Record<string, any>;
};
