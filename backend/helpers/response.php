<?php
/* JSON response helpers. Every endpoint answers with the same envelope.
 * Success: {"success":true,"ok":true,"message":"…","data":…,"meta":{…}}
 * Error:   {"success":false,"ok":false,"message":"…","error":{"code":"…","message":"…","fields":{…}}}
 * ("ok" + "error" are what frontend/js/api.js reads; "success" + "message" follow the project brief.) */

class HmApiError extends Exception
{
    public int $status;
    public string $errorCode;
    public array $fields;
    public function __construct(string $message, int $status = 400, string $errorCode = 'error', array $fields = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->fields = $fields;
    }
}

function hm_json_flags(): int
{
    return JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR;
}

function hm_emit(int $status, array $payload): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($payload, hm_json_flags());
    exit;
}

function ok($data = null, string $message = 'OK', int $status = 200, array $meta = []): void
{
    hm_emit($status, [
        'success' => true,
        'ok'      => true,
        'message' => $message,
        'data'    => $data,
        'meta'    => (object) $meta,
    ]);
}

/* Throws; the global handler in bootstrap.php turns it into the error envelope. */
function fail(string $message, int $status = 400, string $code = 'error', array $fields = []): void
{
    throw new HmApiError($message, $status, $code, $fields);
}

function hm_emit_error(HmApiError $e): void
{
    hm_emit($e->status, [
        'success' => false,
        'ok'      => false,
        'message' => $e->getMessage(),
        'error'   => ['code' => $e->errorCode, 'message' => $e->getMessage(), 'fields' => (object) $e->fields],
    ]);
}

function require_method(string ...$allowed): string
{
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($m, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        fail('Method not allowed.', 405, 'method_not_allowed');
    }
    return $m;
}
