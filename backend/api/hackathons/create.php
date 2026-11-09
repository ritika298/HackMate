<?php
/* POST /hackathons/create.php — ADMIN only. {name,organizer,description?,mode?,location?,start_date,end_date,registration_deadline,registration_url?,prize_info?,is_featured?,status?,skills[]?} */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$admin = require_admin();
$id = hm_save_hackathon(hm_input(), null, $admin['id']);
$rows = hm_query_hackathons('h.id = ?', [$id], $admin['id'], 'h.id', 1, 0);
ok($rows[0], 'Hackathon created.', 201);
