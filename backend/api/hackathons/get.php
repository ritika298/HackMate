<?php
/* GET /hackathons/get.php?id=N — one hackathon. Drafts/archived are visible to admins only. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
$me = hm_current_user();
$id = hm_query_int('id', 1, 2147483647, null);
if ($id === null) {
    fail('Hackathon id is required.', 422, 'validation_error', ['id' => 'Hackathon id is required.']);
}
$isAdmin = $me && $me['role'] === 'admin';
$rows = hm_query_hackathons($isAdmin ? 'h.id = ?' : "h.id = ? AND h.status = 'published'", [$id], $me ? $me['id'] : 0, 'h.id', 1, 0);
if (!$rows) {
    fail('Hackathon not found.', 404, 'not_found');
}
ok($rows[0], 'Hackathon loaded.');
