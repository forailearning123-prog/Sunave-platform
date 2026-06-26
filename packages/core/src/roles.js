export const ROLE = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
  GUEST: 'Guest'
};

export const PERMISSION = {
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  SESSIONS_READ: 'sessions:read',
  SESSIONS_WRITE: 'sessions:write',
  ORG_MANAGE: 'org:manage',
  ORG_CREATE: 'org:create',
  ORG_READ: 'org:read',
  ORG_WRITE: 'org:write',
  ORG_ARCHIVE: 'org:archive',
  MEMBER_INVITE: 'member:invite',
  MEMBER_MANAGE: 'member:manage',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  // IAM permissions (DB-backed, also reflected here for reference)
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  TEAMS_READ: 'teams.read',
  TEAMS_CREATE: 'teams.create',
  TEAMS_UPDATE: 'teams.update',
  TEAMS_DELETE: 'teams.delete',
  TEAMS_MANAGE: 'teams.manage',
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_READ: 'permissions.read',
  GOALS_MANAGE: 'goals.manage',
  PROJECTS_MANAGE: 'projects.manage',
  PLUGINS_INSTALL: 'plugins.install',
  WORKERS_EXECUTE: 'workers.execute',
  AGENTS_MANAGE: 'agents.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AI_MANAGE: 'ai.manage',
  BILLING_MANAGE: 'billing.manage',
  AUDIT_READ: 'audit.read'
};

const rolePermissions = {
  [ROLE.OWNER]: new Set(Object.values(PERMISSION)),
  [ROLE.ADMIN]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ,
    PERMISSION.SESSIONS_WRITE,
    PERMISSION.ORG_READ,
    PERMISSION.ORG_WRITE,
    PERMISSION.MEMBER_INVITE,
    PERMISSION.MEMBER_MANAGE,
    PERMISSION.SETTINGS_READ,
    PERMISSION.SETTINGS_WRITE
  ]),
  [ROLE.MANAGER]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ,
    PERMISSION.ORG_READ,
    PERMISSION.SETTINGS_READ
  ]),
  [ROLE.USER]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ,
    PERMISSION.ORG_READ
  ]),
  [ROLE.GUEST]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.ORG_READ
  ])
};

export function hasPermission(role, permission) {
  return Boolean(rolePermissions[role]?.has(permission));
}

export function normalizeRole(role) {
  const matched = Object.values(ROLE).find((item) => item.toLowerCase() === String(role || '').toLowerCase());
  return matched || null;
}
