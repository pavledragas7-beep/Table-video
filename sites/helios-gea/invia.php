<?php
/* Helios Gea — modulo "Pošaljite upit".
   Riceve il modulo del sito e lo invia direttamente a neva@helios-gea.com con la funzione mail()
   dell'hosting: nessun servizio esterno, nessuna attivazione. Risponde in JSON. */

const TO   = 'neva@helios-gea.com';
const FROM = 'web@helios-gea.com';   // mittente tecnico sullo stesso dominio (migliore consegna)

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function done(bool $ok, string $msg = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') done(false, 'method', 405);

/* trappola anti-bot: il campo nascosto deve restare vuoto */
if (!empty($_POST['_honey'])) done(true);

function field(string $k, int $max = 200): string {
    $v = trim((string)($_POST[$k] ?? ''));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max, 'UTF-8');
}
$name    = field('name');
$email   = field('email');
$phone   = field('phone', 60);
$company = field('company');
$topic   = field('topic', 60);
$message = field('message', 5000);
$consent = !empty($_POST['consent']);

if ($name === '' || $message === '' || !$consent) done(false, 'missing', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   done(false, 'email', 422);

/* nessun a-capo nei campi che finiscono nelle intestazioni */
$name  = str_replace("\n", ' ', $name);
$email = str_replace("\n", '', $email);

$subject = 'Upit s web stranice helios-gea.com' . ($topic !== '' ? " · $topic" : '');
$body = "Novi upit s web stranice helios-gea.com\n\n"
      . "Ime i prezime: $name\n"
      . "E-mail: $email\n"
      . ($phone   !== '' ? "Telefon: $phone\n"   : '')
      . ($company !== '' ? "Tvrtka: $company\n"  : '')
      . ($topic   !== '' ? "Zanima me: $topic\n" : '')
      . "\nPoruka:\n$message\n\n"
      . "— Odgovorite izravno na ovu poruku: odgovor ide na $email";

$enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$headers = implode("\r\n", [
    'From: ' . $enc('Helios Gea · web') . ' <' . FROM . '>',
    'Reply-To: ' . $enc($name) . " <$email>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: helios-gea.com',
]);

$ok = @mail(TO, $enc($subject), $body, $headers, '-f' . FROM);
$ok ? done(true) : done(false, 'mail', 500);
