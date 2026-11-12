import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  PieChart as PieChartIcon,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type {
  Contract,
  ContractHubStore,
  ContractStatus,
  ServicePillar,
  User,
} from '../../types/contracthub';
import {
  daysUntil,
  formatDateId,
  formatRupiah,
  formatRupiahCompact,
} from '../../utils/formatters';

interface ArchitectureExplorerProps {
  store: ContractHubStore;
  activeUser?: User;
  onLogReportExport: (type: string) => void;
  onNavigateTab?: (
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
  onFilterContractsAndGo?: (opts: {
    status?: ContractStatus | 'ALL';
    location?: string;
    pillar?: ServicePillar | 'ALL';
  }) => void;
}

type ReportMode = 'all' | 'period' | 'pillar' | 'expired' | 'usage' | 'legality';
type PeriodPreset = 'ALL' | '2026' | 'Q4_2026' | 'CUSTOM';

interface CompiledReportRow {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  categoryLabel: string;
  categoryTone: string;
  formatLabel: 'PDF' | 'CSV / XLSX' | 'CSV + PDF';
  sizeLabel: string;
  validationStatus: 'Tervalidasi Legal' | 'Perlu Tinjauan H-30' | 'Sinkronisasi Aktif' | 'Resmi KSOP';
  validatorNote: string;
  mode: ReportMode;
  pillarFilter?: ServicePillar;
}

const SERVICE_PILLAR_META: {
  pillar: ServicePillar;
  shortLabel: string;
  color: string;
}[] = [
  { pillar: 'Sewa Gudang 24 Jam', shortLabel: 'Sewa Gudang D3', color: '#004C6D' },
  { pillar: 'PBM Bongkar Muat', shortLabel: 'PBM Curah & Bongkar Muat', color: '#0D7496' },
  { pillar: 'Trucking Armada', shortLabel: 'Trucking Armada Ritase', color: '#2F95B0' },
  { pillar: 'Sewa Lahan', shortLabel: 'Lahan Open Storage CY', color: '#5AB4C8' },
  { pillar: 'Pas Masuk E-Gate', shortLabel: 'Pas RFID & E-Gate', color: '#8FD0DE' },
  { pillar: 'Permit Tracker', shortLabel: 'Izin & Permit Maritim', color: '#B8E3EB' },
];

const REPORTS_PER_PAGE = 4;

function triggerCsvDownload(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
      '\n'
    );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ArchitectureExplorer: React.FC<ArchitectureExplorerProps> = ({
  store,
  activeUser,
  onLogReportExport,
  onNavigateTab,
  onFilterContractsAndGo,
}) => {
  // Parameter filter controls
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ALL');
  const [periodStart, setPeriodStart] = useState('2025-01-01');
  const [periodEnd, setPeriodEnd] = useState('2027-12-31');
  const [selectedPillar, setSelectedPillar] = useState<ServicePillar | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');

  // Active printable report mode
  const [reportMode, setReportMode] = useState<ReportMode>('all');

  // Charts & tables interactive state
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredPillar, setHoveredPillar] = useState<ServicePillar | null>(null);
  const [reportSearch, setReportSearch] = useState('');
  const [reportCatFilter, setReportCatFilter] = useState<'ALL' | ReportMode>('ALL');
  const [reportPage, setReportPage] = useState(1);
  const [generatedReports, setGeneratedReports] = useState<CompiledReportRow[]>([]);

  const activeContracts = useMemo(
    () => store.contracts.filter((c) => !c.deletedAt),
    [store.contracts]
  );

  const uniqueLocations = useMemo(() => {
    const merged = new Set([
      ...(store.portLocations ?? []),
      ...activeContracts.map((c) => c.portLocation),
    ]);
    return Array.from(merged);
  }, [store.portLocations, activeContracts]);

  const effectiveDates = useMemo(() => {
    if (periodPreset === '2026') return { start: '2026-01-01', end: '2026-12-31' };
    if (periodPreset === 'Q4_2026') return { start: '2026-10-01', end: '2026-12-31' };
    if (periodPreset === 'CUSTOM') return { start: periodStart, end: periodEnd };
    return { start: '2024-01-01', end: '2028-12-31' };
  }, [periodPreset, periodStart, periodEnd]);

  const filteredContracts = useMemo(() => {
    return activeContracts.filter((c) => {
      const matchesPillar = selectedPillar === 'ALL' || c.servicePillar === selectedPillar;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesLocation = locationFilter === 'ALL' || c.portLocation === locationFilter;
      const overlapsPeriod =
        c.endDate >= effectiveDates.start && c.startDate <= effectiveDates.end;
      return matchesPillar && matchesStatus && matchesLocation && overlapsPeriod;
    });
  }, [activeContracts, selectedPillar, statusFilter, locationFilter, effectiveDates]);

  const sheetContracts = useMemo(() => {
    if (reportMode === 'expired') {
      return filteredContracts.filter(
        (c) =>
          c.status === 'Kedaluwarsa' ||
          c.status === 'Hampir Habis' ||
          daysUntil(c.endDate) <= 30
      );
    }
    return filteredContracts;
  }, [filteredContracts, reportMode]);

  // Executive KPIs computed live from filteredContracts
  const kpis = useMemo(() => {
    const totalContractValue = filteredContracts.reduce((s, c) => s + c.contractValueIdr, 0);
    const totalUtilized = filteredContracts.reduce((s, c) => s + c.utilizedValueIdr, 0);
    const utilizationPct =
      totalContractValue > 0 ? Math.round((totalUtilized / totalContractValue) * 1000) / 10 : 0;

    const renewalContracts = filteredContracts.filter(
      (c) =>
        c.status === 'Hampir Habis' ||
        c.status === 'Kedaluwarsa' ||
        (daysUntil(c.endDate) <= 30 && daysUntil(c.endDate) >= 0)
    );
    const renewalValue = renewalContracts.reduce((s, c) => s + c.contractValueIdr, 0);

    const totalTonEqUsed = filteredContracts.reduce((s, c) => {
      return s + (c.quotaUnit.toLowerCase().includes('ton') ? c.quotaUsed : c.quotaUsed * 15);
    }, 0);
    const totalTonEqCap = filteredContracts.reduce((s, c) => {
      return (
        s +
        (c.quotaUnit.toLowerCase().includes('ton')
          ? Math.max(1, c.quotaTotal)
          : Math.max(1, c.quotaTotal) * 15)
      );
    }, 0);
    const quotaPct =
      totalTonEqCap > 0 ? Math.min(100, Math.round((totalTonEqUsed / totalTonEqCap) * 1000) / 10) : 0;

    return {
      totalContractValue,
      totalUtilized,
      utilizationPct,
      remainingProjection: Math.max(0, totalContractValue - totalUtilized),
      renewalContracts,
      renewalValue,
      totalTonEqUsed,
      quotaPct,
    };
  }, [filteredContracts]);

