<?php
/* GET /admin/overview.php — ADMIN only. Live platform counts for the Admin Command Centre.
 * The first five keys (users, projects, hackathons, open_reports, skills) are unchanged for existing callers. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
$pdo = db();
$n = fn(string $sql) => (int) $pdo->query($sql)->fetchColumn();
ok([
    'users'           => $n('SELECT COUNT(*) FROM users'),
    'active_users'    => $n("SELECT COUNT(*) FROM users WHERE status = 'active'"),
    'suspended_users' => $n("SELECT COUNT(*) FROM users WHERE status = 'suspended'"),
    'pending_users'   => $n("SELECT COUNT(*) FROM users WHERE status = 'pending'"),
    'projects'        => $n('SELECT COUNT(*) FROM projects'),
    'open_projects'   => $n("SELECT COUNT(*) FROM projects WHERE status = 'open'"),
    'hackathons'      => $n('SELECT COUNT(*) FROM hackathons'),
    'draft_hackathons' => $n("SELECT COUNT(*) FROM hackathons WHERE status = 'draft'"),
    'open_reports'    => $n("SELECT COUNT(*) FROM reports WHERE status IN ('open','reviewing')"),
    'stale_reports'   => $n("SELECT COUNT(*) FROM reports WHERE status IN ('open','reviewing') AND created_at < (NOW() - INTERVAL 7 DAY)"),
    'campuses'        => $n('SELECT COUNT(*) FROM campuses'),
    'skills'          => $n('SELECT COUNT(*) FROM skills'),
], 'Overview loaded.');
