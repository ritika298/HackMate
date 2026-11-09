<?php
/* POST /hackathons/update.php {id, …fields to change} — ADMIN only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$admin = require_admin();
$in = hm_input();
$v = new V($in);
$id = $v->int('id', 1, 2147483647, true, 'Hackathon');
$v->done();
hm_save_hackathon($in, $id, $admin['id']);
$rows = hm_query_hackathons('h.id = ?', [$id], $admin['id'], 'h.id', 1, 0);
ok($rows[0], 'Hackathon updated.');
