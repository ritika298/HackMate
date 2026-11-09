<?php
/* POST /reports/create.php {target_type:'user'|'project', target_id, reason, details?} — any logged-in user. */
require_once __DIR__ . '/../../bootstrap.php';
require_method('POST');
$me = require_login();

$v = new V(hm_input());
$type = $v->enum('target_type', ['user', 'project'], true);
$targetId = $v->int('target_id', 1, 2147483647, true, 'Target');
$reason = $v->enum('reason', ['spam', 'harassment', 'fake_profile', 'inappropriate', 'other'], false, 'other');
$details = $v->str('details', 0, 500, false, 'Details', true);
$v->done();

if ($type === 'user' && $targetId === $me['id']) {
    fail('You cannot report yourself.', 422, 'validation_error', ['target_id' => 'You cannot report yourself.']);
}
$st = db()->prepare($type === 'user' ? 'SELECT 1 FROM users WHERE id = ?' : 'SELECT 1 FROM projects WHERE id = ?');
$st->execute([$targetId]);
if (!$st->fetch()) {
    fail('That ' . $type . ' does not exist.', 404, 'not_found');
}
$col = $type === 'user' ? 'target_user_id' : 'target_project_id';
$st = db()->prepare("SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND $col = ? AND status IN ('open','reviewing')");
$st->execute([$me['id'], $type, $targetId]);
if ($st->fetch()) {
    fail('You have already reported this. Our team is reviewing it.', 409, 'duplicate_report');
}
// exactly one target column is filled, matching target_type (rule enforced here, not in SQL)
db()->prepare("INSERT INTO reports (reporter_id, target_type, $col, reason, details) VALUES (?, ?, ?, ?, ?)")
    ->execute([$me['id'], $type, $targetId, $reason, $details]);
ok(['id' => (int) db()->lastInsertId()], 'Report submitted. Thank you.', 201);
