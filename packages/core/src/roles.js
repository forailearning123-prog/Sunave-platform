export const ROLE = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User'
};

export const PERMISSION = {
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  SESSIONS_READ: 'sessions:read',
  SESSIONS_WRITE: 'sessions:write',
  ORG_MANAGE: 'org:manage'
};

const rolePermissions = {
  [ROLE.OWNER]: new Set(Object.values(PERMISSION)),
  [ROLE.ADMIN]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ,
    PERMISSION.SESSIONS_WRITE
  ]),
  [ROLE.MANAGER]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ
  ]),
  [ROLE.USER]: new Set([
    PERMISSION.PROFILE_READ,
    PERMISSION.PROFILE_WRITE,
    PERMISSION.SESSIONS_READ
  ])
};

export function hasPermission(role, permission) {
  return Boolean(rolePermissions[role]?.has(permission));
}

export function normalizeRole(role) {
  const matched = Object.values(ROLE).find((item) => item.toLowerCase() === String(role || '').toLowerCase());
  return matched || null;
}
