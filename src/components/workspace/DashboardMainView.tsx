import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FilePlus2,
  FileSignature,
  FileText,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Zap,
} from 'lucide-react';
import type {
  Contract,
  ContractDocument,
  ContractHubStore,
  ContractStatus,
  LegalityPermit,
  Reminder,
  User,
} from '../../types/contracthub';
import {
  FOOTER_DRONE_IMG,
  WAREHOUSE_PHOTO_IMG,
} from '../../data/seedData';
import {
  daysUntil,
  formatDateId,
  formatRupiahCompact,
} from '../../utils/formatters';

const AERIAL_BERTH_IMG = '/assets/images/port_aerial_drone_1794410399429.jpg';

type CyclePeriod = 'q1' | 'q2' | 'current';

interface DashboardMainViewProps {
  store: ContractHubStore;
  activeUser: User;
  activeContracts: Contract[];
  scopedDocuments: ContractDocument[];
  scopedLegalities: LegalityPermit[];
  scopedReminders: Reminder[];
  locationFilter: string;
  canCreateContracts: boolean;
  canEditContracts: boolean;
  onOpenCreateModal: () => void;
  onOpenRenewModal: (contract: Contract) => void;
  onSelectContract: (contractId: number) => void;
  onNavigateTab: (
    tab:
      | 'dashboard'
      | 'contracts'
      | 'documents_legalities'
      | 'reminders'
      | 'monitoring'
      | 'reports'
      | 'users'
      | 'settings'
  ) => void;
  onOpenDocSubTab: (sub: 'all_docs' | 'permits' | 'expired_docs' | 'esign') => void;
  onFilterContractsAndGo: (opts: {
    status?: ContractStatus | 'ALL';
    location?: string;
    search?: string;
  }) => void;
  onDispatchReminder: (payload: {
    contractId?: number;
    tier?: 'H-30' | 'H-14' | 'H-7';
    channel?: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
  }) => Promise<void>;
  onResetFilters: () => void;
  onShowToast: (msg: string) => void;
}

