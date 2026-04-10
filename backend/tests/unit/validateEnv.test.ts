import { validateEnv } from '../../src/utils/validateEnv';

const REQUIRED_VARS = [
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
];

function setValidEnv() {
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = 'password';
  process.env.DB_NAME = 'subnet_management';
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
}

function clearEnv() {
  REQUIRED_VARS.forEach((k) => delete process.env[k]);
}

describe('validateEnv', () => {
  beforeEach(setValidEnv);
  afterEach(clearEnv);

  it('passes when all required variables are set', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it.each(REQUIRED_VARS)('throws when %s is missing', (key) => {
    delete process.env[key];
    expect(() => validateEnv()).toThrow(/Missing required environment variables/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => validateEnv()).toThrow(/JWT_SECRET must be at least 32 characters/);
  });

  it('throws when JWT_REFRESH_SECRET is shorter than 32 characters', () => {
    process.env.JWT_REFRESH_SECRET = 'short';
    expect(() => validateEnv()).toThrow(/JWT_REFRESH_SECRET must be at least 32 characters/);
  });
});
