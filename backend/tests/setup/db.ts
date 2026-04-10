import pool from '../../src/utils/db';

export async function truncateAll() {
  const conn = await pool.getConnection();
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE AuditLogs');
  await conn.query('TRUNCATE TABLE IPs');
  await conn.query('TRUNCATE TABLE Subnets');
  await conn.query('TRUNCATE TABLE Users');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  conn.release();
}
