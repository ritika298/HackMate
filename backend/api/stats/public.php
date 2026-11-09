<?php
/* GET /stats/public.php → {students, projects, hackathons, teams_formed}. Public aggregate counts only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$pdo = db();
$n = fn(string $sql) => (int) $pdo->query($sql)->fetchColumn();
ok([
    'students'     => $n("SELECT COUNT(*) FROM users WHERE status = 'active' AND role = 'student'"),
    'projects'     => $n("SELECT COUNT(*) FROM projects WHERE status <> 'closed'"),
    'hackathons'   => $n("SELECT COUNT(*) FROM hackathons WHERE status = 'published' AND end_date >= CURDATE()"),
    'teams_formed' => $n('SELECT COUNT(*) FROM (SELECT project_id FROM project_members GROUP BY project_id HAVING COUNT(*) >= 2) t'),
], 'Stats loaded.');
