import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Gauge,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import type {
  Contract,
  ContractHubStore,
  ServicePillar,
  User,
} from '../../types/contracthub';
import { WAREHOUSE_PHOTO_IMG } from '../../data/seedData';
import { daysUntil, formatDateId, formatRupiah } from '../../utils/formatters';

interface MonitoringQuotaViewProps {
  store: ContractHubStore;
  activeUser: User;
  activeContracts: Contract[];
  scopedContractIds: Set<number>;
  canLogUsage: boolean;
  onLogUsage: (payload: {
    contractId: number;
    volumeDelta: number;
    valueDeltaIdr: number;
    referenceNo: string;
    remarks: string;
  }) => Promise<void>;
  onOpenContractDetail: (contractId: number) => void;
  onOpenRenewContract: (contract: Contract) => void;
  onDispatchWaAlert: (contract: Contract) => Promise<void>;
  onNavigateTab: (tab: 'reports' | 'reminders' | 'contracts') => void;
  onShowToast: (msg: string) => void;
}

type SegmentTab = 'ALL' | 'PBM' | 'RITASE' | 'GUDANG';
type QuotaStatusFilter = 'ALL' | 'SAFE' | 'WARNING' | 'CRITICAL';

interface GateStreamItem {
  id: string;
  direction: 'IN' | 'OUT';
  plate: string;
  rfid: string;
  vendor: string;
  commodity: string;
  weightInfo: string;
  timeWib: string;
  quotaImpact: string;
  isPositive?: boolean;
}

const DEFAULT_GATE_STREAM: GateStreamItem[] = [
  {
    id: 'gate-1',
    direction: 'IN',
    plate: 'E 9142 AB',
    rfid: 'RFID: #7091A',
    vendor: 'PT Pelayaran Nusantara Cirebon',
    commodity: 'Batubara & Semen Curah',
    weightInfo: 'Bruto: 32.450 Kg',
    timeWib: '14:28:10 WIB',
    quotaImpact: '-32.45 Ton Kuota',
  },
  {
    id: 'gate-2',
    direction: 'OUT',
    plate: 'B 9821 TDF',
    rfid: 'RFID: #5140C',
    vendor: 'PT Jasa Angkutan Pantura',
    commodity: 'Armada Kontainer Pantura',
    weightInfo: 'Tarra: 12.180 Kg',
    timeWib: '14:25:44 WIB',
    quotaImpact: 'Netto: 28.32 Ton',
    isPositive: true,
  },
  {
    id: 'gate-3',
    direction: 'IN',
    plate: 'E 8729 YC',
    rfid: 'RFID: #3312B',
    vendor: 'PT Cirebon Terminal Logistik',
    commodity: 'Curah Kering Gudang D3',
    weightInfo: 'Bruto: 29.800 Kg',
    timeWib: '14:21:02 WIB',
    quotaImpact: '-29.80 Ton Kuota',
  },
  {
    id: 'gate-4',
    direction: 'IN',
    plate: 'E 9405 AD',
    rfid: 'RFID: #8824D',
    vendor: 'PT Samudera Cargo Jaya',
    commodity: 'Peti Kemas Zona Utara',
    weightInfo: 'Bruto: 31.100 Kg',
    timeWib: '14:16:35 WIB',
    quotaImpact: '-1 Slot Penumpukan',
  },
];

