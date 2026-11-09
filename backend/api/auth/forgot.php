<?php
/* POST /auth/forgot.php {email} — always answers success (never reveals whether the email exists).
 * STUB: free PHP hosts rarely allow reliable outbound mail, so no reset email is sent yet. See docs/HANDOFF_ACCOUNT_2.md. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$v = new V(hm_input());
$v->email('email');
$v->done();
ok((object) [], 'If that email exists, a reset link is on its way.');
