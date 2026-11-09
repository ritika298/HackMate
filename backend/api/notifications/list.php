<?php
/* GET /notifications/list.php[?unread=1] — the caller's notifications, newest first. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();
$sql = 'SELECT id, type, title, body, link_url, is_read, created_at FROM notifications WHERE user_id = ?';
if (($_GET['unread'] ?? '') === '1') {
    $sql .= ' AND is_read = 0';
}
$st = db()->prepare($sql . ' ORDER BY created_at DESC, id DESC LIMIT 50');
$st->execute([$me['id']]);
$out = array_map(fn($r) => [
    'id' => (int) $r['id'], 'type' => $r['type'], 'title' => $r['title'], 'body' => (string) ($r['body'] ?? ''),
    'link_url' => $r['link_url'], 'is_read' => (bool) $r['is_read'], 'created_at' => $r['created_at'],
], $st->fetchAll());
ok($out, 'Notifications loaded.');
