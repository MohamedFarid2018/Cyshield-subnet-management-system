import dotenv from 'dotenv';
dotenv.config();

import { validateEnv } from './utils/validateEnv';
validateEnv();

import app from './app';

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
