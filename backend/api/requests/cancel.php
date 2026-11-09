<?php
/* POST /requests/cancel.php {id} — ONLY the sender may cancel, and only while the request is pending. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Request');
$v->done();

hm_tx(function ($pdo) use ($me, $id) {
    $st = $pdo->prepare('SELECT sender_id, status FROM team_requests WHERE id = ? FOR UPDATE');
    $st->execute([$id]);
    $req = $st->fetch();
    if (!$req) {
        fail('Request not found.', 404, 'not_found');
    }
    if ((int) $req['sender_id'] !== $me['id']) {
        fail('Only the person who sent this request can cancel it.', 403, 'forbidden');
    }
    if ($req['status'] !== 'pending') {
        fail('Only pending requests can be cancelled.', 409, 'not_pending');
    }
    $pdo->prepare("UPDATE team_requests SET status = 'cancelled', responded_at = NOW() WHERE id = ?")->execute([$id]);
});
ok(['status' => 'cancelled'], 'Request cancelled.');
