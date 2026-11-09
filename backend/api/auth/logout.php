<?php
/* POST /auth/logout.php — destroys the session and expires the cookie. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
hm_destroy_session();
ok((object) [], 'Logged out.');
