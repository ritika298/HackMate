
<?php
/* HackMate — centralized configuration + PDO connection.
 * Credentials come from config/config.local.php (NOT committed, see config.sample.php)
 * or from environment variables. Nothing here is reachable from the browser: config/.htaccess denies access.
 */

function hm_config(): array
{
    static $cfg = null;

    if ($cfg !== null) {
        return $cfg;
    }

    $defaults = [
        'environment'          => 'production',
        'db_host'              => getenv('HM_DB_HOST') ?: 'localhost',
        'db_port'              => getenv('HM_DB_PORT') ?: '3306',
        'db_name'              => getenv('HM_DB_NAME') ?: 'hackmate',
        'db_user'              => getenv('HM_DB_USER') ?: 'root',
        'db_pass'              => getenv('HM_DB_PASS') ?: '',
        'debug'                => false,
        'force_secure_cookies' => false,
        'idle_timeout'         => 7200,
        'remember_lifetime'    => 1209600,
    ];

    $local = __DIR__ . '/config.local.php';
    $production = __DIR__ . '/config.production.php';

    $configFile = ($local && is_file($local)) ? $local : $production;

    $override = is_file($configFile) ? require $configFile : [];

    $cfg = array_merge(
        $defaults,
        is_array($override) ? $override : []
    );

    return $cfg;
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $c = hm_config();

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $c['db_host'],
        $c['db_port'],
        $c['db_name']
    );

    $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);

    $pdo->exec("SET NAMES utf8mb4");

    return $pdo;
}

/* Run a callback inside a database transaction. */
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
