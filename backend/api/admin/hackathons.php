<?php
/* GET /admin/hackathons.php — ADMIN only; includes drafts and archived events. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$admin = require_admin();
ok(hm_query_hackathons('1 = 1', [], $admin['id'], 'h.start_date DESC, h.id DESC', 200, 0), 'Hackathons loaded.');
