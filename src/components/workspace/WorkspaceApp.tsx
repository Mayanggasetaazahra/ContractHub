import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ArchiveRestore,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  History,
  Home,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import type {
  Contract,
  ContractDocument,
  ContractHubStore,
  ContractReminderConfig,
  ContractStatus,
  RoleCode,
  ServicePillar,
  User,
} from '../../types/contracthub';
import {
  daysUntil,
  formatDateId,
  formatRupiah,
  formatRupiahCompact,
  getContractStatusBadgeClass,
} from '../../utils/formatters';
import { BrandMark } from '../shared/BrandMark';
import { DashboardMainView } from './DashboardMainView';
import { ContractModal } from './ContractModal';
import { ContractDetailModal } from './ContractDetailModal';
import { ArchitectureExplorer } from './ArchitectureExplorer';
import { MonitoringQuotaView } from './MonitoringQuotaView';

export type WorkspaceTab =
  | 'dashboard'
  | 'contracts'
  | 'documents_legalities'
  | 'reminders'
  | 'monitoring'
  | 'reports'
  | 'users'
  | 'settings';

interface WorkspaceAppProps {
  store: ContractHubStore;
  activeUser: User;
  initialTab?: WorkspaceTab;
  initialPillarFilter?: ServicePillar | 'ALL';
  onSwitchRole: (roleCode: RoleCode) => Promise<void>;
  onLogout: () => void;
  onBackToLanding: () => void;
  onSaveContract: (payload: Partial<Contract>, isEdit: boolean) => Promise<void>;
  onDeleteContract: (id: number) => Promise<void>;
  onRestoreContract: (id: number) => Promise<void>;
  onSaveReminderConfig: (contractId: number, config: ContractReminderConfig) => Promise<void>;
  onAdvanceESign: (id: number, stage?: string) => Promise<void>;
  onRenewContract: (
    contractId: number,
    payload: { proposedEndDate: string; proposedValueIdr: number; reason: string }
  ) => Promise<void>;
  onUploadDocument: (payload: {
    contractId: number;
    fileName: string;
    fileType: 'PDF' | 'DOCX' | 'DOC' | 'XLSX';
    fileSizeKb: number;
    docCategory: ContractDocument['docCategory'];
    version: string;
    expiryDate?: string | null;
  }) => Promise<void>;
  onDeleteDocument: (id: number) => Promise<void>;
  onLogUsage: (payload: {
    contractId: number;
    volumeDelta: number;
    valueDeltaIdr: number;
    referenceNo: string;
    remarks: string;
  }) => Promise<void>;
  onDispatchReminder: (payload: {
    reminderId?: number;
    contractId?: number;
    tier?: 'H-30' | 'H-14' | 'H-7';
    channel?: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
  }) => Promise<void>;
  onSaveLegality: (payload: {
    permitNumber: string;
    permitName: string;
    issuingAuthority: string;
    vendorId: number | null;
    portZone: string;
    issuedDate: string;
    expiryDate: string;
    status: 'Berlaku' | 'Segera Perpanjang' | 'Kedaluwarsa';
  }) => Promise<void>;
  onCreateUser: (payload: {
    fullName: string;
    email: string;
    roleCode: RoleCode;
    department: string;
    phoneWa: string;
    titlePosition: string;
  }) => Promise<void>;
  onUpdateUserRole: (userId: number, roleCode: RoleCode) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onResetUserPassword: (userId: number) => Promise<void>;
  onUpdateProfile: (payload: {
    fullName: string;
    phoneWa: string;
    department: string;
    titlePosition: string;
    notifyEmail?: boolean;
    notifyWa?: boolean;
    passwordChanged?: boolean;
  }) => Promise<void>;
  onCreateVendor: (payload: {
    companyName: string;
    nib: string;
    npwp: string;
    picName: string;
    picEmail: string;
    picWa: string;
    category: string;
    address: string;
  }) => Promise<void>;
  onCreateLocation: (locationName: string) => Promise<void>;
  toastMessage: string | null;
  onShowToast: (msg: string) => void;
}

const NAV_ITEMS: {
  id: WorkspaceTab;
  label: string;
  group: 'OPERASIONAL & LEGALITAS' | 'ANALISIS & KONFIGURASI';
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard Utama', group: 'OPERASIONAL & LEGALITAS', icon: LayoutDashboard },
  { id: 'contracts', label: 'Manajemen Kontrak', group: 'OPERASIONAL & LEGALITAS', icon: FileText },
  { id: 'monitoring', label: 'Monitoring Kuota & Tonase', group: 'OPERASIONAL & LEGALITAS', icon: Gauge },
  { id: 'documents_legalities', label: 'Dokumen & Legalitas', group: 'OPERASIONAL & LEGALITAS', icon: FileCheck2 },
  { id: 'reminders', label: 'Reminder WA & Email', group: 'OPERASIONAL & LEGALITAS', icon: Bell },
  { id: 'reports', label: 'Laporan & Analitik', group: 'ANALISIS & KONFIGURASI', icon: FileSpreadsheet },
  { id: 'users', label: 'Manajemen User', group: 'ANALISIS & KONFIGURASI', icon: Users },
  { id: 'settings', label: 'Pengaturan & Akses', group: 'ANALISIS & KONFIGURASI', icon: Settings },
];

const MASTER_CONTRACT_TYPES: {
  name: ServicePillar;
  code: string;
  unit: string;
  sla: string;
  desc: string;
}[] = [
  {
    name: 'Sewa Gudang 24 Jam',
    code: 'TYP-GDG',
    unit: 'm² / Bulan',
    sla: 'Akses 24/7 + CCTV Pelabuhan',
    desc: 'Sewa ruang penyimpanan tertutup Lini 1 & Lini 2 kawasan Pelabuhan Cirebon.',
  },
  {
    name: 'Trucking Armada',
    code: 'TYP-TRK',
    unit: 'Ritase',
    sla: 'Kuota Ritase & Tonase Terkontrol',
    desc: 'Layanan angkutan darat kontainer dan curah jalur Pantura terintegrasi manifest.',
  },
  {
    name: 'PBM Bongkar Muat',
    code: 'TYP-PBM',
    unit: 'Ton',
    sla: 'Target Kinerja Dermaga (T/G/H)',
    desc: 'Kerja sama Perusahaan Bongkar Muat komoditas curah kering, cair, dan peti kemas.',
  },
  {
    name: 'Pas Masuk E-Gate',
    code: 'TYP-EGT',
    unit: 'Kartu RFID',
    sla: 'Aktivasi Instan Gerbang Utama',
    desc: 'Penerbitan kartu akses elektronik kendaraan berat dan personel lapangan.',
  },
  {
    name: 'Sewa Lahan',
    code: 'TYP-LHN',
    unit: 'm²',
    sla: 'Zona Penumpukan Terbuka',
    desc: 'Penyewaan lapangan penumpukan terbuka Dermaga Muara Jati & Zona Utara.',
  },
  {
    name: 'Permit Tracker',
    code: 'TYP-PRM',
    unit: 'Sertifikat / Izin',
    sla: 'Pemantauan KSOP & ISPS Code',
    desc: 'Pengawasan izin operasional maritim, PMKU, dan kepatuhan lingkungan.',
  },
];