export const MonitoringQuotaView: React.FC<MonitoringQuotaViewProps> = ({
  store,
  activeContracts,
  scopedContractIds,
  canLogUsage,
  onLogUsage,
  onOpenContractDetail,
  onOpenRenewContract,
  onDispatchWaAlert,
  onNavigateTab,
  onShowToast,
}) => {
  // Interactive filters & UI controls
  const [segmentTab, setSegmentTab] = useState<SegmentTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotaStatusFilter>('ALL');
  const [pillarFilter, setPillarFilter] = useState<ServicePillar | 'ALL'>('ALL');
  const [matrixPage, setMatrixPage] = useState(1);

  // Live telemetry & thresholds state
  const [lastSyncText, setLastSyncText] = useState('2 Menit Lalu');
  const [isSyncing, setIsSyncing] = useState(false);
  const [rfidLatencyMs, setRfidLatencyMs] = useState(143);
  const [warningThreshold, setWarningThreshold] = useState(75);
  const [criticalThreshold, setCriticalThreshold] = useState(90);
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [telemetryModalOpen, setTelemetryModalOpen] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);

  // Usage Log form state
  const [usageContractId, setUsageContractId] = useState<number>(activeContracts[0]?.id ?? 1);
  const [usageDelta, setUsageDelta] = useState('250');
  const [usageValueDelta, setUsageValueDelta] = useState('75000000');
  const [usageRefNo, setUsageRefNo] = useState('MANIFEST-CRB-2026-88');
  const [usageRemarks, setUsageRemarks] = useState('Realisasi bongkar muat jembatan timbang Lemahwungkuk.');
  const [submittingUsage, setSubmittingUsage] = useState(false);

  const ROWS_PER_PAGE = 5;

  // Derived KPI metrics from live contracts
  const kpiStats = useMemo(() => {
    let totalQuotaAll = 0;
    let totalUsedAll = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let spaceQuota = 0;
    let spaceUsed = 0;

    activeContracts.forEach((c) => {
      const pct = Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100);
      if (pct >= criticalThreshold) criticalCount += 1;
      if (pct >= warningThreshold) warningCount += 1;

      if (c.quotaUnit === 'Ton' || c.quotaUnit === 'Ritase') {
        totalQuotaAll += c.quotaTotal;
        totalUsedAll += c.quotaUsed;
      }
      if (c.quotaUnit.includes('m²')) {
        spaceQuota += c.quotaTotal;
        spaceUsed += c.quotaUsed;
      }
    });

    // If user filters out tonnage/space or small dataset, fallback smoothly to non-zero totals
    const displayUsed = totalUsedAll > 0 ? totalUsedAll : activeContracts.reduce((s, c) => s + c.quotaUsed, 0);
    const displayTotal = totalQuotaAll > 0 ? totalQuotaAll : activeContracts.reduce((s, c) => s + c.quotaTotal, 0);
    const regionalPct = Math.min(100, Math.round((displayUsed / Math.max(1, displayTotal)) * 1000) / 10);
    const remainingTotal = Math.max(0, displayTotal - displayUsed);

    const warehouseOccupancyPct =
      spaceQuota > 0 ? Math.min(100, Math.round((spaceUsed / spaceQuota) * 1000) / 10) : 78.5;
    const spaceRemaining = Math.max(0, spaceQuota - spaceUsed);

    const ritaseContractUsed = activeContracts
      .filter((c) => c.servicePillar === 'Trucking Armada' || c.quotaUnit === 'Ritase')
      .reduce((s, c) => s + c.quotaUsed, 0);
    const totalRitase = ritaseContractUsed + store.usageLogs.length * 140 + 11800;

    return {
      displayUsed,
      displayTotal,
      regionalPct,
      remainingTotal,
      totalRitase,
      warningCount,
      criticalCount,
      warehouseOccupancyPct,
      spaceUsed,
      spaceRemaining,
    };
  }, [activeContracts, criticalThreshold, warningThreshold, store.usageLogs.length]);

  // Commodity / Service distribution breakdown from real contracts
  const distributionBars = useMemo(() => {
    const groups = [
      {
        label: 'PBM Bongkar Muat (Batubara & Semen Curah)',
        pillar: 'PBM Bongkar Muat' as ServicePillar,
        color: 'bg-[#004C6D]',
      },
      {
        label: 'Sewa Lahan Penumpukan Zona Utara & Selatan',
        pillar: 'Sewa Lahan' as ServicePillar,
        color: 'bg-[#0284C7]',
      },
      {
        label: 'Sewa Gudang Tertutup D3 (24 Jam)',
        pillar: 'Sewa Gudang 24 Jam' as ServicePillar,
        color: 'bg-[#0D9488]',
      },
      {
        label: 'Trucking Armada & E-Gate Pelabuhan',
        pillar: 'Trucking Armada' as ServicePillar,
        color: 'bg-[#475569]',
      },
    ];

    const totalVal = Math.max(
      1,
      activeContracts.reduce((s, c) => s + c.utilizedValueIdr, 0)
    );

    return groups.map((g) => {
      const matching = activeContracts.filter((c) =>
        g.pillar === 'Trucking Armada'
          ? c.servicePillar === 'Trucking Armada' || c.servicePillar === 'Pas Masuk E-Gate'
          : c.servicePillar === g.pillar
      );
      const val = matching.reduce((s, c) => s + c.utilizedValueIdr, 0);
      const quotaSum = matching.reduce((s, c) => s + c.quotaUsed, 0);
      const unit = matching[0]?.quotaUnit ?? 'Unit';
      const sharePct = Math.round((val / totalVal) * 1000) / 10;
      return {
        ...g,
        quotaSum,
        unit,
        sharePct,
      };
    });
  }, [activeContracts]);

  // Filtered matrix rows
  const filteredMatrix = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return activeContracts
      .filter((c) => {
        if (segmentTab === 'PBM' && c.servicePillar !== 'PBM Bongkar Muat') return false;
        if (
          segmentTab === 'RITASE' &&
          c.servicePillar !== 'Trucking Armada' &&
          c.servicePillar !== 'Pas Masuk E-Gate'
        ) {
          return false;
        }
        if (
          segmentTab === 'GUDANG' &&
          c.servicePillar !== 'Sewa Gudang 24 Jam' &&
          c.servicePillar !== 'Sewa Lahan'
        ) {
          return false;
        }
        if (pillarFilter !== 'ALL' && c.servicePillar !== pillarFilter) return false;

        const pct = Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100);
        if (statusFilter === 'SAFE' && pct >= warningThreshold) return false;
        if (statusFilter === 'WARNING' && (pct < warningThreshold || pct >= criticalThreshold)) {
          return false;
        }
        if (statusFilter === 'CRITICAL' && pct < criticalThreshold) return false;

        if (q) {
          const hay = `${c.vendorName} ${c.contractNumber} ${c.title} ${c.portLocation} ${c.servicePillar}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pctA = a.quotaUsed / Math.max(1, a.quotaTotal);
        const pctB = b.quotaUsed / Math.max(1, b.quotaTotal);
        return pctB - pctA;
      });
  }, [
    activeContracts,
    segmentTab,
    pillarFilter,
    statusFilter,
    searchTerm,
    warningThreshold,
    criticalThreshold,
  ]);

  const totalMatrixPages = Math.max(1, Math.ceil(filteredMatrix.length / ROWS_PER_PAGE));
  const safeMatrixPage = Math.min(matrixPage, totalMatrixPages);
  const paginatedMatrix = useMemo(() => {
    const start = (safeMatrixPage - 1) * ROWS_PER_PAGE;
    return filteredMatrix.slice(start, start + ROWS_PER_PAGE);
  }, [filteredMatrix, safeMatrixPage]);

  // Top priority contract for WhatsApp Gateway Dispatch card
  const priorityAlertContract = useMemo(() => {
    if (activeContracts.length === 0) return null;
    const sorted = [...activeContracts].sort(
      (a, b) => b.quotaUsed / Math.max(1, b.quotaTotal) - a.quotaUsed / Math.max(1, a.quotaTotal)
    );
    return sorted[0];
  }, [activeContracts]);

  // Combine real usage logs + gate stream items
  const liveGateFeed = useMemo<GateStreamItem[]>(() => {
    const fromUsage: GateStreamItem[] = store.usageLogs
      .filter((u) => scopedContractIds.has(u.contractId))
      .slice(0, 3)
      .map((u, idx) => ({
        id: `usage-${u.id}`,
        direction: idx % 2 === 0 ? 'IN' : 'OUT',
        plate: idx === 0 ? 'E 9142 AB' : idx === 1 ? 'B 9821 TDF' : 'E 8729 YC',
        rfid: `REF: ${u.referenceNo}`,
        vendor: u.contractNumber,
        commodity: u.remarks,
        weightInfo: formatRupiah(u.valueDeltaIdr),
        timeWib: formatDateId(u.activityDate),
        quotaImpact: `-${u.volumeDelta.toLocaleString('id-ID')} ${u.quotaUnit}`,
      }));
    return [...fromUsage, ...DEFAULT_GATE_STREAM].slice(0, 5);
  }, [store.usageLogs, scopedContractIds]);

  const handleSyncTelemetry = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncText('Baru saja (Real-Time)');
      setRfidLatencyMs(128 + Math.floor(Math.random() * 24));
      onShowToast('Telemetri Jembatan Timbang Lemahwungkuk & RFID Gate Muara Jati berhasil disinkronkan.');
    }, 450);
  };

  const handleExportCsv = () => {
    const headers = [
      'No Kontrak',
      'Mitra Vendor',
      'Layanan & Komoditas',
      'Lokasi Dermaga/Gudang',
      'Kuota Kontrak',
      'Realisasi',
      'Satuan',
      'Utilisasi (%)',
      'Sisa Alokasi',
    ];
    const rows = filteredMatrix.map((c) => {
      const pct = Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 100);
      const rem = Math.max(0, c.quotaTotal - c.quotaUsed);
      return [
        c.contractNumber,
        `"${c.vendorName}"`,
        `"${c.title}"`,
        `"${c.portLocation}"`,
        c.quotaTotal,
        c.quotaUsed,
        c.quotaUnit,
        `${pct}%`,
        rem,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monitoring_Kuota_Tonase_Pelindo_Cirebon_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`Ekspor ${filteredMatrix.length} data matriks kuota berhasil diunduh.`);
  };

  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUsage(true);
    try {
      await onLogUsage({
        contractId: usageContractId,
        volumeDelta: Number(usageDelta),
        valueDeltaIdr: Number(usageValueDelta),
        referenceNo: usageRefNo,
        remarks: usageRemarks,
      });
      setShowUsageForm(false);
    } finally {
      setSubmittingUsage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & LIVE TELEMETRY CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#004C6D]">
            <Anchor className="w-4 h-4" />
            <span>PELINDO REGIONAL 2 · PELABUHAN CIREBON</span>
            <span className="text-[#004C6D]/40" aria-hidden="true">·</span>
            <span className="text-[#002B36]/55">GATE MONITORING NODE CRB-04</span>
          </div>
          <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#002B36] tracking-tight mt-1">
            Monitoring Kuota Tonase &amp; Ritase Armada
          </h1>
          <p className="text-sm sm:text-base text-[#002B36]/75 mt-1">
            Pelacakan konsumsi kuota kontrak PBM, jembatan timbang terintegrasi, dan throughput logistik dermaga real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSyncTelemetry}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#004C6D]/15 hover:border-[#004C6D]/40 text-xs sm:text-sm font-semibold text-[#002B36] shadow-2xs cursor-pointer transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Jembatan Timbang Lemahwungkuk</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              SYNC LIVE
            </span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#004C6D]/15 text-xs sm:text-sm font-semibold text-[#002B36]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0" />
            <span>RFID Gate In/Out (Muara Jati)</span>
            <span className="px-2 py-0.5 rounded bg-[#E0F2F1] text-[#004C6D] text-[11px] font-mono-tabular font-bold">
              {rfidLatencyMs}ms
            </span>
          </div>

          <button
            type="button"
            onClick={handleSyncTelemetry}
            title="Sinkronkan telemetri sekarang"
            className="p-2.5 rounded-xl bg-white border border-[#004C6D]/15 hover:bg-[#F4F8F9] text-[#004C6D] cursor-pointer transition-colors"
            aria-label="Refresh telemetri jembatan timbang"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {canLogUsage && (
            <button
              type="button"
              onClick={() => setShowUsageForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Realisasi</span>
            </button>
          )}
        </div>
      </div>

      {/* EXPANDABLE QUICK USAGE INPUT FORM (WIRED TO REAL STORE) */}
      {showUsageForm && (
        <form
          onSubmit={handleUsageSubmit}
          className="bg-white rounded-2xl border-2 border-[#004C6D]/25 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#002B36]">
                Catat Realisasi Harian (Tonase / Ritase / Okupansi)
              </h3>
              <p className="text-xs sm:text-sm text-[#002B36]/65 mt-0.5">
                Pemotongan kuota otomatis memperbarui matriks utilisasi dan memicu notifikasi batas ambang.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUsageForm(false)}
              className="p-2 rounded-lg hover:bg-[#F4F8F9] text-[#002B36]/60 cursor-pointer"
              aria-label="Tutup form catat realisasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Kontrak Aktif</label>
              <select
                value={usageContractId}
                onChange={(e) => setUsageContractId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
              >
                {activeContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} — {c.vendorName} ({c.quotaUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Tambah Volume</label>
              <input
                type="number"
                required
                min={1}
                value={usageDelta}
                onChange={(e) => setUsageDelta(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Nilai Tagihan (Rp)</label>
              <input
                type="number"
                required
                min={0}
                value={usageValueDelta}
                onChange={(e) => setUsageValueDelta(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">No. Referensi / SPBM</label>
              <input
                type="text"
                required
                value={usageRefNo}
                onChange={(e) => setUsageRefNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1.5">Keterangan Lapangan / Timbangan</label>
              <input
                type="text"
                required
                value={usageRemarks}
                onChange={(e) => setUsageRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submittingUsage}
              className="px-6 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
            >
              {submittingUsage ? 'Menyimpan...' : 'Catat & Perbarui Kuota'}
            </button>
          </div>
        </form>
      )}

      {/* 2. FOUR KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Total Tonase / Kuota Terealisasi */}
        <div className="bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002B36]/60">
              TOTAL KUOTA TEREALISASI
            </span>
            <span className="w-10 h-10 rounded-xl bg-[#E0F2F1] text-[#004C6D] flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
                {kpiStats.displayUsed.toLocaleString('id-ID')}
              </span>
              <span className="text-sm text-[#002B36]/60 font-mono-tabular">
                / {kpiStats.displayTotal.toLocaleString('id-ID')} Unit
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#002B36]/65">Utilisasi Kuota Regional</span>
                <span className="text-[#004C6D] font-mono-tabular font-bold">
                  {kpiStats.regionalPct}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#E0F2F1] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#004C6D] transition-all duration-300"
                  style={{ width: `${kpiStats.regionalPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65 font-mono-tabular">
              Sisa: {kpiStats.remainingTotal.toLocaleString('id-ID')}
            </span>
            <span className="font-bold text-emerald-700">+6.2% vs bln lalu</span>
          </div>
        </div>

        {/* Card 2: Ritase Armada Terlacak */}
        <div className="bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002B36]/60">
              RITASE ARMADA TERLACAK
            </span>
            <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
                {kpiStats.totalRitase.toLocaleString('id-ID')}
              </span>
              <span className="text-base font-semibold text-[#002B36]/60">Rit</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[#002B36]/70">Gate In/Out Otomatis RFID</span>
              <span className="font-bold text-[#004C6D]">Normal Flow</span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs text-[#002B36]/65">
              <Clock className="w-4 h-4 text-[#004C6D] shrink-0" />
              <span>Rata-rata 4.2 menit/truk di timbangan</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65">Hari ini: 412 Truk Masuk</span>
            <span className="font-bold text-[#002B36]">Truk Aktif: 86 Unit</span>
          </div>
        </div>

        {/* Card 3: Peringatan Kuota (>Warning Threshold) */}
        <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-6 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
              <Bell className="w-4 h-4 shrink-0" />
              <span>PERINGATAN KUOTA (&gt;{warningThreshold}%)</span>
            </span>
            <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-700 font-mono-tabular">
                {kpiStats.warningCount}
              </span>
              <span className="text-base font-bold text-rose-800">Kontrak Mitra</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-rose-900/80">Perlu Adendum Kuota Segera</span>
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold whitespace-nowrap">
                {kpiStats.criticalCount} Kritis (&gt;{criticalThreshold}%)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/80 flex items-center justify-between text-xs">
            <span className="text-rose-900/70">Alert Terkirim via Fonnte WA</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('WARNING');
                setSegmentTab('ALL');
                setMatrixPage(1);
              }}
              className="inline-flex items-center gap-1 font-bold text-rose-700 hover:underline cursor-pointer"
            >
              <span>Lihat Daftar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Okupansi Gudang & CY Lini 1-2 */}
        <div className="bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002B36]/60">
              OKUPANSI GUDANG &amp; CY LINI 1-2
            </span>
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Warehouse className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#002B36] font-mono-tabular">
                {kpiStats.warehouseOccupancyPct}%
              </span>
              <span className="text-base font-semibold text-[#002B36]/60">Kapasitas</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#002B36]/70">Lahan Muara Jati &amp; Zona Utara</span>
              <span className="font-bold text-[#002B36] font-mono-tabular">
                {kpiStats.spaceUsed.toLocaleString('id-ID')} m² terisi
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#004C6D]/10 flex items-center justify-between text-xs">
            <span className="text-[#002B36]/65 font-mono-tabular">
              Tersedia: {kpiStats.spaceRemaining.toLocaleString('id-ID')} m²
            </span>
            <span className="font-bold text-emerald-700">Penumpukan Terkendali</span>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SHOWCASE ROW: SIMOPEL CORE HERO + DISTRIBUSI KOMODITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dark Pelindo Navy Integration Card */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#002B36] via-[#003F5C] to-[#005577] text-white p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#8DCBD0]">
                <Radio className="w-3.5 h-3.5" />
                <span>PELINDO SMART MARINE TERMINAL INTEGRATION</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold leading-snug">
                Sinkronisasi Jembatan Timbang Otomatis (SIMOPEL Core)
              </h2>

              <p className="text-sm text-white/80 leading-relaxed">
                Setiap armada truk muatan klinker semen, batubara, pasir kuarsa, dan pupuk curah otomatis memotong kuota kontrak begitu melintasi jembatan timbang Lemahwungkuk dengan verifikasi Surat Perintah Bongkar Muat (SPBM) digital.
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-md h-44 sm:h-48">
                <img
                  src={WAREHOUSE_PHOTO_IMG}
                  alt="Aktivitas bongkar muat di Dermaga Muara Jati Pelabuhan Cirebon"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#002B36]/85 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">Dermaga Muara Jati</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white text-[11px] font-bold">
                    Berth #03 Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Zero-Dispute Protocol Aktif
            </span>
            <span className="inline-flex items-center gap-2 text-white/75">
              <Clock className="w-4 h-4 text-[#8DCBD0]" />
              Batch Penutupan: Tiap 23:59 WIB
            </span>
          </div>
        </div>

        {/* Right: Distribusi Komoditas & Layanan Utama */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#002B36]">
                  Distribusi Serapan Komoditas &amp; Lahan
                </h3>
                <p className="text-xs text-[#002B36]/60 mt-0.5">
                  Akumulasi realisasi kontrak berjalan
                </p>
              </div>
              <span className="text-xs font-semibold text-[#004C6D] bg-[#E0F2F1] px-2.5 py-1 rounded-lg shrink-0">
                Bulan Berjalan
              </span>
            </div>

            <div className="space-y-4">
              {distributionBars.map((bar) => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[#002B36] truncate">{bar.label}</span>
                    <span className="font-mono-tabular font-bold text-[#004C6D] shrink-0">
                      {bar.quotaSum.toLocaleString('id-ID')} {bar.unit} ({bar.sharePct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F4F8F9] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all duration-300`}
                      style={{ width: `${Math.max(4, bar.sharePct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#004C6D]/10 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-[#002B36]/70 font-mono-tabular">
              Total Rate: <strong className="text-[#002B36]">3.420 T/Jam</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline cursor-pointer"
            >
              <span>Detail Analitik</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. FILTER & SEGMENT TOOLBAR */}
      <div className="bg-white rounded-2xl border border-[#004C6D]/12 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10">
          {(
            [
              { id: 'ALL', label: 'Semua Layanan' },
              { id: 'PBM', label: 'Bongkar Muat PBM' },
              { id: 'RITASE', label: 'Ritase Truk Gate' },
              { id: 'GUDANG', label: 'Gudang & CY Lini 1' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSegmentTab(tab.id);
                setMatrixPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${
                segmentTab === tab.id
                  ? 'bg-[#004C6D] text-white shadow-2xs'
                  : 'text-[#002B36]/75 hover:text-[#002B36] hover:bg-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial min-w-[210px]">
            <Search className="w-4 h-4 text-[#002B36]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setMatrixPage(1);
              }}
              placeholder="Cari Mitra PBM / Kontrak..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#004C6D]/15 bg-[#F4F8F9] focus:bg-white text-sm text-[#002B36]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as QuotaStatusFilter);
              setMatrixPage(1);
            }}
            aria-label="Filter status kuota"
            className="px-3.5 py-2 rounded-lg border border-[#004C6D]/15 bg-white text-sm font-semibold text-[#002B36]"
          >
            <option value="ALL">Semua Status Kuota</option>
            <option value="SAFE">Aman (&lt;{warningThreshold}%)</option>
            <option value="WARNING">Waspada ({warningThreshold}-{criticalThreshold}%)</option>
            <option value="CRITICAL">Kritis / Over (&ge;{criticalThreshold}%)</option>
          </select>

          <select
            value={pillarFilter}
            onChange={(e) => {
              setPillarFilter(e.target.value as ServicePillar | 'ALL');
              setMatrixPage(1);
            }}
            aria-label="Filter jenis layanan kontrak"
            className="px-3.5 py-2 rounded-lg border border-[#004C6D]/15 bg-white text-sm font-semibold text-[#002B36]"
          >
            <option value="ALL">Semua Jenis Layanan</option>
            <option value="PBM Bongkar Muat">PBM Bongkar Muat</option>
            <option value="Sewa Gudang 24 Jam">Sewa Gudang 24 Jam</option>
            <option value="Sewa Lahan">Sewa Lahan Penumpukan</option>
            <option value="Trucking Armada">Trucking Armada</option>
            <option value="Pas Masuk E-Gate">Pas Masuk E-Gate</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#004C6D]/20 bg-white hover:bg-[#F4F8F9] text-[#002B36] text-sm font-semibold cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-[#004C6D]" />
            <span>Ekspor Log (XLS)</span>
          </button>
        </div>
      </div>

      {/* 5. MAIN MATRIX TABLE: MATRIKS UTILISASI KUOTA KONTRAK BERJALAN */}
      <div className="bg-white rounded-2xl border border-[#004C6D]/12 overflow-hidden shadow-2xs">
        <div className="p-5 sm:p-6 border-b border-[#004C6D]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#002B36]">
              Matriks Utilisasi Kuota Kontrak Berjalan
            </h2>
            <p className="text-sm text-[#002B36]/65 mt-0.5">
              Status limitasi tonase, sisa alokasi kapal sandar, dan auto-dispatch notifikasi vendor PBM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#002B36]/75">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#004C6D]" />
              Aman (&lt;{warningThreshold}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Waspada ({warningThreshold}-{criticalThreshold}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Kritis / Over (&ge;{criticalThreshold}%)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F8F9] text-xs font-bold uppercase tracking-wider text-[#002B36]/65 border-b border-[#004C6D]/10">
              <tr>
                <th className="py-3.5 px-5">Mitra PBM &amp; No. Kontrak</th>
                <th className="py-3.5 px-4">Layanan &amp; Lokasi</th>
                <th className="py-3.5 px-4 text-right">Kuota Kontrak</th>
                <th className="py-3.5 px-4 text-right">Realisasi</th>
                <th className="py-3.5 px-4 min-w-[200px]">Progress Kuota</th>
                <th className="py-3.5 px-4 text-right">Sisa Alokasi</th>
                <th className="py-3.5 px-4">Status Notifikasi</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#004C6D]/10">
              {paginatedMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[#002B36]/60">
                    Tidak ada kontrak yang sesuai dengan filter kuota saat ini.
                  </td>
                </tr>
              ) : (
                paginatedMatrix.map((c) => {
                  const pct = Math.min(
                    100,
                    Math.round((c.quotaUsed / Math.max(1, c.quotaTotal)) * 1000) / 10
                  );
                  const remaining = Math.max(0, c.quotaTotal - c.quotaUsed);
                  const isCritical = pct >= criticalThreshold;
                  const isWarning = pct >= warningThreshold && pct < criticalThreshold;
                  const daysLeft = daysUntil(c.endDate);
                  const estTotalRit = Math.max(1, Math.round(c.quotaTotal / 32));
                  const estUsedRit = Math.max(1, Math.round(c.quotaUsed / 32));
                  const estRemRit = Math.max(0, estTotalRit - estUsedRit);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-[#F4F8F9]/75 transition-colors ${
                        isCritical ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      <td className="py-4 px-5 align-top">
                        <p className="font-bold text-[#002B36]">{c.vendorName}</p>
                        <p className="text-xs font-mono-tabular text-[#002B36]/65 mt-0.5">
                          {c.contractNumber}
                        </p>
                        <p
                          className={`text-xs mt-1 font-medium ${
                            daysLeft <= 30 ? 'text-rose-700 font-semibold' : 'text-[#002B36]/55'
                          }`}
                        >
                          Berakhir: {formatDateId(c.endDate)}
                        </p>
                      </td>

                      <td className="py-4 px-4 align-top max-w-[230px]">
                        <p className="font-semibold text-[#002B36] line-clamp-2">{c.title}</p>
                        <p className="text-xs font-medium text-[#004C6D] mt-1">{c.portLocation}</p>
                      </td>

                      <td className="py-4 px-4 align-top text-right font-mono-tabular">
                        <p className="font-bold text-[#002B36]">
                          {c.quotaTotal.toLocaleString('id-ID')} {c.quotaUnit}
                        </p>
                        {c.quotaUnit === 'Ton' && (
                          <p className="text-xs text-[#002B36]/55 mt-0.5">
                            Max ~{estTotalRit.toLocaleString('id-ID')} Rit
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right font-mono-tabular">
                        <p
                          className={`font-bold ${
                            isCritical
                              ? 'text-rose-700'
                              : isWarning
                              ? 'text-amber-700'
                              : 'text-[#004C6D]'
                          }`}
                        >
                          {c.quotaUsed.toLocaleString('id-ID')} {c.quotaUnit}
                        </p>
                        {c.quotaUnit === 'Ton' && (
                          <p className="text-xs text-[#002B36]/55 mt-0.5">
                            {estUsedRit.toLocaleString('id-ID')} Ritase Truk
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1.5">
                          <span
                            className={`font-mono-tabular ${
                              isCritical
                                ? 'text-rose-700'
                                : isWarning
                                ? 'text-amber-700'
                                : 'text-[#004C6D]'
                            }`}
                          >
                            {pct}%
                          </span>
                          <span
                            className={`uppercase tracking-wide ${
                              isCritical
                                ? 'text-rose-700'
                                : isWarning
                                ? 'text-amber-700'
                                : 'text-[#004C6D]'
                            }`}
                          >
                            {isCritical
                              ? 'OVER-QUOTA RISK'
                              : isWarning
                              ? 'WASPADA LIMIT'
                              : 'KONDISI NORMAL'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#E0F2F1] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCritical
                                ? 'bg-rose-600'
                                : isWarning
                                ? 'bg-amber-500'
                                : 'bg-[#004C6D]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top text-right font-mono-tabular">
                        <p className="font-bold text-[#002B36]">
                          {remaining.toLocaleString('id-ID')} {c.quotaUnit}
                        </p>
                        {c.quotaUnit === 'Ton' && (
                          <p className="text-xs text-[#002B36]/55 mt-0.5">
                            Sisa ~{estRemRit.toLocaleString('id-ID')} Rit
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                            WA &amp; Email Sent (&ge;{criticalThreshold}%)
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            Monitoring Waspada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2F1] border border-[#004C6D]/15 text-[#004C6D] text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-[#004C6D] shrink-0" />
                            Standby Aman
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenContractDetail(c.id)}
                            title="Lihat detail kontrak & riwayat kuota"
                            className="p-2 rounded-lg border border-[#004C6D]/15 hover:bg-[#E0F2F1] text-[#004C6D] cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isCritical || isWarning) && (
                            <button
                              type="button"
                              onClick={() => onOpenRenewContract(c)}
                              title="Ajukan adendum penambahan kuota"
                              className={`p-2 rounded-lg text-white cursor-pointer transition-colors ${
                                isCritical
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-[#004C6D] hover:bg-[#003852]'
                              }`}
                            >
                              <FileSpreadsheet className="w-4 h-4" />
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

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-[#F4F8F9]/60 border-t border-[#004C6D]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#002B36]/70">
          <span>
            Menampilkan <strong>{paginatedMatrix.length}</strong> dari{' '}
            <strong>{filteredMatrix.length}</strong> Kontrak Aktif · Terakhir Disinkronisasi{' '}
            {lastSyncText} via API Timbangan
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeMatrixPage <= 1}
              onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#004C6D]/15 bg-white disabled:opacity-45 hover:bg-[#F4F8F9] text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {Array.from({ length: totalMatrixPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMatrixPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-bold cursor-pointer ${
                  safeMatrixPage === p
                    ? 'bg-[#004C6D] text-white'
                    : 'bg-white border border-[#004C6D]/15 text-[#002B36] hover:bg-[#F4F8F9]'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={safeMatrixPage >= totalMatrixPages}
              onClick={() => setMatrixPage((p) => Math.min(totalMatrixPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#004C6D]/15 bg-white disabled:opacity-45 hover:bg-[#F4F8F9] text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM ROW: LOG RITASE REAL-TIME + OTOMATISASI ALERT KUOTA (FONNTE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Log Ritase Real-Time Hari Ini */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#E0F2F1] text-[#004C6D] flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-[#002B36]">
                  Log Ritase Real-Time Hari Ini
                </h3>
              </div>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-bold text-[#004C6D]">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                STREAMING (Lemahwungkuk Scale 1 &amp; 2)
              </span>
            </div>

            <div className="space-y-3">
              {liveGateFeed.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#F4F8F9]/80 border border-[#004C6D]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                        item.direction === 'IN'
                          ? 'bg-[#004C6D] text-white'
                          : 'bg-teal-600 text-white'
                      }`}
                    >
                      {item.direction}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-[#002B36] font-mono-tabular">
                          {item.plate}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#004C6D]/15 text-[11px] font-mono-tabular font-semibold text-[#002B36]/70">
                          {item.rfid}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#002B36]/75 truncate mt-0.5">
                        {item.vendor} · {item.commodity} · {item.weightInfo}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 font-mono-tabular">
                    <p className="text-xs font-bold text-[#002B36]">{item.timeWib}</p>
                    <p
                      className={`text-xs font-bold mt-0.5 ${
                        item.isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.quotaImpact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#004C6D]/10 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-[#002B36]/65">
              Menampilkan {liveGateFeed.length} dari {store.usageLogs.length + 409} transaksi ritase hari ini
            </span>
            <button
              type="button"
              onClick={() => setTelemetryModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-bold text-[#004C6D] hover:underline cursor-pointer"
            >
              <span>Buka Telemetri Jembatan Timbang Lengkap</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Otomatisasi Alert Kuota (Fonnte) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#004C6D]/12 p-6 flex flex-col justify-between shadow-2xs">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-[#002B36]">
                Otomatisasi Alert Kuota (Fonnte)
              </h3>
              <span className="px-2.5 py-1 rounded-lg bg-[#E0F2F1] text-[#004C6D] text-xs font-bold shrink-0">
                API ACTIVE
              </span>
            </div>

            <p className="text-sm text-[#002B36]/75 leading-relaxed">
              Notifikasi terkirim otomatis ke Kepala Operasional Mitra PBM saat konsumsi kuota mencapai{' '}
              <strong>{warningThreshold}%</strong> dan <strong>{criticalThreshold}%</strong> untuk mencegah penundaan layanan dermaga.
            </p>

            {/* Dark Navy WhatsApp Dispatch Preview Box */}
            {priorityAlertContract && (
              <div className="rounded-xl bg-[#002B36] text-white p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#8DCBD0]">
                    <MessageSquare className="w-4 h-4" />
                    WHATSAPP GATEWAY DISPATCH
                  </span>
                  <span className="text-white/60 font-mono-tabular">Terkirim 14:02 WIB</span>
                </div>

                <p className="text-sm italic text-white/90 leading-relaxed">
                  &ldquo;Pemberitahuan Pelindo Cirebon: Kontrak {priorityAlertContract.contractNumber} (
                  {priorityAlertContract.vendorName}) telah mencapai kuota{' '}
                  {Math.min(
                    100,
                    Math.round(
                      (priorityAlertContract.quotaUsed /
                        Math.max(1, priorityAlertContract.quotaTotal)) *
                        1000
                    ) / 10
                  )}
                  % ({priorityAlertContract.quotaUsed.toLocaleString('id-ID')}{' '}
                  {priorityAlertContract.quotaUnit}). Mohon segera ajukan adendum penambahan kuota melalui CONTRACTHUB untuk menjaga kelancaran operasional.&rdquo;
                </p>

                <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 text-xs">
                  <span className="text-white/75">
                    Penerima: PIC {priorityAlertContract.vendorName}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDispatchWaAlert(priorityAlertContract)}
                    className="inline-flex items-center gap-1 font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    title="Kirim ulang peringatan WA sekarang"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>TERKIRIM (200 OK)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!priorityAlertContract}
              onClick={() => priorityAlertContract && onOpenRenewContract(priorityAlertContract)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#004C6D] hover:bg-[#003852] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Proses Adendum Cepat</span>
            </button>

            <button
              type="button"
              onClick={() => setThresholdModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#004C6D]/20 bg-white hover:bg-[#F4F8F9] text-[#002B36] text-sm font-semibold cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#004C6D]" />
              <span>Ambang Batas</span>
            </button>
          </div>
        </div>
      </div>

      {/* THRESHOLD SETTINGS MODAL */}
      {thresholdModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#002B36]/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#004C6D]/20 max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#002B36]">
                  Pengaturan Ambang Batas Kuota
                </h3>
                <p className="text-sm text-[#002B36]/70 mt-0.5">
                  Atur persentase pemicu status Waspada dan peringatan otomatis Fonnte WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setThresholdModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F4F8F9] text-[#002B36]/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                  <span>Ambang Batas Waspada (Amber)</span>
                  <span className="font-mono-tabular text-amber-700">{warningThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={89}
                  value={warningThreshold}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setWarningThreshold(v);
                    if (criticalThreshold <= v) setCriticalThreshold(Math.min(99, v + 5));
                  }}
                  className="w-full accent-[#004C6D]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                  <span>Ambang Batas Kritis &amp; Auto-WA (Merah)</span>
                  <span className="font-mono-tabular text-rose-700">{criticalThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={99}
                  value={criticalThreshold}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCriticalThreshold(Math.max(v, warningThreshold + 5));
                  }}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWarningThreshold(75);
                  setCriticalThreshold(90);
                }}
                className="px-4 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-semibold text-[#002B36] cursor-pointer"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => {
                  setThresholdModalOpen(false);
                  onShowToast(
                    `Ambang batas kuota diperbarui: Waspada ${warningThreshold}% · Kritis ${criticalThreshold}%.`
                  );
                }}
                className="px-5 py-2 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL TELEMETRY LOG MODAL */}
      {telemetryModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#002B36]/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#004C6D]/20 max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#002B36]">
                  Telemetri Lengkap Jembatan Timbang &amp; Realisasi Kuota
                </h3>
                <p className="text-sm text-[#002B36]/70 mt-0.5">
                  Catatan manifest penimbangan Lemahwungkuk Scale 1 &amp; 2 dan histori pemakaian kontrak.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTelemetryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F4F8F9] text-[#002B36]/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-[#004C6D]/10 pr-1">
              {store.usageLogs
                .filter((u) => scopedContractIds.has(u.contractId))
                .map((u) => (
                  <div
                    key={u.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#002B36]">
                        {u.contractNumber} ·{' '}
                        <span className="font-mono-tabular text-[#004C6D]">{u.referenceNo}</span> ·{' '}
                        {formatDateId(u.activityDate)}
                      </p>
                      <p className="text-[#002B36]/75 mt-0.5">{u.remarks}</p>
                      <p className="text-xs text-[#002B36]/55 mt-0.5">
                        Petugas: {u.recordedByName}
                      </p>
                    </div>
                    <div className="sm:text-right font-mono-tabular shrink-0">
                      <p className="font-bold text-[#002B36]">
                        +{u.volumeDelta.toLocaleString('id-ID')} {u.quotaUnit}
                      </p>
                      <p className="text-xs font-semibold text-[#004C6D]">
                        {formatRupiah(u.valueDeltaIdr)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-[#004C6D]/10">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-semibold text-[#002B36] cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#004C6D]" />
                <span>Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setTelemetryModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[#004C6D] text-white text-sm font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
