<?php
/**
 * CONTRACTHUB — PT Pelabuhan Indonesia (Persero) Regional 2 Cirebon
 * Database PDO Connection & Security Configuration
 */

declare(strict_types=1);

namespace ContractHub\Config;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $port = getenv('DB_PORT') ?: '3306';
            $db   = getenv('DB_NAME') ?: 'contracthub_pelindo_cirebon';
            $user = getenv('DB_USER') ?: 'contracthub_app';
            $pass = getenv('DB_PASS') ?: '';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Koneksi basis data gagal.']);
                exit;
            }
        }

        return self::$instance;
    }
}
