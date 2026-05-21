CREATE DATABASE IF NOT EXISTS bal_tickets
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bal_tickets;

CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  email VARCHAR(160) NULL,
  ticket_code VARCHAR(80) NOT NULL UNIQUE,
  qr_code LONGTEXT NOT NULL,
  statut ENUM('active', 'used') NOT NULL DEFAULT 'active',
  date_achat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_scan DATETIME NULL,
  INDEX idx_ticket_code (ticket_code),
  INDEX idx_statut (statut)
);
