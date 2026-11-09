<?php
/* POST /projects/delete.php {id} — only the owner. Members, skills and requests are removed by ON DELETE CASCADE. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Project');
$v->done();

$st = db()->prepare('SELECT owner_id FROM projects WHERE id = ?');
$st->execute([$id]);
$row = $st->fetch();
if (!$row) {
    fail('Project not found.', 404, 'not_found');
}
if ((int) $row['owner_id'] !== $me['id']) {
    fail('Only the project owner can delete this project.', 403, 'forbidden');
}
db()->prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?')->execute([$id, $me['id']]);
ok((object) [], 'Project deleted.');
