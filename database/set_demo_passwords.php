<?php
/* DEV ONLY. Gives every seeded demo user a real password hash so you can log in.
 * Usage (command line only):  php database/set_demo_passwords.php 'SomePassw0rd'
 * Refuses to run from a web request. Never run on production. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../backend/config/database.php';
$pw = $argv[1] ?? '';
if (strlen($pw) < 8) { fwrite(STDERR, "Usage: php set_demo_passwords.php <password of 8+ chars>\n"); exit(1); }
$st = db()->prepare("UPDATE users SET password_hash = ? WHERE email LIKE '%@hackmate.test'");
$st->execute([password_hash($pw, PASSWORD_DEFAULT)]);
echo "Updated {$st->rowCount()} demo users. Log in as shubham@hackmate.test (student) or admin@hackmate.test (admin).\n";
