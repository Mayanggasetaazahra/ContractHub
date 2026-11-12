-- ============================================================================
-- CONTRACTHUB — PT PELABUHAN INDONESIA (PERSERO) REGIONAL 2 CIREBON
-- Database Schema & Seed Data (MySQL 8.0+ / MariaDB 10.6+)
-- Entities (10): roles, users, vendors, contracts, documents, reminders,
--                renewals, usage_logs, legalities, audit_trail
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `contracthub_pelindo_cirebon`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `contracthub_pelindo_cirebon`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES (RBAC)
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL UNIQUE,
  `name` VARCHAR(80) NOT NULL,
  `authority_level` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `description` TEXT NOT NULL,
  `permissions_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `title_position` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL UNIQUE,
  `phone_wa` VARCHAR(24) DEFAULT NULL,
  `department` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Aktif', 'Nonaktif', 'Ditangguhkan') NOT NULL DEFAULT 'Aktif',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. VENDORS
DROP TABLE IF EXISTS `vendors`;
CREATE TABLE `vendors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vendor_code` VARCHAR(32) NOT NULL UNIQUE,
  `company_name` VARCHAR(160) NOT NULL,
  `nib` VARCHAR(32) NOT NULL,
  `npwp` VARCHAR(32) NOT NULL,
  `pic_name` VARCHAR(120) NOT NULL,
  `pic_email` VARCHAR(160) NOT NULL,
  `pic_wa` VARCHAR(24) NOT NULL,
  `category` ENUM('PBM Bongkar Muat', 'Trucking Armada', 'Logistik & Gudang', 'Kepelabuhanan & Lahan', 'Teknologi E-Gate') NOT NULL,
  `compliance_status` ENUM('Terverifikasi', 'Dalam Review', 'Perlu Pembaruan') NOT NULL DEFAULT 'Terverifikasi',
  `address` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CONTRACTS
DROP TABLE IF EXISTS `contracts`;
CREATE TABLE `contracts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_number` VARCHAR(64) NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `service_pillar` ENUM(
    'Sewa Gudang 24 Jam',
    'Trucking Armada',
    'PBM Bongkar Muat',
    'Pas Masuk E-Gate',
    'Sewa Lahan',
    'Permit Tracker'
  ) NOT NULL,
  `vendor_id` INT UNSIGNED NOT NULL,
  `port_location` VARCHAR(120) NOT NULL,
  `contract_value_idr` BIGINT UNSIGNED NOT NULL,
  `utilized_value_idr` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `quota_total` DECIMAL(14,2) NOT NULL DEFAULT 100.00,
  `quota_used` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `quota_unit` VARCHAR(32) NOT NULL DEFAULT 'Ton',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM(
    'Draft',
    'Review Legal',
    'Menunggu e-Sign',
    'Aktif',
    'Hampir Habis',
    'Diperpanjang',
    'Selesai'
  ) NOT NULL DEFAULT 'Draft',
  `esign_status` ENUM('Belum Diajukan', 'Paraf Logistik', 'Verifikasi Legal', 'Tertandatangani') NOT NULL DEFAULT 'Belum Diajukan',
  `esign_hash` VARCHAR(128) DEFAULT NULL,
  `notes` TEXT,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_contracts_status` (`status`),
  INDEX `idx_contracts_end_date` (`end_date`),
  INDEX `idx_contracts_pillar` (`service_pillar`),
  CONSTRAINT `fk_contracts_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_contracts_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. DOCUMENTS (PDF / WORD VAULT)
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` ENUM('PDF', 'DOCX', 'DOC', 'XLSX') NOT NULL DEFAULT 'PDF',
  `file_size_kb` INT UNSIGNED NOT NULL,
  `doc_category` ENUM('Perjanjian Induk', 'Adendum', 'BAST', 'Dokumen Legalitas', 'Lampiran Tarif') NOT NULL,
  `version` VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  `checksum_sha256` CHAR(64) NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_documents_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. REMINDERS (H-30 / H-14 / H-7 WA & EMAIL)
