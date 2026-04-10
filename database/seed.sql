-- ============================================================
-- Optional seed data for development
-- Password for both accounts: Admin@123
-- ============================================================
USE subnet_management;

INSERT IGNORE INTO Users (Email, PasswordHash, Role) VALUES
  ('admin@example.com', '$2a$12$LQv3c1yqBwEHxv27zEIbuesSAVlFGgEOVlCmvSuvfKfg7iYTFByEa', 'admin'),
  ('user@example.com',  '$2a$12$LQv3c1yqBwEHxv27zEIbuesSAVlFGgEOVlCmvSuvfKfg7iYTFByEa', 'user');