  // Monthly Trend Chart data (derived from filteredContracts)
  const monthlySeries = useMemo(() => {
    const labels = [
      "Jan '26",
      "Feb '26",
      "Mar '26",
      "Apr '26",
      "Mei '26",
      "Jun '26",
      "Jul '26",
      "Agu '26",
      "Sep '26",
      "Okt '26",
      "Nov '26",
    ];
    const baseTotalM = Math.max(4, kpis.totalContractValue / 1_000_000_000);
    const ratios = [0.56, 0.62, 0.68, 0.72, 0.74, 0.78, 0.82, 0.86, 0.91, 0.96, 1];
    return labels.map((label, idx) => {
      const valueM = Number((baseTotalM * ratios[idx]).toFixed(1));
      const count = Math.max(
        1,
        Math.round(filteredContracts.length * (0.55 + idx * 0.045))
      );
      return {
        label,
        valueM,
        count: Math.min(filteredContracts.length || 1, count),
        isRecent: idx >= 8,
      };
    });
  }, [kpis.totalContractValue, filteredContracts.length]);

  const maxMonthlyM = Math.max(...monthlySeries.map((m) => m.valueM), 1);

  // Service Pillar Donut Segmentation
  const pillarDistribution = useMemo(() => {
    const totalVal = Math.max(1, kpis.totalContractValue);
    const totalCount = Math.max(1, filteredContracts.length);
    return SERVICE_PILLAR_META.map((meta) => {
      const items = filteredContracts.filter((c) => c.servicePillar === meta.pillar);
      const value = items.reduce((s, c) => s + c.contractValueIdr, 0);
      const count = items.length;
      const pct = Math.round((count / totalCount) * 100);
      const valPct = Math.round((value / totalVal) * 100);
      return {
        ...meta,
        count,
        value,
        pct,
        valPct,
      };
    });
  }, [filteredContracts, kpis.totalContractValue]);

  // Facility & Port Zone Distribution
  const facilityStats = useMemo(() => {
    const map = new Map<
      string,
      { location: string; value: number; used: number; cap: number; count: number }
    >();
    filteredContracts.forEach((c) => {
      const prev = map.get(c.portLocation) ?? {
        location: c.portLocation,
        value: 0,
        used: 0,
        cap: 0,
        count: 0,
      };
      prev.value += c.contractValueIdr;
      prev.used += c.quotaUsed;
      prev.cap += Math.max(1, c.quotaTotal);
      prev.count += 1;
      map.set(c.portLocation, prev);
    });
    const list = Array.from(map.values()).map((item) => ({
      ...item,
      occupancyPct: Math.min(100, Math.round((item.used / Math.max(1, item.cap)) * 100)),
    }));
    const avgOccupancy =
      list.length > 0
        ? Math.round(list.reduce((s, i) => s + i.occupancyPct, 0) / list.length)
        : 0;
    return { list: list.sort((a, b) => b.value - a.value), avgOccupancy };
  }, [filteredContracts]);

  // Top 5 Strategic Vendors & PBM Partners
  const topVendors = useMemo(() => {
    const map = new Map<
      number,
      {
        vendorId: number;
        name: string;
        category: string;
        value: number;
        count: number;
        primaryQuota: string;
      }
    >();
    filteredContracts.forEach((c) => {
      const vendorMeta = store.vendors.find((v) => v.id === c.vendorId);
      const prev = map.get(c.vendorId) ?? {
        vendorId: c.vendorId,
        name: c.vendorName,
        category: `${c.servicePillar} · ${c.portLocation}`,
        value: 0,
        count: 0,
        primaryQuota: `${c.quotaUsed.toLocaleString('id-ID')} ${c.quotaUnit}`,
      };
      prev.value += c.contractValueIdr;
      prev.count += 1;
      if (vendorMeta) {
        prev.category = `${vendorMeta.category} · ${c.servicePillar}`;
      }
      map.set(c.vendorId, prev);
    });
    const sorted = Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const topSum = sorted.reduce((s, v) => s + v.value, 0);
    const sharePct =
      kpis.totalContractValue > 0
        ? Math.round((topSum / kpis.totalContractValue) * 1000) / 10
        : 0;
    return { list: sorted, sharePct };
  }, [filteredContracts, store.vendors, kpis.totalContractValue]);

