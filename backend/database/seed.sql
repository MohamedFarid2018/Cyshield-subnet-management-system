-- ============================================================
-- Optional seed data for development
-- Password for both accounts: Admin@123
-- ============================================================
USE subnet_management;

INSERT INTO Users (Email, PasswordHash, Role) VALUES
  ('admin@example.com', '$2b$12$YWf4K4ukJCDUeuwhCuc62et560fwPCcPs/ZMiM3MqvAbR0m72PXUK', 'admin'),
  ('user@example.com',  '$2b$12$YWf4K4ukJCDUeuwhCuc62et560fwPCcPs/ZMiM3MqvAbR0m72PXUK', 'user')
ON DUPLICATE KEY UPDATE PasswordHash = VALUES(PasswordHash);