DROP TABLE IF EXISTS `reminders`;
CREATE TABLE `reminders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NOT NULL,
  `tier` ENUM('H-30', 'H-14', 'H-7') NOT NULL,
  `channel` ENUM('WhatsApp & Email', 'WhatsApp', 'Email') NOT NULL DEFAULT 'WhatsApp & Email',
  `recipient_name` VARCHAR(120) NOT NULL,
  `recipient_contact` VARCHAR(160) NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `dispatch_status` ENUM('Terjadwal', 'Terkirim', 'Gagal') NOT NULL DEFAULT 'Terjadwal',
  `message_preview` TEXT NOT NULL,
  `sent_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_reminders_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. RENEWALS (ADENDUM & PERPANJANGAN)
DROP TABLE IF EXISTS `renewals`;
CREATE TABLE `renewals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NOT NULL,
  `renewal_number` VARCHAR(64) NOT NULL,
  `previous_end_date` DATE NOT NULL,
  `proposed_end_date` DATE NOT NULL,
  `proposed_value_idr` BIGINT UNSIGNED NOT NULL,
  `reason` TEXT NOT NULL,
  `approval_status` ENUM('Diajukan', 'Disetujui Legal', 'Ditolak') NOT NULL DEFAULT 'Diajukan',
  `approved_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_renewals_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_renewals_approver` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. USAGE LOGS (VOLUME / VALUE / QUOTA TRACKING)
DROP TABLE IF EXISTS `usage_logs`;
CREATE TABLE `usage_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NOT NULL,
  `activity_date` DATE NOT NULL,
  `volume_delta` DECIMAL(12,2) NOT NULL,
  `value_delta_idr` BIGINT UNSIGNED NOT NULL,
  `reference_no` VARCHAR(64) NOT NULL,
  `remarks` VARCHAR(255) NOT NULL,
  `recorded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_usage_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usage_recorder` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. LEGALITIES (PERMIT TRACKER)
DROP TABLE IF EXISTS `legalities`;
CREATE TABLE `legalities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permit_number` VARCHAR(64) NOT NULL UNIQUE,
  `permit_name` VARCHAR(180) NOT NULL,
  `issuing_authority` VARCHAR(120) NOT NULL,
  `vendor_id` INT UNSIGNED DEFAULT NULL,
  `port_zone` VARCHAR(100) NOT NULL,
  `issued_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `status` ENUM('Berlaku', 'Segera Perpanjang', 'Kedaluwarsa') NOT NULL DEFAULT 'Berlaku',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_legalities_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. AUDIT TRAIL
DROP TABLE IF EXISTS `audit_trail`;
CREATE TABLE `audit_trail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `actor_name` VARCHAR(120) NOT NULL,
  `actor_role` VARCHAR(80) NOT NULL,
  `action_type` VARCHAR(64) NOT NULL,
  `entity_name` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `summary` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '10.24.108.14',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA: PELINDO REGIONAL 2 CIREBON
-- ============================================================================

INSERT INTO `roles` (`id`, `code`, `name`, `authority_level`, `description`, `permissions_json`) VALUES
(1, 'ADMIN_LEGAL', 'Admin Legal / Chief Legal Officer', 1, 'Otoritas penuh pengelolaan kontrak, validasi e-Sign BUMN, manajemen RBAC pengguna, dan penutupan adendum.', JSON_ARRAY('contracts:all', 'esign:approve', 'users:manage', 'audit:read', 'export:all')),
(2, 'LOGISTIK_MANAGER', 'Manajer Logistik', 2, 'Mengelola kuota ritase, alokasi gudang D3, persetujuan operasional tingkat 1, dan memicu pengingat H-14.', JSON_ARRAY('contracts:read', 'contracts:write', 'usage:write', 'reminders:dispatch', 'export:reports')),
(3, 'VENDOR', 'Mitra Vendor PBM', 3, 'Mengunggah kelengkapan dokumen legalitas, memantau sisa kuota kontrak berjalan, dan meninjau tagihan layanan.', JSON_ARRAY('contracts:own_read', 'documents:upload', 'legalities:own_read')),
(4, 'STAFF', 'Staf Operasional', 3, 'Mencatat realisasi harian bongkar muat, pas masuk E-Gate pelabuhan, dan memeriksa status dokumen lapangan.', JSON_ARRAY('contracts:read', 'usage:write', 'documents:read'));

