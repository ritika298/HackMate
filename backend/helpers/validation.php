<?php
/* Input parsing and validation. Errors are collected per field and returned together (HTTP 422). */

function hm_input(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($m === 'GET' || $m === 'HEAD') {
        return $cache = [];
    }
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    if ($raw === false || $raw === '') {
        return $cache = is_array($_POST) ? $_POST : [];
    }
    if (strlen($raw) > 65536) {
        fail('Request body too large.', 413, 'too_large');
    }
    $data = json_decode($raw, true, 8);
    if (!is_array($data)) {
        fail('Request body must be valid JSON.', 400, 'bad_json');
    }
    return $cache = $data;
}

function hm_clean_text(string $s, bool $multiline = false): string
{
    $s = str_replace("\0", '', $s);
    // Remove control characters only (\p{Cc}); keep format characters such as ZWJ/ZWNJ that emoji and Indic scripts need.
    $s = preg_replace($multiline ? '/[^\P{Cc}\n\t]/u' : '/\p{Cc}+/u', $multiline ? '' : ' ', $s) ?? '';
    $s = str_replace("\r", '', $s);
    return trim($s);
}

function hm_query_int(string $key, int $min, int $max, ?int $default = null): ?int
{
    if (!isset($_GET[$key]) || $_GET[$key] === '') {
        return $default;
    }
    $v = $_GET[$key];
    if (!is_string($v) || !preg_match('/^\d{1,9}$/', $v)) {
        fail("Invalid value for '$key'.", 422, 'validation_error', [$key => 'Must be a number.']);
    }
    $n = (int) $v;
    if ($n < $min || $n > $max) {
        fail("Invalid value for '$key'.", 422, 'validation_error', [$key => "Must be between $min and $max."]);
    }
    return $n;
}

