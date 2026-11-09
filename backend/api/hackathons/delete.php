<?php
/* POST /hackathons/delete.php {id} — ADMIN only. Bookmarks/tags cascade; projects keep existing (hackathon_id → NULL). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
require_admin();
$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Hackathon');
$v->done();
$st = db()->prepare('DELETE FROM hackathons WHERE id = ?');
$st->execute([$id]);
if ($st->rowCount() === 0) {
    fail('Hackathon not found.', 404, 'not_found');
}
ok((object) [], 'Hackathon deleted.');
