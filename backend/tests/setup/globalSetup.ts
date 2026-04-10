import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default async function globalSetup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS subnet_management_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query('USE subnet_management_test');

  const schema = fs.readFileSync(
    path.resolve(__dirname, '../../database/schema.sql'),
    'utf8'
  );

  // Split and run each statement individually (skip CREATE DATABASE / USE lines)
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE '));

  for (const stmt of statements) {
    await conn.query(stmt);
  }

  await conn.end();
  process.env.DB_NAME = 'subnet_management_test';
}
