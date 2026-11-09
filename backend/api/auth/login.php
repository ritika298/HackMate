<?php
/* POST /auth/login.php {email,password,remember?}
 * password_verify + session_regenerate_id. Generic error text so attackers cannot learn which emails exist. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');

$in = hm_input();
$v = new V($in);
$email = $v->email('email');
$password = $in['password'] ?? null;
if (!is_string($password) || $password === '' || strlen($password) > 1024) {
    $v->fail('password', 'Enter your password.');
}
$remember = $v->bool('remember') === true;
$v->done();

if (hm_is_throttled('login', $email)) {
    fail('Too many failed attempts. Please wait 15 minutes and try again.', 429, 'rate_limited');
}

$st = db()->prepare('SELECT id, name, role, status, password_hash FROM users WHERE email = ?');
$st->execute([$email]);
$user = $st->fetch();

// Always run one password_verify, even for unknown emails, so response time does not reveal whether the account exists.
static $dummy = null;
$hashToCheck = $user ? $user['password_hash'] : ($dummy ??= password_hash('hackmate-dummy-password', PASSWORD_DEFAULT));
$valid = password_verify($password, $hashToCheck) && $user !== false;

if (!$valid) {
    hm_record_attempt('login', $email, false);
    fail('Incorrect email or password.', 401, 'invalid_credentials');
}
if ($user['status'] !== 'active') {
    fail('This account is not active. Contact support if you think this is a mistake.', 403, 'account_inactive');
}

hm_record_attempt('login', $email, true);
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}
db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);

hm_login_session((int) $user['id'], $remember);
ok(['user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'role' => $user['role']]], 'Logged in successfully.');
