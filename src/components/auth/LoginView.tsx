import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
  Ship,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import type { RoleCode, User } from '../../types/contracthub';
import { BrandMark } from '../shared/BrandMark';

interface LoginViewProps {
  users: User[];
  preselectedRole?: RoleCode;
  onBackToHome: () => void;
  onLoginSuccess: (payload: { email: string; password: string; roleCode?: RoleCode }) => Promise<void>;
  onRegisterSuccess: (payload: {
    fullName: string;
    email: string;
    department: string;
    phoneWa: string;
    roleCode: RoleCode;
  }) => Promise<void>;
}

const DEMO_ROLES: { code: RoleCode; label: string; email: string }[] = [
  { code: 'ADMIN_LEGAL', label: 'Admin Legal', email: 'mayanggaseta.azahra@pelindo.co.id' },
  { code: 'LOGISTIK_MANAGER', label: 'Manajer Logistik', email: 'bagus.pratomo@pelindo.co.id' },
  { code: 'VENDOR', label: 'Mitra Vendor PBM', email: 'hendra@pelayarancirebon.co.id' },
  { code: 'STAFF', label: 'Staf Operasional', email: 'siti.kusuma@pelindo.co.id' },
];

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  preselectedRole,
  onBackToHome,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<RoleCode>(preselectedRole ?? 'ADMIN_LEGAL');
  const [email, setEmail] = useState('mayanggaseta.azahra@pelindo.co.id');
  const [password, setPassword] = useState('DemoBUMN2025!Pelindo');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regWa, setRegWa] = useState('');
  const [regRole, setRegRole] = useState<RoleCode>('VENDOR');

  useEffect(() => {
    if (preselectedRole) {
      handleQuickRoleSelect(preselectedRole);
    }
  }, [preselectedRole]);

  const activePresetUser =
    users.find((u) => u.roleCode === selectedRole) ?? users[0];

  const handleQuickRoleSelect = (roleCode: RoleCode) => {
    setSelectedRole(roleCode);
    const matched = users.find((u) => u.roleCode === roleCode);
    if (matched) {
      setEmail(matched.email);
      setPassword('DemoBUMN2025!Pelindo');
    } else {
      const fallback = DEMO_ROLES.find((r) => r.code === roleCode);
      if (fallback) setEmail(fallback.email);
    }
    setMode('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLoginSuccess({ email, password, roleCode: selectedRole });
      } else {
        await onRegisterSuccess({
          fullName: regName || 'Mitra Pelabuhan Baru',
          email: regEmail || 'mitra.baru@pelindo-partner.co.id',
          department: regDept || 'Mitra Logistik Cirebon',
          phoneWa: regWa || '+6281234567890',
          roleCode: regRole,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSsoSignIn = async () => {
    setSubmitting(true);
    try {
      await onLoginSuccess({ email, password, roleCode: selectedRole });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F9] flex flex-col justify-between">
      {/* Top Corporate Bar */}
      <header className="w-full bg-white border-b border-[#004C6D]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <div>
              <p className="text-sm font-bold text-[#002B36] tracking-tight leading-none">
                CONTRACTHUB
              </p>
              <p className="text-[11px] font-medium text-[#002B36]/60 mt-1">
                PT PELABUHAN INDONESIA (PERSERO) REGIONAL 2 CIREBON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004C6D] hover:text-[#002B36] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Bantuan & Layanan IT</span>
          </button>
        </div>
      </header>

      {/* Main Split Card */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-white border border-[#004C6D]/12 shadow-lg grid lg:grid-cols-12">
          {/* Left Panel (Clean Padded Copy + Uncropped Coastal Harbor Backdrop) */}
          <div className="lg:col-span-5 bg-[#E1F2F6] flex flex-col justify-between overflow-hidden">
            <div className="px-8 sm:px-10 pt-9 pb-4 space-y-6">
              <div className="inline-flex items-center gap-2.5">
                <BrandMark size={30} />
                <span className="text-sm font-bold tracking-tight text-[#002B36]">
                  CONTRACTHUB
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-[2.1rem] font-bold text-[#002B36] tracking-tight leading-[1.12]">
                  Satu ruang.
                  <br />
                  Banyak langkah
                  <br />
                  ke depan.
                </h1>
                <p className="text-sm text-[#002B36]/80 leading-relaxed max-w-xs">
                  Menjaga setiap kerja sama tetap tertib, agar kegiatan pelabuhan terus bergerak.
                </p>
              </div>
            </div>

            <div className="mt-auto w-full">
              <img
                src="/assets/aistudio/Background_VerticalBorder__1__065c3050.png"
                alt="PT Pelindo Cabang Cirebon — Berakar di pesisir, terhubung lebih jauh"
                referrerPolicy="no-referrer"
                className="w-full h-auto block select-none"
              />
            </div>
          </div>

          {/* Right Panel (Auth Form & Demo Account Preset) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002B36]/70 hover:text-[#004C6D] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke beranda</span>
                </button>
                <span className="text-[11px] font-mono-tabular font-semibold text-[#004C6D] tracking-wider">
                  PORTAL PELABUHAN CIREBON
                </span>
              </div>

              {/* Demo Account Preset Card (Mayanggaseta Azahra) */}
              {activePresetUser && (
                <div className="rounded-2xl p-4 bg-[#F4F8F9] border border-[#004C6D]/15 mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#004C6D] text-white flex items-center justify-center shrink-0">
                      {activePresetUser.roleCode === 'ADMIN_LEGAL' ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : (
                        <UserRound className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#002B36] truncate">
                          {activePresetUser.fullName}
                        </p>
                        <span className="text-[11px] font-semibold text-[#004C6D] bg-[#E0F2F1] px-2 py-0.5 rounded">
                          {activePresetUser.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#004C6D] truncate">
                        {activePresetUser.titlePosition}
                      </p>
                      <p className="text-[11px] text-[#002B36]/60 truncate">
                        Akun demo siap pakai · {activePresetUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#002B36]/50">
                      Otoritas
                    </p>
                    <p className="text-xs font-bold text-[#002B36] font-mono-tabular">
                      Tingkat {activePresetUser.roleCode === 'ADMIN_LEGAL' ? '1' : activePresetUser.roleCode === 'LOGISTIK_MANAGER' ? '2' : '3'} · BUMN
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Demo Role Switcher */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[#002B36]/60">
                    Pilih Peran Demo Cepat
                  </span>
                  <span className="text-[#004C6D]">Otomatis isi kredensial</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#F4F8F9] rounded-xl border border-[#004C6D]/10">
                  {DEMO_ROLES.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => handleQuickRoleSelect(r.code)}
                      className={`py-2 px-2.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                        selectedRole === r.code
                          ? 'bg-[#004C6D] text-white shadow-xs'
                          : 'text-[#002B36]/75 hover:bg-white hover:text-[#002B36]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Heading */}
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#004C6D] mb-1">
                  Akses Ruang Kerja
                </p>
                <h2 className="text-2xl font-bold text-[#002B36]">
                  {mode === 'login' ? 'Selamat datang kembali.' : 'Daftarkan akun ruang kerja.'}
                </h2>
                <p className="text-xs text-[#002B36]/65 mt-1">
                  {mode === 'login'
                    ? 'Gunakan akun yang terdaftar untuk melanjutkan ke CONTRACTHUB Pelindo Cirebon.'
                    : 'Lengkapi data mitra atau pegawai pelabuhan untuk aktivasi akses.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'login' ? (
                  <>
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-semibold text-[#002B36] mb-1.5">
                        Alamat Email Dinas / Mitra
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#002B36]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm text-[#002B36]"
                          placeholder="nama@pelindo.co.id"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="login-password" className="block text-xs font-semibold text-[#002B36] mb-1.5">
                        Kata Sandi
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#002B36]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm text-[#002B36] font-mono-tabular"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002B36]/50 hover:text-[#004C6D] cursor-pointer"
                          aria-label="Tampilkan atau sembunyikan kata sandi"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="inline-flex items-center gap-2 text-[#002B36]/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-[#004C6D]/30 text-[#004C6D]"
                        />
                        <span>Ingat saya</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotSent(true)}
                        className="font-semibold text-[#004C6D] hover:underline cursor-pointer"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#002B36] mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#002B36] mb-1">
                        Email Dinas / Perusahaan
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="budi@perusahaan.co.id"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#002B36] mb-1">
                        Nomor WhatsApp Aktif
                      </label>
                      <input
                        type="tel"
                        required
                        value={regWa}
                        onChange={(e) => setRegWa(e.target.value)}
                        placeholder="+6281234567890"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#002B36] mb-1">
                        Instansi / Divisi
                      </label>
                      <input
                        type="text"
                        required
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        placeholder="PT Logistik Cirebon"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#002B36] mb-1">
                        Peran Ruang Kerja
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as RoleCode)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#004C6D]/20 focus:border-[#004C6D] focus:outline-none text-sm bg-white"
                      >
                        <option value="VENDOR">Mitra Vendor PBM</option>
                        <option value="STAFF">Staf Operasional</option>
                        <option value="LOGISTIK_MANAGER">Manajer Logistik</option>
                      </select>
                    </div>
                  </div>
                )}

                {forgotSent && (
                  <div className="p-3 rounded-xl bg-[#E0F2F1] text-[#002B36] text-xs flex items-center justify-between">
                    <span>Tautan pemulihan kata sandi dikirim ke {email}.</span>
                    <button type="button" onClick={() => setForgotSent(false)} className="font-bold cursor-pointer">
                      Tutup
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-5 rounded-xl bg-[#004C6D] hover:bg-[#003852] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {submitting
                      ? 'Memverifikasi Sesi...'
                      : mode === 'login'
                      ? 'Masuk ke ruang kerja'
                      : 'Daftarkan & Masuk ke Ruang Kerja'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {mode === 'login' && (
                <div className="mt-5">
                  <p className="text-[11px] text-center uppercase tracking-wider text-[#002B36]/50 font-semibold mb-3">
                    Atau Masuk Melalui Portal Pelabuhan
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleSsoSignIn}
                      className="py-2.5 px-3 rounded-xl border border-[#004C6D]/15 hover:border-[#004C6D] bg-[#F4F8F9] hover:bg-white text-xs font-semibold text-[#002B36] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-[#004C6D]" />
                      <span>Pelindo ID (SSO)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSsoSignIn}
                      className="py-2.5 px-3 rounded-xl border border-[#004C6D]/15 hover:border-[#004C6D] bg-[#F4F8F9] hover:bg-white text-xs font-semibold text-[#002B36] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Ship className="w-4 h-4 text-[#004C6D]" />
                      <span>Inaportnet Kemenhub</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-[#004C6D]/10 text-center space-y-2 text-xs text-[#002B36]/70">
              <p className="inline-flex items-center justify-center gap-1.5 font-medium text-[#002B36]/80">
                <UserCheck className="w-3.5 h-3.5 text-[#004C6D]" />
                <span>Akses terbatas bagi pengguna terdaftar · Terenkripsi TLS 256-bit</span>
              </p>
              <p>
                {mode === 'login' ? (
                  <>
                    Belum memiliki akun ruang kerja?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="font-bold text-[#004C6D] hover:underline cursor-pointer"
                    >
                      Daftarkan akun baru
                    </button>
                  </>
                ) : (
                  <>
                    Sudah memiliki akun terdaftar?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-bold text-[#004C6D] hover:underline cursor-pointer"
                    >
                      Kembali ke halaman masuk
                    </button>
                  </>
                )}
              </p>
              <p className="text-[11px] text-[#002B36]/55">
                Kendala akses login? Hubungi Tim IT Helpdesk Pelindo Cirebon (Ext. 202 / simopel.cirebon@pelindo.co.id)
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="w-full py-4 px-6 border-t border-[#004C6D]/10 bg-white text-[11px] text-[#002B36]/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong className="text-[#002B36]">CONTRACTHUB</strong> · Divisi Komersial & Operasi Kontrak Cabang Cirebon
          </p>
          <div className="flex items-center gap-4">
            <span>Kebijakan Privasi</span>
            <span>·</span>
            <span>Panduan Sistem</span>
            <span>·</span>
            <span>Keamanan Siber BUMN</span>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#002B36]/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#004C6D]/15 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#002B36]">Layanan Bantuan IT Pelindo Cirebon</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F4F8F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#002B36]/75 leading-relaxed">
              Untuk aktivasi akun Pelindo ID SSO, reset token e-Sign, atau pendaftaran mitra PBM baru di Cabang Cirebon, silakan hubungi:
            </p>
            <div className="p-3.5 rounded-xl bg-[#F4F8F9] text-xs space-y-1 font-mono-tabular">
              <p><strong>Email:</strong> simopel.cirebon@pelindo.co.id</p>
              <p><strong>Ext. Internal:</strong> 202 (Senin–Minggu 24 Jam)</p>
              <p><strong>Kredensial Demo:</strong> DemoBUMN2025!Pelindo</p>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#004C6D] text-white text-xs font-semibold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
