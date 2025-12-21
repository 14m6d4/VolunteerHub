
import { z } from 'zod';

export const secureUpdateProfileSchema = z.object({
  username: z.string().min(3, 'Tên người dùng phải có ít nhất 3 ký tự').optional(),
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  birthdate: z.string().optional(),
  // Allow a normal URL, a data URI (base64) or empty string/undefined
  profilePicture: z.union([
    z.string().url('URL ảnh không hợp lệ'),
    z.string().regex(/^data:image\/[a-zA-Z]+;base64,/, 'Invalid image data URL'),
    z.literal(''),
    z.undefined(),
  ]).optional(),
  notificationsEnabled: z.boolean().optional(),
  notifyOnMention: z.boolean().optional(),
  notifyOnEventUpdate: z.boolean().optional(),
  currentPassword: z.string().min(6, 'Invalid Password').optional(),
}).refine((data) => {
  // Ít nhất phải có 1 trường thay đổi (ngoài currentPassword)
  const hasChanges = Object.keys(data).some(key =>
    key !== 'currentPassword' && data[key as keyof typeof data] !== undefined
  );
  return hasChanges;
}, {
  message: 'You did not change any information.',
  path: ['currentPassword'],
});