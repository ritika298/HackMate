<?php
/* GET /admin/users.php — ADMIN only. The ONLY endpoint that returns other users' email addresses. Never returns password hashes. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
[$limit, $offset] = hm_page(200, 500);
$rows = db()->query('SELECT u.id, u.name, u.email, c.short_name AS campus, u.role, u.status FROM users u JOIN campuses c ON c.id = u.campus_id
    ORDER BY u.id LIMIT ' . $limit . ' OFFSET ' . $offset)->fetchAll();
ok(array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'email' => $r['email'], 'campus' => $r['campus'], 'role' => $r['role'], 'status' => $r['status']], $rows), 'Users loaded.');
