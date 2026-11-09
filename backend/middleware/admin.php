<?php
/* Admin middleware: logged in AND role = 'admin' (checked against the database, not the session). */
require_once __DIR__ . '/auth.php';

function require_admin(): array
{
    $u = require_login();
    if ($u['role'] !== 'admin') {
        fail('You do not have permission to do that.', 403, 'forbidden');
    }
    return $u;
}
