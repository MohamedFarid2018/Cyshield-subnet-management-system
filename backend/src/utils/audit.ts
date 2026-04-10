import pool from './db';

export async function logAudit(
  userId: number,
  action: string,
  table: string,
  recordId: number,
  oldValues?: object,
  newValues?: object
): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO AuditLogs (UserId, Action, \`Table\`, RecordId, OldValues, NewValues)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        table,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ]
    );
  } catch {
    // Audit failures should never break the main flow
    console.error('[Audit] Failed to write audit log');
  }
}
