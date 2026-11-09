<?php
/* GET /admin/projects.php — ADMIN only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
[$limit, $offset] = hm_page(200, 500);
$rows = db()->query('SELECT ' . HM_PROJECT_SELECT . HM_PROJECT_FROM . ' ORDER BY pr.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset)->fetchAll();
ok(array_map(fn($r) => ['id' => (int) $r['id'], 'title' => $r['title'], 'owner' => $r['owner_name'], 'campus' => $r['campus'],
    'status' => $r['status'], 'members' => (int) $r['member_count']], $rows), 'Projects loaded.');
