import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = ['DATABASE_URL', 'AUTH_ACCESS_TOKEN_SECRET', 'AUTH_REFRESH_TOKEN_SECRET'];

if (process.env.SUNAVE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export const config = {
  env: process.env.SUNAVE_ENV || 'development',
  apiPort: Number(process.env.API_PORT || 8080),
  databaseUrl: process.env.DATABASE_URL || '******localhost:5432/sunave',
  accessTokenSecret: process.env.AUTH_ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me',
  refreshTokenSecret: process.env.AUTH_REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-me',
  accessTokenTtlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || 86400),
  refreshTokenRememberTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_REMEMBER_TTL_SECONDS || 2592000),
  passwordResetTtlMinutes: Number(process.env.AUTH_PASSWORD_RESET_TTL_MINUTES || 30),
  isProduction: (process.env.SUNAVE_ENV || 'development') === 'production',
  runMigrationsOnBoot: (process.env.RUN_MIGRATIONS_ON_BOOT || 'true') === 'true'
};
