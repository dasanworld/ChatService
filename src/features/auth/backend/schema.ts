import { z } from 'zod';

export const SignupRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(20, 'Nickname must be at most 20 characters')
    .regex(/^[a-zA-Z0-9가-힣_]+$/, 'Nickname can only contain letters, numbers, and underscores'),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const SignupResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  nickname: z.string(),
});

export type SignupResponse = z.infer<typeof SignupResponseSchema>;
