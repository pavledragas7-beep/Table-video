<?php
/* Helios Gea — modulo "Pošaljite upit".
   Invia la richiesta a neva@helios-gea.com. Nessun servizio esterno, nessuna attivazione.
   1) consegna diretta al server di posta dello stesso hosting (SMTP su localhost, la casella è locale);
   2) se configurata, SMTP con autenticazione (vedi HG_SMTP_USER / HG_SMTP_PASS sotto);
   3) funzione mail() di PHP, se l'hosting la permette.
   Compatibile con PHP 5.3 e successivi. Risponde in JSON.
   Controllo rapido: https://www.helios-gea.com/invia.php?check=1 */

define('HG_TO',   'neva@helios-gea.com');
define('HG_FROM', 'neva@helios-gea.com');   // mittente: indirizzo dello stesso dominio
/* Facoltativo, solo se la consegna diretta non basta: una casella del dominio creata in cPanel > Email Accounts.
   La password resta solo qui, sul server. */
define('HG_SMTP_USER', '');
define('HG_SMTP_PASS', '');

@ini_set('display_errors', '0');          // avvisi PHP non devono finire nella risposta JSON
@date_default_timezone_set('Europe/Zagreb');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function hg_done($ok, $msg = '', $code = 200, $extra = array()) {
    if (function_exists('http_response_code')) http_response_code($code);
    else header('X-PHP-Response-Code: ' . $code, true, $code);
    echo json_encode(array_merge(array('success' => $ok, 'message' => $msg), $extra));
    exit;
}
function hg_can($fn) {
    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    return function_exists($fn) && !in_array($fn, $disabled);
}

