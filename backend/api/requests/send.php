<?php
/* POST /requests/send.php {type:'team_up'|'join_request'|'invite', receiver_id?, project_id?, message?}
 * The sender is ALWAYS the session user.
 *   team_up      → receiver_id required
 *   join_request → project_id required; receiver = the project's owner (derived server-side)
 *   invite       → project_id (must be yours) + receiver_id required */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$type = $v->enum('type', ['team_up', 'join_request', 'invite'], true);
$receiverId = $v->int('receiver_id', 1, 2147483647, false, 'Receiver');
$projectId = $v->int('project_id', 1, 2147483647, false, 'Project');
$message = $v->str('message', 0, 500, false, 'Message', true);
if ($type === 'team_up' && $receiverId === null) {
    $v->fail('receiver_id', 'Choose who to send the request to.');
}
if (($type === 'join_request' || $type === 'invite') && $projectId === null) {
    $v->fail('project_id', 'Choose a project.');
}
if ($type === 'invite' && $receiverId === null) {
    $v->fail('receiver_id', 'Choose who to invite.');
}
$v->done();

$result = hm_tx(function ($pdo) use ($me, $type, $receiverId, $projectId, $message) {
    $project = null;
    if ($type === 'team_up') {
        $projectId = null; // a general request is not tied to a project
    } else {
        $st = $pdo->prepare('SELECT id, owner_id, title, status, team_size_target FROM projects WHERE id = ? FOR UPDATE');
        $st->execute([$projectId]);
        $project = $st->fetch();
        if (!$project) {
            fail('Project not found.', 404, 'not_found');
        }
        if ($project['status'] !== 'open') {
            fail('This project is not accepting new members.', 409, 'project_closed');
        }
        $st = $pdo->prepare('SELECT COUNT(*) FROM project_members WHERE project_id = ?');
        $st->execute([$projectId]);
        if ((int) $st->fetchColumn() >= (int) $project['team_size_target']) {
            fail('This team is already full.', 409, 'project_full');
        }
        if ($type === 'join_request') {
            $receiverId = (int) $project['owner_id']; // never trust a receiver sent by the client here
        } elseif ((int) $project['owner_id'] !== $me['id']) {
            fail('Only the project owner can send invitations.', 403, 'forbidden');
        }
    }

    if ($receiverId === $me['id']) {
        fail('You cannot send a request to yourself.', 422, 'validation_error', ['receiver_id' => 'You cannot send a request to yourself.']);
    }
    $st = $pdo->prepare("SELECT id, name FROM users WHERE id = ? AND status = 'active'");
    $st->execute([$receiverId]);
    $receiver = $st->fetch();
    if (!$receiver) {
        fail('That user does not exist.', 404, 'not_found');
    }

    if ($project) {
        // Duplicate membership: whoever would end up joining must not already be on the team.
        $joiner = $type === 'join_request' ? $me['id'] : $receiverId;
        $st = $pdo->prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?');
        $st->execute([$projectId, $joiner]);
        if ($st->fetch()) {
            fail($type === 'join_request' ? 'You are already on this team.' : 'That person is already on this team.', 409, 'already_member');
        }
    }

    // No duplicate pending request for the same (sender, receiver, project). <=> is NULL-safe equality.
    $st = $pdo->prepare("SELECT 1 FROM team_requests WHERE sender_id = ? AND receiver_id = ? AND project_id <=> ? AND status = 'pending'");
    $st->execute([$me['id'], $receiverId, $projectId]);
    if ($st->fetch()) {
        fail('You already have a pending request for this.', 409, 'duplicate_request');
    }

    $pdo->prepare('INSERT INTO team_requests (sender_id, receiver_id, project_id, type, message) VALUES (?, ?, ?, ?, ?)')
        ->execute([$me['id'], $receiverId, $projectId, $type, $message]);
    $id = (int) $pdo->lastInsertId();

    $title = [
        'team_up'      => $me['name'] . ' wants to team up with you',
        'join_request' => $me['name'] . ' wants to join "' . ($project['title'] ?? '') . '"',
        'invite'       => 'Project invitation: "' . ($project['title'] ?? '') . '"',
    ][$type];
    hm_notify($receiverId, 'request_received', $title, $message, 'requests.html');
    return $id;
});

ok(['id' => $result], 'Request sent successfully.', 201);
