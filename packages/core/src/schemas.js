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

const orgSlug = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional();

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: orgSlug,
  legalName: z.string().trim().max(200).optional().default(''),
  industry: z.string().trim().min(2).max(80),
  companySize: z.string().trim().max(40).optional().default(''),
  country: z.string().trim().min(2).max(80),
  timezone: z.string().trim().max(100).optional().default('UTC'),
  currency: z.string().trim().max(10).optional().default('USD'),
  website: z.string().trim().url().or(z.literal('')).optional().default(''),
  email: email.or(z.literal('')).optional().default(''),
  phone: z.string().trim().max(50).optional().default(''),
  address: z.string().trim().max(500).optional().default('')
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: orgSlug,
  legalName: z.string().trim().max(200).optional(),
  industry: z.string().trim().min(2).max(80).optional(),
  companySize: z.string().trim().max(40).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().max(100).optional(),
  currency: z.string().trim().max(10).optional(),
  logo: z.string().trim().url().or(z.literal('')).optional(),
  website: z.string().trim().url().or(z.literal('')).optional(),
  email: email.or(z.literal('')).optional(),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional()
});

export const inviteMemberSchema = z.object({
  email,
  role: z.enum(['Admin', 'Manager', 'User', 'Guest'])
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().uuid()
});

export const updateMemberSchema = z.object({
  role: z.enum(['Admin', 'Manager', 'User', 'Guest']).optional(),
  title: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export const SETTINGS_CATEGORY = ['general', 'branding', 'regional', 'billing', 'security', 'ai', 'notifications', 'storage'];

export const updateSettingsSchema = z.object({
  settings: z.record(z.unknown())
});
