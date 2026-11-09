<?php
/* GET /auth/session.php — who am I?
 * data = the current user object, or null when logged out (always HTTP 200, so public pages never redirect).
 * meta = {logged_in, user_id, role} for code that only needs the status. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');

$me = hm_current_user();
if (!$me) {
    ok(null, 'Not logged in.', 200, ['logged_in' => false, 'user_id' => null, 'role' => null]);
}
$user = hm_own_user($me['id']);
ok($user, 'Logged in.', 200, ['logged_in' => true, 'user_id' => $me['id'], 'role' => $me['role']]);
