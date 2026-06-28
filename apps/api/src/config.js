import dotenv from 'dotenv';

dotenv.config();

const requiredEnvs = ['NODE_ENV', 'JWT_SECRET', 'FRONTEND_URL', 'API_BASE_URL', 'PORT', 'LOG_LEVEL'];
const missing = [];

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  for (const m of missing) {
    console.error(`✗ Missing ${m}`);
  }
  console.error('Startup Aborted');
  process.exit(1);
}

console.log('✓ Environment validated');
console.log(`✓ ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}`);
try {
  const apiUrl = new URL(process.env.API_BASE_URL);
  console.log(`✓ ${apiUrl.hostname}`);
} catch (e) {
  console.log(`✓ ${process.env.API_BASE_URL}`);
}

export const config = {
  env: process.env.NODE_ENV,
  apiPort: Number(process.env.PORT || 8080),
  frontendUrl: process.env.FRONTEND_URL,
  apiBaseUrl: process.env.API_BASE_URL,
  logLevel: process.env.LOG_LEVEL,
  
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  aiGatewayUrl: process.env.AI_GATEWAY_URL,

  accessTokenSecret: process.env.JWT_SECRET,
  refreshTokenSecret: process.env.JWT_SECRET,
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 86400,
  refreshTokenRememberTtlSeconds: 2592000,
  passwordResetTtlMinutes: 30,
  isProduction: process.env.NODE_ENV === 'production',
  runMigrationsOnBoot: (process.env.RUN_MIGRATIONS_ON_BOOT || 'true') === 'true'
};
