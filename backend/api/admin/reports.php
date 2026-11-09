<?php
/* GET /admin/reports.php — ADMIN only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
$rows = db()->query("SELECT r.id, r.target_type, r.reason, r.details, r.status, r.created_at, ru.name AS reporter,
        COALESCE(tu.name, tp.title) AS target
    FROM reports r JOIN users ru ON ru.id = r.reporter_id
    LEFT JOIN users tu ON tu.id = r.target_user_id LEFT JOIN projects tp ON tp.id = r.target_project_id
    ORDER BY (r.status IN ('open','reviewing')) DESC, r.created_at DESC LIMIT 300")->fetchAll();
ok(array_map(fn($r) => ['id' => (int) $r['id'], 'target_type' => $r['target_type'], 'target' => (string) ($r['target'] ?? '(deleted)'),
    'reason' => $r['reason'], 'details' => (string) ($r['details'] ?? ''), 'reporter' => $r['reporter'], 'status' => $r['status'],
    'created_at' => $r['created_at']], $rows), 'Reports loaded.');
