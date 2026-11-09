<?php
/* POST /admin/action.php {entity, id?, action, …} — ADMIN only (role re-checked in the database on every call).
 *   user      : suspend | activate                 (cannot suspend yourself or another admin)
 *   project   : close | reopen | delete
 *   hackathon : feature | unfeature | archive | publish | delete | create(+fields)
 *   report    : review | resolve | dismiss
 *   skill     : create(+name) | delete */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$admin = require_admin();

$in = hm_input();
$v = new V($in);
$entity = $v->enum('entity', ['user', 'project', 'hackathon', 'report', 'skill'], true);
$action = $v->str('action', 2, 20, true, 'Action');
$id = $v->int('id', 1, 2147483647, false, 'Id');
$v->done();
$pdo = db();
$needId = function () use ($id) {
    if ($id === null) {
        fail('An id is required for this action.', 422, 'validation_error', ['id' => 'Id is required.']);
    }
};
$bad = fn() => fail('Unknown action for ' . $entity . '.', 422, 'validation_error', ['action' => 'Not a valid action.']);
$affected = function (PDOStatement $st, string $what) {
    if ($st->rowCount() === 0) {
        fail($what . ' not found (or nothing to change).', 404, 'not_found');
    }
};

switch ($entity) {
    case 'user':
        $needId();
        if (!in_array($action, ['suspend', 'activate'], true)) { $bad(); }
        if ($id === $admin['id']) {
            fail('You cannot change your own account status.', 409, 'forbidden_target');
        }
        $st = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $st->execute([$id]);
        $role = $st->fetchColumn();
        if ($role === false) { fail('User not found.', 404, 'not_found'); }
        if ($role === 'admin') { fail('Admin accounts cannot be suspended here.', 409, 'forbidden_target'); }
        $pdo->prepare('UPDATE users SET status = ? WHERE id = ?')->execute([$action === 'suspend' ? 'suspended' : 'active', $id]);
        $msg = $action === 'suspend' ? 'User suspended.' : 'User reactivated.';
        break;

    case 'project':
        $needId();
        if ($action === 'delete') {
            $st = $pdo->prepare('DELETE FROM projects WHERE id = ?');
        } elseif (in_array($action, ['close', 'reopen'], true)) {
            $st = $pdo->prepare('UPDATE projects SET status = ? WHERE id = ?');
        } else { $bad(); }
        $action === 'delete' ? $st->execute([$id]) : $st->execute([$action === 'close' ? 'closed' : 'open', $id]);
        if ($st->rowCount() === 0) {
            $chk = $pdo->prepare('SELECT 1 FROM projects WHERE id = ?'); $chk->execute([$id]);
            if (!$chk->fetch()) { fail('Project not found.', 404, 'not_found'); }
        }
        $msg = ['close' => 'Project closed.', 'reopen' => 'Project reopened.', 'delete' => 'Project deleted.'][$action];
        break;

    case 'hackathon':
        if ($action === 'create') {
            $newId = hm_save_hackathon($in, null, $admin['id']);
            ok(['id' => $newId], 'Hackathon created.', 201);
        }
        $needId();
        if ($action === 'delete') {
            $st = $pdo->prepare('DELETE FROM hackathons WHERE id = ?'); $st->execute([$id]); $affected($st, 'Hackathon');
        } else {
            $map = ['feature' => ['is_featured', 1], 'unfeature' => ['is_featured', 0], 'archive' => ['status', 'archived'], 'publish' => ['status', 'published']];
            if (!isset($map[$action])) { $bad(); }
            $chk = $pdo->prepare('SELECT 1 FROM hackathons WHERE id = ?'); $chk->execute([$id]);
            if (!$chk->fetch()) { fail('Hackathon not found.', 404, 'not_found'); }
            [$col, $val] = $map[$action];
            $pdo->prepare("UPDATE hackathons SET $col = ? WHERE id = ?")->execute([$val, $id]); // $col comes from the fixed map above, never from input
        }
        $msg = 'Hackathon updated.';
        break;

    case 'report':
        $needId();
        $map = ['review' => 'reviewing', 'resolve' => 'resolved', 'dismiss' => 'dismissed'];
        if (!isset($map[$action])) { $bad(); }
        $final = $action !== 'review';
        $st = $pdo->prepare('UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ' . ($final ? 'NOW()' : 'NULL') . ' WHERE id = ?');
        $st->execute([$map[$action], $final ? $admin['id'] : null, $id]);
        $chk = $pdo->prepare('SELECT 1 FROM reports WHERE id = ?'); $chk->execute([$id]);
        if (!$chk->fetch()) { fail('Report not found.', 404, 'not_found'); }
        $msg = 'Report updated.';
        break;

    case 'skill':
        if ($action === 'create') {
            $vv = new V($in);
            $name = $vv->str('name', 2, 60, true, 'Skill name');
            if ($name !== null && strpos($name, ',') !== false) { $vv->fail('name', 'Skill names cannot contain commas.'); }
            $vv->done();
            try {
                $pdo->prepare("INSERT INTO skills (name, category) VALUES (?, 'other')")->execute([$name]);
            } catch (PDOException $e) {
                if (($e->errorInfo[1] ?? 0) === 1062) { fail('That skill already exists.', 409, 'duplicate', ['name' => 'That skill already exists.']); }
                throw $e;
            }
            ok(['id' => (int) $pdo->lastInsertId()], 'Skill added.', 201);
        }
        if ($action !== 'delete') { $bad(); }
        $needId();
        $st = $pdo->prepare('DELETE FROM skills WHERE id = ?'); $st->execute([$id]); $affected($st, 'Skill');
        $msg = 'Skill deleted.';
        break;
}
ok((object) [], $msg ?? 'Done.');
