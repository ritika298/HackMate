<?php
/* GET /admin/activity.php — ADMIN only. Recent platform activity for the Admin Command Centre (read-only, newest first, 5 per feed).
 * No e-mail addresses, password hashes or report free-text are returned.
 * There is no audit-log table, so "moderation" lists the report resolutions / dismissals that reports.resolved_by records. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
$pdo = db();
const HM_ACTIVITY_LIMIT = 5;
$rows = fn(string $sql) => $pdo->query($sql . ' LIMIT ' . HM_ACTIVITY_LIMIT)->fetchAll();
$target = 'COALESCE(tu.name, tp.title)';
$reportJoins = 'FROM reports r JOIN users ru ON ru.id = r.reporter_id
    LEFT JOIN users tu ON tu.id = r.target_user_id LEFT JOIN projects tp ON tp.id = r.target_project_id';

$users = $rows('SELECT u.id, u.name, c.short_name AS campus, u.role, u.status, u.created_at
    FROM users u JOIN campuses c ON c.id = u.campus_id ORDER BY u.created_at DESC, u.id DESC');
$projects = $rows('SELECT pr.id, pr.title, o.name AS owner, c.short_name AS campus, pr.status, pr.created_at
    FROM projects pr JOIN users o ON o.id = pr.owner_id JOIN campuses c ON c.id = pr.campus_id ORDER BY pr.created_at DESC, pr.id DESC');
$reports = $rows("SELECT r.id, r.target_type, r.reason, r.status, r.created_at, ru.name AS reporter, $target AS target
    $reportJoins ORDER BY r.created_at DESC, r.id DESC");
$pending = $rows("SELECT r.id, r.target_type, r.reason, r.status, r.created_at, ru.name AS reporter, $target AS target
    $reportJoins WHERE r.status IN ('open','reviewing') ORDER BY (r.status = 'open') DESC, r.created_at ASC, r.id ASC");
$hackathons = $rows('SELECT h.id, h.name, h.organizer, h.status, h.created_at, cu.name AS added_by
    FROM hackathons h LEFT JOIN users cu ON cu.id = h.created_by ORDER BY h.created_at DESC, h.id DESC');
$moderation = $rows("SELECT r.id, r.status, r.resolved_at, ad.name AS admin, $target AS target
    FROM reports r JOIN users ad ON ad.id = r.resolved_by
    LEFT JOIN users tu ON tu.id = r.target_user_id LEFT JOIN projects tp ON tp.id = r.target_project_id
    WHERE r.resolved_at IS NOT NULL ORDER BY r.resolved_at DESC, r.id DESC");

$reportShape = fn($r) => ['id' => (int) $r['id'], 'target_type' => $r['target_type'], 'target' => (string) ($r['target'] ?? '(deleted)'),
    'reason' => $r['reason'], 'reporter' => $r['reporter'], 'status' => $r['status'], 'created_at' => $r['created_at']];

ok([
    'users'      => array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'campus' => $r['campus'], 'role' => $r['role'],
        'status' => $r['status'], 'created_at' => $r['created_at']], $users),
    'projects'   => array_map(fn($r) => ['id' => (int) $r['id'], 'title' => $r['title'], 'owner' => $r['owner'], 'campus' => $r['campus'],
        'status' => $r['status'], 'created_at' => $r['created_at']], $projects),
    'reports'    => array_map($reportShape, $reports),
    'pending_reports' => array_map($reportShape, $pending),
    'hackathons' => array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'organizer' => $r['organizer'], 'status' => $r['status'],
        'added_by' => $r['added_by'], 'created_at' => $r['created_at']], $hackathons),
    'moderation' => array_map(fn($r) => ['id' => (int) $r['id'], 'status' => $r['status'], 'admin' => $r['admin'],
        'target' => (string) ($r['target'] ?? '(deleted)'), 'resolved_at' => $r['resolved_at']], $moderation),
], 'Activity loaded.');
