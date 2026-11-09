<?php
/* GET /auth/csrf.php — issues the per-session CSRF token the frontend sends as X-CSRF-Token on every write. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('GET');
ok(['token' => hm_csrf_token()], 'CSRF token issued.');