function hm_query_str(string $key, int $max = 100): string
{
    $v = $_GET[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    return mb_substr(hm_clean_text($v), 0, $max);
}

/* Escape LIKE wildcards. Use with: LIKE ? ESCAPE '|' */
function hm_like(string $s): string
{
    return '%' . str_replace(['|', '%', '_'], ['||', '|%', '|_'], $s) . '%';
}

function hm_page(int $defaultLimit = 50, int $maxLimit = 100): array
{
    $limit = hm_query_int('limit', 1, $maxLimit, $defaultLimit);
    $page = hm_query_int('page', 1, 100000, 1);
    return [$limit, ($page - 1) * $limit]; // ints, safe to inline into LIMIT/OFFSET
}

final class V
{
    public array $errors = [];
    private array $in;

    public function __construct(array $input)
    {
        $this->in = $input;
    }

    public function has(string $k): bool
    {
        return array_key_exists($k, $this->in);
    }

    private function err(string $k, string $m): void
    {
        if (!isset($this->errors[$k])) {
            $this->errors[$k] = $m;
        }
    }

    private function label(string $k, string $label): string
    {
        return $label !== '' ? $label : ucfirst(str_replace('_', ' ', $k));
    }

    private function missing(string $k)
    {
        $v = $this->in[$k] ?? null;
        return $v === null || (is_string($v) && trim($v) === '');
    }

    public function fail(string $k, string $message): void
    {
        $this->err($k, $message);
    }

    public function str(string $k, int $min, int $max, bool $required = true, string $label = '', bool $multiline = false): ?string
    {
        $label = $this->label($k, $label);
        if ($this->missing($k)) {
            if ($required) {
                $this->err($k, "$label is required.");
            }
            return null;
        }
        $v = $this->in[$k];
        if (!is_string($v) || !mb_check_encoding($v, 'UTF-8')) {
            $this->err($k, "$label must be text.");
            return null;
        }
        $v = hm_clean_text($v, $multiline);
        $len = mb_strlen($v);
        if ($len < $min) {
            $this->err($k, "$label must be at least $min characters.");
            return null;
        }
        if ($len > $max) {
            $this->err($k, "$label must be at most $max characters.");
            return null;
        }
        return $v;
    }

    public function int(string $k, int $min, int $max, bool $required = true, string $label = ''): ?int
    {
        $label = $this->label($k, $label);
        if ($this->missing($k)) {
            if ($required) {
                $this->err($k, "$label is required.");
            }
            return null;
        }
        $v = $this->in[$k];
        if (is_string($v) && preg_match('/^-?\d{1,9}$/', $v)) {
            $v = (int) $v;
        }
        if (!is_int($v)) {
            $this->err($k, "$label must be a whole number.");
            return null;
        }
        if ($v < $min || $v > $max) {
            $this->err($k, "$label must be between $min and $max.");
            return null;
        }
        return $v;
    }

    public function bool(string $k, bool $required = false): ?bool
    {
        if (!array_key_exists($k, $this->in) || $this->in[$k] === null || $this->in[$k] === '') {
            if ($required) {
                $this->err($k, $this->label($k, '') . ' is required.');
            }
            return null;
        }
        $v = $this->in[$k];
        if ($v === true || $v === 1 || $v === '1' || $v === 'true') {
            return true;
        }
        if ($v === false || $v === 0 || $v === '0' || $v === 'false') {
            return false;
        }
        $this->err($k, $this->label($k, '') . ' must be true or false.');
        return null;
    }

    public function enum(string $k, array $allowed, bool $required = true, ?string $default = null): ?string
    {
        if ($this->missing($k)) {
            if ($required) {
                $this->err($k, $this->label($k, '') . ' is required.');
            }
            return $default;
        }
        $v = $this->in[$k];
        if (!is_string($v) || !in_array($v, $allowed, true)) {
            $this->err($k, $this->label($k, '') . ' must be one of: ' . implode(', ', $allowed) . '.');
            return null;
        }
        return $v;
    }

    public function email(string $k, bool $required = true): ?string
    {
        $v = $this->str($k, 3, 190, $required, 'Email');
        if ($v === null) {
            return null;
        }
        $v = strtolower($v);
        if (!filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $this->err($k, 'Enter a valid email address.');
            return null;
        }
        return $v;
    }

    /* http(s) URL whose host is one of $hosts (or a subdomain of one). Empty → null. */
    public function url(string $k, array $hosts = [], string $label = ''): ?string
    {
        $label = $this->label($k, $label);
        if ($this->missing($k)) {
            return null;
        }
        $v = $this->str($k, 8, 255, false, $label);
        if ($v === null) {
            return null;
        }
        $p = parse_url($v);
        $scheme = strtolower((string) ($p['scheme'] ?? ''));
        $host = strtolower((string) ($p['host'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true) || $host === '' || isset($p['user']) || isset($p['pass'])) {
            $this->err($k, "$label must be a valid http(s) link.");
            return null;
        }
        if ($hosts) {
            $okHost = false;
            foreach ($hosts as $h) {
                if ($host === $h || (strlen($host) > strlen($h) && substr($host, -strlen($h) - 1) === '.' . $h)) {
                    $okHost = true;
                }
            }
            if (!$okHost) {
                $this->err($k, "$label must be a " . $hosts[0] . ' link.');
                return null;
            }
        }
        return $v;
    }

    /* List of short strings (skills, roles, interests). Returns null when the key is absent. */
    public function list(string $k, int $maxItems, int $maxLen): ?array
    {
        if (!array_key_exists($k, $this->in) || $this->in[$k] === null) {
            return null;
        }
        $label = $this->label($k, '');
        if (!is_array($this->in[$k])) {
            $this->err($k, "$label must be a list.");
            return null;
        }
        $out = [];
        $seen = [];
        foreach ($this->in[$k] as $item) {
            if (!is_string($item)) {
                $this->err($k, "$label must contain only text.");
                return null;
            }
            $item = hm_clean_text($item);
            if ($item === '') {
                continue;
            }
            if (mb_strlen($item) > $maxLen || strpos($item, ',') !== false) {
                $this->err($k, "Each item in $label must be at most $maxLen characters and contain no commas.");
                return null;
            }
            $key = mb_strtolower($item);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $out[] = $item;
            }
        }
        if (count($out) > $maxItems) {
            $this->err($k, "$label can have at most $maxItems items.");
            return null;
        }
        return $out;
    }

    public function date(string $k, bool $required = true, string $label = ''): ?string
    {
        $label = $this->label($k, $label);
        if ($this->missing($k)) {
            if ($required) {
                $this->err($k, "$label is required.");
            }
            return null;
        }
        $v = $this->in[$k];
        $d = is_string($v) ? DateTime::createFromFormat('!Y-m-d', $v) : false;
        if (!$d || $d->format('Y-m-d') !== $v) {
            $this->err($k, "$label must be a date (YYYY-MM-DD).");
            return null;
        }
        return $v;
    }

    public function done(): void
    {
        if ($this->errors) {
            fail('Please fix the highlighted fields.', 422, 'validation_error', $this->errors);
        }
    }
}
