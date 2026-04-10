-- ============================================================
-- Subnet Management System — Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS subnet_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE subnet_management;

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
  UserId          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Email           VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash    VARCHAR(255) NOT NULL,
  Role            ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  RefreshTokenHash VARCHAR(255) NULL,
  CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (Email)
) ENGINE=InnoDB;

-- ============================================================
-- Subnets
-- ============================================================
CREATE TABLE IF NOT EXISTS Subnets (
  SubnetId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  SubnetName      VARCHAR(100) NOT NULL,
  SubnetAddress   VARCHAR(50) NOT NULL,
  CreatedBy       INT UNSIGNED NOT NULL,
  CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DeletedAt       DATETIME NULL DEFAULT NULL,
  CONSTRAINT fk_subnets_user FOREIGN KEY (CreatedBy) REFERENCES Users (UserId),
  INDEX idx_subnets_deleted (DeletedAt),
  INDEX idx_subnets_address (SubnetAddress)
) ENGINE=InnoDB;

-- ============================================================
-- IPs
-- ============================================================
CREATE TABLE IF NOT EXISTS IPs (
  IpId            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  IpAddress       VARCHAR(15) NOT NULL,
  SubnetId        INT UNSIGNED NOT NULL,
  CreatedBy       INT UNSIGNED NOT NULL,
  CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DeletedAt       DATETIME NULL DEFAULT NULL,
  CONSTRAINT fk_ips_subnet FOREIGN KEY (SubnetId) REFERENCES Subnets (SubnetId),
  CONSTRAINT fk_ips_user   FOREIGN KEY (CreatedBy) REFERENCES Users (UserId),
  INDEX idx_ips_subnet  (SubnetId),
  INDEX idx_ips_deleted (DeletedAt),
  INDEX idx_ips_address (IpAddress)
) ENGINE=InnoDB;

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS AuditLogs (
  LogId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  UserId     INT UNSIGNED NOT NULL,
  Action     ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  `Table`    VARCHAR(50) NOT NULL,
  RecordId   INT UNSIGNED NOT NULL,
  OldValues  JSON NULL,
  NewValues  JSON NULL,
  CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (UserId) REFERENCES Users (UserId),
  INDEX idx_audit_user   (UserId),
  INDEX idx_audit_table  (`Table`, RecordId),
  INDEX idx_audit_time   (CreatedAt)
) ENGINE=InnoDB;