const CONTRACTS_PER_PAGE = 5;

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({
  store,
  activeUser,
  initialTab = 'dashboard',
  initialPillarFilter = 'ALL',
  onSwitchRole,
  onLogout,
  onBackToLanding,
  onSaveContract,
  onDeleteContract,
  onRestoreContract,
  onSaveReminderConfig,
  onAdvanceESign,
  onRenewContract,
  onUploadDocument,
  onDeleteDocument,
  onLogUsage,
  onDispatchReminder,
  onSaveLegality,
  onCreateUser,
  onUpdateUserRole,
  onDeleteUser,
  onResetUserPassword,
  onUpdateProfile,
  onCreateVendor,
  onCreateLocation,
  toastMessage,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sub-tabs state
  const [docSubTab, setDocSubTab] = useState<'all_docs' | 'permits' | 'expired_docs' | 'esign'>('all_docs');
  const [remSubTab, setRemSubTab] = useState<'all' | 'H-30' | 'H-14' | 'H-7' | 'settings'>('all');
  const [userSubTab, setUserSubTab] = useState<'users' | 'audit'>('users');
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'types' | 'vendors' | 'locations'>('profile');

  // Contracts search, filter, trash toggle, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<ServicePillar | 'ALL'>(initialPillarFilter);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [endDateTo, setEndDateTo] = useState('');
  const [showDeletedArchive, setShowDeletedArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [contractModal, setContractModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'renew';
    contract: Contract | null;
  }>({ open: false, mode: 'create', contract: null });
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);

  // Upload Document form state
  const [docContractId, setDocContractId] = useState<number>(store.contracts[0]?.id ?? 1);
  const [docCategory, setDocCategory] = useState<ContractDocument['docCategory']>('Perjanjian Induk');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docFileName, setDocFileName] = useState('');
  const [docFileType, setDocFileType] = useState<'PDF' | 'DOCX' | 'DOC' | 'XLSX'>('PDF');
  const [docFileSize, setDocFileSize] = useState(1250);
  const [docExpiryDate, setDocExpiryDate] = useState('');

  // Legality form state
  const [permitNumber, setPermitNumber] = useState('');
  const [permitName, setPermitName] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('KSOP Kelas II Cirebon');
  const [permitZone, setPermitZone] = useState('Dermaga 1 & 2');
  const [permitIssued, setPermitIssued] = useState('2026-11-01');
  const [permitExpiry, setPermitExpiry] = useState('2027-11-01');

  // New User Admin CRUD state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleCode>('STAFF');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserWa, setNewUserWa] = useState('+62812');

  // Audit search state
  const [auditSearch, setAuditSearch] = useState('');

  // Profile Settings + Password state
  const [profName, setProfName] = useState(activeUser.fullName);
  const [profWa, setProfWa] = useState(activeUser.phoneWa);
  const [profDept, setProfDept] = useState(activeUser.department);
  const [profTitle, setProfTitle] = useState(activeUser.titlePosition);
  const [profNotifyEmail, setProfNotifyEmail] = useState(activeUser.notifyEmail ?? true);
  const [profNotifyWa, setProfNotifyWa] = useState(activeUser.notifyWa ?? true);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Master Vendor & Location forms
  const [vendorName, setVendorName] = useState('');
  const [vendorNib, setVendorNib] = useState('');
  const [vendorNpwp, setVendorNpwp] = useState('');
  const [vendorPicName, setVendorPicName] = useState('');
  const [vendorPicEmail, setVendorPicEmail] = useState('');
  const [vendorPicWa, setVendorPicWa] = useState('+62812');
  const [vendorCategory, setVendorCategory] = useState('Bongkar Muat & Logistik');
  const [newLocationName, setNewLocationName] = useState('');

  useEffect(() => {
    setProfName(activeUser.fullName);
    setProfWa(activeUser.phoneWa);
    setProfDept(activeUser.department);
    setProfTitle(activeUser.titlePosition);
    setProfNotifyEmail(activeUser.notifyEmail ?? true);
    setProfNotifyWa(activeUser.notifyWa ?? true);
  }, [activeUser]);

  // RBAC permissions
  const canCreateContracts =
    activeUser.roleCode === 'ADMIN_LEGAL' ||
    activeUser.roleCode === 'LOGISTIK_MANAGER' ||
    activeUser.roleCode === 'STAFF';
  const canEditContracts =
    activeUser.roleCode === 'ADMIN_LEGAL' || activeUser.roleCode === 'LOGISTIK_MANAGER';
  const canApproveESign = activeUser.roleCode === 'ADMIN_LEGAL';
  const canManageUsers = activeUser.roleCode === 'ADMIN_LEGAL';
  const canLogUsage = activeUser.roleCode !== 'VENDOR';

  // Scope contracts/docs/permits by RBAC (VENDOR sees own vendor only)
  const scopedVendorId = useMemo(() => {
    if (activeUser.roleCode !== 'VENDOR') return null;
    const matched = store.vendors.find(
      (v) => v.picEmail.toLowerCase() === activeUser.email.toLowerCase()
    );
    return matched?.id ?? 1;
  }, [activeUser.roleCode, activeUser.email, store.vendors]);

  const scopedContractsAll = useMemo(() => {
    if (scopedVendorId === null) return store.contracts;
    return store.contracts.filter((c) => c.vendorId === scopedVendorId);
  }, [store.contracts, scopedVendorId]);

  const activeContracts = useMemo(
    () => scopedContractsAll.filter((c) => !c.deletedAt),
    [scopedContractsAll]
  );

  const deletedContracts = useMemo(
    () => scopedContractsAll.filter((c) => Boolean(c.deletedAt)),
    [scopedContractsAll]
  );

  const scopedContractIds = useMemo(
    () => new Set(activeContracts.map((c) => c.id)),
    [activeContracts]
  );

  const scopedDocuments = useMemo(
    () => store.documents.filter((d) => scopedContractIds.has(d.contractId)),
    [store.documents, scopedContractIds]
  );

  const scopedLegalities = useMemo(() => {
    if (scopedVendorId === null) return store.legalities;
    return store.legalities.filter((l) => l.vendorId === scopedVendorId);
  }, [store.legalities, scopedVendorId]);

  const scopedReminders = useMemo(
    () => store.reminders.filter((r) => scopedContractIds.has(r.contractId)),
    [store.reminders, scopedContractIds]
  );

  const uniqueLocations = useMemo(() => {
    const merged = new Set([
      ...(store.portLocations ?? []),
      ...activeContracts.map((c) => c.portLocation),
    ]);
    return Array.from(merged);
  }, [store.portLocations, activeContracts]);

  const filteredContracts = useMemo(() => {
    const baseList = showDeletedArchive ? deletedContracts : activeContracts;
    return baseList.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.vendorName.toLowerCase().includes(q) ||
        c.portLocation.toLowerCase().includes(q);
      const matchesPillar = pillarFilter === 'ALL' || c.servicePillar === pillarFilter;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesLocation = locationFilter === 'ALL' || c.portLocation === locationFilter;
      const matchesFrom = !startDateFrom || c.startDate >= startDateFrom;
      const matchesTo = !endDateTo || c.endDate <= endDateTo;
      return (
        matchesQ &&
        matchesPillar &&
        matchesStatus &&
        matchesLocation &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    showDeletedArchive,
    deletedContracts,
    activeContracts,
    searchQuery,
    pillarFilter,
    statusFilter,
    locationFilter,
    startDateFrom,
    endDateTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / CONTRACTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedContracts = useMemo(() => {
    const start = (safePage - 1) * CONTRACTS_PER_PAGE;
    return filteredContracts.slice(start, start + CONTRACTS_PER_PAGE);
  }, [filteredContracts, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pillarFilter, statusFilter, locationFilter, startDateFrom, endDateTo, showDeletedArchive]);

  // Dashboard Metrics
  const totalPortfolioValue = activeContracts.reduce((s, c) => s + c.contractValueIdr, 0);
  const totalUtilizedValue = activeContracts.reduce((s, c) => s + c.utilizedValueIdr, 0);
  const activeOperationalCount = activeContracts.filter(
    (c) => c.status === 'Aktif' || c.status === 'Diperpanjang'
  ).length;
  const expiringSoon = activeContracts.filter((c) => {
    const d = daysUntil(c.endDate);
    return (d <= 30 && d >= 0) || c.status === 'Hampir Habis';
  });
  const expiredCount = activeContracts.filter(
    (c) => c.status === 'Kedaluwarsa' || daysUntil(c.endDate) < 0
  ).length;
  const pendingRemindersCount = scopedReminders.filter(
    (r) => r.dispatchStatus !== 'Terkirim'
  ).length;
  const quotaWarningContracts = activeContracts.filter(
    (c) => Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100) >= 80
  );

  const selectedContractDetail = useMemo(
    () => scopedContractsAll.find((c) => c.id === selectedContractId) ?? null,
    [scopedContractsAll, selectedContractId]
  );

  const filteredReminders = useMemo(() => {
    if (remSubTab === 'all' || remSubTab === 'settings') return scopedReminders;
    return scopedReminders.filter((r) => r.tier === remSubTab);
  }, [scopedReminders, remSubTab]);

  const expiredDocsAndPermits = useMemo(() => {
    const docs = scopedDocuments.filter(
      (d) => d.expiryDate && daysUntil(d.expiryDate) <= 30
    );
    const permits = scopedLegalities.filter(
      (l) => l.status === 'Kedaluwarsa' || l.status === 'Segera Perpanjang' || daysUntil(l.expiryDate) <= 30
    );
    return { docs, permits };
  }, [scopedDocuments, scopedLegalities]);

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return store.auditTrail;
    return store.auditTrail.filter(
      (a) =>
        a.actorName.toLowerCase().includes(q) ||
        a.actionType.toLowerCase().includes(q) ||
        a.entityId.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }, [store.auditTrail, auditSearch]);

  // Form Handlers
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    setDocFileSize(Math.max(12, Math.round(file.size / 1024)));
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (ext === 'DOCX' || ext === 'DOC' || ext === 'XLSX') {
      setDocFileType(ext);
    } else {
      setDocFileType('PDF');
    }
  };

  const submitDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName =
      docFileName.trim() || `Dokumen_Kontrak_${Date.now()}.${docFileType.toLowerCase()}`;
    await onUploadDocument({
      contractId: docContractId,
      fileName: finalName,
      fileType: docFileType,
      fileSizeKb: docFileSize,
      docCategory,
      version: docVersion,
      expiryDate: docExpiryDate || null,
    });
    setDocFileName('');
    setDocExpiryDate('');
  };

  const submitLegality = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveLegality({
      permitNumber,
      permitName,
      issuingAuthority,
      vendorId: null,
      portZone: permitZone,
      issuedDate: permitIssued,
      expiryDate: permitExpiry,
      status: 'Berlaku',
    });
    setPermitNumber('');
    setPermitName('');
  };

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateUser({
      fullName: newUserName,
      email: newUserEmail,
      roleCode: newUserRole,
      department: newUserDept,
      phoneWa: newUserWa,
      titlePosition:
        store.roles.find((r) => r.code === newUserRole)?.name ?? 'Staf Operasional',
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserDept('');
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const wantsPasswordChange = Boolean(oldPass || newPass || confirmPass);
    if (wantsPasswordChange) {
      if (!oldPass || newPass.length < 6) {
        onShowToast('Kata sandi baru minimal 6 karakter dan wajib mengisi sandi lama.');
        return;
      }
      if (newPass !== confirmPass) {
        onShowToast('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }
    await onUpdateProfile({
      fullName: profName,
      phoneWa: profWa,
      department: profDept,
      titlePosition: profTitle,
      notifyEmail: profNotifyEmail,
      notifyWa: profNotifyWa,
      passwordChanged: wantsPasswordChange,
    });
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
  };

  const submitNewVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateVendor({
      companyName: vendorName,
      nib: vendorNib,
      npwp: vendorNpwp,
      picName: vendorPicName,
      picEmail: vendorPicEmail,
      picWa: vendorPicWa,
      category: vendorCategory,
      address: 'Kawasan Pelabuhan Cirebon',
    });
    setVendorName('');
    setVendorNib('');
    setVendorNpwp('');
    setVendorPicName('');
    setVendorPicEmail('');
  };

  const submitNewLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    await onCreateLocation(newLocationName.trim());
    setNewLocationName('');
  };

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F4F8F9] text-[#002B36] flex flex-col lg:flex-row">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#002B36]/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION (288px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#E1F2F6] text-[#002B36] border-r border-[#004C6D]/15 overflow-hidden flex flex-col justify-between transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Uncropped Coastal Harbor Footer Artwork */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <img
            src="/assets/aistudio/Background_VerticalBorder__1__065c3050.png"
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-auto block"
          />
          <div
            className="absolute inset-x-0 top-0 h-20"
            style={{
              background: 'linear-gradient(180deg, #E1F2F6 0%, rgba(225,242,246,0) 100%)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="px-5 pt-4 pb-3.5 border-b border-[#004C6D]/12 shrink-0 bg-[#E1F2F6]/90 backdrop-blur-xs space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBackToLanding}
                className="flex items-center gap-3 text-left cursor-pointer"
              >
                <BrandMark size={34} />
                <div>
                  <p className="text-base font-extrabold tracking-tight text-[#002B36] leading-none">
                    CONTRACTHUB
                  </p>
                  <p className="text-[11px] font-bold text-[#004C6D] tracking-wide mt-1">
                    PELINDO REGIONAL 2
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1.5 text-[#002B36]/75 cursor-pointer"
                aria-label="Tutup menu navigasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/75 border border-[#004C6D]/12 text-xs font-bold text-[#004C6D]">
              <Anchor className="w-4 h-4 shrink-0" />
              <span className="truncate">PELABUHAN CIREBON</span>
            </div>
          </div>

          <nav className="px-3.5 py-3.5 space-y-5 overflow-y-auto flex-1">
            {(['OPERASIONAL & LEGALITAS', 'ANALISIS & KONFIGURASI'] as const).map((groupName) => (
              <div key={groupName} className="space-y-1.5">
                <p className="px-3 pb-1 text-[11px] font-bold tracking-wider text-[#004C6D]/75">
                  {groupName}
                </p>
                {NAV_ITEMS.filter((item) => item.group === groupName).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const reminderCount = expiringSoon.length + pendingRemindersCount;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#004C6D] text-white shadow-xs'
                          : 'text-[#002B36]/85 bg-[#E1F2F6]/80 hover:bg-white hover:text-[#004C6D]'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>

                      {item.id === 'reminders' && reminderCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-mono-tabular font-bold shrink-0 ${
                            isActive ? 'bg-white text-[#004C6D]' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {reminderCount}
                        </span>
                      )}

                      {item.id === 'monitoring' && quotaWarningContracts.length > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-mono-tabular font-bold shrink-0 ${
                            isActive ? 'bg-white text-[#004C6D]' : 'bg-[#004C6D]/15 text-[#004C6D]'
                          }`}
                          title="Kuota ≥ 80% terpakai"
                        >
                          {quotaWarningContracts.length}
                        </span>
                      )}

                      {item.id === 'users' && !canManageUsers && (
                        <Lock className="w-4 h-4 opacity-60 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="pt-3 border-t border-[#004C6D]/12 space-y-2">
              <button
                type="button"
                onClick={onBackToLanding}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#002B36] bg-white/85 hover:bg-white border border-[#004C6D]/15 cursor-pointer transition-colors"
              >
                <Home className="w-5 h-5 text-[#004C6D]" />
                <span>Kembali ke Beranda</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-rose-700 bg-white/85 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP WORKSPACE NAVBAR WITH SEARCH, FACILITY FILTER, ROLE SWITCHER, ALERTS & PROFILE */}
        <header className="h-20 bg-white border-b border-[#004C6D]/12 px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#004C6D]/15 text-[#002B36] cursor-pointer shrink-0"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Global Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveTab('contracts');
              }}
              className="relative hidden sm:block w-full max-w-sm"
            >
              <Search className="w-4 h-4 text-[#002B36]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari PKS, vendor, atau dermaga..."
                aria-label="Pencarian cepat kontrak atau vendor"
                className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-[#004C6D]/15 bg-[#F4F8F9] focus:bg-white focus:border-[#004C6D] focus:outline-none text-sm text-[#002B36]"
              />
            </form>

            {/* Facility / Dermaga Filter */}
            <div className="hidden md:flex items-center">
              <select
                aria-label="Filter Fasilitas Pelabuhan"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#004C6D]/15 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] max-w-[230px] truncate cursor-pointer"
              >
                <option value="ALL">Semua Fasilitas</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Quick RBAC Role Switcher for Testing Permissions */}
            <div className="hidden 2xl:flex items-center gap-2">
              <span className="text-xs font-semibold text-[#002B36]/60">Peran:</span>
              <select
                aria-label="Beralih Peran RBAC"
                value={activeUser.roleCode}
                onChange={(e) => onSwitchRole(e.target.value as RoleCode)}
                className="px-3 py-2 rounded-lg border border-[#004C6D]/20 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] cursor-pointer"
              >
                <option value="ADMIN_LEGAL">Admin Legal (CLO)</option>
                <option value="LOGISTIK_MANAGER">Manajer Logistik</option>
                <option value="VENDOR">Mitra Vendor PBM</option>
                <option value="STAFF">Staf Operasional</option>
              </select>
            </div>

            {/* Alerts Trigger (Dashboard Alert Badge in Navbar) */}
            <button
              type="button"
              onClick={() => setAlertsDrawerOpen(!alertsDrawerOpen)}
              className="relative p-2.5 rounded-lg border border-[#004C6D]/15 hover:bg-[#F4F8F9] text-[#002B36] cursor-pointer"
              aria-label="Lihat notifikasi H-30, H-14, H-7"
            >
              <Bell className="w-5 h-5 text-[#004C6D]" />
              {expiringSoon.length + expiredCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center font-mono-tabular">
                  {expiringSoon.length + expiredCount}
                </span>
              )}
            </button>

            {/* Primary CTA Button */}
            {canCreateContracts && (
              <button
                type="button"
                onClick={() =>
                  setContractModal({ open: true, mode: 'create', contract: null })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Buat Kontrak Baru</span>
                <span className="sm:hidden">Kontrak</span>
              </button>
            )}

            {/* User Profile Session Trigger */}
            <button
              type="button"
              onClick={() => {
                setSettingsSubTab('profile');
                setActiveTab('settings');
              }}
              className="flex items-center gap-2.5 pl-2.5 pr-1.5 py-1 rounded-xl hover:bg-[#F4F8F9] cursor-pointer transition-colors"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-[#002B36] leading-tight">
                  {activeUser.fullName}
                </p>
                <p className="text-xs font-bold text-[#004C6D] leading-tight mt-0.5">
                  {activeUser.roleCode.replace('_', ' ')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#004C6D] text-white text-sm font-bold flex items-center justify-center shrink-0">
                {activeUser.initials}
              </div>
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-4 md:mx-8 mt-4 px-4 py-3 rounded-xl bg-[#002B36] text-white text-sm font-medium flex items-center justify-between shadow-md no-print">
            <span className="inline-flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#E0F2F1]" />
              {toastMessage}
            </span>
          </div>
        )}

        {/* Alerts Popover Drawer */}
        {alertsDrawerOpen && (
          <div className="mx-4 md:mx-8 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-950">
                <p className="font-bold">
                  {expiringSoon.length} Kontrak Mendekati Jatuh Tempo (H-30/14/7) · {expiredCount} Kontrak Kedaluwarsa
                </p>
                <p className="mt-0.5 text-xs sm:text-sm">
                  {expiringSoon.length > 0
                    ? expiringSoon
                        .map((c) => `${c.contractNumber} (H-${Math.max(0, daysUntil(c.endDate))})`)
                        .join(' · ')
                    : 'Tidak ada kontrak dalam jendela H-30 saat ini.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAlertsDrawerOpen(false);
                setActiveTab('reminders');
              }}
              className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Buka Reminder
            </button>
          </div>
        )}

        {/* TAB VIEWPORT CONTENT */}
        <main className="flex-1 p-4 md:p-8 space-y-6">
          {/* 1. DASHBOARD UTAMA */}
          {activeTab === 'dashboard' && (
            <DashboardMainView
              store={store}
              activeUser={activeUser}
              activeContracts={activeContracts}
              scopedDocuments={scopedDocuments}
              scopedLegalities={scopedLegalities}
              scopedReminders={scopedReminders}
              locationFilter={locationFilter}
              canCreateContracts={canCreateContracts}
              canEditContracts={canEditContracts}
              onOpenCreateModal={() =>
                setContractModal({ open: true, mode: 'create', contract: null })
              }
              onOpenRenewModal={(contract) =>
                setContractModal({ open: true, mode: 'renew', contract })
              }
              onSelectContract={(contractId) => setSelectedContractId(contractId)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenDocSubTab={(sub) => setDocSubTab(sub)}
              onFilterContractsAndGo={({ status, location, search }) => {
                if (status !== undefined) setStatusFilter(status);
                if (location !== undefined) setLocationFilter(location);
                if (search !== undefined) setSearchQuery(search);
                setActiveTab('contracts');
              }}
              onDispatchReminder={onDispatchReminder}
              onResetFilters={() => {
                setLocationFilter('ALL');
                setSearchQuery('');
                setStatusFilter('ALL');
                setPillarFilter('ALL');
              }}
              onShowToast={onShowToast}
            />
          )}

          {/* 2. KONTRAK (CRUD + PAGINATION + MULTI-FILTER + DATE RANGE + SOFT DELETE & RESTORE) */}
          {activeTab === 'contracts' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#002B36]">
                    Manajemen Kontrak Pelabuhan
                  </h1>
                  <p className="text-sm text-[#002B36]/70 mt-1">
                    Cari berdasarkan vendor atau nomor kontrak, saring rentang tanggal & lokasi dermaga/gudang, serta kelola siklus hidup PKS.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {canEditContracts && (
                    <button
                      type="button"
                      onClick={() => setShowDeletedArchive(!showDeletedArchive)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer ${
                        showDeletedArchive
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-white border-[#004C6D]/20 text-[#002B36]'
                      }`}
                    >
                      <ArchiveRestore className="w-4 h-4" />
                      <span>
                        Arsip Terhapus ({deletedContracts.length})
                      </span>
                    </button>
                  )}
                  {canCreateContracts && (
                    <button
                      type="button"
                      onClick={() =>
                        setContractModal({ open: true, mode: 'create', contract: null })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold cursor-pointer"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span>Tambah Kontrak</span>
                    </button>
                  )}
                </div>
              </div>

              {activeUser.roleCode === 'VENDOR' && (
                <div className="p-4 rounded-xl bg-[#E0F2F1] border border-[#004C6D]/20 text-sm text-[#002B36] flex items-center gap-3">
                  <Lock className="w-5 h-5 text-[#004C6D] shrink-0" />
                  <span>
                    Mode Mitra Vendor aktif: Anda hanya dapat meninjau kontrak milik perusahaan Anda secara baca-saja.
                  </span>
                </div>
              )}

              {/* Search & Multi-Filter Bar including Date Range */}
              <div className="bg-white rounded-xl border border-[#004C6D]/12 p-5 space-y-3.5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#002B36]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari vendor, nomor PKS, judul..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                    />
                  </div>

                  <select
                    value={pillarFilter}
                    onChange={(e) => setPillarFilter(e.target.value as ServicePillar | 'ALL')}
                    className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    <option value="ALL">Semua Jenis Kontrak</option>
                    <option value="Sewa Gudang 24 Jam">Sewa Gudang 24 Jam</option>
                    <option value="Trucking Armada">Trucking Armada</option>
                    <option value="PBM Bongkar Muat">PBM Bongkar Muat</option>
                    <option value="Pas Masuk E-Gate">Pas Masuk E-Gate</option>
                    <option value="Sewa Lahan">Sewa Lahan</option>
                    <option value="Permit Tracker">Permit Tracker</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ContractStatus | 'ALL')}
                    className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    <option value="ALL">Semua Status Kontrak</option>
                    <option value="Draft">Draft</option>
                    <option value="Review Legal">Review Legal</option>
                    <option value="Menunggu e-Sign">Menunggu e-Sign</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Hampir Habis">Hampir Habis</option>
                    <option value="Diperpanjang">Diperpanjang</option>
                    <option value="Kedaluwarsa">Kedaluwarsa</option>
                    <option value="Dihentikan">Dihentikan</option>
                    <option value="Selesai">Selesai</option>
                  </select>

                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    <option value="ALL">Semua Lokasi Dermaga/Gudang</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#004C6D]/10 text-sm">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-semibold text-[#002B36]/75">Rentang Tanggal Kontrak:</span>
                    <input
                      type="date"
                      value={startDateFrom}
                      onChange={(e) => setStartDateFrom(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#004C6D]/20 font-mono-tabular bg-[#F4F8F9] text-sm"
                      aria-label="Tanggal mulai dari"
                    />
                    <span className="text-[#002B36]/60">s/d</span>
                    <input
                      type="date"
                      value={endDateTo}
                      onChange={(e) => setEndDateTo(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#004C6D]/20 font-mono-tabular bg-[#F4F8F9] text-sm"
                      aria-label="Tanggal berakhir hingga"
                    />
                  </div>
                  {(searchQuery ||
                    pillarFilter !== 'ALL' ||
                    statusFilter !== 'ALL' ||
                    locationFilter !== 'ALL' ||
                    startDateFrom ||
                    endDateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setPillarFilter('ALL');
                        setStatusFilter('ALL');
                        setLocationFilter('ALL');
                        setStartDateFrom('');
                        setEndDateTo('');
                      }}
                      className="text-sm font-semibold text-[#004C6D] hover:underline cursor-pointer"
                    >
                      Reset Semua Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Contracts Table + Pagination */}
              <div className="bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/15 text-xs font-bold text-[#002B36]/70">
                        <th className="py-3.5 px-4 font-semibold">No. Kontrak & Lokasi</th>
                        <th className="py-3.5 px-4 font-semibold">Judul & Jenis</th>
                        <th className="py-3.5 px-4 font-semibold">Pihak Kedua (Vendor)</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Nilai Kontrak</th>
                        <th className="py-3.5 px-4 font-semibold">Periode</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#004C6D]/10">
                      {paginatedContracts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-[#002B36]/60">
                            <Filter className="w-6 h-6 mx-auto mb-2 text-[#004C6D]/50" />
                            {showDeletedArchive
                              ? 'Arsip kontrak terhapus kosong.'
                              : 'Tidak ada kontrak yang sesuai dengan kriteria filter.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedContracts.map((c) => {
                          const daysLeft = daysUntil(c.endDate);
                          return (
                            <tr key={c.id} className="hover:bg-[#F4F8F9]/60 transition-colors">
                              <td className="py-4 px-4 align-top whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedContractId(c.id)}
                                  className="font-mono-tabular font-bold text-[#004C6D] hover:underline cursor-pointer"
                                >
                                  {c.contractNumber}
                                </button>
                                <p className="text-xs text-[#002B36]/65 mt-0.5">
                                  {c.portLocation}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-top max-w-xs">
                                <button
                                  type="button"
                                  onClick={() => setSelectedContractId(c.id)}
                                  className="font-semibold text-[#002B36] hover:text-[#004C6D] text-left cursor-pointer leading-snug"
                                >
                                  {c.title}
                                </button>
                                <p className="text-xs text-[#004C6D] mt-0.5">
                                  {c.servicePillar}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-top text-[#002B36]/85">
                                {c.vendorName}
                              </td>
                              <td className="py-4 px-4 align-top text-right font-mono-tabular whitespace-nowrap">
                                <p className="font-bold text-[#002B36]">
                                  {formatRupiah(c.contractValueIdr)}
                                </p>
                                <p className="text-xs text-[#002B36]/65 mt-0.5">
                                  Terpakai: {formatRupiahCompact(c.utilizedValueIdr)}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-top font-mono-tabular whitespace-nowrap">
                                <p>
                                  {formatDateId(c.startDate)} — {formatDateId(c.endDate)}
                                </p>
                                <p
                                  className={`text-xs mt-0.5 ${
                                    daysLeft < 0
                                      ? 'text-rose-700 font-semibold'
                                      : daysLeft <= 30
                                      ? 'text-amber-700 font-semibold'
                                      : 'text-[#002B36]/65'
                                  }`}
                                >
                                  {daysLeft > 0
                                    ? `Sisa ${daysLeft} hari`
                                    : daysLeft === 0
                                    ? 'Jatuh tempo hari ini'
                                    : 'Kedaluwarsa'}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-top whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${getContractStatusBadgeClass(
                                    c.status
                                  )}`}
                                >
                                  {c.status}
                                </span>
                                <p className="text-xs text-[#002B36]/60 mt-1 font-mono-tabular">
                                  {c.esignStatus}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-top text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedContractId(c.id)}
                                  className="p-2 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E0F2F1] cursor-pointer"
                                  title="Detail Kontrak (6 Tab)"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {showDeletedArchive
                                  ? canEditContracts && (
                                      <button
                                        type="button"
                                        onClick={() => onRestoreContract(c.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#004C6D]/25 bg-[#E0F2F1] text-[#004C6D] text-xs font-semibold cursor-pointer"
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Pulihkan</span>
                                      </button>
                                    )
                                  : canEditContracts && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setContractModal({
                                              open: true,
                                              mode: 'renew',
                                              contract: c,
                                            })
                                          }
                                          className="p-2 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E0F2F1] cursor-pointer"
                                          title="Adendum / Perpanjang"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setContractModal({
                                              open: true,
                                              mode: 'edit',
                                              contract: c,
                                            })
                                          }
                                          className="p-2 rounded-lg border border-[#004C6D]/20 text-[#002B36] hover:bg-[#F4F8F9] cursor-pointer"
                                          title="Sunting Kontrak"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteContract(c.id)}
                                          className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                                          title="Soft Delete Kontrak"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-5 py-4 bg-[#F4F8F9] border-t border-[#004C6D]/12 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-[#002B36]/75 font-mono-tabular">
                    Menampilkan {paginatedContracts.length} dari {filteredContracts.length} kontrak (Halaman {safePage} / {totalPages})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-[#004C6D]/20 bg-white disabled:opacity-40 cursor-pointer"
                      aria-label="Halaman sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setCurrentPage(pg)}
                        className={`w-9 h-9 rounded-lg text-sm font-mono-tabular font-semibold cursor-pointer ${
                          pg === safePage
                            ? 'bg-[#004C6D] text-white'
                            : 'bg-white border border-[#004C6D]/15 text-[#002B36]'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded-lg border border-[#004C6D]/20 bg-white disabled:opacity-40 cursor-pointer"
                      aria-label="Halaman berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3. DOKUMEN & LEGALITAS (4 SUB-TABS) */}
          {activeTab === 'documents_legalities' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#002B36]">
                    Brankas Dokumen & Legalitas Pelabuhan
                  </h1>
                  <p className="text-sm text-[#002B36]/70 mt-1">
                    Digitalisasi naskah PDF/Word, izin operasional KSOP/PMKU/ISPS Code, pantauan dokumen kedaluwarsa, dan pengesahan e-Signature.
                  </p>
                </div>
              </div>

              {/* 4 Sub-tabs */}
              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#004C6D]/15 pb-3.5">
                {[
                  { id: 'all_docs' as const, label: `Semua Dokumen (${scopedDocuments.length})` },
                  { id: 'permits' as const, label: `Izin & Sertifikat (${scopedLegalities.length})` },
                  {
                    id: 'expired_docs' as const,
                    label: `Dokumen Kedaluwarsa (${
                      expiredDocsAndPermits.docs.length + expiredDocsAndPermits.permits.length
                    })`,
                  },
                  { id: 'esign' as const, label: 'Alur e-Signature (PrivyID / BUMN)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocSubTab(t.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      docSubTab === t.id
                        ? 'bg-[#004C6D] text-white'
                        : 'bg-white border border-[#004C6D]/15 text-[#002B36] hover:bg-[#E0F2F1]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab 1: Semua Dokumen (PDF / Word) */}
              {docSubTab === 'all_docs' && (
                <div className="grid lg:grid-cols-12 gap-6">
                  {activeUser.roleCode !== 'VENDOR' && (
                    <form
                      onSubmit={submitDocumentUpload}
                      className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-4 h-fit"
                    >
                      <h3 className="text-base font-bold text-[#002B36]">
                        Unggah Dokumen Baru (PDF/Word)
                      </h3>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Pilih Kontrak Terkait</label>
                        <select
                          value={docContractId}
                          onChange={(e) => setDocContractId(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                        >
                          {activeContracts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.contractNumber} — {c.servicePillar}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Kategori Dokumen</label>
                        <select
                          value={docCategory}
                          onChange={(e) =>
                            setDocCategory(e.target.value as ContractDocument['docCategory'])
                          }
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                        >
                          <option value="Perjanjian Induk">Perjanjian Induk</option>
                          <option value="Adendum">Adendum</option>
                          <option value="BAST">BAST</option>
                          <option value="Dokumen Legalitas">Dokumen Legalitas</option>
                          <option value="Lampiran Tarif">Lampiran Tarif</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5">
                          Pilih Berkas Lokal (PDF/DOCX)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xlsx"
                          onChange={handleFileInput}
                          className="w-full text-sm file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-[#E0F2F1] file:text-[#004C6D] file:font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold mb-1.5">Nama Berkas</label>
                          <input
                            type="text"
                            required
                            value={docFileName}
                            onChange={(e) => setDocFileName(e.target.value)}
                            placeholder="PKS_Adendum.pdf"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5">Versi</label>
                          <input
                            type="text"
                            value={docVersion}
                            onChange={(e) => setDocVersion(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5">
                          Masa Berlaku Dokumen (Opsional)
                        </label>
                        <input
                          type="date"
                          value={docExpiryDate}
                          onChange={(e) => setDocExpiryDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Simpan ke Brankas</span>
                      </button>
                    </form>
                  )}

                  <div
                    className={`${
                      activeUser.roleCode !== 'VENDOR' ? 'lg:col-span-8' : 'lg:col-span-12'
                    } bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden`}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/15 text-xs font-bold text-[#002B36]/70">
                            <th className="py-3.5 px-4 font-semibold">Nama Berkas & Checksum</th>
                            <th className="py-3.5 px-4 font-semibold">Kontrak & Kategori</th>
                            <th className="py-3.5 px-4 font-semibold">Pengunggah</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#004C6D]/10">
                          {scopedDocuments.map((doc) => (
                            <tr key={doc.id}>
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-[#002B36]">{doc.fileName}</p>
                                <p className="text-xs font-mono-tabular text-[#002B36]/60 mt-0.5">
                                  {doc.fileType} · {doc.fileSizeKb} KB · {doc.version} · SHA256:{' '}
                                  {doc.checksumSha256.slice(0, 14)}...
                                </p>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <p className="font-mono-tabular font-semibold text-[#004C6D]">
                                  {doc.contractNumber}
                                </p>
                                <p className="text-xs text-[#002B36]/65 mt-0.5">{doc.docCategory}</p>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <p className="font-medium text-[#002B36]">{doc.uploadedByName}</p>
                                <p className="text-xs font-mono-tabular text-[#002B36]/60 mt-0.5">
                                  {doc.uploadedAt}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onShowToast(`Berkas ${doc.fileName} terverifikasi SHA-256.`)
                                  }
                                  className="p-2 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E0F2F1] cursor-pointer"
                                  title="Unduh / Verifikasi Berkas"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                {canEditContracts && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteDocument(doc.id)}
                                    className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                                    title="Hapus Dokumen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Izin & Sertifikat Pelabuhan */}
              {docSubTab === 'permits' && (
                <div className="grid lg:grid-cols-12 gap-6">
                  {canEditContracts && (
                    <form
                      onSubmit={submitLegality}
                      className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-3.5 h-fit"
                    >
                      <h3 className="text-base font-bold text-[#002B36]">
                        Daftarkan Izin / Sertifikat Pelabuhan
                      </h3>
                      <input
                        type="text"
                        required
                        value={permitNumber}
                        onChange={(e) => setPermitNumber(e.target.value)}
                        placeholder="Nomor Izin (KSOP-CRB/2026/099)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                      />
                      <input
                        type="text"
                        required
                        value={permitName}
                        onChange={(e) => setPermitName(e.target.value)}
                        placeholder="Nama Izin / Sertifikat (PMKU / ISPS / AMDAL)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <input
                        type="text"
                        required
                        value={issuingAuthority}
                        onChange={(e) => setIssuingAuthority(e.target.value)}
                        placeholder="Instansi Penerbit"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <input
                        type="text"
                        required
                        value={permitZone}
                        onChange={(e) => setPermitZone(e.target.value)}
                        placeholder="Zona Pelabuhan"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Terbit</label>
                          <input
                            type="date"
                            value={permitIssued}
                            onChange={(e) => setPermitIssued(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Berakhir</label>
                          <input
                            type="date"
                            value={permitExpiry}
                            onChange={(e) => setPermitExpiry(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
                      >
                        Simpan Data Perizinan
                      </button>
                    </form>
                  )}

                  <div
                    className={`${
                      canEditContracts ? 'lg:col-span-8' : 'lg:col-span-12'
                    } grid sm:grid-cols-2 gap-4`}
                  >
                    {scopedLegalities.map((leg) => (
                      <div
                        key={leg.id}
                        className="bg-white rounded-xl border border-[#004C6D]/12 p-5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular text-sm font-bold text-[#004C6D]">
                            {leg.permitNumber}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-semibold ${
                              leg.status === 'Berlaku'
                                ? 'bg-[#E0F2F1] text-[#004C6D]'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {leg.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#002B36]">{leg.permitName}</h3>
                        <p className="text-sm text-[#002B36]/75">
                          {leg.issuingAuthority} · {leg.portZone}
                        </p>
                        <p className="text-xs font-mono-tabular text-[#002B36]/65 pt-2.5 border-t border-[#004C6D]/10">
                          Berlaku: {formatDateId(leg.issuedDate)} — {formatDateId(leg.expiryDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Dokumen Kedaluwarsa */}
              {docSubTab === 'expired_docs' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-4">
                    <h3 className="text-base font-bold text-[#002B36]">
                      Izin & Sertifikat Mendekati / Melewati Kedaluwarsa
                    </h3>
                    {expiredDocsAndPermits.permits.length === 0 &&
                    expiredDocsAndPermits.docs.length === 0 ? (
                      <p className="text-sm text-[#002B36]/60 py-6 text-center">
                        Seluruh dokumen dan izin operasional saat ini masih berlaku aman.
                      </p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {expiredDocsAndPermits.permits.map((p) => (
                          <div
                            key={p.id}
                            className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-sm space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono-tabular font-bold text-amber-900">
                                {p.permitNumber}
                              </span>
                              <span className="px-2.5 py-0.5 rounded bg-white text-amber-900 text-xs font-semibold">
                                {p.status}
                              </span>
                            </div>
                            <p className="font-bold text-[#002B36]">{p.permitName}</p>
                            <p className="text-xs text-[#002B36]/75">
                              {p.issuingAuthority} · Kedaluwarsa: {formatDateId(p.expiryDate)}
                            </p>
                          </div>
                        ))}
                        {expiredDocsAndPermits.docs.map((d) => (
                          <div
                            key={d.id}
                            className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-sm space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono-tabular font-bold text-rose-800">
                                {d.contractNumber}
                              </span>
                              <span className="px-2.5 py-0.5 rounded bg-white text-rose-800 text-xs font-semibold">
                                Jatuh Tempo {d.expiryDate ? formatDateId(d.expiryDate) : '-'}
                              </span>
                            </div>
                            <p className="font-bold text-[#002B36]">{d.fileName}</p>
                            <p className="text-xs text-[#002B36]/70">
                              {d.docCategory} · {d.version}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Alur e-Signature (PrivyID / VIDA / DocuSign / Internal BUMN) */}
              {docSubTab === 'esign' && (
                <div className="grid md:grid-cols-2 gap-5">
                  {activeContracts.map((c) => {
                    const stages = [
                      'Belum Diajukan',
                      'Paraf Logistik',
                      'Verifikasi Legal',
                      'Tertandatangani',
                    ];
                    const currentIdx = stages.indexOf(c.esignStatus);
                    const isSigned = c.esignStatus === 'Tertandatangani';

                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono-tabular text-xs font-bold text-[#004C6D]">
                              {c.contractNumber} · {c.esignProvider ?? 'PrivyID / Internal BUMN'}
                            </span>
                            <h3 className="text-base font-bold text-[#002B36] mt-0.5">{c.title}</h3>
                            <p className="text-sm text-[#002B36]/65 mt-0.5">{c.vendorName}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-semibold shrink-0 ${
                              isSigned
                                ? 'bg-[#E0F2F1] text-[#004C6D]'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {c.esignStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2.5 pt-1">
                          {stages.map((st, idx) => (
                            <div key={st} className="space-y-1.5">
                              <div
                                className={`h-2 rounded-full ${
                                  idx <= currentIdx ? 'bg-[#004C6D]' : 'bg-[#F4F8F9]'
                                }`}
                              />
                              <p
                                className={`text-xs leading-tight ${
                                  idx <= currentIdx
                                    ? 'font-bold text-[#002B36]'
                                    : 'text-[#002B36]/50'
                                }`}
                              >
                                {st}
                              </p>
                            </div>
                          ))}
                        </div>

                        {c.esignHash ? (
                          <div className="p-3 rounded-lg bg-[#F4F8F9] font-mono-tabular text-xs text-[#004C6D] break-all">
                            Segel Digital SHA-256: {c.esignHash}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-3 border-t border-[#004C6D]/10 gap-3">
                            <span className="text-xs text-[#002B36]/65">
                              {canApproveESign
                                ? 'Otoritas Anda dapat mengesahkan tahap berikutnya.'
                                : 'Memerlukan otoritas Admin Legal untuk final e-Sign.'}
                            </span>
                            {canEditContracts && (
                              <button
                                type="button"
                                onClick={() => onAdvanceESign(c.id)}
                                disabled={c.esignStatus === 'Verifikasi Legal' && !canApproveESign}
                                className="px-4 py-2 rounded-lg bg-[#004C6D] hover:bg-[#003852] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold cursor-pointer shrink-0"
                              >
                                {c.esignStatus === 'Verifikasi Legal'
                                  ? 'Sahkan e-Sign CLO'
                                  : 'Proses Tahap Berikutnya'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 4. REMINDER (H-30 / H-14 / H-7 + PENGATURAN PER KONTRAK) */}
          {activeTab === 'reminders' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#002B36]">
                    Sistem Otomatisasi Pengingat (Smart Reminder)
                  </h1>
                  <p className="text-sm text-[#002B36]/70 mt-1">
                    Notifikasi H-30, H-14, dan H-7 via Email, Gateway WhatsApp (Fonnte/Wablas), serta pengaturan pengingat per kontrak.
                  </p>
                </div>
                {canEditContracts && (
                  <button
                    type="button"
                    onClick={() =>
                      onDispatchReminder({
                        contractId: activeContracts[4]?.id ?? activeContracts[0]?.id,
                        tier: 'H-7',
                        channel: 'WhatsApp & Email',
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Uji WA & Email H-7</span>
                  </button>
                )}
              </div>

              {/* Reminder Sub-tabs */}
              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#004C6D]/15 pb-3.5">
                {[
                  { id: 'all' as const, label: `Semua (${scopedReminders.length})` },
                  { id: 'H-30' as const, label: 'H-30' },
                  { id: 'H-14' as const, label: 'H-14' },
                  { id: 'H-7' as const, label: 'H-7 Prioritas' },
                  { id: 'settings' as const, label: 'Pengaturan Reminder per Kontrak' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRemSubTab(t.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      remSubTab === t.id
                        ? 'bg-[#004C6D] text-white'
                        : 'bg-white border border-[#004C6D]/15 text-[#002B36] hover:bg-[#E0F2F1]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {remSubTab === 'settings' ? (
                <div className="bg-white rounded-xl border border-[#004C6D]/12 divide-y divide-[#004C6D]/10">
                  {activeContracts.map((c) => {
                    const cfg = c.reminderConfig ?? {
                      h30: true,
                      h14: true,
                      h7: true,
                      channel: 'WhatsApp & Email' as const,
                    };
                    return (
                      <div
                        key={c.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm"
                      >
                        <div>
                          <span className="font-mono-tabular text-xs font-bold text-[#004C6D]">
                            {c.contractNumber}
                          </span>
                          <p className="font-bold text-[#002B36] text-base">{c.title}</p>
                          <p className="text-xs text-[#002B36]/65 mt-0.5">
                            {c.vendorName} · Berakhir {formatDateId(c.endDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {(['h30', 'h14', 'h7'] as const).map((tierKey) => (
                            <label
                              key={tierKey}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F4F8F9] cursor-pointer font-mono-tabular font-semibold text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={cfg[tierKey]}
                                disabled={!canEditContracts}
                                onChange={(e) =>
                                  onSaveReminderConfig(c.id, {
                                    ...cfg,
                                    [tierKey]: e.target.checked,
                                  })
                                }
                              />
                              <span>{tierKey.toUpperCase()}</span>
                            </label>
                          ))}

                          <select
                            value={cfg.channel}
                            disabled={!canEditContracts}
                            onChange={(e) =>
                              onSaveReminderConfig(c.id, {
                                ...cfg,
                                channel: e.target.value as ContractReminderConfig['channel'],
                              })
                            }
                            className="px-3.5 py-2 rounded-lg border border-[#004C6D]/20 bg-white text-sm font-semibold"
                          >
                            <option value="WhatsApp & Email">WhatsApp (Fonnte) & Email</option>
                            <option value="WhatsApp">WhatsApp Saja</option>
                            <option value="Email">Email Saja</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="bg-white rounded-xl border border-[#004C6D]/12 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded bg-[#E0F2F1] text-[#004C6D] font-mono-tabular text-xs font-bold">
                            {rem.tier}
                          </span>
                          <span className="font-mono-tabular text-sm font-bold text-[#002B36]">
                            {rem.contractNumber}
                          </span>
                          <span className="text-xs sm:text-sm text-[#002B36]/65">· {rem.channel}</span>
                        </div>
                        <p className="text-base font-bold text-[#002B36]">{rem.contractTitle}</p>
                        <p className="text-sm text-[#002B36]/80 bg-[#F4F8F9] p-3 rounded-lg">
                          <MessageSquare className="w-4 h-4 inline mr-2 text-[#004C6D]" />
                          {rem.messagePreview}
                        </p>
                        <p className="text-xs font-mono-tabular text-[#002B36]/65">
                          Penerima: {rem.recipientName} ({rem.recipientContact})
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            rem.dispatchStatus === 'Terkirim'
                              ? 'bg-[#E0F2F1] text-[#004C6D]'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {rem.dispatchStatus}
                        </span>
                        <span className="text-xs font-mono-tabular text-[#002B36]/65">
                          {rem.sentAt ? `Terkirim: ${rem.sentAt}` : `Jadwal: ${rem.scheduledDate}`}
                        </span>
                        {rem.dispatchStatus !== 'Terkirim' && canEditContracts && (
                          <button
                            type="button"
                            onClick={() => onDispatchReminder({ reminderId: rem.id })}
                            className="px-3.5 py-2 rounded-lg bg-[#004C6D] text-white text-xs sm:text-sm font-semibold cursor-pointer"
                          >
                            Kirim Sekarang
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 5. MONITORING (KUOTA TONASE / RITASE / PENUMPUKAN + TELEMETRI + FONNTE ALERT) */}
          {activeTab === 'monitoring' && (
            <MonitoringQuotaView
              store={store}
              activeUser={activeUser}
              activeContracts={activeContracts}
              scopedContractIds={scopedContractIds}
              canLogUsage={canLogUsage}
              onLogUsage={onLogUsage}
              onOpenContractDetail={(contractId) => setSelectedContractId(contractId)}
              onOpenRenewContract={(contract) =>
                setContractModal({ open: true, mode: 'renew', contract })
              }
              onDispatchWaAlert={async (contract) => {
                await onDispatchReminder({
                  contractId: contract.id,
                  tier: 'H-7',
                  channel: 'WhatsApp & Email',
                });
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onShowToast={onShowToast}
            />
          )}

          {/* 6. LAPORAN & ANALITIK */}
          {activeTab === 'reports' && (
            <ArchitectureExplorer
              store={store}
              activeUser={activeUser}
              onLogReportExport={(type) =>
                onShowToast(`Laporan ${type} CONTRACTHUB siap diunduh / dicetak.`)
              }
              onNavigateTab={(tab) => setActiveTab(tab)}
              onFilterContractsAndGo={({ status, location, pillar }) => {
                if (status !== undefined) setStatusFilter(status);
                if (location !== undefined) setLocationFilter(location);
                if (pillar !== undefined) setPillarFilter(pillar);
                setActiveTab('contracts');
              }}
            />
          )}

          {/* 7. MANAJEMEN USER (ADMIN LEGAL ONLY: USER CRUD + RESET PASSWORD + AUDIT TRAIL) */}
          {activeTab === 'users' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#002B36]">
                  Manajemen User & Log Aktivitas (Audit Trail)
                </h1>
                <p className="text-sm text-[#002B36]/70 mt-1">
                  Pengelolaan akun pejabat legal, manajer logistik, staf operasional, reset kata sandi, dan jejak audit sistem.
                </p>
              </div>

              {!canManageUsers ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 flex items-start gap-4 text-sm text-amber-950">
                  <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-base mb-1">Akses Khusus Admin Legal (RBAC)</p>
                    <p>
                      Peran aktif Anda saat ini adalah <strong>{activeUser.roleName}</strong>. Menu Manajemen User & Log Aktivitas penuh hanya dapat diakses oleh{' '}
                      <strong>Admin Legal / Chief Legal Officer</strong> (Mayanggaseta Azahra). Gunakan pemilih peran di bilah atas untuk menguji hak akses Admin Legal.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-[#004C6D]/15 pb-3.5">
                    <button
                      type="button"
                      onClick={() => setUserSubTab('users')}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                        userSubTab === 'users'
                          ? 'bg-[#004C6D] text-white'
                          : 'bg-white border border-[#004C6D]/15 text-[#002B36]'
                      }`}
                    >
                      Daftar & Peran User ({store.users.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserSubTab('audit')}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                        userSubTab === 'audit'
                          ? 'bg-[#004C6D] text-white'
                          : 'bg-white border border-[#004C6D]/15 text-[#002B36]'
                      }`}
                    >
                      Log Aktivitas / Audit Trail ({store.auditTrail.length})
                    </button>
                  </div>

                  {userSubTab === 'users' ? (
                    <div className="grid lg:grid-cols-12 gap-6">
                      <form
                        onSubmit={submitNewUser}
                        className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-3.5 h-fit"
                      >
                        <h3 className="text-base font-bold text-[#002B36] flex items-center gap-2">
                          <UserCog className="w-5 h-5 text-[#004C6D]" />
                          <span>Tambah User Baru</span>
                        </h3>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Nama Lengkap"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="Email Dinas / Mitra"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as RoleCode)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                        >
                          <option value="ADMIN_LEGAL">Admin Legal / Chief Legal Officer</option>
                          <option value="LOGISTIK_MANAGER">Manajer Logistik</option>
                          <option value="VENDOR">Mitra Vendor PBM</option>
                          <option value="STAFF">Staf Operasional</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={newUserDept}
                          onChange={(e) => setNewUserDept(e.target.value)}
                          placeholder="Divisi / Instansi"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                        <input
                          type="tel"
                          required
                          value={newUserWa}
                          onChange={(e) => setNewUserWa(e.target.value)}
                          placeholder="No. WhatsApp (+62...)"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                        />
                        <button
                          type="submit"
                          className="w-full py-3 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
                        >
                          Simpan User
                        </button>
                      </form>

                      <div className="lg:col-span-8 bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/15 text-xs font-bold text-[#002B36]/70">
                                <th className="py-3.5 px-4 font-semibold">Nama & Email</th>
                                <th className="py-3.5 px-4 font-semibold">Assign Role</th>
                                <th className="py-3.5 px-4 font-semibold">Divisi</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#004C6D]/10">
                              {store.users.map((u) => (
                                <tr key={u.id}>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <span className="w-9 h-9 rounded-lg bg-[#E0F2F1] text-[#004C6D] flex items-center justify-center shrink-0">
                                        {u.roleCode === 'ADMIN_LEGAL' ? (
                                          <ShieldCheck className="w-5 h-5" />
                                        ) : (
                                          <UserRound className="w-5 h-5" />
                                        )}
                                      </span>
                                      <div>
                                        <p className="font-bold text-[#002B36]">{u.fullName}</p>
                                        <p className="text-xs text-[#002B36]/65">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <select
                                      value={u.roleCode}
                                      disabled={u.id === 1}
                                      onChange={(e) =>
                                        onUpdateUserRole(u.id, e.target.value as RoleCode)
                                      }
                                      className="px-3 py-1.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white disabled:opacity-60"
                                    >
                                      <option value="ADMIN_LEGAL">Admin Legal (CLO)</option>
                                      <option value="LOGISTIK_MANAGER">Manajer Logistik</option>
                                      <option value="VENDOR">Mitra Vendor</option>
                                      <option value="STAFF">Staf Operasional</option>
                                    </select>
                                  </td>
                                  <td className="py-3.5 px-4 text-[#002B36]/80">{u.department}</td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => onResetUserPassword(u.id)}
                                      className="p-2 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E0F2F1] cursor-pointer"
                                      title="Reset Password User"
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </button>
                                    {u.id !== 1 ? (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteUser(u.id)}
                                        className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                                        title="Hapus User"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <span className="text-xs font-semibold text-[#004C6D] ml-1">
                                        Preset Utama
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative max-w-md">
                        <Search className="w-4 h-4 text-[#002B36]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          placeholder="Cari aktivitas, aktor, atau nomor PKS..."
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 bg-white text-sm"
                        />
                      </div>

                      <div className="bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/15 text-xs font-bold text-[#002B36]/70">
                                <th className="py-3.5 px-4 font-semibold">Waktu (WIB)</th>
                                <th className="py-3.5 px-4 font-semibold">User & Peran</th>
                                <th className="py-3.5 px-4 font-semibold">Aksi & Entitas</th>
                                <th className="py-3.5 px-4 font-semibold">Ringkasan Aktivitas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#004C6D]/10">
                              {filteredAudits.map((a) => (
                                <tr key={a.id}>
                                  <td className="py-3.5 px-4 font-mono-tabular text-xs whitespace-nowrap text-[#002B36]/75">
                                    {a.createdAt}
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <p className="font-bold text-[#002B36]">{a.actorName}</p>
                                    <p className="text-xs text-[#004C6D]">{a.actorRole}</p>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                                    <span className="font-semibold text-[#002B36]">
                                      {a.actionType}
                                    </span>
                                    <p className="text-xs text-[#002B36]/65">
                                      {a.entityName} · {a.entityId}
                                    </p>
                                  </td>
                                  <td className="py-3.5 px-4 text-[#002B36]/85">{a.summary}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* 8. PENGATURAN (PROFIL SAYA + PREFERENSI NOTIFIKASI + UBAH PASSWORD + MASTER DATA) */}
          {activeTab === 'settings' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#002B36]">
                  Pengaturan Akun & Data Master Pelabuhan
                </h1>
                <p className="text-sm text-[#002B36]/70 mt-1">
                  Kelola profil, preferensi notifikasi Email/WhatsApp, ubah kata sandi, serta data master jenis kontrak, vendor, dan lokasi dermaga.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#004C6D]/15 pb-3.5">
                {[
                  { id: 'profile' as const, label: 'Profil Saya & Kata Sandi', icon: SlidersHorizontal },
                  { id: 'types' as const, label: 'Master Jenis Kontrak', icon: FileText },
                  { id: 'vendors' as const, label: `Master Vendor (${store.vendors.length})`, icon: Building2 },
                  { id: 'locations' as const, label: `Master Lokasi (${uniqueLocations.length})`, icon: MapPin },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSettingsSubTab(t.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                        settingsSubTab === t.id
                          ? 'bg-[#004C6D] text-white'
                          : 'bg-white border border-[#004C6D]/15 text-[#002B36]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab 1: Profil Saya, Preferensi Notifikasi & Ubah Kata Sandi */}
              {settingsSubTab === 'profile' && (
                <div className="max-w-3xl bg-white rounded-xl border border-[#004C6D]/12 p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-[#004C6D]/10">
                    <div className="w-16 h-16 rounded-2xl bg-[#004C6D] text-white flex items-center justify-center shrink-0">
                      {activeUser.roleCode === 'ADMIN_LEGAL' ? (
                        <ShieldCheck className="w-8 h-8" />
                      ) : (
                        <UserRound className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#002B36]">{activeUser.fullName}</h2>
                      <p className="text-sm font-semibold text-[#004C6D]">{activeUser.roleName}</p>
                      <p className="text-xs text-[#002B36]/65 font-mono-tabular mt-0.5">
                        {activeUser.email} · Login terakhir: {activeUser.lastLoginAt}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={submitProfile} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Nama Lengkap</label>
                        <input
                          type="text"
                          value={profName}
                          onChange={(e) => setProfName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Jabatan</label>
                        <input
                          type="text"
                          value={profTitle}
                          onChange={(e) => setProfTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5">
                          Nomor WhatsApp Notifikasi
                        </label>
                        <input
                          type="tel"
                          value={profWa}
                          onChange={(e) => setProfWa(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Divisi / Unit Kerja</label>
                        <input
                          type="text"
                          value={profDept}
                          onChange={(e) => setProfDept(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                      </div>
                    </div>

                    {/* Preferensi Notifikasi */}
                    <div className="p-4 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/12 space-y-3">
                      <p className="text-sm font-bold text-[#002B36]">
                        Preferensi Notifikasi Pengingat Kontrak (H-30 / H-14 / H-7)
                      </p>
                      <div className="flex flex-wrap gap-6 text-sm">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profNotifyEmail}
                            onChange={(e) => setProfNotifyEmail(e.target.checked)}
                          />
                          <span>Kirim Notifikasi via Email ({activeUser.email})</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profNotifyWa}
                            onChange={(e) => setProfNotifyWa(e.target.checked)}
                          />
                          <span>Kirim Notifikasi via WhatsApp Gateway (Fonnte)</span>
                        </label>
                      </div>
                    </div>

                    {/* Ubah Kata Sandi */}
                    <div className="pt-4 border-t border-[#004C6D]/10 space-y-3">
                      <p className="text-sm font-bold text-[#002B36]">
                        Ubah Kata Sandi (Opsional)
                      </p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <input
                          type="password"
                          value={oldPass}
                          onChange={(e) => setOldPass(e.target.value)}
                          placeholder="Kata Sandi Lama"
                          className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                        <input
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="Kata Sandi Baru"
                          className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                        <input
                          type="password"
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          placeholder="Konfirmasi Sandi Baru"
                          className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-3 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold cursor-pointer"
                      >
                        Simpan Perubahan Profil & Keamanan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub-tab 2: Master Jenis Kontrak */}
              {settingsSubTab === 'types' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MASTER_CONTRACT_TYPES.map((t) => (
                    <div
                      key={t.code}
                      className="bg-white rounded-xl border border-[#004C6D]/12 p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-sm font-bold text-[#004C6D]">
                          {t.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-[#E0F2F1] text-[#004C6D] text-xs font-semibold">
                          Satuan: {t.unit}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#002B36]">{t.name}</h3>
                      <p className="text-sm text-[#002B36]/75 leading-relaxed">{t.desc}</p>
                      <p className="text-xs font-semibold text-[#004C6D] pt-2.5 border-t border-[#004C6D]/10">
                        Standar SLA: {t.sla}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 3: Master Vendor */}
              {settingsSubTab === 'vendors' && (
                <div className="grid lg:grid-cols-12 gap-6">
                  {canEditContracts && (
                    <form
                      onSubmit={submitNewVendor}
                      className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-3.5 h-fit"
                    >
                      <h3 className="text-base font-bold text-[#002B36]">
                        Tambah Mitra Vendor Pelabuhan
                      </h3>
                      <input
                        type="text"
                        required
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        placeholder="Nama Perusahaan (PT ...)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          value={vendorNib}
                          onChange={(e) => setVendorNib(e.target.value)}
                          placeholder="Nomor NIB"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                        />
                        <input
                          type="text"
                          required
                          value={vendorNpwp}
                          onChange={(e) => setVendorNpwp(e.target.value)}
                          placeholder="NPWP"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        value={vendorPicName}
                        onChange={(e) => setVendorPicName(e.target.value)}
                        placeholder="Nama PIC Mitra"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <input
                        type="email"
                        required
                        value={vendorPicEmail}
                        onChange={(e) => setVendorPicEmail(e.target.value)}
                        placeholder="Email PIC Mitra"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <input
                        type="tel"
                        required
                        value={vendorPicWa}
                        onChange={(e) => setVendorPicWa(e.target.value)}
                        placeholder="No. WA (+62...)"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                      />
                      <input
                        type="text"
                        value={vendorCategory}
                        onChange={(e) => setVendorCategory(e.target.value)}
                        placeholder="Kategori Usaha"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
                      >
                        Simpan Master Vendor
                      </button>
                    </form>
                  )}

                  <div
                    className={`${
                      canEditContracts ? 'lg:col-span-8' : 'lg:col-span-12'
                    } grid md:grid-cols-2 gap-4`}
                  >
                    {store.vendors.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white rounded-xl border border-[#004C6D]/12 p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono-tabular text-sm font-semibold text-[#004C6D]">
                              {v.vendorCode}
                            </span>
                            <h3 className="text-base font-bold text-[#002B36] mt-0.5">
                              {v.companyName}
                            </h3>
                          </div>
                          <span className="px-2.5 py-0.5 rounded bg-[#E0F2F1] text-[#004C6D] text-xs font-semibold">
                            {v.complianceStatus}
                          </span>
                        </div>
                        <p className="text-sm text-[#002B36]/75">{v.address}</p>
                        <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-[#004C6D]/10 text-sm font-mono-tabular">
                          <div>
                            <span className="text-[#002B36]/60 block text-xs">NIB</span>
                            <span className="font-semibold">{v.nib}</span>
                          </div>
                          <div>
                            <span className="text-[#002B36]/60 block text-xs">NPWP</span>
                            <span className="font-semibold">{v.npwp}</span>
                          </div>
                          <div>
                            <span className="text-[#002B36]/60 block text-xs">PIC Mitra</span>
                            <span className="font-sans font-semibold">{v.picName}</span>
                          </div>
                          <div>
                            <span className="text-[#002B36]/60 block text-xs">WhatsApp</span>
                            <span className="font-semibold">{v.picWa}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Master Lokasi (Dermaga / Gudang Pelabuhan Cirebon) */}
              {settingsSubTab === 'locations' && (
                <div className="grid lg:grid-cols-12 gap-6">
                  {canEditContracts && (
                    <form
                      onSubmit={submitNewLocation}
                      className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-3.5 h-fit"
                    >
                      <h3 className="text-base font-bold text-[#002B36]">
                        Tambah Lokasi Dermaga / Gudang
                      </h3>
                      <input
                        type="text"
                        required
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="Contoh: Dermaga Samudra Selatan · Zona 4"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                      />
                      <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
                      >
                        Simpan Lokasi Pelabuhan
                      </button>
                    </form>
                  )}

                  <div
                    className={`${
                      canEditContracts ? 'lg:col-span-8' : 'lg:col-span-12'
                    } grid sm:grid-cols-2 gap-4`}
                  >
                    {uniqueLocations.map((loc) => {
                      const count = activeContracts.filter((c) => c.portLocation === loc).length;
                      return (
                        <div
                          key={loc}
                          className="bg-white rounded-xl border border-[#004C6D]/12 p-4 flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-lg bg-[#E0F2F1] text-[#004C6D] flex items-center justify-center shrink-0">
                              <MapPin className="w-5 h-5" />
                            </span>
                            <div>
                              <p className="font-bold text-[#002B36]">{loc}</p>
                              <p className="text-xs text-[#002B36]/65">
                                Kawasan Pelabuhan Regional 2 Cirebon
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded bg-[#F4F8F9] font-mono-tabular font-bold text-[#004C6D] shrink-0">
                            {count} PKS
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* CONTRACT CREATE / EDIT / RENEW MODAL */}
      {contractModal.open && (
        <ContractModal
          mode={contractModal.mode}
          contract={contractModal.contract}
          vendors={store.vendors}
          portLocations={uniqueLocations}
          onClose={() => setContractModal({ open: false, mode: 'create', contract: null })}
          onSaveContract={onSaveContract}
          onSaveRenewal={onRenewContract}
        />
      )}

      {/* 6-TAB CONTRACT DETAIL MODAL */}
      {selectedContractDetail && (
        <ContractDetailModal
          contract={selectedContractDetail}
          store={store}
          canEdit={canEditContracts}
          canApproveESign={canApproveESign}
          onClose={() => setSelectedContractId(null)}
          onOpenEdit={(c) => setContractModal({ open: true, mode: 'edit', contract: c })}
          onOpenRenew={(c) => setContractModal({ open: true, mode: 'renew', contract: c })}
          onAdvanceESign={onAdvanceESign}
        />
      )}
    </div>
  );
};
