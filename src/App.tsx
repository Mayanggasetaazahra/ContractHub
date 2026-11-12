/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { INITIAL_STORE } from './data/seedData';
import type {
  Contract,
  ContractDocument,
  ContractHubStore,
  ContractReminderConfig,
  RoleCode,
  ServicePillar,
  User,
} from './types/contracthub';
import { LandingPage } from './components/landing/LandingPage';
import { LoginView } from './components/auth/LoginView';
import { WorkspaceApp, type WorkspaceTab } from './components/workspace/WorkspaceApp';

type AppView = 'landing' | 'login' | 'workspace';

function mapToWorkspaceTab(tab?: string): WorkspaceTab {
  switch (tab) {
    case 'contracts':
      return 'contracts';
    case 'documents':
    case 'legalities':
    case 'esign':
    case 'documents_legalities':
      return 'documents_legalities';
    case 'reminders':
      return 'reminders';
    case 'usage':
    case 'monitoring':
      return 'monitoring';
    case 'architecture':
    case 'reports':
      return 'reports';
    case 'audit':
    case 'users':
      return 'users';
    case 'vendors':
    case 'profile':
    case 'settings':
      return 'settings';
    default:
      return 'dashboard';
  }
}

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [store, setStore] = useState<ContractHubStore>(INITIAL_STORE);
  const [activeUser, setActiveUser] = useState<User>(INITIAL_STORE.users[0]);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(true);
  const [preselectedLoginRole, setPreselectedLoginRole] = useState<RoleCode | undefined>(undefined);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<WorkspaceTab>('dashboard');
  const [workspacePillarFilter, setWorkspacePillarFilter] = useState<ServicePillar | 'ALL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.store && data?.activeUser) {
          setStore(data.store);
          setActiveUser(data.activeUser);
        }
      })
      .catch(() => {
        // Fallback to INITIAL_STORE if offline
      });
  }, []);

  const handleOpenLogin = (role?: RoleCode) => {
    setPreselectedLoginRole(role);
    setView('login');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenWorkspace = (tab?: string, pillar?: ServicePillar) => {
    setWorkspaceInitialTab(mapToWorkspaceTab(tab));
    setWorkspacePillarFilter(pillar ?? 'ALL');
    setView('workspace');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleLoginSuccess = async (payload: {
    email: string;
    password: string;
    roleCode?: RoleCode;
  }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      setActiveUser(data.activeUser);
      setIsSignedIn(true);
      setWorkspaceInitialTab('dashboard');
      setView('workspace');
      showToast(`Selamat datang kembali, ${data.activeUser.fullName}.`);
    }
  };

  const handleRegisterSuccess = async (payload: {
    fullName: string;
    email: string;
    department: string;
    phoneWa: string;
    roleCode: RoleCode;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      setActiveUser(data.activeUser);
      setIsSignedIn(true);
      setWorkspaceInitialTab('dashboard');
      setView('workspace');
      showToast(`Akun ruang kerja untuk ${data.activeUser.fullName} berhasil diaktifkan.`);
    }
  };

  const handleSwitchRole = async (roleCode: RoleCode) => {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleCode }),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      setActiveUser(data.activeUser);
      showToast(`Sesi demo beralih ke ${data.activeUser.fullName} (${data.activeUser.roleName}).`);
    }
  };

  const handleSaveContract = async (payload: Partial<Contract>, isEdit: boolean) => {
    const url = isEdit && payload.id ? `/api/contracts/${payload.id}` : '/api/contracts';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(isEdit ? 'Perubahan kontrak berhasil disimpan.' : 'Kontrak baru berhasil ditambahkan.');
    }
  };

  const handleDeleteContract = async (id: number) => {
    const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Kontrak dipindahkan ke arsip terhapus (soft delete).');
    }
  };

  const handleRestoreContract = async (id: number) => {
    const res = await fetch(`/api/contracts/${id}/restore`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Kontrak berhasil dipulihkan dari arsip terhapus.');
    }
  };

  const handleSaveReminderConfig = async (
    contractId: number,
    config: ContractReminderConfig
  ) => {
    const res = await fetch(`/api/contracts/${contractId}/reminder-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Pengaturan kanal & jendela pengingat kontrak berhasil diperbarui.');
    }
  };

  const handleAdvanceESign = async (id: number, stage?: string) => {
    const res = await fetch(`/api/contracts/${id}/esign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Status e-Sign diperbarui menjadi "${data.contract.esignStatus}".`);
    }
  };

  const handleRenewContract = async (
    contractId: number,
    payload: { proposedEndDate: string; proposedValueIdr: number; reason: string }
  ) => {
    const res = await fetch(`/api/contracts/${contractId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Adendum & perpanjangan kontrak berhasil diproses.');
    }
  };

  const handleUploadDocument = async (payload: {
    contractId: number;
    fileName: string;
    fileType: 'PDF' | 'DOCX' | 'DOC' | 'XLSX';
    fileSizeKb: number;
    docCategory: ContractDocument['docCategory'];
    version: string;
    expiryDate?: string | null;
  }) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Dokumen ${payload.fileName} berhasil disimpan ke Brankas.`);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Dokumen dihapus dari brankas.');
    }
  };

  const handleLogUsage = async (payload: {
    contractId: number;
    volumeDelta: number;
    valueDeltaIdr: number;
    referenceNo: string;
    remarks: string;
  }) => {
    const res = await fetch('/api/usage-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Realisasi volume & kuota berhasil dicatat.');
    }
  };

  const handleDispatchReminder = async (payload: {
    reminderId?: number;
    contractId?: number;
    tier?: 'H-30' | 'H-14' | 'H-7';
    channel?: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
  }) => {
    const res = await fetch('/api/reminders/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Notifikasi WhatsApp & Email berhasil dikirim dan dicatat.');
    }
  };

  const handleSaveLegality = async (payload: {
    permitNumber: string;
    permitName: string;
    issuingAuthority: string;
    vendorId: number | null;
    portZone: string;
    issuedDate: string;
    expiryDate: string;
    status: 'Berlaku' | 'Segera Perpanjang' | 'Kedaluwarsa';
  }) => {
    const res = await fetch('/api/legalities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Izin ${payload.permitNumber} berhasil didaftarkan.`);
    }
  };

  const handleCreateUser = async (payload: {
    fullName: string;
    email: string;
    roleCode: RoleCode;
    department: string;
    phoneWa: string;
    titlePosition: string;
  }) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Pengguna ${payload.fullName} berhasil ditambahkan.`);
    }
  };

  const handleUpdateUserRole = async (userId: number, roleCode: RoleCode) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleCode }),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      if (data.activeUser) setActiveUser(data.activeUser);
      showToast('Hak akses peran pengguna diperbarui.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Pengguna dihapus dari sistem.');
    }
  };

  const handleResetUserPassword = async (userId: number) => {
    const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast('Tautan atur ulang kata sandi telah dikirim ke email pengguna.');
    }
  };

  const handleUpdateProfile = async (payload: {
    fullName: string;
    phoneWa: string;
    department: string;
    titlePosition: string;
    notifyEmail?: boolean;
    notifyWa?: boolean;
    passwordChanged?: boolean;
  }) => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      setActiveUser(data.activeUser);
      showToast(
        payload.passwordChanged
          ? 'Kata sandi dan profil berhasil diperbarui.'
          : 'Pengaturan profil & preferensi notifikasi berhasil diperbarui.'
      );
    }
  };

  const handleCreateVendor = async (payload: {
    companyName: string;
    nib: string;
    npwp: string;
    picName: string;
    picEmail: string;
    picWa: string;
    category: string;
    address: string;
  }) => {
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Mitra vendor ${payload.companyName} ditambahkan ke data master.`);
    }
  };

  const handleCreateLocation = async (locationName: string) => {
    const res = await fetch('/api/master/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationName }),
    });
    if (res.ok) {
      const data = await res.json();
      setStore(data.store);
      showToast(`Lokasi pelabuhan "${locationName}" ditambahkan.`);
    }
  };

  if (view === 'login') {
    return (
      <LoginView
        users={store.users}
        preselectedRole={preselectedLoginRole}
        onBackToHome={() => setView('landing')}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  if (view === 'workspace') {
    return (
      <WorkspaceApp
        store={store}
        activeUser={activeUser}
        initialTab={workspaceInitialTab}
        initialPillarFilter={workspacePillarFilter}
        onSwitchRole={handleSwitchRole}
        onLogout={() => {
          setIsSignedIn(false);
          setView('login');
        }}
        onBackToLanding={() => setView('landing')}
        onSaveContract={handleSaveContract}
        onDeleteContract={handleDeleteContract}
        onRestoreContract={handleRestoreContract}
        onSaveReminderConfig={handleSaveReminderConfig}
        onAdvanceESign={handleAdvanceESign}
        onRenewContract={handleRenewContract}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        onLogUsage={handleLogUsage}
        onDispatchReminder={handleDispatchReminder}
        onSaveLegality={handleSaveLegality}
        onCreateUser={handleCreateUser}
        onUpdateUserRole={handleUpdateUserRole}
        onDeleteUser={handleDeleteUser}
        onResetUserPassword={handleResetUserPassword}
        onUpdateProfile={handleUpdateProfile}
        onCreateVendor={handleCreateVendor}
        onCreateLocation={handleCreateLocation}
        toastMessage={toastMessage}
        onShowToast={showToast}
      />
    );
  }

  return (
    <LandingPage
      store={store}
      activeUser={isSignedIn ? activeUser : null}
      onOpenLogin={handleOpenLogin}
      onOpenWorkspace={handleOpenWorkspace}
    />
  );
}