INSERT INTO `users` (`id`, `role_id`, `full_name`, `title_position`, `email`, `phone_wa`, `department`, `password_hash`, `avatar_url`, `status`) VALUES
(1, 1, 'Mayanggaseta Azahra', 'Admin Legal / Chief Legal Officer', 'mayanggaseta.azahra@pelindo.co.id', '+6281124082026', 'Divisi Hukum & Kepatuhan Regional 2 Cirebon', '$2y$12$DemoHashPelindoBUMN2025SecretKeyPlaceholder', '/assets/images/avatar_mayanggaseta.jpg', 'Aktif'),
(2, 2, 'Raden Bagus Pratomo', 'Manajer Operasi & Logistik Terminal', 'bagus.pratomo@pelindo.co.id', '+6281221904411', 'Operasional Terminal & Gudang D3', '$2y$12$DemoHashPelindoLogistik2025', NULL, 'Aktif'),
(3, 3, 'Hendra Wijaya', 'Direktur Operasional Mitra PBM', 'hendra@pelayarancirebon.co.id', '+6281320987712', 'PT Pelayaran Nusantara Cirebon', '$2y$12$DemoHashVendorPBM2025', NULL, 'Aktif'),
(4, 4, 'Siti Nurhaliza Kusuma', 'Staf Administrasi E-Gate & Dermaga', 'siti.kusuma@pelindo.co.id', '+6285722341109', 'Pengendalian Lapangan & Gate Pelabuhan', '$2y$12$DemoHashStaffOperasional2025', NULL, 'Aktif');

INSERT INTO `vendors` (`id`, `vendor_code`, `company_name`, `nib`, `npwp`, `pic_name`, `pic_email`, `pic_wa`, `category`, `compliance_status`, `address`) VALUES
(1, 'VND-CRB-001', 'PT Pelayaran Nusantara Cirebon', '9120304819201', '01.345.678.9-426.000', 'Hendra Wijaya', 'hendra@pelayarancirebon.co.id', '+6281320987712', 'PBM Bongkar Muat', 'Terverifikasi', 'Jl. Perniagaan No. 18, Panjunan, Kec. Lemahwungkuk, Kota Cirebon'),
(2, 'VND-CRB-002', 'PT Cirebon Terminal Logistik', '9120305521004', '02.412.889.1-426.000', 'Budi Santoso', 'budi@cirebonlogistik.id', '+6281224459901', 'Logistik & Gudang', 'Terverifikasi', 'Kawasan Pelabuhan Cirebon Kav. Gudang D3, Cirebon'),
(3, 'VND-CRB-003', 'PT Jasa Angkutan Pantura', '8120109934812', '03.118.432.5-426.000', 'Ahmad Fauzi', 'fauzi@angkutanpantura.co.id', '+6281122334455', 'Trucking Armada', 'Terverifikasi', 'Jl. Brigjen Dharsono Bypass No. 45, Kedawung, Cirebon'),
(4, 'VND-CRB-004', 'PT Samudera Cargo Jaya', '9120401182930', '04.776.210.3-426.000', 'Dewi Lestari', 'dewi@samuderacargo.co.id', '+6281899001122', 'Kepelabuhanan & Lahan', 'Dalam Review', 'Jl. Sisingamangaraja No. 102, Kota Cirebon');

