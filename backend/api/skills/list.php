
<?php
/* GET /skills/list.php → [{id, name, category}]. Public. */

require_once __DIR__ . '/../../bootstrap.php';

require_method('GET');

$rows = db()->query(
    'SELECT id, name, category FROM skills ORDER BY category, name'
)->fetchAll();

ok(
    array_map(
        fn($r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'category' => $r['category']
        ],
        $rows
    ),
    'Skills loaded.'
);
