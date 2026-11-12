import React, { useState } from 'react';
import {
  FileCheck2,
  FileText,
  Gauge,
  History,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  Contract,
  ContractHubStore,
} from '../../types/contracthub';
import {
  daysUntil,
  formatDateId,
  formatRupiah,
  getContractStatusBadgeClass,
} from '../../utils/formatters';

interface ContractDetailModalProps {
  contract: Contract;
  store: ContractHubStore;
  canEdit: boolean;
  canApproveESign: boolean;
  onClose: () => void;
  onOpenEdit: (c: Contract) => void;
  onOpenRenew: (c: Contract) => void;
  onAdvanceESign: (id: number) => Promise<void>;
}

type DetailTab = 'info' | 'documents' | 'legalities' | 'renewals' | 'usage' | 'audit';

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  contract,
  store,
  canEdit,
  canApproveESign,
  onClose,
  onOpenEdit,
  onOpenRenew,
  onAdvanceESign,
}) => {
  const [tab, setTab] = useState<DetailTab>('info');

  const docs = store.documents.filter((d) => d.contractId === contract.id);
  const permits = store.legalities.filter(
    (l) => l.contractId === contract.id || l.vendorId === contract.vendorId
  );
  const renewals = store.renewals.filter((r) => r.contractId === contract.id);
  const usageLogs = store.usageLogs.filter((u) => u.contractId === contract.id);
  const audits = store.auditTrail.filter(
    (a) => a.entityId === contract.contractNumber || a.summary.includes(contract.contractNumber)
  );

  const pctQuota = Math.min(
    100,
    Math.round((contract.quotaUsed / Math.max(1, contract.quotaTotal)) * 100)
  );
  const leftDays = daysUntil(contract.endDate);

  const TABS: { id: DetailTab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'info', label: 'Info Umum', icon: FileCheck2 },
    { id: 'documents', label: 'Dokumen', count: docs.length, icon: FileText },
    { id: 'legalities', label: 'Legalitas', count: permits.length, icon: ShieldCheck },
    { id: 'renewals', label: 'Perpanjangan', count: renewals.length, icon: RefreshCw },
    { id: 'usage', label: 'Usage Log', count: usageLogs.length, icon: Gauge },
    { id: 'audit', label: 'Audit Trail', count: audits.length, icon: History },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#002B36]/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col border border-[#004C6D]/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F4F8F9] border-b border-[#004C6D]/12 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono-tabular text-sm font-bold text-[#004C6D]">
                {contract.contractNumber}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${getContractStatusBadgeClass(
                  contract.status
                )}`}
              >
                {contract.status}
              </span>
              <span className="text-xs text-[#002B36]/70 font-mono-tabular">
                {leftDays > 0 ? `Sisa ${leftDays} hari` : 'Berakhir'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#002B36] mt-1 truncate">{contract.title}</h3>
            <p className="text-sm text-[#002B36]/70">
              {contract.vendorName} · {contract.portLocation}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white text-[#002B36]/70 cursor-pointer shrink-0"
            aria-label="Tutup detail kontrak"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Sub-tabs matching contract detail hierarchy */}
        <div className="px-6 border-b border-[#004C6D]/10 flex items-center gap-1 overflow-x-auto bg-white shrink-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[#004C6D] text-[#004C6D]'
                    : 'border-transparent text-[#002B36]/65 hover:text-[#002B36]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span className="px-2 py-0.5 rounded bg-[#F4F8F9] text-xs font-mono-tabular text-[#004C6D]">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {tab === 'info' && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Pilar Layanan</p>
                  <p className="font-bold text-[#002B36]">{contract.servicePillar}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Nilai Kontrak (Rp)</p>
                  <p className="font-mono-tabular font-bold text-[#002B36]">
                    {formatRupiah(contract.contractValueIdr)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Realisasi Nilai</p>
                  <p className="font-mono-tabular font-bold text-[#004C6D]">
                    {formatRupiah(contract.utilizedValueIdr)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Periode Berlaku</p>
                  <p className="font-mono-tabular font-semibold text-[#002B36]">
                    {formatDateId(contract.startDate)} — {formatDateId(contract.endDate)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Lokasi Dermaga / Gudang</p>
                  <p className="font-semibold text-[#002B36]">{contract.portLocation}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F8F9]">
                  <p className="text-xs text-[#002B36]/65 mb-1">Status e-Sign Digital</p>
                  <p className="font-semibold text-[#004C6D]">
                    {contract.esignStatus} ({contract.esignProvider ?? 'PrivyID / BUMN'})
                  </p>
                </div>
              </div>

              {/* Quota bar */}
              <div className="p-4 rounded-xl border border-[#004C6D]/12 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#002B36]">Serapan Kuota Operasional</span>
                  <span className="font-mono-tabular font-bold text-[#004C6D]">
                    {contract.quotaUsed.toLocaleString('id-ID')} / {contract.quotaTotal.toLocaleString('id-ID')} {contract.quotaUnit} ({pctQuota}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#F4F8F9] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctQuota >= 85 ? 'bg-amber-600' : 'bg-[#004C6D]'}`}
                    style={{ width: `${pctQuota}%` }}
                  />
                </div>
              </div>

              {contract.esignHash && (
                <div className="p-3.5 rounded-xl bg-[#E0F2F1]/70 border border-[#004C6D]/15 text-sm font-mono-tabular text-[#004C6D] break-all">
                  Segel e-Signature SHA-256: {contract.esignHash}
                </div>
              )}

              <div className="text-sm space-y-1.5">
                <p className="font-bold text-[#002B36]">Keterangan & Catatan Hukum</p>
                <p className="text-[#002B36]/75 leading-relaxed bg-[#F4F8F9] p-4 rounded-xl">
                  {contract.notes || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </>
          )}

          {tab === 'documents' && (
            <div className="space-y-3">
              {docs.length === 0 ? (
                <p className="text-sm text-[#002B36]/60 py-8 text-center">
                  Belum ada berkas PDF/Word terlampir untuk kontrak ini.
                </p>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-[#004C6D]/12 flex items-center justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#002B36]">{d.fileName}</p>
                      <p className="font-mono-tabular text-xs text-[#002B36]/60 mt-0.5">
                        {d.docCategory} · {d.fileType} ({d.fileSizeKb} KB) · {d.version} · Diunggah {d.uploadedByName}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#E0F2F1] text-[#004C6D] font-mono-tabular text-xs font-bold">
                      Terverifikasi
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'legalities' && (
            <div className="space-y-3">
              {permits.length === 0 ? (
                <p className="text-sm text-[#002B36]/60 py-8 text-center">
                  Tidak ada izin pelabuhan terkait untuk kontrak ini.
                </p>
              ) : (
                permits.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-[#004C6D]/12 flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-mono-tabular font-bold text-[#004C6D]">{p.permitNumber}</p>
                      <p className="font-bold text-[#002B36] mt-0.5">{p.permitName}</p>
                      <p className="text-xs text-[#002B36]/65 mt-0.5">
                        {p.issuingAuthority} · Berlaku s/d {formatDateId(p.expiryDate)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        p.status === 'Berlaku'
                          ? 'bg-[#E0F2F1] text-[#004C6D]'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'renewals' && (
            <div className="space-y-3">
              {renewals.length === 0 ? (
                <p className="text-sm text-[#002B36]/60 py-8 text-center">
                  Belum ada riwayat adendum atau perpanjangan pada kontrak ini.
                </p>
              ) : (
                renewals.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[#F4F8F9] border border-[#004C6D]/10 text-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular font-bold text-[#004C6D]">{r.renewalNumber}</span>
                      <span className="px-2.5 py-0.5 rounded bg-white border border-[#004C6D]/15 text-xs font-semibold">
                        {r.approvalStatus}
                      </span>
                    </div>
                    <p className="text-[#002B36]">{r.reason}</p>
                    <p className="font-mono-tabular text-xs text-[#002B36]/65">
                      {r.previousEndDate} &rarr; {r.proposedEndDate} · {formatRupiah(r.proposedValueIdr)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'usage' && (
            <div className="space-y-3">
              {usageLogs.length === 0 ? (
                <p className="text-sm text-[#002B36]/60 py-8 text-center">
                  Belum ada catatan realisasi tonase / kuota lapangan.
                </p>
              ) : (
                usageLogs.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-xl border border-[#004C6D]/12 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-mono-tabular font-bold text-[#004C6D]">
                        {u.referenceNo} · {formatDateId(u.activityDate)}
                      </p>
                      <p className="text-[#002B36] mt-0.5">{u.remarks}</p>
                      <p className="text-xs text-[#002B36]/60">Dicatat oleh {u.recordedByName}</p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <p className="font-bold text-[#002B36]">
                        +{u.volumeDelta.toLocaleString('id-ID')} {u.quotaUnit}
                      </p>
                      <p className="text-xs text-[#004C6D]">{formatRupiah(u.valueDeltaIdr)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="divide-y divide-[#004C6D]/10">
              {audits.length === 0 ? (
                <p className="text-sm text-[#002B36]/60 py-8 text-center">
                  Belum ada log perubahan tercatat untuk nomor kontrak ini.
                </p>
              ) : (
                audits.map((a) => (
                  <div key={a.id} className="py-3.5 text-sm">
                    <div className="flex items-center justify-between text-xs font-mono-tabular text-[#002B36]/60">
                      <span className="font-bold text-[#004C6D]">
                        {a.actorName} ({a.actionType})
                      </span>
                      <span>{a.createdAt}</span>
                    </div>
                    <p className="text-[#002B36] mt-1">{a.summary}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F4F8F9] border-t border-[#004C6D]/12 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono-tabular text-[#002B36]/65">
            Pembaruan terakhir: {contract.updatedAt}
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && contract.esignStatus !== 'Tertandatangani' && (
              <button
                type="button"
                disabled={contract.esignStatus === 'Verifikasi Legal' && !canApproveESign}
                onClick={async () => {
                  await onAdvanceESign(contract.id);
                }}
                className="px-4 py-2 rounded-lg bg-[#E0F2F1] hover:bg-[#cdebe9] text-[#004C6D] text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {contract.esignStatus === 'Verifikasi Legal'
                  ? 'Sahkan e-Sign CLO'
                  : 'Lanjut Tahap e-Sign'}
              </button>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(contract);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#004C6D]/20 bg-white hover:bg-[#F4F8F9] text-[#002B36] text-sm font-semibold cursor-pointer"
                >
                  Sunting Kontrak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRenew(contract);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold cursor-pointer"
                >
                  Ajukan Perpanjangan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