/* ---------- minimal SMTP client ---------- */
function hg_smtp_read($s) {
    $data = '';
    while (($line = fgets($s, 1024)) !== false) {
        $data .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return $data;
}
function hg_smtp_cmd($s, $cmd, $expect, &$log, $secret = false) {
    if ($cmd !== null) fwrite($s, $cmd . "\r\n");
    $r = hg_smtp_read($s);
    $log[] = ($cmd !== null ? ($secret ? '***' : $cmd) . ' -> ' : '') . trim($r);
    return in_array(substr($r, 0, 3), (array)$expect);
}
/* $mode: 'local' (porta 25, senza autenticazione), 'auth587' (STARTTLS + login), 'auth465' (SSL + login) */
function hg_smtp_send($mode, $from, $to, $data, &$log) {
    $log = array();
    $host = $mode === 'auth465' ? 'ssl://localhost' : 'localhost';
    $port = $mode === 'local' ? 25 : ($mode === 'auth587' ? 587 : 465);
    $ctx = stream_context_create(array('ssl' => array('verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true)));
    $s = @stream_socket_client($host . ':' . $port, $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) { $log[] = "connect $port: $errstr"; return false; }
    stream_set_timeout($s, 10);
    $me = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'helios-gea.com';
    $ok = hg_smtp_cmd($s, null, 220, $log) && hg_smtp_cmd($s, "EHLO $me", 250, $log);
    if ($ok && $mode === 'auth587') {
        $ok = hg_smtp_cmd($s, 'STARTTLS', 220, $log)
           && @stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)
           && hg_smtp_cmd($s, "EHLO $me", 250, $log);
    }
    if ($ok && $mode !== 'local') {
        $ok = hg_smtp_cmd($s, 'AUTH LOGIN', 334, $log)
           && hg_smtp_cmd($s, base64_encode(HG_SMTP_USER), 334, $log, true)
           && hg_smtp_cmd($s, base64_encode(HG_SMTP_PASS), 235, $log, true);
    }
    $ok = $ok && hg_smtp_cmd($s, "MAIL FROM:<$from>", 250, $log)
              && hg_smtp_cmd($s, "RCPT TO:<$to>", array(250, 251), $log)
              && hg_smtp_cmd($s, 'DATA', 354, $log);
    if ($ok) {
        $data = preg_replace('/^\./m', '..', str_replace(array("\r\n", "\r"), "\n", $data));
        fwrite($s, str_replace("\n", "\r\n", $data) . "\r\n.\r\n");
        $ok = hg_smtp_cmd($s, null, 250, $log);
    }
    @fwrite($s, "QUIT\r\n");
    fclose($s);
    return $ok;
}

/* ---------- diagnostica: ?check=1 ---------- */
if (isset($_GET['check'])) {
    $log = array();
    $s = hg_can('stream_socket_client') ? @stream_socket_client('localhost:25', $errno, $errstr, 6) : false;
    $banner = $s ? trim(fgets($s, 512)) : ('no: ' . (isset($errstr) ? $errstr : 'stream_socket_client disabled'));
    if ($s) { fwrite($s, "QUIT\r\n"); fclose($s); }
    hg_done(true, 'check', 200, array(
        'php' => PHP_VERSION,
        'mail_function' => hg_can('mail'),
        'sockets' => hg_can('stream_socket_client'),
        'openssl' => extension_loaded('openssl'),
        'smtp_local_25' => $banner,
        'smtp_login_set' => HG_SMTP_USER !== '',
    ));
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') hg_done(false, 'method', 405);

/* trappola anti-bot: il campo nascosto deve restare vuoto */
if (!empty($_POST['_honey'])) hg_done(true);

function hg_field($k, $max = 200) {
    $v = isset($_POST[$k]) ? trim((string)$_POST[$k]) : '';
    $v = str_replace(array("\r", "\0"), '', $v);
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max, 'UTF-8');
    return substr($v, 0, $max * 2);
}
$name    = hg_field('name');
$email   = hg_field('email');
$phone   = hg_field('phone', 60);
$company = hg_field('company');
$topic   = hg_field('topic', 60);
$message = hg_field('message', 5000);
$consent = !empty($_POST['consent']);

if ($name === '' || $message === '' || !$consent) hg_done(false, 'missing', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   hg_done(false, 'email', 422);

$name  = str_replace("\n", ' ', $name);
$email = str_replace("\n", '', $email);

function hg_enc($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; }

$subject = 'Upit s web stranice helios-gea.com' . ($topic !== '' ? ' · ' . $topic : '');
$body = "Novi upit s web stranice helios-gea.com\n\n"
      . "Ime i prezime: $name\n"
      . "E-mail: $email\n"
      . ($phone   !== '' ? "Telefon: $phone\n"   : '')
      . ($company !== '' ? "Tvrtka: $company\n"  : '')
      . ($topic   !== '' ? "Zanima me: $topic\n" : '')
      . "\nPoruka:\n$message\n\n"
      . "Odgovorite izravno na ovu poruku: odgovor ide na $email";

$hdr = array(
    'From: ' . hg_enc('Helios Gea web') . ' <' . HG_FROM . '>',
    'Reply-To: ' . hg_enc($name) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: helios-gea.com',
);
$full = 'Date: ' . date('r') . "\r\n"
      . 'To: <' . HG_TO . ">\r\n"
      . 'Subject: ' . hg_enc($subject) . "\r\n"
      . 'Message-ID: <' . md5(uniqid('', true)) . '@helios-gea.com>' . "\r\n"
      . implode("\r\n", $hdr) . "\r\n\r\n" . $body;

$ok = false; $log = array();
if (hg_can('stream_socket_client')) {
    $ok = hg_smtp_send('local', HG_FROM, HG_TO, $full, $log);
    if (!$ok && HG_SMTP_USER !== '') $ok = hg_smtp_send('auth587', HG_SMTP_USER, HG_TO, $full, $log);
    if (!$ok && HG_SMTP_USER !== '') $ok = hg_smtp_send('auth465', HG_SMTP_USER, HG_TO, $full, $log);
}
if (!$ok && hg_can('mail')) {
    $h = implode("\r\n", $hdr);
    $ok = @mail(HG_TO, hg_enc($subject), $body, $h, '-f' . HG_FROM);
    if (!$ok) $ok = @mail(HG_TO, hg_enc($subject), $body, $h);
}

if ($ok) hg_done(true);
hg_done(false, 'send', 500, array('smtp' => $log));
