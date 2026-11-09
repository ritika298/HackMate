<?php
/* Authentication middleware. The current user ALWAYS comes from the server session, never from request data.
 * The user row is re-read on every request, so suspending an account or changing a role takes effect immediately. */

function hm_current_user(bool $refresh = false): ?array
{
    static $loaded = false;
    static $user = null;
    if ($loaded && !$refresh) {
        return $user;
    }
    $loaded = true;
    $user = null;
    $id = $_SESSION['uid'] ?? null;
    if (!is_int($id)) {
        return null;
    }
    $st = db()->prepare('SELECT id, name, role, status, campus_id FROM users WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row || $row['status'] !== 'active') {
        hm_destroy_session();
        return null;
    }
    $row['id'] = (int) $row['id'];
    $row['campus_id'] = (int) $row['campus_id'];
    return $user = $row;
}

function require_login(): array
{
    $u = hm_current_user();
    if (!$u) {
        fail('Please log in to continue.', 401, 'unauthenticated');
    }
    return $u;
}