INSERT INTO `contracts` (`id`, `contract_number`, `title`, `service_pillar`, `vendor_id`, `port_location`, `contract_value_idr`, `utilized_value_idr`, `quota_total`, `quota_used`, `quota_unit`, `start_date`, `end_date`, `status`, `esign_status`, `esign_hash`, `notes`, `created_by`) VALUES
(1, 'PKS/CRB/2026/001', 'Sewa Gudang Tertutup D3 & Area Penumpukan Curah Kering', 'Sewa Gudang 24 Jam', 2, 'Gudang D3 · Dermaga Muara Jati', 4850000000, 3492000000, 12000.00, 8640.00, 'm2/Bulan', '2026-01-01', '2026-12-31', 'Aktif', 'Tertandatangani', 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 'Mencakup layanan operasional 24/7 dengan integrasi kamera gate.', 1),
(2, 'PKS/CRB/2026/002', 'Kontrak Jasa Bongkar Muat Batubara & Semen Curah Dermaga 1', 'PBM Bongkar Muat', 1, 'Dermaga 1 & 2 Pelabuhan Cirebon', 7200000000, 5616000000, 250000.00, 195000.00, 'Ton', '2025-12-01', '2026-12-05', 'Hampir Habis', 'Tertandatangani', 'sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', 'Prioritas perpanjangan adendum kuota Q4 2026.', 1),
(3, 'PKS/CRB/2026/003', 'Kerja Sama Trucking Armada Distribusi Kontainer & Curah', 'Trucking Armada', 3, 'Gate Utama Timur · Jalur Pantura', 3150000000, 1984500000, 4500.00, 2835.00, 'Ritase', '2026-03-01', '2027-02-28', 'Aktif', 'Tertandatangani', 'sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d', 'Terhubung dengan manifest Inaportnet v2.4.', 1),
(4, 'PKS/CRB/2026/004', 'Implementasi & Pemeliharaan Pas Masuk E-Gate RFID Pelabuhan', 'Pas Masuk E-Gate', 2, 'Seluruh Pintu E-Gate Pelindo Cirebon', 1650000000, 742500000, 30000.00, 13500.00, 'Pass/Kartu', '2026-04-01', '2027-03-31', 'Menunggu e-Sign', 'Verifikasi Legal', NULL, 'Menunggu paraf akhir Chief Legal Officer Mayanggaseta Azahra.', 1),
(5, 'PKS/CRB/2026/005', 'Sewa Lahan Terbuka Penumpukan Peti Kemas Zona Utara', 'Sewa Lahan', 4, 'Lapangan Penumpukan Zona Utara', 5400000000, 4860000000, 18000.00, 16200.00, 'm2', '2025-11-18', '2026-11-24', 'Hampir Habis', 'Tertandatangani', 'sha256:e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683', 'H-14 notifikasi aktif dikirim ke mitra dan manajer logistik.', 1),
(6, 'PKS/CRB/2026/006', 'Pemantauan Kepatuhan Izin Operasional Terminal & Lingkungan', 'Permit Tracker', 4, 'Kawasan Pesisir Pelabuhan Cirebon', 980000000, 490000000, 12.00, 6.00, 'Izin', '2026-02-01', '2027-01-31', 'Review Legal', 'Paraf Logistik', NULL, 'Sedang ditinjau kesesuaian klausul AMDAL & KSOP.', 1);

INSERT INTO `audit_trail` (`user_id`, `actor_name`, `actor_role`, `action_type`, `entity_name`, `entity_id`, `summary`, `ip_address`) VALUES
(1, 'Mayanggaseta Azahra', 'Admin Legal / Chief Legal Officer', 'E_SIGN_VERIFIED', 'contracts', 'PKS/CRB/2026/001', 'Menandatangani secara elektronik kontrak Sewa Gudang Tertutup D3 dengan verifikasi hash SHA-256.', '10.24.108.14'),
(1, 'Mayanggaseta Azahra', 'Admin Legal / Chief Legal Officer', 'REMINDER_DISPATCH', 'reminders', 'PKS/CRB/2026/005', 'Mengirim peringatan H-14 WhatsApp & Email kepada PT Samudera Cargo Jaya.', '10.24.108.14'),
(1, 'Mayanggaseta Azahra', 'Admin Legal / Chief Legal Officer', 'LEGAL_REVIEW_START', 'contracts', 'PKS/CRB/2026/006', 'Membuka peninjauan legalitas untuk PKS Pemantauan Kepatuhan Izin Operasional Terminal.', '10.24.108.14');
