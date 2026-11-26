<?php
/* Helios Gea — modulo "Pošaljite upit".
   Riceve il modulo del sito e lo invia direttamente a neva@helios-gea.com con la funzione mail()
   dell'hosting: nessun servizio esterno, nessuna attivazione. Risponde in JSON.
   Compatibile con PHP 5.3 e successivi.
   Controllo rapido: aprire https://www.helios-gea.com/invia.php?check=1 nel browser. */

define('HG_TO', 'neva@helios-gea.com');
define('HG_FROM', 'web@helios-gea.com');   // mittente tecnico sullo stesso dominio

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function hg_done($ok, $msg = '', $code = 200, $extra = array()) {
    if (function_exists('http_response_code')) http_response_code($code);
    else header('X-PHP-Response-Code: ' . $code, true, $code);
    echo json_encode(array_merge(array('success' => $ok, 'message' => $msg), $extra));
    exit;
}

/* diagnostica: ?check=1 */
if (isset($_GET['check'])) {
    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    hg_done(true, 'check', 200, array(
        'php' => PHP_VERSION,
        'mail_function' => function_exists('mail') && !in_array('mail', $disabled),
        'sendmail_path' => (string)ini_get('sendmail_path'),
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

/* nessun a-capo nei campi che finiscono nelle intestazioni */
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

$headers = implode("\r\n", array(
    'From: ' . hg_enc('Helios Gea web') . ' <' . HG_FROM . '>',
    'Reply-To: ' . hg_enc($name) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: helios-gea.com',
));

/* prima con il mittente di ritorno (-f), poi senza: alcuni hosting rifiutano il parametro */
$ok = @mail(HG_TO, hg_enc($subject), $body, $headers, '-f' . HG_FROM);
if (!$ok) $ok = @mail(HG_TO, hg_enc($subject), $body, $headers);

if ($ok) hg_done(true);
hg_done(false, 'mail', 500);
