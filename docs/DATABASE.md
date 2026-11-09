# Database (MySQL 8 / MariaDB 10.4+, InnoDB, utf8mb4)

Files: `database/schema.sql` (now includes `login_attempts`; `database/migrations/001_login_attempts.sql` adds it to an existing database), `database/set_demo_passwords.php` (dev only)

Original files: `database/schema.sql` (drops and recreates all tables), `database/seed.sql` (demo data).

## Tables
| Table | Purpose | Key points |
|---|---|---|
| `campuses` | Colleges | unique `slug`, `short_name`; `is_active` |
| `users` | Accounts | unique `email`; `password_hash` (use `password_hash()`); `role` student/admin; `status` active/suspended/pending |
| `profiles` | 1:1 with users | `user_id` PK/FK; `year` CHECK 1–6; `interests` and `preferred_roles` are comma-separated text; `looking_for_team` |
| `skills` | Skill catalogue | unique `name`; `category` |
| `user_skills` | users ⇄ skills | composite PK; `level` |
| `projects` | Team posts | `owner_id`, `campus_id`, optional `hackathon_id`; `category`, `status`, `team_size_target` (CHECK 2–12), `looking_for_roles` (comma-separated); FULLTEXT on title+description |
| `project_skills` | Project tech stack | composite PK |
| `project_members` | Team membership | composite PK; owner is also a row (`is_owner=1`); team size = row count |
| `hackathons` | Events | dates CHECK `end >= start`; `mode`; `status` draft/published/archived; `is_featured` |
| `hackathon_skills` | Hackathon tags | composite PK |
| `saved_hackathons` | Bookmarks | composite PK |
| `team_requests` | Join/invite/team-up | `type`, `status` pending/accepted/rejected/cancelled |
| `notifications` | In-app alerts | `is_read`, index (user, read, created) |
| `reports` | Abuse reports | one target (user or project) per `target_type` |
| `login_attempts` | Throttling (added by Account 2) | kind login/register, ip, sha256(identifier), succeeded; rows older than a day are purged opportunistically |

## Relationships
campuses 1─∞ users 1─1 profiles · users ∞─∞ skills (user_skills) · users 1─∞ projects · projects ∞─∞ users (project_members) · projects ∞─∞ skills (project_skills) · hackathons ∞─∞ skills · users ∞─∞ hackathons (saved) · users ─∞ team_requests (sender, receiver; optional project) · users 1─∞ notifications · users ─∞ reports (reporter; target user or project).

## Rules the backend must enforce (not expressible in SQL)
- No duplicate **pending** request for the same (sender, receiver, project).
- On accept: insert `project_members` row, ensure `member_count < team_size_target`, in one transaction; create a notification.
- Only the project owner may accept/reject join requests; only the sender may cancel.
- Users cannot send requests to themselves (`sender_id <> receiver_id`). No SQL CHECK because MySQL 8 forbids CHECK on columns with FK actions.
- A report has exactly one target: `target_user_id` XOR `target_project_id`, matching `target_type` (same reason).

## Seed notes
Demo users have `password_hash = '!DEMO-NO-LOGIN'` (invalid on purpose). Generate real hashes in PHP before testing login. Do **not** load `seed.sql` in production. Seed dates are for late 2026–early 2027; refresh them if needed.
