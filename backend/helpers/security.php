<?php
/* Sessions, CSRF, origin check, security headers, login throttling. */

function hm_is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443')
        || !empty(hm_config()['force_secure_cookies']);
}

function hm_client_ip(): string
{
    // REMOTE_ADDR only: X-Forwarded-For is client-controlled and would make throttling trivial to bypass.
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function hm_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
}

function hm_cookie_options(int $expires = 0): array
{
    return ['expires' => $expires, 'path' => '/', 'secure' => hm_is_https(), 'httponly' => true, 'samesite' => 'Lax'];
}

function hm_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $cfg = hm_config();
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', (string) $cfg['remember_lifetime']);
    session_name('HMSESSID');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => hm_is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    session_start();

    // Idle timeout (longer for "remember me").
    $now = time();
    $limit = !empty($_SESSION['remember']) ? (int) $cfg['remember_lifetime'] : (int) $cfg['idle_timeout'];
    if (isset($_SESSION['last_active']) && ($now - (int) $_SESSION['last_active']) > $limit) {
        hm_destroy_session();
        session_start();
    }
    $_SESSION['last_active'] = $now;
    // PHP re-sends a session-length cookie on every request; re-issue the long one for "remember me".
    if (!empty($_SESSION['remember'])) {
        setcookie(session_name(), session_id(), hm_cookie_options($now + (int) $cfg['remember_lifetime']));
    }
}

function hm_destroy_session(): void
{
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        if (ini_get('session.use_cookies')) {
            setcookie(session_name(), '', hm_cookie_options(time() - 42000));
        }
        session_destroy();
    }
}

/* Log a user in on this session: regenerates the ID (prevents fixation) and keeps the CSRF token. */
function hm_login_session(int $userId, bool $remember): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    $_SESSION['remember'] = $remember;
    $_SESSION['last_active'] = time();
    if ($remember) {
        setcookie(session_name(), session_id(), hm_cookie_options(time() + (int) hm_config()['remember_lifetime']));
    }
    hm_current_user(true);
}

/* ---------- CSRF ---------- */
function hm_csrf_token(): string
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function hm_check_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '' || $origin === 'null') {
        return; // same-origin requests from some browsers omit it; the CSRF token still protects the request
    }
    $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $port = parse_url($origin, PHP_URL_PORT);
    $originHost = $host . ($port ? ':' . $port : '');
    if ($originHost !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) {
        fail('Cross-site request blocked.', 403, 'bad_origin');
    }
}

/* Called automatically for every non-GET request (bootstrap.php). */
function hm_verify_csrf(): void
{
    hm_check_origin();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $real = $_SESSION['csrf'] ?? '';
    if (!is_string($sent) || $sent === '' || !is_string($real) || $real === '' || !hash_equals($real, $sent)) {
        fail('Your session expired. Please try again.', 403, 'csrf_invalid');
    }
}

/* ---------- throttling (table login_attempts) ---------- */
function hm_attempt_id(string $identifier): string
{
    return hash('sha256', strtolower(trim($identifier)));
}

function hm_is_throttled(string $kind, string $identifier): bool
{
    $pdo = db();
    // Per account (login only): 5 failed attempts / 15 min.
    if ($kind === 'login') {
        $st = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE kind = ? AND succeeded = 0 AND identifier = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)");
        $st->execute([$kind, hm_attempt_id($identifier)]);
        if ((int) $st->fetchColumn() >= 5) {
            return true;
        }
    }
    // Per IP: generous limits, because many students can share one campus Wi-Fi address.
    $limit = $kind === 'login' ? 50 : 20;
    $st = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE kind = ? AND succeeded = 0 AND ip = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)");
    $st->execute([$kind, hm_client_ip()]);
    return (int) $st->fetchColumn() >= $limit;
}

function hm_record_attempt(string $kind, string $identifier, bool $succeeded): void
{
    $pdo = db();
    $pdo->prepare("INSERT INTO login_attempts (kind, ip, identifier, succeeded) VALUES (?, ?, ?, ?)")
        ->execute([$kind, hm_client_ip(), hm_attempt_id($identifier), $succeeded ? 1 : 0]);
    if ($succeeded) {
        $pdo->prepare("DELETE FROM login_attempts WHERE kind = ? AND identifier = ? AND succeeded = 0")->execute([$kind, hm_attempt_id($identifier)]);
    }
    if (random_int(1, 50) === 1) { // opportunistic cleanup
        $pdo->exec("DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)");
    }
}
