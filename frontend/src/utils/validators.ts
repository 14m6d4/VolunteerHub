// frontend/src/utils/validators.ts
import { z } from 'zod';

export const secureUpdateProfileSchema = z.object({
  username: z.string().min(3, 'Tên người dùng phải có ít nhất 3 ký tự').optional(),
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  birthdate: z.string().optional(),
  profilePicture: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
  notificationsEnabled: z.boolean().optional(),
  notifyOnMention: z.boolean().optional(),
  notifyOnEventUpdate: z.boolean().optional(),
  currentPassword: z.string().min(6, 'Mật khẩu hiện tại không được để trống'),
}).refine((data) => {
  // Ít nhất phải có 1 trường thay đổi (ngoài currentPassword)
  const hasChanges = Object.keys(data).some(key =>
    key !== 'currentPassword' && data[key as keyof typeof data] !== undefined
  );
  return hasChanges;
}, {
  message: 'Bạn chưa thay đổi thông tin nào',
  path: ['currentPassword'],
});