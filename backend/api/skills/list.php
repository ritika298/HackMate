<?php
/* GET /skills/list.php → [{id, name}]. Public. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$rows = db()->query('SELECT id, name FROM skills ORDER BY name')->fetchAll();
ok(array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $rows), 'Skills loaded.');
