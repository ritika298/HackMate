<?php
/* POST /projects/leave.php {id} — a member (not the owner) leaves a team. The owner must delete the project instead. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Project');
$v->done();

hm_tx(function ($pdo) use ($me, $id) {
    $st = $pdo->prepare('SELECT owner_id, title FROM projects WHERE id = ? FOR UPDATE');
    $st->execute([$id]);
    $p = $st->fetch();
    if (!$p) {
        fail('Project not found.', 404, 'not_found');
    }
    if ((int) $p['owner_id'] === $me['id']) {
        fail('The owner cannot leave their own project. Delete it instead.', 409, 'owner_cannot_leave');
    }
    $st = $pdo->prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ? AND is_owner = 0');
    $st->execute([$id, $me['id']]);
    if ($st->rowCount() === 0) {
        fail('You are not a member of this project.', 409, 'not_member');
    }
    hm_notify((int) $p['owner_id'], 'system', $me['name'] . ' left "' . $p['title'] . '"', null, 'team.html');
});
ok((object) [], 'You left the team.');
