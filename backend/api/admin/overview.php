<?php
/* GET /admin/overview.php — ADMIN only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
require_admin();
$pdo = db();
$n = fn(string $sql) => (int) $pdo->query($sql)->fetchColumn();
ok([
    'users'        => $n('SELECT COUNT(*) FROM users'),
    'projects'     => $n('SELECT COUNT(*) FROM projects'),
    'hackathons'   => $n('SELECT COUNT(*) FROM hackathons'),
    'open_reports' => $n("SELECT COUNT(*) FROM reports WHERE status IN ('open','reviewing')"),
    'skills'       => $n('SELECT COUNT(*) FROM skills'),
], 'Overview loaded.');