export const DashboardMainView: React.FC<DashboardMainViewProps> = ({
  store,
  activeContracts,
  scopedDocuments,
  scopedLegalities,
  scopedReminders,
  locationFilter,
  canCreateContracts,
  canEditContracts,
  onOpenCreateModal,
  onOpenRenewModal,
  onSelectContract,
  onNavigateTab,
  onOpenDocSubTab,
  onFilterContractsAndGo,
  onDispatchReminder,
  onResetFilters,
  onShowToast,
}) => {
  const [cycle, setCycle] = useState<CyclePeriod>('current');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  // Filter active contracts by top-bar facility filter if active
  const contractsInView = useMemo(() => {
    if (locationFilter === 'ALL') return activeContracts;
    return activeContracts.filter((c) => c.portLocation === locationFilter);
  }, [activeContracts, locationFilter]);

  const totalPortfolioValue = useMemo(
    () => contractsInView.reduce((s, c) => s + c.contractValueIdr, 0),
    [contractsInView]
  );
  const totalUtilizedValue = useMemo(
    () => contractsInView.reduce((s, c) => s + c.utilizedValueIdr, 0),
    [contractsInView]
  );

  const activeOperationalContracts = useMemo(
    () => contractsInView.filter((c) => c.status === 'Aktif' || c.status === 'Diperpanjang'),
    [contractsInView]
  );

  const expiringSoon = useMemo(
    () =>
      contractsInView
        .filter((c) => {
          const d = daysUntil(c.endDate);
          return (d <= 30 && d >= 0) || c.status === 'Hampir Habis';
        })
        .sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate)),
    [contractsInView]
  );

  const expiredContracts = useMemo(
    () =>
      contractsInView.filter(
        (c) => c.status === 'Kedaluwarsa' || daysUntil(c.endDate) < 0
      ),
    [contractsInView]
  );

  const criticalH7Count = useMemo(
    () => expiringSoon.filter((c) => daysUntil(c.endDate) <= 7).length,
    [expiringSoon]
  );

  const inNegotiationOrESignCount = useMemo(
    () =>
      contractsInView.filter(
        (c) =>
          c.status === 'Review Legal' ||
          c.status === 'Menunggu e-Sign' ||
          c.status === 'Draft'
      ).length,
    [contractsInView]
  );

  const closedNormalCount = useMemo(
    () =>
      contractsInView.filter(
        (c) => c.status === 'Selesai' || c.status === 'Dihentikan'
      ).length,
    [contractsInView]
  );

  const permitRenewalNeededCount = useMemo(
    () => scopedLegalities.filter((l) => l.status !== 'Berlaku').length,
    [scopedLegalities]
  );

  const healthyPct = useMemo(() => {
    if (contractsInView.length === 0) return 0;
    return Math.round(
      ((activeOperationalContracts.length + expiringSoon.length) /
        contractsInView.length) *
        100
    );
  }, [contractsInView.length, activeOperationalContracts.length, expiringSoon.length]);

  const uniqueVendorCount = useMemo(
    () => new Set(contractsInView.map((c) => c.vendorId)).size,
    [contractsInView]
  );

  // Aggregate Quota & Tonase Realization (weighted utilization across visible contracts)
  const quotaSummary = useMemo(() => {
    const scaleFactor = cycle === 'q1' ? 0.88 : cycle === 'q2' ? 0.94 : 1;
    const totalCapTonEq = contractsInView.reduce((s, c) => {
      if (c.quotaUnit.toLowerCase().includes('ton')) return s + c.quotaTotal;
      return s + c.quotaTotal * 25;
    }, 0);
    const totalUsedTonEq = Math.round(
      contractsInView.reduce((s, c) => {
        if (c.quotaUnit.toLowerCase().includes('ton')) return s + c.quotaUsed;
        return s + c.quotaUsed * 25;
      }, 0) * scaleFactor
    );
    const pct =
      totalCapTonEq > 0
        ? Math.min(100, Math.round((totalUsedTonEq / totalCapTonEq) * 1000) / 10)
        : 0;

    // 3 zone utilizations computed dynamically from contracts
    const zoneRatio = (keywords: string[], fallbackPct: number) => {
      const matched = activeContracts.filter((c) =>
        keywords.some((k) => c.portLocation.toLowerCase().includes(k))
      );
      if (matched.length === 0) return { pct: fallbackPct, count: 0 };
      const sumUsed = matched.reduce((s, c) => s + c.quotaUsed, 0);
      const sumTotal = matched.reduce((s, c) => s + Math.max(1, c.quotaTotal), 0);
      return {
        pct: Math.min(100, Math.round((sumUsed / sumTotal) * 1000) / 10),
        count: matched.length,
      };
    };

    const dermaga = zoneRatio(['dermaga 1', 'muara jati'], 78);
    const gudang = zoneRatio(['gudang'], 72);
    const lapangan = zoneRatio(['lapangan', 'zona utara', 'gate'], 64);

    return {
      totalCapTonEq,
      totalUsedTonEq,
      pct,
      dermaga,
      gudang,
      lapangan,
    };
  }, [contractsInView, activeContracts, cycle]);

  // 7-day operational realization series derived from usage logs + baseline port traffic
  const weeklyTraffic = useMemo(() => {
    const base = [16.2, 19.4, 21.8, 18.9, 24.5, 29.2, 21.4];
    const logBoost = Math.min(4.5, store.usageLogs.length * 0.45);
    const factor = cycle === 'q1' ? 0.86 : cycle === 'q2' ? 0.93 : 1;
    const labels = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
    return labels.map((day, idx) => {
      const val = Number(((base[idx] + (idx === 5 ? logBoost : logBoost * 0.35)) * factor).toFixed(1));
      return {
        day,
        label: idx === 5 ? 'SAB (PEAK)' : day,
        value: val,
      };
    });
  }, [store.usageLogs.length, cycle]);

  const avgDailyTraffic = useMemo(() => {
    const sum = weeklyTraffic.reduce((s, p) => s + p.value, 0);
    return (sum / weeklyTraffic.length).toFixed(1);
  }, [weeklyTraffic]);

  // SVG Sparkline coordinates (viewBox 0 0 360 110)
  const sparklineCoords = useMemo(() => {
    const width = 360;
    const height = 96;
    const padX = 14;
    const padY = 14;
    const maxVal = Math.max(...weeklyTraffic.map((p) => p.value), 30);
    const minVal = Math.min(...weeklyTraffic.map((p) => p.value), 10) * 0.85;
    const pts = weeklyTraffic.map((p, idx) => {
      const x = padX + (idx * (width - padX * 2)) / (weeklyTraffic.length - 1);
      const norm = (p.value - minVal) / Math.max(1, maxVal - minVal);
      const y = height - padY - norm * (height - padY * 2);
      return { x, y, ...p };
    });
    const linePath = pts
      .map((pt, i) => {
        if (i === 0) return `M ${pt.x} ${pt.y}`;
        const prev = pts[i - 1];
        const cx = (prev.x + pt.x) / 2;
        return `C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
      })
      .join(' ');
    const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    return { pts, linePath, areaPath, width, height };
  }, [weeklyTraffic]);

  // Watchlist rows: prioritize H-30/H-14/H-7 + expired + high quota usage contracts
  const watchlistContracts = useMemo(() => {
    const combined = [
      ...expiringSoon,
      ...expiredContracts.filter((e) => !expiringSoon.some((s) => s.id === e.id)),
      ...contractsInView.filter(
        (c) =>
          !expiringSoon.some((s) => s.id === c.id) &&
          !expiredContracts.some((e) => e.id === c.id)
      ),
    ];
    return combined.slice(0, 5);
  }, [expiringSoon, expiredContracts, contractsInView]);

  const urgentBannerContracts = expiringSoon.length > 0 ? expiringSoon : expiredContracts;
  const urgentBannerSummary =
    urgentBannerContracts.length > 0
      ? urgentBannerContracts
          .slice(0, 2)
          .map((c) => `${c.servicePillar} (${c.contractNumber})`)
          .join(' & ')
      : 'Seluruh kontrak aktif dalam pemantauan berkala H-30';

  // Facility cards grounded in actual contracts & local port images
  const facilityCards = useMemo(() => {
    const matchStats = (matcher: (loc: string) => boolean) => {
      const list = activeContracts.filter((c) => matcher(c.portLocation.toLowerCase()));
      const avgPct =
        list.length > 0
          ? Math.round(
              list.reduce(
                (s, c) => s + Math.min(100, (c.quotaUsed / Math.max(1, c.quotaTotal)) * 100),
                0
              ) / list.length
            )
          : 0;
      const targetLoc = list[0]?.portLocation ?? 'ALL';
      return { count: list.length, avgPct, targetLoc, list };
    };

    const berth = matchStats((l) => l.includes('dermaga 1') || l.includes('dermaga'));
    const warehouse = matchStats((l) => l.includes('gudang'));
    const yard = matchStats((l) => l.includes('lapangan') || l.includes('zona utara') || l.includes('gate'));

    return [
      {
        id: 'dermaga',
        badge: `BERTH UTILISASI ${berth.avgPct || 78}%`,
        badgeTone: (berth.avgPct || 78) >= 80 ? 'bg-amber-600' : 'bg-[#004C6D]',
        title: 'Dermaga Muara Jati (Panjang 580m)',
        specs: 'Draf Kedalaman: -7.0 mLWS · Terminal Curah & Umum',
        count: berth.count,
        desc:
          berth.list[0]?.title ??
          'Didominasi kontrak bongkar muat curah kering, batubara, dan konsorsium kapal niaga.',
        image: AERIAL_BERTH_IMG,
        targetLoc: berth.targetLoc,
      },
      {
        id: 'gudang',
        badge: `KAPASITAS ${warehouse.avgPct || 72}%`,
        badgeTone: 'bg-[#004C6D]',
        title: 'Gudang D3 · Lini 1 & Lini 2 Terpadu',
        specs: 'Luas Tertutup: 24.500 m² · Akses Gate & Timbangan Digital',
        count: warehouse.count,
        desc:
          warehouse.list[0]?.title ??
          'Penyimpanan komoditas curah kering, kemasan industri, dan kargo umum 24 jam.',
        image: WAREHOUSE_PHOTO_IMG,
        targetLoc: warehouse.targetLoc,
      },
      {
        id: 'yard',
        badge: `OKUPANSI ${yard.avgPct || 68}%`,
        badgeTone: 'bg-[#005B7F]',
        title: 'Lapangan Penumpukan (CY) & E-Gate',
        specs: 'Zona Utara & Jalur Pantura · RFID Gate Terintegrasi',
        count: yard.count,
        desc:
          yard.list[0]?.title ??
          'Mendukung penumpukan peti kemas, logistik kawasan industri Ciayumajakuning, dan armada trucking.',
        image: FOOTER_DRONE_IMG,
        targetLoc: yard.targetLoc,
      },
    ];
  }, [activeContracts]);

  // Pipeline counts
  const reviewLegalCount = contractsInView.filter((c) => c.status === 'Review Legal').length;
  const waitingESignCount = contractsInView.filter((c) => c.status === 'Menunggu e-Sign').length;
  const sentRemindersCount = scopedReminders.filter((r) => r.dispatchStatus === 'Terkirim').length;

  const cycleLabel =
    cycle === 'q1'
      ? 'Triwulan I · Jan–Mar 2026'
      : cycle === 'q2'
      ? 'Triwulan II · Apr–Jun 2026'
      : 'Periode Berjalan · November 2026';

  const handleExportSummary = () => {
    window.location.href = '/api/export/contracts.csv';
    onShowToast('Mengunduh ringkasan eksekutif portofolio kontrak (CSV)...');
  };

  const handleQuickDispatchWa = async (contract: Contract) => {
    setDispatchingId(contract.id);
    try {
      const days = daysUntil(contract.endDate);
      const tier: 'H-30' | 'H-14' | 'H-7' =
        days <= 7 ? 'H-7' : days <= 14 ? 'H-14' : 'H-30';
      await onDispatchReminder({
        contractId: contract.id,
        tier,
        channel: 'WhatsApp',
      });
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER & CYCLE CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#004C6D]">
            <span className="inline-flex items-center gap-1.5">
              <Anchor className="w-4 h-4" />
              Port Operations Console · Regional 2 Cirebon
            </span>
            <span aria-hidden="true" className="text-[#002B36]/30">
              ·
            </span>
            <span className="font-mono-tabular text-[#002B36]/60">
              06°43&apos;S 108°34&apos;E
            </span>
            {locationFilter !== 'ALL' && (
              <>
                <span aria-hidden="true" className="text-[#002B36]/30">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-amber-700 hover:underline cursor-pointer"
                >
                  Filter: {locationFilter} (Reset)
                </button>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#002B36] leading-tight">
            Pusat Kendali Kontrak Maritim &amp; Logistik
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#002B36]/75">
            <span>
              Siklus Operasional: <strong className="text-[#002B36]">{cycleLabel}</strong>
            </span>
            <span aria-hidden="true" className="text-[#002B36]/30">
              ·
            </span>
            <span className="font-medium text-[#004C6D]">
              Portofolio Terpantau: {contractsInView.length} Perjanjian Kerja Sama
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Cycle Segmented Tabs */}
          <div
            role="group"
            aria-label="Pilih Siklus Operasional"
            className="inline-flex items-center p-1 rounded-lg bg-white border border-[#004C6D]/15"
          >
            {(
              [
                { id: 'q1', label: 'Triwulan 1' },
                { id: 'q2', label: 'Triwulan 2' },
                { id: 'current', label: 'Bulan Berjalan' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCycle(opt.id)}
                className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  cycle === opt.id
                    ? 'bg-[#E1F2F6] text-[#004C6D]'
                    : 'text-[#002B36]/65 hover:text-[#002B36]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Ringkasan Eksekutif</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('contracts')}
            title="Buka filter lanjutan kontrak"
            className="p-2.5 rounded-lg bg-white border border-[#004C6D]/15 text-[#004C6D] hover:bg-[#E1F2F6] transition-colors cursor-pointer"
            aria-label="Filter lanjutan kontrak"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. DARK NAVY EARLY WARNING BANNER */}
      <div className="rounded-xl bg-[#00405B] text-white px-6 py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#002B36]/20">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-rose-500/20 border border-rose-300/30 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6 text-rose-300" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold tracking-wide">
              <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white">
                PERINGATAN DINI H-30/H-7
              </span>
              <span className="text-[#B8DFE6]">OTOMASI PENGINGAT FONNTE &amp; EMAIL</span>
            </div>
            <p className="text-base font-bold text-white leading-snug">
              {urgentBannerContracts.length} Kontrak Prioritas ({urgentBannerSummary})
            </p>
            <p className="text-sm text-[#E1F2F6]/85">
              Peringatan jatuh tempo resmi dan draf adendum siap dikirimkan ke PIC Vendor serta Legal Officer Pelindo Cirebon.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('reminders')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00577A] hover:bg-[#006992] border border-white/15 text-sm font-semibold text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Log Pengiriman WA</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenDocSubTab('expired_docs');
              onNavigateTab('documents_legalities');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#E1F2F6] text-[#002B36] text-sm font-bold whitespace-nowrap cursor-pointer transition-colors"
          >
            <span>Tinjau {Math.max(1, urgentBannerContracts.length)} Berkas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. 4 EXECUTIVE KPI CARDS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Komitmen Aktif */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wider text-[#002B36]/60">
                KOMITMEN AKTIF
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
              {contractsInView.length}
            </p>
            <p className="text-base font-bold text-[#004C6D] font-mono-tabular mt-1.5">
              {formatRupiahCompact(totalPortfolioValue)}
            </p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              Total nilai komitmen kerja sama maritim
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs text-[#002B36]/70 font-mono-tabular">
            <span className="font-semibold text-[#004C6D]">
              {formatRupiahCompact(totalUtilizedValue)} serapan
            </span>
            <span>Pelabuhan Cirebon</span>
          </div>
        </div>

        {/* KPI 2: Kontrak Beroperasi */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-[#E0F2F1] text-[#004C6D] text-xs font-bold font-mono-tabular">
                {healthyPct}% BEROPERASI
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
              {activeOperationalContracts.length}
            </p>
            <p className="text-base font-bold text-[#002B36] mt-1.5">Kontrak Beroperasi</p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              Kepatuhan SLA dermaga &amp; gudang aktif
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs text-[#002B36]/70">
            <span>
              {contractsInView.filter((c) => c.esignStatus === 'Tertandatangani').length} e-Sign Sah
            </span>
            <span className="font-bold text-[#004C6D] font-mono-tabular">
              {uniqueVendorCount} Vendor Mitra
            </span>
          </div>
        </div>

        {/* KPI 3: Mendekati Berakhir */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                TINDAK LANJUT
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#004C6D] font-mono-tabular">
              {expiringSoon.length}
            </p>
            <p className="text-base font-bold text-[#002B36] mt-1.5">H-30 s/d H-7</p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              Perlu tindak lanjut adendum &amp; evaluasi kuota
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-700 font-mono-tabular">
              {criticalH7Count} Kritis H-7
            </span>
            <span className="font-semibold text-[#004C6D] font-mono-tabular">
              {inNegotiationOrESignCount} Review / e-Sign
            </span>
          </div>
        </div>

        {/* KPI 4: Kedaluwarsa / Usai */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                ADENDUM WAJIB
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-rose-700 font-mono-tabular">
              {expiredContracts.length}
            </p>
            <p className="text-base font-bold text-[#002B36] mt-1.5">Kedaluwarsa / Usai</p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              {permitRenewalNeededCount} izin operasional butuh pembaruan
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/70 font-mono-tabular">
              {closedNormalCount} Selesai Normal
            </span>
            <span className="font-bold text-rose-700 font-mono-tabular">
              {expiredContracts.length} Perlu Adendum
            </span>
          </div>
        </div>
      </div>

      {/* 4. MIDDLE 2-COLUMN OPERATIONAL GRID */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Quota Realization + 7-Day Traffic + Quick Actions */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                  <Anchor className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#002B36] leading-snug">
                    Realisasi Kuota &amp; Tonase Pelabuhan
                  </h2>
                  <p className="text-xs text-[#002B36]/65 mt-0.5">
                    {cycleLabel} · Pencatatan Manifest &amp; Gate
                  </p>
                </div>
              </div>
              <span className="text-lg font-extrabold text-[#004C6D] font-mono-tabular shrink-0">
                {quotaSummary.pct}%
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
                  {quotaSummary.totalUsedTonEq.toLocaleString('id-ID')}
                </span>
                <span className="text-sm text-[#002B36]/65 font-mono-tabular">
                  / {quotaSummary.totalCapTonEq.toLocaleString('id-ID')} Unit Eq.
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold font-mono-tabular ${
                  quotaSummary.pct >= 85
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-[#E1F2F6] text-[#004C6D]'
                }`}
              >
                {quotaSummary.pct >= 85 ? 'MENDEKATI BATAS' : 'OPERASIONAL STABIL'}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div>
              <div className="w-full h-3 bg-[#E8F1F4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#004C6D] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, quotaSummary.pct)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#002B36]/60 mt-1.5 font-mono-tabular">
                <span>Ambang Aman (0)</span>
                <span>Target Operasi (70%)</span>
                <span>Batas Maksimum</span>
              </div>
            </div>

            {/* 7-Day Traffic Sparkline */}
            <div className="p-4 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#002B36]">
                  Trafik Bongkar Muat Harian (7 Hari Terakhir)
                </p>
                <span className="text-xs font-bold text-[#004C6D] font-mono-tabular">
                  AVG {avgDailyTraffic}K TON/HARI
                </span>
              </div>

              <div className="relative">
                <svg
                  viewBox={`0 0 ${sparklineCoords.width} ${sparklineCoords.height}`}
                  className="w-full h-24 overflow-visible"
                  role="img"
                  aria-label="Grafik trafik bongkar muat harian 7 hari terakhir"
                >
                  <defs>
                    <linearGradient id="crbTrafficFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#004C6D" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#004C6D" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={sparklineCoords.areaPath} fill="url(#crbTrafficFill)" />
                  <path
                    d={sparklineCoords.linePath}
                    fill="none"
                    stroke="#004C6D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {sparklineCoords.pts.map((pt, idx) => (
                    <g key={pt.day}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredDayIdx === idx || idx === 5 ? 4.5 : 3}
                        fill={idx === 5 ? '#002B36' : '#004C6D'}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                      />
                    </g>
                  ))}
                </svg>

                {hoveredDayIdx !== null && (
                  <div className="text-xs font-mono-tabular font-semibold text-[#004C6D] text-right -mt-1 mb-1">
                    {weeklyTraffic[hoveredDayIdx].label}: {weeklyTraffic[hoveredDayIdx].value}K Ton/Hari
                  </div>
                )}

                <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#002B36]/60 font-mono-tabular">
                  {weeklyTraffic.map((p, idx) => (
                    <span
                      key={p.day}
                      className={idx === 5 ? 'text-[#004C6D] font-bold' : ''}
                    >
                      {p.day}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Zone Utilization Columns */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-[#F4F8F9] border border-[#004C6D]/10">
                <p className="text-[11px] font-bold text-[#002B36]/60 truncate">
                  DERMAGA M. JATI
                </p>
                <p className="text-xl font-extrabold text-[#002B36] font-mono-tabular mt-0.5">
                  {quotaSummary.dermaga.pct}%
                </p>
                <p
                  className={`text-xs font-semibold ${
                    quotaSummary.dermaga.pct >= 80 ? 'text-rose-700' : 'text-[#004C6D]'
                  }`}
                >
                  {quotaSummary.dermaga.pct >= 80 ? 'Padat / Kritis' : 'Optimal'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F4F8F9] border border-[#004C6D]/10">
                <p className="text-[11px] font-bold text-[#002B36]/60 truncate">
                  GUDANG LINI 1
                </p>
                <p className="text-xl font-extrabold text-[#002B36] font-mono-tabular mt-0.5">
                  {quotaSummary.gudang.pct}%
                </p>
                <p className="text-xs font-semibold text-[#004C6D]">Optimal</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F4F8F9] border border-[#004C6D]/10">
                <p className="text-[11px] font-bold text-[#002B36]/60 truncate">
                  ZONA UTARA / CY
                </p>
                <p className="text-xl font-extrabold text-[#002B36] font-mono-tabular mt-0.5">
                  {quotaSummary.lapangan.pct}%
                </p>
                <p
                  className={`text-xs font-semibold ${
                    quotaSummary.lapangan.pct >= 85 ? 'text-amber-700' : 'text-[#004C6D]'
                  }`}
                >
                  {quotaSummary.lapangan.pct >= 85 ? 'Tinggi' : 'Tersedia'}
                </p>
              </div>
            </div>
          </div>

          {/* Aksi Cepat Operasional */}
          <div className="rounded-xl bg-[#004C6D] text-white p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-wider text-[#E1F2F6]">
                AKSI CEPAT OPERASIONAL
              </span>
              <Zap className="w-5 h-5 text-[#B8DFE6]" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (canCreateContracts) {
                    onOpenCreateModal();
                  } else {
                    onNavigateTab('contracts');
                  }
                }}
                className="p-3.5 rounded-lg bg-[#005E86] hover:bg-[#006D9B] border border-white/10 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-5 h-5 text-[#E1F2F6]" />
                <span className="text-xs font-semibold leading-tight">
                  {canCreateContracts ? 'Registrasi Kontrak' : 'Lihat Kontrak'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportSummary}
                className="p-3.5 rounded-lg bg-[#005E86] hover:bg-[#006D9B] border border-white/10 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-5 h-5 text-[#E1F2F6]" />
                <span className="text-xs font-semibold leading-tight">
                  Unduh Rekap Harian
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenDocSubTab('permits');
                  onNavigateTab('documents_legalities');
                }}
                className="p-3.5 rounded-lg bg-[#005E86] hover:bg-[#006D9B] border border-white/10 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-5 h-5 text-[#E1F2F6]" />
                <span className="text-xs font-semibold leading-tight">
                  Cek Kelaikan Legal
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Daftar Kontrak Mendekati Expired (H-30) Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden flex flex-col">
          <div className="p-5 sm:px-6 border-b border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#002B36]">
                  Daftar Kontrak Mendekati Expired (H-30)
                </h2>
                <p className="text-sm text-[#002B36]/65 mt-0.5">
                  Prioritas penanganan legal &amp; negosiasi adendum kuota pelabuhan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-md bg-[#E1F2F6] text-[#004C6D] text-xs font-bold font-mono-tabular">
                {expiringSoon.length > 0 ? `${expiringSoon.length} H-30` : `${watchlistContracts.length} AKTIF`}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('contracts')}
                className="px-3 py-1.5 rounded-md border border-[#004C6D]/20 text-xs sm:text-sm font-semibold text-[#004C6D] hover:bg-[#F4F8F9] cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/12 text-xs font-bold text-[#002B36]/65">
                  <th className="py-3.5 px-4">TENGGAT</th>
                  <th className="py-3.5 px-4">MITRA LOGISTIK / VENDOR</th>
                  <th className="py-3.5 px-4">FASILITAS / ASET</th>
                  <th className="py-3.5 px-4">KAPASITAS</th>
                  <th className="py-3.5 px-4 text-right">AKSI CEPAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#004C6D]/10">
                {watchlistContracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#002B36]/60">
                      Tidak ada kontrak aktif pada fasilitas ini.
                    </td>
                  </tr>
                ) : (
                  watchlistContracts.map((c) => {
                    const days = daysUntil(c.endDate);
                    const pct = Math.min(
                      100,
                      Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100)
                    );
                    const badgeClass =
                      days < 0
                        ? 'bg-rose-700 text-white'
                        : days <= 7
                        ? 'bg-rose-600 text-white'
                        : days <= 14
                        ? 'bg-[#E1F2F6] text-[#004C6D] border border-[#004C6D]/25'
                        : days <= 30
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-[#002B36]/75';

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#F4F8F9]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold font-mono-tabular ${badgeClass}`}
                          >
                            {days < 0
                              ? 'EXPIRED'
                              : days <= 30
                              ? `H-${days} HARI`
                              : `${days} HARI`}
                          </span>
                          <p className="text-xs text-[#002B36]/60 font-mono-tabular mt-1">
                            {formatDateId(c.endDate)}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <button
                            type="button"
                            onClick={() => onSelectContract(c.id)}
                            className="text-left group cursor-pointer"
                          >
                            <p className="font-bold text-[#002B36] group-hover:text-[#004C6D] group-hover:underline leading-snug">
                              {c.vendorName}
                            </p>
                            <p className="text-xs text-[#002B36]/65 font-mono-tabular mt-0.5">
                              {c.contractNumber}
                            </p>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-semibold text-[#002B36] leading-snug">
                            {c.portLocation}
                          </p>
                          <p className="text-xs text-[#004C6D] mt-0.5">
                            {c.servicePillar}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 align-middle whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center justify-between text-xs font-mono-tabular font-bold mb-1.5">
                            <span
                              className={
                                pct >= 85 ? 'text-rose-700' : 'text-[#002B36]'
                              }
                            >
                              {pct}%
                            </span>
                            <span className="text-xs font-normal text-[#002B36]/60">
                              {c.quotaUnit}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#E8F1F4] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 85
                                  ? 'bg-rose-600'
                                  : pct >= 70
                                  ? 'bg-amber-600'
                                  : 'bg-[#004C6D]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {canEditContracts && (
                              <button
                                type="button"
                                disabled={dispatchingId === c.id}
                                onClick={() => handleQuickDispatchWa(c)}
                                title="Kirim pengingat WhatsApp sekarang"
                                className="p-2 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E1F2F6] disabled:opacity-50 cursor-pointer transition-colors"
                                aria-label={`Kirim pengingat WhatsApp untuk ${c.contractNumber}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}
                            {canEditContracts ? (
                              <button
                                type="button"
                                onClick={() => onOpenRenewModal(c)}
                                className="px-3.5 py-2 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
                              >
                                + Draf Adendum
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectContract(c.id)}
                                className="px-3.5 py-2 rounded-lg border border-[#004C6D]/20 hover:bg-[#F4F8F9] text-[#004C6D] text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
                              >
                                Rincian
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 bg-[#F4F8F9] border-t border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[#002B36]/75">
              Auto-Sync Fonnte API &amp; Email: Pengingat H-30, H-14, dan H-7 aktif
            </span>
            <button
              type="button"
              onClick={() => onFilterContractsAndGo({ status: 'Hampir Habis' })}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline cursor-pointer"
            >
              <span>Buka Semua Kontrak Prioritas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. FACILITY CARDS: STATUS FASILITAS PENUNJANG KONTRAK PELABUHAN CIREBON */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#002B36]">
              Status Fasilitas Penunjang Kontrak Pelabuhan Cirebon
            </h2>
            <p className="text-sm text-[#002B36]/70 mt-0.5">
              Pemantauan zona dermaga, lini gudang penimbunan, dan konsesi lapangan kerja sama mitra
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('monitoring')}
            className="text-sm font-bold text-[#004C6D] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Lihat Monitoring Kuota</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {facilityCards.map((fac) => (
            <button
              key={fac.id}
              type="button"
              onClick={() =>
                onFilterContractsAndGo({
                  location: fac.targetLoc,
                  status: 'ALL',
                })
              }
              className="group text-left bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden hover:border-[#004C6D]/40 transition-colors cursor-pointer flex flex-col"
            >
              <div className="relative h-48 w-full overflow-hidden bg-[#002B36]">
                <img
                  src={fac.image}
                  alt={fac.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#002B36]/90 via-[#002B36]/35 to-transparent"
                  aria-hidden="true"
                />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded text-xs font-bold text-white font-mono-tabular ${fac.badgeTone}`}
                >
                  {fac.badge}
                </span>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <p className="text-base font-bold leading-snug">{fac.title}</p>
                  <p className="text-xs text-[#E1F2F6]/90 mt-0.5">{fac.specs}</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between text-sm border-b border-[#004C6D]/10 pb-2.5">
                  <span className="text-[#002B36]/70 font-medium">Kontrak Terikat Aktif:</span>
                  <span className="font-bold text-[#004C6D] font-mono-tabular">
                    {fac.count} Kontrak Berjalan
                  </span>
                </div>
                <p className="text-sm text-[#002B36]/75 leading-relaxed line-clamp-2">
                  {fac.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6. BOTTOM PIPELINE: ALUR DIGITALISASI VERIFIKASI KONTRAK MARITIM */}
      <section className="bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-[#004C6D]">
              INTEGRASI DIGITALISASI &amp; VERIFIKASI LEGAL PELINDO
            </p>
            <h2 className="text-xl font-extrabold text-[#002B36] mt-0.5">
              Alur Digitalisasi Verifikasi Kontrak Maritim
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#004C6D]">
            <CheckCircle2 className="w-5 h-5" />
            SHA-256 Terverifikasi · e-Sign &amp; Gateway Aktif
          </span>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Stage 01 */}
          <button
            type="button"
            onClick={() => {
              onOpenDocSubTab('all_docs');
              onNavigateTab('documents_legalities');
            }}
            className="text-left p-5 rounded-xl bg-[#F4F8F9] hover:bg-[#E1F2F6]/65 border border-[#004C6D]/12 transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#004C6D] mb-2.5">
                <span>TAHAP 01</span>
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#002B36]">Input Berkas &amp; Dokumen</p>
              <p className="text-sm text-[#002B36]/70 mt-1.5 leading-relaxed">
                Unggah perjanjian induk PDF/DOCX, NIB, NPWP, dan dokumen legalitas vendor.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#004C6D]/10 flex items-center gap-2 text-sm font-bold text-emerald-700 font-mono-tabular">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{scopedDocuments.length} Dokumen Terarsip</span>
            </div>
          </button>

          {/* Stage 02 */}
          <button
            type="button"
            onClick={() => onFilterContractsAndGo({ status: 'Review Legal' })}
            className="text-left p-5 rounded-xl bg-[#F4F8F9] hover:bg-[#E1F2F6]/65 border border-[#004C6D]/12 transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#004C6D] mb-2.5">
                <span>TAHAP 02</span>
                <FileCheck2 className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#002B36]">Verifikasi Legal &amp; Operasional</p>
              <p className="text-sm text-[#002B36]/70 mt-1.5 leading-relaxed">
                Peninjauan klausul hukum, batas kuota tonase, dan izin KSOP Kelas II Cirebon.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#004C6D]/10 flex items-center gap-2 text-sm font-bold text-[#004C6D] font-mono-tabular">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{reviewLegalCount} Kontrak Dalam Review</span>
            </div>
          </button>

          {/* Stage 03 */}
          <button
            type="button"
            onClick={() => {
              onOpenDocSubTab('esign');
              onNavigateTab('documents_legalities');
            }}
            className="text-left p-5 rounded-xl bg-[#F4F8F9] hover:bg-[#E1F2F6]/65 border border-[#004C6D]/12 transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#004C6D] mb-2.5">
                <span>TAHAP 03</span>
                <FileSignature className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#002B36]">Tanda Tangan Digital e-Sign</p>
              <p className="text-sm text-[#002B36]/70 mt-1.5 leading-relaxed">
                Validasi bertahap paraf Logistik hingga persetujuan akhir Chief Legal Officer.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#004C6D]/10 flex items-center gap-2 text-sm font-bold text-amber-700 font-mono-tabular">
              <FilePlus2 className="w-4 h-4 shrink-0" />
              <span>{waitingESignCount} Menunggu e-Sign</span>
            </div>
          </button>

          {/* Stage 04 */}
          <button
            type="button"
            onClick={() => onNavigateTab('reminders')}
            className="text-left p-5 rounded-xl bg-[#F4F8F9] hover:bg-[#E1F2F6]/65 border border-[#004C6D]/12 transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#004C6D] mb-2.5">
                <span>TAHAP 04</span>
                <Send className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#002B36]">Gateway Fonnte &amp; Audit</p>
              <p className="text-sm text-[#002B36]/70 mt-1.5 leading-relaxed">
                Otomatisasi pengingat WhatsApp &amp; Email H-30/14/7 dan pencatatan audit trail.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[#004C6D]/10 flex items-center gap-2 text-sm font-bold text-[#004C6D] font-mono-tabular">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sentRemindersCount} Notifikasi Terkirim</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
