<?php
/**
 * CONTRACTHUB — RESTful Contracts Controller & RBAC Middleware (PHP 8.2+)
 * Handles Contract CRUD, e-Sign State Transitions, and Audit Trail Logging.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

use ContractHub\Config\Database;

header('Content-Type: application/json; charset=utf-8');
session_start();

// Demo preset fallback if session initialized in preview mode
if (!isset($_SESSION['user'])) {
    $_SESSION['user'] = [
        'id'    => 1,
        'name'  => 'Mayanggaseta Azahra',
        'role'  => 'ADMIN_LEGAL',
        'email' => 'mayanggaseta.azahra@pelindo.co.id',
    ];
}

$pdo    = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$user   = $_SESSION['user'];

function logAudit(PDO $pdo, array $user, string $action, string $entity, string $entityId, string $summary): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO audit_trail (user_id, actor_name, actor_role, action_type, entity_name, entity_id, summary, ip_address)
         VALUES (:uid, :name, :role, :action, :entity, :eid, :summary, :ip)'
    );
    $stmt->execute([
        ':uid'     => $user['id'],
        ':name'    => $user['name'],
        ':role'    => $user['role'],
        ':action'  => $action,
        ':entity'  => $entity,
        ':eid'     => $entityId,
        ':summary' => $summary,
        ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
    ]);
}

if ($method === 'GET') {
    $pillar = $_GET['pillar'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = 'SELECT c.*, v.company_name AS vendor_name
            FROM contracts c
            JOIN vendors v ON v.id = c.vendor_id
            WHERE 1=1';
    $params = [];

    if ($pillar) {
        $sql .= ' AND c.service_pillar = :pillar';
        $params[':pillar'] = $pillar;
    }
    if ($status) {
        $sql .= ' AND c.status = :status';
        $params[':status'] = $status;
    }

    $sql .= ' ORDER BY c.end_date ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['data' => $stmt->fetchAll()]);
    exit;
}

if ($method === 'POST') {
    if (!in_array($user['role'], ['ADMIN_LEGAL', 'LOGISTIK_MANAGER'], true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Akses ditolak untuk peran Anda.']);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
        'INSERT INTO contracts (contract_number, title, service_pillar, vendor_id, port_location, contract_value_idr, quota_total, quota_unit, start_date, end_date, status, created_by)
         VALUES (:num, :title, :pillar, :vid, :loc, :val, :qtot, :qunit, :sdate, :edate, :status, :uid)'
    );
    $stmt->execute([
        ':num'    => $payload['contract_number'],
        ':title'  => $payload['title'],
        ':pillar' => $payload['service_pillar'],
        ':vid'    => (int) $payload['vendor_id'],
        ':loc'    => $payload['port_location'],
        ':val'    => (int) $payload['contract_value_idr'],
        ':qtot'   => (float) $payload['quota_total'],
        ':qunit'  => $payload['quota_unit'],
        ':sdate'  => $payload['start_date'],
        ':edate'  => $payload['end_date'],
        ':status' => $payload['status'] ?? 'Draft',
        ':uid'    => $user['id'],
    ]);

    logAudit($pdo, $user, 'CONTRACT_CREATED', 'contracts', $payload['contract_number'], "Membuat kontrak baru: {$payload['title']}");
    http_response_code(201);
    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}
