-- Tripura Dairy — MySQL schema
-- Import this once in hPanel -> phpMyAdmin -> your database -> Import.

CREATE TABLE IF NOT EXISTS ops_state (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  version INT UNSIGNED NOT NULL DEFAULT 0,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ops_state (id, version, data) VALUES (1, 0, '{}');
