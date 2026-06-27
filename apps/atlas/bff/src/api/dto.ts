import { Role } from '@nebula/types';
import { z } from 'zod';

export const RegisterDto = z.object({
  orgName: z.string().min(1).max(64),
  username: z.string().min(3).max(64),
  email: z.string().email(),
  password: z.string().min(10),
});

export const LoginDto = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshDto = z.object({
  refreshToken: z.string().min(1),
});

export const InviteDto = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(64),
  role: Role.default('member'),
  temporaryPassword: z.string().min(10),
});
