import dotenv from 'dotenv';
import path from 'path';

// Load base .env first, then overlay .env.test
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), override: true });
