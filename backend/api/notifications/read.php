<?php
/* POST /notifications/read.php {id} marks one as read; {} (no id) marks all of MY notifications as read. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();
$v = new V(hm_input());
$id = $v->int('id', 1, 2147483647, false, 'Notification');
$v->done();
if ($id === null) {
    db()->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([$me['id']]);
} else {
    db()->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')->execute([$id, $me['id']]);
}
ok((object) [], 'Marked as read.');
