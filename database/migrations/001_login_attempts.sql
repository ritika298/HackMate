-- Run this ONLY if you already loaded the original schema.sql (it now includes this table).
CREATE TABLE IF NOT EXISTS login_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind         ENUM('login','register') NOT NULL,
  ip           VARCHAR(45)  NOT NULL,
  identifier   CHAR(64)     NOT NULL,
  succeeded    TINYINT(1)   NOT NULL DEFAULT 0,
  attempted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_la_ident (kind, identifier, attempted_at),
  KEY idx_la_ip (kind, ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
