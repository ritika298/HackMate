<?php
/* POST /hackathons/save.php {id, saved?: true|false}  — bookmark (default) or remove the bookmark (saved:false). Idempotent.
 * The user comes from the session. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, true, 'Hackathon');
$saved = $v->bool('saved');
$v->done();
$saved = $saved ?? true;

$st = db()->prepare("SELECT 1 FROM hackathons WHERE id = ? AND status = 'published'");
$st->execute([$id]);
if (!$st->fetch()) {
    fail('Hackathon not found.', 404, 'not_found');
}
if ($saved) {
    db()->prepare('INSERT IGNORE INTO saved_hackathons (user_id, hackathon_id) VALUES (?, ?)')->execute([$me['id'], $id]);
} else {
    db()->prepare('DELETE FROM saved_hackathons WHERE user_id = ? AND hackathon_id = ?')->execute([$me['id'], $id]);
}
ok(['id' => $id, 'is_saved' => $saved], $saved ? 'Hackathon saved.' : 'Bookmark removed.');
