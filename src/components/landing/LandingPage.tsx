import React, { useState } from 'react';
import {
  Anchor,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  Truck,
  UserRound,
  Warehouse,
  X,
} from 'lucide-react';
import type { ContractHubStore, RoleCode, ServicePillar, User } from '../../types/contracthub';
import { FOOTER_DRONE_IMG, WAREHOUSE_PHOTO_IMG } from '../../data/seedData';
import { formatRupiahCompact, daysUntil, formatDateId } from '../../utils/formatters';
import { BrandMark } from '../shared/BrandMark';

interface LandingPageProps {
  store: ContractHubStore;
  activeUser: User | null;
  onOpenLogin: (preselectRole?: RoleCode) => void;
  onOpenWorkspace: (initialTab?: string, filterPillar?: ServicePillar) => void;
}

const PILLARS: {
  title: ServicePillar;
  code: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    title: 'Sewa Gudang 24 Jam',
    code: '01',
    desc: 'Pengelolaan kontrak sewa ruang gudang tertutup D3, kapasitas m², dan tarif operasional 24/7.',
    icon: Warehouse,
  },
  {
    title: 'Trucking Armada',
    code: '02',
    desc: 'Kontrol kuota ritase armada pengangkut kontainer & curah jalur Pantura terintegrasi manifest.',
    icon: Truck,
  },
  {
    title: 'PBM Bongkar Muat',
    code: '03',
    desc: 'Pemantauan perjanjian Perusahaan Bongkar Muat, realisasi tonase dermaga, serta adendum kuota.',
    icon: Anchor,
  },
  {
    title: 'Pas Masuk E-Gate',
    code: '04',
    desc: 'Kontrak penerbitan dan pemeliharaan kartu akses RFID E-Gate untuk kendaraan dan personel pelabuhan.',
    icon: KeyRound,
  },
  {
    title: 'Sewa Lahan',
    code: '05',
    desc: 'Administrasi sewa lapangan penumpukan terbuka zona utara & muara jati beserta peringatan jatuh tempo.',
    icon: MapPin,
  },
  {
    title: 'Permit Tracker',
    code: '06',
    desc: 'Pelacakan legalitas KSOP, PMKU, sertifikasi ISPS Code, dan izin lingkungan pelabuhan secara terpusat.',
    icon: ShieldCheck,
  },
];

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Inisiasi & Verifikasi Mitra',
    desc: 'Pendaftaran PKS baru dilengkapi validasi NIB, NPWP, dan profil kepatuhan mitra pelabuhan Cirebon.',
  },
  {
    num: '02',
    title: 'Peninjauan Legal & Kuota',
    desc: 'Tim Hukum dan Manajer Logistik menyelaraskan klausul, nilai kontrak (Rp), serta kuota tonase/lahan.',
  },
  {
    num: '03',
    title: 'Persetujuan & e-Sign BUMN',
    desc: 'Paraf berjenjang hingga pengesahan Chief Legal Officer dengan segel digital SHA-256 yang sah.',
  },
  {
    num: '04',
    title: 'Pemantauan & Pengingat Otomatis',
    desc: 'Realisasi kuota harian terukur otomatis disertai peringatan WhatsApp & Email di titik H-30, H-14, dan H-7.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  store,
  activeUser,
  onOpenLogin,
  onOpenWorkspace,
}) => {
  const [liveQuotaOpen, setLiveQuotaOpen] = useState(false);

  const totalValue = store.contracts.reduce((acc, c) => acc + c.contractValueIdr, 0);
  const activeCount = store.contracts.filter(
    (c) => c.status === 'Aktif' || c.status === 'Hampir Habis' || c.status === 'Diperpanjang'
  ).length;
  const compliantPermits = store.legalities.filter((l) => l.status === 'Berlaku').length;

  return (
    <div className="min-h-screen bg-white text-[#002B36]">
      {/* 1. FIXED GLASSMORPHISM NAVBAR (IMMEDIATELY VISIBLE) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-md border-b border-[#004C6D]/12 shadow-xs">
        <div className="w-full px-5 sm:px-8 lg:px-12 h-24 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="#beranda"
            className="inline-flex items-center gap-3.5 text-[#002B36] font-bold text-xl sm:text-2xl tracking-tight whitespace-nowrap shrink-0"
          >
            <BrandMark size={44} />
            <div className="leading-none">
              <span className="block">CONTRACTHUB</span>
              <span className="hidden sm:block text-[11px] font-semibold tracking-wider text-[#004C6D] mt-1">
                PELINDO REGIONAL 2 CIREBON
              </span>
            </div>
          </a>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden md:flex items-center md:gap-7 lg:gap-11 text-base lg:text-[17px] font-semibold text-[#002B36]/85">
            <a href="#layanan" className="hover:text-[#004C6D] transition-colors whitespace-nowrap shrink-0">
              Layanan
            </a>
            <a href="#alur-kerja" className="hover:text-[#004C6D] transition-colors whitespace-nowrap shrink-0">
              Alur Kerja
            </a>
            <a href="#dokumen" className="hover:text-[#004C6D] transition-colors whitespace-nowrap shrink-0">
              Dokumen
            </a>
            <a href="#pengingat" className="hover:text-[#004C6D] transition-colors whitespace-nowrap shrink-0">
              Pengingat
            </a>
            <a href="#hak-akses" className="hover:text-[#004C6D] transition-colors whitespace-nowrap shrink-0">
              Hak Akses
            </a>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center shrink-0">
            {activeUser ? (
              <button
                type="button"
                onClick={() => onOpenWorkspace('dashboard')}
                className="inline-flex items-center gap-3 pl-3 pr-5 sm:pr-6 py-2.5 rounded-xl bg-[#004C6D] hover:bg-[#003a54] text-white text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  {activeUser.roleCode === 'ADMIN_LEGAL' ? (
                    <ShieldCheck className="w-5 h-5 text-white" />
                  ) : (
                    <UserRound className="w-5 h-5 text-white" />
                  )}
                </span>
                <span className="hidden sm:inline">Ruang Kerja · {activeUser.fullName.split(' ')[0]}</span>
                <span className="sm:hidden">Ruang Kerja</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenLogin()}
                className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-xl bg-[#004C6D] hover:bg-[#003a54] text-white text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <span>Masuk Ruang Kerja</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. COASTAL HARBOR HERO SECTION */}
      <section
        id="beranda"
        className="relative bg-[#E0F2F1] border-b border-[#004C6D]/10 overflow-hidden pt-24"
      >
        <div className="relative flex flex-col justify-between md:block md:h-[calc(100svh-6rem)] md:min-h-[540px] md:max-h-[800px] overflow-hidden">
          {/* Exact Row-Matched Horizontal Extension Backdrop for Fullscreen / Ultrawide Viewports */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none select-none"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(180deg, #E0F2F1 0%, #E0F2F1 57.3%, #B7DFE2 57.32%, #B7DFE2 60.4%, #91C6D0 60.45%, #91C6D0 62.1%, #B7DFE2 62.15%, #B7DFE2 83.4%, #8DCBD0 83.45%, #8DCBD0 85.8%, #69ADBE 85.85%, #69ADBE 100%)',
            }}
          />

          {/* Desktop/Tablet Harbor Artwork: object-contain preserves 100% of Mega Mendung cloud, sun, crane & ship without vertical clipping */}
          <img
            src="/assets/aistudio/Lanskap_pesisir_berlapis__2__a1b88acd.png"
            alt="Lanskap pesisir Pelabuhan Cirebon dengan kapal kargo, gudang logistik, derek peti kemas, dan awan Mega Mendung"
            referrerPolicy="no-referrer"
            className="hidden md:block absolute inset-0 w-full h-full object-contain object-right-bottom select-none pointer-events-none"
          />

          {/* Live Hero Copy & Primary Actions */}
          <div className="relative z-20 w-full px-5 sm:px-8 lg:px-12 pt-8 pb-6 md:pt-10 md:pb-24 md:h-full md:flex md:items-center">
            <div className="max-w-2xl md:max-w-xl lg:max-w-2xl space-y-5 sm:space-y-6 md:-mt-10 lg:-mt-12">
              <div className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#004C6D]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#004C6D] shrink-0" aria-hidden="true" />
                <span>PT Pelabuhan Indonesia (Persero) Regional 2 Cirebon</span>
              </div>

              <h1
                className="font-extrabold text-[#002B36] tracking-tight leading-[1.04]"
                style={{ fontSize: 'clamp(2.65rem, 5.2vw, 4.65rem)' }}
              >
                Kontrak tertib.
                <br />
                Pelabuhan bergerak.
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-[#002B36]/85 leading-relaxed max-w-xl">
                Satu ruang untuk mengelola kontrak, menjaga legalitas, dan memastikan setiap kerja sama tetap berlayar.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenLogin()}
                  className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-[#004C6D] hover:bg-[#003852] text-white text-sm sm:text-base font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Buka ruang kerja</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setLiveQuotaOpen(true)}
                  className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/95 hover:bg-white text-[#004C6D] border border-[#004C6D]/15 text-sm sm:text-base font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Gauge className="w-5 h-5 text-[#004C6D]" />
                  <span>Live Quota</span>
                </button>

                <a
                  href="#layanan"
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/80 hover:bg-white border border-[#004C6D]/20 hover:border-[#004C6D] text-[#002B36] text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Jelajahi sistem</span>
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Stacked Harbor Artwork (< md): 100% unclipped cloud, ship & crane below copy */}
          <div className="relative md:hidden w-full">
            <img
              src="/assets/aistudio/Lanskap_pesisir_berlapis__2__a1b88acd.png"
              alt="Lanskap pesisir Pelabuhan Cirebon dengan kapal kargo, gudang logistik, derek peti kemas, dan awan Mega Mendung"
              referrerPolicy="no-referrer"
              className="w-full h-auto block select-none"
            />
          </div>

          {/* Coastal Coordinate & Tagline Bar over Foreground Waves */}
          <div className="bg-[#69ADBE] md:bg-transparent md:absolute md:bottom-3.5 md:inset-x-0 z-20 pointer-events-none py-3 md:py-0">
            <div className="w-full px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 text-[#002B36]">
              <div>
                <p className="font-mono-tabular text-[10px] font-bold tracking-wider uppercase text-[#002B36]/85">
                  06°42&apos; LS / 108°34&apos; BT
                </p>
                <p className="text-xs italic font-medium text-[#002B36]/90">
                  Berakar di pesisir, terhubung lebih jauh.
                </p>
              </div>
              <p className="text-[11px] font-medium text-[#002B36]/85 md:pr-14 lg:pr-20">
                Gudang · Angkutan · Kerja sama pelabuhan
              </p>
            </div>
          </div>
        </div>

        {/* 4-column Proof Metrics Bar below Hero Stage */}
        <div className="bg-white border-t border-[#004C6D]/10 relative z-20">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#002B36]/60 mb-1">Portofolio Nilai Kontrak</p>
              <p className="text-2xl font-bold text-[#002B36] font-mono-tabular">
                {formatRupiahCompact(totalValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#002B36]/60 mb-1">Perjanjian Kerja Sama Aktif</p>
              <p className="text-2xl font-bold text-[#002B36] font-mono-tabular">
                {activeCount} / {store.contracts.length} Kontrak
              </p>
            </div>
            <div>
              <p className="text-xs text-[#002B36]/60 mb-1">Kepatuhan Izin Pelabuhan</p>
              <p className="text-2xl font-bold text-[#004C6D] font-mono-tabular">
                {compliantPermits} dari {store.legalities.length} Berlaku
              </p>
            </div>
            <div>
              <p className="text-xs text-[#002B36]/60 mb-1">Siklus Pengingat Otomatis</p>
              <p className="text-2xl font-bold text-[#002B36] font-mono-tabular">
                H-30 · H-14 · H-7
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VALUE PROPOSITION SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#004C6D] mb-3">
              Nilai Tata Kelola
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#002B36] tracking-tight leading-tight text-balance">
              Bukan sekadar arsip. Kendali atas setiap janji.
            </h2>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#004C6D]/10 border-y border-[#004C6D]/10">
            <div className="py-6 flex gap-5 items-start">
              <span className="font-mono-tabular text-sm font-semibold text-[#004C6D] pt-0.5">01.</span>
              <div>
                <h3 className="text-lg font-semibold text-[#002B36] mb-1.5">
                  Kendali Nilai Kontrak & Masa Berlaku Tanpa Celah
                </h3>
                <p className="text-sm md:text-base text-[#002B36]/75 leading-relaxed">
                  Setiap kontrak mencatat nilai Rupiah, realisasi serapan anggaran, lokasi dermaga/gudang, serta tanggal jatuh tempo agar tidak ada perjanjian berakhir tanpa evaluasi.
                </p>
              </div>
            </div>

            <div className="py-6 flex gap-5 items-start">
              <span className="font-mono-tabular text-sm font-semibold text-[#004C6D] pt-0.5">02.</span>
              <div>
                <h3 className="text-lg font-semibold text-[#002B36] mb-1.5">
                  Sinkronisasi Kuota Operasional Lapangan secara Langsung
                </h3>
                <p className="text-sm md:text-base text-[#002B36]/75 leading-relaxed">
                  Realisasi tonase bongkar muat, ritase truk Pantura, luas sewa gudang D3, hingga penerbitan pas E-Gate langsung memotong kuota aktif kontrak secara transparan.
                </p>
              </div>
            </div>

            <div className="py-6 flex gap-5 items-start">
              <span className="font-mono-tabular text-sm font-semibold text-[#004C6D] pt-0.5">03.</span>
              <div>
                <h3 className="text-lg font-semibold text-[#002B36] mb-1.5">
                  Kepatuhan Hukum BUMN & Jejak Audit Tidak Terubah
                </h3>
                <p className="text-sm md:text-base text-[#002B36]/75 leading-relaxed">
                  Setiap pengunggahan dokumen PDF/Word, verifikasi legal, persetujuan adendum, dan tanda tangan elektronik terekam kronologis beserta aktor pelaksananya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 6 SERVICE PILLARS GRID */}
      <section id="layanan" className="py-20 bg-[#F4F8F9] border-y border-[#004C6D]/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#004C6D] mb-2">
                Enam Pilar Layanan Kepelabuhanan
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#002B36] tracking-tight text-balance">
                Seluruh lini operasional Pelindo Cirebon dalam satu standar kendali.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenWorkspace('contracts')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#004C6D] hover:text-[#002B36] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Lihat seluruh kontrak</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const matched = store.contracts.filter((c) => c.servicePillar === pillar.title);
              const totalVal = matched.reduce((sum, c) => sum + c.contractValueIdr, 0);

              return (
                <button
                  key={pillar.title}
                  type="button"
                  onClick={() => onOpenWorkspace('contracts', pillar.title)}
                  className="text-left group bg-white rounded-xl p-6 border border-[#004C6D]/12 hover:border-[#004C6D] transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] text-[#004C6D] flex items-center justify-center group-hover:bg-[#004C6D] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono-tabular text-xs font-semibold text-[#002B36]/45">
                        {pillar.code}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#002B36] mb-2 group-hover:text-[#004C6D] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#002B36]/75 leading-relaxed mb-6">
                      {pillar.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs text-[#002B36]/70 font-mono-tabular">
                    <span>{matched.length} Kontrak Terdaftar</span>
                    <span className="font-semibold text-[#004C6D]">
                      {totalVal > 0 ? formatRupiahCompact(totalVal) : 'Aktif'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW SECTION (DARK NAVY #002B36) */}
      <section id="alur-kerja" className="py-20 bg-[#002B36] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E0F2F1] mb-3">
              Siklus Hidup Kontrak
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
              Setiap tahap, jelas arahnya.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.num}
                className="rounded-xl p-6 bg-white/[0.04] border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block font-mono-tabular text-2xl font-bold text-[#E0F2F1] mb-4">
                    {step.num}
                  </span>
                  <h3 className="text-lg font-semibold text-white mb-2.5 tracking-wide">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DOCUMENT DIGITIZATION (UNDERWATER THEME + REAL WAREHOUSE PHOTO) */}
      <section
        id="dokumen"
        className="py-20 bg-gradient-to-br from-[#003852] via-[#004C6D] to-[#002B36] text-white"
      >
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-lg">
              <img
                src={WAREHOUSE_PHOTO_IMG}
                alt="Gudang logistik modern PT Pelindo Regional 2 Cirebon"
                referrerPolicy="no-referrer"
                className="w-full h-[360px] object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#002B36]/85 via-[#004C6D]/25 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-xs text-[#E0F2F1]">
                <span>Gudang Tertutup D3 · Pelabuhan Cirebon</span>
                <span className="font-mono-tabular">Arsip Digital Terenkripsi SHA-256</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E0F2F1]">
              Digitalisasi Dokumen & Legalitas
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-balance">
              Dokumen lengkap. Keputusan lebih mantap.
            </h2>
            <p className="text-base text-white/80 leading-relaxed">
              Simpan naskah Perjanjian Induk, draf Adendum Word, Berita Acara Serah Terima (BAST), hingga lampiran tarif dalam satu brankas dokumen berversi dengan validasi integritas otomatis.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.06] border border-white/10">
                <FileText className="w-5 h-5 text-[#E0F2F1] mb-2" />
                <p className="font-semibold text-sm mb-1">Unggah PDF & DOCX</p>
                <p className="text-xs text-white/75">
                  Mendukung riwayat versi dokumen dan verifikasi checksum SHA-256.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.06] border border-white/10">
                <FileCheck2 className="w-5 h-5 text-[#E0F2F1] mb-2" />
                <p className="font-semibold text-sm mb-1">Validasi e-Sign Berjenjang</p>
                <p className="text-xs text-white/75">
                  Alur paraf Manajer Logistik hingga pengesahan Chief Legal Officer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SMART REMINDER SECTION (MINT #E0F2F1) */}
      <section id="pengingat" className="py-20 bg-[#E0F2F1]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#004C6D]">
                Sistem Peringatan Dini Terjadwal
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#002B36] tracking-tight leading-tight text-balance">
                Jangan biarkan waktu berlabuh tanpa kabar.
              </h2>
              <p className="text-base text-[#002B36]/80 leading-relaxed">
                Sistem otomatis memantau tanggal jatuh tempo setiap kontrak dan izin pelabuhan, lalu mengirimkan peringatan ke WhatsApp serta Email PIC Mitra, Manajer Logistik, dan Chief Legal Officer.
              </p>
              <button
                type="button"
                onClick={() => onOpenWorkspace('reminders')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BellRing className="w-4 h-4" />
                <span>Kelola Antrean Pengingat</span>
              </button>
            </div>

            <div className="lg:col-span-6 space-y-4">
              {[
                {
                  tier: 'H-30',
                  label: 'Tahap Evaluasi Awal & Persiapan Adendum',
                  detail: 'Dikirim otomatis ke Manajer Logistik & PIC Mitra Vendor 30 hari sebelum jatuh tempo.',
                  tone: 'bg-white border-[#004C6D]/20 text-[#004C6D]',
                },
                {
                  tier: 'H-14',
                  label: 'Konfirmasi Perpanjangan via WhatsApp & Email',
                  detail: 'Memastikan dokumen pendukung adendum & BAST telah masuk ke meja peninjauan legal.',
                  tone: 'bg-amber-50 border-amber-300 text-amber-900',
                },
                {
                  tier: 'H-7',
                  label: 'Eskalasi Prioritas Chief Legal Officer',
                  detail: 'Peringatan darurat kepada Admin Legal untuk menghindari kekosongan hukum operasional dermaga.',
                  tone: 'bg-rose-50 border-rose-300 text-rose-900',
                },
              ].map((item) => (
                <div
                  key={item.tier}
                  className="bg-white rounded-xl p-5 border border-[#004C6D]/15 flex items-start gap-4"
                >
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-tabular border shrink-0 ${item.tone}`}
                  >
                    {item.tier}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#002B36] mb-1">{item.label}</h3>
                    <p className="text-xs md:text-sm text-[#002B36]/75 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. RBAC SECTION */}
      <section id="hak-akses" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#004C6D] mb-2">
              Kontrol Akses Berbasis Peran
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#002B36] tracking-tight text-balance">
              Hak Akses Terkontrol, Kerja Lebih Terarah.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {store.roles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl p-6 bg-[#F4F8F9] border border-[#004C6D]/12 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Lock className="w-4 h-4 text-[#004C6D]" />
                    <span className="text-xs font-mono-tabular text-[#002B36]/60">
                      Tingkat {role.authorityLevel}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#002B36] mb-2">{role.name}</h3>
                  <p className="text-xs text-[#002B36]/75 leading-relaxed mb-5">
                    {role.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#004C6D]/10">
                  <button
                    type="button"
                    onClick={() => onOpenLogin(role.code)}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#004C6D] text-[#004C6D] hover:text-white border border-[#004C6D]/20 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Masuk sebagai Peran Ini
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FOOTER WITH DRONE PORT PHOTO BANNER */}
      <footer className="bg-[#002B36] text-white">
        <div className="relative overflow-hidden">
          <img
            src={FOOTER_DRONE_IMG}
            alt="Panorama senja Pelabuhan PT Pelindo Cirebon dari udara"
            referrerPolicy="no-referrer"
            className="w-full h-[340px] object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#002B36] via-[#002B36]/70 to-[#002B36]/40"
            aria-hidden="true"
          />
          <div className="absolute inset-0 max-w-7xl mx-auto px-6 flex flex-col justify-center items-start">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E0F2F1] mb-3">
              Siap Menavigasi Operasional Pelabuhan
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-xl text-balance mb-6">
              Siap menata langkah berikutnya?
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenLogin()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#E0F2F1] hover:bg-white text-[#002B36] text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Masuk ke Ruang Kerja</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-3">
            <BrandMark size={28} />
            <div>
              <p className="font-bold text-white text-sm">CONTRACTHUB</p>
              <p>PT Pelabuhan Indonesia (Persero) Regional 2 Cabang Cirebon · Jl. Perniagaan No. 4, Kota Cirebon</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#layanan" className="hover:text-white transition-colors">Pilar Layanan</a>
            <a href="#alur-kerja" className="hover:text-white transition-colors">Alur Kerja</a>
            <a href="#pengingat" className="hover:text-white transition-colors">Pengingat H-30/14/7</a>
            <button
              type="button"
              onClick={() => onOpenWorkspace('dashboard')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Ruang Kerja
            </button>
          </div>
        </div>
      </footer>

      {/* LIVE QUOTA MODAL DRAWER */}
      {liveQuotaOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#002B36]/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-quota-title"
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#004C6D]/20 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#004C6D]/10 flex items-center justify-between bg-[#F4F8F9]">
              <div>
                <h3 id="live-quota-title" className="text-lg font-bold text-[#002B36]">
                  Live Quota Pelabuhan Cirebon
                </h3>
                <p className="text-xs text-[#002B36]/70">
                  Realisasi serapan kuota kontrak aktif seluruh pilar layanan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiveQuotaOpen(false)}
                className="p-2 rounded-lg text-[#002B36]/70 hover:bg-white cursor-pointer"
                aria-label="Tutup modal Live Quota"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
              {store.contracts.map((c) => {
                const pct = Math.min(100, Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100));
                const leftDays = daysUntil(c.endDate);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-[#004C6D]/12 bg-white space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono-tabular text-xs font-semibold text-[#004C6D]">
                          {c.contractNumber} · {c.servicePillar}
                        </span>
                        <h4 className="text-sm font-bold text-[#002B36]">{c.title}</h4>
                      </div>
                      <span className="text-xs font-mono-tabular text-[#002B36]/70">
                        Berakhir {formatDateId(c.endDate)} ({leftDays > 0 ? `H-${leftDays}` : 'Selesai'})
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-[#F4F8F9] rounded-full overflow-hidden border border-[#004C6D]/10">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 85 ? 'bg-amber-600' : 'bg-[#004C6D]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono-tabular text-[#002B36]/80">
                      <span>
                        Terpakai: {c.quotaUsed.toLocaleString('id-ID')} / {c.quotaTotal.toLocaleString('id-ID')} {c.quotaUnit}
                      </span>
                      <span className="font-bold text-[#004C6D]">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-[#004C6D]/10 bg-[#F4F8F9] flex items-center justify-between">
              <span className="text-xs text-[#002B36]/70 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#004C6D]" />
                Tersinkronisasi dengan pencatatan lapangan & e-Gate
              </span>
              <button
                type="button"
                onClick={() => {
                  setLiveQuotaOpen(false);
                  onOpenWorkspace('usage');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004C6D] text-white text-xs font-semibold hover:bg-[#003852] cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Buka Log Kuota Lengkap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
