import { z } from 'zod';
import { ROLE } from './roles.js';

const email = z.string().email().trim().toLowerCase();
const password = z.string().min(10).regex(/[A-Z]/, 'Must include uppercase').regex(/[a-z]/, 'Must include lowercase').regex(/[0-9]/, 'Must include number').regex(/[^A-Za-z0-9]/, 'Must include special character');
const nameField = z.string().trim().min(1).max(80);

export const registerSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email,
  password,
  rememberSession: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
  rememberSession: z.boolean().optional().default(false)
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: password
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password
});

export const profileSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  avatarUrl: z.string().trim().url().or(z.literal('')).optional()
});

export const organizationOnboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80)
});

export const roleSchema = z.nativeEnum(ROLE);
