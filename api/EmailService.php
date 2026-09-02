<?php
class EmailService {
    private $config;
    private $lastResponse;

    public function __construct(array $config) {
        $this->config = $config;
    }

    public function send(string $to, string $subject, string $body): bool {
        $config = $this->config;
        if (empty($config['username']) || empty($config['password'])) {
            error_log("EmailService: SMTP no configurado");
            return false;
        }

        $smtp = @stream_socket_client(
            'tcp://' . $config['host'] . ':' . $config['port'],
            $errno, $errstr, 30
        );
        if (!$smtp) {
            error_log("EmailService: No se pudo conectar - $errstr");
            return false;
        }

        if (!$this->readOk($smtp)) { $this->log("conexión inicial"); fclose($smtp); return false; }

        $this->write($smtp, "EHLO catbling");
        if (!$this->readOk($smtp)) { $this->log("EHLO"); fclose($smtp); return false; }

        $this->write($smtp, "STARTTLS");
        if (!$this->readOk($smtp)) { $this->log("STARTTLS"); fclose($smtp); return false; }

        if (!stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $this->log("Error al iniciar TLS");
            fclose($smtp);
            return false;
        }

        $this->write($smtp, "EHLO catbling");
        if (!$this->readOk($smtp)) { $this->log("EHLO después de TLS"); fclose($smtp); return false; }

        $this->write($smtp, "AUTH LOGIN");
        if (!$this->readOk($smtp)) { $this->log("AUTH LOGIN"); fclose($smtp); return false; }

        $this->write($smtp, base64_encode($config['username']));
        if (!$this->readOk($smtp)) { $this->log("AUTH username"); fclose($smtp); return false; }

        $this->write($smtp, base64_encode($config['password']));
        if (!$this->readOk($smtp)) { $this->log("AUTH password"); fclose($smtp); return false; }

        $this->write($smtp, "MAIL FROM:<{$config['from_email']}>");
        if (!$this->readOk($smtp)) { $this->log("MAIL FROM"); fclose($smtp); return false; }

        $this->write($smtp, "RCPT TO:<{$to}>");
        if (!$this->readOk($smtp)) { $this->log("RCPT TO"); fclose($smtp); return false; }

        $this->write($smtp, "DATA");
        if (!$this->readOk($smtp)) { $this->log("DATA"); fclose($smtp); return false; }

        $headers = "From: {$config['from_name']} <{$config['from_email']}>\r\n"
                 . "To: <{$to}>\r\n"
                 . "Subject: $subject\r\n"
                 . "MIME-Version: 1.0\r\n"
                 . "Content-Type: text/html; charset=UTF-8\r\n"
                 . "\r\n";

        $this->write($smtp, $headers . $body . "\r\n.");
        if (!$this->readOk($smtp)) { $this->log("DATA contenido"); fclose($smtp); return false; }

        $this->write($smtp, "QUIT");
        fclose($smtp);
        return true;
    }

    private function write($conn, string $data): void {
        fwrite($conn, $data . "\r\n");
    }

    private function read($conn): string {
        $resp = '';
        while ($line = fgets($conn, 512)) {
            $resp .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        $this->lastResponse = $resp;
        return $resp;
    }

    private function readOk($conn): bool {
        $resp = $this->read($conn);
        $code = (int)substr($resp, 0, 3);
        return $code >= 200 && $code < 400;
    }

    private function log(string $step): void {
        error_log("EmailService: Falló en step '$step'. Última respuesta: " . ($this->lastResponse ?? 'sin respuesta'));
    }
}
