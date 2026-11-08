<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, bool $ok): void {
    http_response_code($status);
    echo json_encode(['ok' => $ok]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, false);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) respond(413, false);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && strtolower((string)parse_url($origin, PHP_URL_HOST)) !== strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0])) respond(403, false);

function field(string $key, int $max): string {
    if (!isset($_POST[$key]) || !is_string($_POST[$key])) return '';
    $value = trim($_POST[$key]);
    if (strlen($value) > $max || str_contains($value, "\0")) respond(422, false);
    return $value;
}
if (field('website', 200) !== '') respond(422, false);
$name = field('name', 200);
$email = field('email', 254);
$company = field('company', 200);
$phone = field('phone', 200);
$message = field('message', 10000);
$request = field('request', 30);
$started = field('started', 20);
if ($started !== '' && (!ctype_digit($started) || microtime(true) * 1000 - (float)$started < 2000)) respond(422, false);
if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email) || !in_array($request, ['consultation', 'evaluation'], true)) respond(422, false);

// Locked file makes the rate limit effective across concurrent PHP workers.
$ratePath = sys_get_temp_dir() . '/w4e-contact-' . hash('sha256', __DIR__ . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$rate = @fopen($ratePath, 'c+');
if (!$rate || !flock($rate, LOCK_EX)) respond(503, false);
$previous = (int)stream_get_contents($rate);
if (time() - $previous < 60) { fclose($rate); respond(429, false); }

$config = ['recipient' => getenv('W4E_CONTACT_TO') ?: '', 'sender' => getenv('W4E_CONTACT_FROM') ?: ''];
if (is_file(__DIR__ . '/server-config.php')) {
    $fileConfig = require __DIR__ . '/server-config.php';
    if (is_array($fileConfig)) $config = array_merge($config, $fileConfig);
}
foreach (['recipient', 'sender'] as $key) {
    if (!filter_var($config[$key] ?? '', FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $config[$key])) { fclose($rate); respond(503, false); }
}
$subject = $request === 'evaluation' ? 'Waste4Energy - Request Waste Evaluation' : 'Waste4Energy - Request Consultation';
$body = "Name: $name\nEmail: $email\nCompany: $company\nPhone: $phone\n\n$message\n";
$headers = ['From' => $config['sender'], 'Reply-To' => $email, 'Content-Type' => 'text/plain; charset=UTF-8'];
$sent = @mail($config['recipient'], $subject, $body, $headers);
if ($sent) { rewind($rate); ftruncate($rate, 0); fwrite($rate, (string)time()); }
flock($rate, LOCK_UN);
fclose($rate);
respond($sent ? 200 : 503, $sent);
