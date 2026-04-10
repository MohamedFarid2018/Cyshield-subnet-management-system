const required = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv(): void {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if ((process.env.JWT_SECRET as string).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if ((process.env.JWT_REFRESH_SECRET as string).length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
  }
}
