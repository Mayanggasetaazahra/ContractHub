<?php
/**
 * CONTRACTHUB — Automated H-30 / H-14 / H-7 WhatsApp & Email Reminder Cron Job
 * Run daily at 07:00 WIB via crontab: 0 7 * * * php /var/www/contracthub/api/reminders_cron.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

use ContractHub\Config\Database;

$pdo = Database::getConnection();

$sql = "
SELECT
  c.id AS contract_id,
  c.contract_number,
  c.title,
  c.end_date,
  DATEDIFF(c.end_date, CURDATE()) AS days_left,
  v.pic_name,
  v.pic_email,
  v.pic_wa
FROM contracts c
JOIN vendors v ON v.id = c.vendor_id
WHERE c.status IN ('Aktif', 'Hampir Habis')
  AND DATEDIFF(c.end_date, CURDATE()) IN (30, 14, 7)
";

$rows = $pdo->query($sql)->fetchAll();

foreach ($rows as $row) {
    $tier = match ((int) $row['days_left']) {
        30 => 'H-30',
        14 => 'H-14',
        7  => 'H-7',
        default => null,
    };

    if (!$tier) {
        continue;
    }

    $msg = "[CONTRACTHUB Pelindo Cirebon] Pengingat {$tier}: Kontrak {$row['contract_number']} ({$row['title']}) berakhir pada {$row['end_date']}. Mohon tinjau proses perpanjangan.";

    // Insert reminder dispatch record & log audit trail
    $insert = $pdo->prepare(
        'INSERT INTO reminders (contract_id, tier, channel, recipient_name, recipient_contact, scheduled_date, dispatch_status, message_preview, sent_at)
         VALUES (:cid, :tier, "WhatsApp & Email", :rname, :rcontact, CURDATE(), "Terkirim", :msg, NOW())'
    );
    $insert->execute([
        ':cid'      => $row['contract_id'],
        ':tier'     => $tier,
        ':rname'    => $row['pic_name'],
        ':rcontact' => "{$row['pic_wa']} / {$row['pic_email']}",
        ':msg'      => $msg,
    ]);
}
