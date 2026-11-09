<?php
/* GET /campuses/list.php → [{id, short_name}] (active only). Public. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$rows = db()->query('SELECT id, short_name FROM campuses WHERE is_active = 1 ORDER BY (short_name = \'Other\'), short_name')->fetchAll();
ok(array_map(fn($r) => ['id' => (int) $r['id'], 'short_name' => $r['short_name']], $rows), 'Campuses loaded.');
