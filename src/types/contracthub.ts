export type RoleCode = 'ADMIN_LEGAL' | 'LOGISTIK_MANAGER' | 'VENDOR' | 'STAFF';

export type ServicePillar =
  | 'Sewa Gudang 24 Jam'
  | 'Trucking Armada'
  | 'PBM Bongkar Muat'
  | 'Pas Masuk E-Gate'
  | 'Sewa Lahan'
  | 'Permit Tracker';

export type ContractStatus =
  | 'Draft'
  | 'Review Legal'
  | 'Menunggu e-Sign'
  | 'Aktif'
  | 'Hampir Habis'
  | 'Diperpanjang'
  | 'Kedaluwarsa'
  | 'Dihentikan'
  | 'Selesai';

export type ESignStage =
  | 'Belum Diajukan'
  | 'Paraf Logistik'
  | 'Verifikasi Legal'
  | 'Tertandatangani';

export interface Role {
  id: number;
  code: RoleCode;
  name: string;
  authorityLevel: number;
  description: string;
  permissions: string[];
}

export interface User {
  id: number;
  roleId: number;
  roleCode: RoleCode;
  roleName: string;
  fullName: string;
  titlePosition: string;
  email: string;
  phoneWa: string;
  department: string;
  avatarUrl: string | null;
  initials: string;
  status: 'Aktif' | 'Nonaktif' | 'Ditangguhkan';
  lastLoginAt: string;
  notifyEmail?: boolean;
  notifyWa?: boolean;
}

export interface Vendor {
  id: number;
  vendorCode: string;
  companyName: string;
  nib: string;
  npwp: string;
  picName: string;
  picEmail: string;
  picWa: string;
  category: string;
  complianceStatus: 'Terverifikasi' | 'Dalam Review' | 'Perlu Pembaruan';
  address: string;
}

export interface ContractReminderConfig {
  h30: boolean;
  h14: boolean;
  h7: boolean;
  channel: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
}

export interface Contract {
  id: number;
  contractNumber: string;
  title: string;
  servicePillar: ServicePillar;
  vendorId: number;
  vendorName: string;
  portLocation: string;
  contractValueIdr: number;
  utilizedValueIdr: number;
  quotaTotal: number;
  quotaUsed: number;
  quotaUnit: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  esignStatus: ESignStage;
  esignHash: string | null;
  esignProvider?: 'PrivyID' | 'VIDA' | 'DocuSign' | 'Internal BUMN';
  notes: string;
  createdBy: number;
  updatedAt: string;
  deletedAt?: string | null;
  reminderConfig?: ContractReminderConfig;
}

export interface ContractDocument {
  id: number;
  contractId: number;
  contractNumber: string;
  fileName: string;
  fileType: 'PDF' | 'DOCX' | 'DOC' | 'XLSX';
  fileSizeKb: number;
  docCategory: 'Perjanjian Induk' | 'Adendum' | 'BAST' | 'Dokumen Legalitas' | 'Lampiran Tarif';
  version: string;
  checksumSha256: string;
  expiryDate?: string | null;
  uploadedByName: string;
  uploadedAt: string;
}

export interface Reminder {
  id: number;
  contractId: number;
  contractNumber: string;
  contractTitle: string;
  tier: 'H-30' | 'H-14' | 'H-7';
  channel: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
  recipientName: string;
  recipientContact: string;
  scheduledDate: string;
  dispatchStatus: 'Terjadwal' | 'Terkirim' | 'Gagal';
  messagePreview: string;
  sentAt: string | null;
}

export interface Renewal {
  id: number;
  contractId: number;
  contractNumber: string;
  renewalNumber: string;
  previousEndDate: string;
  proposedEndDate: string;
  proposedValueIdr: number;
  reason: string;
  approvalStatus: 'Diajukan' | 'Disetujui Legal' | 'Ditolak';
  approvedByName: string | null;
  createdAt: string;
}

export interface UsageLog {
  id: number;
  contractId: number;
  contractNumber: string;
  activityDate: string;
  volumeDelta: number;
  valueDeltaIdr: number;
  quotaUnit: string;
  referenceNo: string;
  remarks: string;
  recordedByName: string;
}

export interface LegalityPermit {
  id: number;
  contractId?: number | null;
  permitNumber: string;
  permitName: string;
  issuingAuthority: string;
  vendorId: number | null;
  vendorName: string;
  portZone: string;
  issuedDate: string;
  expiryDate: string;
  status: 'Berlaku' | 'Segera Perpanjang' | 'Kedaluwarsa';
}

export interface AuditEntry {
  id: number;
  userId: number;
  actorName: string;
  actorRole: string;
  actionType: string;
  entityName: string;
  entityId: string;
  summary: string;
  ipAddress: string;
  createdAt: string;
}

export interface ContractHubStore {
  roles: Role[];
  users: User[];
  vendors: Vendor[];
  contracts: Contract[];
  documents: ContractDocument[];
  reminders: Reminder[];
  renewals: Renewal[];
  usageLogs: UsageLog[];
  legalities: LegalityPermit[];
  auditTrail: AuditEntry[];
  portLocations?: string[];
}
