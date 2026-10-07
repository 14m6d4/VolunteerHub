import bcrypt from 'bcryptjs';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export const comparePassword = async (candidate: string, hash: string | null | undefined) =>
  hash ? bcrypt.compare(candidate, hash) : false;
