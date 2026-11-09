<?php
/* Loaded first by every endpoint: config, helpers, error handling, session, CSRF. */
define('HM_BACKEND', __DIR__);
error_reporting(E_ALL);
ini_set('display_errors', '0');   // never leak PHP/SQL errors to visitors
ini_set('log_errors', '1');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/security.php';
require_once __DIR__ . '/helpers/validation.php';
require_once __DIR__ . '/helpers/data.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/middleware/admin.php';

set_exception_handler(function (Throwable $e) {
    if ($e instanceof HmApiError) {
        hm_emit_error($e);
    }
    error_log('[HackMate] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $msg = 'Something went wrong on our side. Please try again.';
    if (!empty(hm_config()['debug'])) {
        $msg .= ' [' . get_class($e) . ': ' . $e->getMessage() . ']';
    }
    hm_emit_error(new HmApiError($msg, 500, 'server_error'));
});

set_error_handler(function (int $no, string $str, string $file, int $line) {
    error_log("[HackMate] PHP notice/warning ($no): $str @ $file:$line"); // logged, never shown to visitors
    return true;
});

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true) && !headers_sent()) {
        error_log('[HackMate] fatal: ' . $e['message'] . ' @ ' . $e['file'] . ':' . $e['line']);
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo '{"success":false,"ok":false,"message":"Something went wrong on our side. Please try again.","error":{"code":"server_error","message":"Something went wrong on our side. Please try again.","fields":{}}}';
    }
});

hm_security_headers();
hm_start_session();

$hmMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($hmMethod, ['GET', 'HEAD'], true)) {
    hm_verify_csrf();   // every state-changing request needs the X-CSRF-Token header
}
