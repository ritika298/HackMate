<?php
/* GET /projects/get.php?id=N — project + members (public user objects with member_role/is_owner) + the caller's relationship to it. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = require_login();

$id = hm_query_int('id', 1, 2147483647, null);
if ($id === null) {
    fail('Project id is required.', 422, 'validation_error', ['id' => 'Project id is required.']);
}
$project = hm_project_by_id($id);
if (!$project) {
    fail('Project not found.', 404, 'not_found');
}

$st = db()->prepare('SELECT user_id, member_role, is_owner FROM project_members WHERE project_id = ? ORDER BY is_owner DESC, joined_at ASC');
$st->execute([$id]);
$memberRows = $st->fetchAll();
$isMember = false;
foreach ($memberRows as $m) {
    if ((int) $m['user_id'] === $me['id']) {
        $isMember = true;
    }
}
if ($project['status'] === 'closed' && !$isMember && $me['role'] !== 'admin') {
    fail('Project not found.', 404, 'not_found'); // closed projects are hidden from non-members
}

$users = hm_users_map(array_map(fn($m) => (int) $m['user_id'], $memberRows));
$members = [];
foreach ($memberRows as $m) {
    $uid = (int) $m['user_id'];
    if (isset($users[$uid])) {
        $members[] = $users[$uid] + ['member_role' => $m['member_role'], 'is_owner' => (bool) $m['is_owner']];
    }
}

$st = db()->prepare("SELECT status FROM team_requests WHERE project_id = ? AND sender_id = ? AND type = 'join_request' ORDER BY id DESC LIMIT 1");
$st->execute([$id, $me['id']]);
$myRequest = $st->fetchColumn();

$project['members'] = $members;
$project['is_owner'] = $project['owner']['id'] === $me['id'];
$project['is_member'] = $isMember;
$project['my_request_status'] = $myRequest ?: null;
ok($project, 'Project loaded.');