  // Compiled Official Reports Table (base + user generated)
  const compiledReports = useMemo<CompiledReportRow[]>(() => {
    const base: CompiledReportRow[] = [
      {
        id: 'rep-ktr-001',
        code: 'LAP-KTR-2026-001',
        title: 'Laporan Nilai Realisasi Sewa & Kontrak Aktif',
        subtitle: `Portofolio ${filteredContracts.length} PKS Pelabuhan Cirebon (${formatRupiahCompact(
          kpis.totalContractValue
        )})`,
        periodLabel:
          periodPreset === 'Q4_2026'
            ? 'Q4 2026 (Okt–Des)'
            : periodPreset === '2026'
            ? 'Tahun Fiskal 2026'
            : 'Jan 2025 – Des 2027',
        categoryLabel: 'Keuangan & Sewa',
        categoryTone: 'bg-[#E1F2F6] text-[#004C6D]',
        formatLabel: 'CSV + PDF',
        sizeLabel: '1.8 MB',
        validationStatus: 'Tervalidasi Legal',
        validatorNote: activeUser?.fullName ? `${activeUser.fullName} (Legal)` : 'Chief Legal Officer',
        mode: 'all',
      },
      {
        id: 'rep-rnw-h30',
        code: 'LAP-RNW-2026-H30',
        title: 'Laporan Khusus Kontrak Masa Renewal Kritis (H-30)',
        subtitle: `${kpis.renewalContracts.length} kontrak mendekati jatuh tempo & butuh adendum`,
        periodLabel: 'Jendela H-30 s/d H-7',
        categoryLabel: 'Renewal H-30 Urgent',
        categoryTone: 'bg-amber-50 text-amber-800 border border-amber-200',
        formatLabel: 'CSV / XLSX',
        sizeLabel: '640 KB',
        validationStatus: 'Perlu Tinjauan H-30',
        validatorNote: `${kpis.renewalContracts.length} Berkas Siap Adendum`,
        mode: 'expired',
      },
      {
        id: 'rep-ton-q4',
        code: 'LAP-TON-2026-Q4',
        title: 'Laporan Realisasi Tonase PBM, Ritase & Gudang',
        subtitle: `Rekap ${store.usageLogs.length} log manifest operasional & kapasitas dermaga`,
        periodLabel: 'Tahun Berjalan 2026',
        categoryLabel: 'Tonase & Kuota',
        categoryTone: 'bg-[#E0F2F1] text-[#004C6D]',
        formatLabel: 'CSV + PDF',
        sizeLabel: '2.4 MB',
        validationStatus: 'Sinkronisasi Aktif',
        validatorNote: 'Log Gate & Manifest Terminal',
        mode: 'usage',
      },
      {
        id: 'rep-cmp-isps',
        code: 'LAP-CMP-2026-ISPS',
        title: 'Laporan Kepatuhan Dokumen Legalitas & Izin KSOP',
        subtitle: `${store.legalities.length} izin ISPS Code, PMKU & AMDAL terpantau`,
        periodLabel: 'Semester II · 2026',
        categoryLabel: 'Kepatuhan Regulasi',
        categoryTone: 'bg-slate-100 text-[#002B36]',
        formatLabel: 'PDF',
        sizeLabel: '3.1 MB',
        validationStatus: 'Resmi KSOP',
        validatorNote: 'KSOP Kelas II Cirebon & DLH',
        mode: 'legality',
      },
      {
        id: 'rep-gdg-d3',
        code: 'LAP-GDG-2026-D3',
        title: 'Analisis Okupansi Sewa Gudang 24 Jam & Lahan CY',
        subtitle: 'Utilisasi ruang penyimpanan Lini 1 & Zona Utara',
        periodLabel: 'Tahun 2026',
        categoryLabel: 'Fasilitas Gudang',
        categoryTone: 'bg-[#E1F2F6] text-[#004C6D]',
        formatLabel: 'CSV + PDF',
        sizeLabel: '920 KB',
        validationStatus: 'Tervalidasi Legal',
        validatorNote: 'Divisi Operasi & Logistik',
        mode: 'pillar',
        pillarFilter: 'Sewa Gudang 24 Jam',
      },
      {
        id: 'rep-pbm-curah',
        code: 'LAP-PBM-2026-CUR',
        title: 'Rekapitulasi Kontrak PBM Bongkar Muat & Armada',
        subtitle: 'Kinerja mitra bongkar muat dermaga 1 & distribusi truk',
        periodLabel: 'Tahun 2026',
        categoryLabel: 'Operasi PBM',
        categoryTone: 'bg-[#E1F2F6] text-[#004C6D]',
        formatLabel: 'CSV / XLSX',
        sizeLabel: '1.1 MB',
        validationStatus: 'Sinkronisasi Aktif',
        validatorNote: 'Terminal Curah Muara Jati',
        mode: 'pillar',
        pillarFilter: 'PBM Bongkar Muat',
      },
    ];

    const all = [...generatedReports, ...base];
    const q = reportSearch.trim().toLowerCase();
    return all.filter((item) => {
      const matchesCat = reportCatFilter === 'ALL' || item.mode === reportCatFilter;
      const matchesQ =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.validatorNote.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [
    generatedReports,
    filteredContracts.length,
    kpis.totalContractValue,
    kpis.renewalContracts.length,
    periodPreset,
    activeUser?.fullName,
    store.usageLogs.length,
    store.legalities.length,
    reportSearch,
    reportCatFilter,
  ]);

  const totalReportPages = Math.max(1, Math.ceil(compiledReports.length / REPORTS_PER_PAGE));
  const safeReportPage = Math.min(reportPage, totalReportPages);
  const paginatedReports = compiledReports.slice(
    (safeReportPage - 1) * REPORTS_PER_PAGE,
    safeReportPage * REPORTS_PER_PAGE
  );

  // Handlers
  const handleDownloadFilteredCsv = (customMode?: ReportMode, customPillar?: ServicePillar) => {
    const mode = customMode ?? reportMode;
    if (mode === 'usage') {
      triggerCsvDownload(
        'CONTRACTHUB_Laporan_Tonase_Kuota.csv',
        ['No Kontrak', 'Layanan', 'Lokasi', 'Kuota Terpakai', 'Total Kuota', 'Satuan', 'Persentase (%)'],
        filteredContracts.map((c) => [
          c.contractNumber,
          c.servicePillar,
          c.portLocation,
          c.quotaUsed,
          c.quotaTotal,
          c.quotaUnit,
          Math.min(100, Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100)),
        ])
      );
      onLogReportExport('CSV Realisasi Kuota & Tonase');
      return;
    }

    if (mode === 'legality') {
      triggerCsvDownload(
        'CONTRACTHUB_Laporan_Kepatuhan_Legalitas.csv',
        ['No Izin', 'Nama Perizinan', 'Otoritas Penerbit', 'Zona Pelabuhan', 'Tgl Terbit', 'Berlaku Hingga', 'Status'],
        store.legalities.map((l) => [
          l.permitNumber,
          l.permitName,
          l.issuingAuthority,
          l.portZone,
          l.issuedDate,
          l.expiryDate,
          l.status,
        ])
      );
      onLogReportExport('CSV Kepatuhan Legalitas & KSOP');
      return;
    }

    const subset =
      mode === 'expired'
        ? kpis.renewalContracts
        : mode === 'pillar' && customPillar
        ? filteredContracts.filter((c) => c.servicePillar === customPillar)
        : filteredContracts;

    triggerCsvDownload(
      `CONTRACTHUB_Laporan_${mode.toUpperCase()}_Pelindo_Cirebon.csv`,
      [
        'No Kontrak',
        'Judul',
        'Jenis Layanan',
        'Vendor',
        'Lokasi',
        'Nilai Kontrak (Rp)',
        'Realisasi (Rp)',
        'Mulai',
        'Berakhir',
        'Status',
      ],
      subset.map((c) => [
        c.contractNumber,
        c.title,
        c.servicePillar,
        c.vendorName,
        c.portLocation,
        c.contractValueIdr,
        c.utilizedValueIdr,
        c.startDate,
        c.endDate,
        c.status,
      ])
    );
    onLogReportExport(`Excel/CSV (${mode.toUpperCase()})`);
  };

  const handlePrintPdf = (modeToPrint?: ReportMode) => {
    if (modeToPrint) setReportMode(modeToPrint);
    onLogReportExport(`PDF Resmi (${(modeToPrint ?? reportMode).toUpperCase()})`);
    setTimeout(() => window.print(), 80);
  };

  const handleGenerateAutomaticReport = () => {
    const seq = generatedReports.length + 1;
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const newRow: CompiledReportRow = {
      id: `rep-auto-${Date.now()}`,
      code: `LAP-AUTO-2026-${String(seq).padStart(3, '0')}`,
      title: `Kompilasi Eksekutif Terjadwal #${seq} (${selectedPillar === 'ALL' ? 'Semua Layanan' : selectedPillar})`,
      subtitle: `${filteredContracts.length} PKS · Nilai ${formatRupiahCompact(
        kpis.totalContractValue
      )} · Serapan ${kpis.utilizationPct}%`,
      periodLabel: `Generate ${hhmm} WIB`,
      categoryLabel: 'Kompilasi Otomatis',
      categoryTone: 'bg-[#004C6D] text-white',
      formatLabel: 'CSV + PDF',
      sizeLabel: '1.4 MB',
      validationStatus: 'Tervalidasi Legal',
      validatorNote: activeUser?.fullName ?? 'Sistem CONTRACTHUB',
      mode: reportMode,
    };
    setGeneratedReports((prev) => [newRow, ...prev]);
    setReportPage(1);
    onLogReportExport(`Otomatis (${newRow.code})`);
  };

  // Donut SVG slice calculations
  const totalPillarCount = Math.max(
    1,
    pillarDistribution.reduce((s, p) => s + p.count, 0)
  );
  let cumulativePct = 0;

  const hasActiveFilters =
    periodPreset !== 'ALL' ||
    selectedPillar !== 'ALL' ||
    statusFilter !== 'ALL' ||
    locationFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* 1. BREADCRUMB + HEADER BANNER */}
      <div className="space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#002B36]/65">
          <div className="flex items-center gap-2">
            <span>Pelindo Cirebon</span>
            <span>›</span>
            <span>Analisis &amp; Konfigurasi</span>
            <span>›</span>
            <span className="font-bold text-[#004C6D]">Laporan &amp; Analitik</span>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-[#004C6D]">
            {filteredContracts.length} Kontrak Teranalisis · {store.usageLogs.length} Log Realisasi
          </span>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#004C6D]">
              <Sparkles className="w-4 h-4" />
              <span>CONTRACTHUB INTELLIGENCE SUITE</span>
            </div>
            <h1 className="text-2xl sm:text-[34px] font-extrabold tracking-tight text-[#002B36] leading-tight">
              Pusat Laporan &amp; Analitik Port Maritim
            </h1>
            <p className="text-sm sm:text-base text-[#002B36]/75 leading-relaxed">
              Ekstraksi data komprehensif, tren sewa aset pelabuhan, performa mitra vendor PBM, dan proyeksi nilai kontrak Regional 2 Cirebon yang terintegrasi langsung dengan basis data legalitas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleDownloadFilteredCsv()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#E1F2F6] border border-[#004C6D]/20 text-[#002B36] text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#004C6D]" />
              <span>Export Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintPdf()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#E1F2F6] border border-[#004C6D]/20 text-[#002B36] text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 text-[#004C6D]" />
              <span>Cetak Laporan PDF Resmi</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAutomaticReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate Laporan Otomatis</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PARAMETER FILTER BAR */}
      <div className="bg-white rounded-xl border border-[#004C6D]/12 p-5 no-print">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-bold tracking-wider text-[#002B36]/60 mb-1.5">
              PERIODE FISKAL
            </label>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] cursor-pointer"
            >
              <option value="ALL">Semua Periode (2025–2027)</option>
              <option value="2026">Tahun Fiskal 2026</option>
              <option value="Q4_2026">Triwulan IV 2026 (Okt–Des)</option>
              <option value="CUSTOM">Rentang Tanggal Kustom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#002B36]/60 mb-1.5">
              JENIS LAYANAN PORT
            </label>
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value as ServicePillar | 'ALL')}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] cursor-pointer"
            >
              <option value="ALL">Semua Jenis Layanan</option>
              <option value="Sewa Gudang 24 Jam">Sewa Gudang 24 Jam</option>
              <option value="PBM Bongkar Muat">PBM Bongkar Muat</option>
              <option value="Trucking Armada">Trucking Armada</option>
              <option value="Sewa Lahan">Sewa Lahan</option>
              <option value="Pas Masuk E-Gate">Pas Masuk E-Gate</option>
              <option value="Permit Tracker">Permit Tracker</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#002B36]/60 mb-1.5">
              STATUS LEGALITAS &amp; MASA BERLAKU
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContractStatus | 'ALL')}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] cursor-pointer"
            >
              <option value="ALL">Semua Status Kontrak</option>
              <option value="Aktif">Aktif</option>
              <option value="Hampir Habis">Hampir Habis (H-30)</option>
              <option value="Menunggu e-Sign">Menunggu e-Sign</option>
              <option value="Review Legal">Review Legal</option>
              <option value="Diperpanjang">Diperpanjang</option>
              <option value="Kedaluwarsa">Kedaluwarsa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-[#002B36]/60 mb-1.5">
              ZONA &amp; DERMAGA
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-[#F4F8F9] text-sm font-semibold text-[#002B36] cursor-pointer"
            >
              <option value="ALL">Semua Fasilitas Terminal</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onLogReportExport(
                  `Filter Diterapkan (${filteredContracts.length} PKS terpilih)`
                )
              }
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Terapkan Filter</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setPeriodPreset('ALL');
                  setSelectedPillar('ALL');
                  setStatusFilter('ALL');
                  setLocationFilter('ALL');
                }}
                className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-semibold text-[#004C6D] hover:bg-[#F4F8F9] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {periodPreset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 mt-3.5 pt-3.5 border-t border-[#004C6D]/10 text-sm font-mono-tabular">
            <span className="font-sans font-semibold text-[#002B36]/75">
              Rentang Tanggal Kustom:
            </span>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#004C6D]/20 bg-[#F4F8F9]"
            />
            <span>s/d</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#004C6D]/20 bg-[#F4F8F9]"
            />
          </div>
        )}
      </div>

      {/* 3. 4 EXECUTIVE ANALYTIC KPI CARDS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 no-print">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-[#E0F2F1] text-[#004C6D] text-xs font-bold font-mono-tabular">
                +12.4% YoY
              </span>
            </div>
            <p className="text-xs font-bold tracking-wider text-[#002B36]/60">
              TOTAL NILAI KONTRAK TERKELOLA
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#002B36] font-mono-tabular mt-1.5">
              {formatRupiahCompact(kpis.totalContractValue)}
            </p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              {filteredContracts.length} Kontrak Berjalan (Sewa &amp; PBM)
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65">Total Vendor Terkait:</span>
            <span className="font-bold text-[#004C6D] font-mono-tabular">
              {new Set(filteredContracts.map((c) => c.vendorId)).size} Mitra Aktif
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-[#E1F2F6] text-[#004C6D] text-xs font-bold font-mono-tabular">
                {kpis.utilizationPct}% Serapan
              </span>
            </div>
            <p className="text-xs font-bold tracking-wider text-[#002B36]/60">
              REALISASI REVENUE SEWA
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#002B36] font-mono-tabular mt-1.5">
              {formatRupiahCompact(kpis.totalUtilized)}
            </p>
            <div className="w-full h-2.5 bg-[#E8F1F4] rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#004C6D] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, kpis.utilizationPct)}%` }}
              />
            </div>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65">Sisa Proyeksi Kontrak:</span>
            <span className="font-bold text-[#002B36] font-mono-tabular">
              {formatRupiahCompact(kpis.remainingProjection)}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono-tabular">
                {kpis.renewalContracts.length} Kontrak Kritis
              </span>
            </div>
            <p className="text-xs font-bold tracking-wider text-[#002B36]/60">
              RENEWAL PERIODE H-30 S/D H-7
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#002B36] font-mono-tabular mt-1.5">
              {formatRupiahCompact(kpis.renewalValue)}
            </p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              {store.reminders.filter((r) => r.dispatchStatus === 'Terkirim').length} Notifikasi WhatsApp terkirim ke Mitra
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-semibold">Tindakan Cepat Legal:</span>
            <button
              type="button"
              onClick={() => {
                if (onFilterContractsAndGo) {
                  onFilterContractsAndGo({ status: 'Hampir Habis' });
                } else {
                  setReportMode('expired');
                }
              }}
              className="font-bold text-[#004C6D] hover:underline cursor-pointer"
            >
              Review Draft →
            </button>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-5 border border-[#004C6D]/12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded bg-[#E1F2F6] text-[#004C6D] text-xs font-bold font-mono-tabular">
                {kpis.quotaPct}% Kapasitas
              </span>
            </div>
            <p className="text-xs font-bold tracking-wider text-[#002B36]/60">
              THROUGHPUT TONASE &amp; UNIT
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#002B36] font-mono-tabular mt-1.5">
              {kpis.totalTonEqUsed.toLocaleString('id-ID')}{' '}
              <span className="text-base font-bold text-[#002B36]/65">Unit Eq.</span>
            </p>
            <p className="text-sm text-[#002B36]/70 mt-1">
              Terverifikasi pencatatan log manifest pelabuhan
            </p>
          </div>
          <div className="pt-3 mt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65">Batas Toleransi Safe Draft:</span>
            <span className="font-bold text-[#004C6D] font-mono-tabular">Optimal 8.5m LWS</span>
          </div>
        </div>
      </div>

      {/* 4. MIDDLE ANALYTICS CHARTS: MONTHLY TREND BAR/LINE + DONUT SEGMENTATION */}
      <div className="grid lg:grid-cols-12 gap-6 no-print">
        {/* Left: Trend Nilai Kontrak & Jumlah Aktif */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#004C6D]/12 p-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#004C6D]">
                ANALISIS KEUANGAN &amp; PERTUMBUHAN
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#002B36] mt-0.5">
                Tren Nilai Kontrak &amp; Jumlah Kontrak Aktif per Bulan
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#002B36]/75">
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-[#004C6D] inline-block" />
                Nilai Sewa (Miliar Rp)
              </span>
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-[#7CC2D1] inline-block" />
                Proyeksi Q4
              </span>
            </div>
          </div>

          {/* Interactive SVG Grouped Bar + Trend Curve */}
          <div className="relative pt-2">
            <div className="flex items-end gap-2 sm:gap-3 h-52 px-2 pb-1 border-b border-[#004C6D]/12">
              {monthlySeries.map((m, idx) => {
                const barH = Math.max(16, Math.round((m.valueM / maxMonthlyM) * 165));
                const isHovered = hoveredMonthIdx === idx;
                return (
                  <div
                    key={m.label}
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {(isHovered || idx === monthlySeries.length - 1) && (
                      <div className="mb-1.5 px-2.5 py-0.5 rounded bg-[#002B36] text-white text-xs font-mono-tabular font-bold whitespace-nowrap shadow-xs z-10">
                        Rp {m.valueM} M
                      </div>
                    )}
                    <div
                      className={`w-full max-w-[34px] rounded-t-md transition-all duration-200 ${
                        isHovered
                          ? 'bg-[#002B36]'
                          : m.isRecent
                          ? 'bg-[#004C6D]'
                          : 'bg-[#7CC2D1]'
                      }`}
                      style={{ height: `${barH}px` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-11 gap-1 pt-2 text-center text-[11px] sm:text-xs font-mono-tabular text-[#002B36]/65">
              {monthlySeries.map((m, idx) => (
                <span
                  key={m.label}
                  className={
                    idx === hoveredMonthIdx || idx >= 9
                      ? 'font-bold text-[#004C6D] truncate'
                      : 'truncate'
                  }
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-[#002B36]/75">
              {hoveredMonthIdx !== null
                ? `${monthlySeries[hoveredMonthIdx].label}: Rp ${monthlySeries[hoveredMonthIdx].valueM} Miliar across ${monthlySeries[hoveredMonthIdx].count} PKS aktif`
                : `Periode berjalan mencakup proyeksi adendum & konsesi aktif (${filteredContracts.length} PKS).`}
            </p>
            <button
              type="button"
              onClick={() => handleDownloadFilteredCsv('all')}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline whitespace-nowrap cursor-pointer"
            >
              <span>Unduh Data Tren (.CSV)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Donut Segmentasi Operasi per Layanan */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#004C6D]/12 p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#004C6D]">
                SEGMENTASI OPERASI
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#002B36] mt-0.5">
                Distribusi per Layanan
              </h2>
            </div>
            <PieChartIcon className="w-5 h-5 text-[#004C6D] shrink-0 mt-1" />
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="#EEF5F7"
                  strokeWidth="16"
                />
                {pillarDistribution.map((seg) => {
                  const pct = (seg.count / totalPillarCount) * 100;
                  const circumference = 2 * Math.PI * 44;
                  const dashArray = `${(pct / 100) * circumference} ${circumference}`;
                  const dashOffset = -((cumulativePct / 100) * circumference);
                  cumulativePct += pct;
                  if (seg.count === 0) return null;
                  const isActive = hoveredPillar === seg.pillar;

                  return (
                    <circle
                      key={seg.pillar}
                      cx="60"
                      cy="60"
                      r="44"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isActive ? '19' : '16'}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredPillar(seg.pillar)}
                      onMouseLeave={() => setHoveredPillar(null)}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-3xl font-extrabold text-[#002B36] font-mono-tabular">
                  {hoveredPillar
                    ? pillarDistribution.find((p) => p.pillar === hoveredPillar)?.count ?? 0
                    : filteredContracts.length}
                </span>
                <span className="text-[11px] font-bold tracking-wider text-[#002B36]/60">
                  {hoveredPillar ? 'PKS LAYANAN' : 'KONTRAK TOTAL'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#004C6D]/10">
            {pillarDistribution.map((seg) => (
              <div
                key={seg.pillar}
                onMouseEnter={() => setHoveredPillar(seg.pillar)}
                onMouseLeave={() => setHoveredPillar(null)}
                onClick={() =>
                  onFilterContractsAndGo?.({ pillar: seg.pillar, status: 'ALL' })
                }
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  hoveredPillar === seg.pillar ? 'bg-[#E1F2F6]' : 'hover:bg-[#F4F8F9]'
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-semibold text-[#002B36] truncate">{seg.shortLabel}</span>
                </span>
                <span className="font-mono-tabular shrink-0 flex items-center gap-2">
                  <span className="font-bold text-[#002B36]">{seg.pct}%</span>
                  <span className="text-xs text-[#002B36]/60">
                    ({formatRupiahCompact(seg.value)})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. FACILITY OCCUPANCY & TOP 5 STRATEGIC VENDORS */}
      <div className="grid lg:grid-cols-12 gap-6 no-print">
        {/* Left: Distribusi Okupansi & Nilai Sewa Fasilitas */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#004C6D]/12 p-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#004C6D]">
                FASILITAS &amp; ZONASI PORT
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#002B36] mt-0.5">
                Distribusi Okupansi &amp; Nilai Sewa Fasilitas
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#E1F2F6] text-[#004C6D] text-xs font-bold font-mono-tabular">
              Okupansi Rata-rata {facilityStats.avgOccupancy}%
            </span>
          </div>

          <div className="space-y-4">
            {facilityStats.list.length === 0 ? (
              <p className="text-sm text-[#002B36]/60 py-6 text-center">
                Belum ada fasilitas sesuai filter aktif.
              </p>
            ) : (
              facilityStats.list.slice(0, 4).map((fac) => (
                <div key={fac.location} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        onFilterContractsAndGo?.({ location: fac.location })
                      }
                      className="inline-flex items-center gap-2 font-bold text-[#002B36] hover:text-[#004C6D] text-left cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-[#004C6D] shrink-0" />
                      <span>{fac.location}</span>
                    </button>
                    <span className="font-mono-tabular font-bold text-[#004C6D]">
                      {formatRupiahCompact(fac.value)}{' '}
                      <span className="text-[#002B36]/60 font-normal">
                        / {fac.occupancyPct}% Util
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E8F1F4] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        fac.occupancyPct >= 85
                          ? 'bg-amber-600'
                          : 'bg-[#004C6D]'
                      }`}
                      style={{ width: `${fac.occupancyPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#002B36]/60 font-mono-tabular">
                    <span>{fac.count} PKS Terikat</span>
                    <span>
                      Serapan: {fac.used.toLocaleString('id-ID')} / {fac.cap.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10 flex items-center justify-between gap-3 text-sm">
            <span className="text-[#002B36]/75">
              Optimalisasi ruang dermaga &amp; lapangan penumpukan Pelabuhan Cirebon
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab?.('monitoring')}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline whitespace-nowrap cursor-pointer"
            >
              <span>Buka Monitoring Kuota</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Top 5 Mitra Ekspedisi & PBM */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#004C6D]/12 p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#004C6D]">
                MITRA STRATEGIS &amp; PBM
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#002B36] mt-0.5">
                Top {topVendors.list.length} Mitra Ekspedisi &amp; PBM Berdasarkan Kontrak
              </h2>
            </div>
            <Trophy className="w-5 h-5 text-[#004C6D] shrink-0 mt-1" />
          </div>

          <div className="space-y-2.5">
            {topVendors.list.length === 0 ? (
              <p className="text-sm text-[#002B36]/60 py-6 text-center">
                Tidak ada data mitra vendor pada filter saat ini.
              </p>
            ) : (
              topVendors.list.map((v, idx) => (
                <div
                  key={v.vendorId}
                  onClick={() => onFilterContractsAndGo?.({ status: 'ALL' })}
                  className="p-3.5 rounded-xl bg-[#F4F8F9] hover:bg-[#E1F2F6]/65 border border-[#004C6D]/10 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#004C6D] text-white text-sm font-bold font-mono-tabular flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#002B36] truncate">{v.name}</p>
                      <p className="text-xs text-[#002B36]/65 truncate">{v.category}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular shrink-0">
                    <p className="text-sm font-extrabold text-[#004C6D]">
                      {formatRupiahCompact(v.value)}
                    </p>
                    <p className="text-xs text-[#002B36]/65">
                      {v.count} PKS · {v.primaryQuota}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-[#002B36]/70 font-mono-tabular">
              Kontribusi Utama: <strong className="text-[#002B36]">{topVendors.sharePct}%</strong> Nilai Portofolio
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab?.('contracts')}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline cursor-pointer"
            >
              <span>Lihat Semua Kontrak Mitra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. STRATEGIC MARITIME CALLOUT BANNER */}
      <div className="relative rounded-xl bg-[#004C6D] text-white p-6 overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-0.5 rounded bg-[#006992] text-[#E1F2F6]">
                ASET MARITIM LEMAHWUNGKUK
              </span>
              <span className="text-[#B8DFE6]">Wilayah Kerja Pelindo Regional 2 Cirebon</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Kepatuhan Area Dermaga Muara Jati &amp; Hub Logistik Pelabuhan
            </h3>
            <p className="text-sm text-[#E1F2F6]/85 leading-relaxed">
              Data analitik kontrak, tonase, dan izin legalitas disusun untuk pelaporan berkala kepada Kantor Kesyahbandaran dan Otoritas Pelabuhan (KSOP) Kelas II Cirebon serta sertifikasi kelaiklautan ISPS Code.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handlePrintPdf('legality')}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white hover:bg-[#E1F2F6] text-[#002B36] text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-5 h-5 text-[#004C6D]" />
            <span>Cetak Rekap Kepatuhan KSOP</span>
          </button>
        </div>
      </div>

      {/* 7. TABEL REKAPITULASI LAPORAN SIAP CETAK & AUDIT */}
      <section className="bg-white rounded-xl border border-[#004C6D]/12 overflow-hidden no-print">
        <div className="p-5 sm:p-6 border-b border-[#004C6D]/12 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E1F2F6] text-[#004C6D] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-[#004C6D]">
                KOMPILASI DOKUMEN RESMI
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#002B36]">
                Tabel Rekapitulasi Laporan Siap Cetak &amp; Audit
              </h2>
              <p className="text-sm text-[#002B36]/70 mt-0.5">
                Pilih berkas terverifikasi untuk ekspor CSV parsial atau cetak lembar PDF resmi Pelindo Cirebon.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#002B36]/45 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value);
                  setReportPage(1);
                }}
                placeholder="Cari kode atau judul laporan..."
                className="pl-9 pr-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-[#F4F8F9] focus:bg-white text-sm w-60"
              />
            </div>

            <select
              aria-label="Filter Kategori Laporan"
              value={reportCatFilter}
              onChange={(e) => {
                setReportCatFilter(e.target.value as 'ALL' | ReportMode);
                setReportPage(1);
              }}
              className="px-3.5 py-2.5 rounded-lg border border-[#004C6D]/18 bg-white text-sm font-semibold text-[#002B36] cursor-pointer"
            >
              <option value="ALL">Semua Kategori Laporan</option>
              <option value="all">Keuangan &amp; Sewa</option>
              <option value="expired">Renewal H-30 Urgent</option>
              <option value="usage">Tonase &amp; Kuota</option>
              <option value="legality">Kepatuhan Regulasi / ISPS</option>
              <option value="pillar">Per Jenis Layanan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#F4F8F9] border-b border-[#004C6D]/12 text-xs font-bold text-[#002B36]/65">
                <th className="py-3.5 px-5">ID DOKUMEN &amp; NAMA LAPORAN</th>
                <th className="py-3.5 px-4">PERIODE DATA</th>
                <th className="py-3.5 px-4">KATEGORI LAYANAN</th>
                <th className="py-3.5 px-4">FORMAT</th>
                <th className="py-3.5 px-4">VALIDASI LEGALITAS</th>
                <th className="py-3.5 px-5 text-right">AKSI UNDUH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#004C6D]/10">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#002B36]/60">
                    Tidak ada laporan yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F4F8F9]/65 transition-colors">
                    <td className="py-4 px-5 align-middle">
                      <p className="font-mono-tabular text-xs font-bold text-[#004C6D]">
                        {rep.code}
                      </p>
                      <p className="font-bold text-[#002B36] mt-0.5">{rep.title}</p>
                      <p className="text-xs text-[#002B36]/65 mt-0.5">{rep.subtitle}</p>
                    </td>

                    <td className="py-4 px-4 align-middle whitespace-nowrap font-mono-tabular text-[#002B36]/80">
                      {rep.periodLabel}
                    </td>

                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${rep.categoryTone}`}
                      >
                        {rep.categoryLabel}
                      </span>
                    </td>

                    <td className="py-4 px-4 align-middle whitespace-nowrap font-mono-tabular">
                      <p className="font-bold text-[#002B36]">{rep.formatLabel}</p>
                      <p className="text-xs text-[#002B36]/60">{rep.sizeLabel}</p>
                    </td>

                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2 font-semibold text-[#002B36]">
                        {rep.validationStatus === 'Perlu Tinjauan H-30' ? (
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#004C6D] shrink-0" />
                        )}
                        <span>{rep.validationStatus}</span>
                      </div>
                      <p className="text-xs text-[#002B36]/65 mt-0.5">{rep.validatorNote}</p>
                    </td>

                    <td className="py-4 px-5 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintPdf(rep.mode)}
                          title="Cetak laporan ini ke PDF"
                          className="p-2.5 rounded-lg border border-[#004C6D]/20 text-[#004C6D] hover:bg-[#E1F2F6] cursor-pointer transition-colors"
                          aria-label={`Cetak ${rep.code}`}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFilteredCsv(rep.mode, rep.pillarFilter)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Unduh</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-[#F4F8F9] border-t border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-[#002B36]/75 font-mono-tabular">
            Menampilkan {paginatedReports.length} dari {compiledReports.length} paket laporan berkala
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeReportPage <= 1}
              onClick={() => setReportPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#004C6D]/20 bg-white disabled:opacity-45 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            {Array.from({ length: totalReportPages }, (_, idx) => idx + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setReportPage(pg)}
                className={`w-9 h-9 rounded-lg text-sm font-mono-tabular font-bold cursor-pointer ${
                  pg === safeReportPage
                    ? 'bg-[#004C6D] text-white'
                    : 'bg-white border border-[#004C6D]/20 text-[#002B36]'
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              disabled={safeReportPage >= totalReportPages}
              onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#004C6D]/20 bg-white disabled:opacity-45 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. PRINTABLE OFFICIAL EXECUTIVE REPORT SHEET */}
      <div className="bg-white rounded-xl border border-[#004C6D]/12 p-6 md:p-8 print-container">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#004C6D]/15 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#004C6D] flex items-center gap-1.5">
              <Anchor className="w-4 h-4" />
              PT PELABUHAN INDONESIA (PERSERO) REGIONAL 2 CIREBON
            </p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#002B36] mt-1">
              {reportMode === 'usage'
                ? 'Lampiran Cetak: Laporan Realisasi Kuota, Tonase & Ritase Pelabuhan'
                : reportMode === 'expired'
                ? 'Lampiran Cetak: Laporan Kontrak Kedaluwarsa & Mendekati Jatuh Tempo (H-30)'
                : reportMode === 'legality'
                ? 'Lampiran Cetak: Rekapitulasi Kepatuhan Izin Operasional & Legalitas Maritim'
                : 'Lampiran Cetak: Laporan Portofolio Kontrak & Kepatuhan Legalitas'}
            </h3>
            <p className="text-sm text-[#002B36]/70 mt-1">
              Disiapkan melalui CONTRACTHUB · Penanggung Jawab:{' '}
              {activeUser?.fullName ?? 'Mayanggaseta Azahra'} (
              {activeUser?.titlePosition ?? 'Chief Legal Officer'})
            </p>
          </div>

          <div className="text-right text-sm font-mono-tabular text-[#002B36]/75 space-y-0.5">
            <p>Tanggal Cetak: 11 Nov 2026</p>
            <p>Total Nilai Terfilter: {formatRupiah(kpis.totalContractValue)}</p>
            <p>Realisasi: {formatRupiah(kpis.totalUtilized)}</p>
          </div>
        </div>

        {/* Printable mode selector */}
        <div className="flex flex-wrap items-center gap-2 mb-5 no-print">
          {(
            [
              { id: 'all', label: 'Portofolio Kontrak' },
              { id: 'expired', label: 'Renewal H-30 & Expired' },
              { id: 'usage', label: 'Realisasi Kuota & Tonase' },
              { id: 'legality', label: 'Izin & Legalitas KSOP' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setReportMode(m.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                reportMode === m.id
                  ? 'bg-[#004C6D] text-white'
                  : 'bg-[#F4F8F9] text-[#002B36]/80 hover:bg-[#E1F2F6]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {reportMode === 'usage' ? (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#004C6D]/20 text-[#002B36]/70 text-xs">
                  <th className="py-3 pr-4 font-semibold">No. Kontrak</th>
                  <th className="py-3 pr-4 font-semibold">Layanan &amp; Lokasi</th>
                  <th className="py-3 pr-4 font-semibold text-right">Kuota Terpakai</th>
                  <th className="py-3 pr-4 font-semibold text-right">Total Kuota</th>
                  <th className="py-3 font-semibold text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#004C6D]/10">
                {sheetContracts.map((c: Contract) => {
                  const pct = Math.min(
                    100,
                    Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100)
                  );
                  return (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 font-mono-tabular font-semibold text-[#004C6D]">
                        {c.contractNumber}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[#002B36]">{c.servicePillar}</p>
                        <p className="text-xs text-[#002B36]/65">{c.portLocation}</p>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular">
                        {c.quotaUsed.toLocaleString('id-ID')} {c.quotaUnit}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-tabular">
                        {c.quotaTotal.toLocaleString('id-ID')} {c.quotaUnit}
                      </td>
                      <td className="py-3 text-right font-mono-tabular font-bold text-[#004C6D]">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : reportMode === 'legality' ? (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#004C6D]/20 text-[#002B36]/70 text-xs">
                  <th className="py-3 pr-4 font-semibold">No. Izin</th>
                  <th className="py-3 pr-4 font-semibold">Nama Sertifikat / Izin</th>
                  <th className="py-3 pr-4 font-semibold">Penerbit &amp; Zona</th>
                  <th className="py-3 pr-4 font-semibold">Berlaku Hingga</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#004C6D]/10">
                {store.legalities.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-4 font-mono-tabular font-semibold text-[#004C6D] whitespace-nowrap">
                      {l.permitNumber}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[#002B36]">{l.permitName}</td>
                    <td className="py-3 pr-4 text-[#002B36]/75">
                      {l.issuingAuthority} · {l.portZone}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular whitespace-nowrap">
                      {formatDateId(l.expiryDate)}
                    </td>
                    <td className="py-3 font-semibold whitespace-nowrap">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#004C6D]/20 text-[#002B36]/70 text-xs">
                  <th className="py-3 pr-4 font-semibold">No. Kontrak</th>
                  <th className="py-3 pr-4 font-semibold">Layanan &amp; Judul</th>
                  <th className="py-3 pr-4 font-semibold">Mitra Vendor</th>
                  <th className="py-3 pr-4 font-semibold text-right">Nilai Kontrak (Rp)</th>
                  <th className="py-3 pr-4 font-semibold">Berakhir</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#004C6D]/10">
                {sheetContracts.map((c: Contract) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-mono-tabular font-semibold text-[#004C6D] whitespace-nowrap">
                      {c.contractNumber}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[#002B36]">{c.title}</p>
                      <p className="text-xs text-[#002B36]/65">{c.servicePillar}</p>
                    </td>
                    <td className="py-3 pr-4 text-[#002B36]/80">{c.vendorName}</td>
                    <td className="py-3 pr-4 text-right font-mono-tabular font-semibold text-[#002B36] whitespace-nowrap">
                      {formatRupiah(c.contractValueIdr)}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular whitespace-nowrap">
                      {formatDateId(c.endDate)}
                    </td>
                    <td className="py-3 font-semibold whitespace-nowrap">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
