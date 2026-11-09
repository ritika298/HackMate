-- HackMate schema | MySQL 8 / MariaDB 10.4+ | InnoDB, utf8mb4
-- Run: mysql -u USER -p DBNAME < database/schema.sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS login_attempts, reports, notifications, team_requests, saved_hackathons, hackathon_skills, hackathons,
  project_members, project_skills, projects, user_skills, skills, profiles, users, campuses;
SET FOREIGN_KEY_CHECKS = 1;

-- Campuses: adding a new college = INSERT one row, no code change.
CREATE TABLE campuses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  short_name  VARCHAR(30)  NOT NULL,
  slug        VARCHAR(50)  NOT NULL,
  city        VARCHAR(80)  NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_campuses_slug (slug),
  UNIQUE KEY uq_campuses_short (short_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  campus_id      INT UNSIGNED NOT NULL,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,              -- password_hash() output only, never plain text
  role           ENUM('student','admin') NOT NULL DEFAULT 'student',
  status         ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  last_login_at  TIMESTAMP NULL DEFAULT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_campus (campus_id),
  KEY idx_users_status_role (status, role),
  CONSTRAINT fk_users_campus FOREIGN KEY (campus_id) REFERENCES campuses(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1:1 with users. interests / preferred_roles are comma-separated text (simple, searchable with LIKE).
CREATE TABLE profiles (
  user_id          INT UNSIGNED NOT NULL,
  branch           VARCHAR(100) NULL,
  year             TINYINT UNSIGNED NULL,
  bio              VARCHAR(500) NULL,
  avatar_url       VARCHAR(255) NULL,
  interests        VARCHAR(255) NULL,
  preferred_roles  VARCHAR(255) NULL,
  experience_level ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  experience_text  VARCHAR(500) NULL,
  github_url       VARCHAR(255) NULL,
  linkedin_url     VARCHAR(255) NULL,
  looking_for_team TINYINT(1) NOT NULL DEFAULT 1,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_profiles_branch_year (branch, year),
  CONSTRAINT chk_profiles_year CHECK (year IS NULL OR year BETWEEN 1 AND 6),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE skills (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(60) NOT NULL,
  category   ENUM('language','frontend','backend','data_ai','mobile','design','devops','other') NOT NULL DEFAULT 'other',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name),
  KEY idx_skills_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_skills (
  user_id  INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  level    ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'intermediate',
  PRIMARY KEY (user_id, skill_id),
  KEY idx_user_skills_skill (skill_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_us_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hackathons (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(150) NOT NULL,
  organizer             VARCHAR(150) NOT NULL,
  description           TEXT NULL,
  mode                  ENUM('online','offline','hybrid') NOT NULL DEFAULT 'online',
  location              VARCHAR(150) NULL,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  registration_deadline DATE NOT NULL,
  registration_url      VARCHAR(255) NULL,
  prize_info            VARCHAR(255) NULL,
  is_featured           TINYINT(1) NOT NULL DEFAULT 0,
  status                ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_by            INT UNSIGNED NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hack_status_deadline (status, registration_deadline),
  KEY idx_hack_start (start_date),
  CONSTRAINT chk_hack_dates CHECK (end_date >= start_date),
  CONSTRAINT fk_hack_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hackathon_skills (
  hackathon_id INT UNSIGNED NOT NULL,
  skill_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (hackathon_id, skill_id),
  CONSTRAINT fk_hs_hack  FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT fk_hs_skill FOREIGN KEY (skill_id)     REFERENCES skills(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE saved_hackathons (
  user_id      INT UNSIGNED NOT NULL,
  hackathon_id INT UNSIGNED NOT NULL,
  saved_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, hackathon_id),
  KEY idx_saved_hack (hackathon_id),
  CONSTRAINT fk_sh_user FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_sh_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE projects (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id         INT UNSIGNED NOT NULL,
  campus_id        INT UNSIGNED NOT NULL,
  hackathon_id     INT UNSIGNED NULL,                 -- optional: project built for a hackathon
  title            VARCHAR(150) NOT NULL,
  description      TEXT NOT NULL,
  category         ENUM('hackathon','college_project','competition','open_source','research') NOT NULL DEFAULT 'hackathon',
  status           ENUM('open','in_progress','completed','closed') NOT NULL DEFAULT 'open',
  team_size_target TINYINT UNSIGNED NOT NULL DEFAULT 4,
  looking_for_roles VARCHAR(255) NULL,                -- comma-separated roles
  repo_url         VARCHAR(255) NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_owner (owner_id),
  KEY idx_projects_campus_status (campus_id, status),
  KEY idx_projects_hackathon (hackathon_id),
  FULLTEXT KEY ft_projects_text (title, description),
  CONSTRAINT chk_projects_size CHECK (team_size_target BETWEEN 2 AND 12),
  CONSTRAINT fk_projects_owner  FOREIGN KEY (owner_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_projects_campus FOREIGN KEY (campus_id)    REFERENCES campuses(id),
  CONSTRAINT fk_projects_hack   FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE project_skills (                          -- the project's tech stack
  project_id INT UNSIGNED NOT NULL,
  skill_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (project_id, skill_id),
  KEY idx_ps_skill (skill_id),
  CONSTRAINT fk_ps_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_skill   FOREIGN KEY (skill_id)   REFERENCES skills(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Owner is ALSO a row here with is_owner = 1, so "current team size" = COUNT(*) of rows.
CREATE TABLE project_members (
  project_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  member_role VARCHAR(60) NOT NULL DEFAULT 'Member',
  is_owner    TINYINT(1) NOT NULL DEFAULT 0,
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  KEY idx_pm_user (user_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- type 'join_request': sender asks to join receiver's project (receiver = project owner)
-- type 'invite'      : sender (project owner) invites receiver to a project
-- type 'team_up'     : general teammate request from Discover (project_id NULL)
CREATE TABLE team_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id    INT UNSIGNED NOT NULL,
  receiver_id  INT UNSIGNED NOT NULL,
  project_id   INT UNSIGNED NULL,
  type         ENUM('join_request','invite','team_up') NOT NULL DEFAULT 'team_up',
  message      VARCHAR(500) NULL,
  status       ENUM('pending','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_tr_receiver_status (receiver_id, status),
  KEY idx_tr_sender_status (sender_id, status),
  KEY idx_tr_project (project_id),
  -- NOTE: MySQL 8 forbids CHECK on columns that have FK actions, so 'sender <> receiver' is enforced in PHP.
  CONSTRAINT fk_tr_sender   FOREIGN KEY (sender_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_tr_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_tr_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Backend must prevent duplicate PENDING requests (same sender, receiver, project) in code.

CREATE TABLE notifications (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  type       ENUM('request_received','request_accepted','request_rejected','member_joined','hackathon_reminder','system') NOT NULL DEFAULT 'system',
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(300) NULL,
  link_url   VARCHAR(255) NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read (user_id, is_read, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reports (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id       INT UNSIGNED NOT NULL,
  target_type       ENUM('user','project') NOT NULL,
  target_user_id    INT UNSIGNED NULL,
  target_project_id INT UNSIGNED NULL,
  reason            ENUM('spam','harassment','fake_profile','inappropriate','other') NOT NULL DEFAULT 'other',
  details           VARCHAR(500) NULL,
  status            ENUM('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
  resolved_by       INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at       TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_reporter (reporter_id),
  -- NOTE: 'exactly one target matching target_type' is enforced in PHP (same MySQL CHECK/FK restriction).
  CONSTRAINT fk_rep_reporter FOREIGN KEY (reporter_id)       REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rep_tuser    FOREIGN KEY (target_user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rep_tproj    FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_resolver FOREIGN KEY (resolved_by)       REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Added by Account 2: brute-force throttling for login / register (see backend/helpers/security.php).
CREATE TABLE login_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind         ENUM('login','register') NOT NULL,
  ip           VARCHAR(45)  NOT NULL,
  identifier   CHAR(64)     NOT NULL,                 -- sha256 of the lower-cased email (or 'register:<ip>'), never the raw email
  succeeded    TINYINT(1)   NOT NULL DEFAULT 0,
  attempted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_la_ident (kind, identifier, attempted_at),
  KEY idx_la_ip (kind, ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
