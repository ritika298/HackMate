<?php
/* HackMate — centralized configuration + PDO connection.
 * Credentials come from config/config.local.php (NOT committed, see config.sample.php)
 * or from environment variables. Nothing here is reachable from the browser: config/.htaccess denies access. */

function hm_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $defaults = [
        'db_host'           => getenv('HM_DB_HOST') ?: 'localhost',
        'db_port'           => getenv('HM_DB_PORT') ?: '3306',
        'db_name'           => getenv('HM_DB_NAME') ?: 'hackmate',
        'db_user'           => getenv('HM_DB_USER') ?: 'root',
        'db_pass'           => getenv('HM_DB_PASS') ?: '',
        'debug'             => false,                 // true only on a dev machine: includes exception text in 500 responses
        'force_secure_cookies' => false,              // true if the site is HTTPS but PHP cannot see it (some proxies/free hosts)
        'idle_timeout'      => 7200,                  // seconds of inactivity before a normal session expires
        'remember_lifetime' => 1209600,               // 14 days, used when "remember me" is ticked
    ];
    $local = __DIR__ . '/config.local.php';
    $override = is_file($local) ? require $local : [];
    $cfg = array_merge($defaults, is_array($override) ? $override : []);
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $c = hm_config();
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_port'], $c['db_name']);
    $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,   // real prepared statements
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);
    $pdo->exec("SET NAMES utf8mb4");
    return $pdo;
}

/* Run $fn inside a transaction; rolls back on any exception (including API errors) and rethrows. */
function hm_tx(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $fn($pdo);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
