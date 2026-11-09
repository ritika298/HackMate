<?php
/* POST /auth/register.php {name,email,password,confirm_password?,campus_id,branch,year}
 * Creates users + profiles rows, logs the new user in. Role is ALWAYS 'student' (never read from the request). */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');

if (hm_current_user()) {
    fail('You are already logged in.', 409, 'already_authenticated');
}
$in = hm_input();
$v = new V($in);
$name = $v->str('name', 2, 100, true, 'Name');
$email = $v->email('email');
$password = $in['password'] ?? null;
if (!is_string($password) || $password === '') {
    $v->fail('password', 'Choose a password.');
} elseif (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
    $v->fail('password', 'Use 8+ characters with at least one letter and one number.');
} elseif (strlen($password) > 72) {
    $v->fail('password', 'Password must be at most 72 characters.'); // bcrypt ignores everything after 72 bytes
}
if (isset($in['confirm_password']) && $in['confirm_password'] !== $password) {
    $v->fail('confirm_password', 'Passwords do not match.');
}
$campusId = $v->int('campus_id', 1, 2147483647, true, 'Campus');
$branch = $v->str('branch', 2, 100, true, 'Branch');
$year = $v->int('year', 1, 6, true, 'Year');
$v->done();

$pdo = db();
$throttleKey = 'register:' . hm_client_ip();
if (hm_is_throttled('register', $throttleKey)) {
    fail('Too many sign-up attempts. Please wait a few minutes and try again.', 429, 'rate_limited');
}
// Count every registration attempt from this IP (successful ones too) so one address cannot mass-create accounts.
hm_record_attempt('register', $throttleKey, false);

$st = $pdo->prepare('SELECT id FROM campuses WHERE id = ? AND is_active = 1');
$st->execute([$campusId]);
if (!$st->fetch()) {
    fail('Please fix the highlighted fields.', 422, 'validation_error', ['campus_id' => 'Select a valid campus.']);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
try {
    $userId = hm_tx(function ($pdo) use ($campusId, $name, $email, $hash, $branch, $year) {
        $st = $pdo->prepare('SELECT 1 FROM users WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) {
            fail('Please fix the highlighted fields.', 422, 'validation_error', ['email' => 'This email is already registered.']);
        }
        $pdo->prepare("INSERT INTO users (campus_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'student', 'active')")
            ->execute([$campusId, $name, $email, $hash]);
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO profiles (user_id, branch, year) VALUES (?, ?, ?)')->execute([$id, $branch, $year]);
        return $id;
    });
} catch (PDOException $e) {
    if (($e->errorInfo[1] ?? 0) === 1062) { // two sign-ups with the same email at the same moment
        fail('Please fix the highlighted fields.', 422, 'validation_error', ['email' => 'This email is already registered.']);
    }
    throw $e;
}

hm_login_session($userId, false);
ok(['user' => ['id' => $userId, 'name' => $name, 'role' => 'student']], 'Account created successfully.', 201);
