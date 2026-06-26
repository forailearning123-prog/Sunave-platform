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

// ─── IAM Schemas ──────────────────────────────────────────────────────────────

export const USER_STATUS = ['active', 'inactive', 'invited', 'suspended', 'archived'];

export const createUserSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email,
  phone: z.string().trim().max(50).optional().default(''),
  jobTitle: z.string().trim().max(120).optional().default(''),
  department: z.string().trim().max(120).optional().default(''),
  employeeId: z.string().trim().max(80).optional().default(''),
  timezone: z.string().trim().max(100).optional().default('UTC'),
  language: z.string().trim().max(10).optional().default('en'),
  role: z.enum(['Admin', 'Manager', 'User', 'Guest']).optional().default('User')
});

export const updateUserSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  displayName: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(50).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  employeeId: z.string().trim().max(80).optional(),
  timezone: z.string().trim().max(100).optional(),
  language: z.string().trim().max(10).optional(),
  avatarUrl: z.string().trim().url().or(z.literal('')).optional(),
  status: z.enum(USER_STATUS).optional()
});

export const assignUserRoleSchema = z.object({
  role: z.enum(['Admin', 'Manager', 'User', 'Guest'])
});

export const assignUserTeamsSchema = z.object({
  teamId: z.string().uuid(),
  role: z.string().trim().max(40).optional().default('member')
});

export const TEAM_MEMBER_ROLE = ['lead', 'member'];

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(''),
  color: z.string().trim().max(20).optional().default(''),
  icon: z.string().trim().max(80).optional().default(''),
  parentTeamId: z.string().uuid().optional().nullable()
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(80).optional(),
  parentTeamId: z.string().uuid().optional().nullable()
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().trim().max(40).optional().default('member')
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default('')
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional()
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1)
});

// ─── Settings Schemas ─────────────────────────────────────────────────────────

export const SYSTEM_SETTINGS_CATEGORY = [
  'general', 'appearance', 'localization', 'branding', 'security',
  'notifications', 'storage', 'ai', 'voice', 'email', 'api',
  'integrations', 'plugins', 'marketplace', 'billing', 'audit', 'system'
];

export const USER_PREFERENCE_CATEGORY = [
  'general', 'appearance', 'notifications', 'accessibility'
];

export const FEATURE_FLAG_TYPE = ['boolean', 'percentage', 'org_rollout', 'role_rollout'];

export const updateSystemSettingsSchema = z.object({
  settings: z.record(z.unknown())
});

export const updateUserPreferencesSchema = z.object({
  category: z.enum(['general', 'appearance', 'notifications', 'accessibility']),
  preferences: z.record(z.unknown())
});

export const userAppearancePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  layout: z.enum(['compact', 'comfortable']).optional(),
  sidebarMode: z.enum(['expanded', 'collapsed']).optional(),
  accentColor: z.string().trim().max(20).optional()
}).passthrough();

export const userGeneralPreferencesSchema = z.object({
  language: z.string().trim().min(2).max(10).optional(),
  timezone: z.string().trim().max(100).optional(),
  dateFormat: z.string().trim().max(30).optional(),
  timeFormat: z.string().trim().max(10).optional(),
  defaultLandingPage: z.string().trim().max(100).optional(),
  defaultOrganization: z.string().uuid().optional().nullable(),
  dashboardLayout: z.string().trim().max(40).optional()
}).passthrough();

export const userNotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional()
}).passthrough();

export const updateFeatureFlagSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  config: z.record(z.unknown()).optional()
});

export const createFeatureFlagAssignmentSchema = z.object({
  scope: z.enum(['organization', 'role', 'user']),
  scopeId: z.string().min(1).max(255),
  enabled: z.boolean()
});
