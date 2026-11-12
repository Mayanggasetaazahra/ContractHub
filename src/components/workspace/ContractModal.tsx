import React, { useState } from 'react';
import { X } from 'lucide-react';
import type {
  Contract,
  ContractStatus,
  ServicePillar,
  Vendor,
} from '../../types/contracthub';

interface ContractModalProps {
  mode: 'create' | 'edit' | 'renew';
  contract?: Contract | null;
  vendors: Vendor[];
  portLocations?: string[];
  onClose: () => void;
  onSaveContract: (payload: Partial<Contract>, isEdit: boolean) => Promise<void>;
  onSaveRenewal: (
    contractId: number,
    payload: { proposedEndDate: string; proposedValueIdr: number; reason: string }
  ) => Promise<void>;
}

const PILLARS: ServicePillar[] = [
  'Sewa Gudang 24 Jam',
  'Trucking Armada',
  'PBM Bongkar Muat',
  'Pas Masuk E-Gate',
  'Sewa Lahan',
  'Permit Tracker',
];

const STATUSES: ContractStatus[] = [
  'Draft',
  'Review Legal',
  'Menunggu e-Sign',
  'Aktif',
  'Hampir Habis',
  'Diperpanjang',
  'Kedaluwarsa',
  'Dihentikan',
  'Selesai',
];

export const ContractModal: React.FC<ContractModalProps> = ({
  mode,
  contract,
  vendors,
  portLocations = [],
  onClose,
  onSaveContract,
  onSaveRenewal,
}) => {
  const [contractNumber, setContractNumber] = useState(
    contract?.contractNumber ?? `PKS/CRB/2026/00${Math.floor(Math.random() * 90 + 10)}`
  );
  const [title, setTitle] = useState(contract?.title ?? '');
  const [servicePillar, setServicePillar] = useState<ServicePillar>(
    contract?.servicePillar ?? 'Sewa Gudang 24 Jam'
  );
  const [vendorId, setVendorId] = useState<number>(contract?.vendorId ?? vendors[0]?.id ?? 1);
  const [portLocation, setPortLocation] = useState(
    contract?.portLocation ?? 'Gudang D3 · Dermaga Muara Jati'
  );
  const [contractValueIdr, setContractValueIdr] = useState(
    String(contract?.contractValueIdr ?? 2500000000)
  );
  const [quotaTotal, setQuotaTotal] = useState(String(contract?.quotaTotal ?? 10000));
  const [quotaUnit, setQuotaUnit] = useState(contract?.quotaUnit ?? 'Ton');
  const [startDate, setStartDate] = useState(contract?.startDate ?? '2026-11-11');
  const [endDate, setEndDate] = useState(contract?.endDate ?? '2027-11-10');
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? 'Draft');
  const [notes, setNotes] = useState(contract?.notes ?? '');

  // Renewal fields
  const [proposedEndDate, setProposedEndDate] = useState('2027-12-31');
  const [proposedValueIdr, setProposedValueIdr] = useState(
    String(contract ? Math.round(contract.contractValueIdr * 1.08) : 3000000000)
  );
  const [reason, setReason] = useState(
    'Perpanjangan jangka waktu kerja sama operasional pelabuhan & penyesuaian tarif tahunan.'
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'renew' && contract) {
        await onSaveRenewal(contract.id, {
          proposedEndDate,
          proposedValueIdr: Number(proposedValueIdr),
          reason,
        });
      } else {
        await onSaveContract(
          {
            id: contract?.id,
            contractNumber,
            title,
            servicePillar,
            vendorId: Number(vendorId),
            portLocation,
            contractValueIdr: Number(contractValueIdr),
            quotaTotal: Number(quotaTotal),
            quotaUnit,
            startDate,
            endDate,
            status,
            notes,
          },
          mode === 'edit'
        );
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#002B36]/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#004C6D]/20 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F4F8F9] border-b border-[#004C6D]/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#002B36]">
              {mode === 'create'
                ? 'Buat Perjanjian Kerja Sama (PKS) Baru'
                : mode === 'edit'
                ? `Sunting Kontrak · ${contract?.contractNumber}`
                : `Adendum & Perpanjangan Sewa · ${contract?.contractNumber}`}
            </h3>
            <p className="text-sm text-[#002B36]/65">
              PT Pelabuhan Indonesia (Persero) Regional 2 Cirebon
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white text-[#002B36]/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[78vh] overflow-y-auto space-y-4">
          {mode === 'renew' ? (
            <>
              <div className="p-4 rounded-xl bg-[#E0F2F1]/70 border border-[#004C6D]/15 text-sm text-[#002B36]">
                <p className="font-bold">{contract?.title}</p>
                <p className="font-mono-tabular text-xs mt-1">
                  Jatuh Tempo Saat Ini: {contract?.endDate} · Mitra: {contract?.vendorName}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Usulan Tanggal Berakhir Baru
                  </label>
                  <input
                    type="date"
                    required
                    value={proposedEndDate}
                    onChange={(e) => setProposedEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Usulan Nilai Adendum (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000000}
                    value={proposedValueIdr}
                    onChange={(e) => setProposedValueIdr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                  Alasan & Catatan Hukum Perpanjangan
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Nomor Kontrak (PKS)
                  </label>
                  <input
                    type="text"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Pilar Layanan
                  </label>
                  <select
                    value={servicePillar}
                    onChange={(e) => setServicePillar(e.target.value as ServicePillar)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    {PILLARS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                  Judul Perjanjian Kerja Sama
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kerja Sama Bongkar Muat Curah Dermaga Muara Jati"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Mitra / Vendor Pelabuhan
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Lokasi Operasional Pelabuhan
                  </label>
                  <input
                    type="text"
                    required
                    list="contracthub-port-locations"
                    value={portLocation}
                    onChange={(e) => setPortLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm"
                  />
                  {portLocations.length > 0 && (
                    <datalist id="contracthub-port-locations">
                      {portLocations.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Nilai Kontrak (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000000}
                    value={contractValueIdr}
                    onChange={(e) => setContractValueIdr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Total Kuota
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quotaTotal}
                    onChange={(e) => setQuotaTotal(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Satuan Kuota
                  </label>
                  <input
                    type="text"
                    required
                    value={quotaUnit}
                    onChange={(e) => setQuotaUnit(e.target.value)}
                    placeholder="Ton / Ritase / m²"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Tanggal Berakhir
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                    Status Siklus
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContractStatus)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm bg-white"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#002B36] mb-1.5">
                  Catatan Legal & Klausul Khusus
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#004C6D]/20 text-sm"
                />
              </div>
            </>
          )}

          <div className="pt-4 border-t border-[#004C6D]/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-[#004C6D]/20 text-sm font-semibold text-[#002B36] hover:bg-[#F4F8F9] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#004C6D] hover:bg-[#003852] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : mode === 'renew' ? 'Ajukan & Simpan Adendum' : 'Simpan Kontrak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
