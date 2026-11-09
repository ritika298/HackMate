<?php
/* GET /requests/list.php → {incoming:[req], sent:[req]}; req.user is the OTHER party. Only the caller's own requests. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();

$st = db()->prepare('SELECT r.id, r.sender_id, r.receiver_id, r.type, r.message, r.status, r.created_at, r.project_id, pr.title AS project_title
    FROM team_requests r LEFT JOIN projects pr ON pr.id = r.project_id
    WHERE r.sender_id = ? OR r.receiver_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 300');
$st->execute([$me['id'], $me['id']]);
$rows = $st->fetchAll();

$others = [];
foreach ($rows as $r) {
    $others[] = (int) $r['sender_id'] === $me['id'] ? (int) $r['receiver_id'] : (int) $r['sender_id'];
}
$users = hm_users_map($others);

$out = ['incoming' => [], 'sent' => []];
foreach ($rows as $r) {
    $incoming = (int) $r['receiver_id'] === $me['id'];
    $other = $incoming ? (int) $r['sender_id'] : (int) $r['receiver_id'];
    if (!isset($users[$other])) {
        continue;
    }
    $item = [
        'id'         => (int) $r['id'],
        'type'       => $r['type'],
        'user'       => $users[$other],
        'project'    => $r['project_id'] !== null ? ['id' => (int) $r['project_id'], 'title' => $r['project_title']] : null,
        'message'    => (string) ($r['message'] ?? ''),
        'status'     => $r['status'],
        'created_at' => $r['created_at'],
    ];
    $out[$incoming ? 'incoming' : 'sent'][] = $item;
}
ok($out, 'Requests loaded.');
