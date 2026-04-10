import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { validateEnv } from './utils/validateEnv';
import authRoutes from './routes/auth';
import subnetRoutes from './routes/subnets';
import ipRoutes from './routes/ips';
import uploadRoutes from './routes/upload';

dotenv.config();
validateEnv();

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to frontend origin in production
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subnets', subnetRoutes);
app.use('/api/subnets/:subnetId/ips', ipRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});

export default app;
