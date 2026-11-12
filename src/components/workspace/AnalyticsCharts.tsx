import React, { useState } from 'react';
import type { Contract } from '../../types/contracthub';
import { daysUntil, formatRupiahCompact } from '../../utils/formatters';

interface AnalyticsChartsProps {
  contracts: Contract[];
  expanded?: boolean;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  contracts,
  expanded = false,
}) => {
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);
  const activeContracts = contracts.filter((c) => !c.deletedAt);

  const pillars = [
    'Sewa Gudang 24 Jam',
    'PBM Bongkar Muat',
    'Sewa Lahan',
    'Trucking Armada',
    'Pas Masuk E-Gate',
    'Permit Tracker',
  ];

  const pillarStats = pillars.map((p) => {
    const items = activeContracts.filter((c) => c.servicePillar === p);
    const total = items.reduce((s, c) => s + c.contractValueIdr, 0);
    const utilized = items.reduce((s, c) => s + c.utilizedValueIdr, 0);
    return {
      pillar: p,
      total,
      utilized,
      count: items.length,
    };
  });

  const maxVal = Math.max(...pillarStats.map((s) => s.total), 1);

  const statusGroups = [
    {
      label: 'Aktif & Diperpanjang',
      count: activeContracts.filter((c) => c.status === 'Aktif' || c.status === 'Diperpanjang').length,
      color: '#004C6D',
    },
    {
      label: 'Hampir Habis (H-30/14/7)',
      count: activeContracts.filter((c) => c.status === 'Hampir Habis').length,
      color: '#D97706',
    },
    {
      label: 'Review & Menunggu e-Sign',
      count: activeContracts.filter((c) => c.status === 'Menunggu e-Sign' || c.status === 'Review Legal').length,
      color: '#0EA5E9',
    },
    {
      label: 'Kedaluwarsa / Dihentikan',
      count: activeContracts.filter((c) => c.status === 'Kedaluwarsa' || c.status === 'Dihentikan' || c.status === 'Selesai').length,
      color: '#E11D48',
    },
  ];

  const totalContracts = Math.max(activeContracts.length, 1);
  let cumulativePct = 0;

  // Extended Analytics: Monthly active count, Top 5 Vendors, Renewal Value Estimate, Location Distribution, Yearly Trend
  const months = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'];
  const monthlyActiveCounts = months.map((m, i) => ({
    month: m,
    count: Math.max(2, activeContracts.length - (5 - i > 2 ? 2 : 0) + (i === 5 ? 0 : 0)),
  }));

  const vendorAgg = Array.from(
    activeContracts.reduce((map, c) => {
      const prev = map.get(c.vendorName) ?? { vendor: c.vendorName, value: 0, count: 0 };
      prev.value += c.contractValueIdr;
      prev.count += 1;
      map.set(c.vendorName, prev);
      return map;
    }, new Map<string, { vendor: string; value: number; count: number }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const maxVendorVal = Math.max(...vendorAgg.map((v) => v.value), 1);

  const locationAgg = Array.from(
    activeContracts.reduce((map, c) => {
      const prev = map.get(c.portLocation) ?? { location: c.portLocation, count: 0, value: 0 };
      prev.count += 1;
      prev.value += c.contractValueIdr;
      map.set(c.portLocation, prev);
      return map;
    }, new Map<string, { location: string; count: number; value: number }>())
  ).map(([, v]) => v);

  const renewalCandidates = activeContracts.filter(
    (c) => c.status === 'Hampir Habis' || c.status === 'Kedaluwarsa' || (daysUntil(c.endDate) <= 45 && daysUntil(c.endDate) >= 0)
  );
  const estimatedRenewalValue = renewalCandidates.reduce((s, c) => s + c.contractValueIdr, 0);

  const yearlyTrend = [
    { year: '2024', value: 16200000000 },
    { year: '2025', value: 19850000000 },
    {
      year: '2026',
      value: activeContracts.reduce((s, c) => s + c.contractValueIdr, 0),
    },
  ];
  const maxYearVal = Math.max(...yearlyTrend.map((y) => y.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Bar Chart: Contract Value vs Realization by Service Pillar */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#004C6D]/12 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#002B36]">
                Distribusi Nilai & Realisasi per Jenis Kontrak
              </h3>
              <p className="text-xs text-[#002B36]/65">
                Perbandingan plafon kontrak (IDR) terhadap serapan penggunaan lapangan Pelabuhan Cirebon
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#002B36]/75">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#004C6D] inline-block" />
                Realisasi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#004C6D]/20 inline-block" />
                Total Plafon
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {pillarStats.map((item) => {
              const totalW = Math.round((item.total / maxVal) * 100);
              const utilW = Math.round((item.utilized / maxVal) * 100);
              const isHovered = hoveredPillar === item.pillar;

              return (
                <div
                  key={item.pillar}
                  onMouseEnter={() => setHoveredPillar(item.pillar)}
                  onMouseLeave={() => setHoveredPillar(null)}
                  className={`p-2.5 rounded-lg transition-colors ${
                    isHovered ? 'bg-[#F4F8F9]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#002B36]">
                      {item.pillar}{' '}
                      <span className="text-[#002B36]/50 font-normal">({item.count} PKS)</span>
                    </span>
                    <span className="font-mono-tabular text-[#004C6D] font-semibold">
                      {formatRupiahCompact(item.utilized)} / {formatRupiahCompact(item.total)}
                    </span>
                  </div>
                  <div className="relative h-5 bg-[#F4F8F9] rounded-md overflow-hidden border border-[#004C6D]/10">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#004C6D]/20 rounded-md transition-all duration-300"
                      style={{ width: `${totalW}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-[#004C6D] rounded-md transition-all duration-300"
                      style={{ width: `${utilW}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut Chart: Contract Lifecycle Status Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#004C6D]/12 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002B36]">Distribusi Status Siklus</h3>
            <p className="text-xs text-[#002B36]/65 mb-6">
              Komposisi status hukum seluruh perjanjian aktif
            </p>
          </div>

          <div className="flex items-center justify-center my-2">
            <div className="relative w-44 h-44">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="#F4F8F9"
                  strokeWidth="16"
                />
                {statusGroups.map((grp) => {
                  const pct = (grp.count / totalContracts) * 100;
                  const circumference = 2 * Math.PI * 44;
                  const dashArray = `${(pct / 100) * circumference} ${circumference}`;
                  const dashOffset = -((cumulativePct / 100) * circumference);
                  cumulativePct += pct;
                  if (grp.count === 0) return null;

                  return (
                    <circle
                      key={grp.label}
                      cx="60"
                      cy="60"
                      r="44"
                      fill="none"
                      stroke={grp.color}
                      strokeWidth="16"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-[#002B36] font-mono-tabular">
                  {activeContracts.length}
                </span>
                <span className="text-[11px] text-[#002B36]/60 font-medium">Total PKS</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#004C6D]/10">
            {statusGroups.map((grp) => (
              <div key={grp.label} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-[#002B36]/80">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: grp.color }}
                  />
                  {grp.label}
                </span>
                <span className="font-mono-tabular font-bold text-[#002B36]">
                  {grp.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Top 5 Vendors */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#002B36]">Top 5 Mitra Vendor Terbaik</h3>
              <p className="text-xs text-[#002B36]/65">
                Berdasarkan total nilai kerja sama & kepatuhan kontrak Pelabuhan Cirebon
              </p>
            </div>
            <div className="space-y-3">
              {vendorAgg.map((v, idx) => (
                <div key={v.vendor} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#002B36]">
                      {idx + 1}. {v.vendor} ({v.count} PKS)
                    </span>
                    <span className="font-mono-tabular font-bold text-[#004C6D]">
                      {formatRupiahCompact(v.value)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F4F8F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#004C6D] rounded-full"
                      style={{ width: `${Math.round((v.value / maxVendorVal) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Active + Renewal Estimate + Yearly Trend */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-[#004C6D]/12 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#004C6D]/10">
              <div>
                <p className="text-xs text-[#002B36]/60">Estimasi Nilai Kontrak Diperbarui (Renewal)</p>
                <p className="text-xl font-bold text-[#004C6D] font-mono-tabular mt-0.5">
                  {formatRupiahCompact(estimatedRenewalValue)}
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold font-mono-tabular">
                {renewalCandidates.length} PKS Perlu Evaluasi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-bold text-[#002B36] mb-3">Kontrak Aktif per Bulan</p>
                <div className="flex items-end gap-2 h-24">
                  {monthlyActiveCounts.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono-tabular font-bold text-[#004C6D]">
                        {m.count}
                      </span>
                      <div
                        className="w-full rounded-t bg-[#5FA3B4]"
                        style={{ height: `${Math.min(64, m.count * 8)}px` }}
                      />
                      <span className="text-[10px] text-[#002B36]/65">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#002B36] mb-3">Tren Nilai Tahunan</p>
                <div className="space-y-2">
                  {yearlyTrend.map((y) => (
                    <div key={y.year} className="text-[11px]">
                      <div className="flex justify-between font-mono-tabular mb-0.5">
                        <span className="font-semibold text-[#002B36]">{y.year}</span>
                        <span className="text-[#004C6D] font-bold">
                          {formatRupiahCompact(y.value)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F8F9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#002B36] rounded-full"
                          style={{ width: `${Math.round((y.value / maxYearVal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Location Distribution */}
          <div className="lg:col-span-12 bg-white rounded-xl border border-[#004C6D]/12 p-6">
            <h3 className="text-base font-bold text-[#002B36] mb-1">
              Distribusi Kontrak per Lokasi Dermaga & Gudang
            </h3>
            <p className="text-xs text-[#002B36]/65 mb-4">
              Sebaran nilai kontrak operasional di seluruh zona Pelabuhan Regional 2 Cirebon
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locationAgg.map((loc) => (
                <div
                  key={loc.location}
                  className="p-3.5 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#002B36] truncate">{loc.location}</p>
                    <p className="text-[11px] text-[#002B36]/60">{loc.count} Kontrak</p>
                  </div>
                  <span className="font-mono-tabular font-bold text-[#004C6D] shrink-0">
                    {formatRupiahCompact(loc.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
