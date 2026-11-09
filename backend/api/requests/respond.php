<?php
/* POST /requests/respond.php {id, action:'accept'|'reject'} — ONLY the receiver may respond.
 * Accepting a join_request/invite adds the member to project_members inside one transaction (capacity re-checked under a row lock). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Request');
$action = $v->enum('action', ['accept', 'reject'], true);
$v->done();

$status = hm_tx(function ($pdo) use ($me, $id, $action) {
    $st = $pdo->prepare('SELECT id, sender_id, receiver_id, project_id, type, status FROM team_requests WHERE id = ? FOR UPDATE');
    $st->execute([$id]);
    $req = $st->fetch();
    if (!$req) {
        fail('Request not found.', 404, 'not_found');
    }
    if ((int) $req['receiver_id'] !== $me['id']) {
        fail('Only the person who received this request can respond to it.', 403, 'forbidden');
    }
    if ($req['status'] !== 'pending') {
        fail('This request has already been ' . $req['status'] . '.', 409, 'not_pending');
    }

    $new = $action === 'accept' ? 'accepted' : 'rejected';
    $projectTitle = null;
    if ($action === 'accept' && $req['project_id'] !== null) {
        $st = $pdo->prepare('SELECT id, title, status, team_size_target FROM projects WHERE id = ? FOR UPDATE');
        $st->execute([$req['project_id']]);
        $project = $st->fetch();
        if (!$project) {
            fail('That project no longer exists.', 404, 'not_found');
        }
        $projectTitle = $project['title'];
        $joiner = $req['type'] === 'join_request' ? (int) $req['sender_id'] : (int) $req['receiver_id'];
        $st = $pdo->prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?');
        $st->execute([$project['id'], $joiner]);
        if (!$st->fetch()) { // already a member? then just mark accepted (idempotent, no duplicate row)
            if ($project['status'] !== 'open') {
                fail('This project is not accepting new members.', 409, 'project_closed');
            }
            $st = $pdo->prepare('SELECT COUNT(*) FROM project_members WHERE project_id = ?');
            $st->execute([$project['id']]);
            if ((int) $st->fetchColumn() >= (int) $project['team_size_target']) {
                fail('This team is already full.', 409, 'project_full');
            }
            $pdo->prepare("INSERT INTO project_members (project_id, user_id, member_role, is_owner) VALUES (?, ?, 'Member', 0)")
                ->execute([$project['id'], $joiner]);
        }
    } elseif ($req['project_id'] !== null) {
        $st = $pdo->prepare('SELECT title FROM projects WHERE id = ?');
        $st->execute([$req['project_id']]);
        $projectTitle = $st->fetchColumn() ?: null;
    }

    $pdo->prepare('UPDATE team_requests SET status = ?, responded_at = NOW() WHERE id = ?')->execute([$new, $id]);

    $what = $projectTitle !== null ? ' for "' . $projectTitle . '"' : '';
    hm_notify(
        (int) $req['sender_id'],
        $new === 'accepted' ? 'request_accepted' : 'request_rejected',
        $me['name'] . ($new === 'accepted' ? ' accepted' : ' declined') . ' your request' . $what,
        null,
        $new === 'accepted' && $projectTitle !== null ? 'team.html' : 'requests.html'
    );
    return $new;
});

ok(['status' => $status], $status === 'accepted' ? 'Request accepted.' : 'Request rejected.');
