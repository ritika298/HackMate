<?php
/* GET /dashboard/get.php — everything the dashboard page shows, for the logged-in user only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();
$pdo = db();
$one = function (string $sql, array $p) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($p); return (int) $st->fetchColumn(); };

$user = hm_own_user($me['id']);

// Recommended teammates: other active students looking for a team, ranked by shared skills + shared preferred roles (+ same campus).
$st = $pdo->prepare('SELECT skill_id FROM user_skills WHERE user_id = ?');
$st->execute([$me['id']]);
$mySkillIds = array_map('intval', array_column($st->fetchAll(), 'skill_id'));
$sql = 'SELECT ' . HM_USER_SELECT . ', (u.campus_id = ?) AS same_campus, ' . ($mySkillIds
        ? '(SELECT COUNT(*) FROM user_skills us WHERE us.user_id = u.id AND us.skill_id IN (' . hm_placeholders(count($mySkillIds)) . '))'
        : '0') . ' AS shared_skills '
    . HM_USER_FROM . "WHERE u.status = 'active' AND u.role = 'student' AND u.id <> ? AND p.looking_for_team = 1
       AND NOT EXISTS (SELECT 1 FROM team_requests tr WHERE tr.status = 'pending'
            AND ((tr.sender_id = ? AND tr.receiver_id = u.id) OR (tr.sender_id = u.id AND tr.receiver_id = ?)))
       ORDER BY shared_skills DESC, same_campus DESC, u.id DESC LIMIT 4";
$params = array_merge([$me['campus_id']], $mySkillIds, [$me['id'], $me['id'], $me['id']]);
$st = $pdo->prepare($sql);
$st->execute($params);
$recommended = hm_shape_users($st->fetchAll());

$st = $pdo->prepare('SELECT ' . HM_PROJECT_SELECT . HM_PROJECT_FROM . ' WHERE EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = pr.id AND pm.user_id = ?)
    ORDER BY pr.created_at DESC LIMIT 6');
$st->execute([$me['id']]);
$myProjects = hm_shape_projects($st->fetchAll());

$upcoming = hm_query_hackathons("h.status = 'published' AND h.end_date >= CURDATE()", [], $me['id'], 'h.start_date ASC, h.id ASC', 4, 0);

$st = $pdo->prepare('SELECT id, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 8');
$st->execute([$me['id']]);
$notifications = array_map(fn($r) => ['id' => (int) $r['id'], 'title' => $r['title'], 'body' => (string) ($r['body'] ?? ''),
    'is_read' => (bool) $r['is_read'], 'created_at' => $r['created_at']], $st->fetchAll());

ok([
    'user'                   => $user,
    'profile_completion'     => hm_profile_completion($user),
    'pending_requests'       => $one("SELECT COUNT(*) FROM team_requests WHERE receiver_id = ? AND status = 'pending'", [$me['id']]),
    'projects_count' => $one(
    'SELECT COUNT(DISTINCT pr.id)
     FROM projects pr
     INNER JOIN project_members pm
        ON pm.project_id = pr.id
     WHERE pm.user_id = ?',
    [$me['id']]
),
    'saved_hackathons_count' => $one('SELECT COUNT(*) FROM saved_hackathons WHERE user_id = ?', [$me['id']]),
    'team_members_count'     => $one('SELECT COUNT(DISTINCT pm2.user_id) FROM project_members pm JOIN project_members pm2 ON pm2.project_id = pm.project_id AND pm2.user_id <> pm.user_id WHERE pm.user_id = ?', [$me['id']]),
    'recommended_users'      => $recommended,
    'my_projects'            => $myProjects,
    'upcoming_hackathons'    => $upcoming,
    'notifications'          => $notifications,
], 'Dashboard loaded.');
